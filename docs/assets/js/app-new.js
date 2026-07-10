/*
 * SACRISTIA DIGITAL - Sistema de Gestão Paroquial
 * © 2026 TODOS OS DIREITOS RESERVADOS — Rodrigo Dionízio
 *
 * ARQUIVO: app-new.js
 * DESCRIÇÃO: Calendário Litúrgico Público — NovoDesign v4.0
 * VERSÃO: 4.0 (NovoDesign Port)
 */

// ==========================================================================
// 0. ESTADO GLOBAL
// ==========================================================================
const SD = {
  ano:       new Date().getFullYear(),
  mes:       new Date().getMonth() + 1,
  vista:     null,           // null = auto | "grade" | "agenda"
  comunidade: "",            // "" = todas | "matriz" | UUID
  equipe:    0,              // 0 = todas | ID da equipe
  diaSel:    null,           // ISO date string selecionada → abre modal
  largura:   window.innerWidth,
  dados:     null,           // shape: { comunidades, equipes, eventosPorData, avisos, hoje }
  carregando: false,
};

// Retrocompatibilidade com funções de impressão (gerarRelatorio usa ESTADO)
const ESTADO = {
  get anoAtual()          { return SD.ano; },
  get mesAtual()          { return SD.mes; },
  get comunidadeFiltrada(){ return SD.comunidade || null; },
  listaComunidades:       [],
};

// ==========================================================================
// 1. HELPERS DE TIPO DE EVENTO
// ==========================================================================
function _tipoInfo(ev) {
  switch (ev.tipo_compromisso) {
    case "atendimento":
      return { label: "Atendimento",        cor: "#6E5C50", bg: "#EFEAE2", txt: "#4A3A30" };
    case "reuniao":
      return { label: "Reunião / Pastoral", cor: "#6E5C50", bg: "#EFEAE2", txt: "#4A3A30" };
    case "evento":
      return { label: "Evento / Festa",     cor: "#D9A441", bg: "#FBF3E8", txt: "#A9772A" };
    default: {
      const cor = ev.cor?.hex || "#4C9E81";
      return {
        label: ev.tipo_celebracao === "celebracao_palavra" ? "Celebração da Palavra" : "Liturgia",
        cor,
        bg:  ev.is_solenidade ? "#FBF3E8" : "#F0F7F2",
        txt: "#2A1E18",
      };
    }
  }
}

function _horaDe(ev) {
  return ev.hora_inicio || (ev.escalas && ev.escalas[0] && ev.escalas[0].hora_celebracao?.substring(0,5)) || "";
}

function _iso(a, m, d) {
  return `${a}-${String(m).padStart(2,"0")}-${String(d).padStart(2,"0")}`;
}

// ==========================================================================
// 2. ADAPTADOR: Supabase shape → SD shape
// ==========================================================================
function adaptarEvento(ev) {
  return {
    id:              ev.id,
    data:            ev.data,
    titulo:          ev.titulo,
    tipo_compromisso: ev.tipo_compromisso || "liturgia",
    tipo_celebracao: ev.tipo_celebracao,
    tempo_liturgico: ev.tempo_liturgico,
    cor: {
      hex: ev.liturgia_cores?.hex_code || "#4C9E81",
      txt: ev.liturgia_cores?.hex_code || "#4C9E81",
    },
    is_solenidade:   !!ev.is_solenidade,
    comunidade_id:   ev.comunidade_id || null,
    comunidade:      ev.comunidade || null,
    local:           ev.local,
    hora_inicio:     ev.hora_inicio,
    responsavel:     ev.responsavel,
    escalas: (ev.escalas || []).map(esc => ({
      hora_celebracao: esc.hora_celebracao || esc.hora || "",
      leitura:         esc.equipe_leitura?.nome_equipe || "",
      canto:           esc.equipe_canto?.nome_equipe   || "",
      celebrante_nome: esc.celebrante_nome             || "",
      equipe_mep:      esc.equipe_mep                  || null,
      lista_mesce:     esc.lista_mesce                 || [],
      lista_coroinhas: esc.lista_coroinhas             || [],
    })),
    // mantém o shape original para compatibilidade com gerarHTMLLinhaImpressao
    liturgia_cores:  ev.liturgia_cores,
  };
}

// ==========================================================================
// 3. BUSCA DE DADOS
// ==========================================================================
async function carregarDados() {
  if (SD.carregando) return;
  SD.carregando = true;
  try {
    const [comunidades, equipesRaw, avisos, eventos] = await Promise.all([
      window.api.listarComunidades(),
      window.api.listarEquipes(),
      window.api.buscarAvisos(),
      window.api.buscarEventos(SD.ano, SD.mes),
    ]);

    ESTADO.listaComunidades = comunidades;

    const equipes = equipesRaw.map(e => ({
      id:   e.id,
      nome: e.nome_equipe,
      tipo: e.tipo_atuacao === "Canto" ? "Canto" : "Leitura",
    }));

    const eventosPorData = {};
    (eventos || []).forEach(ev => {
      const adaptado = adaptarEvento(ev);
      (eventosPorData[adaptado.data] = eventosPorData[adaptado.data] || []).push(adaptado);
    });

    // ordena por hora dentro de cada dia
    Object.values(eventosPorData).forEach(lista =>
      lista.sort((a, b) => {
        const ha = a.hora_inicio || a.escalas?.[0]?.hora_celebracao || "23:59";
        const hb = b.hora_inicio || b.escalas?.[0]?.hora_celebracao || "23:59";
        return ha.localeCompare(hb);
      })
    );

    SD.dados = {
      comunidades,
      equipes,
      eventosPorData,
      avisos: (avisos || []).map(av => ({
        ...av,
        prioridade: av.mural_prioridade || 3,
        hora: av.hora_inicio,
      })),
      hoje: new Date().toISOString().slice(0, 10),
    };
  } catch (err) {
    console.error("[SD] Erro ao carregar dados:", err);
  } finally {
    SD.carregando = false;
  }
}

