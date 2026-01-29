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
 * ARQUIVO: modal-controller.js
 * DESCRIÇÃO: Sistema Unificado de Modais
 * VERSÃO: 2.0
 */

window.ModalController = {
  // =============================
  // ESTADO GLOBAL
  // =============================
  state: {
    isAdmin: false,
    currentData: null,
    currentMode: 'view', // 'view' ou 'edit'
    currentDate: null
  },

  // =============================
  // INICIALIZAÇÃO
  // =============================
  /**
   * Inicializa o controlador de modal
   * @param {boolean} isAdmin - Se o usuário é admin
   */
  init: function(isAdmin) {
    this.state.isAdmin = isAdmin;
    this.setupEventListeners();
    console.log('✅ ModalController inicializado -', isAdmin ? 'Modo Admin' : 'Modo Público');
  },

  /**
   * Configura event listeners globais
   */
  setupEventListeners: function() {
    // ESC fecha modal
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        this.fechar();
      }
    });

    // Click fora fecha modal
    const overlay = document.getElementById('modalOverlay');
    if (overlay) {
      overlay.addEventListener('click', (e) => {
        if (e.target.id === 'modalOverlay') {
          this.fechar();
        }
      });
    }
  },

  // =============================
  // ABERTURA DO MODAL
  // =============================
  /**
   * Abre modal com dados do evento
   * @param {string} dataISO - Data no formato YYYY-MM-DD
   * @param {string} mode - 'view' ou 'edit'
   */
  abrir: async function(dataISO, mode = 'view') {
    try {
      console.log(`📅 Abrindo modal: ${dataISO} | Modo: ${mode}`);
      
      // Busca dados (com cache)
      const eventos = await this.carregarDados(dataISO);
      
      // Gera HTML baseado no modo
      const html = this.gerarHTML(eventos, dataISO, mode);
      
      // Renderiza
      const modalContent = document.getElementById('modalContent');
      const modalOverlay = document.getElementById('modalOverlay');
      
      if (!modalContent || !modalOverlay) {
        console.error('❌ Elementos do modal não encontrados');
        return;
      }
      
      modalContent.innerHTML = html;
      modalOverlay.classList.add('active');
      
      // Configura handlers específicos do modo
      if (mode === 'edit') {
        this.setupEditHandlers();
      }
      
      // Atualiza estado
      this.state.currentData = eventos;
      this.state.currentMode = mode;
      this.state.currentDate = dataISO;
      
    } catch (error) {
      this.mostrarErro(error);
    }
  },

  // =============================
  // CARREGAMENTO DE DADOS
  // =============================
  /**
   * Carrega dados com cache inteligente
   * @param {string} dataISO - Data no formato YYYY-MM-DD
   * @returns {Promise<Array>} Lista de eventos
   */
  carregarDados: async function(dataISO) {
    const cacheKey = `eventos_${dataISO}`;
    const cached = sessionStorage.getItem(cacheKey);
    
    if (cached) {
      const { data, timestamp } = JSON.parse(cached);
      const age = Date.now() - timestamp;
      
      // Cache válido por 5 minutos
      if (age < 5 * 60 * 1000) {
        console.log('📦 Usando dados em cache');
        return data;
      }
    }
    
    // Busca do banco
    console.log('🌐 Buscando dados da API');
    const eventos = await window.api.buscarEventosDia(dataISO);
    
    // Salva em cache
    sessionStorage.setItem(cacheKey, JSON.stringify({
      data: eventos,
      timestamp: Date.now()
    }));
    
    return eventos;
  },

  /**
   * Invalida cache para uma data específica
   * @param {string} dataISO - Data no formato YYYY-MM-DD
   */
  invalidarCache: function(dataISO) {
    const cacheKey = `eventos_${dataISO}`;
    sessionStorage.removeItem(cacheKey);
    console.log('🗑️ Cache invalidado:', cacheKey);
  },

  // =============================
  // GERAÇÃO DE HTML
  // =============================
  /**
   * Gera HTML do modal baseado no modo
   * @param {Array} eventos - Lista de eventos
   * @param {string} dataISO - Data no formato YYYY-MM-DD
   * @param {string} mode - 'view' ou 'edit'
   * @returns {string} HTML do modal
   */
  gerarHTML: function(eventos, dataISO, mode) {
    const dataObj = new Date(dataISO + 'T12:00:00');
    const header = this.gerarHeader(dataObj);
    
    if (eventos.length === 0) {
      return this.templateVazio(header, dataISO, mode);
    }
    
    if (mode === 'view') {
      return this.templateVisualizacao(header, eventos, dataISO);
    } else {
      return this.templateEdicao(header, eventos, dataISO);
    }
  },

  /**
   * Template de header (comum a todos)
   * @param {Date} dataObj - Objeto Date
   * @returns {string} HTML do header
   */
  gerarHeader: function(dataObj) {
    const dia = dataObj.getDate();
    const mes = dataObj.toLocaleString('pt-BR', { month: 'short' }).replace('.', '').toUpperCase();
    const diaSemana = dataObj.toLocaleString('pt-BR', { weekday: 'long' });
    const diaSemanaCapitalizado = diaSemana.charAt(0).toUpperCase() + diaSemana.slice(1);
    
    return `
      <div class="modal-header">
        <div class="modal-date-display">
          <span class="modal-day">${dia}</span>
          <span class="modal-month">${mes}</span>
        </div>
        <div class="modal-meta">
          <div class="modal-weekday">${diaSemanaCapitalizado}</div>
        </div>
      </div>
    `;
  },

  /**
   * Template para dia sem eventos
   * @param {string} header - HTML do header
   * @param {string} dataISO - Data no formato YYYY-MM-DD
   * @param {string} mode - 'view' ou 'edit'
   * @returns {string} HTML completo
   */
  templateVazio: function(header, dataISO, mode) {
    const btnAdmin = this.state.isAdmin ? 
      `<button onclick="ModalController.abrir('${dataISO}', 'edit')" 
              class="btn-admin-action"
              style="margin-top: 20px; padding: 12px 24px; background: var(--cor-vinho); color: white; border: none; border-radius: 8px; cursor: pointer; font-weight: 600;">
         ➕ ADICIONAR COMPROMISSO
       </button>` : '';
    
    return `
      <div class="modal-card">
        <button class="btn-close" onclick="ModalController.fechar()">×</button>
        <div class="modal-sidebar-color" style="background-color: #ccc"></div>
        <div class="modal-body">
          ${header}
          <div class="c-alert" style="padding: 16px; background: #f5f5f5; border-radius: 8px; margin-top: 20px;">
            <p style="margin: 0; color: #666;">📅 Nenhum compromisso agendado para este dia.</p>
          </div>
          ${btnAdmin}
        </div>
      </div>
    `;
  },

  /**
   * Template de visualização (público e preview admin)
   * @param {string} header - HTML do header
   * @param {Array} eventos - Lista de eventos
   * @param {string} dataISO - Data no formato YYYY-MM-DD
   * @returns {string} HTML completo
   */
  templateVisualizacao: function(header, eventos, dataISO) {
    const evento = eventos[0]; // Por enquanto, mostra primeiro evento
    
    const corLiturgica = evento.liturgia_cores?.hex_code || '#2e7d32';
    const conteudo = this.gerarConteudoEvento(evento);
    
    const btnAdmin = this.state.isAdmin ? 
      `<button onclick="ModalController.alternarModo()" 
              class="btn-admin-action"
              style="margin-top: 20px; padding: 12px 24px; background: var(--cor-vinho); color: white; border: none; border-radius: 8px; cursor: pointer; font-weight: 600;">
         🛠️ MODO EDIÇÃO
       </button>` : '';
    
    return `
      <div class="modal-card">
        <button class="btn-close" onclick="ModalController.fechar()">×</button>
        <div class="modal-sidebar-color" style="background-color: ${corLiturgica}"></div>
        <div class="modal-body">
          ${header}
          <div class="modal-liturgia" style="color: ${corLiturgica}; font-weight: 600; margin: 12px 0;">
            ${evento.tempo_liturgico || 'Tempo Comum'}
          </div>
          <div class="modal-titulo" style="font-size: 1.5rem; font-weight: 700; margin: 12px 0;">
            ${evento.titulo}
          </div>
          ${conteudo}
          ${btnAdmin}
        </div>
      </div>
    `;
  },

  /**
   * Template de edição (admin apenas)
   * @param {string} header - HTML do header
   * @param {Array} eventos - Lista de eventos
   * @param {string} dataISO - Data no formato YYYY-MM-DD
   * @returns {string} HTML completo
   */
  templateEdicao: function(header, eventos, dataISO) {
    // Para modo de edição, mantém a funcionalidade do dashboard.js
    // Aqui é um placeholder - a implementação completa virá da integração
    
    return `
      <div class="modal-card">
        <button class="btn-close" onclick="ModalController.fechar()">×</button>
        <div class="modal-sidebar-color" style="background-color: var(--cor-vinho)"></div>
        <div class="modal-body">
          ${header}
          <div id="form-edicao" style="margin-top: 20px;">
            <p style="padding: 16px; background: #fffbea; border-left: 4px solid var(--cor-dourado); border-radius: 4px;">
              🔧 Modo de edição em desenvolvimento.<br>
              Por enquanto, use o dashboard para editar eventos.
            </p>
            <button onclick="ModalController.alternarModo()" 
                    class="btn-link"
                    style="margin-top: 12px; color: var(--cor-vinho); text-decoration: underline; background: none; border: none; cursor: pointer;">
              👁️ VER PREVIEW
            </button>
          </div>
        </div>
      </div>
    `;
  },

  /**
   * Gera conteúdo específico do evento
   * @param {Object} evento - Dados do evento
   * @returns {string} HTML do conteúdo
   */
  gerarConteudoEvento: function(evento) {
    let html = '';
    
    // Horário
    if (evento.horario) {
      html += `
        <div class="modal-info-row" style="margin: 12px 0; display: flex; align-items: center; gap: 8px;">
          <span style="font-size: 1.2rem;">🕒</span>
          <span style="font-weight: 600;">${evento.horario}</span>
        </div>
      `;
    }
    
    // Local
    if (evento.local) {
      html += `
        <div class="modal-info-row" style="margin: 12px 0; display: flex; align-items: center; gap: 8px;">
          <span style="font-size: 1.2rem;">📍</span>
          <span>${evento.local}</span>
        </div>
      `;
    }
    
    // Descrição
    if (evento.descricao) {
      html += `
        <div class="modal-descricao" style="margin: 16px 0; padding: 12px; background: #f9f9f9; border-radius: 8px;">
          <p style="margin: 0; line-height: 1.6;">${evento.descricao}</p>
        </div>
      `;
    }
    
    // Escalas (se for liturgia)
    if (evento.tipo_compromisso === 'liturgia' && evento.escalas && evento.escalas.length > 0) {
      html += this.gerarEscalasLiturgicas(evento.escalas[0]);
    }
    
    return html;
  },

  /**
   * Gera HTML das escalas litúrgicas
   * @param {Object} escala - Dados da escala
   * @returns {string} HTML das escalas
   */
  gerarEscalasLiturgicas: function(escala) {
    let html = '<div class="modal-escalas" style="margin-top: 20px; padding-top: 20px; border-top: 1px solid #e0e0e0;">';
    html += '<h4 style="margin: 0 0 12px 0; font-size: 1rem; color: var(--cor-vinho);">📋 Escalas do Dia</h4>';
    
    if (escala.celebrante) {
      html += `
        <div class="escala-item" style="margin: 8px 0;">
          <strong>🐑 Celebrante:</strong> ${escala.celebrante}
        </div>
      `;
    }
    
    if (escala.equipe_leitura?.nome_equipe) {
      html += `
        <div class="escala-item" style="margin: 8px 0;">
          <strong>📖 Leitura:</strong> ${escala.equipe_leitura.nome_equipe}
        </div>
      `;
    }
    
    if (escala.equipe_canto?.nome_equipe) {
      html += `
        <div class="escala-item" style="margin: 8px 0;">
          <strong>🎵 Canto:</strong> ${escala.equipe_canto.nome_equipe}
        </div>
      `;
    }
    
    if (escala.equipe_mep?.nome_equipe) {
      html += `
        <div class="escala-item" style="margin: 8px 0;">
          <strong>📜 MEP:</strong> ${escala.equipe_mep.nome_equipe}
        </div>
      `;
    }
    
    html += '</div>';
    return html;
  },

  // =============================
  // AÇÕES DO MODAL
  // =============================
  /**
   * Alterna entre modo view e edit
   */
  alternarModo: function() {
    if (!this.state.isAdmin) {
      console.warn('⚠️ Apenas admins podem alternar modo');
      return;
    }
    
    const novoModo = this.state.currentMode === 'view' ? 'edit' : 'view';
    
    if (this.state.currentDate) {
      this.abrir(this.state.currentDate, novoModo);
    }
  },

  /**
   * Fecha o modal
   */
  fechar: function() {
    const modalOverlay = document.getElementById('modalOverlay');
    if (modalOverlay) {
      modalOverlay.classList.remove('active');
    }
    
    // Limpa estado
    this.state.currentData = null;
    this.state.currentMode = 'view';
    this.state.currentDate = null;
    
    console.log('✅ Modal fechado');
  },

  /**
   * Configura handlers para modo de edição
   */
  setupEditHandlers: function() {
    // Implementar lógica de edição
    console.log('🔧 Handlers de edição configurados');
  },

  // =============================
  // TRATAMENTO DE ERROS
  // =============================
  /**
   * Mostra erro amigável
   * @param {Error} error - Objeto de erro
   */
  mostrarErro: function(error) {
    console.error('❌ Erro no modal:', error);
    
    const html = `
      <div class="modal-card">
        <button class="btn-close" onclick="ModalController.fechar()">×</button>
        <div class="modal-body" style="padding: 30px;">
          <div class="c-alert c-alert--destructive" 
               style="padding: 20px; background: #fff5f5; border-left: 4px solid #c82038; border-radius: 8px;">
            <div style="display: flex; gap: 12px; align-items: start;">
              <span style="font-size: 1.5rem;">⚠️</span>
              <div>
                <strong style="display: block; margin-bottom: 8px; color: #a41d31;">Erro ao Carregar Dados</strong>
                <p style="margin: 0 0 12px 0; color: #666;">
                  Não foi possível carregar os eventos. Verifique sua conexão e tente novamente.
                </p>
                <button onclick="location.reload()" 
                        style="padding: 8px 16px; background: var(--cor-vinho); color: white; border: none; border-radius: 6px; cursor: pointer; font-weight: 600;">
                  🔄 Recarregar Página
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    `;
    
    const modalContent = document.getElementById('modalContent');
    const modalOverlay = document.getElementById('modalOverlay');
    
    if (modalContent && modalOverlay) {
      modalContent.innerHTML = html;
      modalOverlay.classList.add('active');
    }
  }
};

// =============================
// AUTO-INICIALIZAÇÃO
// =============================
console.log('📦 ModalController v2.0 carregado');
