// Feld-Registry des Epic-Templates "Epic für OPS-Initiativen".
// Die Struktur (Panels, Felder, Leitfragen) spiegelt das Jira-Vorlagen-Ticket 1:1.

export const BEREICHE = ["Research Ops", "Design Ops", "Governance", "Tooling", "Enablement", "Sonstiges"]
export const OP_TYPEN = ["Offener Punkt", "Annahme", "Abhängigkeit", "Entscheidung"]
export const OP_STATUS = ["Offen", "In Klärung", "Geklärt"]
export const PILOT_OPTIONS = ["Noch offen", "Ja", "Nein"]

export type FieldType = "text" | "textarea" | "select" | "check" | "date" | "list" | "optable" | "grouplabel"

export type OpRow = {
  typ: string
  beschreibung: string
  auswirkung: string
  klaerung: string
  owner: string
  status: string
  faellig: string
}

export type FieldValue = string | boolean | string[] | OpRow[]
export type Values = Record<string, FieldValue>
export type Sources = Record<string, "ai" | "user">

export type FieldDef = {
  key: string
  panel: string
  type: FieldType
  label: string
  hint?: string
  ai?: string
  req?: boolean
  options?: string[]
  showIf?: (v: Values) => boolean
}

export type PanelDef = {
  id: string
  step: number
  color: string
  icon: string
  title: string
  resp: string
}

export const PANELS: PanelDef[] = [
  { id: "basis", step: 1, color: "#4167c1", icon: "ticket", title: "Epic-Basisdaten", resp: "" },
  { id: "init", step: 1, color: "#4167c1", icon: "map-pin", title: "Initiative & Ausgangslage", resp: "Initial durch UX Ops" },
  { id: "ziel", step: 1, color: "#4167c1", icon: "users", title: "Zielgruppen & Arbeitskontext", resp: "Initial durch UX Ops · Bei Bedarf gemeinsam mit dem Squad konkretisieren" },
  { id: "okr", step: 1, color: "#4167c1", icon: "flag", title: "Zielbild & OKR-Beitrag", resp: "Initial durch UX Ops" },
  { id: "erfolg", step: 1, color: "#4167c1", icon: "ruler", title: "Erfolgsmessung", resp: "Erwartete Wirkung initial durch UX Ops · Messbarkeit gemeinsam konkretisieren" },
  { id: "deliv", step: 2, color: "#8a6ec6", icon: "package", title: "Ergebnisse & Deliverables", resp: "Initial gemeinsam konkretisieren · Ausarbeitung durch den Squad" },
  { id: "ak", step: 2, color: "#8a6ec6", icon: "list-checks", title: "Outcome-Akzeptanzkriterien", resp: "Jira-Feld „Akzeptanzkriterien“ (Checkliste)" },
  { id: "pilot", step: 2, color: "#8a6ec6", icon: "flask-conical", title: "Überprüfung, Pilotierung & Einführung", resp: "Initial durch den Squad · Abstimmung mit Epic Owner und relevanten Stakeholdern" },
  { id: "zeit", step: 2, color: "#8a6ec6", icon: "clock", title: "Zeitlicher Rahmen & Meilensteine", resp: "Feste Rahmenbedingungen durch UX Ops · Realistische Planung gemeinsam mit dem Squad" },
  { id: "team", step: 3, color: "#36b37e", icon: "messages-square", title: "Team, Rollen & Governance", resp: "Initial durch UX Ops · Umsetzungsteam und operative Rollen gemeinsam konkretisieren" },
  { id: "input", step: 4, color: "#b3bac5", icon: "inbox", title: "Input & Vorarbeiten", resp: "Initial durch UX Ops · Laufend durch den Squad ergänzen" },
  { id: "risiko", step: 4, color: "#e6b800", icon: "siren", title: "Risiken & Gegenmaßnahmen", resp: "Bekannte Risiken initial durch UX Ops · Laufende Ergänzung durch alle Beteiligten" },
  { id: "offen", step: 4, color: "#e6b800", icon: "circle-help", title: "Offene Punkte, Annahmen & Abhängigkeiten", resp: "Gemeinsame und kontinuierliche Pflege durch Epic Owner und Squad" },
]

