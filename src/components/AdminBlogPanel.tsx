import React, { useState, useEffect } from 'react';
import { Plus, Edit2, Trash2, Eye, EyeOff, Save, Copy, FileText, Image as ImageIcon, Tags, Search, CheckCircle, BarChart3, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';
import ReactQuill from 'react-quill-new';
import 'react-quill-new/dist/quill.snow.css';

export default function AdminBlogPanel() {
  const [tab, setTab] = useState<'posts'|'categories'|'stats'>('posts');
  
  // Data
  const [posts, setPosts] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  
  // States
  const [isEditing, setIsEditing] = useState(false);
  const [search, setSearch] = useState('');
  
  // Form Post
  const [formConfig, setFormConfig] = useState<any>({
     id: null,
     titulo: '',
     subtitulo: '',
     conteudo: '',
     imagem_capa: '',
     imagens_galeria: [],
     autor: 'Admin',
     categoria_id: '',
     tags: [],
     status: 'Rascunho'
  });
  
  // Category Form
  const [catForm, setCatForm] = useState({ nome: '' });

  useEffect(() => {
     loadData();
  }, []);

  const loadData = async () => {
      try {
          const resC = await fetch('/api/blog/categories');
          const dataC = await resC.json();
          setCategories(Array.isArray(dataC) ? dataC : []);
          
          const resP = await fetch('/api/blog/posts');
          const dataP = await resP.json();
          setPosts(Array.isArray(dataP) ? dataP : []);
      } catch (e) {
          toast.error('Erro ao carregar blog.');
      }
  };

  const uploadImage = async (file: File) => {
      const formData = new FormData();
      formData.append('file', file);
      const res = await fetch('/api/blog/upload', {
          method: 'POST',
          body: formData
      });
      if (!res.ok) throw new Error('Erro no upload');
      const data = await res.json();
      return data.url;
  };

  const handleCapaUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
      if (e.target.files && e.target.files[0]) {
          const loading = toast.loading('Enviando imagem...');
          try {
             const url = await uploadImage(e.target.files[0]);
             setFormConfig({ ...formConfig, imagem_capa: url });
             toast.dismiss(loading);
             toast.success('Imagem enviada.');
          } catch(err) {
             toast.dismiss(loading);
             toast.error('Geração falhou');
          }
      }
  };

  const savePost = async () => {
      const payload = { ...formConfig, tags: formConfig.tags };
      const method = formConfig.id ? 'PUT' : 'POST';
      const url = formConfig.id ? `/api/blog/posts/${formConfig.id}` : '/api/blog/posts';
      
      const res = await fetch(url, {
          method,
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
      });
      if (res.ok) {
          toast.success('Postagem salva!');
          setIsEditing(false);
          loadData();
      } else {
          toast.error('Erro ao salvar postagem');
      }
  };

  const saveCategory = async () => {
      if (!catForm.nome) return;
      const res = await fetch('/api/blog/categories', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(catForm)
      });
      if (res.ok) {
          toast.success('Categoria criada!');
          setCatForm({ nome: '' });
          loadData();
      }
  };

  const deleteCategory = async (id: number) => {
      if(window.confirm('Excluir categoria? Modificará posts vinculados.')) {
         await fetch(`/api/blog/categories/${id}`, { method: 'DELETE' });
         loadData();
      }
  };
  
  const deletePost = async (id: number) => {
      if(window.confirm('Excluir essa postagem?')) {
         await fetch(`/api/blog/posts/${id}`, { method: 'DELETE' });
         loadData();
      }
  };

  const duplicatePost = async (p: any) => {
      const payload = { ...p, id: undefined, titulo: p.titulo + ' (Cópia)', slug: undefined, status: 'Rascunho' };
      const res = await fetch('/api/blog/posts', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
      });
      if (res.ok) {
          toast.success('Postagem duplicada!');
          loadData();
      }
  };

  const filteredPosts = posts.filter(p => p.titulo.toLowerCase().includes(search.toLowerCase()));

  // Stats
  const totalViews = posts.reduce((acc, p) => acc + (p.visualizacoes || 0), 0);

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-8 animate-fade-in font-sans">
       <div className="flex flex-col md:flex-row justify-between items-start md:items-center bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
           <div>
               <h1 className="text-3xl font-black text-slate-800 tracking-tight flex items-center gap-3">
                   <FileText className="text-blue-600" size={32} />
                   Blog Manager
               </h1>
               <p className="text-sm font-bold text-gray-500 uppercase tracking-widest mt-1">Gerencie artigos, categorias e SEO</p>
           </div>
           
           {!isEditing && (
           <div className="flex items-center space-x-2 mt-4 md:mt-0 p-1 bg-gray-100 rounded-xl">
               <button onClick={()=>setTab('posts')} className={`px-6 py-2 rounded-lg text-xs font-bold uppercase tracking-widest transition-all ${tab==='posts'?'bg-white shadow-sm text-blue-600':'text-gray-500 hover:text-gray-700'}`}>Posts</button>
               <button onClick={()=>setTab('categories')} className={`px-6 py-2 rounded-lg text-xs font-bold uppercase tracking-widest transition-all ${tab==='categories'?'bg-white shadow-sm text-blue-600':'text-gray-500 hover:text-gray-700'}`}>Categorias</button>
               <button onClick={()=>setTab('stats')} className={`px-6 py-2 rounded-lg text-xs font-bold uppercase tracking-widest transition-all ${tab==='stats'?'bg-white shadow-sm text-blue-600':'text-gray-500 hover:text-gray-700'}`}>Estatísticas</button>
           </div>
           )}
       </div>

       {isEditing ? (
          <div className="bg-white p-6 rounded-3xl shadow-xl border border-gray-100 space-y-6">
              <div className="flex justify-between items-center border-b pb-4">
                 <h2 className="text-xl font-bold text-slate-800">{formConfig.id ? 'Editar Postagem' : 'Nova Postagem'}</h2>
                 <button onClick={()=>setIsEditing(false)} className="px-4 py-2 border rounded-lg hover:bg-gray-50 text-xs font-bold uppercase tracking-widest text-gray-600 transition-colors">Voltar</button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                 <div className="md:col-span-2 space-y-4">
                    <div>
                        <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1 pointer-events-none">Título da Postagem</label>
                        <input className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-lg font-bold text-slate-800 outline-none focus:ring-2 focus:ring-blue-500 transition-all" value={formConfig.titulo} onChange={e=>setFormConfig({...formConfig,titulo:e.target.value})} placeholder="Ex: Melhores dicas para..." />
                    </div>
                    <div>
                        <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1 pointer-events-none">Subtítulo (Resumo)</label>
                        <textarea className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm font-semibold text-slate-700 outline-none focus:ring-2 focus:ring-blue-500 transition-all" rows={2} value={formConfig.subtitulo} onChange={e=>setFormConfig({...formConfig,subtitulo:e.target.value})} placeholder="Breve resumo..." />
                    </div>
                    <div className="h-96 pb-12 mb-8">
                        <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1 pointer-events-none">Conteúdo Completo (Rico)</label>
                        <ReactQuill theme="snow" value={formConfig.conteudo} onChange={(content)=>setFormConfig({...formConfig, conteudo: content})} className="h-full bg-white rounded-xl" placeholder="Comece a escrever a postagem..." />
                    </div>
                 </div>

                 <div className="space-y-4 pt-1">
                    <div className="bg-gray-50 p-4 rounded-xl border border-gray-200">
                        <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2 pointer-events-none">Configurações</label>
                        
                        <div className="space-y-3">
                            <div>
                               <label className="text-xs font-bold text-gray-600">Status</label>
                               <select className="w-full mt-1 p-2 border rounded-lg font-semibold text-sm outline-none" value={formConfig.status} onChange={e=>setFormConfig({...formConfig,status:e.target.value})}>
                                  <option value="Rascunho">Rascunho</option>
                                  <option value="Publicado">Publicado</option>
                                  <option value="Oculto">Oculto</option>
                               </select>
                            </div>
                            <div>
                               <label className="text-xs font-bold text-gray-600">Categoria</label>
                               <select className="w-full mt-1 p-2 border rounded-lg font-semibold text-sm outline-none" value={formConfig.categoria_id || ''} onChange={e=>setFormConfig({...formConfig,categoria_id:e.target.value})}>
                                  <option value="">Sem Categoria</option>
                                  {categories.map(c => <option key={c.id} value={c.id}>{c.nome}</option>)}
                               </select>
                            </div>
                            <div>
                               <label className="text-xs font-bold text-gray-600">Autor</label>
                               <input className="w-full mt-1 p-2 border rounded-lg font-semibold text-sm outline-none" value={formConfig.autor} onChange={e=>setFormConfig({...formConfig,autor:e.target.value})} />
                            </div>
                            <div>
                               <label className="text-xs font-bold text-gray-600">Tags (Separadas por vírgula)</label>
                               <input className="w-full mt-1 p-2 border rounded-lg font-semibold text-sm outline-none" value={formConfig.tags?.join(', ')} onChange={e=>setFormConfig({...formConfig,tags:e.target.value.split(',').map(x=>x.trim()).filter(Boolean)})} placeholder="Ex: Dicas, Investimento" />
                            </div>
                        </div>
                    </div>

                    <div className="bg-gray-50 p-4 rounded-xl border border-gray-200">
                        <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2 pointer-events-none">Imagem de Capa</label>
                        {formConfig.imagem_capa ? (
                             <div className="relative rounded-lg overflow-hidden h-32 border border-gray-200">
                                 <img src={formConfig.imagem_capa} className="w-full h-full object-cover" />
                                 <button onClick={()=>setFormConfig({...formConfig, imagem_capa: ''})} className="absolute top-2 right-2 bg-red-500 text-white p-1 rounded-full"><Trash2 size={14}/></button>
                             </div>
                        ) : (
                            <label className="cursor-pointer flex flex-col items-center justify-center border-2 border-dashed border-gray-300 rounded-lg h-32 hover:bg-gray-100 transition-colors">
                                <ImageIcon size={24} className="text-gray-400 mb-2" />
                                <span className="text-xs font-bold text-gray-500">Enviar Imagem</span>
                                <input type="file" className="hidden" accept="image/*" onChange={handleCapaUpload} />
                            </label>
                        )}
                    </div>
                 </div>
              </div>

              <div className="flex justify-end pt-4 border-t mt-8">
                  <button onClick={savePost} className="px-8 py-3 bg-blue-600 text-white rounded-xl text-sm font-black uppercase tracking-widest hover:bg-blue-700 transition-all shadow-md shadow-blue-200 flex items-center gap-2">
                     <Save size={18} /> {formConfig.id ? 'Salvar Alterações' : 'Publicar Postagem'}
                  </button>
              </div>
          </div>
       ) : tab === 'posts' ? (
          <div className="space-y-6">
             <div className="flex justify-between items-center">
                <div className="relative w-72">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                    <input className="w-full pl-10 pr-4 py-3 bg-white border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 font-semibold text-sm shadow-sm" placeholder="Pesquisar artigos..." value={search} onChange={e=>setSearch(e.target.value)} />
                </div>
                <button onClick={()=>{
                    setFormConfig({ id: null, titulo: '', subtitulo: '', conteudo: '', imagem_capa: '', imagens_galeria: [], autor: 'Admin', categoria_id: '', tags: [], status: 'Rascunho' });
                    setIsEditing(true);
                }} className="px-6 py-3 bg-slate-900 text-[#FFD100] rounded-xl text-xs font-black uppercase tracking-widest hover:bg-slate-800 transition-all shadow-xl flex items-center gap-2">
                    <Plus size={16} /> Nova Postagem
                </button>
             </div>

             <div className="bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden">
                <table className="w-full text-left font-sans">
                   <thead className="bg-gray-50 border-b border-gray-100">
                      <tr>
                         <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-gray-500">Título</th>
                         <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-gray-500">Categoria</th>
                         <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-gray-500">Status</th>
                         <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-gray-500">Views</th>
                         <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-gray-500 text-right">Ações</th>
                      </tr>
                   </thead>
                   <tbody className="divide-y divide-gray-100">
                      {filteredPosts.map(p => (
                         <tr key={p.id} className="hover:bg-blue-50/50 transition-colors group">
                             <td className="px-6 py-4">
                                <div className="flex items-center gap-4">
                                   <div className="w-12 h-12 rounded-lg bg-gray-200 overflow-hidden shrink-0 border border-gray-100">
                                      {p.imagem_capa ? <img src={p.imagem_capa} className="w-full h-full object-cover" /> : <ImageIcon className="w-full h-full p-3 text-gray-400" />}
                                   </div>
                                   <div>
                                       <h3 className="font-bold text-sm text-slate-800 line-clamp-1">{p.titulo}</h3>
                                       <p className="text-[10px] uppercase font-bold tracking-widest text-gray-400 mt-1">{format(new Date(p.criado_em), 'dd/MM/yyyy')}</p>
                                   </div>
                                </div>
                             </td>
                             <td className="px-6 py-4">
                                <span className="text-xs font-bold text-gray-600 bg-gray-100 px-3 py-1 rounded-full">{p.categoria?.nome || 'Geral'}</span>
                             </td>
                             <td className="px-6 py-4">
                                <span className={`text-[10px] font-black uppercase tracking-widest px-3 py-1 rounded-full ${p.status==='Publicado'?'bg-emerald-100 text-emerald-700':p.status==='Oculto'?'bg-rose-100 text-rose-700':'bg-amber-100 text-amber-700'}`}>
                                   {p.status}
                                </span>
                             </td>
                             <td className="px-6 py-4 text-sm font-bold text-gray-600">
                                {p.visualizacoes || 0}
                             </td>
                             <td className="px-6 py-4 text-right space-x-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                <button onClick={()=>window.open(`/blog/${p.slug}`,'_blank')} className="p-2 text-gray-400 hover:text-blue-600 transition-colors" title="Ver"><Eye size={16}/></button>
                                <button onClick={()=>duplicatePost(p)} className="p-2 text-gray-400 hover:text-blue-600 transition-colors" title="Duplicar"><Copy size={16}/></button>
                                <button onClick={()=>{ setFormConfig(p); setIsEditing(true); }} className="p-2 text-gray-400 hover:text-green-600 transition-colors" title="Editar"><Edit2 size={16}/></button>
                                <button onClick={()=>deletePost(p.id)} className="p-2 text-gray-400 hover:text-red-600 transition-colors" title="Excluir"><Trash2 size={16}/></button>
                             </td>
                         </tr>
                      ))}
                      {filteredPosts.length === 0 && (
                          <tr><td colSpan={5} className="p-8 text-center text-sm font-bold text-gray-400 uppercase tracking-widest">Nenhum post encontrado.</td></tr>
                      )}
                   </tbody>
                </table>
             </div>
          </div>
       ) : tab === 'categories' ? (
           <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="bg-white p-6 rounded-3xl shadow-xl border border-gray-100">
                  <h3 className="text-lg font-black text-slate-800 mb-4">Nova Categoria</h3>
                  <div className="space-y-4">
                      <input className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl outline-none font-semibold text-sm" value={catForm.nome} onChange={e=>setCatForm({nome:e.target.value})} placeholder="Nome da Categoria" />
                      <button onClick={saveCategory} className="w-full py-3 bg-blue-600 text-white rounded-xl text-xs font-black uppercase tracking-widest hover:bg-blue-700 transition-all flex justify-center items-center gap-2">
                         <Plus size={16} /> Adicionar
                      </button>
                  </div>
              </div>
              <div className="bg-white p-6 rounded-3xl shadow-xl border border-gray-100 md:col-span-2">
                  <h3 className="text-lg font-black text-slate-800 mb-4">Categorias Cadastradas</h3>
                  <div className="divide-y divide-gray-100">
                       {categories.map(c => (
                           <div key={c.id} className="py-3 flex justify-between items-center group">
                               <div className="flex items-center gap-3">
                                   <div className="w-8 h-8 rounded-full bg-blue-50 flex items-center justify-center text-blue-600"><Tags size={14}/></div>
                                   <div>
                                      <p className="font-bold text-sm text-slate-800">{c.nome}</p>
                                      <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400">/{c.slug}</p>
                                   </div>
                               </div>
                               <button onClick={()=>deleteCategory(c.id)} className="p-2 text-rose-500 opacity-0 group-hover:opacity-100 transition-opacity bg-rose-50 rounded-lg hover:bg-rose-100"><Trash2 size={16}/></button>
                           </div>
                       ))}
                  </div>
              </div>
           </div>
       ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
             <div className="bg-white p-6 rounded-3xl shadow-xl border border-gray-100 flex items-center gap-4">
                 <div className="w-16 h-16 rounded-2xl bg-blue-50 flex items-center justify-center text-blue-600">
                    <FileText size={24} />
                 </div>
                 <div>
                    <h4 className="text-[10px] font-black uppercase tracking-widest text-gray-400">Total de Posts</h4>
                    <span className="text-3xl font-black text-slate-800">{posts.length}</span>
                 </div>
             </div>
             <div className="bg-white p-6 rounded-3xl shadow-xl border border-gray-100 flex items-center gap-4">
                 <div className="w-16 h-16 rounded-2xl bg-emerald-50 flex items-center justify-center text-emerald-600">
                    <Eye size={24} />
                 </div>
                 <div>
                    <h4 className="text-[10px] font-black uppercase tracking-widest text-gray-400">Visualizações</h4>
                    <span className="text-3xl font-black text-slate-800">{totalViews}</span>
                 </div>
             </div>
             <div className="bg-white p-6 rounded-3xl shadow-xl border border-gray-100 flex items-center gap-4">
                 <div className="w-16 h-16 rounded-2xl bg-[#FFD100]/20 flex items-center justify-center text-amber-600">
                    <CheckCircle size={24} />
                 </div>
                 <div>
                    <h4 className="text-[10px] font-black uppercase tracking-widest text-gray-400">Publicados</h4>
                    <span className="text-3xl font-black text-slate-800">{posts.filter(p=>p.status==='Publicado').length}</span>
                 </div>
             </div>
             <div className="md:col-span-3 bg-white p-6 rounded-3xl shadow-xl border border-gray-100 mt-4">
                 <h3 className="text-lg font-black text-slate-800 mb-6">Top 5 Mais Lidos</h3>
                 <div className="divide-y divide-gray-100">
                     {posts.sort((a,b)=>(b.visualizacoes||0)-(a.visualizacoes||0)).slice(0,5).map((p,i) => (
                         <div key={p.id} className="py-4 flex items-center justify-between">
                             <div className="flex items-center gap-4">
                                <div className="text-2xl font-black text-gray-200">#{i+1}</div>
                                <div>
                                    <p className="font-bold text-sm text-slate-800">{p.titulo}</p>
                                    <p className="text-[10px] uppercase font-bold tracking-widest text-blue-600">{p.visualizacoes||0} visualizações</p>
                                </div>
                             </div>
                             <button onClick={()=>window.open(`/blog/${p.slug}`,'_blank')} className="px-4 py-2 bg-gray-50 rounded-lg text-[10px] font-black uppercase tracking-widest hover:bg-gray-100 text-gray-600 transition-colors">Visualizar</button>
                         </div>
                     ))}
                 </div>
             </div>
          </div>
       )}
    </div>
  );
}
