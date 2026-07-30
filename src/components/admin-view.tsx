// Admin-Bereich: Nutzerverwaltung und zentrale KI-Einstellungen.
// Wird nur für Admins gerendert (Guard in App.tsx).
import { useEffect, useState } from "react"
import { Card, Radio, Skeleton, Stack, Tabs, Text, Title } from "@mantine/core"

import { AI_MODELS } from "@/lib/ai"
import type { Backend, Profile } from "@/lib/backend"
import { toast } from "@/lib/notify"
import { UsersView } from "@/components/users-view"

function AiSettings({ backend }: { backend: Backend }) {
  const [model, setModel] = useState<string | null>(null)

  useEffect(() => {
    backend
      .getAiModel()
      .then(setModel)
      .catch(e => {
        toast.error("Laden fehlgeschlagen: " + (e instanceof Error ? e.message : String(e)))
        setModel(AI_MODELS[0].value)
      })
  }, [backend])

  async function change(next: string) {
    const previous = model
    setModel(next)
    try {
      await backend.setAiModel(next)
      toast.success("KI-Modell gespeichert")
    } catch (e) {
      setModel(previous)
      toast.error("Speichern fehlgeschlagen: " + (e instanceof Error ? e.message : String(e)))
    }
  }

  return (
    <Card withBorder radius="md" p="lg">
      <Stack gap="md">
        <Stack gap={2}>
          <Title order={4}>KI-Einstellungen</Title>
          <Text size="sm" c="dimmed">
            Gilt für das gesamte Team: Mit diesem Modell befüllt der Wizard die Epic-Felder vor.
          </Text>
        </Stack>
        {model === null ? (
          <Skeleton h={36} maw={420} />
        ) : (
          <Radio.Group
            label="KI-Modell"
            description="Haiku kostet etwa 1–2 Cent pro Epic-Vorbefüllung, Sonnet etwa das Dreifache bei höherer Qualität. Änderungen werden sofort gespeichert."
            value={model}
            onChange={change}
          >
            <Stack gap="xs" mt="xs">
              {AI_MODELS.map(m => (
                <Radio key={m.value} value={m.value} label={m.label} />
              ))}
            </Stack>
          </Radio.Group>
        )}
      </Stack>
    </Card>
  )
}

type Props = {
  backend: Backend
  profile: Profile
}

export function AdminView({ backend, profile }: Props) {
  return (
    <Tabs defaultValue="users">
      <Tabs.List>
        <Tabs.Tab value="users">Nutzer</Tabs.Tab>
        <Tabs.Tab value="ai">KI-Einstellungen</Tabs.Tab>
      </Tabs.List>
      <Tabs.Panel value="users" pt="md">
        <UsersView backend={backend} profile={profile} />
      </Tabs.Panel>
      <Tabs.Panel value="ai" pt="md">
        <AiSettings backend={backend} />
      </Tabs.Panel>
    </Tabs>
  )
}