export const FIELDS: FieldDef[] = [
  // --- Basisdaten
  { key: "titel", panel: "basis", type: "text", req: true, label: "Titel (Zusammenfassung)", hint: "Aussagekräftiger Epic-Titel für Jira.", ai: "Prägnanter Epic-Titel (max. 90 Zeichen)." },
  { key: "epicName", panel: "basis", type: "text", req: true, label: "Epic Name (Kurzname)", hint: "Kurzer Name für Board-Labels, 2–4 Worte.", ai: "Sehr kurzer Epic-Name (2–4 Worte)." },
  // --- Initiative & Ausgangslage
  { key: "initiativeName", panel: "init", type: "text", req: true, label: "Initiative", hint: "Leitfrage: Wie heißt die UX-Ops-Initiative?", ai: "Name der Initiative." },
  { key: "initiativeBereich", panel: "init", type: "select", options: BEREICHE, req: true, label: "Bereich", hint: "Zuordnung: Research Ops, Design Ops, Governance, Tooling oder Enablement.", ai: "Einer der Werte: " + BEREICHE.join(", ") + "." },
  { key: "ausgangslage", panel: "init", type: "textarea", req: true, label: "Ausgangslage und Problem", hint: "Leitfrage: Welches konkrete Problem bzw. welche Ineffizienz besteht heute, woran zeigt sich dies und warum sollte das Thema jetzt bearbeitet werden?", ai: "Problem, woran es sich zeigt, warum jetzt. Stichpunkte, eine Aussage pro Zeile." },
  // --- Zielgruppen
  { key: "zielgruppePrimaer", panel: "ziel", type: "textarea", req: true, label: "Primäre Zielgruppe", hint: "Leitfrage: Wer soll die neue Lösung, den Prozess oder den Service später hauptsächlich nutzen?", ai: "Primäre Nutzergruppe(n)." },
  { key: "zielgruppeWeitere", panel: "ziel", type: "textarea", label: "Weitere betroffene Gruppen", hint: "Leitfrage: Wer ist darüber hinaus betroffen oder muss mitwirken, entscheiden, freigeben bzw. die Veränderung unterstützen?", ai: "Weitere betroffene oder mitwirkende Gruppen." },
  { key: "arbeitskontext", panel: "ziel", type: "textarea", label: "Arbeitskontext", hint: "Leitfrage: In welcher Situation bzw. in welchem Prozess tritt das Problem auf? Welche heutigen Arbeitsweisen, Tools oder Schnittstellen sind betroffen?", ai: "Situation/Prozess, betroffene Arbeitsweisen, Tools, Schnittstellen, Hürden." },
  // --- Zielbild & OKR
  { key: "ziel", panel: "okr", type: "textarea", req: true, label: "Ziel und gewünschte Veränderung", hint: "Leitfrage: Was soll nach Abschluss konkret besser oder anders sein? Welche neue Fähigkeit, Arbeitsweise oder Qualität soll etabliert sein?", ai: "Zielbild: was ist nach Abschluss besser/anders." },
  { key: "nichtZiele", panel: "okr", type: "textarea", label: "Nicht-Ziele", hint: "Leitfrage: Welche möglicherweise erwarteten Wirkungen oder Ergebnisse verfolgt die Initiative ausdrücklich nicht?", ai: "Explizite Nicht-Ziele." },
  { key: "scope", panel: "okr", type: "textarea", label: "Scope", hint: "Leitfrage: Welche Themen, Prozesse, Zielgruppen, Organisationseinheiten oder Bestandteile gehören zum Auftrag?", ai: "Was gehört zum Auftrag." },
  { key: "outOfScope", panel: "okr", type: "textarea", label: "Out of Scope", hint: "Leitfrage: Welche angrenzenden Themen oder Bestandteile werden ausdrücklich nicht bearbeitet?", ai: "Was ausdrücklich nicht bearbeitet wird." },
  { key: "okrObjective", panel: "okr", type: "text", label: "OKR – Objective", hint: "Formulierung oder Link zum unterstützten Objective.", ai: "Unterstütztes Objective (nur wenn genannt)." },
  { key: "okrKeyResult", panel: "okr", type: "text", label: "OKR – Key Result", hint: "Formulierung oder Link zum unterstützten Key Result.", ai: "Unterstütztes Key Result (nur wenn genannt)." },
  { key: "okrBeitrag", panel: "okr", type: "textarea", label: "OKR – Erwarteter Beitrag", hint: "Welchen konkreten Beitrag soll die Initiative zum OKR leisten?", ai: "Erwarteter Beitrag zum OKR." },
  // --- Erfolgsmessung
  { key: "ausgangswerte", panel: "erfolg", type: "textarea", label: "Ausgangssituation / Ausgangswerte", hint: "Leitfrage: Wie stellt sich die Situation heute dar? Welche Basisdaten liegen bereits vor?", ai: "Heutige Situation und vorhandene Basisdaten." },
  { key: "basisdatenFehlen", panel: "erfolg", type: "check", label: "Basisdaten liegen noch nicht vor (Erhebung planen)", ai: "true, wenn Basisdaten erst noch erhoben werden müssen." },
  { key: "erhebungMethode", panel: "erfolg", type: "text", label: "Geplante Erhebung (Methode)", showIf: v => !!v.basisdatenFehlen, hint: "Wie werden die fehlenden Basisdaten erhoben?", ai: "Methode der geplanten Baseline-Erhebung." },
  { key: "erhebungVerantwortlich", panel: "erfolg", type: "text", label: "Erhebung – Verantwortlich", showIf: v => !!v.basisdatenFehlen, ai: "Verantwortliche Person/Rolle für die Erhebung." },
  { key: "erhebungBis", panel: "erfolg", type: "date", label: "Erhebung bis (Datum)", showIf: v => !!v.basisdatenFehlen, ai: "Zieldatum der Erhebung (nur wenn genannt)." },
  { key: "ekIntro", panel: "erfolg", type: "grouplabel", label: "Erfolgskriterien", hint: "Leitfrage: An welchen konkreten Veränderungen erkennen wir den Erfolg? Nur relevante Dimensionen ausfüllen – möglichst mit Kennzahl, Zielwert und Messzeitpunkt." },
  { key: "ek_nutzung", panel: "erfolg", type: "textarea", label: "Nutzung und Akzeptanz", hint: "Wer nutzt die Lösung wie häufig und in welchem Umfang?", ai: "Erfolgskriterium Nutzung/Akzeptanz (leer lassen wenn nicht relevant)." },
  { key: "ek_effizienz", panel: "erfolg", type: "textarea", label: "Effizienz", hint: "Welche Aufwände oder Durchlaufzeiten sollen sich verändern?", ai: "Erfolgskriterium Effizienz (leer wenn nicht relevant)." },
  { key: "ek_qualitaet", panel: "erfolg", type: "textarea", label: "Qualität", hint: "Welche messbare oder beobachtbare Qualitätsverbesserung wird erwartet?", ai: "Erfolgskriterium Qualität (leer wenn nicht relevant)." },
  { key: "ek_zufriedenheit", panel: "erfolg", type: "textarea", label: "Zufriedenheit", hint: "Wie sollen die Zielgruppen die Veränderung bewerten?", ai: "Erfolgskriterium Zufriedenheit (leer wenn nicht relevant)." },
  { key: "ek_reifegrad", panel: "erfolg", type: "textarea", label: "Reifegrad", hint: "Welche Fähigkeit oder Arbeitsweise soll anschließend nachweisbar etabliert sein?", ai: "Erfolgskriterium Reifegrad (leer wenn nicht relevant)." },
  { key: "messIntro", panel: "erfolg", type: "grouplabel", label: "Messmethode", hint: "Leitfrage: Mit welchen Daten oder Methoden wird die Wirkung gemessen? Wann und durch wen?" },
  { key: "messDatenquelle", panel: "erfolg", type: "text", label: "Datenquelle / Methode", hint: "z. B. Analytics, Jira-Daten, Befragung, Interviews, Audit oder Review.", ai: "Datenquelle/Messmethode." },
  { key: "messZeitpunkt", panel: "erfolg", type: "date", label: "Messzeitpunkt", ai: "Messzeitpunkt/-zeitraum (nur wenn genannt)." },
  { key: "messVerantwortlich", panel: "erfolg", type: "text", label: "Verantwortlich für Messung", ai: "Verantwortliche Person/Rolle für die Messung." },
  // --- Deliverables
  { key: "deliverables", panel: "deliv", type: "list", req: true, label: "Geplante Ergebnisse", hint: "Leitfrage: Welche konkreten und nutzbaren Ergebnisse sollen entstehen? Z. B. Standards, Prozesse, Guidelines, Templates, Toolkits, Dokumentationen, Tool-Konfigurationen, Trainings, Pilotauswertungen, Governance-Modell.", ai: "2–4 konkrete Deliverables." },
  // --- Akzeptanzkriterien
  { key: "akzeptanzkriterien", panel: "ak", type: "list", req: true, label: "Outcome-Akzeptanzkriterien", hint: "Verbindliche, überprüfbare Kriterien für die Abnahme – werden in Jira als Checkliste gepflegt.", ai: "3 überprüfbare Outcome-Akzeptanzkriterien." },
  // --- Pilot & Einführung
  { key: "validierung", panel: "pilot", type: "textarea", label: "Validierung", hint: "Leitfrage: Wie werden Problemverständnis, Bedarf und Lösungsansatz überprüft? Welche Zielgruppen werden einbezogen?", ai: "Wie Problem/Lösung validiert werden." },
  { key: "pilotGeplant", panel: "pilot", type: "select", options: PILOT_OPTIONS, label: "Ist ein Pilot geplant?", hint: "Steuert, ob die Pilot-Details abgefragt werden.", ai: '"Ja", "Nein" oder "Noch offen".' },
  { key: "pilotPartner", panel: "pilot", type: "text", label: "Pilotpartner", showIf: v => v.pilotGeplant === "Ja", hint: "Team oder Bereich für die Pilotierung.", ai: "Pilot-Team/-Bereich (nur wenn genannt)." },
  { key: "pilotUmfang", panel: "pilot", type: "text", label: "Umfang und Dauer des Piloten", showIf: v => v.pilotGeplant === "Ja", ai: "Rahmen des Piloten (nur wenn genannt)." },
  { key: "pilotHypothesen", panel: "pilot", type: "textarea", label: "Zu prüfende Hypothesen / Kriterien", showIf: v => v.pilotGeplant === "Ja", ai: "Hypothesen/Kriterien für den Piloten." },
  { key: "rolloutKommunikation", panel: "pilot", type: "textarea", label: "Rollout – Einführung und Kommunikation", hint: "Leitfrage: Wie wird die Lösung eingeführt und kommuniziert?", ai: "Einführung & Kommunikation." },
  { key: "rolloutTraining", panel: "pilot", type: "textarea", label: "Rollout – Training und Unterstützung", ai: "Training & Unterstützung." },
  { key: "rolloutFeedback", panel: "pilot", type: "textarea", label: "Rollout – Feedback und Weiterentwicklung", hint: "Wie wird Feedback nach dem Rollout aufgenommen?", ai: "Feedback-Aufnahme nach Rollout." },
  { key: "regelbetriebUebergang", panel: "pilot", type: "textarea", label: "Übergang in den Regelbetrieb", hint: "Leitfrage: Wie wird die Veränderung in den Regelbetrieb überführt? Wer übernimmt anschließend Verantwortung?", ai: "Überführung in den Regelbetrieb." },
  // --- Zeit
  { key: "startDatum", panel: "zeit", type: "date", label: "Geplanter Start", hint: "Datum, z. B. 01.10.2026.", ai: "Startdatum (nur wenn genannt, Format TT.MM.JJJJ oder Quartal)." },
  { key: "endeDatum", panel: "zeit", type: "date", label: "Geplantes Ende", hint: "Datum bzw. Quartal.", ai: "Enddatum/Quartal (nur wenn genannt)." },
  { key: "zeitVorgaben", panel: "zeit", type: "text", label: "Verbindliche zeitliche Vorgaben", hint: "Nur falls vorhanden.", ai: "Verbindliche Termine (nur wenn genannt)." },
  { key: "msIntro", panel: "zeit", type: "grouplabel", label: "Meilensteine", hint: "Leitfrage: Welche fachlichen oder organisatorischen Zwischenziele strukturieren die Initiative? Nur relevante Meilensteine ausfüllen." },
  { key: "ms_baseline", panel: "zeit", type: "date", label: "Problemverständnis / Baseline", ai: "Datum (nur wenn genannt)." },
  { key: "ms_konzept", panel: "zeit", type: "date", label: "Lösungskonzept", ai: "Datum (nur wenn genannt)." },
  { key: "ms_pilotstart", panel: "zeit", type: "date", label: "Pilotstart", showIf: v => v.pilotGeplant !== "Nein", ai: "Datum (nur wenn genannt)." },
  { key: "ms_pilotauswertung", panel: "zeit", type: "date", label: "Pilotauswertung und Entscheidung", showIf: v => v.pilotGeplant !== "Nein", ai: "Datum (nur wenn genannt)." },
  { key: "ms_rollout", panel: "zeit", type: "date", label: "Rollout", ai: "Datum (nur wenn genannt)." },
  { key: "ms_uebergabe", panel: "zeit", type: "date", label: "Übergabe in den Regelbetrieb", ai: "Datum (nur wenn genannt)." },
  { key: "ms_wirkung", panel: "zeit", type: "date", label: "Wirkungsmessung", ai: "Datum (nur wenn genannt)." },
  // --- Team
  { key: "epicOwner", panel: "team", type: "text", req: true, label: "Epic Owner", hint: "Leitfrage: Wer trägt die Verantwortung für Zielerreichung, Priorisierung, Fortschritt und Abstimmung?", ai: "Name und Rolle des Epic Owners (nur wenn genannt)." },
  { key: "umsetzungsteam", panel: "team", type: "textarea", label: "Umsetzungsteam", hint: "Leitfrage: Wer arbeitet aktiv an der Initiative und welche Rollen oder Kompetenzen werden benötigt?", ai: "Namen, Rollen oder Squad." },
  { key: "auftraggeber", panel: "team", type: "text", label: "Auftraggeber und Entscheider", hint: "Leitfrage: Wer trifft Richtungs- und Priorisierungsentscheidungen, nimmt Ergebnisse ab und kann Eskalationen auflösen?", ai: "Auftraggeber/Entscheider (nur wenn genannt)." },
  { key: "zielgruppenvertretung", panel: "team", type: "textarea", label: "Zielgruppenvertretung / Pilotpartner", hint: "Leitfrage: Welche Teams oder Personen vertreten die späteren Nutzerinnen und Nutzer?", ai: "Zielgruppenvertretung." },
  { key: "stakeholder", panel: "team", type: "textarea", label: "Stakeholder", hint: "Leitfrage: Wer muss informiert, konsultiert oder beteiligt werden? Z. B. UX, Produktteams, IT, Einkauf, Datenschutz, Betriebsrat, Legal, Kommunikation.", ai: "Stakeholder und Art der Beteiligung." },
  { key: "rbIntro", panel: "team", type: "grouplabel", label: "Ownership im Regelbetrieb", hint: "Leitfrage: Wer verantwortet Pflege, Support und Weiterentwicklung nach Abschluss des Epics?" },
  { key: "rb_verantwortlich", panel: "team", type: "text", label: "Verantwortlich im Regelbetrieb", ai: "Name/Rolle/Team (nur wenn genannt)." },
  { key: "rb_pflege", panel: "team", type: "text", label: "Pflege und Support (Vorgehen)", ai: "Vorgehen für Pflege & Support." },
  { key: "rb_entscheidungen", panel: "team", type: "text", label: "Entscheidungen und Freigaben (Regelung)", ai: "Regelung für Entscheidungen/Freigaben." },
  // --- Input & Vorarbeiten
  { key: "vorarbeiten", panel: "input", type: "list", label: "Vorhandene Erkenntnisse & Vorarbeiten", hint: "Leitfrage: Welche Daten, Interviews, Retros, Feedbacks oder Reifegradanalysen liegen vor? An welche Standards, Prozesse, Tools oder Erfahrungen kann angeknüpft werden? (Mit Links)", ai: "Vorhandene Erkenntnisse, Standards, Referenzen." },
  // --- Risiken
  { key: "risiken", panel: "risiko", type: "list", label: "Risiken", hint: "Leitfrage: Was könnte Zielerreichung, Umsetzung oder nachhaltige Nutzung gefährden? Z. B. Akzeptanz, Mandat, Ressourcen, Kompetenzen, Toolabhängigkeiten, ungeklärte Ownership. Je Eintrag: Risiko und mögliche Auswirkung.", ai: "2–3 Risiken mit möglicher Auswirkung." },
  { key: "gegenmassnahmen", panel: "risiko", type: "list", label: "Gegenmaßnahmen", hint: "Leitfrage: Mit welchen präventiven oder korrigierenden Maßnahmen werden die Risiken reduziert? Je Eintrag: Maßnahme, Owner, ggf. Termin.", ai: "Gegenmaßnahmen zu den Risiken (mit Owner falls bekannt)." },
  // --- Offene Punkte
  { key: "offenePunkte", panel: "offen", type: "optable", label: "Offene Punkte, Annahmen & Abhängigkeiten", hint: "Leitfrage: Was ist ungeklärt, welche Annahmen müssen validiert werden, wovon ist die Initiative abhängig, welche Entscheidungen werden benötigt? Jeder Eintrag erhält Owner, Status und möglichst einen Klärungstermin.", ai: "Offene Punkte/Annahmen/Abhängigkeiten/Entscheidungen als Objekte." },
]

