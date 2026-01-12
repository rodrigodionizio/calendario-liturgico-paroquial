/* 
 * ARQUIVO: api.js
 * DESCRIÇÃO: Camada de Conexão com Supabase e Regras de Negócio
 * PROJETO: Liturgia Paroquial 2026
 * AUTOR: Rodrigo & Dev AI
 */

// ==========================================================================
// 1. CONFIGURAÇÃO E CONEXÃO
// ==========================================================================
const SUPABASE_URL = "https://gmfmebnodmtozpzhlgvk.supabase.co"; 
const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdtZm1lYm5vZG10b3pwemhsZ3ZrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njc5NzU3MzIsImV4cCI6MjA4MzU1MTczMn0.29rhpFJ0I-ywPbHb4sgcdmNHaM_rJidCeaV3Cfos6Ro";

const _supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

// Exporta objeto global para uso no app.js
window.api = {
    client: _supabaseClient,

    // ==========================================================================
    // 2. FEATURE: CALENDÁRIO & EVENTOS
    // ==========================================================================
    
    // Busca eventos de um mês específico
    buscarEventos: async function (ano, mes) {
        const mesStr = String(mes).padStart(2, "0");
        const inicio = `${ano}-${mesStr}-01`;
        const ultimoDia = new Date(ano, mes, 0).getDate();
        const fim = `${ano}-${mesStr}-${ultimoDia}`;

        const { data, error } = await _supabaseClient
            .from("eventos_base")
            .select(`
                *,
                liturgia_cores ( hex_code ),
                escalas (
                    id, hora_celebracao,
                    equipe_leitura:equipes!equipe_leitura_id(id, nome_equipe),
                    equipe_canto:equipes!equipe_canto_id(id, nome_equipe)
                )
            `)
            .gte("data", inicio)
            .lte("data", fim)
            .order("data", { ascending: true });

        if (error) { console.error("Erro busca:", error); return []; }
        return data;
    },

    // Salva ou Cria um Evento (Com suas escalas)
    salvarEventoCompleto: async function (eventoDados, escalasLista) {
        let eventoId = eventoDados.id;

        // A. Salvar/Criar Evento Base
        const payloadEvento = {
            data: eventoDados.data,
            titulo: eventoDados.titulo,
            tempo_liturgico: eventoDados.tempo_liturgico || "Tempo Comum",
            cor_id: eventoDados.cor_id || 1,
            is_solenidade: eventoDados.is_solenidade || false,
            is_festa: eventoDados.is_festa || false,
            tipo_compromisso: eventoDados.tipo_compromisso || 'liturgia',
            local: eventoDados.local,
            responsavel: eventoDados.responsavel
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
                .select();
            if (error) throw error;
            eventoId = data[0].id;
        }

        // B. Salvar Escalas (Transação Simplificada: Delete All -> Insert New)
        const { error: errDel } = await _supabaseClient
            .from("escalas")
            .delete()
            .eq("evento_id", eventoId);
        if (errDel) throw errDel;

        if (escalasLista.length > 0) {
            const escalasComId = escalasLista.map((e) => ({ ...e, evento_id: eventoId }));
            const { error: errIns } = await _supabaseClient.from("escalas").insert(escalasComId);
            if (errIns) throw errIns;
        }

        return true;
    },
    // FIM FEATURE CALENDÁRIO

    // ==========================================================================
    // 3. FEATURE: MURAL DE AVISOS
    // ==========================================================================
    
    buscarAvisos: async function() {
        const hoje = new Date().toISOString();
        
        const { data, error } = await _supabaseClient
            .from('avisos')
            .select('*')
            .gte('data_evento', hoje) // Apenas futuros
            .order('data_evento', { ascending: true }) // Mais próximos primeiro
            .limit(5);

        if (error) { console.error("Erro avisos:", error); return []; }
        return data;
    },
    // FIM FEATURE MURAL

    // ==========================================================================
    // 4. FEATURE: GESTÃO (EQUIPES & AUTH)
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
        window.location.reload();
    },
    // FIM FEATURE GESTÃO
};