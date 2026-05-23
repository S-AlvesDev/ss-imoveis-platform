import { Request, Response } from 'express';

// Lógica isolada para não poluir o server.ts (Service Layer Pattern)
export const handleSimulacaoMCMV = (req: Request, res: Response) => {
  try {
    const { 
      valor_imovel, 
      renda_bruta_familiar: renda_bruta, 
      prazo_meses: prazobase = 420, 
      sistema_amortizacao = 'SAC',
      tem_3_anos_fgts = false, 
      tem_dependente = false, 
      saldo_fgts = 0, 
      regiao_imovel = 'Sudeste', 
      subsidio_maximo_municipio = 0,
      idade_comprador_principal = 30,
      entrada_preferencial_usuario = 0
    } = req.body;

    let prazo_meses = Number(prazobase);

    if (!valor_imovel || !renda_bruta || !regiao_imovel || subsidio_maximo_municipio == null) {
      return res.status(422).json({ error: 'Parâmetros obrigatórios ausentes ou inválidos no payload.' });
    }

    if (valor_imovel <= 0 || renda_bruta <= 0 || prazo_meses < 120 || prazo_meses > 420) {
      return res.status(422).json({ error: 'Valores fornecidos fora do range permitido (ex: Prazo 120-420, Renda > 0).' });
    }

    let taxa_juros_anual = 0;
    let limite_imovel = 0;
    
    // Regras Faixas MCMV 2026
    if (renda_bruta <= 3200) { // Faixa 1
      limite_imovel = 275000;
      taxa_juros_anual = (regiao_imovel === 'Norte' || regiao_imovel === 'Nordeste') ? 4.0 : 4.5;
    } else if (renda_bruta <= 5000) { // Faixa 2
      limite_imovel = 275000 + ((renda_bruta - 3200) / 1800) * (400000 - 275000); 
      if (limite_imovel > 400000) limite_imovel = 400000;
      const juros_base = 4.75;
      const juros_max = 6.50;
      taxa_juros_anual = juros_base + ((renda_bruta - 3200) / 1800) * (juros_max - juros_base);
    } else if (renda_bruta <= 9600) { // Faixa 3
      limite_imovel = 400000;
      taxa_juros_anual = 7.66;
    } else if (renda_bruta <= 13000) { // Faixa 4
      limite_imovel = 600000;
      taxa_juros_anual = 10.50;
    } else {
      return res.status(422).json({ error: 'Renda bruta familiar acima do limite máximo permitido pelo programa (R$ 13.000).' });
    }

    if (valor_imovel > limite_imovel) {
      return res.status(400).json({ error: `O valor do imóvel (R$ ${valor_imovel.toFixed(2)}) supera o teto máximo permitido para a sua faixa de renda (R$ ${limite_imovel.toFixed(2)}).` });
    }

    if (tem_3_anos_fgts) {
      taxa_juros_anual = Math.max(0, taxa_juros_anual - 0.5);
    }

    // --- 1. CONSTRUÇÃO DO SCORE DE VIABILIDADE E MARGEM DE RENDA ---
    let score_viabilidade = 100;
    
    if (idade_comprador_principal > 45) {
      score_viabilidade -= (idade_comprador_principal - 45) * 1.5;
    }
    if (saldo_fgts === 0) score_viabilidade -= 5;
    if (!tem_dependente) score_viabilidade -= 8;
    
    let margem_renda_percent = 0.30; // base 30%
    if (score_viabilidade > 90) {
      margem_renda_percent = 0.32; // Perfil excelente
    } else if (score_viabilidade >= 70) {
      margem_renda_percent = 0.30; // Perfil médio
    } else if (score_viabilidade >= 40) {
      margem_renda_percent = 0.27; // Perfil moderado
    } else {
      margem_renda_percent = 0.24; // Perfil sensível
    }
    
    // Calcula LTV base e reajusta score
    const fgts_disponivel = Number(saldo_fgts) || 0;
    const ltv_presumido = (valor_imovel - fgts_disponivel) / valor_imovel;
    if (ltv_presumido > 0.90) score_viabilidade -= 10;
    if (ltv_presumido < 0.70) score_viabilidade += 10;

    // --- 2. CURVA REALISTA DE SUBSÍDIO ---
    let subsidio_maximo_permitido = Number(subsidio_maximo_municipio) || 0;
    let subsidio = 0;
    
    if (renda_bruta <= 5000 && subsidio_maximo_permitido > 0) {
      // Progressivo em relação à renda (inverso)
      let percentual_renda = 0;
      if (renda_bruta <= 2400) {
          percentual_renda = 1.0; 
      } else {
          percentual_renda = Math.max(0, 1 - ((renda_bruta - 2400) / 2600)); 
      }
      
      let subsidio_bruto = subsidio_maximo_permitido * percentual_renda;
      
      // Multiplicadores
      if (!tem_dependente) subsidio_bruto *= 0.90; // -10% sem dependente
      if (fgts_disponivel === 0) subsidio_bruto *= 0.95; // -5% sem fgts
      
      // Ajuste por proximidade do teto do imóvel na faixa (imóveis mto caros pra faixa perdem subsídio)
      const proximidade_teto = valor_imovel / limite_imovel;
      if (proximidade_teto > 0.9) {
          const reducao_teto = 1 - ((proximidade_teto - 0.9) * 2); // Ex: 0.95 -> 1 - 0.1 = 0.9
          subsidio_bruto *= Math.max(0.5, reducao_teto);
      }
      
      // Otimização leve (bump bancário) se LTV ainda exigir muita entrada
      if (score_viabilidade > 80 && subsidio_bruto > 0) {
         subsidio_bruto = Math.min(subsidio_maximo_permitido, subsidio_bruto * 1.05);
      }

      subsidio = Math.min(subsidio_maximo_permitido, Math.max(0, subsidio_bruto));
    }
    
    score_viabilidade = Math.max(0, Math.min(100, Math.round(score_viabilidade)));

    const taxa_mensal = (taxa_juros_anual / 100) / 12; 
    const TAXA_MIP_MENSAL = 0.00025; 
    const TAXA_DFI_MENSAL = 0.00005; 
    const TAF = 25.00;
    const valor_dfi_mensal = valor_imovel * TAXA_DFI_MENSAL;

    const calcularParcelas = (sis: string, val_fin: number, prazo: number) => {
      let parc = [];
      let saldo = val_fin;
      let amortizacao_sac = val_fin / prazo;
      let pmt_price = 0;
      if (sis === 'PRICE') {
          pmt_price = val_fin * (taxa_mensal * Math.pow(1 + taxa_mensal, prazo)) / (Math.pow(1 + taxa_mensal, prazo) - 1);
      }
      
      for (let m = 1; m <= prazo; m++) {
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

    // --- 3. MOTOR DE TENTATIVAS E ENQUADRAMENTO ---
    // A Caixa permite financiamento no SFH de até 80-90% dependendo do perfil/rating. Adotamos max 80% normativo (puro)
    // Mas MCMV pode absorver mais usando FGTS e Subsidio como entrada.
    let valor_financiado_max_geral = valor_imovel * 0.8;
    const teto_parcela = renda_bruta * margem_renda_percent;

    const getMaxAvaliableFinancing = (sis: string, max_financing_limit: number, prazo: number): {maxFin: number, cmt: number} => {
       let val_try = max_financing_limit;
       const slice = 500;
       while (val_try > 0) {
           let parcelas_teste = calcularParcelas(sis, val_try, prazo);
           if (parcelas_teste[0].parcela_total <= teto_parcela) {
               return { maxFin: val_try, cmt: (parcelas_teste[0].parcela_total / renda_bruta * 100) };
           }
           val_try -= slice;
           if (val_try < 0) val_try = 0;
       }
       return { maxFin: 0, cmt: 0 };
    };

    const tentativas = [];
    let melhor_cenario: any = null;

    // Tentativa 1: SAC Original
    let try1 = getMaxAvaliableFinancing(sistema_amortizacao, valor_financiado_max_geral, prazo_meses);
    tentativas.push(`Tentativa 1: ${sistema_amortizacao} ${prazo_meses}x -> Financia até: R$ ${try1.maxFin.toFixed(2)}`);
    melhor_cenario = { sis: sistema_amortizacao, prazo: prazo_meses, val_fin: try1.maxFin, cmt: try1.cmt };

    // Tentativa 2: PRICE (Se não for preço originalmente)
    if (sistema_amortizacao === 'SAC' && try1.maxFin < valor_financiado_max_geral) {
        let altSis = 'PRICE';
        let try2 = getMaxAvaliableFinancing(altSis, valor_financiado_max_geral, prazo_meses);
        tentativas.push(`Tentativa 2: ${altSis} ${prazo_meses}x -> Financia até: R$ ${try2.maxFin.toFixed(2)}`);
        
        if (try2.maxFin > melhor_cenario.val_fin) {
           melhor_cenario = { sis: altSis, prazo: prazo_meses, val_fin: try2.maxFin, cmt: try2.cmt };
           tentativas.push("Resultado: PRICE aprovou valor maior de financiamento.");
        }
    }

    // Tentativa 3: Estender Prazo se muito baixo (Max 420)
    let max_prazo = 420;
    if (melhor_cenario.val_fin < valor_financiado_max_geral && melhor_cenario.prazo < max_prazo && score_viabilidade > 50) {
        let try3 = getMaxAvaliableFinancing(melhor_cenario.sis, valor_financiado_max_geral, max_prazo);
        tentativas.push(`Tentativa 3: Estendendo prazo para ${max_prazo}x no ${melhor_cenario.sis} -> R$ ${try3.maxFin.toFixed(2)}`);
        if (try3.maxFin > melhor_cenario.val_fin) {
            melhor_cenario = { sis: melhor_cenario.sis, prazo: max_prazo, val_fin: try3.maxFin, cmt: try3.cmt };
            tentativas.push("Resultado: Estender prazo melhorou viabilidade.")
        }
    }

    let sistema_amortizacao_final = melhor_cenario.sis;
    let valor_financiado = melhor_cenario.val_fin;
    let prazo_final = melhor_cenario.prazo;
    let cmt_final = melhor_cenario.cmt;
    let teve_mudanca_para_price = sistema_amortizacao === 'SAC' && sistema_amortizacao_final === 'PRICE';

    // 4. Calculando as entradas
    let entrada_minima_bruta = valor_imovel - valor_financiado; 
    let valor_absorvido_subsidio = Math.min(subsidio, entrada_minima_bruta);
    let entrada_minima_apos_subsidio = entrada_minima_bruta - valor_absorvido_subsidio;
    
    let valor_fgts_utilizado = Math.min(fgts_disponivel, entrada_minima_apos_subsidio);
    let entrada_minima_necessaria = Math.max(0, entrada_minima_apos_subsidio - valor_fgts_utilizado);

    let entrada_informada = Number(entrada_preferencial_usuario) || 0;
    
    // Ajuste da recomendação orgânica (Dinâmica)
    let entrada_a_pagar = Math.max(entrada_informada, entrada_minima_necessaria);
    
    // Pequena otimização final: se a entrada minima é zero e LTV está baixo de 80, LTV real vai ficar ok.
    let ltv_efetivo = valor_financiado / valor_imovel * 100;
    let chance_aprovacao = score_viabilidade > 80 ? "Alta" : score_viabilidade > 60 ? "Média" : "Exige Avaliação";

    if (ltv_efetivo > 80) chance_aprovacao = "Condicionada à entrada manual";

    let entrada_otimizada = entrada_minima_necessaria;
    let entrada_ideal = entrada_minima_necessaria > 0 ? entrada_minima_necessaria + (valor_imovel * 0.05) : 0; 
    if (score_viabilidade < 60) { // Perfil ruim, banco exige um pouco mais
        entrada_ideal = entrada_minima_necessaria + (valor_imovel * 0.10);
    }
    
    let estrategia_aprovacao = `Simulação Base em ${sistema_amortizacao_final} / ${prazo_final}x. `;
    if (entrada_informada < entrada_minima_necessaria && entrada_informada > 0) {
        estrategia_aprovacao += `Entrada informada (R$ ${entrada_informada}) abaixo do mínimo para aprovação. O sistema ajustou para R$ ${entrada_minima_necessaria.toFixed(2)}. `;
    }
    if (entrada_minima_necessaria === 0 && entrada_informada === 0) {
        estrategia_aprovacao += `Cenário otimizado! Imóvel 100% coberto pelo financiamento associado a FGTS e Subsídio.`;
    }

    // Recalcula o financiamento final real considerando a entrada que será de fato investida.
    let financiamento_final_real = valor_imovel - entrada_a_pagar - valor_fgts_utilizado - valor_absorvido_subsidio;
    financiamento_final_real = Math.max(0, financiamento_final_real);

    let parcelas = calcularParcelas(sistema_amortizacao_final, financiamento_final_real, prazo_final);

    let total_juros = 0;
    let total_pago = 0;
    parcelas.forEach(p => {
       total_juros += p.juros;
       total_pago += p.parcela_total;
    });

    const custo_itbi_cartorio = valor_imovel * 0.04;

    res.json({
      resumo: {
        valor_imovel: Number(valor_imovel.toFixed(2)),
        valor_financiado: Number(financiamento_final_real.toFixed(2)),
        entrada_exigida: Number(entrada_minima_bruta.toFixed(2)),
        entrada_a_pagar: Number(entrada_a_pagar.toFixed(2)),
        subsidio: Number(valor_absorvido_subsidio.toFixed(2)),
        subsidio_concedido: Number(subsidio.toFixed(2)), // Subsidio base da regra (pode sobrar)
        taxa_juros_anual_aplicada: Number(taxa_juros_anual.toFixed(2)),
        sistema_amortizacao_final: sistema_amortizacao_final,
        alerta_mudanca_sistema: teve_mudanca_para_price,
        parcela_1: Number(parcelas[0]?.parcela_total.toFixed(2) || 0),
        ultima_parcela: Number(parcelas[parcelas.length-1]?.parcela_total.toFixed(2) || 0),
        total_juros_pago: Number(total_juros.toFixed(2)),
        total_pago_final: Number(total_pago.toFixed(2)),
        custos: {
           estimativa_itbi_registro: Number(custo_itbi_cartorio.toFixed(2)),
           doc_gratis: false 
        },
        // --- Campos Avançados Engine MCMV ---
        subsidioreal_calculado: Number(subsidio.toFixed(2)),
        entrada_informada: entrada_informada,
        entrada_minima_necessaria: Number(entrada_minima_necessaria.toFixed(2)),
        entrada_ideal: Number(entrada_ideal.toFixed(2)),
        entrada_otimizada: Number(entrada_otimizada.toFixed(2)),
        valor_fgts_utilizado: Number(valor_fgts_utilizado.toFixed(2)),
        valor_absorvido_subsidio: Number(valor_absorvido_subsidio.toFixed(2)),
        estrategia_aprovacao: estrategia_aprovacao,
        score_viabilidade: score_viabilidade,
        chance_aprovacao: chance_aprovacao,
        sistema_recomendado: sistema_amortizacao_final,
        ltv: Number(ltv_efetivo.toFixed(1)),
        comprometimento_renda: Number(cmt_final.toFixed(1)),
        tentativas_realizadas: tentativas
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
