/*
 * ARQUIVO: api.js
 * DESCRIÇÃO: Camada de Conexão Supabase (Versão 6.0 - Full Sincronizada)
 * PROJETO: Sacristia Digital 2026
 */

const SUPABASE_URL = "https://gmfmebnodmtozpzhlgvk.supabase.co";
const SUPABASE_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdtZm1lYm5vZG10b3pwemhsZ3ZrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njc5NzU3MzIsImV4cCI6MjA4MzU1MTczMn0.29rhpFJ0I-ywPbHb4sgcdmNHaM_rJidCeaV3Cfos6Ro";

const _supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

window.api = {
  client: _supabaseClient,

  // =============================
  // 1 - INÍCIO: buscarEventos
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
  // 1 - FIM: buscarEventos
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
};
