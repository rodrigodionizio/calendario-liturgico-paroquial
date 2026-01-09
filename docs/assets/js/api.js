/*
 * ARQUIVO: api.js
 * ATENÇÃO: Nunca suba a 'service_role' aqui. Apenas a 'anon'.
 */

const SUPABASE_URL = "https://gmfmebnodmtozpzhlgvk.supabase.co"; // Cole sua URL aqui
const SUPABASE_KEY = "sb_publishable_RMPwNX8_KskU2_I26XUnBA_mx2-SQyC"; // Cole sua chave ANON aqui

// O objeto 'supabase' é criado globalmente pela biblioteca que colocamos no HTML
// Mas precisamos instanciá-lo assim:
const _supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

// Exportamos uma função global para o app.js usar
window.api = {
  client: _supabaseClient,

  // Função de busca
  buscarEventos: async function (ano, mes) {
    // Ajuste técnico: garantir formato YYYY-MM-DD
    const mesStr = String(mes).padStart(2, "0");
    const inicio = `${ano}-${mesStr}-01`;
    // Truque seguro: pegar o último dia do mês via JS
    const ultimoDia = new Date(ano, mes, 0).getDate();
    const fim = `${ano}-${mesStr}-${ultimoDia}`;

    console.log(`🔍 Buscando eventos de ${inicio} até ${fim}...`);

    const { data, error } = await _supabaseClient
      .from("eventos_base")
      .select(
        `
                id, data, titulo, tempo_liturgico, is_solenidade,
                liturgia_cores ( hex_code ),
                escalas (
                    hora_celebracao,
                    equipe_leitura:equipes!equipe_leitura_id(nome_equipe),
                    equipe_canto:equipes!equipe_canto_id(nome_equipe)
                )
            `
      )
      .gte("data", inicio)
      .lte("data", fim)
      .order("data", { ascending: true });

    if (error) {
      console.error("❌ Erro Supabase:", error);
      return [];
    }

    console.log(`✅ Encontrados ${data.length} eventos.`);
    return data;
  },
};
