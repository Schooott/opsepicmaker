// Übersicht aller gespeicherten Epics des Teams.
import { useCallback, useEffect, useState } from "react"
import {
  ActionIcon, Badge, Button, Card, Group, Indicator, RingProgress, Skeleton, Stack, Table, Text, ThemeIcon, Title, Tooltip,
} from "@mantine/core"
import { modals } from "@mantine/modals"
import { CircleCheckIcon, FilePlus2Icon, MessageSquareIcon, PencilIcon, TargetIcon, Trash2Icon } from "lucide-react"

import type { Backend, EpicMeta, Profile } from "@/lib/backend"
import { toast } from "@/lib/notify"
import { UserAvatar } from "@/components/user-avatar"

function formatTime(iso: string): string {
  return new Date(iso).toLocaleString("de-DE", { dateStyle: "medium", timeStyle: "short" })
}

type Props = {
  backend: Backend
  profile: Profile
  onOpen: (id: string) => void
  onNew: () => void
}

export function EpicList({ backend, profile, onOpen, onNew }: Props) {
  const [epics, setEpics] = useState<EpicMeta[] | null>(null)
  const [unread, setUnread] = useState<Record<string, number>>({})
  const [okrNames, setOkrNames] = useState<Record<string, string>>({})

  const load = useCallback(async () => {
    try {
      const [list, unreadCounts, okrs] = await Promise.all([
        backend.listEpics(),
        backend.getUnreadCommentCounts(),
        backend.listOkrs(),
      ])
      setEpics(list)
      setUnread(unreadCounts)
      setOkrNames(Object.fromEntries(okrs.map(o => [o.id, o.objective])))
    } catch (e) {
      toast.error("Laden fehlgeschlagen: " + (e instanceof Error ? e.message : String(e)))
      setEpics([])
    }
  }, [backend])

  useEffect(() => {
    load()
  }, [load])

  // Live-Updates: Liste neu laden, wenn andere Epics/Kommentare/Profile ändern
  useEffect(() => backend.subscribeChanges(["epics", "comments", "profiles"], () => load()), [backend, load])

  function confirmDelete(epic: EpicMeta) {
    modals.openConfirmModal({
      title: "Epic löschen?",
      children: (
        <Text size="sm">
          „{epic.title}“ wird mitsamt allen Kommentaren dauerhaft gelöscht. Das kann nicht rückgängig gemacht werden.
        </Text>
      ),
      labels: { confirm: "Löschen", cancel: "Abbrechen" },
      confirmProps: { color: "red" },
      onConfirm: async () => {
        try {
          await backend.deleteEpic(epic.id)
          toast.success("Epic gelöscht")
          load()
        } catch (e) {
          toast.error("Löschen fehlgeschlagen: " + (e instanceof Error ? e.message : String(e)))
        }
      },
    })
  }

  return (
    <Stack gap="lg">
      <Group justify="space-between" align="flex-start">
        <Stack gap={2}>
          <Title order={4}>Epics</Title>
          <Text size="sm" c="dimmed">Gespeicherte Entwürfe des Teams – öffnen, weiterbearbeiten, kommentieren.</Text>
        </Stack>
        <Button leftSection={<FilePlus2Icon size={16} />} onClick={onNew}>
          Neues Epic
        </Button>
      </Group>

      <Card withBorder radius="md" p="lg">
        {epics === null ? (
          <Stack gap="xs">
            <Skeleton h={36} />
            <Skeleton h={36} />
            <Skeleton h={36} />
          </Stack>
        ) : epics.length === 0 ? (
          <Stack align="center" gap="sm" py="xl">
            <ThemeIcon variant="light" size="xl" radius="xl">
              <FilePlus2Icon size={22} />
            </ThemeIcon>
            <Text fw={600}>Noch keine Epics</Text>
            <Text size="sm" c="dimmed">Lege das erste Epic an – die KI hilft beim Vorbefüllen.</Text>
            <Button leftSection={<FilePlus2Icon size={16} />} onClick={onNew}>
              Neues Epic
            </Button>
          </Stack>
        ) : (
          <Table highlightOnHover verticalSpacing="sm">
            <Table.Thead>
              <Table.Tr>
                <Table.Th>Titel</Table.Th>
                <Table.Th>Status</Table.Th>
                <Table.Th>Ausgefüllt</Table.Th>
                <Table.Th>Autor:in</Table.Th>
                <Table.Th>Aktualisiert</Table.Th>
                <Table.Th ta="center">Kommentare</Table.Th>
                <Table.Th ta="right">Aktionen</Table.Th>
              </Table.Tr>
            </Table.Thead>
            <Table.Tbody>
              {epics.map(e => {
                const canDelete = e.created_by === profile.id || profile.role === "admin"
                return (
                  <Table.Tr key={e.id} style={{ cursor: "pointer" }} onClick={() => onOpen(e.id)}>
                    <Table.Td maw={280}>
                      <Stack gap={2}>
                        <Text size="sm" fw={600} truncate>{e.title}</Text>
                        {e.okr_id && okrNames[e.okr_id] && (
                          <Tooltip label={`Zahlt ein auf: ${okrNames[e.okr_id]}`}>
                            <Badge variant="light" color="grape" size="sm" leftSection={<TargetIcon size={10} />} maw={190}>
                              {okrNames[e.okr_id]}
                            </Badge>
                          </Tooltip>
                        )}
                      </Stack>
                    </Table.Td>
                    <Table.Td>
                      <Badge
                        variant={e.status === "abgeschlossen" ? "light" : "outline"}
                        color={e.status === "abgeschlossen" ? "teal" : "gray"}
                        leftSection={e.status === "abgeschlossen" ? <CircleCheckIcon size={11} /> : undefined}
                      >
                        {e.status === "abgeschlossen" ? "Abgeschlossen" : "Entwurf"}
                      </Badge>
                    </Table.Td>
                    <Table.Td>
                      <Group gap={6} wrap="nowrap">
                        <RingProgress
                          size={28}
                          thickness={4}
                          roundCaps
                          sections={[{ value: e.progress, color: e.progress === 100 ? "teal" : "indigo" }]}
                        />
                        <Text size="sm" c="dimmed" w={38}>{e.progress} %</Text>
                      </Group>
                    </Table.Td>
                    <Table.Td>
                      <Group gap={8} wrap="nowrap">
                        <UserAvatar name={e.creator_name} src={e.creator_avatar} size={22} />
                        <Text size="sm">{e.creator_name}</Text>
                      </Group>
                    </Table.Td>
                    <Table.Td c="dimmed">{formatTime(e.updated_at)}</Table.Td>
                    <Table.Td ta="center">
                      {(unread[e.id] ?? 0) > 0 ? (
                        <Tooltip label={`${unread[e.id]} neue Kommentare seit deinem letzten Besuch`}>
                          <Indicator label={unread[e.id]} size={16} color="red" offset={2}>
                            <Badge variant="light" color="indigo" leftSection={<MessageSquareIcon size={12} />}>
                              {e.comment_count}
                            </Badge>
                          </Indicator>
                        </Tooltip>
                      ) : (
                        <Badge variant="outline" color="gray" leftSection={<MessageSquareIcon size={12} />}>
                          {e.comment_count}
                        </Badge>
                      )}
                    </Table.Td>
                    <Table.Td onClick={ev => ev.stopPropagation()}>
                      <Group justify="flex-end" gap={4}>
                        <ActionIcon variant="subtle" color="gray" aria-label="Bearbeiten" onClick={() => onOpen(e.id)}>
                          <PencilIcon size={16} />
                        </ActionIcon>
                        {canDelete && (
                          <ActionIcon variant="subtle" color="red" aria-label="Löschen" onClick={() => confirmDelete(e)}>
                            <Trash2Icon size={16} />
                          </ActionIcon>
                        )}
                      </Group>
                    </Table.Td>
                  </Table.Tr>
                )
              })}
            </Table.Tbody>
          </Table>
        )}
      </Card>
    </Stack>
  )
}
