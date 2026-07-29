// Anmeldung. Ohne Supabase-Konfiguration läuft die App im lokalen Demo-Modus.
import { useState } from "react"
import { CompassIcon, LogInIcon } from "lucide-react"

import { DEMO_LOGIN, type Backend, type Profile } from "@/lib/backend"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Field, FieldDescription, FieldGroup, FieldLabel } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { Spinner } from "@/components/ui/spinner"

type Props = {
  backend: Backend
  onLogin: (profile: Profile) => void
}

export function LoginView({ backend, onLogin }: Props) {
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(false)

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setError("")
    setLoading(true)
    try {
      onLogin(await backend.signIn(email, password))
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex min-h-svh items-center justify-center bg-muted/40 p-4">
      <div className="flex w-full max-w-sm flex-col gap-4">
        <div className="flex items-center justify-center gap-2 text-lg font-semibold">
          <CompassIcon className="text-primary" /> Ops Epic Maker
        </div>
        {backend.kind === "demo" && (
          <Alert>
            <AlertTitle>Demo-Modus (kein Backend konfiguriert)</AlertTitle>
            <AlertDescription>
              Daten werden nur lokal in diesem Browser gespeichert. Anmeldung: {DEMO_LOGIN.email} / {DEMO_LOGIN.password}
            </AlertDescription>
          </Alert>
        )}
        <Card>
          <CardHeader>
            <CardTitle>Anmelden</CardTitle>
            <CardDescription>Mit deinem Team-Konto anmelden, um Epics zu erstellen und zu kommentieren.</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={submit}>
              <FieldGroup>
                <Field data-invalid={!!error || undefined}>
                  <FieldLabel htmlFor="email">E-Mail</FieldLabel>
                  <Input
                    id="email"
                    type="email"
                    autoComplete="username"
                    required
                    value={email}
                    aria-invalid={!!error || undefined}
                    onChange={e => setEmail(e.target.value)}
                  />
                </Field>
                <Field data-invalid={!!error || undefined}>
                  <FieldLabel htmlFor="password">Passwort</FieldLabel>
                  <Input
                    id="password"
                    type="password"
                    autoComplete="current-password"
                    required
                    value={password}
                    aria-invalid={!!error || undefined}
                    onChange={e => setPassword(e.target.value)}
                  />
                  {error && <FieldDescription className="text-destructive">{error}</FieldDescription>}
                </Field>
                <Field>
                  <Button type="submit" disabled={loading}>
                    {loading ? <Spinner data-icon="inline-start" /> : <LogInIcon data-icon="inline-start" />}
                    Anmelden
                  </Button>
                  <FieldDescription>
                    Konten werden von einer Admin-Person angelegt – es gibt keine Selbstregistrierung.
                  </FieldDescription>
                </Field>
              </FieldGroup>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
