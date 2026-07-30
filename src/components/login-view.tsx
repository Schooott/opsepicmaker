// Anmeldung. Ohne Supabase-Konfiguration läuft die App im lokalen Demo-Modus.
import { useState } from "react"
import { Alert, Button, Card, Center, Group, PasswordInput, Stack, Text, TextInput, Title } from "@mantine/core"
import { LayersIcon, LogInIcon } from "lucide-react"

import { DEMO_LOGIN, type Backend, type Profile } from "@/lib/backend"

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
    <Center mih="100svh" p="md">
      <Stack w={380} gap="md">
        <Group justify="center" gap="xs">
          <LayersIcon size={22} color="var(--mantine-color-indigo-7)" />
          <Title order={3}>Ops Epic Maker</Title>
        </Group>
        {backend.kind === "demo" && (
          <Alert color="yellow" title="Demo-Modus (kein Backend konfiguriert)">
            <Text size="sm">
              Daten werden nur lokal in diesem Browser gespeichert. Anmeldung: {DEMO_LOGIN.username} / {DEMO_LOGIN.password}
            </Text>
          </Alert>
        )}
        <Card withBorder radius="md" p="lg">
          <form onSubmit={submit}>
            <Stack gap="md">
              <Title order={4}>Anmelden</Title>
              <TextInput
                label="Benutzername"
                autoComplete="username"
                required
                value={login}
                error={!!error}
                onChange={e => setLogin(e.currentTarget.value)}
              />
              <PasswordInput
                label="Passwort"
                autoComplete="current-password"
                required
                value={password}
                error={error || undefined}
                onChange={e => setPassword(e.currentTarget.value)}
              />
              <Button type="submit" loading={loading} leftSection={<LogInIcon size={16} />}>
                Anmelden
              </Button>
            </Stack>
          </form>
        </Card>
      </Stack>
    </Center>
  )
}