async function recarregarMes() {
  if (!window.api) return;
  try {
    const eventos = await window.api.buscarEventos(SD.ano, SD.mes, SD.comunidade || null);
    const eventosPorData = {};
    (eventos || []).forEach(ev => {
      const adaptado = adaptarEvento(ev);
      (eventosPorData[adaptado.data] = eventosPorData[adaptado.data] || []).push(adaptado);
    });
    Object.values(eventosPorData).forEach(lista =>
      lista.sort((a, b) => {
        const ha = a.hora_inicio || a.escalas?.[0]?.hora_celebracao || "23:59";
        const hb = b.hora_inicio || b.escalas?.[0]?.hora_celebracao || "23:59";
        return ha.localeCompare(hb);
      })
    );
    if (SD.dados) SD.dados.eventosPorData = eventosPorData;
    renderCalendario();
  } catch (err) {
    console.error("[SD] Erro ao recarregar mês:", err);
  }
}

// ==========================================================================
// 4. FILTROS DE EVENTOS
// ==========================================================================
function _eventosDoDia(iso) {
  const D = SD.dados;
  if (!D) return [];
  const nomeEq = SD.equipe ? D.equipes.find(e => e.id === SD.equipe)?.nome : null;
  let evs = D.eventosPorData[iso] || [];
  if (SD.comunidade) {
    evs = evs.filter(ev =>
      SD.comunidade === "matriz" ? !ev.comunidade_id : ev.comunidade_id === SD.comunidade
    );
  }
  if (nomeEq) {
    evs = evs.filter(ev =>
      (ev.escalas || []).some(esc => esc.leitura === nomeEq || esc.canto === nomeEq)
    );
  }
  return evs;
}

// ==========================================================================
// 5. RENDERERS
// ==========================================================================

function renderMonthBar() {
  const nomeMes = new Date(SD.ano, SD.mes - 1).toLocaleString("pt-BR", { month: "long" });
  const titulo = `${nomeMes.charAt(0).toUpperCase() + nomeMes.slice(1)} ${SD.ano}`;
  document.getElementById("sd-month-title").textContent = titulo;
  document.getElementById("print-month-name").textContent = nomeMes.toUpperCase();
  document.getElementById("print-year-val").textContent = SD.ano;

  const vista = SD.vista || (SD.largura < 768 ? "agenda" : "grade");
  document.getElementById("sd-btn-grade").classList.toggle("sd-ativo", vista === "grade");
  document.getElementById("sd-btn-agenda").classList.toggle("sd-ativo", vista === "agenda");
  renderCommunitySelect();
  renderChips();
}

function renderCommunitySelect() {
  const sel = document.getElementById("sd-community-select");
  if (!sel || !SD.dados) return;
  const atual = sel.value;
  sel.innerHTML = '<option value="">📍 Todas as Comunidades</option><option value="matriz">⛪ Matriz</option>';
  (SD.dados.comunidades || [])
    .filter(c => c.id !== "matriz")
    .forEach(c => {
      const opt = document.createElement("option");
      opt.value = c.id;
      opt.textContent = "🏘 " + c.nome;
      sel.appendChild(opt);
    });
  sel.value = atual || SD.comunidade;
}

function renderChips() {
  const bar = document.getElementById("sd-chips-bar");
  if (!bar || !SD.dados) return;
  bar.innerHTML = '<span class="sd-chips-label">Equipes</span>';
  const chips = [{ id: 0, label: "Todas" }].concat(
    (SD.dados.equipes || []).map(e => ({
      id: e.id,
      label: (e.tipo === "Canto" ? "♪ " : "") + e.nome,
    }))
  );
  chips.forEach(chip => {
    const btn = document.createElement("button");
    btn.className = "sd-chip" + (chip.id === SD.equipe ? " sd-ativo" : "");
    btn.setAttribute("aria-pressed", chip.id === SD.equipe);
    btn.textContent = chip.label;
    btn.onclick = () => {
      SD.equipe = (SD.equipe === chip.id && chip.id !== 0) ? 0 : chip.id;
      renderCalendario();
    };
    bar.appendChild(btn);
  });
}

function renderCalendario() {
  renderMonthBar();
  const vista = SD.vista || (SD.largura < 768 ? "agenda" : "grade");
  const gradeWrap  = document.getElementById("sd-grade-wrap");
  const agendaWrap = document.getElementById("sd-agenda-wrap");
  if (vista === "grade") {
    gradeWrap.style.display  = "";
    agendaWrap.style.display = "none";
    renderGrade();
  } else {
    gradeWrap.style.display  = "none";
    agendaWrap.style.display = "";
    renderAgenda();
  }
  renderMural();
}

