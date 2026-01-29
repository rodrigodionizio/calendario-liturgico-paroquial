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
 * ARQUIVO: error-handler.js
 * DESCRIÇÃO: Sistema Robusto de Tratamento de Erros
 * VERSÃO: 1.0
 */

// =============================
// CLASSE DE ERRO CUSTOMIZADA
// =============================
class APIError extends Error {
  constructor(message, code, originalError = null) {
    super(message);
    this.name = 'APIError';
    this.code = code;
    this.originalError = originalError;
    this.timestamp = new Date();
  }
  
  /**
   * Retorna mensagem amigável para o usuário
   */
  get userMessage() {
    const messages = {
      'NETWORK_ERROR': 'Erro de conexão. Verifique sua internet e tente novamente.',
      'AUTH_ERROR': 'Sessão expirada. Faça login novamente.',
      'PERMISSION_ERROR': 'Você não tem permissão para realizar esta ação.',
      'NOT_FOUND': 'Dados não encontrados.',
      'DUPLICATE': 'Este registro já existe no sistema.',
      'DB_ERROR': 'Erro ao processar dados. Tente novamente.',
      'SERVER_ERROR': 'Erro no servidor. Aguarde alguns instantes e tente novamente.',
      'UNKNOWN': 'Erro inesperado. Se persistir, contate o suporte.'
    };
    
    return messages[this.code] || messages['UNKNOWN'];
  }
  
  /**
   * Verifica se erro deve ser retentado
   */
  shouldRetry() {
    return ['NETWORK_ERROR', 'SERVER_ERROR'].includes(this.code);
  }
  
  /**
   * Retorna se é erro crítico que deve notificar admin
   */
  isCritical() {
    return ['DB_ERROR', 'SERVER_ERROR'].includes(this.code);
  }
}

// =============================
// HANDLER PRINCIPAL
// =============================
class ErrorHandler {
  
  /**
   * Executa função com retry automático e tratamento de erro
   * @param {Function} fn - Função assíncrona a executar
   * @param {number} retries - Número de tentativas
   * @param {string} context - Contexto da operação (para logging)
   * @returns {Promise} Resultado da função
   */
  static async handleAPICall(fn, retries = 3, context = 'API Call') {
    let lastError;
    
    for (let attempt = 1; attempt <= retries; attempt++) {
      try {
        const result = await fn();
        
        // Se recuperou após retry, notifica
        if (attempt > 1) {
          console.log(`✅ ${context} recuperado na tentativa ${attempt}`);
        }
        
        return result;
        
      } catch (error) {
        lastError = this.classify(error);
        
        console.warn(`⚠️ ${context} - Tentativa ${attempt}/${retries}:`, lastError.message);
        
        // Se não deve retentar OU atingiu limite de tentativas
        if (!lastError.shouldRetry() || attempt === retries) {
          break;
        }
        
        // Exponential backoff com jitter
        const baseDelay = 1000 * Math.pow(2, attempt - 1);
        const jitter = Math.random() * 500;
        const delay = Math.min(baseDelay + jitter, 10000);
        
        console.log(`⏳ Aguardando ${Math.round(delay)}ms antes de retentar...`);
        await this.sleep(delay);
      }
    }
    
    // Todas as tentativas falharam
    this.report(lastError, context);
    throw lastError;
  }
  
  /**
   * Classifica erro em categorias conhecidas
   * @param {Error} error - Erro original
   * @returns {APIError} Erro classificado
   */
  static classify(error) {
    // Network errors
    if (!navigator.onLine) {
      return new APIError(
        'Sem conexão com a internet',
        'NETWORK_ERROR',
        error
      );
    }
    
    if (error.message && error.message.includes('Failed to fetch')) {
      return new APIError(
        'Erro de rede ao conectar ao servidor',
        'NETWORK_ERROR',
        error
      );
    }
    
    // Supabase/PostgreSQL errors
    if (error.code) {
      switch (error.code) {
        case '23505':
          return new APIError('Registro duplicado', 'DUPLICATE', error);
        case '23503':
          return new APIError('Violação de referência', 'DB_ERROR', error);
        case 'PGRST116':
          return new APIError('Não encontrado', 'NOT_FOUND', error);
        case '42P01':
          return new APIError('Tabela não existe', 'DB_ERROR', error);
        default:
          return new APIError(`Erro no banco de dados: ${error.code}`, 'DB_ERROR', error);
      }
    }
    
    // HTTP status errors
    if (error.status) {
      if (error.status === 401) {
        return new APIError('Não autorizado', 'AUTH_ERROR', error);
      }
      if (error.status === 403) {
        return new APIError('Sem permissão', 'PERMISSION_ERROR', error);
      }
      if (error.status === 404) {
        return new APIError('Recurso não encontrado', 'NOT_FOUND', error);
      }
      if (error.status >= 500) {
        return new APIError('Erro do servidor', 'SERVER_ERROR', error);
      }
    }
    
    // Timeout errors
    if (error.name === 'AbortError' || error.message?.includes('timeout')) {
      return new APIError('Tempo de conexão esgotado', 'NETWORK_ERROR', error);
    }
    
    // Erro genérico
    return new APIError(
      error.message || 'Erro desconhecido',
      'UNKNOWN',
      error
    );
  }
  
