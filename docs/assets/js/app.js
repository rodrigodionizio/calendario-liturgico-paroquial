/*
 * ARQUIVO: app.js
 * DESCRIÇÃO: Controlador Principal - Renderização, Modais e Painel Admin
 * PROJETO: Liturgia Paroquial 2026
 * AUTOR: Rodrigo & Dev AI
 */

console.log("🚀 Sistema Litúrgico V3 Iniciado");

// --- ESTADO GLOBAL DA APLICAÇÃO ---
const ESTADO = {
  anoAtual: 2026,
  mesAtual: 1, // Janeiro = 1
  dadosEventos: {}, // Cache local dos eventos do mês
  isAdmin: false, // Flag de controle de acesso
  listaEquipes: [], // Cache das equipes para o select
};

// Variável para controle da edição atual
let eventoEmEdicao = null;

// --- CONSTANTES DE ÍCONES (SVG) ---
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
  // A. Verifica se existe usuário logado (Admin)
  const session = await window.api.checkSession();
  if (session) {
    ESTADO.isAdmin = true;
    console.log("👑 Modo Admin Ativado: ", session.user.email);
    adicionarBotaoLogout();

    // Carrega lista de equipes em background para usar no editor
    ESTADO.listaEquipes = await window.api.listarEquipes();
  }

  // B. Carrega o Calendário Inicial
  carregarMes(ESTADO.anoAtual, ESTADO.mesAtual);
  configurarBotoesNavegacao();
});

// ==========================================================================
// 2. RENDERIZAÇÃO DO CALENDÁRIO (GRID)
// ==========================================================================

async function carregarMes(ano, mes) {
  // Atualiza título do mês
  const nomeMes = new Date(ano, mes - 1).toLocaleString("pt-BR", {
    month: "long",
  });
  document.querySelector(".month-name").textContent = `${nomeMes} ${ano}`;

  // Prepara Grid
  const grid = document.querySelector(".calendar-wrapper");
  // Salva os headers (Dom, Seg...) para não perder
  const headers = grid.innerHTML
    .match(/<div class="day-header">.*?<\/div>/g)
    .join("");

  // Mostra loading
  grid.innerHTML =
    headers +
    '<div style="grid-column:1/-1; text-align:center; padding:40px; color:#888;">Carregando liturgia...</div>';

  try {
    // Busca dados no Supabase
    const eventos = await window.api.buscarEventos(ano, mes);

    // Indexa eventos por data (ex: '2026-01-01': objeto)
    ESTADO.dadosEventos = {};
    eventos.forEach((ev) => (ESTADO.dadosEventos[ev.data] = ev));

    // Desenha os dias
    renderizarGrid(ano, mes, grid, headers);
  } catch (erro) {
    console.error(erro);
    grid.innerHTML =
      headers +
      '<div style="grid-column:1/-1; padding:20px; color:red; text-align:center;">Erro ao conectar com o banco de dados.</div>';
  }
}

