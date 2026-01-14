/*
 * ARQUIVO: dashboard.js
 * VERSÃO: 5.6 (Correção de Escopo e Métodos UI)
 */

window.DashboardController = {
  meuPerfil: null,

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

    // Carrega Perfil do Usuário
    const { data: perfil } = await window.api.client
      .from("admins_allowlist")
      .select("*")
      .eq("email", session.user.email)
      .single();
    this.meuPerfil = perfil;

    if (this.meuPerfil?.perfil_nivel <= 2) {
      const menuUser = document.getElementById("menu-usuarios");
      if (menuUser) menuUser.style.display = "flex";
    }

    document.getElementById("user-name").textContent = (
      perfil?.nome || session.user.email.split("@")[0]
    ).toUpperCase();

    await this.atualizarVisaoGeral();
    this.configurarNavegacao();
  },

  // =============================
  // 2 - INÍCIO: carregarAgendaTotal
  // =============================
  carregarAgendaTotal: async function () {
    if (window.CalendarEngine) {
      await window.CalendarEngine.init({
        selector: "#admin-calendar-grid",
        isAdmin: true,
        ano: new Date().getFullYear(),
        mes: new Date().getMonth() + 1,
      });
    }
  },

  // =============================
  // 3 - INÍCIO: configurarNavegacao (CORREÇÃO DE ESCOPO)
  // =============/================
  configurarNavegacao: function () {
    const menuItems = document.querySelectorAll(".menu-item[data-tab]");
    const ctrl = window.DashboardController; // Referência fixa para evitar erro de 'this'

    menuItems.forEach((item) => {
      item.addEventListener("click", async () => {
        const targetTab = item.getAttribute("data-tab");
        document
          .querySelectorAll(".menu-item, .tab-content")
          .forEach((el) => el.classList.remove("active"));

        item.classList.add("active");
        const targetPanel = document.getElementById(`tab-${targetTab}`);
        if (targetPanel) targetPanel.classList.add("active");

        // Chamadas usando a referência fixa 'ctrl'
        if (targetTab === "agenda-total") await ctrl.carregarAgendaTotal();
        else if (targetTab === "visao-geral") await ctrl.atualizarVisaoGeral();
        else if (targetTab === "equipes") await ctrl.renderizarAbaEquipes();
        else if (targetTab === "usuarios") await ctrl.renderizarAbaUsuarios();
      });
    });
  },

  // =============================
  // 4 - INÍCIO: Gestão de Usuários (Aba Acesso)
  // =============================
  renderizarAbaUsuarios: async function () {
    const container = document.getElementById("tab-usuarios");
    const users = await window.api.buscarUsuarios();

    container.innerHTML = `
            <div class="panel">
                <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:20px;">
                    <h3 class="page-title" style="font-size:1.2rem;">Usuários do Sistema</h3>
                    <button onclick="window.DashboardController.abrirModalUsuario()" class="btn-ver-todas">＋ Novo Acesso</button>
                </div>
                <div id="users-list">
                    ${users
                      .map(
                        (u) => `
                        <div class="list-item o-surface-card">
                            <div class="list-content">
                                <strong>${u.nome || "Sem nome"}</strong><br>
                                <small>${u.email} • Nível ${
                          u.perfil_nivel
                        }</small>
                            </div>
                            <button onclick='window.DashboardController.abrirModalUsuario(${JSON.stringify(
                              u
                            )})' style="background:none; border:none; cursor:pointer;">✏️</button>
                            <button onclick="window.DashboardController.deletarUsuario('${
                              u.id
                            }')" style="background:none; border:none; cursor:pointer; color:red; margin-left:10px;">🗑️</button>
                        </div>
                    `
                      )
                      .join("")}
                </div>
            </div>`;
  },

  abrirModalUsuario: function (u = null) {
    const email = prompt("E-mail do usuário:", u ? u.email : "");
    if (email) {
      const nome = prompt("Nome completo:", u ? u.nome : "");
      const nivel = prompt(
        "Nível (1:Master, 2:Secretaria, 3:Coordenador):",
        u ? u.perfil_nivel : "3"
      );
      window.api
        .salvarUsuario({ id: u?.id, email, nome, perfil_nivel: nivel })
        .then(() => this.renderizarAbaUsuarios());
    }
  },

  deletarUsuario: async function (id) {
    if (confirm("Remover este acesso?")) {
      await window.api.excluirUsuario(id);
      this.renderizarAbaUsuarios();
    }
  },

  // =============================
  // 5 - MÉTODOS DE RENDERIZAÇÃO MANTIDOS E REVISADOS
  // =============================
  atualizarVisaoGeral: async function () {
    const stats = await window.api.buscarEstatisticasDashboard();
    const ids = [
      "kpi-semana",
      "kpi-pendentes",
      "kpi-mural",
      "kpi-equipes",
      "badge-pendentes",
    ];
    const vals = [
      stats.semana,
      stats.pendentes,
      stats.mural,
      stats.equipes,
      stats.pendentes,
    ];

    ids.forEach((id, i) => {
      if (document.getElementById(id))
        document.getElementById(id).textContent = vals[i];
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
