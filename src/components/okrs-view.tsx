// OKR-Verwaltung: Objectives mit Key Results, nach Quartal gruppiert.
// Alle Teammitglieder pflegen OKRs; Epics können auf eine aktive OKR verweisen.
import { useCallback, useEffect, useRef, useState } from "react"
import {
  ActionIcon, Badge, Button, Card, Group, List, Select, Skeleton, Stack, Text, TextInput, Textarea, ThemeIcon, Title,
} from "@mantine/core"
import { modals } from "@mantine/modals"
import { ArchiveIcon, ArchiveRestoreIcon, PencilIcon, PlusIcon, TargetIcon, Trash2Icon, XIcon } from "lucide-react"

import type { Backend, Okr, OkrInput, Profile } from "@/lib/backend"
import { toast } from "@/lib/notify"

/** Quartals-Optionen: aktuelles Jahr und Folgejahr */
function quarterOptions(extra?: string): string[] {
  const year = new Date().getFullYear()
  const list: string[] = []
  for (const y of [year, year + 1]) {
    for (let q = 1; q <= 4; q++) list.push(`Q${q} ${y}`)
  }
  if (extra && !list.includes(extra)) list.unshift(extra)
  return list
}

function currentQuarter(): string {
  const now = new Date()
  return `Q${Math.floor(now.getMonth() / 3) + 1} ${now.getFullYear()}`
}

type FormState = OkrInput & { id: string | null }

function emptyForm(): FormState {
  return { id: null, objective: "", description: "", key_results: [], quarter: currentQuarter(), status: "aktiv" }
}

function OkrForm({ initial, busy, onSave, onCancel }: {
  initial: FormState
  busy: boolean
  onSave: (form: FormState) => void
  onCancel: () => void
}) {
  const [form, setForm] = useState<FormState>(initial)
  const [krDraft, setKrDraft] = useState("")
  const krInput = useRef<HTMLInputElement>(null)

  function addKr() {
    const t = krDraft.trim()
    if (!t) return
    setForm(f => ({ ...f, key_results: [...f.key_results, t] }))
    setKrDraft("")
    krInput.current?.focus()
  }

  return (
    <Card withBorder radius="md" p="lg">
      <Stack gap="md">
        <Title order={5}>{form.id ? "OKR bearbeiten" : "Neue OKR"}</Title>
        <TextInput
          label="Objective"
          required
          placeholder="z. B.: Research-Erkenntnisse sind team­übergreifend auffindbar und werden nachweislich genutzt"
          value={form.objective}
          onChange={e => setForm(f => ({ ...f, objective: e.currentTarget.value }))}
        />
        <Textarea
          label="Beschreibung (optional)"
          autosize
          minRows={2}
          value={form.description}
          onChange={e => setForm(f => ({ ...f, description: e.currentTarget.value }))}
        />
        <Stack gap={6}>
          <Text size="sm" fw={500}>Key Results</Text>
          {form.key_results.map((kr, i) => (
            <Group key={i} gap={8} wrap="nowrap">
              <Text size="sm" style={{ flex: 1 }}>{i + 1}. {kr}</Text>
              <ActionIcon variant="subtle" color="gray" aria-label="Key Result entfernen" onClick={() => setForm(f => ({ ...f, key_results: f.key_results.filter((_, x) => x !== i) }))}>
                <XIcon size={14} />
              </ActionIcon>
            </Group>
          ))}
          <Group gap="xs" wrap="nowrap">
            <TextInput
              ref={krInput}
              style={{ flex: 1 }}
              placeholder="Key Result eingeben und mit Enter hinzufügen"
              value={krDraft}
              onChange={e => setKrDraft(e.currentTarget.value)}
              onKeyDown={e => {
                if (e.key === "Enter") {
                  e.preventDefault()
                  addKr()
                }
              }}
            />
            <Button variant="default" leftSection={<PlusIcon size={14} />} onClick={addKr} disabled={!krDraft.trim()}>
              Hinzufügen
            </Button>
          </Group>
        </Stack>
        <Group align="flex-end" gap="sm">
          <Select
            label="Zeitraum"
            w={160}
            data={quarterOptions(form.quarter)}
            value={form.quarter}
            allowDeselect={false}
            onChange={v => v && setForm(f => ({ ...f, quarter: v }))}
          />
        </Group>
        <Group gap="sm">
          <Button loading={busy} disabled={!form.objective.trim()} onClick={() => onSave(form)}>
            {form.id ? "Speichern" : "OKR anlegen"}
          </Button>
          <Button variant="subtle" color="gray" disabled={busy} onClick={onCancel}>
            Abbrechen
          </Button>
        </Group>
      </Stack>
    </Card>
  )
}

type Props = {
  backend: Backend
  profile: Profile
}

