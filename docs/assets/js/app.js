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
 * ARQUIVO: app.js
 * DESCRIÇÃO: Controlador Principal
 * VERSÃO: 10.0 (Gold Master)
 */

console.log("🚀 Sistema Litúrgico V10.0 Iniciado");

// ==========================================================================
// 0. ESTADO GLOBAL & CONSTANTES
// ==========================================================================
const ESTADO = {
  anoAtual: new Date().getFullYear(),   // 🟢 Captura ano do sistema
  mesAtual: new Date().getMonth() + 1,  // 🟢 Captura mês do sistema (Janeiro = 1)
  dadosEventos: {},
  isAdmin: false,
  listaEquipes: [],
  filtrosAtivos: new Set(),
  comunidadeFiltrada: null, // 🆕 ID da comunidade filtrada (null = todas, 'matriz' = só matriz)
  listaComunidades: [], // 🆕 Cache de comunidades
  ultimaSync: null, // 🆕 Timestamp da última sincronização
  syncInterval: null, // 🆕 Referência do intervalo de sync
};

// ==========================================================================
// 0.1. SISTEMA DE SINCRONIZAÇÃO INTELIGENTE (PWA)
// ==========================================================================
const SyncManager = {
  SYNC_INTERVAL_MS: 5 * 60 * 1000, // 5 minutos
  MIN_REVALIDATE_MS: 2 * 60 * 1000, // 2 minutos mínimo entre revalidações
  
  /**
   * Inicializa o sistema de sincronização
   */
  init: function() {
    console.log('🔄 [SYNC] Inicializando sistema de sincronização...');
    
    // Recupera timestamp da última sync do localStorage
    ESTADO.ultimaSync = window.api.getLastSyncTime();
    
    // Configura listeners
    this.setupVisibilityListener();
    this.setupOnlineListener();
    this.setupSwUpdateListener();
    this.setupForceRefreshListener();
    
    // Inicia intervalo de sync automático
    this.startAutoSync();
    
    // Renderiza indicador de status
    this.renderSyncIndicator();
    
    console.log('✅ [SYNC] Sistema de sincronização ativo');
  },
  
  /**
   * Detecta quando o app volta do background
   */
  setupVisibilityListener: function() {
    document.addEventListener('visibilitychange', async () => {
      if (document.visibilityState === 'visible') {
        console.log('👁️ [SYNC] App voltou ao foco');
        const tempoDesdeUltimaSync = Date.now() - (ESTADO.ultimaSync || 0);
        
        if (tempoDesdeUltimaSync > this.MIN_REVALIDATE_MS) {
          console.log(`🔄 [SYNC] Revalidando dados (última sync: ${Math.round(tempoDesdeUltimaSync / 60000)}min atrás)`);
          await this.syncData();
        }
      }
    });
  },
  
  /**
   * Detecta quando o dispositivo reconecta à internet
   */
  setupOnlineListener: function() {
    window.addEventListener('online', async () => {
      console.log('🌐 [SYNC] Conexão reestabelecida');
      this.showToast('Conexão reestabelecida. Atualizando dados...', 'info');
      await this.syncData();
    });
    
    window.addEventListener('offline', () => {
      console.log('📴 [SYNC] Dispositivo offline');
      this.showToast('Você está offline. Dados em cache serão utilizados.', 'warning');
      this.updateSyncIndicator('offline');
    });
  },
  
  /**
   * Detecta quando o Service Worker tem update
   */
  setupSwUpdateListener: function() {
    window.addEventListener('sacristia:swUpdate', (e) => {
      console.log('🆕 [SYNC] Nova versão do app disponível');
      this.showUpdateBanner(e.detail.registration);
    });
  },
  
  /**
   * Listener para forçar refresh (chamado de api.forceRefresh)
   */
  setupForceRefreshListener: function() {
    window.addEventListener('sacristia:forceRefresh', async () => {
      await this.syncData();
    });
  },
  
  /**
   * Inicia intervalo de sync automático
   */
  startAutoSync: function() {
    if (ESTADO.syncInterval) {
      clearInterval(ESTADO.syncInterval);
    }
    
    ESTADO.syncInterval = setInterval(async () => {
      if (navigator.onLine && document.visibilityState === 'visible') {
        console.log('⏰ [SYNC] Auto-sync disparado');
        await this.syncData(true); // silencioso
      }
    }, this.SYNC_INTERVAL_MS);
  },
  
  /**
   * Executa sincronização de dados
   */
  syncData: async function(silent = false) {
    if (!navigator.onLine) {
      console.log('📴 [SYNC] Offline - usando cache');
      return;
    }
    
    try {
      if (!silent) {
        this.updateSyncIndicator('syncing');
      }
      
      // Limpa cache para forçar busca fresca
      window.api.clearCache();
      
      // Recarrega o mês atual
      await carregarMes(ESTADO.anoAtual, ESTADO.mesAtual);
      
      // Atualiza mural
      await renderizarMural();
      
      ESTADO.ultimaSync = Date.now();
      this.updateSyncIndicator('synced');
      
      if (!silent) {
        this.showToast('Dados atualizados', 'success');
      }
      
      console.log('✅ [SYNC] Sincronização concluída');
    } catch (err) {
      console.error('❌ [SYNC] Erro na sincronização:', err);
      this.updateSyncIndicator('error');
    }
  },
  
  /**
   * Renderiza indicador visual de status no header
   */
  renderSyncIndicator: function() {
    // Verifica se já existe
    if (document.getElementById('sync-indicator')) return;
    
    const header = document.querySelector('header');
    if (!header) return;
    
    const indicator = document.createElement('div');
    indicator.id = 'sync-indicator';
    indicator.className = 'sync-indicator';
    indicator.innerHTML = `
      <span class="sync-icon">●</span>
      <span class="sync-text">Sincronizado</span>
    `;
    indicator.title = 'Status da sincronização de dados';
    indicator.onclick = () => this.syncData();
    
    header.appendChild(indicator);
    this.updateSyncIndicator(navigator.onLine ? 'synced' : 'offline');
  },
  
  /**
   * Atualiza o indicador visual de sync
   */
  updateSyncIndicator: function(status) {
    const indicator = document.getElementById('sync-indicator');
    if (!indicator) return;
    
    const icon = indicator.querySelector('.sync-icon');
    const text = indicator.querySelector('.sync-text');
    
    indicator.className = `sync-indicator sync-${status}`;
    
    switch(status) {
      case 'syncing':
        icon.textContent = '↻';
        text.textContent = 'Sincronizando...';
        break;
      case 'synced':
        icon.textContent = '●';
        const minutos = ESTADO.ultimaSync 
          ? Math.round((Date.now() - ESTADO.ultimaSync) / 60000)
          : 0;
        text.textContent = minutos > 0 ? `Há ${minutos}min` : 'Atualizado';
        break;
      case 'offline':
        icon.textContent = '○';
        text.textContent = 'Offline';
        break;
      case 'error':
        icon.textContent = '!';
        text.textContent = 'Erro';
        break;
    }
  },
  
  /**
   * Mostra banner de atualização do app
   */
  showUpdateBanner: function(registration) {
    // Remove banner existente
    const existing = document.getElementById('update-banner');
    if (existing) existing.remove();
    
    const banner = document.createElement('div');
    banner.id = 'update-banner';
    banner.className = 'update-banner';
    banner.innerHTML = `
      <div class="update-content">
        <span>🆕 Nova versão disponível!</span>
        <button id="btn-update-app">Atualizar agora</button>
        <button id="btn-dismiss-update" class="btn-dismiss">✕</button>
      </div>
    `;
    
    document.body.prepend(banner);
    
    // Handler para atualizar
    document.getElementById('btn-update-app').onclick = () => {
      if (registration.waiting) {
        registration.waiting.postMessage('skipWaiting');
      }
      banner.remove();
    };
    
    // Handler para dispensar
    document.getElementById('btn-dismiss-update').onclick = () => {
      banner.remove();
    };
  },
  
  /**
   * Mostra toast de notificação
   */
  showToast: function(message, type = 'info') {
    // Remove toast existente
    const existing = document.querySelector('.sync-toast');
    if (existing) existing.remove();
    
    const toast = document.createElement('div');
    toast.className = `sync-toast sync-toast-${type}`;
    toast.textContent = message;
    
    document.body.appendChild(toast);
    
    // Anima entrada
    setTimeout(() => toast.classList.add('show'), 10);
    
    // Remove após 3 segundos
    setTimeout(() => {
      toast.classList.remove('show');
      setTimeout(() => toast.remove(), 300);
    }, 3000);
  }
};

let eventoEmEdicao = null;
let cacheEquipesLeitura = [];
let cacheEquipesCanto = [];

