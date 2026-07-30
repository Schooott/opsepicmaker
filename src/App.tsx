// App-Shell: Auth-Zustand, Navigation zwischen Übersicht, Wizard und
// Nutzerverwaltung.
import { useEffect, useMemo, useState } from "react"
import { AppShell, Avatar, Badge, Button, Center, Container, Group, Loader, Text, UnstyledButton } from "@mantine/core"
import { CompassIcon, LogOutIcon } from "lucide-react"

import { createBackend, type EpicRecord, type Profile } from "@/lib/backend"
import { toast } from "@/lib/notify"
import { AdminView } from "@/components/admin-view"
import { EpicList } from "@/components/epic-list"
import { LoginView } from "@/components/login-view"
import { Wizard } from "@/components/wizard/wizard"

type View = { name: "list" } | { name: "admin" } | { name: "wizard"; epic: EpicRecord | null }

export function App() {
  const backend = useMemo(() => createBackend(), [])
  const [booting, setBooting] = useState(true)
  const [profile, setProfile] = useState<Profile | null>(null)
  const [view, setView] = useState<View>({ name: "list" })

  useEffect(() => {
    backend
      .restoreSession()
      .then(p => setProfile(p?.approved ? p : null))
      .catch(() => setProfile(null))
      .finally(() => setBooting(false))
  }, [backend])

  async function openEpic(id: string) {
    try {
      const epic = await backend.getEpic(id)
      setView({ name: "wizard", epic })
    } catch (e) {
      toast.error("Öffnen fehlgeschlagen: " + (e instanceof Error ? e.message : String(e)))
    }
  }

  async function logout() {
    await backend.signOut()
    setProfile(null)
    setView({ name: "list" })
  }

  if (booting) {
    return (
      <Center mih="100svh">
        <Loader />
      </Center>
    )
  }

  if (!profile) {
    return <LoginView backend={backend} onLogin={setProfile} />
  }

  const initials =
    profile.display_name.split(/\s+/).map(p => p[0]).filter(Boolean).slice(0, 2).join("").toUpperCase() || "?"

  return (
    <AppShell header={{ height: 56 }} padding={0}>
      <AppShell.Header>
        <Container size="xl" h="100%">
          <Group h="100%" gap="lg">
            <UnstyledButton onClick={() => setView({ name: "list" })}>
              <Group gap={8}>
                <CompassIcon size={20} color="var(--mantine-color-indigo-7)" />
                <Text fw={700}>Ops Epic Maker</Text>
              </Group>
            </UnstyledButton>
            <Group gap={4}>
              <Button
                variant={view.name === "list" ? "light" : "subtle"}
                color={view.name === "list" ? "indigo" : "gray"}
                size="xs"
                onClick={() => setView({ name: "list" })}
              >
                Epics
              </Button>
              {profile.role === "admin" && (
                <Button
                  variant={view.name === "admin" ? "light" : "subtle"}
                  color={view.name === "admin" ? "indigo" : "gray"}
                  size="xs"
                  onClick={() => setView({ name: "admin" })}
                >
                  Admin
                </Button>
              )}
            </Group>
            <Group gap="sm" ml="auto">
              {backend.kind === "demo" && (
                <Badge variant="outline" color="yellow">Demo</Badge>
              )}
              <Group gap={8} title={profile.role === "admin" ? "Admin" : "Mitglied"}>
                <Avatar size={26} radius="xl" color="indigo">{initials}</Avatar>
                <Text size="sm">{profile.display_name}</Text>
              </Group>
              <Button variant="subtle" color="gray" size="xs" leftSection={<LogOutIcon size={15} />} onClick={logout}>
                Abmelden
              </Button>
            </Group>
          </Group>
        </Container>
      </AppShell.Header>
      <AppShell.Main>
        <Container size={view.name === "wizard" ? "xl" : "md"} py="lg">
          {view.name === "list" && (
            <EpicList
              backend={backend}
              profile={profile}
              onOpen={openEpic}
              onNew={() => setView({ name: "wizard", epic: null })}
            />
          )}
          {view.name === "admin" && profile.role === "admin" && <AdminView backend={backend} profile={profile} />}
          {view.name === "wizard" && (
            <Wizard
              key={view.epic?.id ?? "new"}
              backend={backend}
              profile={profile}
              epic={view.epic}
              onBack={() => setView({ name: "list" })}
            />
          )}
        </Container>
      </AppShell.Main>
    </AppShell>
  )
}

export default App
