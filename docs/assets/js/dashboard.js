/*
 * ARQUIVO: dashboard.js
 * DESCRIÇÃO: Controlador Mestre do Painel Administrativo (SaaS Ready)
 * FUNCIONALIDADES: KPIs, Gráficos, Gestão de Equipes e Gerenciador de Agenda Multi-Evento.
 * PROJETO: Liturgia Paroquial 2026
 * VERSÃO: 5.0 (Revisão Completa e Estável)
 */

window.DashboardController = {
  // ==========================================================================
  // 1. INICIALIZAÇÃO E SEGURANÇA
  // ==========================================================================

  // =============================
  // 1 - INÍCIO: init
  // =============================
  // Argumentos: Nenhum
  // Descrição: Valida sessão, libera visibilidade e inicia caches de equipes.
  init: async function () {
    console.log("🛠️ Dashboard: Sincronizando infraestrutura...");

    const session = await window.api.checkSession();
    if (!session) {
      window.location.href = "admin.html";
      return;
    }

    // Libera a tela (CSS opacity:0 -> 1)
    document.body.classList.add("auth-ok");

    // Cache de Equipes para os Seletores (Otimização de performance)
    const equipes = await window.api.listarEquipes();
    window.api.cacheEquipesLeitura = equipes.filter(
      (e) => e.tipo_atuacao !== "Canto"
    );
    window.api.cacheEquipesCanto = equipes.filter(
      (e) => e.tipo_atuacao !== "Leitura"
    );

    // Identidade do Usuário
    const nameElem =
      document.getElementById("admin-nome") ||
      document.getElementById("user-name");
    if (nameElem) {
      nameElem.textContent = session.user.email.split("@")[0].toUpperCase();
    }

    await this.atualizarVisaoGeral();
    this.configurarNavegacao();
    console.log("✅ Dashboard: Módulos operacionais.");
  },
  // =============================
  // 1 - FIM: init
  // =============================

  // ==========================================================================
  // 2. GESTÃO DE MÉTRICAS E KPIs
  // ==========================================================================

  // =============/================
  // 2 - INÍCIO: atualizarVisaoGeral
  // =============/================
  atualizarVisaoGeral: async function () {
    try {
      const stats = await window.api.buscarEstatisticasDashboard();

      if (document.getElementById("kpi-semana")) {
        document.getElementById("kpi-semana").textContent = stats.semana;
        document.getElementById("kpi-pendentes").textContent = stats.pendentes;
        document.getElementById("kpi-mural").textContent = stats.mural;
        document.getElementById("kpi-equipes").textContent = stats.equipes;
      }

      const badge = document.getElementById("badge-pendentes");
      if (badge) badge.textContent = stats.pendentes;

      await this.renderizarGraficoCarga();
      await this.renderizarListaRecentes();
    } catch (error) {
      console.error("❌ Erro em atualizarVisaoGeral:", error);
    }
  },
  // =============/================
  // 2 - FIM: atualizarVisaoGeral
  // =============/================

  // ==========================================================================
  // 3. MOTOR DE CALENDÁRIO
  // ==========================================================================

  // =============/================
  // 3 - INÍCIO: carregarAgendaTotal
  // =============/================
  carregarAgendaTotal: async function () {
    const selector = "#admin-calendar-grid";
    if (window.CalendarEngine) {
      await window.CalendarEngine.init({
        selector: selector,
        isAdmin: true,
        ano: 2026,
        mes: 1,
      });
    }
  },
  // =============/================
  // 3 - FIM: carregarAgendaTotal
  // =============/================

  // ==========================================================================
  // 4. INTERFACE E TABS
  // ==========================================================================

  // =============/================
  // 4 - INÍCIO: configurarNavegacao
  // =============/================
  configurarNavegacao: function () {
    const menuItems = document.querySelectorAll(".menu-item[data-tab]");
    const tabs = document.querySelectorAll(".tab-content");

    menuItems.forEach((item) => {
      item.addEventListener("click", async () => {
        const targetTab = item.getAttribute("data-tab");
        menuItems.forEach((i) => i.classList.remove("active"));
        tabs.forEach((t) => t.classList.remove("active"));

        item.classList.add("active");
        const targetElement = document.getElementById(`tab-${targetTab}`);
        if (targetElement) targetElement.classList.add("active");

        if (targetTab === "agenda-total") await this.carregarAgendaTotal();
        else if (targetTab === "visao-geral") await this.atualizarVisaoGeral();
        else if (targetTab === "equipes") await this.renderizarAbaEquipes();
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
                            <tr><th>Equipe / Pastoral</th><th>Atuação</th><th style="text-align:right">Ações</th></tr>
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
                                        )})' style="background:none; border:none; cursor:pointer;">✏️</button>
                                        <button onclick="window.DashboardController.deletarEquipe(${
                                          eq.id
                                        })" style="background:none; border:none; cursor:pointer; margin-left:10px;">🗑️</button>
                                    </td>
                                </tr>`
                              )
                              .join("")}
                        </tbody>
                    </table>
                </div>`;
    } catch (e) {
      console.error(e);
    }
  },
  // =============/================
  // 5 - FIM: renderizarAbaEquipes
  // =============/================

  // ==========================================================================
  // 7. GESTÃO DE AGENDA (AÇÕES DO CALENDÁRIO)
  // ==========================================================================

  // =============================
  // 7 - INÍCIO: abrirGerenciadorAgenda
  // =============================
  // Argumentos: dataISO (String YYYY-MM-DD)
  // Descrição: Abre a visão de lista para gerenciar múltiplos compromissos no mesmo dia.
  abrirGerenciadorAgenda: async function (dataISO) {
    console.log("🛠️ Abrindo Agenda do Dia:", dataISO);
    const eventosDia = await window.api.buscarEventosDia(dataISO);
    const dataFmt = new Date(dataISO + "T12:00:00").toLocaleDateString(
      "pt-BR",
      { weekday: "long", day: "2-digit", month: "long" }
    );

    const container = document.getElementById("modalContent");
    container.innerHTML = `
            <div class="modal-card" style="max-width: 600px; flex-direction: column; max-height: 85vh;">
                <div class="modal-body" style="overflow-y: auto; padding: 30px;">
                    <button class="btn-close" onclick="window.DashboardController.fecharModal()">×</button>
                    <h2 style="font-family:'Neulis'; color:var(--cor-vinho); margin-bottom:5px;">Agenda do Dia</h2>
                    <p style="text-transform:uppercase; font-size:0.8rem; color:#888; margin-bottom:25px; border-bottom:1px solid #eee; padding-bottom:10px;">${dataFmt}</p>
                    
                    <div id="lista-eventos-dia" style="margin-bottom:25px;">
                        ${
                          eventosDia.length > 0
                            ? eventosDia
                                .map((ev) => this.gerarHtmlItemLista(ev))
                                .join("")
                            : '<div style="text-align:center; padding:20px; color:#999; font-style:italic;">Sem compromissos agendados para hoje.</div>'
                        }
                    </div>

                    <button onclick="window.DashboardController.renderizarFormulario('${dataISO}')" 
                            style="width:100%; padding:15px; background:var(--cor-vinho); color:white; border:none; border-radius:12px; font-family:'Neulis'; font-weight:800; cursor:pointer; box-shadow: 0 4px 10px rgba(164, 29, 49, 0.2);">
                            ＋ ADICIONAR NOVO COMPROMISSO
                    </button>
                </div>
            </div>`;
    document.getElementById("modalOverlay").classList.add("active");
  },
  // =============================
  // 7 - FIM: abrirGerenciadorAgenda
  // =============================

  // =============/================
  // 7.1 - INÍCIO: gerarHtmlItemLista
  // =============/================
  gerarHtmlItemLista: function (ev) {
    const hora = ev.hora_inicio
      ? ev.hora_inicio.substring(0, 5)
      : ev.escalas?.[0]?.hora_celebracao.substring(0, 5) || "--:--";
    const icon =
      ev.tipo_compromisso === "liturgia"
        ? "✝️"
        : ev.tipo_compromisso === "reuniao"
        ? "👥"
        : "🗣️";
    const cor = ev.liturgia_cores?.hex_code || "#ccc";

    return `
            <div style="display:flex; align-items:center; justify-content:space-between; padding:15px; background:#fff; border:1px solid #eee; border-radius:12px; margin-bottom:10px; border-left:6px solid ${cor};">
                <div style="flex:1;">
                    <div style="font-weight:bold; color:var(--cor-vinho); font-size:1rem;">${hora} | ${icon} ${
      ev.titulo
    }</div>
                    <div style="font-size:0.8rem; color:#666; font-family:'AntennaCond';">📍 ${
                      ev.local || "Não informado"
                    }</div>
                </div>
                <div style="display:flex; gap:12px;">
                    <button onclick="window.DashboardController.renderizarFormulario('${
                      ev.data
                    }', '${
      ev.id
    }')" style="background:none; border:none; cursor:pointer; font-size:1.2rem;">✏️</button>
                    <button onclick="window.DashboardController.deletarEvento('${
                      ev.id
                    }', '${
      ev.data
    }')" style="background:none; border:none; cursor:pointer; font-size:1.2rem;">🗑️</button>
                </div>
            </div>`;
  },
  // =============/================
  // 7.1 - FIM: gerarHtmlItemLista
  // =============/================

  // ==========================================================================
  // 8. EDITOR DE EVENTO (DYNAMIC FORM)
  // ==========================================================================

  // =============/================
  // 8 - INÍCIO: renderizarFormulario
  // =============/================
  // Argumentos: dataISO (String), eventoId (UUID|null)
  // Descrição: Renderiza o formulário de edição/criação com troca dinâmica de campos.
  renderizarFormulario: async function (dataISO, eventoId = null) {
    let evento = {
      data: dataISO,
      tipo_compromisso: "liturgia",
      titulo: "",
      escalas: [],
    };

    if (eventoId && eventoId !== "null") {
      const { data } = await window.api.client
        .from("eventos_base")
        .select("*, escalas(*)")
        .eq("id", eventoId)
        .single();
      evento = data;
    }

    const container = document.getElementById("modalContent");
    container.innerHTML = `
            <div class="modal-card" style="max-width: 550px; border-radius:20px;">
                <div class="modal-body" style="padding:30px;">
                    <h3 style="font-family:'Neulis'; color:var(--cor-vinho); margin-bottom:20px;">${
                      eventoId ? "Editar" : "Novo"
                    } Compromisso</h3>
                    
                    <div style="margin-bottom:15px;">
                        <label style="font-size:0.7rem; font-weight:bold; color:#aaa; text-transform:uppercase;">Tipo de Compromisso</label>
                        <select id="edit-tipo" onchange="window.DashboardController.toggleCamposEditor(this.value)" style="width:100%; padding:12px; border-radius:8px; border:1px solid #ddd; font-weight:bold; font-family:'AntennaCond';">
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
                            <option value="atendimento" ${
                              evento.tipo_compromisso === "atendimento"
                                ? "selected"
                                : ""
                            }>🗣️ Agenda do Padre / Atendimento</option>
                        </select>
                    </div>

                    <div style="margin-bottom:15px;">
                        <label style="font-size:0.7rem; font-weight:bold; color:#aaa; text-transform:uppercase;">Título / Assunto</label>
                        <input type="text" id="edit-titulo" value="${
                          evento.titulo
                        }" placeholder="Ex: Missa de Sétimo Dia" style="width:100%; padding:12px; border-radius:8px; border:1px solid #ddd; font-size:1.1rem; font-family:'AntennaCond';">
                    </div>

                    <!-- Campos Específicos: Liturgia -->
                    <div id="campos-liturgia" style="display: ${
                      evento.tipo_compromisso === "liturgia" ? "block" : "none"
                    }">
                        <label style="font-size:0.7rem; font-weight:bold; color:#aaa; text-transform:uppercase;">Cor Litúrgica</label>
                        <select id="edit-cor" style="width:100%; padding:10px; margin-bottom:15px; border-radius:8px; border:1px solid #ddd;">
                             <option value="1" ${
                               evento.cor_id == 1 ? "selected" : ""
                             }>🟢 Verde</option>
                             <option value="2" ${
                               evento.cor_id == 2 ? "selected" : ""
                             }>⚪ Branco</option>
                             <option value="3" ${
                               evento.cor_id == 3 ? "selected" : ""
                             }>🔴 Vermelho</option>
                             <option value="4" ${
                               evento.cor_id == 4 ? "selected" : ""
                             }>🟣 Roxo</option>
                             <option value="5" ${
                               evento.cor_id == 5 ? "selected" : ""
                             }>💗 Rosa</option>
                        </select>
                        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:10px;">
                            <span style="font-size:0.7rem; font-weight:bold; color:#aaa; text-transform:uppercase;">Escalas</span>
                            <button onclick="window.DashboardController.adicionarLinhaEscala()" style="background:#eee; border:none; padding:4px 10px; border-radius:4px; font-size:0.7rem; cursor:pointer;">＋ Horário</button>
                        </div>
                        <div id="lista-escalas-editor"> ${this.gerarLinhasEscalaEditor(
                          evento.escalas
                        )} </div>
                    </div>

                    <!-- Campos Específicos: Reunião / Padre -->
                    <div id="campos-agenda" style="display: ${
                      evento.tipo_compromisso !== "liturgia" ? "grid" : "none"
                    }; grid-template-columns: 1fr 1fr; gap:10px; margin-bottom:15px;">
                        <div>
                            <label style="font-size:0.7rem; font-weight:bold; color:#aaa; text-transform:uppercase;">Horário</label>
                            <input type="time" id="edit-hora" value="${
                              evento.hora_inicio || "19:00"
                            }" style="width:100%; padding:10px; border-radius:8px; border:1px solid #ddd;">
                        </div>
                        <div>
                            <label style="font-size:0.7rem; font-weight:bold; color:#aaa; text-transform:uppercase;">Local</label>
                            <input type="text" id="edit-local" value="${
                              evento.local || ""
                            }" placeholder="Ex: Sacristia" style="width:100%; padding:10px; border-radius:8px; border:1px solid #ddd;">
                        </div>
                        <div style="grid-column: 1 / -1;">
                            <label style="font-size:0.7rem; font-weight:bold; color:#aaa; text-transform:uppercase;">Responsável / Observação</label>
                            <input type="text" id="edit-resp" value="${
                              evento.responsavel || ""
                            }" placeholder="Ex: Coord. Pastoral" style="width:100%; padding:10px; border-radius:8px; border:1px solid #ddd;">
                        </div>
                    </div>

                    <div style="display:flex; gap:10px; margin-top:30px;">
                        <button onclick="window.DashboardController.salvarFinal('${dataISO}', ${
      eventoId ? `'${eventoId}'` : "null"
    })" style="flex:2; padding:15px; background:var(--cor-verde); color:white; border:none; border-radius:10px; font-family:'Neulis'; font-weight:900; cursor:pointer;">💾 SALVAR</button>
                        <button onclick="window.DashboardController.abrirGerenciadorAgenda('${dataISO}')" style="flex:1; padding:15px; background:#f5f5f5; border:none; border-radius:10px; font-family:'AntennaCond'; font-weight:bold; cursor:pointer;">VOLTAR</button>
                    </div>
                </div>
            </div>`;
  },
  // =============/================
  // 8 - FIM: renderizarFormulario
  // =============/================

  // ==========================================================================
  // 9. FUNÇÕES AUXILIARES E PERSISTÊNCIA
  // ==========================================================================

  // =============/================
  // 9 - INÍCIO: gerarLinhasEscalaEditor
  // =============/================
  gerarLinhasEscalaEditor: function (escalas = []) {
    const eL = window.api.cacheEquipesLeitura || [];
    const eC = window.api.cacheEquipesCanto || [];
    const build = (l, s) =>
      `<option value="">--</option>` +
      l
        .map(
          (e) =>
            `<option value="${e.id}" ${e.id == s ? "selected" : ""}>${
              e.nome_equipe
            }</option>`
        )
        .join("");

    if (!escalas || escalas.length === 0)
      escalas = [{ hora_celebracao: "19:00" }];

    return escalas
      .map(
        (esc) => `
            <div class="row-escala-edit" style="display: grid; grid-template-columns: 85px 1fr 1fr 30px; gap:8px; margin-bottom:8px; background:#f9f9f9; padding:8px; border-radius:8px; border:1px solid #eee;">
                <input type="time" class="esc-hora" value="${
                  esc.hora_celebracao?.substring(0, 5) || "19:00"
                }" style="border:none; background:none; font-weight:bold;">
                <select class="esc-leitura" style="width:100%; border:none; background:none; font-size:0.8rem;">${build(
                  eL,
                  esc.equipe_leitura_id || esc.equipe_leitura?.id
                )}</select>
                <select class="esc-canto" style="width:100%; border:none; background:none; font-size:0.8rem;">${build(
                  eC,
                  esc.equipe_canto_id || esc.equipe_canto?.id
                )}</select>
                <button onclick="this.parentElement.remove()" style="background:none; border:none; color:red; cursor:pointer; font-weight:bold;">×</button>
            </div>`
      )
      .join("");
  },
  // =============/================
  // 9 - FIM: gerarLinhasEscalaEditor
  // =============/================

  toggleCamposEditor: function (tipo) {
    document.getElementById("campos-liturgia").style.display =
      tipo === "liturgia" ? "block" : "none";
    document.getElementById("campos-agenda").style.display =
      tipo !== "liturgia" ? "grid" : "none";
  },

  adicionarLinhaEscala: function () {
    const container = document.getElementById("lista-escalas-editor");
    const div = document.createElement("div");
    div.innerHTML = this.gerarLinhasEscalaEditor([{}]);
    container.appendChild(div.firstElementChild);
  },

  // =============/================
  // 9.1 - INÍCIO: salvarFinal
  // =============/================
  salvarFinal: async function (dataISO, eventoId) {
    const tipo = document.getElementById("edit-tipo").value;
    const titulo = document.getElementById("edit-titulo").value;
    if (!titulo) return alert("Título obrigatório");

    const payload = {
      id: eventoId,
      data: dataISO,
      titulo: titulo,
      tipo_compromisso: tipo,
      hora_inicio:
        tipo !== "liturgia" ? document.getElementById("edit-hora").value : null,
      local:
        tipo !== "liturgia" ? document.getElementById("edit-local").value : "",
      responsavel:
        tipo !== "liturgia" ? document.getElementById("edit-resp").value : "",
      cor_id:
        tipo === "liturgia"
          ? parseInt(document.getElementById("edit-cor").value)
          : 1,
      status: "aprovado",
    };

    const escalas = [];
    if (tipo === "liturgia") {
      document.querySelectorAll(".row-escala-edit").forEach((row) => {
        escalas.push({
          hora_celebracao: row.querySelector(".esc-hora").value,
          equipe_leitura_id: row.querySelector(".esc-leitura").value || null,
          equipe_canto_id: row.querySelector(".esc-canto").value || null,
        });
      });
    }

    try {
      await window.api.salvarEventoCompleto(payload, escalas);
      alert("✅ Atualizado com sucesso!");
      this.abrirGerenciadorAgenda(dataISO);
      window.CalendarEngine.carregarERenderizar();
    } catch (e) {
      alert("Erro ao salvar: " + e.message);
    }
  },
  // =============/================
  // 9.1 - FIM: salvarFinal
  // =============/================

  deletarEvento: async function (id, dataISO) {
    if (!confirm("⚠️ Excluir este compromisso permanentemente?")) return;
    try {
      await window.api.client.from("eventos_base").delete().eq("id", id);
      this.abrirGerenciadorAgenda(dataISO);
      window.CalendarEngine.carregarERenderizar();
    } catch (e) {
      alert("Erro ao excluir.");
    }
  },

  fecharModal: function () {
    document.getElementById("modalOverlay").classList.remove("active");
  },

  // ==========================================================================
  // 6. MÉTODOS GRÁFICOS (VISÃO GERAL)
  // ==========================================================================

  renderizarGraficoCarga: async function () {
    const container =
      document.getElementById("admin-chart") ||
      document.getElementById("chart-week");
    if (!container) return;
    const eventos = await window.api.buscarEventosProximos(7);
    const diasSemana = ["DOM", "SEG", "TER", "QUA", "QUI", "SEX", "SÁB"];
    const densidade = [0, 0, 0, 0, 0, 0, 0];
    eventos.forEach(
      (ev) => densidade[new Date(ev.data + "T12:00:00").getDay()]++
    );
    const max = Math.max(...densidade, 1);
    container.innerHTML = densidade
      .map(
        (count, i) => `
            <div class="chart-bar-group">
                <div class="chart-bar" style="height: ${
                  (count / max) * 100
                }%" title="${count} eventos"></div>
                <div class="chart-label">${diasSemana[i]}</div>
            </div>`
      )
      .join("");
  },

  renderizarListaRecentes: async function () {
    const container =
      document.getElementById("admin-recent-list") ||
      document.getElementById("lista-pendentes-resumo");
    if (!container) return;
    const eventos = await window.api.buscarEventosRecentes(5);
    container.innerHTML = eventos
      .map((ev) => {
        const dataObj = new Date(ev.data + "T12:00:00");
        return `
                <div class="list-item">
                    <div class="list-date"><span>${dataObj
                      .getDate()
                      .toString()
                      .padStart(2, "0")}</span><small>${dataObj
          .toLocaleString("pt-BR", { month: "short" })
          .toUpperCase()
          .replace(".", "")}</small></div>
                    <div class="list-content"><div class="list-title">${
                      ev.titulo
                    }</div><div class="list-meta">${ev.tipo_compromisso.toUpperCase()}</div></div>
                    <div class="status-dot ${
                      ev.status === "pendente" ? "status-wait" : "status-ok"
                    }"></div>
                </div>`;
      })
      .join("");
  },
};

document.addEventListener("DOMContentLoaded", () =>
  window.DashboardController.init()
);
