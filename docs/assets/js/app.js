/*
 * ARQUIVO: app.js
 * DESCRIÇÃO: Controlador Principal - Versão Final Gold
 * AUTOR: Rodrigo & Dev AI
 */

console.log("🚀 Sistema Litúrgico Final Iniciado");

// --- ESTADO GLOBAL ---
const ESTADO = {
  anoAtual: 2026,
  mesAtual: 1,
  dadosEventos: {},
  isAdmin: false,
  listaEquipes: [],
  filtrosAtivos: new Set(),
};

let eventoEmEdicao = null;
// Cache para selects filtrados no editor
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
  // Auth
  const session = await window.api.checkSession();
  if (session) {
    ESTADO.isAdmin = true;
    console.log("👑 Admin: ", session.user.email);
    adicionarBotaoLogout();
  }

  // Dados Básicos
  ESTADO.listaEquipes = await window.api.listarEquipes();

  // Prepara caches de equipes
  cacheEquipesLeitura = ESTADO.listaEquipes.filter(
    (e) => e.tipo_atuacao === "Leitura" || e.tipo_atuacao === "Ambos"
  );
  cacheEquipesCanto = ESTADO.listaEquipes.filter(
    (e) => e.tipo_atuacao === "Canto" || e.tipo_atuacao === "Ambos"
  );

  // Inicia UI
  inicializarSidebar();
  carregarMes(ESTADO.anoAtual, ESTADO.mesAtual);
  configurarBotoesNavegacao();
});