export const FIELD_BY_KEY = Object.fromEntries(FIELDS.map(f => [f.key, f]))

export function defaultValue(f: FieldDef): FieldValue {
  if (f.type === "list" || f.type === "optable") return []
  if (f.type === "check") return false
  if (f.type === "select" && f.key === "pilotGeplant") return "Noch offen"
  return ""
}

export function defaultValues(): Values {
  const v: Values = {}
  for (const f of FIELDS) if (f.type !== "grouplabel") v[f.key] = defaultValue(f)
  return v
}

export function isEmpty(v: FieldValue | undefined): boolean {
  if (v === undefined) return true
  if (Array.isArray(v)) {
    return v.filter(x => (typeof x === "string" ? x.trim() : true)).length === 0
  }
  if (typeof v === "boolean") return false
  return !String(v ?? "").trim()
}

export function requiredFields(values: Values): FieldDef[] {
  return FIELDS.filter(f => f.req && (!f.showIf || f.showIf(values)))
}

export function missingRequired(values: Values): FieldDef[] {
  return requiredFields(values).filter(f => isEmpty(values[f.key]))
}

export function stepOfField(f: FieldDef): number {
  return PANELS.find(p => p.id === f.panel)?.step ?? 1
}

export function emptyOpRow(): OpRow {
  return { typ: "Offener Punkt", beschreibung: "", auswirkung: "", klaerung: "", owner: "", status: "Offen", faellig: "" }
}

// Datums-Helfer für den Datepicker-Hybrid (Freitext bleibt erlaubt).
export function deToDate(s: string): Date | undefined {
  const m = String(s || "").trim().match(/^(\d{1,2})\.(\d{1,2})\.(\d{4})$/)
  if (!m) return undefined
  const d = new Date(Number(m[3]), Number(m[2]) - 1, Number(m[1]))
  return isNaN(d.getTime()) ? undefined : d
}
