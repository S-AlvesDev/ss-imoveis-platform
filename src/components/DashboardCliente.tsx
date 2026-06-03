import React, { useState } from 'react';
import { 
  LogOut, 
  FileText, 
  Building,
  X,
  Home,
  MapPin,
  ChevronLeft,
  ChevronRight,
  User,
  Phone,
  MessageCircle,
  Download,
  Coins,
  Calendar,
  Percent,
  ShieldCheck,
  Search,
  Sparkles,
  ArrowUpDown,
  Compass,
  FileBadge
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { toast } from 'sonner';

interface DashboardClienteProps {
  onLogout: () => void;
  clienteNome?: string;
  contratoData?: any;
  imovelData?: any;
  todosImoveis?: any[];
  corretor?: any;
}

// Utility to format currency
const formatCurrency = (val: number | string | undefined) => {
  if (val === undefined || val === null || val === '') return 'R$ 0,00';
  const numeric = typeof val === 'string' ? parseFloat(val) : val;
  if (isNaN(numeric)) return 'R$ 0,00';
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(numeric);
};

// Utility to format date
const formatDate = (dateStr: string | undefined) => {
  if (!dateStr) return 'N/A';
  try {
    const parts = dateStr.split('T')[0].split('-');
    if (parts.length === 3) {
      return `${parts[2]}/${parts[1]}/${parts[0]}`;
    }
    return dateStr;
  } catch (e) {
    return dateStr;
  }
};

const PropertyGallery = ({ images }: { images?: string[] }) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [hasError, setHasError] = useState(false);

  React.useEffect(() => {
    setHasError(false);
  }, [images, currentIndex]);

  let imageList: string[] = [];
  if (images) {
    if (Array.isArray(images)) {
      imageList = images;
    } else if (typeof images === 'string') {
      try {
        const parsed = JSON.parse(images);
        if (Array.isArray(parsed)) {
          imageList = parsed;
        } else if (parsed) {
          imageList = [parsed];
        }
      } catch (e) {
        const str = (images as string).trim();
        if (str.startsWith('{') && str.endsWith('}')) {
          imageList = str.slice(1, -1).split(',').map(s => s.trim().replace(/^['"]|['"]$/g, ''));
        } else if (str) {
          imageList = [str];
        }
      }
    }
  }

  imageList = imageList.map(img => {
    if (img && !img.includes('/') && !img.startsWith('http')) {
      return `/assets/imoveis/${img}`;
    }
    return img;
  });

  if (imageList.length === 0 || hasError) {
    return (
      <div className="w-full h-56 md:h-72 bg-slate-50 flex flex-col items-center justify-center text-slate-300 rounded-2xl border border-dashed border-slate-200 relative overflow-hidden">
        <img src="/banner.png" alt="Imagem não disponível" className="w-full h-full object-cover opacity-85" referrerPolicy="no-referrer" />
        <div className="absolute inset-0 bg-slate-900/20 flex flex-col items-center justify-center">
          <span className="text-white text-xs font-bold uppercase tracking-widest bg-slate-900/70 px-4 py-1.5 rounded-full backdrop-blur-[1px]">Imagem não disponível</span>
        </div>
      </div>
    );
  }

  const nextImage = (e: React.MouseEvent) => {
    e.stopPropagation();
    setCurrentIndex((prev) => (prev + 1) % imageList.length);
  };

  const prevImage = (e: React.MouseEvent) => {
    e.stopPropagation();
    setCurrentIndex((prev) => (prev - 1 + imageList.length) % imageList.length);
  };

  return (
    <div className="relative w-full h-56 md:h-72 bg-slate-900 overflow-hidden rounded-2xl group flex items-center justify-center shadow-inner">
      <img 
        src={imageList[currentIndex]} 
        id="property-gallery-client-image"
        alt="imóvel" 
        onError={() => setHasError(true)}
        className="w-full h-full object-cover transition-transform duration-500 hover:scale-105" 
      />
      
      {imageList.length > 1 && (
        <>
          <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-black/30 opacity-70 group-hover:opacity-80 transition-opacity duration-300 pointer-events-none" />
          <button 
            type="button"
            onClick={prevImage}
            className="absolute left-3 top-1/2 -translate-y-1/2 bg-white/90 hover:bg-white text-slate-800 rounded-full p-2.5 opacity-100 md:opacity-0 md:group-hover:opacity-100 hover:scale-105 transition-all z-10 shadow-lg"
          >
            <ChevronLeft size={18} className="stroke-[2.5]" />
          </button>
          <button 
            type="button"
            onClick={nextImage}
            className="absolute right-3 top-1/2 -translate-y-1/2 bg-white/90 hover:bg-white text-slate-800 rounded-full p-2.5 opacity-100 md:opacity-0 md:group-hover:opacity-100 hover:scale-105 transition-all z-10 shadow-lg"
          >
            <ChevronRight size={18} className="stroke-[2.5]" />
          </button>
          
          <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex space-x-1.5 z-10 bg-black/40 px-3 py-1.5 rounded-full backdrop-blur-sm">
            {imageList.map((_, idx) => (
              <button 
                key={idx} 
                onClick={(e) => { e.stopPropagation(); setCurrentIndex(idx); }}
                className={`w-2 h-2 rounded-full transition-all duration-300 ${idx === currentIndex ? 'bg-white w-4' : 'bg-white/40 hover:bg-white/60'}`} 
              />
            ))}
          </div>
          
          <div className="absolute top-4 right-4 bg-black/60 text-white text-[11px] font-semibold px-3 py-1 rounded-full shadow-md backdrop-blur-sm z-10">
            {currentIndex + 1} de {imageList.length}
          </div>
        </>
      )}
    </div>
  );
};

export default function DashboardCliente({ onLogout, clienteNome = "Cliente SS", contratoData, imovelData, todosImoveis = [], corretor }: DashboardClienteProps) {
  const [activeTab, setActiveTab] = useState<'meu-contrato' | 'oportunidades'>('meu-contrato');
  const [propertySearch, setPropertySearch] = useState('');
  const [selectedProperty, setSelectedProperty] = useState<any>(null);
  const [showInterestForm, setShowInterestForm] = useState(false);
  const [interestForm, setInterestForm] = useState({ nome: '', telefone: '', email: '' });
  const [propertyTypeFilter, setPropertyTypeFilter] = useState<string>('Todos');
  const [sortBy, setSortBy] = useState<'recente' | 'preco-cres' | 'preco-dec'>('recente');

  // Filter and sort available properties
  const availableProperties = todosImoveis
    .filter(p => p.status === 'DISPONÍVEL')
    .filter(p => {
      const matchesSearch = p.nome.toLowerCase().includes(propertySearch.toLowerCase()) || 
                            p.localizacao.toLowerCase().includes(propertySearch.toLowerCase());
      const matchesType = propertyTypeFilter === 'Todos' || p.tipo === propertyTypeFilter;
      return matchesSearch && matchesType;
    })
    .sort((a, b) => {
      if (sortBy === 'preco-cres') return Number(a.valor) - Number(b.valor);
      if (sortBy === 'preco-dec') return Number(b.valor) - Number(a.valor);
      return b.id - a.id; // Recente default
    });

  // Extract unique types available for filter
  const propertyTypes = ['Todos', ...Array.from(new Set(todosImoveis.map(p => p.tipo).filter(Boolean)))];

  const getStatusBadgeColor = (status: string) => {
    switch(status?.toLowerCase()) {
      case 'em pagamento': 
      case 'ativo': 
        return 'bg-emerald-50 text-emerald-700 border-emerald-100 ring-2 ring-emerald-500/10';
      case 'atrasado': 
        return 'bg-rose-50 text-rose-700 border-rose-100 ring-2 ring-rose-500/10';
      case 'financiado': 
        return 'bg-blue-50 text-blue-700 border-blue-100 ring-2 ring-blue-500/10';
      case 'distratado': 
        return 'bg-slate-50 text-slate-600 border-slate-100 ring-2 ring-slate-500/5';
      default: 
        return 'bg-slate-50 text-slate-700 border-slate-100';
    }
  };

  const statusAtual = contratoData?.status === 'DISTRATADO' ? 'Distratado' : (contratoData?.statusFinanceiro || 'Ativo');

  return (
    <div className="min-h-screen bg-[#FDFDFD] font-sans antialiased text-slate-800">
      
      {/* Premium Header */}
      <nav className="bg-[#0F1E2E] text-white/90 sticky top-0 z-50 shadow-md backdrop-blur-md bg-opacity-95">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-20">
            <div className="flex items-center space-x-4">
              <div className="bg-white/95 p-1.5 rounded-xl shadow-lg flex items-center justify-center transition-transform hover:scale-105">
                <img src="/logo-ss-imoveis.webp" alt="Imobiliária São Severino" className="w-10 h-10 rounded-lg object-contain" />
              </div>
              <div className="flex flex-col">
                <span className="font-extrabold text-lg sm:text-xl tracking-tight leading-none text-white">IMOBILIÁRIA SÃO SEVERINO</span>
                <span className="text-[10px] text-blue-400 font-bold uppercase tracking-widest mt-1">Portal Oficial do Cliente</span>
              </div>
            </div>

            <div className="flex items-center space-x-2 sm:space-x-4">
              <button 
                onClick={onLogout}
                className="flex items-center space-x-2 bg-white/5 hover:bg-white/10 active:bg-white/20 border border-white/10 px-4 py-2.5 rounded-xl transition-all text-xs font-bold tracking-wider"
              >
                <LogOut size={15} />
                <span className="hidden sm:inline">FINALIZAR SESSÃO</span>
              </button>
            </div>
          </div>
        </div>
      </nav>

      {/* Main Container */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 md:py-12">
        
        {/* Welcome Block */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-8 pb-6 border-b border-slate-100">
          <div>
            <div className="flex items-center text-blue-600 font-bold text-xs uppercase tracking-widest mb-1.5">
              <span>Bem-vindo de volta</span>
            </div>
            <h1 className="text-3xl font-extrabold text-slate-950 tracking-tight">
              Olá, {clienteNome}!
            </h1>
            <p className="text-slate-500 text-sm mt-1">
              Acompanhe seu imóvel e veja novas oportunidades de investimento.
            </p>
          </div>

          {/* Quick Tab Switcher */}
          <div className="flex space-x-1 bg-slate-100/80 p-1.5 rounded-xl mt-6 md:mt-0 max-w-sm border border-slate-200/50">
            <button
              onClick={() => setActiveTab('meu-contrato')}
              className={`flex-1 flex items-center justify-center space-x-2 px-5 py-2.5 rounded-lg text-xs font-bold transition-all ${activeTab === 'meu-contrato' ? 'bg-white text-slate-950 shadow-sm' : 'text-slate-500 hover:text-slate-800'}`}
            >
              <FileBadge size={15} />
              <span>Meu Contrato</span>
            </button>
            <button
              onClick={() => setActiveTab('oportunidades')}
              className={`flex-1 flex items-center justify-center space-x-2 px-5 py-2.5 rounded-lg text-xs font-bold transition-all ${activeTab === 'oportunidades' ? 'bg-white text-slate-950 shadow-sm' : 'text-slate-500 hover:text-slate-800'}`}
            >
              <Compass size={15} />
              <span>Oportunidades</span>
            </button>
          </div>
        </div>

        {/* Tab contents */}
        <AnimatePresence mode="wait">
          {activeTab === 'meu-contrato' && (
            <motion.div
              key="meu-contrato"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              transition={{ duration: 0.3 }}
              className="space-y-8"
            >
              {!contratoData ? (
                <div className="bg-white rounded-2xl p-12 text-center max-w-lg mx-auto shadow-sm border border-slate-100 space-y-4">
                  <div className="bg-slate-50 w-20 h-20 rounded-2xl flex items-center justify-center mx-auto text-slate-400">
                    <Building size={36} />
                  </div>
                  <h2 className="text-xl font-bold text-slate-900">Nenhum contrato ativo</h2>
                  <p className="text-sm text-slate-500 leading-relaxed max-w-md mx-auto">
                    Não encontramos financiamentos ativos vinculados à sua conta no momento. Acesse a aba <strong>Oportunidades</strong> abaixo para explorar lançamentos premium excelentes.
                  </p>
                  <button 
                    onClick={() => setActiveTab('oportunidades')}
                    className="bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs uppercase tracking-wider py-3 px-6 rounded-xl transition-all shadow-md mt-4 shadow-blue-500/10 hover:shadow-blue-500/20 active:scale-95"
                  >
                    Ver Oportunidades disponíveis
                  </button>
                </div>
              ) : (
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                  
                  {/* Left Column: Contract overview & Property Gallery */}
                  <div className="lg:col-span-2 space-y-8">
                    
                    {/* Status Box & Title */}
                    <div className="bg-white rounded-3xl p-6 md:p-8 shadow-sm border border-slate-100 flex flex-col md:flex-row md:items-center md:justify-between gap-6">
                      <div className="space-y-1">
                        <span className="text-[10px] text-blue-500 font-extrabold uppercase tracking-widest">Contrato Principal</span>
                        <h2 className="text-2xl font-black text-slate-900">
                          {imovelData?.nome || 'Imóvel Financiado'}
                        </h2>
                        <div className="flex items-center text-slate-500 text-xs mt-1.5 font-medium">
                          <MapPin size={14} className="mr-1.5 text-blue-500 flex-shrink-0" />
                          <span>{imovelData?.localizacao || 'Localização Geral'}</span>
                        </div>
                      </div>

                      <div className={`p-4 rounded-2xl border text-center font-bold px-6 min-w-[150px] flex flex-col justify-center items-center ${getStatusBadgeColor(statusAtual)}`}>
                        <span className="text-[9px] uppercase tracking-wider mb-0.5 opacity-60 font-semibold text-slate-500 block">STATUS FINANCEIRO</span>
                        <span className="text-base text-slate-950 font-black uppercase tracking-tight">{statusAtual}</span>
                      </div>
                    </div>

                    {/* Integrated Property Details & Gallery */}
                    <div className="bg-white rounded-3xl shadow-sm border border-slate-100 overflow-hidden">
                      <div className="p-6 border-b border-slate-50 flex items-center justify-between">
                        <div className="flex items-center space-x-3">
                          <div className="bg-blue-50 rounded-lg p-1.5 text-blue-600">
                            <Building size={16} />
                          </div>
                          <span className="text-xs font-bold uppercase tracking-wider text-slate-800">Galeria e Descrição do Imóvel</span>
                        </div>
                        <span className="bg-blue-50 text-blue-700 text-[10px] font-bold px-2.5 py-1 rounded-full uppercase tracking-wider">
                          {imovelData?.tipo || 'Imóvel'}
                        </span>
                      </div>
                      
                      <div className="p-6 space-y-6">
                        <PropertyGallery images={imovelData?.images} />
                        
                        {imovelData?.descricao && imovelData.descricao !== 'Sem descrição detalhada' && (
                          <div className="relative bg-slate-50 rounded-2xl p-6 border border-slate-100/50">
                            <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-2.5">SOBRE O EMPREENDIMENTO</h4>
                            <p className="text-slate-600 text-sm leading-relaxed italic pr-6 text-justify">
                              "{imovelData.descricao}"
                            </p>
                          </div>
                        )}
                      </div>
                    </div>


                  </div>

                  {/* Right Column: Broker, Support & Attached Documents */}
                  <div className="space-y-8">
                    
                    {/* Attached Documents */}
                    {contratoData?.distrato?.pdfs && contratoData.distrato.pdfs.length > 0 && (
                      <div className="bg-white rounded-3xl shadow-sm border border-slate-100 p-6 md:p-8 space-y-4">
                        <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center border-b pb-3 border-slate-50">
                          <FileText size={15} className="mr-2 text-blue-500" />
                          Arquivos & Minutas
                        </h4>
                        <div className="flex flex-col space-y-3">
                          {contratoData.distrato.pdfs.map((pdf: string, idx: number) => (
                            <a 
                              key={idx} 
                              href={pdf} 
                              target="_blank" 
                              rel="noopener noreferrer" 
                              className="flex items-center justify-between p-3.5 bg-slate-50 hover:bg-blue-50/50 hover:border-blue-200 transition-all rounded-2xl border border-slate-100 group"
                            >
                              <div className="flex items-center space-x-3 text-slate-700 group-hover:text-blue-700 min-w-0">
                                <div className="p-2.5 bg-white rounded-xl text-red-500 shadow-sm border border-slate-100 flex-shrink-0">
                                  <FileText size={18} />
                                </div>
                                <span className="text-xs font-bold truncate pr-3 text-slate-800">Minuta Contrato {idx + 1}.pdf</span>
                              </div>
                              <Download size={14} className="text-slate-400 group-hover:text-blue-600 flex-shrink-0" />
                            </a>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Broker Profile Card */}
                    {corretor && (
                      <div className="bg-white rounded-3xl shadow-sm border border-slate-100 p-6 md:p-8 space-y-4 text-center">
                        <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center justify-center border-b pb-3 border-slate-50">
                          <User size={15} className="mr-2 text-blue-500" />
                          Meu Atendimento Exclusivo
                        </h4>
                        
                        <div className="pt-3 pb-2 flex flex-col items-center">
                          <div className="w-16 h-16 rounded-full bg-gradient-to-tr from-blue-600 to-[#0F1E2E] text-white font-extrabold flex items-center justify-center text-xl shadow-md border-2 border-white ring-4 ring-slate-100">
                            {corretor.nome ? corretor.nome.split(' ').map((n:string)=>n[0]).slice(0,2).join('') : 'C'}
                          </div>
                          
                          <h3 className="font-extrabold text-slate-900 text-lg mt-3 leading-tight leading-none">{corretor.nome}</h3>
                          <p className="text-xs text-slate-400 font-medium mt-1">Consultor Imobiliário SS</p>
                          
                          {corretor.telefone && (
                            <div className="bg-emerald-50 text-emerald-700 text-[10px] font-black tracking-widest px-3 py-1 rounded-full uppercase mt-2.5">
                              {corretor.telefone}
                            </div>
                          )}
                        </div>

                        <a 
                          href={`https://wa.me/55${corretor.telefone?.replace(/\D/g, '') || ''}?text=Olá%20${encodeURIComponent(corretor.nome)},%20sou%20seu%20cliente%20no%20Portal%20SS%20Imóveis%20e%20gostaria%20de%20esclarecer%20algumas%20dúvidas.`} 
                          target="_blank" 
                          rel="noopener noreferrer" 
                          className="w-full flex items-center justify-center space-x-2 bg-emerald-500 hover:bg-emerald-600 active:scale-95 text-white py-3.5 px-4 rounded-2xl text-xs font-bold uppercase tracking-wider transition-all shadow-lg shadow-emerald-500/15"
                        >
                          <MessageCircle size={16} />
                          <span>FALAR NO WHATSAPP</span>
                        </a>
                      </div>
                    )}

                    {/* Central Legal Advisory */}
                    <div className="bg-[#F8FAFC] rounded-3xl p-6 border border-slate-200/50 space-y-3">
                      <div className="flex items-center space-x-2 text-[#0F1E2E]">
                        <ShieldCheck size={18} className="stroke-[2.5]" />
                        <h4 className="text-xs font-black uppercase tracking-wider">SUPORTE E OUVIDORIA</h4>
                      </div>
                      <p className="text-[11px] text-slate-500 leading-relaxed">
                        Compromissados com sua satisfação. Caso precise de relatórios adicionais, reparos (caso ainda esteja assegurado no contrato), quitação de dívida, entre em contato diretamente com nosso suporte.
                      </p>
                    </div>

                  </div>
                </div>
              )}
            </motion.div>
          )}

          {activeTab === 'oportunidades' && (
            <motion.div
              key="oportunidades"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              transition={{ duration: 0.3 }}
              className="space-y-8"
            >
              <div className="bg-white rounded-3xl shadow-sm border border-slate-100 p-6 md:p-8 space-y-6">
                
                {/* Search and Filters panel */}
                <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
                  <div className="relative w-full md:max-w-md">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                    <input 
                      type="text" 
                      placeholder="Pesquise por condomínio, bairro ou nome..."
                      className="w-full pl-11 pr-4 py-3.5 bg-slate-50 border border-slate-200 focus:border-blue-500 rounded-2xl text-xs outline-none focus:ring-4 ring-blue-500/10 shadow-inner transition-all text-slate-800 placeholder-slate-400 font-medium"
                      value={propertySearch}
                      onChange={e => setPropertySearch(e.target.value)}
                    />
                  </div>

                  {/* Ordering dropdown */}
                  <div className="flex items-center space-x-2 w-full md:w-auto">
                    <ArrowUpDown size={14} className="text-slate-400" />
                    <select 
                      value={sortBy}
                      onChange={e => setSortBy(e.target.value as any)}
                      className="flex-1 md:flex-none border border-slate-200 bg-white hover:border-slate-300 rounded-xl px-3 py-2 text-xs font-medium text-slate-700 outline-none"
                    >
                      <option value="recente">Lançamentos Recentes</option>
                      <option value="preco-cres">Preço: Menor para Maior</option>
                      <option value="preco-dec">Preço: Maior para Menor</option>
                    </select>
                  </div>
                </div>

                {/* Categorization Pills */}
                {propertyTypes.length > 1 && (
                  <div className="flex flex-wrap gap-2 pt-2 border-t border-slate-50">
                    {propertyTypes.map((type) => (
                      <button
                        key={type}
                        onClick={() => setPropertyTypeFilter(type)}
                        className={`px-4 py-2 rounded-full text-xs font-bold transition-all ${propertyTypeFilter === type ? 'bg-blue-600 text-white shadow-md shadow-blue-500/10' : 'bg-slate-50 text-slate-600 hover:bg-slate-100 hover:text-slate-800'}`}
                      >
                        {type === 'Todos' ? '📂 Todos os Tipos' : type}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Bento Grid layout */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {availableProperties.length === 0 ? (
                  <div className="col-span-full text-center py-16 bg-white rounded-3xl border border-slate-100 shadow-sm space-y-4">
                    <div className="mx-auto w-16 h-16 rounded-2xl bg-slate-50 flex items-center justify-center text-slate-400">
                      <Compass size={28} />
                    </div>
                    <h3 className="text-base font-bold text-slate-900">Nenhum imóvel disponível correspondente</h3>
                    <p className="text-xs text-slate-400 max-w-sm mx-auto leading-relaxed">
                      Lamentamos, mas não encontramos nenhuma oferta com os critérios indicados. Tente limpar sua busca ou mudar o filtro.
                    </p>
                    <button 
                      onClick={() => { setPropertySearch(''); setPropertyTypeFilter('Todos'); }}
                      className="text-xs font-bold text-blue-600 uppercase border-b border-transparent hover:border-blue-600"
                    >
                      Limpar Filtros de Busca
                    </button>
                  </div>
                ) : availableProperties.map(p => {
                  const firstImg = p.images && p.images.length > 0 ? p.images[0] : '';
                  const resolvedSrc = firstImg && !firstImg.includes('/') && !firstImg.startsWith('http') 
                    ? `/assets/imoveis/${firstImg}` 
                    : firstImg;
                  
                  return (
                    <motion.div 
                      key={p.id}
                      layout
                      whileHover={{ y: -5 }}
                      onClick={() => { setSelectedProperty(p); setShowInterestForm(false); }}
                      className="bg-white rounded-3xl overflow-hidden shadow-sm hover:shadow-xl border border-slate-100 cursor-pointer flex flex-col justify-between transition-all"
                    >
                      <div>
                        {/* Image Frame */}
                        <div className="relative h-48 w-full bg-slate-100 overflow-hidden">
                          {resolvedSrc ? (
                            <img src={resolvedSrc} alt={p.nome} className="w-full h-full object-cover transition-transform duration-500 hover:scale-105" />
                          ) : (
                            <div className="w-full h-full flex flex-col items-center justify-center text-slate-300">
                              <Home size={40} />
                            </div>
                          )}
                          <div className="absolute top-3 left-3 bg-[#0F1E2E]/80 backdrop-blur-sm text-white text-[9px] font-bold uppercase tracking-widest px-3 py-1.5 rounded-full">
                            {p.tipo || 'Lote'}
                          </div>
                        </div>

                        {/* Card Meta */}
                        <div className="p-5 space-y-2">
                          <h4 className="font-extrabold text-slate-950 text-base leading-snug line-clamp-1 group-hover:text-blue-600 transition-colors">{p.nome}</h4>
                          <div className="flex items-start text-xs text-slate-400 leading-normal line-clamp-2">
                            <MapPin size={12} className="mr-1.5 mt-0.5 text-blue-500 flex-shrink-0" />
                            <span>{p.localizacao}</span>
                          </div>
                        </div>
                      </div>

                      {/* Card Footer Price & Action */}
                      <div className="px-5 pb-5 pt-3 border-t border-slate-50 flex items-center justify-between">
                        <div>
                          <span className="text-[9px] font-bold text-slate-450 uppercase block tracking-widest leading-none">A PARTIR DE</span>
                          <span className="text-base font-extrabold text-blue-600 leading-snug mt-1 inline-block">
                            {formatCurrency(p.valor)}
                          </span>
                        </div>
                        <span className="bg-slate-50 hover:bg-slate-100 text-slate-700 text-[10px] font-bold px-3 py-2 rounded-xl border border-slate-100 transition-colors">
                          Ver Detalhes
                        </span>
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

      </main>

      {/* Property Details Modal */}
      <AnimatePresence>
        {selectedProperty && (
          <>
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setSelectedProperty(null)}
              className="fixed inset-0 bg-slate-950/45 backdrop-blur-md z-[200] flex items-center justify-center p-4 transition-all"
            />
            <motion.div 
              initial={{ opacity: 0, y: 40, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 40, scale: 0.95 }}
              className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-lg bg-white rounded-3xl shadow-2xl z-[201] overflow-hidden max-h-[92vh] flex flex-col"
            >
              <div className="relative flex-shrink-0">
                <PropertyGallery images={selectedProperty.images} />
                
                <button 
                  onClick={() => { setSelectedProperty(null); setShowInterestForm(false); }}
                  className="absolute top-4 right-4 bg-black/40 hover:bg-black/60 text-white p-2 border border-white/15 rounded-full transition-all z-[202]"
                >
                  <X size={16} />
                </button>
              </div>

              <div className="p-6 md:p-8 flex-1 overflow-y-auto space-y-6">
                <div>
                  <span className="bg-blue-50 text-blue-700 text-[9px] font-black uppercase tracking-widest px-2.5 py-1 rounded-full">{selectedProperty.tipo || 'Imóvel'}</span>
                  <h3 className="text-2xl font-black text-slate-900 leading-tight mt-2">{selectedProperty.nome}</h3>
                  <div className="flex items-center text-slate-400 text-xs mt-1.5 font-bold uppercase tracking-wider">
                    <MapPin size={13} className="mr-1 text-blue-500" />
                    {selectedProperty.localizacao}
                  </div>
                </div>

                <div className="space-y-6">
                  {selectedProperty.descricao && selectedProperty.descricao !== 'Sem descrição detalhada' && (
                    <div className="p-4 bg-[#F8FAFC] rounded-2xl border border-slate-150 italic">
                      <p className="text-xs text-slate-600 leading-relaxed">
                        "{selectedProperty.descricao}"
                      </p>
                    </div>
                  )}

                  {/* Pricing brief */}
                  <div className="bg-blue-50/50 rounded-2xl p-4 flex items-center justify-between border border-blue-100">
                    <span className="text-xs font-bold text-blue-800 uppercase tracking-wider">Avaliação Estimada</span>
                    <span className="text-lg font-black text-blue-600">{formatCurrency(selectedProperty.valor)}</span>
                  </div>

                  {!showInterestForm ? (
                    <div className="flex justify-end pt-2">
                      <button 
                        onClick={() => setShowInterestForm(true)}
                        className="bg-[#0F1E2E] hover:bg-slate-950 text-white w-full py-4 rounded-2xl text-xs font-bold uppercase tracking-wider transition-all shadow-xl shadow-slate-900/10 hover:shadow-slate-900/20 active:scale-95 flex items-center justify-center space-x-2"
                      >
                        <MessageCircle size={15} />
                        <span>TENHO INTERESSE NESTE IMÓVEL</span>
                      </button>
                    </div>
                  ) : (
                    <motion.div 
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      className="border-t border-slate-100 pt-5 space-y-4"
                    >
                      <h4 className="text-xs font-bold text-slate-800 uppercase tracking-widest flex items-center">
                        <Sparkles size={14} className="mr-1 text-blue-600" />
                        FORMULÁRIO DE SELECIONAMENTO
                      </h4>
                      <p className="text-[11px] text-slate-400 leading-normal">
                        Entraremos em contato com você o quanto antes. Por favor, confirme ou preencha seus dados de contato:
                      </p>
                      
                      <div className="space-y-3">
                        <div className="space-y-1">
                          <span className="text-[9px] text-slate-400 font-bold uppercase tracking-wider">NOME COMPLETO</span>
                          <input 
                            type="text" 
                            placeholder="Seu Nome Completo" 
                            className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-xs outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-550 transition-all font-medium text-slate-800"
                            value={interestForm.nome}
                            onChange={e => setInterestForm({...interestForm, nome: e.target.value})}
                          />
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                          <div className="space-y-1">
                            <span className="text-[9px] text-slate-400 font-bold uppercase tracking-wider">E-MAIL (OPCIONAL)</span>
                            <input 
                              type="email" 
                              placeholder="Seu E-mail" 
                              className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-xs outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-550 transition-all font-medium text-slate-800"
                              value={interestForm.email}
                              onChange={e => setInterestForm({...interestForm, email: e.target.value})}
                            />
                          </div>

                          <div className="space-y-1">
                            <span className="text-[9px] text-slate-400 font-bold uppercase tracking-wider">WHATSAPP / TELEFONE</span>
                            <input 
                              type="text" 
                              placeholder="DDD + Telefone" 
                              className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-xs outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-550 transition-all font-medium text-slate-800"
                              value={interestForm.telefone}
                              onChange={e => setInterestForm({...interestForm, telefone: e.target.value})}
                            />
                          </div>
                        </div>

                        <button 
                          onClick={() => {
                            if (!interestForm.nome || !interestForm.telefone) return toast.error("Preencha nome e telefone de contato mínimos.");
                            fetch('/api/interesse', { method: 'POST', headers: {'Content-Type':'application/json'}, body: JSON.stringify({
                              imovelId: selectedProperty.id,
                              imovelNome: selectedProperty.nome,
                              imovelValor: selectedProperty.valor,
                              imovelLocalizacao: selectedProperty.localizacao,
                              nome: interestForm.nome,
                              telefone: interestForm.telefone,
                              email: interestForm.email
                            })}).catch(e=>{});
                            toast.success("Demonstração de Interesse registrada! Nosso corretor entrará em contato.");
                            setShowInterestForm(false);
                            setSelectedProperty(null);
                          }}
                          className="w-full bg-blue-600 text-white py-3.5 px-4 rounded-2xl text-xs font-bold uppercase tracking-wider hover:bg-blue-700 transition-all shadow-lg shadow-blue-500/10 active:scale-95 flex items-center justify-center space-x-2"
                        >
                          <Compass size={14} />
                          <span>REGISTRAR INTERESSE</span>
                        </button>
                      </div>
                    </motion.div>
                  )}
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Floating Action Button for support */}
      <a
        href={`https://wa.me/5584994511030?text=${encodeURIComponent("Olá, sou cliente cadastrado no site Imobiliária São Severino e gostaria de falar com o suporte.")}`}
        target="_blank"
        rel="noopener noreferrer"
        className="fixed bottom-6 right-6 bg-emerald-500 text-white p-4.5 rounded-full shadow-2xl hover:bg-emerald-600 transition-all z-40 active:scale-95 flex items-center justify-center hover:scale-110"
        style={{ boxShadow: '0 8px 30px rgba(16, 185, 129, 0.4)' }}
        title="Falar com Suporte"
      >
        <MessageCircle size={28} className="stroke-[2.5]" />
      </a>
    </div>
  );
}
