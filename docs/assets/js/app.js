/*
 * ARQUIVO: app.js
 * DESCRIÇÃO: Controlador Principal - Renderização, Modais e Painel Admin
 * PROJETO: Liturgia Paroquial 2026
 * AUTOR: Rodrigo & Dev AI
 * STATUS: Validado (Gold)
 */

console.log("🚀 Sistema Litúrgico V4 Iniciado");

// --- ESTADO GLOBAL ---
const ESTADO = {
  anoAtual: 2026,
  mesAtual: 1,
  dadosEventos: {},
  isAdmin: false,
  listaEquipes: [],
};

let eventoEmEdicao = null;

// --- ÍCONES ---
const ICONS = {
  leitura:
    '<svg class="equipe-icon" viewBox="0 0 24 24" fill="currentColor" style="color:var(--cor-vinho)"><path d="M12 3v18.5c-2.3-.6-4.4-1-6.5-1-2.4 0-4.6.5-6.5 1.2V3.2C1.4 2.5 3.6 2 6 2c2.1 0 4.1.4 6 1zm10.5-.8c-1.9-.7-4.1-1.2-6.5-1.2v18.5c2.1 0 4.2.4 6.5 1V3.2z"/></svg>',
  canto:
    '<svg class="equipe-icon" viewBox="0 0 24 24" fill="currentColor" style="color:var(--cor-dourado)"><path d="M12 3v10.55c-.59-.34-1.27-.55-2-.55-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4V7h4V3h-6z"/></svg>',
};

// ==========================================================================
// 1. INICIALIZAÇÃO
// ==========================================================================
document.addEventListener("DOMContentLoaded", async () => {
  // Check Auth
  const session = await window.api.checkSession();
  if (session) {
    ESTADO.isAdmin = true;
    console.log("👑 Admin: ", session.user.email);
    adicionarBotaoLogout();
    ESTADO.listaEquipes = await window.api.listarEquipes();
  }

  // Load Calendar
  carregarMes(ESTADO.anoAtual, ESTADO.mesAtual);
  configurarBotoesNavegacao();
});

// ==========================================================================
// 2. RENDERIZAÇÃO (GRID)
// ==========================================================================
async function carregarMes(ano, mes) {
  const nomeMes = new Date(ano, mes - 1).toLocaleString("pt-BR", {
    month: "long",
  });
  document.querySelector(".month-name").textContent = `${nomeMes} ${ano}`;

  const grid = document.querySelector(".calendar-wrapper");
  const headers = grid.innerHTML
    .match(/<div class="day-header">.*?<\/div>/g)
    .join("");
  grid.innerHTML =
    headers +
    '<div style="grid-column:1/-1; text-align:center; padding:40px; color:#888;">Carregando...</div>';

  try {
    const eventos = await window.api.buscarEventos(ano, mes);
    ESTADO.dadosEventos = {};
    eventos.forEach((ev) => (ESTADO.dadosEventos[ev.data] = ev));
    renderizarGrid(ano, mes, grid, headers);
  } catch (erro) {
    console.error(erro);
    grid.innerHTML =
      headers + '<div style="padding:20px; color:red;">Erro de conexão.</div>';
  }
}

