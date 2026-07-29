// Proxy für die Anthropic Messages API.
// Der API-Key liegt als Supabase-Secret (ANTHROPIC_API_KEY) und erreicht nie
// den Browser. Aufrufbar nur mit gültigem JWT (verify_jwt) UND freigeschaltetem
// Profil (is_approved via RLS-Helfer).
import "jsr:@supabase/functions-js/edge-runtime.d.ts"
import { createClient } from "npm:@supabase/supabase-js@2"

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
}

const ALLOWED_MODELS = new Set(["claude-haiku-4-5", "claude-sonnet-5"])

function json(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS, "Content-Type": "application/json" },
  })
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS })
  if (req.method !== "POST") return json(405, { error: "Method not allowed" })

  const apiKey = Deno.env.get("ANTHROPIC_API_KEY")
  if (!apiKey) {
    return json(503, { error: "ANTHROPIC_API_KEY ist nicht als Secret konfiguriert (Supabase-Dashboard → Edge Functions → Secrets)." })
  }

  // Freischaltungs-Check mit dem JWT des Aufrufers
  const supa = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_ANON_KEY")!,
    { global: { headers: { Authorization: req.headers.get("Authorization") ?? "" } } },
  )
  const { data: approved, error: rpcError } = await supa.rpc("is_approved")
  if (rpcError || approved !== true) return json(403, { error: "Konto nicht freigeschaltet." })

  let body: { model?: string; max_tokens?: number; system?: string; messages?: unknown }
  try {
    body = await req.json()
  } catch {
    return json(400, { error: "Ungültiger Request-Body." })
  }
  if (!body.model || !ALLOWED_MODELS.has(body.model)) return json(400, { error: "Modell nicht erlaubt." })
  if (!Array.isArray(body.messages)) return json(400, { error: "messages fehlt." })

  const resp = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: body.model,
      max_tokens: Math.min(Number(body.max_tokens) || 12000, 16000),
      system: typeof body.system === "string" ? body.system : undefined,
      messages: body.messages,
    }),
  })

  const text = await resp.text()
  return new Response(text, {
    status: resp.status,
    headers: { ...CORS, "Content-Type": "application/json" },
  })
})
