# Setup & Renew Design — Sacristia Digital (Proposta UX/UI)

> Documento de handoff técnico. Objetivo: permitir que qualquer agente (humano ou IA) entenda o que foi
> construído, por quê, e continue o trabalho — integração com dados reais, novas telas, ajustes finos —
> **sem quebrar o que já foi validado**.

---

## 1. O que é este arquivo

Este projeto contém uma **proposta de redesign UX/UI** da página pública do sistema **Sacristia Digital**
(gestão paroquial da Paróquia Senhor Bom Jesus — Itabirinha/MG), avaliada e aprovada em rodadas de feedback
com o responsável do projeto (Rodrigo). A proposta vive em:

```
Proposta - Sacristia Digital.dc.html   ← entrega principal (Design Component, abre direto no navegador)
sample-data.js                          ← dados de exemplo (mock), estrutura espelha o schema Supabase real
assets/                                 ← logos, ícones de escala e fontes copiados do projeto original (docs/)
_ds/gra-a-design-system-.../            ← Graça Design System (tokens de cor/tipo/espaçamento/efeitos), vinculado ao projeto
```

O código-fonte **original** do sistema em produção está na pasta anexada `docs/` (fora deste projeto — pasta
local do usuário), com `docs/index.html`, `docs/assets/js/app.js`, `docs/assets/css/styles.css` etc. Este
projeto **não substitui** aquele código — é uma camada de exploração visual/UX que deve ser portada de volta
manualmente (ou por um agente de dev) para o repositório real quando aprovada.

---

## 2. Diagnóstico original (por que redesenhar)

Pontos levantados na avaliação inicial do `docs/`:
- Visual datado, pouco polido; hierarquia visual fraca no calendário.
- Grade do calendário não era mobile-first (mobile herdava layout desktop apertado).
- Falta de uma visão "agenda" (lista) para consumo rápido em celular.
- Sem estados de foco/acessibilidade consistentes, sem `aria-live`/`aria-label` nos controles de navegação.

## 3. Decisões de design tomadas

1. **Manter a marca da paróquia** (vinho `#a41d31` + dourado `#fbb558`), só refinada — não uma reformulação
   completa de identidade.
2. **Usar o Graça Design System como fonte de tokens** (cor, espaçamento 8px, raios, sombras, motion) porque
   sua paleta terracota/dourado (`--graca-red #B53325`, `--gold #D9A441`) é **muito próxima** da marca da
   paróquia — decisão validada com o usuário após mostrar a paleta lado a lado.
3. **Exceção deliberada de tipografia**: o DS pede Cormorant Garamond / Hanken Grotesk, mas o usuário pediu
   explicitamente para **manter as fontes pré-carregadas do repositório original** — `Neulis` (títulos/serif)
   e `AntennaCond` (UI/corpo). Isso foi feito redefinindo os tokens `--font-serif`/`--font-display` e
   `--font-sans`/`--font-body` **por cima** do `typography.css` do DS, então todo o resto do sistema (que
   referencia `var(--font-serif)`/`var(--font-sans)`) automaticamente usa Neulis/AntennaCond sem precisar
   tocar em cada elemento. **Não reverta essa sobreposição** — está no `<style>` do `<helmet>`, logo após os
   `@font-face`.
4. **Mobile-first real**: a view padrão é decidida por `window.innerWidth` no estado inicial do componente
   (`largura < 768 → "agenda"`, senão `"grade"`), com um listener de `resize`. Isso é reforçado por CSS
   (`@media max-width: 640px`) para o modal virar bottom-sheet. O usuário pode alternar manualmente entre
   Grade/Agenda a qualquer momento (botões `GRADE`/`AGENDA` na barra do mês).
5. **Rodapé**: usar `var(--grad-bold)` (gradiente vermelho terracota do próprio DS), nunca o `--grad-marian`
   (azul) — feedback explícito do usuário: mudanças de cor devem navegar dentro da paleta vinho/dourado, não
   introduzir tons fora dela.
6. **Cabeçalho**: botão da direita é **Admin** (ícone de cadeado + texto "Admin"), replicando o padrão visual
   do botão de login do sistema atual (`docs/assets/js/app.js`, função `adicionarBotaoLogin()`), não um botão
   de WhatsApp (isso já existe no rodapé).

---

## 4. Arquitetura do Design Component

`Proposta - Sacristia Digital.dc.html` é um **Design Component** (template + classe de lógica). Não há
build step — abre direto no navegador. Principais peças:

### Estado (`state`)
```js
{
  ano, mes,            // mês exibido
  vista,               // null (automático) | "grade" | "agenda"
  comunidade,          // filtro por comunidade (id) ou "" = todas
  equipe,              // filtro por equipe (id) ou 0 = todas
  diaSel,              // data ISO selecionada → controla o modal
  largura,             // window.innerWidth, atualizado em resize
}
```

