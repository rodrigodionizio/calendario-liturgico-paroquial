/*
 * ARQUIVO: app.js
 * DESCRIÇÃO: Controlador Principal - Lógica de Renderização e Integração API
 * AUTOR: Rodrigo & Dev AI
 */

console.log("🚀 Sistema Litúrgico V2 Iniciado");

const ESTADO = {
  anoAtual: 2026,
  mesAtual: 1,
  dadosEventos: {},
  isAdmin: false, // Guarda se o usuário é admin
  listaEquipes: [], // Cache das equipes para o select
};

const ICONS = {
  leitura:
    '<svg class="equipe-icon" viewBox="0 0 24 24" fill="currentColor" style="color:var(--cor-vinho)"><path d="M12 3v18.5c-2.3-.6-4.4-1-6.5-1-2.4 0-4.6.5-6.5 1.2V3.2C1.4 2.5 3.6 2 6 2c2.1 0 4.1.4 6 1zm10.5-.8c-1.9-.7-4.1-1.2-6.5-1.2v18.5c2.1 0 4.2.4 6.5 1V3.2z"/></svg>',
  canto:
    '<svg class="equipe-icon" viewBox="0 0 24 24" fill="currentColor" style="color:var(--cor-dourado)"><path d="M12 3v10.55c-.59-.34-1.27-.55-2-.55-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4V7h4V3h-6z"/></svg>',
};

document.addEventListener("DOMContentLoaded", async () => {
  // 1. Verificar Login
  const session = await window.api.checkSession();
  if (session) {
    ESTADO.isAdmin = true;
    console.log("👑 Modo Admin Ativado");
    adicionarBotaoLogout();
    // Carregar equipes em background
    ESTADO.listaEquipes = await window.api.listarEquipes();
  }

  // 2. Carregar Calendário
  carregarMes(ESTADO.anoAtual, ESTADO.mesAtual);
  configurarBotoesNavegacao();
});

// --- RENDERIZAÇÃO ---

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
    '<div style="grid-column:1/-1; text-align:center; padding:40px;">Carregando...</div>';

  try {
    const eventos = await window.api.buscarEventos(ano, mes);
    ESTADO.dadosEventos = {};
    eventos.forEach((ev) => (ESTADO.dadosEventos[ev.data] = ev));
    renderizarGrid(ano, mes, grid, headers);
  } catch (erro) {
    console.error(erro);
    grid.innerHTML =
      headers + '<div style="padding:20px; color:red;">Erro na conexão.</div>';
  }
}

function renderizarGrid(ano, mes, gridElement, headersHTML) {
  let html = headersHTML;
  const primeiroDia = new Date(ano, mes - 1, 1).getDay();
  const ultimoDia = new Date(ano, mes, 0).getDate();
  const ultimoDiaMesAnt = new Date(ano, mes - 1, 0).getDate();

  for (let i = primeiroDia - 1; i >= 0; i--) {
    html += `<div class="day-cell other-month"><span class="day-number">${
      ultimoDiaMesAnt - i
    }</span></div>`;
  }

  for (let dia = 1; dia <= ultimoDia; dia++) {
    const dataISO = `${ano}-${String(mes).padStart(2, "0")}-${String(
      dia
    ).padStart(2, "0")}`;
    const evento = ESTADO.dadosEventos[dataISO];
    let content = "";
    let click = "";

    if (evento) {
      let corHex = evento.liturgia_cores?.hex_code || "#2E7D32";
      if (corHex.toLowerCase() === "#ffffff") corHex = "#cccccc";

      const isSolenidade = evento.is_solenidade ? "solenidade" : "";
      const style = `border-left: 3px solid ${corHex}; background-color: var(--cor-vinho);`;

      content = `<div class="pill ${isSolenidade}" style="${style}">${evento.titulo}</div>`;

      if (evento.escalas?.length) {
        evento.escalas.forEach((esc) => {
          content += `<div class="pill" style="background-color:#f0f0f0; color:#333; border-left:3px solid #ccc">${esc.hora_celebracao.substring(
            0,
            5
          )} Missa</div>`;
        });
      }
      click = `onclick="abrirModal('${dataISO}')"`;
    }
    html += `<div class="day-cell" ${click}><span class="day-number">${dia}</span>${content}</div>`;
  }
  gridElement.innerHTML = html;
}

// --- MODAL & EDIÇÃO ---

window.abrirModal = function (dataISO) {
  const evento = ESTADO.dadosEventos[dataISO];
  if (!evento) return;

  const modalContent = document.getElementById("modalContent");
  const modalOverlay = document.getElementById("modalOverlay");

  // Formatação Visual
  const dataObj = new Date(dataISO + "T12:00:00");
  const diaNum = dataObj.getDate();
  const mesNome = dataObj
    .toLocaleString("pt-BR", { month: "short" })
    .toUpperCase();
  const diaSemana = dataObj.toLocaleString("pt-BR", { weekday: "long" });

  let corHex = evento.liturgia_cores?.hex_code || "#ccc";
  let corTxt = corHex;
  if (corHex.toLowerCase() === "#ffffff") {
    corHex = "#ccc";
    corTxt = "#666";
  }

  // Botão Admin
  let btnEditar = "";
  if (ESTADO.isAdmin) {
    btnEditar = `<button onclick="alert('Funcionalidade de Edição em Breve!')" style="margin-top:20px; width:100%; padding:10px; background:#333; color:#fff; border:none; border-radius:8px; cursor:pointer; font-weight:bold;">🛠️ EDITAR ESCALAS (Admin)</button>`;
  }

  let listaHTML = "";
  if (evento.escalas?.length) {
    evento.escalas.forEach((esc) => {
      const leit = esc.equipe_leitura?.nome_equipe || "-";
      const cant = esc.equipe_canto?.nome_equipe || "-";
      listaHTML += `
            <div class="escala-item">
                <div class="escala-hora">${esc.hora_celebracao.substring(
                  0,
                  5
                )}</div>
                <div class="escala-equipes">
                    <div class="equipe-row">${
                      ICONS.leitura
                    } <span class="equipe-label">Leitura</span> <strong>${leit}</strong></div>
                    <div class="equipe-row">${
                      ICONS.canto
                    } <span class="equipe-label">Canto</span> <strong>${cant}</strong></div>
                </div>
            </div>`;
    });
  } else {
    listaHTML =
      '<div style="color:#999; font-style:italic; padding:10px;">Sem escalas definidas.</div>';
  }

  modalContent.innerHTML = `
    <div class="modal-card">
        <button class="btn-close" onclick="fecharModalForce()">×</button>
        <div class="modal-sidebar-color" style="background-color: ${corHex}"></div>
        <div class="modal-body">
            <div class="modal-header">
                <div><span class="modal-day">${diaNum}</span><span class="modal-month">${mesNome}</span></div>
                <div class="modal-meta"><div class="modal-weekday">${diaSemana}</div></div>
            </div>
            <div class="modal-liturgia" style="color:${corTxt}">${evento.tempo_liturgico}</div>
            <div class="modal-titulo">${evento.titulo}</div>
            
            <div class="escala-list">${listaHTML}</div>
            ${btnEditar}
        </div>
    </div>`;

  modalOverlay.classList.add("active");
};

function adicionarBotaoLogout() {
  const header = document.querySelector("header");
  const btn = document.createElement("button");
  btn.innerHTML = "Sair";
  btn.style.cssText =
    "background:transparent; border:1px solid #fff; color:#fff; padding:5px 10px; border-radius:4px; cursor:pointer; margin-left:15px;";
  btn.onclick = window.api.logout;
  header.appendChild(btn);
}

// Helpers
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
