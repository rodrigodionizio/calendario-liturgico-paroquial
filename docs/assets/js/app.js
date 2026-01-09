/*
 * ARQUIVO: app.js
 * DESCRIÇÃO: Controlador Principal - Lógica de Renderização e Integração API
 * AUTOR: Rodrigo & Dev AI
 */

console.log("🚀 Sistema Litúrgico Iniciado");

// --- CONFIGURAÇÃO GLOBAL ---
const ESTADO = {
  anoAtual: 2026,
  mesAtual: 1, // Janeiro = 1
  dadosEventos: {}, // Cache dos eventos do mês
};

// --- CONSTANTES VISUAIS ---
const ICONS = {
  leitura:
    '<svg class="equipe-icon" viewBox="0 0 24 24" fill="currentColor" style="color:var(--cor-vinho)"><path d="M12 3v18.5c-2.3-.6-4.4-1-6.5-1-2.4 0-4.6.5-6.5 1.2V3.2C1.4 2.5 3.6 2 6 2c2.1 0 4.1.4 6 1zm10.5-.8c-1.9-.7-4.1-1.2-6.5-1.2v18.5c2.1 0 4.2.4 6.5 1V3.2z"/></svg>',
  canto:
    '<svg class="equipe-icon" viewBox="0 0 24 24" fill="currentColor" style="color:var(--cor-dourado)"><path d="M12 3v10.55c-.59-.34-1.27-.55-2-.55-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4V7h4V3h-6z"/></svg>',
};

const MAPA_CORES = {
  Verde: { bg: "bg-verde", txt: "txt-verde" },
  Branco: { bg: "bg-branco", txt: "txt-branco" },
  Vermelho: { bg: "bg-vermelho", txt: "txt-vermelho" },
  Roxo: { bg: "bg-roxo", txt: "txt-roxo" },
  Rosa: { bg: "bg-rosa", txt: "txt-rosa" },
  Dourado: { bg: "bg-dourado", txt: "txt-dourado" },
};

// --- INICIALIZAÇÃO ---
document.addEventListener("DOMContentLoaded", () => {
  carregarMes(ESTADO.anoAtual, ESTADO.mesAtual);
  configurarBotoesNavegacao();
});

// --- FUNÇÕES PRINCIPAIS ---

async function carregarMes(ano, mes) {
  // 1. Atualizar Header
  const nomeMes = new Date(ano, mes - 1).toLocaleString("pt-BR", {
    month: "long",
  });
  document.querySelector(".month-name").textContent = `${nomeMes} ${ano}`;

  // 2. Limpar Grid Atual e mostrar carregando (opcional)
  const grid = document.querySelector(".calendar-wrapper");
  // Manter headers, limpar dias
  const headers = grid.innerHTML
    .match(/<div class="day-header">.*?<\/div>/g)
    .join("");
  grid.innerHTML =
    headers +
    '<div style="grid-column:1/-1; text-align:center; padding:20px;">Carregando...</div>';

  // 3. Buscar Dados no Supabase
  try {
    const eventos = await window.api.buscarEventos(ano, mes);

    // Transformar array em objeto indexado por dia (ex: '2026-01-01': {dados})
    ESTADO.dadosEventos = {};
    eventos.forEach((ev) => {
      ESTADO.dadosEventos[ev.data] = ev;
    });

    // 4. Renderizar Grid
    renderizarGrid(ano, mes, grid, headers);
  } catch (erro) {
    console.error("Erro ao carregar:", erro);
    grid.innerHTML =
      headers +
      '<div style="color:red; padding:20px;">Erro ao carregar dados.</div>';
  }
}

function renderizarGrid(ano, mes, gridElement, headersHTML) {
  let html = headersHTML;

  const primeiroDiaDoMes = new Date(ano, mes - 1, 1);
  const ultimoDiaDoMes = new Date(ano, mes, 0);

  // Dias do mês anterior para preencher o grid
  const diaSemanaInicio = primeiroDiaDoMes.getDay(); // 0 (Dom) a 6 (Sáb)

  // Preencher dias vazios do início
  const ultimoDiaMesAnterior = new Date(ano, mes - 1, 0).getDate();
  for (let i = diaSemanaInicio - 1; i >= 0; i--) {
    const dia = ultimoDiaMesAnterior - i;
    html += `<div class="day-cell other-month"><span class="day-number">${dia}</span></div>`;
  }

  // Preencher dias do mês
  for (let dia = 1; dia <= ultimoDiaDoMes.getDate(); dia++) {
    const dataISO = `${ano}-${String(mes).padStart(2, "0")}-${String(
      dia
    ).padStart(2, "0")}`;
    const evento = ESTADO.dadosEventos[dataISO];

    // Verifica se tem evento
    let pillHTML = "";
    let classeCor = "";
    let onclickAttr = "";

    if (evento) {
      // Define estilo baseado na cor do banco ou fallback
      const corNome = evento.liturgia_cores
        ? evento.liturgia_cores.hex_code
        : "Verde"; // Fallback
      // Mapeia hex ou nome para classe CSS (Simplificação: Usando classes baseadas no nome litúrgico se possível, ou inline style)
      // Aqui vamos usar um truque: O banco retorna hex, mas nossas classes são por nome.
      // Vamos confiar na lógica de cor do objeto evento

      // Lógica de Pílula
      const tituloEvento = evento.titulo;
      const isSolenidade = evento.is_solenidade ? "solenidade" : "";

      // Para simplificar, vamos injetar estilo inline para a borda da pílula com o Hex do banco
      const corHex = evento.liturgia_cores
        ? evento.liturgia_cores.hex_code
        : "#2E7D32";
      const stylePill = `border-left: 3px solid ${corHex}; background-color: var(--cor-vinho);`;

      pillHTML = `<div class="pill ${isSolenidade}" style="${stylePill}">${tituloEvento}</div>`;

      // Se tiver escalas, mostra badge de hora
      if (evento.escalas && evento.escalas.length > 0) {
        evento.escalas.forEach((esc) => {
          // Corta segundos da hora (19:00:00 -> 19:00)
          const horaCurta = esc.hora_celebracao.substring(0, 5);
          pillHTML += `<div class="pill" style="background-color:#eee; color:#333; border-left:3px solid #ccc">${horaCurta} Missa</div>`;
        });
      }

      onclickAttr = `onclick="abrirModal('${dataISO}')"`;
    }

    html += `
        <div class="day-cell" ${onclickAttr}>
            <span class="day-number">${dia}</span>
            ${pillHTML}
        </div>`;
  }

  // Preencher dias do próximo mês (para completar a grade)
  const totalCelulas = diaSemanaInicio + ultimoDiaDoMes.getDate();
  const resto = totalCelulas % 7;
  if (resto !== 0) {
    for (let i = 1; i <= 7 - resto; i++) {
      html += `<div class="day-cell other-month"><span class="day-number">${i}</span></div>`;
    }
  }

  gridElement.innerHTML = html;
}