const ICONS = {
  leitura:
    '<img src="assets/img/icones/leitores.png" alt="Ícone de Leitores" class="equipe-icon" />',
  canto:
    '<img src="assets/img/icones/canto.png" alt="Ícone de Canto" class="equipe-icon" />',
  celebrante:
    '<img src="assets/img/icones/celebrante.png" alt="Ícone de Celebrante" class="equipe-icon" />',
  mep: '<img src="assets/img/icones/mep.png" alt="Ícone do Ministro da Palavra" class="equipe-icon" />',
  mesce:
    '<img src="assets/img/icones/mesce.png" alt="Ícone do Ministro da Eucaristia" class="equipe-icon" />',
  coroinhas:
    '<img src="assets/img/icones/coroinhas.png" alt="Ícone de Coroinhas" class="equipe-icon" />',
};
/*const ICONS = {
  leitura:
    '<svg class="equipe-icon" viewBox="0 0 24 24" fill="currentColor" style="color:var(--cor-vinho)"><path d="M12 3v18.5c-2.3-.6-4.4-1-6.5-1-2.4 0-4.6.5-6.5 1.2V3.2C1.4 2.5 3.6 2 6 2c2.1 0 4.1.4 6 1zm10.5-.8c-1.9-.7-4.1-1.2-6.5-1.2v18.5c2.1 0 4.2.4 6.5 1V3.2z"/></svg>',
  canto:
    '<svg class="equipe-icon" viewBox="0 0 24 24" fill="currentColor" style="color:var(--cor-dourado)"><path d="M12 3v10.55c-.59-.34-1.27-.55-2-.55-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4V7h4V3h-6z"/></svg>',
  celebrante: '🐑',
  mep: '📜',
  mesce: '✨',
  coroinhas: '🕯️',
};
*/
// ==========================================================================
// 1. INICIALIZAÇÃO
// ==========================================================================
document.addEventListener("DOMContentLoaded", async () => {
  // 1.1. Autenticação
  const session = await window.api.checkSession();
  if (session) {
    ESTADO.isAdmin = true;
    console.log("👑 Admin: ", session.user.email);
    adicionarBotaoLogout();
  } else {
    adicionarBotaoLogin();
  }

  // 1.2. Dados Básicos
  ESTADO.listaEquipes = await window.api.listarEquipes();
  cacheEquipesLeitura = ESTADO.listaEquipes.filter(
    (e) => e.tipo_atuacao === "Leitura" || e.tipo_atuacao === "Ambos",
  );
  cacheEquipesCanto = ESTADO.listaEquipes.filter(
    (e) => e.tipo_atuacao === "Canto" || e.tipo_atuacao === "Ambos",
  );

  // BUG-001: flag __FORCE_RELOAD_COMUNIDADES removida — filtro .eq("ativo", true) corrigido no banco
  ESTADO.listaComunidades = await window.api.listarComunidades();
  
  if (!ESTADO.listaComunidades || ESTADO.listaComunidades.length === 0) {
    console.error("⚠️ [APP] ATENÇÃO: Nenhuma comunidade foi carregada!");
    console.error("🔧 [APP] Possíveis causas:");
    console.error("   1. Todas as comunidades estão com ativo=false no banco");
    console.error("   2. Erro na query Supabase (verificar RLS)");
    console.error("   3. Cache corrompido (limpe o sessionStorage)");
    console.error("   4. Tipo de dado 'ativo' está como string ao invés de boolean");
    console.error("🛠️ [APP] TESTE: Abra o Supabase SQL Editor e execute:");
    console.error("   SELECT id, nome, ativo, pg_typeof(ativo) as tipo FROM comunidades;");
  }

  // 1.3. Interface
  inicializarSidebar();
  renderizarMural();
  inicializarFiltroComunidades(); // 🆕 Renderizar filtro de comunidades (sidebar)
  inicializarFiltroComunidadesHeader(); // 🆕 Renderizar filtro no header do calendário
  await carregarMes(ESTADO.anoAtual, ESTADO.mesAtual); // 🟢 Aguarda renderização completa
  configurarBotoesNavegacao();
  
  // 1.3.1. Destaque visual do dia atual (auto-aplicado na inicialização)
  setTimeout(() => {
    destacarDiaAtual();
  }, 150); // Delay para garantir que renderização finalizou

  // 1.4. Sistema de Sincronização Inteligente PWA
  SyncManager.init();
});

// ==========================================================================
// 2. MURAL DE AVISOS (ABAIXO DO CALENDÁRIO)
// ==========================================================================
async function renderizarMural() {
  const container = document.querySelector(".mural-avisos-wrapper");
  if (!container) return;

  container.innerHTML =
    '<div style="padding:20px; color:#888; font-size:0.8rem;">Carregando avisos...</div>';

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
      // Correção de Data e Hora
      const dataEvento = new Date(aviso.data + "T12:00:00");
      const hoje = new Date();
      hoje.setHours(0, 0, 0, 0);

      const diffDias = Math.ceil((dataEvento - hoje) / (1000 * 60 * 60 * 24));

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

      // Exibe hora se disponível
      const horaShow = aviso.hora_inicio
        ? ` • ${aviso.hora_inicio.substring(0, 5)}`
        : "";

      // Descrição truncada (se existir)
      const descricaoHTML = aviso.descricao 
        ? `<div class="aviso-descricao">${aviso.descricao}</div>` 
        : '';

      html += `
            <div class="aviso-card prio-${aviso.mural_prioridade}">
                <div style="display:flex; justify-content:space-between; align-items:center;">
                    <span class="aviso-tag ${tagClass}">${tagTexto}${horaShow}</span>
                    <span style="font-size:0.7rem; color:#666;">${diaMes}</span>
                </div>
                <div class="aviso-titulo">${aviso.titulo}</div>
                <div class="aviso-meta">📍 ${aviso.local || "Paróquia"}</div>
                ${descricaoHTML}
                ${aviso.descricao ? `<a class="aviso-ler-mais" onclick="ModalController.abrirDetalhesAviso(${aviso.id})">Ler Mais</a>` : ''}
            </div>`;
    });

    html += `
        </div>
        <button onclick="ModalController.abrirAvisosCompletos()" style="
              width: 100%;
              padding: 12px;
              background-color: var(--cor-vinho);
              color: #fff;
              border: none;
              border-radius: 8px;
              cursor: pointer;
              display: flex;
              align-items: center;
              justify-content: center;
              gap: 10px;
              font-family: 'AntennaCond', sans-serif;
              font-weight: bold;
              font-size: 1rem;
              box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
              transition: transform 0.2s;
              margin-top: 10px;
            " onmouseover="this.style.transform='translateY(-2px)'" onmouseout="this.style.transform='translateY(0)'">
          <!-- Ícone Megafone/Mural SVG -->
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"
            stroke-linecap="round" stroke-linejoin="round">
            <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"></path>
          </svg>
          VER TODOS OS AVISOS (${avisos.length})
        </button>`;
    
    container.innerHTML = html;
    
    // Inicializa os ícones Lucide (caso existam no HTML)
    if (typeof lucide !== 'undefined' && lucide.createIcons) {
      lucide.createIcons();
    }
  } catch (err) {
    console.error(err);
    container.innerHTML =
      '<div style="color:red; font-size:0.8rem;">Erro ao carregar mural.</div>';
  }
}

// ==========================================================================
// 3. CALENDÁRIO & GRID
// ==========================================================================
/**
 * Carrega e renderiza o grid do calendário para um mês específico.
 * Aplica filtro de comunidade ativo (ESTADO.comunidadeFiltrada) e dispara prefetch dos meses adjacentes.
 * @param {number} ano - Ano (ex: 2026)
 * @param {number} mes - Mês 1-12
 * @returns {Promise<void>}
 */
async function carregarMes(ano, mes) {
  const nomeMes = new Date(ano, mes - 1).toLocaleString("pt-BR", {
    month: "long",
  });
  document.querySelector(".month-name").textContent = `${nomeMes} ${ano}`;

  const grid = document.querySelector(".calendar-wrapper");
  const headersMatch = grid.innerHTML.match(
    /<div class="day-header">.*?<\/div>/g,
  );
  const headers = headersMatch ? headersMatch.join("") : "";

  // UX-005: skeleton loading estruturado enquanto dados carregam
  const skeletonCells = Array.from({ length: 35 }, (_, i) =>
    `<div class="day-cell skeleton-cell" style="--sk-i:${i}"><span class="skeleton-day-num"></span></div>`
  ).join('');
  grid.innerHTML = headers + skeletonCells;

  try {
    // 🆕 Passa filtro de comunidade para a API
    const eventos = await window.api.buscarEventos(ano, mes, ESTADO.comunidadeFiltrada);
    
    ESTADO.dadosEventos = {};
    eventos.forEach((ev) => {
      if (!ESTADO.dadosEventos[ev.data]) {
        ESTADO.dadosEventos[ev.data] = [];
      }
      ESTADO.dadosEventos[ev.data].push(ev);
    });
    
    renderizarGrid(ano, mes, grid, headers);
    aplicarFiltrosVisuais();
    // UX-008: atualiza dropdown de comunidades desabilitando as sem eventos no mês
    _atualizarEstadoDropdownComunidades(eventos);
    // PERF-001: pré-carrega meses adjacentes silenciosamente após render
    _prefetchMesesAdjacentes(ano, mes);
  } catch (erro) {
    console.error(erro);
    grid.innerHTML =
      headers + '<div style="padding:20px; color:red;">Erro de conexão.</div>';
  }
}

// PERF-001: pre-fetch silencioso dos meses anterior e próximo para eliminar
// latência de ~500-800ms ao navegar entre meses. Os resultados ficam no cache
// localStorage da api.js e são servidos instantaneamente na navegação.
function _prefetchMesesAdjacentes(ano, mes) {
  const proximo  = mes === 12 ? { m: 1,      a: ano + 1 } : { m: mes + 1, a: ano };
  const anterior = mes === 1  ? { m: 12,     a: ano - 1 } : { m: mes - 1, a: ano };
  setTimeout(() => {
    window.api.buscarEventos(proximo.a,  proximo.m,  ESTADO.comunidadeFiltrada).catch(() => {});
    window.api.buscarEventos(anterior.a, anterior.m, ESTADO.comunidadeFiltrada).catch(() => {});
  }, 1500);
}

