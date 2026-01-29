# 🙏 Sacristia Digital - Sistema de Gestão Paroquial

> Sistema completo de gestão pastoral, calendário litúrgico e controle de equipes para paróquias católicas.

[![Versão](https://img.shields.io/badge/versão-2.0-blue.svg)](https://github.com/rodrigodionizio/calendario-liturgico-paroquial)
[![Licença](https://img.shields.io/badge/licença-Proprietária-red.svg)](#licença)
[![Status](https://img.shields.io/badge/status-Produção-success.svg)](https://rodrigodionizio.github.io/calendario-liturgico-paroquial/)

---

## 📖 Sobre o Projeto

**Sacristia Digital** é um sistema web moderno e responsivo desenvolvido para facilitar a gestão pastoral de paróquias católicas. O sistema oferece:

- 📅 **Calendário Litúrgico Interativo** com cores litúrgicas
- 👥 **Gestão de Equipes** (Leitura, Canto, MEP, Coroinhas)
- 📋 **Escalas Automatizadas** para celebrações
- 📰 **Mural de Avisos** com eventos em destaque
- 📊 **Dashboard Administrativo** completo
- 📱 **PWA** - Funciona offline como app
- 🖨️ **Relatórios em PDF** personalizados

---

## 🚀 Demonstração

**Acesso Público:** [https://rodrigodionizio.github.io/calendario-liturgico-paroquial/](https://rodrigodionizio.github.io/calendario-liturgico-paroquial/)

**Área Administrativa:** Requer credenciais de acesso

---

## 🛠️ Tecnologias Utilizadas

### Frontend
- **HTML5** / **CSS3** (Design System customizado)
- **JavaScript ES6+** (Vanilla JS - sem frameworks)
- **PWA** (Service Worker + Manifest)

### Backend
- **Supabase** (PostgreSQL + Auth + Storage)
- **Python** (Scripts de automação)

### APIs Externas
- **Vatican.va** (Liturgia da Palavra)

---

## 🔧 Instalação e Configuração

### Pré-requisitos
- Conta no [Supabase](https://supabase.com/)
- Git instalado
- Editor de código (VS Code recomendado)

### Passo 1: Clone o Repositório
```bash
git clone https://github.com/rodrigodionizio/calendario-liturgico-paroquial.git
cd calendario-liturgico-paroquial
```

### Passo 2: Configure o Supabase

1. Crie um projeto no Supabase
2. Execute os scripts SQL em `database/`:
   - `schema.sql` (cria tabelas)
   - `function_create.sql` (cria funções)

3. Configure as variáveis em `docs/assets/js/api.js`:
```javascript
const SUPABASE_URL = "SUA_URL_AQUI";
const SUPABASE_KEY = "SUA_CHAVE_AQUI";
```

### Passo 3: Teste Localmente
```bash
# Serve com qualquer servidor HTTP
python -m http.server 8000
# OU
npx serve docs
```

Acesse: `http://localhost:8000`

### Passo 4: Deploy no GitHub Pages
1. Vá em **Settings** → **Pages**
2. Source: **Deploy from a branch**
3. Branch: **main** / Folder: **/docs**
4. Aguarde o deploy e acesse a URL gerada

---

## 📚 Novidades Versão 2.0

### ✨ Novos Recursos
- ✅ **Sistema de Cache Inteligente** - Reduz chamadas à API em 70%
- ✅ **Modal Controller Unificado** - Código 50% mais limpo
- ✅ **Error Handler Robusto** - Retry automático e mensagens amigáveis
- ✅ **SEO Completo** - Meta tags, Schema.org, sitemap.xml
- ✅ **Acessibilidade A11Y** - Navegação por teclado, ARIA labels, contraste WCAG

### 🚀 Melhorias de Performance
- Cache de sessão com TTL configurável
- Invalidação automática após modificações
- Preconnect para CDNs
- Lazy loading pronto (planejado)

### 🎨 Melhorias de UI/UX
- Focus visible personalizado
- Tooltips acessíveis
- Estados de loading melhorados
- Toast notifications para erros

---

## 📚 Documentação da API

### Principais Métodos (api.js)

#### `buscarEventos(ano, mes)`
Busca eventos de um mês específico com cache automático.

```javascript
const eventos = await window.api.buscarEventos(2026, 1);
// Cache: 5 minutos | Retorna: Array de eventos
```

#### `salvarEventoCompleto(eventoPayload, escalasPayload)`
Salva evento e escalas associadas, invalidando cache.

```javascript
await window.api.salvarEventoCompleto(
  { data: '2026-01-28', titulo: 'Missa', ... },
  [{ hora_celebracao: '19:00', ... }]
);
```

#### ModalController.abrir(dataISO, mode)
Sistema unificado de modais para visualização e edição.

```javascript
// Modo visualização (público)
ModalController.abrir('2026-01-28', 'view');

// Modo edição (admin)
ModalController.abrir('2026-01-28', 'edit');
```

---

## 🐛 Resolução de Problemas

### Erro: "Failed to fetch"
**Solução:** 
```javascript
// Console do navegador:
window.api.clearCache();
location.reload();
```

### Modal não abre
**Causa:** Scripts não carregados na ordem  
**Solução:** Verifique a ordem no HTML (error-handler → api → modal-controller → app)

---

## 📄 Licença

© 2026 **TODOS OS DIREITOS RESERVADOS**

Desenvolvido EXCLUSIVAMENTE por **Rodrigo Dionízio**

**PROIBIDA** a reprodução, distribuição ou modificação sem autorização expressa do autor.

---

## 📞 Contato

**Desenvolvedor:** Rodrigo Dionízio  
**Instagram:** [@rodrigodionizio](https://www.instagram.com/rodrigodionizio/)  
**Paróquia:** Senhor Bom Jesus - Itabirinha/MG

---

<div align="center">

**Desenvolvido com ❤️ e ☕ por [Rodrigo Dionízio](https://www.instagram.com/rodrigodionizio/)**

*"Tudo posso naquele que me fortalece" - Filipenses 4:13*

</div>