// ==========================================================================
// 2. RENDERIZAÇÃO
// ==========================================================================
async function carregarMes(ano, mes) {
  const nomeMes = new Date(ano, mes - 1).toLocaleString("pt-BR", {
    month: "long",
  });
  document.querySelector(".month-name").textContent = `${nomeMes} ${ano}`;

  const grid = document.querySelector(".calendar-wrapper");
  // Salva headers
  const headersMatch = grid.innerHTML.match(
    /<div class="day-header">.*?<\/div>/g
  );
  const headers = headersMatch ? headersMatch.join("") : ""; // Fallback se não achar

  grid.innerHTML =
    headers +
    '<div style="grid-column:1/-1; text-align:center; padding:40px; color:#888;">Carregando...</div>';

  try {
    const eventos = await window.api.buscarEventos(ano, mes);
    ESTADO.dadosEventos = {};
    eventos.forEach((ev) => (ESTADO.dadosEventos[ev.data] = ev));
    renderizarGrid(ano, mes, grid, headers);
    aplicarFiltrosVisuais(); // Re-aplica filtro se existir
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

  for (let i = primeiroDia - 1; i >= 0; i--) {
    const dia = ultimoDiaMesAnt - i;
    html += `<div class="day-cell other-month"><span class="day-number">${dia}</span></div>`;
  }

  for (let dia = 1; dia <= ultimoDia; dia++) {
    const dataISO = `${ano}-${String(mes).padStart(2, "0")}-${String(
      dia
    ).padStart(2, "0")}`;
    const evento = ESTADO.dadosEventos[dataISO];
    let conteudoHTML = "";
    let clickAttr = `onclick="abrirModal('${dataISO}')"`;

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
    // Adiciona data-iso para o filtro funcionar
    html += `<div class="day-cell" data-iso="${dataISO}" ${clickAttr}><span class="day-number">${dia}</span>${conteudoHTML}</div>`;
  }

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
// 3. FILTROS DA SIDEBAR
// ==========================================================================
async function inicializarSidebar() {
  const containerEquipes = document.getElementById("filtro-equipes");
  if (!containerEquipes) return;

  // Cabeçalho
  containerEquipes.innerHTML = `<h3>FILTRAR POR EQUIPE</h3>
        <div class="filter-item" onclick="limparFiltros()">
            <span class="checkbox-custom checked" id="check-all"></span> <strong>TODAS AS EQUIPES</strong>
        </div>`;

  // Itens
  ESTADO.listaEquipes.forEach((eq) => {
    const div = document.createElement("div");
    div.className = "filter-item";
    // AddEventListener é mais seguro que onclick string
    div.addEventListener("click", function () {
      window.toggleFiltro(eq.id, this);
    });
    div.innerHTML = `<span class="checkbox-custom" data-id="${eq.id}"></span> ${eq.nome_equipe}`;
    containerEquipes.appendChild(div);
  });
}

window.toggleFiltro = function (equipeId, divElement) {
  const check = divElement.querySelector(".checkbox-custom");
  const checkAll = document.getElementById("check-all");

  if (ESTADO.filtrosAtivos.has(equipeId)) {
    ESTADO.filtrosAtivos.delete(equipeId);
    check.classList.remove("checked");
  } else {
    ESTADO.filtrosAtivos.add(equipeId);
    check.classList.add("checked");
  }

  if (ESTADO.filtrosAtivos.size === 0) {
    checkAll.classList.add("checked");
  } else {
    checkAll.classList.remove("checked");
  }
  aplicarFiltrosVisuais();
};

window.limparFiltros = function () {
  ESTADO.filtrosAtivos.clear();
  document.querySelectorAll(".filter-item .checkbox-custom").forEach((el) => {
    if (el.id !== "check-all") el.classList.remove("checked");
  });
  document.getElementById("check-all").classList.add("checked");
  aplicarFiltrosVisuais();
};

function aplicarFiltrosVisuais() {
  const celulas = document.querySelectorAll(".day-cell:not(.other-month)");

  if (ESTADO.filtrosAtivos.size === 0) {
    celulas.forEach((cel) =>
      cel.classList.remove("hidden-by-filter", "highlight-filter")
    );
    return;
  }

  celulas.forEach((cel) => {
    const dataISO = cel.getAttribute("data-iso");
    const evento = ESTADO.dadosEventos[dataISO];
    let match = false;

    if (evento && evento.escalas) {
      for (let esc of evento.escalas) {
        const idLeit = esc.equipe_leitura?.id || esc.equipe_leitura_id;
        const idCant = esc.equipe_canto?.id || esc.equipe_canto_id;
        if (
          ESTADO.filtrosAtivos.has(idLeit) ||
          ESTADO.filtrosAtivos.has(idCant)
        ) {
          match = true;
          break;
        }
      }
    }

    if (match) {
      cel.classList.remove("hidden-by-filter");
      cel.classList.add("highlight-filter");
    } else {
      cel.classList.add("hidden-by-filter");
      cel.classList.remove("highlight-filter");
    }
  });
}

// ==========================================================================
// 4. MODAL
// ==========================================================================
window.abrirModal = function (dataISO) {
  let evento = ESTADO.dadosEventos[dataISO];

  if (!evento) {
    evento = {
      id: null,
      data: dataISO,
      titulo: "Dia sem Evento",
      tempo_liturgico: "Paroquial",
      liturgia_cores: { hex_code: "#CCCCCC" },
      escalas: [],
    };
  }

  eventoEmEdicao = JSON.parse(JSON.stringify(evento));

  const modalContent = document.getElementById("modalContent");
  const modalOverlay = document.getElementById("modalOverlay");

  const dataObj = new Date(dataISO + "T12:00:00");
  const diaNum = dataObj.getDate();
  const mesNome = dataObj
    .toLocaleString("pt-BR", { month: "short" })
    .toUpperCase()
    .replace(".", "");
  const diaSemana = dataObj.toLocaleString("pt-BR", { weekday: "long" });

  let corHex = evento.liturgia_cores?.hex_code || "#ccc";
  let corTxt = corHex;
  if (corHex.toLowerCase() === "#ffffff") {
    corHex = "#ccc";
    corTxt = "#666";
  }

  const conteudoHTML = gerarHTMLLeitura(evento);

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
// 5. EDITOR (ADMIN)
// ==========================================================================
function ativarModoEdicao(evento) {
  const area = document.getElementById("areaConteudo");
  const btnEditar = document.getElementById("btnEditar");
  if (btnEditar) btnEditar.style.display = "none";

  const tituloVal = evento.titulo || "Novo Evento";
  const tempoVal = evento.tempo_liturgico || "Paroquial";
  const corAtualId = evento.cor_id || evento.liturgia_cores?.id || 1;

  // Lista Tempos
  const tempos = [
    "Tempo Comum",
    "Advento",
    "Tempo do Natal",
    "Quaresma",
    "Semana Santa",
    "Tríduo Pascal",
    "Tempo Pascal",
    "Paroquial",
  ];
  const optionsTempo = tempos
    .map(
      (t) =>
        `<option value="${t}" ${t === tempoVal ? "selected" : ""}>${t}</option>`
    )
    .join("");

  let htmlEditor = `
        <h3 style="color:var(--cor-vinho); margin-bottom:15px; border-bottom:1px solid #eee; padding-bottom:5px;">Editar Evento</h3>
        <div style="background:#fff; padding:15px; border-radius:8px; border:1px solid #e0e0e0; margin-bottom:15px;">
            <label style="font-size:0.7rem; font-weight:bold; color:#888;">TÍTULO</label>
            <input type="text" id="editTitulo" value="${tituloVal}" style="width:100%; padding:10px; border:1px solid #ddd; border-radius:4px; font-weight:bold; font-size:1rem; margin-top:5px; margin-bottom:10px;">
            
            <div style="display:flex; gap:10px; margin-bottom:10px;">
                <div style="flex:1;">
                    <label style="font-size:0.7rem; font-weight:bold; color:#888;">TEMPO</label>
                    <select id="editTempo" style="width:100%; padding:8px; border:1px solid #ddd; border-radius:4px;">${optionsTempo}</select>
                </div>
                <div style="flex:1;">
                    <label style="font-size:0.7rem; font-weight:bold; color:#888;">TIPO</label>
                    <select id="editTipo" style="width:100%; padding:8px; border:1px solid #ddd; border-radius:4px;">
                        <option value="comum" ${
                          !evento.is_solenidade ? "selected" : ""
                        }>Comum</option>
                        <option value="solenidade" ${
                          evento.is_solenidade ? "selected" : ""
                        }>Solenidade</option>
                    </select>
                </div>
            </div>
            <div>
                <label style="font-size:0.7rem; font-weight:bold; color:#888;">COR</label>
                <select id="editCor" style="width:100%; padding:8px; border:1px solid #ddd; border-radius:4px;">
                    <option value="1" ${
                      corAtualId == 1 ? "selected" : ""
                    }>Verde</option>
                    <option value="2" ${
                      corAtualId == 2 ? "selected" : ""
                    }>Branco</option>
                    <option value="3" ${
                      corAtualId == 3 ? "selected" : ""
                    }>Vermelho</option>
                    <option value="4" ${
                      corAtualId == 4 ? "selected" : ""
                    }>Roxo</option>
                    <option value="5" ${
                      corAtualId == 5 ? "selected" : ""
                    }>Rosa</option>
                </select>
            </div>
        </div>
        <h4 style="color:#666; font-size:0.9rem; margin-bottom:10px;">Escalas</h4>
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

  // Helper para gerar options a partir do cache
  const buildOpts = (lista, selId) => {
    let h = '<option value="">-- Selecione --</option>';
    lista.forEach((eq) => {
      const s = eq.id === selId ? "selected" : "";
      h += `<option value="${eq.id}" ${s}>${eq.nome_equipe}</option>`;
    });
    return h;
  };

  return `
    <div class="editor-row" style="background:#fff; padding:15px; border-radius:8px; border:1px solid #e0e0e0;">
        <div style="display:flex; justify-content:space-between; margin-bottom:10px; border-bottom:1px solid #f5f5f5;">
            <label style="font-size:0.8rem; font-weight:bold; color:#888;">HORÁRIO</label>
            <button onclick="removerLinha(this)" style="color:red; border:none; background:none; cursor:pointer;">🗑️</button>
        </div>
        <input type="time" class="edit-hora" value="${horaVal}" style="width:100%; padding:8px; border:1px solid #ddd; border-radius:4px; margin-bottom:10px; font-weight:bold;">
        <div style="display:grid; gap:10px;">
            <div><label style="font-size:0.7rem; font-weight:bold; color:#666;">LEITURA</label>
            <select class="edit-leitura" style="width:100%; padding:8px; border:1px solid #ddd; border-radius:4px;">
                ${buildOpts(cacheEquipesLeitura, idLeit)}
            </select></div>
            <div><label style="font-size:0.7rem; font-weight:bold; color:#666;">CANTO</label>
            <select class="edit-canto" style="width:100%; padding:8px; border:1px solid #ddd; border-radius:4px;">
                ${buildOpts(cacheEquipesCanto, idCant)}
            </select></div>
        </div>
    </div>`;
}

window.adicionarNovaEscala = function () {
  const lista = document.getElementById("listaEditor");
  const div = document.createElement("div");
  div.innerHTML = gerarLinhaEditor({ hora_celebracao: "19:00" }, 999);
  lista.appendChild(div.firstElementChild);
  div.firstElementChild.scrollIntoView({ behavior: "smooth" });
};

window.removerLinha = function (btn) {
  if (confirm("Remover?")) btn.closest(".editor-row").remove();
};

window.salvarEdicoes = async function () {
  const novoTitulo = document.getElementById("editTitulo").value;
  const novoTempo = document.getElementById("editTempo").value;
  const novoCorId = document.getElementById("editCor").value;
  const tipoEvento = document.getElementById("editTipo").value;

  if (!novoTitulo) {
    alert("Informe o Título!");
    return;
  }

  const dadosEvento = {
    id: eventoEmEdicao.id,
    data: eventoEmEdicao.data,
    titulo: novoTitulo,
    tempo_liturgico: novoTempo,
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
    if (hora)
      novasEscalas.push({
        hora_celebracao: hora,
        equipe_leitura_id: leit,
        equipe_canto_id: cant,
      });
  });

  try {
    document.getElementById("areaConteudo").innerHTML =
      '<div style="text-align:center; padding:40px;">💾 Salvando...</div>';
    await window.api.salvarEventoCompleto(dadosEvento, novasEscalas);
    alert("✅ Salvo com sucesso!");
    fecharModalForce();
    carregarMes(ESTADO.anoAtual, ESTADO.mesAtual);
  } catch (err) {
    alert("Erro: " + err.message);
    console.error(err);
    fecharModalForce();
  }
};

// ==========================================================================
// 6. RELATÓRIO DE IMPRESSÃO
// ==========================================================================
window.prepararImpressao = function () {
  const tbody = document.getElementById("print-table-body");
  const title = document.getElementById("print-month-title");

  title.textContent = document.querySelector(".month-name").textContent;
  tbody.innerHTML = "";

  // Ordena
  const listaEventos = Object.values(ESTADO.dadosEventos).sort((a, b) =>
    a.data.localeCompare(b.data)
  );

  let html = "";
  listaEventos.forEach((ev) => {
    // Verifica Filtro: Se o dia está oculto pelo filtro, não imprime
    // (Mas como o filtro é visual, aqui checamos se o filtro está ativo)
    // Se quisermos imprimir SÓ o filtrado, precisamos replicar a lógica do filtro aqui.
    // Para V1, vamos imprimir TUDO que tem escala.

    if ((!ev.escalas || ev.escalas.length === 0) && !ev.is_solenidade) return;

    const dateObj = new Date(ev.data + "T12:00:00");
    const dia = dateObj.getDate().toString().padStart(2, "0");
    const sem = dateObj
      .toLocaleString("pt-BR", { weekday: "short" })
      .toUpperCase();

    let escalasHTML = "";
    if (ev.escalas && ev.escalas.length > 0) {
      ev.escalas.forEach((esc) => {
        const hora = esc.hora_celebracao.substring(0, 5);
        const leit = esc.equipe_leitura?.nome_equipe || "-";
        const cant = esc.equipe_canto?.nome_equipe || "-";
        escalasHTML += `
                <div class="print-escala-row">
                    <span class="print-hora">${hora}</span>
                    <span class="print-equipes"><strong>📖 ${leit}</strong> • 🎵 ${cant}</span>
                </div>`;
      });
    } else {
      escalasHTML =
        '<span style="color:#999; font-style:italic">Sem escalas</span>';
    }

    const rowClass = ev.is_solenidade ? "row-solenidade" : "";
    html += `
        <tr class="${rowClass}">
            <td class="col-data"><span class="dia-grande">${dia}</span><span class="dia-sem">${sem}</span></td>
            <td class="col-evento"><div class="print-titulo">${ev.titulo}</div><div class="print-liturgia">${ev.tempo_liturgico}</div></td>
            <td class="col-escalas">${escalasHTML}</td>
        </tr>`;
  });

  tbody.innerHTML = html;
  setTimeout(() => window.print(), 300);
};

// ==========================================================================
// 7. UTILS
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
// --- MENU MOBILE ---
window.toggleSidebarMobile = function () {
  const sidebar = document.querySelector(".sidebar");
  const overlay = document.getElementById("sidebar-overlay");

  // Alterna a classe 'active'
  sidebar.classList.toggle("active");
  overlay.classList.toggle("active");
};
