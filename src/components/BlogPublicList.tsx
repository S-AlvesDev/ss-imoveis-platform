import React, { useState, useEffect } from 'react';
import { Search, Calendar, User, Eye, ChevronRight, Tag, ChevronLeft, Home, FileText } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

export default function BlogPublicList() {
   const [posts, setPosts] = useState<any[]>([]);
   const [loading, setLoading] = useState(true);

   useEffect(() => {
       fetch('/api/blog/posts/public')
         .then(r => r.json())
         .then(data => {
            setPosts(Array.isArray(data) ? data : []);
            setLoading(false);
         })
         .catch(() => setLoading(false));
   }, []);

   const handleBack = () => {
       if (document.referrer && document.referrer.includes(window.location.host)) {
           window.history.back();
       } else {
           window.location.href = '/';
       }
   };

   if (loading) return <div className="min-h-screen flex items-center justify-center font-sans text-blue-600 font-bold">Carregando blog...</div>;

   return (
      <div className="min-h-screen bg-gray-50 font-sans pb-24">
         {/* Header */}
         <div className="bg-slate-900 pt-24 pb-16 px-6 relative overflow-hidden">
             
             {/* Back Button */}
             <button 
                 onClick={handleBack} 
                 className="absolute top-6 left-6 bg-white/10 backdrop-blur-md text-white hover:bg-white/20 px-4 py-2 rounded-full flex items-center gap-2 text-xs font-black uppercase tracking-widest transition-colors border border-white/20 z-50">
                 <ChevronLeft size={16} /> Voltar
             </button>

             <button 
                 onClick={() => window.location.href = '/'} 
                 className="absolute top-6 right-6 bg-white/10 backdrop-blur-md text-white hover:bg-white/20 p-2 md:px-4 md:py-2 rounded-full flex items-center gap-2 text-xs font-black uppercase tracking-widest transition-colors border border-white/20 z-50">
                 <Home size={16} /> <span className="hidden md:inline">Início</span>
             </button>

             <div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-blue-900/40 via-slate-900 to-slate-900"></div>
             <div className="max-w-7xl mx-auto relative z-10 text-center">
                 <span className="inline-block px-4 py-1.5 rounded-full bg-[#4c79f5] text-white text-[10px] font-black uppercase tracking-widest mb-4">SS Imobiliária</span>
                 <h1 className="text-4xl md:text-6xl font-black text-white tracking-tight mb-6">Blog e Notícias</h1>
                 <p className="text-lg text-slate-300 max-w-2xl mx-auto font-medium">Fique por dentro das novidades do mercado imobiliário, dicas de financiamento e muito mais.</p>
             </div>
         </div>

         {/* Grid */}
         <div className="max-w-7xl mx-auto px-6 -mt-8 relative z-20">
             <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                 {posts.map(p => (
                     <article key={p.id} onClick={()=>window.location.href=`/blog/${p.slug}`} className="bg-white rounded-[2rem] overflow-hidden shadow-xl shadow-gray-200/50 hover:shadow-2xl hover:shadow-blue-900/10 transition-all duration-300 cursor-pointer group flex flex-col h-full border border-gray-100/50">
                         {/* Big Cover Image - Instagram Style */}
                         <div className="w-full aspect-[4/3] sm:aspect-square md:aspect-[4/3] bg-gray-100 relative overflow-hidden shrink-0">
                             <img src={p.imagem_capa || 'https://i.imgur.com/8Q5gQhx.jpeg'} alt={p.titulo} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700 ease-in-out" loading="lazy" />
                             {p.categoria?.nome && (
                                 <div className="absolute top-4 left-4">
                                     <span className="bg-white/90 backdrop-blur-md text-slate-900 text-[10px] font-black uppercase tracking-widest px-4 py-2 rounded-full shadow-lg">
                                         {p.categoria.nome}
                                     </span>
                                 </div>
                             )}
                         </div>
                         
                         {/* Content */}
                         <div className="p-6 md:p-8 flex flex-col flex-1">
                             <div className="flex items-center gap-4 text-[10px] sm:text-xs font-bold text-gray-400 uppercase tracking-widest mb-4">
                                 <span className="flex items-center gap-1.5"><Calendar size={14} className="text-blue-500" /> {format(new Date(p.criado_em), "dd 'de' MMM, yyyy", {locale: ptBR})}</span>
                                 <span className="flex items-center gap-1.5"><Eye size={14} className="text-emerald-500" /> {p.visualizacoes||0}</span>
                             </div>

                             <h2 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight leading-tight mb-3 group-hover:text-blue-600 transition-colors">
                                 {p.titulo}
                             </h2>
                             
                             <p className="text-sm text-gray-500 font-medium line-clamp-2 md:line-clamp-3 mb-6">
                                 {p.subtitulo}
                             </p>

                             <div className="mt-auto flex items-center justify-between pt-6 border-t border-gray-100">
                                 <div className="flex items-center gap-3">
                                     <div className="w-8 h-8 rounded-full bg-blue-50 flex items-center justify-center text-blue-600 text-xs font-black">
                                         {p.autor?.[0] || 'S'}
                                     </div>
                                     <span className="text-[10px] font-black uppercase tracking-widest text-slate-700">{p.autor || 'SS Imobiliária'}</span>
                                 </div>
                                 <span className="w-10 h-10 rounded-full bg-gray-50 flex items-center justify-center group-hover:bg-blue-600 group-hover:text-white transition-colors text-slate-400">
                                     <ChevronRight size={18} />
                                 </span>
                             </div>
                         </div>
                     </article>
                 ))}
             </div>
             
             {posts.length === 0 && (
                 <div className="text-center py-24 bg-white rounded-3xl shadow-sm border border-gray-100">
                     <FileText size={48} className="mx-auto text-gray-300 mb-4" />
                     <h3 className="text-xl font-black text-slate-800">Nenhum artigo publicado</h3>
                     <p className="text-gray-500 mt-2">Volte em breve para novidades!</p>
                 </div>
             )}
         </div>
      </div>
   );
}