// UX-008: desabilita no dropdown as comunidades que não têm eventos no mês carregado
function _atualizarEstadoDropdownComunidades(eventos) {
  const select = document.getElementById('public-community-filter');
  if (!select) return;

  const comunidadesComEventos = new Set(
    eventos.filter(e => e.comunidade_id).map(e => e.comunidade_id)
  );
  // 'matriz' = eventos sem comunidade_id
  const temMatriz = eventos.some(e => !e.comunidade_id);

  Array.from(select.options).forEach(opt => {
    if (!opt.value) return; // "Todas" nunca desabilita
    const temEventos = opt.value === 'matriz' ? temMatriz : comunidadesComEventos.has(opt.value);
    opt.disabled = !temEventos;
    const baseText = opt.dataset.nomeComunidade || opt.textContent.replace(' (sem eventos)', '');
    opt.dataset.nomeComunidade = baseText;
    opt.textContent = temEventos ? baseText : `${baseText} (sem eventos)`;
  });
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
      dia,
    ).padStart(2, "0")}`;
    
    const eventosNoDia = ESTADO.dadosEventos[dataISO] || [];
    let conteudoHTML = "";
    let clickAttr = `onclick="abrirModal('${dataISO}')"`;

    // Itera sobre todos os eventos do dia
    eventosNoDia.forEach((evento) => {
      // Lógica de Categoria (SDS v6.6 - Consistência Visual)
      let classeCategoria = "pill--liturgia";
      let icone = "";
      let corLiturgica = evento.liturgia_cores?.hex_code || "#2e7d32";

      // Define a classe e o ícone baseado no tipo
      switch (evento.tipo_compromisso) {
        case "atendimento":
          classeCategoria = "pill--padre";
          icone = "";
          break;
        case "reuniao":
          classeCategoria = "pill--reuniao";
          icone = "";
          break;
        case "evento":
          classeCategoria = "pill--festa";
          icone = "";
          break;
      }

      // Captura o horário
      let horaShow = evento.hora_inicio
        ? evento.hora_inicio.substring(0, 5)
        : evento.escalas?.[0]?.hora_celebracao?.substring(0, 5) || "";

      // Para Liturgia, a borda é a cor litúrgica. Para Outros, a classe CSS resolve.
      // EXCLUSIVO: Atendimento recebe box colorido sólido (v6.8)
      let estiloAdicional = "";
      if (evento.tipo_compromisso === "liturgia") {
        estiloAdicional = `style="border-left: 4px solid ${corLiturgica} !important;"`;
      } else if (evento.tipo_compromisso === "atendimento") {
        estiloAdicional = `style="background-color: #2e3fd1ff !important; color: white !important; border: none !important;"`;
      }

      const classeSolenidade = evento.is_solenidade ? "solenidade" : "";

      // 🏛️ Badge de comunidade (SEMPRE exibir quando evento tem comunidade)
      let badgeComunidade = "";
      if (evento.comunidade_id) {
        // 🔧 PRIORIZA dados da API (evento.comunidade) ao invés de buscar na lista local
        const comunidade = evento.comunidade || ESTADO.listaComunidades.find(c => c.id === evento.comunidade_id);
        
        if (comunidade) {
          // 🛡️ Proteção contra undefined com optional chaining e fallback
          const nomeComunidade = comunidade?.nome || 'Comunidade';
          badgeComunidade = `<span class="badge-comunidade" style="display: inline-block;">🏛️ ${nomeComunidade}</span>`;
        } else {
          badgeComunidade = `<span class="badge-comunidade badge-comunidade-erro" style="display: inline-block;">⚠️ Comunidade</span>`;
        }
      }

      const _t = window.api.escapeHtml;
      conteudoHTML += `
        <div class="pill ${classeCategoria} ${classeSolenidade}" ${estiloAdicional} title="${_t(evento.titulo)}">
            ${horaShow ? `<span style="font-size: 0.65rem; opacity: 0.8;">${_t(horaShow)}</span>` : ""}
            <span>${icone} ${_t(evento.titulo)}${badgeComunidade}</span>
        </div>`;

      // Exibe Escalas Adicionais (Múltiplas Missas do MESMO evento)
      if (evento.escalas && evento.escalas.length > 1) {
        evento.escalas.slice(1).forEach((esc) => {
          const hora = esc.hora_celebracao?.substring(0, 5) || "";
          if (hora) {
            conteudoHTML += `<div class="pill pill--liturgia" style="border-left: 4px solid ${corLiturgica} !important; font-size: 0.7rem;">${hora} Missa</div>`;
          }
        });
      }
    });
    
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
// 4. SIDEBAR E FILTROS
// ==========================================================================
async function inicializarSidebar() {
  const containerEquipes = document.getElementById("filtro-equipes");
  if (!containerEquipes) return;

  // A11Y-006: role="group" + aria-labelledby para o grupo de filtros
  containerEquipes.innerHTML = `
    <h3 id="label-filtro-equipes">FILTRAR POR EQUIPE</h3>
    <div class="filter-item" onclick="limparFiltros()"
         role="checkbox" aria-checked="true" aria-label="Todas as equipes" tabindex="0"
         onkeydown="if(event.key==='Enter'||event.key===' '){event.preventDefault();limparFiltros()}">
      <span class="checkbox-custom checked" id="check-all" aria-hidden="true"></span>
      <strong>TODAS AS EQUIPES</strong>
    </div>`;

  // A11Y-006: group container
  containerEquipes.setAttribute('role', 'group');
  containerEquipes.setAttribute('aria-labelledby', 'label-filtro-equipes');

  // Apenas equipes de Canto, Ambos e MEP aparecem no filtro da sidebar.
  // Leitura é exibida no modal e no PDF, mas não é critério de filtragem visual.
  const T = window.SDS?.TIPOS_EQUIPE ?? { LEITURA: 'Leitura' };
  const equipesFiltraveis = ESTADO.listaEquipes.filter(
    (eq) => eq.tipo_atuacao !== T.LEITURA
  );

  equipesFiltraveis.forEach((eq) => {
    const div = document.createElement("div");
    div.className = "filter-item";
    div.setAttribute('role', 'checkbox');
    div.setAttribute('aria-checked', 'false');
    div.setAttribute('aria-label', eq.nome_equipe);
    div.setAttribute('tabindex', '0');
    div.addEventListener("click", function () {
      window.toggleFiltro(eq.id, this);
    });
    div.addEventListener("keydown", function (e) {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        window.toggleFiltro(eq.id, this);
      }
    });
    div.innerHTML = `<span class="checkbox-custom" data-id="${eq.id}" aria-hidden="true"></span> ${eq.nome_equipe}`;
    containerEquipes.appendChild(div);
  });
}

// ==========================================================================
// 4.1. FILTROS DE COMUNIDADES
// Criado em: 05/02/2026
// ==========================================================================
function inicializarFiltroComunidades() {
  const containerComunidades = document.getElementById("filtro-comunidades");
  if (!containerComunidades) return;

  if (ESTADO.listaComunidades.length === 0) {
    containerComunidades.innerHTML = `
      <h3>FILTRAR POR LOCAL</h3>
      <div class="filter-item">
        <span>Nenhuma comunidade cadastrada</span>
      </div>
    `;
    return;
  }

  containerComunidades.innerHTML = `
    <h3>FILTRAR POR LOCAL</h3>
    <div class="filter-item active" onclick="filtrarPorComunidade(null, this)">
      <span class="checkbox-custom checked" id="check-comunidade-todas"></span> 
      <strong>TODOS OS LOCAIS</strong>
    </div>
    <div class="filter-item" onclick="filtrarPorComunidade('matriz', this)">
      <span class="checkbox-custom" id="check-comunidade-matriz"></span> 
      MATRIZ / PARÓQUIA
    </div>
  `;

  // Adiciona cada comunidade
  ESTADO.listaComunidades.forEach((com) => {
    // 🛡️ Validação defensiva para prevenir undefined
    if (!com || !com.id) return;
    
    const div = document.createElement("div");
    div.className = "filter-item";
    div.onclick = function() { filtrarPorComunidade(com.id, this); };
    div.innerHTML = `
      <span class="checkbox-custom" id="check-comunidade-${com.id}"></span>
      ${com.nome || 'Comunidade'}
    `;
    containerComunidades.appendChild(div);
  });
}

/**
 * Inicializa o filtro de comunidades no header do calendário (Nova versão)
 */
function inicializarFiltroComunidadesHeader() {
  const select = document.getElementById("public-community-filter");
  
  if (!select) {
    console.warn("⚠️ [FILTRO] Elemento public-community-filter não encontrado no HTML");
    return;
  }

  console.log("🔍 [FILTRO] Inicializando filtro de comunidades...");
  console.log("📊 [FILTRO] Comunidades disponíveis:", ESTADO.listaComunidades?.length || 0);

  // Limpa e recria as opções
  select.innerHTML = `
    <option value="">📍 Todas as Comunidades</option>
    <option value="matriz">⛪ Matriz</option>
  `;

  // Adiciona comunidades cadastradas
  if (!ESTADO.listaComunidades || ESTADO.listaComunidades.length === 0) {
    console.error("⚠️ [FILTRO] Nenhuma comunidade disponível para adicionar ao select!");
    const option = document.createElement("option");
    option.value = "";
    option.textContent = "⚠️ Nenhuma comunidade ativa";
    option.disabled = true;
    select.appendChild(option);
  } else {
    ESTADO.listaComunidades.forEach((com) => {
      // 🛡️ Validação defensiva para prevenir undefined
      if (!com || !com.id) return;
      
      console.log("  ➕ [FILTRO] Adicionando:", com.nome, "(ID:", com.id, ")");
      const option = document.createElement("option");
      option.value = com.id;
      option.textContent = `🏛️ ${com.nome || 'Comunidade'}`;
      select.appendChild(option);
    });
  }

  console.log("✅ [FILTRO] Filtro de comunidades inicializado no header com", select.options.length, "opções");
}

/**
 * Aplica filtro de comunidade no calendário e recarrega o mês.
 * @param {string|null} comunidadeId - UUID da comunidade, 'matriz', ou null (todas)
 * @param {HTMLElement|null} divElement - Item da sidebar clicado, ou null quando chamado via select do header
 * @returns {Promise<void>}
 */
window.filtrarPorComunidade = async function (comunidadeId, divElement) {
  // Se chamado via select do header (sem divElement)
  if (!divElement) {
    const select = document.getElementById("public-community-filter");
    if (select) {
      select.value = comunidadeId || "";
    }
    
    // Atualiza estado
    ESTADO.comunidadeFiltrada = comunidadeId || null;
    
    // Recarrega calendário com filtro
    await carregarMes(ESTADO.anoAtual, ESTADO.mesAtual);
    return;
  }

  // Lógica antiga da sidebar (mantida para compatibilidade)
  // Remove active de todos
  const todosItens = document.querySelectorAll("#filtro-comunidades .filter-item");
  todosItens.forEach((item) => {
    item.classList.remove("active");
    const check = item.querySelector(".checkbox-custom");
    if (check) check.classList.remove("checked");
  });

  // Adiciona active no selecionado
  divElement.classList.add("active");
  const check = divElement.querySelector(".checkbox-custom");
  if (check) check.classList.add("checked");

  // Atualiza estado
  ESTADO.comunidadeFiltrada = comunidadeId;

  // Recarrega calendário com filtro
  await carregarMes(ESTADO.anoAtual, ESTADO.mesAtual);

  // Reaplicar destaque do dia atual e filtros de equipes se ativos
  setTimeout(() => {
    destacarDiaAtual();
    if (ESTADO.filtrosAtivos.size > 0) {
      aplicarFiltrosVisuais();
    }
  }, 100);
};

window.toggleFiltro = function (equipeId, divElement) {
  const check = divElement.querySelector(".checkbox-custom");
  const checkAll = document.getElementById("check-all");

  if (ESTADO.filtrosAtivos.has(equipeId)) {
    ESTADO.filtrosAtivos.delete(equipeId);
    check.classList.remove("checked");
    // A11Y-006: atualiza aria-checked no item
    divElement.setAttribute('aria-checked', 'false');
  } else {
    ESTADO.filtrosAtivos.add(equipeId);
    check.classList.add("checked");
    divElement.setAttribute('aria-checked', 'true');
  }

  if (ESTADO.filtrosAtivos.size === 0) {
    checkAll.classList.add("checked");
    document.querySelector('[id^="check-all"]')?.closest('[role="checkbox"]')
      ?.setAttribute('aria-checked', 'true');
  } else {
    checkAll.classList.remove("checked");
    document.querySelector('[id^="check-all"]')?.closest('[role="checkbox"]')
      ?.setAttribute('aria-checked', 'false');
  }
  aplicarFiltrosVisuais();
};

window.limparFiltros = function () {
  ESTADO.filtrosAtivos.clear();
  // A11Y-006: reseta aria-checked em todos os itens de equipe
  document.querySelectorAll("#filtro-equipes [role='checkbox']").forEach((el) => {
    const check = el.querySelector(".checkbox-custom");
    if (check && check.id !== "check-all") {
      check.classList.remove("checked");
      el.setAttribute('aria-checked', 'false');
    }
  });
  document.getElementById("check-all").classList.add("checked");
  document.querySelector("#filtro-equipes [role='checkbox']")
    ?.setAttribute('aria-checked', 'true');
  aplicarFiltrosVisuais();
};

function aplicarFiltrosVisuais() {
  const celulas = document.querySelectorAll(".day-cell:not(.other-month)");

  if (ESTADO.filtrosAtivos.size === 0) {
    celulas.forEach((cel) =>
      cel.classList.remove("hidden-by-filter", "highlight-filter"),
    );
    return;
  }

  celulas.forEach((cel) => {
    const dataISO = cel.getAttribute("data-iso");
    // dadosEventos[data] é um array — OR entre todos os eventos do dia
    const eventosNoDia = ESTADO.dadosEventos[dataISO] || [];
    let match = false;

    outer: for (const ev of eventosNoDia) {
      if (!ev.escalas) continue;
      for (const esc of ev.escalas) {
        // Filtra por Canto, Ambos e MEP. Leitura não é critério de destaque.
        const idCant = esc.equipe_canto?.id || esc.equipe_canto_id;
        const idMep  = esc.equipe_mep?.id  || esc.equipe_mep_id;
        if (
          ESTADO.filtrosAtivos.has(idCant) ||
          ESTADO.filtrosAtivos.has(idMep)
        ) {
          match = true;
          break outer;
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

  // A11Y-006: anuncia o resultado do filtro para leitores de tela
  const diasVisiveis = document.querySelectorAll(".day-cell.highlight-filter").length;
  const nomeEquipes = [...ESTADO.filtrosAtivos].map(id => {
    const eq = ESTADO.listaEquipes?.find(e => e.id === id);
    return eq ? eq.nome_equipe : '';
  }).filter(Boolean).join(', ');

  if (window.ErrorHandler?.announce) {
    const msg = diasVisiveis > 0
      ? `Filtro ativo: ${nomeEquipes}. ${diasVisiveis} ${diasVisiveis === 1 ? 'dia com evento' : 'dias com eventos'} encontrados.`
      : `Filtro ativo: ${nomeEquipes}. Nenhum evento encontrado neste mês.`;
    window.ErrorHandler.announce(msg);
  }
}

// ==========================================================================
// 5. MODAL DE DETALHES
// ==========================================================================
window.abrirModal = function (dataISO) {
  let eventosNoDia = ESTADO.dadosEventos[dataISO] || [];
  
  // Se não houver eventos, cria um placeholder
  if (eventosNoDia.length === 0) {
    eventosNoDia = [{
      id: null,
      data: dataISO,
      titulo: "Dia sem Evento",
      tempo_liturgico: "Paroquial",
      liturgia_cores: { hex_code: "#CCCCCC" },
      escalas: [],
    }];
  }

  const modalContent = document.getElementById("modalContent");
  const modalOverlay = document.getElementById("modalOverlay");

  const dataObj = new Date(dataISO + "T12:00:00");
  const diaNum = dataObj.getDate();
  const mesNome = dataObj
    .toLocaleString("pt-BR", { month: "short" })
    .toUpperCase()
    .replace(".", "");
  const diaSemana = dataObj.toLocaleString("pt-BR", { weekday: "long" });

  // Usa o primeiro evento para cor do modal (ou gera lista se múltiplos)
  const eventoDestaque = eventosNoDia[0];
  eventoEmEdicao = JSON.parse(JSON.stringify(eventoDestaque));

  // Cores Padronizadas por Categoria (SDS v6.6 - Consistência Visual)
  let corHex = "#2e7d32"; // Default: Verde Litúrgico
  let corTxt = "#2e7d32";

  switch (eventoDestaque.tipo_compromisso) {
    case "atendimento":
      corHex = "#2e3fd1ff"; // Blue (Padre)
      corTxt = "#2e3fd1ff";
      break;
    case "reuniao":
      corHex = "#475569"; // Slate Blue (Reunião)
      corTxt = "#475569";
      break;
    case "evento":
      corHex = "#bfa15f"; // Dourado Escuro (Festa)
      corTxt = "#a67c00";
      break;
    case "liturgia":
    default:
      // Mantém a cor litúrgica dinâmica para celebrações
      corHex = eventoDestaque.liturgia_cores?.hex_code || "#2e7d32";
      corTxt = corHex;
      if (corHex.toLowerCase() === "#ffffff") {
        corHex = "#ccc";
        corTxt = "#666";
      }
  }

  let todosEventosHTML = "";
  
  eventosNoDia.forEach((evento, index) => {
    // Badge de comunidade
    let infoComunidade = "";
    if (evento.comunidade_id) {
      const comunidade = evento.comunidade || ESTADO.listaComunidades.find(c => c.id === evento.comunidade_id);
      if (comunidade) {
        const nomeComunidade = comunidade?.nome || 'Comunidade';
        const enderecoComunidade = comunidade?.endereco || '';
        infoComunidade = `
          <div style="background: linear-gradient(135deg, rgba(251,181,88,0.1) 0%, rgba(164,29,49,0.05) 100%); padding: 10px; border-radius: 8px; margin-bottom: 12px; border-left: 4px solid var(--cor-dourado);">
            <div style="display: flex; align-items: center; gap: 8px;">
              <span style="font-size: 1rem;">🏛️</span>
              <div>
                <p style="margin: 0; font-weight: 700; color: var(--cor-vinho); font-size: 0.85rem;">${nomeComunidade}</p>
                ${enderecoComunidade ? `<p style="margin: 0; color: #999; font-size: 0.7rem;">${enderecoComunidade}</p>` : ''}
              </div>
            </div>
          </div>
        `;
      }
    }

    // Cor do evento individual
    let corEvento = evento.liturgia_cores?.hex_code || "#2e7d32";
    if (evento.tipo_compromisso === "atendimento") corEvento = "#2e3fd1ff";
    if (evento.tipo_compromisso === "reuniao") corEvento = "#475569";
    if (evento.tipo_compromisso === "evento") corEvento = "#bfa15f";
    if (corEvento.toLowerCase() === "#ffffff") corEvento = "#ccc";

    // Conteúdo do evento
    let conteudoEvento = "";
    if (evento.tipo_compromisso && evento.tipo_compromisso !== "liturgia") {
      const horaShow = evento.hora_inicio ? evento.hora_inicio.substring(0, 5) : "--:--";
      conteudoEvento = `
        <div style="background:#f9f9f9; padding:12px; border-radius:8px;">
          <p style="margin: 0 0 5px 0;"><strong>Horário:</strong> ${horaShow}</p>
          <p style="margin: 0 0 5px 0;"><strong>Local:</strong> ${evento.local || "Não informado"}</p>
          <p style="margin: 0;"><strong>Responsável:</strong> ${evento.responsavel || "Não informado"}</p>
        </div>`;
    } else {
      conteudoEvento = gerarHTMLLeitura(evento);
    }

    // Se houver múltiplos eventos, adiciona separador visual
    const separador = (index > 0) ? `<hr style="border: none; border-top: 2px dashed #e5e7eb; margin: 20px 0;">` : "";
    const headerMultiplo = (eventosNoDia.length > 1) ? `
      <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 8px;">
        <span style="background: ${corEvento}; color: white; padding: 2px 8px; border-radius: 4px; font-size: 0.7rem; font-weight: 700;">${index + 1}</span>
        <span style="font-size: 0.75rem; color: #666; text-transform: uppercase;">Evento ${index + 1} de ${eventosNoDia.length}</span>
      </div>
    ` : "";

    todosEventosHTML += `
      ${separador}
      <div class="evento-item-modal" data-evento-id="${evento.id || 'null'}">
        ${headerMultiplo}
        <div class="modal-liturgia" style="color:${corEvento}">${window.api.escapeHtml(evento.tempo_liturgico || 'Paroquial')}</div>
        <div class="modal-titulo" style="font-size: ${eventosNoDia.length > 1 ? '1rem' : '1.2rem'};">${window.api.escapeHtml(evento.titulo)}</div>
        ${infoComunidade}
        <div class="escala-list">${conteudoEvento}</div>
      </div>
    `;
  });

  // Indicador de múltiplos eventos
  const badgeMultiplos = (eventosNoDia.length > 1) ? `
    <div style="background: linear-gradient(135deg, #fef3c7 0%, #fde68a 100%); border: 1px solid #f59e0b; padding: 8px 12px; border-radius: 8px; margin-bottom: 15px; display: flex; align-items: center; gap: 8px;">
      <span style="font-size: 1.2rem;">📋</span>
      <span style="font-size: 0.85rem; font-weight: 600; color: #92400e;">${eventosNoDia.length} eventos neste dia</span>
    </div>
  ` : "";

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
                ${badgeMultiplos}
                ${todosEventosHTML}
            
            <!-- ZONA DE CONVENIÊNCIA DO FIEL -->
            <div style="margin-top: 20px; border-top: 1px dashed #eee; padding-top: 15px;">
                <p style="font-size: 0.7rem; font-weight: 800; color: #aaa; text-transform: uppercase; text-align: center; margin-bottom: 10px;">
                    Notificar-me deste compromisso:
                </p>
                <div style="display: flex; justify-content: center; gap: 15px; margin-bottom: 15px;">
                    <select id="public-reminder-time" class="o-surface-card" style="padding: 5px 10px; font-size: 0.8rem;">
                        <option value="10080">7 dias antes</option>
                        <option value="4320">3 dias antes</option>
                        <option value="1440" selected>1 dia antes</option>
                        <option value="180">3 horas antes</option>
                    </select>
                </div>
                <div class="c-sync-group">
                    <button onclick="CalendarEngine.syncGoogle('${eventoDestaque.titulo}', '${eventoDestaque.data}', '${eventoDestaque.hora_inicio}')" class="c-sync-button">📅 Google</button>
                    <button onclick="CalendarEngine.syncApple('${eventoDestaque.titulo}', '${eventoDestaque.data}', '${eventoDestaque.hora_inicio}')" class="c-sync-button">🍎 iPhone</button>
                </div>
            </div>

            </div>
            ${btnAdmin}
        </div>
    </div>`;

  modalOverlay.classList.add("active");
  if (ESTADO.isAdmin) {
    document.getElementById("btnEditar").onclick = () =>
      ativarModoEdicao(eventoDestaque);
  }
};

