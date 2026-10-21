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

const SYSTEM_PROMPT = `Du bist Assistenz des Teams "UX CORE" und hilfst, Jira-Epics für UX-CORE-Initiativen strukturiert anzulegen (Bereiche: Research Ops, Design Ops, Governance, Tooling, Enablement).

Begriffe sauber trennen: UX CORE erstellt und verantwortet die Epics und Artefakte; genutzt werden die entstehenden Artefakte und Lösungen vom "UX Operations"-Team (typische Zielgruppe). Verwende genau diese Team-Namen und verwechsle die beiden nicht.

Du erhältst eine freie Beschreibung, Notizen oder ein Gesprächstranskript. Extrahiere daraus die Inhalte für das Epic-Template und ergänze sinnvolle, klar als Vorschlag taugliche Entwürfe.

Regeln:
- Antworte AUSSCHLIESSLICH mit einem einzigen validen JSON-Objekt — kein Markdown, keine Code-Fences, kein Text davor oder danach.
- Das JSON-Objekt enthält genau die Schlüssel aus der Feldliste in der Nachricht. Unbekanntes bleibt "" bzw. [].
- Alle Inhalte auf Deutsch.
- Fakten (Namen, Daten, Teams, Termine) NUR übernehmen, wenn sie im Input genannt oder eindeutig ableitbar sind. Niemals Personen, Daten oder Termine erfinden — solche Felder leer ("") lassen.
- Inhaltliche Felder (Ausgangslage, Ziel, Scope, Deliverables, Risiken, Akzeptanzkriterien, Erfolgskriterien) dürfen als gut begründete Vorschläge formuliert werden, die zum Input passen.
- Akzeptanzkriterien beschreiben die WIRKUNG (Outcome), nicht den Output: Formuliere den überprüfbaren Zustand nach Abschluss aus Sicht der Nutzenden bzw. des Teams — was ist dann möglich, einfacher oder dauerhaft geregelt. Falsch: "Guideline-Dokument erstellt". Richtig: "Squads finden die Guidelines an einem bekannten Ort und wenden sie ohne Rückfragen an."
- Falls Dateien angehängt sind (Screenshots, PDFs, Dokumente, Tabellen): deren Inhalte (Texte, UI-Zustände, Diagramme, Tabellenwerte) gleichwertig zur Texteingabe auswerten.
- Mehrzeilige Felder: eine Aussage pro Zeile, ohne Aufzählungszeichen (kein "-", kein "*").
- Erfolgskriterien-Dimensionen nur befüllen, wenn relevant; sonst leer lassen.
- "pilotGeplant": "Ja"/"Nein" nur bei klarer Aussage im Input, sonst "Noch offen".
- "titel": prägnant, Muster wie "UX CORE · <Thema>" ist erlaubt. "epicName": 2–4 Worte.
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

/** Angehängte Datei für die KI (Base64 ohne Daten-URL-Präfix bzw. extrahierter Text) */
export type AiAttachment =
  | { kind: "image"; name: string; data: string; mediaType: string; preview: string }
  | { kind: "pdf"; name: string; data: string }
  | { kind: "text"; name: string; text: string }

/** Vorgeschlagene Story/Aufgabe zum geschärften Epic */
export type StorySuggestion = { typ: "Story" | "Task"; titel: string; beschreibung: string }

/** OKR als Prompt-Kontext formatieren */
export function okrToContext(okr: { objective: string; description: string; key_results: string[]; quarter: string }): string {
  const kr = okr.key_results.length ? "\nKey Results:\n" + okr.key_results.map((k, i) => `${i + 1}. ${k}`).join("\n") : ""
  return `Objective (${okr.quarter}): ${okr.objective}${okr.description ? "\n" + okr.description : ""}${kr}`
}

function okrPromptBlock(okrContext?: string): string {
  if (!okrContext) return ""
  return `Dieses Epic zahlt auf folgende Team-OKR ein. Richte Ziel, Erfolgskriterien, Akzeptanzkriterien und Priorisierung daran aus, wo es inhaltlich passt – ohne Inhalte zu erfinden, die der Eingabe widersprechen:\n"""\n${okrContext}\n"""\n\n`
}

type ContentBlock =
  | { type: "text"; text: string }
  | { type: "image"; source: { type: "base64"; media_type: string; data: string } }
  | { type: "document"; source: { type: "base64"; media_type: "application/pdf"; data: string }; title?: string }

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

export async function aiPrefill(token: string, model: string, idea: string, attachments: AiAttachment[] = [], okrContext?: string): Promise<AiResult> {
  const today = new Date().toLocaleDateString("de-DE", { day: "2-digit", month: "2-digit", year: "numeric" })
  const textAttachments = attachments.filter(a => a.kind === "text")
  const attachmentTexts = textAttachments
    .map(a => `\n\nInhalt der angehängten Datei „${a.name}“:\n"""\n${a.text}\n"""`)
    .join("")
  const binaryCount = attachments.length - textAttachments.length
  const prompt = `Heutiges Datum: ${today}\n\n${okrPromptBlock(okrContext)}Feldliste (JSON-Schlüssel, Typ, Bedeutung):\n${buildFieldSpec()}\n\nEingabe (Beschreibung/Notizen/Transkript${binaryCount ? " – zusätzlich " + binaryCount + " Datei(en) angehängt" : ""}):\n"""\n${idea}\n"""${attachmentTexts}\n\nAntworte jetzt nur mit dem JSON-Objekt.`
  const content: ContentBlock[] = [
    ...attachments.flatMap<ContentBlock>(a => {
      if (a.kind === "image") return [{ type: "image", source: { type: "base64", media_type: a.mediaType, data: a.data } }]
      if (a.kind === "pdf") return [{ type: "document", source: { type: "base64", media_type: "application/pdf", data: a.data }, title: a.name }]
      return []
    }),
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

const STORIES_SYSTEM_PROMPT = `Du bist Assistenz des Teams "UX CORE". Du erhältst ein ausgearbeitetes Jira-Epic einer UX-CORE-Initiative und schlägst dafür einen sinnvollen Schnitt in Storys und Tasks vor. Die entstehenden Artefakte und Lösungen nutzt das "UX Operations"-Team – verwende die Team-Namen korrekt.

Regeln:
- Antworte AUSSCHLIESSLICH mit einem einzigen validen JSON-Objekt: {"storys": [{"typ": "Story"|"Task", "titel": "...", "beschreibung": "..."}]} — kein Markdown, kein Text davor oder danach.
- 4–9 Einträge, in sinnvoller Bearbeitungsreihenfolge.
- "Story" für nutzer-/wirkungsorientierte Schnitte, "Task" für rein technische oder organisatorische Arbeiten.
- "titel": prägnant und Jira-tauglich (max. ~10 Worte).
- "beschreibung": 2–4 Sätze — was zu tun ist, was das Ergebnis ist und woran man Fertigstellung erkennt (Wirkung/Outcome, nicht nur Output).
- Nur Inhalte ableiten, die zum Epic passen; nichts erfinden, was dem Epic widerspricht.
- Alle Inhalte auf Deutsch.`

export async function aiStories(token: string, model: string, epicText: string, okrContext?: string): Promise<StorySuggestion[]> {
  const text = await callAi(token, {
    model,
    max_tokens: 6000,
    system: STORIES_SYSTEM_PROMPT,
    messages: [
      {
        role: "user",
        content: `${okrPromptBlock(okrContext)}Das Epic:\n"""\n${epicText}\n"""\n\nAntworte jetzt nur mit dem JSON-Objekt.`,
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
