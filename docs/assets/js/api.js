/*
 * ARQUIVO: api.js
 * DESCRIÇÃO: Camada de Conexão com Supabase (Versão 3.0 - Dashboard Ready)
 * PROJETO: Liturgia Paroquial 2026
 * AUTOR: Rodrigo & Dev AI (Senior Specialist approach)
 * VERSÃO: 3.0
 */

const SUPABASE_URL = "https://gmfmebnodmtozpzhlgvk.supabase.co";
const SUPABASE_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdtZm1lYm5vZG10b3pwemhlZ3ZrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njc5NzU3MzIsImV4cCI6MjA4MzU1MTczMn0.29rhpFJ0I-ywPbHb4sgcdmNHaM_rJidCeaV3Cfos6Ro";

const _supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

window.api = {
  client: _supabaseClient,

  // ==========================================================================
  // 1. BUSCA DE DADOS (CALENDÁRIO)
  // ==========================================================================
  /* INÍCIO: Método buscarEventos */
  buscarEventos: async function (ano, mes, apenasAprovados = true) {
    const mesStr = String(mes).padStart(2, "0");
    const inicio = `${ano}-${mesStr}-01`;
    const ultimoDia = new Date(ano, mes, 0).getDate();
    const fim = `${ano}-${mesStr}-${ultimoDia}`;

    let query = _supabaseClient
      .from("eventos_base")
      .select(
        `*, liturgia_cores(hex_code), escalas(id, hora_celebracao, equipe_leitura:equipes!equipe_leitura_id(id, nome_equipe), equipe_canto:equipes!equipe_canto_id(id, nome_equipe))`
      )
      .gte("data", inicio)
      .lte("data", fim);

    // Se estiver no site público, filtra apenas o que o coordenador aprovou
    if (apenasAprovados) {
      query = query.eq("status", "aprovado");
    }

    const { data, error } = await query.order("data", { ascending: true });

    if (error) {
      console.error("❌ Erro na busca de eventos:", error);
      return [];
    }
    return data;
  },
  /* FIM: Método buscarEventos */

  // ==========================================================================
  // 2. MÉTODOS EXCLUSIVOS DO DASHBOARD (ESTATÍSTICAS)
  // ==========================================================================
  /* INÍCIO: Método buscarEstatisticasDashboard */
  buscarEstatisticasDashboard: async function () {
    const hoje = new Date().toISOString().split("T")[0];

    // Execução paralela para máxima performance
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
  },
  /* FIM: Método buscarEstatisticasDashboard */

  /* INÍCIO: Métodos de Listagem para Gráficos */
  buscarEventosProximos: async function (dias) {
    const hoje = new Date().toISOString().split("T")[0];
    const { data } = await _supabaseClient
      .from("eventos_base")
      .select("data")
      .gte("data", hoje)
      .order("data", { ascending: true });
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
  /* FIM: Métodos de Listagem para Gráficos */

  // ==========================================================================
  // 3. PERSISTÊNCIA E GESTÃO
  // ==========================================================================
  /* INÍCIO: Método salvarEventoCompleto */
  salvarEventoCompleto: async function (eventoDados, escalasLista) {
    let eventoId = eventoDados.id;

    const payload = {
      ...eventoDados,
      // Garante que o status seja definido se for um novo evento
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

  // Reuso dos demais métodos (listarEquipes, checkSession, logout)
  listarEquipes: async function () {
    const { data } = await _supabaseClient
      .from("equipes")
      .select("*")
      .order("nome_equipe");
    return data || [];
  },

  checkSession: async function () {
    const { data } = await _supabaseClient.auth.getSession();
    return data.session;
  },

  logout: async function () {
    await _supabaseClient.auth.signOut();
    window.location.href = "index.html";
  },
};
