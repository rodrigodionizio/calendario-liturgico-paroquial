/*
 * ARQUIVO: app.js
 * DESCRIÇÃO: Controlador Principal - Versão Final V11.0 (Estável)
 * AUTOR: Rodrigo & Dev AI
 */

console.log("🚀 Sistema Litúrgico V11.0 Iniciado");

// ==========================================================================
// 0. ESTADO GLOBAL & CONSTANTES
// ==========================================================================
const ESTADO = {
  anoAtual: 2026,
  mesAtual: 1,
  dadosEventos: {}, // Agora é: { 'YYYY-MM-DD': [evento1, evento2] }
  isAdmin: false,
  listaEquipes: [],
  filtrosAtivos: new Set(),
};

let eventoEmEdicao = null;
let cacheEquipesLeitura = [];
let cacheEquipesCanto = [];

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
  try {
    // 1.1. Auth
    const session = await window.api.checkSession();
    if (session) {
      ESTADO.isAdmin = true;
      console.log("👑 Admin: ", session.user.email);
      adicionarBotaoLogout();
    } else {
      adicionarBotaoLogin();
    }

    // 1.2. Dados
    ESTADO.listaEquipes = await window.api.listarEquipes();
    cacheEquipesLeitura = ESTADO.listaEquipes.filter(
      (e) => e.tipo_atuacao === "Leitura" || e.tipo_atuacao === "Ambos"
    );
    cacheEquipesCanto = ESTADO.listaEquipes.filter(
      (e) => e.tipo_atuacao === "Canto" || e.tipo_atuacao === "Ambos"
    );

    // 1.3. UI
    inicializarSidebar();
    renderizarMural();
    carregarMes(ESTADO.anoAtual, ESTADO.mesAtual);
    configurarBotoesNavegacao();
  } catch (error) {
    console.error("Erro fatal na inicialização:", error);
  }
});

// ==========================================================================
// 2. MURAL DE AVISOS
// ==========================================================================
async function renderizarMural() {
  const container = document.querySelector(".mini-calendar");
  if (!container) return;

  container.innerHTML =
    '<div style="padding:20px; color:#888; font-size:0.8rem;">Carregando avisos...</div>';
  container.className = "";

  try {
    const avisos = await window.api.buscarAvisos();

    if (avisos.length === 0) {
      container.innerHTML =
        '<div style="padding:15px; text-align:center; color:#999; font-style:italic; background:#fff; border-radius:8px; border:1px solid #eee;">Sem avisos recentes.</div>';
      return;
    }

    let html = `
        <div class="mural-header">
            <span class="mural-title">Mural Paroquial</span>
            <span class="mural-badge">${avisos.length}</span>
        </div>
        <div class="mural-container">`;

    avisos.forEach((aviso) => {
      const dataEvento = new Date(aviso.data + "T12:00:00");
      const hoje = new Date();
      hoje.setHours(0, 0, 0, 0);

      const diffTime = dataEvento - hoje;
      const diffDias = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

      let tagTexto = `Faltam ${diffDias} dias`;
      let tagClass = "";

      if (diffDias <= 0) {
        tagTexto = "HOJE";
        tagClass = "tag-urgente";
      } else if (diffDias === 1) {
        tagTexto = "AMANHÃ";
        tagClass = "tag-urgente";
      }

      const diaMes = dataEvento.toLocaleDateString("pt-BR", {
        day: "2-digit",
        month: "2-digit",
      });

      // Verifica se existe hora_inicio antes de tentar usar substring
      const horaShow = aviso.hora_inicio
        ? ` • ${aviso.hora_inicio.substring(0, 5)}`
        : "";

      html += `
            <div class="aviso-card prio-${aviso.mural_prioridade}">
                <div style="display:flex; justify-content:space-between; align-items:center;">
                    <span class="aviso-tag ${tagClass}">${tagTexto}${horaShow}</span>
                    <span style="font-size:0.7rem; color:#666;">${diaMes}</span>
                </div>
                <div class="aviso-titulo">${aviso.titulo}</div>
                <div class="aviso-meta">📍 ${aviso.local || "Paróquia"}</div>
            </div>`;
    });

    html += "</div>";
    container.innerHTML = html;
  } catch (err) {
    console.error(err);
    container.innerHTML =
      '<div style="color:red; font-size:0.8rem;">Erro ao carregar mural.</div>';
  }
}

