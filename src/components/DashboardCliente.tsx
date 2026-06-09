import React, { useState, useEffect } from 'react';
import { 
  LogOut, 
  FileText, 
  Download, 
  MapPin, 
  CheckCircle,
  Building,
  User,
  MessageCircle,
  ShieldCheck,
  ChevronRight,
  ChevronLeft,
  X,
  Search,
  Home,
  Sparkles,
  ArrowUpDown,
  Compass,
  FileBadge,
  Filter,
  ArrowRight,
  ChevronDown,
  MessageSquare,
  Share,
  ArrowUpRight
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { toast } from 'sonner';

// Define the shape of our property data
interface DashboardClienteProps {
  onLogout: () => void;
  clienteNome?: string;
  contratoData?: any;
  imovelData?: any;
  todosImoveis?: any[];
  corretor?: any;
  vendedores?: any[];
  user?: any;
}

const formatCurrency = (val: number | string | undefined) => {
  if (val === undefined || val === null || val === '') return 'R$ 0,00';
  const numeric = typeof val === 'string' ? parseFloat(val) : val;
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(numeric);
};

const formatDate = (dateStr: string | undefined) => {
  if (!dateStr) return 'N/A';
  try {
    const d = new Date(dateStr);
    return new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' }).format(d);
  } catch (e) {
    return dateStr;
  }
};

const resolveImgPath = (imgSrc: string | undefined): string => {
  if (!imgSrc) return '/banner.png';
  if (imgSrc.includes('/') || imgSrc.startsWith('http') || imgSrc.startsWith('data:')) {
    return imgSrc;
  }
  return `/assets/imoveis/${imgSrc}`;
};

const PropertyGallery = ({ images }: { images?: string[] }) => {
  const imageList = Array.isArray(images) ? images : [];
  const [currentIndex, setCurrentIndex] = useState(0);
  const [hasError, setHasError] = useState(false);

  useEffect(() => {
    setHasError(false);
  }, [images, currentIndex]);

  if (imageList.length === 0 || hasError) {
    return (
      <div className="w-full h-full bg-slate-50 flex items-center justify-center text-slate-300 relative overflow-hidden">
        <Home size={64} className="opacity-20" />
      </div>
    );
  }

  return (
    <div className="relative w-full h-full bg-slate-100 overflow-hidden group flex items-center justify-center">
      <img 
        src={resolveImgPath(imageList[currentIndex])} 
        alt="imóvel" 
        onError={() => setHasError(true)}
        className="w-full h-full object-cover transition-transform duration-700 hover:scale-110" 
      />
      
      {imageList.length > 1 && (
        <>
          <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none" />
          
          <button 
            type="button"
            onClick={(e) => { e.stopPropagation(); setCurrentIndex((prev) => (prev - 1 + imageList.length) % imageList.length); }}
            className="absolute left-4 top-1/2 -translate-y-1/2 bg-white/90 hover:bg-white text-slate-800 rounded-full p-2 opacity-0 group-hover:opacity-100 hover:scale-105 transition-all shadow-lg z-10"
          >
            <ChevronLeft size={16} />
          </button>
          
          <button 
            type="button"
            onClick={(e) => { e.stopPropagation(); setCurrentIndex((prev) => (prev + 1) % imageList.length); }}
            className="absolute right-4 top-1/2 -translate-y-1/2 bg-white/90 hover:bg-white text-slate-800 rounded-full p-2 opacity-0 group-hover:opacity-100 hover:scale-105 transition-all shadow-lg z-10"
          >
            <ChevronRight size={16} />
          </button>
          
          <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex space-x-1.5 z-10 bg-black/40 px-3 py-1.5 rounded-full backdrop-blur-sm">
            {imageList.map((_, idx) => (
              <button 
                key={idx} 
                onClick={(e) => { e.stopPropagation(); setCurrentIndex(idx); }}
                className={`w-1.5 h-1.5 rounded-full transition-all duration-300 ${idx === currentIndex ? 'bg-white w-3 cursor-default' : 'bg-white/50 hover:bg-white/80 cursor-pointer'}`} 
              />
            ))}
          </div>
        </>
      )}
    </div>
  );
};

export default function DashboardCliente({ 
  onLogout, 
  clienteNome = "Cliente SS", 
  contratoData, 
  imovelData, 
  todosImoveis = [], 
  corretor,
  vendedores = [],
  user
}: DashboardClienteProps) {
  const [selectedPropertyId, setSelectedPropertyId] = useState<number | 'meu-contrato'>(() => {
    const params = new URLSearchParams(window.location.search);
    const urlImovel = params.get('imovel');
    if (urlImovel) {
      const num = Number(urlImovel);
      if (!isNaN(num)) return num;
    }
    return 'meu-contrato';
  });
  const [propertyTypeFilter, setPropertyTypeFilter] = useState<string>('Todos');
  const [search, setSearch] = useState('');
  const [showInterestForm, setShowInterestForm] = useState(false);
  const [interestForm, setInterestForm] = useState({ nome: '', telefone: '', email: '' });
  const [isMobileDetail, setIsMobileDetail] = useState(false);

  // Prepopulate interest form
  useEffect(() => {
    if (user) {
      setInterestForm({
        nome: user.nome || '',
        telefone: user.telefone || user.matricula || '',
        email: user.email || ''
      });
    } else if (clienteNome) {
      setInterestForm({
        nome: clienteNome,
        telefone: '',
        email: ''
      });
    }
  }, [user, clienteNome, showInterestForm]);

  // If no contract, default selection to first available property
  useEffect(() => {
    if (!contratoData && selectedPropertyId === 'meu-contrato') {
        const disponiveis = todosImoveis.filter(p => p.status === 'DISPONÍVEL');
        if (disponiveis.length > 0) {
            setSelectedPropertyId(disponiveis[0].id);
        }
    }
  }, [contratoData, todosImoveis, selectedPropertyId]);

  const availableProperties = todosImoveis
    .filter(p => p.status === 'DISPONÍVEL')
    .filter(p => {
      const matchesSearch = p.nome.toLowerCase().includes(search.toLowerCase()) || 
                            p.localizacao.toLowerCase().includes(search.toLowerCase());
      const matchesType = propertyTypeFilter === 'Todos' || p.tipo === propertyTypeFilter;
      return matchesSearch && matchesType;
    });

  const propertyTypes = ['Todos', ...Array.from(new Set(todosImoveis.map(p => p.tipo).filter(Boolean)))];

  const displayedProperty = selectedPropertyId === 'meu-contrato' ? imovelData : availableProperties.find(p => p.id === selectedPropertyId);
  const isContractView = selectedPropertyId === 'meu-contrato' && !!imovelData;
  const statusAtual = contratoData?.status === 'DISTRATADO' ? 'Distratado' : (contratoData?.statusFinanceiro || 'Ativo');

  // Determine relevant broker/consultant for current property or contract
  const activeCorretorMatricula = selectedPropertyId === 'meu-contrato' 
    ? contratoData?.corretor_matricula 
    : displayedProperty?.detalhes?.corretor_matricula;

  const activeCorretor = vendedores?.find((s: any) => s.matricula === activeCorretorMatricula) || corretor;

  // Handle link sharing
  const handleShare = () => {
    const imovelId = displayedProperty?.id || imovelData?.id;
    if (!imovelId) {
        toast.error('Nenhum imóvel selecionado para compartilhar.');
        return;
    }
    const shareUrl = `${window.location.origin}?imovel=${imovelId}`;
    navigator.clipboard.writeText(shareUrl).then(() => {
        toast.success('Link de compartilhamento copiado com sucesso!');
    }).catch(() => {
        toast.error('Não foi possível copiar o link automaticamente. Copie do seu navegador.');
    });
  };

  return (
    <div className="min-h-screen bg-[#F0F4F8] font-sans antialiased text-slate-800 p-2 md:p-4 lg:p-6 flex flex-col">
      
      {/* Sleek MacOS-like Window Wrapper */}
      <div className="mx-auto w-full max-w-[1600px] bg-[#FDFDFD] rounded-[2.5rem] shadow-2xl border border-slate-200 overflow-hidden flex-1 flex flex-col min-h-[90vh]">
        
        {/* Top Navbar */}
        <header className="px-6 md:px-8 py-5 flex items-center justify-between border-b border-slate-100 flex-shrink-0">
          <div className="flex items-center space-x-4 xl:w-80">
            <img src="/logo-ss-imoveis.webp" alt="Imobiliária SÃO SEVERINO" className="w-10 h-10 rounded-xl" />
            <div className="flex flex-col">
                <span className="font-extrabold text-lg text-slate-900 tracking-tight leading-none truncate">SS IMÓVEIS</span>
                <span className="text-[10px] text-blue-500 font-bold uppercase tracking-widest mt-1">Portal do Cliente</span>
            </div>
          </div>

          {/* Central Top Controls - Dropdowns & Tabs */}
          <div className="hidden lg:flex items-center flex-1 justify-center space-x-6">
            
            {/* Top location filters matching the design */}
            <div className="flex bg-slate-50 border border-slate-200 rounded-2xl shadow-inner p-1">
              <div className="px-4 py-2 flex items-center border-r border-slate-200/50 cursor-pointer hover:bg-white rounded-l-xl transition-colors">
                <span className="text-[11px] text-slate-600 font-bold tracking-wider">SÃO PAULO</span>
                <ChevronDown size={14} className="ml-3 text-slate-400" />
              </div>
              <div className="px-4 py-2 flex items-center cursor-pointer hover:bg-white rounded-r-xl transition-colors">
                <span className="text-[11px] text-slate-600 font-bold tracking-wider">DISTRITO BAIRRO</span>
                <ChevronDown size={14} className="ml-3 text-slate-400" />
              </div>
            </div>

            {/* Quick module tabs */}
            <div className="hidden xl:flex items-center bg-slate-50 rounded-full p-1 border border-slate-200/60 shadow-inner">
              {['Estatísticas', 'Imóvel', 'Favoritos', 'Blog'].map(tab => (
                <button 
                  key={tab} 
                  onClick={() => tab === 'Blog' && (window.location.href = '/blog')}
                  className={`px-5 py-2.5 rounded-full text-[11px] font-extrabold tracking-wider transition-all uppercase ${tab === 'Imóvel' ? 'bg-[#0F1E2E] text-white shadow-md' : 'text-slate-500 hover:text-slate-800'}`}
                >
                  {tab}
                </button>
              ))}
            </div>

          </div>

          <div className="flex items-center space-x-4 xl:w-80 justify-end">
            <div className="w-px h-8 bg-slate-200 hidden sm:block" />

            <div className="flex items-center space-x-3">
                <button onClick={onLogout} title="Sair" className="w-10 h-10 rounded-full bg-slate-50 flex items-center justify-center text-slate-500 hover:bg-red-50 hover:text-red-600 border border-slate-100 transition-colors shadow-sm">
                    <LogOut size={16} />
                </button>
                <div className="flex items-center space-x-3 pl-2">
                    <div className="hidden md:flex flex-col text-right">
                        <span className="text-sm font-bold text-slate-800">{clienteNome.split(' ')[0]}</span>
                        <span className="text-[10px] text-slate-400 font-medium uppercase tracking-widest">Cliente Vip</span>
                    </div>
                    <div className="w-10 h-10 rounded-full bg-blue-600 flex items-center justify-center text-white font-bold text-sm shadow-md ring-2 ring-white">
                        {clienteNome.charAt(0).toUpperCase()}
                    </div>
                </div>
            </div>
          </div>
        </header>

        {/* Main Content Pane */}
        <div className="flex flex-1 overflow-hidden h-full">

          {/* Left Sidebar (Master Navigation) */}
          <aside className={`${isMobileDetail ? 'hidden md:flex' : 'flex'} w-full md:w-80 lg:w-[360px] flex-shrink-0 border-r border-slate-100 bg-[#FCFDFE] flex-col overflow-hidden h-full z-10 shadow-[4px_0_24px_rgba(0,0,0,0.02)]`}>
             <div className="p-6 pb-4">
               {/* CRM-like navigation filter */}
               <div className="flex items-center space-x-1 bg-slate-100/80 p-1 rounded-xl mb-6 border border-slate-200/50">
                 {['Tudo', 'Meus Imóveis', 'Lançamentos'].map((filter, idx) => (
                   <button key={filter} className={`flex-1 py-2 text-[10px] uppercase font-bold tracking-wider rounded-lg transition-all ${idx === 1 ? 'bg-white text-slate-900 shadow-sm border border-slate-200/50' : 'text-slate-500 hover:text-slate-700'}`}>
                     {filter}
                   </button>
                 ))}
               </div>

               <div className="relative mb-6">
                 <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                 <input 
                   type="text" 
                   placeholder="Pesquise localidade ou imóvel..."
                   className="w-full pl-11 pr-4 py-3.5 bg-white border border-slate-200 focus:border-blue-500 rounded-2xl text-xs outline-none focus:ring-4 ring-blue-500/10 shadow-sm transition-all text-slate-800 placeholder-slate-400 font-medium"
                   value={search}
                   onChange={e => setSearch(e.target.value)}
                 />
               </div>

               <div className="flex items-center justify-between text-[10px] font-bold text-slate-400 uppercase tracking-widest pl-1 mb-3">
                 <div className="flex items-center space-x-2"><Building size={14} className="text-blue-500" /> <span>Imóvel Financiado</span></div>
                 <span className="bg-slate-100 px-2.5 py-1 rounded-md text-slate-600">{contratoData ? '1' : '0'}</span>
               </div>
               
               {/* Fixed Contract Card */}
               {contratoData ? (
                 <button 
                    onClick={() => { setSelectedPropertyId('meu-contrato'); setShowInterestForm(false); setIsMobileDetail(true); }}
                    className={`w-full text-left p-4 rounded-3xl border transition-all flex items-center space-x-4 mb-8 ${selectedPropertyId === 'meu-contrato' ? 'bg-[#00bc7d] border-[#00bc7d] shadow-xl shadow-[#00bc7d]/20 text-white' : 'bg-white border-slate-200 hover:border-[#00bc7d]/50 hover:shadow-md'}`}
                 >
                    <div className="w-12 h-12 rounded-full overflow-hidden flex-shrink-0 bg-slate-100 border-2 border-white shadow-sm">
                       <img src={resolveImgPath(imovelData?.images?.[0])} alt="P" className="w-full h-full object-cover" />
                    </div>
                    <div className="flex-1 min-w-0">
                       <h4 className={`text-sm font-extrabold truncate ${selectedPropertyId === 'meu-contrato' ? 'text-white' : 'text-slate-800'}`}>
                         {imovelData?.nome || 'Meu Contrato'}
                       </h4>
                       <p className={`text-[9px] uppercase tracking-widest mt-1 font-bold truncate ${selectedPropertyId === 'meu-contrato' ? 'text-white/85' : 'text-slate-400'}`}>
                         STATUS: {statusAtual}
                       </p>
                    </div>
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center ${selectedPropertyId === 'meu-contrato' ? 'bg-white/20 text-white' : 'bg-slate-50 text-slate-400 border border-slate-100'}`}>
                      <ChevronRight size={14} className="ml-0.5" />
                    </div>
                 </button>
               ) : (
                 <div className="px-4 py-8 bg-slate-50 rounded-3xl border border-dashed border-slate-200 text-xs text-slate-500 mb-8 text-center italic font-medium">
                   Você não possui contratos ativos.
                 </div>
               )}

               <div 
                 className="flex items-center justify-between text-[10px] font-bold text-slate-400 uppercase tracking-widest pl-1 mb-3 cursor-pointer hover:text-slate-600 transition-colors" 
                 onClick={() => window.location.href = '/blog'}
               >
                 <div className="flex items-center space-x-2"><FileText size={14} className="text-[#00bc7d]" /> <span>Blog / Novidades</span></div>
                 <ChevronRight size={14} />
               </div>

               <div className="flex items-center justify-between text-[10px] font-bold text-slate-400 uppercase tracking-widest pl-1 mb-3 mt-6">
                 <div className="flex items-center space-x-2"><Compass size={14} className="text-emerald-500" /> <span>Novas Oportunidades</span></div>
               </div>
             </div>

             <div className="flex-1 overflow-y-auto px-6 pb-6 space-y-3 custom-scrollbar">
                {availableProperties.length === 0 ? (
                  <div className="text-center py-6 text-slate-400 text-xs">Nenhum imóvel encontrado.</div>
                ) : (
                  availableProperties.map(p => {
                    const firstImg = p.images && p.images.length > 0 ? p.images[0] : '';
                    const resolvedSrc = firstImg && !firstImg.includes('/') && !firstImg.startsWith('http') 
                      ? `/assets/imoveis/${firstImg}` 
                      : firstImg;
                      
                    return (
                      <button 
                        key={p.id}
                        onClick={() => { setSelectedPropertyId(p.id); setShowInterestForm(false); setIsMobileDetail(true); }}
                        className={`w-full text-left p-3.5 mt-1 rounded-3xl border transition-all flex items-center space-x-4 ${selectedPropertyId === p.id ? 'bg-[#0F1E2E] border-[#0F1E2E] shadow-xl shadow-slate-900/15' : 'bg-white border-slate-200 hover:border-slate-300 hover:shadow-md'}`}
                      >
                         <div className="w-12 h-12 rounded-full overflow-hidden flex-shrink-0 bg-slate-100 border-2 border-white shadow-sm relative">
                            {resolvedSrc ? (
                              <img src={resolvedSrc} alt="P" className="w-full h-full object-cover" />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center text-slate-300"><Home size={20} /></div>
                            )}
                         </div>
                         <div className="flex-1 min-w-0">
                            <h4 className={`text-sm font-extrabold truncate ${selectedPropertyId === p.id ? 'text-white' : 'text-slate-800'}`}>
                              {p.nome}
                            </h4>
                            <p className={`text-[10px] uppercase tracking-widest mt-1 font-bold truncate ${selectedPropertyId === p.id ? 'text-slate-400' : 'text-blue-500'}`}>
                              {formatCurrency(p.valor)}
                            </p>
                         </div>
                         <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${selectedPropertyId === p.id ? 'bg-white/10 text-white' : 'bg-slate-50 text-slate-400 border border-slate-100'}`}>
                           <ChevronRight size={14} className="ml-0.5" />
                         </div>
                      </button>
                    );
                  })
                )}
             </div>
          </aside>

          {/* Right Main Content (Selected Property) */}
          <main className={`${!isMobileDetail ? 'hidden md:flex' : 'flex'} flex-1 overflow-y-auto p-4 md:p-8 custom-scrollbar bg-[#Fdfdfd] relative w-full flex-col`}>
            
            {displayedProperty ? (
              <div className="max-w-6xl mx-auto pb-10 w-full">
                
                <button className="md:hidden flex items-center space-x-2 text-slate-500 hover:text-slate-800 mb-6 font-bold text-sm bg-white px-4 py-2.5 rounded-2xl shadow-sm border border-slate-100 w-fit" onClick={() => setIsMobileDetail(false)}>
                  <ChevronLeft size={16} />
                  <span>Voltar aos Imóveis</span>
                </button>

                {/* HERO SECTION MATCHING DESIGN (Yellow Theme) */}
                <div className="flex flex-col lg:flex-row gap-6 mb-6">
                    
                    {/* The main Image with Yellow Overlay like the design */}
                    <div className="flex-[2] relative rounded-[2.5rem] overflow-hidden h-[450px] lg:h-[500px] shadow-xl group border border-slate-100 bg-white">
                        <img 
                          src={resolveImgPath(displayedProperty?.images?.[0])} 
                          alt="Property" 
                          className="w-full h-full object-cover transition-transform duration-700 hover:scale-105" 
                          onError={(e) => { (e.target as HTMLImageElement).src = 'https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?auto=format&fit=crop&q=80&w=1200'; }}
                        />
                        {/* Top Green Panel */}
                        <div className="absolute top-0 left-0 right-0 p-6 md:p-8 bg-[#00bc7d] rounded-b-[2.5rem] shadow-lg z-10 text-white">
                          <div className="flex justify-between items-start">
                              <div className="flex-1 pr-4">
                                <h2 className="text-3xl md:text-4xl font-black text-white tracking-tight leading-none mb-3">
                                  {displayedProperty.nome}
                                </h2>
                                <div className="flex flex-wrap gap-2 text-white/90 text-xs font-bold items-center">
                                    <span>{displayedProperty.tipo || 'Apartamento'}</span>
                                    <span>•</span>
                                    <span className="line-clamp-1 break-all">{displayedProperty.localizacao || 'Localização não informada'}</span>
                                </div>
                              </div>
                              
                              {/* Floating Action Icons */}
                              <div className="flex flex-col gap-3 shrink-0">
                                  <button 
                                      onClick={() => setShowInterestForm(true)}
                                      title="Tenho Interesse"
                                      className="w-10 h-10 bg-white shadow-xl rounded-full flex items-center justify-center text-[#00bc7d] hover:scale-110 hover:text-[#009b66] transition-all cursor-pointer"
                                  >
                                      <MessageSquare size={16} className="text-[#00bc7d]" />
                                  </button>
                                  <button 
                                      onClick={handleShare}
                                      title="Compartilhar"
                                      className="w-10 h-10 bg-white shadow-xl rounded-full flex items-center justify-center text-slate-800 hover:scale-110 hover:text-[#00bc7d] transition-all cursor-pointer"
                                  >
                                      <Share size={16} className="text-slate-800 hover:text-[#00bc7d]" />
                                  </button>
                              </div>
                          </div>
                          
                          {/* Agent info inside the yellow panel */}
                          <div className="mt-8 flex items-center justify-between">
                              <div className="bg-white/40 backdrop-blur-md border border-white/50 p-1.5 pr-4 rounded-full flex items-center space-x-3 w-fit shadow-sm">
                                  <div className="w-10 h-10 rounded-full bg-slate-900 flex items-center justify-center text-white font-bold overflow-hidden shadow-inner flex-shrink-0">
                                     {activeCorretor?.nome ? activeCorretor.nome[0].toUpperCase() : <User size={20} />}
                                  </div>
                                  <div className="flex flex-col justify-center">
                                    <h4 className="text-[11px] font-extrabold text-white leading-tight">{activeCorretor?.nome || 'Atendimento Geral'}</h4>
                                    <span className="text-[9px] text-white/80 uppercase tracking-widest font-black">
                                      {activeCorretor?.nome ? 'Consultor Responsável' : 'Equipe de Atendimento'}
                                    </span>
                                  </div>
                              </div>
                              <div className="bg-slate-900 text-[#00bc7d] w-14 h-14 rounded-full flex flex-col items-center justify-center shadow-2xl border border-[#00bc7d]/20">
                                  <span className="text-sm font-black leading-none text-[#00bc7d]">{displayedProperty.detalhes?.area || '--'}</span>
                                  <span className="text-[8px] uppercase tracking-widest leading-none mt-1 font-bold text-[#00bc7d]">m²</span>
                              </div>
                          </div>
                        </div>

                        {/* Bottom Actions over Image */}
                        <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex items-center bg-white/90 backdrop-blur-xl px-4 py-2.5 rounded-full shadow-2xl space-x-6 border border-white z-10 w-fit">
                            <button className="w-10 h-10 bg-[#00bc7d] text-white rounded-full flex items-center justify-center shadow-md"><Home size={18} /></button>
                            <button className="text-slate-400 hover:text-[#00bc7d] transition-colors"><Search size={20} /></button>
                            <button className="text-slate-400 hover:text-[#00bc7d] transition-colors"><Building size={20} /></button>
                            <button className="text-slate-400 hover:text-[#00bc7d] transition-colors"><User size={20} /></button>
                        </div>
                    </div>

                    {/* Right Info Column (The Detail Cards) */}
                    <div className="flex-1 flex flex-col gap-6">
                        <div className="bg-[#00bc7d] rounded-[2.5rem] p-8 shadow-sm flex flex-col justify-center min-h-[200px] flex-1 text-white">
                            <h3 className="text-xl font-black text-white mb-4">{displayedProperty.nome}</h3>
                            <p className="text-sm font-bold text-white/95 leading-relaxed text-balance">
                                {displayedProperty.descricao || 'Oferece espaços de convivência modernos e elegantes, com comodidades de alto nível, tornando-se a escolha ideal para compradores e locatários.'}
                            </p>
                        </div>

                        <div className="bg-[#00bc7d] rounded-[2.5rem] p-8 shadow-sm flex flex-col justify-center min-h-[200px] flex-1 text-white">
                            <h3 className="text-xl font-black text-white mb-4">Detalhes do Imóvel</h3>
                            <p className="text-sm font-bold text-white/95 leading-relaxed mb-6 text-balance">
                                {displayedProperty.detalhes ? 'Características e dimensões detalhadas do imóvel selecionado:' : 'Explore informações detalhadas, incluindo tamanho, layout e características para ajudá-lo a tomar decisões informadas.'}
                            </p>
                            <div className="flex flex-wrap gap-2">
                                {(()=>{
                                  const pt = displayedProperty.detalhes || {};
                                  const pills = [
                                    pt.quartos ? `${pt.quartos} Quartos` : null,
                                    pt.salas ? `${pt.salas} Salas` : null,
                                    pt.banheiros ? `${pt.banheiros} Banheiros` : null,
                                    pt.mobiliado ? `Mobiliado` : null
                                  ].filter(Boolean);
                                  if (pills.length === 0) pills.push('Não Especificado');
                                  return pills.map(pill => (
                                    <span key={pill} className="px-4 py-2 bg-slate-900 text-[#00bc7d] rounded-full text-[10px] uppercase font-black tracking-widest shadow-sm">
                                      {pill}
                                    </span>
                                  ));
                                })()}
                            </div>
                        </div>
                    </div>
                </div>

                {/* The Third Section: Graph & Room View with thumbs */}
                <div className="flex flex-col lg:flex-row gap-6 mt-2">
                    
                    {/* Left: The Graph Card */}
                    <div className="flex-1 bg-white rounded-[2.5rem] border border-slate-100 p-5 sm:p-8 md:p-10 shadow-sm relative overflow-hidden group">
                         <div className="flex justify-between items-start mb-8">
                           <div>
                             <h3 className="text-2xl font-black text-slate-900 mb-3">{displayedProperty.nome} - Valor</h3>
                             <div className="flex flex-wrap gap-2">
                                <span className="px-3 py-1.5 bg-slate-100 rounded-full text-[10px] font-bold text-slate-500 uppercase tracking-widest">
                                  {displayedProperty.tipo || 'Apartamento'}
                                </span>
                                <span className="px-3 py-1.5 bg-[#00bc7d]/20 text-[#00bc7d] rounded-full text-[10px] font-black uppercase tracking-widest">
                                  {statusAtual}
                                </span>
                             </div>
                           </div>
                           <button className="w-12 h-12 bg-slate-50 rounded-full flex items-center justify-center text-slate-600 hover:bg-slate-100 group-hover:scale-105 transition-all">
                             <ArrowUpRight size={20} />
                           </button>
                         </div>

                         {/* Chart mimicking the wave in the new print, yellow colored */}
                         <div className="relative w-full mt-6 flex items-end">
                           <svg viewBox="0 0 500 140" className="w-full h-auto opacity-90 block" preserveAspectRatio="xMidYMid meet">
                             <defs>
                               <linearGradient id="yellowWave" x1="0" y1="0" x2="0" y2="1">
                                  <stop offset="0%" stopColor="#00bc7d" stopOpacity="0.5" />
                                  <stop offset="100%" stopColor="#00bc7d" stopOpacity="0.0" />
                               </linearGradient>
                             </defs>
                             <path d="M0,140 C100,120 150,40 220,70 C300,105 410,40 500,60 L500,140 L0,140 Z" fill="url(#yellowWave)" />
                             <path d="M0,139 C100,120 150,40 220,70 C300,105 410,40 500,60" fill="none" stroke="#00bc7d" strokeWidth="4" strokeLinecap="round" className="drop-shadow-md" />
                             
                              <g transform="translate(300, 105)">
                                <circle cx="0" cy="0" r="5" fill="#00bc7d" stroke="white" strokeWidth="2" />
                                <rect x="-55" y="-35" width="110" height="26" rx="13" fill="white" stroke="#E2E8F0" strokeWidth="1.5" className="drop-shadow-lg" />
                                <text x="0" y="-22" textAnchor="middle" alignmentBaseline="middle" fill="#1E293B" fontSize="11" fontWeight="900" fontFamily="sans-serif">
                                  {formatCurrency(displayedProperty.valor)}
                                </text>
                                <line x1="0" y1="-8" x2="0" y2="0" stroke="#E2E8F0" strokeWidth="1.5" strokeDasharray="2,2"/>
                              </g>
                              
                              <g transform="translate(410, 40)">
                                <rect x="-55" y="-35" width="110" height="26" rx="13" fill="#00bc7d" className="drop-shadow-lg" />
                                <text x="0" y="-22" textAnchor="middle" alignmentBaseline="middle" fill="white" fontSize="11" fontWeight="900" fontFamily="sans-serif">
                                  R$ 5.932.000
                                </text>
                                <line x1="0" y1="-8" x2="0" y2="0" stroke="#E2E8F0" strokeWidth="1.5" strokeDasharray="2,2"/>
                              </g>
                           </svg>

                           <div className="absolute -bottom-8 left-0 w-full flex justify-between px-2 text-[8px] xs:text-[10px] sm:text-xs font-black text-slate-400 uppercase tracking-tight xs:tracking-widest">
                             <span>Jan</span><span>Fev</span><span>Mar</span><span>Abr</span><span>Mai</span><span className="text-white bg-[#00bc7d] px-1.5 xs:px-2 py-0.5 rounded-md">Jun</span><span>Jul</span>
                           </div>
                         </div>

                         <div className="grid grid-cols-2 gap-4 mt-20 pt-6 border-t border-slate-100">
                            <div>
                              <span className="text-[10px] text-slate-400 font-extrabold uppercase tracking-widest block mb-1">Preço Médio</span>
                              <span className="text-2xl font-black text-slate-900 leading-none block">{formatCurrency(displayedProperty.valor)}</span>
                              <span className="text-[9px] font-bold text-emerald-500 uppercase mt-2 block">$5,000 menos que mês passado</span>
                            </div>
                            <div>
                              <span className="text-[10px] text-slate-400 font-extrabold uppercase tracking-widest block mb-1">Planejamento</span>
                              <span className="text-2xl font-black text-slate-900 leading-none block">Luxury</span>
                              <span className="text-[9px] font-bold text-emerald-500 uppercase mt-2 block">$10,000 menos ano passado</span>
                            </div>
                         </div>
                    </div>

                    {/* Right: Immersive Room View */}
                    <div className="flex-1 relative rounded-[2.5rem] overflow-hidden min-h-[400px] shadow-sm border border-slate-100 group bg-slate-900">
                        <img 
                          src={resolveImgPath(displayedProperty?.images && displayedProperty.images.length > 1 ? displayedProperty.images[1] : (displayedProperty?.images?.[0] || ''))} 
                          alt="Room" 
                          onError={(e) => { (e.target as HTMLImageElement).src = 'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&q=80&w=1200'; }}
                          className="w-full h-full object-cover opacity-80 transition-transform duration-700 group-hover:scale-105 absolute inset-0" 
                        />
                        
                        <div className="absolute top-6 left-6 right-6 flex justify-between items-center z-10">
                            <div className="bg-white/20 backdrop-blur-md px-4 py-2 rounded-full border border-white/30 text-white text-xs font-bold flex items-center shadow-lg">
                                <span className="w-2 h-2 bg-emerald-400 rounded-full mr-2 shadow-[0_0_8px_rgba(52,211,153,1)]"></span>
                                14º Andar
                            </div>
                            <div className="flex gap-2">
                                <button className="w-10 h-10 rounded-full bg-white/20 backdrop-blur-md flex items-center justify-center text-white border border-white/30 hover:bg-white hover:text-black transition-colors"><MapPin size={16}/></button>
                                <button className="w-10 h-10 rounded-full bg-white/20 backdrop-blur-md flex items-center justify-center text-white border border-white/30 hover:bg-white hover:text-black transition-colors"><ArrowUpRight size={16}/></button>
                            </div>
                        </div>

                        <div className="absolute bottom-6 left-6 right-6 z-10">
                            <div className="flex gap-4 items-end bg-white/20 backdrop-blur-md p-4 rounded-3xl border border-white/30 shadow-2xl">
                                {/* Badge next to it */}
                                <div className="bg-[#00bc7d] text-white px-5 py-3 rounded-2xl text-sm font-black shadow-lg">
                                    Galeria<br/><span className="text-[10px] font-bold opacity-80 uppercase tracking-widest mt-1 block">{(displayedProperty.images?.length || 0)} fotos</span>
                                </div>
                                {/* Main thumb */}
                                <div className="w-24 h-24 rounded-2xl overflow-hidden border-2 border-white shadow-xl">
                                    <img 
                                        src={resolveImgPath(displayedProperty?.images?.[0] || '')} 
                                        className="w-full h-full object-cover" 
                                        onError={(e) => { (e.target as HTMLImageElement).src = 'https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?auto=format&fit=crop&q=80&w=400'; }}
                                    />
                                </div>
                                {/* Additional thumbs stacked */}
                                {displayedProperty.images && displayedProperty.images.length > 1 && (
                                  <div className="w-24 h-24 rounded-2xl overflow-hidden border-2 border-white/60 shadow-xl ml-auto relative bg-[#fdfdfd] shrink-0">
                                       <img 
                                           src={resolveImgPath(displayedProperty?.images?.[1] || '')} 
                                           className="w-full h-full object-cover opacity-60" 
                                           onError={(e) => { (e.target as HTMLImageElement).src = 'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&q=80&w=400'; }}
                                       />
                                       {displayedProperty.images.length > 2 && (
                                         <div className="absolute inset-0 bg-white/40 backdrop-blur-sm flex items-center justify-center text-slate-900 font-black text-xl">
                                             +{displayedProperty.images.length - 2}
                                         </div>
                                       )}
                                  </div>
                                )}
                            </div>
                        </div>
                        
                        {/* The Floating Tags */}
                        <div className="absolute top-1/2 left-1/3 w-10 h-10 bg-white/30 backdrop-blur-md border border-white rounded-full flex items-center justify-center text-white animate-pulse shadow-xl cursor-pointer">
                            <Search size={16} />
                        </div>
                        <div className="absolute top-1/3 right-1/4 w-10 h-10 bg-white/30 backdrop-blur-md border border-white rounded-full flex items-center justify-center text-white shadow-xl cursor-pointer hover:bg-white/50 transition-colors">
                            <Search size={16} />
                        </div>
                    </div>

                </div>

                {/* Documents Section if Contract */}
                {isContractView && contratoData?.distrato?.pdfs && contratoData.distrato.pdfs.length > 0 && (
                  <div className="mt-6 bg-white rounded-[2.5rem] p-8 border border-slate-100 shadow-sm">
                    <h4 className="text-xl font-black text-slate-900 mb-6 flex items-center">
                      <FileText size={20} className="mr-3 text-[#00bc7d]" />
                      Documentos do Contrato
                    </h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {contratoData.distrato.pdfs.map((pdf: string, idx: number) => (
                        <a 
                          key={idx} href={pdf} target="_blank" rel="noopener noreferrer" 
                          className="flex items-center justify-between p-5 bg-slate-50 hover:bg-[#00bc7d]/10 hover:border-[#00bc7d]/50 transition-all rounded-2xl border border-slate-100 group"
                        >
                          <div className="flex items-center space-x-4 text-slate-700 min-w-0">
                            <div className="w-10 h-10 rounded-full bg-white flex items-center justify-center shadow-sm text-slate-400 group-hover:text-[#00bc7d] transition-colors shrink-0">
                                <FileBadge size={18} />
                            </div>
                            <span className="text-sm font-bold truncate pr-3 text-slate-800 group-hover:text-slate-900">Documento_Anexo_{idx + 1}.pdf</span>
                          </div>
                          <div className="w-10 h-10 rounded-full bg-white flex items-center justify-center shadow-sm text-slate-400 group-hover:bg-[#00bc7d] group-hover:text-white transition-colors shrink-0">
                            <Download size={16} />
                          </div>
                        </a>
                      ))}
                    </div>
                  </div>
                )}

              </div>
            ) : (
              <div className="flex flex-col items-center justify-center h-full text-center max-w-md mx-auto">
                <div className="w-24 h-24 bg-slate-100 text-slate-300 rounded-full flex items-center justify-center mb-6">
                  <Building size={48} strokeWidth={1} />
                </div>
                <h3 className="text-2xl font-black text-slate-900 mb-3">Selecione um Imóvel</h3>
                <p className="text-slate-400 font-medium text-sm leading-relaxed">
                  Utilize o painel de navegação à esquerda para escolher seu contrato ativo ou visualizar as opções em nosso catálogo de oportunidades.
                </p>
              </div>
            )}
            
          </main>
        </div>
      </div>

      <AnimatePresence>
        {showInterestForm && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="bg-white rounded-[2.5rem] p-6 md:p-8 max-w-lg w-full shadow-2xl relative border border-slate-200"
            >
              {/* Close Button */}
              <button 
                onClick={() => setShowInterestForm(false)}
                className="absolute top-6 right-6 w-10 h-10 rounded-full bg-slate-50 hover:bg-slate-100 flex items-center justify-center text-slate-500 hover:text-slate-800 transition-colors cursor-pointer"
              >
                <X size={18} />
              </button>

              <div className="flex items-center space-x-3 text-[#00bc7d] mb-6">
                <MessageSquare size={28} className="fill-current text-[#00bc7d]" />
                <h3 className="text-2xl font-black text-slate-900">Tenho Interesse!</h3>
              </div>

              <p className="text-slate-500 font-semibold text-xs mb-6 leading-relaxed">
                Demonstre interesse no imóvel <span className="font-extrabold text-[#00bc7d]">{displayedProperty?.nome || imovelData?.nome || 'Selecionado'}</span>. 
                Nossa equipe de consultores qualificados e o corretor responsável entrarão em contato direto com você o mais rápido possível!
              </p>

              <form onSubmit={async (e) => {
                e.preventDefault();
                if (!interestForm.nome || !interestForm.telefone) {
                    toast.error('Por favor, preencha o seu nome e telefone.');
                    return;
                }
                try {
                    const res = await fetch('/api/interesse', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            nome: interestForm.nome,
                            telefone: interestForm.telefone,
                            email: interestForm.email,
                            imovelId: displayedProperty?.id || imovelData?.id,
                            imovelNome: displayedProperty?.nome || imovelData?.nome || 'Imóvel Geral',
                            imovelValor: displayedProperty?.valor || imovelData?.valor || 0,
                            imovelLocalizacao: displayedProperty?.localizacao || imovelData?.localizacao || ''
                        })
                    });
                    if (res.ok) {
                        toast.success('Demonstração de interesse cadastrada! Entraremos em contato.');
                        setShowInterestForm(false);
                    } else {
                        const body = await res.json();
                        toast.error(`Erro: ${body.error || 'Falha ao processar'}`);
                    }
                } catch (err) {
                    toast.error('Erro de conexão ao salvar interesse.');
                }
              }} className="space-y-4">
                <div>
                  <label className="block text-[10px] font-black text-slate-500 uppercase mb-2 tracking-wider">Seu Nome</label>
                  <input 
                    type="text" 
                    required
                    value={interestForm.nome}
                    onChange={e => setInterestForm({...interestForm, nome: e.target.value})}
                    placeholder="Seu nome completo"
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-sm outline-none focus:ring-4 ring-[#00bc7d]/10 focus:border-[#00bc7d] font-semibold text-slate-800 transition-all placeholder:text-slate-400"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-black text-slate-500 uppercase mb-2 tracking-wider">Telefone / WhatsApp</label>
                  <input 
                    type="tel" 
                    required
                    value={interestForm.telefone}
                    onChange={e => setInterestForm({...interestForm, telefone: e.target.value})}
                    placeholder="E.g. (11) 99999-9999"
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-sm outline-none focus:ring-4 ring-[#00bc7d]/10 focus:border-[#00bc7d] font-semibold text-slate-800 transition-all placeholder:text-slate-400"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-black text-slate-500 uppercase mb-2 tracking-wider">E-mail (Opcional)</label>
                  <input 
                    type="email" 
                    value={interestForm.email}
                    onChange={e => setInterestForm({...interestForm, email: e.target.value})}
                    placeholder="E.g. seuemail@exemplo.com"
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-sm outline-none focus:ring-4 ring-[#00bc7d]/10 focus:border-[#00bc7d] font-semibold text-slate-800 transition-all placeholder:text-slate-400"
                  />
                </div>

                <div className="pt-4 flex select-none">
                  <button 
                    type="submit"
                    className="w-full bg-[#00bc7d] hover:bg-[#009b66] text-white py-4 rounded-2xl font-black text-sm uppercase tracking-wider shadow-lg shadow-[#00bc7d]/20 transition-all hover:-translate-y-0.5 active:translate-y-0 cursor-pointer"
                  >
                    Confirmar Interesse
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