function renderizarGrid(ano, mes, gridElement, headersHTML) {
  let html = headersHTML;
  const primeiroDiaSemana = new Date(ano, mes - 1, 1).getDay();
  const ultimoDiaDoMes = new Date(ano, mes, 0).getDate();
  const ultimoDiaMesAnterior = new Date(ano, mes - 1, 0).getDate();

  // Dias Mês Anterior
  for (let i = primeiroDiaSemana - 1; i >= 0; i--) {
    const dia = ultimoDiaMesAnterior - i;
    html += `<div class="day-cell other-month"><span class="day-number">${dia}</span></div>`;
  }

  // Dias Atuais
  for (let dia = 1; dia <= ultimoDiaDoMes; dia++) {
    const dataISO = `${ano}-${String(mes).padStart(2, "0")}-${String(
      dia
    ).padStart(2, "0")}`;
    const evento = ESTADO.dadosEventos[dataISO];
    let conteudoHTML = "";
    let clickAttr = "";

    // Sempre permite clique (para poder criar evento em dia vazio)
    clickAttr = `onclick="abrirModal('${dataISO}')"`;

    if (evento) {
      let corHex = evento.liturgia_cores?.hex_code || "#2E7D32";
      if (corHex.toLowerCase() === "#ffffff") corHex = "#cccccc";

      const classeSolenidade = evento.is_solenidade ? "solenidade" : "";
      const estiloPill = `border-left: 3px solid ${corHex}; background-color: var(--cor-vinho);`;

      conteudoHTML = `<div class="pill ${classeSolenidade}" style="${estiloPill}">${evento.titulo}</div>`;

      if (evento.escalas && evento.escalas.length > 0) {
        evento.escalas.forEach((esc) => {
          const hora = esc.hora_celebracao.substring(0, 5);
          conteudoHTML += `<div class="pill" style="background-color:#f0f0f0; color:#333; border-left:3px solid #ccc">${hora} Missa</div>`;
        });
      }
    }

    html += `<div class="day-cell" ${clickAttr}><span class="day-number">${dia}</span>${conteudoHTML}</div>`;
  }

  // Dias Próximo Mês
  const totalCelulas = primeiroDiaSemana + ultimoDiaDoMes;
  const resto = totalCelulas % 7;
  if (resto !== 0) {
    for (let i = 1; i <= 7 - resto; i++) {
      html += `<div class="day-cell other-month"><span class="day-number">${i}</span></div>`;
    }
  }
  gridElement.innerHTML = html;
}

// ==========================================================================
// 3. MODAL DE DETALHES
// ==========================================================================
window.abrirModal = function (dataISO) {
  let evento = ESTADO.dadosEventos[dataISO];

  // Mock para dia vazio (Criação)
  if (!evento) {
    evento = {
      id: null,
      data: dataISO,
      titulo: "Sem Evento Cadastrado",
      tempo_liturgico: "Paroquial",
      liturgia_cores: { hex_code: "#CCCCCC" },
      escalas: [],
    };
  }

  eventoEmEdicao = JSON.parse(JSON.stringify(evento));

  const modalContent = document.getElementById("modalContent");
  const modalOverlay = document.getElementById("modalOverlay");

  // Formatação Data
  const dataObj = new Date(dataISO + "T12:00:00");
  const diaNum = dataObj.getDate();
  const mesNome = dataObj
    .toLocaleString("pt-BR", { month: "short" })
    .toUpperCase()
    .replace(".", "");
  const diaSemana = dataObj.toLocaleString("pt-BR", { weekday: "long" });

  // Cor
  let corHex = evento.liturgia_cores?.hex_code || "#ccc";
  let corTxt = corHex;
  if (corHex.toLowerCase() === "#ffffff") {
    corHex = "#ccc";
    corTxt = "#666";
  }

  const conteudoHTML = gerarHTMLLeitura(evento);

  // Botão Admin
  let btnAdmin = "";
  if (ESTADO.isAdmin) {
    btnAdmin = `<button id="btnEditar" class="btn-admin-action">🛠️ GERENCIAR AGENDA</button>`;
  }

  modalContent.innerHTML = `
    <div class="modal-card">
        <button class="btn-close" onclick="fecharModalForce()" aria-label="Fechar">×</button>
        <div class="modal-sidebar-color" style="background-color: ${corHex}"></div>
        <div class="modal-body" id="modalBody">
            <div class="modal-header">
                <div><span class="modal-day">${diaNum}</span><span class="modal-month">${mesNome}</span></div>
                <div class="modal-meta"><div class="modal-weekday">${diaSemana}</div></div>
            </div>
            <div id="areaConteudo">
                <div class="modal-liturgia" style="color:${corTxt}">${evento.tempo_liturgico}</div>
                <div class="modal-titulo">${evento.titulo}</div>
                <div class="escala-list">${conteudoHTML}</div>
            </div>
            ${btnAdmin}
        </div>
    </div>`;

  modalOverlay.classList.add("active");

  if (ESTADO.isAdmin) {
    document.getElementById("btnEditar").onclick = () =>
      ativarModoEdicao(evento);
  }
};

