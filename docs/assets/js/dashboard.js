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
    // Dentro do init: async function() { ...
    const equipes = await window.api.listarEquipes();
    window.api.cacheEquipesLeitura = equipes.filter(
      (e) => e.tipo_atuacao !== "Canto"
    );
    window.api.cacheEquipesCanto = equipes.filter(
      (e) => e.tipo_atuacao !== "Leitura"
    );
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
  // ==========================================================================
  // 7. GESTÃO DE AGENDA (AÇÕES DO CALENDÁRIO)
  // ==========================================================================

  // =============================
  // 7 - INÍCIO: abrirGerenciadorAgenda
  // =============================
  // Argumentos: dataISO (String YYYY-MM-DD)
  // Descrição: Captura o clique no calendário e abre o modal de edição/gerenciamento.
  abrirGerenciadorAgenda: async function (dataISO) {
    console.log("🛠️ Dashboard: Abrindo gerenciador para a data:", dataISO);

    // 1. Busca se já existe um evento para esta data no cache do motor
    const evento = window.CalendarEngine.eventosLocal[dataISO] || {
      data: dataISO,
      titulo: "Novo Evento",
      tipo_compromisso: "liturgia",
      status: "aprovado",
    };

    // 2. Reutilizamos a estrutura de Modal que já existe no CSS (modal-overlay)
    // Se você não tiver o HTML do modal no dashboard.html, vamos injetar agora
    let modal = document.getElementById("modalOverlay");
    if (!modal) {
      console.error(
        "❌ Erro: Elemento #modalOverlay não encontrado no dashboard.html"
      );
      alert("Erro visual: Estrutura de modal faltando.");
      return;
    }

    // 3. Prepara o conteúdo do Modal para Edição
    // Nota: Aqui invocamos a lógica de "Ativar Edição" que o Admin usa
    this.renderizarEditorNoModal(evento);

    // 4. Exibe o Modal
    modal.classList.add("active");
  },
  // =============================
  // 7 - FIM: abrirGerenciadorAgenda
  // =============================

  // =============================
  // 8 - INÍCIO: renderizarEditorNoModal
  // =============================
  // Argumentos: evento (Object)
  // Descrição: Constrói o formulário com a Identidade Visual Oficial (Vinho/Dourado/Ícones).
  renderizarEditorNoModal: function (evento) {
    const container = document.getElementById("modalContent");
    if (!container) return;

    const dataObj = new Date(evento.data + "T12:00:00");
    const diaNum = dataObj.getDate();
    const mesNome = dataObj
      .toLocaleString("pt-BR", { month: "short" })
      .toUpperCase()
      .replace(".", "");
    const diaSemana = dataObj.toLocaleString("pt-BR", { weekday: "long" });

    // Ícones Oficiais (Mantendo sofisticação)
    const ICONS = {
      leitura:
        '<svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" style="color:var(--cor-vinho)"><path d="M12 3v18.5c-2.3-.6-4.4-1-6.5-1-2.4 0-4.6.5-6.5 1.2V3.2C1.4 2.5 3.6 2 6 2c2.1 0 4.1.4 6 1zm10.5-.8c-1.9-.7-4.1-1.2-6.5-1.2v18.5c2.1 0 4.2.4 6.5 1V3.2z"/></svg>',
      canto:
        '<svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" style="color:var(--cor-dourado)"><path d="M12 3v10.55c-.59-.34-1.27-.55-2-.55-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4V7h4V3h-6z"/></svg>',
    };

    // Define a cor da barra lateral do modal
    let corSidebar = evento.liturgia_cores?.hex_code || "#ccc";
    if (corSidebar.toLowerCase() === "#ffffff") corSidebar = "#eee";

    container.innerHTML = `
        <div class="modal-card" style="max-width: 650px; border-radius: 20px; overflow: hidden; display: flex; flex-direction: row; height: auto; max-height: 90vh;">
            <!-- Faixa Lateral de Cor Litúrgica -->
            <div style="width: 12px; background: ${corSidebar}; flex-shrink: 0;"></div>

            <div class="modal-body" style="padding: 30px; flex: 1; overflow-y: auto; background: #fff;">
                <button class="btn-close" onclick="document.getElementById('modalOverlay').classList.remove('active')" style="top: 20px; right: 20px;">×</button>
                
                <!-- Header de Identidade -->
                <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 25px; border-bottom: 1px solid #f0f0f0; padding-bottom: 15px;">
                    <div>
                        <span style="font-family:'Neulis'; font-size: 2.5rem; font-weight: 900; line-height: 1; color: var(--cor-vinho);">${diaNum}</span>
                        <span style="font-family:'Neulis'; font-size: 1rem; font-weight: 700; color: #666; margin-left: 5px;">${mesNome}</span>
                        <div style="font-size: 0.75rem; text-transform: uppercase; color: #aaa; letter-spacing: 1px;">${diaSemana}</div>
                    </div>
                    <div style="text-align: right">
                        <div style="font-family:'Neulis'; font-size: 0.8rem; font-weight: 800; color: var(--cor-vinho);">GERENCIADOR DE AGENDA</div>
                        <div style="font-size: 0.7rem; color: #999;">Sacristia Digital v4.0</div>
                    </div>
                </div>

                <!-- Formulário -->
                <div id="form-agenda-admin" style="font-family:'AntennaCond';">
                    <label style="font-size: 0.7rem; font-weight: 800; color: #bbb; text-transform: uppercase; letter-spacing: 1px;">Título do Compromisso</label>
                    <input type="text" id="edit-titulo" value="${
                      evento.titulo || ""
                    }" placeholder="Ex: Missa Dominical..." 
                           style="width:100%; padding:12px; margin: 5px 0 20px 0; border: 1px solid #eee; border-radius: 8px; font-size: 1.1rem; font-weight: bold; font-family:'AntennaCond'; background: #fcfcfc;">

                    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-bottom: 20px;">
                        <div>
                            <label style="font-size: 0.7rem; font-weight: 800; color: #bbb; text-transform: uppercase;">Tipo de Atividade</label>
                            <select id="edit-tipo" onchange="window.DashboardController.alternarCamposEvento(this.value)" 
                                    style="width:100%; padding:10px; border: 1px solid #eee; border-radius: 8px; font-family:'AntennaCond'; font-weight: bold; cursor: pointer;">
                                <option value="liturgia" ${
                                  evento.tipo_compromisso === "liturgia"
                                    ? "selected"
                                    : ""
                                }>✝️ Liturgia / Missa</option>
                                <option value="reuniao" ${
                                  evento.tipo_compromisso === "reuniao"
                                    ? "selected"
                                    : ""
                                }>👥 Reunião / Pastoral</option>
                                <option value="evento" ${
                                  evento.tipo_compromisso === "evento"
                                    ? "selected"
                                    : ""
                                }>🎉 Evento / Festa</option>
                            </select>
                        </div>
                        <div id="campo-cor" style="display: ${
                          evento.tipo_compromisso === "liturgia"
                            ? "block"
                            : "none"
                        }">
                            <label style="font-size: 0.7rem; font-weight: 800; color: #bbb; text-transform: uppercase;">Cor Litúrgica</label>
                            <select id="edit-cor" style="width:100%; padding:10px; border: 1px solid #eee; border-radius: 8px; font-family:'AntennaCond'; font-weight: bold;">
                                <option value="1">🟢 Verde (Tempo Comum)</option>
                                <option value="2">⚪ Branco (Festas/Solenidades)</option>
                                <option value="3">🔴 Vermelho (Mártires/Pentecostes)</option>
                                <option value="4">🟣 Roxo (Advento/Quaresma)</option>
                                <option value="5">💗 Rosa (Gaudete/Laetare)</option>
                            </select>
                        </div>
                    </div>

                    <!-- Sessão de Escalas (Onde entra a sofisticação dos ícones) -->
                    <div id="area-escalas-liturgia" style="display: ${
                      evento.tipo_compromisso === "liturgia" ? "block" : "none"
                    }; border-top: 1px solid #f0f0f0; padding-top: 20px;">
                        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 15px;">
                            <label style="font-size: 0.7rem; font-weight: 800; color: #bbb; text-transform: uppercase;">Escalas e Horários</label>
                            <button onclick="window.DashboardController.adicionarLinhaEscala()" 
                                    style="background: #f0f4f7; border: none; padding: 5px 12px; border-radius: 15px; font-size: 0.7rem; font-weight: bold; color: #555; cursor: pointer;">＋ ADICIONAR HORÁRIO</button>
                        </div>
                        <div id="lista-escalas-editor" style="display:flex; flex-direction:column; gap:12px;">
                            ${this.gerarLinhasEscalaEditor(
                              evento.escalas,
                              ICONS
                            )}
                        </div>
                    </div>

                    <!-- Campos Reunião -->
                    <div id="extras-reuniao" style="display: ${
                      evento.tipo_compromisso !== "liturgia" ? "block" : "none"
                    }; background: #fafafa; padding: 15px; border-radius: 12px; border: 1px solid #f0f0f0;">
                        <input type="text" id="edit-local" value="${
                          evento.local || ""
                        }" placeholder="📍 Local (Ex: Salão Paroquial)" style="width:100%; padding:10px; margin-bottom:10px; border: 1px solid #ddd; border-radius: 6px;">
                        <input type="text" id="edit-resp" value="${
                          evento.responsavel || ""
                        }" placeholder="👤 Responsável (Ex: Coord. João)" style="width:100%; padding:10px; border: 1px solid #ddd; border-radius: 6px;">
                    </div>

                    <!-- Ações Finais -->
                    <div style="display:flex; gap:15px; margin-top:35px;">
                        <button onclick="window.DashboardController.salvarAlteracoesAgenda('${
                          evento.data
                        }', ${evento.id || "null"})" 
                                style="flex:2; background: var(--cor-verde); color:white; border:none; padding:16px; border-radius:12px; font-family:'Neulis'; font-weight:900; font-size:1rem; cursor:pointer; box-shadow: 0 4px 15px rgba(46, 125, 50, 0.3);">
                                💾 SALVAR ALTERAÇÕES
                        </button>
                        <button onclick="document.getElementById('modalOverlay').classList.remove('active')" 
                                style="flex:1; background: #fff; border: 1px solid #eee; padding:16px; border-radius:12px; font-family:'AntennaCond'; font-weight:bold; color:#999; cursor:pointer;">
                                Cancelar
                        </button>
                    </div>
                </div>
            </div>
        </div>
    `;
  },
  // =============================
  // 8 - FIM: renderizarEditorNoModal
  // =============================

  // =============================
  // 9 - INÍCIO: gerarLinhasEscalaEditor
  // =============================
  // Argumentos: escalas (Array), icons (Object)
  // Descrição: Cria as linhas de escala com selects estilizados e ícones.
  gerarLinhasEscalaEditor: function (escalas = [], icons = null) {
    const eL = window.api.cacheEquipesLeitura || [];
    const eC = window.api.cacheEquipesCanto || [];

    const buildOpts = (list, sel) =>
      `<option value="">--</option>` +
      list
        .map(
          (e) =>
            `<option value="${e.id}" ${e.id == sel ? "selected" : ""}>${
              e.nome_equipe
            }</option>`
        )
        .join("");

    if (!escalas || escalas.length === 0)
      escalas = [{ hora_celebracao: "19:00" }];

    return escalas
      .map(
        (esc) => `
        <div class="row-escala-edit" style="display: grid; grid-template-columns: 90px 1fr 1fr 40px; gap: 10px; align-items: center; background: #fff; border: 1px solid #f0f0f0; padding: 10px; border-radius: 10px; box-shadow: 0 2px 4px rgba(0,0,0,0.02);">
            <input type="time" class="esc-hora" value="${
              esc.hora_celebracao?.substring(0, 5) || "19:00"
            }" style="border: none; background: #f5f5f5; padding: 8px; border-radius: 6px; font-weight: bold; font-family:'AntennaCond';">
            <div style="display:flex; align-items:center; gap:5px;">${
              icons.leitura
            } <select class="esc-leitura" style="width:100%; border:none; font-size:0.8rem; font-weight:bold;">${buildOpts(
          eL,
          esc.equipe_leitura_id || esc.equipe_leitura?.id
        )}</select></div>
            <div style="display:flex; align-items:center; gap:5px;">${
              icons.canto
            } <select class="esc-canto" style="width:100%; border:none; font-size:0.8rem; font-weight:bold;">${buildOpts(
          eC,
          esc.equipe_canto_id || esc.equipe_canto?.id
        )}</select></div>
            <button onclick="this.parentElement.remove()" style="background:none; border:none; color:#ff4444; font-size:1.2rem; cursor:pointer; opacity:0.3;">&times;</button>
        </div>
    `
      )
      .join("");
  },
  // =============================
  // 9 - FIM: gerarLinhasEscalaEditor
  // =============================
};

// Inicialização segura via DOMContentLoaded
document.addEventListener("DOMContentLoaded", () =>
  window.DashboardController.init()
);
