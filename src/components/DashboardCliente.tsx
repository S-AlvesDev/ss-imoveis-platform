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
  Phone
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface DashboardClienteProps {
  onLogout: () => void;
  clienteNome?: string;
  contratoData?: any;
  imovelData?: any;
  todosImoveis?: any[];
  corretor?: any;
}

const PropertyGallery = ({ images }: { images?: string[] }) => {
  const [currentIndex, setCurrentIndex] = useState(0);

  if (!images || images.length === 0) {
    return (
      <div className="w-full h-48 bg-blue-50 flex flex-col items-center justify-center text-blue-300 rounded-2xl">
        <Home size={40} className="mb-2" />
        <span className="text-xs font-bold uppercase tracking-widest">Sem Imagens</span>
      </div>
    );
  }

  const nextImage = (e: React.MouseEvent) => {
    e.stopPropagation();
    setCurrentIndex((prev) => (prev + 1) % images.length);
  };

  const prevImage = (e: React.MouseEvent) => {
    e.stopPropagation();
    setCurrentIndex((prev) => (prev - 1 + images.length) % images.length);
  };

  return (
    <div className="relative w-full h-64 bg-gray-200 overflow-hidden rounded-2xl group">
      <img src={images[currentIndex]} alt="imóvel" className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" />
      
      {images.length > 1 && (
        <>
          <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-20 transition-all duration-300 pointer-events-none" />
          <button 
            type="button"
            onClick={prevImage}
            className="absolute left-2 top-1/2 -translate-y-1/2 bg-black/40 text-white rounded-full p-2 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 hover:bg-black/70 transition-all z-10"
          >
            <ChevronLeft size={20} />
          </button>
          <button 
            type="button"
            onClick={nextImage}
            className="absolute right-2 top-1/2 -translate-y-1/2 bg-black/40 text-white rounded-full p-2 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 hover:bg-black/70 transition-all z-10"
          >
            <ChevronRight size={20} />
          </button>
          
          <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex space-x-1.5 z-10">
            {images.map((_, idx) => (
              <div 
                key={idx} 
                className={`w-1.5 h-1.5 rounded-full transition-all ${idx === currentIndex ? 'bg-white scale-125' : 'bg-white/50'}`} 
              />
            ))}
          </div>
          
          <div className="absolute top-3 right-3 bg-black/50 text-white text-[10px] font-bold px-3 py-1 rounded-full shadow-sm backdrop-blur-sm z-10">
            {currentIndex + 1} / {images.length}
          </div>
        </>
      )}
    </div>
  );
};

