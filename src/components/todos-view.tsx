// Lose Themen-/Todo-Liste: Themen schnell per Enter erfassen, im Termin
// besprechen, abhaken oder nachträglich korrigieren.
import { useCallback, useEffect, useRef, useState } from "react"
import {
  ActionIcon, Card, Checkbox, Group, Skeleton, Stack, Text, TextInput, ThemeIcon, Title, Tooltip,
} from "@mantine/core"
import { modals } from "@mantine/modals"
import { CheckIcon, ListTodoIcon, PencilIcon, PlusIcon, Trash2Icon, XIcon } from "lucide-react"

import type { Backend, Profile, Todo } from "@/lib/backend"
import { toast } from "@/lib/notify"
import { UserAvatar } from "@/components/user-avatar"

function TodoRow({ todo, canDelete, onToggle, onRename, onDelete }: {
  todo: Todo
  canDelete: boolean
  onToggle: (todo: Todo) => void
  onRename: (todo: Todo, text: string) => Promise<void>
  onDelete: (todo: Todo) => void
}) {
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(todo.text)
  const [busy, setBusy] = useState(false)

  async function commit() {
    const text = draft.trim()
    if (!text || text === todo.text) {
      setEditing(false)
      setDraft(todo.text)
      return
    }
    setBusy(true)
    try {
      await onRename(todo, text)
      setEditing(false)
    } finally {
      setBusy(false)
    }
  }

  return (
    <Group gap="sm" wrap="nowrap" py={6}>
      <Checkbox
        checked={todo.done}
        onChange={() => onToggle(todo)}
        aria-label={todo.done ? "Als offen markieren" : "Als erledigt abhaken"}
        radius="xl"
      />
      {editing ? (
        <>
          <TextInput
            style={{ flex: 1 }}
            size="sm"
            value={draft}
            disabled={busy}
            autoFocus
            onChange={e => setDraft(e.currentTarget.value)}
            onKeyDown={e => {
              if (e.key === "Enter") commit()
              if (e.key === "Escape") {
                setEditing(false)
                setDraft(todo.text)
              }
            }}
          />
          <ActionIcon variant="subtle" color="teal" aria-label="Änderung speichern" loading={busy} onClick={commit}>
            <CheckIcon size={15} />
          </ActionIcon>
          <ActionIcon
            variant="subtle"
            color="gray"
            aria-label="Bearbeiten abbrechen"
            disabled={busy}
            onClick={() => {
              setEditing(false)
              setDraft(todo.text)
            }}
          >
            <XIcon size={15} />
          </ActionIcon>
        </>
      ) : (
        <>
          <Text
            size="sm"
            style={{ flex: 1, minWidth: 0, cursor: "pointer" }}
            td={todo.done ? "line-through" : undefined}
            c={todo.done ? "dimmed" : undefined}
            onClick={() => onToggle(todo)}
          >
            {todo.text}
          </Text>
          <ActionIcon
            variant="subtle"
            color="gray"
            aria-label="Thema korrigieren"
            onClick={() => {
              setDraft(todo.text)
              setEditing(true)
            }}
          >
            <PencilIcon size={14} />
          </ActionIcon>
          {canDelete && (
            <ActionIcon variant="subtle" color="red" aria-label="Thema löschen" onClick={() => onDelete(todo)}>
              <Trash2Icon size={14} />
            </ActionIcon>
          )}
          <Tooltip label={`Erstellt von ${todo.creator_name}`}>
            <UserAvatar name={todo.creator_name} src={todo.creator_avatar} size={22} />
          </Tooltip>
        </>
      )}
    </Group>
  )
}

type Props = {
  backend: Backend
  profile: Profile
}

