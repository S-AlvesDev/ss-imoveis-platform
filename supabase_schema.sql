-- Reestruturação Supabase / PostgreSQL para Imobiliária São Severino

-- 1. Tabela de Users (Staff / Clients Logins)
CREATE TABLE IF NOT EXISTS public.users (
    id SERIAL PRIMARY KEY,
    nome TEXT NOT NULL,
    email TEXT,
    matricula TEXT UNIQUE NOT NULL,
    senha TEXT NOT NULL,
    role TEXT DEFAULT 'CLIENTE',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- 2. Tabela de Clients
CREATE TABLE IF NOT EXISTS public.clients (
    id SERIAL PRIMARY KEY,
    nome TEXT NOT NULL,
    email TEXT UNIQUE,
    telefone TEXT,
    matricula TEXT UNIQUE,
    senha TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- 3. Tabela de Properties
CREATE TABLE IF NOT EXISTS public.properties (
    id SERIAL PRIMARY KEY,
    nome TEXT NOT NULL,
    descricao TEXT,
    valor NUMERIC(10, 2) NOT NULL,
    localizacao TEXT,
    status TEXT DEFAULT 'DISPONÍVEL',
    images JSONB DEFAULT '[]'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- 4. Tabela de Contracts
CREATE TABLE IF NOT EXISTS public.contracts (
    id SERIAL PRIMARY KEY,
    client_id INTEGER REFERENCES public.clients(id) ON DELETE CASCADE,
    property_id INTEGER REFERENCES public.properties(id) ON DELETE CASCADE,
    corretor_matricula TEXT,
    valor_imovel NUMERIC(10, 2) NOT NULL,
    tipo_contrato TEXT DEFAULT 'VENDA',
    status TEXT DEFAULT 'ATIVO',
    status_financeiro TEXT DEFAULT 'Em Pagamento',
    distrato JSONB,
    data_contrato TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- 5. Tabela de Comissoes
CREATE TABLE IF NOT EXISTS public.comissoes (
    id SERIAL PRIMARY KEY,
    contrato_id INTEGER NOT NULL REFERENCES public.contracts(id) ON DELETE CASCADE,
    cliente_id INTEGER NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
    imovel_id INTEGER NOT NULL REFERENCES public.properties(id) ON DELETE CASCADE,
    corretor_matricula TEXT NOT NULL,
    regra_aplicada TEXT NOT NULL,
    valor_comissao NUMERIC(10, 2) NULL,
    valor_calculado NUMERIC(10, 2) NULL,
    valor_personalizado NUMERIC(10, 2) NULL,
    status TEXT DEFAULT 'PENDENTE', -- PENDENTE, PAGO
    data_criacao TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- 6. Tabela de Materials (Estoque da Obra)
CREATE TABLE IF NOT EXISTS public.materials (
    id SERIAL PRIMARY KEY,
    nome TEXT NOT NULL,
    unidade_medida TEXT NOT NULL,
    qtd_volumes NUMERIC(10, 2) NOT NULL,
    fator_multiplicador NUMERIC(10, 2) NOT NULL,
    saldo_unidades NUMERIC(10, 2) NOT NULL,
    estoque_minimo NUMERIC(10, 2) NOT NULL,
    categoria TEXT DEFAULT 'Outros',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- 7. Tabela de Material Movements
CREATE TABLE IF NOT EXISTS public.material_movements (
    id SERIAL PRIMARY KEY,
    material_id INTEGER REFERENCES public.materials(id) ON DELETE CASCADE,
    tipo_operacao TEXT NOT NULL,
    quantidade NUMERIC(10, 2) NOT NULL,
    funcionario_matricula TEXT NOT NULL,
    justificativa TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- 8. Tabela de Update Logs
CREATE TABLE IF NOT EXISTS public.update_logs (
    id SERIAL PRIMARY KEY,
    tipo TEXT NOT NULL,
    descricao TEXT NOT NULL,
    contrato_id INTEGER REFERENCES public.contracts(id) ON DELETE CASCADE,
    taxa_anterior NUMERIC(5, 2),
    taxa_nova NUMERIC(5, 2),
    data_atualizacao TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- Seeds Iniciais
INSERT INTO public.users (nome, matricula, senha, role) 
VALUES ('Administrador', 'admin', 'admin', 'ADMINISTRADOR') 
ON CONFLICT (matricula) DO NOTHING;

-- Atualização de Segurança Rápida: Adicionar colunas em tabelas existentes caso o usuário já tivesse as tabelas.
ALTER TABLE public.contracts ADD COLUMN IF NOT EXISTS tipo_contrato TEXT DEFAULT 'VENDA';
ALTER TABLE public.contracts ADD COLUMN IF NOT EXISTS status_financeiro TEXT DEFAULT 'Em Pagamento';
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS role TEXT DEFAULT 'CLIENTE';
ALTER TABLE public.materials ADD COLUMN IF NOT EXISTS categoria TEXT DEFAULT 'Outros';
ALTER TABLE public.comissoes ADD COLUMN IF NOT EXISTS valor_calculado NUMERIC(10, 2) NULL;
ALTER TABLE public.comissoes ADD COLUMN IF NOT EXISTS valor_personalizado NUMERIC(10, 2) NULL;
ALTER TABLE public.properties ADD COLUMN IF NOT EXISTS images JSONB DEFAULT '[]'::jsonb;

-- Dicas para limpeza da tabela contacts no Supabase Live (Execute isso no SQL Editor do Supabase)
-- Se você quiser limpar as colunas que não vamos mais usar em contratos, rode:
/*
ALTER TABLE public.contracts 
  DROP COLUMN IF EXISTS valor_entrada,
  DROP COLUMN IF EXISTS valor_financiado,
  DROP COLUMN IF EXISTS taxa_juros,
  DROP COLUMN IF EXISTS num_parcelas,
  DROP COLUMN IF EXISTS tipo_amortizacao,
  DROP COLUMN IF EXISTS data_inicio,
  DROP COLUMN IF EXISTS installments;

ALTER TABLE public.contracts ADD COLUMN IF NOT EXISTS corretor_matricula TEXT;
*/

-- Tabelas para o Sistema de Atendimento (Chat Evolution/IA)

CREATE TABLE IF NOT EXISTS public.chat_contacts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT,
    phone TEXT,
    email TEXT,
    city TEXT,
    tags TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

CREATE TABLE IF NOT EXISTS public.chat_conversations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    contact_id UUID REFERENCES public.chat_contacts(id) ON DELETE CASCADE,
    channel TEXT,
    status TEXT,
    assigned_user_id TEXT,
    assigned_agent_id TEXT,
    ai_enabled BOOLEAN DEFAULT true,
    queue TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

CREATE TABLE IF NOT EXISTS public.chat_messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    conversation_id UUID REFERENCES public.chat_conversations(id) ON DELETE CASCADE,
    direction TEXT,
    content TEXT,
    metadata JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

CREATE TABLE IF NOT EXISTS public.chat_agent_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT,
    system_prompt TEXT,
    provider TEXT,
    model TEXT,
    tools TEXT,
    is_default BOOLEAN DEFAULT false,
    active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- Inserir agente inicial se não existir
INSERT INTO public.chat_agent_sessions (name, system_prompt, provider, model, is_default, active)
SELECT 'Recepcionista Padrão', 'Você é um assistente de imobiliária amigável. Identifique a intenção do cliente, responda dúvidas simples e encaminhe para o setor correto (Corretores, Financeiro, Administrativo).', 'google', 'gemini-2.5-flash', true, true
WHERE NOT EXISTS (SELECT 1 FROM public.chat_agent_sessions WHERE is_default = true);

