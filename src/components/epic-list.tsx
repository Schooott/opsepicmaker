// Übersicht aller gespeicherten Epics des Teams.
import { useCallback, useEffect, useMemo, useState } from "react"
import {
  ActionIcon, Badge, Button, Card, Group, Indicator, Menu, RingProgress, Select, Skeleton, Stack, Table, Text, TextInput, ThemeIcon, Title, Tooltip,
} from "@mantine/core"
import { modals } from "@mantine/modals"
import {
  ChevronDownIcon, ChevronsUpDownIcon, ChevronUpIcon, CircleCheckIcon, EllipsisVerticalIcon, FilePlus2Icon,
  MessageSquareIcon, PencilIcon, SearchIcon, TargetIcon, Trash2Icon, XIcon,
} from "lucide-react"

import type { Backend, EpicMeta, Profile } from "@/lib/backend"
import { toast } from "@/lib/notify"
import { UserAvatar } from "@/components/user-avatar"

function formatTime(iso: string): string {
  return new Date(iso).toLocaleString("de-DE", { dateStyle: "medium", timeStyle: "short" })
}

type SortField = "title" | "okr" | "status" | "progress" | "creator" | "updated"
type SortDir = "asc" | "desc"

function SortableTh({ label, field, sortBy, sortDir, onSort }: {
  label: string
  field: SortField
  sortBy: SortField
  sortDir: SortDir
  onSort: (field: SortField) => void
}) {
  const active = sortBy === field
  return (
    <Table.Th
      onClick={() => onSort(field)}
      style={{ cursor: "pointer", userSelect: "none" }}
      aria-sort={active ? (sortDir === "asc" ? "ascending" : "descending") : undefined}
    >
      <Group gap={4} wrap="nowrap">
        {label}
        {active
          ? sortDir === "asc" ? <ChevronUpIcon size={13} /> : <ChevronDownIcon size={13} />
          : <ChevronsUpDownIcon size={13} style={{ opacity: 0.4 }} />}
      </Group>
    </Table.Th>
  )
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
  const [query, setQuery] = useState("")
  const [statusFilter, setStatusFilter] = useState<string | null>(null)
  const [okrFilter, setOkrFilter] = useState<string | null>(null)
  const [authorFilter, setAuthorFilter] = useState<string | null>(null)
  const [sortBy, setSortBy] = useState<SortField>("updated")
  const [sortDir, setSortDir] = useState<SortDir>("desc")

  function toggleSort(field: SortField) {
    if (sortBy === field) {
      setSortDir(d => (d === "asc" ? "desc" : "asc"))
    } else {
      setSortBy(field)
      setSortDir(field === "updated" || field === "progress" ? "desc" : "asc")
    }
  }

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

  const authorOptions = useMemo(() => {
    const seen = new Map<string, string>()
    for (const e of epics ?? []) seen.set(e.created_by, e.creator_name)
    return [...seen.entries()].map(([value, label]) => ({ value, label })).sort((a, b) => a.label.localeCompare(b.label, "de"))
  }, [epics])

  const okrOptions = useMemo(
    () => [
      { value: "none", label: "Ohne OKR" },
      ...Object.entries(okrNames).map(([value, label]) => ({ value, label })).sort((a, b) => a.label.localeCompare(b.label, "de")),
    ],
    [okrNames],
  )

  const shown = useMemo(() => {
    if (!epics) return null
    const q = query.trim().toLowerCase()
    const filtered = epics.filter(e => {
      if (statusFilter && e.status !== statusFilter) return false
      if (okrFilter === "none" && e.okr_id) return false
      if (okrFilter && okrFilter !== "none" && e.okr_id !== okrFilter) return false
      if (authorFilter && e.created_by !== authorFilter) return false
      if (!q) return true
      const okr = e.okr_id ? okrNames[e.okr_id] ?? "" : ""
      return `${e.title} ${e.creator_name} ${okr}`.toLowerCase().includes(q)
    })
    const dir = sortDir === "asc" ? 1 : -1
    const key = (e: EpicMeta): string | number => {
      switch (sortBy) {
        case "title": return e.title.toLowerCase()
        case "okr": return (e.okr_id ? okrNames[e.okr_id] ?? "" : "").toLowerCase()
        case "status": return e.status
        case "progress": return e.progress
        case "creator": return e.creator_name.toLowerCase()
        case "updated": return e.updated_at
      }
    }
    return [...filtered].sort((a, b) => {
      const ka = key(a)
      const kb = key(b)
      if (ka < kb) return -1 * dir
      if (ka > kb) return 1 * dir
      return 0
    })
  }, [epics, query, statusFilter, okrFilter, authorFilter, sortBy, sortDir, okrNames])

  const hasActiveFilter = query.trim() !== "" || statusFilter !== null || okrFilter !== null || authorFilter !== null

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
        {epics !== null && epics.length > 0 && (
          <Group gap="sm" mb="md" wrap="wrap">
            <TextInput
              placeholder="Suchen (Titel, OKR, Autor:in) …"
              leftSection={<SearchIcon size={15} />}
              value={query}
              onChange={e => setQuery(e.currentTarget.value)}
              w={280}
              rightSection={
                query ? (
                  <ActionIcon size="sm" variant="subtle" color="gray" aria-label="Suche leeren" onClick={() => setQuery("")}>
                    <XIcon size={13} />
                  </ActionIcon>
                ) : undefined
              }
            />
            <Select
              placeholder="Status"
              data={[{ value: "entwurf", label: "Entwurf" }, { value: "abgeschlossen", label: "Abgeschlossen" }]}
              value={statusFilter}
              onChange={setStatusFilter}
              clearable
              w={160}
            />
            <Select placeholder="OKR" data={okrOptions} value={okrFilter} onChange={setOkrFilter} clearable searchable w={240} />
            <Select placeholder="Autor:in" data={authorOptions} value={authorFilter} onChange={setAuthorFilter} clearable w={170} />
            {hasActiveFilter && (
              <Button
                variant="subtle"
                color="gray"
                size="compact-sm"
                onClick={() => {
                  setQuery("")
                  setStatusFilter(null)
                  setOkrFilter(null)
                  setAuthorFilter(null)
                }}
              >
                Zurücksetzen
              </Button>
            )}
          </Group>
        )}
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
                <SortableTh label="Titel" field="title" sortBy={sortBy} sortDir={sortDir} onSort={toggleSort} />
                <SortableTh label="OKR" field="okr" sortBy={sortBy} sortDir={sortDir} onSort={toggleSort} />
                <SortableTh label="Status" field="status" sortBy={sortBy} sortDir={sortDir} onSort={toggleSort} />
                <SortableTh label="Ausgefüllt" field="progress" sortBy={sortBy} sortDir={sortDir} onSort={toggleSort} />
                <SortableTh label="Autor:in" field="creator" sortBy={sortBy} sortDir={sortDir} onSort={toggleSort} />
                <SortableTh label="Aktualisiert" field="updated" sortBy={sortBy} sortDir={sortDir} onSort={toggleSort} />
                <Table.Th ta="center" aria-label="Kommentare" />
                <Table.Th ta="right" aria-label="Aktionen" />
              </Table.Tr>
            </Table.Thead>
            <Table.Tbody>
              {shown!.length === 0 && (
                <Table.Tr>
                  <Table.Td colSpan={8}>
                    <Text size="sm" c="dimmed" ta="center" py="md">Keine Epics passen zu Suche/Filtern.</Text>
                  </Table.Td>
                </Table.Tr>
              )}
              {shown!.map(e => {
                const canDelete = e.created_by === profile.id || profile.role === "admin"
                return (
                  <Table.Tr key={e.id} style={{ cursor: "pointer" }} onClick={() => onOpen(e.id)}>
                    <Table.Td maw={460}>
                      <Text size="sm" fw={600} truncate>{e.title}</Text>
                    </Table.Td>
                    <Table.Td maw={240}>
                      {e.okr_id && okrNames[e.okr_id] ? (
                        <Tooltip label={`Zahlt ein auf: ${okrNames[e.okr_id]}`}>
                          <Badge variant="light" color="grape" size="sm" leftSection={<TargetIcon size={10} />} maw={230}>
                            {okrNames[e.okr_id]}
                          </Badge>
                        </Tooltip>
                      ) : (
                        <Text size="sm" c="dimmed">–</Text>
                      )}
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
                          <Indicator inline label={unread[e.id]} size={16} color="red" offset={2}>
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
                    <Table.Td onClick={ev => ev.stopPropagation()} w={48}>
                      <Group justify="flex-end">
                        <Menu position="bottom-end" withinPortal>
                          <Menu.Target>
                            <ActionIcon variant="subtle" color="gray" aria-label="Aktionen">
                              <EllipsisVerticalIcon size={16} />
                            </ActionIcon>
                          </Menu.Target>
                          <Menu.Dropdown>
                            <Menu.Item leftSection={<PencilIcon size={14} />} onClick={() => onOpen(e.id)}>
                              Bearbeiten
                            </Menu.Item>
                            {canDelete && (
                              <Menu.Item color="red" leftSection={<Trash2Icon size={14} />} onClick={() => confirmDelete(e)}>
                                Löschen
                              </Menu.Item>
                            )}
                          </Menu.Dropdown>
                        </Menu>
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