### Fluxo de dados
`sample-data.js` expõe `window.SACRISTIA_DADOS` com o formato:
```js
{
  cores: { verde, roxo, dourado, vermelho, branco, rosa },   // cores litúrgicas → {hex, txt, nome}
  comunidades: [{ id, nome, endereco }],
  equipes: [{ id, nome, tipo: "Leitura"|"Canto" }],
  eventosPorData: { "2026-07-05": [ {evento...}, ... ] },     // chave = data ISO
  avisos: [{ id, data, hora_inicio, titulo, local, prioridade, descricao }],
  hoje: "2026-07-07",  // data de referência para "HOJE" (mock fixo; produção usa Date real)
}
```
Cada evento (`eventosPorData[iso][n]`) segue:
```js
{
  id, data, titulo,
  tipo_compromisso: "liturgia" | "atendimento" | "reuniao" | "evento",
  tipo_celebracao: "missa" | "celebracao_palavra",
  tempo_liturgico, cor: {hex, txt}, is_solenidade: bool,
  comunidade_id: null | "c1" | ...,
  local, hora_inicio, responsavel,             // usado quando NÃO é liturgia
  escalas: [{ hora, leitura, canto, celebrante, mep, mesce: [...], coroinhas: [...] }],
}
```
`renderVals()` lê `window.SACRISTIA_DADOS` a cada render e produz tudo que o template precisa (células da
grade, itens da agenda, chips de filtro, conteúdo do modal). **Não há chamadas de rede** — é 100% mock,
propositalmente, para permitir protótipo interativo sem depender do Supabase.

### Views
- **Grade** (`mostraGrade`): grid CSS `repeat(7, minmax(0, 1fr))` — o `minmax(0, 1fr)` é crítico, sem ele o
  grid usa `max-content` e estoura a viewport (bug relatado e corrigido — ver §6).
- **Agenda** (`mostraAgenda`): lista vertical de cards por dia, pensada para mobile mas disponível também no
  desktop.
- **Modal de detalhes** (`temModal`): abre ao clicar num dia com eventos. Vira bottom-sheet abaixo de 640px
  via CSS (`[data-role="modal-panel"]` etc.) — ver §5.

### Props (aparecem no painel de Tweaks do host)
```json
{
  "mostrarMural": boolean (default true),
  "densidadeGrade": "confortável" | "compacta" (default "compacta" — ajustado pelo usuário),
  "inicioSemana": "domingo" | "segunda" (default "domingo")
}
```

---

## 5. Responsividade — pontos de atenção para quem for evoluir

- **Breakpoint mobile-first**: `768px` no JS decide Grade vs Agenda por padrão; `640px` no CSS decide o
  comportamento do modal (bottom sheet) e ajustes finos de padding.
- **Modal mobile (bottom sheet)**: implementado com atributos `data-role` (`modal-panel`, `modal-stripe`,
  `modal-content`, `modal-cal-actions`) porque estilos inline têm especificidade máxima — a única forma de
  um `@media` override funcionar é mirar um atributo/seletor externo com `!important`. **Se adicionar novos
  elementos ao modal, mantenha esse padrão** (não adicione media queries direto em `style=""`, não funciona).
- **Header**: classe utilitária `.header-inner` foi adicionada só para dar um gancho de CSS em mobile
  (padding reduzido) — mesma lógica acima.

## 6. Bugs corrigidos durante a revisão (não reintroduzir)

1. **Grid overflow / colunas cortadas**: `grid-template-columns: repeat(7, 1fr)` sem `minmax(0, 1fr)` faz o
   grid crescer pelo conteúdo (texto em `white-space: nowrap`) e estourar a tela, cortando sexta/sábado.
   Corrigido com `minmax(0, 1fr)` + `min-width: 0` nos filhos flexíveis + `overflow: hidden` nos containers.
2. **`sample-data.js` redeclaração**: em alguns fluxos de hot-reload o script é reavaliado no mesmo escopo
   global, e `const CORES_LITURGICAS` (top-level) quebra com `SyntaxError: already declared`. Corrigido
   envolvendo todo o arquivo num `if (!window.SACRISTIA_DADOS) { (function(){ ... })(); }`. **Não remova
   esse guard** ao editar o arquivo de dados.
3. **Âncoras de comentário**: dois comentários do usuário estavam anexados a elementos específicos
   (`data-comment-anchor="b32355511d-div"` na barra do mês, `data-comment-anchor="7d83f5aded-span"` no
   número do dia da grade). Foram preservados nos elementos equivalentes após o redesign — mantenha-os se
   reestruturar essas áreas.