function gerarHTMLLeitura(evento) {
  if (!evento.escalas || evento.escalas.length === 0) {
    return '<div style="color:#999; font-style:italic; padding:10px;">Nenhuma escala litúrgica.</div>';
  }
  return evento.escalas
    .map((esc) => {
      const hora = esc.hora_celebracao.substring(0, 5);
      const leit = esc.equipe_leitura?.nome_equipe || "-";
      const cant = esc.equipe_canto?.nome_equipe || "-";

      let htmlRows = `
        <div class="ministerio-row">
            <div class="ministerio-icon">${ICONS.leitura}</div>
            <div class="ministerio-label">Leitores</div>
            <div class="ministerio-value">${leit}</div>
        </div>
        <div class="ministerio-row">
            <div class="ministerio-icon">${ICONS.canto}</div>
            <div class="ministerio-label">Canto</div>
            <div class="ministerio-value">${cant}</div>
        </div>
      `;

      // Celebrante (Missa) ou MEP (Palavra)
      if (evento.tipo_celebracao === "missa" && esc.celebrante_nome) {
        htmlRows += `
          <div class="ministerio-row">
              <div class="ministerio-icon">${ICONS.celebrante}</div>
              <div class="ministerio-label">Celebrante</div>
              <div class="ministerio-value">${esc.celebrante_nome}</div>
          </div>
        `;
      } else if (
        evento.tipo_celebracao === "celebracao_palavra" &&
        esc.equipe_mep
      ) {
        htmlRows += `
          <div class="ministerio-row">
              <div class="ministerio-icon">${ICONS.mep}</div>
              <div class="ministerio-label">Presidente</div>
              <div class="ministerio-value">${esc.equipe_mep.nome_equipe}</div>
          </div>
        `;
      }

      // MESCE
      if (
        esc.lista_mesce &&
        Array.isArray(esc.lista_mesce) &&
        esc.lista_mesce.length > 0
      ) {
        htmlRows += `
          <div class="ministerio-row">
              <div class="ministerio-icon">${ICONS.mesce}</div>
              <div class="ministerio-label">MESCE</div>
              <div class="ministerio-value-lista">
                  ${esc.lista_mesce.map((n) => `<span class="nome-pill">${n}</span>`).join("")}
              </div>
          </div>
        `;
      }

      // Coroinhas
      if (
        esc.lista_coroinhas &&
        Array.isArray(esc.lista_coroinhas) &&
        esc.lista_coroinhas.length > 0
      ) {
        htmlRows += `
          <div class="ministerio-row">
              <div class="ministerio-icon">${ICONS.coroinhas}</div>
              <div class="ministerio-label">Coroinhas</div>
              <div class="ministerio-value-lista">
                  ${esc.lista_coroinhas.map((n) => `<span class="nome-pill nome-pill--coroinha">${n}</span>`).join("")}
              </div>
          </div>
        `;
      }

      return `
        <div class="escala-item">
            <div class="escala-hora">${hora}</div>
            <div class="escala-equipes-expanded">
                ${htmlRows}
            </div>
        </div>`;
    })
    .join("");
}

