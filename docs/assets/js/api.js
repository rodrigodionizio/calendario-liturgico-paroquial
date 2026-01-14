/*
 * ARQUIVO: api.js
 * DESCRIÇÃO: Camada de Conexão com Supabase (Versão 5.0 - SaaS Ready)
 */

const SUPABASE_URL = "https://gmfmebnodmtozpzhlgvk.supabase.co";
const SUPABASE_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdtZm1lYm5vZG10b3pwemhsZ3ZrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njc5NzU3MzIsImV4cCI6MjA4MzU1MTczMn0.29rhpFJ0I-ywPbHb4sgcdmNHaM_rJidCeaV3Cfos6Ro";

const _supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

window.api = {
  client: _supabaseClient,

  // =============================
  // 1 - BUSCA DE EVENTOS (CALENDÁRIO)
  // =============================
  buscarEventos: async function (ano, mes) {
    const mesStr = String(mes).padStart(2, "0");
    const inicio = `${ano}-${mesStr}-01`;
    const ultimoDia = new Date(ano, mes, 0).getDate();
    const fim = `${ano}-${mesStr}-${ultimoDia}`;

    const { data, error } = await _supabaseClient
      .from("eventos_base")
      .select(
        `*, liturgia_cores(hex_code), escalas(*, equipe_leitura:equipes!equipe_leitura_id(nome_equipe), equipe_canto:equipes!equipe_canto_id(nome_equipe))`
      )
      .gte("data", inicio)
      .lte("data", fim)
      .order("data", { ascending: true });

    return error ? [] : data;
  },

  // =============================
  // 2 - ESTATÍSTICAS (KPIs DASHBOARD)
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
      .eq("mural_destaque", true);
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

  buscarEventosProximos: async function (dias) {
    const { data } = await _supabaseClient
      .from("eventos_base")
      .select("data")
      .limit(100);
    return data || [];
  },

  buscarEventosRecentes: async function (limite) {
    const { data } = await _supabaseClient
      .from("eventos_base")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(limite);
    return data || [];
  },

  // =============================
  // 3 - GESTÃO DE EQUIPES
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

  // =============================
  // 4 - GESTÃO DE USUÁRIOS (ALLOWLIST)
  // =============================
  buscarUsuarios: async function () {
    const { data } = await _supabaseClient
      .from("admins_allowlist")
      .select("*")
      .order("nome");
    return data || [];
  },

  salvarUsuario: async function (user) {
    const payload = {
      email: user.email,
      nome: user.nome,
      perfil_nivel: parseInt(user.perfil_nivel),
    };
    if (user.id)
      return await _supabaseClient
        .from("admins_allowlist")
        .update(payload)
        .eq("id", user.id);
    return await _supabaseClient.from("admins_allowlist").insert(payload);
  },

  excluirUsuario: async function (id) {
    return await _supabaseClient.from("admins_allowlist").delete().eq("id", id);
  },

  // =============================
  // 5 - AUTH E STATUS
  // =============================
  atualizarStatusEvento: async function (id, status) {
    return await _supabaseClient
      .from("eventos_base")
      .update({ status })
      .eq("id", id);
  },

  checkSession: async function () {
    const { data } = await _supabaseClient.auth.getSession();
    return data.session;
  },

  logout: async function () {
    await _supabaseClient.auth.signOut();
    window.location.href = "admin.html";
  },
};
