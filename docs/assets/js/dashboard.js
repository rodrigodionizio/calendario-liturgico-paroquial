/*
 * ARQUIVO: dashboard.js
 * DESCRIÇÃO: Controlador Mestre do Painel Administrativo (SDS Version 8.5)
 * FUNCIONALIDADES: Gestão de Acessos, Agenda Multi-Evento e Confirmações Destrutivas.
 * PADRÃO: System Design Standard (SDS) com OOCSS.
 */

window.DashboardController = {
  agendaAno: new Date().getFullYear(),
  agendaMes: new Date().getMonth() + 1,
  meuPerfil: null,

  // ==========================================================================
  // 1. INICIALIZAÇÃO E SEGURANÇA
  // ==========================================================================

  // =============================
  // 1 - INÍCIO: init
  // =============================
  init: async function () {
    try {
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
      this.meuPerfil = perfil;

      if (document.getElementById("user-name")) {
        document.getElementById("user-name").textContent = (
          perfil?.nome || session.user.email.split("@")[0]
        ).toUpperCase();
      }

      if (this.meuPerfil?.perfil_nivel <= 2) {
        const menuUser = document.getElementById("menu-usuarios");
        if (menuUser) menuUser.style.display = "flex";
      }

      // Cache global de equipes para os formulários
      const equipes = await window.api.listarEquipes();
      window.api.cacheEquipesLeitura = equipes.filter(
        (e) => e.tipo_atuacao !== "Canto"
      );
      window.api.cacheEquipesCanto = equipes.filter(
        (e) => e.tipo_atuacao !== "Leitura"
      );

      await this.atualizarVisaoGeral();
      this.configurarNavegacao();
    } catch (error) {
      console.error("Erro SDS Engine:", error);
    }
  },

  // ==========================================================================
  // 2. GERENCIADOR DE AGENDA (FORMULÁRIO PREMIUM)
  // ==========================================================================

  // =============================
  // 2 - INÍCIO: abrirGerenciadorAgenda
  // =============================
  abrirGerenciadorAgenda: async function (dataISO) {
    const eventosDia = await window.api.buscarEventosDia(dataISO);
    const container = document.getElementById("modalContent");
    const dataFmt = new Date(dataISO + "T12:00:00").toLocaleDateString(
      "pt-BR",
      { weekday: "long", day: "2-digit", month: "long" }
    );

    container.innerHTML = `
            <div class="modal-card o-surface-card" style="max-width: 600px; flex-direction: column;">
                <div class="modal-body" style="padding: 30px;">
                    <button class="btn-close" onclick="window.DashboardController.fecharModal()">×</button>
                    <h2 style="font-family:'Neulis'; color:var(--cor-vinho); margin-bottom:5px;">Agenda do Dia</h2>
                    <p style="font-size:0.85rem; color:#888; margin-bottom:25px; text-transform:uppercase;">${dataFmt}</p>
                    
                    <div id="lista-eventos-dia" style="margin-bottom:25px;">
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
                                <div style="display:flex; gap:10px;">
                                    <button class="c-button" onclick="window.DashboardController.renderizarFormulario('${
                                      ev.data
                                    }', '${
                                    ev.id
                                  }')" style="background:none; border:none; cursor:pointer; font-size:1.2rem;">✏️</button>
                                    <button class="c-button" onclick="window.DashboardController.confirmarExclusao('${
                                      ev.id
                                    }', '${ev.data}', '${
                                    ev.titulo
                                  }')" style="background:none; border:none; cursor:pointer; font-size:1.2rem; color:var(--cor-cereja);">🗑️</button>
                                </div>
                            </div>`
                                )
                                .join("")
                            : '<div class="c-alert">Nenhum compromisso para este dia.</div>'
                        }
                    </div>

                    <button onclick="window.DashboardController.renderizarFormulario('${dataISO}')" class="btn-ver-todas c-button" style="width:100%;">＋ ADICIONAR NOVO COMPROMISSO</button>
                </div>
            </div>`;
    document.getElementById("modalOverlay").classList.add("active");
  },

  // =============================
  // 3 - INÍCIO: renderizarFormulario (SDS SLICK DESIGN)
  // =============================
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
            <div class="modal-card o-surface-card" style="max-width: 580px; flex-direction:column;">
                <div class="modal-body" style="padding: 30px;">
                    <h3 style="font-family:'Neulis'; color:var(--cor-vinho); margin-bottom:20px;">${
                      eventoId ? "Editar" : "Novo"
                    } Compromisso</h3>
                    
                    <div class="form-section">
                        <span class="form-section-title">1. Informações Básicas</span>
                        <select id="edit-tipo" onchange="window.DashboardController.toggleCamposEditor(this.value)" class="o-surface-card" style="width:100%; padding:12px; margin-bottom:15px; border:1px solid #ddd;">
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
                            }>🗣️ Agenda do Padre</option>
                        </select>
                        <input type="text" id="edit-titulo" value="${
                          evento.titulo
                        }" placeholder="Título do Evento" class="o-surface-card" style="width:100%; padding:12px; border:1px solid #ddd; font-weight:bold;">
                    </div>

                    <div id="campos-liturgia" class="form-section" style="display: ${
                      evento.tipo_compromisso === "liturgia" ? "block" : "none"
                    }">
                        <span class="form-section-title">2. Escalas Litúrgicas</span>
                        <select id="edit-cor" class="o-surface-card" style="width:100%; padding:12px; margin-bottom:15px; border:1px solid #ddd;">
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
                        </select>
                        <div id="lista-escalas-editor">${this.gerarLinhasEscalaEditor(
                          evento.escalas
                        )}</div>
                        <button onclick="window.DashboardController.adicionarLinhaEscala()" style="width:100%; background:none; border:1px dashed #ccc; padding:10px; margin-top:10px; cursor:pointer; border-radius:8px;">＋ Horário</button>
                    </div>

                    <div id="campos-agenda" class="form-section" style="display: ${
                      evento.tipo_compromisso !== "liturgia" ? "grid" : "none"
                    }; grid-template-columns: 1fr 1fr; gap:10px;">
                        <input type="time" id="edit-hora" value="${
                          evento.hora_inicio || "19:00"
                        }" class="o-surface-card" style="padding:10px; border:1px solid #ddd;">
                        <input type="text" id="edit-local" value="${
                          evento.local || ""
                        }" placeholder="Local" class="o-surface-card" style="padding:10px; border:1px solid #ddd;">
                    </div>

                    <div style="display:flex; gap:12px; margin-top:25px;">
                        <button id="btn-save-agenda" onclick="window.DashboardController.salvarFinal('${dataISO}', ${
      eventoId ? `'${eventoId}'` : "null"
    })" class="btn-ver-todas c-button" style="flex:2; background:var(--sys-color-success);">💾 SALVAR COMPROMISSO</button>
                        <button onclick="window.DashboardController.abrirGerenciadorAgenda('${dataISO}')" class="btn-ver-todas c-button" style="flex:1; background:#eee; color:#666;">VOLTAR</button>
                    </div>
                </div>
            </div>`;
  },

  // ==========================================================================
  // 3. GESTÃO DE ACESSOS (CORREÇÃO DE SALVAMENTO)
  // ==========================================================================

  // =============================
  // 4 - INÍCIO: abrirModalUsuario
  // =============================
  abrirModalUsuario: async function (u = null) {
    const container = document.getElementById("modalContent");
    container.innerHTML = `
            <div class="modal-card o-surface-card" style="max-width: 480px; flex-direction:column;">
                <div class="modal-body" style="padding: 30px;">
                    <button class="btn-close" onclick="window.DashboardController.fecharModal()">×</button>
                    <h3 style="font-family:'Neulis'; color:var(--cor-vinho); margin-bottom:25px;">${
                      u ? "Editar" : "Novo"
                    } Acesso</h3>
                    
                    <div class="form-section">
                        <label class="kpi-label">E-mail Autorizado</label>
                        <input type="email" id="user-email" value="${
                          u?.email || ""
                        }" class="o-surface-card" style="width:100%; padding:12px; margin-bottom:15px; border:1px solid #ddd;">
                        
                        <label class="kpi-label">Nome do Coordenador</label>
                        <input type="text" id="user-nome" value="${
                          u?.nome || ""
                        }" class="o-surface-card" style="width:100%; padding:12px; margin-bottom:15px; border:1px solid #ddd;">
                        
                        <label class="kpi-label">Nível de Permissão</label>
                        <select id="user-nivel" class="o-surface-card" style="width:100%; padding:12px; border:1px solid #ddd;">
                            <option value="1" ${
                              u?.perfil_nivel == 1 ? "selected" : ""
                            }>👑 Nível 1 - Master</option>
                            <option value="2" ${
                              u?.perfil_nivel == 2 ? "selected" : ""
                            }>🏢 Nível 2 - Secretaria</option>
                            <option value="3" ${
                              u?.perfil_nivel == 3 ? "selected" : ""
                            }>👥 Nível 3 - Coordenador</option>
                        </select>
                    </div>

                    <button id="btn-save-user" onclick="window.DashboardController.salvarUsuarioFinal('${
                      u?.id || ""
                    }')" class="btn-ver-todas c-button" style="width:100%; background:var(--sys-color-success);">💾 SALVAR ACESSO</button>
                </div>
            </div>`;
    document.getElementById("modalOverlay").classList.add("active");
  },

  // =============/================
  // 5 - INÍCIO: salvarUsuarioFinal
  // =============/================
  salvarUsuarioFinal: async function (id) {
    const btn = document.getElementById("btn-save-user");
    btn.classList.add("c-button--loading");

    const payload = {
      id: id || null,
      email: document.getElementById("user-email").value,
      nome: document.getElementById("user-nome").value,
      perfil_nivel: document.getElementById("user-nivel").value,
    };

    try {
      await window.api.salvarUsuario(payload);
      this.fecharModal();
      this.renderizarAbaUsuarios();
    } catch (e) {
      alert("Erro ao salvar usuário.");
    } finally {
      btn.classList.remove("c-button--loading");
    }
  },

  // ==========================================================================
  // 4. CONFIRMAÇÕES DE EXCLUSÃO (SDS ALERT)
  // ==========================================================================

  // =============/================
  // 6 - INÍCIO: confirmarExclusao
  // =============/================
  confirmarExclusao: function (id, dataISO, titulo) {
    const container = document.getElementById("modalContent");
    container.innerHTML = `
            <div class="modal-card o-surface-card" style="max-width: 450px;">
                <div class="modal-body" style="padding: 30px;">
                    <div class="c-alert c-alert--destructive">
                        <span class="c-alert__icon">⚠️</span>
                        <div class="c-alert__content">
                            <span class="c-alert__title">Ação Irreversível</span>
                            Você está prestes a excluir permanentemente: <strong>${titulo}</strong>. Deseja continuar?
                        </div>
                    </div>
                    <div style="display:flex; gap:12px;">
                        <button id="btn-confirm-del" onclick="window.DashboardController.executarExclusao('${id}', '${dataISO}')" class="btn-ver-todas c-button" style="flex:1; background:var(--cor-cereja);">SIM, EXCLUIR</button>
                        <button onclick="window.DashboardController.abrirGerenciadorAgenda('${dataISO}')" class="btn-ver-todas c-button" style="flex:1; background:#eee; color:#666;">CANCELAR</button>
                    </div>
                </div>
            </div>`;
  },

  executarExclusao: async function (id, dataISO) {
    const btn = document.getElementById("btn-confirm-del");
    btn.classList.add("c-button--loading");
    try {
      await window.api.client.from("eventos_base").delete().eq("id", id);
      this.abrirGerenciadorAgenda(dataISO);
      window.CalendarEngine.carregarERenderizar();
    } catch (e) {
      alert("Erro ao excluir.");
    }
  },

  // --- MÉTODOS AUXILIARES ---
  fecharModal: function () {
    document.getElementById("modalOverlay").classList.remove("active");
  },

  toggleCamposEditor: function (tipo) {
    document.getElementById("campos-liturgia").style.display =
      tipo === "liturgia" ? "block" : "none";
    document.getElementById("campos-agenda").style.display =
      tipo !== "liturgia" ? "grid" : "none";
  },

  salvarFinal: async function (dataISO, eventoId) {
    const btn = document.getElementById("btn-save-agenda");
    btn.classList.add("c-button--loading");

    const tipo = document.getElementById("edit-tipo").value;
    const payload = {
      id: eventoId,
      data: dataISO,
      titulo: document.getElementById("edit-titulo").value,
      tipo_compromisso: tipo,
      hora_inicio:
        tipo !== "liturgia" ? document.getElementById("edit-hora").value : null,
      local:
        tipo !== "liturgia" ? document.getElementById("edit-local").value : "",
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
      this.abrirGerenciadorAgenda(dataISO);
      window.CalendarEngine.carregarERenderizar();
    } catch (e) {
      alert("Erro: " + e.message);
    } finally {
      btn.classList.remove("c-button--loading");
    }
  },

  // Reuso do gerador de escalas (integrado)
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
                <button onclick="this.parentElement.remove()" style="background:none; border:none; color:red; cursor:pointer;">×</button>
            </div>`
      )
      .join("");
  },

  adicionarLinhaEscala: function () {
    const container = document.getElementById("lista-escalas-editor");
    const div = document.createElement("div");
    div.innerHTML = this.gerarLinhasEscalaEditor([{}]);
    container.appendChild(div.firstElementChild);
  },

  // ... (métodos de navegação, gráfico e lista permanecem integrados) ...
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
    const container =
      document.getElementById("admin-chart") ||
      document.getElementById("chart-week");
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
    const container =
      document.getElementById("admin-event-list") ||
      document.getElementById("lista-pendentes-resumo");
    if (!container) return;
    const eventos = await window.api.buscarEventosRecentes(6);
    container.innerHTML = eventos
      .map(
        (ev) => `
            <div class="list-item o-surface-card">
                <div class="list-content"><strong>${
                  ev.titulo
                }</strong><br><small>${ev.tipo_compromisso.toUpperCase()}</small></div>
                <div class="status-dot ${
                  ev.status === "pendente" ? "status-wait" : "status-ok"
                }"></div>
            </div>`
      )
      .join("");
  },

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
                    (eq) =>
                      `<div class="list-item o-surface-card"><div class="list-content"><strong>${
                        eq.nome_equipe
                      }</strong><br><small>${
                        eq.tipo_atuacao
                      }</small></div><button onclick='window.DashboardController.abrirModalEquipe(${JSON.stringify(
                        eq
                      )})' style="background:none; border:none; cursor:pointer; font-size:1.1rem;">✏️</button></div>`
                  )
                  .join("")}
            </div>`;
  },

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
                    (u) =>
                      `<div class="list-item o-surface-card"><div class="list-content"><strong>${
                        u.nome || "Sem Nome"
                      }</strong><br><small>${u.email} • Nível ${
                        u.perfil_nivel
                      }</small></div><button onclick='window.DashboardController.abrirModalUsuario(${JSON.stringify(
                        u
                      )})' style="background:none; border:none; cursor:pointer;">✏️</button></div>`
                  )
                  .join("")}
            </div>`;
  },
};

document.addEventListener("DOMContentLoaded", () =>
  window.DashboardController.init()
);
