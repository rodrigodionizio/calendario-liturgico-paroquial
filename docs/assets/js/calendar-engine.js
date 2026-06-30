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
 * ARQUIVO: calendar-engine.js
 * DESCRIÇÃO: Motor de Renderização Universal
 * VERSÃO: 12.0
 */

// A11Y-003: mapeamento de ícones e labels por cor litúrgica
const ICONES_LITURGICOS = {
  '#2e7d32': { icon: '🌿', label: 'Tempo Comum' },
  '#4caf50': { icon: '🌿', label: 'Tempo Comum' },
  '#6a1b9a': { icon: '✝️', label: 'Advento / Quaresma' },
  '#9c27b0': { icon: '✝️', label: 'Advento / Quaresma' },
  '#f5f5f5': { icon: '☀️', label: 'Natal / Páscoa' },
  '#ffffff': { icon: '☀️', label: 'Natal / Páscoa' },
  '#d32f2f': { icon: '🕊️', label: 'Pentecostes / Mártires' },
  '#f44336': { icon: '🕊️', label: 'Pentecostes / Mártires' },
  '#e91e63': { icon: '🌸', label: 'Gaudete / Laetare' },
  '#ec407a': { icon: '🌸', label: 'Gaudete / Laetare' },
};

function _labelLiturgico(hexCode) {
  const hex = (hexCode || '').toLowerCase();
  return ICONES_LITURGICOS[hex] || { icon: '📅', label: 'Celebração' };
}

