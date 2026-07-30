// Bereichsbezogene Kommentar-Seitenleiste: schiebt sich rechts neben den
// Inhalt (kein Overlay). Unterstützt Antworten (eine Ebene, eingerückt) sowie
// Bearbeiten und Löschen eigener Kommentare.
import { useEffect, useState } from "react"
import {
  ActionIcon, Avatar, Box, Button, Card, Divider, Group, Loader, ScrollArea, Stack, Text, Textarea, ThemeIcon, Title,
} from "@mantine/core"
import { CheckIcon, CornerDownRightIcon, MessageSquareIcon, PencilIcon, SendIcon, Trash2Icon, XIcon } from "lucide-react"

import type { CommentRec, Profile } from "@/lib/backend"
import type { PanelDef } from "@/lib/fields"

function initials(name: string): string {
  return name.split(/\s+/).map(p => p[0]).filter(Boolean).slice(0, 2).join("").toUpperCase() || "?"
}

function formatTime(iso: string): string {
  return new Date(iso).toLocaleString("de-DE", { dateStyle: "short", timeStyle: "short" })
}

type Props = {
  panel: PanelDef
  comments: CommentRec[]
  loading: boolean
  profile: Profile
  onClose: () => void
  onAdd: (body: string, parentId: string | null) => Promise<void>
  onUpdate: (id: string, body: string) => Promise<void>
  onDelete: (id: string) => Promise<void>
}

function CommentItem({
  comment, profile, isReply, onReply, onUpdate, onDelete,
}: {
  comment: CommentRec
  profile: Profile
  isReply: boolean
  onReply?: () => void
  onUpdate: (id: string, body: string) => Promise<void>
  onDelete: (id: string) => Promise<void>
}) {
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(comment.body)
  const [busy, setBusy] = useState(false)
  const own = comment.author === profile.id
  const canDelete = own || profile.role === "admin"

  async function saveEdit() {
    if (!draft.trim()) return
    setBusy(true)
    try {
      await onUpdate(comment.id, draft.trim())
      setEditing(false)
    } finally {
      setBusy(false)
    }
  }

  return (
    <Box ml={isReply ? 28 : 0} pl={isReply ? 10 : 0} style={isReply ? { borderLeft: "2px solid var(--mantine-color-gray-3)" } : undefined}>
      <Group gap={10} align="flex-start" wrap="nowrap">
        <Avatar size={24} radius="xl" color="indigo">{initials(comment.author_name)}</Avatar>
        <Stack gap={4} style={{ flex: 1, minWidth: 0 }}>
          <Group gap={8} wrap="wrap">
            <Text size="sm" fw={600}>{comment.author_name}</Text>
            <Text size="xs" c="dimmed">
              {formatTime(comment.created_at)}
              {comment.updated_at ? " · bearbeitet" : ""}
            </Text>
          </Group>
          {editing ? (
            <Stack gap={6}>
              <Textarea autosize minRows={2} value={draft} disabled={busy} onChange={e => setDraft(e.currentTarget.value)} />
              <Group gap={6}>
                <Button size="compact-xs" loading={busy} leftSection={<CheckIcon size={12} />} onClick={saveEdit} disabled={!draft.trim()}>
                  Speichern
                </Button>
                <Button size="compact-xs" variant="subtle" color="gray" disabled={busy} onClick={() => { setEditing(false); setDraft(comment.body) }}>
                  Abbrechen
                </Button>
              </Group>
            </Stack>
          ) : (
            <Text size="sm" style={{ whiteSpace: "pre-wrap" }}>{comment.body}</Text>
          )}
          {!editing && (
            <Group gap={2}>
              {onReply && (
                <Button size="compact-xs" variant="subtle" color="gray" leftSection={<CornerDownRightIcon size={12} />} onClick={onReply}>
                  Antworten
                </Button>
              )}
              {own && (
                <ActionIcon size="sm" variant="subtle" color="gray" aria-label="Kommentar bearbeiten" onClick={() => setEditing(true)}>
                  <PencilIcon size={13} />
                </ActionIcon>
              )}
              {canDelete && (
                <ActionIcon size="sm" variant="subtle" color="gray" aria-label="Kommentar löschen" onClick={() => onDelete(comment.id)}>
                  <Trash2Icon size={13} />
                </ActionIcon>
              )}
            </Group>
          )}
        </Stack>
      </Group>
    </Box>
  )
}

