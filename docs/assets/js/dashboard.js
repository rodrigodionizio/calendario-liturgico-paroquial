/*
 * ARQUIVO: dashboard.js
 * DESCRIÇÃO: Controlador Principal do Painel Administrativo (Hub de Gestão)
 * PROJETO: Liturgia Paroquial 2026
 * AUTOR: Rodrigo & Dev AI (Senior Specialist Approach)
 * VERSÃO: 4.0 (Revisada e Estável)
 */

window.DashboardController = {
  // ==========================================================================
  // 1. INICIALIZAÇÃO E SEGURANÇA
  // ==========================================================================

  // =============================
  // 1 - INÍCIO: init
  // =============================
  // Argumentos: Nenhum
  // Descrição: Valida a sessão do usuário, define identidade visual e dispara métricas iniciais.
  init: async function () {
    console.log("🛠️ Dashboard: Inicializando Controlador de Gestão...");

    // 1.1. Verificação Crítica de Sessão via API
    const session = await window.api.checkSession();
    if (!session) {
      console.warn("🚫 Acesso negado. Redirecionando para login.");
      window.location.href = "admin.html";
      return;
    }
    document.body.classList.add("auth-ok");
    // 1.2. Configuração de Nome na UI
    const userNameElem = document.getElementById("user-name");
    if (userNameElem) {
      userNameElem.textContent = session.user.email.split("@")[0].toUpperCase();
    }

    // 1.3. Carregamento de Dados Iniciais (Métricas e KPIs)
    await this.atualizarVisaoGeral();

    // 1.4. Configuração de Listeners de Navegação (Tabs)
    this.configurarNavegacao();

    console.log("✅ Dashboard: Sistema pronto para operação.");
  },
  // =============================
  // 1 - FIM: init
  // =============================

  // ==========================================================================
  // 2. GESTÃO DE MÉTRICAS (KPIs)
  // ==========================================================================

  // =============/================
  // 2 - INÍCIO: atualizarVisaoGeral
  // =============/================
  // Argumentos: Nenhum
  // Descrição: Busca estatísticas no banco e atualiza os contadores e gráficos da tela principal.
  atualizarVisaoGeral: async function () {
    try {
      // Chamada consolidada das estatísticas via Supabase
      const stats = await window.api.buscarEstatisticasDashboard();

      // Atualização dos elementos de KPI (IDs baseados no HTML)
      if (document.getElementById("kpi-semana")) {
        document.getElementById("kpi-semana").textContent = stats.semana;
        document.getElementById("kpi-pendentes").textContent = stats.pendentes;
        document.getElementById("kpi-mural").textContent = stats.mural;
        document.getElementById("kpi-equipes").textContent = stats.equipes;
      }

      // Atualização do distintivo de notificação na Sidebar
      const badge = document.getElementById("badge-pendentes");
      if (badge) badge.textContent = stats.pendentes;

      // Renderização visual dos componentes de suporte
      await this.renderizarGraficoCarga();
      await this.renderizarListaRecentes();
    } catch (error) {
      console.error("❌ Erro ao atualizar métricas do Dashboard:", error);
    }
  },
  // =============/================
  // 2 - FIM: atualizarVisaoGeral
  // =============/================

  // ==========================================================================
  // 3. INTEGRAÇÃO COM MOTORES DE CONTEÚDO
  // ==========================================================================

  // =============/================
  // 3 - INÍCIO: carregarAgendaTotal
  // =============/================
  // Argumentos: Nenhum
  // Descrição: Aciona o motor de calendário unificado em modo administrador.
  carregarAgendaTotal: async function () {
    console.log("📅 Dashboard: Acionando Motor de Calendário...");

    // Verificamos se o Motor de Calendário (CalendarEngine ou UI) está disponível
    if (window.CalendarEngine) {
      await window.CalendarEngine.init({
        selector: "#admin-calendar-grid",
        isAdmin: true,
        ano: 2026,
        mes: 1,
      });
    } else {
      console.error("❌ Erro: Motor de Calendário não carregado.");
    }
  },
  // =============/================
  // 3 - FIM: carregarAgendaTotal
  // =============/================

  // ==========================================================================
  // 4. CONTROLE DE INTERFACE (NAVEGAÇÃO)
  // ==========================================================================

  // =============/================
  // 4 - INÍCIO: configurarNavegacao
  // =============/================
  // Argumentos: Nenhum
  // Descrição: Gerencia a troca de abas (Tabs) e dispara os carregamentos específicos de cada módulo.
  configurarNavegacao: function () {
    const menuItems = document.querySelectorAll(".menu-item[data-tab]");
    const tabs = document.querySelectorAll(".tab-content");

    menuItems.forEach((item) => {
      item.addEventListener("click", async () => {
        const targetTab = item.getAttribute("data-tab");

        // Alternância visual das classes ativas
        menuItems.forEach((i) => i.classList.remove("active"));
        tabs.forEach((t) => t.classList.remove("active"));

        item.classList.add("active");
        const targetElement = document.getElementById(`tab-${targetTab}`);
        if (targetElement) targetElement.classList.add("active");

        // Orquestração de carregamento baseado na aba selecionada
        if (targetTab === "agenda-total") {
          await this.carregarAgendaTotal();
        } else if (targetTab === "visao-geral") {
          await this.atualizarVisaoGeral();
        } else if (targetTab === "equipes") {
          await this.renderizarAbaEquipes();
        }
      });
    });
  },
  // =============/================
  // 4 - FIM: configurarNavegacao
  // =============/================

  // ==========================================================================
  // 5. GESTÃO DE EQUIPES (CRUD)
  // ==========================================================================

  // =============/================
  // 5 - INÍCIO: renderizarAbaEquipes
  // =============/================
  // Argumentos: Nenhum
  // Descrição: Gera a interface de gerenciamento de equipes de forma dinâmica.
  renderizarAbaEquipes: async function () {
    const container = document.getElementById("tab-equipes");
    if (!container) return;

    try {
      const equipes = await window.api.listarEquipes();

      container.innerHTML = `
                <div class="panel">
                    <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:20px;">
                        <div class="panel-title">Gestão de Equipes</div>
                        <button onclick="window.DashboardController.abrirModalEquipe()" class="btn-ver-todas">＋ Nova Equipe</button>
                    </div>
                    
                    <table class="print-table" style="display:table; width:100%">
                        <thead>
                            <tr>
                                <th>Equipe / Pastoral</th>
                                <th>Atuação</th>
                                <th style="text-align:right">Gerenciar</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${equipes
                              .map(
                                (eq) => `
                                <tr>
                                    <td><strong>${eq.nome_equipe}</strong></td>
                                    <td><span class="print-tipo">${
                                      eq.tipo_atuacao
                                    }</span></td>
                                    <td style="text-align:right">
                                        <button onclick='window.DashboardController.abrirModalEquipe(${JSON.stringify(
                                          eq
                                        )})' style="cursor:pointer; background:none; border:none;">✏️</button>
                                        <button onclick="window.DashboardController.deletarEquipe(${
                                          eq.id
                                        })" style="cursor:pointer; background:none; border:none; margin-left:10px;">🗑️</button>
                                    </td>
                                </tr>
                            `
                              )
                              .join("")}
                        </tbody>
                    </table>
                </div>`;
    } catch (error) {
      console.error("❌ Falha ao renderizar aba de equipes:", error);
    }
  },
  // =============/================
  // 5 - FIM: renderizarAbaEquipes
  // =============/================

  // =============/================
  // 5 - INÍCIO: abrirModalEquipe
  // =============/================
  // Argumentos: equipe (Object|null)
  // Descrição: Abre caixa de diálogo para criação ou edição de equipes.
  abrirModalEquipe: function (equipe = null) {
    const nome = equipe ? equipe.nome_equipe : "";
    const id = equipe ? equipe.id : null;
    const tipo = equipe ? equipe.tipo_atuacao : "Ambos";

    const novoNome = prompt("Nome da Equipe:", nome);
    if (novoNome) {
      const novoTipo = prompt("Tipo (Leitura, Canto ou Ambos):", tipo);
      window.api
        .salvarEquipe({ id, nome: novoNome, tipo: novoTipo })
        .then(() => {
          alert("✅ Registro salvo com sucesso!");
          this.renderizarAbaEquipes();
        })
        .catch((err) => alert("❌ Erro ao salvar: " + err.message));
    }
  },
  // =============/================
  // 5 - FIM: abrirModalEquipe
  // =============/================

  // =============/================
  // 5 - INÍCIO: deletarEquipe
  // =============/================
  // Argumentos: id (Integer)
  // Descrição: Remove uma equipe do banco após confirmação.
  deletarEquipe: async function (id) {
    if (confirm("⚠️ Tem certeza? Isso pode afetar escalas existentes.")) {
      try {
        await window.api.excluirEquipe(id);
        this.renderizarAbaEquipes();
      } catch (err) {
        alert("❌ Erro ao excluir: " + err.message);
      }
    }
  },
  // =============/================
  // 5 - FIM: deletarEquipe
  // =============/================

  // ==========================================================================
  // 6. MÉTODOS DE RENDERIZAÇÃO GRÁFICA E STATUS
  // ==========================================================================

  // =============/================
  // 6 - INÍCIO: renderizarGraficoCarga
  // =============/================
  // Argumentos: Nenhum
  // Descrição: Gera o gráfico de barras de carga de trabalho para os próximos 7 dias.
  renderizarGraficoCarga: async function () {
    const container = document.getElementById("chart-week");
    if (!container) return;

    const eventos = await window.api.buscarEventosProximos(7);
    const diasSemana = ["DOM", "SEG", "TER", "QUA", "QUI", "SEX", "SÁB"];
    const densidade = [0, 0, 0, 0, 0, 0, 0];

    eventos.forEach((ev) => {
      const d = new Date(ev.data + "T12:00:00").getDay();
      densidade[d]++;
    });

    const max = Math.max(...densidade, 1);

    container.innerHTML = densidade
      .map((count, i) => {
        const perc = (count / max) * 100;
        return `
                <div class="chart-bar-group">
                    <div class="chart-bar" style="height: ${perc}%" title="${count} eventos"></div>
                    <div class="chart-label">${diasSemana[i]}</div>
                </div>`;
      })
      .join("");
  },
  // =============/================
  // 6 - FIM: renderizarGraficoCarga
  // =============/================

  // =============/================
  // 6 - INÍCIO: renderizarListaRecentes
  // =============/================
  // Argumentos: Nenhum
  // Descrição: Lista os compromissos mais recentes e seu status atual.
  renderizarListaRecentes: async function () {
    const container = document.getElementById("admin-recent-list");
    if (!container) return;

    try {
      const eventos = await window.api.buscarEventosRecentes(5);

      container.innerHTML = eventos
        .map((ev) => {
          const statusClass =
            ev.status === "pendente" ? "status-wait" : "status-ok";
          const dataObj = new Date(ev.data + "T12:00:00");
          const dia = dataObj.getDate().toString().padStart(2, "0");
          const mes = dataObj
            .toLocaleString("pt-BR", { month: "short" })
            .toUpperCase()
            .replace(".", "");

          return `
                    <div class="list-item">
                        <div class="list-date"><span>${dia}</span><small>${mes}</small></div>
                        <div class="list-content">
                            <div class="list-title">${ev.titulo}</div>
                            <div class="list-meta">${ev.tipo_compromisso.toUpperCase()} • ${
            ev.local || "Paróquia"
          }</div>
                        </div>
                        <div class="status-dot ${statusClass}" title="Status: ${
            ev.status
          }"></div>
                    </div>`;
        })
        .join("");
    } catch (error) {
      console.error("❌ Erro ao renderizar lista recente:", error);
    }
  },
  // =============/================
  // 6 - FIM: renderizarListaRecentes
  // =============/================

  // =============/================
  // 6 - INÍCIO: processarStatus
  // =============/================
  // Argumentos: id (UUID), novoStatus (String)
  // Descrição: Aprova ou rejeita eventos pendentes.
  processarStatus: async function (id, novoStatus) {
    if (!confirm(`Deseja definir este evento como ${novoStatus}?`)) return;

    try {
      await window.api.atualizarStatusEvento(id, novoStatus);
      await this.atualizarVisaoGeral();
      alert("✅ Status atualizado!");
    } catch (err) {
      alert("❌ Falha na atualização.");
    }
  },
  // =============/================
  // 6 - FIM: processarStatus
  // =============/================
};

// Inicialização segura via DOMContentLoaded
document.addEventListener("DOMContentLoaded", () =>
  window.DashboardController.init()
);
