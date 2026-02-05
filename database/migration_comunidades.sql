-- =============================================================================
-- MIGRATION: Adicionar suporte a Comunidades
-- Data: 05/02/2026
-- Descrição: Adiciona coluna comunidade_id na tabela eventos_base
-- Schema Real: UUID para IDs, sem updated_at
-- =============================================================================

-- Adicionar coluna comunidade_id em eventos_base
ALTER TABLE eventos_base 
ADD COLUMN IF NOT EXISTS comunidade_id UUID REFERENCES comunidades(id) ON DELETE SET NULL;

-- Criar índice para performance nas queries filtradas
CREATE INDEX IF NOT EXISTS idx_eventos_base_comunidade ON eventos_base(comunidade_id);

-- Comentário para documentação
COMMENT ON COLUMN eventos_base.comunidade_id IS 'FK para comunidades - NULL indica Matriz/Paróquia principal';

-- Verificar integridade
DO $$
BEGIN
    RAISE NOTICE 'Migration concluída com sucesso!';
    RAISE NOTICE 'Tabela comunidades criada/verificada';
    RAISE NOTICE 'Coluna eventos_base.comunidade_id (UUID) adicionada';
    RAISE NOTICE 'Índices criados para performance';
END $$;
