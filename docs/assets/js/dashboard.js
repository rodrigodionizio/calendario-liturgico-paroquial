/*
 * ARQUIVO: dashboard.js
 * DESCRIÇÃO: Controlador Mestre do Painel Administrativo (SaaS Version)
 * PROJETO: Sacristia Digital 2026
 * VERSÃO: 7.0 (Sincronização Total e Correção de Escopo)
 */

window.DashboardController = {
  // Estado interno para navegação cronológica
  agendaAno: new Date().getFullYear(),
  agendaMes: new Date().getMonth() + 1,
  meuPerfil: null,

  // ==========================================================================
  // 1. INICIALIZAÇÃO E SEGURANÇA
  // ==========================================================================

  // =============================
  // 1 - INÍCIO: init
  // =============================
  // Argumentos: Nenhum
  // Descrição: Ponto de entrada. Valida sessão e libera a interface (auth-ok).
  init: async function () {
    console.log("🛠️ Dashboard: Inicializando Controlador...");
    try {
      const session = await window.api.checkSession();
      if (!session) {
        window.location.href = "admin.html";
        return;
      }

      // Ativa visibilidade do body (CSS opacity:0 -> 1)
      document.body.classList.add("auth-ok");

      // Busca perfil do administrador logado
      const { data: perfil } = await window.api.client
        .from("admins_allowlist")
        .select("*")
        .eq("email", session.user.email)
        .single();

      this.meuPerfil = perfil;

      // Define nome na UI
      const nameElem = document.getElementById("user-name");
      if (nameElem)
        nameElem.textContent = (
          perfil?.nome || session.user.email.split("@")[0]
        ).toUpperCase();

      // Mostra aba de acesso apenas para Nível 1 e 2
      if (this.meuPerfil?.perfil_nivel <= 2) {
        const menuUser = document.getElementById("menu-usuarios");
        if (menuUser) menuUser.style.display = "flex";
      }

      // Caches iniciais para editores
      const equipes = await window.api.listarEquipes();
      window.api.cacheEquipesLeitura = equipes.filter(
        (e) => e.tipo_atuacao !== "Canto"
      );
      window.api.cacheEquipesCanto = equipes.filter(
        (e) => e.tipo_atuacao !== "Leitura"
      );

      await this.atualizarVisaoGeral();
      this.configurarNavegacao();

      console.log("✅ Dashboard: Módulos operacionais prontos.");
    } catch (error) {
      console.error("❌ Erro fatal no init:", error);
    }
  },
  // =============================
  // 1 - FIM: init
  // =============================

  // ==========================================================================
  // 2. GESTÃO DE MÉTRICAS (KPIs)
  // ==========================================================================

  // =============================
  // 2 - INÍCIO: atualizarVisaoGeral
  // =============================
  // Argumentos: Nenhum
  // Descrição: Atualiza contadores e listas da aba principal.
  atualizarVisaoGeral: async function () {
    const stats = await window.api.buscarEstatisticasDashboard();
    const mappings = {
      "kpi-semana": stats.semana,
      "kpi-pendentes": stats.pendentes,
      "kpi-mural": stats.mural,
      "kpi-equipes": stats.equipes,
      "badge-pendentes": stats.pendentes,
    };

    Object.entries(mappings).forEach(([id, val]) => {
      const el = document.getElementById(id);
      if (el) el.textContent = val;
    });

    await this.renderizarGraficoCarga();
    await this.renderizarListaRecentes();
  },
  // =============================
  // 2 - FIM: atualizarVisaoGeral
  // =============================

  // ==========================================================================
  // 3. NAVEGAÇÃO E TABS
  // ==========================================================================

  // =============================
  // 3 - INÍCIO: configurarNavegacao
  // =============================
  // Argumentos: Nenhum
  // Descrição: Gerencia troca de abas e evita erro de escopo (this).
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

        const panel = document.getElementById(`tab-${targetTab}`);
        if (panel) panel.classList.add("active");

        // Disparos específicos
        if (targetTab === "agenda-total") await ctrl.carregarAgendaTotal();
        else if (targetTab === "visao-geral") await ctrl.atualizarVisaoGeral();
        else if (targetTab === "equipes") await ctrl.renderizarAbaEquipes();
        else if (targetTab === "usuarios") await ctrl.renderizarAbaUsuarios();
      });
    });
  },
  // =============================
  // 3 - FIM: configurarNavegacao
  // =============================

  // ==========================================================================
  // 4. MOTOR DE AGENDA (MULTI-EVENTO)
  // ==========================================================================

  // =============================
  // 4 - INÍCIO: carregarAgendaTotal
  // =============================
  // Descrição: Invoca o Motor de Calendário Único.
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
  // =============================
  // 4 - FIM: carregarAgendaTotal
  // =============================

  // =============================
  // 5 - INÍCIO: abrirGerenciadorAgenda
  // =============================
  // Argumentos: dataISO (String)
  // Descrição: Abre a lista de compromissos de um dia específico (Timeline).
  abrirGerenciadorAgenda: async function (dataISO) {
    const eventosDia = await window.api.buscarEventosDia(dataISO);
    const container = document.getElementById("modalContent");
    const dataFmt = new Date(dataISO + "T12:00:00").toLocaleDateString(
      "pt-BR",
      { weekday: "long", day: "2-digit", month: "long" }
    );

    container.innerHTML = `
            <div class="modal-card" style="max-width: 600px; flex-direction: column;">
                <div class="modal-body">
                    <button class="btn-close" onclick="window.DashboardController.fecharModal()">×</button>
                    <h2 style="font-family:'Neulis'; color:var(--cor-vinho);">Agenda do Dia</h2>
                    <p style="color:#888; margin-bottom:20px;">${dataFmt}</p>
                    <div id="lista-eventos-dia">
                        ${
                          eventosDia.length > 0
                            ? eventosDia
                                .map(
                                  (ev) => `
                            <div class="list-item o-surface-card" style="border-left:5px solid ${
                              ev.liturgia_cores?.hex_code || "#64748b"
                            }">
                                <div class="list-content">
                                    <strong>${(
                                      ev.hora_inicio || "--:--"
                                    ).substring(0, 5)} | ${ev.titulo}</strong>
                                    <br><small>${ev.local || "Paróquia"}</small>
                                </div>
                                <button onclick="window.DashboardController.renderizarFormulario('${
                                  ev.data
                                }', '${
                                    ev.id
                                  }')" style="background:none; border:none; cursor:pointer; font-size:1.2rem;">✏️</button>
                                <button onclick="window.DashboardController.deletarEvento('${
                                  ev.id
                                }', '${
                                    ev.data
                                  }')" style="background:none; border:none; cursor:pointer; font-size:1.2rem; margin-left:10px;">🗑️</button>
                            </div>
                        `
                                )
                                .join("")
                            : "<p>Sem compromissos.</p>"
                        }
                    </div>
                    <button onclick="window.DashboardController.renderizarFormulario('${dataISO}')" class="btn-ver-todas" style="width:100%; margin-top:20px;">＋ ADICIONAR NOVO</button>
                </div>
            </div>`;
    document.getElementById("modalOverlay").classList.add("active");
  },
  // =============================
  // 5 - FIM: abrirGerenciadorAgenda
  // =============================

  // ==========================================================================
  // 6. GESTÃO DE EQUIPES (CRUD)
  // ==========================================================================

  // =============================
  // 6 - INÍCIO: renderizarAbaEquipes
  // =============================
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
                        <div style="display:flex; gap:10px;">
                            <button onclick='window.DashboardController.abrirModalEquipe(${JSON.stringify(
                              eq
                            )})' style="background:none; border:none; cursor:pointer; font-size:1.1rem;">✏️</button>
                            <button onclick="window.DashboardController.deletarEquipe(${
                              eq.id
                            })" style="background:none; border:none; cursor:pointer; font-size:1.1rem;">🗑️</button>
                        </div>
                    </div>`
                  )
                  .join("")}
            </div>`;
  },
  // =============================
  // 6 - FIM: renderizarAbaEquipes
  // =============================

  // ==========================================================================
  // 7. GESTÃO DE ACESSOS (USUÁRIOS)
  // ==========================================================================

  // =============================
  // 7 - INÍCIO: renderizarAbaUsuarios
  // =============================
  renderizarAbaUsuarios: async function () {
    const container = document.getElementById("tab-usuarios");
    if (!container) return;
    const users = await window.api.buscarUsuarios();
    container.innerHTML = `
            <div class="panel">
                <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:20px;">
                    <h3 class="page-title" style="font-size:1.2rem;">Gestão de Acessos</h3>
                    <button onclick="window.DashboardController.abrirModalUsuario()" class="btn-ver-todas">＋ Novo Usuário</button>
                </div>
                ${users
                  .map(
                    (u) => `
                    <div class="list-item o-surface-card">
                        <div class="list-content"><strong>${
                          u.nome || "Sem Nome"
                        }</strong><br><small>${u.email} • Nível ${
                      u.perfil_nivel
                    }</small></div>
                        <button onclick='window.DashboardController.abrirModalUsuario(${JSON.stringify(
                          u
                        )})' style="background:none; border:none; cursor:pointer;">✏️</button>
                        <button onclick="window.DashboardController.deletarUsuario('${
                          u.id
                        }')" style="background:none; border:none; cursor:pointer; margin-left:10px;">🗑️</button>
                    </div>`
                  )
                  .join("")}
            </div>`;
  },
  // =============================
  // 7 - FIM: renderizarAbaUsuarios
  // =============================

  // ==========================================================================
  // 8. MÉTODOS DE APOIO E PERSISTÊNCIA
  // ==========================================================================

  renderizarFormulario: async function (dataISO, eventoId = null) {
    // [Lógica do formulário unificado que geramos anteriormente]
    // Chamada direta para abrir o formulário
    alert("Formulário de Edição em construção visual...");
  },

  abrirModalEquipe: function (eq = null) {
    const n = prompt("Nome da Equipe:", eq ? eq.nome_equipe : "");
    if (n)
      window.api
        .salvarEquipe({ id: eq?.id, nome: n, tipo: "Ambos" })
        .then(() => this.renderizarAbaEquipes());
  },

  deletarEquipe: async function (id) {
    if (confirm("Excluir equipe?")) {
      await window.api.excluirEquipe(id);
      this.renderizarAbaEquipes();
    }
  },

  abrirModalUsuario: function (u = null) {
    const email = prompt("E-mail do novo acesso:", u ? u.email : "");
    if (email)
      window.api
        .salvarUsuario({
          id: u?.id,
          email,
          nome: prompt("Nome:", u?.nome || ""),
          perfil_nivel: 3,
        })
        .then(() => this.renderizarAbaUsuarios());
  },

  deletarUsuario: async function (id) {
    if (confirm("Remover acesso?")) {
      await window.api.excluirUsuario(id);
      this.renderizarAbaUsuarios();
    }
  },

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

  fecharModal: function () {
    document.getElementById("modalOverlay").classList.remove("active");
  },

  renderizarGraficoCarga: async function () {
    const container = document.getElementById("chart-week");
    if (!container) return;
    const eventos = await window.api.buscarEventosProximos(7);
    const dens = [0, 0, 0, 0, 0, 0, 0];
    eventos.forEach((ev) => dens[new Date(ev.data + "T12:00:00").getDay()]++);
    const max = Math.max(...dens, 1);
    container.innerHTML = dens
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
