-- Criação da tabela de categorias do blog
CREATE TABLE IF NOT EXISTS public.blog_categories (
    id SERIAL PRIMARY KEY,
    nome VARCHAR(100) NOT NULL,
    slug VARCHAR(100) NOT NULL UNIQUE
);

-- Criação da tabela de postagens do blog
CREATE TABLE IF NOT EXISTS public.blog_posts (
    id SERIAL PRIMARY KEY,
    titulo VARCHAR(255) NOT NULL,
    slug VARCHAR(255) NOT NULL UNIQUE,
    subtitulo VARCHAR(255),
    conteudo TEXT,
    imagem_capa VARCHAR(255),
    imagens_galeria JSONB DEFAULT '[]',
    autor VARCHAR(100),
    categoria_id INT REFERENCES public.blog_categories(id) ON DELETE SET NULL,
    tags JSONB DEFAULT '[]',
    status VARCHAR(20) DEFAULT 'Rascunho', -- Publicado, Oculto, Rascunho
    visualizacoes INT DEFAULT 0,
    criado_em TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    atualizado_em TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Índice para otimizar busca por slug
CREATE INDEX IF NOT EXISTS idx_blog_posts_slug ON public.blog_posts(slug);
CREATE INDEX IF NOT EXISTS idx_blog_categories_slug ON public.blog_categories(slug);

-- Função para incrementar visualizações atomicamente
CREATE OR REPLACE FUNCTION increment_view_count(post_id INT)
RETURNS void AS $$
BEGIN
  UPDATE public.blog_posts
  SET visualizacoes = COALESCE(visualizacoes, 0) + 1
  WHERE id = post_id;
END;
$$ LANGUAGE plpgsql;
