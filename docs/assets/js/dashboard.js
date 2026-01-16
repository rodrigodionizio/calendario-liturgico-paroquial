/*
 * ARQUIVO: dashboard.js
 * VERSÃO: 9.0 (Full Integration - Integridade Total)
 * DESCRIÇÃO: Controlador Mestre do Dashboard com suporte a Agenda, Equipes e Acessos.
 */

window.DashboardController = {
  agendaAno: new Date().getFullYear(),
  agendaMes: new Date().getMonth() + 1,
  meuPerfil: null,

  // ==========================================================================
  // 1. INICIALIZAÇÃO
  // ==========================================================================

  // =============================
  // 1 - INÍCIO: init
  // =============================
  init: async function () {
    console.log("🛠️ SDS Engine: Sincronizando sistema...");
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

      // Cache de equipes para seletores
      const equipes = await window.api.listarEquipes();
      window.api.cacheEquipesLeitura = equipes.filter(
        (e) => e.tipo_atuacao !== "Canto"
      );
      window.api.cacheEquipesCanto = equipes.filter(
        (e) => e.tipo_atuacao !== "Leitura"
      );

      await this.atualizarVisaoGeral();
      this.configurarNavegacao();
      console.log("✅ SDS Engine: Prontidão confirmada.");
    } catch (e) {
      console.error("Erro Init:", e);
    }
  },

  // ==========================================================================
  // 2. NAVEGAÇÃO E TABS
  // ==========================================================================

  configurarNavegacao: function () {
    const menuItems = document.querySelectorAll(".menu-item[data-tab]");
    menuItems.forEach((item) => {
      item.addEventListener("click", async () => {
        const targetTab = item.getAttribute("data-tab");
        document
          .querySelectorAll(".menu-item, .tab-content")
          .forEach((el) => el.classList.remove("active"));
        item.classList.add("active");
        const panel = document.getElementById(`tab-${targetTab}`);
        if (panel) panel.classList.add("active");

        // Chamadas explícitas para garantir integridade
        if (targetTab === "agenda-total")
          await window.DashboardController.carregarAgendaTotal();
        else if (targetTab === "visao-geral")
          await window.DashboardController.atualizarVisaoGeral();
        else if (targetTab === "equipes")
          await window.DashboardController.renderizarAbaEquipes();
        else if (targetTab === "usuarios")
          await window.DashboardController.renderizarAbaUsuarios();
      });
    });
  },

  // ==========================================================================
  // 3. GESTÃO DE AGENDA (CALENDÁRIO)
  // ==========================================================================

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
                    <h2 style="font-family:'Neulis'; color:var(--cor-vinho);">Agenda do Dia</h2>
                    <p style="color:#888; margin-bottom:20px;">${dataFmt}</p>
                    <div id="lista-eventos-dia" style="margin-bottom:25px;">
                        ${eventosDia.length > 0
        ? eventosDia
          .map(
            (ev) => `
                            <div class="list-item o-surface-card" style="border-left:5px solid ${ev.liturgia_cores?.hex_code || "#64748b"
              }">
                                <div class="list-content">
                                    <strong>${(
                ev.hora_inicio || "--:--"
              ).substring(0, 5)} | ${ev.titulo}</strong>
                                    <br><small>${ev.local || "Paróquia"}</small>
                                </div>
                                <div style="display:flex; gap:10px;">
                                    <button onclick="window.DashboardController.renderizarFormulario('${ev.data
              }', '${ev.id
              }')" style="background:none; border:none; cursor:pointer; font-size:1.2rem;">✏️</button>
                                    <button onclick="window.DashboardController.confirmarExclusao('${ev.id
              }', '${ev.data}', '${ev.titulo
              }')" style="background:none; border:none; cursor:pointer; font-size:1.2rem; color:var(--cor-cereja);">🗑️</button>
                                </div>
                            </div>`
          )
          .join("")
        : '<div class="c-alert">Sem compromissos agendados.</div>'
      }
                    </div>
                    <button onclick="window.DashboardController.renderizarFormulario('${dataISO}')" class="btn-ver-todas" style="width:100%;">＋ ADICIONAR NOVO COMPROMISSO</button>
                </div>
            </div>`;
    document.getElementById("modalOverlay").classList.add("active");
  },

  // ==========================================================================
  // 4. EDITOR DE COMPROMISSO (FORMULÁRIO SDS)
  // ==========================================================================

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
                <div class="modal-body" style="padding: 30px; overflow-y:auto; max-height:85vh;">
                    <h3 style="font-family:'Neulis'; color:var(--cor-vinho); margin-bottom:20px;">${eventoId ? "Editar" : "Novo"
      } Atividade</h3>
                    
                    <div class="form-section">
                        <span class="form-section-title">1. Informações Básicas</span>
                        <select id="edit-tipo" onchange="window.DashboardController.toggleCamposEditor(this.value)" class="o-surface-card" style="width:100%; padding:12px; margin-bottom:15px; border:1px solid #ddd; font-weight:bold;">
                            <option value="liturgia" ${evento.tipo_compromisso === "liturgia"
        ? "selected"
        : ""
      }>✝️ Liturgia / Missa</option>
                            <option value="reuniao" ${evento.tipo_compromisso === "reuniao"
        ? "selected"
        : ""
      }>👥 Reunião / Pastoral</option>
                            <option value="atendimento" ${evento.tipo_compromisso === "atendimento"
        ? "selected"
        : ""
      }>🗣️ Agenda do Padre</option>
                        </select>
                        <input type="text" id="edit-titulo" value="${evento.titulo
      }" placeholder="Título/Assunto" class="o-surface-card" style="width:100%; padding:12px; border:1px solid #ddd; font-weight:bold;">
                        
                        <!-- NEW: Opções de Mural -->
                        <div style="display:flex; gap:10px; margin-top:10px; align-items:center; background:#f5f5f5; padding:10px; border-radius:8px;">
                            <div style="display:flex; align-items:center; gap:5px;">
                                <input type="checkbox" id="edit-mural" ${evento.mural_destaque ? 'checked' : ''}>
                                <label for="edit-mural" style="cursor:pointer; font-size:0.9rem;">No Mural?</label>
                            </div>
                            <select id="edit-prioridade" style="padding:5px; border-radius:4px; flex:1;">
                                <option value="2" ${!evento.mural_prioridade || evento.mural_prioridade == 2 ? 'selected' : ''}>Prioridade Normal</option>
                                <option value="3" ${evento.mural_prioridade == 3 ? 'selected' : ''}>🔥 Alta Prioridade</option>
                                <option value="1" ${evento.mural_prioridade == 1 ? 'selected' : ''}>❄️ Baixa Prioridade</option>
                            </select>
                        </div>
                    </div>

                    <div id="campos-liturgia" class="form-section" style="display: ${evento.tipo_compromisso === "liturgia" ? "block" : "none"
      }">
                        <span class="form-section-title">2. Detalhes Litúrgicos</span>
                        <!-- NEW: Tempo Litúrgico -->
                        <select id="edit-tempo" class="o-surface-card" style="width:100%; padding:12px; margin-bottom:10px; border:1px solid #ddd;">
                             <option value="Tempo Comum" ${!evento.tempo_liturgico || evento.tempo_liturgico === 'Tempo Comum' ? 'selected' : ''}>🌿 Tempo Comum</option>
                             <option value="Advento" ${evento.tempo_liturgico === 'Advento' ? 'selected' : ''}>🕯️ Advento</option>
                             <option value="Natal" ${evento.tempo_liturgico === 'Natal' ? 'selected' : ''}>🌟 Natal</option>
                             <option value="Quaresma" ${evento.tempo_liturgico === 'Quaresma' ? 'selected' : ''}>🌵 Quaresma</option>
                             <option value="Páscoa" ${evento.tempo_liturgico === 'Páscoa' ? 'selected' : ''}>🔥 Páscoa</option>
                        </select>
                        <select id="edit-cor" class="o-surface-card" style="width:100%; padding:12px; margin-bottom:15px; border:1px solid #ddd;">
                             <option value="1" ${evento.cor_id == 1 ? "selected" : ""
      }>🟢 Verde</option>
                             <option value="2" ${evento.cor_id == 2 ? "selected" : ""
      }>⚪ Branco</option>
                             <option value="3" ${evento.cor_id == 3 ? "selected" : ""
      }>🔴 Vermelho</option>
                             <option value="4" ${evento.cor_id == 4 ? "selected" : ""
      }>🟣 Roxo</option>
                        </select>
                        <div id="lista-escalas-editor">${this.gerarLinhasEscalaEditor(
        evento.escalas
      )}</div>
                        <button onclick="window.DashboardController.adicionarLinhaEscala()" style="width:100%; background:none; border:1px dashed #ccc; padding:10px; margin-top:10px; cursor:pointer;">＋ Novo Horário</button>
                    </div>

                    <div id="campos-agenda" class="form-section" style="display: ${evento.tipo_compromisso !== "liturgia" ? "grid" : "none"
      }; grid-template-columns: 1fr 1fr; gap:10px;">
                        <input type="time" id="edit-hora" value="${evento.hora_inicio || "19:00"
      }" class="o-surface-card" style="padding:10px;">
                        <input type="text" id="edit-local" value="${evento.local || ""
      }" placeholder="Local" class="o-surface-card" style="padding:10px;">
                    </div>

                    <!-- MÓDULO REPLICADOR (EXCLUSIVO ADMIN) -->
                    <div class="form-section" style="border-top: 2px solid var(--cor-dourado);">
                        <div style="display:flex; justify-content:space-between; align-items:center;">
                            <span class="form-section-title" style="margin:0;">🔄 Replicar Padrão Mensal</span>
                            <label class="c-switch">
                                <input type="checkbox" id="check-recorrencia" onchange="window.DashboardController.toggleRecorrenciaUI()">
                                <span class="c-switch__slider"></span>
                            </label>
                        </div>
                        <div id="recorrencia-options" style="display:none; margin-top:15px;">
                            <p style="font-size:0.75rem; color:#666; margin-bottom:10px;">O sistema replicará este compromisso (e escalas) para os meses seguintes no mesmo padrão (ex: Todo 1º Domingo).</p>
                            <select id="recorrencia-meses" class="o-surface-card" style="width:100%; padding:10px;">
                                <option value="3">Replicar por 3 meses</option>
                                <option value="6">Replicar por 6 meses</option>
                                <option value="12">Replicar por 12 meses (Plano Anual)</option>
                            </select>
                        </div>
                    </div>

                    <div style="display:flex; gap:12px; margin-top:25px;">
                        <button id="btn-save-agenda" onclick="window.DashboardController.salvarFinal('${dataISO}', ${eventoId ? `'${eventoId}'` : "null"
      })" class="btn-ver-todas c-button" style="flex:2; background:var(--sys-color-success);">💾 SALVAR NA AGENDA</button>
                        <button onclick="window.DashboardController.abrirGerenciadorAgenda('${dataISO}')" class="btn-ver-todas" style="flex:1; background:#eee; color:#666; border:none; border-radius:8px; cursor:pointer;">VOLTAR</button>
                    </div>
                </div>
            </div>`;
  },

  // ==========================================================================
  // 5. GESTÃO DE EQUIPES
  // ==========================================================================

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
                        <div class="list-content"><strong>${eq.nome_equipe
            }</strong><br><small>${eq.tipo_atuacao}</small></div>
                        <button onclick='window.DashboardController.abrirModalEquipe(${JSON.stringify(
              eq
            )})' style="background:none; border:none; cursor:pointer; font-size:1.1rem;">✏️</button>
                        <button onclick="window.DashboardController.deletarEquipe(${eq.id
            })" style="background:none; border:none; cursor:pointer; font-size:1.1rem; color:red; margin-left:10px;">🗑️</button>
                    </div>`
        )
        .join("")}
            </div>`;
  },

  abrirModalEquipe: function (eq = null) {
    const container = document.getElementById("modalContent");
    container.innerHTML = `
            <div class="modal-card o-surface-card" style="max-width: 450px; flex-direction:column;">
                <div class="modal-body" style="padding: 30px;">
                    <button class="btn-close" onclick="window.DashboardController.fecharModal()">×</button>
                    <h3 style="font-family:'Neulis'; color:var(--cor-vinho); margin-bottom:20px;">${eq ? "Editar" : "Nova"
      } Equipe</h3>
                    <div class="form-section">
                        <input type="text" id="eq-nome" value="${eq?.nome_equipe || ""
      }" placeholder="Nome da Equipe" class="o-surface-card" style="width:100%; padding:12px; margin-bottom:15px; border:1px solid #ddd;">
                        <select id="eq-tipo" class="o-surface-card" style="width:100%; padding:12px; border:1px solid #ddd;">
                            <option value="Leitura" ${eq?.tipo_atuacao == "Leitura" ? "selected" : ""
      }>📖 Leitura</option>
                            <option value="Canto" ${eq?.tipo_atuacao == "Canto" ? "selected" : ""
      }>🎵 Canto</option>
                            <option value="Ambos" ${eq?.tipo_atuacao == "Ambos" ? "selected" : ""
      }>🔄 Ambos</option>
                        </select>
                    </div>
                    <button onclick="window.DashboardController.salvarEquipeFinal('${eq?.id || ""
      }')" class="btn-ver-todas" style="width:100%; margin-top:20px;">💾 SALVAR EQUIPE</button>
                </div>
            </div>`;
    document.getElementById("modalOverlay").classList.add("active");
  },

  salvarEquipeFinal: async function (id) {
    const payload = {
      id: id || null,
      nome: document.getElementById("eq-nome").value,
      tipo: document.getElementById("eq-tipo").value,
    };
    await window.api.salvarEquipe(payload);
    this.fecharModal();
    this.renderizarAbaEquipes();
  },

  deletarEquipe: async function (id) {
    if (confirm("Excluir equipe permanentemente?")) {
      await window.api.excluirEquipe(id);
      this.renderizarAbaEquipes();
    }
  },

  // ==========================================================================
  // 6. GESTÃO DE ACESSOS (USUÁRIOS)
  // ==========================================================================

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
                        <div class="list-content"><strong>${u.nome || "Sem Nome"
            }</strong><br><small>${u.email} • Nível ${u.perfil_nivel
            }</small></div>
                        <button onclick='window.DashboardController.abrirModalUsuario(${JSON.stringify(
              u
            )})' style="background:none; border:none; cursor:pointer; font-size:1.1rem;">✏️</button>
                        <button onclick="window.DashboardController.deletarUsuario('${u.id
            }')" style="background:none; border:none; cursor:pointer; font-size:1.1rem; color:red; margin-left:10px;">🗑️</button>
                    </div>`
        )
        .join("")}
            </div>`;
  },

  abrirModalUsuario: function (u = null) {
    const container = document.getElementById("modalContent");
    container.innerHTML = `
            <div class="modal-card o-surface-card" style="max-width: 480px; flex-direction:column;">
                <div class="modal-body" style="padding: 30px;">
                    <button class="btn-close" onclick="window.DashboardController.fecharModal()">×</button>
                    <h3 style="font-family:'Neulis'; color:var(--cor-vinho); margin-bottom:25px;">${u ? "Editar" : "Novo"
      } Acesso</h3>
                    <div class="form-section">
                        <input type="email" id="user-email" value="${u?.email || ""
      }" placeholder="E-mail" class="o-surface-card" style="width:100%; padding:12px; margin-bottom:15px;">
                        <input type="text" id="user-nome" value="${u?.nome || ""
      }" placeholder="Nome Completo" class="o-surface-card" style="width:100%; padding:12px; margin-bottom:15px;">
                        <select id="user-nivel" class="o-surface-card" style="width:100%; padding:12px;">
                            <option value="1" ${u?.perfil_nivel == 1 ? "selected" : ""
      }>👑 Nível 1 - Master</option>
                            <option value="2" ${u?.perfil_nivel == 2 ? "selected" : ""
      }>🏢 Nível 2 - Secretaria</option>
                            <option value="3" ${u?.perfil_nivel == 3 ? "selected" : ""
      }>👥 Nível 3 - Coordenador</option>
                        </select>
                    </div>
                    <button id="btn-save-user" onclick="window.DashboardController.salvarUsuarioFinal('${u?.id || ""
      }')" class="btn-ver-todas" style="width:100%; background:var(--sys-color-success); margin-top:20px;">💾 SALVAR ACESSO</button>
                </div>
            </div>`;
    document.getElementById("modalOverlay").classList.add("active");
  },

  salvarUsuarioFinal: async function (id) {
    const btn = document.getElementById("btn-save-user");
    btn.innerHTML = "Processando...";
    const p = {
      id: id || null,
      email: document.getElementById("user-email").value,
      nome: document.getElementById("user-nome").value,
      perfil_nivel: document.getElementById("user-nivel").value,
    };
    await window.api.salvarUsuario(p);
    this.fecharModal();
    this.renderizarAbaUsuarios();
  },

  deletarUsuario: async function (id) {
    if (confirm("Remover este acesso?")) {
      await window.api.excluirUsuario(id);
      this.renderizarAbaUsuarios();
    }
  },

  // ==========================================================================
  // 7. CONFIRMAÇÕES E APOIO
  // ==========================================================================

  confirmarExclusao: function (id, dataISO, titulo) {
    const container = document.getElementById("modalContent");
    container.innerHTML = `
            <div class="modal-card o-surface-card" style="max-width: 450px;">
                <div class="modal-body" style="padding: 30px;">
                    <div class="c-alert c-alert--destructive">
                        <span class="c-alert__icon">⚠️</span>
                        <div class="c-alert__content">
                            <span class="c-alert__title">Ação Irreversível</span>
                            Deseja excluir permanentemente: <strong>${titulo}</strong>?
                        </div>
                    </div>
                    <div style="display:flex; gap:12px;">
                        <button id="btn-confirm-del" onclick="window.DashboardController.executarExclusao('${id}', '${dataISO}')" class="btn-ver-todas" style="flex:1; background:var(--cor-cereja);">SIM, EXCLUIR</button>
                        <button onclick="window.DashboardController.abrirGerenciadorAgenda('${dataISO}')" class="btn-ver-todas" style="flex:1; background:#eee; color:#666; border:none; border-radius:8px; cursor:pointer;">CANCELAR</button>
                    </div>
                </div>
            </div>`;
  },

  executarExclusao: async function (id, dataISO) {
    await window.api.client.from("eventos_base").delete().eq("id", id);
    this.abrirGerenciadorAgenda(dataISO);
    window.CalendarEngine.carregarERenderizar();
  },

  fecharModal: function () {
    document.getElementById("modalOverlay").classList.remove("active");
  },

  toggleCamposEditor: function (tipo) {
    document.getElementById("campos-liturgia").style.display =
      tipo === "liturgia" ? "block" : "none";
    document.getElementById("campos-agenda").style.display =
      tipo !== "liturgia" ? "grid" : "none";
  },

  toggleRecorrenciaUI: function () {
    const chk = document.getElementById("check-recorrencia");
    const area = document.getElementById("recorrencia-options");
    if (chk && area) {
      area.style.display = chk.checked ? "block" : "none";
    }
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
      // NEW FIELD
      tempo_liturgico: tipo === "liturgia" ? document.getElementById("edit-tempo").value : "Tempo Comum",
      status: "aprovado",
      // NEW FIELDS
      mural_destaque: document.getElementById("edit-mural").checked,
      mural_prioridade: parseInt(document.getElementById("edit-prioridade").value) || 2
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
    await window.api.salvarEventoCompleto(payload, escalas);

    // Sincronização de Salvamento (Replicador)
    const checkRecorrencia = document.getElementById("check-recorrencia");
    if (checkRecorrencia && checkRecorrencia.checked) {
      const meses = parseInt(document.getElementById("recorrencia-meses").value) || 3;
      await window.api.replicarEventoPadrao(payload, escalas, meses);
    }

    this.abrirGerenciadorAgenda(dataISO);
    window.CalendarEngine.carregarERenderizar();
  },

  gerarLinhasEscalaEditor: function (escalas = []) {
    const eL = window.api.cacheEquipesLeitura || [];
    const eC = window.api.cacheEquipesCanto || [];
    const build = (l, s) =>
      `<option value="">--</option>` +
      l
        .map(
          (e) =>
            `<option value="${e.id}" ${e.id == s ? "selected" : ""}>${e.nome_equipe
            }</option>`
        )
        .join("");
    if (!escalas || escalas.length === 0)
      escalas = [{ hora_celebracao: "19:00" }];
    return escalas
      .map(
        (esc) => `
            <div class="row-escala-edit" style="display: grid; grid-template-columns: 85px 1fr 1fr 30px; gap:8px; margin-bottom:8px; background:#f9f9f9; padding:8px; border-radius:8px; border:1px solid #eee;">
                <input type="time" class="esc-hora" value="${esc.hora_celebracao?.substring(0, 5) || "19:00"
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
          `<div class="chart-bar-group"><div class="chart-bar" style="height:${(c / max) * 100
          }%"></div><div class="chart-label">${["D", "S", "T", "Q", "Q", "S", "S"][i]
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
                <div class="list-content"><strong>${ev.titulo
          }</strong><br><small>${ev.tipo_compromisso.toUpperCase()}</small></div>
                <div class="status-dot ${ev.status === "pendente" ? "status-wait" : "status-ok"
          }"></div>
            </div>`
      )
      .join("");
  },
  // ==========================================================================
  // 8. MOBILE INFRASTRUCTURE (SDS v5.6)
  // ==========================================================================

  initMobile: function () {
    // 1. Injeção do Mobile Header
    if (window.innerWidth <= 768 && !document.querySelector(".mobile-header")) {
      const headerHTML = `
        <div class="mobile-header">
           <button class="mobile-menu-btn" onclick="window.DashboardController.toggleSidebar()">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="3" y1="12" x2="21" y2="12"></line><line x1="3" y1="6" x2="21" y2="6"></line><line x1="3" y1="18" x2="21" y2="18"></line></svg>
           </button>
           <img src="assets/img/logo-horizontal-negativa.png" class="mobile-logo-img" alt="Sacristia" />
           <div class="mobile-avatar" id="mob-avatar-slot">U</div>
        </div>
        <div class="sds-overlay" onclick="window.DashboardController.toggleSidebar()"></div>
      `;
      document.body.insertAdjacentHTML("afterbegin", headerHTML);

      // Sincroniza Avatar Mobile
      if (this.meuPerfil) {
        const letra = (this.meuPerfil.nome || "U").charAt(0).toUpperCase();
        document.getElementById("mob-avatar-slot").textContent = letra;
      }
    }
  },

  toggleSidebar: function () {
    const sidebar = document.querySelector(".admin-sidebar");
    const overlay = document.querySelector(".sds-overlay");
    const body = document.body;

    sidebar.classList.toggle("active");
    overlay.classList.toggle("active");

    if (sidebar.classList.contains("active")) {
      body.classList.add("mobile-overlay-active");
    } else {
      body.classList.remove("mobile-overlay-active");
    }
  }
};

document.addEventListener("DOMContentLoaded", () => {
  window.DashboardController.init();
  // Garante injecao no load e no resize
  window.DashboardController.initMobile();
  window.addEventListener('resize', () => window.DashboardController.initMobile());
});
