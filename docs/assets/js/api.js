/*
 * ARQUIVO: api.js
 * DESCRIÇÃO: Conexão Supabase e Camada de Dados (Handshake Recovery)
 * PROJETO: Liturgia Paroquial 2026
 * AUTOR: Rodrigo & Dev AI (Senior Specialist)
 * VERSÃO: 3.5 (Integridade e Segurança)
 */

// ==========================================================================
// 1. CONFIGURAÇÃO DE INFRAESTRUTURA
// ==========================================================================
// NOTA SÊNIOR: Verifique se não há espaços extras ao copiar a URL e a KEY
const SUPABASE_URL = "https://gmfmebnodmtozpzhlgvk.supabase.co";
const SUPABASE_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdtZm1lYm5vZG10b3pwemhsZ3ZrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njc5NzU3MzIsImV4cCI6MjA4MzU1MTczMn0.29rhpFJ0I-ywPbHb4sgcdmNHaM_rJidCeaV3Cfos6Ro";

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
    const fim = `${ano}-${mesStr}-${new Date(ano, mes, 0).getDate()}`;

    try {
      let query = _supabaseClient
        .from("eventos_base")
        .select(
          `
                    *, 
                    liturgia_cores(hex_code), 
                    escalas(
                        id, 
                        hora_celebracao, 
                        equipe_leitura:equipes!equipe_leitura_id(id, nome_equipe), 
                        equipe_canto:equipes!equipe_canto_id(id, nome_equipe)
                    )
                `
        )
        .gte("data", inicio)
        .lte("data", fim);

      if (apenasAprovados) {
        query = query.eq("status", "aprovado");
      }

      const { data, error } = await query.order("data", { ascending: true });
      if (error) throw error;
      return data || [];
    } catch (err) {
      console.error(
        "❌ api.js: Erro na busca de eventos/escalas:",
        err.message
      );
      return [];
    }
  },
  /* FIM: Método buscarEventos */

  // ==========================================================================
  // 3. FEATURE: MURAL E ESTATÍSTICAS
  // ==========================================================================
  /* INÍCIO: Método buscarAvisos */
  buscarAvisos: async function () {
    const hoje = new Date().toISOString().split("T")[0];
    try {
      const { data, error } = await _supabaseClient
        .from("eventos_base")
        .select("id, titulo, data, local, mural_prioridade, hora_inicio")
        .eq("mural_destaque", true)
        .eq("status", "aprovado")
        .gte("data", hoje)
        .order("data", { ascending: true })
        .limit(5);
      if (error) throw error;
      return data || [];
    } catch (e) {
      return [];
    }
  },
  /* FIM: Método buscarAvisos */

  /* INÍCIO: Método buscarEstatisticasDashboard */
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
  /* FIM: Método buscarEstatisticasDashboard */

  // ==========================================================================
  // 4. FEATURE: GESTÃO E AUTH
  // ==========================================================================
  /* INÍCIO: Método listarEquipes */
  listarEquipes: async function () {
    try {
      const { data, error } = await _supabaseClient
        .from("equipes")
        .select("*")
        .order("nome_equipe");
      if (error) throw error;
      return data || [];
    } catch (e) {
      return [];
    }
  },
  /* FIM: Método listarEquipes */

  /* INÍCIO: Métodos de Autenticação */
  checkSession: async function () {
    try {
      const { data } = await _supabaseClient.auth.getSession();
      return data?.session || null;
    } catch (e) {
      return null;
    }
  },

  logout: async function () {
    await _supabaseClient.auth.signOut();
    window.location.href = "index.html";
  },
  /* FIM: Métodos de Autenticação */
};