// ==========================================================================
// 6. EDITOR UNIFICADO (ADMIN)
// ==========================================================================
function ativarModoEdicao(evento) {
  const area = document.getElementById("areaConteudo");
  const btnEditar = document.getElementById("btnEditar");
  if (btnEditar) btnEditar.style.display = "none";

  // Valores
  const tituloVal = evento.titulo || "Novo Evento";
  const tipoComp = evento.tipo_compromisso || "liturgia";
  const localVal = evento.local || "";
  const respVal = evento.responsavel || "";
  const horaVal = evento.hora_inicio ? evento.hora_inicio.substring(0, 5) : "";
  const isMural = evento.mural_destaque || false;
  const prioMural = evento.mural_prioridade || 2;
  const tempoVal = evento.tempo_liturgico || "Paroquial";
  const corAtualId = evento.cor_id || evento.liturgia_cores?.id || 1;

  // HTML do Form
  let htmlEditor = `
        <h3 style="color:var(--cor-vinho); margin-bottom:15px; border-bottom:1px solid #eee; padding-bottom:5px;">Editar Agenda</h3>
        <div style="background:#fff; padding:15px; border-radius:8px; border:1px solid #e0e0e0; margin-bottom:15px;">
            <label for="editTipoComp" style="font-size:0.7rem; font-weight:bold; color:#888;">TIPO DE COMPROMISSO</label>
            <select id="editTipoComp" onchange="window.toggleCamposEditor()" style="width:100%; padding:10px; border:1px solid #ddd; border-radius:4px; margin-bottom:10px; font-weight:bold; background:#f9f9f9;">
                <option value="liturgia" ${
                  tipoComp === "liturgia" ? "selected" : ""
                }>Liturgia / Missa</option>
                <option value="reuniao" ${
                  tipoComp === "reuniao" ? "selected" : ""
                }>Reunião / Pastoral</option>
                <option value="evento" ${
                  tipoComp === "evento" ? "selected" : ""
                }>Evento / Festa</option>
                <option value="atendimento" ${
                  tipoComp === "atendimento" ? "selected" : ""
                }>Atendimento Padre</option>
            </select>

            <label for="editTitulo" style="font-size:0.7rem; font-weight:bold; color:#888;">TÍTULO</label>
            <input type="text" id="editTitulo" value="${tituloVal}" style="width:100%; padding:10px; border:1px solid #ddd; border-radius:4px; font-weight:bold; font-size:1rem; margin-bottom:10px;">

            <!-- Extras (Reunião) -->
            <div id="campos-extras" style="display:none; grid-template-columns: 1fr 1fr; gap:10px; margin-bottom:10px;">
                <div>
                    <label for="editHoraInicio" style="font-size:0.7rem; font-weight:bold; color:#888;">HORA INÍCIO</label>
                    <input type="time" id="editHoraInicio" value="${horaVal}" style="width:100%; padding:8px; border:1px solid #ddd; border-radius:4px;">
                </div>
                <div>
                    <label for="editLocal" style="font-size:0.7rem; font-weight:bold; color:#888;">LOCAL</label>
                    <input type="text" id="editLocal" value="${localVal}" placeholder="Ex: Salão" style="width:100%; padding:8px; border:1px solid #ddd; border-radius:4px;">
                </div>
                <div style="grid-column: 1 / -1;">
                    <label for="editResp" style="font-size:0.7rem; font-weight:bold; color:#888;">RESPONSÁVEL</label>
                    <input type="text" id="editResp" value="${respVal}" placeholder="Ex: Coord. João" style="width:100%; padding:8px; border:1px solid #ddd; border-radius:4px;">
                </div>
            </div>

            <!-- Campos Liturgia -->
            <div id="campos-liturgia">
                ${gerarCamposLiturgia(evento, tempoVal, corAtualId)}
            </div>
        </div>

        <!-- Mural -->
        <div style="background:#fff9e6; padding:10px; border-radius:8px; border:1px solid #eee; margin-bottom:15px;">
            <div style="display:flex; align-items:center; gap:10px;">
                <input type="checkbox" id="checkMural" onchange="window.toggleMuralPrio()" ${
                  isMural ? "checked" : ""
                } style="width:18px; height:18px;">
                <label for="checkMural" style="font-weight:bold; font-size:0.9rem; color:#d97706;">Destacar no Mural?</label>
            </div>
            <div id="area-prio" style="margin-top:10px; display:none; padding-left:28px;">
                <label for="editPrio" style="font-size:0.7rem; font-weight:bold; color:#888;">PRIORIDADE</label>
                <select id="editPrio" style="padding:5px; border:1px solid #ccc; border-radius:4px;">
                    <option value="1" ${
                      prioMural == 1 ? "selected" : ""
                    }>🔴 Urgente</option>
                    <option value="2" ${
                      prioMural == 2 ? "selected" : ""
                    }>🟡 Atenção</option>
                    <option value="3" ${
                      prioMural == 3 ? "selected" : ""
                    }>🔵 Info</option>
                </select>
            </div>
        </div>

        <!-- Escalas (Só Liturgia) -->
        <div id="area-escalas">
            <h4 style="color:#666; font-size:0.9rem; margin-bottom:10px;">Escalas e Horários</h4>
            <div id="listaEditor" style="display:flex; flex-direction:column; gap:15px;">`;

  if (evento.escalas) {
    evento.escalas.forEach((esc, index) => {
      htmlEditor += gerarLinhaEditor(esc, index);
    });
  }

  htmlEditor += `</div>
        <button onclick="window.adicionarNovaEscala()" style="margin-top:15px; width:100%; padding:8px; background:#f0f0f0; border:1px dashed #ccc; border-radius:4px; font-weight:bold; color:#555;">➕ Adicionar Horário</button>
        </div>

        <div style="margin-top:25px; display:flex; gap:10px;">
            <button onclick="window.salvarEdicoes()" style="flex:1; background:var(--cor-verde); color:#fff; border:none; padding:12px; border-radius:6px; font-weight:bold; cursor:pointer;">💾 SALVAR TUDO</button>
            <button onclick="window.fecharModalForce()" style="background:#eee; border:none; padding:12px 20px; border-radius:6px; cursor:pointer; color:#555;">Cancelar</button>
        </div>`;

  area.innerHTML = htmlEditor;
  window.toggleCamposEditor();
  window.toggleMuralPrio();
}

