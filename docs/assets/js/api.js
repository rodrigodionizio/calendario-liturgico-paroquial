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

  // ... (Mantenha buscarEventos, checkSession e listarEquipes iguais) ...
  // Vou reescrever aqui apenas o que muda:

  buscarEventos: async function (ano, mes) {
    // (Mantenha o código igual ao anterior)
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

  checkSession: async function () {
    const { data } = await _supabaseClient.auth.getSession();
    return data.session;
  },

  listarEquipes: async function () {
    const { data, error } = await _supabaseClient
      .from("equipes")
      .select("*")
      .order("nome_equipe");
    if (error) return [];
    return data;
  },

  // --- NOVO: SALVAR EVENTO COMPLETO ---
  salvarEventoCompleto: async function (eventoDados, escalasLista) {
    let eventoId = eventoDados.id;

    // 1. Salvar ou Criar o Evento Base (Título, Cor, Data)
    // Se não tem ID, remove do objeto para o banco gerar
    const payloadEvento = {
      data: eventoDados.data,
      titulo: eventoDados.titulo,
      tempo_liturgico: eventoDados.tempo_liturgico || "Tempo Comum",
      // Precisamos do ID da cor. Se veio objeto, extrai. Se não, usa Default (1=Verde)
      // No app.js vamos garantir que mandamos o cor_id certo.
      cor_id: eventoDados.cor_id || 1,
      is_solenidade: eventoDados.is_solenidade || false,
      is_festa: eventoDados.is_festa || false,
    };

    if (eventoId) {
      // Update
      const { error } = await _supabaseClient
        .from("eventos_base")
        .update(payloadEvento)
        .eq("id", eventoId);
      if (error) throw error;
    } else {
      // Insert
      const { data, error } = await _supabaseClient
        .from("eventos_base")
        .insert(payloadEvento)
        .select(); // Retorna o ID criado
      if (error) throw error;
      eventoId = data[0].id;
    }

    // 2. Salvar as Escalas (Apaga antigas e recria, como antes)
    // A. Delete
    const { error: errDel } = await _supabaseClient
      .from("escalas")
      .delete()
      .eq("evento_id", eventoId);
    if (errDel) throw errDel;

    // B. Insert
    if (escalasLista.length > 0) {
      // Adiciona o eventoId correto nas escalas
      const escalasComId = escalasLista.map((e) => ({
        ...e,
        evento_id: eventoId,
      }));
      const { error: errIns } = await _supabaseClient
        .from("escalas")
        .insert(escalasComId);
      if (errIns) throw errIns;
    }

    return true;
  },

  logout: async function () {
    await _supabaseClient.auth.signOut();
    window.location.reload();
  },
};
