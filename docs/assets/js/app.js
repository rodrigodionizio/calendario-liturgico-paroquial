/*
 * ARQUIVO: app.js
 * DESCRIÇÃO: Motor de Interface - Correção de Modal, Grid e Mural
 * VERSÃO: 3.8 (Restauração da Elegância Visual)
 */

window.CalendarUI = {
  estado: {
    anoAtual: new Date().getFullYear(),
    mesAtual: new Date().getMonth() + 1,
    dadosEventos: {},
    isAdmin: false,
    listaEquipes: [],
    config: { containerGrid: ".calendar-wrapper", mostrarPendentes: false },
  },

  /* INÍCIO: init */
  init: async function (config = {}) {
    this.estado.config = { ...this.estado.config, ...config };
    this.estado.isAdmin = config.isAdmin || false;

    await this.renderizarBotoesAcesso();

    try {
      this.estado.listaEquipes = await window.api.listarEquipes();
      await this.carregarMes();
      this.renderizarMural();
      this.inicializarSidebarFiltros();
    } catch (e) {
      console.error("❌ Erro ao iniciar Motor UI");
    }
  },
  /* FIM: init */

  /* INÍCIO: carregarMes */
  carregarMes: async function () {
    const grid = document.querySelector(this.estado.config.containerGrid);
    if (!grid) return;

    const { anoAtual, mesAtual, config } = this.estado;
    const nomeMes = new Date(anoAtual, mesAtual - 1).toLocaleString("pt-BR", {
      month: "long",
    });
    const elNome = document.querySelector(".month-name");
    if (elNome) elNome.textContent = `${nomeMes.toUpperCase()} ${anoAtual}`;

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

  /* INÍCIO: renderizarGrid (RESTAURAÇÃO DO ESTILO ELEGANTE) */
  renderizarGrid: function (gridElement) {
    const { anoAtual, mesAtual } = this.estado;
    const primeiroDia = new Date(anoAtual, mesAtual - 1, 1).getDay();
    const ultimoDia = new Date(anoAtual, mesAtual, 0).getDate();

    const headers = Array.from(gridElement.querySelectorAll(".day-header"))
      .map((h) => h.outerHTML)
      .join("");
    let html = headers;

    for (let i = 0; i < primeiroDia; i++)
      html += `<div class="day-cell other-month"></div>`;

    for (let dia = 1; dia <= ultimoDia; dia++) {
      const dataISO = `${anoAtual}-${String(mesAtual).padStart(
        2,
        "0"
      )}-${String(dia).padStart(2, "0")}`;
      const lista = this.estado.dadosEventos[dataISO] || [];

      let pílulasHTML = "";
      lista.forEach((ev) => {
        const corHex = ev.liturgia_cores?.hex_code || "#64748b";

        // Título em Vinho com borda litúrgica
        pílulasHTML += `<div class="pill" style="border-left:3px solid ${corHex}; background:var(--cor-vinho)">${ev.titulo}</div>`;

        // Boxes cinzas discretos para horários (Sem ícones extras)
        if (ev.tipo_compromisso === "liturgia" && ev.escalas) {
          ev.escalas.forEach((esc) => {
            pílulasHTML += `<div class="pill-detail" style="background:#f0f0f0; color:#555; font-size:0.75rem; margin-top:2px; padding:2px 5px; border-radius:3px;">${esc.hora_celebracao.substring(
              0,
              5
            )}h</div>`;
          });
        } else if (ev.hora_inicio) {
          pílulasHTML += `<div class="pill-detail" style="background:#e9ecef; color:#666; font-size:0.75rem; margin-top:2px; padding:2px 5px; border-radius:3px;">${ev.hora_inicio.substring(
            0,
            5
          )}h</div>`;
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
  /* FIM: renderizarGrid */

  /* INÍCIO: abrirModal (CORREÇÃO DA EXIBIÇÃO DE DADOS) */
  abrirModal: function (dataISO) {
    const overlay = document.getElementById("modalOverlay");
    const content = document.getElementById("modalContent");
    const eventos = this.estado.dadosEventos[dataISO] || [];

    const dataFmt = dataISO.split("-").reverse().join("/");

    let htmlCorpo = "";
    if (eventos.length === 0) {
      htmlCorpo = `<p style="text-align:center; padding:20px; color:#999;">Nenhum compromisso para este dia.</p>`;
    } else {
      eventos.forEach((ev) => {
        let detalhes = "";
        if (ev.tipo_compromisso === "liturgia" && ev.escalas) {
          detalhes = ev.escalas
            .map(
              (esc) => `
                        <div style="margin-top:8px; padding:8px; background:#f8f9fa; border-radius:5px; font-size:0.85rem;">
                            <strong>🕒 ${esc.hora_celebracao.substring(
                              0,
                              5
                            )}</strong><br>
                            📖 Leitura: ${
                              esc.equipe_leitura?.nome_equipe || "-"
                            }<br>
                            🎵 Canto: ${esc.equipe_canto?.nome_equipe || "-"}
                        </div>
                    `
            )
            .join("");
        } else {
          detalhes = `<div style="margin-top:8px; font-size:0.85rem; color:#666;">
                        🕒 Hora: ${
                          ev.hora_inicio
                            ? ev.hora_inicio.substring(0, 5)
                            : "--:--"
                        }<br>
                        📍 Local: ${ev.local || "-"}<br>
                        👤 Resp: ${ev.responsavel || "-"}
                    </div>`;
        }

        htmlCorpo += `
                    <div style="background:#fff; border:1px solid #eee; border-left:5px solid ${
                      ev.liturgia_cores?.hex_code || "#ccc"
                    }; padding:15px; border-radius:8px; margin-bottom:15px; box-shadow:0 2px 4px rgba(0,0,0,0.05);">
                        <div style="font-size:0.7rem; color:#888; text-transform:uppercase; font-weight:bold;">${
                          ev.tempo_liturgico || ev.tipo_compromisso
                        }</div>
                        <div style="font-size:1.1rem; color:var(--cor-vinho); font-weight:bold; margin:5px 0;">${
                          ev.titulo
                        }</div>
                        ${detalhes}
                    </div>`;
      });
    }

    content.innerHTML = `
            <div class="modal-card">
                <button class="btn-close" onclick="window.CalendarUI.fecharModalForce()">×</button>
                <div class="modal-body" style="max-height:80vh; overflow-y:auto;">
                    <h3 style="margin-bottom:20px; color:var(--cor-vinho); border-bottom:2px solid var(--cor-fundo); padding-bottom:10px;">Compromissos - ${dataFmt}</h3>
                    ${htmlCorpo}
                </div>
            </div>`;
    overlay.classList.add("active");
  },
  /* FIM: abrirModal */

  /* INÍCIO: renderizarMural (CORREÇÃO DE ESTRUTURA) */
  renderizarMural: async function () {
    const container = document.getElementById("sidebar-mural");
    if (!container) return;

    const avisos = await window.api.buscarAvisos();
    let html = `<div class="mural-header">MURAL PAROQUIAL</div>`;

    if (avisos.length === 0) {
      html += `<div style="padding:15px; color:#999; text-align:center; font-style:italic;">Sem avisos.</div>`;
    } else {
      html += `<div class="mural-container" style="display:block;">`; // Garantindo block para não alinhar lateral
      avisos.forEach((aviso) => {
        const dataFmt = new Date(aviso.data + "T12:00:00").toLocaleDateString(
          "pt-BR",
          { day: "2-digit", month: "2-digit" }
        );
        html += `
                    <div class="aviso-card prio-${
                      aviso.mural_prioridade
                    }" style="display:block; margin-bottom:12px;">
                        <div class="aviso-tag" style="display:inline-block; margin-bottom:5px;">${dataFmt}</div>
                        <div class="aviso-titulo" style="font-weight:bold; margin-bottom:3px;">${
                          aviso.titulo
                        }</div>
                        <div class="aviso-meta" style="font-size:0.75rem;">📍 ${
                          aviso.local || "Paróquia"
                        }</div>
                    </div>`;
      });
      html += `</div>`;
    }
    container.innerHTML = html;
  },
  /* FIM: renderizarMural */

  renderizarBotoesAcesso: async function () {
    const header = document.querySelector("header");
    if (!header) return;
    const old = document.querySelector(".auth-wrapper-v3");
    if (old) old.remove();
    const session = await window.api.checkSession();
    const wrapper = document.createElement("div");
    wrapper.className = "auth-wrapper-v3";
    wrapper.style.cssText =
      "position:absolute; right:20px; display:flex; gap:10px; align-items:center;";
    if (session) {
      wrapper.innerHTML = `<a href="dashboard.html" class="btn-dashboard" style="background:rgba(255,255,255,0.2); color:#fff; padding:5px 12px; border-radius:4px; font-weight:bold; text-decoration:none; font-size:0.8rem;">PAINEL</a><button onclick="window.api.logout()" style="background:none; border:1px solid #fff; color:#fff; padding:4px 10px; border-radius:20px; cursor:pointer; font-size:0.8rem;">Sair</button>`;
    } else {
      wrapper.innerHTML = `<a href="admin.html" style="color:rgba(255,255,255,0.7);"><svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect><path d="M7 11V7a5 5 0 0 1 10 0v4"></path></svg></a>`;
    }
    header.appendChild(wrapper);
  },

  inicializarSidebarFiltros: function () {
    const container = document.getElementById("filtro-equipes");
    if (!container) return;
    container.innerHTML =
      `<h3>FILTRAR EQUIPES</h3>` +
      this.estado.listaEquipes
        .map(
          (eq) => `
            <div class="filter-item" style="padding:5px 0; font-size:0.9rem; color:#444;">
                <input type="checkbox" style="margin-right:8px;"> ${eq.nome_equipe}
            </div>
        `
        )
        .join("");
  },

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
};

document.addEventListener("DOMContentLoaded", () => {
  if (
    document.querySelector(".calendar-wrapper") &&
    !window.location.pathname.includes("dashboard")
  ) {
    window.CalendarUI.init({ isAdmin: false });
  }
});
