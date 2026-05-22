import React, { useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useSimuladorStore } from '../store/simuladorStore';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, ReferenceLine, Legend } from 'recharts';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

export default function SimuladorMCMV() {
  const { data, result, loading, error, step, updateData, setResult, setLoading, setError, setStep, reset } = useSimuladorStore();
  const pdfRef = useRef<HTMLDivElement>(null);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    let parsedValue: any = value;
    if (type === 'checkbox') {
      parsedValue = (e.target as HTMLInputElement).checked;
    } else if (type === 'number') {
      parsedValue = value === '' ? '' : Number(value);
    }
    updateData({ [name]: parsedValue });
  };

  const nextStep = () => setStep(step + 1);
  const prevStep = () => setStep(step - 1);

  const simulate = async () => {
    setLoading(true);
    setError('');
    nextStep();
    
    try {
      const response = await fetch('/api/simulacao-mcmv', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...data,
          valor_imovel: Number(data.valor_imovel),
          renda_bruta_familiar: Number(data.renda_bruta_familiar),
          saldo_fgts: Number(data.saldo_fgts || 0),
          entrada_preferencial_usuario: Number(data.entrada_preferencial_usuario || 0),
          subsidio_maximo_municipio: Number(data.subsidio_maximo_municipio || 0),
          idade_comprador_principal: Number(data.idade_comprador_principal || 30)
        })
      });

      const responseData = await response.json();
      
      if (!response.ok) {
        throw new Error(responseData.error || 'Erro ao simular');
      }

      setResult(responseData);
      setStep(4);
    } catch (err: any) {
      setError(err.message);
      setStep(4);
    } finally {
      setLoading(false);
    }
  };

  const handleExportPDF = async () => {
    if (!pdfRef.current) return;
    
    try {
      const canvas = await html2canvas(pdfRef.current, { scale: 2 });
      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF('p', 'mm', 'a4');
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = (canvas.height * pdfWidth) / canvas.width;
      
      pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
      pdf.save(`Simulacao_MCMV_${new Date().getTime()}.pdf`);
    } catch (err) {
      console.error('Erro ao gerar PDF', err);
    }
  };

  // Convert array to format recharts prefers
  const chartData = result?.projecao?.filter((_:any, index:number) => index % 12 === 0 || index === result.projecao.length - 1).map((p: any) => ({
    mes: `Mês ${p.mes}`,
    ano: `Ano ${Math.ceil(p.mes/12)}`,
    parcela: p.parcela_total,
    amortizacao: p.amortizacao,
    juros: p.juros,
    saldo: p.saldo_devedor
  })) || [];

  return (
    <div className="w-full max-w-4xl mx-auto p-4 sm:p-6" ref={pdfRef}>
      <div className="bg-white rounded-2xl shadow-xl overflow-hidden border border-gray-100">
        
        {/* Header */}
        <div className="bg-gradient-to-r from-[#005CA9] to-blue-800 p-6 text-white flex justify-between items-center">
          <div>
            <h2 className="text-2xl font-bold tracking-tight">Simulador MCMV 2026 (Enterprise)</h2>
            <p className="text-blue-100 text-sm mt-1">Crédito Inteligente e Inteligência Atuarial</p>
          </div>
          <div className="flex items-center">
            <img src="/banner.png" alt="Banner" className="h-12 object-contain opacity-90" referrerPolicy="no-referrer" />
          </div>
        </div>

        <div className="p-4 sm:p-8">
          <AnimatePresence mode="wait">
            
            {/* Step 1: Imóvel */}
            {step === 1 && (
              <motion.div key="step1" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-6">
                <div className="border-b border-gray-100 pb-4 mb-4">
                  <h3 className="text-xl font-bold text-gray-800 flex items-center">
                    <span className="bg-[#F39200] text-white w-8 h-8 rounded-full flex items-center justify-center mr-3 text-sm">1</span>
                    Parâmetros do Imóvel e Financiamento
                  </h3>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Valor do Imóvel (R$)</label>
                    <input type="number" name="valor_imovel" value={data.valor_imovel} onChange={handleChange} className="w-full border-gray-300 rounded-lg p-3 border focus:ring-2 focus:ring-[#005CA9] focus:border-[#005CA9] transition-all outline-none" placeholder="Ex: 250000" />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Sistema de Amortização (Preferência)</label>
                    <select name="sistema_amortizacao" value={data.sistema_amortizacao} onChange={handleChange} className="w-full border-gray-300 rounded-lg p-3 border focus:ring-2 focus:ring-[#005CA9] focus:border-[#005CA9] transition-all outline-none">
                      <option value="SAC">SAC (Decrescente)</option>
                      <option value="PRICE">PRICE (Fixa)</option>
                    </select>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Região do Imóvel</label>
                    <select name="regiao_imovel" value={data.regiao_imovel} onChange={handleChange} className="w-full border-gray-300 rounded-lg p-3 border focus:ring-2 focus:ring-[#005CA9] transition-all outline-none">
                      <option value="Norte">Norte</option>
                      <option value="Nordeste">Nordeste</option>
                      <option value="Centro-Oeste">Centro-Oeste</option>
                      <option value="Sudeste">Sudeste</option>
                      <option value="Sul">Sul</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Teto de Subsídio Local (R$)</label>
                    <input type="number" name="subsidio_maximo_municipio" value={data.subsidio_maximo_municipio} onChange={handleChange} className="w-full border-gray-300 rounded-lg p-3 border focus:ring-2 focus:ring-[#005CA9] transition-all outline-none" />
                  </div>
                </div>

                <div className="pt-4 text-right">
                  <button onClick={nextStep} disabled={!data.valor_imovel} className="bg-[#F39200] hover:bg-orange-500 text-white font-bold py-3 px-8 rounded-lg transition-colors disabled:opacity-50">
                    Avançar para Perfil &rarr;
                  </button>
                </div>
              </motion.div>
            )}

            {/* Step 2: Dados Pessoais */}
            {step === 2 && (
              <motion.div key="step2" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-6">
                <div className="border-b border-gray-100 pb-4 mb-4">
                  <h3 className="text-xl font-bold text-gray-800 flex items-center">
                    <span className="bg-[#F39200] text-white w-8 h-8 rounded-full flex items-center justify-center mr-3 text-sm">2</span>
                    Perfil Financeiro do Comprador
                  </h3>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Renda Bruta Familiar (R$)</label>
                    <input type="number" name="renda_bruta_familiar" value={data.renda_bruta_familiar} onChange={handleChange} className="w-full border-gray-300 rounded-lg p-3 border focus:ring-2 focus:ring-[#005CA9] transition-all outline-none" placeholder="Ex: 5000" />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Saldo FGTS Disponível (R$)</label>
                    <input type="number" name="saldo_fgts" value={data.saldo_fgts} onChange={handleChange} className="w-full border-gray-300 rounded-lg p-3 border focus:ring-2 focus:ring-[#005CA9] transition-all outline-none" placeholder="Ex: 10000" />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Entrada Desejada (Opcional) (R$)</label>
                    <input type="number" name="entrada_preferencial_usuario" value={data.entrada_preferencial_usuario} onChange={handleChange} className="w-full border-gray-300 rounded-lg p-3 border focus:ring-2 focus:ring-[#005CA9] transition-all outline-none" placeholder="Deixe 0 para mínima" />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Idade do Comprador Principal</label>
                    <input type="number" name="idade_comprador_principal" value={data.idade_comprador_principal} onChange={handleChange} className="w-full border-gray-300 rounded-lg p-3 border focus:ring-2 focus:ring-[#005CA9] transition-all outline-none" />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Prazo de Financiamento (Meses)</label>
                    <input type="number" name="prazo_meses" value={data.prazo_meses} onChange={handleChange} className="w-full border-gray-300 rounded-lg p-3 border focus:ring-2 focus:ring-[#005CA9] transition-all outline-none" />
                  </div>
                </div>

                <div className="flex flex-col sm:flex-row gap-6 pt-2 bg-gray-50 p-4 rounded-xl border border-gray-100">
                  <label className="flex items-center gap-3 cursor-pointer">
                    <input type="checkbox" name="tem_3_anos_fgts" checked={data.tem_3_anos_fgts} onChange={handleChange} className="w-5 h-5 text-[#005CA9] rounded focus:ring-[#005CA9]" />
                    <span className="text-sm font-bold text-gray-700">Mais de 3 Anos de FGTS Contribuição</span>
                  </label>
                  
                  <label className="flex items-center gap-3 cursor-pointer">
                    <input type="checkbox" name="tem_dependente" checked={data.tem_dependente} onChange={handleChange} className="w-5 h-5 text-[#005CA9] rounded focus:ring-[#005CA9]" />
                    <span className="text-sm font-bold text-gray-700">Possui Dependente (Filhos/Cônjuge)</span>
                  </label>
                </div>

                <div className="pt-4 flex justify-between flex-wrap gap-4">
                  <button onClick={prevStep} className="text-gray-600 font-bold py-3 px-6 rounded-lg border border-gray-300 hover:bg-gray-50 transition-colors">&larr; Voltar</button>
                  <button onClick={simulate} disabled={!data.renda_bruta_familiar} className="bg-[#005CA9] hover:bg-blue-800 text-white font-bold py-3 px-8 rounded-lg shadow-lg hover:shadow-xl transition-all disabled:opacity-50">Processar Simulação de Crédito</button>
                </div>
              </motion.div>
            )}

            {/* Step 3: Loading */}
            {step === 3 && (
              <motion.div key="step3" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="py-24 text-center flex flex-col items-center justify-center space-y-4">
                <div className="w-16 h-16 border-4 border-blue-100 border-t-[#005CA9] rounded-full animate-spin"></div>
                <h3 className="text-xl font-bold text-gray-700">Validando regras operacionais MCMV 2026...</h3>
                <p className="text-gray-400 text-sm">Calculando atuária, SECOVI e margem de 30% da renda familiar bruta.</p>
              </motion.div>
            )}

            {/* Step 4: Results */}
            {step === 4 && (
              <motion.div key="step4" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
                {error ? (
                  <div className="bg-red-50 border-l-4 border-red-500 p-6 rounded-lg shadow-sm">
                    <h3 className="text-red-800 font-bold text-lg mb-2">Simulação Interrompida</h3>
                    <p className="text-red-700">{error}</p>
                    <button onClick={prevStep} className="mt-4 bg-white text-gray-800 border border-gray-300 font-bold py-2 px-6 rounded-lg hover:bg-gray-50">Ajustar Dados</button>
                  </div>
                ) : result?.resumo && (
                  <div>
                    <div className="mb-6 flex justify-between items-start">
                       <div>
                         <h3 className="text-2xl font-black text-gray-900 border-b-2 border-[#F39200] pb-2 inline-block">Proposta Gerada</h3>
                         <p className="text-gray-500 mt-2 font-medium">Validado conforme cartilha SFH e normativas 2026</p>
                       </div>
                       <button onClick={handleExportPDF} className="bg-gray-900 text-white px-4 py-2 rounded-lg text-sm font-bold shadow-md hover:bg-gray-700 transition hover:scale-105">Baixar PDF Comercial</button>
                    </div>

                    {result.resumo.alerta_mudanca_sistema && (
                      <div className="bg-orange-50 border border-orange-200 text-orange-800 p-4 rounded-xl mb-6 shadow-sm flex items-start">
                        <span className="text-orange-500 text-xl mr-3 font-bold">⚠️</span>
                        <div>
                          <strong className="block text-sm mb-1 uppercase tracking-wider">Análise de Risco (Aviso Automático):</strong>
                          <p className="text-sm">Sua renda não suportou a amortização SAC sem infringir o teto de 30%. O sistema migrou automaticamente seu enquadramento para <strong>Tabela PRICE</strong> a fim de aprovar a proposta e manter a segurança financeira estabelecida pelo Bacen.</p>
                        </div>
                      </div>
                    )}

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                      <div className={`p-6 rounded-2xl border-2 ${result.resumo.entrada_a_pagar <= 0 ? 'bg-green-50 border-green-500' : 'bg-gray-50 border-[#005CA9]/30'} shadow-sm relative`}>
                        {result.resumo.entrada_a_pagar <= 0 && <div className="absolute -top-3 -right-3 bg-green-500 text-white text-xs font-black px-4 py-1.5 rounded-full shadow-lg transform rotate-6 border-white border-2">ENTRADA ZERO!</div>}
                        <div className="text-xs text-gray-500 font-bold uppercase tracking-wider mb-1">Entrada Final a Pagar</div>
                        <div className={`text-3xl font-black ${result.resumo.entrada_a_pagar <= 0 ? 'text-green-600' : 'text-[#005CA9]'}`}>
                          R$ {result.resumo.entrada_a_pagar.toLocaleString('pt-BR', {minimumFractionDigits: 2})}
                        </div>
                        <div className="text-xs text-gray-400 mt-2 font-medium">
                           Mínima p/ aprovar: R$ {result.resumo.entrada_minima_necessaria.toLocaleString('pt-BR', {minimumFractionDigits: 2})}
                        </div>
                      </div>

                      <div className="p-6 rounded-2xl bg-orange-50 border-2 border-orange-200 shadow-sm relative">
                        <div className="text-xs text-orange-800 font-bold uppercase tracking-wider mb-1">Subsídio Utilizado</div>
                        <div className="text-3xl font-black text-[#F39200]">
                          R$ {result.resumo.valor_absorvido_subsidio.toLocaleString('pt-BR', {minimumFractionDigits: 2})}
                        </div>
                        <div className="text-xs text-orange-600 mt-2 font-medium">
                           Abatido da entrada automaticamente.
                           {result.resumo.subsidio_concedido > result.resumo.valor_absorvido_subsidio && ` (Total Concedido: R$ ${result.resumo.subsidio_concedido.toLocaleString('pt-BR', {minimumFractionDigits: 2})})`}
                        </div>
                      </div>
                      
                      <div className="p-6 rounded-2xl bg-gray-50 border-2 border-gray-200 shadow-sm">
                        <div className="text-xs text-gray-600 font-bold uppercase tracking-wider mb-1">FGTS Utilizado</div>
                        <div className="text-3xl font-black text-gray-800">
                          R$ {result.resumo.valor_fgts_utilizado.toLocaleString('pt-BR', {minimumFractionDigits: 2})}
                        </div>
                        <div className="text-xs text-gray-500 mt-2 font-medium">
                           Absorveu parte da entrada
                        </div>
                      </div>
                    </div>
                    
                    <div className="bg-blue-50 border border-blue-200 p-4 rounded-xl mb-6 shadow-sm">
                        <strong className="block text-sm mb-1 uppercase tracking-wider text-blue-900">Estratégia do Motor Bancário:</strong>
                        <p className="text-sm text-blue-800 font-medium">{result.resumo.estrategia_aprovacao}</p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-4">
                       <div className="bg-white rounded-2xl p-6 border border-gray-200 shadow-sm">
                         <h4 className="text-sm font-bold uppercase text-gray-400 mb-4 tracking-wider">Financiamento Caixa</h4>
                         <div className="text-3xl font-black text-gray-800 mb-4">
                           R$ {result.resumo.valor_financiado.toLocaleString('pt-BR', {minimumFractionDigits: 2})}
                         </div>
                         <div className="text-xs text-gray-500 font-medium space-x-2 mb-4">
                            <span className="bg-gray-200 px-2 py-1 rounded text-[10px] uppercase font-bold text-gray-800">{result.resumo.sistema_amortizacao_final}</span>
                            <span className="font-bold border-l pl-2 border-gray-300">CET: {result.resumo.taxa_juros_anual_aplicada}% a.a.</span>
                         </div>
                         
                         <div className="flex justify-between items-center bg-gray-50 p-4 rounded-xl mb-3 mt-2">
                           <div>
                             <span className="block text-[10px] text-gray-500 font-bold uppercase">Primeira Parcela</span>
                             <span className="text-xl font-black text-[#005CA9]">R$ {result.resumo.parcela_1.toLocaleString('pt-BR', {minimumFractionDigits:2})}</span>
                           </div>
                           <div className="text-xl text-gray-300 font-light">&rarr;</div>
                           <div className="text-right">
                             <span className="block text-[10px] text-gray-500 font-bold uppercase">Última Parcela</span>
                             <span className="text-xl font-black text-gray-800">R$ {result.resumo.ultima_parcela.toLocaleString('pt-BR', {minimumFractionDigits:2})}</span>
                           </div>
                         </div>
                       </div>

                       <div className="bg-white rounded-2xl p-6 border border-gray-200 shadow-sm">
                         <h4 className="text-sm font-bold uppercase text-gray-400 mb-4 tracking-wider">Custos de Documentação (ITBI)</h4>
                         
                         <div className="bg-red-50 text-red-900 p-4 rounded-xl border border-red-100 flex items-center">
                            <div className="bg-red-100 p-3 rounded-full mr-4 text-red-700">
                               📄
                            </div>
                            <div>
                               <span className="text-[10px] font-bold uppercase tracking-widest text-red-700 block mb-0.5">Estimativa em Cartório (~4%)</span>
                               <span className="text-xl font-black block leading-none">R$ {result.resumo.custos.estimativa_itbi_registro.toLocaleString('pt-BR', {minimumFractionDigits: 2})}</span>
                            </div>
                         </div>
                       </div>
                    </div>

                    <div className="mt-8 bg-white border border-gray-100 rounded-2xl p-6 shadow-sm">
                      <h4 className="text-sm font-bold uppercase text-gray-500 mb-6 tracking-widest">Evolução do Saldo vs. Parcela ao longo dos anos</h4>
                      <div className="h-64 sm:h-80 w-full" style={{ minWidth: 0, minHeight: 0 }}>
                        <ResponsiveContainer width="100%" height="100%" minWidth={1} minHeight={1}>
                          <AreaChart data={chartData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                            <defs>
                              <linearGradient id="colorParcela" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor="#F39200" stopOpacity={0.8}/>
                                <stop offset="95%" stopColor="#F39200" stopOpacity={0}/>
                              </linearGradient>
                            </defs>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E7EB" />
                            <XAxis dataKey="ano" axisLine={false} tickLine={false} tick={{fill: '#9CA3AF', fontSize: 12}} />
                            <YAxis axisLine={false} tickLine={false} tick={{fill: '#9CA3AF', fontSize: 12}} width={90} tickFormatter={(val) => `R$ ${val.toLocaleString()}`} />
                            <Tooltip 
                               formatter={(val: number) => `R$ ${val.toLocaleString('pt-BR', {minimumFractionDigits: 2})}`}
                               contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                            />
                            <Legend wrapperStyle={{ paddingTop: '20px' }}/>
                            <Area type="monotone" dataKey="parcela" name="Valor da Parcela (R$)" stroke="#F39200" strokeWidth={3} fillOpacity={1} fill="url(#colorParcela)" />
                          </AreaChart>
                        </ResponsiveContainer>
                      </div>
                    </div>

                    <div className="mt-8 text-center flex justify-center border-t border-gray-100 pt-8">
                      <button onClick={reset} className="text-gray-500 font-bold hover:text-[#005CA9] transition-colors uppercase text-sm tracking-widest flex items-center">
                        <span className="mr-2">⟲</span> Realizar Nova Proposta
                      </button>
                    </div>
                  </div>
                )}
              </motion.div>
            )}

          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}
