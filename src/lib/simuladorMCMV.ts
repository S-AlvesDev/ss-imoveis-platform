import { Request, Response } from 'express';

// Lógica isolada para não poluir o server.ts (Service Layer Pattern)
export const handleSimulacaoMCMV = (req: Request, res: Response) => {
  try {
    const { 
      valor_imovel, 
      renda_bruta_familiar: renda_bruta, 
      prazo_meses = 420, 
      sistema_amortizacao = 'SAC',
      tem_3_anos_fgts = false, 
      tem_dependente = false, 
      saldo_fgts = 0, 
      regiao_imovel = 'Sudeste', 
      subsidio_maximo_municipio = 0,
      idade_comprador_principal = 30,
      entrada_preferencial_usuario = 0
    } = req.body;

    if (!valor_imovel || !renda_bruta || !regiao_imovel || subsidio_maximo_municipio == null) {
      return res.status(422).json({ error: 'Parâmetros obrigatórios ausentes ou inválidos no payload.' });
    }

    if (valor_imovel <= 0 || renda_bruta <= 0 || prazo_meses < 120 || prazo_meses > 420) {
      return res.status(422).json({ error: 'Valores fornecidos fora do range permitido (ex: Prazo 120-420, Renda > 0).' });
    }

    let taxa_juros_anual = 0;
    let limite_imovel = 0;
    let subsidio = 0;

    // Regras Faixas MCMV 2026
    if (renda_bruta <= 3200) { // Faixa 1
      limite_imovel = 275000;
      taxa_juros_anual = (regiao_imovel === 'Norte' || regiao_imovel === 'Nordeste') ? 4.0 : 4.5;
      if (tem_dependente) subsidio = subsidio_maximo_municipio;
    } else if (renda_bruta <= 5000) { // Faixa 2
      limite_imovel = 275000 + ((renda_bruta - 3200) / 1800) * (400000 - 275000); 
      if (limite_imovel > 400000) limite_imovel = 400000;
      const juros_base = 4.75;
      const juros_max = 6.50;
      taxa_juros_anual = juros_base + ((renda_bruta - 3200) / 1800) * (juros_max - juros_base);
      if (tem_dependente) {
        subsidio = Math.max(0, subsidio_maximo_municipio * (1 - ((renda_bruta - 3200) / 1800)));
      }
    } else if (renda_bruta <= 9600) { // Faixa 3
      limite_imovel = 400000;
      taxa_juros_anual = 7.66;
      subsidio = 0;
    } else if (renda_bruta <= 13000) { // Faixa 4
      limite_imovel = 600000;
      taxa_juros_anual = 10.50;
      subsidio = 0;
    } else {
      return res.status(422).json({ error: 'Renda bruta familiar acima do limite máximo permitido pelo programa (R$ 13.000).' });
    }

    if (valor_imovel > limite_imovel) {
      return res.status(400).json({ error: `O valor do imóvel (R$ ${valor_imovel.toFixed(2)}) supera o teto máximo permitido para a sua faixa de renda (R$ ${limite_imovel.toFixed(2)}).` });
    }

    // Dynamic Subsidy Bump (Bank-like behavior for lower incomes)
    if (renda_bruta <= 3200 && subsidio > 0 && subsidio < subsidio_maximo_municipio) {
       subsidio = Math.min(subsidio_maximo_municipio, subsidio * 1.1); // Otmização leve
    }

    if (tem_3_anos_fgts) {
      taxa_juros_anual = Math.max(0, taxa_juros_anual - 0.5);
    }

    const teto_parcela = renda_bruta * 0.3;
    const taxa_mensal = (taxa_juros_anual / 100) / 12; 
    
    // Taxas Secundárias
    const TAXA_MIP_MENSAL = 0.00025; 
    const TAXA_DFI_MENSAL = 0.00005; 
    const TAF = 25.00;
    const valor_dfi_mensal = valor_imovel * TAXA_DFI_MENSAL;

    const calcularParcelas = (sis: string, val_fin: number) => {
      let parc = [];
      let saldo = val_fin;
      let amortizacao_sac = val_fin / prazo_meses;
      let pmt_price = 0;
      if (sis === 'PRICE') {
          pmt_price = val_fin * (taxa_mensal * Math.pow(1 + taxa_mensal, prazo_meses)) / (Math.pow(1 + taxa_mensal, prazo_meses) - 1);
      }
      
      for (let m = 1; m <= prazo_meses; m++) {
          let juros = saldo * taxa_mensal;
          let amortizacao = sis === 'SAC' ? amortizacao_sac : pmt_price - juros;
          let mip = saldo * TAXA_MIP_MENSAL;
          let prestacao_total = amortizacao + juros + mip + valor_dfi_mensal + TAF;
          
          parc.push({
            mes: m,
            amortizacao,
            juros,
            seguro_mip: mip,
            seguro_dfi: valor_dfi_mensal,
            taxa_adm: TAF,
            parcela_total: prestacao_total,
            saldo_devedor_atual: saldo
          });
          saldo -= amortizacao;
      }
      return parc;
    };

    // --- ENGINe MOTOR BANCÁRIO DE OTIMIZAÇÃO ---
    
    // 1. LTV Máximo é 80% do imóvel (regra geral SFH/MCMV para não cotistas, podendo chegar a 90% em alguns casos, mas usaremos 80% como base conservadora, ajustável para 90% via Subsídio/FGTS)
    // O banco permite financiar até 80-90%. Vamos assumir 80% como valor financiado máximo normativo.
    let valor_financiado_max_ltv = valor_imovel * 0.8;
    
    // 2. Busca o Valor Financiado Máximo por Renda (Busca binária/iterativa)
    let tentativa_sistema = sistema_amortizacao;
    let teve_mudanca_para_price = false;
    let estrategia_aprovacao = `Tentativa inicial ${sistema_amortizacao}`;

    const iterarValorFinanciadoAteAprovar = (sistema: string, max_in: number) => {
       let val_try = max_in;
       let slice = 1000;
       while (val_try > 0) {
           let parcelas_teste = calcularParcelas(sistema, val_try);
           if (parcelas_teste[0].parcela_total <= teto_parcela) {
               return val_try; // Aprovado
           }
           val_try -= slice;
           if (val_try < 0) val_try = 0;
       }
       return 0;
    };
    
    let valor_financiado = iterarValorFinanciadoAteAprovar(tentativa_sistema, valor_financiado_max_ltv);
    
    // Otimização: Tries PRICE if SAC yields very low financing
    if (tentativa_sistema === 'SAC' && valor_financiado < valor_financiado_max_ltv) {
        let valor_fin_price = iterarValorFinanciadoAteAprovar('PRICE', valor_financiado_max_ltv);
        if (valor_fin_price > valor_financiado + 5000) { // Se aprova bem mais no PRICE
            tentativa_sistema = 'PRICE';
            teve_mudanca_para_price = true;
            valor_financiado = valor_fin_price;
            estrategia_aprovacao = 'Migração para PRICE para aprovar maior valor';
        }
    }

    // 3. Calculando as entradas
    let entrada_minima_bruta = valor_imovel - valor_financiado; 
    
    // Quanto FGTS e Subsídio absorvem dessa entrada bruta?
    let fgts_disponivel = Number(saldo_fgts) || 0;
    
    // Subsidio tem um teto baseado na entrada exigida? Não, o subsídio é um valor fixo concedido (ou abatido do saldo).
    // O governo dá X de subsídio. Isso abate DE FATO no valor que a pessoa precisa desembolsar.
    let valor_absorvido_subsidio = Math.min(subsidio, entrada_minima_bruta);
    let entrada_minima_apos_subsidio = entrada_minima_bruta - valor_absorvido_subsidio;
    
    let valor_fgts_utilizado = Math.min(fgts_disponivel, entrada_minima_apos_subsidio);
    let entrada_minima_necessaria = entrada_minima_apos_subsidio - valor_fgts_utilizado;

    if (entrada_minima_necessaria < 0) entrada_minima_necessaria = 0;

    // 4. Tratando a "Entrada Informada" pelo usuário (Dinâmica)
    let entrada_informada = Number(entrada_preferencial_usuario) || 0;
    
    // Se o usuário deu menos entrada do que a mínima:
    if (entrada_informada < entrada_minima_necessaria) {
        estrategia_aprovacao = `Usuário informou entrada de R$ ${entrada_informada}, mas a mínima para aprovar 30% da renda é R$ ${entrada_minima_necessaria.toFixed(2)}. ${estrategia_aprovacao}`;
    }
    
    // A Entrada que de fato vai ser paga pelo usuário (pode ser a mínima ou a que ele quer, se for maior)
    let entrada_a_pagar = Math.max(entrada_informada, entrada_minima_necessaria);
    
    let entrada_ideal = entrada_minima_necessaria > 0 ? entrada_minima_necessaria + (valor_imovel * 0.05) : 0; // Ideal dar um pouco mais que a minima
    let entrada_otimizada = entrada_minima_necessaria;

    // Recalcula o valor financiado real baseado na entrada a ser dada (para reduzir a dívida se o cara deu mais entrada)
    let financiamento_final_real = valor_imovel - entrada_a_pagar - valor_fgts_utilizado - valor_absorvido_subsidio;
    if (financiamento_final_real < 0) financiamento_final_real = 0;

    // Recalcular as parcelas com o valor_final (já sabendo que vai passar pois é <= valor_financiado original)
    let parcelas = calcularParcelas(tentativa_sistema, financiamento_final_real);

    if (entrada_minima_necessaria === 0 && entrada_informada === 0) {
        estrategia_aprovacao += " - ENTRADA ZERO! Imóvel 100% coberto pelo LTV + FGTS + Subsídio.";
    }

    let total_juros = 0;
    let total_pago = 0;
    parcelas.forEach(p => {
       total_juros += p.juros;
       total_pago += p.parcela_total;
    });

    // Custo cartório
    const custo_itbi_cartorio = valor_imovel * 0.04;

    res.json({
      resumo: {
        valor_imovel: Number(valor_imovel.toFixed(2)),
        valor_financiado: Number(financiamento_final_real.toFixed(2)),
        entrada_exigida: Number(entrada_minima_bruta.toFixed(2)),
        entrada_a_pagar: Number(entrada_a_pagar.toFixed(2)),
        subsidio: Number(valor_absorvido_subsidio.toFixed(2)),
        subsidio_concedido: Number(subsidio.toFixed(2)),
        taxa_juros_anual_aplicada: Number(taxa_juros_anual.toFixed(2)),
        sistema_amortizacao_final: tentativa_sistema,
        alerta_mudanca_sistema: teve_mudanca_para_price,
        parcela_1: Number(parcelas[0]?.parcela_total.toFixed(2) || 0),
        ultima_parcela: Number(parcelas[parcelas.length-1]?.parcela_total.toFixed(2) || 0),
        total_juros_pago: Number(total_juros.toFixed(2)),
        total_pago_final: Number(total_pago.toFixed(2)),
        custos: {
           estimativa_itbi_registro: Number(custo_itbi_cartorio.toFixed(2)),
           doc_gratis: false 
        },
        // Novos Campos Motor Inteligente
        entrada_informada: entrada_informada,
        entrada_minima_necessaria: Number(entrada_minima_necessaria.toFixed(2)),
        entrada_ideal: Number(entrada_ideal.toFixed(2)),
        entrada_otimizada: Number(entrada_otimizada.toFixed(2)),
        valor_fgts_utilizado: Number(valor_fgts_utilizado.toFixed(2)),
        valor_absorvido_subsidio: Number(valor_absorvido_subsidio.toFixed(2)),
        estrategia_aprovacao: estrategia_aprovacao
      },
      projecao: parcelas.map(p => ({
        mes: p.mes,
        amortizacao: Number(p.amortizacao.toFixed(2)),
        juros: Number(p.juros.toFixed(2)),
        seguro_mip: Number(p.seguro_mip.toFixed(2)),
        seguro_dfi: Number(p.seguro_dfi.toFixed(2)),
        taxa_adm: Number(p.taxa_adm.toFixed(2)),
        parcela_total: Number(p.parcela_total.toFixed(2)),
        saldo_devedor: Number(Math.max(0, p.saldo_devedor_atual - p.amortizacao).toFixed(2))
      }))
    });
    
  } catch (e: any) {
    res.status(500).json({ error: 'Erro no cálculo atuarial/simulação.', details: e.message });
  }
};
