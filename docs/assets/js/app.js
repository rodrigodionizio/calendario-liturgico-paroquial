/*
 * ARQUIVO: app.js
 * DESCRIÇÃO: Motor de Interface (UI Engine) do Calendário e Sistema de Escalas
 * PROJETO: Liturgia Paroquial 2026
 * AUTOR: Rodrigo & Dev AI (Senior Specialist approach)
 * VERSÃO: 3.0 (Modular & Extensível)
 */

window.CalendarUI = {
  // ==========================================================================
  // 0. CONFIGURAÇÕES E ESTADO INTERNO
  // ==========================================================================
  config: {
    isAdmin: false,
    containerGrid: ".calendar-wrapper",
    mostrarPendentes: false,
    elementoMesNome: ".month-name",
  },

  estado: {
    anoAtual: 2026,
    mesAtual: 1,
    dadosEventos: {}, // Estrutura: { 'YYYY-MM-DD': [evento1, evento2] }
    listaEquipes: [],
    filtrosAtivos: new Set(),
  },

  cache: {
    equipesLeitura: [],
    equipesCanto: [],
  },

  // ==========================================================================
  // 1. INICIALIZAÇÃO DO MOTOR
  // ==========================================================================
  /* INÍCIO: Método init */
  init: async function (parametros = {}) {
    console.log("🚀 Motor UI: Inicializando...");

    // 1.1. Merge de configurações (Override de parâmetros)
    this.config = { ...this.config, ...parametros };

    // 1.2. Carregamento de Dependências de Dados
    try {
      if (this.estado.listaEquipes.length === 0) {
        this.estado.listaEquipes = await window.api.listarEquipes();
        this.cache.equipesLeitura = this.estado.listaEquipes.filter(
          (e) => e.tipo_atuacao === "Leitura" || e.tipo_atuacao === "Ambos"
        );
        this.cache.equipesCanto = this.estado.listaEquipes.filter(
          (e) => e.tipo_atuacao === "Canto" || e.tipo_atuacao === "Ambos"
        );
      }

      // 1.3. Configuração de Navegação e Primeiros Dados
      this.configurarBotoesNavegacao();
      await this.carregarDadosMes(this.estado.anoAtual, this.estado.mesAtual);

      console.log(
        "✅ Motor UI: Pronto em modo " +
          (this.config.isAdmin ? "ADMIN" : "LEITURA")
      );
    } catch (error) {
      console.error("❌ Falha Crítica no Motor UI:", error);
    }
  },
  /* FIM: Método init */

  // ==========================================================================
  // 2. LOGICA DE RENDERIZAÇÃO DO GRID
  // ==========================================================================
  /* INÍCIO: Método carregarDadosMes */
  carregarDadosMes: async function (ano, mes) {
    // 2.1. Atualização do Título do Mês
    const nomeMes = new Date(ano, mes - 1).toLocaleString("pt-BR", {
      month: "long",
    });
    const elNome = document.querySelector(this.config.elementoMesNome);
    if (elNome) elNome.textContent = `${nomeMes.toUpperCase()} ${ano}`;

    const grid = document.querySelector(this.config.containerGrid);
    if (!grid) return;

    // 2.2. Feedback visual de carregamento
    grid.style.opacity = "0.5";

    try {
      // Chamada à API (Passando a flag de aprovação dependendo do contexto)
      const eventos = await window.api.buscarEventos(
        ano,
        mes,
        !this.config.mostrarPendentes
      );

      this.estado.dadosEventos = {};
      eventos.forEach((ev) => {
        if (!this.estado.dadosEventos[ev.data])
          this.estado.dadosEventos[ev.data] = [];
        this.estado.dadosEventos[ev.data].push(ev);
      });

      this.renderizarGrid(grid, ano, mes);
    } catch (erro) {
      console.error("Erro ao processar dados do mês:", erro);
    } finally {
      grid.style.opacity = "1";
    }
  },
  /* FIM: Método carregarDadosMes */

  /* INÍCIO: Método renderizarGrid */
  renderizarGrid: function (gridElement, ano, mes) {
    // Limpeza e preservação do Header (DOM manipulation otimizada)
    const headers = Array.from(gridElement.querySelectorAll(".day-header"))
      .map((h) => h.outerHTML)
      .join("");
    let html = headers;

    const primeiroDia = new Date(ano, mes - 1, 1).getDay();
    const ultimoDia = new Date(ano, mes, 0).getDate();
    const ultimoDiaMesAnt = new Date(ano, mes - 1, 0).getDate();

    // 2.3. Cálculo de dias do mês anterior
    for (let i = primeiroDia - 1; i >= 0; i--) {
      html += `<div class="day-cell other-month"><span class="day-number">${
        ultimoDiaMesAnt - i
      }</span></div>`;
    }

    // 2.4. Renderização dos dias do mês atual (Integração de Múltiplos Eventos)
    for (let dia = 1; dia <= ultimoDia; dia++) {
      const dataISO = `${ano}-${String(mes).padStart(2, "0")}-${String(
        dia
      ).padStart(2, "0")}`;
      const listaEventos = this.estado.dadosEventos[dataISO] || [];

      let pílulasHTML = "";
      listaEventos.forEach((evento) => {
        let corHex = evento.liturgia_cores?.hex_code || "#64748b";
        if (evento.tipo_compromisso !== "liturgia") corHex = "#475569";

        const statusInfo =
          this.config.isAdmin && evento.status === "pendente"
            ? '<span class="status-badge-pendente">!</span>'
            : "";
        pílulasHTML += `
                    <div class="pill ${
                      evento.is_solenidade ? "solenidade" : ""
                    }" 
                         style="border-left: 3px solid ${corHex}; background-color: var(--cor-vinho);">
                        ${statusInfo}${evento.titulo}
                    </div>`;
      });

      html += `
                <div class="day-cell" data-iso="${dataISO}" onclick="CalendarUI.abrirModal('${dataISO}')">
                    <span class="day-number">${dia}</span>
                    <div class="pill-container">${pílulasHTML}</div>
                </div>`;
    }

    gridElement.innerHTML = html;
  },
  /* FIM: Método renderizarGrid */

  // ==========================================================================
  // 3. MODAL E EDITOR (LOGICA DE NEGOCIO ADMINISTRATIVA)
  // ==========================================================================
  /* INÍCIO: Método abrirModal */
  abrirModal: function (dataISO) {
    const listaEventos = this.estado.dadosEventos[dataISO] || [];
    const overlay = document.getElementById("modalOverlay");
    const content = document.getElementById("modalContent");

    const dataObj = new Date(dataISO + "T12:00:00");
    const diaNum = dataObj.getDate();
    const mesNome = dataObj
      .toLocaleString("pt-BR", { month: "short" })
      .toUpperCase();

    let htmlLista = "";
    listaEventos.forEach((ev) => {
      const evString = encodeURIComponent(JSON.stringify(ev));
      const btnEdit = this.config.isAdmin
        ? `<button class="btn-edit" onclick='CalendarUI.prepararEdicao(decodeURIComponent("${evString}"))'>✏️</button>`
        : "";

      htmlLista += `
                <div class="modal-event-card" style="border-left: 4px solid ${
                  ev.liturgia_cores?.hex_code || "#ccc"
                }">
                    ${btnEdit}
                    <div class="meta">${
                      ev.tempo_liturgico || ev.tipo_compromisso
                    }</div>
                    <div class="titulo">${ev.titulo}</div>
                    <div class="detalhes">${this.gerarDetalhesEvento(ev)}</div>
                </div>`;
    });

    const btnNovo = this.config.isAdmin
      ? `<button class="btn-add-novo" onclick="CalendarUI.iniciarCriacao('${dataISO}')">+ ADICIONAR NOVO</button>`
      : "";

    content.innerHTML = `
            <div class="modal-card">
                <button class="btn-close" onclick="CalendarUI.fecharModalForce()">×</button>
                <div class="modal-body" id="modalBody">
                    <div class="modal-header">
                        <span class="modal-day">${diaNum}</span><span class="modal-month">${mesNome}</span>
                    </div>
                    <div class="lista-eventos">${htmlLista}</div>
                    ${btnNovo}
                </div>
            </div>`;

    overlay.classList.add("active");
  },
  /* FIM: Método abrirModal */

  /* INÍCIO: Método gerarDetalhesEvento */
  gerarDetalhesEvento: function (ev) {
    if (ev.tipo_compromisso === "liturgia") {
      return (ev.escalas || [])
        .map(
          (esc) => `
                <div class="escala-row">
                    <strong>${esc.hora_celebracao.substring(0, 5)}</strong> | 
                    📖 ${esc.equipe_leitura?.nome_equipe || "-"} | 
                    🎵 ${esc.equipe_canto?.nome_equipe || "-"}
                </div>`
        )
        .join("");
    }
    const hora = ev.hora_inicio ? `🕒 ${ev.hora_inicio.substring(0, 5)}` : "";
    return `${hora} | 📍 ${ev.local || "Paróquia"} | 👤 ${
      ev.responsavel || "-"
    }`;
  },
  /* FIM: Método gerarDetalhesEvento */

  // ==========================================================================
  // 4. UTILS E NAVEGAÇÃO
  // ==========================================================================
  /* INÍCIO: Método configurarBotoesNavegacao */
  configurarBotoesNavegacao: function () {
    // Encontra os botões de navegação dependendo se está no site ou no admin
    const seletor = this.config.isAdmin ? "#tab-agenda-total" : "body";
    const btnPrev =
      document.querySelector(
        `${seletor} .btn-nav[aria-label="Mês Anterior"]`
      ) || document.getElementById("prev-btn");
    const btnNext =
      document.querySelector(`${seletor} .btn-nav[aria-label="Próximo Mês"]`) ||
      document.getElementById("next-btn");

    if (btnPrev)
      btnPrev.onclick = () => {
        this.mudarMes(-1);
      };
    if (btnNext)
      btnNext.onclick = () => {
        this.mudarMes(1);
      };
  },
  /* FIM: Método configurarBotoesNavegacao */

  mudarMes: async function (delta) {
    this.estado.mesAtual += delta;
    if (this.estado.mesAtual < 1) {
      this.estado.mesAtual = 12;
      this.estado.anoAtual--;
    }
    if (this.estado.mesAtual > 12) {
      this.estado.mesAtual = 1;
      this.estado.anoAtual++;
    }
    await this.carregarDadosMes(this.estado.anoAtual, this.estado.mesAtual);
  },

  fecharModalForce: function () {
    document.getElementById("modalOverlay").classList.remove("active");
  },
};

/* INÍCIO: Auto-inicialização Condicional */
// Se estiver no index.html (público), inicia o motor automaticamente em modo leitura.
// No dashboard.html, ele será iniciado manualmente pelo dashboard.js
document.addEventListener("DOMContentLoaded", () => {
  const paginaPublica =
    document.querySelector(".calendar-wrapper") &&
    !document.querySelector(".admin-sidebar");
  if (paginaPublica) {
    window.CalendarUI.init({ isAdmin: false });
  }
});
/* FIM: Auto-inicialização Condicional */
