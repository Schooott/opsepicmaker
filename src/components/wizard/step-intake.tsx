// Schritt 1: Grundidee erfassen (Text/Diktat/Aufnahme) und KI-Vorbefüllung.
import { useState } from "react"
import { CircleHelpIcon, LightbulbIcon, MicIcon, SettingsIcon, SparklesIcon, SquareIcon } from "lucide-react"

import { aiPrefill, type AiAuth, type AiResult } from "@/lib/ai"
import type { Backend } from "@/lib/backend"
import { useRecorder } from "@/hooks/use-recorder"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Field, FieldDescription, FieldGroup, FieldLabel } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Spinner } from "@/components/ui/spinner"
import { Textarea } from "@/components/ui/textarea"

const LS_APIKEY = "epicwizard.apikey"

type Props = {
  backend: Backend
  idea: string
  onIdeaChange: (idea: string) => void
  onAiResult: (result: AiResult) => number
}

export function StepIntake({ backend, idea, onIdeaChange, onAiResult }: Props) {
  const keylessMode = backend.kind === "supabase"
  const [apiKey, setApiKey] = useState(() => localStorage.getItem(LS_APIKEY) ?? "")
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
    if (!keylessMode && !apiKey.trim()) {
      setError("Bitte zuerst den Anthropic API-Key eintragen.")
      return
    }
    if (idea.trim().length < 20) {
      setError("Bitte zuerst die Grundidee beschreiben (mind. ein paar Sätze).")
      return
    }
    setLoading(true)
    try {
      let auth: AiAuth
      if (keylessMode) {
        const token = await backend.getAccessToken()
        if (!token) throw new Error("Keine gültige Sitzung – bitte neu anmelden.")
        auth = { mode: "edge", token }
      } else {
        auth = { mode: "direct", apiKey: apiKey.trim() }
      }
      const model = await backend.getAiModel()
      const result = await aiPrefill(auth, model, idea.trim())
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
      {!keylessMode && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <SettingsIcon className="text-muted-foreground" /> KI-Einstellungen
            </CardTitle>
            <CardDescription>
              Der API-Key wird ausschließlich lokal in diesem Browser gespeichert und nur direkt an api.anthropic.com gesendet.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <FieldGroup>
              <Field>
                <FieldLabel htmlFor="apiKey">Anthropic API-Key</FieldLabel>
                <Input
                  id="apiKey"
                  type="password"
                  placeholder="sk-ant-..."
                  autoComplete="off"
                  value={apiKey}
                  onChange={e => {
                    setApiKey(e.target.value)
                    localStorage.setItem(LS_APIKEY, e.target.value.trim())
                  }}
                />
              </Field>
            </FieldGroup>
          </CardContent>
        </Card>
      )}

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
            <FieldGroup className="gap-4 sm:grid sm:grid-cols-2">
              <Field>
                <FieldLabel htmlFor="mic">Audioquelle</FieldLabel>
                <Select items={deviceItems} value={rec.deviceId} onValueChange={v => rec.setDeviceId(v == null ? "" : String(v))}>
                  <SelectTrigger id="mic" className="w-full" disabled={rec.recording}>
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
              </Field>
              <Field>
                <FieldLabel className="sr-only">Aufnahme</FieldLabel>
                <div className="flex items-center gap-3">
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
            </FieldGroup>
            {rec.interim && <p className="text-sm text-muted-foreground italic">… {rec.interim}</p>}
            {rec.notice && (
              <Alert>
                <AlertDescription>{rec.notice}</AlertDescription>
              </Alert>
            )}
            {rec.audioUrl && <audio controls src={rec.audioUrl} className="w-full" />}
            <FieldDescription>
              Das Diktat nutzt die Browser-Spracherkennung (Chrome/Edge, Deutsch) – sie hört immer auf das System-Standardmikrofon.
              Für die Transkription eines Team-Calls das Call-Audio auf ein Loopback-Gerät (z. B. BlackHole) routen und dieses als
              Standard-Eingang setzen. Bitte das Einverständnis aller Teilnehmenden einholen.
            </FieldDescription>
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
