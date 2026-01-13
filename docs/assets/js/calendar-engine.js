/*
 * ARQUIVO: calendar-engine.js
 * DESCRIÇÃO: Motor de Renderização Único (V11.0)
 * FUNCIONALIDADE: Renderiza o Grid em qualquer container (Index ou Dashboard)
 */

window.CalendarEngine = {
  ano: 2026,
  mes: 1,
  isAdmin: false,
  selector: null,
  eventosLocal: {},

  /**
   * @function init
   * @description Inicializa o motor em um elemento específico
   */
  init: async function (config) {
    this.selector = config.selector;
    this.isAdmin = config.isAdmin || false;
    this.ano = config.ano || 2026;
    this.mes = config.mes || 1;

    await this.carregarERenderizar();
  },

  carregarERenderizar: async function () {
    const grid = document.querySelector(this.selector);
    if (!grid) return;

    // 1. Busca dados via API
    const eventos = await window.api.buscarEventos(this.ano, this.mes);
    this.eventosLocal = {};
    eventos.forEach((ev) => (this.eventosLocal[ev.data] = ev));

    // 2. Renderiza o Grid
    this.renderizarGrid(grid);
  },

  renderizarGrid: function (gridElement) {
    const primeiroDia = new Date(this.ano, this.mes - 1, 1).getDay();
    const ultimoDia = new Date(this.ano, this.mes, 0).getDate();
    const ultimoDiaMesAnt = new Date(this.ano, this.mes - 1, 0).getDate();

    // Cabeçalhos (Dom, Seg...)
    let html = `
            <div class="day-header">Dom</div><div class="day-header">Seg</div>
            <div class="day-header">Ter</div><div class="day-header">Qua</div>
            <div class="day-header">Qui</div><div class="day-header">Sex</div>
            <div class="day-header">Sáb</div>
        `;

    // Dias do mês anterior (cinza)
    for (let i = primeiroDia - 1; i >= 0; i--) {
      html += `<div class="day-cell other-month"><span class="day-number">${
        ultimoDiaMesAnt - i
      }</span></div>`;
    }

    // Dias do mês atual
    for (let dia = 1; dia <= ultimoDia; dia++) {
      const dataISO = `${this.ano}-${String(this.mes).padStart(
        2,
        "0"
      )}-${String(dia).padStart(2, "0")}`;
      const evento = this.eventosLocal[dataISO];

      // Decisão de clique: Se for admin, abre o Gerenciador. Se não, abre Detalhes.
      const clickAttr = this.isAdmin
        ? `onclick="Dashboard.abrirGerenciadorAgenda('${dataISO}')"`
        : `onclick="window.CalendarUI.abrirModal('${dataISO}')"`;

      html += `
                <div class="day-cell" data-iso="${dataISO}" ${clickAttr}>
                    <span class="day-number">${dia}</span>
                    ${this.gerarPilulas(evento)}
                </div>`;
    }
    gridElement.innerHTML = html;
  },

  gerarPilulas: function (evento) {
    if (!evento) return "";
    let corHex = evento.liturgia_cores?.hex_code || "#ccc";
    if (corHex === "#ffffff") corHex = "#ccc";

    let html = `<div class="pill" style="border-left: 3px solid ${corHex}; background-color: var(--cor-vinho);">${evento.titulo}</div>`;

    if (evento.escalas && evento.escalas.length > 0) {
      evento.escalas.forEach((esc) => {
        html += `<div class="pill" style="background:#f0f0f0; color:#333; border-left:3px solid #ccc">${esc.hora_celebracao.substring(
          0,
          5
        )} Missa</div>`;
      });
    }
    return html;
  },
};
