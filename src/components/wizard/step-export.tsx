// Schritt 6: Vollständigkeit prüfen und Inhalte für Jira kopieren.
import { useState } from "react"
import { CheckIcon, ClipboardCopyIcon, TriangleAlertIcon } from "lucide-react"
import { toast } from "sonner"

import { missingRequired, requiredFields, stepOfField, type Values } from "@/lib/fields"
import { buildAkText, buildWikiDescription } from "@/lib/exportJira"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Checkbox } from "@/components/ui/checkbox"
import { Field, FieldLabel } from "@/components/ui/field"
import { ScrollArea } from "@/components/ui/scroll-area"

type Props = {
  values: Values
  onJumpToStep: (step: number) => void
}

async function copy(text: string, label: string) {
  try {
    await navigator.clipboard.writeText(text)
    toast.success(`${label} kopiert`)
  } catch {
    toast.error("Kopieren fehlgeschlagen – bitte manuell markieren und kopieren.")
  }
}

function CopyCard({ title, description, text, preview }: { title: string; description?: string; text: string; preview?: "block" | "inline" }) {
  return (
    <Card>
      <CardHeader>
        <div className="flex flex-wrap items-center justify-between gap-2">
          <CardTitle>{title}</CardTitle>
          <Button variant="outline" size="sm" onClick={() => copy(text, title)}>
            <ClipboardCopyIcon data-icon="inline-start" />
            Kopieren
          </Button>
        </div>
        {description && <CardDescription>{description}</CardDescription>}
      </CardHeader>
      <CardContent>
        {preview === "block" ? (
          <ScrollArea className="h-72 rounded-lg border bg-muted/50">
            <pre className="p-4 font-mono text-xs whitespace-pre-wrap">{text}</pre>
          </ScrollArea>
        ) : (
          <p className="rounded-lg bg-muted/50 px-3 py-2 text-sm break-words">{text}</p>
        )}
      </CardContent>
    </Card>
  )
}

export function StepExport({ values, onJumpToStep }: Props) {
  const [withLeitfragen, setWithLeitfragen] = useState(true)
  const missing = missingRequired(values)
  const required = requiredFields(values)
  const titel = String(values.titel || "").trim() || "(Titel fehlt)"
  const epicName = String(values.epicName || "").trim() || "(Epic Name fehlt)"

  return (
    <div className="flex flex-col gap-6">
      <Card>
        <CardHeader>
          <CardTitle>Vollständigkeit wichtiger Felder</CardTitle>
          <CardDescription>
            {missing.length === 0
              ? "Alle Pflichtfelder sind befüllt."
              : `${missing.length} von ${required.length} Pflichtfeldern fehlen noch – Klick springt zum Feld.`}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ul className="flex flex-col gap-1.5">
            {required.map(f => {
              const isMissing = missing.includes(f)
              return (
                <li key={f.key}>
                  {isMissing ? (
                    <button
                      type="button"
                      className="flex items-center gap-2 text-sm text-destructive hover:underline"
                      onClick={() => onJumpToStep(stepOfField(f))}
                    >
                      <TriangleAlertIcon className="size-4" />
                      {f.label} – fehlt noch
                    </button>
                  ) : (
                    <span className="flex items-center gap-2 text-sm text-muted-foreground">
                      <CheckIcon className="size-4" />
                      {f.label}
                    </span>
                  )}
                </li>
              )
            })}
          </ul>
        </CardContent>
      </Card>

      <CopyCard title="1 · Titel (Zusammenfassung)" text={titel} />
      <CopyCard title="2 · Epic Name (Kurzname)" text={epicName} />

      <Card>
        <CardHeader>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <CardTitle>3 · Beschreibung (Jira-Wiki-Markup)</CardTitle>
            <Button size="sm" onClick={() => copy(buildWikiDescription(values, withLeitfragen), "Beschreibung")}>
              <ClipboardCopyIcon data-icon="inline-start" />
              Beschreibung kopieren
            </Button>
          </div>
          <CardDescription>In das Beschreibungsfeld des neuen Jira-Epics einfügen.</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <Field orientation="horizontal">
            <Checkbox id="leitfragen" checked={withLeitfragen} onCheckedChange={c => setWithLeitfragen(!!c)} />
            <FieldLabel htmlFor="leitfragen" className="font-normal">
              Leitfragen aus dem Template im Export behalten (Struktur wie Vorlage)
            </FieldLabel>
          </Field>
          <ScrollArea className="h-80 rounded-lg border bg-muted/50">
            <pre className="p-4 font-mono text-xs whitespace-pre-wrap">{buildWikiDescription(values, withLeitfragen)}</pre>
          </ScrollArea>
        </CardContent>
      </Card>

      <CopyCard
        title="4 · Akzeptanzkriterien (Checklisten-Feld)"
        description="Einzeln in das Checklisten-Feld „Akzeptanzkriterien“ übernehmen (Überschrift: Outcome-Akzeptanzkriterien)."
        text={buildAkText(values)}
        preview="block"
      />
    </div>
  )
}