---

## 7. Acessibilidade implementada

- Todos os controles interativos (navegação de mês, chips de equipe, seletor de comunidade, células da
  grade, cards da agenda, botão de imprimir, fechar modal) têm `aria-label`/`aria-pressed`/`role` adequados.
- Foco visível customizado (`:focus-visible`) usando o `--focus-ring` do DS (azul Marian) — não removido.
- Modal com `role="dialog"` + `aria-modal="true"` + `aria-label` dinâmico, fecha com `Escape` e clique fora
  (overlay), sem fechar ao clicar dentro do card (`stopPropagation`).
- `prefers-reduced-motion: reduce` desativa todas as animações/transições.
- Textos truncados sempre com `text-overflow: ellipsis` + `title=""` no elemento (nunca corte sem indicação).

## 8. Impressão de escalas

Botão de impressão (ícone de impressora) na barra do mês → `window.print()`. CSS `@media print` oculta
`header`, `footer` e qualquer elemento `[data-print-hide="true"]`, e remove o `max-width`/padding do `main`
para aproveitar a folha inteira. **Isso imprime a view atualmente ativa** (Grade ou Agenda, com os filtros
aplicados) — é intencional: o usuário imprime exatamente o que está filtrado/vendo.

---

## 9. Como integrar com o backend real (Supabase)

O arquivo `docs/assets/js/api.js` já tem `SUPABASE_URL`/`SUPABASE_KEY` e um client configurado. Para portar
esta proposta para produção, um agente de dev deve:

1. Substituir a leitura de `window.SACRISTIA_DADOS` (mock) por chamadas reais ao Supabase, mantendo
   exatamente o mesmo **shape de dados** descrito em §4 (ou escrever um mapeador/adaptador que transforme o
   retorno real do Supabase nesse shape — mais seguro, porque a lógica de `renderVals()` não precisa mudar).
2. `hoje` deve virar `new Date().toISOString().slice(0,10)` em vez do valor fixo `"2026-07-07"` do mock.
3. O botão **Admin** aponta para `href="admin.html"` (placeholder) — ligar à rota real de login do sistema
   atual.
4. Os botões **Google Agenda** / **.ics** já geram links/arquivos funcionais a partir de qualquer evento
   real (usam `titulo`, `data`, `hora`) — não precisam de alteração.
5. Portar o HTML/CSS de volta para o `docs/` (arquitetura atual não usa Design Components — é HTML/CSS/JS
   estático), preservando classes e estrutura de `docs/assets/css/styles.css` onde fizer sentido, ou
   reescrevendo como novo `styles.css` a partir dos valores usados aqui (todos os `var(--*)` referenciam
   tokens do Graça DS, documentados em `_ds/.../tokens/*.css` — copie os valores hex/rem finais se o `docs/`
   não puder linkar o design system).

## 10. Checklist de verificação antes de aprovar uma nova rodada

- [ ] Sem erros no console (`get_webview_logs` / DevTools).
- [ ] Grid da grade mensal sempre com 7 colunas visíveis, sem scroll horizontal, sem texto cortado sem
      reticências.
- [ ] Em viewport < 768px, a view inicial é "Agenda"; em ≥ 768px, é "Grade" (a menos que o usuário já tenha
      alternado manualmente nesta sessão).
- [ ] Modal abre centralizado em desktop e como bottom-sheet (borda superior arredondada, ações empilhadas)
      abaixo de 640px.
- [ ] Botão de impressão oculta header/footer e imprime só o conteúdo do calendário.
- [ ] Cores do rodapé/cabeçalho permanecem dentro da família vinho/dourado — nunca introduzir azul/verde
      fora da paleta sem aprovação explícita.
- [ ] Fontes seguem sendo Neulis (títulos) + AntennaCond (UI/corpo) em toda a página.

---

## 11. Arquivos de referência rápida

| Arquivo | Papel |
|---|---|
| `Proposta - Sacristia Digital.dc.html` | Entrega — template + lógica (`class Component extends DCLogic`) |
| `sample-data.js` | Mock de dados, shape espelha Supabase real |
| `assets/img/...` | Logos e ícones de escala (leitores, canto, celebrante, mep, mesce, coroinhas) copiados de `docs/assets/img` |
| `assets/fonts/...` | Neulis (5 pesos) + AntennaCond (3 pesos), copiados de `docs/assets/fonts` |
| `_ds/gra-a-design-system-.../` | Tokens de cor/tipo/espaçamento/efeitos do Graça Design System (vinculado ao projeto) |

Qualquer agente que continuar este trabalho deve ler este documento **antes** de tocar no `.dc.html` —
ele documenta decisões que já foram validadas com o usuário e não devem ser revertidas sem pedido explícito.
