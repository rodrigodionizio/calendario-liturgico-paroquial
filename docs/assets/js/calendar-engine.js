/*
 * ARQUIVO: calendar-engine.js
 * DESCRIÇÃO: Motor de Renderização Único e Universal (V12.0)
 * FUNCIONALIDADE: Gerencia a lógica visual do calendário para áreas públicas e administrativas.
 * SUPORTE: Múltiplos eventos por dia (Arquitetura SaaS).
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
  // Argumentos: Nenhum
  // Descrição: Busca dados na API e organiza os eventos em Arrays por data (agrupamento).
  carregarERenderizar: async function () {
    const grid = document.querySelector(this.selector);
    if (!grid) {
      console.error("❌ Motor Erro: Container não encontrado:", this.selector);
      return;
    }

    try {
      // Feedback visual de carregamento
      grid.innerHTML =
        '<div style="grid-column: 1/-1; padding: 50px; text-align: center; color: #999;">Sincronizando agenda...</div>';

      const eventos = await window.api.buscarEventos(this.ano, this.mes);

      // MUDANÇA ESTRUTURAL: Agrupamos os eventos em listas (Arrays) dentro do objeto por data
      this.eventosLocal = {};
      eventos.forEach((ev) => {
        if (!this.eventosLocal[ev.data]) {
          this.eventosLocal[ev.data] = [];
        }
        this.eventosLocal[ev.data].push(ev);
      });

      this.renderizarGrid(grid);
    } catch (error) {
      console.error("❌ Motor Erro ao carregar dados:", error);
      grid.innerHTML =
        '<div style="grid-column: 1/-1; padding: 50px; text-align: center; color: red;">Falha na conexão com o banco.</div>';
    }
  },
  // =============================
  // 2 - FIM: carregarERenderizar
  // =============================

  // =============================
  // 3 - INÍCIO: renderizarGrid
  // =============================
  // Argumentos: gridElement (HTMLElement)
  // Descrição: Calcula os dias do mês e constrói o HTML do grid injetando as pílulas.
  renderizarGrid: function (gridElement) {
    // 3.1. Cálculos Matemáticos de Calendário
    const primeiroDia = new Date(this.ano, this.mes - 1, 1).getDay();
    const ultimoDia = new Date(this.ano, this.mes, 0).getDate();
    const ultimoDiaMesAnt = new Date(this.ano, this.mes - 1, 0).getDate();

    // 3.2. Template de Cabeçalho
    let html = `
            <div class="day-header">Dom</div><div class="day-header">Seg</div>
            <div class="day-header">Ter</div><div class="day-header">Qua</div>
            <div class="day-header">Qui</div><div class="day-header">Sex</div>
            <div class="day-header">Sáb</div>
        `;

    // 3.3. Preenchimento de dias do mês anterior
    for (let i = primeiroDia - 1; i >= 0; i--) {
      const diaResiduo = ultimoDiaMesAnt - i;
      html += `<div class="day-cell other-month"><span class="day-number">${diaResiduo}</span></div>`;
    }

    // 3.4. Renderização dos dias do mês atual
    for (let dia = 1; dia <= ultimoDia; dia++) {
      const dataISO = `${this.ano}-${String(this.mes).padStart(
        2,
        "0"
      )}-${String(dia).padStart(2, "0")}`;

      // Busca a lista de eventos para este dia específico (Sempre retorna um Array)
      const listaEventosDia = this.eventosLocal[dataISO] || [];

      // CORREÇÃO: Definição dinâmica do atributo de clique conforme privilégio
      const clickAttr = this.isAdmin
        ? `onclick="window.DashboardController.abrirGerenciadorAgenda('${dataISO}')"`
        : `onclick="window.CalendarUI.abrirModal('${dataISO}')"`;

      html += `
        <div class="day-cell" data-iso="${dataISO}" ${clickAttr}>
            <span class="day-number">${dia}</span>
            ${this.gerarPilulas(listaEventosDia)} 
        </div>`;
    }

    // 3.5. Injeção Final no DOM
    gridElement.innerHTML = html;
    console.log("✅ Motor: Grid renderizado com sucesso.");
  },
  // =============================
  // 3 - FIM: renderizarGrid
  // =============================

  // =============================
  // 4 - INÍCIO: gerarPilulas (Híbrido v5.6)
  // =============================
  // Argumentos: listaEventos (Array|null)
  // Descrição: Renderiza Pills (Desktop) ou Dots (Mobile)
  gerarPilulas: function (listaEventos) {
    if (!listaEventos || !Array.isArray(listaEventos) || listaEventos.length === 0) {
      return "";
    }

    const isMobile = window.innerWidth <= 768;

    // Se for Mobile, retorna contêiner de Dots
    if (isMobile) {
      const dotsHTML = listaEventos.map(ev => {
        let cor = ev.tipo_compromisso === "liturgia"
          ? ev.liturgia_cores?.hex_code || "#2e7d32"
          : "#64748b";
        if (cor.toLowerCase() === "#ffffff") cor = "#ccc";
        return `<span style="display:inline-block; width:8px; height:8px; background-color:${cor}; border-radius:50%; margin-right:4px;"></span>`;
      }).join("");

      return `<div style="display:flex; justify-content:center; flex-wrap:wrap; margin-top:2px; gap:2px;">${dotsHTML}</div>`;
    }

    // Modo Desktop (Pills Expandidas)
    return listaEventos
      .map((evento) => {
        let corHex =
          evento.tipo_compromisso === "liturgia"
            ? evento.liturgia_cores?.hex_code || "#2e7d32"
            : "#64748b";

        if (corHex.toLowerCase() === "#ffffff") corHex = "#ccc";

        let horaExibicao = "";
        if (evento.hora_inicio) {
          horaExibicao = evento.hora_inicio.substring(0, 5);
        } else if (evento.escalas && evento.escalas.length > 0) {
          horaExibicao = evento.escalas[0].hora_celebracao.substring(0, 5);
        }

        let htmlPill = `
        <div class="pill" style="border-left: 3px solid ${corHex}; background-color: var(--cor-vinho); margin-bottom: 2px;">
            <span style="font-size: 0.6rem; opacity: 0.8; margin-right: 4px;">${horaExibicao}</span>
            ${evento.titulo}
        </div>`;

        if (
          evento.tipo_compromisso === "liturgia" &&
          evento.escalas &&
          evento.escalas.length > 1
        ) {
          evento.escalas.slice(1).forEach((esc) => {
            htmlPill += `
                <div class="pill" style="background:#f0f0f0; color:#333; border-left:3px solid #ccc; font-size: 0.65rem;">
                    ${esc.hora_celebracao.substring(0, 5)} Missa
                </div>`;
          });
        }

        return htmlPill;
      })
      .join("");
  },
  // =============================
  // 4 - FIM: gerarPilulas
  // =============================
};
