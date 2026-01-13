/*
 * ARQUIVO: calendar-engine.js
 * DESCRIÇÃO: Motor de Renderização Único e Universal (V11.2)
 * FUNCIONALIDADE: Gerencia a lógica visual do calendário para áreas públicas e administrativas.
 * PROJETO: Liturgia Paroquial 2026
 */

window.CalendarEngine = {
  ano: 2026,
  mes: 1,
  isAdmin: false,
  selector: null,
  eventosLocal: {},

  // =============================
  // 1 - INÍCIO: init
  // =============================
  // Argumentos: config (Object) -> { selector, isAdmin, ano, mes }
  // Descrição: Inicializa as configurações do motor e dispara o carregamento de dados.
  init: async function (config) {
    console.log("🔍 Motor: Sincronizando parâmetros iniciais...");

    this.selector = config.selector;
    this.isAdmin = config.isAdmin || false;
    this.ano = config.ano || 2026;
    this.mes = config.mes || 1;

    // Dispara o processo de busca e montagem visual
    await this.carregarERenderizar();
  },
  // =============================
  // 1 - FIM: init
  // =============================

  // =============================
  // 2 - INÍCIO: carregarERenderizar
  // =============================
  // Argumentos: Nenhum (Utiliza estado interno do objeto)
  // Descrição: Realiza a ponte com a api.js para buscar dados do Supabase e prepara o container.
  carregarERenderizar: async function () {
    const grid = document.querySelector(this.selector);

    // Verificação de integridade do DOM
    if (!grid) {
      console.error(
        "❌ Motor Erro: Alvo de renderização não encontrado no DOM:",
        this.selector
      );
      return;
    }

    try {
      // Feedback visual para o usuário durante a latência da rede
      grid.innerHTML =
        '<div style="grid-column: 1/-1; padding: 50px; text-align: center; color: #999; font-style: italic;">Sincronizando com a Sacristia Digital...</div>';

      // Chamada à API pública para buscar eventos do mês
      const eventos = await window.api.buscarEventos(this.ano, this.mes);
      console.log("📦 Motor: Dados recebidos da API.");

      // Indexação local por data para busca rápida (O(1)) durante o loop de dias
      this.eventosLocal = {};
      eventos.forEach((ev) => (this.eventosLocal[ev.data] = ev));

      // Chamada ao motor de desenho do grid
      this.renderizarGrid(grid);
    } catch (error) {
      console.error("❌ Motor Erro Fatal:", error);
      grid.innerHTML =
        '<div style="grid-column: 1/-1; padding: 50px; text-align: center; color: var(--cor-cereja);">Erro de conexão. Verifique sua internet.</div>';
    }
  },
  // =============================
  // 2 - FIM: carregarERenderizar
  // =============================

  // =============================
  // 3 - INÍCIO: renderizarGrid
  // =============================
  // Argumentos: gridElement (HTMLElement)
  // Descrição: Executa o cálculo matemático das células do mês e injeta o HTML estrutural.
  renderizarGrid: function (gridElement) {
    // Lógica de cálculo de calendário
    const primeiroDia = new Date(this.ano, this.mes - 1, 1).getDay();
    const ultimoDia = new Date(this.ano, this.mes, 0).getDate();
    const ultimoDiaMesAnt = new Date(this.ano, this.mes - 1, 0).getDate();

    // Template inicial com cabeçalhos de dias da semana
    let html = `
            <div class="day-header">Dom</div><div class="day-header">Seg</div>
            <div class="day-header">Ter</div><div class="day-header">Qua</div>
            <div class="day-header">Qui</div><div class="day-header">Sex</div>
            <div class="day-header">Sáb</div>
        `;

    // Loop 1: Dias residuais do mês anterior (preenchimento visual)
    for (let i = primeiroDia - 1; i >= 0; i--) {
      html += `<div class="day-cell other-month"><span class="day-number">${
        ultimoDiaMesAnt - i
      }</span></div>`;
    }

    // Loop 2: Dias do mês vigente
    for (let dia = 1; dia <= ultimoDia; dia++) {
      const dataISO = `${this.ano}-${String(this.mes).padStart(
        2,
        "0"
      )}-${String(dia).padStart(2, "0")}`;
      const evento = this.eventosLocal[dataISO];

      // Definição dinâmica do comportamento de clique baseado no perfil (SaaS Ready)
      const clickAttr = this.isAdmin
        ? `onclick="window.DashboardController.abrirGerenciadorAgenda('${dataISO}')"`
        : `onclick="window.CalendarUI.abrirModal('${dataISO}')"`;

      html += `
                <div class="day-cell" data-iso="${dataISO}" ${clickAttr}>
                    <span class="day-number">${dia}</span>
                    ${this.gerarPilulas(evento)}
                </div>`;
    }

    // Injeção final no DOM
    gridElement.innerHTML = html;
    console.log("✅ Motor: Grid renderizado com sucesso.");
  },
  // =============================
  // 3 - FIM: renderizarGrid
  // =============================

  // =============================
  // 4 - INÍCIO: gerarPilulas
  // =============================
  // Argumentos: evento (Object|null)
  // Descrição: Constrói a representação visual (tags/badges) dos eventos dentro de cada dia.
  gerarPilulas: function (evento) {
    if (!evento) return "";

    // Tratamento de cor litúrgica
    let corHex = evento.liturgia_cores?.hex_code || "#ccc";
    if (corHex.toLowerCase() === "#ffffff") corHex = "#ccc"; // Fix para visibilidade em fundo branco

    // Pílula principal (Título do evento)
    let html = `<div class="pill" style="border-left: 3px solid ${corHex}; background-color: var(--cor-vinho);">${evento.titulo}</div>`;

    // Pílulas secundárias (Horários e Escalas)
    if (evento.escalas && evento.escalas.length > 0) {
      evento.escalas.forEach((esc) => {
        html += `
                    <div class="pill" style="background:#f0f0f0; color:#333; border-left:3px solid #ccc">
                        ${esc.hora_celebracao.substring(0, 5)} Missa
                    </div>`;
      });
    }
    return html;
  },
  // =============================
  // 4 - FIM: gerarPilulas
  // =============================
};
