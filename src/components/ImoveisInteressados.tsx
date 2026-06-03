import React, { useState, useEffect } from 'react';
import { 
  UserCheck, 
  Trash2, 
  Phone, 
  Mail, 
  Calendar, 
  MapPin, 
  User, 
  DollarSign, 
  Search, 
  ExternalLink,
  MessageCircle,
  TrendingUp,
  AlertCircle,
  Clock,
  Sparkles
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { toast } from 'sonner';

interface LeadInteresse {
  id: number;
  imovelId: number | null;
  imovelNome: string;
  imovelValor: number | null;
  imovelLocalizacao: string | null;
  nome: string;
  telefone: string;
  email: string | null;
  created_at: string;
}

export default function ImoveisInteressados() {
  const [leads, setLeads] = useState<LeadInteresse[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [deletingId, setDeletingId] = useState<number | null>(null);

  const fetchLeads = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/interesse');
      if (res.ok) {
        const data = await res.json();
        setLeads(data);
      } else {
        toast.error('Não foi possível carregar os leads de interesse.');
      }
    } catch (err) {
      console.error('[Error fetching leads]', err);
      toast.error('Erro de conexão com o servidor.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLeads();
  }, []);

  const handleDeleteLead = async (id: number) => {
    try {
      const res = await fetch(`/api/interesse/${id}`, {
        method: 'DELETE',
      });
      if (res.ok) {
        toast.success('Lead de interesse removido com sucesso!');
        setLeads(prev => prev.filter(lead => lead.id !== id));
        setDeletingId(null);
      } else {
        toast.error('Erro ao excluir o lead, tente novamente.');
      }
    } catch (err) {
      console.error('[Delete lead error]', err);
      toast.error('Erro de conexão ao remover o lead.');
    }
  };

  // Format currency
  const formatValue = (val: number | null) => {
    if (!val) return 'Sob Consulta';
    return Number(val).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  };

  // Format date
  const formatDate = (dateStr: string) => {
    try {
      const date = new Date(dateStr);
      return date.toLocaleDateString('pt-BR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch {
      return dateStr;
    }
  };

  // Sanitize phone number for wa.me link
  const getWhatsAppLink = (nome: string, telefone: string, imovelNome: string) => {
    const rawDigits = telefone.replace(/\D/g, '');
    // Ensure country code is added if not present (assuming Brazil +55)
    let formattedPhone = rawDigits;
    if (rawDigits.length <= 11) {
      formattedPhone = `55${rawDigits}`;
    }
    const message = `Olá ${nome}, sou da Imobiliária São Severino. Vi que demonstrou interesse no imóvel "${imovelNome}" em nosso site. Gostaria de agendar uma visita ou tirar dúvidas?`;
    return `https://wa.me/${formattedPhone}?text=${encodeURIComponent(message)}`;
  };

  // Filtering leads based on search term
  const filteredLeads = leads.filter(lead => {
    const matchName = lead.nome.toLowerCase().includes(searchTerm.toLowerCase());
    const matchPhone = lead.telefone.toLowerCase().includes(searchTerm.toLowerCase());
    const matchEmail = (lead.email || '').toLowerCase().includes(searchTerm.toLowerCase());
    const matchImovel = lead.imovelNome.toLowerCase().includes(searchTerm.toLowerCase());
    return matchName || matchPhone || matchEmail || matchImovel;
  });

  // Calculate some analytics
  const totalLeads = leads.length;
  
  const todayLeadsCount = leads.filter(lead => {
    const today = new Date().toISOString().split('T')[0];
    const leadDate = new Date(lead.created_at).toISOString().split('T')[0];
    return today === leadDate;
  }).length;

  return (
    <div className="space-y-6">
      {/* Header and Brand Title */}
      <div className="bg-white rounded-2xl p-6 border border-slate-100 shadow-sm flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <div className="flex items-center text-blue-600 font-bold text-xs uppercase tracking-wider mb-1">
            <span>Captação de Clientes</span>
          </div>
          <h1 className="text-2xl font-extrabold text-slate-955 tracking-tight">Imóveis Interessados</h1>
          <p className="text-slate-500 text-xs mt-1">
            Lista de contatos e captações registradas quando clientes demonstram interesse em imóveis do catálogo.
          </p>
        </div>
        <button 
          onClick={fetchLeads}
          className="bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold px-4 py-2.5 rounded-xl transition-all active:scale-95 flex items-center justify-center space-x-2 self-start md:self-auto"
        >
          <Clock size={14} />
          <span>Atualizar Leads</span>
        </button>
      </div>

      {/* Analytics Summary */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm flex items-center space-x-4">
          <div className="bg-blue-50 text-blue-600 rounded-xl p-3">
            <UserCheck size={20} className="text-blue-500" />
          </div>
          <div>
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">TOTAL DE LEADS</span>
            <h3 className="text-2xl font-black text-slate-800 leading-none mt-1">{totalLeads}</h3>
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm flex items-center space-x-4">
          <div className="bg-emerald-50 text-emerald-600 rounded-xl p-3">
            <TrendingUp size={20} />
          </div>
          <div>
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">NOVOS HOJE</span>
            <h3 className="text-2xl font-black text-emerald-600 leading-none mt-1">{todayLeadsCount}</h3>
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm flex items-center space-x-4 sm:col-span-2 lg:col-span-1">
          <div className="bg-amber-50 text-amber-600 rounded-xl p-3">
            <Search size={20} />
          </div>
          <div>
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">FILTRADOS</span>
            <h3 className="text-2xl font-black text-slate-800 leading-none mt-1">{filteredLeads.length} de {totalLeads}</h3>
          </div>
        </div>
      </div>

      {/* Filters & Actions Grid */}
      <div className="bg-white rounded-3xl p-6 border border-slate-100 shadow-sm space-y-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
            <input
              type="text"
              placeholder="Buscar por cliente, telefone, e-mail ou imóvel..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:ring-4 focus:ring-blue-500/10 focus:border-blue-600 outline-none transition-all text-slate-800"
            />
          </div>
          <span className="text-[11px] font-bold text-slate-400 tracking-wider">
            Mostrando {filteredLeads.length} interesse(s) encontrado(s)
          </span>
        </div>

        {/* Leads Table/Grid container */}
        {loading ? (
          <div className="flex flex-col items-center justify-center py-16 space-y-3">
            <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
            <p className="text-xs font-bold text-slate-400 tracking-wider">Carregando formulários de interesse...</p>
          </div>
        ) : filteredLeads.length === 0 ? (
          <div className="text-center py-16 px-4 bg-slate-50 rounded-2xl border border-dashed border-slate-200">
            <UserCheck size={40} className="mx-auto text-slate-300 mb-3" />
            <p className="text-sm font-bold text-slate-700">Nenhum interesse registrado</p>
            <p className="text-xs text-slate-450 max-w-sm mx-auto mt-1">
              Caso algum cliente demonstre interesse em um imóvel, os dados cadastrados aparecerão listados aqui de forma automática.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <AnimatePresence>
              {filteredLeads.map(lead => (
                <motion.div
                  key={lead.id}
                  layout
                  initial={{ opacity: 0, scale: 0.98 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  className="bg-slate-50 rounded-2xl p-5 border border-slate-150 shadow-sm flex flex-col justify-between hover:border-blue-200 transition-all group relative"
                >
                  <div className="space-y-4">
                    {/* Imóvel info header */}
                    <div className="flex justify-between items-start">
                      <div className="space-y-1 max-w-[80%]">
                        <span className="text-[9px] font-black tracking-wider text-rose-500 uppercase bg-rose-50 px-2 py-0.5 rounded-full inline-block">
                          Interesse Registrado
                        </span>
                        <h4 className="font-extrabold text-[#0B1520] tracking-tight text-sm line-clamp-2">
                          {lead.imovelNome}
                        </h4>
                        <div className="flex items-center space-x-1.5 text-xs text-slate-500">
                          <MapPin size={12} className="text-slate-400 shrink-0" />
                          <span className="truncate">{lead.imovelLocalizacao || 'Sem localização'}</span>
                        </div>
                      </div>
                      
                      {/* Price Tag */}
                      <div className="text-right">
                        <span className="text-[8px] font-bold text-slate-400 uppercase block">VALOR</span>
                        <span className="text-xs font-black text-blue-600 block">
                          {formatValue(lead.imovelValor)}
                        </span>
                      </div>
                    </div>

                    {/* Divider */}
                    <hr className="border-slate-200" />

                    {/* Client contact info */}
                    <div className="space-y-2.5">
                      <div className="flex items-center space-x-2">
                        <div className="w-7 h-7 bg-white rounded-lg border border-slate-200 flex items-center justify-center text-slate-600 shrink-0">
                          <User size={13} />
                        </div>
                        <div className="min-w-0">
                          <span className="text-[8px] font-bold text-slate-400 block uppercase leading-none">CLIENTE</span>
                          <span className="text-xs font-bold text-slate-850 truncate block">{lead.nome}</span>
                        </div>
                      </div>

                      <div className="flex items-center space-x-2">
                        <div className="w-7 h-7 bg-white rounded-lg border border-slate-200 flex items-center justify-center text-slate-600 shrink-0">
                          <Phone size={13} />
                        </div>
                        <div className="min-w-0">
                          <span className="text-[8px] font-bold text-slate-400 block uppercase leading-none">WHATSAPP / TELEFONE</span>
                          <span className="text-xs font-mono text-slate-800 font-medium block">{lead.telefone}</span>
                        </div>
                      </div>

                      {lead.email && (
                        <div className="flex items-center space-x-2">
                          <div className="w-7 h-7 bg-white rounded-lg border border-slate-200 flex items-center justify-center text-slate-600 shrink-0">
                            <Mail size={13} />
                          </div>
                          <div className="min-w-0">
                            <span className="text-[8px] font-bold text-slate-400 block uppercase leading-none">E-MAIL</span>
                            <span className="text-xs font-medium text-slate-800 truncate block">{lead.email}</span>
                          </div>
                        </div>
                      )}

                      <div className="flex items-center space-x-2">
                        <div className="w-7 h-7 bg-white rounded-lg border border-slate-200 flex items-center justify-center text-slate-600 shrink-0">
                          <Calendar size={13} />
                        </div>
                        <div className="min-w-0">
                          <span className="text-[8px] font-bold text-slate-400 block uppercase leading-none font-bold">DATA DE CADASTRO</span>
                          <span className="text-xs font-bold text-slate-500 block">{formatDate(lead.created_at)}</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Actions & Delete Confirmation Panel */}
                  <div className="mt-5 pt-3 border-t border-slate-100 flex items-center justify-between gap-2.5">
                    
                    {/* Delete Confirm Overlay inside the card */}
                    {deletingId === lead.id ? (
                      <div className="w-full flex items-center justify-between bg-red-50 p-2 rounded-xl border border-red-200 animate-fadeIn">
                        <div className="flex items-center space-x-1.5">
                          <AlertCircle size={14} className="text-red-500 shrink-0" />
                          <span className="text-[10px] font-bold text-red-600">Excluir este lead de interesse?</span>
                        </div>
                        <div className="flex space-x-1.0">
                          <button
                            onClick={() => handleDeleteLead(lead.id)}
                            className="bg-red-600 hover:bg-red-700 text-white font-bold text-[9px] uppercase px-2.5 py-1.5 rounded-lg transition-all active:scale-95"
                          >
                            Excluir
                          </button>
                          <button
                            onClick={() => setDeletingId(null)}
                            className="bg-white border border-slate-200 text-slate-600 font-bold text-[9px] uppercase px-2.5 py-1.5 rounded-lg hover:bg-slate-100 transition-all ml-1.5"
                          >
                            Não
                          </button>
                        </div>
                      </div>
                    ) : (
                      <>
                        <button
                          onClick={() => setDeletingId(lead.id)}
                          className="text-slate-400 hover:text-red-600 p-2 hover:bg-red-50 rounded-xl transition-colors shrink-0"
                          title="Remover Lead"
                        >
                          <Trash2 size={16} />
                        </button>

                        <div className="flex space-x-2 flex-1 justify-end">
                          {lead.email && (
                            <a
                              href={`mailto:${lead.email}?subject=Interesse no imóvel ${encodeURIComponent(lead.imovelNome)}`}
                              className="bg-slate-100 hover:bg-slate-200 border border-slate-200 text-slate-700 text-xs font-bold px-3 py-2 rounded-xl transition-all flex items-center space-x-1.5 active:scale-95"
                            >
                              <Mail size={13} />
                              <span className="hidden sm:inline">Enviar Email</span>
                            </a>
                          )}
                          
                          <a
                            href={getWhatsAppLink(lead.nome, lead.telefone, lead.imovelNome)}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="bg-emerald-500 hover:bg-emerald-600 text-white text-xs font-black px-4 py-2 rounded-xl transition-all flex items-center space-x-1.5 active:scale-95 shadow-md shadow-emerald-500/10"
                          >
                            <MessageCircle size={14} className="fill-current text-white" />
                            <span>Contactar WhatsApp</span>
                          </a>
                        </div>
                      </>
                    )}
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        )}
      </div>
    </div>
  );
}