function gerarCamposLiturgia(evento, tempoVal, corAtualId) {
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
        `<option value="${t}" ${t === tempoVal ? "selected" : ""}>${t}</option>`,
    )
    .join("");

  return `
    <div style="display:flex; gap:10px; margin-bottom:10px;">
        <div style="flex:1;">
            <label for="editTempo" style="font-size:0.7rem; font-weight:bold; color:#888;">TEMPO</label>
            <select id="editTempo" style="width:100%; padding:8px; border:1px solid #ddd; border-radius:4px;">${optionsTempo}</select>
        </div>
        <div style="flex:1;">
            <label for="editTipo" style="font-size:0.7rem; font-weight:bold; color:#888;">TIPO</label>
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
        <label for="editCor" style="font-size:0.7rem; font-weight:bold; color:#888;">COR</label>
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
            <option value="4" ${corAtualId == 4 ? "selected" : ""}>Roxo</option>
            <option value="5" ${corAtualId == 5 ? "selected" : ""}>Rosa</option>
        </select>
    </div>`;
}

function gerarLinhaEditor(escala, index) {
  const idLeit = escala.equipe_leitura?.id || escala.equipe_leitura_id;
  const idCant = escala.equipe_canto?.id || escala.equipe_canto_id;
  const horaVal = escala.hora_celebracao
    ? escala.hora_celebracao.substring(0, 5)
    : "19:00";

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
            <button onclick="window.removerLinha(this)" style="color:red; border:none; background:none; cursor:pointer;">🗑️</button>
        </div>
        <input type="time" class="edit-hora" value="${horaVal}" style="width:100%; padding:8px; border:1px solid #ddd; border-radius:4px; margin-bottom:10px; font-weight:bold;">
        <div style="display:grid; gap:10px;">
            <div><label style="font-size:0.7rem; font-weight:bold; color:#666;">LEITORES</label>
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

// --- FUNÇÕES GLOBAIS DE EDITOR (WINDOW) ---
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
  document.getElementById("area-prio").style.display = document.getElementById(
    "checkMural",
  ).checked
    ? "block"
    : "none";
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
  const tipoComp = document.getElementById("editTipoComp").value;
  const novoTitulo = document.getElementById("editTitulo").value;

  if (!novoTitulo) {
    alert("Informe o Título!");
    return;
  }

  // Captura Hora apenas se for reunião (se for liturgia, a hora vem das escalas)
  const horaInicio =
    tipoComp !== "liturgia"
      ? document.getElementById("editHoraInicio").value
      : null;

  const dadosEvento = {
    id: eventoEmEdicao.id,
    data: eventoEmEdicao.data,
    titulo: novoTitulo,
    tipo_compromisso: tipoComp,
    local:
      tipoComp !== "liturgia"
        ? document.getElementById("editLocal").value
        : null,
    responsavel:
      tipoComp !== "liturgia"
        ? document.getElementById("editResp").value
        : null,
    hora_inicio: horaInicio, // NOVO CAMPO
    mural_destaque: document.getElementById("checkMural").checked,
    mural_prioridade: parseInt(document.getElementById("editPrio").value),
    tempo_liturgico:
      tipoComp === "liturgia"
        ? document.getElementById("editTempo").value
        : "Paroquial",
    cor_id:
      tipoComp === "liturgia"
        ? parseInt(document.getElementById("editCor").value)
        : 1,
    is_solenidade:
      tipoComp === "liturgia"
        ? document.getElementById("editTipo").value === "solenidade"
        : false,
    is_festa: false,
  };

  const novasEscalas = [];
  if (tipoComp === "liturgia") {
    document.querySelectorAll(".editor-row").forEach((row) => {
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
  }

  try {
    document.getElementById("areaConteudo").innerHTML =
      '<div style="text-align:center; padding:40px;">💾 Salvando...</div>';
    await window.api.salvarEventoCompleto(dadosEvento, novasEscalas);
    alert("✅ Salvo com sucesso!");
    window.fecharModalForce();
    carregarMes(ESTADO.anoAtual, ESTADO.mesAtual);
    renderizarMural();
  } catch (err) {
    alert("Erro: " + err.message);
    console.error(err);
    window.fecharModalForce();
  }
};

// ==========================================================================
// 7. RELATÓRIO PDF
// ==========================================================================
/**
 * FUNÇÃO: prepararImpressao
 * DESCRIÇÃO: Converte os dados do calendário em uma lista cronológica elegante
 * para impressão em papel A4, seguindo a identidade visual oficial.
 */
// ==========================================================================
// 7. SUBSISTEMA DE IMPRESSÃO (RELATÓRIOS V2.0)
// ==========================================================================

/**
 * Abre o Modal de Opções de Impressão
 */
/** Abre o modal de seleção de período para geração de relatório PDF. */
window.abrirOpcoesImpressao = function () {
  const modalContent = document.getElementById("modalContent");
  const modalOverlay = document.getElementById("modalOverlay");
  const anoAtual = new Date().getFullYear();

  modalContent.innerHTML = `
    <div class="modal-card" style="max-width: 450px;">
        <button class="btn-close" onclick="fecharModalForce()" aria-label="Fechar">×</button>
        <div class="modal-sidebar-color" style="background-color: var(--cor-vinho)"></div>
        <div class="modal-body">
            <h3 style="color:var(--cor-vinho); margin-bottom: 20px; border-bottom: 1px solid #eee; padding-bottom: 10px;">
                🖨️ Central de Relatórios
            </h3>
            <p style="color:#666; font-size:0.9rem; margin-bottom:20px;">
                Selecione o período que deseja imprimir. O relatório será gerado em formato A4 otimizado.
            </p>

            <div style="display:grid; gap:10px;">
                <button onclick="window.gerarRelatorio('mes_atual')" class="c-sync-button" style="justify-content:flex-start; padding:15px;">
                    <span style="font-size:1.2rem;">📅</span> 
                    <div>
                        <strong>Mês Atual</strong><br>
                        <small style="color:#888;">Apenas o mês visível na tela</small>
                    </div>
                </button>

                <button onclick="window.gerarRelatorio('trimestre')" class="c-sync-button" style="justify-content:flex-start; padding:15px;">
                    <span style="font-size:1.2rem;">🗓️</span> 
                    <div>
                        <strong>Próximos 3 Meses</strong><br>
                        <small style="color:#888;">Do mês atual + 2 meses seguintes</small>
                    </div>
                </button>

                <button onclick="window.gerarRelatorio('ano_completo')" class="c-sync-button" style="justify-content:flex-start; padding:15px;">
                    <span style="font-size:1.2rem;">📚</span> 
                    <div>
                        <strong>Ano Litúrgico Completo (${anoAtual})</strong><br>
                        <small style="color:#888;">Gera o relatório de todo o ano</small>
                    </div>
                </button>
            </div>
        </div>
    </div>`;

  modalOverlay.classList.add("active");
};

/**
 * Motor de Geração de Relatório
 */
/**
 * Gera e imprime relatório de eventos em formato A4.
 * @param {'mes_atual'|'trimestre'|'ano_completo'} tipo - Período do relatório
 * @returns {Promise<void>}
 */
window.gerarRelatorio = async function (tipo) {
  // Feedback visual
  const modalBody = document.querySelector("#modalContent .modal-body");
  if (modalBody)
    modalBody.innerHTML =
      '<div style="text-align:center; padding:40px;"><p>🔄 Gerando documento...</p><small>Isso pode levar alguns segundos.</small></div>';

  let dataInicio, dataFim, tituloRelatorio;
  const ano = ESTADO.anoAtual;
  const mes = ESTADO.mesAtual;

  // Definição das Datas
  if (tipo === "mes_atual") {
    const ultimoDia = new Date(ano, mes, 0).getDate();
    dataInicio = `${ano}-${String(mes).padStart(2, "0")}-01`;
    dataFim = `${ano}-${String(mes).padStart(2, "0")}-${ultimoDia}`;
    tituloRelatorio = new Date(ano, mes - 1)
      .toLocaleString("pt-BR", { month: "long" })
      .toUpperCase();
  } else if (tipo === "trimestre") {
    // Começa dia 1 do mês atual
    dataInicio = `${ano}-${String(mes).padStart(2, "0")}-01`;
    // Pega o último dia do mês + 2
    const dataFimDate = new Date(ano, mes + 2, 0); // O dia 0 do mês seguinte é o último do anterior
    dataFim = dataFimDate.toISOString().split("T")[0];
    tituloRelatorio = "RELATÓRIO TRIMESTRAL";
  } else if (tipo === "ano_completo") {
    dataInicio = `${ano}-01-01`;
    dataFim = `${ano}-12-31`;
    tituloRelatorio = `ANO DE ${ano}`;
  }

  try {
    // PERF-004: ano completo carrega mês a mês (evita query única de 600+ registros)
    // para os outros tipos mantém buscarEventosRange (único request, já é eficiente)
    let eventos;
    if (tipo === "ano_completo") {
      if (modalBody) modalBody.innerHTML =
        '<div style="text-align:center; padding:40px;"><p>🔄 Carregando 12 meses...</p><small id="print-progress">Mês 0 de 12</small></div>';
      eventos = [];
      for (let m = 1; m <= 12; m++) {
        const progEl = document.getElementById("print-progress");
        if (progEl) progEl.textContent = `Mês ${m} de 12`;
        const evMes = await window.api.buscarEventos(ano, m, ESTADO.comunidadeFiltrada);
        eventos.push(...evMes);
      }
      eventos.sort((a, b) => (a.data > b.data ? 1 : -1));
    } else if (tipo === "mes_atual") {
      // BUG-006: buscarEventos respeita ESTADO.comunidadeFiltrada; buscarEventosRange não
      eventos = await window.api.buscarEventos(ano, mes, ESTADO.comunidadeFiltrada);
    } else {
      // trimestre: com filtro ativo itera meses para aplicar filtro; sem filtro usa range
      if (ESTADO.comunidadeFiltrada) {
        eventos = [];
        for (let i = 0; i < 3; i++) {
          const m = ((mes - 1 + i) % 12) + 1;
          const a = ano + Math.floor((mes - 1 + i) / 12);
          eventos.push(...await window.api.buscarEventos(a, m, ESTADO.comunidadeFiltrada));
        }
        eventos.sort((a, b) => (a.data > b.data ? 1 : -1));
      } else {
        eventos = await window.api.buscarEventosRange(dataInicio, dataFim);
      }
    }

    // Atualiza cabeçalho do PDF
    document.getElementById("print-month-name").textContent = tituloRelatorio;
    document.getElementById("print-year-val").textContent = ano;
    document.getElementById("print-footer-date").textContent =
      new Date().toLocaleString("pt-BR");

    // Renderização da Tabela
    const tbody = document.getElementById("print-table-body");
    tbody.innerHTML = "";

    if (eventos.length === 0) {
      tbody.innerHTML =
        '<tr><td colspan="4" style="text-align:center; padding:20px;">Nenhum evento encontrado neste período.</td></tr>';
    } else {
      let mesAtualProcessamento = -1;

      eventos.forEach((ev) => {
        const dataObj = new Date(ev.data + "T12:00:00");
        const mesEv = dataObj.getMonth();

        // Inserção de Separador de Mês (Se mudou o mês e não é mês único)
        if (tipo !== "mes_atual" && mesEv !== mesAtualProcessamento) {
          const nomeMesSep = dataObj
            .toLocaleString("pt-BR", { month: "long" })
            .toUpperCase();
          const anoSep = dataObj.getFullYear();

          const trSep = document.createElement("tr");
          trSep.innerHTML = `
                    <td colspan="4" style="background-color:#eee; color:#333; font-weight:bold; text-transform:uppercase; font-size:0.9rem; padding:8px 10px; border-bottom:2px solid #ccc;">
                        ${nomeMesSep} DE ${anoSep}
                    </td>`;
          tbody.appendChild(trSep);
          mesAtualProcessamento = mesEv;
        }

        // Lógica de Destaque para Domingo, Solenidade ou Categoria
        const diaSemana = dataObj.getDay(); // 0 = Domingo
        const isDomingo = diaSemana === 0;
        const isSolenidade = ev.is_solenidade === true;

        let classeCategoria = "";
        // Prioridade: Categorias Específicas > Domingo/Solenidade
        switch (ev.tipo_compromisso) {
          case "atendimento":
            classeCategoria = "cat-padre";
            break;
          case "reuniao":
            classeCategoria = "cat-reuniao";
            break;
          case "evento":
            classeCategoria = "cat-festa";
            break;
          default: // Liturgia
            if (isDomingo || isSolenidade) classeCategoria = "row-domingo";
        }

        // Gera o HTML da linha
        let htmlRow = gerarHTMLLinhaImpressao(ev);

        // Se for destaque, injeta a classe CSS na tag <tr>
        if (classeCategoria) {
          htmlRow = htmlRow.replace("<tr>", `<tr class="${classeCategoria}">`);
        }

        // Renderiza Linha do Evento
        tbody.innerHTML += htmlRow;
      });
    }

    // Finaliza e Imprime
    window.fecharModalForce();
    setTimeout(() => {
      window.print();
    }, 500); // Pequeno delay para renderizar o DOM
  } catch (error) {
    console.error(error);
    alert("Erro ao gerar relatório: " + error.message);
    window.fecharModalForce();
  }
};

/**
 * Gera o HTML de uma linha da tabela de impressão
 */
function gerarHTMLLinhaImpressao(evento) {
  if (!evento.titulo) return "";

  const dataObj = new Date(evento.data + "T12:00:00");
  const diaNum = dataObj.getDate().toString().padStart(2, "0");
  const diaSem = dataObj
    .toLocaleString("pt-BR", { weekday: "short" })
    .toUpperCase()
    .replace(".", "");

  let htmlEscalas = "";

  if (
    evento.tipo_compromisso === "liturgia" &&
    evento.escalas &&
    evento.escalas.length > 0
  ) {
    evento.escalas.forEach((esc) => {
      const hora = esc.hora_celebracao.substring(0, 5);
      const leit = esc.equipe_leitura?.nome_equipe || "-";
      const cant = esc.equipe_canto?.nome_equipe || "-";

      let detalhesExtra = `📖 ${leit} &nbsp; 🎵 ${cant}`;

      if (evento.tipo_celebracao === "missa" && esc.celebrante_nome) {
        detalhesExtra += `<br><small>🐑 <b>Celebrante:</b> ${esc.celebrante_nome}</small>`;
      } else if (
        evento.tipo_celebracao === "celebracao_palavra" &&
        esc.equipe_mep
      ) {
        detalhesExtra += `<br><small>📜 <b>Presidência:</b> ${esc.equipe_mep.nome_equipe}</small>`;
      }

      if (esc.lista_mesce && esc.lista_mesce.length > 0) {
        detalhesExtra += `<br><small>✨ <b>MESCE:</b> ${esc.lista_mesce.join(", ")}</small>`;
      }

      if (esc.lista_coroinhas && esc.lista_coroinhas.length > 0) {
        detalhesExtra += `<br><small>🕯️ <b>Coroinhas:</b> ${esc.lista_coroinhas.join(", ")}</small>`;
      }

      htmlEscalas += `
            <div class="print-escala-row" style="margin-bottom: 5px;">
                <span class="print-hora">${hora}</span>
                <span class="print-equipes">${detalhesExtra}</span>
            </div>`;
    });
  } else {
    // Evento Comum / Reunião
    const hora = evento.hora_inicio
      ? evento.hora_inicio.substring(0, 5)
      : "--:--";
    const local = evento.local ? `(${evento.local})` : "";

    htmlEscalas = `
        <div class="print-escala-row">
            <span class="print-hora">${hora}</span>
            <span class="print-equipes">${local}</span>
        </div>`;
  }

  // Cor Litúrgica para o nome do dia (Visual Detail)
  let corDia = "#a41d31"; // Default Vinho
  // Se quiser usar a cor litúrgica no dia, descomente abaixo:
  // if (evento.liturgia_cores?.hex_code) corDia = evento.liturgia_cores.hex_code;

  // 🏛️ Identificação de Comunidade no Relatório (SEMPRE exibir)
  let badgeComunidade = "";
  if (evento.comunidade_id) {
    // 🔧 PRIORIZA dados da API (evento.comunidade) ao invés de buscar na lista local
    const comunidade = evento.comunidade || ESTADO.listaComunidades.find(c => c.id === evento.comunidade_id);
    
    if (comunidade) {
      // 🛡️ Proteção contra undefined com optional chaining e fallback
      const nomeComunidade = comunidade?.nome || 'Comunidade';
      badgeComunidade = ` <span style="display:inline-block; background: rgba(251,181,88,0.2); color: #a67c00; padding: 2px 8px; border-radius: 4px; font-size: 0.75rem; font-weight: 600; margin-left: 6px;">🏛️ ${nomeComunidade}</span>`;
      console.log("✅ Badge impressão para:", nomeComunidade);
    } else {
      console.warn("⚠️ Comunidade não encontrada no relatório:", evento.comunidade_id);
    }
  }

  return `
    <tr>
        <td class="col-data">
            <span class="dia-grande" style="color:${corDia}">${diaNum}</span>
            <span class="dia-sem">${diaSem}</span>
        </td>
        <td style="vertical-align:top; padding-top:12px; font-weight:bold; color:#555;">
             <!-- A hora é exibida na coluna de detalhes para alinhar com escalas, 
                  mas se nao tiver escalas multiplas, poderia ser aqui. 
                  Mantendo vazio ou ícone para limpeza visual -->
             ${evento.tipo_compromisso === "liturgia" ? "✝️" : "📅"}
        </td>
        <td>
            <div class="print-titulo">${evento.titulo}${badgeComunidade}</div>
            <div class="print-liturgia">${evento.tempo_liturgico || evento.tipo_compromisso}</div>
        </td>
        <td>
            ${htmlEscalas}
        </td>
    </tr>`;
}

// ==========================================================================
// UTILITÁRIOS GLOBAIS
// ==========================================================================

window.fecharModalForce = function () {
  document.getElementById("modalOverlay").classList.remove("active");
};

// ==========================================================================
// 8. UTILS
// ==========================================================================
function adicionarBotaoLogin() {
  const header = document.querySelector("header");
  const div = document.createElement("div");
  div.style.position = "absolute";
  div.style.right = "20px";
  div.style.display = "flex";
  div.style.gap = "10px";
  div.style.alignItems = "center";
  div.innerHTML = `
    <a href="admin.html" 
       title="Acesso Administrativo" 
       style="color:#fff; 
              text-decoration:none; 
              display:flex; 
              align-items:center; 
              gap:6px;
              padding:8px 16px;
              background:rgba(255,255,255,0.2);
              border-radius:20px;
              transition:all 0.3s;
              font-size:0.9rem;
              font-weight:600;"
       onmouseover="this.style.background='rgba(255,255,255,0.3)'"
       onmouseout="this.style.background='rgba(255,255,255,0.2)'">
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect>
        <path d="M7 11V7a5 5 0 0 1 10 0v4"></path>
      </svg>
      <span>Admin</span>
    </a>
  `;
  header.appendChild(div);
}

function adicionarBotaoLogout() {
  const header = document.querySelector("header");
  const div = document.createElement("div");
  div.style.position = "absolute";
  div.style.right = "20px";
  div.style.display = "flex";
  div.style.gap = "10px";
  div.style.alignItems = "center";
  div.innerHTML = `
    <a href="dashboard.html" 
       title="Painel Administrativo" 
       style="color:#fff; 
              text-decoration:none; 
              display:flex; 
              align-items:center; 
              gap:6px;
              padding:8px 16px;
              background:rgba(255,255,255,0.25);
              border-radius:20px;
              transition:all 0.3s;
              font-size:0.9rem;
              font-weight:600;"
       onmouseover="this.style.background='rgba(255,255,255,0.35)'"
       onmouseout="this.style.background='rgba(255,255,255,0.25)'">
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <rect x="3" y="3" width="7" height="7"></rect>
        <rect x="14" y="3" width="7" height="7"></rect>
        <rect x="14" y="14" width="7" height="7"></rect>
        <rect x="3" y="14" width="7" height="7"></rect>
      </svg>
      <span>Dashboard</span>
    </a>
    <button onclick="window.api.logout()" 
            style="background:rgba(200,32,56,0.9); 
                   border:none; 
                   color:#fff; 
                   padding:8px 16px; 
                   border-radius:20px; 
                   cursor:pointer; 
                   font-size:0.9rem;
                   font-weight:600;
                   transition:all 0.3s;
                   display:flex;
                   align-items:center;
                   gap:6px;"
            onmouseover="this.style.background='rgba(200,32,56,1)'"
            onmouseout="this.style.background='rgba(200,32,56,0.9)'">
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path>
        <polyline points="16 17 21 12 16 7"></polyline>
        <line x1="21" y1="12" x2="9" y2="12"></line>
      </svg>
      <span>Sair</span>
    </button>
  `;
  header.appendChild(div);
}

function configurarBotoesNavegacao() {
  const btns = document.querySelectorAll(".btn-nav");

  // UX-004: swipe horizontal no grid do calendário para navegar entre meses
  const calWrapper = document.querySelector('.calendar-wrapper');
  if (calWrapper) {
    let _swipeStartX = 0;
    calWrapper.addEventListener('touchstart', (e) => {
      _swipeStartX = e.touches[0].clientX;
    }, { passive: true });
    calWrapper.addEventListener('touchend', (e) => {
      const dx = e.changedTouches[0].clientX - _swipeStartX;
      if (Math.abs(dx) < 60) return;
      if (dx < 0) btns[2].onclick(); // esquerda → próximo mês
      else btns[0].onclick();        // direita → mês anterior
    }, { passive: true });
  }

  btns[0].onclick = () => {
    ESTADO.mesAtual--;
    if (ESTADO.mesAtual < 1) {
      ESTADO.mesAtual = 12;
      ESTADO.anoAtual--;
    }
    carregarMes(ESTADO.anoAtual, ESTADO.mesAtual);
  };
  btns[1].onclick = () => {
    const hoje = new Date();
    ESTADO.anoAtual = hoje.getFullYear();
    ESTADO.mesAtual = hoje.getMonth() + 1;
    carregarMes(ESTADO.anoAtual, ESTADO.mesAtual);
    
    // 🟢 Destaque visual após renderização
    setTimeout(() => {
      destacarDiaAtual();
    }, 100);
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

/**
 * Aplica destaque visual ao dia atual no calendário
 * Classe CSS: .today (definida em styles.css)
 */
function destacarDiaAtual() {
  const hoje = new Date();
  const diaAtual = hoje.getDate();
  const mesAtual = hoje.getMonth() + 1;
  const anoAtual = hoje.getFullYear();

  // Só destaca se o mês exibido é o mês atual
  if (ESTADO.mesAtual === mesAtual && ESTADO.anoAtual === anoAtual) {
    const dataISO = `${anoAtual}-${String(mesAtual).padStart(2, '0')}-${String(diaAtual).padStart(2, '0')}`;
    const celula = document.querySelector(`.day-cell[data-iso="${dataISO}"]`);
    
    if (celula) {
      // Remove destaques anteriores (caso existam)
      document.querySelectorAll('.day-cell.today').forEach(el => {
        el.classList.remove('today');
      });
      
      // Aplica novo destaque
      celula.classList.add('today');
      
      // 🟢 Scroll suave até o dia (melhora UX em mobile)
      celula.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  }
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
