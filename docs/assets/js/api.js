/*
 * ARQUIVO: api.js
 *DESCRIÇÃO: Conexão Supabase + Auth + Dados
 */

const SUPABASE_URL = "https://gmfmebnodmtozpzhlgvk.supabase.co"; // Cole sua URL aqui
const SUPABASE_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdtZm1lYm5vZG10b3pwemhsZ3ZrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njc5NzU3MzIsImV4cCI6MjA4MzU1MTczMn0.29rhpFJ0I-ywPbHb4sgcdmNHaM_rJidCeaV3Cfos6Ro"; // Cole sua chave ANON aqui

// O objeto 'supabase' é criado globalmente pela biblioteca que colocamos no HTML
// Mas precisamos instanciá-lo assim:
const _supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

window.api = {
  client: _supabaseClient,

  // 1. Buscar Eventos do Mês
  buscarEventos: async function (ano, mes) {
    const mesStr = String(mes).padStart(2, "0");
    const inicio = `${ano}-${mesStr}-01`;
    const ultimoDia = new Date(ano, mes, 0).getDate();
    const fim = `${ano}-${mesStr}-${ultimoDia}`;

    const { data, error } = await _supabaseClient
      .from("eventos_base")
      .select(
        `
                *,
                liturgia_cores ( hex_code ),
                escalas (
                    id, hora_celebracao,
                    equipe_leitura:equipes!equipe_leitura_id(id, nome_equipe),
                    equipe_canto:equipes!equipe_canto_id(id, nome_equipe)
                )
            `
      )
      .gte("data", inicio)
      .lte("data", fim)
      .order("data", { ascending: true });

    if (error) {
      console.error("Erro busca:", error);
      return [];
    }
    return data;
  },

  // 2. Verificar Sessão (Login)
  checkSession: async function () {
    const { data } = await _supabaseClient.auth.getSession();
    return data.session; // Retorna o usuário se logado, ou null
  },

  // 3. Listar Todas as Equipes (Para o Dropdown)
  listarEquipes: async function () {
    const { data, error } = await _supabaseClient
      .from("equipes")
      .select("*")
      .order("nome_equipe");

    if (error) {
      console.error("Erro equipes:", error);
      return [];
    }
    return data;
  },

  // 4. Salvar Escala (Nova ou Edição)
  salvarEscala: async function (dados) {
    const { data, error } = await _supabaseClient
      .from("escalas")
      .upsert(dados) // Upsert: Se tem ID atualiza, se não tem cria
      .select();

    if (error) throw error;
    return data;
  },

  // 5. Deletar Escala
  deletarEscala: async function (id) {
    const { error } = await _supabaseClient
      .from("escalas")
      .delete()
      .eq("id", id);
    if (error) throw error;
  },

  // 6. Logout
  logout: async function () {
    await _supabaseClient.auth.signOut();
    window.location.reload();
  },
};