// --- Grade ---
function renderGrade() {
  const D = SD.dados;
  const hojeIso = D ? D.hoje : new Date().toISOString().slice(0,10);
  const grid = document.getElementById("sd-grade");
  if (!grid) return;

  // Limpeza: mantém cabeçalhos (7 primeiros filhos), remove resto
  while (grid.children.length > 7) grid.removeChild(grid.lastChild);

  const ehMobile = SD.largura < 768;
  const minH = ehMobile ? "64px" : "100px";
  const maxPills = 2;

  const primeiroDow = new Date(SD.ano, SD.mes - 1, 1).getDay();
  const ultimoDia   = new Date(SD.ano, SD.mes, 0).getDate();
  const ultimoAnt   = new Date(SD.ano, SD.mes - 1, 0).getDate();
  const nomesMes    = new Date(SD.ano, SD.mes - 1).toLocaleString("pt-BR", { month: "long" });

  const celulas = [];

  // células de preenchimento (mês anterior)
  for (let i = primeiroDow - 1; i >= 0; i--) {
    celulas.push({ fora: true, num: ultimoAnt - i });
  }

  // células do mês atual
  for (let d = 1; d <= ultimoDia; d++) {
    const iso = _iso(SD.ano, SD.mes, d);
    const evs = _eventosDoDia(iso);
    const ehHoje = iso === hojeIso;
    celulas.push({ fora: false, num: d, iso, evs, ehHoje });
  }

  // preenchimento final
  const resto = celulas.length % 7;
  if (resto) {
    for (let i = 1; i <= 7 - resto; i++) {
      celulas.push({ fora: true, num: i });
    }
  }

  celulas.forEach(c => {
    const btn = document.createElement("button");
    btn.style.minHeight = minH;
    btn.style.cssText = `min-height:${minH};width:100%;min-width:0;box-sizing:border-box;padding:7px 8px;position:relative;display:flex;flex-direction:column;align-items:stretch;gap:4px;overflow:hidden;border:none;text-align:left;font-family:inherit;`;

    if (c.fora) {
      btn.style.background = "var(--cream-200)";
      btn.style.cursor = "default";
      btn.innerHTML = `<span style="font-family:var(--font-serif);font-weight:var(--fw-semibold);font-size:15px;color:var(--text-faint);">${c.num}</span>`;
      grid.appendChild(btn);
      return;
    }

    btn.style.background = c.ehHoje ? "var(--grad-dawn)" : "var(--surface-raised)";
    btn.style.cursor = c.evs.length ? "pointer" : "default";
    btn.style.boxShadow = c.ehHoje ? "inset 0 0 0 2px var(--gold)" : "none";
    btn.setAttribute("aria-label", `${c.num} de ${nomesMes}${c.evs.length ? `, ${c.evs.length} compromisso${c.evs.length>1?"s":""}` : ", sem compromissos"}`);
    btn.dataset.iso = c.iso;

    // linha do número
    const numRow = document.createElement("span");
    numRow.style.cssText = "display:flex;align-items:center;justify-content:space-between;gap:4px;min-width:0;";
    numRow.innerHTML = `<span style="font-family:var(--font-serif);font-weight:var(--fw-semibold);font-size:15px;color:${c.ehHoje ? "var(--graca-red)" : "var(--ink-700)"};">${c.num}</span>`;
    if (c.ehHoje) {
      numRow.innerHTML += `<span style="font-size:9px;font-weight:var(--fw-extra);letter-spacing:var(--tracking-wide);color:var(--gold-deep);background:var(--gold-ray);border-radius:var(--radius-pill);padding:2px 7px;">HOJE</span>`;
    }
    btn.appendChild(numRow);

    if (ehMobile && c.evs.length) {
      // dots em mobile
      const dots = document.createElement("span");
      dots.style.cssText = "display:flex;flex-wrap:wrap;gap:3px;justify-content:center;padding-top:2px;";
      c.evs.forEach(ev => {
        const t = _tipoInfo(ev);
        const dot = document.createElement("span");
        dot.style.cssText = `width:7px;height:7px;border-radius:50%;background:${t.cor};`;
        dots.appendChild(dot);
      });
      btn.appendChild(dots);
    } else {
      // pills em desktop
      const pills = c.evs.slice(0, maxPills);
      const extras = c.evs.length - pills.length;
      pills.forEach(ev => {
        const t = _tipoInfo(ev);
        const hora = _horaDe(ev);
        const pill = document.createElement("span");
        pill.title = ev.titulo;
        pill.style.cssText = `display:flex;align-items:center;gap:5px;font-size:12px;line-height:1.25;padding:3px 7px 3px 6px;border-radius:var(--radius-xs);background:${t.bg};border-left:3px solid ${t.cor};color:${t.txt};overflow:hidden;min-width:0;max-width:100%;box-sizing:border-box;font-weight:${ev.is_solenidade?700:ev.tipo_compromisso==="liturgia"?600:400};`;
        pill.innerHTML = (hora ? `<span style="font-size:10.5px;opacity:.72;font-variant-numeric:tabular-nums;font-weight:700;flex-shrink:0;">${hora.substring(0,5)}</span>` : "") +
          `<span style="overflow:hidden;text-overflow:ellipsis;white-space:nowrap;min-width:0;">${window.api.escapeHtml(ev.titulo)}</span>`;
        btn.appendChild(pill);
      });
      if (extras > 0) {
        const mais = document.createElement("span");
        mais.style.cssText = "font-size:10.5px;font-weight:var(--fw-bold);color:var(--graca-red);padding-left:6px;";
        mais.textContent = `+${extras} mais`;
        btn.appendChild(mais);
      }
    }

    if (c.evs.length) {
      btn.onclick = () => abrirModal(c.iso);
    }
    grid.appendChild(btn);
  });

  // Legenda
  const leg = document.getElementById("sd-grade-legenda");
  if (leg) {
    const itens = [
      { cor: "#4C9E81", label: "Tempo Comum" },
      { cor: "#D9A441", label: "Solenidade" },
      { cor: "#B53325", label: "Festa / Mártires" },
      { cor: "#6E5C50", label: "Reunião / Atendimento" },
    ];
    leg.innerHTML = itens.map(it =>
      `<span class="sd-legenda-item"><span class="sd-legenda-dot" style="background:${it.cor};"></span>${it.label}</span>`
    ).join("");
  }
}