function gerarHTMLLeitura(evento) {
  if (!evento.escalas || evento.escalas.length === 0) {
    return '<div style="color:#999; font-style:italic; padding:10px;">Nenhuma celebração agendada.</div>';
  }
  return evento.escalas
    .map((esc) => {
      const leit = esc.equipe_leitura?.nome_equipe || "-";
      const cant = esc.equipe_canto?.nome_equipe || "-";
      const hora = esc.hora_celebracao.substring(0, 5);
      return `
        <div class="escala-item">
            <div class="escala-hora">${hora}</div>
            <div class="escala-equipes">
                <div class="equipe-row">${ICONS.leitura} <span class="equipe-label">Leitura</span> <strong>${leit}</strong></div>
                <div class="equipe-row">${ICONS.canto} <span class="equipe-label">Canto</span> <strong>${cant}</strong></div>
            </div>
        </div>`;
    })
    .join("");
}

// ==========================================================================
// 4. EDITOR (ADMIN)
// ==========================================================================
function ativarModoEdicao(evento) {
  const area = document.getElementById("areaConteudo");
  const btnEditar = document.getElementById("btnEditar");
  if (btnEditar) btnEditar.style.display = "none";

  const tituloVal = evento.titulo || "Novo Evento";
  const tempoVal = evento.tempo_liturgico || "Tempo Comum";
  const corAtualId = evento.cor_id || evento.liturgia_cores?.id || 1;

  // Lista de Tempos Litúrgicos Padrão
  const temposLiturgicos = [
    "Tempo Comum",
    "Advento",
    "Tempo do Natal",
    "Quaresma",
    "Semana Santa",
    "Tríduo Pascal",
    "Tempo Pascal",
    "Paroquial",
  ];

  // Gera opções do Select de Tempos
  const optionsTempos = temposLiturgicos
    .map(
      (t) =>
        `<option value="${t}" ${t === tempoVal ? "selected" : ""}>${t}</option>`
    )
    .join("");

  // Gera o formulário
  let htmlEditor = `
        <h3 style="color:var(--cor-vinho); margin-bottom:15px; border-bottom:1px solid #eee; padding-bottom:5px;">Editar Evento</h3>
        
        <!-- EDITOR DE CABEÇALHO -->
        <div style="background:#fff; padding:15px; border-radius:8px; border:1px solid #e0e0e0; margin-bottom:15px;">
            
            <!-- Título -->
            <label style="font-size:0.75rem; font-weight:bold; color:#888;">TÍTULO DO EVENTO / CELEBRAÇÃO</label>
            <input type="text" id="editTitulo" value="${tituloVal}" placeholder="Ex: Missa Dominical" style="width:100%; padding:10px; border:1px solid #ddd; border-radius:4px; font-weight:bold; font-size:1rem; margin-top:5px; margin-bottom:15px;">
            
            <!-- Linha 1: Tempo e Tipo -->
            <div style="display:flex; gap:10px; margin-bottom:10px;">
                <div style="flex:1;">
                    <label style="font-size:0.75rem; font-weight:bold; color:#888;">TEMPO LITÚRGICO</label>
                    <select id="editTempo" style="width:100%; padding:8px; border:1px solid #ddd; border-radius:4px; margin-top:5px;">
                        ${optionsTempos}
                        <option value="Outro" ${
                          !temposLiturgicos.includes(tempoVal) ? "selected" : ""
                        }>Outro...</option>
                    </select>
                </div>
                <div style="flex:1;">
                    <label style="font-size:0.75rem; font-weight:bold; color:#888;">TIPO</label>
                    <select id="editTipo" style="width:100%; padding:8px; border:1px solid #ddd; border-radius:4px; margin-top:5px;">
                        <option value="comum" ${
                          !evento.is_solenidade ? "selected" : ""
                        }>Comum / Memória</option>
                        <option value="solenidade" ${
                          evento.is_solenidade ? "selected" : ""
                        }>Solenidade (Destaque)</option>
                    </select>
                </div>
            </div>

            <!-- Linha 2: Cor Litúrgica -->
            <div>
                <label style="font-size:0.75rem; font-weight:bold; color:#888;">COR LITÚRGICA</label>
                <select id="editCor" style="width:100%; padding:8px; border:1px solid #ddd; border-radius:4px; margin-top:5px;">
                    <option value="1" ${
                      corAtualId == 1 ? "selected" : ""
                    }>Verde (Esperança/Comum)</option>
                    <option value="2" ${
                      corAtualId == 2 ? "selected" : ""
                    }>Branco (Festas/Alegria)</option>
                    <option value="3" ${
                      corAtualId == 3 ? "selected" : ""
                    }>Vermelho (Mártires/Espírito)</option>
                    <option value="4" ${
                      corAtualId == 4 ? "selected" : ""
                    }>Roxo (Penitência/Advento)</option>
                    <option value="5" ${
                      corAtualId == 5 ? "selected" : ""
                    }>Rosa (Gaudete/Laetare)</option>
                </select>
            </div>
        </div>

        <h4 style="color:#666; font-size:0.9rem; margin-bottom:10px;">Escalas e Horários</h4>
        <div id="listaEditor" style="display:flex; flex-direction:column; gap:15px;">`;

  if (evento.escalas) {
    evento.escalas.forEach((esc, index) => {
      htmlEditor += gerarLinhaEditor(esc, index);
    });
  }

  htmlEditor += `</div>
        <button onclick="adicionarNovaEscala()" style="margin-top:15px; background:#f0f0f0; border:1px dashed #ccc; padding:10px; width:100%; border-radius:6px; cursor:pointer; font-weight:bold; color:#555;">➕ Adicionar Horário</button>
        <div style="margin-top:25px; display:flex; gap:10px;">
            <button onclick="salvarEdicoes()" style="flex:1; background:var(--cor-verde); color:#fff; border:none; padding:12px; border-radius:6px; font-weight:bold; cursor:pointer;">💾 SALVAR TUDO</button>
            <button onclick="fecharModalForce()" style="background:#eee; border:none; padding:12px 20px; border-radius:6px; cursor:pointer; color:#555;">Cancelar</button>
        </div>`;

  area.innerHTML = htmlEditor;
}

