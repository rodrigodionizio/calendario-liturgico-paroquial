/*
 * ARQUIVO: dashboard.js
 * DESCRIÇÃO: Controlador do Painel Administrativo (Métricas e Aprovações)
 * PROJETO: Liturgia Paroquial 2026
 * AUTOR: Rodrigo & Dev AI (Senior Specialist Approach)
 * VERSÃO: 4.0
 */

// ==========================================================================
// 1. ESTADO E CONFIGURAÇÃO
// ==========================================================================
const Dashboard = {
  dadosStats: null,
  abaAtiva: "visao-geral",

  // ==========================================================================
  // 2. INICIALIZAÇÃO E SEGURANÇA
  // ==========================================================================
  init: async function () {
    console.log("🛡️ Dashboard: Validando acesso...");

    // 2.1. Verifica se o usuário está autenticado
    const session = await window.api.checkSession();
    if (!session) {
      console.warn("⚠️ Acesso negado. Redirecionando...");
      window.location.href = "admin.html";
      return;
    }

    // 2.2. Prepara a Interface
    document.body.classList.add("auth-ok");
    document.getElementById("admin-nome").textContent = session.user.email
      .split("@")[0]
      .toUpperCase();

    // 2.3. Carrega os dados iniciais
    await this.carregarDadosIniciais();
    this.configurarNavegacao();

    console.log("✅ Dashboard pronto.");
  },

  // ==========================================================================
  // 3. CARREGAMENTO DE DADOS (KPIs e GRÁFICOS)
  // ==========================================================================
  carregarDadosIniciais: async function () {
    try {
      // Busca estatísticas consolidadas da API
      this.dadosStats = await window.api.buscarEstatisticasDashboard();

      // Atualiza os Cards de KPI
      this.renderizarKPIs();

      // Renderiza o Gráfico de Carga Semanal
      await this.renderizarGraficoSemanal();

      // Busca e renderiza o resumo de pendências
      await this.renderizarListaAprovacao();
    } catch (error) {
      console.error("❌ Erro ao carregar Dashboard:", error);
    }
  },

  renderizarKPIs: function () {
    const container = document.getElementById("kpi-container");
    if (!container || !this.dadosStats) return;

    const s = this.dadosStats;
    container.innerHTML = `
            <div class="kpi-card">
                <div class="kpi-value">${s.semana}</div>
                <div class="kpi-label">Eventos nos Próximos 7 Dias</div>
            </div>
            <div class="kpi-card" style="border-left-color: var(--cor-cereja);">
                <div class="kpi-value">${s.pendentes}</div>
                <div class="kpi-label">Aguardando Aprovação</div>
            </div>
            <div class="kpi-card" style="border-left-color: #2E7D32;">
                <div class="kpi-value">${s.mural}</div>
                <div class="kpi-label">Destaques no Mural</div>
            </div>
            <div class="kpi-card" style="border-left-color: #2196F3;">
                <div class="kpi-value">${s.equipes}</div>
                <div class="kpi-label">Equipes Ativas</div>
            </div>
        `;

    // Atualiza a badge de notificações na sidebar
    const badge = document.getElementById("badge-pendentes");
    if (badge) badge.textContent = s.pendentes;
  },

  // ==========================================================================
  // 4. MOTOR DO GRÁFICO (CSS BARS)
  // ==========================================================================
  renderizarGraficoSemanal: async function () {
    const chartArea = document.getElementById("admin-chart");
    if (!chartArea) return;

    const eventosSemana = await window.api.buscarEventosProximos(7);
    const diasSemana = ["DOM", "SEG", "TER", "QUA", "QUI", "SEX", "SÁB"];
    const contagemPorDia = [0, 0, 0, 0, 0, 0, 0];

    // Processa a carga por dia da semana
    eventosSemana.forEach((ev) => {
      const data = new Date(ev.data + "T12:00:00");
      contagemPorDia[data.getDay()]++;
    });

    // Define a altura máxima para escala do gráfico
    const maxEventos = Math.max(...contagemPorDia, 1);

    chartArea.innerHTML = contagemPorDia
      .map((total, i) => {
        const alturaPecent = (total / maxEventos) * 100;
        return `
                <div class="chart-bar-group">
                    <div class="chart-bar" style="height: ${alturaPecent}%" title="${total} eventos"></div>
                    <div class="chart-label">${diasSemana[i]}</div>
                </div>
            `;
      })
      .join("");
  },

  // ==========================================================================
  // 5. GESTÃO DE APROVAÇÕES
  // ==========================================================================
  renderizarListaAprovacao: async function () {
    const resumoDiv = document.getElementById("lista-pendentes-resumo");
    const listaCompletaDiv = document.getElementById(
      "lista-aprovacao-completa"
    );

    // Busca eventos pendentes no banco
    const { data: pendentes, error } = await window.api.client
      .from("eventos_base")
      .select("*")
      .eq("status", "pendente")
      .order("data", { ascending: true });

    if (error || !pendentes || pendentes.length === 0) {
      const msgVazio =
        '<div style="color:#999; font-style:italic; padding:20px; text-align:center;">Nenhum compromisso aguardando aprovação.</div>';
      if (resumoDiv) resumoDiv.innerHTML = msgVazio;
      if (listaCompletaDiv) listaCompletaDiv.innerHTML = msgVazio;
      return;
    }

    // Renderiza no Resumo (Visão Geral)
    if (resumoDiv) {
      resumoDiv.innerHTML = pendentes
        .slice(0, 3)
        .map((p) => this.gerarHtmlCardAprovacao(p))
        .join("");
    }

    // Renderiza na Aba Completa (Aprovações)
    if (listaCompletaDiv) {
      listaCompletaDiv.innerHTML = pendentes
        .map((p) => this.gerarHtmlCardAprovacao(p, true))
        .join("");
    }
  },

  gerarHtmlCardAprovacao: function (evento, modoCompleto = false) {
    const dataFormatada = new Date(
      evento.data + "T12:00:00"
    ).toLocaleDateString("pt-BR", { day: "2-digit", month: "short" });
    const dia = dataFormatada.split(" de ")[0];
    const mes =
      dataFormatada.split(" de ")[1]?.substring(0, 3).toUpperCase() || "";

    return `
            <div class="list-item">
                <div class="list-date"><span>${dia}</span><small>${mes}</small></div>
                <div class="list-content">
                    <div class="list-title">${evento.titulo}</div>
                    <div class="list-meta">Sugerido por: ${
                      evento.responsavel || "Pastoral"
                    } • ${evento.tipo_compromisso}</div>
                </div>
                <div style="display:flex; gap:10px; align-items:center;">
                    <button onclick="Dashboard.processarStatus('${
                      evento.id
                    }', 'aprovado')" title="Aprovar" style="cursor:pointer; background:#e8f5e9; border:none; color:#2e7d32; padding:5px; border-radius:4px;">✅</button>
                    <button onclick="Dashboard.processarStatus('${
                      evento.id
                    }', 'rejeitado')" title="Rejeitar" style="cursor:pointer; background:#ffebee; border:none; color:#c62828; padding:5px; border-radius:4px;">❌</button>
                </div>
            </div>
        `;
  },

  processarStatus: async function (id, novoStatus) {
    if (!confirm(`Deseja definir este evento como ${novoStatus}?`)) return;

    try {
      await window.api.atualizarStatusEvento(id, novoStatus);
      alert(`Sucesso! Evento ${novoStatus}.`);
      this.carregarDadosIniciais(); // Recarrega tudo para atualizar KPIs
    } catch (err) {
      alert("Erro ao atualizar status.");
    }
  },

  // ==========================================================================
  // 6. NAVEGAÇÃO DE ABAS
  // ==========================================================================
  configurarNavegacao: function () {
    const menuItems = document.querySelectorAll(".menu-item[data-tab]");
    const tituloPagina = document.getElementById("tab-title");

    menuItems.forEach((item) => {
      item.addEventListener("click", () => {
        const targetTab = item.getAttribute("data-tab");

        // Remove ativos
        document
          .querySelectorAll(".menu-item")
          .forEach((i) => i.classList.remove("active"));
        document
          .querySelectorAll(".tab-content")
          .forEach((t) => t.classList.remove("active"));

        // Ativa alvo
        item.classList.add("active");
        document.getElementById(`tab-${targetTab}`).classList.add("active");

        // Atualiza Título
        tituloPagina.textContent = item.textContent
          .replace(/[^\w\sà-úÀ-Ú]/gi, "")
          .trim();

        this.abaAtiva = targetTab;
      });
    });
  },
};

// Inicializa o Dashboard ao carregar o script
document.addEventListener("DOMContentLoaded", () => Dashboard.init());