// --- Agenda ---
function renderAgenda() {
  const D = SD.dados;
  const hojeIso = D ? D.hoje : new Date().toISOString().slice(0,10);
  const wrap = document.getElementById("sd-agenda-wrap");
  if (!wrap) return;
  wrap.innerHTML = "";

  const ultimo = new Date(SD.ano, SD.mes, 0).getDate();
  const nomesMes = new Date(SD.ano, SD.mes - 1).toLocaleString("pt-BR", { month: "long" });
  let temItens = false;

  for (let d = 1; d <= ultimo; d++) {
    const iso = _iso(SD.ano, SD.mes, d);
    const evs = _eventosDoDia(iso);
    if (!evs.length) continue;
    temItens = true;

    const dt = new Date(SD.ano, SD.mes - 1, d);
    const ehHoje = iso === hojeIso;
    const primeiro = _tipoInfo(evs[0]);

    const card = document.createElement("button");
    card.className = "sd-agenda-card";
    card.style.borderLeftColor = primeiro.cor;
    card.style.boxShadow = ehHoje ? "0 0 0 2px var(--gold), var(--shadow-md)" : "var(--shadow-sm)";
    card.setAttribute("aria-label", `${d} de ${nomesMes}, ${evs.length} compromisso${evs.length>1?"s":""}. Ver detalhes`);
    card.onclick = () => abrirModal(iso);

    const diasemFmt = dt.toLocaleString("pt-BR", { weekday: "short" }).replace(".","").toUpperCase();
    card.innerHTML = `
      <span class="sd-agenda-data" style="background:${ehHoje ? "var(--grad-dawn)" : "var(--cream-50)"}">
        <span class="sd-agenda-num${ehHoje ? " sd-agenda-num--hoje" : ""}">${d}</span>
        <span class="sd-agenda-diasem">${diasemFmt}</span>
        ${ehHoje ? '<span class="sd-agenda-hoje-badge">HOJE</span>' : ""}
      </span>
      <span class="sd-agenda-eventos">
        ${evs.map((ev, i) => {
          const t = _tipoInfo(ev);
          const com = ev.comunidade_id
            ? (D?.comunidades || []).find(c => c.id === ev.comunidade_id)?.nome
            : null;
          const partes = [t.label];
          if (com) partes.push(com);
          else if (ev.local) partes.push(ev.local);
          const hora = _horaDe(ev) || "—";
          return `
            <span class="sd-agenda-ev-row" style="border-top:${i===0?"none":"1px dashed var(--border)"}">
              <span class="sd-agenda-hora">${hora.substring(0,5)}</span>
              <span class="sd-agenda-ev-info">
                <span class="sd-agenda-ev-titulo">${window.api.escapeHtml(ev.titulo)}</span>
                <span class="sd-agenda-ev-sub">${partes.map(p => window.api.escapeHtml(p)).join(" · ")}</span>
              </span>
            </span>`;
        }).join("")}
      </span>
      <span class="sd-agenda-arrow" aria-hidden="true">›</span>`;
    wrap.appendChild(card);
  }

  if (!temItens) {
    wrap.innerHTML = '<div class="sd-agenda-vazia">Nenhum compromisso encontrado com os filtros atuais.</div>';
  }
}

// --- Mural ---
function renderMural() {
  const D = SD.dados;
  const wrap = document.getElementById("sd-mural-wrap");
  if (!wrap || !D) return;

  const hoje = new Date(D.hoje + "T12:00:00");
  const avisos = D.avisos || [];
  document.getElementById("sd-mural-count").textContent = avisos.length;

  const grid = document.getElementById("sd-mural-grid");
  if (!grid) return;
  grid.innerHTML = "";

  avisos.forEach(av => {
    const dt = new Date((av.data || av.data_inicio || new Date().toISOString().slice(0,10)) + "T12:00:00");
    const diff = Math.round((dt - hoje) / 86400000);
    let tag = `Faltam ${diff} dias`, urg = false;
    if (diff <= 0) { tag = "HOJE"; urg = true; }
    else if (diff === 1) { tag = "AMANHÃ"; urg = true; }
    const prio = { 1: "#B53325", 2: "#D9A441", 3: "#343069" }[av.prioridade || av.mural_prioridade] || "#9C8A7C";
    const dataFmt = dt.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" });

    const card = document.createElement("article");
    card.className = "sd-aviso-card";
    card.style.borderLeftColor = prio;
    card.innerHTML = `
      <div class="sd-aviso-top">
        <span class="sd-aviso-tag" style="color:${urg?"#fff":"var(--text-body)"};background:${urg?"var(--graca-red)":"var(--cream-200)"};${urg?"animation:sdPulse 2.4s ease-in-out infinite;":""}">${tag}</span>
        <span class="sd-aviso-data-fmt">${dataFmt}</span>
      </div>
      <h3 class="sd-aviso-titulo">${window.api.escapeHtml(av.titulo)}</h3>
      <p class="sd-aviso-local">
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/><circle cx="12" cy="10" r="3"/></svg>
        ${window.api.escapeHtml(av.local || "")} · ${av.hora_inicio || av.hora || ""}
      </p>
      <p class="sd-aviso-desc">${window.api.escapeHtml(av.descricao || "")}</p>`;
    grid.appendChild(card);
  });

  wrap.style.display = avisos.length ? "" : "none";
}