export function TodosView({ backend, profile }: Props) {
  const [todos, setTodos] = useState<Todo[] | null>(null)
  const [draft, setDraft] = useState("")
  const [adding, setAdding] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  const load = useCallback(async () => {
    try {
      setTodos(await backend.listTodos())
    } catch (e) {
      toast.error("Laden fehlgeschlagen: " + (e instanceof Error ? e.message : String(e)))
      setTodos([])
    }
  }, [backend])

  useEffect(() => {
    load()
  }, [load])

  // Live-Updates: Liste folgt Einträgen anderer ohne Neuladen
  useEffect(() => backend.subscribeChanges(["todos"], () => load()), [backend, load])

  async function add() {
    const text = draft.trim()
    if (!text) return
    setAdding(true)
    try {
      await backend.addTodo(text)
      setDraft("")
      await load()
    } catch (e) {
      toast.error("Hinzufügen fehlgeschlagen: " + (e instanceof Error ? e.message : String(e)))
    } finally {
      setAdding(false)
      inputRef.current?.focus()
    }
  }

  async function toggle(todo: Todo) {
    // Optimistisch umschalten, bei Fehler zurück
    setTodos(list => (list ?? []).map(t => (t.id === todo.id ? { ...t, done: !t.done } : t)))
    try {
      await backend.updateTodo(todo.id, { done: !todo.done })
    } catch (e) {
      setTodos(list => (list ?? []).map(t => (t.id === todo.id ? { ...t, done: todo.done } : t)))
      toast.error("Aktualisieren fehlgeschlagen: " + (e instanceof Error ? e.message : String(e)))
    }
  }

  async function rename(todo: Todo, text: string) {
    try {
      await backend.updateTodo(todo.id, { text })
      setTodos(list => (list ?? []).map(t => (t.id === todo.id ? { ...t, text } : t)))
    } catch (e) {
      toast.error("Speichern fehlgeschlagen: " + (e instanceof Error ? e.message : String(e)))
      throw e
    }
  }

  function confirmDelete(todo: Todo) {
    modals.openConfirmModal({
      title: "Thema löschen?",
      children: <Text size="sm">„{todo.text}“ wird dauerhaft von der Liste entfernt.</Text>,
      labels: { confirm: "Löschen", cancel: "Abbrechen" },
      confirmProps: { color: "red" },
      onConfirm: async () => {
        try {
          await backend.deleteTodo(todo.id)
          setTodos(list => (list ?? []).filter(t => t.id !== todo.id))
        } catch (e) {
          toast.error("Löschen fehlgeschlagen: " + (e instanceof Error ? e.message : String(e)))
        }
      },
    })
  }

  const open = (todos ?? []).filter(t => !t.done)
  const done = (todos ?? []).filter(t => t.done)

  return (
    <Stack gap="lg">
      <Stack gap={2}>
        <Title order={4}>Todos</Title>
        <Text size="sm" c="dimmed">
          Lose Themen schnell festhalten – mit Enter landet das Thema auf der Liste, besprechen und abhaken später.
        </Text>
      </Stack>

      <Card withBorder radius="md" p="lg">
        <Stack gap="md">
          <TextInput
            ref={inputRef}
            placeholder="z. B.: Kappa besprechen und Workshop planen – Enter fügt hinzu"
            leftSection={<PlusIcon size={15} />}
            value={draft}
            disabled={adding}
            data-autofocus
            autoFocus
            onChange={e => setDraft(e.currentTarget.value)}
            onKeyDown={e => {
              if (e.key === "Enter") {
                e.preventDefault()
                add()
              }
            }}
          />

          {todos === null ? (
            <Stack gap="xs">
              <Skeleton h={30} />
              <Skeleton h={30} />
            </Stack>
          ) : todos.length === 0 ? (
            <Stack align="center" gap="sm" py="lg">
              <ThemeIcon variant="light" size="xl" radius="xl">
                <ListTodoIcon size={22} />
              </ThemeIcon>
              <Text fw={600}>Noch keine Themen</Text>
              <Text size="sm" c="dimmed">Oben eintippen und mit Enter auf die Liste setzen.</Text>
            </Stack>
          ) : (
            <Stack gap={0}>
              {open.map(t => (
                <TodoRow key={t.id} todo={t} canDelete={t.created_by === profile.id || profile.role === "admin"} onToggle={toggle} onRename={rename} onDelete={confirmDelete} />
              ))}
              {done.length > 0 && (
                <>
                  {open.length > 0 && (
                    <Text size="xs" c="dimmed" tt="uppercase" fw={600} mt="md" mb={4}>
                      Erledigt
                    </Text>
                  )}
                  {done.map(t => (
                    <TodoRow key={t.id} todo={t} canDelete={t.created_by === profile.id || profile.role === "admin"} onToggle={toggle} onRename={rename} onDelete={confirmDelete} />
                  ))}
                </>
              )}
            </Stack>
          )}
        </Stack>
      </Card>
    </Stack>
  )
}