function gerarLinhaEditor(escala, index) {
  const idLeit = escala.equipe_leitura?.id || escala.equipe_leitura_id;
  const idCant = escala.equipe_canto?.id || escala.equipe_canto_id;
  const horaVal = escala.hora_celebracao
    ? escala.hora_celebracao.substring(0, 5)
    : "19:00";

  // Helpers de seleção
  const selLeit = (id) => (id === idLeit ? "selected" : "");
  const selCant = (id) => (id === idCant ? "selected" : "");

  return `
    <div class="editor-row" style="background:#fff; padding:15px; border-radius:8px; border:1px solid #e0e0e0; box-shadow:0 1px 3px rgba(0,0,0,0.05);">
        <div style="display:flex; justify-content:space-between; margin-bottom:10px; border-bottom:1px solid #f5f5f5; padding-bottom:5px;">
            <label style="font-size:0.8rem; font-weight:bold; color:#888;">HORÁRIO</label>
            <button onclick="removerLinha(this)" style="color:#D32F2F; border:none; background:none; cursor:pointer; font-size:0.8rem;">🗑️ Excluir</button>
        </div>
        <input type="time" class="edit-hora" value="${horaVal}" style="width:100%; padding:8px; border:1px solid #ddd; border-radius:4px; margin-bottom:10px; font-weight:bold;">
        <div style="display:grid; gap:10px;">
            <div>
                <label style="font-size:0.75rem; font-weight:bold; color:#666; display:block; margin-bottom:2px;">LEITURA</label>
                <select class="edit-leitura" style="width:100%; padding:8px; border:1px solid #ddd; border-radius:4px; background:#fff;">
                    <option value="">-- Selecione --</option>
                    ${ESTADO.listaEquipes
                      .map(
                        (eq) =>
                          `<option value="${eq.id}" ${selLeit(eq.id)}>${
                            eq.nome_equipe
                          }</option>`
                      )
                      .join("")}
                </select>
            </div>
            <div>
                <label style="font-size:0.75rem; font-weight:bold; color:#666; display:block; margin-bottom:2px;">CANTO</label>
                <select class="edit-canto" style="width:100%; padding:8px; border:1px solid #ddd; border-radius:4px; background:#fff;">
                    <option value="">-- Selecione --</option>
                    ${ESTADO.listaEquipes
                      .map(
                        (eq) =>
                          `<option value="${eq.id}" ${selCant(eq.id)}>${
                            eq.nome_equipe
                          }</option>`
                      )
                      .join("")}
                </select>
            </div>
        </div>
    </div>`;
}