export function OkrsView({ backend, profile }: Props) {
  const [okrs, setOkrs] = useState<Okr[] | null>(null)
  const [form, setForm] = useState<FormState | null>(null)
  const [busy, setBusy] = useState(false)

  const load = useCallback(async () => {
    try {
      setOkrs(await backend.listOkrs())
    } catch (e) {
      toast.error("OKRs laden fehlgeschlagen: " + (e instanceof Error ? e.message : String(e)))
      setOkrs([])
    }
  }, [backend])

  useEffect(() => {
    load()
  }, [load])

  // Live-Updates: OKR-Liste folgt Änderungen anderer ohne Neuladen
  useEffect(() => backend.subscribeChanges(["okrs"], () => load()), [backend, load])

  async function save(f: FormState) {
    setBusy(true)
    try {
      const input: OkrInput = {
        objective: f.objective.trim(),
        description: f.description.trim(),
        key_results: f.key_results,
        quarter: f.quarter,
        status: f.status,
      }
      if (f.id) await backend.updateOkr(f.id, input)
      else await backend.createOkr(input)
      toast.success(f.id ? "OKR gespeichert" : "OKR angelegt")
      setForm(null)
      load()
    } catch (e) {
      toast.error("Speichern fehlgeschlagen: " + (e instanceof Error ? e.message : String(e)))
    } finally {
      setBusy(false)
    }
  }

  async function toggleArchive(o: Okr) {
    try {
      await backend.updateOkr(o.id, {
        objective: o.objective, description: o.description, key_results: o.key_results, quarter: o.quarter,
        status: o.status === "aktiv" ? "archiviert" : "aktiv",
      })
      load()
    } catch (e) {
      toast.error("Aktualisieren fehlgeschlagen: " + (e instanceof Error ? e.message : String(e)))
    }
  }

  function confirmDelete(o: Okr) {
    modals.openConfirmModal({
      title: "OKR löschen?",
      children: (
        <Text size="sm">
          „{o.objective}“ wird dauerhaft gelöscht. Epics, die darauf verweisen, behalten ihre Inhalte, verlieren aber die Verknüpfung.
        </Text>
      ),
      labels: { confirm: "Löschen", cancel: "Abbrechen" },
      confirmProps: { color: "red" },
      onConfirm: async () => {
        try {
          await backend.deleteOkr(o.id)
          toast.success("OKR gelöscht")
          load()
        } catch (e) {
          toast.error("Löschen fehlgeschlagen: " + (e instanceof Error ? e.message : String(e)))
        }
      },
    })
  }

  const quarters = [...new Set((okrs ?? []).map(o => o.quarter))]

  return (
    <Stack gap="lg">
      <Group justify="space-between" align="flex-start">
        <Stack gap={2}>
          <Title order={4}>OKRs</Title>
          <Text size="sm" c="dimmed">
            Objectives &amp; Key Results des Teams – Epics können beim Anlegen auf eine aktive OKR einzahlen.
          </Text>
        </Stack>
        {!form && (
          <Button leftSection={<PlusIcon size={16} />} onClick={() => setForm(emptyForm())}>
            Neue OKR
          </Button>
        )}
      </Group>

      {form && <OkrForm key={form.id ?? "new"} initial={form} busy={busy} onSave={save} onCancel={() => setForm(null)} />}

      {okrs === null ? (
        <Stack gap="xs">
          <Skeleton h={90} radius="md" />
          <Skeleton h={90} radius="md" />
        </Stack>
      ) : okrs.length === 0 && !form ? (
        <Card withBorder radius="md" p="lg">
          <Stack align="center" gap="sm" py="lg">
            <ThemeIcon variant="light" size="xl" radius="xl">
              <TargetIcon size={22} />
            </ThemeIcon>
            <Text fw={600}>Noch keine OKRs</Text>
            <Text size="sm" c="dimmed">Lege die erste OKR an – danach lassen sich Epics damit verknüpfen.</Text>
            <Button leftSection={<PlusIcon size={16} />} onClick={() => setForm(emptyForm())}>
              Neue OKR
            </Button>
          </Stack>
        </Card>
      ) : (
        quarters.map(q => (
          <Stack key={q} gap="sm">
            <Title order={6} c="dimmed">{q}</Title>
            {okrs!.filter(o => o.quarter === q).map(o => {
              const canDelete = o.created_by === profile.id || profile.role === "admin"
              return (
                <Card key={o.id} withBorder radius="md" p="lg" opacity={o.status === "archiviert" ? 0.6 : 1}>
                  <Stack gap="sm">
                    <Group justify="space-between" align="flex-start" wrap="nowrap">
                      <Group gap="sm" align="flex-start" wrap="nowrap" style={{ minWidth: 0 }}>
                        <ThemeIcon variant="light" radius="md" mt={2}>
                          <TargetIcon size={16} />
                        </ThemeIcon>
                        <Stack gap={2} style={{ minWidth: 0 }}>
                          <Group gap={8}>
                            <Text fw={600}>{o.objective}</Text>
                            {o.status === "archiviert" && <Badge variant="outline" color="gray">Archiviert</Badge>}
                          </Group>
                          {o.description && <Text size="sm" c="dimmed">{o.description}</Text>}
                        </Stack>
                      </Group>
                      <Group gap={4} wrap="nowrap">
                        <ActionIcon variant="subtle" color="gray" aria-label="Bearbeiten" onClick={() => setForm({ id: o.id, objective: o.objective, description: o.description, key_results: o.key_results, quarter: o.quarter, status: o.status })}>
                          <PencilIcon size={16} />
                        </ActionIcon>
                        <ActionIcon
                          variant="subtle"
                          color="gray"
                          aria-label={o.status === "aktiv" ? "Archivieren" : "Reaktivieren"}
                          title={o.status === "aktiv" ? "Archivieren" : "Reaktivieren"}
                          onClick={() => toggleArchive(o)}
                        >
                          {o.status === "aktiv" ? <ArchiveIcon size={16} /> : <ArchiveRestoreIcon size={16} />}
                        </ActionIcon>
                        {canDelete && (
                          <ActionIcon variant="subtle" color="red" aria-label="Löschen" onClick={() => confirmDelete(o)}>
                            <Trash2Icon size={16} />
                          </ActionIcon>
                        )}
                      </Group>
                    </Group>
                    {o.key_results.length > 0 && (
                      <List size="sm" spacing={4} type="ordered">
                        {o.key_results.map((kr, i) => (
                          <List.Item key={i}>{kr}</List.Item>
                        ))}
                      </List>
                    )}
                  </Stack>
                </Card>
              )
            })}
          </Stack>
        ))
      )}
    </Stack>
  )
}
