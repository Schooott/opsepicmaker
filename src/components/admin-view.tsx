// Admin-Bereich: Nutzerverwaltung und zentrale KI-Einstellungen.
// Wird nur für Admins gerendert (Guard in App.tsx).
import { useEffect, useState } from "react"
import { Card, Group, Radio, SimpleGrid, Skeleton, Stack, Tabs, Text, ThemeIcon, Title } from "@mantine/core"
import { FileTextIcon, PercentIcon, SparklesIcon } from "lucide-react"

import { AI_MODELS } from "@/lib/ai"
import type { AdminStats, Backend, Profile } from "@/lib/backend"
import { toast } from "@/lib/notify"
import { UsersView } from "@/components/users-view"

function StatCard({ icon, label, value, detail }: { icon: React.ReactNode; label: string; value: string; detail: string }) {
  return (
    <Card withBorder radius="md" p="lg">
      <Group gap="md" wrap="nowrap" align="flex-start">
        <ThemeIcon variant="light" size="xl" radius="md">
          {icon}
        </ThemeIcon>
        <Stack gap={2}>
          <Text size="xs" c="dimmed" tt="uppercase" fw={600}>{label}</Text>
          <Text fz={26} fw={700} lh={1.1}>{value}</Text>
          <Text size="xs" c="dimmed">{detail}</Text>
        </Stack>
      </Group>
    </Card>
  )
}

function StatsCards({ backend }: { backend: Backend }) {
  const [stats, setStats] = useState<AdminStats | null>(null)

  useEffect(() => {
    const load = () =>
      backend
        .getAdminStats()
        .then(setStats)
        .catch(e => toast.error("Statistik laden fehlgeschlagen: " + (e instanceof Error ? e.message : String(e))))
    load()
    // Live-Updates: Statistik folgt Epic- und KI-Aktivität ohne Neuladen
    return backend.subscribeChanges(["epics", "ai_requests"], load)
  }, [backend])

  if (stats === null) {
    return (
      <SimpleGrid cols={{ base: 1, sm: 3 }}>
        <Skeleton h={110} radius="md" />
        <Skeleton h={110} radius="md" />
        <Skeleton h={110} radius="md" />
      </SimpleGrid>
    )
  }

  return (
    <SimpleGrid cols={{ base: 1, sm: 3 }}>
      <StatCard
        icon={<SparklesIcon size={22} />}
        label="KI-Anfragen"
        value={String(stats.aiRequestsMonth)}
        detail={`diesen Monat · ${stats.aiRequestsYear} dieses Jahr`}
      />
      <StatCard
        icon={<FileTextIcon size={22} />}
        label="Epics erstellt"
        value={String(stats.epicsMonth)}
        detail={`diesen Monat · ${stats.epicsYear} dieses Jahr · ${stats.epicsTotal} gesamt`}
      />
      <StatCard
        icon={<PercentIcon size={22} />}
        label="KI-Anteil"
        value={`${stats.aiFieldShare} %`}
        detail="der befüllten Felder stammen unverändert von der KI"
      />
    </SimpleGrid>
  )
}

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
    <Stack gap="lg">
      <StatsCards backend={backend} />
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
    </Stack>
  )
}