function renderizarGrid(ano, mes, gridElement, headersHTML) {
  let html = headersHTML;

  const primeiroDiaSemana = new Date(ano, mes - 1, 1).getDay(); // 0-6
  const ultimoDiaDoMes = new Date(ano, mes, 0).getDate(); // 28-31
  const ultimoDiaMesAnterior = new Date(ano, mes - 1, 0).getDate();

  // Dias do mês anterior (Cinza)
  for (let i = primeiroDiaSemana - 1; i >= 0; i--) {
    const dia = ultimoDiaMesAnterior - i;
    html += `<div class="day-cell other-month"><span class="day-number">${dia}</span></div>`;
  }

  // Dias do mês atual
  for (let dia = 1; dia <= ultimoDiaDoMes; dia++) {
    const dataISO = `${ano}-${String(mes).padStart(2, "0")}-${String(
      dia
    ).padStart(2, "0")}`;
    const evento = ESTADO.dadosEventos[dataISO];

    let conteudoHTML = "";
    let clickAttr = "";

    if (evento) {
      // Lógica de Cor (Branco vira Cinza para borda)
      let corHex = evento.liturgia_cores?.hex_code || "#2E7D32";
      if (corHex.toLowerCase() === "#ffffff") corHex = "#cccccc";

      const classeSolenidade = evento.is_solenidade ? "solenidade" : "";
      const estiloPill = `border-left: 3px solid ${corHex}; background-color: var(--cor-vinho);`;

      // Pílula Principal (Título Litúrgico)
      conteudoHTML = `<div class="pill ${classeSolenidade}" style="${estiloPill}">${evento.titulo}</div>`;

      // Pílulas de Horário (se houver escalas)
      if (evento.escalas && evento.escalas.length > 0) {
        evento.escalas.forEach((esc) => {
          const hora = esc.hora_celebracao.substring(0, 5);
          conteudoHTML += `<div class="pill" style="background-color:#f0f0f0; color:#333; border-left:3px solid #ccc">${hora} Missa</div>`;
        });
      }

      // Habilita clique apenas se tiver evento
      clickAttr = `onclick="abrirModal('${dataISO}')"`;
    }

    html += `<div class="day-cell" ${clickAttr}><span class="day-number">${dia}</span>${conteudoHTML}</div>`;
  }

  // Dias do próximo mês (para fechar a grade)
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
// 3. MODAL DE DETALHES (READ & WRITE)
// ==========================================================================

window.abrirModal = function (dataISO) {
  let evento = ESTADO.dadosEventos[dataISO];

  // Tratamento para dia vazio (Permitir criar evento futuramente)
  if (!evento) {
    evento = {
      id: null,
      data: dataISO,
      titulo: "Dia sem Liturgia Cadastrada",
      tempo_liturgico: "Dia Comum",
      liturgia_cores: { hex_code: "#CCCCCC" },
      escalas: [],
    };
  }

  // Clona para edição segura
  eventoEmEdicao = JSON.parse(JSON.stringify(evento));

  const modalContent = document.getElementById("modalContent");
  const modalOverlay = document.getElementById("modalOverlay");

  // Formatação de Datas
  const dataObj = new Date(dataISO + "T12:00:00");
  const diaNum = dataObj.getDate();
  const mesNome = dataObj
    .toLocaleString("pt-BR", { month: "short" })
    .toUpperCase()
    .replace(".", "");
  const diaSemana = dataObj.toLocaleString("pt-BR", { weekday: "long" });

  // Tratamento de Cor Visual
  let corHex = evento.liturgia_cores?.hex_code || "#ccc";
  let corTxt = corHex;
  if (corHex.toLowerCase() === "#ffffff") {
    corHex = "#ccc";
    corTxt = "#666";
  }

  // HTML do Modo Leitura
  const conteudoHTML = gerarHTMLLeitura(evento);

  // Botão Admin (Só aparece se logado)
  let btnAdmin = "";
  if (ESTADO.isAdmin) {
    if (evento.id) {
      btnAdmin = `<button id="btnEditar" class="btn-admin-action">🛠️ GERENCIAR ESCALAS</button>`;
    } else {
      btnAdmin = `<div style="text-align:center; padding:10px; color:#999; font-size:0.8rem;">Criação de eventos em dias vazios em breve.</div>`;
    }
  }

  // Montagem do Modal
  modalContent.innerHTML = `
    <div class="modal-card">
        <button class="btn-close" onclick="fecharModalForce()" aria-label="Fechar">×</button>
        <div class="modal-sidebar-color" style="background-color: ${corHex}"></div>
        
        <div class="modal-body" id="modalBody">
            <div class="modal-header">
                <div><span class="modal-day">${diaNum}</span><span class="modal-month">${mesNome}</span></div>
                <div class="modal-meta"><div class="modal-weekday">${diaSemana}</div></div>
            </div>
            
            <!-- Área Dinâmica (Alterna entre Leitura e Edição) -->
            <div id="areaConteudo">
                <div class="modal-liturgia" style="color:${corTxt}">${evento.tempo_liturgico}</div>
                <div class="modal-titulo">${evento.titulo}</div>
                <div class="escala-list">${conteudoHTML}</div>
            </div>

            ${btnAdmin}
        </div>
    </div>`;

  modalOverlay.classList.add("active");

  // Bind do botão Editar
  if (ESTADO.isAdmin && evento.id) {
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
// 4. MODO DE EDIÇÃO (ADMIN FORM)
// ==========================================================================

function ativarModoEdicao(evento) {
  const area = document.getElementById("areaConteudo");
  const btnEditar = document.getElementById("btnEditar");
  if (btnEditar) btnEditar.style.display = "none"; // Esconde botão

  // Gera opções do Select
  const optionsEquipes = ESTADO.listaEquipes
    .map((eq) => `<option value="${eq.id}">${eq.nome_equipe}</option>`)
    .join("");

  let htmlEditor = `
        <h3 style="color:var(--cor-vinho); margin-bottom:15px; border-bottom:1px solid #eee; padding-bottom:5px;">Editando Escalas</h3>
        <div id="listaEditor" style="display:flex; flex-direction:column; gap:15px;">
    `;

  // Cria inputs para escalas existentes
  if (evento.escalas) {
    evento.escalas.forEach((esc, index) => {
      htmlEditor += gerarLinhaEditor(esc, index, optionsEquipes);
    });
  }

  htmlEditor += `</div>
        <button onclick="adicionarNovaEscala()" style="margin-top:15px; background:#f0f0f0; border:1px dashed #ccc; padding:10px; width:100%; border-radius:6px; cursor:pointer; font-weight:bold; color:#555;">➕ Adicionar Horário</button>
        
        <div style="margin-top:25px; display:flex; gap:10px;">
            <button onclick="salvarEdicoes()" style="flex:1; background:var(--cor-verde); color:#fff; border:none; padding:12px; border-radius:6px; font-weight:bold; cursor:pointer; box-shadow:0 2px 5px rgba(0,0,0,0.2);">💾 SALVAR</button>
            <button onclick="fecharModalForce()" style="background:#eee; border:none; padding:12px 20px; border-radius:6px; cursor:pointer; color:#555;">Cancelar</button>
        </div>
    `;

  area.innerHTML = htmlEditor;
}

function gerarLinhaEditor(escala, index, options) {
  const idLeit = escala.equipe_leitura?.id || escala.equipe_leitura_id;
  const idCant = escala.equipe_canto?.id || escala.equipe_canto_id;
  const selLeit = (id) => (id === idLeit ? "selected" : "");
  const selCant = (id) => (id === idCant ? "selected" : "");
  const horaVal = escala.hora_celebracao
    ? escala.hora_celebracao.substring(0, 5)
    : "19:00";

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
                    ${options.replace(
                      `value="${idLeit}"`,
                      `value="${idLeit}" selected`
                    )} 
                    <!-- Nota: O replace acima é um fallback simples, o ideal é re-gerar options ou usar JS puro, mas para HTML string funciona se o ID for único -->
                    <!-- Melhor abordagem: Usar a função selLeit dentro do map original. Como o options já vem montado string, faremos diferente no adicionarNovaEscala -->
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

// Funções Globais do Editor
window.adicionarNovaEscala = function () {
  const lista = document.getElementById("listaEditor");
  const options = ESTADO.listaEquipes
    .map((eq) => `<option value="${eq.id}">${eq.nome_equipe}</option>`)
    .join("");

  const nova = {
    hora_celebracao: "19:00",
    equipe_leitura_id: null,
    equipe_canto_id: null,
  };
  // Usamos um truque para gerar o HTML limpo
  // Aqui simplifico chamando gerarLinhaEditor passando os selects limpos
  const div = document.createElement("div");
  // Recrio a função de gerar linha para garantir options limpas no "Novo"
  div.innerHTML = gerarLinhaEditor(nova, 999, options);
  lista.appendChild(div.firstElementChild);
  div.firstElementChild.scrollIntoView({ behavior: "smooth" });
};

window.removerLinha = function (btn) {
  if (confirm("Remover este horário?")) {
    btn.closest(".editor-row").remove();
  }
};

window.salvarEdicoes = async function () {
  const linhas = document.querySelectorAll(".editor-row");
  const novasEscalas = [];
  const eventoId = eventoEmEdicao.id;

  // Coleta dados
  linhas.forEach((row) => {
    const hora = row.querySelector(".edit-hora").value;
    const leit = row.querySelector(".edit-leitura").value || null;
    const cant = row.querySelector(".edit-canto").value || null;

    if (hora) {
      novasEscalas.push({
        evento_id: eventoId,
        hora_celebracao: hora,
        equipe_leitura_id: leit,
        equipe_canto_id: cant,
      });
    }
  });

  try {
    const area = document.getElementById("areaConteudo");
    area.innerHTML =
      '<div style="text-align:center; padding:40px; color:var(--cor-vinho); font-weight:bold;"><p>💾 Salvando alterações...</p></div>';

    // 1. Apaga antigas
    const { error: errDel } = await window.api.client
      .from("escalas")
      .delete()
      .eq("evento_id", eventoId);
    if (errDel) throw errDel;

    // 2. Insere novas
    if (novasEscalas.length > 0) {
      const { error: errIns } = await window.api.client
        .from("escalas")
        .insert(novasEscalas);
      if (errIns) throw errIns;
    }

    // 3. Sucesso
    alert("✅ Escalas atualizadas com sucesso!");
    fecharModalForce();
    carregarMes(ESTADO.anoAtual, ESTADO.mesAtual); // Recarrega calendário
  } catch (err) {
    alert("Erro ao salvar: " + err.message);
    console.error(err);
    fecharModalForce();
  }
};

// ==========================================================================
// 5. NAVEGAÇÃO E UTILS
// ==========================================================================

function adicionarBotaoLogout() {
  const header = document.querySelector("header");
  const div = document.createElement("div");
  // Adiciona botão ao lado da logo ou no canto
  div.style.position = "absolute";
  div.style.right = "20px";
  div.innerHTML = `<button onclick="window.api.logout()" style="background:rgba(255,255,255,0.2); border:1px solid #fff; color:#fff; padding:5px 12px; border-radius:20px; cursor:pointer; font-size:0.8rem;">Sair</button>`;
  header.appendChild(div);
}

function configurarBotoesNavegacao() {
  const btns = document.querySelectorAll(".btn-nav");

  // Anterior
  btns[0].onclick = () => {
    ESTADO.mesAtual--;
    if (ESTADO.mesAtual < 1) {
      ESTADO.mesAtual = 12;
      ESTADO.anoAtual--;
    }
    carregarMes(ESTADO.anoAtual, ESTADO.mesAtual);
  };

  // Hoje
  btns[1].onclick = () => {
    ESTADO.anoAtual = 2026;
    ESTADO.mesAtual = 1;
    carregarMes(ESTADO.anoAtual, ESTADO.mesAtual);
  };

  // Próximo
  btns[2].onclick = () => {
    ESTADO.mesAtual++;
    if (ESTADO.mesAtual > 12) {
      ESTADO.mesAtual = 1;
      ESTADO.anoAtual++;
    }
    carregarMes(ESTADO.anoAtual, ESTADO.mesAtual);
  };
}

// Helpers Globais
window.fecharModal = (e) => {
  if (e.target.id === "modalOverlay") fecharModalForce();
};
window.fecharModalForce = () => {
  document.getElementById("modalOverlay").classList.remove("active");
};
document.addEventListener("keydown", (e) => {
  if (e.key === "Escape") fecharModalForce();
});
