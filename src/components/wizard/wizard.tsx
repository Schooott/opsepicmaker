// Der Epic-Wizard: 6 Schritte entlang der Template-Struktur, Speichern in der
// Datenbank, Kommentar-Sidebar und Jira-Export.
import { useCallback, useEffect, useMemo, useState } from "react"
import {
  ArrowLeftIcon, ArrowRightIcon, CircleHelpIcon, ClockIcon, FlagIcon, FlaskConicalIcon, InboxIcon,
  ListChecksIcon, MapPinIcon, MessagesSquareIcon, PackageIcon, RulerIcon, SaveIcon, SirenIcon,
  TicketIcon, UsersIcon, type LucideIcon,
} from "lucide-react"
import { toast } from "sonner"

import type { AiResult } from "@/lib/ai"
import type { Backend, EpicRecord, Profile } from "@/lib/backend"
import {
  FIELDS, PANELS, defaultValues, isEmpty, missingRequired, OP_STATUS, OP_TYPEN, stepOfField,
  type FieldValue, type OpRow, type Sources, type Values,
} from "@/lib/fields"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { FieldGroup } from "@/components/ui/field"
import { Spinner } from "@/components/ui/spinner"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { CommentsSheet } from "./comments-sheet"
import { FieldRenderer } from "./field-renderer"
import { StepIntake } from "./step-intake"
import { StepExport } from "./step-export"

const PANEL_ICONS: Record<string, LucideIcon> = {
  ticket: TicketIcon, "map-pin": MapPinIcon, users: UsersIcon, flag: FlagIcon, ruler: RulerIcon,
  package: PackageIcon, "list-checks": ListChecksIcon, "flask-conical": FlaskConicalIcon, clock: ClockIcon,
  "messages-square": MessagesSquareIcon, inbox: InboxIcon, siren: SirenIcon, "circle-help": CircleHelpIcon,
}

const STEPS = [
  { n: 0, label: "Eingabe & KI" },
  { n: 1, label: "Auftrag" },
  { n: 2, label: "Umsetzung" },
  { n: 3, label: "Verantwortung" },
  { n: 4, label: "Risiken & Offenes" },
  { n: 5, label: "Export" },
]

type Props = {
  backend: Backend
  profile: Profile
  epic: EpicRecord | null
  onBack: () => void
}

