/*
 * ARQUIVO: app.js
 * DESCRIÇÃO: Motor de Interface (UI Engine) - Versão 3.7 (Sincronização Total)
 * AUTOR: Rodrigo & Dev AI (Senior Specialist)
 * VERSÃO: 3.7 (Correção de Escalas, Mural e Filtros)
 */

window.CalendarUI = {
  // ==========================================================================
  // 0. ESTADO CENTRALIZADO
  // ==========================================================================
  estado: {
    anoAtual: new Date().getFullYear(),
    mesAtual: new Date().getMonth() + 1,
    dadosEventos: {},
    isAdmin: false,
    listaEquipes: [],
    config: { containerGrid: ".calendar-wrapper", mostrarPendentes: false },
  },

  // ==========================================================================
  // 1. INICIALIZAÇÃO DO MOTOR
  // ==========================================================================
  /* INÍCIO: Método init */
  init: async function (config = {}) {
    console.log("🚀 CalendarUI: Inicializando Engine v3.7...");
    this.estado.config = { ...this.estado.config, ...config };
    this.estado.isAdmin = config.isAdmin || false;

    // 1.1. Gestão de Interface de Acesso (Cadeado/Sair)
    await this.renderizarBotoesAcesso();

    try {
      // 1.2. Carga de Dados Base
      this.estado.listaEquipes = await window.api.listarEquipes();

      // 1.3. Renderização de Componentes
      await this.carregarMes();
      this.renderizarMural();
      this.inicializarSidebarFiltros();
    } catch (e) {
      console.error("❌ CalendarUI: Falha no carregamento inicial.");
    }
  },
  /* FIM: Método init */

  // ==========================================================================
  // 2. RENDERIZAÇÃO DO CALENDÁRIO (GRID & DETALHES)
  // ==========================================================================
  /* INÍCIO: Método carregarMes */
  carregarMes: async function () {
    const grid = document.querySelector(this.estado.config.containerGrid);
    if (!grid) return;

    const { anoAtual, mesAtual, config } = this.estado;

    // 2.1. Atualização do Nome do Mês
    const nomeMes = new Date(anoAtual, mesAtual - 1).toLocaleString("pt-BR", {
      month: "long",
    });
    const elNome = document.querySelector(".month-name");
    if (elNome) elNome.textContent = `${nomeMes.toUpperCase()} ${anoAtual}`;

    // 2.2. Busca de Dados via API
    const eventos = await window.api.buscarEventos(
      anoAtual,
      mesAtual,
      !config.mostrarPendentes
    );

    this.estado.dadosEventos = {};
    eventos.forEach((ev) => {
      if (!this.estado.dadosEventos[ev.data])
        this.estado.dadosEventos[ev.data] = [];
      this.estado.dadosEventos[ev.data].push(ev);
    });

    this.renderizarGrid(grid);
  },
  /* FIM: Método carregarMes */

  /* INÍCIO: Método renderizarGrid */
  renderizarGrid: function (gridElement) {
    const { anoAtual, mesAtual } = this.estado;
    const primeiroDia = new Date(anoAtual, mesAtual - 1, 1).getDay();
    const ultimoDia = new Date(anoAtual, mesAtual, 0).getDate();

    const headers = Array.from(gridElement.querySelectorAll(".day-header"))
      .map((h) => h.outerHTML)
      .join("");
    let html = headers;

    // 2.3. Padding de dias do mês anterior
    for (let i = 0; i < primeiroDia; i++)
      html += `<div class="day-cell other-month"></div>`;

    // 2.4. Renderização dos Dias e Compromissos
    for (let dia = 1; dia <= ultimoDia; dia++) {
      const dataISO = `${anoAtual}-${String(mesAtual).padStart(
        2,
        "0"
      )}-${String(dia).padStart(2, "0")}`;
      const lista = this.estado.dadosEventos[dataISO] || [];

      let pílulasHTML = "";
      lista.forEach((ev) => {
        const corHex = ev.liturgia_cores?.hex_code || "#64748b";

        // Pílula do Título (Múltiplos Eventos)
        pílulasHTML += `<div class="pill" style="border-left:3px solid ${corHex}; background:var(--cor-vinho)">${ev.titulo}</div>`;

        // Pílulas de Detalhes (Escalas de Horário)
        if (ev.tipo_compromisso === "liturgia" && ev.escalas) {
          ev.escalas.forEach((esc) => {
            pílulasHTML += `<div class="pill-detail">🕒 ${esc.hora_celebracao.substring(
              0,
              5
            )} Missa</div>`;
          });
        } else if (ev.hora_inicio) {
          pílulasHTML += `<div class="pill-detail">🕒 ${ev.hora_inicio.substring(
            0,
            5
          )}</div>`;
        }
      });

      html += `
                <div class="day-cell" onclick="window.CalendarUI.abrirModal('${dataISO}')">
                    <span class="day-number">${dia}</span>
                    <div class="pill-container">${pílulasHTML}</div>
                </div>`;
    }
    gridElement.innerHTML = html;
  },
  /* FIM: Método renderizarGrid */

  // ==========================================================================
  // 3. COMPONENTES DE INTERFACE (MURAL, FILTROS, AUTH)
  // ==========================================================================
  /* INÍCIO: Método renderizarMural */
  renderizarMural: async function () {
    const container = document.getElementById("sidebar-mural");
    if (!container) return;

    const avisos = await window.api.buscarAvisos();
    if (avisos.length === 0) {
      container.innerHTML = `<div class="mural-vazio" style="padding:15px; color:#999; font-style:italic;">Sem avisos recentes</div>`;
      return;
    }

    let html = `<div class="mural-header">MURAL PAROQUIAL</div><div class="mural-container">`;
    avisos.forEach((aviso) => {
      const dataFmt = new Date(aviso.data + "T12:00:00").toLocaleDateString(
        "pt-BR",
        { day: "2-digit", month: "2-digit" }
      );
      html += `
                <div class="aviso-card prio-${aviso.mural_prioridade}">
                    <div class="aviso-tag">${dataFmt}</div>
                    <div class="aviso-titulo">${aviso.titulo}</div>
                    <div class="aviso-meta">📍 ${
                      aviso.local || "Paróquia"
                    }</div>
                </div>`;
    });
    container.innerHTML = html + `</div>`;
  },
  /* FIM: Método renderizarMural */

  /* INÍCIO: Método inicializarSidebarFiltros */
  inicializarSidebarFiltros: function () {
    const container = document.getElementById("filtro-equipes");
    if (!container) return;

    container.innerHTML =
      `<h3>FILTRAR EQUIPES</h3>` +
      this.estado.listaEquipes
        .map(
          (eq) => `
            <div class="filter-item" style="display:flex; align-items:center; gap:8px; padding:5px 0;">
                <span class="checkbox-custom" style="width:12px; height:12px; border:1px solid #ccc; display:inline-block;"></span> 
                ${eq.nome_equipe}
            </div>
        `
        )
        .join("");
  },
  /* FIM: Método inicializarSidebarFiltros */

  /* INÍCIO: Método renderizarBotoesAcesso */
  renderizarBotoesAcesso: async function () {
    const header = document.querySelector("header");
    if (!header) return;

    const oldContainer = document.querySelector(".auth-wrapper-v3");
    if (oldContainer) oldContainer.remove();

    const session = await window.api.checkSession();
    const wrapper = document.createElement("div");
    wrapper.className = "auth-wrapper-v3";
    wrapper.style.cssText =
      "position:absolute; right:20px; display:flex; gap:10px; align-items:center;";

    if (session) {
      wrapper.innerHTML = `
                <a href="dashboard.html" style="color:#fff; text-decoration:none; font-size:0.75rem; background:rgba(255,255,255,0.2); padding:5px 12px; border-radius:4px; font-weight:bold;">PAINEL</a>
                <button onclick="window.api.logout()" style="background:none; border:1px solid #fff; color:#fff; padding:4px 12px; border-radius:20px; cursor:pointer; font-size:0.75rem;">Sair</button>`;
    } else {
      wrapper.innerHTML = `
                <a href="admin.html" title="Acesso Administrativo" style="color:rgba(255,255,255,0.7); display:flex;">
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect>
                        <path d="M7 11V7a5 5 0 0 1 10 0v4"></path>
                    </svg>
                </a>`;
    }
    header.appendChild(wrapper);
  },
  /* FIM: Método renderizarBotoesAcesso */

  // ==========================================================================
  // 4. MÉTODOS DE APOIO (NAVEGAÇÃO E MODAL)
  // ==========================================================================
  mudarMes: function (delta) {
    this.estado.mesAtual += delta;
    this.carregarMes();
  },
  irParaHoje: function () {
    const h = new Date();
    this.estado.anoAtual = h.getFullYear();
    this.estado.mesAtual = h.getMonth() + 1;
    this.carregarMes();
  },
  fecharModalForce: function () {
    document.getElementById("modalOverlay").classList.remove("active");
  },
  toggleSidebarMobile: function () {
    document.querySelector(".sidebar").classList.toggle("active");
    document.getElementById("sidebar-overlay").classList.toggle("active");
  },

  abrirModal: function (dataISO) {
    const overlay = document.getElementById("modalOverlay");
    const content = document.getElementById("modalContent");
    const lista = this.estado.dadosEventos[dataISO] || [];

    content.innerHTML = `
            <div class="modal-card">
                <button class="btn-close" onclick="window.CalendarUI.fecharModalForce()">×</button>
                <div class="modal-body">
                    <h3 style="margin-bottom:15px; color:var(--cor-vinho); font-family:'Neulis', sans-serif;">Compromissos em ${dataISO
                      .split("-")
                      .reverse()
                      .join("/")}</h3>
                    ${lista
                      .map(
                        (ev) => `
                        <div style="background:#f5f5f5; padding:12px; border-radius:8px; margin-bottom:10px; border-left:4px solid ${
                          ev.liturgia_cores?.hex_code || "#ccc"
                        }">
                            <strong style="display:block; margin-bottom:5px;">${
                              ev.titulo
                            }</strong>
                            <span style="font-size:0.85rem; color:#666;">📍 ${
                              ev.local || "Paróquia"
                            }</span>
                        </div>
                    `
                      )
                      .join("")}
                    ${
                      lista.length === 0
                        ? '<p style="text-align:center; color:#999;">Nenhum evento para esta data.</p>'
                        : ""
                    }
                </div>
            </div>`;
    overlay.classList.add("active");
  },
};

// AUTO-INICIALIZAÇÃO PARA O SITE PÚBLICO
document.addEventListener("DOMContentLoaded", () => {
  // Só inicia automaticamente se não for o dashboard e encontrar o container
  if (
    document.querySelector(".calendar-wrapper") &&
    !window.location.pathname.includes("dashboard")
  ) {
    window.CalendarUI.init({ isAdmin: false });
  }
});