// Globais para botões HTML
window.adicionarNovaEscala = function () {
  const lista = document.getElementById("listaEditor");
  const nova = {
    hora_celebracao: "19:00",
    equipe_leitura_id: null,
    equipe_canto_id: null,
  };
  const div = document.createElement("div");
  div.innerHTML = gerarLinhaEditor(nova, 999);
  lista.appendChild(div.firstElementChild);
  div.firstElementChild.scrollIntoView({ behavior: "smooth" });
};

window.removerLinha = function (btn) {
  if (confirm("Remover este horário?")) btn.closest(".editor-row").remove();
};

window.salvarEdicoes = async function () {
  const novoTitulo = document.getElementById("editTitulo").value;
  const novoTempo = document.getElementById("editTempo").value;
  const novoCorId = document.getElementById("editCor").value;
  const tipoEvento = document.getElementById("editTipo").value;

  if (!novoTitulo) {
    alert("O evento precisa de um Título!");
    return;
  }

  // Monta o objeto para salvar
  const dadosEvento = {
    id: eventoEmEdicao.id,
    data: eventoEmEdicao.data,
    titulo: novoTitulo,
    tempo_liturgico: novoTempo, // Agora salva o tempo escolhido!
    cor_id: parseInt(novoCorId),
    is_solenidade: tipoEvento === "solenidade",
    is_festa: false,
  };

  const linhas = document.querySelectorAll(".editor-row");
  const novasEscalas = [];
  linhas.forEach((row) => {
    const hora = row.querySelector(".edit-hora").value;
    const leit = row.querySelector(".edit-leitura").value || null;
    const cant = row.querySelector(".edit-canto").value || null;

    if (hora) {
      novasEscalas.push({
        hora_celebracao: hora,
        equipe_leitura_id: leit,
        equipe_canto_id: cant,
      });
    }
  });

  try {
    const area = document.getElementById("areaConteudo");
    area.innerHTML =
      '<div style="text-align:center; padding:40px; color:var(--cor-vinho); font-weight:bold;"><p>💾 Processando...</p></div>';

    // Salva no Banco
    await window.api.salvarEventoCompleto(dadosEvento, novasEscalas);

    alert("✅ Agenda atualizada com sucesso!");
    fecharModalForce();
    // Recarrega o grid para refletir o novo título e cor imediatamente
    carregarMes(ESTADO.anoAtual, ESTADO.mesAtual);
  } catch (err) {
    alert("Erro ao salvar: " + err.message);
    console.error(err);
    fecharModalForce();
  }
};