export function Wizard({ backend, profile, epic, onBack }: Props) {
  const [values, setValues] = useState<Values>(() => ({ ...defaultValues(), ...(epic?.data.values ?? {}) }))
  const [source, setSource] = useState<Sources>(() => epic?.data.source ?? {})
  const [idea, setIdea] = useState(() => epic?.data.idea ?? "")
  const [step, setStep] = useState(epic ? 1 : 0)
  const [epicId, setEpicId] = useState<string | null>(epic?.id ?? null)
  const [dirty, setDirty] = useState(false)
  const [saving, setSaving] = useState(false)
  const [lastSaved, setLastSaved] = useState<Date | null>(epic ? new Date(epic.updated_at) : null)

  const setField = useCallback((key: string, value: FieldValue, src: "ai" | "user" = "user") => {
    setValues(v => ({ ...v, [key]: value }))
    setSource(s => ({ ...s, [key]: src }))
    setDirty(true)
  }, [])

  const onIdeaChange = useCallback((text: string) => {
    setIdea(text)
    setDirty(true)
  }, [])

  useEffect(() => {
    if (!dirty) return
    const handler = (e: BeforeUnloadEvent) => e.preventDefault()
    window.addEventListener("beforeunload", handler)
    return () => window.removeEventListener("beforeunload", handler)
  }, [dirty])

  const missingByStep = useMemo(() => {
    const map = new Map<number, number>()
    for (const f of missingRequired(values)) {
      const s = stepOfField(f)
      map.set(s, (map.get(s) ?? 0) + 1)
    }
    return map
  }, [values])

  const title = String(values.titel || "").trim() || String(values.initiativeName || "").trim() || "Ohne Titel"

  const applyAiResult = useCallback((result: AiResult): number => {
    const nextValues = { ...values }
    const nextSource = { ...source }
    for (const f of FIELDS) {
      if (f.type === "grouplabel") continue
      const val = result[f.key]
      if (val === undefined || val === null) continue
      const userEdited = nextSource[f.key] === "user" && !isEmpty(nextValues[f.key])
      if (userEdited) continue // Nutzereingaben nie überschreiben
      if (f.type === "check") {
        if (typeof val === "boolean" && val !== nextValues[f.key]) {
          nextValues[f.key] = val
          nextSource[f.key] = "ai"
        }
      } else if (f.type === "list") {
        const arr = (Array.isArray(val) ? val : []).map(x => String(x).trim()).filter(Boolean)
        if (arr.length) {
          nextValues[f.key] = arr
          nextSource[f.key] = "ai"
        }
      } else if (f.type === "optable") {
        const arr = (Array.isArray(val) ? (val as Partial<OpRow>[]) : [])
          .filter(o => o && String(o.beschreibung || "").trim())
          .map(o => ({
            typ: OP_TYPEN.includes(String(o.typ)) ? String(o.typ) : "Offener Punkt",
            beschreibung: String(o.beschreibung || ""), auswirkung: String(o.auswirkung || ""),
            klaerung: String(o.klaerung || ""), owner: String(o.owner || ""),
            status: OP_STATUS[0], faellig: String(o.faellig || ""),
          }))
        if (arr.length) {
          nextValues[f.key] = arr
          nextSource[f.key] = "ai"
        }
      } else {
        const s = String(val).trim()
        if (f.type === "select" && s && !(f.options ?? []).includes(s)) continue
        if (s) {
          nextValues[f.key] = s
          nextSource[f.key] = "ai"
        }
      }
    }
    setValues(nextValues)
    setSource(nextSource)
    setDirty(true)
    return FIELDS.filter(f => f.type !== "grouplabel" && nextSource[f.key] === "ai" && !isEmpty(nextValues[f.key])).length
  }, [values, source])

  async function save() {
    setSaving(true)
    try {
      const data = { values, source, idea }
      if (!epicId) {
        const id = await backend.createEpic(title, data)
        setEpicId(id)
      } else {
        await backend.updateEpic(epicId, title, data)
      }
      setDirty(false)
      setLastSaved(new Date())
      toast.success("Epic gespeichert")
    } catch (e) {
      toast.error("Speichern fehlgeschlagen: " + (e instanceof Error ? e.message : String(e)))
    } finally {
      setSaving(false)
    }
  }

  function backToList() {
    if (dirty && !confirm("Es gibt ungespeicherte Änderungen. Ohne Speichern zur Übersicht zurückkehren?")) return
    onBack()
  }

  const stepBody = (n: number) => {
    if (n === 0) return <StepIntake backend={backend} idea={idea} onIdeaChange={onIdeaChange} onAiResult={applyAiResult} />
    if (n === 5) return <StepExport values={values} onJumpToStep={setStep} />
    return (
      <div className="flex flex-col gap-6">
        {PANELS.filter(p => p.step === n).map(p => {
          const Icon = PANEL_ICONS[p.icon]
          return (
            <Card key={p.id}>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <span aria-hidden className="size-2.5 rounded-full" style={{ background: p.color }} />
                  <Icon className="text-muted-foreground" />
                  {p.title}
                </CardTitle>
                {p.resp && <CardDescription>Verantwortung: {p.resp}</CardDescription>}
              </CardHeader>
              <CardContent>
                <FieldGroup>
                  {FIELDS.filter(f => f.panel === p.id).map(f => (
                    <FieldRenderer key={f.key} field={f} values={values} source={source} setField={setField} />
                  ))}
                </FieldGroup>
              </CardContent>
            </Card>
          )
        })}
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center gap-3">
        <Button variant="ghost" onClick={backToList}>
          <ArrowLeftIcon data-icon="inline-start" />
          Übersicht
        </Button>
        <h1 className="min-w-0 flex-1 truncate text-lg font-semibold">{title}</h1>
      </div>

      <Tabs value={String(step)} onValueChange={v => setStep(Number(v))}>
        <TabsList className="w-full flex-wrap">
          {STEPS.map(s => (
            <TabsTrigger key={s.n} value={String(s.n)}>
              {s.label}
              {(missingByStep.get(s.n) ?? 0) > 0 && <Badge variant="destructive">{missingByStep.get(s.n)}</Badge>}
            </TabsTrigger>
          ))}
        </TabsList>
      </Tabs>

      <div className="pb-20">{stepBody(step)}</div>

      <div className="fixed inset-x-0 bottom-0 border-t bg-background">
        <div className="mx-auto flex max-w-4xl flex-wrap items-center gap-3 px-4 py-3">
          <Button variant="outline" disabled={step === 0} onClick={() => setStep(s => Math.max(0, s - 1))}>
            <ArrowLeftIcon data-icon="inline-start" />
            Zurück
          </Button>
          <Button variant="outline" disabled={step === 5} onClick={() => setStep(s => Math.min(5, s + 1))}>
            Weiter
            <ArrowRightIcon data-icon="inline-end" />
          </Button>
          <p className="flex-1 text-center text-xs text-muted-foreground">
            {dirty
              ? "Ungespeicherte Änderungen"
              : lastSaved
                ? `Gespeichert ${lastSaved.toLocaleTimeString("de-DE", { hour: "2-digit", minute: "2-digit" })}`
                : "Noch nicht gespeichert"}
          </p>
          <CommentsSheet backend={backend} profile={profile} epicId={epicId} epicTitle={title} />
          <Button onClick={save} disabled={saving}>
            {saving ? <Spinner data-icon="inline-start" /> : <SaveIcon data-icon="inline-start" />}
            Speichern
          </Button>
        </div>
      </div>
    </div>
  )
}
