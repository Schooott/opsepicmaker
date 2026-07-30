// Schritt 1: Grundidee erfassen (Text/Diktat/Aufnahme) und KI-Vorbefüllung.
import { useState } from "react"
import { Alert, Button, Card, Group, List, Paper, Select, Stack, Text, Textarea, Title } from "@mantine/core"
import { CircleHelpIcon, LightbulbIcon, MicIcon, SparklesIcon, SquareIcon, TriangleAlertIcon } from "lucide-react"

import { aiPrefill, type AiResult } from "@/lib/ai"
import type { Backend } from "@/lib/backend"
import { useRecorder } from "@/hooks/use-recorder"

type Props = {
  backend: Backend
  idea: string
  onIdeaChange: (idea: string) => void
  onAiResult: (result: AiResult) => number
}

export function StepIntake({ backend, idea, onIdeaChange, onAiResult }: Props) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const [okMessage, setOkMessage] = useState("")
  const [rueckfragen, setRueckfragen] = useState<string[]>([])

  const rec = useRecorder(text => onIdeaChange((idea.trimEnd() + "\n" + text).trim()))

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
    if (idea.trim().length < 20) {
      setError("Bitte zuerst die Grundidee beschreiben (mind. ein paar Sätze).")
      return
    }
    setLoading(true)
    try {
      const token = await backend.getAccessToken()
      if (!token) throw new Error("Keine gültige Sitzung – bitte neu anmelden.")
      const model = await backend.getAiModel()
      const result = await aiPrefill(token, model, idea.trim())
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

        <Group>
          <Button loading={loading} leftSection={<SparklesIcon size={16} />} onClick={runAi}>
            {loading ? "KI analysiert die Eingabe …" : "Felder mit KI vorbefüllen"}
          </Button>
        </Group>

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