// ==========================================================================
// 3. CALENDÁRIO & GRID (MULTI-EVENTOS)
// ==========================================================================
async function carregarMes(ano, mes) {
  const nomeMes = new Date(ano, mes - 1).toLocaleString("pt-BR", {
    month: "long",
  });
  document.querySelector(".month-name").textContent = `${nomeMes} ${ano}`;

  const grid = document.querySelector(".calendar-wrapper");
  const headersMatch = grid.innerHTML.match(
    /<div class="day-header">.*?<\/div>/g
  );
  const headers = headersMatch ? headersMatch.join("") : "";

  grid.innerHTML =
    headers +
    '<div style="grid-column:1/-1; text-align:center; padding:40px; color:#888;">Carregando...</div>';

  try {
    const eventos = await window.api.buscarEventos(ano, mes);
    ESTADO.dadosEventos = {};

    // Agrupa eventos por data em Arrays
    eventos.forEach((ev) => {
      if (!ESTADO.dadosEventos[ev.data]) ESTADO.dadosEventos[ev.data] = [];
      ESTADO.dadosEventos[ev.data].push(ev);
    });

    renderizarGrid(ano, mes, grid, headers);
    aplicarFiltrosVisuais();
  } catch (erro) {
    console.error(erro);
    grid.innerHTML =
      headers + '<div style="padding:20px; color:red;">Erro de conexão.</div>';
  }
}

function renderizarGrid(ano, mes, gridElement, headersHTML) {
  let html = headersHTML;
  const primeiroDia = new Date(ano, mes - 1, 1).getDay();
  const ultimoDia = new Date(ano, mes, 0).getDate();
  const ultimoDiaMesAnt = new Date(ano, mes - 1, 0).getDate();

  // Dias Mês Anterior
  for (let i = primeiroDia - 1; i >= 0; i--) {
    const dia = ultimoDiaMesAnt - i;
    html += `<div class="day-cell other-month"><span class="day-number">${dia}</span></div>`;
  }

  // Dias do Mês Atual
  for (let dia = 1; dia <= ultimoDia; dia++) {
    const dataISO = `${ano}-${String(mes).padStart(2, "0")}-${String(
      dia
    ).padStart(2, "0")}`;
    const listaEventos = ESTADO.dadosEventos[dataISO] || []; // Sempre retorna array

    let conteudoHTML = "";
    let clickAttr = `onclick="abrirModal('${dataISO}')"`;

    listaEventos.forEach((evento) => {
      let corHex = evento.liturgia_cores?.hex_code || "#2E7D32";
      if (corHex.toLowerCase() === "#ffffff") corHex = "#cccccc";
      if (evento.tipo_compromisso !== "liturgia") corHex = "#64748b";

      const classeSolenidade = evento.is_solenidade ? "solenidade" : "";
      const estiloPill = `border-left: 3px solid ${corHex}; background-color: var(--cor-vinho); margin-bottom: 2px;`;

      conteudoHTML += `<div class="pill ${classeSolenidade}" style="${estiloPill}">${evento.titulo}</div>`;
    });

    html += `<div class="day-cell" data-iso="${dataISO}" ${clickAttr}><span class="day-number">${dia}</span>${conteudoHTML}</div>`;
  }

  // Dias Próximo Mês
  const totalCelulas = primeiroDia + ultimoDia;
  const resto = totalCelulas % 7;
  if (resto !== 0) {
    for (let i = 1; i <= 7 - resto; i++) {
      html += `<div class="day-cell other-month"><span class="day-number">${i}</span></div>`;
    }
  }
  gridElement.innerHTML = html;
}

