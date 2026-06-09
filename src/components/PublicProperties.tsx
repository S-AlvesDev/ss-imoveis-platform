import React, { useState, useEffect, useRef } from 'react';
import { Search, MapPin, ArrowRight } from 'lucide-react';
import { toast } from 'sonner';

export default function PublicProperties() {
  const [properties, setProperties] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState('Todos');
  
  const [highlightedId, setHighlightedId] = useState<number | null>(() => {
    const params = new URLSearchParams(window.location.search);
    const imovelId = params.get('imovel');
    if (imovelId) {
      const num = Number(imovelId);
      if (!isNaN(num)) return num;
    }
    return null;
  });

  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (highlightedId && properties.length > 0) {
      const targetProp = properties.find(p => p.id === highlightedId);
      if (targetProp) {
        setSearchTerm('');
        setFilterType('Todos');
        setTimeout(() => {
          const element = document.getElementById(`public-property-${highlightedId}`);
          if (element) {
            element.scrollIntoView({ behavior: 'smooth', block: 'center' });
            toast.info(`Visualizando imóvel compartilhado: ${targetProp.nome}`, { duration: 6000 });
          }
        }, 1000);
      }
    }
  }, [highlightedId, properties]);

  useEffect(() => {
    fetch('/api/public-properties')
      .then(res => res.json())
      .then(data => {
        if (data && data.error) {
          toast.error(`Erro do Servidor: ${data.error}`);
          setProperties([]);
        } else {
          setProperties(Array.isArray(data) ? data : []);
        }
        setLoading(false);
      })
      .catch(err => {
        console.error('Erro ao buscar imóveis:', err);
        toast.error('Não foi possível carregar os imóveis no momento.');
        setProperties([]);
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
          <h2 className="text-4xl md:text-5xl font-extrabold tracking-tight text-[#1a2538] mb-4">Encontre o Espaço Que Conta a Sua História</h2>
          <p className="mt-4 text-gray-500 max-w-3xl mx-auto text-base md:text-lg">De lotes bem localizados e casas serenas a apartamentos vibrantes na cidade — oferecemos uma seleção cuidadosamente pensada para o seu estilo de vida.</p>
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
             {['Todos', 'Lote', 'Casa', 'Apartamento', 'Programa Minha Casa Minha Vida (MCMV)'].map(t => (
                <button
                   key={t}
                   onClick={() => setFilterType(t)}
                   className={`px-4 py-2 rounded-full text-sm font-semibold transition-colors ${filterType === t ? 'bg-blue-600 text-white shadow-md' : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-100'}`}
                >
                   {t === 'Programa Minha Casa Minha Vida (MCMV)' ? 'MCMV' : t}
                </button>
             ))}
           </div>
        </div>

        {/* Bento Grid */}
        {filteredProperties.length === 0 ? (
           <div className="w-full text-center py-20 text-gray-500">
              Nenhum imóvel encontrado com estes filtros.
           </div>
        ) : (
           <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 auto-rows-[250px] grid-flow-dense pb-8">
             {filteredProperties.map((prop, idx) => {
               let image = prop.images && prop.images.length > 0 ? getNormalizedImage(prop.images[0]) : '';
               const type = prop.tipo || 'Lote';
               const priceStr = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(prop.valor);
               
               let spanClass = 'col-span-1 row-span-2';
               // Pattern: 2 rows, 2 rows, 1 row, 1 row...
               if (idx % 4 === 2 || idx % 4 === 3) {
                  spanClass = 'col-span-1 row-span-1';
               }

               return (
                 <div 
                   key={prop.id} 
                   id={`public-property-${prop.id}`} 
                   className={`relative rounded-[2rem] overflow-hidden group bg-gray-200 ${spanClass} ${highlightedId === prop.id ? 'ring-4 ring-[#00bc7d] ring-offset-4 animate-[pulse_2.5s_infinite]' : ''}`}
                 >
                    <img 
                       src={image || '/logo-ss-imoveis.webp'} 
                       alt={prop.nome} 
                       onError={(e) => { e.currentTarget.src = "/logo-ss-imoveis.webp"; e.currentTarget.className = "w-full h-full object-contain p-8 opacity-30"; }}
                       className={`w-full h-full object-cover transition-transform duration-700 group-hover:scale-105 ${!image ? 'opacity-30 p-8 object-contain' : ''}`} 
                    />
                    
                    {/* Dark gradient overlay for better text readability */}
                    <div className="absolute inset-0 bg-gradient-to-b from-black/40 via-transparent to-black/40 pointer-events-none transition-opacity duration-300 group-hover:opacity-75"></div>

                    {/* Tags at top */}
                    <div className="absolute top-4 left-4 flex flex-wrap max-w-[calc(100%-2rem)] gap-2">
                        <span className="bg-white/90 backdrop-blur-sm text-gray-800 px-3 py-1 rounded-full text-xs font-semibold shadow-sm">
                            {type}
                        </span>
                        {prop.localizacao && (
                           <span className="bg-white/90 backdrop-blur-sm text-gray-800 px-3 py-1 rounded-full text-xs font-semibold shadow-sm truncate max-w-[150px]">
                              {prop.localizacao.split(',')[0]}
                           </span>
                        )}
                        <span className="bg-white/90 backdrop-blur-sm text-blue-700 px-3 py-1 rounded-full text-xs font-bold shadow-sm">
                            {priceStr}
                        </span>
                    </div>

                    {/* Bottom Bar */}
                    <div className="absolute bottom-4 left-4 right-4 bg-white hover:bg-gray-50 backdrop-blur-md rounded-full p-2 pl-5 flex items-center justify-between shadow-lg transition-colors">
                        <div className="truncate pr-4 flex-1 cursor-pointer" onClick={() => handleInterest(prop.nome)}>
                          <p className="font-bold text-gray-900 text-sm md:text-base truncate">{prop.nome}</p>
                        </div>
                        <button 
                           onClick={() => handleInterest(prop.nome)}
                           className="bg-[#1a2538] hover:bg-black text-white rounded-full p-2 w-10 h-10 flex items-center justify-center transition-colors shrink-0 shadow-md transform hover:scale-105 active:scale-95" 
                           aria-label="Tenho interesse"
                        >
                            <ArrowRight className="w-5 h-5" />
                        </button>
                    </div>
                 </div>
               );
             })}
           </div>
        )}
      </div>
    </section>
  );
}