// --- FUNÇÕES DE MODAL ---

window.abrirModal = function (dataISO) {
  const evento = ESTADO.dadosEventos[dataISO];
  if (!evento) return;

  const modalContent = document.getElementById("modalContent");
  const modalOverlay = document.getElementById("modalOverlay");

  // Formatar Data
  const dataObj = new Date(dataISO + "T12:00:00"); // T12 evita fuso horário
  const diaNum = dataObj.getDate();
  const mesNome = dataObj
    .toLocaleString("pt-BR", { month: "short" })
    .toUpperCase()
    .replace(".", "");
  const diaSemana = dataObj.toLocaleString("pt-BR", { weekday: "long" });

  // Cores
  // Tenta achar a cor pelo ID ou usa padrão
  // No futuro podemos melhorar o mapeamento Cor ID -> Classe CSS
  const classeCor = "bg-verde"; // Default
  const classeTxt = "txt-verde";

  // Construir Lista de Escalas
  let escalasHTML = "";
  if (evento.escalas && evento.escalas.length > 0) {
    evento.escalas.forEach((esc) => {
      const hora = esc.hora_celebracao.substring(0, 5);
      const leitor = esc.equipe_leitura
        ? esc.equipe_leitura.nome_equipe
        : "A definir";
      const canto = esc.equipe_canto
        ? esc.equipe_canto.nome_equipe
        : "A definir";

      escalasHTML += `
            <div class="escala-item">
                <div class="escala-hora">${hora}</div>
                <div class="escala-equipes">
                    <div class="equipe-row">
                        ${ICONS.leitura} <span class="equipe-label">Leitura</span>
                        <span class="equipe-val">${leitor}</span>
                    </div>
                    <div class="equipe-row">
                        ${ICONS.canto} <span class="equipe-label">Canto</span>
                        <span class="equipe-val">${canto}</span>
                    </div>
                </div>
            </div>`;
    });
  } else {
    escalasHTML =
      '<div style="color:#999; font-style:italic;">Nenhuma escala cadastrada.</div>';
  }

  // HTML do Modal
  const html = `
    <div class="modal-card">
        <button class="btn-close" onclick="fecharModalForce()">×</button>
        <div class="modal-sidebar-color" style="background-color: ${
          evento.liturgia_cores?.hex_code || "#ccc"
        }"></div>
        <div class="modal-body">
            <div class="modal-header">
                <div><span class="modal-day">${diaNum}</span><span class="modal-month">${mesNome}</span></div>
                <div class="modal-meta"><div class="modal-weekday">${diaSemana}</div></div>
            </div>
            <div class="modal-liturgia" style="color: ${
              evento.liturgia_cores?.hex_code || "#333"
            }">${evento.tempo_liturgico}</div>
            <div class="modal-titulo">${evento.titulo}</div>
            <div class="escala-list">${escalasHTML}</div>
        </div>
    </div>`;

  modalContent.innerHTML = html;
  modalOverlay.classList.add("active");
};

// --- NAVEGAÇÃO ---

function configurarBotoesNavegacao() {
  const btns = document.querySelectorAll(".btn-nav");
  // Anterior
  btns[0].addEventListener("click", () => {
    ESTADO.mesAtual--;
    if (ESTADO.mesAtual < 1) {
      ESTADO.mesAtual = 12;
      ESTADO.anoAtual--;
    }
    carregarMes(ESTADO.anoAtual, ESTADO.mesAtual);
  });

  // Hoje (Volta pra Jan 2026 por enquanto, ou Data Atual)
  btns[1].addEventListener("click", () => {
    ESTADO.anoAtual = 2026;
    ESTADO.mesAtual = 1;
    carregarMes(ESTADO.anoAtual, ESTADO.mesAtual);
  });

  // Próximo
  btns[2].addEventListener("click", () => {
    ESTADO.mesAtual++;
    if (ESTADO.mesAtual > 12) {
      ESTADO.mesAtual = 1;
      ESTADO.anoAtual++;
    }
    carregarMes(ESTADO.anoAtual, ESTADO.mesAtual);
  });
}

// Utilitários de Modal (Globais)
window.fecharModal = (e) => {
  if (e.target.id === "modalOverlay") fecharModalForce();
};
window.fecharModalForce = () => {
  document.getElementById("modalOverlay").classList.remove("active");
};
document.addEventListener("keydown", (e) => {
  if (e.key === "Escape") fecharModalForce();
});
