import React, { useState, useEffect } from 'react';
import { Plus, Search, Filter, History, Edit, Trash2, X, Clock, CheckCircle2, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';

export default function ControleClientes() {
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Filtros
  const [searchName, setSearchName] = useState('');
  const [filterQuadra, setFilterQuadra] = useState('');
  const [filterSituacao, setFilterSituacao] = useState('');

  // Modais
  const [showModal, setShowModal] = useState(false);
  const [showLogsModal, setShowLogsModal] = useState(false);
  
  // Estados de Formulário
  const [currentProcess, setCurrentProcess] = useState<any>(null);
  const [logs, setLogs] = useState<any[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const initialFormState = {
    quadra: '',
    lote: '',
    corretor: '',
    nome_cliente: '',
    data_simulacao: '',
    data_aprovacao: '',
    validade: '',
    situacao: 'Analise',
    valor_imovel: '',
    entrada: '',
    numero_imovel: '',
    telefone_cliente: '',
    observacao: ''
  };

  const [formData, setFormData] = useState<any>(initialFormState);

  const loadData = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/controle-clientes');
      if (res.ok) {
        const json = await res.json();
        setData(json);
      } else {
        toast.error('Erro ao buscar processos.');
      }
    } catch (err) {
      toast.error('Falha na conexão com servidor.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const openAddModal = () => {
    setCurrentProcess(null);
    setFormData(initialFormState);
    setShowModal(true);
  };

  const openEditModal = (process: any) => {
    setCurrentProcess(process);
    setFormData({
      ...process,
      data_simulacao: process.data_simulacao ? process.data_simulacao.split('T')[0] : '',
      data_aprovacao: process.data_aprovacao ? process.data_aprovacao.split('T')[0] : '',
      validade: process.validade ? process.validade.split('T')[0] : ''
    });
    setShowModal(true);
  };

  const [swapPrompt, setSwapPrompt] = useState<{
    show: boolean;
    targetProcess: any;
    formData: any;
  } | null>(null);

  const performSave = async (payloadToSave: any, processId: string | null = currentProcess?.id || null) => {
    setIsSubmitting(true);
    try {
      const url = processId 
        ? `/api/controle-clientes/${processId}` 
        : `/api/controle-clientes`;
      
      const method = processId ? 'PUT' : 'POST';

      // Parse empty strings to null for dates
      const payload = { ...payloadToSave };
      if (!payload.data_simulacao) payload.data_simulacao = null;
      if (!payload.data_aprovacao) payload.data_aprovacao = null;
      if (!payload.validade) payload.validade = null;

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (res.ok) {
        return true;
      } else {
        const json = await res.json();
        toast.error('Erro: ' + (json.error || 'Falha ao salvar.'));
        return false;
      }
    } catch (err) {
      toast.error('Erro inesperado.');
      return false;
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Check for conflict
    if (currentProcess && formData.quadra && formData.lote) {
      const changedQuadraOrLote = formData.quadra !== currentProcess.quadra || formData.lote !== currentProcess.lote;
      if (changedQuadraOrLote) {
        const conflict = data.find(p => p.id !== currentProcess.id && p.quadra === formData.quadra && p.lote === formData.lote);
        if (conflict) {
          setSwapPrompt({
            show: true,
            targetProcess: conflict,
            formData: { ...formData }
          });
          return;
        }
      }
    }

    const success = await performSave(formData);
    if (success) {
      toast.success(currentProcess ? 'Processo atualizado!' : 'Processo cadastrado!');
      setShowModal(false);
      loadData();
    }
  };

  const confirmSwap = async () => {
    if (!swapPrompt || !currentProcess) return;

    const oldQuadra = currentProcess.quadra;
    const oldLote = currentProcess.lote;

    // 1 - Atualiza o processo atual com a nova quadra/lote
    const success1 = await performSave(swapPrompt.formData, currentProcess.id);
    if (!success1) return;

    // 2 - Atualiza o processo conflitante com a quadra/lote antiga do processo atual
    const updatePayload = {
      ...swapPrompt.targetProcess,
      quadra: oldQuadra,
      lote: oldLote
    };
    const success2 = await performSave(updatePayload, swapPrompt.targetProcess.id);

    if (success2) {
      toast.success('Lotes invertidos com sucesso!');
    } else {
      toast.warning('Processo atual salvo, mas falha ao inverter o outro processo.');
    }
    
    setSwapPrompt(null);
    setShowModal(false);
    loadData();
  };

  const confirmOverwrite = async () => {
    if (!swapPrompt) return;
    const success = await performSave(swapPrompt.formData, currentProcess?.id || null);
    if (success) {
      toast.success('Processo atualizado!');
      setSwapPrompt(null);
      setShowModal(false);
      loadData();
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('Tem certeza que deseja excluir permanentemente este processo?')) return;
    
    try {
      const res = await fetch(`/api/controle-clientes/${id}`, { method: 'DELETE' });
      if (res.ok) {
        toast.success('Processo excluído.');
        loadData();
      } else {
        toast.error('Erro ao excluir processo.');
      }
    } catch (err) {
      toast.error('Ocorreu um erro.');
    }
  };

  const openLogs = async (id: string) => {
    setShowLogsModal(true);
    setLogs([]);
    try {
      const res = await fetch(`/api/controle-clientes/${id}/logs`);
      if (res.ok) {
        const json = await res.json();
        setLogs(json);
      }
    } catch (err) {
      toast.error('Erro ao carregar histórico.');
    }
  };

  const statusColors: Record<string, string> = {
    'Aprovado': 'bg-green-100 text-green-800',
    'Conformidade': 'bg-teal-100 text-teal-800',
    'Entregue': 'bg-blue-100 text-blue-800',
    'Cartorio': 'bg-purple-100 text-purple-800',
    'Cartório': 'bg-purple-100 text-purple-800',
    'Condicionado': 'bg-orange-100 text-orange-800',
    'Reprovado': 'bg-red-100 text-red-800',
    'Documentação': 'bg-slate-100 text-slate-800',
    'Documentacao': 'bg-slate-100 text-slate-800',
    'Analise': 'bg-yellow-100 text-yellow-800',
    'Análise': 'bg-yellow-100 text-yellow-800',
  };

  const normalizeStr = (str: string) => {
    return (str || '')
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '');
  };

  const allQuadras = Array.from(new Set(data.map(d => d.quadra).filter(Boolean))).sort();

  const filteredData = data.filter(item => {
    const matchesName = !searchName || (item.nome_cliente || '').toLowerCase().includes(searchName.toLowerCase());
    const matchesQuadra = !filterQuadra || item.quadra === filterQuadra;
    const matchesSituacao = !filterSituacao || normalizeStr(item.situacao) === normalizeStr(filterSituacao);
    return matchesName && matchesQuadra && matchesSituacao;
  });

  return (
    <div className="p-6 md:p-8 animate-fade-in font-sans">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-gray-800 mb-2">Controle da Supervisão</h1>
          <p className="text-gray-500">Acompanhamento manual de processos de aprovação e entregas.</p>
        </div>
        <button 
          onClick={openAddModal}
          className="bg-blue-600 hover:bg-blue-700 text-white px-5 py-2.5 rounded-lg flex items-center font-medium shadow-sm transition-all shadow-blue-200 active:scale-95"
        >
          <Plus size={18} className="mr-2" /> Novo Processo
        </button>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden mb-6">
        <div className="p-4 border-b border-gray-100 bg-gray-50 flex flex-col md:flex-row gap-4 items-center justify-between">
          <div className="relative w-full md:w-96 text-gray-500 focus-within:text-blue-500 transition-colors">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 pointer-events-none" />
            <input 
              type="text" 
              placeholder="Buscar por nome do cliente..."
              value={searchName}
              onChange={(e) => setSearchName(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all text-gray-800"
            />
          </div>
          
          <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
            <div className="flex items-center gap-2">
              <Filter size={18} className="text-gray-400" />
              <select
                value={filterQuadra}
                onChange={(e) => setFilterQuadra(e.target.value)}
                className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all text-gray-700 bg-white text-sm"
              >
                <option value="">Todas as Quadras</option>
                {allQuadras.map(q => (
                  <option key={String(q)} value={String(q)}>Quadra {String(q)}</option>
                ))}
              </select>
            </div>
            
            <div className="flex items-center gap-2">
              <select
                value={filterSituacao}
                onChange={(e) => setFilterSituacao(e.target.value)}
                className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all text-gray-700 bg-white text-sm"
              >
                <option value="">Todas as Situações</option>
                <option value="Analise">Análise</option>
                <option value="Aprovado">Aprovado</option>
                <option value="Conformidade">Conformidade</option>
                <option value="Condicionado">Condicionado</option>
                <option value="Documentação">Documentação</option>
                <option value="Cartorio">Cartório</option>
                <option value="Entregue">Entregue</option>
                <option value="Reprovado">Reprovado</option>
              </select>
            </div>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-gray-600">
            <thead className="bg-[#f8fafc] text-gray-700 font-semibold border-b border-gray-200 text-xs uppercase tracking-wider">
              <tr>
                <th className="px-5 py-4">Cliente</th>
                <th className="px-5 py-4">Q / L / N°</th>
                <th className="px-5 py-4">Corretor</th>
                <th className="px-5 py-4">Datas</th>
                <th className="px-5 py-4">Situação</th>
                <th className="px-5 py-4">Valores</th>
                <th className="px-5 py-4 text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {loading ? (
                <tr><td colSpan={7} className="px-5 py-8 text-center text-gray-500">Carregando processos...</td></tr>
              ) : filteredData.length === 0 ? (
                <tr><td colSpan={7} className="px-5 py-8 text-center text-gray-500 font-medium">Nenhum processo encontrado.</td></tr>
              ) : filteredData.map(item => (
                <tr key={item.id} className="hover:bg-blue-50/30 transition-colors group">
                  <td className="px-5 py-4">
                    <div className="font-semibold text-gray-800">{item.nome_cliente || '-'}</div>
                    <div className="text-xs text-gray-500">{item.telefone_cliente || '-'}</div>
                  </td>
                  <td className="px-5 py-4">
                    <div><span className="font-semibold">Q:</span> {item.quadra || '-'} | <span className="font-semibold">L:</span> {item.lote || '-'}</div>
                    <div className="text-xs text-gray-500">Nº {item.numero_imovel || '-'}</div>
                  </td>
                  <td className="px-5 py-4 font-medium">{item.corretor || '-'}</td>
                  <td className="px-5 py-4 text-xs space-y-1">
                     <div><span className="text-gray-400 w-12 inline-block">Simul:</span> {item.data_simulacao ? new Date(item.data_simulacao).toLocaleDateString() : '-'}</div>
                     <div><span className="text-gray-400 w-12 inline-block">Aprov:</span> {item.data_aprovacao ? new Date(item.data_aprovacao).toLocaleDateString() : '-'}</div>
                     <div><span className="text-gray-400 w-12 inline-block">Válido:</span> {item.validade ? new Date(item.validade).toLocaleDateString() : '-'}</div>
                  </td>
                  <td className="px-5 py-4">
                    <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${statusColors[item.situacao] || 'bg-gray-100 text-gray-800'}`}>
                      {item.situacao}
                    </span>
                  </td>
                  <td className="px-5 py-4 whitespace-nowrap">
                    <div>Imóvel: R$ {Number(item.valor_imovel || 0).toLocaleString('pt-BR', {minimumFractionDigits:2})}</div>
                    <div className="text-gray-400 text-xs">Entrada: R$ {Number(item.entrada || 0).toLocaleString('pt-BR', {minimumFractionDigits:2})}</div>
                  </td>
                  <td className="px-5 py-4 text-right">
                    <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button onClick={() => openLogs(item.id)} className="p-1.5 text-blue-500 hover:bg-blue-50 rounded" title="Ver Histórico (Logs)">
                        <History size={16} />
                      </button>
                      <button onClick={() => openEditModal(item)} className="p-1.5 text-gray-500 hover:text-blue-600 hover:bg-gray-100 rounded" title="Editar">
                        <Edit size={16} />
                      </button>
                      <button onClick={() => handleDelete(item.id)} className="p-1.5 text-gray-500 hover:text-red-600 hover:bg-gray-100 rounded" title="Excluir">
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal Formulário */}
      {showModal && !swapPrompt && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-fade-in">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden">
            <div className="flex justify-between items-center p-5 border-b border-gray-100 bg-gray-50/50">
              <h2 className="text-xl font-bold text-gray-800">{currentProcess ? 'Editar Processo' : 'Novo Processo'}</h2>
              <button type="button" onClick={() => setShowModal(false)} className="text-gray-400 hover:text-gray-800 p-1">
                <X size={20} />
              </button>
            </div>
            
            <form onSubmit={handleSave} className="overflow-y-auto p-6 space-y-5">
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-gray-500 mb-1">Nome do Cliente</label>
                  <input required type="text" className="w-full px-4 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 outline-none" 
                    value={formData.nome_cliente} onChange={e => setFormData({...formData, nome_cliente: e.target.value})} />
                </div>
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-gray-500 mb-1">Telefone</label>
                  <input type="text" className="w-full px-4 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 outline-none" 
                    value={formData.telefone_cliente} onChange={e => setFormData({...formData, telefone_cliente: e.target.value})} />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-5">
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-gray-500 mb-1">Quadra</label>
                  <input type="text" className="w-full px-4 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 outline-none" 
                    value={formData.quadra} onChange={e => setFormData({...formData, quadra: e.target.value})} />
                </div>
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-gray-500 mb-1">Lote</label>
                  <input type="text" className="w-full px-4 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 outline-none" 
                    value={formData.lote} onChange={e => setFormData({...formData, lote: e.target.value})} />
                </div>
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-gray-500 mb-1">Nº Imóvel</label>
                  <input type="text" className="w-full px-4 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 outline-none" 
                    value={formData.numero_imovel} onChange={e => setFormData({...formData, numero_imovel: e.target.value})} />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-gray-500 mb-1">Corretor</label>
                  <input type="text" className="w-full px-4 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 outline-none" 
                    value={formData.corretor} onChange={e => setFormData({...formData, corretor: e.target.value})} />
                </div>
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-gray-500 mb-1">Situação</label>
                  <select className="w-full px-4 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 outline-none"
                    value={formData.situacao} onChange={e => setFormData({...formData, situacao: e.target.value})}>
                    {Object.keys(statusColors).map(status => (
                      <option key={status} value={status}>{status}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-gray-500 mb-1">Data Simulação</label>
                  <input type="date" className="w-full px-4 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 outline-none" 
                    value={formData.data_simulacao} onChange={e => setFormData({...formData, data_simulacao: e.target.value})} />
                </div>
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-gray-500 mb-1">Data Aprovação</label>
                  <input type="date" className="w-full px-4 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 outline-none" 
                    value={formData.data_aprovacao} onChange={e => setFormData({...formData, data_aprovacao: e.target.value})} />
                </div>
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-gray-500 mb-1">Validade</label>
                  <input type="date" className="w-full px-4 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 outline-none" 
                    value={formData.validade} onChange={e => setFormData({...formData, validade: e.target.value})} />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-gray-500 mb-1">Valor do Imóvel</label>
                  <input type="number" step="0.01" className="w-full px-4 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 outline-none" 
                    value={formData.valor_imovel} onChange={e => setFormData({...formData, valor_imovel: e.target.value})} />
                </div>
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-gray-500 mb-1">Valor de Entrada</label>
                  <input type="number" step="0.01" className="w-full px-4 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 outline-none" 
                    value={formData.entrada} onChange={e => setFormData({...formData, entrada: e.target.value})} />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-gray-500 mb-1">Observações</label>
                <textarea rows={3} className="w-full px-4 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 outline-none" 
                  value={formData.observacao} onChange={e => setFormData({...formData, observacao: e.target.value})} />
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-gray-100">
                <button type="button" onClick={() => setShowModal(false)} className="px-5 py-2 text-gray-600 hover:bg-gray-100 rounded font-medium transition-colors">
                  Cancelar
                </button>
                <button type="submit" disabled={isSubmitting} className="px-5 py-2 bg-blue-600 text-white rounded font-medium hover:bg-blue-700 disabled:opacity-50 transition-colors shadow-sm">
                  {isSubmitting ? 'Salvando...' : 'Salvar Processo'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {swapPrompt && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg p-6 flex flex-col items-center text-center">
            <div className="w-16 h-16 bg-orange-100 text-orange-500 rounded-full flex items-center justify-center mb-4">
              <AlertCircle size={32} />
            </div>
            <h3 className="text-xl font-bold text-gray-800 mb-2">Conflito de Quadra e Lote</h3>
            <p className="text-gray-600 mb-6 leading-relaxed">
              Já existe um cliente cadastro na <span className="font-semibold text-gray-800">Quadra {swapPrompt.formData.quadra}</span>, <span className="font-semibold text-gray-800">Lote {swapPrompt.formData.lote}</span> (Cliente: {swapPrompt.targetProcess.nome_cliente || 'N/A'}).
              <br/><br/>
              Deseja inverter os lotes (o cliente antigo vai para a Quadra {currentProcess?.quadra} Lote {currentProcess?.lote}) ou apenas sobrepor esta informação sem alterar o outro cliente?
            </p>
            <div className="flex flex-col sm:flex-row gap-3 w-full justify-center">
              <button 
                onClick={() => setSwapPrompt(null)} 
                className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg font-medium hover:bg-gray-50 transition-colors flex-1"
              >
                Cancelar
              </button>
              <button 
                onClick={confirmOverwrite} 
                className="px-4 py-2 bg-gray-800 text-white rounded-lg font-medium hover:bg-gray-900 transition-colors flex-1"
              >
                Só Salvar Atual
              </button>
              <button 
                onClick={confirmSwap} 
                className="px-4 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors flex-1"
              >
                Inverter Lotes
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Historico de Logs */}
      {showLogsModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-fade-in">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl max-h-[85vh] flex flex-col overflow-hidden">
            <div className="flex justify-between items-center p-5 border-b border-gray-100 bg-gray-50/50">
              <h2 className="text-xl font-bold text-gray-800 flex items-center gap-2">
                <History size={20} className="text-blue-500" />
                Histórico de Alterações
              </h2>
              <button type="button" onClick={() => setShowLogsModal(false)} className="text-gray-400 hover:text-gray-800 p-1">
                <X size={20} />
              </button>
            </div>

            <div className="overflow-y-auto p-6 bg-gray-50 relative">
              {logs.length === 0 ? (
                <div className="text-center py-10 text-gray-500">
                  <Clock size={40} className="mx-auto mb-3 opacity-20" />
                  Nenhum registro de alteração.
                </div>
              ) : (
                <div className="space-y-6 before:absolute before:inset-y-6 before:left-[35px] before:w-[2px] before:bg-gray-200">
                  {logs.map((log) => (
                    <div key={log.id_log} className="relative pl-12">
                      <div className={`absolute left-0 top-1 w-8 h-8 rounded-full flex items-center justify-center ring-4 ring-gray-50 z-10 
                        ${log.acao === 'CRIADO' ? 'bg-green-100 text-green-600' : 
                          log.acao === 'ALTERADO' ? 'bg-blue-100 text-blue-600' : 'bg-red-100 text-red-600'}`}>
                        {log.acao === 'CRIADO' ? <Plus size={16} /> : 
                         log.acao === 'ALTERADO' ? <Edit size={16} /> : <Trash2 size={16} />}
                      </div>
                      <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-100">
                        <div className="flex justify-between items-start mb-2">
                          <span className="font-bold text-gray-800 text-sm">Registro {log.acao}</span>
                          <span className="text-xs text-gray-400">{new Date(log.data_hora_alteracao).toLocaleString('pt-BR')}</span>
                        </div>
                        
                        {log.acao === 'ALTERADO' && log.detalhes_alteracao && (
                          <div className="bg-gray-50 p-3 rounded text-xs space-y-2 mt-3">
                            {Object.entries(log.detalhes_alteracao).map(([field, values]: [string, any]) => (
                               <div key={field} className="flex flex-col">
                                 <span className="font-semibold text-gray-600 capitalize mb-1">{field.replace('_', ' ')}</span>
                                 <div className="flex items-center gap-2 text-gray-500">
                                   <span className="line-through bg-gray-200/50 px-1 rounded">{values.de || 'Vazio'}</span>
                                   <span className="text-green-600 font-medium">→</span>
                                   <span className="bg-green-50 px-1 text-green-700 rounded">{values.para || 'Vazio'}</span>
                                 </div>
                               </div>
                            ))}
                          </div>
                        )}
                        
                        {log.acao === 'CRIADO' && (
                           <div className="text-xs text-gray-500 mt-2 bg-gray-50 p-2 rounded">
                             Payload inicial registrado no sistema.
                           </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
            
            <div className="p-4 border-t border-gray-100 flex justify-end">
                <button type="button" onClick={() => setShowLogsModal(false)} className="px-5 py-2 bg-gray-800 text-white rounded font-medium hover:bg-gray-900 transition-colors shadow-sm">
                  Fechar
                </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