// ==========================================================================
// 4. MODAL MULTI-EVENTOS (LISTA DE CARTÕES)
// ==========================================================================
window.abrirModal = function (dataISO) {
  const listaEventos = ESTADO.dadosEventos[dataISO] || [];
  const modalContent = document.getElementById("modalContent");
  const modalOverlay = document.getElementById("modalOverlay");

  const dataObj = new Date(dataISO + "T12:00:00");
  const diaNum = dataObj.getDate();
  const mesNome = dataObj
    .toLocaleString("pt-BR", { month: "short" })
    .toUpperCase();

  // Botão Adicionar (Apenas Admin)
  let btnNovo = ESTADO.isAdmin
    ? `<button onclick="iniciarCriacao('${dataISO}')" style="width:100%; padding:10px; border:2px dashed #ccc; background:#f9f9f9; color:#555; border-radius:8px; cursor:pointer; font-weight:bold; margin-top:15px;">➕ ADICIONAR NOVO EVENTO</button>`
    : "";

  let htmlLista = "";

  if (listaEventos.length === 0) {
    htmlLista =
      '<div style="text-align:center; padding:20px; color:#999;">Nenhum evento neste dia.</div>';
  } else {
    listaEventos.forEach((ev) => {
      let corHex = ev.liturgia_cores?.hex_code || "#ccc";
      if (corHex.toLowerCase() === "#ffffff") corHex = "#ccc";
      if (ev.tipo_compromisso !== "liturgia") corHex = "#666";

      // Botão Editar (Passa objeto ev escapado)
      // EncodeURIComponent protege contra aspas no título
      const evString = encodeURIComponent(JSON.stringify(ev));
      const btnEdit = ESTADO.isAdmin
        ? `<button onclick='prepararEdicao(decodeURIComponent("${evString}"))' style="float:right; border:none; background:none; cursor:pointer; font-size:1.2rem;" title="Editar">✏️</button>`
        : "";

      // Detalhes
      let detalhe = "";
      if (ev.tipo_compromisso === "liturgia") {
        detalhe = gerarHTMLLeitura(ev);
      } else {
        const hora = ev.hora_inicio ? ev.hora_inicio.substring(0, 5) : "";
        detalhe = `<div style="font-size:0.9rem; margin-top:5px; padding:10px; background:#f9f9f9; border-radius:4px;">
                    ${hora ? `<strong>🕒 ${hora}</strong><br>` : ""}
                    📍 ${ev.local || "-"} <br> 👤 ${ev.responsavel || "-"}
                </div>`;
      }

      htmlLista += `
            <div style="border-left: 4px solid ${corHex}; background:#fff; padding:15px; border-radius:8px; margin-bottom:15px; box-shadow:0 2px 5px rgba(0,0,0,0.05);">
                ${btnEdit}
                <div style="font-size:0.7rem; font-weight:bold; color:${corHex}; text-transform:uppercase;">${
        ev.tempo_liturgico || ev.tipo_compromisso
      }</div>
                <div style="font-size:1.1rem; font-weight:900; color:var(--text-main); margin-bottom:10px;">${
                  ev.titulo
                }</div>
                ${detalhe}
            </div>`;
    });
  }

  modalContent.innerHTML = `
    <div class="modal-card">
        <button class="btn-close" onclick="fecharModalForce()">×</button>
        <div class="modal-body" id="modalBody">
            <div class="modal-header">
                <div><span class="modal-day">${diaNum}</span><span class="modal-month">${mesNome}</span></div>
            </div>
            <div id="listaEventosModal" style="max-height:60vh; overflow-y:auto; padding-right:5px;">
                ${htmlLista}
            </div>
            ${btnNovo}
        </div>
    </div>`;

  modalOverlay.classList.add("active");
};

function gerarHTMLLeitura(evento) {
  if (!evento.escalas || evento.escalas.length === 0) return "";
  return evento.escalas
    .map(
      (esc) => `
        <div class="escala-item">
            <div class="escala-hora">${esc.hora_celebracao.substring(
              0,
              5
            )}</div>
            <div class="escala-equipes">
                <div class="equipe-row">${ICONS.leitura} <strong>${
        esc.equipe_leitura?.nome_equipe || "-"
      }</strong></div>
                <div class="equipe-row">${ICONS.canto} <strong>${
        esc.equipe_canto?.nome_equipe || "-"
      }</strong></div>
            </div>
        </div>`
    )
    .join("");
}

// ==========================================================================
// 5. EDITOR & AÇÕES
// ==========================================================================

// Prepara para criar novo
window.iniciarCriacao = function (dataISO) {
  const novo = {
    id: null,
    data: dataISO,
    titulo: "",
    tipo_compromisso: "liturgia",
    escalas: [],
  };
  renderizarEditor(novo);
};