export function CommentsPanel({ panel, comments, loading, profile, onClose, onAdd, onUpdate, onDelete }: Props) {
  const [body, setBody] = useState("")
  const [replyTo, setReplyTo] = useState<CommentRec | null>(null)
  const [sending, setSending] = useState(false)

  // Beim Bereichswechsel Antwort-Kontext zurücksetzen
  useEffect(() => {
    setReplyTo(null)
  }, [panel.id])

  const topLevel = comments.filter(c => !c.parent_id)
  const repliesOf = (id: string) => comments.filter(c => c.parent_id === id)

  async function send() {
    if (!body.trim()) return
    setSending(true)
    try {
      await onAdd(body.trim(), replyTo?.id ?? null)
      setBody("")
      setReplyTo(null)
    } finally {
      setSending(false)
    }
  }

  return (
    <Card withBorder radius="md" p="md">
      <Stack gap="sm">
        <Group justify="space-between" align="flex-start" wrap="nowrap">
          <Stack gap={0} style={{ minWidth: 0 }}>
            <Group gap={6}>
              <MessageSquareIcon size={16} color="var(--mantine-color-dimmed)" />
              <Title order={5}>Kommentare</Title>
            </Group>
            <Text size="xs" c="dimmed" truncate>{panel.title}</Text>
          </Stack>
          <ActionIcon variant="subtle" color="gray" aria-label="Kommentare schließen" onClick={onClose}>
            <XIcon size={16} />
          </ActionIcon>
        </Group>
        <ScrollArea.Autosize mah="calc(100svh - 24rem)" type="auto">
          {loading ? (
            <Group justify="center" py="lg"><Loader size="sm" /></Group>
          ) : topLevel.length === 0 ? (
            <Stack align="center" gap={6} py="lg">
              <ThemeIcon variant="light" color="gray" size="lg" radius="xl">
                <MessageSquareIcon size={16} />
              </ThemeIcon>
              <Text size="sm" fw={600}>Noch keine Kommentare</Text>
              <Text size="xs" c="dimmed">Hinterlasse den ersten Kommentar zu diesem Bereich.</Text>
            </Stack>
          ) : (
            <Stack gap="md" py={4}>
              {topLevel.map(c => (
                <Stack key={c.id} gap="sm">
                  <CommentItem
                    comment={c}
                    profile={profile}
                    isReply={false}
                    onReply={() => setReplyTo(c)}
                    onUpdate={onUpdate}
                    onDelete={onDelete}
                  />
                  {repliesOf(c.id).map(r => (
                    <CommentItem key={r.id} comment={r} profile={profile} isReply onUpdate={onUpdate} onDelete={onDelete} />
                  ))}
                </Stack>
              ))}
            </Stack>
          )}
        </ScrollArea.Autosize>
        <Divider />
        <Stack gap={6}>
          {replyTo && (
            <Group gap={6} wrap="nowrap" bg="gray.1" px={10} py={6} style={{ borderRadius: "var(--mantine-radius-md)" }}>
              <CornerDownRightIcon size={13} color="var(--mantine-color-dimmed)" />
              <Text size="xs" c="dimmed" truncate style={{ flex: 1 }}>
                Antwort auf {replyTo.author_name}: „{replyTo.body}“
              </Text>
              <ActionIcon size="xs" variant="subtle" color="gray" aria-label="Antwort verwerfen" onClick={() => setReplyTo(null)}>
                <XIcon size={12} />
              </ActionIcon>
            </Group>
          )}
          <Textarea
            placeholder={replyTo ? "Antwort schreiben …" : "Kommentar schreiben …"}
            autosize
            minRows={2}
            value={body}
            onChange={e => setBody(e.currentTarget.value)}
            onKeyDown={e => {
              if ((e.metaKey || e.ctrlKey) && e.key === "Enter") send()
            }}
          />
          <Group justify="flex-end">
            <Button size="xs" loading={sending} leftSection={<SendIcon size={13} />} onClick={send} disabled={!body.trim()}>
              {replyTo ? "Antworten" : "Senden"}
            </Button>
          </Group>
        </Stack>
      </Stack>
    </Card>
  )
}