// ==========================================================================
// 6. MODAL DE DETALHES DO DIA
// ==========================================================================
function abrirModal(iso) {
  SD.diaSel = iso;
  const D = SD.dados;
  const evs = _eventosDoDia(iso);
  if (!evs.length) return;

  const overlay = document.getElementById("sd-modal-overlay");
  overlay.classList.remove("sd-hidden");
  overlay.setAttribute("aria-hidden", "false");

  const dt = new Date(iso + "T12:00:00");
  const primeiro = _tipoInfo(evs[0]);

  document.getElementById("sd-modal-stripe").style.background = primeiro.cor;
  document.getElementById("sd-modal-day-num").textContent = dt.getDate();
  document.getElementById("sd-modal-month").textContent =
    dt.toLocaleString("pt-BR", { month: "long" }).toUpperCase();
  document.getElementById("sd-modal-weekday").textContent =
    dt.toLocaleString("pt-BR", { weekday: "long" }).toUpperCase();

  const IC = {
    leitura:    "assets/img/icones/leitores.png",
    canto:      "assets/img/icones/canto.png",
    celebrante: "assets/img/icones/celebrante.png",
    mep:        "assets/img/icones/mep.png",
    mesce:      "assets/img/icones/mesce.png",
    coroinhas:  "assets/img/icones/coroinhas.png",
  };

  const body = document.getElementById("sd-modal-body");
  body.innerHTML = evs.map((ev, i) => {
    const t = _tipoInfo(ev);
    const ehLit = !ev.tipo_compromisso || ev.tipo_compromisso === "liturgia";
    const com = ev.comunidade_id
      ? (D?.comunidades || []).find(c => c.id === ev.comunidade_id)
      : null;
    const infos = [];
    if (!ehLit) {
      if (ev.hora_inicio) infos.push(["Horário", ev.hora_inicio.substring(0,5)]);
      if (ev.local)       infos.push(["Local",   ev.local]);
      if (ev.responsavel) infos.push(["Responsável", ev.responsavel]);
    }
    const tempoLabel = ehLit
      ? (ev.tempo_liturgico || "Paroquial") + (ev.is_solenidade ? " · Solenidade" : "")
      : t.label;

    const escalasHTML = (ev.escalas || []).map(esc => {
      const hora = esc.hora_celebracao ? esc.hora_celebracao.substring(0,5) : "—";
      const linhas = [];
      if (esc.leitura)         linhas.push([IC.leitura,    "Leitores",   esc.leitura]);
      if (esc.canto)           linhas.push([IC.canto,      "Canto",      esc.canto]);
      if (esc.celebrante_nome) linhas.push([IC.celebrante, "Celebrante", esc.celebrante_nome]);
      if (esc.equipe_mep?.nome_equipe) linhas.push([IC.mep, "Presidente", esc.equipe_mep.nome_equipe]);

      const listas = [];
      if (esc.lista_mesce?.length)
        listas.push([IC.mesce, "MESCE", esc.lista_mesce, "var(--graca-red-100)", "var(--graca-red-700)", "var(--graca-red-300)"]);
      if (esc.lista_coroinhas?.length)
        listas.push([IC.coroinhas, "Coroinhas", esc.lista_coroinhas, "#FBF3E8", "var(--gold-deep)", "var(--gold-ray)"]);

      return `
        <div class="sd-escala-group">
          <span class="sd-escala-hora">${hora}</span>
          <div class="sd-escala-rows">
            ${linhas.map(([icon, lbl, val]) => `
              <span class="sd-escala-row">
                <img src="${icon}" alt="" class="sd-escala-icon">
                <span class="sd-escala-label">${lbl}</span>
                <span class="sd-escala-valor">${window.api.escapeHtml(val)}</span>
              </span>`).join("")}
            ${listas.map(([icon, lbl, nomes, pillBg, pillCor, pillBorda]) => `
              <span class="sd-escala-lista-row">
                <img src="${icon}" alt="" class="sd-escala-icon">
                <span class="sd-escala-lista-label">${lbl}</span>
                <span class="sd-escala-pills">
                  ${nomes.map(n => `<span style="background:${pillBg};color:${pillCor};border:1px solid ${pillBorda};padding:2px 10px;border-radius:var(--radius-pill);font-size:12.5px;font-weight:var(--fw-bold);">${window.api.escapeHtml(n)}</span>`).join("")}
                </span>
              </span>`).join("")}
          </div>
        </div>`;
    }).join("");

    return `
      <div style="border-top:${i===0?"none":"2px dashed var(--border)"};padding-top:${i===0?"0":"16px"};margin-top:${i===0?"0":"16px"};">
        <p class="sd-modal-ev-tempo" style="color:${ehLit ? (ev.cor?.txt || t.cor) : t.cor}">${window.api.escapeHtml(tempoLabel)}</p>
        <h3 class="sd-modal-ev-titulo">${window.api.escapeHtml(ev.titulo)}</h3>
        ${com ? `<p class="sd-modal-comunidade"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/><circle cx="12" cy="10" r="3"/></svg>${window.api.escapeHtml(com.nome + (com.endereco ? " — " + com.endereco : ""))}</p>` : ""}
        ${infos.map(([k, v]) => `<p class="sd-modal-info-row"><strong class="sd-modal-info-key">${k}:</strong>${window.api.escapeHtml(v)}</p>`).join("")}
        ${escalasHTML}
      </div>`;
  }).join("");

  // Botões de calendário
  const ev0 = evs[0];
  const hora0 = (_horaDe(ev0) || "08:00").replace(":","") + "00";
  const dataC = iso.replace(/-/g,"");
  const googleUrl = `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${encodeURIComponent(ev0.titulo)}&dates=${dataC}T${hora0}/${dataC}T${hora0}&details=${encodeURIComponent("Paróquia Senhor Bom Jesus — Itabirinha/MG")}`;

  document.getElementById("sd-btn-google").onclick = () => window.open(googleUrl, "_blank");
  document.getElementById("sd-btn-ics").onclick = () => {
    const ics = ["BEGIN:VCALENDAR","VERSION:2.0","BEGIN:VEVENT",
      `DTSTART:${dataC}T${hora0}`,`SUMMARY:${ev0.titulo}`,
      "DESCRIPTION:Paróquia Senhor Bom Jesus — Itabirinha/MG",
      "END:VEVENT","END:VCALENDAR"].join("\r\n");
    const blob = new Blob([ics], { type: "text/calendar" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "compromisso-paroquia.ics";
    a.click();
    URL.revokeObjectURL(a.href);
  };
}

function fecharModal() {
  SD.diaSel = null;
  const overlay = document.getElementById("sd-modal-overlay");
  overlay.classList.add("sd-hidden");
  overlay.setAttribute("aria-hidden", "true");
}

// Retrocompat com código legado chamado por gerarRelatorio
window.fecharModalForce = function() { fecharModal(); };

// ==========================================================================
// 7. NAVEGAÇÃO
// ==========================================================================
function mesAnterior() {
  SD.mes--;
  if (SD.mes < 1) { SD.mes = 12; SD.ano--; }
  recarregarMes();
}

function mesProximo() {
  SD.mes++;
  if (SD.mes > 12) { SD.mes = 1; SD.ano++; }
  recarregarMes();
}

function irParaHoje() {
  const hoje = new Date();
  SD.ano = hoje.getFullYear();
  SD.mes = hoje.getMonth() + 1;
  recarregarMes();
}

function filtrarPorComunidade(valor) {
  SD.comunidade = valor || "";
  recarregarMes();
}

// ==========================================================================
// 8. IMPRESSÃO
// ==========================================================================
function abrirOpcoesImpressao() {
  document.getElementById("sd-print-modal-overlay").classList.remove("sd-hidden");
}

window.gerarRelatorio = async function(tipo) {
  // fecha modal de opções, mostra feedback
  document.getElementById("sd-print-modal-overlay").classList.add("sd-hidden");

  let dataInicio, dataFim, tituloRelatorio;
  const ano = SD.ano, mes = SD.mes;

  if (tipo === "mes_atual") {
    const ultimoDia = new Date(ano, mes, 0).getDate();
    dataInicio = `${ano}-${String(mes).padStart(2,"0")}-01`;
    dataFim    = `${ano}-${String(mes).padStart(2,"0")}-${ultimoDia}`;
    tituloRelatorio = new Date(ano, mes - 1).toLocaleString("pt-BR", { month: "long" }).toUpperCase();
  } else if (tipo === "trimestre") {
    dataInicio = `${ano}-${String(mes).padStart(2,"0")}-01`;
    const fimDate = new Date(ano, mes + 2, 0);
    dataFim = fimDate.toISOString().split("T")[0];
    tituloRelatorio = "RELATÓRIO TRIMESTRAL";
  } else {
    dataInicio = `${ano}-01-01`;
    dataFim    = `${ano}-12-31`;
    tituloRelatorio = `ANO DE ${ano}`;
  }

  try {
    let eventos;
    if (tipo === "ano_completo") {
      eventos = [];
      for (let m = 1; m <= 12; m++) {
        const evMes = await window.api.buscarEventos(ano, m, SD.comunidade || null);
        eventos.push(...evMes);
      }
      eventos.sort((a,b) => a.data > b.data ? 1 : -1);
    } else if (tipo === "mes_atual") {
      eventos = await window.api.buscarEventos(ano, mes, SD.comunidade || null);
    } else {
      if (SD.comunidade) {
        eventos = [];
        for (let i = 0; i < 3; i++) {
          const m = ((mes - 1 + i) % 12) + 1;
          const a = ano + Math.floor((mes - 1 + i) / 12);
          eventos.push(...await window.api.buscarEventos(a, m, SD.comunidade || null));
        }
        eventos.sort((a,b) => a.data > b.data ? 1 : -1);
      } else {
        eventos = await window.api.buscarEventosRange(dataInicio, dataFim);
      }
    }

    document.getElementById("print-month-name").textContent = tituloRelatorio;
    document.getElementById("print-year-val").textContent = ano;
    document.getElementById("print-footer-date").textContent = new Date().toLocaleString("pt-BR");

    const tbody = document.getElementById("print-table-body");
    tbody.innerHTML = "";

    if (!eventos.length) {
      tbody.innerHTML = '<tr><td colspan="3" style="text-align:center;padding:20px;font-style:italic;color:#666;">Nenhum evento encontrado neste período.</td></tr>';
    } else {
      let mesAtualProc = -1;
      eventos.forEach(ev => {
        const dataObj = new Date(ev.data + "T12:00:00");
        const mesEv = dataObj.getMonth();
        if (tipo !== "mes_atual" && mesEv !== mesAtualProc) {
          const nomeMesSep = dataObj.toLocaleString("pt-BR", { month: "long" }).toUpperCase();
          const anoSep = dataObj.getFullYear();
          const trSep = document.createElement("tr");
          trSep.innerHTML = `<td colspan="3" class="print-mes-separator">${nomeMesSep} DE ${anoSep}</td>`;
          tbody.appendChild(trSep);
          mesAtualProc = mesEv;
        }
        const diaSemana = dataObj.getDay();
        const isDomingo = diaSemana === 0;
        const isSolenidade = ev.is_solenidade === true;
        let classeCategoria = "";
        switch (ev.tipo_compromisso) {
          case "atendimento": classeCategoria = "cat-padre";  break;
          case "reuniao":     classeCategoria = "cat-reuniao"; break;
          case "evento":      classeCategoria = "cat-festa";   break;
          default:
            classeCategoria = (isDomingo || isSolenidade)
              ? "row-domingo"
              : _classeTempoLiturgico(ev.liturgia_cores?.hex_code, ev.tempo_liturgico);
        }
        let htmlRow = gerarHTMLLinhaImpressao(ev);
        if (classeCategoria) htmlRow = htmlRow.replace("<tr>", `<tr class="${classeCategoria}">`);
        tbody.innerHTML += htmlRow;
      });
    }
    setTimeout(() => window.print(), 400);
  } catch (err) {
    console.error(err);
    alert("Erro ao gerar relatório: " + err.message);
  }
};

// Helpers de impressão (preservados do v3.6.0)
function _classeTempoLiturgico(hexCode, tempoLiturgico) {
  const t = (tempoLiturgico || "").toLowerCase();
  if (t.includes("quaresma") || t.includes("advento") || t.includes("semana santa") || t.includes("tríduo")) return "row-liturgia-roxo";
  if (t.includes("pentecost") || t.includes("ramos") || t.includes("paixão")) return "row-liturgia-vermelho";
  if (t.includes("rosa") || t.includes("gaudete") || t.includes("laetare")) return "row-liturgia-rosa";
  if (t.includes("pascal") || t.includes("natal") || t.includes("epifan") || t.includes("batismo")) return "";
  return "row-liturgia-verde";
}

function _badgeTempoLiturgico(tempoTxt) {
  const t = (tempoTxt || "").toLowerCase();
  let bg, cor, border;
  if (t.includes("quaresma") || t.includes("advento") || t.includes("semana santa") || t.includes("tríduo")) {
    bg = "#ede7f6"; cor = "#4a148c"; border = "#6a1b9a";
  } else if (t.includes("pentecost") || t.includes("ramos") || t.includes("paixão")) {
    bg = "#ffebee"; cor = "#7b1526"; border = "#c62828";
  } else if (t.includes("rosa") || t.includes("gaudete") || t.includes("laetare")) {
    bg = "#fce4ec"; cor = "#880e4f"; border = "#d81b60";
  } else if (t.includes("pascal") || t.includes("natal") || t.includes("epifan") || t.includes("batismo")) {
    bg = "#fff8dc"; cor = "#7a5a00"; border = "#bfa15f";
  } else { bg = "#e8f5e9"; cor = "#1b5e20"; border = "#2e7d32"; }
  return `<span style="display:inline-block;background:${bg};color:${cor};border-left:3px solid ${border};font-size:7pt;font-weight:700;text-transform:uppercase;letter-spacing:0.5px;padding:2px 7px;margin-top:4px;">${window.api.escapeHtml(tempoTxt)}</span>`;
}

function gerarHTMLLinhaImpressao(evento) {
  if (!evento.titulo) return "";
  const dataObj = new Date(evento.data + "T12:00:00");
  const diaNum  = dataObj.getDate().toString().padStart(2,"0");
  const diaSem  = dataObj.toLocaleString("pt-BR", { weekday: "short" }).toUpperCase().replace(".","");

  let corDia = "#a41d31";
  if (evento.tipo_compromisso !== "liturgia") {
    corDia = "#444";
  } else if (evento.liturgia_cores?.hex_code) {
    const hex = evento.liturgia_cores.hex_code.toLowerCase();
    corDia = (hex === "#ffffff" || hex === "#f5f5f5") ? "#a41d31" : evento.liturgia_cores.hex_code;
  }

  const tempoTxt = evento.tempo_liturgico || evento.tipo_compromisso || "";
  const badgeTempo = _badgeTempoLiturgico(tempoTxt);

  let badgeComunidade = "";
  if (evento.comunidade_id) {
    const com = evento.comunidade || ESTADO.listaComunidades.find(c => c.id === evento.comunidade_id);
    if (com) {
      const nome = window.api.escapeHtml(com.nome || "Comunidade");
      badgeComunidade = ` <span style="display:inline-block;background:#fff3cd;color:#856404;border:1px solid #fbb558;padding:1px 7px;border-radius:3px;font-size:7.5pt;font-weight:700;margin-left:5px;">${nome}</span>`;
    }
  }

  let htmlEscalas = "";
  if (evento.tipo_compromisso === "liturgia" && evento.escalas?.length) {
    evento.escalas.forEach(esc => {
      const hora = (esc.hora_celebracao || "").substring(0,5);
      const leit = window.api.escapeHtml(esc.equipe_leitura?.nome_equipe || esc.leitura || "–");
      const cant = window.api.escapeHtml(esc.equipe_canto?.nome_equipe  || esc.canto  || "–");
      let linhaEquipes = `<b style="color:#1b5e20;">Leit.</b> ${leit} &nbsp; <b style="color:#a41d31;">Canto</b> ${cant}`;
      if (evento.tipo_celebracao === "missa" && esc.celebrante_nome) {
        linhaEquipes += `<br><span style="color:#555;font-size:8pt;">Celebrante: ${window.api.escapeHtml(esc.celebrante_nome)}</span>`;
      } else if (evento.tipo_celebracao === "celebracao_palavra" && (esc.equipe_mep?.nome_equipe || esc.mep)) {
        linhaEquipes += `<br><span style="color:#555;font-size:8pt;">Presidência: ${window.api.escapeHtml(esc.equipe_mep?.nome_equipe || esc.mep)}</span>`;
      }
      if (esc.lista_mesce?.length)
        linhaEquipes += `<br><span style="color:#7a5a00;font-size:8pt;"><b>MESCE:</b> ${esc.lista_mesce.map(n => window.api.escapeHtml(n)).join(", ")}</span>`;
      if (esc.lista_coroinhas?.length)
        linhaEquipes += `<br><span style="color:#555;font-size:8pt;"><b>Coroinhas:</b> ${esc.lista_coroinhas.map(n => window.api.escapeHtml(n)).join(", ")}</span>`;
      htmlEscalas += `<div class="print-escala-row" style="margin-bottom:6px;display:flex;align-items:flex-start;gap:7px;"><span class="print-hora">${hora}</span><span class="print-equipes">${linhaEquipes}</span></div>`;
    });
  } else {
    const hora  = evento.hora_inicio ? evento.hora_inicio.substring(0,5) : "--:--";
    const local = evento.local ? window.api.escapeHtml(evento.local) : "";
    htmlEscalas = `<div class="print-escala-row" style="display:flex;align-items:flex-start;gap:7px;"><span class="print-hora">${hora}</span><span class="print-equipes" style="color:#555;">${local}</span></div>`;
  }

  return `<tr><td class="col-data"><span class="dia-grande" style="color:${corDia}">${diaNum}</span><span class="dia-sem">${diaSem}</span></td><td style="vertical-align:top;padding-top:10px;"><div class="print-titulo">${window.api.escapeHtml(evento.titulo)}${badgeComunidade}</div>${badgeTempo}</td><td>${htmlEscalas}</td></tr>`;
}

// ==========================================================================
// 9. INICIALIZAÇÃO
// ==========================================================================
document.addEventListener("DOMContentLoaded", async () => {
  document.body.classList.add("sd-active");

  // Listeners globais
  window.addEventListener("resize", () => {
    SD.largura = window.innerWidth;
    renderCalendario();
  });
  window.addEventListener("keydown", e => {
    if (e.key === "Escape") {
      fecharModal();
      document.getElementById("sd-print-modal-overlay").classList.add("sd-hidden");
    }
  });

  // Botões de navegação
  document.getElementById("sd-btn-ant").onclick    = mesAnterior;
  document.getElementById("sd-btn-prox").onclick   = mesProximo;
  document.getElementById("sd-btn-hoje").onclick   = irParaHoje;
  document.getElementById("sd-btn-grade").onclick  = () => { SD.vista = "grade";  renderCalendario(); };
  document.getElementById("sd-btn-agenda").onclick = () => { SD.vista = "agenda"; renderCalendario(); };
  document.getElementById("sd-btn-imprimir").onclick = abrirOpcoesImpressao;
  document.getElementById("sd-community-select").onchange = e => filtrarPorComunidade(e.target.value);

  // Modal de detalhes
  document.getElementById("sd-modal-overlay").onclick = e => {
    if (e.target === document.getElementById("sd-modal-overlay")) fecharModal();
  };
  document.getElementById("sd-modal-close").onclick = fecharModal;

  // Modal de impressão
  document.getElementById("sd-print-modal-overlay").onclick = e => {
    if (e.target === document.getElementById("sd-print-modal-overlay"))
      document.getElementById("sd-print-modal-overlay").classList.add("sd-hidden");
  };
  document.getElementById("sd-print-cancel").onclick = () =>
    document.getElementById("sd-print-modal-overlay").classList.add("sd-hidden");

  // Carrega dados e renderiza
  await carregarDados();
  if (SD.dados) renderCommunitySelect();
  renderCalendario();

  // Swipe no calendário (mobile)
  const gradeWrap = document.getElementById("sd-grade-wrap");
  let swipeX = 0;
  gradeWrap.addEventListener("touchstart", e => { swipeX = e.touches[0].clientX; }, { passive: true });
  gradeWrap.addEventListener("touchend", e => {
    const dx = e.changedTouches[0].clientX - swipeX;
    if (Math.abs(dx) < 60) return;
    if (dx < 0) mesProximo(); else mesAnterior();
  }, { passive: true });
});
