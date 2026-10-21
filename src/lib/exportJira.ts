// Erzeugt das Jira-Wiki-Markup der Epic-Beschreibung.
// Die Emojis und Panel-Farben gehören zur Struktur des Jira-Vorlagen-Tickets
// und bleiben deshalb im Export erhalten.
import type { OpRow, Values } from "./fields"

const P = "_Noch offen …_"

export function buildWikiDescription(values: Values, withLeitfragen: boolean): string {
  const L = withLeitfragen
  const out: string[] = []
  const push = (s: string) => out.push(s)
  const v = (k: string) => String((values[k] as string) || "").trim()
  const lines = (k: string) => (v(k) ? v(k).split(/\n+/).map(s => s.trim()).filter(Boolean) : [])
  const bullets = (k: string) => {
    const ls = lines(k)
    return (ls.length ? ls : [P]).map(l => "* " + l).join("\n")
  }
  const listBullets = (k: string) => {
    const arr = ((values[k] as string[]) || []).map(x => String(x).trim()).filter(Boolean)
    return (arr.length ? arr : [P]).map(l => "* " + l).join("\n")
  }
  const labeled = (label: string, key: string) => `* *${label}:* ${v(key) || P}`
  const hint = (text: string) => { if (L) push(`{color:#6b778c}_${text}_{color}\n`) }
  const panelStart = (title: string, color: string) => push(`{panel:title=${title}|borderColor=${color}|borderWidth=2}`)
  const panelEnd = () => push("{panel}")
  const resp = (t: string) => push(`_Verantwortung: ${t}_\n`)

  /* 🔵 Auftrag verstehen */
  push("h2. 🔵 Auftrag verstehen\n")
  panelStart("📌 Initiative & Ausgangslage", "#4167c1")
  resp("Initial durch UX CORE")
  push("*Initiative*")
  hint("Leitfrage: Wie heißt die UX-CORE-Initiative und welchem Bereich ist sie zuzuordnen, z. B. Research Ops, Design Ops, Governance, Tooling oder Enablement?")
  push(`* ${v("initiativeName") || P}${v("initiativeBereich") ? " – Bereich: " + v("initiativeBereich") : ""}\n`)
  push("*Ausgangslage und Problem*")
  hint("Leitfrage: Welches konkrete Problem bzw. welche Ineffizienz besteht heute, woran zeigt sich dies und warum sollte das Thema jetzt bearbeitet werden?")
  push(bullets("ausgangslage") + "\n")
  panelEnd()

  panelStart("👤 Zielgruppen & Arbeitskontext", "#4167c1")
  resp("Initial durch UX CORE · Bei Bedarf gemeinsam mit dem Squad konkretisieren")
  push("*Primäre Zielgruppe*")
  hint("Leitfrage: Wer soll die neue Lösung, den Prozess oder den Service später hauptsächlich nutzen?")
  push(bullets("zielgruppePrimaer") + "\n")
  push("*Weitere betroffene Gruppen*")
  hint("Leitfrage: Wer ist darüber hinaus betroffen oder muss mitwirken, entscheiden, freigeben bzw. die Veränderung unterstützen?")
  push(bullets("zielgruppeWeitere") + "\n")
  push("*Arbeitskontext*")
  hint("Leitfrage: In welcher Situation bzw. in welchem Prozess tritt das Problem auf? Welche heutigen Arbeitsweisen, Tools oder Schnittstellen sind betroffen und welche Hürden bestehen dabei?")
  push(bullets("arbeitskontext") + "\n")
  panelEnd()

  panelStart("🏁 Zielbild & OKR-Beitrag", "#4167c1")
  resp("Initial durch UX CORE")
  push("*Ziel und gewünschte Veränderung*")
  hint("Leitfrage: Was soll nach Abschluss konkret besser oder anders sein? Welche neue Fähigkeit, Arbeitsweise oder Qualität soll etabliert sein?")
  push(bullets("ziel") + "\n")
  push("*Nicht-Ziele*")
  hint("Leitfrage: Welche möglicherweise erwarteten Wirkungen oder Ergebnisse verfolgt die Initiative ausdrücklich nicht?")
  push(bullets("nichtZiele") + "\n")
  push("*Scope*")
  hint("Leitfrage: Welche Themen, Prozesse, Zielgruppen, Organisationseinheiten oder Bestandteile gehören zum Auftrag?")
  push(bullets("scope") + "\n")
  push("*Out of Scope*")
  hint("Leitfrage: Welche angrenzenden Themen oder Bestandteile werden im Rahmen dieser Initiative ausdrücklich nicht bearbeitet?")
  push(bullets("outOfScope") + "\n")
  push("*Beitrag zum UX-CORE-OKR*")
  hint("Leitfrage: Welches Objective und Key Result unterstützt die Initiative und welchen konkreten Beitrag soll sie dazu leisten?")
  push(labeled("Objective", "okrObjective"))
  push(labeled("Key Result", "okrKeyResult"))
  push(`* *Erwarteter Beitrag:* ${lines("okrBeitrag").join(" ") || P}\n`)
  panelEnd()

  panelStart("📐 Erfolgsmessung", "#4167c1")
  resp("Erwartete Wirkung initial durch UX CORE · Messbarkeit gemeinsam konkretisieren")
  push("*Ausgangssituation / Ausgangswerte*")
  hint("Leitfrage: Wie stellt sich die Situation heute dar? Welche Basisdaten liegen bereits vor und welche müssen im Rahmen der Initiative noch erhoben werden?")
  push(bullets("ausgangswerte") + "\n")
  if (values.basisdatenFehlen) {
    push("Die Basisdaten liegen noch nicht vor:")
    push(labeled("Geplante Erhebung", "erhebungMethode"))
    push(labeled("Verantwortlich", "erhebungVerantwortlich"))
    push(labeled("Erhebung bis", "erhebungBis"))
    push("")
  }
  push("*Erfolgskriterien*")
  hint("Leitfrage: An welchen konkreten Veränderungen erkennen wir den Erfolg der Initiative? Nur relevante Dimensionen ausfüllen und möglichst Kennzahl, Zielwert sowie Messzeitpunkt benennen.")
  const ekDims: Array<[string, string]> = [
    ["Nutzung und Akzeptanz", "ek_nutzung"], ["Effizienz", "ek_effizienz"], ["Qualität", "ek_qualitaet"],
    ["Zufriedenheit", "ek_zufriedenheit"], ["Reifegrad", "ek_reifegrad"],
  ]
  const ekFilled = ekDims.filter(([, k]) => v(k))
  if (ekFilled.length) ekFilled.forEach(([lab, k]) => push(`* *${lab}:* ${lines(k).join(" ")}`))
  else push("* " + P)
  push("")
  push("*Messmethode*")
  hint("Leitfrage: Mit welchen Daten oder Methoden wird die Wirkung gemessen? Wann erfolgt die Messung und wer ist dafür verantwortlich?")
  push(labeled("Datenquelle/Methode", "messDatenquelle"))
  push(labeled("Messzeitpunkt", "messZeitpunkt"))
  push(labeled("Verantwortlich", "messVerantwortlich") + "\n")
  panelEnd()
  push("----\n")

  /* 🟣 Umsetzung planen */
  push("h2. 🟣 Umsetzung planen\n")
  panelStart("📦 Ergebnisse & Deliverables", "#8a6ec6")
  resp("Initial gemeinsam konkretisieren · Ausarbeitung durch den Squad")
  push("*Geplante Ergebnisse*")
  hint("Leitfrage: Welche konkreten und nutzbaren Ergebnisse sollen voraussichtlich entstehen? Möglich sind z. B. Standards, Prozesse, Guidelines, Templates, Toolkits, Dokumentationen, Tool-Konfigurationen, Trainings, Pilotauswertungen oder ein Governance-Modell.")
  push(listBullets("deliverables") + "\n")
  hint("Hinweis: Die Deliverables beschreiben, was konkret entsteht. Sie müssen nachvollziehbar auf das Zielbild und die angestrebte Wirkung einzahlen. Verbindliche Anforderungen an die Ergebnisse werden in den Akzeptanzkriterien beschrieben.")
  panelEnd()

  panelStart("🧪 Überprüfung, Pilotierung & Einführung", "#8a6ec6")
  resp("Initial durch den Squad · Abstimmung mit Epic Owner und relevanten Stakeholdern")
  push("*Validierung*")
  hint("Leitfrage: Wie werden Problemverständnis, Bedarf und Lösungsansatz überprüft? Welche Zielgruppen werden dabei einbezogen?")
  push(bullets("validierung") + "\n")
  push("*Pilot*")
  hint("Leitfrage: Mit welchem Team oder Bereich soll pilotiert werden? Welche Hypothesen und Erfolgskriterien werden im Pilot überprüft?")
  if (v("pilotGeplant") === "Nein") {
    push("* Es ist kein Pilot vorgesehen.\n")
  } else {
    push(labeled("Pilotpartner", "pilotPartner"))
    push(labeled("Umfang und Dauer", "pilotUmfang"))
    push(`* *Zu prüfende Hypothesen/Kriterien:* ${lines("pilotHypothesen").join(" ") || P}\n`)
  }
  push("*Rollout und Enablement*")
  hint("Leitfrage: Wie wird die Lösung eingeführt, kommuniziert und in der Anwendung unterstützt? Wie wird Feedback nach dem Rollout aufgenommen?")
  push(`* *Einführung und Kommunikation:* ${lines("rolloutKommunikation").join(" ") || P}`)
  push(`* *Training und Unterstützung:* ${lines("rolloutTraining").join(" ") || P}`)
  push(`* *Feedback und Weiterentwicklung:* ${lines("rolloutFeedback").join(" ") || P}\n`)
  push("*Übergang in den Regelbetrieb*")
  hint("Leitfrage: Wie wird die Veränderung in den Regelbetrieb überführt? Wer übernimmt anschließend Verantwortung für Pflege, Support und Weiterentwicklung?")
  push(bullets("regelbetriebUebergang") + "\n")
  panelEnd()

  panelStart("⏱️ Zeitlicher Rahmen & Meilensteine", "#8a6ec6")
  resp("Feste Rahmenbedingungen durch UX CORE · Realistische Planung gemeinsam mit dem Squad")
  push("*Start und Ende*")
  hint("Leitfrage: Wann soll die Initiative starten und bis wann soll der vereinbarte Umfang abgeschlossen sein? Welche Termine sind verbindlich und welche stellen eine aktuelle Planung dar?")
  push(labeled("Geplanter Start", "startDatum"))
  push(labeled("Geplantes Ende", "endeDatum"))
  push(labeled("Verbindliche zeitliche Vorgaben", "zeitVorgaben") + "\n")
  push("*Meilensteine*")
  hint("Leitfrage: Welche fachlichen oder organisatorischen Zwischenziele strukturieren die Initiative? Nur relevante Meilensteine ausfüllen.")
  const ms: Array<[string, string]> = ([
    ["Problemverständnis/Baseline", "ms_baseline"], ["Lösungskonzept", "ms_konzept"],
    ["Pilotstart", "ms_pilotstart"], ["Pilotauswertung und Entscheidung", "ms_pilotauswertung"],
    ["Rollout", "ms_rollout"], ["Übergabe in den Regelbetrieb", "ms_uebergabe"], ["Wirkungsmessung", "ms_wirkung"],
  ] as Array<[string, string]>).filter(([, k]) => !(v("pilotGeplant") === "Nein" && (k === "ms_pilotstart" || k === "ms_pilotauswertung")))
  const msFilled = ms.filter(([, k]) => v(k))
  ;(msFilled.length ? msFilled : ms).forEach(([lab, k]) => push(`* *${lab}:* ${v(k) || P}`))
  push("")
  panelEnd()
  push("----\n")

  /* 🟢 Verantwortung klären */
  push("h2. 🟢 Verantwortung klären\n")
  panelStart("💬 Team, Rollen & Governance", "#5ee198")
  resp("Initial durch UX CORE · Umsetzungsteam und operative Rollen gemeinsam konkretisieren")
  push("*Epic Owner*")
  hint("Leitfrage: Wer trägt die Verantwortung für Zielerreichung, Priorisierung, Fortschritt und Abstimmung der Initiative?")
  push(bullets("epicOwner") + "\n")
  push("*Umsetzungsteam*")
  hint("Leitfrage: Wer arbeitet aktiv an der Initiative und welche Rollen oder Kompetenzen werden benötigt?")
  push(bullets("umsetzungsteam") + "\n")
  push("*Auftraggeber und Entscheider*")
  hint("Leitfrage: Wer trifft Richtungs- und Priorisierungsentscheidungen, nimmt Ergebnisse ab und kann Eskalationen auflösen?")
  push(bullets("auftraggeber") + "\n")
  push("*Zielgruppenvertretung/Pilotpartner*")
  hint("Leitfrage: Welche Teams oder Personen vertreten die späteren Nutzerinnen und Nutzer und können in Validierung oder Pilotierung einbezogen werden?")
  push(bullets("zielgruppenvertretung") + "\n")
  push("*Stakeholder*")
  hint("Leitfrage: Welche weiteren Stakeholder müssen informiert, konsultiert oder an Entscheidungen beteiligt werden, z. B. UX, Produktteams, IT, Einkauf, Datenschutz, Betriebsrat, Legal oder Kommunikation?")
  push(bullets("stakeholder") + "\n")
  push("*Ownership im Regelbetrieb*")
  hint("Leitfrage: Wer verantwortet Pflege, Support und Weiterentwicklung nach Abschluss des Epics? Welche Entscheidungs-, Freigabe- und Pflegeprozesse gelten dann?")
  push(labeled("Verantwortlich im Regelbetrieb", "rb_verantwortlich"))
  push(labeled("Pflege und Support", "rb_pflege"))
  push(labeled("Entscheidungen und Freigaben", "rb_entscheidungen") + "\n")
  panelEnd()
  push("----\n")

  /* ⚪ Vorhandene Grundlagen nutzen */
  push("h2. ⚪ Vorhandene Grundlagen nutzen\n")
  panelStart("📥 Input & Vorarbeiten", "#ececec")
  resp("Initial durch UX CORE · Laufend durch den Squad ergänzen")
  push("*Vorhandene Erkenntnisse*")
  hint("Leitfrage: Welche Daten, Interviews, Retrospektiven, Feedbacks oder Reifegradanalysen liegen bereits vor? An welche Standards, Prozesse, Tools, Dokumentationen oder Erfahrungen kann angeknüpft werden?")
  push(listBullets("vorarbeiten") + "\n")
  panelEnd()
  push("----\n")

  /* 🟡 Unsicherheiten bearbeiten */
  push("h2. 🟡 Unsicherheiten bearbeiten\n")
  panelStart("🚨 Risiken & Gegenmaßnahmen", "#fff0b3")
  resp("Bekannte Risiken initial durch UX CORE · Laufende Ergänzung durch alle Beteiligten")
  push("*Risiken*")
  hint("Leitfrage: Was könnte die Zielerreichung, Umsetzung oder nachhaltige Nutzung gefährden? Zu betrachten sind z. B. Akzeptanz, Mandat, Ressourcen, Kompetenzen, Toolabhängigkeiten und ungeklärte Ownership.")
  push(listBullets("risiken") + "\n")
  push("*Gegenmaßnahmen*")
  hint("Leitfrage: Mit welchen präventiven oder korrigierenden Maßnahmen sollen die genannten Risiken reduziert werden? Wer ist jeweils verantwortlich?")
  push(listBullets("gegenmassnahmen") + "\n")
  panelEnd()

  panelStart("❓ Offene Punkte, Annahmen & Abhängigkeiten", "#fff0b3")
  resp("Gemeinsame und kontinuierliche Pflege durch Epic Owner und Squad")
  hint("Leitfrage: Was ist noch ungeklärt, welche Annahmen müssen validiert werden, wovon ist die Initiative abhängig und welche Entscheidungen werden benötigt? Jeder Eintrag erhält einen Owner, einen Status und möglichst einen Klärungstermin.")
  push("||Typ||Beschreibung||Auswirkung||Klärung/Validierung||Owner||Status||Fällig bis||")
  const ops = ((values.offenePunkte as OpRow[]) || []).filter(o => String(o.beschreibung || "").trim())
  const cell = (s: string) => String(s || "").trim().replace(/\|/g, "/").replace(/\n+/g, " ") || " "
  if (ops.length) {
    ops.forEach(o => push(`|${cell(o.typ)}|${cell(o.beschreibung)}|${cell(o.auswirkung)}|${cell(o.klaerung)}|${cell(o.owner)}|${cell(o.status)}|${cell(o.faellig)}|`))
  } else {
    push("|Offener Punkt|Noch offen …| | | |Offen| |")
  }
  push("")
  panelEnd()

  return out.join("\n")
}

export function buildAkText(values: Values): string {
  const arr = ((values.akzeptanzkriterien as string[]) || []).map(x => String(x).trim()).filter(Boolean)
  if (!arr.length) return "(Noch keine Akzeptanzkriterien erfasst)"
  return "Outcome-Akzeptanzkriterien\n" + arr.map(a => "[ ] " + a).join("\n")
}
