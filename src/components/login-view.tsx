// Anmeldung. Ohne Supabase-Konfiguration läuft die App im lokalen Demo-Modus.
import { useState } from "react"
import { CompassIcon, LogInIcon } from "lucide-react"

import { DEMO_LOGIN, type Backend, type Profile } from "@/lib/backend"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Field, FieldDescription, FieldGroup, FieldLabel } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { Spinner } from "@/components/ui/spinner"

type Props = {
  backend: Backend
  onLogin: (profile: Profile) => void
}

export function LoginView({ backend, onLogin }: Props) {
  const [login, setLogin] = useState("")
  const [password, setPassword] = useState("")
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(false)

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setError("")
    setLoading(true)
    try {
      onLogin(await backend.signIn(login, password))
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex min-h-svh items-center justify-center bg-muted p-4">
      <div className="flex w-full max-w-sm flex-col gap-4">
        <div className="flex items-center justify-center gap-2 text-lg font-semibold">
          <CompassIcon className="text-primary" /> Ops Epic Maker
        </div>
        {backend.kind === "demo" && (
          <Alert>
            <AlertTitle>Demo-Modus (kein Backend konfiguriert)</AlertTitle>
            <AlertDescription>
              Daten werden nur lokal in diesem Browser gespeichert. Anmeldung: {DEMO_LOGIN.username} / {DEMO_LOGIN.password}
            </AlertDescription>
          </Alert>
        )}
        <Card>
          <CardHeader>
            <CardTitle>Anmelden</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={submit}>
              <FieldGroup>
                <Field data-invalid={!!error || undefined}>
                  <FieldLabel htmlFor="login">Benutzername</FieldLabel>
                  <Input
                    id="login"
                    autoComplete="username"
                    required
                    value={login}
                    aria-invalid={!!error || undefined}
                    onChange={e => setLogin(e.target.value)}
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
                </Field>
              </FieldGroup>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
