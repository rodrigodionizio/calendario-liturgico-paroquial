-- ========================================
-- DIAGNÓSTICO COMPLETO - COMUNIDADES
-- Execute este script no Supabase SQL Editor
-- ========================================

-- 1️⃣ VERIFICAR ESTRUTURA DA TABELA
SELECT 
    column_name, 
    data_type, 
    is_nullable,
    column_default
FROM information_schema.columns
WHERE table_name = 'comunidades'
ORDER BY ordinal_position;

-- 2️⃣ VERIFICAR DADOS COMPLETOS
SELECT 
    id,
    nome,
    endereco,
    padroeiro,
    ativo,
    pg_typeof(ativo) as tipo_do_campo_ativo,
    created_at
FROM comunidades
ORDER BY nome;

-- 3️⃣ CONTAR COMUNIDADES POR STATUS
SELECT 
    ativo,
    pg_typeof(ativo) as tipo,
    COUNT(*) as quantidade
FROM comunidades
GROUP BY ativo, pg_typeof(ativo);

-- 4️⃣ VERIFICAR POLÍTICAS RLS (Row Level Security)
SELECT 
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd,
    qual,
    with_check
FROM pg_policies
WHERE tablename = 'comunidades';

-- 5️⃣ VERIFICAR SE RLS ESTÁ ATIVO
SELECT 
    tablename,
    rowsecurity as rls_ativo
FROM pg_tables
WHERE schemaname = 'public' AND tablename = 'comunidades';

-- ========================================
-- SOLUÇÕES POSSÍVEIS
-- ========================================

-- 🔧 SOLUÇÃO 1: Se o campo 'ativo' for string "true" ao invés de boolean true
-- Converter strings para boolean:
-- UPDATE comunidades 
-- SET ativo = CASE 
--     WHEN ativo::text = 'true' THEN true
--     WHEN ativo::text = 'false' THEN false
--     ELSE ativo
-- END;

-- 🔧 SOLUÇÃO 2: Se RLS estiver bloqueando acesso anônimo
-- Criar política para acesso público (CUIDADO: apenas para dados públicos):
-- CREATE POLICY "Allow public read access to active communities"
-- ON comunidades
-- FOR SELECT
-- TO anon
-- USING (ativo = true);

-- 🔧 SOLUÇÃO 3: Garantir que comunidades específicas estejam ativas
UPDATE comunidades 
SET ativo = true
WHERE nome IN ('Santa Luzia', 'São José Operário');

-- 🔧 SOLUÇÃO 4: Verificar se as comunidades existem
SELECT 
    id,
    nome,
    ativo
FROM comunidades
WHERE nome LIKE '%Santa%' OR nome LIKE '%José%'
ORDER BY nome;

-- ========================================
-- QUERY DE TESTE (simula a query do frontend)
-- ========================================
SELECT *
FROM comunidades
-- WHERE ativo = true  -- Teste com e sem filtro
ORDER BY nome ASC;