window.CalendarEngine = {
  ano: 2026,
  mes: 1,
  isAdmin: false,
  selector: null,
  eventosLocal: {},

  // =============================
  // 1 - INÍCIO: init
  // =============================
  // Argumentos: config (Object) -> { selector, isAdmin, ano, mes, comunidadeId }
  // Descrição: Inicializa as configurações do motor e dispara o carregamento de dados.
  init: async function (config) {
    console.log("🔍 Motor: Sincronizando parâmetros iniciais...");

    this.selector = config.selector;
    this.isAdmin = config.isAdmin || false;
    this.ano = config.ano || new Date().getFullYear();
    this.mes = config.mes || (new Date().getMonth() + 1);
    this.comunidadeId = config.comunidadeId || null;

    // Dispara o processo de busca e montagem visual
    await this.carregarERenderizar();
  },
  // =============================
  // 1 - FIM: init
  // =============================

  // =============================
  // 2 - INÍCIO: carregarERenderizar
  // =============================
  // Argumentos: Nenhum
  // Descrição: Busca dados na API e organiza os eventos em Arrays por data (agrupamento).
  carregarERenderizar: async function () {
    const grid = document.querySelector(this.selector);
    if (!grid) {
      console.error("❌ Motor Erro: Container não encontrado:", this.selector);
      return;
    }

    try {
      // Feedback visual de carregamento
      grid.innerHTML =
        '<div style="grid-column: 1/-1; padding: 50px; text-align: center; color: #999;">Sincronizando agenda...</div>';

      const eventos = await window.api.buscarEventos(this.ano, this.mes, this.comunidadeId);

      // MUDANÇA ESTRUTURAL: Agrupamos os eventos em listas (Arrays) dentro do objeto por data
      this.eventosLocal = {};
      eventos.forEach((ev) => {
        if (!this.eventosLocal[ev.data]) {
          this.eventosLocal[ev.data] = [];
        }
        this.eventosLocal[ev.data].push(ev);
      });

      this.renderizarGrid(grid);
    } catch (error) {
      console.error("❌ Motor Erro ao carregar dados:", error);
      grid.innerHTML =
        '<div style="grid-column: 1/-1; padding: 50px; text-align: center; color: red;">Falha na conexão com o banco.</div>';
    }
  },
  // =============================
  // 2 - FIM: carregarERenderizar
  // =============================

  // =============================
  // 3 - INÍCIO: renderizarGrid
  // =============================
  // Argumentos: gridElement (HTMLElement)
  // Descrição: Calcula os dias do mês e constrói o HTML do grid injetando as pílulas.
  renderizarGrid: function (gridElement) {
    // 3.1. Cálculos Matemáticos de Calendário
    const primeiroDia = new Date(this.ano, this.mes - 1, 1).getDay();
    const ultimoDia = new Date(this.ano, this.mes, 0).getDate();
    const ultimoDiaMesAnt = new Date(this.ano, this.mes - 1, 0).getDate();

    // 3.2. Template de Cabeçalho — A11Y-001: scope="col" para leitores de tela
    let html = `
            <div class="day-header" role="columnheader" scope="col" aria-label="Domingo">Dom</div>
            <div class="day-header" role="columnheader" scope="col" aria-label="Segunda-feira">Seg</div>
            <div class="day-header" role="columnheader" scope="col" aria-label="Terça-feira">Ter</div>
            <div class="day-header" role="columnheader" scope="col" aria-label="Quarta-feira">Qua</div>
            <div class="day-header" role="columnheader" scope="col" aria-label="Quinta-feira">Qui</div>
            <div class="day-header" role="columnheader" scope="col" aria-label="Sexta-feira">Sex</div>
            <div class="day-header" role="columnheader" scope="col" aria-label="Sábado">Sáb</div>
        `;

    // 3.3. Preenchimento de dias do mês anterior
    for (let i = primeiroDia - 1; i >= 0; i--) {
      const diaResiduo = ultimoDiaMesAnt - i;
      html += `<div class="day-cell other-month" aria-hidden="true"><span class="day-number">${diaResiduo}</span></div>`;
    }

    // 3.4. Renderização dos dias do mês atual
    for (let dia = 1; dia <= ultimoDia; dia++) {
      const dataISO = `${this.ano}-${String(this.mes).padStart(
        2,
        "0"
      )}-${String(dia).padStart(2, "0")}`;

      // Busca a lista de eventos para este dia específico (Sempre retorna um Array)
      const listaEventosDia = this.eventosLocal[dataISO] || [];

      // A11Y-001: aria-label descritivo com data e quantidade de eventos
      const nomesMeses = ['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro'];
      const qtdEventos = listaEventosDia.length;
      const ariaLabelDia = qtdEventos > 0
        ? `${dia} de ${nomesMeses[this.mes - 1]}, ${qtdEventos} ${qtdEventos === 1 ? 'evento' : 'eventos'}`
        : `${dia} de ${nomesMeses[this.mes - 1]}, sem eventos`;

      // Definição dinâmica do atributo de clique conforme privilégio
      const clickAttr = this.isAdmin
        ? `onclick="window.DashboardController.abrirGerenciadorAgenda('${dataISO}')"`
        : `onclick="window.CalendarUI.abrirModal('${dataISO}')"`;

      // A11Y-001: role="button" + tabindex + onkeydown para navegação por teclado
      const onkeydown = this.isAdmin
        ? `onkeydown="if(event.key==='Enter'||event.key===' '){event.preventDefault();window.DashboardController.abrirGerenciadorAgenda('${dataISO}')}"`
        : `onkeydown="if(event.key==='Enter'||event.key===' '){event.preventDefault();window.CalendarUI.abrirModal('${dataISO}')}"`;

      html += `
        <div class="day-cell" data-iso="${dataISO}" ${clickAttr} ${onkeydown}
             role="button" tabindex="0" aria-label="${ariaLabelDia}">
            <span class="day-number" aria-hidden="true">${dia}</span>
            ${this.gerarPilulas(listaEventosDia)}
        </div>`;
    }

    // 3.5. Injeção Final no DOM
    gridElement.innerHTML = html;
    console.log("✅ Motor: Grid renderizado com sucesso.");
  },
  // =============================
  // 3 - FIM: renderizarGrid
  // =============================

  // =============================
  // 4 - INÍCIO: gerarPilulas (Híbrido v5.6)
  // =============================
  // Argumentos: listaEventos (Array|null)
  // Descrição: Renderiza Pills (Desktop) ou Dots (Mobile)
  gerarPilulas: function (listaEventos) {
    if (!listaEventos || listaEventos.length === 0) return "";

    // Adaptação Mobile: Se for tela pequena, mantém os dots ou usa pílulas compactas?
    // O pedido original substitui tudo, mas para manter a boa UX mobile ( Dots), 
    // vamos manter a verificação de largura se o usuário não pediu explicitamente para remover.
    // MAS, a instrução foi "substitua pela lógica abaixo". Vou seguir a instrução direta 
    // para garantir a funcionalidade das categorias.
    // Se precisar de dots no mobile, o CSS pode tratar (.pill display:none em mobile?)
    // Ou assumimos que o usuário quer pills sempre. Seguiremos o snippet do usuário.

    const isMobile = window.innerWidth <= 768;
    if (isMobile) {
      // A11Y-001 + A11Y-003: dots com role="img" e aria-label descritivo
      return listaEventos.map(ev => {
        let cor = ev.tipo_compromisso === "liturgia"
          ? ev.liturgia_cores?.hex_code || "#2e7d32"
          : "#64748b";

        if (ev.tipo_compromisso === 'atendimento') cor = "#2e3fd1ff";
        if (ev.tipo_compromisso === 'reuniao') cor = "#475569";
        if (ev.tipo_compromisso === 'evento') cor = "#bfa15f";

        if (cor.toLowerCase() === "#ffffff") cor = "#ccc";

        // A11Y-003: label do tempo litúrgico para daltonismo
        const liturgico = ev.tipo_compromisso === 'liturgia'
          ? _labelLiturgico(ev.liturgia_cores?.hex_code)
          : null;
        const labelAcessivel = liturgico
          ? `${liturgico.label} — ${ev.titulo}`
          : ev.titulo;

        return `<span class="event-dot-wrapper" aria-hidden="true">` +
          `<span role="img" aria-label="${labelAcessivel}" title="${labelAcessivel}" ` +
          `style="display:inline-block;width:8px;height:8px;background-color:${cor};border-radius:50%;margin-right:4px;"></span>` +
          `</span>`;
      }).join("");
    }

    return listaEventos.map((evento) => {
      let classeCategoria = "pill--liturgia";
      let icone = "";
      let corLiturgica = evento.liturgia_cores?.hex_code || "#2e7d32";

      // Define a classe e o ícone baseado no tipo
      switch (evento.tipo_compromisso) {
        case 'atendimento':
          classeCategoria = "pill--padre";
          icone = "";
          break;
        case 'reuniao':
          classeCategoria = "pill--reuniao";
          icone = "";
          break;
        case 'evento':
          classeCategoria = "pill--festa";
          icone = "";
          break;
      }

      // Captura o horário (priorizando o campo correto)
      let horaShow = evento.hora_inicio ? evento.hora_inicio.substring(0, 5) :
        (evento.escalas?.[0]?.hora_celebracao.substring(0, 5) || "--:--");

      // A11Y-003: ícone litúrgico para daltonismo
      let iconeTempoLiturgico = '';
      let labelTempoLiturgico = '';
      if (evento.tipo_compromisso === 'liturgia') {
        const liturgico = _labelLiturgico(corLiturgica);
        iconeTempoLiturgico = `<span aria-hidden="true" title="${liturgico.label}">${liturgico.icon}</span>`;
        labelTempoLiturgico = liturgico.label;
      }

      let estiloAdicional = "";
      if (evento.tipo_compromisso === 'liturgia') {
        estiloAdicional = `style="border-left: 4px solid ${corLiturgica} !important;"`;
      } else if (evento.tipo_compromisso === 'atendimento') {
        estiloAdicional = `style="background-color: #2e3fd1ff !important; color: white !important; border: none !important;"`;
      }

      // Badge de comunidade
      let badgeComunidade = "";
      if (evento.comunidade_id && evento.comunidade) {
        const nomeComunidade = evento.comunidade?.nome || 'Comunidade';
        badgeComunidade = `<span class="badge-comunidade" style="display: inline-block;" aria-label="Comunidade: ${nomeComunidade}">🏛️ ${nomeComunidade}</span>`;
      }

      // A11Y-001: aria-label descritivo na pill
      const ariaLabelPill = labelTempoLiturgico
        ? `${evento.titulo}, ${horaShow}, ${labelTempoLiturgico}`
        : `${evento.titulo}, ${horaShow}`;

      return `
            <div class="pill ${classeCategoria}" ${estiloAdicional}
                 title="${evento.titulo}"
                 aria-label="${ariaLabelPill}"
                 aria-hidden="true">
                <span style="font-size: 0.65rem; opacity: 0.8;" aria-hidden="true">${horaShow}</span>
                <span>${iconeTempoLiturgico}${icone} ${evento.titulo}${badgeComunidade}</span>
            </div>
        `;
    }).join("");
  },
  // =============================
  // 4 - FIM: gerarPilulas
  // =============================

  // =============================
  // 5 - INÍCIO: Sync Functions (Público)
  // =============================
  syncGoogle: function (titulo, data, hora) {
    const el = document.getElementById("public-reminder-time");
    const minutes = el ? el.value : 1440; // Default 1 dia

    const start = new Date(data + "T" + (hora || "12:00"));
    const end = new Date(start.getTime() + (60 * 60 * 1000)); // 1 hora duração

    const fmt = (d) => d.toISOString().replace(/-|:|\.\d\d\d/g, "");

    let details = `Lembrete configurado via Sacristia Digital.`;
    if (minutes == 10080) details = "Lembrete: 7 dias antes.";
    if (minutes == 4320) details = "Lembrete: 3 dias antes.";
    if (minutes == 1440) details = "Lembrete: 1 dia antes.";
    if (minutes == 180) details = "Lembrete: 3 horas antes.";

    const url = `https://www.google.com/calendar/render?action=TEMPLATE&text=${encodeURIComponent(titulo)}&dates=${fmt(start)}/${fmt(end)}&details=${encodeURIComponent(details)}&sf=true&output=xml`;
    window.open(url, '_blank');
  },

  syncApple: function (titulo, data, hora) {
    const start = new Date(data + "T" + (hora || "12:00"));
    const icsMsg = `BEGIN:VCALENDAR
VERSION:2.0
PRODID:-//Sacristia Digital//SDS v3.9//PT
BEGIN:VEVENT
UID:${Date.now()}@sacristiadigital.com
DTSTAMP:${start.toISOString().replace(/-|:|\.\d\d\d/g, "")}
DTSTART:${start.toISOString().replace(/-|:|\.\d\d\d/g, "")}
SUMMARY:${titulo}
DESCRIPTION:Event synced from Sacristia Digital
END:VEVENT
END:VCALENDAR`;

    const blob = new Blob([icsMsg], { type: 'text/calendar;charset=utf-8' });
    const link = document.createElement('a');
    link.href = window.URL.createObjectURL(blob);
    link.setAttribute('download', 'evento.ics');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }
};
