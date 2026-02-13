/*
 * SACRISTIA DIGITAL - Sistema de Gestão Paroquial
 *
 * © 2026 TODOS OS DIREITOS RESERVADOS
 * Desenvolvido EXCLUSIVAMENTE por Rodrigo Dionízio
 * Instagram: @rodrigodionizio
 * https://www.instagram.com/rodrigodionizio/
 *
 * PROIBIDA a reprodução, distribuição ou modificação
 * sem autorização expressa do autor.
 *
 * ARQUIVO: dashboard.js
 * DESCRIÇÃO: Controlador Mestre do Dashboard
 * VERSÃO: 9.0
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
        const nome = perfil?.nome || session.user.email.split("@")[0];
        document.getElementById("user-name").textContent = nome;

        if (document.getElementById("user-avatar")) {
          const iniciais = nome
            .split(" ")
            .map((n) => n[0])
            .join("")
            .substring(0, 2)
            .toUpperCase();
          document.getElementById("user-avatar").textContent = iniciais;
        }
      }

      if (this.meuPerfil?.perfil_nivel <= 2) {
        const menuUser = document.getElementById("menu-usuarios");
        if (menuUser) menuUser.style.display = "flex";
      }

      // Cache de equipes para seletores
      const equipes = await window.api.listarEquipes();
      window.api.cacheEquipesLeitura = equipes.filter(
        (e) => e.tipo_atuacao !== "Canto",
      );
      window.api.cacheEquipesCanto = equipes.filter(
        (e) => e.tipo_atuacao !== "Leitura",
      );
      // 🔧 FIX: MEP pode ter tipo_atuacao "MEP" ou "Ambos"
      window.api.cacheEquipesMEP = equipes.filter(
        (e) => e.tipo_atuacao === "MEP" || e.tipo_atuacao === "Ambos",
      );

      // Carregar filtro de comunidades
      await this.carregarFiltroComunidadesUI();

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
        else if (targetTab === "comunidades")
          await window.DashboardController.renderizarAbaComunidades();
        else if (targetTab === "usuarios")
          await window.DashboardController.renderizarAbaUsuarios();
      });
    });
  },

  // ==========================================================================
  // 3. GESTÃO DE AGENDA (CALENDÁRIO)
  // ==========================================================================

  // Estado do filtro de comunidades
  comunidadeFiltrada: null,

  carregarAgendaTotal: async function () {
    const nomeMes = new Date(this.agendaAno, this.agendaMes - 1).toLocaleString(
      "pt-BR",
      { month: "long" },
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
        comunidadeId: this.comunidadeFiltrada,
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

  /**
   * Carrega o filtro de comunidades na UI do dashboard
   */
  carregarFiltroComunidadesUI: async function () {
    try {
      const comunidades = await window.api.listarComunidades();
      const select = document.getElementById("dashboard-community-filter");
      
      if (!select) return;

      // Limpa opções existentes (mantém apenas "Todas")
      select.innerHTML = '<option value="">Todas as Comunidades</option>';

      // Adiciona comunidades ativas
      comunidades.forEach(com => {
        const option = document.createElement("option");
        option.value = com.id;
        option.textContent = com.nome;
        select.appendChild(option);
      });

      // Restaura seleção anterior se existir
      if (this.comunidadeFiltrada) {
        select.value = this.comunidadeFiltrada;
      }

      console.log("✅ Dashboard: Filtro de comunidades carregado");
    } catch (error) {
      console.error("❌ Dashboard: Erro ao carregar filtro de comunidades", error);
    }
  },

  /**
   * Aplica o filtro de comunidade no calendário
   * @param {string} comunidadeId - UUID da comunidade ou string vazia para "todas"
   */
  aplicarFiltroComunidade: async function (comunidadeId) {
    this.comunidadeFiltrada = comunidadeId || null;
    console.log("🔍 Dashboard: Filtro aplicado ->", comunidadeId || "Todas");
    await this.carregarAgendaTotal();
  },

  /**
   * Gera opções HTML de comunidades para select
   * @param {string} selectedId - ID da comunidade selecionada
   * @returns {string} HTML das options
   */
  gerarOpcoesComunidades: async function (selectedId) {
    try {
      const comunidades = await window.api.listarComunidades();
      return comunidades
        .map(
          (com) =>
            `<option value="${com.id}" ${com.id === selectedId ? "selected" : ""}>🏛️ ${com.nome}</option>`,
        )
        .join("");
    } catch (error) {
      console.error("❌ Erro ao carregar comunidades:", error);
      return "";
    }
  },

  abrirGerenciadorAgenda: async function (dataISO) {
    const eventosDia = await window.api.buscarEventosDia(dataISO);
    const container = document.getElementById("modalContent");
    const dataFmt = new Date(dataISO + "T12:00:00").toLocaleDateString(
      "pt-BR",
      { weekday: "long", day: "2-digit", month: "long" },
    );

    container.innerHTML = `
            <div class="modal-card o-surface-card" style="max-width: 600px; flex-direction: column; width: 100%; box-sizing: border-box;">
                <div class="modal-body" style="padding: 30px; box-sizing: border-box; overflow-x: hidden;">
                    <button class="btn-close" onclick="window.DashboardController.fecharModal()">×</button>
                    <h2 style="font-family:'Neulis'; color:var(--cor-vinho); padding-right: 40px;">Agenda do Dia</h2>
                    <p style="color:#888; margin-bottom:20px;">${dataFmt}</p>
                    <div id="lista-eventos-dia" style="margin-bottom:25px; width: 100%;">
                        ${
                          eventosDia.length > 0
                            ? eventosDia
                                .map(
                                  (ev) => `
                            <div class="list-item o-surface-card" style="border-left:5px solid ${
                              ev.liturgia_cores?.hex_code || "#64748b"
                            }; display: flex; flex-wrap: wrap; gap: 10px; align-items: center;">
                                <div class="list-content" style="flex: 1; min-width: 0;">
                                    <strong style="word-break: break-word; display: block;">${(
                                      ev.hora_inicio || "--:--"
                                    ).substring(0, 5)} | ${ev.titulo}</strong>
                                    <small style="color: #888;">${ev.local || "Paróquia"}</small>
                                </div>
                                <div class="list-actions" style="display:flex; gap:10px; flex-shrink: 0;">
                                    <button onclick="window.DashboardController.renderizarFormulario('${
                                      ev.data
                                    }', '${
                                      ev.id
                                    }')" style="background:#f0f9ff; border:1px solid #bae6fd; border-radius:6px; cursor:pointer; font-size:1.1rem; padding: 6px 10px;" title="Editar">✏️</button>
                                    <button onclick="window.DashboardController.confirmarExclusao('${
                                      ev.id
                                    }', '${ev.data}', '${
                                      ev.titulo
                                    }')" style="background:#fef2f2; border:1px solid #fecaca; border-radius:6px; cursor:pointer; font-size:1.1rem; color:var(--cor-cereja); padding: 6px 10px;" title="Excluir">🗑️</button>
                                </div>
                            </div>`,
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
                    <h3 style="font-family:'Neulis'; color:var(--cor-vinho); margin-bottom:20px;">${
                      eventoId ? "Editar" : "Novo"
                    } Atividade</h3>
                    
                    <div class="form-section">
                        <span class="form-section-title">1. Informações Básicas</span>
                        <select id="edit-tipo" onchange="window.DashboardController.toggleCamposEditor(this.value)" class="o-surface-card" style="width:100%; padding:12px; margin-bottom:15px; border:1px solid #ddd; font-weight:bold;">
                            <option value="liturgia" ${
                              evento.tipo_compromisso === "liturgia"
                                ? "selected"
                                : ""
                            }>Liturgia / Missa</option>
                            <option value="reuniao" ${
                              evento.tipo_compromisso === "reuniao"
                                ? "selected"
                                : ""
                            }>Reunião / Pastoral</option>
                            <option value="atendimento" ${
                              evento.tipo_compromisso === "atendimento"
                                ? "selected"
                                : ""
                            }>Agenda do Padre</option>
                        </select>
                        <input type="text" id="edit-titulo" value="${
                          evento.titulo
                        }" placeholder="Título/Assunto" class="o-surface-card" style="width:100%; padding:12px; border:1px solid #ddd; font-weight:bold;">
                        
                        <!-- NEW: Seletor de Comunidade -->
                        <div style="margin-top: 10px;">
                            <label style="font-size: 0.85rem; font-weight: 700; color: #666; display: block; margin-bottom: 5px;">
                                <i data-lucide="map-pin" style="width: 14px; height: 14px; vertical-align: middle; margin-right: 4px; color: var(--cor-dourado);"></i>
                                Local/Comunidade
                            </label>
                            <select id="edit-comunidade" class="o-surface-card" style="width:100%; padding:12px; border:1px solid #ddd;">
                                <option value="">⛪ Matriz (Sede)</option>
                                ${await this.gerarOpcoesComunidades(evento.comunidade_id)}
                            </select>
                        </div>
                        
                        <!-- NEW: Opções de Mural -->
                        <div style="display:flex; gap:10px; margin-top:10px; align-items:center; background:#f5f5f5; padding:10px; border-radius:8px;">
                            <div style="display:flex; align-items:center; gap:5px;">
                                <input type="checkbox" id="edit-mural" ${evento.mural_destaque ? "checked" : ""}>
                                <label for="edit-mural" style="cursor:pointer; font-size:0.9rem;">No Mural?</label>
                            </div>
                            <select id="edit-prioridade" style="padding:5px; border-radius:4px; flex:1;">
                                <option value="2" ${!evento.mural_prioridade || evento.mural_prioridade == 2 ? "selected" : ""}>Prioridade Normal</option>
                                <option value="3" ${evento.mural_prioridade == 3 ? "selected" : ""}>🔥 Alta Prioridade</option>
                                <option value="1" ${evento.mural_prioridade == 1 ? "selected" : ""}>❄️ Baixa Prioridade</option>
                            </select>
                        </div>
                    </div>

                    <div id="campos-liturgia" class="form-section" style="display: ${
                      evento.tipo_compromisso === "liturgia" ? "block" : "none"
                    }">
                        <span class="form-section-title">2. Detalhes Litúrgicos</span>
                        <!-- NEW: Tempo Litúrgico -->
                        <select id="edit-tempo" class="o-surface-card" style="width:100%; padding:12px; margin-bottom:10px; border:1px solid #ddd;">
                             <option value="Tempo Comum" ${!evento.tempo_liturgico || evento.tempo_liturgico === "Tempo Comum" ? "selected" : ""}>🌿 Tempo Comum</option>
                             <option value="Advento" ${evento.tempo_liturgico === "Advento" ? "selected" : ""}>🕯️ Advento</option>
                             <option value="Natal" ${evento.tempo_liturgico === "Natal" ? "selected" : ""}>🌟 Natal</option>
                             <option value="Quaresma" ${evento.tempo_liturgico === "Quaresma" ? "selected" : ""}>🌵 Quaresma</option>
                             <option value="Páscoa" ${evento.tempo_liturgico === "Páscoa" ? "selected" : ""}>🔥 Páscoa</option>
                        </select>
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
                        
                        <!-- NEW: Tipo de Celebração com explicação -->
                        <div style="margin-bottom: 15px;">
                            <label style="font-size: 0.85rem; font-weight: 700; color: #666; display: block; margin-bottom: 5px;">
                                Tipo de Celebração
                            </label>
                            <select id="edit-tipo-celebracao" onchange="window.DashboardController.atualizarCamposEscala()" class="o-surface-card" style="width:100%; padding:12px; border:1px solid #ddd;">
                                <option value="missa" ${!evento.tipo_celebracao || evento.tipo_celebracao === "missa" ? "selected" : ""}>
                                    ✝️ Santa Missa (com Celebrante e MESCE)
                                </option>
                                <option value="celebracao_palavra" ${evento.tipo_celebracao === "celebracao_palavra" ? "selected" : ""}>
                                    📖 Celebração da Palavra (com MEP)
                                </option>
                            </select>
                            <p id="tipo-celebracao-hint" style="margin-top: 6px; font-size: 0.75rem; color: #888; font-style: italic;">
                                ${!evento.tipo_celebracao || evento.tipo_celebracao === "missa" 
                                    ? '💡 <strong>Santa Missa:</strong> Mostra campo para nome do Celebrante (Padre) e MESCE.'
                                    : '💡 <strong>Celebração da Palavra:</strong> Mostra seletor de MEP (Ministro Extraordinário da Palavra).'}
                            </p>
                        </div>
                        
                        <!-- Seção de Escalas com título visual -->
                        <div style="margin-bottom: 10px; padding: 10px; background: linear-gradient(135deg, rgba(164, 29, 49, 0.05) 0%, transparent 100%); border-radius: 8px; border-left: 3px solid var(--cor-vinho);">
                            <span style="font-size: 0.8rem; font-weight: 700; color: var(--cor-vinho); text-transform: uppercase;">📋 Escalas de Ministérios</span>
                            <p style="margin: 4px 0 0 0; font-size: 0.7rem; color: #666;">Configure os horários e equipes para esta celebração</p>
                        </div>
                        
                        <div id="lista-escalas-editor">${this.gerarLinhasEscalaEditor(
                          evento.escalas,
                          evento.tipo_celebracao || "missa",
                        )}</div>
                        <button onclick="window.DashboardController.adicionarLinhaEscala()" style="width:100%; background:none; border:1px dashed #ccc; padding:10px; margin-top:10px; cursor:pointer; border-radius: 8px; font-weight: 600; color: #666; transition: all 0.2s;" onmouseover="this.style.borderColor='var(--cor-dourado)'; this.style.color='var(--cor-vinho)';" onmouseout="this.style.borderColor='#ccc'; this.style.color='#666';">＋ Adicionar Novo Horário</button>
                    </div>

                    <div id="campos-agenda" class="form-section" style="display: ${
                      evento.tipo_compromisso !== "liturgia" ? "grid" : "none"
                    }; grid-template-columns: 1fr 1fr; gap:10px;">
                        <input type="time" id="edit-hora" value="${
                          evento.hora_inicio || "19:00"
                        }" class="o-surface-card" style="padding:10px;">
                        <input type="text" id="edit-local" value="${
                          evento.local || ""
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
                        <button id="btn-save-agenda" onclick="window.DashboardController.salvarFinal('${dataISO}', ${
                          eventoId ? `'${eventoId}'` : "null"
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
                        <div class="list-content"><strong>${
                          eq.nome_equipe
                        }</strong><br><small>${eq.tipo_atuacao}</small></div>
                        <button onclick='window.DashboardController.abrirModalEquipe(${JSON.stringify(
                          eq,
                        )})' style="background:none; border:none; cursor:pointer; font-size:1.1rem;">✏️</button>
                        <button onclick="window.DashboardController.deletarEquipe(${
                          eq.id
                        })" style="background:none; border:none; cursor:pointer; font-size:1.1rem; color:red; margin-left:10px;">🗑️</button>
                    </div>`,
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
                    <h3 style="font-family:'Neulis'; color:var(--cor-vinho); margin-bottom:20px;">${
                      eq ? "Editar" : "Nova"
                    } Equipe</h3>
                    <div class="form-section">
                        <input type="text" id="eq-nome" value="${
                          eq?.nome_equipe || ""
                        }" placeholder="Nome da Equipe" class="o-surface-card" style="width:100%; padding:12px; margin-bottom:15px; border:1px solid #ddd;">
                        <select id="eq-tipo" class="o-surface-card" style="width:100%; padding:12px; border:1px solid #ddd;">
                            <option value="Leitura" ${
                              eq?.tipo_atuacao == "Leitura" ? "selected" : ""
                            }>📖 Leitura</option>
                            <option value="Canto" ${
                              eq?.tipo_atuacao == "Canto" ? "selected" : ""
                            }>🎵 Canto</option>
                            <option value="Ambos" ${
                              eq?.tipo_atuacao == "Ambos" ? "selected" : ""
                            }>🔄 Ambos</option>
                            <option value="MESCE" ${
                              eq?.tipo_atuacao == "MESCE" ? "selected" : ""
                            }>✨ MESCE (Ministros da Comunhão)</option>
                            <option value="MEP" ${
                              eq?.tipo_atuacao == "MEP" ? "selected" : ""
                            }>📜 MEP (Ministros da Palavra)</option>
                            <option value="Coroinhas" ${
                              eq?.tipo_atuacao == "Coroinhas" ? "selected" : ""
                            }>🕯️ Coroinhas</option>
                            <option value="Celebrante" ${
                              eq?.tipo_atuacao == "Celebrante" ? "selected" : ""
                            }>🐑 Celebrante</option>
                        </select>
                    </div>
                    <button onclick="window.DashboardController.salvarEquipeFinal('${
                      eq?.id || ""
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
                        <div class="list-content"><strong>${
                          u.nome || "Sem Nome"
                        }</strong><br><small>${u.email} • Nível ${
                          u.perfil_nivel
                        }</small></div>
                        <button onclick='window.DashboardController.abrirModalUsuario(${JSON.stringify(
                          u,
                        )})' style="background:none; border:none; cursor:pointer; font-size:1.1rem;">✏️</button>
                        <button onclick="window.DashboardController.deletarUsuario('${
                          u.id
                        }')" style="background:none; border:none; cursor:pointer; font-size:1.1rem; color:red; margin-left:10px;">🗑️</button>
                    </div>`,
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
                    <h3 style="font-family:'Neulis'; color:var(--cor-vinho); margin-bottom:25px;">${
                      u ? "Editar" : "Novo"
                    } Acesso</h3>
                    <div class="form-section">
                        <input type="email" id="user-email" value="${
                          u?.email || ""
                        }" placeholder="E-mail" class="o-surface-card" style="width:100%; padding:12px; margin-bottom:15px;">
                        <input type="text" id="user-nome" value="${
                          u?.nome || ""
                        }" placeholder="Nome Completo" class="o-surface-card" style="width:100%; padding:12px; margin-bottom:15px;">
                        <select id="user-nivel" class="o-surface-card" style="width:100%; padding:12px;">
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
    const tipoCelebracao =
      tipo === "liturgia"
        ? document.getElementById("edit-tipo-celebracao")?.value || "missa"
        : null;

    const payload = {
      id: eventoId,
      data: dataISO,
      titulo: document.getElementById("edit-titulo").value,
      tipo_compromisso: tipo,
      tipo_celebracao: tipoCelebracao,
      hora_inicio:
        tipo !== "liturgia" ? document.getElementById("edit-hora").value : null,
      local:
        tipo !== "liturgia" ? document.getElementById("edit-local").value : "",
      cor_id:
        tipo === "liturgia"
          ? parseInt(document.getElementById("edit-cor").value)
          : 1,
      // NEW FIELD
      tempo_liturgico:
        tipo === "liturgia"
          ? document.getElementById("edit-tempo").value
          : "Tempo Comum",
      status: "aprovado",
      // NEW FIELDS
      mural_destaque: document.getElementById("edit-mural").checked,
      mural_prioridade:
        parseInt(document.getElementById("edit-prioridade").value) || 2,
      // NEW: Comunidade
      comunidade_id: document.getElementById("edit-comunidade").value || null,
    };
    const escalas = [];
    if (tipo === "liturgia") {
      document.querySelectorAll(".row-escala-edit").forEach((row, index) => {
        // Capturar listas MESCE e Coroinhas
        const mesceInput = document.querySelectorAll(".esc-mesce-lista")[index];
        const coroinhasInput = document.querySelectorAll(
          ".esc-coroinhas-lista",
        )[index];

        const listaMesce = mesceInput
          ? mesceInput.value
              .split(",")
              .map((n) => n.trim())
              .filter((n) => n)
          : [];
        const listaCoroinhas = coroinhasInput
          ? coroinhasInput.value
              .split(",")
              .map((n) => n.trim())
              .filter((n) => n)
          : [];

        escalas.push({
          hora_celebracao: row.querySelector(".esc-hora").value,
          equipe_leitura_id: row.querySelector(".esc-leitura").value || null,
          equipe_canto_id: row.querySelector(".esc-canto").value || null,
          equipe_mep_id:
            tipoCelebracao === "celebracao_palavra"
              ? row.querySelector(".esc-mep")?.value || null
              : null,
          celebrante_nome:
            tipoCelebracao === "missa"
              ? row.querySelector(".esc-celebrante")?.value || null
              : null,
          lista_mesce: listaMesce,
          lista_coroinhas: listaCoroinhas,
        });
      });
    }
    await window.api.salvarEventoCompleto(payload, escalas);

    // Sincronização de Salvamento (Replicador)
    const checkRecorrencia = document.getElementById("check-recorrencia");
    if (checkRecorrencia && checkRecorrencia.checked) {
      const meses =
        parseInt(document.getElementById("recorrencia-meses").value) || 3;
      await window.api.replicarEventoPadrao(payload, escalas, meses);
    }

    this.abrirGerenciadorAgenda(dataISO);
    window.CalendarEngine.carregarERenderizar();
  },

  gerarLinhasEscalaEditor: function (escalas = [], tipoCelebracao = "missa") {
    const eL = window.api.cacheEquipesLeitura || [];
    const eC = window.api.cacheEquipesCanto || [];
    const eM = window.api.cacheEquipesMEP || [];
    
    // 🔍 Debug: Verificar se há equipes MEP disponíveis
    if (tipoCelebracao === "celebracao_palavra" && eM.length === 0) {
      console.warn("⚠️ Nenhuma equipe MEP encontrada no cache. Verifique o cadastro de equipes.");
    }

    const build = (l, s, placeholder = "Selecionar...") =>
      `<option value="">${placeholder}</option>` +
      l
        .map(
          (e) =>
            `<option value="${e.id}" ${e.id == s ? "selected" : ""}>${
              e.nome_equipe
            }</option>`,
        )
        .join("");
    if (!escalas || escalas.length === 0)
      escalas = [{ hora_celebracao: "19:00" }];
    
    // 🎯 NOVO: Cabeçalho com labels visíveis para identificar cada campo
    const labelCelebrante = tipoCelebracao === "missa" ? "✠️ Celebrante" : "📖 MEP";
    const headerHTML = `
      <div class="escala-header-labels" style="display: grid; grid-template-columns: 85px 1fr 1fr 1fr 30px; gap: 8px; margin-bottom: 8px; padding: 8px 8px 4px 8px;">
        <span style="font-size: 0.7rem; font-weight: 700; color: var(--cor-vinho); text-transform: uppercase;">⏰ Hora</span>
        <span style="font-size: 0.7rem; font-weight: 700; color: var(--cor-vinho); text-transform: uppercase;">📖 Leitores</span>
        <span style="font-size: 0.7rem; font-weight: 700; color: var(--cor-vinho); text-transform: uppercase;">🎵 Canto</span>
        <span style="font-size: 0.7rem; font-weight: 700; color: var(--cor-vinho); text-transform: uppercase;">${labelCelebrante}</span>
        <span></span>
      </div>
    `;
    
    const rowsHTML = escalas
      .map(
        (esc) => `
            <div class="row-escala-edit" style="display: grid; grid-template-columns: 85px 1fr 1fr 1fr 30px; gap:8px; margin-bottom:8px; background:#f9f9f9; padding:8px; border-radius:8px; border:1px solid #eee;">
                <input type="time" class="esc-hora" value="${
                  esc.hora_celebracao?.substring(0, 5) || "19:00"
                }" style="border:none; background:none; font-weight:bold;" title="Horário da Celebração">
                <select class="esc-leitura" style="width:100%; border:none; background:none; font-size:0.8rem;" title="Equipe de Leitura">${build(
                  eL,
                  esc.equipe_leitura_id || esc.equipe_leitura?.id,
                  "📖 Leitores..."
                )}</select>
                <select class="esc-canto" style="width:100%; border:none; background:none; font-size:0.8rem;" title="Equipe de Canto">${build(
                  eC,
                  esc.equipe_canto_id || esc.equipe_canto?.id,
                  "🎵 Canto..."
                )}</select>
                
                ${
                  tipoCelebracao === "missa"
                    ? `
                    <input type="text" class="esc-celebrante" value="${esc.celebrante_nome || ""}" placeholder="✠️ Nome do Padre" style="width:100%; border:none; background:none; font-size:0.8rem; padding: 4px;" title="Nome do Celebrante">
                `
                    : `
                    <select class="esc-mep" style="width:100%; border:none; background:none; font-size:0.8rem;" title="Ministro Extraordinário da Palavra">${build(eM, esc.equipe_mep_id || esc.equipe_mep?.id, "📖 MEP...")}</select>
                `
                }
                
                <button onclick="this.closest('.escala-item-container')?.remove() || this.parentElement.nextElementSibling?.remove() || this.parentElement.remove()" style="background:none; border:none; color:red; cursor:pointer;" title="Remover horário">×</button>
            </div>
            
            <!-- Campos MESCE e Coroinhas (sempre visíveis) -->
            <div class="escala-extras" style="display: grid; grid-template-columns: 1fr 1fr; gap: 8px; margin-bottom: 12px; padding: 8px; background: #f0f0f0; border-radius: 8px;">
                <div>
                    <label style="font-size: 0.7rem; font-weight: 700; color: #666; display: block; margin-bottom: 4px;">✨ MESCE (separar por vírgula)</label>
                    <input type="text" class="esc-mesce-lista" value="${Array.isArray(esc.lista_mesce) ? esc.lista_mesce.join(", ") : ""}" placeholder="Maria, José, Pedro" style="width: 100%; padding: 6px; border: 1px solid #ddd; border-radius: 4px; font-size: 0.75rem;">
                </div>
                <div>
                    <label style="font-size: 0.7rem; font-weight: 700; color: #666; display: block; margin-bottom: 4px;">🕯️ Coroinhas (separar por vírgula)</label>
                    <input type="text" class="esc-coroinhas-lista" value="${Array.isArray(esc.lista_coroinhas) ? esc.lista_coroinhas.join(", ") : ""}" placeholder="Ana, Lucas, Miguel" style="width: 100%; padding: 6px; border: 1px solid #ddd; border-radius: 4px; font-size: 0.75rem;">
                </div>
            </div>
        `,
      )
      .join("");
    
    return headerHTML + rowsHTML;
  },

  adicionarLinhaEscala: function () {
    const container = document.getElementById("lista-escalas-editor");
    const tipoCelebracao =
      document.getElementById("edit-tipo-celebracao")?.value || "missa";
    const div = document.createElement("div");
    div.innerHTML = this.gerarLinhasEscalaEditor([{}], tipoCelebracao);
    container.appendChild(div.firstElementChild);
    container.appendChild(div.lastElementChild); // Adiciona também o bloco MESCE/Coroinhas
  },

  atualizarCamposEscala: function () {
    const tipoCelebracao =
      document.getElementById("edit-tipo-celebracao")?.value || "missa";
    const container = document.getElementById("lista-escalas-editor");

    // 🆕 Atualiza o hint explicativo
    const hintElement = document.getElementById("tipo-celebracao-hint");
    if (hintElement) {
      if (tipoCelebracao === "missa") {
        hintElement.innerHTML = '💡 <strong>Santa Missa:</strong> Mostra campo para nome do Celebrante (Padre) e MESCE.';
      } else {
        hintElement.innerHTML = '💡 <strong>Celebração da Palavra:</strong> Mostra seletor de MEP (Ministro Extraordinário da Palavra).';
      }
    }

    // Capturar dados atuais antes de regerendar
    const escalasAtuais = [];
    document.querySelectorAll(".row-escala-edit").forEach((row, index) => {
      const mesceInput = document.querySelectorAll(".esc-mesce-lista")[index];
      const coroinhasInput = document.querySelectorAll(".esc-coroinhas-lista")[
        index
      ];

      escalasAtuais.push({
        hora_celebracao: row.querySelector(".esc-hora")?.value || "19:00",
        equipe_leitura_id: row.querySelector(".esc-leitura")?.value,
        equipe_canto_id: row.querySelector(".esc-canto")?.value,
        equipe_mep_id: row.querySelector(".esc-mep")?.value,
        celebrante_nome: row.querySelector(".esc-celebrante")?.value,
        lista_mesce: mesceInput
          ? mesceInput.value
              .split(",")
              .map((n) => n.trim())
              .filter((n) => n)
          : [],
        lista_coroinhas: coroinhasInput
          ? coroinhasInput.value
              .split(",")
              .map((n) => n.trim())
              .filter((n) => n)
          : [],
      });
    });

    // Regerendar com novo tipo
    container.innerHTML = this.gerarLinhasEscalaEditor(
      escalasAtuais.length > 0 ? escalasAtuais : [{}],
      tipoCelebracao,
    );
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
    const container = document.getElementById("chart-week");
    const badge = document.getElementById("chart-total-badge");
    if (!container) return;

    try {
      // 1. Definir range do mês atual
      const hoje = new Date();
      const ano = hoje.getFullYear();
      const mes = hoje.getMonth();

      const primeiroDia = new Date(ano, mes, 1);
      const ultimoDia = new Date(ano, mes + 1, 0);

      const startStr = primeiroDia.toISOString().split("T")[0];
      const endStr = ultimoDia.toISOString().split("T")[0];

      // 2. Buscar eventos do mês atual
      const { data: eventos, error } = await window.api.client
        .from("eventos_base")
        .select("data, titulo")
        .gte("data", startStr)
        .lte("data", endStr);

      if (error) throw error;

      // Atualizar badge com total
      const mesNome = hoje
        .toLocaleString("pt-BR", { month: "long" })
        .toUpperCase();
      if (badge)
        badge.textContent = `${eventos.length} ${eventos.length === 1 ? "ATIVIDADE" : "ATIVIDADES"}`;

      // 3. Estado vazio elegante
      if (!eventos || eventos.length === 0) {
        container.innerHTML = `
          <div class="chart-empty-state" onclick="window.DashboardController.abrirGerenciadorAgenda('${startStr}')" style="cursor:pointer;">
            <i data-lucide="calendar-plus" style="width: 32px; height: 32px; margin-bottom: 10px; color: var(--cor-dourado);"></i>
            <span style="font-size: 0.9rem; font-weight: bold; color: #666;">Agenda de ${mesNome} está vazia</span>
            <span style="font-size: 0.75rem; color: var(--cor-vinho); margin-top:5px; text-decoration: underline;">+ Planejar Mês Agora</span>
          </div>
        `;
        if (window.lucide) lucide.createIcons();
        return;
      }

      // 4. Agrupamento por semanas do mês
      const semanas = [0, 0, 0, 0, 0, 0];

      eventos.forEach((ev) => {
        const dataEvento = new Date(ev.data + "T12:00:00");
        const diaMes = dataEvento.getDate();
        const primeiroDiaSemana = primeiroDia.getDay();
        const semanaIndex = Math.floor((diaMes + primeiroDiaSemana - 1) / 7);

        if (semanas[semanaIndex] !== undefined) {
          semanas[semanaIndex]++;
        }
      });

      // Determinar quantas semanas realmente têm dados
      let ultimaSemanaComDados = 0;
      for (let i = semanas.length - 1; i >= 0; i--) {
        if (semanas[i] > 0) {
          ultimaSemanaComDados = i;
          break;
        }
      }
      const semanasVisuais = semanas.slice(0, Math.max(ultimaSemanaComDados + 1, 4));
      const maxEventos = Math.max(...semanasVisuais, 1);

      // 5. Renderizar com cores inteligentes
      container.innerHTML = semanasVisuais
        .map((qtd, i) => {
          // Heatmap: poucos eventos = dourado, muitos = vinho
          let corBarra = "linear-gradient(to top, var(--cor-vinho), #d6455b)";
          if (qtd === 0) corBarra = "#eee";
          else if (qtd < 3)
            corBarra = "linear-gradient(to top, #fbb558, #ffcc80)";

          const altura = qtd === 0 ? 4 : (qtd / maxEventos) * 100;

          return `
            <div class="chart-bar-group">
              <div class="chart-value-tooltip">${qtd}</div>
              <div class="chart-bar" style="height: ${altura}%; background: ${corBarra};"></div>
              <div class="chart-label">SEM ${i + 1}</div>
            </div>
          `;
        })
        .join("");
    } catch (e) {
      console.error("❌ Erro ao renderizar gráfico mensal:", e);
      container.innerHTML = `
        <div style="display: flex; align-items: center; justify-content: center; height: 100%; padding: 20px; text-align: center; color: #dc2626;">
          <div style="font-size: 0.85rem;">⚠️ Erro ao carregar gráfico</div>
        </div>
      `;
    }
  },

  renderizarListaRecentes: async function () {
    const container = document.getElementById("admin-event-list");
    if (!container) return;

    const eventos = await window.api.buscarEventosRecentes(6);

    container.innerHTML = eventos
      .map((ev) => {
        const dataObj = new Date(ev.data + "T12:00:00");
        const dia = dataObj.getDate().toString().padStart(2, "0");
        const mes = dataObj
          .toLocaleString("pt-BR", { month: "short" })
          .toUpperCase();

        // Determina a cor do indicador lateral
        let corIndicador = "#2e3fd1ff"; // Atendimento
        let tagClass = "u-bg-azul";

        if (ev.tipo_compromisso === "liturgia") {
          corIndicador = "var(--sys-color-success)";
          tagClass = "u-bg-verde";
        } else if (ev.tipo_compromisso === "reuniao") {
          corIndicador = "var(--cor-slate)";
          tagClass = "u-bg-slate";
        }

        return `
            <div class="c-card-event" onclick="window.DashboardController.abrirGerenciadorAgenda('${ev.data}')">
                <div class="c-card-event__indicator" style="background: ${corIndicador}"></div>
                
                <div class="c-card-event__date">
                    <span class="c-card-event__day">${dia}</span>
                    <span class="c-card-event__month">${mes}</span>
                </div>

                <div class="c-card-event__content">
                    <div style="font-size: 9px; font-weight: 900; text-transform: uppercase; color: #292929; margin-bottom: 4px;">
                        ${ev.tipo_compromisso}
                    </div>
                    <h4 class="c-card-event__title">${ev.titulo}</h4>
                    <div class="c-card-event__meta">
                        <span>🕒 ${ev.hora_inicio?.substring(0, 5) || "--:--"}</span>
                        <span>📍 ${ev.local || "Paróquia"}</span>
                    </div>
                </div>

                <div style="padding: 15px; display: flex; align-items: center; color: #eee;">
                    <i data-lucide="chevron-right"></i>
                </div>
            </div>
        `;
      })
      .join("");

    // Vital: Re-inicializa os ícones após injetar o HTML
    if (window.lucide) lucide.createIcons();
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
  },

  // ==========================================================================
  // 8. GESTÃO DE COMUNIDADES
  // Criado em: 05/02/2026
  // ==========================================================================

  /**
   * Renderiza a aba de gestão de comunidades
   */
  renderizarAbaComunidades: async function () {
    const container = document.getElementById("tab-comunidades");
    if (!container) return;

    container.innerHTML = `
      <div class="panel">
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 25px;">
          <h3 class="page-title">
            <i data-lucide="church" style="vertical-align: middle; margin-right: 8px;"></i>
            Gestão de Comunidades e Capelas
          </h3>
          <button class="btn-primary" onclick="window.DashboardController.abrirModalComunidade()">
            <i data-lucide="plus" style="vertical-align: middle; margin-right: 5px;"></i>
            Nova Comunidade
          </button>
        </div>
        
        <div class="loading-indicator" style="text-align: center; padding: 40px; color: #888;">
          <i data-lucide="loader" class="spin" style="width: 32px; height: 32px;"></i>
          <p>Carregando comunidades...</p>
        </div>
      </div>
    `;

    // Recarrega ícones do Lucide
    if (window.lucide) window.lucide.createIcons();

    try {
      const comunidades = await window.api.listarTodasComunidades();
      
      container.innerHTML = `
        <div class="panel">
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 25px;">
            <h3 class="page-title">
              <i data-lucide="church" style="vertical-align: middle; margin-right: 8px;"></i>
              Gestão de Comunidades e Capelas
            </h3>
            <button class="btn-primary" onclick="window.DashboardController.abrirModalComunidade()">
              <i data-lucide="plus" style="vertical-align: middle; margin-right: 5px;"></i>
              Nova Comunidade
            </button>
          </div>

          ${comunidades.length === 0 ? `
            <div style="text-align: center; padding: 60px 20px; color: #888;">
              <i data-lucide="map-pin-off" style="width: 64px; height: 64px; margin-bottom: 15px; opacity: 0.3;"></i>
              <p style="font-size: 1.1rem; margin: 10px 0;">Nenhuma comunidade cadastrada</p>
              <p style="font-size: 0.9rem; opacity: 0.7;">Clique em "Nova Comunidade" para começar</p>
            </div>
          ` : `
            <div class="crud-list-container">
              ${comunidades.map(com => `
                <div class="crud-list-item ${!com.ativo ? 'inactive' : ''}">
                  <div class="crud-item-header">
                    <div style="display: flex; align-items: center; gap: 10px;">
                      <strong style="font-size: 1.1rem;">${com.nome}</strong>
                      ${!com.ativo ? '<span class="badge-inactive">Inativa</span>' : ''}
                    </div>
                    <div class="crud-item-actions">
                      <button 
                        class="btn-icon-edit" 
                        onclick='window.DashboardController.abrirModalComunidade(${JSON.stringify(com).replace(/'/g, "&apos;")})'
                        title="Editar"
                      >
                        <i data-lucide="edit-2"></i>
                      </button>
                      ${com.ativo ? `
                        <button 
                          class="btn-icon-delete" 
                          onclick="window.DashboardController.deletarComunidade('${com.id}', '${com.nome.replace(/'/g, "\\'")}')"
                          title="Desativar"
                        >
                          <i data-lucide="trash-2"></i>
                        </button>
                      ` : `
                        <button 
                          class="btn-icon-success" 
                          onclick="window.DashboardController.reativarComunidade('${com.id}', '${com.nome.replace(/'/g, "\\'")}')"
                          title="Reativar"
                        >
                          <i data-lucide="check-circle"></i>
                        </button>
                      `}
                    </div>
                  </div>
                  <div class="crud-item-body">
                    ${com.endereco ? `
                      <p><i data-lucide="map-pin" style="width: 14px; vertical-align: middle;"></i> ${com.endereco}</p>
                    ` : ''}
                    ${com.padroeiro ? `
                      <p><i data-lucide="heart" style="width: 14px; vertical-align: middle;"></i> Padroeiro: ${com.padroeiro}</p>
                    ` : ''}
                  </div>
                </div>
              `).join('')}
            </div>
          `}
        </div>
      `;

      // Recarrega ícones
      if (window.lucide) window.lucide.createIcons();

    } catch (error) {
      console.error("❌ Erro ao carregar comunidades:", error);
      container.innerHTML = `
        <div class="panel">
          <div class="error-message">
            <i data-lucide="alert-circle"></i>
            <p>Erro ao carregar comunidades. Tente novamente.</p>
          </div>
        </div>
      `;
      if (window.lucide) window.lucide.createIcons();
    }
  },

  /**
   * Abre modal para criar/editar comunidade
   */
  abrirModalComunidade: function (comunidade = null) {
    const isEdicao = comunidade !== null;
    const titulo = isEdicao ? "Editar Comunidade" : "Nova Comunidade";

    const modalHTML = `
      <div class="modal-overlay" id="modal-comunidade" onclick="window.DashboardController.fecharModalComunidade(event)" style="z-index: 10000;">
        <div class="modal-content" style="max-width: 550px; max-height: 90vh; overflow-y: auto;" onclick="event.stopPropagation()">
          <div class="modal-header" style="background: linear-gradient(135deg, #a41d31 0%, #8b1829 100%); color: white; padding: 20px 24px; border-radius: 12px 12px 0 0;">
            <h3 style="margin: 0; font-size: 1.3rem; font-weight: 600; display: flex; align-items: center; gap: 10px;">
              <i data-lucide="church" style="width: 24px; height: 24px;"></i>
              ${titulo}
            </h3>
            <button class="btn-close" onclick="window.DashboardController.fecharModalComunidade()" style="background: rgba(255,255,255,0.2); color: white; border: none; width: 32px; height: 32px; border-radius: 8px; font-size: 20px; cursor: pointer; transition: all 0.2s;" onmouseover="this.style.background='rgba(255,255,255,0.3)'" onmouseout="this.style.background='rgba(255,255,255,0.2)'">×</button>
          </div>
          
          <div class="modal-body" style="padding: 24px;">
            <form id="form-comunidade" onsubmit="window.DashboardController.salvarComunidade(event)">
              <input type="hidden" id="comunidade-id" value="${comunidade?.id || ''}">
              
              <div class="form-group" style="margin-bottom: 20px;">
                <label for="comunidade-nome" style="display: flex; align-items: center; gap: 8px; margin-bottom: 8px; font-weight: 600; color: #374151;">
                  <i data-lucide="tag" style="width: 16px; height: 16px; color: #fbb558;"></i>
                  Nome da Comunidade *
                </label>
                <input 
                  type="text" 
                  id="comunidade-nome" 
                  class="form-control" 
                  value="${comunidade?.nome || ''}"
                  placeholder="Ex: Capela Santa Luzia"
                  required
                  maxlength="100"
                  style="border: 2px solid #e5e7eb; border-radius: 8px; padding: 12px; font-size: 15px; transition: all 0.2s;"
                  onfocus="this.style.borderColor='#fbb558'; this.style.boxShadow='0 0 0 3px rgba(251,181,88,0.1)'"
                  onblur="this.style.borderColor='#e5e7eb'; this.style.boxShadow='none'"
                />
              </div>

              <div class="form-group" style="margin-bottom: 20px;">
                <label for="comunidade-endereco" style="display: flex; align-items: center; gap: 8px; margin-bottom: 8px; font-weight: 600; color: #374151;">
                  <i data-lucide="map-pin" style="width: 16px; height: 16px; color: #fbb558;"></i>
                  Endereço
                </label>
                <textarea 
                  id="comunidade-endereco" 
                  class="form-control" 
                  rows="2"
                  placeholder="Rua, número, bairro..."
                  style="border: 2px solid #e5e7eb; border-radius: 8px; padding: 12px; font-size: 15px; transition: all 0.2s; resize: vertical;"
                  onfocus="this.style.borderColor='#fbb558'; this.style.boxShadow='0 0 0 3px rgba(251,181,88,0.1)'"
                  onblur="this.style.borderColor='#e5e7eb'; this.style.boxShadow='none'"
                >${comunidade?.endereco || ''}</textarea>
              </div>

              <div class="form-group" style="margin-bottom: 20px;">
                <label for="comunidade-padroeiro" style="display: flex; align-items: center; gap: 8px; margin-bottom: 8px; font-weight: 600; color: #374151;">
                  <i data-lucide="heart" style="width: 16px; height: 16px; color: #fbb558;"></i>
                  Padroeiro(a)
                </label>
                <input 
                  type="text" 
                  id="comunidade-padroeiro" 
                  class="form-control" 
                  value="${comunidade?.padroeiro || ''}"
                  placeholder="Ex: Santa Luzia"
                  maxlength="100"
                  style="border: 2px solid #e5e7eb; border-radius: 8px; padding: 12px; font-size: 15px; transition: all 0.2s;"
                  onfocus="this.style.borderColor='#fbb558'; this.style.boxShadow='0 0 0 3px rgba(251,181,88,0.1)'"
                  onblur="this.style.borderColor='#e5e7eb'; this.style.boxShadow='none'"
                />
              </div>

              <div class="form-group" style="margin-top: 24px; padding: 16px; background: #f9fafb; border-radius: 8px; border: 1px solid #e5e7eb;">
                <label class="checkbox-label" style="display: flex; align-items: center; gap: 10px; cursor: pointer; margin: 0;">
                  <input 
                    type="checkbox" 
                    id="comunidade-ativo" 
                    ${comunidade?.ativo !== false ? 'checked' : ''}
                    style="width: 20px; height: 20px; cursor: pointer; accent-color: #fbb558;"
                  />
                  <span style="font-weight: 600; color: #374151; font-size: 15px;">Comunidade ativa</span>
                </label>
                <small style="color: #6b7280; display: block; margin-top: 8px; margin-left: 30px; font-size: 13px;">
                  <i data-lucide="info" style="width: 14px; height: 14px; vertical-align: middle; margin-right: 4px;"></i>
                  Comunidades inativas não aparecem nos filtros
                </small>
              </div>

              <div class="modal-footer" style="margin-top: 24px; padding-top: 20px; border-top: 1px solid #e5e7eb; display: flex; gap: 12px; justify-content: flex-end;">
                <button type="button" class="btn-secondary" onclick="window.DashboardController.fecharModalComunidade()" style="padding: 12px 24px; border-radius: 8px; font-weight: 600; transition: all 0.2s;">
                  <i data-lucide="x" style="width: 18px; height: 18px; vertical-align: middle; margin-right: 6px;"></i>
                  Cancelar
                </button>
                <button type="submit" class="btn-primary" style="background: linear-gradient(135deg, #a41d31 0%, #c82038 100%); padding: 12px 24px; border-radius: 8px; font-weight: 600; transition: all 0.2s; box-shadow: 0 4px 12px rgba(164,29,49,0.3);" onmouseover="this.style.transform='translateY(-2px)'; this.style.boxShadow='0 6px 16px rgba(164,29,49,0.4)'" onmouseout="this.style.transform='translateY(0)'; this.style.boxShadow='0 4px 12px rgba(164,29,49,0.3)'">
                  <i data-lucide="save" style="width: 18px; height: 18px; vertical-align: middle; margin-right: 6px;"></i>
                  ${isEdicao ? 'Atualizar' : 'Cadastrar'}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    `;

    // Remove modal anterior se existir
    const modalExistente = document.getElementById("modal-comunidade");
    if (modalExistente) modalExistente.remove();

    // Adiciona novo modal
    document.body.insertAdjacentHTML("beforeend", modalHTML);

    // Ativa animação
    setTimeout(() => {
      document.getElementById("modal-comunidade").classList.add("active");
    }, 10);

    // Recarrega ícones
    if (window.lucide) window.lucide.createIcons();

    // Foco no campo nome
    setTimeout(() => document.getElementById("comunidade-nome").focus(), 100);
  },

  /**
   * Fecha modal de comunidade
   */
  fecharModalComunidade: function (event) {
    if (event && event.target.id !== "modal-comunidade") return;
    
    const modal = document.getElementById("modal-comunidade");
    if (modal) {
      modal.classList.remove("active");
      setTimeout(() => modal.remove(), 300);
    }
  },

  /**
   * Salva (cria ou atualiza) comunidade
   */
  salvarComunidade: async function (event) {
    event.preventDefault();

    const comunidadeData = {
      id: document.getElementById("comunidade-id").value || null,
      nome: document.getElementById("comunidade-nome").value.trim(),
      endereco: document.getElementById("comunidade-endereco").value.trim(),
      padroeiro: document.getElementById("comunidade-padroeiro").value.trim(),
      ativo: document.getElementById("comunidade-ativo").checked,
    };

    // Validação
    if (!comunidadeData.nome) {
      alert("⚠️ O nome da comunidade é obrigatório!");
      return;
    }

    // Desabilita botão de submit
    const btnSubmit = event.target.querySelector('button[type="submit"]');
    const textoOriginal = btnSubmit.innerHTML;
    btnSubmit.disabled = true;
    btnSubmit.innerHTML = '<i data-lucide="loader" class="spin"></i> Salvando...';
    if (window.lucide) window.lucide.createIcons();

    try {
      await window.api.salvarComunidade(comunidadeData);
      
      // Fecha modal e recarrega lista
      this.fecharModalComunidade();
      await this.renderizarAbaComunidades();
      
      // Feedback
      this.mostrarNotificacao(
        comunidadeData.id ? "Comunidade atualizada com sucesso!" : "Comunidade cadastrada com sucesso!",
        "success"
      );

    } catch (error) {
      console.error("❌ Erro ao salvar comunidade:", error);
      alert("❌ Erro ao salvar comunidade. Tente novamente.");
      
      // Reabilita botão
      btnSubmit.disabled = false;
      btnSubmit.innerHTML = textoOriginal;
      if (window.lucide) window.lucide.createIcons();
    }
  },

  /**
   * Desativa uma comunidade
   */
  deletarComunidade: async function (id, nome) {
    if (!confirm(`⚠️ Deseja realmente desativar a comunidade "${nome}"?\n\nEla não será excluída, apenas ficará oculta.`)) {
      return;
    }

    try {
      const result = await window.api.excluirComunidade(id);
      
      if (result.error) {
        alert(`❌ ${result.error.message}`);
        return;
      }

      await this.renderizarAbaComunidades();
      this.mostrarNotificacao("Comunidade desativada com sucesso!", "success");

    } catch (error) {
      console.error("❌ Erro ao desativar comunidade:", error);
      alert("❌ Erro ao desativar comunidade. Tente novamente.");
    }
  },

  /**
   * Reativa uma comunidade
   */
  reativarComunidade: async function (id, nome) {
    if (!confirm(`Deseja reativar a comunidade "${nome}"?`)) {
      return;
    }

    try {
      await window.api.reativarComunidade(id);
      await this.renderizarAbaComunidades();
      this.mostrarNotificacao("Comunidade reativada com sucesso!", "success");

    } catch (error) {
      console.error("❌ Erro ao reativar comunidade:", error);
      alert("❌ Erro ao reativar comunidade. Tente novamente.");
    }
  },

  /**
   * Mostra notificação toast
   */
  mostrarNotificacao: function (mensagem, tipo = "info") {
    const icones = {
      success: "check-circle",
      error: "alert-circle",
      info: "info",
    };

    const cores = {
      success: "#22c55e",
      error: "#ef4444",
      info: "#3b82f6",
    };

    const toast = document.createElement("div");
    toast.className = "toast-notification";
    toast.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      background: white;
      padding: 15px 20px;
      border-radius: 8px;
      box-shadow: 0 4px 12px rgba(0,0,0,0.15);
      display: flex;
      align-items: center;
      gap: 10px;
      z-index: 10000;
      animation: slideInRight 0.3s ease;
      border-left: 4px solid ${cores[tipo]};
    `;

    toast.innerHTML = `
      <i data-lucide="${icones[tipo]}" style="color: ${cores[tipo]}; width: 20px;"></i>
      <span style="color: #333;">${mensagem}</span>
    `;

    document.body.appendChild(toast);
    if (window.lucide) window.lucide.createIcons();

    setTimeout(() => {
      toast.style.animation = "slideOutRight 0.3s ease";
      setTimeout(() => toast.remove(), 300);
    }, 3000);
  },
};

document.addEventListener("DOMContentLoaded", () => {
  window.DashboardController.init();
  // Garante injecao no load e no resize
  window.DashboardController.initMobile();
  window.addEventListener("resize", () =>
    window.DashboardController.initMobile(),
  );
});
