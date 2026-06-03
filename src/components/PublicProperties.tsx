import React, { useState, useEffect, useRef } from 'react';
import { Search, ChevronLeft, ChevronRight, Home, MapPin } from 'lucide-react';
import { toast } from 'sonner';

export default function PublicProperties() {
  const [properties, setProperties] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState('Todos');
  
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetch('/api/public-properties')
      .then(res => res.json())
      .then(data => {
        setProperties(data);
        setLoading(false);
      })
      .catch(err => {
        console.error('Erro ao buscar imóveis:', err);
        setLoading(false);
      });
  }, []);

  const scroll = (direction: 'left' | 'right') => {
    if (scrollRef.current) {
      const scrollAmount = 300;
      scrollRef.current.scrollBy({
        left: direction === 'left' ? -scrollAmount : scrollAmount,
        behavior: 'smooth'
      });
    }
  };

  const handleInterest = (propName: string) => {
    // Scroll to top login or just show alert
    toast.success('Faça login ou cadastre-se para demonstrar interesse neste imóvel!');
    document.getElementById('login-card')?.scrollIntoView({ behavior: 'smooth' });
  };

  const getNormalizedImage = (imageName: string) => {
    if (!imageName) return '';
    if (!imageName.includes('/') && !imageName.startsWith('http')) {
      return `/assets/imoveis/${imageName}`;
    }
    return imageName;
  };

  const filteredProperties = properties.filter(p => {
    const term = searchTerm.toLowerCase();
    const matchesSearch = p.nome.toLowerCase().includes(term) || p.localizacao.toLowerCase().includes(term);
    
    // check simple logic (assuming types are roughly matching)
    let matchesType = true;
    if (filterType !== 'Todos') {
       matchesType = p.tipo?.toLowerCase() === filterType.toLowerCase();
    }
    
    return matchesSearch && matchesType;
  });

  if (loading) {
     return (
        <section className="py-20 bg-gray-50 border-t border-gray-200">
           <div className="max-w-6xl mx-auto px-4 flex justify-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
           </div>
        </section>
     );
  }

  if (properties.length === 0) return null;

  return (
    <section className="py-20 bg-gray-50 border-t border-gray-200" id="imoveis">
      <div className="max-w-[90rem] mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-12">
          <h2 className="text-3xl font-bold tracking-tight text-gray-900 uppercase">Imóveis Disponíveis</h2>
          <p className="mt-4 text-gray-500 max-w-2xl mx-auto">Encontre o imóvel ideal para você, com foco nos melhores locais e condições.</p>
        </div>

        {/* Filters */}
        <div className="max-w-4xl mx-auto mb-10 flex flex-col md:flex-row gap-4 items-center justify-center">
           <div className="relative w-full md:w-96">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input 
                 type="text"
                 placeholder="Buscar por nome ou localização..."
                 value={searchTerm}
                 onChange={(e) => setSearchTerm(e.target.value)}
                 className="w-full pl-10 pr-4 py-3 rounded-full border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-sm"
              />
           </div>
           
           <div className="flex flex-wrap gap-2 justify-center">
             {['Todos', 'Casa', 'Apartamento', 'Terreno', 'Comercial'].map(t => (
                <button
                   key={t}
                   onClick={() => setFilterType(t)}
                   className={`px-4 py-2 rounded-full text-sm font-semibold transition-colors ${filterType === t ? 'bg-blue-600 text-white shadow-md' : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-100'}`}
                >
                   {t}
                </button>
             ))}
           </div>
        </div>

        {/* Carousel */}
        <div className="relative group">
           <button 
             onClick={() => scroll('left')}
             className="absolute left-3 md:-left-6 top-1/2 -translate-y-1/2 z-20 bg-white/90 backdrop-blur-md shadow-[0_4px_20px_rgba(0,0,0,0.15)] border border-gray-200 rounded-full p-3 text-gray-800 hover:text-blue-600 hover:bg-white transition-all hover:scale-110 flex items-center justify-center"
           >
             <ChevronLeft className="w-6 h-6" />
           </button>

           <div 
             ref={scrollRef}
             className="flex overflow-x-auto gap-6 pb-8 snap-x snap-mandatory hide-scrollbars px-2"
             style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
           >
             {filteredProperties.length === 0 ? (
                <div className="w-full text-center py-20 text-gray-500">
                   Nenhum imóvel encontrado com estes filtros.
                </div>
             ) : (
                 filteredProperties.map(prop => {
                  let image = prop.images && prop.images.length > 0 ? getNormalizedImage(prop.images[0]) : '';
                  const type = prop.tipo || 'Lote';
                  const desc = prop.descricao || 'Imóvel sem descrição detalhada';

                  return (
                    <div key={prop.id} className="w-[85vw] sm:w-[300px] aspect-square bg-white rounded-2xl shadow-md border border-gray-100 overflow-hidden snap-center flex-shrink-0 flex flex-col transition-transform hover:-translate-y-1 hover:shadow-xl">
                       <div className="flex-1 min-h-0 bg-slate-100 relative overflow-hidden">
                          {image ? (
                             <img src={image} alt={prop.nome} className="w-full h-full object-cover" onError={(e) => { e.currentTarget.src = "/logo-ss-imoveis.webp"; e.currentTarget.className = "w-full h-full object-contain p-8 opacity-30"; }} />
                          ) : (
                             <img src="/logo-ss-imoveis.webp" alt="Fallback" className="w-full h-full object-contain p-8 opacity-30" />
                          )}
                          <div className="absolute top-3 left-3 bg-blue-600 text-white text-[10px] font-bold px-2 py-1 rounded-md uppercase tracking-wider shadow-sm z-10">
                             {type}
                          </div>
                       </div>
                       <div className="p-4 flex flex-col h-[45%] shrink-0">
                          <h3 className="font-bold text-gray-900 text-base md:text-lg mb-1 line-clamp-1">{prop.nome}</h3>
                          <div className="flex items-center text-gray-500 text-xs mb-2">
                             <MapPin className="w-3.5 h-3.5 mr-1 shrink-0" />
                             <span className="truncate">{prop.localizacao}</span>
                          </div>
                          
                          <p className="text-gray-600 text-xs flex-1 line-clamp-2 mb-3">{desc || 'Imóvel sem descrição detalhada'}</p>
                          
                          <div className="flex items-center justify-between mt-auto">
                             <span className="font-extrabold text-blue-700 text-sm md:text-base">
                                {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(prop.valor)}
                             </span>
                             <button
                               onClick={() => handleInterest(prop.nome)}
                               className="text-xs font-bold bg-blue-50 text-blue-600 border border-blue-200 hover:bg-blue-100 px-3 py-1.5 rounded-md transition-colors shadow-sm"
                             >
                                Interesse
                             </button>
                          </div>
                       </div>
                    </div>
                  );
                })
             )}
           </div>

           <button 
             onClick={() => scroll('right')}
             className="absolute right-3 md:-right-6 top-1/2 -translate-y-1/2 z-20 bg-white/90 backdrop-blur-md shadow-[0_4px_20px_rgba(0,0,0,0.15)] border border-gray-200 rounded-full p-3 text-gray-800 hover:text-blue-600 hover:bg-white transition-all hover:scale-110 flex items-center justify-center"
           >
             <ChevronRight className="w-6 h-6" />
           </button>
        </div>
      </div>
      <style dangerouslySetInnerHTML={{__html: `
        .hide-scrollbars::-webkit-scrollbar {
            display: none;
        }
      `}} />
    </section>
  );
}
