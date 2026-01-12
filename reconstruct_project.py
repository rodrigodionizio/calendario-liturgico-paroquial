import os

def write_file(path, content):
    try:
        os.makedirs(os.path.dirname(path), exist_ok=True)
        with open(path, "w", encoding="utf-8") as f:
            f.write(content.strip())
        print(f"✅ Gerado: {path}")
    except Exception as e:
        print(f"❌ Erro ao gerar {path}: {e}")

def main():
    print("🚧 Iniciando reconstrução da infraestrutura do projeto...")
    
    # 1. Estrutura de Diretórios
    dirs = [
        "backend_automacao", 
        "database", 
        "docs", 
        "docs/assets", 
        "docs/assets/css", 
        "docs/assets/js", 
        "docs/assets/fonts", 
        "docs/assets/img"
    ]
    
    for d in dirs:
        os.makedirs(d, exist_ok=True)
        print(f"📂 Diretório verificado: {d}")

    # =========================================================================
    # 2. ARQUIVOS PEQUENOS E CONFIGURAÇÃO
    # =========================================================================
    
    # .gitignore
    write_file(".gitignore", r"""
# Python
__pycache__/
*.py[cod]
venv/
.env

# OS
.DS_Store
thumbs.db

# IDEs
.vscode/
.idea/
""")

    # README.md
    write_file("README.md", r"""
# Calendário Litúrgico Paroquial

Sistema WebApp para gestão e divulgação de escalas litúrgicas paroquiais.

## Arquitetura
- **Frontend:** HTML5, CSS3, JavaScript (Hospedado no GitHub Pages /docs)
- **Backend/DBA:** PostgreSQL (Supabase) + Scripts de Automação Python
- **Ano Litúrgico Base:** 2026 (Ano A / Mateus)

## Como Rodar
1. Clone o repositório.
2. Execute os scripts em `backend_automacao/` para atualizar as datas.
3. O site é servido estaticamente na pasta `docs/`.

---
*Projeto desenvolvido com respeito à Doutrina Católica e ao Sagrado Magistério.*
""")

    # database/schema.sql
    write_file("database/schema.sql", r"""
-- Tabela de Referência Litúrgica
CREATE TABLE liturgia_diaria (
    id SERIAL PRIMARY KEY,
    data_calendario DATE UNIQUE NOT NULL,
    semana_ordinal INT,
    dia_semana VARCHAR(20),
    tempo_liturgico VARCHAR(50),
    cor VARCHAR(20),
    santo_festa VARCHAR(150),
    grau VARCHAR(50)
);

-- Tabela de Escalas da Paróquia
CREATE TABLE escalas (
    id SERIAL PRIMARY KEY,
    liturgia_id INT REFERENCES liturgia_diaria(id),
    hora TIME NOT NULL,
    equipe_leitura VARCHAR(100),
    equipe_canto VARCHAR(100),
    responsavel_contato VARCHAR(50)
);
""")

    # docs/assets/css/dashboard.css
    write_file("docs/assets/css/dashboard.css", r"""
/* ARQUIVO: dashboard.css - Extensão do Design System Principal */

:root {
  --cor-fundo-admin: #f5f7fa;
  --sidebar-width: 260px;
}

.admin-body {
  background-color: var(--cor-fundo-admin);
  color: var(--text-main);
  margin: 0;
  padding: 0;
  display: flex;
  height: 100vh;
  overflow: hidden;
}

/* SIDEBAR */
.admin-sidebar {
  width: var(--sidebar-width);
  background-color: var(--cor-vinho);
  color: white;
  display: flex;
  flex-direction: column;
  box-shadow: 4px 0 10px rgba(0, 0, 0, 0.1);
}

.admin-logo {
  padding: 30px 20px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
  font-size: 1.2rem;
  font-weight: bold;
  letter-spacing: 1px;
  font-family: "Neulis", sans-serif;
}

.menu-item {
  padding: 15px 25px;
  cursor: pointer;
  text-decoration: none;
  color: white;
  display: flex;
  align-items: center;
  gap: 15px;
  transition: 0.2s;
  opacity: 0.8;
  font-size: 0.95rem;
  font-family: "AntennaCond", sans-serif;
}

.menu-item:hover,
.menu-item.active {
  background-color: rgba(255, 255, 255, 0.1);
  opacity: 1;
  border-left: 4px solid var(--cor-dourado);
}

.menu-badge {
  background: var(--cor-cereja);
  color: white;
  font-size: 0.7rem;
  padding: 2px 6px;
  border-radius: 10px;
  margin-left: auto;
}

/* MAIN */
.admin-main {
  flex: 1;
  padding: 30px;
  overflow-y: auto;
}

.page-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 30px;
}
.page-title {
  font-size: 1.8rem;
  font-weight: 900;
  color: var(--cor-vinho);
  font-family: "Neulis", sans-serif;
}
.user-profile {
  display: flex;
  align-items: center;
  gap: 10px;
  font-weight: bold;
}
.avatar {
  width: 40px;
  height: 40px;
  background: #ddd;
  border-radius: 50%;
}

/* KPI CARDS */
.kpi-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
  gap: 20px;
  margin-bottom: 30px;
}
.kpi-card {
  background: white;
  padding: 20px;
  border-radius: 12px;
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.05);
  border-left: 4px solid var(--cor-dourado);
}
.kpi-value {
  font-size: 2rem;
  font-weight: 900;
  color: var(--cor-vinho);
  font-family: "Neulis", sans-serif;
}
.kpi-label {
  font-size: 0.85rem;
  color: #666;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

/* SEÇÕES */
.dashboard-split {
  display: grid;
  grid-template-columns: 2fr 1fr;
  gap: 25px;
}

.panel {
  background: white;
  border-radius: 12px;
  padding: 25px;
  box-shadow: 0 4px 15px rgba(0, 0, 0, 0.05);
}
.panel-title {
  font-size: 1.1rem;
  font-weight: bold;
  margin-bottom: 20px;
  color: #333;
}

/* GRÁFICO */
.chart-container {
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  height: 200px;
  padding-top: 20px;
  border-bottom: 1px solid #eee;
}
.chart-bar-group {
  text-align: center;
  width: 100%;
  margin: 0 5px;
}
.chart-bar {
  width: 100%;
  background-color: var(--cor-vinho);
  opacity: 0.8;
  border-radius: 4px 4px 0 0;
  transition: height 0.6s ease-out;
  min-height: 4px;
}
.chart-label {
  margin-top: 10px;
  font-size: 0.7rem;
  color: #666;
  font-weight: bold;
}

/* LISTA */
.list-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 0;
  border-bottom: 1px solid #eee;
}
.list-date {
  font-weight: bold;
  color: var(--cor-vinho);
  display: flex;
  flex-direction: column;
  align-items: center;
  background: #f9f9f9;
  padding: 5px 10px;
  border-radius: 6px;
  min-width: 40px;
}
.list-date span {
  font-size: 1.1rem;
}
.list-date small {
  font-size: 0.65rem;
  text-transform: uppercase;
}

.list-content {
  flex: 1;
  margin-left: 15px;
}
.list-title {
  font-weight: bold;
  font-size: 0.95rem;
}
.list-meta {
  font-size: 0.8rem;
  color: #777;
}

.status-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: #ccc;
}
.status-ok {
  background: #2e7d32;
}
.status-wait {
  background: var(--cor-dourado);
}

.btn-ver-todas {
  padding: 8px 15px;
  background: var(--cor-vinho);
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-family: "AntennaCond", sans-serif;
  font-weight: bold;
}
""")

    # docs/admin.html
    write_file("docs/admin.html", r"""
<!DOCTYPE html>
<html lang="pt-br">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Acesso Administrativo | Paróquia Bom Jesus</title>

    <!-- Dependências -->
    <script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2"></script>
    <link rel="stylesheet" href="assets/css/styles.css" />

    <style>
      /* Estilos de Layout de Acesso */
      body {
        display: flex;
        align-items: center;
        justify-content: center;
        background-color: var(--cor-vinho);
        height: 100vh;
        margin: 0;
      }
      .login-card {
        background: #fff;
        padding: 40px;
        border-radius: 12px;
        width: 100%;
        max-width: 400px;
        text-align: center;
        box-shadow: 0 10px 30px rgba(0, 0, 0, 0.3);
      }
      .login-logo {
        max-width: 150px;
        margin-bottom: 20px;
      }
      input {
        width: 100%;
        padding: 12px;
        margin-bottom: 15px;
        border: 1px solid #ddd;
        border-radius: 6px;
        box-sizing: border-box;
        font-family: "AntennaCond", sans-serif;
      }
      button {
        width: 100%;
        padding: 12px;
        background: var(--cor-cereja);
        color: #fff;
        border: none;
        border-radius: 6px;
        font-weight: bold;
        cursor: pointer;
        transition: 0.3s;
        font-family: "Neulis", sans-serif;
      }
      button:hover {
        background: #a41d31;
        transform: translateY(-2px);
      }
      .msg {
        margin-top: 15px;
        font-size: 0.9rem;
        min-height: 20px;
      }
    </style>
  </head>
  <body>
    <div class="login-card">
      <img
        src="assets/img/logo-paroquia-colorida.png"
        alt="Logo Paróquia"
        class="login-logo"
      />
      <h2
        style="
          color: var(--cor-vinho);
          margin-bottom: 20px;
          font-family: 'Neulis', sans-serif;
        "
      >
        Acesso à Sacristia Digital
      </h2>

      <!-- Formulário de Autenticação -->
      <form id="loginForm">
        <input
          type="email"
          id="email"
          placeholder="E-mail do Coordenador"
          required
        />
        <input type="password" id="senha" placeholder="Sua Senha" required />
        <button type="submit" id="btn-entrar">ENTRAR NO PAINEL</button>
      </form>

      <div id="msg" class="msg"></div>

      <div
        style="margin-top: 25px; border-top: 1px solid #eee; padding-top: 15px"
      >
        <a
          href="index.html"
          style="color: #888; text-decoration: none; font-size: 0.8rem"
          >← Voltar ao Calendário Público</a
        >
      </div>
    </div>

    <!-- Módulos de Lógica -->
    <script src="assets/js/api.js"></script>

    <script>
      /*
       * LOGICA DE ACESSO ADMINISTRATIVO
       */

      const form = document.getElementById("loginForm");
      const msg = document.getElementById("msg");
      const btn = document.getElementById("btn-entrar");

      // [INÍCIO: Verificação de Sessão Ativa]
      // Se o usuário já estiver logado, não precisa logar de novo.
      window.addEventListener("load", async () => {
        const session = await window.api.checkSession();
        if (session) {
          window.location.href = "dashboard.html";
        }
      });
      // [FIM: Verificação]

      // [INÍCIO: Processamento do Login]
      form.addEventListener("submit", async (e) => {
        e.preventDefault();

        // UI Feedback
        msg.style.color = "#666";
        msg.textContent = "Validando credenciais...";
        btn.disabled = true;
        btn.style.opacity = "0.7";

        const email = document.getElementById("email").value;
        const password = document.getElementById("senha").value;

        try {
          // Chamada de Autenticação via API/Supabase
          const { data, error } =
            await window.api.client.auth.signInWithPassword({
              email: email,
              password: password,
            });

          if (error) throw error;

          // Sucesso: Redirecionamento para o Dashboard (O Cérebro do Sistema)
          msg.style.color = "green";
          msg.textContent = "Sucesso! Abrindo painel...";

          setTimeout(() => {
            window.location.href = "dashboard.html";
          }, 800);
        } catch (err) {
          msg.style.color = "red";
          msg.textContent =
            "Erro: " +
            (err.message === "Invalid login credentials"
              ? "E-mail ou senha incorretos."
              : err.message);
          btn.disabled = false;
          btn.style.opacity = "1";
        }
      });
      // [FIM: Processamento]
    </script>
  </body>
</html>
""")

    # docs/dashboard.html
    write_file("docs/dashboard.html", r"""
<!DOCTYPE html>
<html lang="pt-br">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Painel de Gestão | Paróquia Senhor Bom Jesus</title>

    <!-- Supabase Lib -->
    <script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2"></script>

    <!-- Estilos: Reuso do global + Estilo específico do painel -->
    <link rel="stylesheet" href="assets/css/styles.css" />
    <link rel="stylesheet" href="assets/css/dashboard.css" />
  </head>
  <body class="admin-body">
    <!-- [INÍCIO: Sidebar Administrativa] -->
    <nav class="admin-sidebar">
      <div class="admin-logo">⛪ SACRISTIA DIGITAL</div>

      <div class="menu-item active" data-tab="visao-geral">📊 Visão Geral</div>
      <div class="menu-item" data-tab="agenda-total">📅 Agenda Total</div>
      <div class="menu-item" onclick="alert('Módulo de Equipes em breve')">
        👥 Equipes
      </div>

      <!-- Link para retorno ao site público -->
      <a
        href="index.html"
        class="menu-item"
        style="margin-top: 20px; border-top: 1px solid rgba(255, 255, 255, 0.1)"
      >
        🌐 Ver Site Público
      </a>

      <div
        class="menu-item"
        style="margin-top: auto; color: #ff9999"
        onclick="window.api.logout()"
      >
        🚪 Sair do Sistema
      </div>
    </nav>
    <!-- [FIM: Sidebar] -->

    <main class="admin-main">
      <!-- [INÍCIO: ABA 1 - VISÃO GERAL] -->
      <section id="tab-visao-geral" class="tab-content active">
        <header class="page-header">
          <h1 class="page-title">Painel de Controle</h1>
          <div class="user-profile">
            Olá, <span id="admin-nome">Coordenador</span>
            <div class="avatar"></div>
          </div>
        </header>

        <!-- Grid de KPIs (Métricas de Desempenho) -->
        <div class="kpi-grid" id="kpi-container">
          <!-- Preenchido via dashboard.js -->
        </div>

        <div class="dashboard-split">
          <!-- Gráfico de Atividades -->
          <div class="panel">
            <h3 class="panel-title">Carga de Trabalho (Próximos 7 Dias)</h3>
            <div class="chart-container" id="admin-chart"></div>
          </div>
          <!-- Lista de Registros Recentes -->
          <div class="panel">
            <h3 class="panel-title">Atividades Recentes</h3>
            <div id="admin-recent-list"></div>
          </div>
        </div>
      </section>
      <!-- [FIM: ABA 1] -->

      <!-- [INÍCIO: ABA 2 - AGENDA TOTAL (GESTÃO)] -->
      <section id="tab-agenda-total" class="tab-content">
        <header class="page-header">
          <h1 class="page-title">Gerenciar Agenda Completa</h1>
          <div class="nav-buttons">
            <button
              class="btn-nav"
              id="prev-btn"
              onclick="window.CalendarUI.mudarMes(-1)"
            >
              &lt;
            </button>
            <button
              class="btn-nav"
              id="today-btn"
              onclick="window.CalendarUI.irParaHoje()"
            >
              Hoje
            </button>
            <button
              class="btn-nav"
              id="next-btn"
              onclick="window.CalendarUI.mudarMes(1)"
            >
              &gt;
            </button>
          </div>
        </header>

        <h2
          class="month-name"
          style="margin-bottom: 20px; color: var(--cor-vinho)"
        ></h2>

        <!-- Container onde o Motor CalendarUI injetará o Grid Editável -->
        <div class="calendar-wrapper"></div>
      </section>
      <!-- [FIM: ABA 2] -->
    </main>

    <!-- Overlay de Modal para Edição (Reutilizado do motor principal) -->
    <div
      class="modal-overlay"
      id="modalOverlay"
      onclick="window.CalendarUI.fecharModal(event)"
    >
      <div id="modalContent"></div>
    </div>

    <!-- Scripts em Ordem de Dependência -->
    <script src="assets/js/api.js"></script>
    <script src="assets/js/app.js"></script>
    <!-- Motor de Interface -->
    <script src="assets/js/dashboard.js"></script>
    <!-- Controlador do Dashboard -->
  </body>
</html>
""")

    # docs/assets/js/dashboard.js
    write_file("docs/assets/js/dashboard.js", r"""
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
""")

    # docs/assets/js/api.js
    write_file("docs/assets/js/api.js", r"""
/*
 * ARQUIVO: api.js
 * DESCRIÇÃO: Camada de Conexão com Supabase (Versão 3.0 - Dashboard Ready)
 * PROJETO: Liturgia Paroquial 2026
 * AUTOR: Rodrigo & Dev AI (Senior Specialist approach)
 * VERSÃO: 3.0
 */

const SUPABASE_URL = "https://gmfmebnodmtozpzhlgvk.supabase.co";
const SUPABASE_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdtZm1lYm5vZG10b3pwemhlZ3ZrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njc5NzU3MzIsImV4cCI6MjA4MzU1MTczMn0.29rhpFJ0I-ywPbHb4sgcdmNHaM_rJidCeaV3Cfos6Ro";

const _supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

window.api = {
  client: _supabaseClient,

  // ==========================================================================
  // 1. BUSCA DE DADOS (CALENDÁRIO)
  // ==========================================================================
  /* INÍCIO: Método buscarEventos */
  buscarEventos: async function (ano, mes, apenasAprovados = true) {
    const mesStr = String(mes).padStart(2, "0");
    const inicio = `${ano}-${mesStr}-01`;
    const ultimoDia = new Date(ano, mes, 0).getDate();
    const fim = `${ano}-${mesStr}-${ultimoDia}`;

    let query = _supabaseClient
      .from("eventos_base")
      .select(
        `*, liturgia_cores(hex_code), escalas(id, hora_celebracao, equipe_leitura:equipes!equipe_leitura_id(id, nome_equipe), equipe_canto:equipes!equipe_canto_id(id, nome_equipe))`
      )
      .gte("data", inicio)
      .lte("data", fim);

    // Se estiver no site público, filtra apenas o que o coordenador aprovou
    if (apenasAprovados) {
      query = query.eq("status", "aprovado");
    }

    const { data, error } = await query.order("data", { ascending: true });

    if (error) {
      console.error("❌ Erro na busca de eventos:", error);
      return [];
    }
    return data;
  },
  /* FIM: Método buscarEventos */

  // ==========================================================================
  // 2. MÉTODOS EXCLUSIVOS DO DASHBOARD (ESTATÍSTICAS)
  // ==========================================================================
  /* INÍCIO: Método buscarEstatisticasDashboard */
  buscarEstatisticasDashboard: async function () {
    const hoje = new Date().toISOString().split("T")[0];

    // Execução paralela para máxima performance
    const [eventos, pendentes, mural, equipes] = await Promise.all([
      _supabaseClient
        .from("eventos_base")
        .select("id", { count: "exact", head: true })
        .gte("data", hoje),
      _supabaseClient
        .from("eventos_base")
        .select("id", { count: "exact", head: true })
        .eq("status", "pendente"),
      _supabaseClient
        .from("eventos_base")
        .select("id", { count: "exact", head: true })
        .eq("mural_destaque", true)
        .gte("data", hoje),
      _supabaseClient
        .from("equipes")
        .select("id", { count: "exact", head: true }),
    ]);

    return {
      semana: eventos.count || 0,
      pendentes: pendentes.count || 0,
      mural: mural.count || 0,
      equipes: equipes.count || 0,
    };
  },
  /* FIM: Método buscarEstatisticasDashboard */

  /* INÍCIO: Métodos de Listagem para Gráficos */
  buscarEventosProximos: async function (dias) {
    const hoje = new Date().toISOString().split("T")[0];
    const { data } = await _supabaseClient
      .from("eventos_base")
      .select("data")
      .gte("data", hoje)
      .order("data", { ascending: true });
    return data || [];
  },

  buscarEventosRecentes: async function (limite) {
    const { data } = await _supabaseClient
      .from("eventos_base")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(limite);
    return data || [];
  },
  /* FIM: Métodos de Listagem para Gráficos */

  // ==========================================================================
  // 3. PERSISTÊNCIA E GESTÃO
  // ==========================================================================
  /* INÍCIO: Método salvarEventoCompleto */
  salvarEventoCompleto: async function (eventoDados, escalasLista) {
    let eventoId = eventoDados.id;

    const payload = {
      ...eventoDados,
      // Garante que o status seja definido se for um novo evento
      status: eventoDados.status || "aprovado",
    };

    if (eventoId) {
      const { error } = await _supabaseClient
        .from("eventos_base")
        .update(payload)
        .eq("id", eventoId);
      if (error) throw error;
    } else {
      const { data, error } = await _supabaseClient
        .from("eventos_base")
        .insert(payload)
        .select();
      if (error) throw error;
      eventoId = data[0].id;
    }

    if (eventoDados.tipo_compromisso === "liturgia") {
      await _supabaseClient.from("escalas").delete().eq("evento_id", eventoId);
      if (escalasLista.length > 0) {
        const escalasComId = escalasLista.map((e) => ({
          ...e,
          evento_id: eventoId,
        }));
        await _supabaseClient.from("escalas").insert(escalasComId);
      }
    }
    return true;
  },
  /* FIM: Método salvarEventoCompleto */

  // Reuso dos demais métodos (listarEquipes, checkSession, logout)
  listarEquipes: async function () {
    const { data } = await _supabaseClient
      .from("equipes")
      .select("*")
      .order("nome_equipe");
    return data || [];
  },

  checkSession: async function () {
    const { data } = await _supabaseClient.auth.getSession();
    return data.session;
  },

  logout: async function () {
    await _supabaseClient.auth.signOut();
    window.location.href = "index.html";
  },
};
""")

    # database/function_create.sql
    write_file("database/function_create.sql", r"""
// filename: summarize-row/index.ts
// Assumptions:
// - Environment variables available: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, OPENAI_API_KEY, OPENAI_MODEL (optional)
// - If you don't want DB access, omit SUPABASE_SERVICE_ROLE_KEY and send { row: { ... } } in body.

import { createClient } from "npm:@supabase/supabase-js@2.30.0";

interface RequestBody {
  table?: string;
  id?: string | number;
  row?: Record<string, any>;
  options?: {
    model?: string;
    max_tokens?: number;
    temperature?: number;
  };
}

// Helper: safely stringify row for prompt (truncate large fields)
function prepareRowText(row: Record<string, any>, maxFieldLength = 2000) {
  const entries = Object.entries(row).map(([k, v]) => {
    let value: string;
    try {
      value =
        v === null || v === undefined
          ? ""
          : typeof v === "string"
          ? v
          : JSON.stringify(v);
    } catch {
      value = String(v);
    }
    if (value.length > maxFieldLength) value = value.slice(0, maxFieldLength) + "…[truncated]";
    return `${k}: ${value}`;
  });
  return entries.join("\n");
}

async function fetchRowFromDb(supabaseUrl: string, serviceKey: string, table: string, id: string | number) {
  const sb = createClient(supabaseUrl, serviceKey, { auth: { persistSession: false }});
  // Try primary key lookup assuming column named 'id'
  // For safety, use .from(table).select('*').eq('id', id).limit(1)
  const { data, error } = await sb.from(table).select("*").eq("id", id).limit(1).maybeSingle();
  if (error) throw error;
  return data;
}

async function callOpenAI(apiKey: string, prompt: string, model = "gpt-4o", temperature = 0.2, max_tokens = 350) {
  // Using OpenAI REST API v1/chat/completions (or v1/responses). Adjust model as needed.
  const url = "https://api.openai.com/v1/chat/completions";
  const body = {
    model,
    messages: [
      { role: "system", content: "You are a helpful assistant that summarizes database rows concisely." },
      { role: "user", content: prompt }
    ],
    temperature,
    max_tokens,
  };

  const res = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`OpenAI error: ${res.status} ${text}`);
  }

  const json = await res.json();
  // Extract content for chat completion
  const content = json?.choices?.[0]?.message?.content ?? json?.choices?.[0]?.text;
  return { content, meta: json };
}

console.info("Summarize Row function starting");

Deno.serve(async (req: Request) => {
  try {
    if (req.method !== "POST") {
      return new Response(JSON.stringify({ error: "Only POST allowed" }), { status: 405, headers: { "Content-Type": "application/json" }});
    }

    const env = {
      SUPABASE_URL: Deno.env.get("SUPABASE_URL") ?? "",
      SUPABASE_SERVICE_ROLE_KEY: Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      OPENAI_API_KEY: Deno.env.get("OPENAI_API_KEY") ?? "",
      OPENAI_MODEL: Deno.env.get("OPENAI_MODEL") ?? "gpt-4o",
    };

    if (!env.OPENAI_API_KEY) {
      return new Response(JSON.stringify({ error: "OPENAI_API_KEY not set in environment" }), { status: 500, headers: { "Content-Type": "application/json" }});
    }

    const payload: RequestBody = await req.json().catch(() => ({}));

    let row: Record<string, any> | null = null;

    if (payload.row) {
      row = payload.row;
    } else if (payload.table && payload.id !== undefined) {
      if (!env.SUPABASE_URL || !env.SUPABASE_SERVICE_ROLE_KEY) {
        return new Response(JSON.stringify({ error: "SUPABASE_SERVICE_ROLE_KEY and SUPABASE_URL required to fetch row from DB" }), { status: 400, headers: { "Content-Type": "application/json" }});
      }
      try {
        row = await fetchRowFromDb(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, payload.table, payload.id);
        if (!row) {
          return new Response(JSON.stringify({ error: "Row not found" }), { status: 404, headers: { "Content-Type": "application/json" }});
        }
      } catch (e) {
        console.error("DB fetch error:", e);
        return new Response(JSON.stringify({ error: "Failed to fetch row", details: String(e) }), { status: 500, headers: { "Content-Type": "application/json" }});
      }
    } else {
      return new Response(JSON.stringify({ error: "Request must include either { row: {...} } or { table: 't', id: 'x' }" }), { status: 400, headers: { "Content-Type": "application/json" }});
    }

    // Build prompt
    const model = payload.options?.model ?? env.OPENAI_MODEL;
    const temperature = payload.options?.temperature ?? 0.2;
    const max_tokens = payload.options?.max_tokens ?? 350;

    const rowText = prepareRowText(row);
    const prompt = [
      "Please provide a concise human-readable summary of the following database row.",
      "Include:",
      "- A one-sentence high-level summary.",
      "- Up to 3 bullets of important fields and their values (skip null/empty).",
      "- Any potential data issues (e.g., missing key fields, malformed values).",
      "",
      "Row data:",
      "```",
      rowText,
      "```",
      "",
      "Return the result as plain text. Keep it short (around 2-6 sentences)."
    ].join("\n");

    let ai;
    try {
      ai = await callOpenAI(env.OPENAI_API_KEY, prompt, model, temperature, max_tokens);
    } catch (e) {
      console.error("OpenAI call failed:", e);
      return new Response(JSON.stringify({ error: "OpenAI request failed", details: String(e) }), { status: 502, headers: { "Content-Type": "application/json" }});
    }

    const summary = (ai.content ?? "").trim();

    return new Response(JSON.stringify({ summary, model, raw: ai.meta }), { status: 200, headers: { "Content-Type": "application/json" }});
  } catch (err) {
    console.error("Unhandled error:", err);
    return new Response(JSON.stringify({ error: "internal_error", details: String(err) }), { status: 500, headers: { "Content-Type": "application/json" }});
  }
});
""")

    # docs/index.html
    write_file("docs/index.html", r'''
<!DOCTYPE html>
<html lang="pt-br">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>
      Calendário Litúrgico 2026 | Paróquia Senhor Bom Jesus de Matosinhos
    </title>

    <!-- Preconnect p/ Performance -->
    <link rel="preconnect" href="https://fonts.googleapis.com" />
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />

    <!-- Fontes e Ícones -->
    <link
      href="https://fonts.googleapis.com/css2?family=Roboto:wght@300;400;700;900&display=swap"
      rel="stylesheet"
    />
    <script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2"></script>

    <!-- CSS Modular -->
    <link rel="stylesheet" href="assets/css/styles.css" />
  </head>
  <body>
    <!-- Overlay Global para Modal -->
    <div
      class="modal-overlay"
      id="modalOverlay"
      onclick="window.CalendarUI.fecharModal(event)"
    >
      <div id="modalContent"></div>
    </div>

    <!-- Layout da Aplicação -->
    <div class="app-layout">
      <!-- Sidebar / Gaveta de Navegação -->
      <aside class="sidebar" id="sidebar">
        <div class="sidebar-header">
          <div class="logo-area">
            <span class="logo-icon">✝</span>
            <span class="logo-text"
              >SACRISTIA<br /><small>DIGITAL</small></span
            >
          </div>
        </div>

        <nav class="sidebar-menu">
          <a href="#" class="active" onclick="irParaHoje()">📅 Calendário</a>
          <a href="#" onclick="alert('Em breve: Escalas de Leitores')">📖 Leitores</a>
          <a href="#" onclick="alert('Em breve: Escalas de Canto')">🎵 Canto</a>
          <a href="#" onclick="alert('Em breve: Escalas de Ministros')">🍞 Ministros</a>
          <div class="separator"></div>
          <a href="admin.html" class="btn-admin">🔒 Área do Coordenador</a>
        </nav>

        <div class="sidebar-footer">
          <p>Ano Litúrgico 2026</p>
          <small>Ano A - São Mateus</small>
        </div>
      </aside>

      <!-- Conteúdo Principal -->
      <main class="main-content">
        <!-- Overlay Mobile -->
        <div
          id="sidebar-overlay"
          onclick="document.getElementById('sidebar').classList.remove('active'); this.classList.remove('active')"
        ></div>

        <header>
          <div class="header-left">
            <button
              id="btn-mobile-menu"
              onclick="document.getElementById('sidebar').classList.add('active'); document.getElementById('sidebar-overlay').classList.add('active')"
            >
              ☰
            </button>
            <div class="header-logo-container">
              <img
                src="assets/img/logo-paroquia.png"
                alt="Brasão da Paróquia"
                class="header-logo-img"
              />
              <div class="header-titles">
                <h1>LITURGIA PAROQUIAL</h1>
                <h2>PARÓQUIA SENHOR BOM JESUS</h2>
              </div>
            </div>
          </div>
          <div class="header-controls">
            <div class="nav-wrapper">
              <button
                class="nav-btn"
                onclick="window.CalendarUI.mudarMes(-1)"
                title="Mês Anterior"
              >
                ◀
              </button>
              <h2 id="mesAtualTitulo" class="month-display">JANEIRO 2026</h2>
              <button
                class="nav-btn"
                onclick="window.CalendarUI.mudarMes(1)"
                title="Próximo Mês"
              >
                ▶
              </button>
            </div>
            <button
              class="btn-hoje"
              onclick="window.CalendarUI.irParaHoje()"
            >
              HOJE
            </button>
            <div class="info-badges">
              <span class="badge cor-liturgica" id="corLiturgicaAtual"></span>
            </div>
          </div>
        </header>

        <div class="calendar-container">
          <!-- Cabeçalho dos Dias da Semana -->
          <div class="weekdays-header">
            <div class="day-header dom">DOMINGO</div>
            <div class="day-header">SEGUNDA</div>
            <div class="day-header">TERÇA</div>
            <div class="day-header">QUARTA</div>
            <div class="day-header">QUINTA</div>
            <div class="day-header">SEXTA</div>
            <div class="day-header sab">SÁBADO</div>
          </div>

          <!-- Grid do Calendário (Injetado via JS) -->
          <div id="calendarGrid" class="calendar-grid">
            <div class="loading-spinner">Carregando ano litúrgico...</div>
          </div>
        </div>

        <footer>
          <div class="footer-container">
            <div class="footer-col">
              <button class="btn-whatsapp" onclick="window.open('https://wa.me/5531999999999', '_blank')">
                <span class="icon">💬</span> Falar com a Secretaria
              </button>
            </div>
            <div class="footer-col">
              <p>
                © 2026 Paróquia Senhor Bom Jesus de Matosinhos<br />
                São João del-Rei - MG
              </p>
            </div>
            <div class="footer-col social-links">
              <a href="#" target="_blank">Instagram</a> •
              <a href="#" target="_blank">Facebook</a> •
              <a href="#" target="_blank">YouTube</a>
            </div>
          </div>
        </footer>
      </main>
    </div>

    <!-- Scripts da Aplicação -->
    <script src="assets/js/api.js"></script>
    <script src="assets/js/app.js"></script>
    <script>
      // Boot do Sistema
      document.addEventListener("DOMContentLoaded", () => {
        window.CalendarUI.init();
      });
    </script>
  </body>
</html>
''')

    # backend_automacao/gerador_datas.py
    write_file("backend_automacao/gerador_datas.py", r'''
"""
SCRIPT GERADOR DE DATAS LITÚRGICAS 2026
---------------------------------------
Este script Python gera um JSON com todas as datas litúrgicas do ano de 2026,
calculando festas móveis (baseadas na Páscoa) e integrando com o Santoral Fixo.

Autor: Rodrigo Dionizio
Refatorado por: Agente Gemini (Modo Code Architect)
"""

import json
import datetime
from datetime import timedelta, date

# ==============================================================================
# 1. CONFIGURAÇÕES E DADOS FIXOS
# ==============================================================================

ANO_REF = 2026

# Festas Fixas (Mês, Dia -> Nome, Grau, Cor)
FESTAS_FIXAS = {
    (1, 1):  ("Santa Maria, Mãe de Deus", "Solenidade", "branco"),
    (1, 6):  ("Epifania do Senhor", "Solenidade", "branco"), # No Brasil é movido pro Domingo, mas mantemos a ref
    (3, 19): ("São José, Esposo de Maria", "Solenidade", "branco"),
    (3, 25): ("Anunciação do Senhor", "Solenidade", "branco"),
    (5, 1):  ("São José Operário", "Memória Facultativa", "branco"),
    (6, 24): ("Natividade de São João Batista", "Solenidade", "branco"),
    (6, 29): ("São Pedro e São Paulo", "Solenidade", "vermelho"), # Movido p/ Domingo
    (8, 6):  ("Transfiguração do Senhor", "Festa", "branco"),
    (8, 15): ("Assunção de Nossa Senhora", "Solenidade", "branco"), # Movido p/ Domingo
    (9, 14): ("Exaltação da Santa Cruz", "Festa", "vermelho"),
    (10, 12): ("Nossa Senhora Aparecida", "Solenidade", "dourado"),
    (11, 1):  ("Todos os Santos", "Solenidade", "branco"), # Movido p/ Domingo
    (11, 2):  ("Comemoração de Todos os Fiéis Defuntos", "Solenidade", "roxo"),
    (12, 8):  ("Imaculada Conceição", "Solenidade", "branco"),
    (12, 25): ("Natal do Senhor", "Solenidade", "branco"),
}

# Padroeiro da Paróquia (Exemplo)
PADROEIRO_PAROQUIA = {
    "data": (9, 14), # Senhor Bom Jesus (Exemplo: 14/09 junto com Exaltação)
    "nome": "Jubileu do Senhor Bom Jesus",
    "grau": "Solenidade",
    "cor": "vermelho"
}

# ==============================================================================
# 2. LÓGICA DE CÁLCULO DE DATAS
# ==============================================================================

def calcular_pascoa(ano):
    """
    Algoritmo de Meeus/Jones/Butcher para cálculo da Páscoa Gregroriana.
    Retorna objeto date.
    """
    a = ano % 19
    b = ano // 100
    c = ano % 100
    d = b // 4
    e = b % 4
    f = (b + 8) // 25
    g = (b - f + 1) // 3
    h = (19 * a + b - d - g + 15) % 30
    i = c // 4
    k = c % 4
    l = (32 + 2 * e + 2 * i - h - k) % 7
    m = (a + 11 * h + 22 * l) // 451
    
    mes = (h + l - 7 * m + 114) // 31
    dia = ((h + l - 7 * m + 114) % 31) + 1
    
    return date(ano, mes, dia)

def gerar_calendario_liturgico_2026():
    print(f"🔄 Gerando calendário litúrgico para {ANO_REF}...")
    
    eventos = []
    
    # --- 1. DATAS MÓVEIS (Ciclo do Natal e Páscoa) ---
    pascoa = calcular_pascoa(ANO_REF)
    
    # Marcos principais relativos à Páscoa
    quarta_cinzas = pascoa - timedelta(days=46)
    domingo_ramos = pascoa - timedelta(days=7)
    sexta_santa = pascoa - timedelta(days=2)
    ascensao = pascoa + timedelta(days=42) # No Brasil, movido p/ domingo seguinte (+42 dias = domingo)
    pentecostes = pascoa + timedelta(days=49)
    corpus_christi = pascoa + timedelta(days=60)
    
    # Adicionando Móveis
    eventos.append({
        "data": quarta_cinzas.isoformat(),
        "titulo": "Quarta-feira de Cinzas",
        "tipo": "Solenidade",
        "cor": "roxo",
        "is_solenidade": True
    })
    eventos.append({
        "data": pascoa.isoformat(),
        "titulo": "Domingo de Páscoa da Ressurreição do Senhor",
        "tipo": "Solenidade",
        "cor": "branco",
        "is_solenidade": True
    })
    eventos.append({
        "data": corpus_christi.isoformat(),
        "titulo": "Solenidade do Santíssimo Corpo e Sangue de Cristo",
        "tipo": "Solenidade",
        "cor": "branco",
        "is_solenidade": True
    })
    
    # --- 2. DATAS FIXAS & PADROEIRO ---
    start_date = date(ANO_REF, 1, 1)
    end_date = date(ANO_REF, 12, 31)
    
    delta = timedelta(days=1)
    d = start_date
    
    while d <= end_date:
        key = (d.month, d.day)
        
        # Verifica se tem festa fixa
        if key in FESTAS_FIXAS:
            nome, grau, cor = FESTAS_FIXAS[key]
            # Lógica simples: Se cair no domingo, prevalece o domingo do tempo comum ou a festa? 
            # (Aqui simplificado. Solenidades 'matam' domingos comuns.)
            eventos.append({
                "data": d.isoformat(),
                "titulo": nome,
                "tipo": grau,
                "cor": cor,
                "is_solenidade": grau == "Solenidade"
            })
            
        # Adiciona Domingos Comuns (se não houver conflito já registrado)
        elif d.weekday() == 6: # 0=Seg, 6=Dom
            # Verifica se já não inserimos algo nesta data (ex: Páscoa)
            if not any(e['data'] == d.isoformat() for e in eventos):
                # Determina Tempo Litúrgico Básico
                titulo = "Domingo do Tempo Comum"
                cor = "verde"
                
                # Quaresma
                if quarta_cinzas < d < pascoa:
                    titulo = "Domingo da Quaresma"
                    cor = "roxo"
                # Páscoa
                elif pascoa < d <= pentecostes:
                    titulo = "Domingo da Páscoa"
                    cor = "branco"
                # Advento (aprox 4 ultimos domingos)
                elif d.month == 12 or (d.month == 11 and d.day > 27):
                    titulo = "Domingo do Advento"
                    cor = "roxo"
                
                eventos.append({
                    "data": d.isoformat(),
                    "titulo": titulo,
                    "tipo": "Dominical",
                    "cor": cor,
                    "is_solenidade": True # Tratamos domingos como 'high priority' no visual
                })
        
        d += delta

    # Ordena por data
    eventos.sort(key=lambda x: x['data'])
    
    # Salva JSON
    filename = "calendario_2026.json"
    with open(filename, "w", encoding="utf-8") as f:
        json.dump(eventos, f, ensure_ascii=False, indent=2)
        
    print(f"✅ Sucesso! {len(eventos)} eventos gerados em '{filename}'.")

if __name__ == "__main__":
    gerar_calendario_liturgico_2026()
''')

    # docs/assets/js/app.js
    write_file("docs/assets/js/app.js", r'''
/*
 * ARQUIVO: app.js
 * DESCRIÇÃO: Motor de Interface do Usuário (Calendar UI Engine)
 * PROJETO: Liturgia Paroquial 2026
 * VERSÃO: 2.5
 */

window.CalendarUI = {
  // ESTADO GLOBAL DA APLICAÇÃO
  estado: {
    anoAtual: 2026,
    mesAtual: 0, // 0 = Janeiro (JS Date standard)
    hoje: new Date(),
    eventosCache: {}, // { '2026-01-15': [ ...eventos ] }
    filtros: {
      apenasSolenidades: false,
    },
  },

  // CONFIGURAÇÃO
  config: {
    isAdmin: false,
    mostrarPendentes: false,
    containerGrid: "#calendarGrid",
  },

  // ==========================================================================
  // 1. INICIALIZAÇÃO
  // ==========================================================================
  init: async function (parametros = {}) {
    console.log("🚀 Iniciando CalendarUI...", parametros);

    // Merge de configurações
    this.config = { ...this.config, ...parametros };

    // Define mês inicial (janeiro de 2026 ou o mês atual se estivermos em 2026)
    // Para fins do projeto 2026, forçamos o início em Janeiro/2026 se hoje não for 2026.
    const agora = new Date();
    if (agora.getFullYear() === 2026) {
      this.estado.mesAtual = agora.getMonth();
    } else {
      this.estado.mesAtual = 0; // Começa em Janeiro
    }

    this.estado.anoAtual = 2026;

    // Configura Listeners de Navegação
    this.configurarBotoesNavegacao();

    // Carrega dados iniciais
    await this.carregarDadosMes(this.estado.anoAtual, this.estado.mesAtual);
  },

  // ==========================================================================
  // 2. NAVEGAÇÃO E DADOS
  // ==========================================================================
  configurarBotoesNavegacao: function () {
    // Teclado (Setas)
    document.addEventListener("keydown", (e) => {
      if (e.key === "ArrowLeft") this.mudarMes(-1);
      if (e.key === "ArrowRight") this.mudarMes(1);
    });
  },

  mudarMes: async function (delta) {
    let novoMes = this.estado.mesAtual + delta;
    let novoAno = this.estado.anoAtual;

    if (novoMes > 11) {
      novoMes = 0;
      novoAno++;
    } else if (novoMes < 0) {
      novoMes = 11;
      novoAno--;
    }

    // Trava de Segurança: Só opera em 2026 neste escopo
    if (novoAno !== 2026) {
      alert("O Calendário Litúrgico está restrito ao ano de 2026.");
      return;
    }

    this.estado.mesAtual = novoMes;
    this.estado.anoAtual = novoAno;
    await this.carregarDadosMes(novoAno, novoMes);
  },

  irParaHoje: async function () {
    this.estado.mesAtual = new Date().getMonth(); // Volta pro mes real
    // Se fosse 2026 real...
    await this.carregarDadosMes(2026, 0); // Reset p/ Janeiro no demo
    // Ou p/ mes atual se estivesse em prod
  },

  carregarDadosMes: async function (ano, mes) {
    const nomesMeses = [
      "Janeiro",
      "Fevereiro",
      "Março",
      "Abril",
      "Maio",
      "Junho",
      "Julho",
      "Agosto",
      "Setembro",
      "Outubro",
      "Novembro",
      "Dezembro",
    ];

    // Atualiza Título
    const tituloEl = document.querySelector(
      this.config.isAdmin ? ".month-name" : "#mesAtualTitulo"
    );
    if (tituloEl) tituloEl.textContent = `${nomesMeses[mes]} ${ano}`;

    // Loading State
    const grid = document.querySelector(this.config.containerGrid);
    if (grid)
      grid.innerHTML = '<div class="loading-spinner">Buscando liturgia...</div>';

    try {
      // Busca na API
      const eventos = await window.api.buscarEventos(
        ano,
        mes + 1, // API espera 1-12
        !this.config.mostrarPendentes // Se mostrarPendentes=true, passa false para 'apenasAprovados'
      );

      // Processa e Cacheia
      this.estado.eventosCache = {}; // Limpa cache anterior p/ simplificar
      eventos.forEach((ev) => {
        if (!this.estado.eventosCache[ev.data]) {
          this.estado.eventosCache[ev.data] = [];
        }
        this.estado.eventosCache[ev.data].push(ev);
      });

      // Renderiza
      this.renderizarGrid(grid, ano, mes);
    } catch (erro) {
      console.error("Erro ao processar dados do mês:", erro);
      grid.innerHTML =
        '<div class="error-msg">Falha ao carregar calendário. Verifique a conexão.</div>';
    }
  },

  // ==========================================================================
  // 3. RENDERIZAÇÃO (CORE UI)
  // ==========================================================================
  renderizarGrid: function (container, ano, mes) {
    if (!container) return;
    container.innerHTML = "";

    const primeiroDiaSemana = new Date(ano, mes, 1).getDay(); // 0 (Dom) a 6 (Sab)
    const ultimoDia = new Date(ano, mes + 1, 0).getDate(); // 28, 30, 31...

    let html = "";

    // 3.1. Dias Vazios (Padding do mês anterior)
    for (let i = 0; i < primeiroDiaSemana; i++) {
      html += '<div class="day-cell empty"></div>';
    }

    // 3.2. Dias do Mês
    for (let dia = 1; dia <= ultimoDia; dia++) {
      const dataISO = `${ano}-${String(mes + 1).padStart(2, "0")}-${String(
        dia
      ).padStart(2, "0")}`;
      const listaEventos = this.estado.eventosCache[dataISO] || [];
      const hojeISO = new Date().toISOString().split("T")[0]; // Para highlight de hoje (se fosse 2026)

      // Construção das "Pílulas" de Evento
      let pilulasHTML = "";
      listaEventos.forEach((evento) => {
        const corHex = evento.liturgia_cores?.hex_code || "#ccc";
        const isSolenidade = evento.grau === "Solenidade";

        // Badge de Status (apenas admin vê pendentes)
        let statusInfo = "";
        if (this.config.mostrarPendentes && evento.status === "pendente") {
          statusInfo = '<span class="status-dot-pending">●</span> ';
        }

        pilulasHTML += `
                    <div class="pill ${isSolenidade ? "solenidade" : ""}" 
                         style="border-left: 3px solid ${corHex}; background-color: ${
          isSolenidade ? "var(--cor-vinho)" : "#f4f4f4"
        }; color: ${isSolenidade ? "#fff" : "#333"}">
                        ${statusInfo}${evento.titulo}
                    </div>
                `;
      });

      html += `
                <div class="day-cell" data-iso="${dataISO}" onclick="window.CalendarUI.abrirModal('${dataISO}')">
                    <span class="day-number">${dia}</span>
                    <div class="pill-container">
                        ${pilulasHTML}
                    </div>
                </div>
            `;
    }

    container.innerHTML = html;
  },

  // ==========================================================================
  // 4. MODAL DE DETALHES
  // ==========================================================================
  abrirModal: function (dataISO) {
    const listaEventos = this.estado.eventosCache[dataISO] || [];
    const [ano, mes, dia] = dataISO.split("-");
    const dataObj = new Date(ano, mes - 1, dia);

    const diaSemana = dataObj.toLocaleDateString("pt-BR", { weekday: "long" });
    const nomeMes = dataObj.toLocaleDateString("pt-BR", { month: "long" });

    let htmlLista = "";

    if (listaEventos.length === 0) {
      htmlLista = '<p class="text-center text-muted">Nenhum evento litúrgico cadastrado.</p>';
    } else {
      listaEventos.forEach((ev) => {
        // Prepara objeto para edição (se admin)
        const evString = encodeURIComponent(JSON.stringify(ev));
        const btnEdit = this.config.isAdmin
          ? `<button class="btn-edit-float" onclick='window.CalendarUI.prepararEdicao(decodeURIComponent("${evString}"))'>✏️ EDITAR</button>`
          : "";

        // Escalas
        let htmlEscalas = "";
        if (ev.escalas && ev.escalas.length > 0) {
          ev.escalas.forEach((esc) => {
            htmlEscalas += `
                        <div class="escala-item">
                            <span class="escala-hora">⏰ ${esc.hora_celebracao.slice(
                              0,
                              5
                            )}</span>
                            <div class="escala-equipes">
                                <div class="equipe-row"><img src="assets/img/icon-leitor.png" class="equipe-icon"><span class="equipe-val">${
                                  esc.equipe_leitura?.nome_equipe || "—"
                                }</span></div>
                                <div class="equipe-row"><img src="assets/img/icon-music.png" class="equipe-icon"><span class="equipe-val">${
                                  esc.equipe_canto?.nome_equipe || "—"
                                }</span></div>
                            </div>
                        </div>`;
          });
        } else {
          htmlEscalas = '<div class="aviso-escala">⚠️ Escalas não definidas</div>';
        }

        htmlLista += `
                    <div class="evento-card-modal" style="border-left: 4px solid ${
                      ev.liturgia_cores?.hex_code || "#ccc"
                    }">
                        ${btnEdit}
                        <div class="modal-liturgia">${ev.grau || "Evento"}</div>
                        <h3 class="modal-titulo">${ev.titulo}</h3>
                        
                        <div class="modal-secao-escalas">
                            <h4 class="secao-titulo">ESCALAS E HORÁRIOS</h4>
                            ${htmlEscalas}
                        </div>
                    </div>
                `;
      });
    }

    const modalHTML = `
            <div class="modal-card">
                 <button class="btn-close" onclick="window.CalendarUI.fecharModal()">×</button>
                 <div class="modal-header-date">
                    <span class="modal-day">${dia}</span>
                    <div class="modal-desc-date">
                        <span class="modal-month">${nomeMes}</span>
                        <span class="modal-weekday">${diaSemana}</span>
                    </div>
                 </div>
                 <div class="modal-body-content">
                    ${htmlLista}
                 </div>
                 ${
                   this.config.isAdmin
                     ? `<button class="btn-admin-add" onclick="window.CalendarUI.novoEvento('${dataISO}')">+ Adicionar Evento</button>`
                     : ""
                 }
            </div>
        `;

    document.getElementById("modalContent").innerHTML = modalHTML;
    document.getElementById("modalOverlay").classList.add("active");
  },

  fecharModal: function (e) {
    if (e && e.target.id !== "modalOverlay" && !e.target.classList.contains("btn-close")) return;
    document.getElementById("modalOverlay").classList.remove("active");
  },

  /* ... Métodos de Edição (Admin) omitidos p/ brevidade do demo, mas seguiriam aqui ... */
  novoEvento: function(dataISO) { alert("Funcionalidade de Novo Evento: Abrir Form para " + dataISO); },
  prepararEdicao: function(jsonPromo) { 
      const ev = JSON.parse(jsonPromo);
      console.log("Editando:", ev);
      alert(`Editor Admin: Editando '${ev.titulo}'. Implementação completa no Backend Python.`);
  }
};
''')

    # docs/assets/css/styles.css
    styles_1 = r'''/* 
 * ARQUIVO: styles.css
 * PROJETO: Liturgia Paroquial 2026
 * DESCRIÇÃO: Estilos globais, componentes, mural e responsividade.
 * VERSÃO: 5.0 (Gold + Mural)
 */

/* ==========================================================================
   1. DESIGN SYSTEM & VARIÁVEIS
   ========================================================================== */
:root {
  /* Paleta Institucional */
  --cor-cereja: #c82038;
  --cor-vinho: #a41d31;
  --cor-dourado: #fbb558;
  --cor-bege: #fceccb;
  --cor-fundo: #fff8e7;
  --text-main: #2c0e12;

  /* Liturgia Backgrounds (Tarjas) */
  --bg-verde: #2e7d32;
  --bg-branco: #f5f5f5;
  --bg-dourado: #fbb558;
  --bg-roxo: #6a1b9a;
  --bg-vermelho: #d32f2f;

  /* Liturgia Textos (Contraste Acessível) */
  --txt-verde: #2e7d32;
  --txt-branco: #666666; /* Cinza Escuro para ler no fundo claro */
  --txt-dourado: #a67c00;
  --txt-roxo: #6a1b9a;
  --txt-vermelho: #d32f2f;

  /* UI Metrics */
  --radius-main: 16px;

  /* Tipografia */
  --font-titulo: "Neulis", sans-serif;
  --font-texto: "AntennaCond", sans-serif;
}

/* ==========================================================================
   2. FONT FACES (IMPORTAÇÃO TIPOGRAFIA)
   ========================================================================== */
/* Humming */
@font-face {
  font-family: "Humming";
  src: url("../fonts/Humming.otf") format("opentype");
  font-weight: 400;
  font-style: normal;
  font-display: swap;
}

/* Neulis (Família Completa) */
@font-face {
  font-family: "Neulis";
  src: url("../fonts/Neulis-Black.otf") format("opentype");
  font-weight: 900;
  font-style: normal;
  font-display: swap;
}
@font-face {
  font-family: "Neulis";
  src: url("../fonts/Neulis-BlackItalic.otf") format("opentype");
  font-weight: 900;
  font-style: italic;
  font-display: swap;
}
@font-face {
  font-family: "Neulis";
  src: url("../fonts/Neulis-Bold.otf") format("opentype");
  font-weight: 700;
  font-style: normal;
  font-display: swap;
}
@font-face {
  font-family: "Neulis";
  src: url("../fonts/Neulis-BoldItalic.otf") format("opentype");
  font-weight: 700;
  font-style: italic;
  font-display: swap;
}
@font-face {
  font-family: "Neulis";
  src: url("../fonts/Neulis-ExtraBold.otf") format("opentype");
  font-weight: 800;
  font-style: normal;
  font-display: swap;
}
@font-face {
  font-family: "Neulis";
  src: url("../fonts/Neulis-ExtraBoldItalic.otf") format("opentype");
  font-weight: 800;
  font-style: italic;
  font-display: swap;
}
@font-face {
  font-family: "Neulis";
  src: url("../fonts/Neulis-ExtraLight.otf") format("opentype");
  font-weight: 300;
  font-style: normal;
  font-display: swap;
}
@font-face {
  font-family: "Neulis";
  src: url("../fonts/Neulis-ExtraLightItalic.otf") format("opentype");
  font-weight: 300;
  font-style: italic;
  font-display: swap;
}
@font-face {
  font-family: "Neulis";
  src: url("../fonts/Neulis-Italic.otf") format("opentype");
  font-weight: 400;
  font-style: italic;
  font-display: swap;
}
@font-face {
  font-family: "Neulis";
  src: url("../fonts/Neulis-Light.otf") format("opentype");
  font-weight: 300;
  font-style: normal;
  font-display: swap;
}
@font-face {
  font-family: "Neulis";
  src: url("../fonts/Neulis-LightItalic.otf") format("opentype");
  font-weight: 300;
  font-style: italic;
  font-display: swap;
}
@font-face {
  font-family: "Neulis";
  src: url("../fonts/Neulis-Medium.otf") format("opentype");
  font-weight: 500;
  font-style: normal;
  font-display: swap;
}
@font-face {
  font-family: "Neulis";
  src: url("../fonts/Neulis-MediumItalic.otf") format("opentype");
  font-weight: 500;
  font-style: italic;
  font-display: swap;
}
@font-face {
  font-family: "Neulis";
  src: url("../fonts/Neulis-Regular.otf") format("opentype");
  font-weight: 400;
  font-style: normal;
  font-display: swap;
}
@font-face {
  font-family: "Neulis";
  src: url("../fonts/Neulis-SemiBold.otf") format("opentype");
  font-weight: 700;
  font-style: normal;
  font-display: swap;
}
@font-face {
  font-family: "Neulis";
  src: url("../fonts/Neulis-SemiBoldItalic.otf") format("opentype");
  font-weight: 700;
  font-style: italic;
  font-display: swap;
}
@font-face {
  font-family: "Neulis";
  src: url("../fonts/Neulis-Thin.otf") format("opentype");
  font-weight: 100;
  font-style: normal;
  font-display: swap;
}
@font-face {
  font-family: "Neulis";
  src: url("../fonts/Neulis-ThinItalic.otf") format("opentype");
  font-weight: 100;
  font-style: italic;
  font-display: swap;
}

/* AntennaCond (Família Completa) */
@font-face {
  font-family: "AntennaCond";
  src: url("../fonts/antennacond-black.otf") format("opentype");
  font-weight: 900;
  font-style: normal;
  font-display: swap;
}
@font-face {
  font-family: "AntennaCond";
  src: url("../fonts/antennacond-blackitalic.otf") format("opentype");
  font-weight: 900;
  font-style: italic;
  font-display: swap;
}
@font-face {
  font-family: "AntennaCond";
  src: url("../fonts/antennacond-bold-italic.otf") format("opentype");
  font-weight: 700;
  font-style: italic;
  font-display: swap;
}
@font-face {
  font-family: "AntennaCond";
  src: url("../fonts/antennacond-bold.otf") format("opentype");
  font-weight: 700;
  font-style: normal;
  font-display: swap;
}
@font-face {
  font-family: "AntennaCond";
  src: url("../fonts/antennacond-extra-light-italic.otf") format("opentype");
  font-weight: 300;
  font-style: italic;
  font-display: swap;
}
@font-face {
  font-family: "AntennaCond";
  src: url("../fonts/antennacond-extralight.otf") format("opentype");
  font-weight: 300;
  font-style: normal;
  font-display: swap;
}
@font-face {
  font-family: "AntennaCond";
  src: url("../fonts/antennacond-italic.otf") format("opentype");
  font-weight: 400;
  font-style: italic;
  font-display: swap;
}
@font-face {
  font-family: "AntennaCond";
  src: url("../fonts/antennacond-light-italic.otf") format("opentype");
  font-weight: 300;
  font-style: italic;
  font-display: swap;
}
@font-face {
  font-family: "AntennaCond";
  src: url("../fonts/antennacond-light.otf") format("opentype");
  font-weight: 300;
  font-style: normal;
  font-display: swap;
}
@font-face {
  font-family: "AntennaCond";
  src: url("../fonts/antennacond-medium-italic.otf") format("opentype");
  font-weight: 500;
  font-style: italic;
  font-display: swap;
}
@font-face {
  font-family: "AntennaCond";
  src: url("../fonts/antennacond-medium.otf") format("opentype");
  font-weight: 500;
  font-style: normal;
  font-display: swap;
}
@font-face {
  font-family: "AntennaCond";
  src: url("../fonts/antennacond-thin-italiclic.otf") format("opentype");
  font-weight: 100;
  font-style: italic;
  font-display: swap;
}
@font-face {
  font-family: "AntennaCond";
  src: url("../fonts/antennacond-thin.otf") format("opentype");
  font-weight: 100;
  font-style: normal;
  font-display: swap;
}
@font-face {
  font-family: "AntennaCond";
  src: url("../fonts/antennacond.otf") format("opentype");
  font-weight: 400;
  font-style: normal;
  font-display: swap;
}
@font-face {
  font-family: "AntennaCond";
  src: url("../fonts/antennacond_.otf") format("opentype");
  font-weight: 400;
  font-style: normal;
  font-display: swap;
}

/* ==========================================================================
   3. RESET & BASE
   ========================================================================== */
body {
  background-color: var(--cor-fundo);
  color: var(--text-main);
  font-family: "AntennaCond", "Segoe UI", Tahoma, sans-serif;
  margin: 0;
  padding: 0;
  height: 100vh;
  display: flex;
  flex-direction: column;
  overflow: hidden; /* App-like feel, impede scroll no body */
}

/* ==========================================================================
   4. CABEÇALHO (HEADER)
   ========================================================================== */
header {
  background-color: var(--cor-vinho);
  height: 70px;
  padding: 0 20px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #fff;
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.2);
  z-index: 10;
  border-bottom: 4px solid var(--cor-dourado);
  position: relative; /* Para posicionar o botão mobile */
}

.header-logo-container {
  height: 50px;
  display: flex;
  align-items: center;
}
.header-logo-img {
  height: 100%;
  width: auto;
  object-fit: contain;
}

/* Botão Menu Mobile (Padrão: Escondido no Desktop) */
#btn-mobile-menu {
  display: none;
  background: transparent;
  border: none;
  color: white;
  cursor: pointer;
  padding: 5px;
  position: absolute;
  left: 15px; /* Fica na esquerda no mobile */
}

/* ==========================================================================
   5. LAYOUT GERAL & SIDEBAR
   ========================================================================== */
.app-layout {
  display: flex;
  flex: 1;
  overflow: hidden;
}

.sidebar {
  width: 260px;
  background-color: rgba(255, 255, 255, 0.6);
  border-right: 1px solid rgba(0, 0, 0, 0.05);
  padding: 20px;
  display: flex;
  flex-direction: column;
  gap: 20px;
  height: 100vh;
  box-sizing: border-box;
}

/* Container do Mural e Mini-Calendário */
.mini-calendar {
  /* Se for usado como placeholder, senão o Mural substitui */
  background: #fff;
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  border: 1px solid rgba(0, 0, 0, 0.05);
  color: #aaa;
  font-size: 0.8rem;
}

/* Filtros */
.filter-group h3 {
  font-family: "Neulis", sans-serif; /* ALTERADO: Fonte segura para acentos */
  font-size: 0.85rem; /* Levemente maior pois a Neulis é mais larga */
  text-transform: uppercase;
  color: var(--cor-vinho);
  margin-bottom: 10px;
  opacity: 1; /* Removida opacidade para ficar mais nítido */
  font-weight: 700;
  letter-spacing: 0.5px;
}

.filter-item {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 8px;
  font-size: 0.9rem;
  cursor: pointer;
  color: #444;
}

.checkbox-custom {
  width: 16px;
  height: 16px;
  border: 2px solid var(--cor-vinho);
  border-radius: 4px;
  display: inline-block;
}
.checkbox-custom.checked {
  background-color: var(--cor-vinho);
}

/* Scroll na lista de equipes se for muito grande */
#filtro-equipes {
  overflow-y: auto;
  flex: 1; /* Ocupa o espaço disponível */
  padding-right: 5px;
  scrollbar-width: thin;
  scrollbar-color: var(--cor-vinho) #eee;
}

#filtro-equipes::-webkit-scrollbar {
  width: 6px;
}
#filtro-equipes::-webkit-scrollbar-track {
  background: #eee;
  border-radius: 3px;
}
#filtro-equipes::-webkit-scrollbar-thumb {
  background-color: var(--cor-vinho);
  border-radius: 3px;
}

/* ==========================================================================
   6. MURAL DE AVISOS (NOVA FEATURE)
   ========================================================================== */
.mural-container {
  display: flex;
  flex-direction: column;
  gap: 10px;
  margin-bottom: 20px;
}

.mural-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 5px;
  border-bottom: 2px solid var(--cor-vinho);
  padding-bottom: 5px;
}

.mural-title {
  font-family: "Neulis", sans-serif; /* ALTERADO */
  font-size: 0.95rem;
  font-weight: 700;
  color: var(--cor-vinho);
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.mural-badge {
  background: var(--cor-cereja);
  color: white;
  font-size: 0.7rem;
  padding: 2px 6px;
  border-radius: 10px;
  font-weight: bold;
}

.aviso-card {
  background: #fff;
  border-radius: 8px;
  padding: 12px;
  box-shadow: 0 2px 5px rgba(0, 0, 0, 0.05);
  border-left: 4px solid #ccc;
  transition: transform 0.2s;
  cursor: default;
}
.aviso-card:hover {
  transform: translateX(3px);
}

/* Prioridades do Mural */
.prio-1 {
  border-left-color: var(--cor-cereja);
  background-color: #fff5f5;
} /* Urgente */
.prio-2 {
  border-left-color: var(--cor-dourado);
} /* Atenção */
.prio-3 {
  border-left-color: #2196f3;
} /* Info */

/* Tipografia do Aviso */
.aviso-tag {
  font-family: "Neulis", sans-serif; /* ALTERADO: Para ler melhor "AMANHÃ" */
  font-size: 0.65rem;
  font-weight: 700;
  text-transform: uppercase;
  display: inline-block;
'''
    styles_2 = r'''  margin-bottom: 4px;
  padding: 2px 4px;
  border-radius: 3px;
  background-color: #eee;
  color: #555;
}
.tag-urgente {
  background-color: var(--cor-cereja);
  color: white;
  animation: pulse 2s infinite;
}

.aviso-titulo {
  font-family: "Neulis", sans-serif; /* ALTERADO */
  font-weight: 700;
  font-size: 0.95rem;
  color: #333;
  line-height: 1.3;
  margin-bottom: 4px;
}

.aviso-meta {
  font-size: 0.75rem;
  color: #666;
  display: flex;
  align-items: center;
  gap: 5px;
}

@keyframes pulse {
  0% {
    opacity: 1;
  }
  50% {
    opacity: 0.7;
  }
  100% {
    opacity: 1;
  }
}

/* ==========================================================================
   7. CONTEÚDO PRINCIPAL (CALENDÁRIO)
   ========================================================================== */
.main-content {
  flex: 1;
  padding: 0;
  display: flex;
  flex-direction: column;
  overflow-y: auto;
}

.scroll-wrapper {
  padding: 20px;
  flex: 1;
  display: flex;
  flex-direction: column;
}

.month-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 15px;
}
.month-name {
  font-size: 1.8rem;
  font-weight: 900;
  color: var(--text-main);
  margin: 0;
}

.nav-buttons {
  display: flex;
  gap: 10px;
}
.btn-nav {
  border: 1px solid #ccc;
  background: transparent;
  padding: 5px 15px;
  border-radius: 20px;
  cursor: pointer;
  font-weight: 600;
  transition: background 0.2s;
}
.btn-nav:hover {
  background: rgba(0, 0, 0, 0.05);
}

/* Grid Container */
.calendar-wrapper {
  border: 1px solid #ddd;
  border-radius: var(--radius-main);
  overflow: hidden;
  background-color: #ddd;
  display: grid;
  grid-template-columns: repeat(7, 1fr);
  gap: 1px;
  box-shadow: 0 5px 20px rgba(0, 0, 0, 0.05);
  margin-bottom: 40px;
}

.day-header {
  background-color: #fff;
  padding: 10px 0;
  text-align: center;
  font-size: 0.75rem;
  font-weight: 600;
  color: #888;
  text-transform: uppercase;
}

.day-cell {
  background-color: #fff;
  min-height: 120px;
  padding: 8px;
  cursor: pointer;
  transition: background 0.2s;
  position: relative;
}
.day-cell:hover {
  background-color: #fafafa;
}

.day-number {
  font-weight: 700;
  font-size: 1rem;
  color: #333;
  margin-bottom: 5px;
  display: block;
}
.other-month {
  background-color: #f4f4f4;
  opacity: 0.5;
  pointer-events: none;
}

/* Filtros Visuais (Grid) */
.hidden-by-filter {
  opacity: 0.1;
  pointer-events: none;
  filter: grayscale(100%);
}
.highlight-filter {
  background-color: #fff9e6;
  border: 2px solid var(--cor-dourado);
}

/* Pílulas de Evento (Grid) */
.pill {
  font-size: 0.75rem;
  margin-bottom: 2px;
  padding: 3px 6px;
  border-radius: 4px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  background-color: var(--cor-vinho);
  color: #fff;
  border-left: 3px solid var(--cor-dourado);
}
.pill.solenidade {
  background-color: var(--cor-dourado);
  color: var(--cor-vinho);
  border-left: 3px solid #fff;
}

/* ==========================================================================
   8. RODAPÉ (FOOTER)
   ========================================================================== */
.main-footer {
  background-color: var(--cor-vinho);
  color: var(--cor-bege);
  padding: 50px 20px 20px 20px;
  border-top: 5px solid var(--cor-dourado);
  margin-top: auto;
}

.footer-container {
  max-width: 1000px;
  margin: 0 auto;
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
  gap: 40px;
}

.footer-logo {
  max-width: 180px;
  margin-bottom: 15px;
  opacity: 0.9;
}
.footer-heading {
  color: var(--cor-dourado);
  font-size: 1.1rem;
  border-bottom: 1px solid rgba(251, 181, 88, 0.3);
  padding-bottom: 10px;
  margin-bottom: 15px;
  font-weight: 800;
  text-transform: uppercase;
}
.footer-col p {
  margin: 5px 0;
  font-size: 0.95rem;
}
.footer-subtitle {
  font-style: italic;
  font-size: 0.9rem;
  opacity: 0.8;
}

.destaque-atendimento {
  color: var(--cor-dourado) !important;
  font-weight: bold;
}
.destaque-atendimento span {
  font-weight: normal;
  color: var(--cor-bege);
}

.btn-whatsapp {
  display: flex;
  align-items: center;
  gap: 10px;
  background-color: rgba(255, 255, 255, 0.05);
  color: var(--cor-bege);
  text-decoration: none;
  padding: 10px 15px;
  border-radius: 8px;
  border: 1px solid rgba(255, 255, 255, 0.1);
  width: fit-content;
  margin-bottom: 15px;
  font-size: 0.9rem;
  transition: 0.3s;
}
.btn-whatsapp:hover {
  background-color: #25d366;
  border-color: #25d366;
  color: #fff;
}

.social-links {
  display: flex;
  gap: 15px;
  margin-top: 10px;
}
.social-links a {
  color: var(--cor-bege);
  transition: transform 0.2s;
}
.social-links a:hover {
  color: var(--cor-dourado);
  transform: scale(1.1);
}

.footer-copyright {
  text-align: center;
  font-size: 0.8rem;
  opacity: 0.6;
  margin-top: 40px;
  padding-top: 20px;
  border-top: 1px solid rgba(255, 255, 255, 0.05);
}

/* ==========================================================================
   9. COMPONENTE: MODAL (POPUP)
   ========================================================================== */
.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: rgba(44, 14, 18, 0.5);
  backdrop-filter: blur(4px);
  display: none;
  justify-content: center;
  align-items: center;
  z-index: 1000;
}
.modal-overlay.active {
  display: flex;
  animation: fadeIn 0.2s ease;
}

.modal-card {
  background: #fff;
  border-radius: 16px;
  overflow: hidden;
  box-shadow: 0 20px 50px rgba(0, 0, 0, 0.4);
  position: relative;
  display: flex;
  width: 95%;
  max-width: 400px;
  max-height: 85vh;
  overflow-y: auto;
}

.modal-sidebar-color {
  width: 10px;
  flex-shrink: 0;
'''

    styles_3 = r'''}
.modal-body {
  padding: 20px;
  flex: 1;
}

.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 15px;
  border-bottom: 1px solid #f0f0f0;
  padding-bottom: 10px;
}
.modal-day {
  font-size: 2rem;
  font-weight: 900;
  line-height: 1;
  color: var(--text-main);
}
.modal-month {
  font-size: 0.9rem;
  font-weight: 700;
  text-transform: uppercase;
  color: var(--cor-vinho);
}
.modal-weekday {
  font-size: 0.75rem;
  color: #888;
  text-transform: uppercase;
}

.modal-liturgia {
  font-size: 0.85rem;
  font-weight: bold;
  margin-bottom: 10px;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}
.modal-titulo {
  font-size: 1.1rem;
  font-weight: 800;
  margin-bottom: 20px;
  color: var(--text-main);
  line-height: 1.2;
}

/* Lista de Escalas */
.escala-item {
  display: flex;
  align-items: flex-start;
  border-bottom: 1px dashed #eee;
  padding-bottom: 8px;
  margin-bottom: 12px;
}
.escala-hora {
  background: #f5f5f5;
  padding: 4px 8px;
  border-radius: 6px;
  font-weight: 700;
  font-size: 0.8rem;
  margin-right: 10px;
  color: #555;
}
.equipe-row {
  display: flex;
  align-items: center;
  margin-bottom: 5px;
  flex-wrap: nowrap;
}
.equipe-icon {
  width: 16px;
  height: 16px;
  margin-right: 8px;
  opacity: 0.8;
  flex-shrink: 0;
}
.equipe-label {
  font-size: 0.7rem;
  text-transform: uppercase;
  color: #999;
  margin-right: 5px;
  font-weight: 600;
  width: 55px;
  flex-shrink: 0;
}
.equipe-val {
  font-weight: 700;
  color: var(--text-main);
  font-size: 0.9rem;
  white-space: normal;
  line-height: 1.2;
}

.btn-close {
  position: absolute;
  top: 10px;
  right: 10px;
  cursor: pointer;
  background: #eee;
  border-radius: 50%;
  width: 25px;
  height: 25px;
  border: none;
  font-weight: bold;
  font-size: 1.2rem;
  color: #555;
  display: flex;
  align-items: center;
  justify-content: center;
}

/* Botão Admin */
.btn-admin-action {
  margin-top: 20px;
  width: 100%;
  padding: 12px;
  background-color: #2c0e12;
  color: #fff;
  border: none;
  border-radius: 8px;
  cursor: pointer;
  font-weight: bold;
  font-size: 0.9rem;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 10px;
  transition: background 0.2s;
}
.btn-admin-action:hover {
  background-color: var(--cor-cereja);
}

/* ==========================================================================
   10. RESPONSIVIDADE (MEDIA QUERIES) & MENU MOBILE
   ========================================================================== */

/* MÁSCARA ESCURA (Overlay do Menu) */
#sidebar-overlay {
  display: none;
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: rgba(0, 0, 0, 0.5);
  z-index: 99;
  backdrop-filter: blur(2px);
}
#sidebar-overlay.active {
  display: block;
}

/* DESKTOP (Telas maiores que 768px) */
@media (min-width: 768px) {
  .header-logo-container {
    height: 60px;
    margin: 0;
  }
  header {
    justify-content: space-between;
  }

  .modal-card {
    width: 600px;
    max-width: 600px;
  }
  .modal-body {
    padding: 35px;
  }
  .modal-day {
    font-size: 2.8rem;
  }
  .modal-titulo {
    font-size: 1.5rem;
  }
  .modal-sidebar-color {
    width: 15px;
  }
}

/* MOBILE (Celulares menores que 768px) */
@media (max-width: 768px) {
  /* Mostra botão de menu */
  #btn-mobile-menu {
    display: block;
  }

  header {
    justify-content: center;
  }
  .header-logo-img {
    max-height: 40px;
  }

  /* SIDEBAR VIRA GAVETA */
  .sidebar {
    display: flex !important; /* Força exibir para animação */
    position: fixed;
    top: 0;
    left: 0;
    height: 100vh;
    width: 80%;
    max-width: 300px;
    background: #fff;
    z-index: 100;
    transform: translateX(-100%); /* Esconde na esquerda */
    transition: transform 0.3s ease;
    box-shadow: 2px 0 10px rgba(0, 0, 0, 0.5);
  }
  .sidebar.active {
    transform: translateX(0);
  } /* Desliza para dentro */

  .month-name {
    font-size: 1.4rem;
  }
  .day-header {
    font-size: 0.65rem;
    padding: 5px 0;
  }

  /* Grid Compacto */
  .day-cell {
    min-height: 55px;
    height: auto;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: flex-start;
    padding: 4px;
  }

  .pill {
    font-size: 0px;
    width: 6px;
    height: 6px;
    padding: 0;
    border: none;
    border-radius: 50%;
    display: inline-block;
    margin: 2px 1px;
  }

  .footer-container {
    text-align: center;
  }
  .footer-col {
    align-items: center;
  }
  .btn-whatsapp {
    margin: 0 auto 15px auto;
  }
  .social-links {
    justify-content: center;
  }
}

/* ==========================================================================
   11. ESTILOS DE IMPRESSÃO (PDF A4)
   ========================================================================== */
/* REGRA DE OURO: Esconde o relatório na tela normal */
.print-only {
  display: none;
}

@media print {
  /* Esconde a App */
  .app-layout,
  header,
  .modal-overlay,
  #btn-mobile-menu {
    display: none !important;
  }

  /* Mostra o Relatório */
  .print-only {
    display: block !important;
    background: white;
    font-family: "Segoe UI", "Roboto", Arial, sans-serif; /* Fonte limpa para leitura */
    color: #000;
    padding: 0;
    width: 100%;
  }

  @page {
    size: A4;
    margin: 1.5cm;
  }

  /* Cabeçalho Oficial */
  .print-header {
    display: flex;
    align-items: center;
    border-bottom: 3px solid #fbb558; /* Dourado */
    padding-bottom: 20px;
    margin-bottom: 25px;
  }
  .print-logo {
    height: 70px;
    margin-right: 20px;
  }
  .print-info h1 {
    margin: 0;
    font-size: 16pt;
    text-transform: uppercase;
    color: #a41d31; /* Vinho */
    line-height: 1.2;
    font-weight: 900;
  }
  .print-info h2 {
    margin: 5px 0 0 0;
    font-size: 11pt;
    font-weight: normal;
    color: #555;
  }
  .print-mes {
    margin-left: auto;
    text-align: right;
  }
  .print-mes h3 {
    margin: 0;
    font-size: 24pt;
    color: #a41d31;
    text-transform: uppercase;
    font-weight: 900;
  }
  .print-mes span {
    font-size: 12pt;
    color: #fbb558;
    font-weight: bold;
  }

  /* Tabela */
  .print-table {
    width: 100%;
    border-collapse: collapse;
    font-size: 10pt;
  }

  .print-table th {
    background-color: #a41d31 !important; /* Força cor de fundo */
    color: #fff !important;
    text-align: left;
    padding: 8px 10px;
    font-size: 9pt;
    text-transform: uppercase;
    border-bottom: 3px solid #fbb558;
    -webkit-print-color-adjust: exact;
    print-color-adjust: exact;
  }

  .print-table td {
    border-bottom: 1px solid #ccc;
    padding: 8px 10px;
    vertical-align: top;
  }

  /* Evita quebra de linha no meio de um evento */
  tr {
    page-break-inside: avoid;
  }

  /* Colunas */
  .col-data {
    width: 10%;
    text-align: center;
    color: #a41d31;
    font-weight: bold;
    border-right: 1px solid #eee;
  }
  .dia-grande {
    font-size: 14pt;
    display: block;
    line-height: 1;
  }
  .dia-sem {
    font-size: 7pt;
    text-transform: uppercase;
    color: #666;
  }

  .col-hora {
    width: 8%;
    font-weight: bold;
    font-size: 9pt;
  }

  .col-evento {
    width: 42%;
  }
  .print-titulo {
    font-weight: bold;
    font-size: 10pt;
    margin-bottom: 3px;
  }
  .print-tipo {
    font-size: 7pt;
    text-transform: uppercase;
    display: inline-block;
    padding: 1px 5px;
    border-radius: 3px;
    background: #eee;
    color: #555;
    -webkit-print-color-adjust: exact;
    print-color-adjust: exact;
  }
  .tipo-solenidade {
    background: #fff3cd !important;
    color: #856404 !important;
  }

  .col-detalhes {
    width: 40%;
    font-size: 9pt;
    color: #444;
  }
  .print-escala-row {
    margin-bottom: 2px;
  }

  /* Rodapé */
  .print-footer {
    position: fixed;
    bottom: 0;
    left: 0;
    right: 0;
    border-top: 1px solid #ccc;
    padding-top: 10px;
    font-size: 7pt;
    color: #888;
    display: flex;
    justify-content: space-between;
  }
}
'''
    write_file("docs/assets/css/styles.css", styles_1 + styles_2 + styles_3)

    print("✅ Reconstrução concluída!")
    print("⚠️ Nota: Arquivos binários (imagens e fontes) não foram recriados.")

if __name__ == "__main__":
    main()