export default function DashboardCliente({ onLogout, clienteNome = "Cliente SS", contratoData, imovelData, todosImoveis = [], corretor }: DashboardClienteProps) {
  const [propertySearch, setPropertySearch] = useState('');
  const [selectedProperty, setSelectedProperty] = useState<any>(null);
  const [showInterestForm, setShowInterestForm] = useState(false);
  const [interestForm, setInterestForm] = useState({ nome: '', telefone: '', email: '' });
  const availableProperties = todosImoveis.filter(p => 
    p.status === 'DISPONÍVEL' && 
    (p.nome.toLowerCase().includes(propertySearch.toLowerCase()) || 
     p.localizacao.toLowerCase().includes(propertySearch.toLowerCase()))
  );

  const getStatusBadgeColor = (status: string) => {
    switch(status?.toLowerCase()) {
      case 'em pagamento': return 'bg-blue-100 text-blue-700 border-blue-200';
      case 'atrasado': return 'bg-red-100 text-red-700 border-red-200';
      case 'financiado': return 'bg-green-100 text-green-700 border-green-200';
      case 'distratado': return 'bg-amber-100 text-amber-700 border-amber-200';
      default: return 'bg-gray-100 text-gray-700 border-gray-200';
    }
  };

  const statusAtual = contratoData?.status === 'DISTRATADO' ? 'Distratado' : (contratoData?.statusFinanceiro || 'Em Pagamento');

  return (
    <div className="min-h-screen bg-[#F8FAFC]">
      {/* Topbar */}
      <header className="bg-[#1D2D3D] text-white h-16 sticky top-0 z-50 px-4 flex items-center justify-between shadow-lg">
        <div className="flex items-center space-x-3">
          <div className="bg-white p-1 rounded-full w-10 h-10 flex items-center justify-center">
            <img src="/logo-ss-imoveis.webp" alt="SS Imóveis" className="w-8 h-8 rounded-full" />
          </div>
          <div className="flex flex-col">
            <span className="font-bold text-sm tracking-tight leading-none">SS IMÓVEIS</span>
            <span className="text-[10px] text-blue-400 font-bold uppercase tracking-wider mt-0.5">Portal do Cliente</span>
          </div>
        </div>
        
        <button 
          onClick={onLogout}
          className="flex items-center space-x-2 bg-white/10 hover:bg-white/20 px-3 py-2 rounded-lg transition-colors text-xs font-bold"
        >
          <LogOut size={16} />
          <span className="hidden sm:inline">SAIR</span>
        </button>
      </header>

      <main className="max-w-md mx-auto p-4 space-y-6 pb-12">
        {/* Welcome */}
        <div className="pt-2">
          <h1 className="text-2xl font-black text-[#1D2D3D]">Olá, {clienteNome.split(' ')[0]}!</h1>
          <p className="text-gray-500 text-sm">Bem-vindo ao seu portal SS Imóveis.</p>
        </div>

        {!contratoData ? (
           <div className="bg-white rounded-2xl p-8 shadow-sm border border-gray-100 text-center space-y-4">
              <div className="bg-blue-50 w-16 h-16 rounded-full flex items-center justify-center mx-auto text-blue-600">
                <Building size={32} />
              </div>
              <h2 className="text-lg font-bold text-gray-800">Nenhum contrato ativo</h2>
              <p className="text-xs text-gray-500 leading-relaxed">Não encontramos financiamentos ativos vinculados à sua conta no momento. Explore nossas oportunidades abaixo!</p>
           </div>
        ) : (
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-6"
          >
            {/* Status Card */}
            <div className={`border-2 rounded-2xl p-5 shadow-sm text-center ${getStatusBadgeColor(statusAtual)}`}>
              <span className="text-[10px] items-center justify-center flex font-black uppercase tracking-widest mb-1 opacity-70">
                Status do Contrato
              </span>
              <h2 className="text-2xl font-black tracking-tight">{statusAtual}</h2>
              {statusAtual === 'Distratado' && (
                <p className="text-xs mt-2 opacity-80 font-medium">Contrato cancelado via acordo de distrato.</p>
              )}
            </div>

            {/* Imóvel Details */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
               <div className="p-4 border-b border-gray-50 flex items-center text-blue-600 space-x-2">
                 <Building size={18} />
                 <span className="text-xs font-black uppercase tracking-widest">Imóvel Adquirido</span>
               </div>
               
               <div className="p-4 space-y-4">
                 <PropertyGallery images={imovelData?.images} />
                 
                 <div>
                   <h3 className="text-xl font-bold text-gray-800 leading-tight mb-2">{imovelData?.nome || "Imóvel Financiado"}</h3>
                   <div className="flex items-start tracking-tight text-gray-500 text-xs font-medium">
                     <MapPin size={14} className="mr-1.5 mt-0.5 flex-shrink-0 text-blue-500" />
                     <span>{imovelData?.localizacao || "Localização não informada"}</span>
                   </div>
                 </div>

                 {imovelData?.descricao && imovelData.descricao !== 'Sem descrição detalhada' && (
                   <div className="bg-gray-50 p-4 rounded-xl text-xs text-gray-600 leading-relaxed italic border border-gray-100">
                     "{imovelData.descricao}"
                   </div>
                 )}

                 <div className="flex justify-between items-center py-3 border-t border-gray-50">
                    <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Valor do Imóvel</span>
                    <span className="text-lg font-black text-blue-700">R$ {(contratoData.valorImovel || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                 </div>
               </div>
            </div>

            {/* Corretor Info */}
            {corretor && (
               <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5 space-y-3">
                 <h4 className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2 flex items-center border-b pb-2">
                   <User size={14} className="mr-1.5 text-blue-500" />
                   SEU CORRETOR
                 </h4>
                 <div className="flex items-center justify-between">
                   <div>
                     <p className="font-bold text-gray-800">{corretor.nome}</p>
                     <p className="text-xs text-gray-500 font-medium">Equipe SS Imóveis</p>
                   </div>
                   <a href={`https://wa.me/55${corretor.telefone?.replace(/\D/g, '') || ''}`} target="_blank" rel="noopener noreferrer" className="bg-green-50 text-green-600 p-3 rounded-full hover:bg-green-100 transition-colors">
                     <Phone size={18} />
                   </a>
                 </div>
               </div>
            )}
            
            {/* Footer Alert */}
            <p className="text-center text-[10px] text-gray-400 font-medium px-4">
              Dúvidas sobre pagamentos, antecipações ou negociação? Entre em contato com seu corretor.
            </p>
          </motion.div>
        )}

        {/* Marketplace Section */}
        <div className="mt-10 pt-10 border-t border-gray-200 space-y-6">
          <div className="flex flex-col space-y-1">
            <h3 className="font-bold text-gray-800 text-sm uppercase tracking-widest flex items-center">
              <Building size={18} className="mr-2 text-blue-600" />
              Novas Oportunidades
            </h3>
            <p className="text-gray-500 text-[10px]">Confira outros imóveis disponíveis em nossa base.</p>
          </div>

          <div className="relative">
            <input 
              type="text" 
              placeholder="Pesquisar por nome ou localização..."
              className="w-full px-4 py-3 bg-white border border-gray-200 rounded-xl text-sm outline-none focus:ring-2 ring-blue-500 shadow-sm"
              value={propertySearch}
              onChange={e => setPropertySearch(e.target.value)}
            />
          </div>

          <div className="grid grid-cols-1 gap-4">
            {availableProperties.length === 0 ? (
              <div className="text-center py-10 bg-gray-50 rounded-2xl border-2 border-dashed border-gray-200">
                <p className="text-gray-400 text-xs italic">Nenhum imóvel encontrado para "{propertySearch}"</p>
              </div>
            ) : availableProperties.map(p => (
              <motion.div 
                key={p.id}
                layout
                whileHover={{ scale: 1.02 }}
                onClick={() => setSelectedProperty(p)}
                className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 cursor-pointer transition-all hover:border-blue-300"
              >
                <div className="flex space-x-4">
                  {p.images && p.images.length > 0 ? (
                    <div className="w-20 h-20 rounded-lg flex-shrink-0 bg-gray-100 overflow-hidden">
                       <img src={p.images[0]} alt="Capa" className="w-full h-full object-cover" />
                    </div>
                  ) : (
                    <div className="w-20 h-20 bg-blue-50 rounded-lg flex items-center justify-center flex-shrink-0">
                      <Home size={32} className="text-blue-600" />
                    </div>
                  )}
                  <div className="flex-1">
                    <h4 className="font-bold text-gray-800 text-sm leading-tight mb-1">{p.nome}</h4>
                    <p className="text-[10px] text-gray-500 mb-2">{p.localizacao}</p>
                    <p className="text-blue-600 font-black text-sm">R$ {p.valor.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
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
              className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[200] flex items-center justify-center p-4"
            />
            <motion.div 
              initial={{ opacity: 0, y: 100, scale: 0.9 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 100, scale: 0.9 }}
              className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-sm bg-white rounded-2xl shadow-2xl z-[201] overflow-hidden max-h-[90vh] overflow-y-auto"
            >
              <PropertyGallery images={selectedProperty.images} />
              
              <button 
                onClick={() => { setSelectedProperty(null); setShowInterestForm(false); }}
                className="absolute top-4 right-4 bg-black/50 text-white p-2 rounded-full hover:bg-black/70 transition-all z-[202]"
              >
                <X size={16} />
              </button>

              <div className="p-6 space-y-4">
                <div>
                  <h3 className="text-xl font-bold text-gray-800 leading-tight mb-1">{selectedProperty.nome}</h3>
                  <div className="flex items-center text-gray-400 text-[10px] font-bold uppercase tracking-widest">
                    <MapPin size={12} className="mr-1 text-blue-500" />
                    {selectedProperty.localizacao}
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="p-4 bg-blue-50 rounded-xl border border-blue-100 italic">
                    <p className="text-xs text-blue-900 leading-relaxed">
                      "{selectedProperty.descricao}"
                    </p>
                  </div>

                  {!showInterestForm ? (
                    <div className="flex justify-between items-end border-t border-gray-100 pt-4">
                      <div>
                         <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Valor de Venda</p>
                         <p className="text-2xl font-black text-blue-700">R$ {selectedProperty.valor.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
                      </div>
                      <button 
                        onClick={() => setShowInterestForm(true)}
                        className="bg-[#1D2D3D] text-white px-6 py-3 rounded-xl text-xs font-bold uppercase tracking-widest hover:bg-black transition-all shadow-lg active:scale-95"
                      >
                        TENHO INTERESSE
                      </button>
                    </div>
                  ) : (
                    <motion.div 
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      className="border-t border-gray-100 pt-4"
                    >
                      <h4 className="text-xs font-bold text-gray-800 uppercase tracking-widest mb-3">Preencha seus dados</h4>
                      <div className="space-y-3">
                        <input 
                          type="text" 
                          placeholder="Seu Nome Completo" 
                          className="w-full px-3 py-2 border rounded-lg text-sm outline-none focus:ring-2 ring-blue-500"
                          value={interestForm.nome}
                          onChange={e => setInterestForm({...interestForm, nome: e.target.value})}
                        />
                        <input 
                          type="email" 
                          placeholder="Seu E-mail" 
                          className="w-full px-3 py-2 border rounded-lg text-sm outline-none focus:ring-2 ring-blue-500"
                          value={interestForm.email}
                          onChange={e => setInterestForm({...interestForm, email: e.target.value})}
                        />
                        <input 
                          type="text" 
                          placeholder="DDD + Telefone" 
                          className="w-full px-3 py-2 border rounded-lg text-sm outline-none focus:ring-2 ring-blue-500"
                          value={interestForm.telefone}
                          onChange={e => setInterestForm({...interestForm, telefone: e.target.value})}
                        />
                        <button 
                          onClick={() => {
                            if (!interestForm.nome || !interestForm.telefone) return alert("Preencha nome e telefone.");
                            fetch('/api/interesse', { method: 'POST', headers: {'Content-Type':'application/json'}, body: JSON.stringify({
                              imovelId: selectedProperty.id,
                              imovelNome: selectedProperty.nome,
                              imovelValor: selectedProperty.valor,
                              imovelLocalizacao: selectedProperty.localizacao,
                              nome: interestForm.nome,
                              telefone: interestForm.telefone,
                              email: interestForm.email
                            })}).catch(e=>{});
                            alert("Interesse registrado! Entraremos em contato.");
                            setShowInterestForm(false);
                            setSelectedProperty(null);
                          }}
                          className="w-full bg-blue-600 text-white px-4 py-3 rounded-xl text-xs font-bold uppercase tracking-widest hover:bg-blue-700 transition-all shadow-lg active:scale-95 flex items-center justify-center space-x-2"
                        >
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
    </div>
  );
}
