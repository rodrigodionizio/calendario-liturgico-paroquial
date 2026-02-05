-- Tabela de Referência Litúrgica
CREATE TABLE liturgia_diaria (
    id SERIAL PRIMARY KEY,
    data_calendario DATE UNIQUE NOT NULL,
    semana_ordinal INT,
    dia_semana VARCHAR(20),
    tempo_liturgico VARCHAR(50),
    cor VARCHAR(20),
    santo_festa VARCHAR(150),
    grau VARCHAR(50)
);

-- Tabela de Escalas da Paróquia
CREATE TABLE escalas (
    id SERIAL PRIMARY KEY,
    liturgia_id INT REFERENCES liturgia_diaria(id),
    hora TIME NOT NULL,
    equipe_leitura VARCHAR(100),
    equipe_canto VARCHAR(100),
    responsavel_contato VARCHAR(50)
);

-- =============================================================================
-- TABELA DE COMUNIDADES E CAPELAS
-- Criada em: 05/02/2026
-- Propósito: Normalizar gestão de múltiplas comunidades da paróquia
-- Schema Real do Supabase (6 colunas)
-- =============================================================================
CREATE TABLE IF NOT EXISTS comunidades (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    nome TEXT NOT NULL UNIQUE,
    endereco TEXT,
    padroeiro TEXT,
    ativo BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Habilitar Row Level Security
ALTER TABLE comunidades ENABLE ROW LEVEL SECURITY;

-- Política de acesso para usuários autenticados
CREATE POLICY "Gestão de Comunidades para Usuários Logados"
ON comunidades
FOR ALL
TO authenticated
USING (true)
WITH CHECK (true);

-- Comentários para documentação
COMMENT ON TABLE comunidades IS 'Registro de todas as comunidades e capelas da paróquia';
COMMENT ON COLUMN comunidades.nome IS 'Nome único da comunidade ou capela';
COMMENT ON COLUMN comunidades.endereco IS 'Endereço completo da localidade';
COMMENT ON COLUMN comunidades.padroeiro IS 'Santo(a) padroeiro(a) da comunidade';
COMMENT ON COLUMN comunidades.ativo IS 'Flag para soft delete (false = inativa, não aparece nos filtros)';