// Prepara para editar existente (Recebe string JSON decodificada)
window.prepararEdicao = function (eventoObj) {
  // Se veio string, converte. Se veio objeto, usa direto.
  let evento =
    typeof eventoObj === "string" ? JSON.parse(eventoObj) : eventoObj;
  renderizarEditor(evento);
};

function renderizarEditor(evento) {
  const container = document.getElementById("modalBody");
  eventoEmEdicao = evento; // Salva globalmente para o salvarEdicoes usar

  const tituloVal = evento.titulo || "";
  const tipo = evento.tipo_compromisso || "liturgia";
  const hora = evento.hora_inicio ? evento.hora_inicio.substring(0, 5) : "";
  const local = evento.local || "";
  const resp = evento.responsavel || "";

  // HTML Form
  container.innerHTML = `
        <h3 style="color:var(--cor-vinho); border-bottom:1px solid #eee; padding-bottom:10px;">${
          evento.id ? "Editar" : "Novo"
        } Evento</h3>
        
        <div style="max-height:65vh; overflow-y:auto; padding-right:5px;">
            <div style="background:#f9f9f9; padding:10px; border-radius:8px; margin-bottom:15px;">
                <label style="font-size:0.7rem; font-weight:bold;">TIPO</label>
                <select id="editTipoComp" onchange="toggleCamposEditor()" style="width:100%; padding:8px; margin-bottom:10px;">
                    <option value="liturgia" ${
                      tipo === "liturgia" ? "selected" : ""
                    }>Liturgia / Missa</option>
                    <option value="reuniao" ${
                      tipo === "reuniao" ? "selected" : ""
                    }>Reunião</option>
                    <option value="evento" ${
                      tipo === "evento" ? "selected" : ""
                    }>Evento</option>
                </select>
                
                <label style="font-size:0.7rem; font-weight:bold;">TÍTULO</label>
                <input type="text" id="editTitulo" value="${tituloVal}" style="width:100%; padding:8px; margin-bottom:10px;">

                <!-- Extras -->
                <div id="campos-extras" style="display:none; margin-top:10px; grid-template-columns: 1fr 1fr; gap:10px;">
                    <div><label style="font-size:0.7rem; font-weight:bold;">HORA</label>
                    <input type="time" id="editHoraInicio" value="${hora}" style="width:100%; margin-bottom:5px;"></div>
                    <div><label style="font-size:0.7rem; font-weight:bold;">LOCAL</label>
                    <input type="text" id="editLocal" value="${local}" style="width:100%; margin-bottom:5px;"></div>
                    <div style="grid-column:1/-1"><label style="font-size:0.7rem; font-weight:bold;">RESPONSÁVEL</label>
                    <input type="text" id="editResp" value="${resp}" style="width:100%;"></div>
                </div>

                <!-- Liturgia -->
                <div id="campos-liturgia" style="margin-top:10px;">
                    ${gerarCamposLiturgia(evento)}
                </div>
            </div>
            
            <!-- Mural Check -->
            <div style="background:#fff9e6; padding:10px; border-radius:8px; margin-bottom:15px;">
                <label><input type="checkbox" id="checkMural" onchange="toggleMuralPrio()" ${
                  evento.mural_destaque ? "checked" : ""
                }> Destacar no Mural?</label>
                <div id="area-prio" style="display:none; margin-top:5px;">
                    <select id="editPrio" style="width:100%; padding:5px;">
                        <option value="1" ${
                          evento.mural_prioridade == 1 ? "selected" : ""
                        }>Urgente</option>
                        <option value="2" ${
                          evento.mural_prioridade == 2 ? "selected" : ""
                        }>Atenção</option>
                        <option value="3" ${
                          evento.mural_prioridade == 3 ? "selected" : ""
                        }>Info</option>
                    </select>
                </div>
            </div>

            <div id="area-escalas">
                <h4 style="font-size:0.9rem; color:#666;">Escalas</h4>
                <div id="listaEditor"></div>
                <button onclick="adicionarNovaEscala()" style="width:100%; padding:8px; margin-top:5px;">+ Horário</button>
            </div>
        </div>
        
        <div style="margin-top:15px; display:flex; gap:10px;">
            <button onclick="salvarEdicoes()" style="flex:1; padding:12px; background:green; color:white; border:none; border-radius:6px; font-weight:bold;">SALVAR</button>
            <button onclick="abrirModal('${
              evento.data
            }')" style="padding:12px; background:#ccc; border:none; border-radius:6px;">Voltar</button>
            ${
              evento.id
                ? `<button onclick="excluirEvento('${evento.id}')" style="background:#D32F2F; color:#fff; border:none; padding:12px; border-radius:6px;">🗑️</button>`
                : ""
            }
        </div>
    `;

  // Popula Escalas
  if (evento.escalas)
    evento.escalas.forEach((esc, idx) => {
      document.getElementById("listaEditor").innerHTML += gerarLinhaEditor(
        esc,
        idx
      );
    });

  window.toggleCamposEditor();
  window.toggleMuralPrio();
}

