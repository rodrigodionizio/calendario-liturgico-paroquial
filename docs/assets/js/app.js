/*
 * ARQUIVO: api.js
 * DESCRIÇÃO: Camada de Conexão com Supabase e Regras de Negócio
 * VERSÃO: 3.8
 */

const SUPABASE_URL = "https://gmfmebnodmtozpzhlgvk.supabase.co";
const SUPABASE_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdtZm1lYm5vZG10b3pwemhlZ3ZrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njc5NzU3MzIsImV4cCI6MjA4MzU1MTczMn0.29rhpFJ0I-ywPbHb4sgcdmNHaM_rJidCeaV3Cfos6Ro";

const _supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

window.api = {
  client: _supabaseClient,

  /* INÍCIO: Método buscarEventos */
  buscarEventos: async function (ano, mes, apenasAprovados = true) {
    const mesStr = String(mes).padStart(2, "0");
    const inicio = `${ano}-${mesStr}-01`;
    const fim = `${ano}-${mesStr}-${new Date(ano, mes, 0).getDate()}`;
    try {
      let query = _supabaseClient
        .from("eventos_base")
        .select(
          `*, liturgia_cores(hex_code), escalas(id, hora_celebracao, equipe_leitura:equipes!equipe_leitura_id(id, nome_equipe), equipe_canto:equipes!equipe_canto_id(id, nome_equipe))`
        )
        .gte("data", inicio)
        .lte("data", fim);
      if (apenasAprovados) query = query.eq("status", "aprovado");
      const { data, error } = await query.order("data", { ascending: true });
      if (error) throw error;
      return data || [];
    } catch (err) {
      console.error("❌ api.js: Erro na busca");
      return [];
    }
  },
  /* FIM: Método buscarEventos */

  buscarAvisos: async function () {
    const hoje = new Date().toISOString().split("T")[0];
    try {
      const { data } = await _supabaseClient
        .from("eventos_base")
        .select("*")
        .eq("mural_destaque", true)
        .eq("status", "aprovado")
        .gte("data", hoje)
        .order("data", { ascending: true })
        .limit(5);
      return data || [];
    } catch (e) {
      return [];
    }
  },

  buscarEstatisticasDashboard: async function () {
    const hoje = new Date().toISOString().split("T")[0];
    try {
      const [semana, pendentes, mural, equipes] = await Promise.all([
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
        semana: semana.count || 0,
        pendentes: pendentes.count || 0,
        mural: mural.count || 0,
        equipes: equipes.count || 0,
      };
    } catch (err) {
      return { semana: 0, pendentes: 0, mural: 0, equipes: 0 };
    }
  },

  listarEquipes: async function () {
    const { data } = await _supabaseClient
      .from("equipes")
      .select("*")
      .order("nome_equipe");
    return data || [];
  },

  checkSession: async function () {
    const { data } = await _supabaseClient.auth.getSession();
    return data?.session || null;
  },

  logout: async function () {
    await _supabaseClient.auth.signOut();
    window.location.href = "index.html";
  },
};
