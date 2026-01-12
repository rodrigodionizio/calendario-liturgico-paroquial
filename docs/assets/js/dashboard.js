/*
 * ARQUIVO: dashboard.js
 * DESCRIÇÃO: Controlador do Painel Administrativo e Gestão de Métricas
 * PROJETO: Liturgia Paroquial 2026
 * AUTOR: Rodrigo & Dev AI (Senior Specialist Approach)
 * VERSÃO: 3.0
 */

/**
 * @namespace Dashboard
 * @description Centraliza a lógica de negócios e orquestração da área administrativa.
 */
window.Dashboard = {
  // ==========================================================================
  // 1. INICIALIZAÇÃO E CONTROLE DE ACESSO
  // ==========================================================================
  /* INÍCIO: Método init */
  init: async function () {
    console.log("🛠️ Dashboard: Sincronizando sistema...");

    // 1.1. Validação de Sessão Administrativa
    const session = await window.api.checkSession();
    if (!session) {
      window.location.href = "admin.html";
      return;
    }

    // 1.2. Exibição de Identidade do Usuário
    const userEmail = session.user.email;
    document.getElementById("admin-nome").textContent = userEmail
      .split("@")[0]
      .toUpperCase();

    // 1.3. Carregamento da Visão Geral (Padrão)
    await this.atualizarEstatisticas();

    // 1.4. Ativação dos Listeners de Tab (Alternância de Contexto)
    this.configurarTabs();
  },
  /* FIM: Método init */

  // ==========================================================================
  // 2. GESTÃO DE MÉTRICAS E KPIs
  // ==========================================================================
  /* INÍCIO: Método atualizarEstatisticas */
  atualizarEstatisticas: async function () {
    try {
      // Chamada à API para contagem consolidada
      const stats = await window.api.buscarEstatisticasDashboard();

      const container = document.getElementById("kpi-container");
      if (container) {
        container.innerHTML = `
                    <div class="kpi-card">
                        <div class="kpi-value">${stats.semana}</div>
                        <div class="kpi-label">Eventos / Próximos 7 Dias</div>
                    </div>
                    <div class="kpi-card" style="border-left-color: var(--cor-cereja);">
                        <div class="kpi-value">${stats.pendentes}</div>
                        <div class="kpi-label">Aguardando Aprovação</div>
                    </div>
                    <div class="kpi-card" style="border-left-color: #2E7D32;">
                        <div class="kpi-value">${stats.mural}</div>
                        <div class="kpi-label">Destaques no Mural</div>
                    </div>
                    <div class="kpi-card" style="border-left-color: #2196F3;">
                        <div class="kpi-value">${stats.equipes}</div>
                        <div class="kpi-label">Equipes Cadastradas</div>
                    </div>
                `;
      }

      // Renderiza o gráfico visual de barras
      await this.renderizarGraficoCarga();
    } catch (error) {
      console.error("❌ Falha ao processar estatísticas:", error);
    }
  },
  /* FIM: Método atualizarEstatisticas */

  // ==========================================================================
  // 3. ORQUESTRAÇÃO DE ABAS E MOTOR DE CALENDÁRIO
  // ==========================================================================
  /* INÍCIO: Método configurarTabs */
  configurarTabs: function () {
    const menuItems = document.querySelectorAll(".menu-item[data-tab]");

    menuItems.forEach((item) => {
      item.onclick = async () => {
        const tabId = item.getAttribute("data-tab");

        // 3.1. Toggle Visual
        document
          .querySelectorAll(".menu-item, .tab-content")
          .forEach((el) => el.classList.remove("active"));
        item.classList.add("active");
        document.getElementById(`tab-${tabId}`).classList.add("active");

        // 3.2. Lógica de Ativação por Contexto
        if (tabId === "agenda-total") {
          // Inicializa o Motor UI em modo ADMIN dentro da aba específica
          await window.CalendarUI.init({
            isAdmin: true,
            mostrarPendentes: true, // Admin vê tudo
            containerGrid: "#tab-agenda-total .calendar-wrapper",
          });
        } else if (tabId === "visao-geral") {
          await this.atualizarEstatisticas();
        }
      };
    });
  },
  /* FIM: Método configurarTabs */

  // ==========================================================================
  // 4. MÉTODOS DE RENDERIZAÇÃO DE GRÁFICOS
  // ==========================================================================
  /* INÍCIO: Método renderizarGraficoCarga */
  renderizarGraficoCarga: async function () {
    const chartDiv = document.getElementById("admin-chart");
    if (!chartDiv) return;

    const eventos = await window.api.buscarEventosProximos(7);
    const dias = ["DOM", "SEG", "TER", "QUA", "QUI", "SEX", "SÁB"];
    const contagem = [0, 0, 0, 0, 0, 0, 0];

    eventos.forEach((ev) => {
      const d = new Date(ev.data + "T12:00:00").getDay();
      contagem[d]++;
    });

    const max = Math.max(...contagem, 1);
    chartDiv.innerHTML = contagem
      .map(
        (valor, i) => `
            <div class="chart-bar-group">
                <div class="chart-bar" style="height: ${
                  (valor / max) * 100
                }%" title="${valor} eventos"></div>
                <div class="chart-label">${dias[i]}</div>
            </div>
        `
      )
      .join("");
  },
  /* FIM: Método renderizarGraficoCarga */
};

// Inicialização automática após carregamento do DOM
document.addEventListener("DOMContentLoaded", () => window.Dashboard.init());