// Helpers de HTML
function gerarCamposLiturgia(evento) {
  const corId = evento.cor_id || 1;
  const tempo = evento.tempo_liturgico || "Paroquial";
  const optsTempo = [
    "Tempo Comum",
    "Advento",
    "Tempo do Natal",
    "Quaresma",
    "Semana Santa",
    "Tríduo Pascal",
    "Tempo Pascal",
    "Paroquial",
  ]
    .map(
      (t) =>
        `<option value="${t}" ${t === tempo ? "selected" : ""}>${t}</option>`
    )
    .join("");

  return `<div style="display:flex; gap:10px; margin-bottom:10px;">
        <div style="flex:1;"><label style="font-size:0.7rem; font-weight:bold;">TEMPO</label><select id="editTempo" style="width:100%">${optsTempo}</select></div>
        <div style="flex:1;"><label style="font-size:0.7rem; font-weight:bold;">COR</label><select id="editCor" style="width:100%">
            <option value="1" ${
              corId == 1 ? "selected" : ""
            }>Verde</option><option value="2" ${
    corId == 2 ? "selected" : ""
  }>Branco</option><option value="3" ${
    corId == 3 ? "selected" : ""
  }>Vermelho</option><option value="4" ${
    corId == 4 ? "selected" : ""
  }>Roxo</option>
        </select></div>
    </div>`;
}

function gerarLinhaEditor(escala, index) {
  const idLeit = escala.equipe_leitura?.id || escala.equipe_leitura_id;
  const idCant = escala.equipe_canto?.id || escala.equipe_canto_id;
  const horaVal = escala.hora_celebracao
    ? escala.hora_celebracao.substring(0, 5)
    : "19:00";

  const buildOpts = (lista, selId) => {
    let h = '<option value="">--</option>';
    lista.forEach((eq) => {
      h += `<option value="${eq.id}" ${eq.id === selId ? "selected" : ""}>${
        eq.nome_equipe
      }</option>`;
    });
    return h;
  };

  return `
    <div class="editor-row" style="background:#fff; padding:10px; border:1px solid #e0e0e0; margin-bottom:5px;">
        <div style="display:flex; gap:10px; margin-bottom:5px;">
            <input type="time" class="edit-hora" value="${horaVal}" style="width:80px;">
            <button onclick="removerLinha(this)" style="color:red; border:none; background:none;">🗑️</button>
        </div>
        <div style="display:grid; gap:5px;">
            <select class="edit-leitura" style="width:100%">${buildOpts(
              cacheEquipesLeitura,
              idLeit
            )}</select>
            <select class="edit-canto" style="width:100%">${buildOpts(
              cacheEquipesCanto,
              idCant
            )}</select>
        </div>
    </div>`;
}

// Funções Globais de Controle
window.toggleCamposEditor = function () {
  const tipo = document.getElementById("editTipoComp").value;
  if (tipo === "liturgia") {
    document.getElementById("campos-liturgia").style.display = "block";
    document.getElementById("area-escalas").style.display = "block";
    document.getElementById("campos-extras").style.display = "none";
  } else {
    document.getElementById("campos-liturgia").style.display = "none";
    document.getElementById("area-escalas").style.display = "none";
    document.getElementById("campos-extras").style.display = "grid";
  }
};

window.toggleMuralPrio = function () {
  const check = document.getElementById("checkMural");
  const div = document.getElementById("area-prio");
  div.style.display = check.checked ? "block" : "none";
};