  /**
   * Registra erro detalhado no console e serviços externos
   * @param {APIError} error - Erro classificado
   * @param {string} context - Contexto da operação
   */
  static report(error, context = '') {
    // Log detalhado no console
    console.group(`🚨 Erro Capturado${context ? ': ' + context : ''}`);
    console.error('Tipo:', error.code);
    console.error('Mensagem:', error.message);
    console.error('Timestamp:', error.timestamp.toISOString());
    
    if (error.originalError) {
      console.error('Original:', error.originalError);
      if (error.originalError.stack) {
        console.error('Stack:', error.originalError.stack);
      }
    }
    
    console.groupEnd();
    
    // TODO: Enviar para serviço de monitoramento (Sentry, LogRocket, etc)
    if (error.isCritical()) {
      this.sendToMonitoring(error, context);
    }
  }
  
  /**
   * Envia erro para serviço de monitoramento externo
   * @param {APIError} error - Erro a reportar
   * @param {string} context - Contexto da operação
   */
  static sendToMonitoring(error, context) {
    // Implementar integração com Sentry, LogRocket, etc
    // Exemplo com Sentry:
    /*
    if (window.Sentry) {
      Sentry.captureException(error.originalError || error, {
        level: 'error',
        tags: {
          error_code: error.code,
          context: context
        },
        extra: {
          userMessage: error.userMessage,
          timestamp: error.timestamp
        }
      });
    }
    */
    
    console.log('📡 [MONITORING] Erro crítico registrado:', {
      code: error.code,
      context: context,
      timestamp: error.timestamp
    });
  }
  
  /**
   * Mostra notificação visual para o usuário
   * @param {APIError} error - Erro a exibir
   * @param {Object} options - Opções de exibição
   */
  static showToUser(error, options = {}) {
    const {
      duration = 5000,
      type = 'error',
      showRetry = error.shouldRetry(),
      onRetry = null
    } = options;
    
    // Remove toasts antigos
    document.querySelectorAll('.error-toast').forEach(t => t.remove());
    
    // Cria toast notification
    const toast = document.createElement('div');
    toast.className = `error-toast error-toast--${type}`;
    
    const icon = type === 'error' ? '⚠️' : type === 'warning' ? '⚡' : 'ℹ️';
    
    toast.innerHTML = `
      <div class="error-toast__icon">${icon}</div>
      <div class="error-toast__content">
        <div class="error-toast__message">${error.userMessage}</div>
        ${showRetry && onRetry ? `
          <button class="error-toast__retry" onclick="this.closest('.error-toast').remove(); (${onRetry.toString()})()">
            🔄 Tentar Novamente
          </button>
        ` : ''}
      </div>
      <button class="error-toast__close" onclick="this.parentElement.remove()">×</button>
    `;
    
    document.body.appendChild(toast);
    
    // Animação de entrada
    setTimeout(() => toast.classList.add('show'), 10);
    
    // Auto-remove
    if (duration > 0) {
      setTimeout(() => {
        toast.classList.remove('show');
        setTimeout(() => toast.remove(), 300);
      }, duration);
    }
  }
  
  /**
   * Utilitário para aguardar (async sleep)
   * @param {number} ms - Milissegundos
   * @returns {Promise}
   */
  static sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
  
  /**
   * Wrapper para eventos do DOM com tratamento de erro
   * @param {Element} element - Elemento DOM
   * @param {string} event - Nome do evento
   * @param {Function} handler - Handler do evento
   */
  static safeEventListener(element, event, handler) {
    element.addEventListener(event, async (e) => {
      try {
        await handler(e);
      } catch (error) {
        const apiError = this.classify(error);
        this.report(apiError, `Event: ${event}`);
        this.showToUser(apiError);
      }
    });
  }
}

// =============================
// ESTILOS CSS PARA TOAST
// =============================
const style = document.createElement('style');
style.textContent = `
  .error-toast {
    position: fixed;
    bottom: 20px;
    right: 20px;
    background: white;
    border-radius: 12px;
    box-shadow: 0 4px 20px rgba(0,0,0,0.15);
    padding: 16px;
    display: flex;
    align-items: start;
    gap: 12px;
    max-width: 400px;
    min-width: 300px;
    z-index: 9999;
    opacity: 0;
    transform: translateY(20px);
    transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  }
  
  .error-toast.show {
    opacity: 1;
    transform: translateY(0);
  }
  
  .error-toast--error {
    border-left: 4px solid #c82038;
  }
  
  .error-toast--warning {
    border-left: 4px solid #fbb558;
  }
  
  .error-toast--info {
    border-left: 4px solid #0288d1;
  }
  
  .error-toast__icon {
    font-size: 1.5rem;
    line-height: 1;
  }
  
  .error-toast__content {
    flex: 1;
  }
  
  .error-toast__message {
    font-size: 0.9rem;
    line-height: 1.4;
    color: #333;
    margin-bottom: 8px;
  }
  
  .error-toast__retry {
    padding: 6px 12px;
    background: var(--cor-vinho, #a41d31);
    color: white;
    border: none;
    border-radius: 6px;
    font-size: 0.85rem;
    font-weight: 600;
    cursor: pointer;
    transition: background 0.2s;
  }
  
  .error-toast__retry:hover {
    background: var(--cor-cereja, #c82038);
  }
  
  .error-toast__close {
    background: none;
    border: none;
    font-size: 1.5rem;
    line-height: 1;
    cursor: pointer;
    color: #999;
    padding: 0;
    width: 24px;
    height: 24px;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: color 0.2s;
  }
  
  .error-toast__close:hover {
    color: #333;
  }
  
  @media (max-width: 600px) {
    .error-toast {
      left: 20px;
      right: 20px;
      max-width: none;
      min-width: 0;
    }
  }
`;
document.head.appendChild(style);

// =============================
// EXPORTA GLOBALMENTE
// =============================
window.ErrorHandler = ErrorHandler;
window.APIError = APIError;

console.log('✅ ErrorHandler v1.0 carregado');
