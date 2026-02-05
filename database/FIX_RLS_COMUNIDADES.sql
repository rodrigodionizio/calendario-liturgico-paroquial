-- ========================================
-- SOLUÇÃO DEFINITIVA - ACESSO PÚBLICO A COMUNIDADES
-- Execute este script NO SUPABASE SQL EDITOR
-- ========================================

-- ✅ PASSO 1: Verificar se RLS está ativo na tabela comunidades
SELECT 
    tablename,
    rowsecurity as rls_ativo
FROM pg_tables
WHERE schemaname = 'public' AND tablename = 'comunidades';

-- Se rls_ativo = true, significa que RLS está bloqueando acesso anônimo


-- ✅ PASSO 2: Verificar políticas existentes
SELECT 
    policyname,
    cmd,
    roles,
    qual
FROM pg_policies
WHERE tablename = 'comunidades';

-- Se não houver políticas, tabela está BLOQUEADA para acesso anônimo


-- ========================================
-- SOLUÇÃO: CRIAR POLÍTICA DE ACESSO PÚBLICO
-- ========================================

-- 🔓 Primeiro, dropar políticas se existirem
DROP POLICY IF EXISTS "public_read_active_communities" ON comunidades;
DROP POLICY IF EXISTS "authenticated_read_all_communities" ON comunidades;

-- 🔓 Criar política para usuários anônimos (não autenticados) lerem comunidades ativas
CREATE POLICY "public_read_active_communities"
ON comunidades
FOR SELECT
TO anon, public
USING (ativo = true);

-- 🔓 Criar política para usuários autenticados terem acesso completo
CREATE POLICY "authenticated_read_all_communities"
ON comunidades
FOR SELECT
TO authenticated
USING (true);


-- ========================================
-- TESTE APÓS CRIAÇÃO DA POLÍTICA
-- ========================================

-- Esta query deve retornar as 2 comunidades:
SELECT 
    id,
    nome,
    ativo
FROM comunidades
WHERE ativo = true
ORDER BY nome;

-- Se retornar as 2 comunidades, o problema está RESOLVIDO! 🎉


-- ========================================
-- VERIFICAÇÃO FINAL
-- ========================================

-- Confirmar que políticas foram criadas:
SELECT 
    policyname,
    cmd,
    roles,
    qual
FROM pg_policies
WHERE tablename = 'comunidades'
ORDER BY policyname;

-- Deve mostrar:
-- 1. public_read_active_communities (anon, public)
-- 2. authenticated_read_all_communities (authenticated)


-- ========================================
-- ALTERNATIVA (SE ACIMA NÃO FUNCIONAR)
-- ========================================

-- Desabilitar RLS temporariamente (NÃO RECOMENDADO EM PRODUÇÃO)
-- Só use isso se a política acima não resolver:

-- ALTER TABLE comunidades DISABLE ROW LEVEL SECURITY;

-- ATENÇÃO: Isso expõe TODOS os dados da tabela publicamente!
-- Use apenas para teste, depois reative e crie as políticas corretas.
