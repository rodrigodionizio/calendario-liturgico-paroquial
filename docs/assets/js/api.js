/*
 * ARQUIVO: api.js
 * DESCRIÇÃO: Camada de Conexão com Supabase e Regras de Negócio
 * PROJETO: Liturgia Paroquial 2026
 * AUTOR: Rodrigo & Dev AI (Senior Specialist)
 * VERSÃO: 3.2 (Integridade Total + Documentação)
 */

// ==========================================================================
// 1. CONFIGURAÇÃO E CONEXÃO
// ==========================================================================
const SUPABASE_URL = "https://gmfmebnodmtozpzhlgvk.supabase.co";
const SUPABASE_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdtZm1lYm5vZG10b3pwemhlZ3ZrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njc5NzU3MzIsImV4cCI6MjA4MzU1MTczMn0.29rhpFJ0I-ywPbHb4sgcdmNHaM_rJidCeaV3Cfos6Ro";

const _supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

window.api = {
  client: _supabaseClient,

  // ==========================================================================
  // 2. FEATURE: BUSCA DE EVENTOS E ESCALAS
  // ==========================================================================
  /* INÍCIO: Método buscarEventos */
  buscarEventos: async function (ano, mes, apenasAprovados = true) {
    const mesStr = String(mes).padStart(2, "0");
    const inicio = `${ano}-${mesStr}-01`;
    const ultimoDia = new Date(ano, mes, 0).getDate();
    const fim = `${ano}-${mesStr}-${ultimoDia}`;

    try {
      let query = _supabaseClient
        .from("eventos_base")
        .select(
          `*, liturgia_cores(hex_code), escalas(id, hora_celebracao, equipe_leitura:equipes!equipe_leitura_id(id, nome_equipe), equipe_canto:equipes!equipe_canto_id(id, nome_equipe))`
        )
        .gte("data", inicio)
        .lte("data", fim);

      if (apenasAprovados) {
        query = query.eq("status", "aprovado");
      }

      const { data, error } = await query.order("data", { ascending: true });
      if (error) throw error;
      return data;
    } catch (err) {
      console.error("❌ api.js: Erro na busca de eventos:", err);
      return [];
    }
  },
  /* FIM: Método buscarEventos */

  // ==========================================================================
  // 3. FEATURE: GESTÃO E DASHBOARD
  // ==========================================================================
  /* INÍCIO: Método buscarEstatisticasDashboard */
  buscarEstatisticasDashboard: async function () {
    const hoje = new Date().toISOString().split("T")[0];
    try {
      const [eventos, pendentes, mural, equipes] = await Promise.all([
        _supabaseClient
          .from("eventos_base")
          .select("id", { count: "exact", head: true })
          .gte("data", hoje),
        _supabaseClient
          .from("eventos_base")
          .select("id", { count: "exact", head: true })
          .eq("status", "pendente"),
        _supabaseClient
          .from("eventos_base")
          .select("id", { count: "exact", head: true })
          .eq("mural_destaque", true)
          .gte("data", hoje),
        _supabaseClient
          .from("equipes")
          .select("id", { count: "exact", head: true }),
      ]);
      return {
        semana: eventos.count || 0,
        pendentes: pendentes.count || 0,
        mural: mural.count || 0,
        equipes: equipes.count || 0,
      };
    } catch (err) {
      console.error("❌ api.js: Erro nas estatísticas:", err);
      return { semana: 0, pendentes: 0, mural: 0, equipes: 0 };
    }
  },
  /* FIM: Método buscarEstatisticasDashboard */

  /* INÍCIO: Método salvarEventoCompleto */
  salvarEventoCompleto: async function (eventoDados, escalasLista) {
    let eventoId = eventoDados.id;
    const payload = {
      ...eventoDados,
      status: eventoDados.status || "aprovado",
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
  /* FIM: Método salvarEventoCompleto */

  // ==========================================================================
  // 4. UTILS E AUTENTICAÇÃO
  // ==========================================================================
  /* INÍCIO: Método listarEquipes */
  listarEquipes: async function () {
    const { data } = await _supabaseClient
      .from("equipes")
      .select("*")
      .order("nome_equipe");
    return data || [];
  },
  /* FIM: Método listarEquipes */

  /* INÍCIO: Método buscarAvisos */
  buscarAvisos: async function () {
    const hoje = new Date().toISOString().split("T")[0];
    const { data } = await _supabaseClient
      .from("eventos_base")
      .select("id, titulo, data, local, mural_prioridade, hora_inicio")
      .eq("mural_destaque", true)
      .eq("status", "aprovado")
      .gte("data", hoje)
      .limit(5);
    return data || [];
  },
  /* FIM: Método buscarAvisos */

  /* INÍCIO: Métodos de Sessão */
  checkSession: async function () {
    const { data } = await _supabaseClient.auth.getSession();
    return data.session;
  },

  logout: async function () {
    await _supabaseClient.auth.signOut();
    window.location.href = "index.html";
  },
  /* FIM: Métodos de Sessão */
};
