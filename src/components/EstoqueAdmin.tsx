import React, { useState } from 'react';
import { Package, Search, AlertCircle, TrendingDown, Edit3, Clock, Trash2 } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { toast } from 'sonner';

const CATEGORIES = [
  'Fundação e Estrutura',
  'Alvenaria e Vedação',
  'Instalações Elétricas/Hidráulicas',
  'Acabamento e Revestimento',
  'Equipamentos'
];

export default function EstoqueAdmin({ data, onRefresh }: any) {
  const [form, setForm] = useState({ nome: '', categoria: CATEGORIES[0], unidade_medida: 'CX', qtd_volumes: 0, fator_multiplicador: 1, estoque_minimo: 10 });
  const [filter, setFilter] = useState('TODOS');
  const [ajusteModal, setAjusteModal] = useState<any>(null);
  const [ajusteForm, setAjusteForm] = useState({ nome: '', quantidade: 0, justificativa: '' });
  const [historyModal, setHistoryModal] = useState<any>(null);
  const [showAuditModal, setShowAuditModal] = useState(false);
  const [auditSearch, setAuditSearch] = useState('');
  const [confirmDeleteId, setConfirmDeleteId] = useState<number | null>(null);

  const filteredMaterials = data.materials.filter((m: any) => {
    if (filter === 'CRITICO') return m.saldo_unidades <= m.estoque_minimo;
    return true;
  });

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

  const handleSubmit = async (e: any) => {
    e.preventDefault();
    try {
      const res = await fetch('/api/materials', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form)
      });
      if (res.ok) {
        toast.success('Material cadastrado com sucesso!');
        setForm({ nome: '', categoria: CATEGORIES[0], unidade_medida: 'CX', qtd_volumes: 0, fator_multiplicador: 1, estoque_minimo: 10 });
        onRefresh();
      } else {
        const err = await res.json();
        toast.error('Erro: ' + (err.details || err.error));
      }
    } catch {
      toast.error('Erro ao conectar ao servidor.');
    }
  };

  const handleAjuste = async (e: any) => {
    e.preventDefault();
    if (!ajusteForm.justificativa.trim()) return toast.error("Justificativa é obrigatória.");
    
    const loadId = toast.loading('Salvando alterações...');
    try {
      // 1. Atualizar informações básicas (nome)
      const putRes = await fetch(`/api/materials/${ajusteModal.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          nome: ajusteForm.nome,
          categoria: ajusteModal.categoria
        })
      });

      if (!putRes.ok) {
        toast.dismiss(loadId);
        const err = await putRes.json();
        toast.error('Erro ao atualizar nome do material: ' + (err.error || 'Erro desconhecido'));
        return;
      }

      // 2. Se a quantidade foi alterada, realizar o movimento de ajuste
      if (Number(ajusteForm.quantidade) !== ajusteModal.saldo_unidades) {
        const res = await fetch(`/api/materials/${ajusteModal.id}/movement`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            tipo_operacao: 'AJUSTE MANUAL',
            quantidade: Number(ajusteForm.quantidade),
            funcionario_matricula: 'ADMIN',
            justificativa: ajusteForm.justificativa
          })
        });
        
        if (!res.ok) {
          toast.dismiss(loadId);
          const err = await res.json();
          toast.error('Erro ao salvar ajuste de estoque: ' + err.error);
          return;
        }
      }
      
      toast.dismiss(loadId);
      toast.success('Material atualizado com sucesso!');
      setAjusteModal(null);
      setAjusteForm({ nome: '', quantidade: 0, justificativa: '' });
      onRefresh();
    } catch {
      toast.dismiss(loadId);
      toast.error('Erro de conexão ao salvar alterações.');
    }
  }

  const handleDelete = async (id: number) => {
    const loadId = toast.loading('Apagando material...');
    try {
      const res = await fetch(`/api/materials/${id}`, {
        method: 'DELETE',
      });
      if (res.ok) {
        toast.dismiss(loadId);
        toast.success('Material apagado com sucesso!');
        setConfirmDeleteId(null);
        onRefresh();
      } else {
        toast.dismiss(loadId);
        const err = await res.json();
        toast.error('Erro ao apagar material: ' + (err.error || 'Erro desconhecido'));
      }
    } catch {
      toast.dismiss(loadId);
      toast.error('Erro de conexão ao apagar material.');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center bg-white p-4 rounded-lg shadow-sm border border-gray-100 gap-4">
        <div>
          <h2 className="text-lg font-bold text-gray-800">Monitoramento de Estoque</h2>
          <p className="text-xs text-gray-400">Controle e auditoria geral de insumos, materiais e equipamentos.</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
           <button onClick={() => setShowAuditModal(true)} className="flex items-center px-3 py-1.5 rounded-full text-[10px] font-bold uppercase transition-all bg-amber-50 text-amber-700 hover:bg-amber-100 border border-amber-200">
              <Clock size={12} className="mr-1" /> Auditoria Geral
           </button>
           <button onClick={() => setFilter('TODOS')} className={`px-3 py-1.5 rounded-full text-[10px] font-bold uppercase transition-all ${filter === 'TODOS' ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'}`}>Todos</button>
           <button onClick={() => setFilter('CRITICO')} className={`px-3 py-1.5 rounded-full text-[10px] font-bold uppercase transition-all ${filter === 'CRITICO' ? 'bg-red-600 text-white' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'}`}>Estoque Crítico</button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
         {/* Form */}
         <div className="lg:col-span-1 bg-white p-4 sm:p-6 rounded-lg shadow-sm border border-gray-100">
            <h3 className="font-bold text-gray-700 mb-4 flex items-center">Cadastrar Material</h3>
            <form onSubmit={handleSubmit} className="space-y-4">
               <div>
                  <label className="block text-xs font-bold text-gray-500 mb-1">Nome do Material</label>
                  <input required className="w-full px-3 py-3 sm:py-2 border rounded-md outline-none text-sm" value={form.nome} onChange={e => setForm({...form, nome: e.target.value})} />
               </div>
               <div>
                  <label className="block text-xs font-bold text-gray-500 mb-1">Categoria de Obra</label>
                  <select required className="w-full px-3 py-3 sm:py-2 border rounded-md outline-none bg-white text-sm" value={form.categoria} onChange={e => setForm({...form, categoria: e.target.value})}>
                     {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
               </div>
               <div className="grid grid-cols-2 gap-3 sm:gap-4">
                 <div>
                    <label className="block text-xs font-bold text-gray-500 mb-1">Un. de Medida</label>
                    <input required className="w-full px-3 py-3 sm:py-2 border rounded-md outline-none text-sm" placeholder="Ex: CX, KG, UN" value={form.unidade_medida} onChange={e => setForm({...form, unidade_medida: e.target.value})} />
                 </div>
                 <div>
                    <label className="block text-xs font-bold text-gray-500 mb-1">Qtd Volumes</label>
                    <input type="number" required className="w-full px-3 py-3 sm:py-2 border rounded-md outline-none text-sm" value={form.qtd_volumes} onChange={e => setForm({...form, qtd_volumes: Number(e.target.value)})} />
                 </div>
               </div>
               <div className="grid grid-cols-2 gap-3 sm:gap-4">
                 <div>
                    <label className="block text-xs font-bold text-gray-500 mb-1">Fator (Mult.)</label>
                    <input type="number" required className="w-full px-3 py-3 sm:py-2 border rounded-md outline-none text-sm" placeholder="Itens por volume" value={form.fator_multiplicador} onChange={e => setForm({...form, fator_multiplicador: Number(e.target.value)})} />
                 </div>
                 <div>
                    <label className="block text-xs font-bold text-gray-500 mb-1">Estoq. Mínimo</label>
                    <input type="number" required className="w-full px-3 py-3 sm:py-2 border rounded-md outline-none text-sm" value={form.estoque_minimo} onChange={e => setForm({...form, estoque_minimo: Number(e.target.value)})} />
                 </div>
               </div>
               <div className="bg-blue-50 p-3 rounded-lg text-xs flex justify-between font-bold text-blue-700">
                  <span>Saldo Calculado:</span>
                  <span>{form.qtd_volumes * form.fator_multiplicador} Unid.</span>
               </div>
               <button type="submit" className="w-full bg-blue-600 text-white font-bold py-3 sm:py-2 rounded-md text-sm hover:bg-blue-700 transition-colors">ADICIONAR MATERIAL</button>
            </form>
         </div>

         {/* List */}
         <div className="lg:col-span-2 space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {filteredMaterials.map((m: any) => {
                const isCritical = m.saldo_unidades <= m.estoque_minimo;
                return (
                  <motion.div key={m.id} className={`bg-white p-4 rounded-lg shadow-sm border-l-4 ${isCritical ? 'border-l-red-500' : 'border-l-green-500'} flex flex-col justify-between`}>
                     <div>
                        <div className="flex justify-between items-start mb-2">
                           <h4 className="font-bold text-gray-800">{m.nome}</h4>
                           <div className="flex items-center space-x-2">
                              {isCritical && <span className="bg-red-100 text-red-700 px-2 py-0.5 rounded text-[10px] font-bold">CRÍTICO</span>}
                           </div>
                        </div>
                        <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest mb-1">{m.categoria || 'Geral'}</p>
                        <div className="text-2xl font-black text-gray-900 flex items-center justify-between">
                           <span>{m.saldo_unidades} <span className="text-xs text-gray-500 font-medium">{m.unidade_medida}s</span></span>
                           <div className="flex items-center space-x-1">
                              <button onClick={() => setHistoryModal(m)} className="text-gray-500 hover:bg-gray-100 p-1.5 rounded-full transition-colors" title="Ver Histórico"><Clock size={16}/></button>
                              <button onClick={() => { setAjusteModal(m); setAjusteForm({ nome: m.nome, quantidade: m.saldo_unidades, justificativa: '' }); }} className="text-blue-500 hover:bg-blue-50 p-1.5 rounded-full transition-colors" title="Editar Material / Ajuste Manual"><Edit3 size={16}/></button>
                              {confirmDeleteId === m.id ? (
                                 <div className="flex items-center gap-1 bg-red-50 p-1 rounded-md border border-red-200 transition-all ml-1">
                                    <button onClick={() => handleDelete(m.id)} className="bg-red-600 text-white px-2 py-1 rounded text-[9px] font-bold uppercase transition-all hover:bg-red-750">Sim</button>
                                    <button onClick={() => setConfirmDeleteId(null)} className="bg-white text-gray-650 px-2 py-1 border border-gray-200 rounded text-[9px] font-bold uppercase transition-all hover:bg-gray-50">Não</button>
                                 </div>
                              ) : (
                                 <button onClick={() => setConfirmDeleteId(m.id)} className="text-red-500 hover:bg-red-50 p-1.5 rounded-full transition-colors" title="Apagar Material"><Trash2 size={16}/></button>
                              )}
                           </div>
                        </div>
                     </div>
                     <div className="mt-4 pt-3 border-t border-gray-50 flex justify-between text-[10px] text-gray-500">
                        <span>Min: {m.estoque_minimo}</span>
                        <span>Fator: {m.fator_multiplicador} un/vol</span>
                     </div>
                  </motion.div>
                );
              })}
              {filteredMaterials.length === 0 && (
                <div className="col-span-1 md:col-span-2 text-center py-12 text-gray-400 italic">
                   Nenhum material encontrado.
                </div>
              )}
            </div>
         </div>
      </div>

      <AnimatePresence>
        {ajusteModal && (
          <motion.div initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}} className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4">
             <motion.div initial={{scale:0.95}} animate={{scale:1}} exit={{scale:0.95}} className="bg-white rounded-xl shadow-2xl p-6 w-full max-w-sm">
                 <h3 className="text-lg font-bold text-gray-800 mb-1">Editar &amp; Ajustar Material</h3>
                 <p className="text-xs text-gray-500 mb-4 tracking-tight">Material: <strong>{ajusteModal.nome}</strong> (Saldo Atual: {ajusteModal.saldo_unidades})</p>
                 
                 <form onSubmit={handleAjuste} className="space-y-4">
                    <div>
                        <label className="block text-xs font-bold text-gray-500 mb-1">Nome do Material</label>
                        <input type="text" required className="w-full px-3 py-2 border rounded-md outline-none text-sm" value={ajusteForm.nome} onChange={e => setAjusteForm({...ajusteForm, nome: e.target.value})} />
                    </div>
                    <div>
                        <label className="block text-xs font-bold text-gray-500 mb-1">Quantidade em Estoque (Unidades Finais)</label>
                        <input type="number" required className="w-full px-3 py-2 border rounded-md outline-none font-bold" value={ajusteForm.quantidade} onChange={e => setAjusteForm({...ajusteForm, quantidade: Number(e.target.value)})} />
                        <p className="text-[10px] text-amber-600 mt-1 uppercase font-bold tracking-widest">Se alterado, isso sobrescreverá o saldo atual.</p>
                    </div>
                    <div>
                        <label className="block text-xs font-bold text-gray-500 mb-1">Justificativa (Obrigatório)</label>
                        <textarea required className="w-full px-3 py-2 border rounded-md outline-none text-sm" rows={3} value={ajusteForm.justificativa} onChange={e => setAjusteForm({...ajusteForm, justificativa: e.target.value})} placeholder="Motivo da alteração / auditoria..."></textarea>
                    </div>
                    <div className="flex space-x-3 pt-2">
                       <button type="button" onClick={() => setAjusteModal(null)} className="flex-1 py-2 bg-gray-100 text-gray-600 rounded-md font-bold text-sm">Cancelar</button>
                       <button type="submit" className="flex-1 py-2 bg-amber-500 text-white rounded-md font-bold text-sm">Salvar</button>
                    </div>
                 </form>
             </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

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
                        <p className="text-xs text-gray-500">Histórico completo de entradas, saídas e ajustes de estoque.</p>
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
