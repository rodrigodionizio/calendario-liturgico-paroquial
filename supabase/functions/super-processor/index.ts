/*
 * ARQUIVO: index.ts (Edge Function v3.0 - Paulus Engine)
 * DESCRIÇÃO: Motor de Captura Litúrgica via Portal Paulus
 * FONTE: paulus.com.br/portal/liturgia-diaria/
 */

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.7";
import { DOMParser } from "https://esm.sh/linkedom@0.16.8";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

Deno.serve(async (req) => {
  try {
    console.log("🚀 Iniciando Captura via Paulus...");

    const hoje = new Date().toISOString().split("T")[0];

    // 1. Fetch: Busca o HTML direto da Paulus
    const response = await fetch(
      "https://www.paulus.com.br/portal/liturgia-diaria/",
      {
        headers: {
          "User-Agent":
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/120.0",
        },
      }
    );

    const html = await response.text();
    const doc = new DOMParser().parseFromString(html, "text/html");

    // 2. Extração Cirúrgica
    // Na Paulus, os textos ficam dentro de containers com a classe .corpo
    const extrair = (selector: string) =>
      doc.querySelector(selector)?.textContent?.trim() || "";

    // Lógica Master: Capturamos os blocos principais
    const liturgiaDados = {
      data: hoje,
      primeira_leitura_ref: extrair(".liturgia-diaria h2:nth-of-type(1)"), // Referência da 1ª Leitura
      primeira_leitura_texto: extrair(".liturgia-diaria .corpo:nth-of-type(1)"),

      salmo_ref: extrair(".liturgia-diaria h2:nth-of-type(2)"),
      salmo_refrao: extrair(".liturgia-diaria .refrao"),
      salmo_texto: extrair(".liturgia-diaria .corpo:nth-of-type(2)"),

      evangelho_ref: extrair(".liturgia-diaria h2:nth-of-type(4)"), // Geralmente a 4ª h2
      evangelho_texto: extrair(".liturgia-diaria .corpo:nth-of-type(4)"),

      created_at: new Date().toISOString(),
    };

    console.log(
      "📖 Sucesso na extração. Ref Evangelho:",
      liturgiaDados.evangelho_ref
    );

    // 3. Validação de Segurança
    if (!liturgiaDados.evangelho_texto) {
      throw new Error("Estrutura da Paulus não retornou os dados esperados.");
    }

    // 4. Persistência no Supabase
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    const { error } = await supabase
      .from("liturgia_palavra")
      .upsert(liturgiaDados, { onConflict: "data" });

    if (error) throw error;

    return new Response(JSON.stringify({ success: true, source: "Paulus" }), {
      headers: { "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("❌ Falha no Robô:", err.message);
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
    });
  }
});