window.adicionarNovaEscala = function () {
  const div = document.createElement("div");
  div.innerHTML = gerarLinhaEditor({ hora_celebracao: "19:00" }, 999);
  document.getElementById("listaEditor").appendChild(div.firstElementChild);
};

window.removerLinha = function (btn) {
  if (confirm("Remover?")) btn.closest(".editor-row").remove();
};

window.salvarEdicoes = async function () {
  const titulo = document.getElementById("editTitulo").value;
  if (!titulo) return alert("Título obrigatório");

  const tipo = document.getElementById("editTipoComp").value;

  const payload = {
    id: eventoEmEdicao.id,
    data: eventoEmEdicao.data,
    titulo: titulo,
    tipo_compromisso: tipo,
    local:
      tipo !== "liturgia" ? document.getElementById("editLocal").value : null,
    responsavel:
      tipo !== "liturgia" ? document.getElementById("editResp").value : null,
    hora_inicio:
      tipo !== "liturgia"
        ? document.getElementById("editHoraInicio").value
        : null,
    mural_destaque: document.getElementById("checkMural").checked,
    mural_prioridade: parseInt(document.getElementById("editPrio")?.value || 2),
    tempo_liturgico:
      tipo === "liturgia"
        ? document.getElementById("editTempo").value
        : "Paroquial",
    cor_id:
      tipo === "liturgia"
        ? parseInt(document.getElementById("editCor").value)
        : 1,
  };

  const escalas = [];
  if (tipo === "liturgia") {
    document.querySelectorAll(".editor-row").forEach((row) => {
      const h = row.querySelector(".edit-hora").value;
      const leit = row.querySelector(".edit-leitura").value || null;
      const cant = row.querySelector(".edit-canto").value || null;
      if (h)
        escalas.push({
          hora_celebracao: h,
          equipe_leitura_id: leit,
          equipe_canto_id: cant,
        });
    });
  }

  try {
    await window.api.salvarEventoCompleto(payload, escalas);
    alert("Salvo!");
    window.fecharModalForce();
    carregarMes(ESTADO.anoAtual, ESTADO.mesAtual);
    renderizarMural();
  } catch (e) {
    alert("Erro: " + e.message);
  }
};

window.excluirEvento = async function (id) {
  if (!confirm("Excluir este evento?")) return;
  try {
    await window.api.client.from("eventos_base").delete().eq("id", id);
    alert("Excluído!");
    window.fecharModalForce();
    carregarMes(ESTADO.anoAtual, ESTADO.mesAtual);
    renderizarMural();
  } catch (e) {
    alert("Erro: " + e.message);
  }
};

// ==========================================================================
// 7. RELATÓRIO PDF (Com Suporte Multi-Eventos)
// ==========================================================================
window.prepararImpressao = function () {
  const tbody = document.getElementById("print-table-body");
  document.querySelector("#print-month-title").textContent = document
    .querySelector(".month-name")
    .textContent.split(" ")[0];
  document.querySelector("#print-year").textContent = ESTADO.anoAtual;
  tbody.innerHTML = "";

  // Agrupa todos os eventos num array plano
  let listaFinal = [];
  Object.values(ESTADO.dadosEventos).forEach((arr) => listaFinal.push(...arr));

  // Ordena por data e hora
  listaFinal.sort((a, b) => {
    const dataA =
      a.data + (a.hora_inicio || a.escalas?.[0]?.hora_celebracao || "00:00");
    const dataB =
      b.data + (b.hora_inicio || b.escalas?.[0]?.hora_celebracao || "00:00");
    return dataA.localeCompare(dataB);
  });

  let html = "";
  let dataAnt = "";
  listaFinal.forEach((ev) => {
    const dateObj = new Date(ev.data + "T12:00:00");
    const dia = dateObj.getDate().toString().padStart(2, "0");
    const mostrarData = ev.data !== dataAnt;
    dataAnt = ev.data;

    let detalhes = "";
    let horaPrincipal = ev.hora_inicio ? ev.hora_inicio.substring(0, 5) : "";

    if (ev.tipo_compromisso === "liturgia" && ev.escalas) {
      ev.escalas.forEach((esc) => {
        detalhes += `<div class="print-escala-row"><strong>${esc.hora_celebracao.substring(
          0,
          5
        )}</strong> • 📖 ${esc.equipe_leitura?.nome_equipe || "-"} • 🎵 ${
          esc.equipe_canto?.nome_equipe || "-"
        }</div>`;
        if (!horaPrincipal) horaPrincipal = esc.hora_celebracao.substring(0, 5);
      });
    } else {
      detalhes = `<div>📍 ${ev.local || "-"}</div><div>👤 ${
        ev.responsavel || "-"
      }</div>`;
    }

    let tipoLabel =
      ev.tipo_compromisso === "liturgia" ? ev.tempo_liturgico : "Reunião";
    if (ev.is_solenidade) tipoLabel = "Solenidade";

    // Linha divisória de dia (opcional, para visual)
    const styleRow = mostrarData ? "border-top: 1px solid #000;" : "";

    html += `<tr style="${styleRow}">
            <td class="col-data">${
              mostrarData ? `<span class="dia-grande">${dia}</span>` : ""
            }</td>
            <td class="col-hora">${horaPrincipal}</td>
            <td class="col-evento"><strong>${
              ev.titulo
            }</strong><br><span style="font-size:0.8em; color:#666;">${tipoLabel}</span></td>
            <td class="col-detalhes">${detalhes}</td>
        </tr>`;
  });
  tbody.innerHTML = html;
  setTimeout(() => window.print(), 300);
};

