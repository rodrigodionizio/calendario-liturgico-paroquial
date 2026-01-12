/*
 * ARQUIVO: app.js
 * DESCRIÇÃO: Motor de Interface (UI Engine) - Controle de Fluxo e Renderização
 * PROJETO: Liturgia Paroquial 2026
 * AUTOR: Rodrigo & Dev AI (Senior Specialist)
 * VERSÃO: 3.2 (Correção de Botões e Padronização Global)
 */

window.CalendarUI = {
  // ==========================================================================
  // 0. ESTADO E CACHE
  // ==========================================================================
  estado: {
    anoAtual: new Date().getFullYear(),
    mesAtual: new Date().getMonth() + 1,
    dadosEventos: {},
    isAdmin: false,
    listaEquipes: [],
    filtrosAtivos: new Set(),
    config: { containerGrid: ".calendar-wrapper", mostrarPendentes: false },
  },

  // ==========================================================================
  // 1. INICIALIZAÇÃO
  // ==========================================================================
  /* INÍCIO: Método init */
  init: async function (config = {}) {
    console.log("🚀 CalendarUI: Sincronizando Motor...");
    this.estado.config = { ...this.estado.config, ...config };
    this.estado.isAdmin = config.isAdmin || false;

    try {
      // 1.1. Verifica Sessão e Gerencia Botões (Cadeado/Sair)
      await this.gerenciarBotoesAcesso();

      // 1.2. Carrega Dados Necessários
      if (this.estado.listaEquipes.length === 0) {
        this.estado.listaEquipes = await window.api.listarEquipes();
      }

      // 1.3. Renderização Inicial
      await this.carregarMes();
      this.renderizarMural();
      this.inicializarSidebarFiltros();
    } catch (e) {
      console.error("❌ CalendarUI: Falha na inicialização:", e);
    }
  },
  /* FIM: Método init */

  // ==========================================================================
  // 2. CONTROLE DE ACESSO E INTERFACE (FIX CADEADO/LOGOUT)
  // ==========================================================================
  /* INÍCIO: Método gerenciarBotoesAcesso */
  gerenciarBotoesAcesso: async function () {
    const header = document.querySelector("header");
    if (!header) return;

    // Remove botões existentes para evitar duplicação
    const btnAntigo = header.querySelector(".auth-btn-container");
    if (btnAntigo) btnAntigo.remove();

    const session = await window.api.checkSession();
    const container = document.createElement("div");
    container.className = "auth-btn-container";
    container.style.position = "absolute";
    container.style.right = "20px";

    if (session) {
      // Se logado: Botão Sair + Link Dashboard
      container.innerHTML = `
                <div style="display:flex; gap:10px; align-items:center;">
                    <a href="dashboard.html" style="color:#fff; text-decoration:none; font-size:0.8rem; background:rgba(255,255,255,0.2); padding:5px 10px; border-radius:4px;">Dashboard</a>
                    <button onclick="window.api.logout()" style="background:rgba(255,255,255,0.2); border:1px solid #fff; color:#fff; padding:5px 12px; border-radius:20px; cursor:pointer; font-size:0.8rem;">Sair</button>
                </div>`;
    } else {
      // Se deslogado: Ícone do Cadeado (Login)
      container.innerHTML = `
                <a href="admin.html" title="Acesso Restrito" style="color:rgba(255,255,255,0.5); text-decoration:none;">
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect>
                        <path d="M7 11V7a5 5 0 0 1 10 0v4"></path>
                    </svg>
                </a>`;
    }
    header.appendChild(container);
  },
  /* FIM: Método gerenciarBotoesAcesso */

  // ==========================================================================
  // 3. RENDERIZAÇÃO DO CALENDÁRIO
  // ==========================================================================
  /* INÍCIO: Método carregarMes */
  carregarMes: async function () {
    const grid = document.querySelector(this.estado.config.containerGrid);
    if (!grid) return;

    const { anoAtual, mesAtual, config } = this.estado;

    // Atualiza Título
    const nomeMes = new Date(anoAtual, mesAtual - 1).toLocaleString("pt-BR", {
      month: "long",
    });
    const elNome = document.querySelector(".month-name");
    if (elNome) elNome.textContent = `${nomeMes.toUpperCase()} ${anoAtual}`;

    // Busca Eventos
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

    // Preenchimento Mês Anterior
    for (let i = 0; i < primeiroDia; i++) {
      html += `<div class="day-cell other-month"></div>`;
    }

    // Dias Atuais
    for (let dia = 1; dia <= ultimoDia; dia++) {
      const dataISO = `${anoAtual}-${String(mesAtual).padStart(
        2,
        "0"
      )}-${String(dia).padStart(2, "0")}`;
      const eventos = this.estado.dadosEventos[dataISO] || [];

      let pílulas = eventos
        .map((ev) => {
          let cor = ev.liturgia_cores?.hex_code || "#64748b";
          return `<div class="pill" style="border-left:3px solid ${cor}; background:var(--cor-vinho)">${ev.titulo}</div>`;
        })
        .join("");

      html += `
                <div class="day-cell" data-iso="${dataISO}" onclick="window.CalendarUI.abrirModal('${dataISO}')">
                    <span class="day-number">${dia}</span>
                    <div class="pill-container">${pílulas}</div>
                </div>`;
    }

    gridElement.innerHTML = html;
  },
  /* FIM: Método renderizarGrid */

  // ==========================================================================
  // 4. INTERAÇÕES E MODAIS
  // ==========================================================================
  /* INÍCIO: Método abrirModal */
  abrirModal: function (dataISO) {
    const overlay = document.getElementById("modalOverlay");
    const content = document.getElementById("modalContent");
    const eventos = this.estado.dadosEventos[dataISO] || [];

    content.innerHTML = `
            <div class="modal-card">
                <button class="btn-close" onclick="window.CalendarUI.fecharModalForce()">×</button>
                <div class="modal-body">
                    <h3 style="margin-bottom:15px; color:var(--cor-vinho); font-family:'Neulis', sans-serif;">Eventos em ${dataISO
                      .split("-")
                      .reverse()
                      .join("/")}</h3>
                    ${eventos
                      .map(
                        (ev) => `
                        <div style="background:#f9f9f9; padding:10px; border-radius:8px; margin-bottom:10px; border-left:4px solid ${
                          ev.liturgia_cores?.hex_code || "#ccc"
                        }">
                            <strong style="color:var(--text-main)">${
                              ev.titulo
                            }</strong><br>
                            <small style="color:#666">📍 ${
                              ev.local || "Paróquia"
                            }</small>
                        </div>`
                      )
                      .join("")}
                    ${
                      eventos.length === 0
                        ? '<p style="color:#999; text-align:center;">Nenhum compromisso agendado para este dia.</p>'
                        : ""
                    }
                </div>
            </div>`;
    overlay.classList.add("active");
  },
  /* FIM: Método abrirModal */

  // ==========================================================================
  // 5. NAVEGAÇÃO E UTILS
  // ==========================================================================
  irParaHoje: function () {
    const hoje = new Date();
    this.estado.anoAtual = hoje.getFullYear();
    this.estado.mesAtual = hoje.getMonth() + 1;
    this.carregarMes();
  },

  mudarMes: function (delta) {
    this.estado.mesAtual += delta;
    if (this.estado.mesAtual < 1) {
      this.estado.mesAtual = 12;
      this.estado.anoAtual--;
    }
    if (this.estado.mesAtual > 12) {
      this.estado.mesAtual = 1;
      this.estado.anoAtual++;
    }
    this.carregarMes();
  },

  fecharModalForce: function () {
    document.getElementById("modalOverlay").classList.remove("active");
  },

  toggleSidebarMobile: function () {
    document.querySelector(".sidebar").classList.toggle("active");
    document.getElementById("sidebar-overlay").classList.toggle("active");
  },

  renderizarMural: async function () {
    const container = document.getElementById("sidebar-mural");
    if (!container) return;
    const avisos = await window.api.buscarAvisos();
    container.innerHTML =
      `<div class="mural-header">MURAL PAROQUIAL</div>` +
      avisos
        .map(
          (a) => `
            <div class="aviso-card" style="padding:10px; border-bottom:1px solid #eee;">
                <div style="font-weight:bold; font-size:0.8rem; color:var(--cor-vinho)">${
                  a.titulo
                }</div>
                <div style="font-size:0.7rem; color:#666;">📍 ${
                  a.local || "Paróquia"
                }</div>
            </div>`
        )
        .join("");
  },

  inicializarSidebarFiltros: function () {
    const container = document.getElementById("filtro-equipes");
    if (!container) return;
    container.innerHTML =
      `<h3>FILTRAR EQUIPES</h3>` +
      this.estado.listaEquipes
        .map(
          (eq) => `
            <div class="filter-item" style="padding:5px 0; font-size:0.9rem;"><input type="checkbox"> ${eq.nome_equipe}</div>
        `
        )
        .join("");
  },
};

// AUTO-INICIALIZAÇÃO PARA O SITE PÚBLICO
document.addEventListener("DOMContentLoaded", () => {
  if (
    document.querySelector(".calendar-wrapper") &&
    !window.location.pathname.includes("dashboard")
  ) {
    window.CalendarUI.init({ isAdmin: false });
  }
});
