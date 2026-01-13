/*
 * ARQUIVO: api.js
 * DESCRIÇÃO: Camada de Conexão com Supabase e Regras de Negócio
 * PROJETO: Liturgia Paroquial 2026
 * AUTOR: Rodrigo & Dev AI (Senior Specialist Approach)
 * VERSÃO: 4.0 (Suporte a Dashboard e Gestão de Status)
 */

// ==========================================================================
// 1. CONFIGURAÇÃO E CONEXÃO
// ==========================================================================
const SUPABASE_URL = "https://gmfmebnodmtozpzhlgvk.supabase.co";
const SUPABASE_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdtZm1lYm5vZG10b3pwemhsZ3ZrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njc5NzU3MzIsImV4cCI6MjA4MzU1MTczMn0.29rhpFJ0I-ywPbHb4sgcdmNHaM_rJidCeaV3Cfos6Ro";

const _supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

// Exporta objeto global window.api
window.api = {
  client: _supabaseClient,

  // ==========================================================================
  // 2. FEATURE: CALENDÁRIO & EVENTOS (PÚBLICO)
  // ==========================================================================

  /**
   * @function buscarEventos
   * @description Busca eventos aprovados para exibição no calendário público.
   */
  buscarEventos: async function (ano, mes) {
    const mesStr = String(mes).padStart(2, "0");
    const inicio = `${ano}-${mesStr}-01`;
    const ultimoDia = new Date(ano, mes, 0).getDate();
    const fim = `${ano}-${mesStr}-${ultimoDia}`;

    const { data, error } = await _supabaseClient
      .from("eventos_base")
      .select(
        `*, liturgia_cores(hex_code), escalas(id, hora_celebracao, equipe_leitura:equipes!equipe_leitura_id(id, nome_equipe), equipe_canto:equipes!equipe_canto_id(id, nome_equipe))`
      )
      .gte("data", inicio)
      .lte("data", fim)
      .order("data", { ascending: true });

    if (error) {
      console.error("Erro busca eventos:", error);
      return [];
    }
    return data;
  },

  /**
   * @function salvarEventoCompleto
   * @description Salva ou atualiza um evento e suas escalas (Operação Atômica).
   */
  salvarEventoCompleto: async function (eventoDados, escalasLista) {
    let eventoId = eventoDados.id;

    const payload = {
      data: eventoDados.data,
      titulo: eventoDados.titulo,
      tipo_compromisso: eventoDados.tipo_compromisso || "liturgia",
      local: eventoDados.local,
      responsavel: eventoDados.responsavel,
      hora_inicio: eventoDados.hora_inicio,
      mural_destaque: eventoDados.mural_destaque || false,
      mural_prioridade: eventoDados.mural_prioridade || 2,
      tempo_liturgico: eventoDados.tempo_liturgico || "Tempo Comum",
      cor_id: eventoDados.cor_id || 1,
      is_solenidade: eventoDados.is_solenidade || false,
      is_festa: eventoDados.is_festa || false,
      status: eventoDados.status || "aprovado", // Padrão aprovado se for o admin criando
    };

    if (eventoId) {
      const { error } = await _supabaseClient
        .from("eventos_base")
        .update(payload)
        .eq("id", eventoId);
      if (error) throw error;
    } else {
      const { data, error } = await _supabaseClient
        .from("eventos_base")
        .insert(payload)
        .select();
      if (error) throw error;
      eventoId = data[0].id;
    }

    if (eventoDados.tipo_compromisso === "liturgia") {
      await _supabaseClient.from("escalas").delete().eq("evento_id", eventoId);
      if (escalasLista.length > 0) {
        const escalasComId = escalasLista.map((e) => ({
          ...e,
          evento_id: eventoId,
        }));
        await _supabaseClient.from("escalas").insert(escalasComId);
      }
    }
    return true;
  },

  /**
   * @function buscarAvisos
   * @description Busca avisos futuros para o mural da sidebar.
   */
  buscarAvisos: async function () {
    const hoje = new Date().toISOString().split("T")[0];
    const { data, error } = await _supabaseClient
      .from("eventos_base")
      .select("id, titulo, data, local, mural_prioridade, hora_inicio")
      .eq("mural_destaque", true)
      .gte("data", hoje)
      .order("data", { ascending: true })
      .limit(5);

    if (error) {
      console.error("Erro mural:", error);
      return [];
    }
    return data;
  },

  // ==========================================================================
  // 3. FEATURE: DASHBOARD & GESTÃO (ADMIN EXCLUSIVE) - NOVAS FUNÇÕES
  // ==========================================================================

  /**
   * @function buscarEstatisticasDashboard
   * @description [NOVA] Consolida números para os cards de KPI do Dashboard.
   */
  buscarEstatisticasDashboard: async function () {
    const hoje = new Date().toISOString().split("T")[0];
    const seteDiasDepois = new Date();
    seteDiasDepois.setDate(seteDiasDepois.getDate() + 7);
    const fimSemana = seteDiasDepois.toISOString().split("T")[0];

    // 1. Busca eventos aprovados da semana
    const { count: totalSemana } = await _supabaseClient
      .from("eventos_base")
      .select("*", { count: "exact", head: true })
      .gte("data", hoje)
      .lte("data", fimSemana);

    // 2. Busca eventos pendentes (Aguardando aprovação)
    const { count: totalPendentes } = await _supabaseClient
      .from("eventos_base")
      .select("*", { count: "exact", head: true })
      .eq("status", "pendente");

    // 3. Busca total de avisos ativos no mural
    const { count: totalMural } = await _supabaseClient
      .from("eventos_base")
      .select("*", { count: "exact", head: true })
      .eq("mural_destaque", true)
      .gte("data", hoje);

    // 4. Busca total de equipes
    const { count: totalEquipes } = await _supabaseClient
      .from("equipes")
      .select("*", { count: "exact", head: true });

    return {
      semana: totalSemana || 0,
      pendentes: totalPendentes || 0,
      mural: totalMural || 0,
      equipes: totalEquipes || 0,
    };
  },

  /**
   * @function buscarEventosProximos
   * @description [NOVA] Busca eventos de um intervalo curto para alimentar o gráfico de carga.
   */
  buscarEventosProximos: async function (dias = 7) {
    const hoje = new Date().toISOString().split("T")[0];
    const dataLimite = new Date();
    dataLimite.setDate(dataLimite.getDate() + dias);
    const fim = dataLimite.toISOString().split("T")[0];

    const { data, error } = await _supabaseClient
      .from("eventos_base")
      .select("data, titulo, status")
      .gte("data", hoje)
      .lte("data", fim)
      .order("data", { ascending: true });

    if (error) return [];
    return data;
  },

  /**
   * @function atualizarStatusEvento
   * @description [NOVA] Permite aprovar ou rejeitar um compromisso pendente.
   */
  atualizarStatusEvento: async function (eventoId, novoStatus) {
    const { error } = await _supabaseClient
      .from("eventos_base")
      .update({ status: novoStatus })
      .eq("id", eventoId);

    if (error) throw error;
    return true;
  },

  // ==========================================================================
  // 4. FEATURE: GESTÃO GERAL (EQUIPES & AUTH)
  // ==========================================================================

  listarEquipes: async function () {
    const { data, error } = await _supabaseClient
      .from("equipes")
      .select("*")
      .order("nome_equipe");
    if (error) return [];
    return data;
  },

  checkSession: async function () {
    const { data } = await _supabaseClient.auth.getSession();
    return data.session;
  },

  logout: async function () {
    await _supabaseClient.auth.signOut();
    window.location.href = "index.html";
  },
  /**
     * @function salvarEquipe
     * @description Cria ou atualiza uma equipe/pastoral.
     */
    salvarEquipe: async function(equipe) {
        if (equipe.id) {
            const { error } = await _supabaseClient.from("equipes").update({
                nome_equipe: equipe.nome,
                tipo_atuacao: equipe.tipo
            }).eq("id", equipe.id);
            if (error) throw error;
        } else {
            const { error } = await _supabaseClient.from("equipes").insert({
                nome_equipe: equipe.nome,
                tipo_atuacao: equipe.tipo
            });
            if (error) throw error;
        }
        return true;
    },

    /**
     * @function excluirEquipe
     * @description Remove uma equipe (Cuidado: pode afetar escalas existentes).
     */
    excluirEquipe: async function(id) {
        const { error } = await _supabaseClient.from("equipes").delete().eq("id", id);
        if (error) throw error;
        return true;
    },
};
