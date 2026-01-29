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
 * ARQUIVO: api.js
 * DESCRIÇÃO: Camada de Conexão Supabase e API
 * VERSÃO: 6.0
 */

const SUPABASE_URL = "https://gmfmebnodmtozpzhlgvk.supabase.co";
const SUPABASE_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdtZm1lYm5vZG10b3pwemhsZ3ZrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njc5NzU3MzIsImV4cCI6MjA4MzU1MTczMn0.29rhpFJ0I-ywPbHb4sgcdmNHaM_rJidCeaV3Cfos6Ro";

const _supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

window.api = {
  client: _supabaseClient,

  // =============================
  // SISTEMA DE CACHE
  // =============================
  /**
   * Obtém dados do cache se ainda válidos
   * @param {string} key - Chave do cache
   * @returns {*|null} Dados em cache ou null se expirado
   */
  getCache: function(key) {
    try {
      const item = sessionStorage.getItem(key);
      if (!item) return null;
      
      const { data, timestamp, ttl } = JSON.parse(item);
      const age = Date.now() - timestamp;
      
      if (age > ttl) {
        sessionStorage.removeItem(key);
        return null;
      }
      
      console.log(`📦 Cache hit: ${key} (idade: ${Math.round(age/1000)}s)`);
      return data;
    } catch (e) {
      console.warn('Erro ao ler cache:', e);
      return null;
    }
  },

  /**
   * Salva dados no cache com TTL
   * @param {string} key - Chave do cache
   * @param {*} data - Dados a cachear
   * @param {number} ttl - Tempo de vida em milissegundos (padrão: 5 minutos)
   */
  setCache: function(key, data, ttl = 5 * 60 * 1000) {
    try {
      sessionStorage.setItem(key, JSON.stringify({
        data,
        timestamp: Date.now(),
        ttl
      }));
      console.log(`💾 Cache salvo: ${key} (TTL: ${ttl/1000}s)`);
    } catch (e) {
      console.warn('Cache storage full ou erro:', e);
      // Se o storage estiver cheio, limpa caches antigos
      this.cleanOldCache();
    }
  },

  /**
   * Limpa cache de eventos (útil após modificações)
   */
  clearCache: function() {
    Object.keys(sessionStorage).forEach(key => {
      if (key.startsWith('eventos_')) {
        sessionStorage.removeItem(key);
      }
    });
    console.log('🗑️ Cache de eventos limpo');
  },

  /**
   * Remove caches antigos para liberar espaço
   */
  cleanOldCache: function() {
    Object.keys(sessionStorage).forEach(key => {
      if (key.startsWith('eventos_')) {
        try {
          const item = JSON.parse(sessionStorage.getItem(key));
          const age = Date.now() - item.timestamp;
          // Remove se tiver mais de 10 minutos
          if (age > 10 * 60 * 1000) {
            sessionStorage.removeItem(key);
          }
        } catch (e) {
          sessionStorage.removeItem(key);
        }
      }
    });
  },

  // =============================
  // 1 - INÍCIO: buscarEventos (com cache)
  // =============================
  buscarEventos: async function (ano, mes) {
    // 1. Verifica cache primeiro
    const cacheKey = `eventos_${ano}_${mes}`;
    const cached = this.getCache(cacheKey);
    
    if (cached) {
      return cached;
    }
    
    // 2. Busca do banco
    console.log(`🌐 Fetching: ${cacheKey}`);
    const mesStr = String(mes).padStart(2, "0");
    const inicio = `${ano}-${mesStr}-01`;
    const ultimoDia = new Date(ano, mes, 0).getDate();
    const fim = `${ano}-${mesStr}-${ultimoDia}`;
    
    const { data, error } = await _supabaseClient
      .from("eventos_base")
      .select(
        `*, liturgia_cores(hex_code), escalas(*, equipe_leitura:equipes!equipe_leitura_id(nome_equipe), equipe_canto:equipes!equipe_canto_id(nome_equipe), equipe_mep:equipes!equipe_mep_id(nome_equipe))`
      )
      .gte("data", inicio)
      .lte("data", fim)
      .order("data", { ascending: true });
    
    if (error) {
      console.error('❌ API Error:', error);
      return [];
    }
    
    // 3. Salva em cache
    this.setCache(cacheKey, data);
    return data;
  },
  // =============================
  // 1 - FIM: buscarEventos
  // =============================

  // =============================
  // 1.1 - INÍCIO: buscarEventosRange (Novo - Impressão Personalizada)
  // =============================
  buscarEventosRange: async function (dataInicio, dataFim) {
    const { data, error } = await _supabaseClient
      .from("eventos_base")
      .select(
        `*, liturgia_cores(hex_code), escalas(*, equipe_leitura:equipes!equipe_leitura_id(nome_equipe), equipe_canto:equipes!equipe_canto_id(nome_equipe), equipe_mep:equipes!equipe_mep_id(nome_equipe))`
      )
      .gte("data", dataInicio)
      .lte("data", dataFim)
      .order("data", { ascending: true });
    return error ? [] : data;
  },
  // =============================
  // 1.1 - FIM: buscarEventosRange
  // =============================

  // =============================
  // 2 - INÍCIO: buscarAvisos
  // =============================
  // Argumentos: Nenhum
  // Descrição: Busca eventos em destaque para o mural lateral (Público).
  buscarAvisos: async function () {
    const hoje = new Date().toISOString().split("T")[0];
    const { data, error } = await _supabaseClient
      .from("eventos_base")
      .select("id, titulo, data, local, mural_prioridade, hora_inicio")
      .eq("mural_destaque", true)
      .gte("data", hoje)
      .order("data", { ascending: true })
      .limit(5);
    return error ? [] : data;
  },
  // =============================
  // 2 - FIM: buscarAvisos
  // =============================

  // =============================
  // 3 - INÍCIO: buscarEstatisticasDashboard
  // =============================
  buscarEstatisticasDashboard: async function () {
    const hoje = new Date().toISOString().split("T")[0];
    const { count: semana } = await _supabaseClient
      .from("eventos_base")
      .select("*", { count: "exact", head: true })
      .gte("data", hoje);
    const { count: pendentes } = await _supabaseClient
      .from("eventos_base")
      .select("*", { count: "exact", head: true })
      .eq("status", "pendente");
    const { count: mural } = await _supabaseClient
      .from("eventos_base")
      .select("*", { count: "exact", head: true })
      .eq("mural_destaque", true)
      .gte("data", hoje);
    const { count: equipes } = await _supabaseClient
      .from("equipes")
      .select("*", { count: "exact", head: true });
    return {
      semana: semana || 0,
      pendentes: pendentes || 0,
      mural: mural || 0,
      equipes: equipes || 0,
    };
  },
  // =============================
  // 3 - FIM: buscarEstatisticasDashboard
  // =============================

  // =============================
  // 4 - INÍCIO: buscarEventosRecentes
  // =============================
  buscarEventosRecentes: async function (limite) {
    const { data } = await _supabaseClient
      .from("eventos_base")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(limite);
    return data || [];
  },
  // =============================
  // 4 - FIM: buscarEventosRecentes
  // =============================

  // =============================
  // 5 - INÍCIO: Gestão CRUD (Equipes/Users)
  // =============================
  listarEquipes: async function () {
    const { data } = await _supabaseClient
      .from("equipes")
      .select("*")
      .order("nome_equipe");
    return data || [];
  },
  salvarEquipe: async function (eq) {
    if (eq.id)
      return await _supabaseClient
        .from("equipes")
        .update({ nome_equipe: eq.nome, tipo_atuacao: eq.tipo })
        .eq("id", eq.id);
    return await _supabaseClient
      .from("equipes")
      .insert({ nome_equipe: eq.nome, tipo_atuacao: eq.tipo });
  },
  excluirEquipe: async function (id) {
    return await _supabaseClient.from("equipes").delete().eq("id", id);
  },
  buscarUsuarios: async function () {
    const { data } = await _supabaseClient
      .from("admins_allowlist")
      .select("*")
      .order("nome");
    return data || [];
  },
  salvarUsuario: async function (u) {
    const p = {
      email: u.email,
      nome: u.nome,
      perfil_nivel: parseInt(u.perfil_nivel),
    };
    if (u.id)
      return await _supabaseClient
        .from("admins_allowlist")
        .update(p)
        .eq("id", u.id);
    return await _supabaseClient.from("admins_allowlist").insert(p);
  },
  excluirUsuario: async function (id) {
    return await _supabaseClient.from("admins_allowlist").delete().eq("id", id);
  },
  // =============================
  // 5 - FIM: Gestão CRUD
  // =============================

  checkSession: async function () {
    const { data } = await _supabaseClient.auth.getSession();
    return data.session;
  },
  logout: async function () {
    await _supabaseClient.auth.signOut();
    window.location.href = "admin.html";
  },
  // =============================
  // 6 - INÍCIO: buscarEventosProximos
  // =============================
  // Argumentos: dias (Integer)
  // Descrição: Busca datas dos próximos eventos para alimentar o gráfico de carga.
  buscarEventosProximos: async function (dias = 7) {
    const hoje = new Date().toISOString().split("T")[0];
    const { data, error } = await _supabaseClient
      .from("eventos_base")
      .select("data")
      .gte("data", hoje)
      .limit(100);
    return error ? [] : data;
  },
  // =============================
  // 6 - FIM: buscarEventosProximos
  // =============================

  // =============================
  // NEW: salvarEventoCompleto (Fix solicitado + Cache Invalidation)
  // =============================
  salvarEventoCompleto: async function (eventoPayload, escalasPayload) {
    // 1. Salva/Atualiza o Evento Base
    let eventoId = eventoPayload.id;

    // Remove ID null/undefined para o insert criar novo
    if (!eventoId || eventoId === "null") {
      delete eventoPayload.id;
      const { data, error } = await _supabaseClient
        .from("eventos_base")
        .insert(eventoPayload)
        .select()
        .single();
      if (error) throw error;
      eventoId = data.id;
    } else {
      const { error } = await _supabaseClient
        .from("eventos_base")
        .update(eventoPayload)
        .eq("id", eventoId);
      if (error) throw error;
    }

    // 2. Gerencia as Escalas (Remove antigas e cria novas)
    // Primeiro limpamos as escalas anteriores desse evento
    if (escalasPayload && escalasPayload.length > 0) {
      // Nota: Assumindo que a tabela de escalas tem uma coluna 'evento_id' foreign key
      // Se o schema usar 'liturgia_id', ajuste conforme sua estrutura real.
      // O padrão do projeto parece ser conectar via id.

      // Delete previous scales
      await _supabaseClient
        .from("escalas")
        .delete()
        .eq("evento_id", eventoId);

      // Prepare new scales
      const scalesToInsert = escalasPayload.map(s => ({
        evento_id: eventoId,
        hora_celebracao: s.hora_celebracao,
        equipe_leitura_id: s.equipe_leitura_id,
        equipe_canto_id: s.equipe_canto_id,
        equipe_mep_id: s.equipe_mep_id || null,
        celebrante_nome: s.celebrante_nome || null,
        lista_mesce: s.lista_mesce || [],
        lista_coroinhas: s.lista_coroinhas || []
      }));

      const { error: errScales } = await _supabaseClient
        .from("escalas")
        .insert(scalesToInsert);

      if (errScales) console.error("Erro ao salvar escalas:", errScales);
    }
    
    // 3. NOVO: Invalida cache do mês modificado
    const data = new Date(eventoPayload.data);
    const ano = data.getFullYear();
    const mes = data.getMonth() + 1;
    const cacheKey = `eventos_${ano}_${mes}`;
    sessionStorage.removeItem(cacheKey);
    console.log(`🗑️ Cache invalidado após salvar: ${cacheKey}`);
    
    return eventoId;
  },

  // =============================
  // 7 - INÍCIO: buscarEventosDia
  // =============================
  buscarEventosDia: async function (dataISO) {
    const { data, error } = await _supabaseClient
      .from("eventos_base")
      .select(
        `*, liturgia_cores(hex_code), escalas(*, equipe_leitura:equipes!equipe_leitura_id(nome_equipe), equipe_canto:equipes!equipe_canto_id(nome_equipe), equipe_mep:equipes!equipe_mep_id(nome_equipe))`
      )
      .eq("data", dataISO)
      .order("created_at", { ascending: true });
    return error ? [] : data;
  },
  // =============================
  // 8 - INÍCIO: solicitarNovaSenha
  // =============================
  // Descrição: Dispara o e-mail oficial do Supabase para o usuário criar/resetar a senha.
  solicitarNovaSenha: async function (email) {
    const { data, error } = await _supabaseClient.auth.resetPasswordForEmail(
      email,
      {
        redirectTo: window.location.origin + "/admin.html", // Onde ele volta após clicar no e-mail
      }
    );
    if (error) throw error;
    return data;
  },

  // =============================
  // 9 - INÍCIO: criarContaPrimeiroAcesso
  // =============================
  // Descrição: Tenta criar a conta no Auth. O Supabase só deixará logar se o e-mail estiver na Allowlist (via RLS).
  criarContaPrimeiroAcesso: async function (email, senha) {
    const { data, error } = await _supabaseClient.auth.signUp({
      email: email,
      password: senha,
    });
    if (error) throw error;
    return data;
  },

  // =============================
  // 16 - INÍCIO: replicarEventoPadrao
  // =============================
  // Argumentos: eventoPayload (Obj), escalasPayload (Array), mesesLimite (Int)
  // Descrição: Identifica o padrão do dia (ex: 1º Domingo) e replica para os meses futuros.
  replicarEventoPadrao: async function (evento, escalas, meses = 3) {
    const datas = this.calcularProximasDatas(evento.data, meses);
    for (const d of datas) {
      const novoEvento = { ...evento, id: undefined, data: d };
      await this.salvarEventoCompleto(novoEvento, escalas);
    }
    return true;
  },

  // =============================
  // 17 - INÍCIO: calcularProximasDatas
  // =============================
  calcularProximasDatas: function (dataInicio, meses) {
    const d = new Date(dataInicio + "T12:00:00");
    const diaSemana = d.getDay();
    const ordemNoMes = Math.ceil(d.getDate() / 7);
    const resultados = [];

    for (let i = 1; i <= meses; i++) {
      let busca = new Date(d.getFullYear(), d.getMonth() + i, 1);
      let offset = (7 + diaSemana - busca.getDay()) % 7;
      let diaAlvo = 1 + offset + ((ordemNoMes - 1) * 7);
      let dataFinal = new Date(busca.getFullYear(), busca.getMonth(), diaAlvo);

      if (dataFinal.getMonth() === busca.getMonth()) {
        resultados.push(dataFinal.toISOString().split('T')[0]);
      }
    }
    return resultados;
  },
};