// ==========================================================================
// 5. UTILS
// ==========================================================================
function adicionarBotaoLogout() {
  const header = document.querySelector("header");
  const div = document.createElement("div");
  div.style.position = "absolute";
  div.style.right = "20px";
  div.innerHTML = `<button onclick="window.api.logout()" style="background:rgba(255,255,255,0.2); border:1px solid #fff; color:#fff; padding:5px 12px; border-radius:20px; cursor:pointer; font-size:0.8rem;">Sair</button>`;
  header.appendChild(div);
}

function configurarBotoesNavegacao() {
  const btns = document.querySelectorAll(".btn-nav");
  btns[0].onclick = () => {
    ESTADO.mesAtual--;
    if (ESTADO.mesAtual < 1) {
      ESTADO.mesAtual = 12;
      ESTADO.anoAtual--;
    }
    carregarMes(ESTADO.anoAtual, ESTADO.mesAtual);
  };
  btns[1].onclick = () => {
    ESTADO.anoAtual = 2026;
    ESTADO.mesAtual = 1;
    carregarMes(ESTADO.anoAtual, ESTADO.mesAtual);
  };
  btns[2].onclick = () => {
    ESTADO.mesAtual++;
    if (ESTADO.mesAtual > 12) {
      ESTADO.mesAtual = 1;
      ESTADO.anoAtual++;
    }
    carregarMes(ESTADO.anoAtual, ESTADO.mesAtual);
  };
}

window.fecharModal = (e) => {
  if (e.target.id === "modalOverlay") fecharModalForce();
};
window.fecharModalForce = () => {
  document.getElementById("modalOverlay").classList.remove("active");
};
document.addEventListener("keydown", (e) => {
  if (e.key === "Escape") fecharModalForce();
});
// ==========================================================================
// 6. MÓDULO DE FILTROS & SIDEBAR
// Gerencia a renderização dos checkboxes e a lógica visual de filtragem
// ==========================================================================

/**
 * Inicializa a Sidebar de Filtros
 * Busca as equipes no banco (se necessário) e cria os checkboxes dinamicamente.
 * Deve ser chamado no DOMContentLoaded.
 */
async function inicializarSidebar() {
  console.log("🔄 Iniciando Sidebar...");

  const containerEquipes = document.getElementById("filtro-equipes");

  if (!containerEquipes) {
    console.error(
      "❌ ERRO CRÍTICO: Elemento #filtro-equipes não encontrado no HTML!"
    );
    return;
  }

  // 1. Carrega Equipes
  if (ESTADO.listaEquipes.length === 0) {
    try {
      console.log("📡 Buscando equipes no banco...");
      ESTADO.listaEquipes = await window.api.listarEquipes();
      console.log(`✅ Equipes carregadas: ${ESTADO.listaEquipes.length}`);
    } catch (err) {
      containerEquipes.innerHTML =
        '<div style="color:red; font-size:0.8rem;">Erro ao conectar.</div>';
      console.error("Erro API Equipes:", err);
      return;
    }
  }

  if (ESTADO.listaEquipes.length === 0) {
    containerEquipes.innerHTML =
      '<div style="padding:10px;">Nenhuma equipe cadastrada.</div>';
    return;
  }

  // 2. Renderiza
  let html = `<h3>FILTRAR POR EQUIPE</h3>
        <div class="filter-item" onclick="limparFiltros()">
            <span class="checkbox-custom checked" id="check-all"></span> <strong>TODAS AS EQUIPES</strong>
        </div>`;

  ESTADO.listaEquipes.forEach((eq) => {
    html += `
        <div class="filter-item" onclick="window.toggleFiltro(${eq.id}, this)">
            <span class="checkbox-custom" data-id="${eq.id}"></span> ${eq.nome_equipe}
        </div>`;
  });

  containerEquipes.innerHTML = html;
  console.log("🎨 Sidebar renderizada com sucesso.");
}
/**
 * Alterna o estado de um filtro específico (Liga/Desliga)
 * @param {number} equipeId - ID da equipe clicada
 * @param {HTMLElement} divElement - O elemento HTML clicado (para mudar classe visual)
 */
