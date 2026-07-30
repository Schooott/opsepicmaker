// Schritt 1: Grundidee erfassen (Text/Diktat/Aufnahme/Dateien) und KI-Vorbefüllung.
import { useState } from "react"
import { ActionIcon, Alert, Button, Card, FileButton, Group, Image, Indicator, List, Paper, Select, Stack, Text, Textarea, Title } from "@mantine/core"
import { CircleHelpIcon, FileTextIcon, LightbulbIcon, MicIcon, PaperclipIcon, SparklesIcon, SquareIcon, TriangleAlertIcon, XIcon } from "lucide-react"

import { aiPrefill, okrToContext, type AiAttachment, type AiResult } from "@/lib/ai"
import { fileToAttachment } from "@/lib/attachments"
import type { Backend, Okr } from "@/lib/backend"
import { useRecorder } from "@/hooks/use-recorder"

const ACCEPT = "image/*,.pdf,.docx,.doc,.xlsx,.txt,.md,.csv,.json"

type Props = {
  backend: Backend
  idea: string
  onIdeaChange: (idea: string) => void
  onAiResult: (result: AiResult) => number
  okrs: Okr[]
  okrId: string | null
  onOkrChange: (id: string | null) => void
}

export function StepIntake({ backend, idea, onIdeaChange, onAiResult, okrs, okrId, onOkrChange }: Props) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const [okMessage, setOkMessage] = useState("")
  const [rueckfragen, setRueckfragen] = useState<string[]>([])
  const [attachments, setAttachments] = useState<AiAttachment[]>([])

  async function addFiles(files: File[]) {
    setError("")
    const errors: string[] = []
    const next: AiAttachment[] = []
    for (const f of files.slice(0, 8 - attachments.length)) {
      try {
        next.push(await fileToAttachment(f))
      } catch (e) {
        errors.push(e instanceof Error ? e.message : String(e))
      }
    }
    if (next.length) setAttachments(a => [...a, ...next])
    if (errors.length) setError(errors.join("\n"))
  }

  const rec = useRecorder(text => onIdeaChange((idea.trimEnd() + "\n" + text).trim()))

  const selectedOkr = okrs.find(o => o.id === okrId) ?? null
  // Aktive OKRs anbieten; eine bereits verknüpfte archivierte OKR bleibt wählbar
  const okrOptions = okrs
    .filter(o => o.status === "aktiv" || o.id === okrId)
    .map(o => ({ value: o.id, label: `${o.quarter} · ${o.objective}${o.status === "archiviert" ? " (archiviert)" : ""}` }))

  const deviceItems = [
    { label: "Standard-Mikrofon", value: "" },
    ...rec.devices.map((d, i) => ({ label: d.label || `Mikrofon ${i + 1}`, value: d.deviceId })),
  ]

  async function runAi() {
    setError("")
    setOkMessage("")
    setRueckfragen([])
    if (backend.kind !== "supabase") {
      setError("Die KI-Vorbefüllung ist im Demo-Modus ohne Backend nicht verfügbar.")
      return
    }
    if (idea.trim().length < 20 && attachments.length === 0) {
      setError("Bitte zuerst die Grundidee beschreiben (mind. ein paar Sätze) oder Dateien anhängen.")
      return
    }
    setLoading(true)
    try {
      const token = await backend.getAccessToken()
      if (!token) throw new Error("Keine gültige Sitzung – bitte neu anmelden.")
      const model = await backend.getAiModel()
      const result = await aiPrefill(token, model, idea.trim(), attachments, selectedOkr ? okrToContext(selectedOkr) : undefined)
      const filled = onAiResult(result)
      setOkMessage(`${filled} Felder vorbefüllt (als „KI-Vorschlag“ markiert). Bitte in den nächsten Schritten prüfen und anpassen.`)
      if (Array.isArray(result.rueckfragen)) setRueckfragen(result.rueckfragen.map(String))
    } catch (e) {
      setError(
        (e instanceof Error ? e.message : String(e)) +
          "\nHinweise: Firmennetz/Proxy kann den Aufruf blockieren · ggf. anderes Netz testen.",
      )
    } finally {
      setLoading(false)
    }
  }

  const minutes = Math.floor(rec.seconds / 60)
  const secs = String(rec.seconds % 60).padStart(2, "0")

  return (
    <Card withBorder radius="md" p="lg">
      <Stack gap="md">
        <Stack gap={2}>
          <Group gap={8}>
            <LightbulbIcon size={18} color="var(--mantine-color-dimmed)" />
            <Title order={4}>Grundidee &amp; Kontext</Title>
          </Group>
          <Text size="sm" c="dimmed">
            Alles, was zur Initiative bekannt ist: Problem, Ziel, Beteiligte, Termine … Diktate werden automatisch angehängt.
          </Text>
        </Stack>

        <Textarea
          aria-label="Beschreibung / Notizen / Transkript"
          autosize
          minRows={6}
          placeholder="z. B.: Wir wollen ein zentrales Research-Repository aufbauen, weil Erkenntnisse aus Interviews aktuell in einzelnen Teams verloren gehen …"
          value={idea}
          onChange={e => onIdeaChange(e.currentTarget.value)}
        />

        {okrOptions.length > 0 && (
          <Select
            label="Zahlt ein auf OKR (optional)"
            description="Die KI richtet Ziel, Erfolgskriterien und Akzeptanzkriterien an der gewählten OKR aus."
            placeholder="Keine OKR verknüpft"
            data={okrOptions}
            value={okrId}
            clearable
            searchable
            onChange={onOkrChange}
          />
        )}

        <Paper withBorder p="md" radius="md" style={{ borderStyle: "dashed" }}>
          <Stack gap="sm">
            <Group align="flex-end" gap="sm" wrap="wrap">
              <Select
                label="Audioquelle"
                w={320}
                data={deviceItems}
                value={rec.deviceId}
                allowDeselect={false}
                disabled={rec.recording}
                onChange={v => rec.setDeviceId(v ?? "")}
              />
              {rec.recording ? (
                <Button color="red" leftSection={<SquareIcon size={15} />} onClick={rec.stop}>
                  Aufnahme beenden ({minutes}:{secs})
                </Button>
              ) : (
                <Button variant="default" leftSection={<MicIcon size={15} />} onClick={rec.start}>
                  Aufnahme &amp; Diktat starten
                </Button>
              )}
            </Group>
            {rec.interim && <Text size="sm" c="dimmed" fs="italic">… {rec.interim}</Text>}
            {rec.notice && <Alert color="yellow">{rec.notice}</Alert>}
            {rec.audioUrl && <audio controls src={rec.audioUrl} style={{ width: "100%" }} />}
          </Stack>
        </Paper>

        <Stack gap="xs">
          {attachments.length > 0 && (
            <Group gap="sm" wrap="wrap">
              {attachments.map((a, i) => {
                const remove = (
                  <ActionIcon size={18} radius="xl" color="gray" aria-label={`${a.name} entfernen`} onClick={() => setAttachments(list => list.filter((_, x) => x !== i))}>
                    <XIcon size={11} />
                  </ActionIcon>
                )
                return a.kind === "image" ? (
                  <Indicator key={i} label={remove} color="transparent" offset={4}>
                    <Image src={a.preview} alt={a.name} title={a.name} w={72} h={72} fit="cover" radius="md" style={{ border: "1px solid var(--mantine-color-default-border)" }} />
                  </Indicator>
                ) : (
                  <Paper key={i} withBorder radius="md" px="sm" py={6}>
                    <Group gap={8} wrap="nowrap">
                      <FileTextIcon size={15} color="var(--mantine-color-dimmed)" />
                      <Text size="sm" maw={220} truncate title={a.name}>{a.name}</Text>
                      {remove}
                    </Group>
                  </Paper>
                )
              })}
            </Group>
          )}
          <Group gap="sm">
            <Button loading={loading} leftSection={<SparklesIcon size={16} />} onClick={runAi}>
              {loading ? "KI analysiert die Eingabe …" : "Felder mit KI vorbefüllen"}
            </Button>
            <FileButton onChange={addFiles} accept={ACCEPT} multiple>
              {props => (
                <Button {...props} variant="default" leftSection={<PaperclipIcon size={16} />} disabled={loading || attachments.length >= 8}>
                  Dateien anhängen{attachments.length > 0 ? ` (${attachments.length})` : ""}
                </Button>
              )}
            </FileButton>
          </Group>
          <Text size="xs" c="dimmed">
            Bis zu 8 Dateien, je max. 10 MB: Screenshots/Bilder, PDF, Word (.docx), Excel (.xlsx), Text/Markdown/CSV. Die Inhalte fließen in die KI-Vorbefüllung ein.
          </Text>
        </Stack>

        {error && (
          <Alert color="red" title="Fehler beim KI-Aufruf" icon={<TriangleAlertIcon size={16} />}>
            <Text size="sm" style={{ whiteSpace: "pre-wrap" }}>{error}</Text>
          </Alert>
        )}
        {okMessage && (
          <Alert color="teal" icon={<SparklesIcon size={16} />}>
            {okMessage}
          </Alert>
        )}
        {rueckfragen.length > 0 && (
          <Alert color="yellow" title="Die KI empfiehlt, folgende Punkte noch zu klären:" icon={<CircleHelpIcon size={16} />}>
            <List size="sm" spacing={4}>
              {rueckfragen.map((q, i) => (
                <List.Item key={i}>{q}</List.Item>
              ))}
            </List>
          </Alert>
        )}
      </Stack>
    </Card>
  )
}
