// KI-Vorbefüllung über die Anthropic Messages API (direkt aus dem Browser).
// Die Feldliste wandert kompakt in den Prompt; die Antwort ist ein einfaches
// JSON-Objekt, das tolerant geparst wird.
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

export async function aiPrefill(apiKey: string, model: string, idea: string): Promise<AiResult> {
  const today = new Date().toLocaleDateString("de-DE", { day: "2-digit", month: "2-digit", year: "numeric" })
  const resp = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
      "anthropic-dangerous-direct-browser-access": "true",
    },
    body: JSON.stringify({
      model,
      max_tokens: 12000,
      system: SYSTEM_PROMPT,
      messages: [
        {
          role: "user",
          content: `Heutiges Datum: ${today}\n\nFeldliste (JSON-Schlüssel, Typ, Bedeutung):\n${buildFieldSpec()}\n\nEingabe (Beschreibung/Notizen/Transkript):\n"""\n${idea}\n"""\n\nAntworte jetzt nur mit dem JSON-Objekt.`,
        },
      ],
    }),
  })
  if (!resp.ok) {
    let msg = `HTTP ${resp.status}`
    try {
      const err = await resp.json()
      msg += " – " + (err.error?.message || JSON.stringify(err))
    } catch { /* ignore */ }
    throw new Error(msg)
  }
  const data = await resp.json()
  if (data.stop_reason === "refusal") throw new Error("Die Anfrage wurde vom Modell abgelehnt.")
  const textBlock = (data.content || []).find((b: { type: string }) => b.type === "text")
  if (!textBlock) throw new Error("Keine verwertbare Antwort erhalten.")
  return extractJson(textBlock.text)
}
