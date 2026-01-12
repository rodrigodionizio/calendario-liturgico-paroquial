/*
 * ARQUIVO: app.js
 * DESCRIÇÃO: Motor de Interface (UI Engine) - Estabilidade e Fallback
 * PROJETO: Liturgia Paroquial 2026
 * AUTOR: Rodrigo & Dev AI (Senior Specialist)
 * VERSÃO: 3.5 (Resiliência de Interface)
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
  // 1. INICIALIZAÇÃO RESILIENTE (FIX CADEADO)
  // ==========================================================================
  /* INÍCIO: Método init */
  init: async function (config = {}) {
    console.log("🚀 CalendarUI: Sincronizando Motor...");
    this.estado.config = { ...this.estado.config, ...config };
    this.estado.isAdmin = config.isAdmin || false;

    // PRIORIDADE 1: Renderizar UI de Acesso (Cadeado) independente da API
    // Isso garante que o coordenador possa logar mesmo se os dados falharem
    await this.renderizarBotoesAcesso();

    // PRIORIDADE 2: Tentar carregar dados
    try {
      this.estado.listaEquipes = await window.api.listarEquipes();
      await this.carregarMes();
      this.renderizarMural();
    } catch (e) {
      console.warn(
        "⚠️ CalendarUI: Motor rodando em modo offline/erro de conexão."
      );
    }
  },
  /* FIM: Método init */

  // ==========================================================================
  // 2. INTERFACE E AUTH (RECUPERAÇÃO DO CADEADO)
  // ==========================================================================
  /* INÍCIO: Método renderizarBotoesAcesso */
  renderizarBotoesAcesso: async function () {
    const header = document.querySelector("header");
    if (!header) return;

    // Limpa containers pré-existentes
    const old = document.querySelector(".auth-wrapper");
    if (old) old.remove();

    const session = await window.api.checkSession();
    const wrapper = document.createElement("div");
    wrapper.className = "auth-wrapper";
    wrapper.style.cssText =
      "position:absolute; right:20px; display:flex; gap:10px; align-items:center;";

    if (session) {
      // Caso Logado
      wrapper.innerHTML = `
                <a href="dashboard.html" style="color:#fff; text-decoration:none; font-size:0.75rem; background:rgba(255,255,255,0.2); padding:5px 10px; border-radius:4px; font-family:sans-serif;">PAINEL</a>
                <button onclick="window.api.logout()" style="background:none; border:1px solid #fff; color:#fff; padding:4px 10px; border-radius:20px; cursor:pointer; font-size:0.75rem;">Sair</button>`;
    } else {
      // Caso Público (Cadeado)
      wrapper.innerHTML = `
                <a href="admin.html" title="Acesso Administrativo" style="color:rgba(255,255,255,0.7); display:flex;">
                    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect>
                        <path d="M7 11V7a5 5 0 0 1 10 0v4"></path>
                    </svg>
                </a>`;
    }
    header.appendChild(wrapper);
  },
  /* FIM: Método renderizarBotoesAcesso */

  // ==========================================================================
  // 3. RENDERIZAÇÃO DO GRID (MÚLTIPLOS EVENTOS)
  // ==========================================================================
  /* INÍCIO: carregarMes */
  carregarMes: async function () {
    const grid = document.querySelector(this.estado.config.containerGrid);
    if (!grid) return;

    const { anoAtual, mesAtual, config } = this.estado;

    // Atualização do cabeçalho
    const nomeMes = new Date(anoAtual, mesAtual - 1).toLocaleString("pt-BR", {
      month: "long",
    });
    const elNome = document.querySelector(".month-name");
    if (elNome) elNome.textContent = `${nomeMes.toUpperCase()} ${anoAtual}`;

    // Busca via API
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
  /* FIM: carregarMes */

  renderizarGrid: function (gridElement) {
    const { anoAtual, mesAtual } = this.estado;
    const primeiroDia = new Date(anoAtual, mesAtual - 1, 1).getDay();
    const ultimoDia = new Date(anoAtual, mesAtual, 0).getDate();

    const headers = Array.from(gridElement.querySelectorAll(".day-header"))
      .map((h) => h.outerHTML)
      .join("");
    let html = headers;

    // Padding inicial
    for (let i = 0; i < primeiroDia; i++)
      html += `<div class="day-cell other-month"></div>`;

    // Loop de Dias
    for (let dia = 1; dia <= ultimoDia; dia++) {
      const dataISO = `${anoAtual}-${String(mesAtual).padStart(
        2,
        "0"
      )}-${String(dia).padStart(2, "0")}`;
      const lista = this.estado.dadosEventos[dataISO] || [];

      // Renderização das pílulas (Múltiplos Eventos)
      const pílulas = lista
        .map((ev) => {
          const cor = ev.liturgia_cores?.hex_code || "#666";
          return `<div class="pill" style="border-left:3px solid ${cor}; background:var(--cor-vinho)">${ev.titulo}</div>`;
        })
        .join("");

      html += `
                <div class="day-cell" onclick="window.CalendarUI.abrirModal('${dataISO}')">
                    <span class="day-number">${dia}</span>
                    <div class="pill-container">${pílulas}</div>
                </div>`;
    }
    gridElement.innerHTML = html;
  },

  // ==========================================================================
  // 4. MÉTODOS DE APOIO (NAV E MODAL)
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
    const eventos = this.estado.dadosEventos[dataISO] || [];

    content.innerHTML = `
            <div class="modal-card">
                <button class="btn-close" onclick="window.CalendarUI.fecharModalForce()">×</button>
                <div class="modal-body">
                    <h3 style="margin-bottom:15px; color:var(--cor-vinho)">${dataISO
                      .split("-")
                      .reverse()
                      .join("/")}</h3>
                    ${eventos
                      .map(
                        (ev) =>
                          `<div class="modal-item"><strong>${ev.titulo}</strong></div>`
                      )
                      .join("")}
                    ${eventos.length === 0 ? "<p>Sem eventos.</p>" : ""}
                </div>
            </div>`;
    overlay.classList.add("active");
  },

  renderizarMural: async function () {
    const container = document.getElementById("sidebar-mural");
    if (!container) return;
    const avisos = await window.api.buscarAvisos();
    container.innerHTML =
      `<div class="mural-header">MURAL</div>` +
      avisos.map((a) => `<div class="aviso-item">${a.titulo}</div>`).join("");
  },
};

// Auto-inicialização segura
document.addEventListener("DOMContentLoaded", () => {
  if (
    document.querySelector(".calendar-wrapper") &&
    !window.location.pathname.includes("dashboard")
  ) {
    window.CalendarUI.init({ isAdmin: false });
  }
});
