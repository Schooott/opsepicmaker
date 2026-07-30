// Der Epic-Wizard: 6 Schritte entlang der Template-Struktur, Speichern in der
// Datenbank, bereichsbezogene Kommentare und Jira-Export.
import { useCallback, useEffect, useMemo, useState } from "react"
import {
  Badge, Box, Button, Card, ColorSwatch, Container, Flex, Group, Paper, Stack, Tabs, Text, Title,
} from "@mantine/core"
import {
  ArrowLeftIcon, ArrowRightIcon, CircleCheckIcon, CircleHelpIcon, ClockIcon, FlagIcon, FlaskConicalIcon,
  InboxIcon, ListChecksIcon, MapPinIcon, MessageSquareIcon, MessagesSquareIcon, PackageIcon,
  RotateCcwIcon, RulerIcon, SaveIcon, SirenIcon, TicketIcon, UsersIcon, type LucideIcon,
} from "lucide-react"

import type { AiResult } from "@/lib/ai"
import type { Backend, CommentRec, EpicRecord, EpicStatus, Profile } from "@/lib/backend"
import {
  FIELDS, PANELS, defaultValues, isEmpty, missingRequired, OP_STATUS, OP_TYPEN, stepOfField,
  type FieldValue, type OpRow, type Sources, type Values,
} from "@/lib/fields"
import { toast } from "@/lib/notify"
import { CommentsPanel } from "./comments-panel"
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
  const [status, setStatus] = useState<EpicStatus>(epic?.status ?? "entwurf")
  const [dirty, setDirty] = useState(false)
  const [saving, setSaving] = useState(false)
  const [lastSaved, setLastSaved] = useState<Date | null>(epic ? new Date(epic.updated_at) : null)
  const [comments, setComments] = useState<CommentRec[]>([])
  const [commentsLoading, setCommentsLoading] = useState(false)
  const [openSection, setOpenSection] = useState<string | null>(null)

  const loadComments = useCallback(async (id: string) => {
    setCommentsLoading(true)
    try {
      setComments(await backend.listComments(id))
    } catch (e) {
      toast.error("Kommentare laden fehlgeschlagen: " + (e instanceof Error ? e.message : String(e)))
    } finally {
      setCommentsLoading(false)
    }
  }, [backend])

  useEffect(() => {
    if (epicId) loadComments(epicId)
  }, [epicId, loadComments])

  async function addComment(body: string, parentId: string | null) {
    if (!epicId || !openSection) return
    try {
      await backend.addComment(epicId, openSection, body, parentId)
      await loadComments(epicId)
    } catch (e) {
      toast.error("Kommentar senden fehlgeschlagen: " + (e instanceof Error ? e.message : String(e)))
    }
  }

  async function updateComment(id: string, body: string) {
    try {
      await backend.updateComment(id, body)
      if (epicId) await loadComments(epicId)
    } catch (e) {
      toast.error("Bearbeiten fehlgeschlagen: " + (e instanceof Error ? e.message : String(e)))
    }
  }

  async function deleteComment(id: string) {
    try {
      await backend.deleteComment(id)
      if (epicId) await loadComments(epicId)
    } catch (e) {
      toast.error("Löschen fehlgeschlagen: " + (e instanceof Error ? e.message : String(e)))
    }
  }

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

  const complete = missingRequired(values).length === 0

  async function save(requestedStatus?: EpicStatus) {
    setSaving(true)
    try {
      let nextStatus = requestedStatus ?? status
      // Abgeschlossen setzt voraus, dass alle Pflichtfelder gefüllt sind —
      // sonst fällt das Epic (auch nachträglich) auf Entwurf zurück.
      if (nextStatus === "abgeschlossen" && !complete) {
        nextStatus = "entwurf"
        toast.error("Es fehlen noch Pflichtfelder – das Epic bleibt im Status „Entwurf“.")
      }
      const data = { values, source, idea }
      if (!epicId) {
        const id = await backend.createEpic(title, data, nextStatus)
        setEpicId(id)
      } else {
        await backend.updateEpic(epicId, title, data, nextStatus)
      }
      setStatus(nextStatus)
      setDirty(false)
      setLastSaved(new Date())
      toast.success(
        requestedStatus === "abgeschlossen" && nextStatus === "abgeschlossen"
          ? "Epic abgeschlossen"
          : requestedStatus === "entwurf" && status === "abgeschlossen"
            ? "Epic wieder geöffnet"
            : "Epic gespeichert",
      )
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
      <Stack gap="lg">
        {PANELS.filter(p => p.step === n).map(p => {
          const Icon = PANEL_ICONS[p.icon]
          const count = comments.filter(c => c.section === p.id).length
          const active = openSection === p.id
          return (
            <Card key={p.id} withBorder radius="md" p="lg">
              <Stack gap="md">
                <Group justify="space-between" align="flex-start" wrap="nowrap">
                  <Stack gap={2}>
                    <Group gap={8}>
                      <ColorSwatch color={p.color} size={10} />
                      <Icon size={17} color="var(--mantine-color-dimmed)" />
                      <Title order={4}>{p.title}</Title>
                    </Group>
                    {p.resp && <Text size="xs" c="dimmed">Verantwortung: {p.resp}</Text>}
                  </Stack>
                  <Button
                    variant={active ? "light" : "subtle"}
                    color={active ? "indigo" : "gray"}
                    size="xs"
                    disabled={!epicId}
                    title={epicId ? `Kommentare zu „${p.title}“` : "Bitte das Epic zuerst speichern"}
                    leftSection={<MessageSquareIcon size={14} />}
                    onClick={() => setOpenSection(active ? null : p.id)}
                  >
                    {count}
                  </Button>
                </Group>
                <Stack gap="md">
                  {FIELDS.filter(f => f.panel === p.id).map(f => (
                    <FieldRenderer key={f.key} field={f} values={values} source={source} setField={setField} />
                  ))}
                </Stack>
              </Stack>
            </Card>
          )
        })}
      </Stack>
    )
  }

  const openPanel = openSection ? PANELS.find(p => p.id === openSection) : undefined

  return (
    <Stack gap="md">
      <Group gap="sm">
        <Button variant="subtle" color="gray" leftSection={<ArrowLeftIcon size={16} />} onClick={backToList}>
          Übersicht
        </Button>
        <Title order={4} style={{ minWidth: 0 }} lineClamp={1}>{title}</Title>
        <Badge
          variant="light"
          color={status === "abgeschlossen" ? "teal" : "gray"}
          leftSection={status === "abgeschlossen" ? <CircleCheckIcon size={11} /> : undefined}
        >
          {status === "abgeschlossen" ? "Abgeschlossen" : "Entwurf"}
        </Badge>
      </Group>

      <Flex align="flex-start" gap="lg">
        <Box style={{ flex: 1, minWidth: 0 }}>
          <Tabs value={String(step)} onChange={v => v != null && setStep(Number(v))}>
            <Tabs.List>
              {STEPS.map(s => (
                <Tabs.Tab
                  key={s.n}
                  value={String(s.n)}
                  rightSection={
                    (missingByStep.get(s.n) ?? 0) > 0 ? (
                      <Badge size="xs" color="red" variant="light" circle>{missingByStep.get(s.n)}</Badge>
                    ) : undefined
                  }
                >
                  {s.label}
                </Tabs.Tab>
              ))}
            </Tabs.List>
          </Tabs>
          <Box pt="md" pb={80}>{stepBody(step)}</Box>
        </Box>
        {openPanel && (
          <Box w={{ base: 320, lg: 380 }} style={{ position: "sticky", top: 72 }} visibleFrom="sm">
            <CommentsPanel
              panel={openPanel}
              comments={comments.filter(c => c.section === openPanel.id)}
              loading={commentsLoading}
              profile={profile}
              onClose={() => setOpenSection(null)}
              onAdd={addComment}
              onUpdate={updateComment}
              onDelete={deleteComment}
            />
          </Box>
        )}
      </Flex>

      <Paper pos="fixed" bottom={0} left={0} right={0} withBorder radius={0} style={{ zIndex: 100 }}>
        <Container size="xl" py={10}>
          <Group gap="sm" wrap="wrap">
            <Button variant="default" disabled={step === 0} leftSection={<ArrowLeftIcon size={15} />} onClick={() => setStep(s => Math.max(0, s - 1))}>
              Zurück
            </Button>
            <Button variant="default" disabled={step === 5} rightSection={<ArrowRightIcon size={15} />} onClick={() => setStep(s => Math.min(5, s + 1))}>
              Weiter
            </Button>
            <Text size="xs" c="dimmed" style={{ flex: 1 }} ta="center">
              {dirty
                ? "Ungespeicherte Änderungen"
                : lastSaved
                  ? `Gespeichert ${lastSaved.toLocaleTimeString("de-DE", { hour: "2-digit", minute: "2-digit" })}`
                  : "Noch nicht gespeichert"}
            </Text>
            {status === "abgeschlossen" ? (
              <Button variant="light" color="gray" loading={saving} leftSection={<RotateCcwIcon size={15} />} onClick={() => save("entwurf")}>
                Wieder öffnen
              </Button>
            ) : (
              <Button
                variant="light"
                color="teal"
                loading={saving}
                disabled={!complete}
                title={complete ? undefined : "Erst möglich, wenn alle Pflichtfelder gefüllt sind"}
                leftSection={<CircleCheckIcon size={15} />}
                onClick={() => save("abgeschlossen")}
              >
                Abschließen
              </Button>
            )}
            <Button loading={saving} leftSection={<SaveIcon size={15} />} onClick={() => save()}>
              Speichern
            </Button>
          </Group>
        </Container>
      </Paper>
    </Stack>
  )
}
