import React, { useState, useEffect } from 'react';
import { Calendar, User, Eye, Share2, Tag, ChevronLeft, Facebook, Twitter, Linkedin, MessageCircle } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

export default function BlogPublicPost({ slug }: { slug: string }) {
   const [post, setPost] = useState<any>(null);
   const [related, setRelated] = useState<any[]>([]);
   const [loading, setLoading] = useState(true);

   useEffect(() => {
       fetch(`/api/blog/posts/${slug}`)
         .then(r => r.json())
         .then(data => {
            if(data.error) throw new Error(data.error);
            setPost(data);
            
            // fetch related (just latest 3 for now)
            fetch('/api/blog/posts/public')
              .then(r=>r.json())
              .then(all => {
                  setRelated(Array.isArray(all) ? all.filter((p:any)=>p.id !== data.id).slice(0,3) : []);
                  setLoading(false);
              }).catch(()=>setLoading(false));
         })
         .catch(() => setLoading(false));
   }, [slug]);

   if (loading) return <div className="min-h-screen flex items-center justify-center font-sans text-blue-600 font-bold">Carregando postagem...</div>;
   if (!post) return <div className="min-h-screen flex flex-col items-center justify-center font-sans"><h1 className="text-4xl font-black text-slate-800 mb-4">404</h1><p className="text-gray-500">Postagem não encontrada.</p><button onClick={()=>window.location.href='/blog'} className="mt-8 px-6 py-3 bg-blue-600 text-white rounded-xl font-bold">Voltar ao Blog</button></div>;

   const shareUrl = window.location.href;
   const encodedTitle = encodeURIComponent(post.titulo);
   
   return (
      <div className="min-h-screen bg-white font-sans pb-24">
         {/* Cover Image - Immersive */}
         <div className="w-full h-[50vh] md:h-[70vh] relative">
             <img src={post.imagem_capa || 'https://i.imgur.com/8Q5gQhx.jpeg'} alt={post.titulo} className="w-full h-full object-cover" />
             <div className="absolute inset-0 bg-gradient-to-t from-slate-900 via-slate-900/40 to-transparent"></div>
             
             {/* Back Button */}
             <button onClick={()=>window.location.href='/blog'} className="absolute top-6 left-6 md:top-12 md:left-12 bg-white/10 backdrop-blur-md text-white hover:bg-white/20 px-4 py-2 rounded-full flex items-center gap-2 text-xs font-black uppercase tracking-widest transition-colors border border-white/20 z-50">
                 <ChevronLeft size={16} /> Ver todos
             </button>

             <button onClick={()=>window.location.href='/'} className="absolute top-6 right-6 md:top-12 md:right-12 bg-white/10 backdrop-blur-md text-white hover:bg-white/20 p-2 md:px-4 md:py-2 rounded-full flex items-center gap-2 text-xs font-black uppercase tracking-widest transition-colors border border-white/20 z-50">
                 <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg> <span className="hidden md:inline">Início</span>
             </button>

             {/* Header Content */}
             <div className="absolute bottom-0 left-0 w-full p-6 md:p-12 lg:p-24">
                 <div className="max-w-4xl mx-auto">
                     {post.categoria?.nome && (
                         <span className="inline-block px-4 py-1.5 bg-[#FFD100]/90 backdrop-blur-md text-slate-900 text-[10px] font-black uppercase tracking-widest rounded-full mb-6 shadow-xl shadow-black/20">
                             {post.categoria.nome}
                         </span>
                     )}
                     <h1 className="text-3xl md:text-5xl lg:text-6xl font-black text-white tracking-tight leading-tight mb-6 text-balance shadow-black/50 drop-shadow-xl">
                         {post.titulo}
                     </h1>
                     <p className="text-lg md:text-xl text-slate-200 font-medium max-w-3xl mb-8 leading-relaxed text-balance drop-shadow-md">
                         {post.subtitulo}
                     </p>
                     
                     <div className="flex flex-wrap items-center gap-6 text-[10px] sm:text-xs font-bold text-white/80 uppercase tracking-widest">
                         <span className="flex items-center gap-2"><User size={16} className="text-blue-400" /> {post.autor || 'Equipe SS'}</span>
                         <span className="flex items-center gap-2"><Calendar size={16} className="text-blue-400" /> {format(new Date(post.criado_em), "dd 'de' MMMM 'de' yyyy", {locale: ptBR})}</span>
                         <span className="flex items-center gap-2"><Eye size={16} className="text-emerald-400" /> {post.visualizacoes||0} acessos</span>
                     </div>
                 </div>
             </div>
         </div>

         <div className="max-w-4xl mx-auto px-6 py-16">
             {/* Rich Content Render */}
             <div className="prose prose-lg md:prose-xl w-full max-w-none prose-headings:font-black prose-headings:tracking-tight prose-a:text-blue-600 prose-img:rounded-3xl prose-img:shadow-xl break-words [&_img]:max-w-full [&_img]:h-auto [&_iframe]:max-w-full [&_table]:block [&_table]:overflow-x-auto">
                 <div className="w-full overflow-hidden break-words" dangerouslySetInnerHTML={{ __html: post.conteudo }} />
             </div>

             {/* Tags & Share */}
             <div className="mt-16 pt-8 border-t border-gray-100 flex flex-col md:flex-row justify-between items-start md:items-center gap-8">
                 <div className="flex flex-wrap items-center gap-2">
                     <Tag size={16} className="text-gray-400 mr-2" />
                     {post.tags?.map((tag:string, i:number) => (
                         <span key={i} className="px-3 py-1 bg-gray-100 text-gray-600 text-[10px] font-black uppercase tracking-widest rounded-md">
                             {tag}
                         </span>
                     ))}
                 </div>
                 
                 <div className="flex items-center gap-4">
                     <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Compartilhar:</span>
                     <div className="flex items-center gap-2">
                         <a href={`https://api.whatsapp.com/send?text=${encodedTitle} - ${shareUrl}`} target="_blank" rel="noreferrer" className="w-10 h-10 rounded-full bg-green-50 text-green-600 flex items-center justify-center hover:bg-green-600 hover:text-white transition-colors"><MessageCircle size={18}/></a>
                         <a href={`https://www.facebook.com/sharer/sharer.php?u=${shareUrl}`} target="_blank" rel="noreferrer" className="w-10 h-10 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center hover:bg-blue-600 hover:text-white transition-colors"><Facebook size={18}/></a>
                         <a href={`https://twitter.com/intent/tweet?url=${shareUrl}&text=${encodedTitle}`} target="_blank" rel="noreferrer" className="w-10 h-10 rounded-full bg-sky-50 text-sky-600 flex items-center justify-center hover:bg-sky-600 hover:text-white transition-colors"><Twitter size={18}/></a>
                     </div>
                 </div>
             </div>
         </div>

         {/* Related Articles */}
         {related.length > 0 && (
             <div className="bg-gray-50 py-24 mt-12 border-t border-gray-100">
                 <div className="max-w-7xl mx-auto px-6">
                     <h3 className="text-2xl font-black text-slate-800 tracking-tight mb-8 text-center md:text-left">Leia Também</h3>
                     <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-8">
                         {related.map(p => (
                             <article key={p.id} onClick={()=>window.location.href=`/blog/${p.slug}`} className="bg-white rounded-3xl overflow-hidden shadow-lg shadow-gray-200/50 hover:shadow-xl transition-all duration-300 cursor-pointer group flex flex-col h-full border border-gray-50">
                                 <div className="w-full aspect-[4/3] relative overflow-hidden bg-gray-100">
                                     <img src={p.imagem_capa || 'https://i.imgur.com/8Q5gQhx.jpeg'} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700" />
                                 </div>
                                 <div className="p-6">
                                     <div className="text-[9px] font-bold text-blue-600 uppercase tracking-widest mb-3">
                                         {format(new Date(p.criado_em), "dd MMM, yyyy", {locale: ptBR})}
                                     </div>
                                     <h4 className="text-lg font-black text-slate-900 tracking-tight leading-snug group-hover:text-blue-600 transition-colors line-clamp-2">
                                         {p.titulo}
                                     </h4>
                                 </div>
                             </article>
                         ))}
                     </div>
                 </div>
             </div>
         )}
      </div>
   );
}
