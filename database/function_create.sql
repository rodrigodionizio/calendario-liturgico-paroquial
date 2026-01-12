// filename: summarize-row/index.ts
// Assumptions:
// - Environment variables available: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, OPENAI_API_KEY, OPENAI_MODEL (optional)
// - If you don't want DB access, omit SUPABASE_SERVICE_ROLE_KEY and send { row: { ... } } in body.

import { createClient } from "npm:@supabase/supabase-js@2.30.0";

interface RequestBody {
  table?: string;
  id?: string | number;
  row?: Record<string, any>;
  options?: {
    model?: string;
    max_tokens?: number;
    temperature?: number;
  };
}

// Helper: safely stringify row for prompt (truncate large fields)
function prepareRowText(row: Record<string, any>, maxFieldLength = 2000) {
  const entries = Object.entries(row).map(([k, v]) => {
    let value: string;
    try {
      value =
        v === null || v === undefined
          ? ""
          : typeof v === "string"
          ? v
          : JSON.stringify(v);
    } catch {
      value = String(v);
    }
    if (value.length > maxFieldLength) value = value.slice(0, maxFieldLength) + "…[truncated]";
    return `${k}: ${value}`;
  });
  return entries.join("\n");
}

async function fetchRowFromDb(supabaseUrl: string, serviceKey: string, table: string, id: string | number) {
  const sb = createClient(supabaseUrl, serviceKey, { auth: { persistSession: false }});
  // Try primary key lookup assuming column named 'id'
  // For safety, use .from(table).select('*').eq('id', id).limit(1)
  const { data, error } = await sb.from(table).select("*").eq("id", id).limit(1).maybeSingle();
  if (error) throw error;
  return data;
}

async function callOpenAI(apiKey: string, prompt: string, model = "gpt-4o", temperature = 0.2, max_tokens = 350) {
  // Using OpenAI REST API v1/chat/completions (or v1/responses). Adjust model as needed.
  const url = "https://api.openai.com/v1/chat/completions";
  const body = {
    model,
    messages: [
      { role: "system", content: "You are a helpful assistant that summarizes database rows concisely." },
      { role: "user", content: prompt }
    ],
    temperature,
    max_tokens,
  };

  const res = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`OpenAI error: ${res.status} ${text}`);
  }

  const json = await res.json();
  // Extract content for chat completion
  const content = json?.choices?.[0]?.message?.content ?? json?.choices?.[0]?.text;
  return { content, meta: json };
}

console.info("Summarize Row function starting");

Deno.serve(async (req: Request) => {
  try {
    if (req.method !== "POST") {
      return new Response(JSON.stringify({ error: "Only POST allowed" }), { status: 405, headers: { "Content-Type": "application/json" }});
    }

    const env = {
      SUPABASE_URL: Deno.env.get("SUPABASE_URL") ?? "",
      SUPABASE_SERVICE_ROLE_KEY: Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      OPENAI_API_KEY: Deno.env.get("OPENAI_API_KEY") ?? "",
      OPENAI_MODEL: Deno.env.get("OPENAI_MODEL") ?? "gpt-4o",
    };

    if (!env.OPENAI_API_KEY) {
      return new Response(JSON.stringify({ error: "OPENAI_API_KEY not set in environment" }), { status: 500, headers: { "Content-Type": "application/json" }});
    }

    const payload: RequestBody = await req.json().catch(() => ({}));

    let row: Record<string, any> | null = null;

    if (payload.row) {
      row = payload.row;
    } else if (payload.table && payload.id !== undefined) {
      if (!env.SUPABASE_URL || !env.SUPABASE_SERVICE_ROLE_KEY) {
        return new Response(JSON.stringify({ error: "SUPABASE_SERVICE_ROLE_KEY and SUPABASE_URL required to fetch row from DB" }), { status: 400, headers: { "Content-Type": "application/json" }});
      }
      try {
        row = await fetchRowFromDb(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, payload.table, payload.id);
        if (!row) {
          return new Response(JSON.stringify({ error: "Row not found" }), { status: 404, headers: { "Content-Type": "application/json" }});
        }
      } catch (e) {
        console.error("DB fetch error:", e);
        return new Response(JSON.stringify({ error: "Failed to fetch row", details: String(e) }), { status: 500, headers: { "Content-Type": "application/json" }});
      }
    } else {
      return new Response(JSON.stringify({ error: "Request must include either { row: {...} } or { table: 't', id: 'x' }" }), { status: 400, headers: { "Content-Type": "application/json" }});
    }

    // Build prompt
    const model = payload.options?.model ?? env.OPENAI_MODEL;
    const temperature = payload.options?.temperature ?? 0.2;
    const max_tokens = payload.options?.max_tokens ?? 350;

    const rowText = prepareRowText(row);
    const prompt = [
      "Please provide a concise human-readable summary of the following database row.",
      "Include:",
      "- A one-sentence high-level summary.",
      "- Up to 3 bullets of important fields and their values (skip null/empty).",
      "- Any potential data issues (e.g., missing key fields, malformed values).",
      "",
      "Row data:",
      "```",
      rowText,
      "```",
      "",
      "Return the result as plain text. Keep it short (around 2-6 sentences)."
    ].join("\n");

    let ai;
    try {
      ai = await callOpenAI(env.OPENAI_API_KEY, prompt, model, temperature, max_tokens);
    } catch (e) {
      console.error("OpenAI call failed:", e);
      return new Response(JSON.stringify({ error: "OpenAI request failed", details: String(e) }), { status: 502, headers: { "Content-Type": "application/json" }});
    }

    const summary = (ai.content ?? "").trim();

    return new Response(JSON.stringify({ summary, model, raw: ai.meta }), { status: 200, headers: { "Content-Type": "application/json" }});
  } catch (err) {
    console.error("Unhandled error:", err);
    return new Response(JSON.stringify({ error: "internal_error", details: String(err) }), { status: 500, headers: { "Content-Type": "application/json" }});
  }
});