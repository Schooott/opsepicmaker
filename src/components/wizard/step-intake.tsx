// Schritt 1: Grundidee erfassen (Text/Diktat/Aufnahme) und KI-Vorbefüllung.
import { useState } from "react"
import { CircleHelpIcon, LightbulbIcon, MicIcon, SparklesIcon, SquareIcon } from "lucide-react"

import { aiPrefill, type AiResult } from "@/lib/ai"
import type { Backend } from "@/lib/backend"
import { useRecorder } from "@/hooks/use-recorder"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Field, FieldLabel } from "@/components/ui/field"
import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Spinner } from "@/components/ui/spinner"
import { Textarea } from "@/components/ui/textarea"

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
          "\nHinweise: API-Key prüfen · Firmennetz/Proxy kann api.anthropic.com blockieren · ggf. anderes Netz testen.",
      )
    } finally {
      setLoading(false)
    }
  }

  const minutes = Math.floor(rec.seconds / 60)
  const secs = String(rec.seconds % 60).padStart(2, "0")

  return (
    <div className="flex flex-col gap-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <LightbulbIcon className="text-muted-foreground" /> Grundidee &amp; Kontext
          </CardTitle>
          <CardDescription>
            Alles, was zur Initiative bekannt ist: Problem, Ziel, Beteiligte, Termine … Diktate werden automatisch angehängt.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-6">
          <Field>
            <FieldLabel htmlFor="idea" className="sr-only">Beschreibung / Notizen / Transkript</FieldLabel>
            <Textarea
              id="idea"
              rows={7}
              placeholder="z. B.: Wir wollen ein zentrales Research-Repository aufbauen, weil Erkenntnisse aus Interviews aktuell in einzelnen Teams verloren gehen …"
              value={idea}
              onChange={e => onIdeaChange(e.target.value)}
            />
          </Field>

          <div className="flex flex-col gap-4 rounded-lg border border-dashed p-4">
            <Field>
              <FieldLabel htmlFor="mic">Audioquelle</FieldLabel>
              <div className="flex flex-wrap items-center gap-3">
                <Select items={deviceItems} value={rec.deviceId} onValueChange={v => rec.setDeviceId(v == null ? "" : String(v))}>
                  <SelectTrigger id="mic" className="w-full sm:w-80" disabled={rec.recording}>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectGroup>
                      {deviceItems.map(it => (
                        <SelectItem key={it.value} value={it.value}>{it.label}</SelectItem>
                      ))}
                    </SelectGroup>
                  </SelectContent>
                </Select>
                {rec.recording ? (
                  <Button variant="destructive" onClick={rec.stop}>
                    <SquareIcon data-icon="inline-start" />
                    Aufnahme beenden ({minutes}:{secs})
                  </Button>
                ) : (
                  <Button variant="outline" onClick={rec.start}>
                    <MicIcon data-icon="inline-start" />
                    Aufnahme &amp; Diktat starten
                  </Button>
                )}
              </div>
            </Field>
            {rec.interim && <p className="text-sm text-muted-foreground italic">… {rec.interim}</p>}
            {rec.notice && (
              <Alert>
                <AlertDescription>{rec.notice}</AlertDescription>
              </Alert>
            )}
            {rec.audioUrl && <audio controls src={rec.audioUrl} className="w-full" />}
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <Button onClick={runAi} disabled={loading}>
              {loading ? <Spinner data-icon="inline-start" /> : <SparklesIcon data-icon="inline-start" />}
              {loading ? "KI analysiert die Eingabe …" : "Felder mit KI vorbefüllen"}
            </Button>
          </div>

          {error && (
            <Alert variant="destructive">
              <AlertTitle>Fehler beim KI-Aufruf</AlertTitle>
              <AlertDescription className="whitespace-pre-wrap">{error}</AlertDescription>
            </Alert>
          )}
          {okMessage && (
            <Alert>
              <SparklesIcon />
              <AlertDescription>{okMessage}</AlertDescription>
            </Alert>
          )}
          {rueckfragen.length > 0 && (
            <Alert>
              <CircleHelpIcon />
              <AlertTitle>Die KI empfiehlt, folgende Punkte noch zu klären:</AlertTitle>
              <AlertDescription>
                <ul className="list-disc pl-4">
                  {rueckfragen.map((q, i) => (
                    <li key={i}>{q}</li>
                  ))}
                </ul>
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