// ==========================================================================
// 8. UTILS & FILTROS (SIDEBAR)
// ==========================================================================
async function inicializarSidebar() {
  const container = document.getElementById("filtro-equipes");
  if (!container) return;
  container.innerHTML = `<h3>FILTRAR</h3><div class="filter-item" onclick="limparFiltros()"><span class="checkbox-custom checked" id="check-all"></span> <strong>TODAS</strong></div>`;
  ESTADO.listaEquipes.forEach((eq) => {
    const div = document.createElement("div");
    div.className = "filter-item";
    div.onclick = () => window.toggleFiltro(eq.id, div);
    div.innerHTML = `<span class="checkbox-custom" data-id="${eq.id}"></span> ${eq.nome_equipe}`;
    container.appendChild(div);
  });
}

window.toggleFiltro = function (id, el) {
  const check = el.querySelector(".checkbox-custom");
  if (ESTADO.filtrosAtivos.has(id)) {
    ESTADO.filtrosAtivos.delete(id);
    check.classList.remove("checked");
  } else {
    ESTADO.filtrosAtivos.add(id);
    check.classList.add("checked");
  }
  aplicarFiltrosVisuais();
};

window.limparFiltros = function () {
  ESTADO.filtrosAtivos.clear();
  document
    .querySelectorAll(".checkbox-custom")
    .forEach((c) => c.classList.remove("checked"));
  document.getElementById("check-all").classList.add("checked");
  aplicarFiltrosVisuais();
};

function aplicarFiltrosVisuais() {
  const cels = document.querySelectorAll(".day-cell");
  if (ESTADO.filtrosAtivos.size === 0) {
    cels.forEach((c) => c.classList.remove("hidden-by-filter"));
    return;
  }

  cels.forEach((c) => {
    const data = c.getAttribute("data-iso");
    const eventos = ESTADO.dadosEventos[data] || [];
    let match = false;
    eventos.forEach((ev) => {
      if (ev.escalas)
        ev.escalas.forEach((esc) => {
          if (
            ESTADO.filtrosAtivos.has(esc.equipe_leitura?.id) ||
            ESTADO.filtrosAtivos.has(esc.equipe_canto?.id)
          )
            match = true;
        });
    });
    if (match) c.classList.remove("hidden-by-filter");
    else c.classList.add("hidden-by-filter");
  });
}

function adicionarBotaoLogin() {
  const header = document.querySelector("header");
  const div = document.createElement("div");
  div.style.position = "absolute";
  div.style.right = "20px";
  div.innerHTML = `<a href="admin.html" title="Acesso Restrito" style="color:rgba(255,255,255,0.5); text-decoration:none;"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect><path d="M7 11V7a5 5 0 0 1 10 0v4"></path></svg></a>`;
  header.appendChild(div);
}

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
window.toggleSidebarMobile = function () {
  document.querySelector(".sidebar").classList.toggle("active");
  document.getElementById("sidebar-overlay").classList.toggle("active");
};