window.toggleFiltro = function (equipeId, divElement) {
  const check = divElement.querySelector(".checkbox-custom");
  const checkAll = document.getElementById("check-all");

  // Lógica de Toggle
  if (ESTADO.filtrosAtivos.has(equipeId)) {
    ESTADO.filtrosAtivos.delete(equipeId); // Remove do Set
    check.classList.remove("checked");
  } else {
    ESTADO.filtrosAtivos.add(equipeId); // Adiciona ao Set
    check.classList.add("checked");
  }

  // Lógica do Checkbox "Todas"
  // Se nenhum filtro específico estiver ativo, "Todas" fica marcado visualmente
  if (ESTADO.filtrosAtivos.size === 0) {
    checkAll.classList.add("checked");
  } else {
    checkAll.classList.remove("checked");
  }

  // Aplica as mudanças no Grid
  aplicarFiltrosVisuais();
};

/**
 * Limpa todos os filtros ativos (Reseta para "Ver Tudo")
 */
window.limparFiltros = function () {
  ESTADO.filtrosAtivos.clear();

  // Reseta visualmente todos os checkboxes
  document.querySelectorAll(".filter-item .checkbox-custom").forEach((el) => {
    if (el.id !== "check-all") el.classList.remove("checked");
  });

  // Marca o "Todas"
  const checkAll = document.getElementById("check-all");
  if (checkAll) checkAll.classList.add("checked");

  aplicarFiltrosVisuais();
};

/**
 * Percorre o Grid do Calendário e aplica classes CSS
 * Esconde dias que não correspondem aos filtros ativos
 */
function aplicarFiltrosVisuais() {
  // Seleciona apenas células de dias válidos (ignora mês anterior/próximo)
  const celulas = document.querySelectorAll(".day-cell:not(.other-month)");

  // Cenário 1: Nenhum filtro ativo -> Mostra tudo (Limpa classes de filtro)
  if (ESTADO.filtrosAtivos.size === 0) {
    celulas.forEach((cel) => {
      cel.classList.remove("hidden-by-filter", "highlight-filter");
    });
    return;
  }

  // Cenário 2: Filtros Ativos -> Verifica dia a dia
  celulas.forEach((cel) => {
    // Recupera o ID do dia pelo atributo data-iso que adicionamos no HTML
    const dataISO = cel.getAttribute("data-iso");
    const evento = ESTADO.dadosEventos[dataISO];
    let match = false;

    if (evento && evento.escalas) {
      // Verifica se alguma escala do dia pertence a uma equipe filtrada
      for (let esc of evento.escalas) {
        const idLeit = esc.equipe_leitura?.id || esc.equipe_leitura_id;
        const idCant = esc.equipe_canto?.id || esc.equipe_canto_id;

        // Se Leitura OU Canto bater com o filtro, mostra o dia
        if (
          ESTADO.filtrosAtivos.has(idLeit) ||
          ESTADO.filtrosAtivos.has(idCant)
        ) {
          match = true;
          break; // Achou um match, não precisa checar o resto do dia
        }
      }
    }

    // Aplica o estado visual
    if (match) {
      // Dia corresponde ao filtro -> Destaca
      cel.classList.remove("hidden-by-filter");
      cel.classList.add("highlight-filter");
    } else {
      // Dia não corresponde -> Esconde (Opacidade baixa)
      cel.classList.add("hidden-by-filter");
      cel.classList.remove("highlight-filter");
    }
  });
}
