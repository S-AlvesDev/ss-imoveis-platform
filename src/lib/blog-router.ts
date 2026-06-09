import express from 'express';
import { supabaseServer } from './supabaseServer.js';
import multer from 'multer';
import fs from 'fs';
import path from 'path';

export const blogRouter = express.Router();

const storage = multer.memoryStorage();
const upload = multer({ storage: storage });

function generateSlug(title: string) {
  return title.toString().toLowerCase()
    .replace(/[àáâãäå]/g,"a")
    .replace(/æ/g,"ae")
    .replace(/ç/g,"c")
    .replace(/[èéêë]/g,"e")
    .replace(/[ìíîï]/g,"i")
    .replace(/ñ/g,"n")
    .replace(/[òóôõö]/g,"o")
    .replace(/œ/g,"oe")
    .replace(/[ùúûü]/g,"u")
    .replace(/[ýÿ]/g,"y")
    .replace(/\s+/g, '-')
    .replace(/[^\w\-]+/g, '')
    .replace(/\-\-+/g, '-')
    .replace(/^-+/, '')
    .replace(/-+$/, '');
}

// Ensure blog uploads directory exists
const uploadDir = path.join(process.cwd(), 'public', 'assets', 'blog');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

blogRouter.post('/upload', upload.single('file'), (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ error: 'Nenhum arquivo enviado.' });
        }
        const ext = path.extname(req.file.originalname) || '.jpg';
        const filename = `${Date.now()}-${Math.round(Math.random() * 1e9)}${ext}`;
        const filePath = path.join(uploadDir, filename);
        
        fs.writeFileSync(filePath, req.file.buffer);
        
        // Return public URL path
        res.json({ url: `/assets/blog/${filename}` });
    } catch (e: any) {
        console.error('[Blog Upload Error]', e);
        res.status(500).json({ error: e.message });
    }
});

// Categories
blogRouter.get('/categories', async (req, res) => {
    const { data, error } = await supabaseServer.from('blog_categories').select('*').order('nome');
    if (error) return res.status(500).json({ error: error.message });
    res.json(data);
});

blogRouter.post('/categories', async (req, res) => {
    const { nome } = req.body;
    let slug = generateSlug(nome);
    const { data, error } = await supabaseServer.from('blog_categories').insert({ nome, slug }).select().maybeSingle();
    if (error) return res.status(500).json({ error: error.message });
    res.json(data);
});

blogRouter.delete('/categories/:id', async (req, res) => {
    const { id } = req.params;
    const { error } = await supabaseServer.from('blog_categories').delete().eq('id', Number(id));
    if (error) return res.status(500).json({ error: error.message });
    res.json({ success: true });
});

// Posts
blogRouter.get('/posts', async (req, res) => {
    // For admin, we show all. So we pass an ?admin=true or something, but let's just return all and let frontend filter for public if it wants, OR we use another public endpoint.
    const { data, error } = await supabaseServer.from('blog_posts')
        .select(`
            *,
            categoria:blog_categories(id, nome, slug)
        `)
        .order('criado_em', { ascending: false });
    if (error) return res.status(500).json({ error: error.message });
    res.json(data);
});

blogRouter.get('/posts/public', async (req, res) => {
    const { data, error } = await supabaseServer.from('blog_posts')
        .select(`
            *,
            categoria:blog_categories(id, nome, slug)
        `)
        .eq('status', 'Publicado')
        .order('criado_em', { ascending: false });
    if (error) return res.status(500).json({ error: error.message });
    res.json(data);
});

blogRouter.get('/posts/:slug', async (req, res) => {
    const { slug } = req.params;
    const { data, error } = await supabaseServer.from('blog_posts')
        .select(`
            *,
            categoria:blog_categories(id, nome, slug)
        `)
        .eq('slug', slug)
        .maybeSingle();
    
    if (error) return res.status(500).json({ error: error.message });
    if (!data) return res.status(404).json({ error: 'Post não encontrado.' });
    
    // Increment view count directly here
    const { error: rpcError } = await supabaseServer.rpc('increment_view_count', { post_id: data.id });
    if (rpcError) {
       // fallback for no rpc
       await supabaseServer.from('blog_posts').update({ visualizacoes: (data.visualizacoes || 0) + 1 }).eq('id', data.id);
    }
    
    data.visualizacoes = (data.visualizacoes || 0) + 1;
    res.json(data);
});

blogRouter.post('/posts', async (req, res) => {
    const { titulo, subtitulo, conteudo, imagem_capa, imagens_galeria, autor, categoria_id, tags, status } = req.body;
    let baseSlug = generateSlug(titulo);
    let slug = baseSlug;
    
    // Attempt insert, on error if UNIQUE constraint, change slug (simplified)
    const payload = {
        titulo, slug, subtitulo, conteudo, imagem_capa, imagens_galeria, autor, categoria_id: categoria_id || null, tags, status,
        criado_em: new Date().toISOString(),
        atualizado_em: new Date().toISOString()
    };
    
    const { data, error } = await supabaseServer.from('blog_posts').insert(payload).select().maybeSingle();
    if (error) {
        if (error.code === '23505') { // Unique violation
            payload.slug = `${baseSlug}-${Date.now()}`;
            const retry = await supabaseServer.from('blog_posts').insert(payload).select().maybeSingle();
            if (retry.error) return res.status(500).json({ error: retry.error.message });
            return res.json(retry.data);
        }
        return res.status(500).json({ error: error.message });
    }
    res.json(data);
});

blogRouter.put('/posts/:id', async (req, res) => {
    const { id } = req.params;
    const { titulo, subtitulo, conteudo, imagem_capa, imagens_galeria, autor, categoria_id, tags, status } = req.body;
    
    const payload: any = {
        titulo, subtitulo, conteudo, imagem_capa, imagens_galeria, autor, categoria_id: categoria_id || null, tags, status,
        atualizado_em: new Date().toISOString()
    };
    
    if (titulo) {
       payload.slug = generateSlug(titulo); // Note: might conflict if changing title to existing.
    }
    
    const { data, error } = await supabaseServer.from('blog_posts').update(payload).eq('id', Number(id)).select().maybeSingle();
    if (error) return res.status(500).json({ error: error.message });
    res.json(data);
});

blogRouter.delete('/posts/:id', async (req, res) => {
    const { id } = req.params;
    const { error } = await supabaseServer.from('blog_posts').delete().eq('id', Number(id));
    if (error) return res.status(500).json({ error: error.message });
    res.json({ success: true });
});

export default blogRouter;
