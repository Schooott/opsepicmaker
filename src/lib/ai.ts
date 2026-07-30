// KI-Vorbefüllung über die Supabase Edge Function "ai-prefill".
// Der Anthropic-API-Key liegt ausschließlich als Server-Secret bei Supabase
// und erreicht nie den Browser.
import { SUPABASE_ANON_KEY, SUPABASE_URL } from "@/config"
import { FIELDS, OP_TYPEN, type OpRow } from "./fields"

export const AI_MODELS = [
  { value: "claude-haiku-4-5", label: "Claude Haiku 4.5 – günstig & schnell (empfohlen)" },
  { value: "claude-sonnet-5", label: "Claude Sonnet 5 – höhere Qualität, teurer" },
]

export type AiResult = Record<string, unknown> & {
  rueckfragen?: string[]
  offenePunkte?: Partial<OpRow>[]
}

const SYSTEM_PROMPT = `Du bist Assistenz eines UX-Ops-Teams und hilfst, Jira-Epics für UX-Ops-Initiativen strukturiert anzulegen (Bereiche: Research Ops, Design Ops, Governance, Tooling, Enablement).

Du erhältst eine freie Beschreibung, Notizen oder ein Gesprächstranskript. Extrahiere daraus die Inhalte für das Epic-Template und ergänze sinnvolle, klar als Vorschlag taugliche Entwürfe.

Regeln:
- Antworte AUSSCHLIESSLICH mit einem einzigen validen JSON-Objekt — kein Markdown, keine Code-Fences, kein Text davor oder danach.
- Das JSON-Objekt enthält genau die Schlüssel aus der Feldliste in der Nachricht. Unbekanntes bleibt "" bzw. [].
- Alle Inhalte auf Deutsch.
- Fakten (Namen, Daten, Teams, Termine) NUR übernehmen, wenn sie im Input genannt oder eindeutig ableitbar sind. Niemals Personen, Daten oder Termine erfinden — solche Felder leer ("") lassen.
- Inhaltliche Felder (Ausgangslage, Ziel, Scope, Deliverables, Risiken, Akzeptanzkriterien, Erfolgskriterien) dürfen als gut begründete Vorschläge formuliert werden, die zum Input passen.
- Akzeptanzkriterien beschreiben die WIRKUNG (Outcome), nicht den Output: Formuliere den überprüfbaren Zustand nach Abschluss aus Sicht der Nutzenden bzw. des Teams — was ist dann möglich, einfacher oder dauerhaft geregelt. Falsch: "Guideline-Dokument erstellt". Richtig: "Squads finden die Guidelines an einem bekannten Ort und wenden sie ohne Rückfragen an."
- Falls Screenshots angehängt sind: deren Inhalte (Texte, UI-Zustände, Diagramme) gleichwertig zum Text auswerten.
- Mehrzeilige Felder: eine Aussage pro Zeile, ohne Aufzählungszeichen (kein "-", kein "*").
- Erfolgskriterien-Dimensionen nur befüllen, wenn relevant; sonst leer lassen.
- "pilotGeplant": "Ja"/"Nein" nur bei klarer Aussage im Input, sonst "Noch offen".
- "titel": prägnant, Muster wie "UX Ops · <Thema>" ist erlaubt. "epicName": 2–4 Worte.
- "offenePunkte": echte Unklarheiten, Annahmen, Abhängigkeiten oder nötige Entscheidungen aus dem Input ableiten (owner/faellig leer lassen, wenn unbekannt).
- "rueckfragen": die 3–6 wichtigsten offenen Fragen an das Team.`

function buildFieldSpec(): string {
  const rows: string[] = []
  for (const f of FIELDS) {
    if (f.type === "grouplabel") continue
    let typ = "string"
    if (f.type === "check") typ = "boolean"
    else if (f.type === "list") typ = "array of strings"
    else if (f.type === "optable") typ = "array of {typ, beschreibung, auswirkung, klaerung, owner, faellig} — typ ∈ [" + OP_TYPEN.join(" | ") + "]"
    else if (f.type === "select") typ = 'string ∈ ["' + (f.options || []).join('" | "') + '" | ""]'
    rows.push(`- ${f.key} (${typ}): ${f.ai || f.label}`)
  }
  rows.push("- rueckfragen (array of strings): 3–6 wichtigste Rückfragen, die vor Beauftragung des Epics geklärt werden sollten.")
  return rows.join("\n")
}

function extractJson(text: string): AiResult {
  const t = text.trim().replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, "")
  const start = t.indexOf("{")
  const end = t.lastIndexOf("}")
  if (start === -1 || end <= start) throw new Error("Kein JSON in der Antwort gefunden.")
  return JSON.parse(t.slice(start, end + 1)) as AiResult
}

