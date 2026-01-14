/*
 * ARQUIVO: dashboard.js
 * DESCRIÇÃO: Controlador Admin (Versão 6.0 - SDS Integrada)
 * PROJETO: Sacristia Digital 2026
 */

window.DashboardController = {
  agendaAno: new Date().getFullYear(),
  agendaMes: new Date().getMonth() + 1,

  // =============================
  // 1 - INÍCIO: init
  // =============================
  init: async function () {
    const session = await window.api.checkSession();
    if (!session) {
      window.location.href = "admin.html";
      return;
    }
    document.body.classList.add("auth-ok");

    const { data: perfil } = await window.api.client
      .from("admins_allowlist")
      .select("*")
      .eq("email", session.user.email)
      .single();
    document.getElementById("user-name").textContent = (
      perfil?.nome || session.user.email.split("@")[0]
    ).toUpperCase();

    if (perfil?.perfil_nivel <= 2) {
      const m = document.getElementById("menu-usuarios");
      if (m) m.style.display = "flex";
    }

    await this.atualizarVisaoGeral();
    this.configurarNavegacao();
  },
  // =============================
  // 1 - FIM: init
  // =============================

  // =============================
  // 2 - INÍCIO: carregarAgendaTotal
  // =============/================
  carregarAgendaTotal: async function () {
    const nomeMes = new Date(this.agendaAno, this.agendaMes - 1).toLocaleString(
      "pt-BR",
      { month: "long" }
    );
    const display = document.getElementById("admin-calendar-month");
    if (display)
      display.textContent = `${nomeMes} ${this.agendaAno}`.toUpperCase();

    if (window.CalendarEngine) {
      await window.CalendarEngine.init({
        selector: "#admin-calendar-grid",
        isAdmin: true,
        ano: this.agendaAno,
        mes: this.agendaMes,
      });
    }
  },
  // =============/================
  // 2 - FIM: carregarAgendaTotal
  // =============/================

  // =============================
  // 3 - INÍCIO: navegarAgenda
  // =============/================
  navegarAgenda: async function (direcao) {
    if (direcao === 0) {
      this.agendaAno = new Date().getFullYear();
      this.agendaMes = new Date().getMonth() + 1;
    } else {
      this.agendaMes += direcao;
      if (this.agendaMes < 1) {
        this.agendaMes = 12;
        this.agendaAno--;
      }
      if (this.agendaMes > 12) {
        this.agendaMes = 1;
        this.agendaAno++;
      }
    }
    await this.carregarAgendaTotal();
  },
  // =============/================
  // 3 - FIM: navegarAgenda
  // =============/================

  // =============================
  // 4 - INÍCIO: configurarNavegacao
  // =============/================
  configurarNavegacao: function () {
    const menuItems = document.querySelectorAll(".menu-item[data-tab]");
    const ctrl = window.DashboardController;

    menuItems.forEach((item) => {
      item.addEventListener("click", async () => {
        const targetTab = item.getAttribute("data-tab");
        document
          .querySelectorAll(".menu-item, .tab-content")
          .forEach((el) => el.classList.remove("active"));
        item.classList.add("active");
        const targetPanel = document.getElementById(`tab-${targetTab}`);
        if (targetPanel) targetPanel.classList.add("active");

        if (targetTab === "agenda-total") await ctrl.carregarAgendaTotal();
        else if (targetTab === "visao-geral") await ctrl.atualizarVisaoGeral();
        else if (targetTab === "equipes") await ctrl.renderizarAbaEquipes();
        else if (targetTab === "usuarios") await ctrl.renderizarAbaUsuarios();
      });
    });
  },
  // =============/================
  // 4 - FIM: configurarNavegacao
  // =============/================

  // =============================
  // 5 - INÍCIO: renderizarAbaEquipes
  // =============/================
  renderizarAbaEquipes: async function () {
    const container = document.getElementById("tab-equipes");
    if (!container) return;
    const equipes = await window.api.listarEquipes();
    container.innerHTML = `
            <div class="panel">
                <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:20px;">
                    <h3 class="page-title" style="font-size:1.2rem;">Equipes e Pastorais</h3>
                    <button onclick="window.DashboardController.abrirModalEquipe()" class="btn-ver-todas">＋ Nova Equipe</button>
                </div>
                ${equipes
                  .map(
                    (eq) => `
                    <div class="list-item o-surface-card">
                        <div class="list-content"><strong>${
                          eq.nome_equipe
                        }</strong><br><small>${eq.tipo_atuacao}</small></div>
                        <button onclick='window.DashboardController.abrirModalEquipe(${JSON.stringify(
                          eq
                        )})' style="background:none; border:none; cursor:pointer;">✏️</button>
                    </div>`
                  )
                  .join("")}
            </div>`;
  },
  // =============/================
  // 5 - FIM: renderizarAbaEquipes
  // =============/================

  // --- Outras funções (Estatísticas, Usuários) seguem o mesmo padrão simplificado do ctrl ---
  atualizarVisaoGeral: async function () {
    const stats = await window.api.buscarEstatisticasDashboard();
    const mappings = {
      "kpi-semana": stats.semana,
      "kpi-pendentes": stats.pendentes,
      "kpi-mural": stats.mural,
      "kpi-equipes": stats.equipes,
    };
    Object.entries(mappings).forEach(([id, val]) => {
      if (document.getElementById(id))
        document.getElementById(id).textContent = val;
    });
    await this.renderizarGraficoCarga();
    await this.renderizarListaRecentes();
  },

  renderizarGraficoCarga: async function () {
    const container = document.getElementById("chart-week");
    if (!container) return;
    const eventos = await window.api.buscarEventosProximos(7);
    const densidade = [0, 0, 0, 0, 0, 0, 0];
    eventos.forEach(
      (ev) => densidade[new Date(ev.data + "T12:00:00").getDay()]++
    );
    const max = Math.max(...densidade, 1);
    container.innerHTML = densidade
      .map(
        (c, i) =>
          `<div class="chart-bar-group"><div class="chart-bar" style="height:${
            (c / max) * 100
          }%"></div><div class="chart-label">${
            ["D", "S", "T", "Q", "Q", "S", "S"][i]
          }</div></div>`
      )
      .join("");
  },

  renderizarListaRecentes: async function () {
    const container = document.getElementById("admin-event-list");
    if (!container) return;
    const eventos = await window.api.buscarEventosRecentes(6);
    container.innerHTML = eventos
      .map(
        (ev) => `
            <div class="list-item o-surface-card">
                <div class="list-content"><strong>${
                  ev.titulo
                }</strong><br><small>${ev.tipo_compromisso}</small></div>
                <div class="status-dot ${
                  ev.status === "pendente" ? "status-wait" : "status-ok"
                }"></div>
            </div>`
      )
      .join("");
  },
};

document.addEventListener("DOMContentLoaded", () =>
  window.DashboardController.init()
);
