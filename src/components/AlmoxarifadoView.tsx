import React, { useState } from 'react';
import { PackageMinus, PackagePlus, Clock, PackageSearch, Search } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { toast } from 'sonner';

const CATEGORIES = [
  'Fundação e Estrutura',
  'Alvenaria e Vedação',
  'Instalações Elétricas/Hidráulicas',
  'Acabamento e Revestimento',
  'Equipamentos'
];

export default function AlmoxarifadoView({ data, user, onRefresh }: any) {
  const [form, setForm] = useState({ material_id: '', tipo_operacao: 'SAIDA', quantidade: '', funcionario_matricula: '', justificativa: '' });
  const [activeTab, setActiveTab] = useState(CATEGORIES[0]);
  const [historyModal, setHistoryModal] = useState<any>(null);
  const [showAuditModal, setShowAuditModal] = useState(false);
  const [auditSearch, setAuditSearch] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (form.quantidade <= 0) return toast.error('Quantidade deve ser maior que zero.');
    try {
      const res = await fetch(`/api/materials/${form.material_id}/movement`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({...form, funcionario_matricula: user.matricula}) 
      });
      if (res.ok) {
        toast.success('Movimentação registrada com sucesso!');
        setForm({ ...form, quantidade: 0, justificativa: '', funcionario_matricula: '' });
        onRefresh();
      } else {
        const err = await res.json();
        toast.error('Erro: ' + (err.details || err.error));
      }
    } catch {
      toast.error('Erro ao conectar ao servidor.');
    }
  };

  const filteredMaterials = data.materials?.filter((m: any) => m.categoria === activeTab) || [];

  const filteredAuditMovements = (data.materialMovements || []).filter((mov: any) => {
    const matName = mov.materials?.nome || data.materials?.find((m: any) => m.id === mov.material_id)?.nome || '';
    const staffName = data.staff?.find((s:any) => s.matricula === mov.funcionario_matricula)?.nome || mov.funcionario_matricula || '';
    const query = auditSearch.toLowerCase();
    return (
      matName.toLowerCase().includes(query) ||
      staffName.toLowerCase().includes(query) ||
      (mov.justificativa || '').toLowerCase().includes(query) ||
      (mov.tipo_operacao || '').toLowerCase().includes(query)
    );
  });

  return (
    <div className="space-y-6">
      <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-100 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
         <div>
            <h2 className="text-lg font-bold text-gray-800 flex items-center"><PackageSearch className="mr-2 text-blue-600"/> Painel do Almoxarifado</h2>
            <p className="text-[10px] sm:text-xs text-gray-500 font-bold uppercase tracking-widest mt-1">Gestão Setorizada de Materiais e Equipamentos</p>
         </div>
         <button onClick={() => setShowAuditModal(true)} className="flex items-center px-4 py-2 rounded-full text-xs font-bold uppercase transition-all bg-amber-50 text-amber-700 hover:bg-amber-100 border border-amber-200 shadow-sm">
            <Clock size={14} className="mr-1.5" /> Auditoria de Movimentações
         </button>
      </div>

      {/* Seção do Dashboard do Almoxarifado */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
         {/* Card 1: Total de Itens */}
         <div className="bg-white p-5 rounded-xl shadow-sm border border-gray-100 flex items-center justify-between">
            <div>
               <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">Total de Materiais</p>
               <p className="text-2xl font-black text-gray-800">{data.materials?.length || 0}</p>
            </div>
            <div className="bg-[#eff6ff] text-blue-600 p-2.5 rounded-lg animate-pulse">
               <PackageSearch size={22} />
            </div>
         </div>

         {/* Card 2: Estoque Crítico */}
         <div className="bg-white p-5 rounded-xl shadow-sm border border-gray-100 flex items-center justify-between">
            <div>
               <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">Estoque Crítico</p>
               <p className="text-2xl font-black text-rose-600">
                  {data.materials?.filter((m: any) => m.saldo_unidades <= m.estoque_minimo).length || 0}
               </p>
            </div>
            <div className="bg-rose-50 text-rose-600 p-2.5 rounded-lg">
               <PackageMinus size={22} />
            </div>
         </div>

         {/* Card 3: Total Movimentado */}
         <button 
            type="button"
            onClick={() => setShowAuditModal(true)}
            className="bg-white p-5 rounded-xl shadow-sm border border-gray-100 flex items-center justify-between text-left hover:shadow-md transition-all group w-full cursor-pointer"
         >
            <div>
               <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1 group-hover:text-blue-600 transition-colors">Movimentações Registradas</p>
               <p className="text-2xl font-black text-emerald-600 flex items-baseline gap-1.5 leading-none">
                  {data.materialMovements?.length || 0}
                  <span className="text-[9px] font-bold text-gray-400 uppercase tracking-wider block sm:inline mt-1 sm:mt-0">(Clique para Auditoria)</span>
               </p>
            </div>
            <div className="bg-emerald-50 text-emerald-600 p-2.5 rounded-lg group-hover:bg-emerald-100 transition-all">
               <Clock size={22} />
            </div>
         </button>
      </div>

      {/* Distribuição por Seção (Dashboard do Almoxarifado) */}
      <div className="bg-white p-5 rounded-xl shadow-sm border border-gray-100">
         <h3 className="font-bold text-gray-800 text-xs uppercase tracking-widest mb-4 flex items-center">
            <span className="w-2.5 h-2.5 bg-blue-600 rounded-full mr-2"></span>
            Distribuição por Seções do Almoxarifado
         </h3>
         <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3">
            {CATEGORIES.map(cat => {
               const count = data.materials?.filter((m: any) => m.categoria === cat).length || 0;
               const lowStockCount = data.materials?.filter((m: any) => m.categoria === cat && m.saldo_unidades <= m.estoque_minimo).length || 0;
               const isActive = activeTab === cat;
               return (
                  <button 
                     key={cat}
                     type="button"
                     onClick={() => { setActiveTab(cat); setForm({...form, material_id: ''}); }}
                     className={`p-3 rounded-lg border text-left transition-all relative overflow-hidden flex flex-col justify-between h-24 ${
                        isActive 
                           ? 'bg-blue-50/50 border-blue-600 shadow-sm ring-1 ring-blue-600/20' 
                           : 'bg-gray-50/50 border-gray-200 hover:bg-gray-50'
                     }`}
                  >
                     <div>
                        <h4 className={`text-[10px] font-bold tracking-tight mb-1 truncate ${isActive ? 'text-blue-700 font-extrabold' : 'text-gray-500'}`}>{cat}</h4>
                        <span className="text-lg font-black text-gray-900">{count} <span className="text-[10px] text-gray-500 font-medium lowercase">itens</span></span>
                     </div>
                     {lowStockCount > 0 && (
                        <span className="mt-1.5 self-start px-2 py-0.5 rounded text-[8px] font-bold bg-amber-50 text-amber-700 border border-amber-200 uppercase tracking-wide">
                           {lowStockCount} Crítico{lowStockCount > 1 ? 's' : ''}
                        </span>
                     )}
                  </button>
               );
            })}
         </div>
      </div>

      {/* Tabs */}
      <div className="flex overflow-x-auto hide-scrollbar space-x-2 pb-2">
         {CATEGORIES.map(cat => (
           <button
             key={cat}
             onClick={() => { setActiveTab(cat); setForm({...form, material_id: ''}); }}
             className={`whitespace-nowrap px-4 py-3 rounded-lg text-xs font-bold uppercase tracking-widest transition-all ${activeTab === cat ? 'bg-blue-600 text-white shadow-md' : 'bg-white text-gray-500 hover:bg-gray-50 border border-gray-200'}`}
           >
             {cat}
           </button>
         ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
         {/* Form */}
         <AnimatePresence mode="wait">
           <motion.div 
             key={activeTab}
             initial={{ opacity: 0, y: 10 }}
             animate={{ opacity: 1, y: 0 }}
             className="bg-white p-4 sm:p-6 rounded-lg shadow-sm border border-gray-100"
           >
              <h3 className="font-bold text-gray-700 mb-4 uppercase tracking-widest text-xs border-b pb-2">Registrar Movimentação</h3>
              <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="grid grid-cols-2 gap-3 sm:gap-4 mb-4">
                    <button type="button" onClick={() => setForm({...form, tipo_operacao: 'SAIDA'})} className={`py-3 rounded-lg text-xs font-bold uppercase transition-all flex flex-col items-center justify-center ${form.tipo_operacao === 'SAIDA' ? 'bg-amber-100 text-amber-700 ring-2 ring-amber-400' : 'bg-gray-50 text-gray-400 hover:bg-gray-100'}`}>
                      <PackageMinus className="mb-1" size={18} /> Saída
                    </button>
                    <button type="button" onClick={() => setForm({...form, tipo_operacao: 'DEVOLUCAO'})} className={`py-3 rounded-lg text-xs font-bold uppercase transition-all flex flex-col items-center justify-center ${form.tipo_operacao === 'DEVOLUCAO' ? 'bg-blue-100 text-blue-700 ring-2 ring-blue-400' : 'bg-gray-50 text-gray-400 hover:bg-gray-100'}`}>
                      <PackagePlus className="mb-1" size={18} /> Devolução
                    </button>
                  </div>
                  
                  <div>
                     <label className="block text-[10px] sm:text-xs font-bold text-gray-500 uppercase mb-1">Material em {activeTab}</label>
                     <select required className="w-full px-3 py-3 sm:py-2 border rounded-md outline-none bg-white text-sm" value={form.material_id} onChange={e => setForm({...form, material_id: e.target.value})}>
                        <option value="">Selecione o material...</option>
                        {filteredMaterials.map((m: any) => (
                           <option key={m.id} value={m.id}>{m.nome} (Estoque: {m.saldo_unidades})</option>
                        ))}
                     </select>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                    <div>
                       <label className="block text-[10px] sm:text-xs font-bold text-gray-500 uppercase mb-1">Qtd (Unidades)</label>
                       <input type="number" required min="1" className="w-full px-3 py-3 sm:py-2 border rounded-md outline-none text-sm" value={form.quantidade} onChange={e => setForm({...form, quantidade: Number(e.target.value)})} />
                    </div>
                    <div>
                       <label className="block text-[10px] sm:text-xs font-bold text-gray-500 uppercase mb-1">Matrícula (Responsável)</label>
                       <input required className="w-full px-3 py-3 sm:py-2 border rounded-md outline-none text-sm" placeholder="Ex: E1001" value={form.funcionario_matricula} onChange={e => setForm({...form, funcionario_matricula: e.target.value})} />
                    </div>
                  </div>

                  <div>
                     <label className="block text-[10px] sm:text-xs font-bold text-gray-500 uppercase mb-1">Finalidade da Retirada / Onde será usado</label>
                     <textarea required className="w-full px-3 py-3 sm:py-2 border rounded-md outline-none text-sm" rows={3} value={form.justificativa} onChange={e => setForm({...form, justificativa: e.target.value})}></textarea>
                  </div>

                  <button type="submit" className={`w-full text-white font-bold py-3 pt-4 pb-4 sm:py-3 rounded-md text-sm uppercase transition-all shadow-md ${form.tipo_operacao === 'SAIDA' ? 'bg-amber-600 hover:bg-amber-700' : 'bg-blue-600 hover:bg-blue-700'}`}>
                     CONFIRMAR {form.tipo_operacao}
                  </button>
              </form>
           </motion.div>
         </AnimatePresence>

         {/* Extrato / List of Materials */}
         <div className="bg-white rounded-lg shadow-sm border border-gray-100 flex flex-col h-[600px]">
            <div className="px-4 sm:px-6 py-4 border-b border-gray-100 flex items-center justify-between">
              <h3 className="font-bold text-gray-700 text-xs uppercase tracking-widest">Estoque: {activeTab}</h3>
            </div>
            <div className="p-4 overflow-y-auto flex-1 space-y-3">
               {filteredMaterials.map((m: any) => {
                 const isCritico = m.saldo_unidades <= m.estoque_minimo;
                 return (
                   <div key={m.id} className={`group relative p-3 border-l-4 rounded-lg bg-gray-50 flex items-start justify-between overflow-hidden ${isCritico ? 'border-amber-400 bg-amber-50' : 'border-blue-400'}`}>
                      <div>
                         <p className="font-bold text-gray-800 text-sm">{m.nome}</p>
                         <p className="text-[10px] text-gray-500 font-medium uppercase tracking-widest mt-1">Min: {m.estoque_minimo} | Fator: {m.fator_multiplicador}</p>
                      </div>
                      <div className="text-right">
                         <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-widest ${isCritico ? 'bg-amber-100 text-amber-700' : 'bg-blue-100 text-blue-700'}`}>
                            {m.saldo_unidades} {m.unidade_medida}
                         </span>
                         {isCritico && <p className="text-[10px] font-black text-amber-600 uppercase mt-1">Estoque Baixo</p>}
                      </div>
                      
                      {/* Hover Actions */}
                      <div className="absolute inset-0 bg-white/95 backdrop-blur-sm opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center space-x-3 rounded-lg px-2">
                         <button 
                           onClick={() => { setForm({...form, material_id: m.id, tipo_operacao: 'SAIDA'}); window.scrollTo({ top: 0, behavior: 'smooth' }); }}
                           className="flex items-center space-x-1 px-3 py-1.5 bg-amber-100 text-amber-700 hover:bg-amber-200 rounded-md text-xs font-bold uppercase transition-colors"
                         >
                           <PackageMinus size={14} /> <span>Saída</span>
                         </button>
                         <button 
                           onClick={() => { setForm({...form, material_id: m.id, tipo_operacao: 'DEVOLUCAO'}); window.scrollTo({ top: 0, behavior: 'smooth' }); }}
                           className="flex items-center space-x-1 px-3 py-1.5 bg-blue-100 text-blue-700 hover:bg-blue-200 rounded-md text-xs font-bold uppercase transition-colors"
                         >
                           <PackagePlus size={14} /> <span>Devolução</span>
                         </button>
                         <button 
                           onClick={() => setHistoryModal(m)}
                           className="flex items-center space-x-1 px-3 py-1.5 bg-gray-100 text-gray-700 hover:bg-gray-200 rounded-md text-xs font-bold uppercase transition-colors"
                         >
                           <Clock size={14} /> <span>Histórico</span>
                         </button>
                      </div>
                   </div>
                 );
               })}
               {filteredMaterials.length === 0 && (
                 <p className="text-center text-xs text-gray-400 italic mt-10">Nenhum material cadastrado nesta categoria.</p>
               )}
            </div>
         </div>
      </div>
      <AnimatePresence>
        {historyModal && (
          <motion.div initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}} className="fixed inset-0 z-[60] bg-black/60 flex items-center justify-center p-4">
             <motion.div initial={{scale:0.95}} animate={{scale:1}} exit={{scale:0.95}} className="bg-white rounded-xl shadow-2xl p-6 w-full max-w-xl flex flex-col max-h-[90vh]">
                 <div className="flex justify-between items-center mb-4 border-b pb-2">
                   <h3 className="text-lg font-bold text-gray-800 flex items-center"><Clock className="mr-2 text-blue-600" size={20}/> Histórico: {historyModal.nome}</h3>
                   <button onClick={() => setHistoryModal(null)} className="text-gray-400 hover:text-gray-600 text-2xl font-bold leading-none">&times;</button>
                 </div>
                 <div className="flex-1 overflow-y-auto pr-2 space-y-3">
                    {data.materialMovements?.filter((mov: any) => mov.material_id === historyModal.id).map((mov: any) => (
                       <div key={mov.id} className="p-4 border rounded-lg bg-gray-50 flex items-start justify-between">
                          <div className="flex-1 mr-4">
                             <div className="flex items-center space-x-2 mb-2">
                               <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-widest ${mov.tipo_operacao === 'SAIDA' ? 'bg-amber-100 text-amber-700' : mov.tipo_operacao === 'DEVOLUCAO' ? 'bg-green-100 text-green-700' : 'bg-blue-100 text-blue-700'}`}>
                                  {mov.tipo_operacao}
                               </span>
                               <span className="text-[10px] text-gray-400">{new Date(mov.created_at).toLocaleString()}</span>
                             </div>
                             <p className="text-sm text-gray-700 font-medium break-words leading-relaxed">{mov.justificativa || 'Sem justificativa detalhada'}</p>
                             <p className="text-[10px] text-gray-500 mt-2 uppercase tracking-widest font-bold">Res.: {data.staff?.find((s:any) => s.matricula === mov.funcionario_matricula)?.nome || mov.funcionario_matricula}</p>
                          </div>
                          <div className="text-right whitespace-nowrap">
                             <p className={`text-lg font-black ${mov.tipo_operacao === 'SAIDA' ? 'text-amber-600' : mov.tipo_operacao === 'DEVOLUCAO' ? 'text-green-600' : 'text-blue-600'}`}>
                                {mov.tipo_operacao === 'SAIDA' ? '-' : '+'}{mov.quantidade} <span className="text-xs font-medium text-gray-500">{historyModal.unidade_medida}</span>
                             </p>
                          </div>
                       </div>
                    ))}
                    {(!data.materialMovements || data.materialMovements.filter((mov: any) => mov.material_id === historyModal.id).length === 0) && (
                       <p className="text-center text-sm text-gray-400 italic py-10">Nenhuma movimentação para este material.</p>
                    )}
                 </div>
             </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showAuditModal && (
          <motion.div initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}} className="fixed inset-0 z-[60] bg-black/60 flex items-center justify-center p-4">
             <motion.div initial={{scale:0.95}} animate={{scale:1}} exit={{scale:0.95}} className="bg-white rounded-xl shadow-2xl p-6 w-full max-w-2xl flex flex-col h-[85vh] max-h-[800px]">
                  <div className="flex justify-between items-center mb-4 border-b pb-3">
                     <div>
                        <h3 className="text-lg font-bold text-gray-800 flex items-center">
                           <Clock className="mr-2 text-amber-600" size={20}/> Auditoria Geral de Movimentações
                        </h3>
                        <p className="text-xs text-gray-500">Histórico completo de registro de entradas, saídas e devoluções.</p>
                     </div>
                     <button onClick={() => { setShowAuditModal(false); setAuditSearch(''); }} className="text-gray-400 hover:text-gray-600 text-2xl font-bold leading-none">&times;</button>
                  </div>

                  {/* Campo de Busca */}
                  <div className="relative mb-4">
                     <Search size={16} className="absolute left-3 top-3.5 text-gray-400" />
                     <input 
                        type="text" 
                        value={auditSearch}
                        onChange={(e) => setAuditSearch(e.target.value)}
                        placeholder="Buscar por material, responsável, justificativa ou tipo..."
                        className="w-full pl-9 pr-4 py-2.5 border border-gray-200 rounded-lg text-sm bg-gray-50/50 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                     />
                  </div>

                  {/* Lista de Movimentações */}
                  <div className="flex-1 overflow-y-auto pr-1 space-y-3">
                     {filteredAuditMovements.map((mov: any) => {
                        let mName = mov.materials?.nome || data.materials?.find((m: any) => m.id === mov.material_id)?.nome;
                        if (!mName) {
                           const match = mov.justificativa?.match(/^\[(.*?)\]/);
                           if (match) {
                              mName = match[1];
                           } else if (mov.tipo_operacao === 'EXCLUSÃO') {
                              const matchEx = mov.justificativa?.match(/material '(.*?)'/);
                              if (matchEx) {
                                 mName = matchEx[1];
                              } else {
                                 mName = 'Material Excluído';
                              }
                           } else {
                              mName = 'Material Excluído';
                           }
                        }
                        const uMedida = data.materials?.find((m: any) => m.id === mov.material_id)?.unidade_medida || 'UN';
                        const staffName = data.staff?.find((s:any) => s.matricula === mov.funcionario_matricula)?.nome || mov.funcionario_matricula;
                        const cleanJustificativa = mov.justificativa?.replace(/^\[.*?\]\s*/, '') || 'Sem justificativa apresentada';
                        return (
                           <div key={mov.id} className="p-3.5 border rounded-lg bg-gray-50 hover:bg-gray-100/50 transition-colors flex items-start justify-between gap-4">
                              <div className="flex-1 min-w-0">
                                 <div className="flex flex-wrap items-center gap-2 mb-1.5">
                                    <span className="font-extrabold text-xs text-gray-800 truncate block max-w-xs">{mName}</span>
                                    <span className={`px-2 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider whitespace-nowrap ${
                                      mov.tipo_operacao === 'SAIDA' ? 'bg-amber-100 text-amber-700' : 
                                      mov.tipo_operacao === 'DEVOLUCAO' ? 'bg-green-100 text-green-700' : 
                                      mov.tipo_operacao === 'AJUSTE MANUAL' ? 'bg-indigo-100 text-indigo-700' :
                                      mov.tipo_operacao === 'EXCLUSÃO' ? 'bg-red-100 text-red-700 font-extrabold' :
                                      'bg-blue-100 text-blue-700'
                                    }`}>
                                       {mov.tipo_operacao}
                                    </span>
                                    <span className="text-[10px] text-gray-400 font-medium ml-auto sm:ml-0">{new Date(mov.created_at).toLocaleString()}</span>
                                 </div>
                                 <p className="text-xs text-gray-600 font-medium break-words leading-relaxed">{cleanJustificativa}</p>
                                 <p className="text-[9px] text-gray-400 mt-2 uppercase tracking-wider font-extrabold">Por: {staffName}</p>
                              </div>
                              <div className="text-right whitespace-nowrap self-center">
                                 <p className={`text-md font-black ${
                                    mov.tipo_operacao === 'SAIDA' ? 'text-amber-600' : 
                                    mov.tipo_operacao === 'DEVOLUCAO' ? 'text-green-600' : 
                                    mov.tipo_operacao === 'AJUSTE MANUAL' ? 'text-indigo-600' : 
                                    mov.tipo_operacao === 'EXCLUSÃO' ? 'text-red-650' :
                                    'text-blue-600'
                                 }`}>
                                    {mov.tipo_operacao === 'SAIDA' ? '-' : '+'}{mov.quantidade} <span className="text-[10px] font-medium text-gray-500">{uMedida}</span>
                                 </p>
                              </div>
                           </div>
                        );
                     })}

                     {filteredAuditMovements.length === 0 && (
                        <div className="text-center py-12">
                           <p className="text-sm text-gray-400 italic">Nenhum registro de movimentação encontrado.</p>
                        </div>
                     )}
                  </div>
             </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