/** Angehängter Screenshot für die KI (base64 ohne Daten-URL-Präfix) */
export type AiImage = { data: string; mediaType: string }

/** Vorgeschlagene Story/Aufgabe zum geschärften Epic */
export type StorySuggestion = { typ: "Story" | "Task"; titel: string; beschreibung: string }

type ContentBlock =
  | { type: "text"; text: string }
  | { type: "image"; source: { type: "base64"; media_type: string; data: string } }

async function callAi(token: string, payload: unknown): Promise<string> {
  const resp = await fetch(`${SUPABASE_URL}/functions/v1/ai-prefill`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      authorization: `Bearer ${token}`,
      apikey: SUPABASE_ANON_KEY,
    },
    body: JSON.stringify(payload),
  })
  if (!resp.ok) {
    let msg = `HTTP ${resp.status}`
    try {
      const err = await resp.json()
      const detail = typeof err.error === "string" ? err.error : err.error?.message
      msg += " – " + (detail || JSON.stringify(err))
    } catch { /* ignore */ }
    throw new Error(msg)
  }
  const data = await resp.json()
  if (data.stop_reason === "refusal") throw new Error("Die Anfrage wurde vom Modell abgelehnt.")
  const textBlock = (data.content || []).find((b: { type: string }) => b.type === "text")
  if (!textBlock) throw new Error("Keine verwertbare Antwort erhalten.")
  return textBlock.text as string
}

export async function aiPrefill(token: string, model: string, idea: string, images: AiImage[] = []): Promise<AiResult> {
  const today = new Date().toLocaleDateString("de-DE", { day: "2-digit", month: "2-digit", year: "numeric" })
  const prompt = `Heutiges Datum: ${today}\n\nFeldliste (JSON-Schlüssel, Typ, Bedeutung):\n${buildFieldSpec()}\n\nEingabe (Beschreibung/Notizen/Transkript${images.length ? " – zusätzlich " + images.length + " Screenshot(s) angehängt" : ""}):\n"""\n${idea}\n"""\n\nAntworte jetzt nur mit dem JSON-Objekt.`
  const content: ContentBlock[] = [
    ...images.map<ContentBlock>(img => ({
      type: "image",
      source: { type: "base64", media_type: img.mediaType, data: img.data },
    })),
    { type: "text", text: prompt },
  ]
  const text = await callAi(token, {
    model,
    max_tokens: 12000,
    system: SYSTEM_PROMPT,
    messages: [{ role: "user", content }],
  })
  return extractJson(text)
}

const STORIES_SYSTEM_PROMPT = `Du bist Assistenz eines UX-Ops-Teams. Du erhältst ein ausgearbeitetes Jira-Epic einer UX-Ops-Initiative und schlägst dafür einen sinnvollen Schnitt in Storys und Tasks vor.

Regeln:
- Antworte AUSSCHLIESSLICH mit einem einzigen validen JSON-Objekt: {"storys": [{"typ": "Story"|"Task", "titel": "...", "beschreibung": "..."}]} — kein Markdown, kein Text davor oder danach.
- 4–9 Einträge, in sinnvoller Bearbeitungsreihenfolge.
- "Story" für nutzer-/wirkungsorientierte Schnitte, "Task" für rein technische oder organisatorische Arbeiten.
- "titel": prägnant und Jira-tauglich (max. ~10 Worte).
- "beschreibung": 2–4 Sätze — was zu tun ist, was das Ergebnis ist und woran man Fertigstellung erkennt (Wirkung/Outcome, nicht nur Output).
- Nur Inhalte ableiten, die zum Epic passen; nichts erfinden, was dem Epic widerspricht.
- Alle Inhalte auf Deutsch.`

export async function aiStories(token: string, model: string, epicText: string): Promise<StorySuggestion[]> {
  const text = await callAi(token, {
    model,
    max_tokens: 6000,
    system: STORIES_SYSTEM_PROMPT,
    messages: [
      {
        role: "user",
        content: `Das Epic:\n"""\n${epicText}\n"""\n\nAntworte jetzt nur mit dem JSON-Objekt.`,
      },
    ],
  })
  const parsed = extractJson(text) as { storys?: unknown }
  const raw = Array.isArray(parsed.storys) ? parsed.storys : []
  return raw
    .map(s => {
      const o = s as Partial<StorySuggestion>
      return {
        typ: o.typ === "Task" ? ("Task" as const) : ("Story" as const),
        titel: String(o.titel ?? "").trim(),
        beschreibung: String(o.beschreibung ?? "").trim(),
      }
    })
    .filter(s => s.titel)
}
