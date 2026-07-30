// Rendert ein Feld der Registry als Mantine-Input mit Label, Leitfrage
// (description) und Pflicht-/Quell-Badges.
import { ActionIcon, Badge, Button, Checkbox, Group, Select, Stack, Table, Text, Textarea, TextInput } from "@mantine/core"
import { PlusIcon, SparklesIcon, XIcon } from "lucide-react"

import {
  emptyOpRow, isEmpty, OP_STATUS, OP_TYPEN,
  type FieldDef, type FieldValue, type OpRow, type Sources, type Values,
} from "@/lib/fields"
import { DateField } from "./date-field"

export type SetField = (key: string, value: FieldValue, source?: "ai" | "user") => void

type Props = {
  field: FieldDef
  values: Values
  source: Sources
  setField: SetField
}

function LabelWithBadges({ f, src }: { f: FieldDef; src?: "ai" | "user" }) {
  return (
    <Group component="span" gap={6} wrap="wrap">
      <span>{f.label}</span>
      {f.req && <Badge size="xs" color="red" variant="light">Pflicht</Badge>}
      {src === "ai" && (
        <Badge size="xs" color="grape" variant="light" leftSection={<SparklesIcon size={10} />}>
          KI-Vorschlag
        </Badge>
      )}
      {src === "user" && <Badge size="xs" color="teal" variant="light">Bearbeitet</Badge>}
    </Group>
  )
}

export function FieldRenderer({ field: f, values, source, setField }: Props) {
  if (f.showIf && !f.showIf(values)) return null

  if (f.type === "grouplabel") {
    return (
      <Stack gap={2} mt="xs">
        <Text fw={600} size="sm">{f.label}</Text>
        {f.hint && <Text size="xs" c="dimmed">{f.hint}</Text>}
      </Stack>
    )
  }

  const src = source[f.key]
  const missing = !!f.req && isEmpty(values[f.key])
  const label = <LabelWithBadges f={f} src={src} />

  if (f.type === "check") {
    return (
      <Checkbox
        label={label}
        description={f.hint}
        checked={!!values[f.key]}
        onChange={e => setField(f.key, e.currentTarget.checked)}
      />
    )
  }

  if (f.type === "list") {
    const items = (values[f.key] as string[]) ?? []
    return (
      <Stack gap={6}>
        <Stack gap={2}>
          <Text component="label" size="sm" fw={500}>{label}</Text>
          {f.hint && <Text size="xs" c="dimmed">{f.hint}</Text>}
        </Stack>
        {items.length === 0 && <Text size="sm" c="dimmed">Noch keine Einträge.</Text>}
        {items.map((val, i) => (
          <TextInput
            key={i}
            value={val}
            error={missing || undefined}
            aria-label={`${f.label} – Eintrag ${i + 1}`}
            onChange={e => {
              const next = [...items]
              next[i] = e.currentTarget.value
              setField(f.key, next)
            }}
            rightSection={
              <ActionIcon
                variant="subtle"
                color="gray"
                aria-label="Eintrag entfernen"
                onClick={() => setField(f.key, items.filter((_, j) => j !== i))}
              >
                <XIcon size={15} />
              </ActionIcon>
            }
          />
        ))}
        <Group>
          <Button variant="light" size="xs" leftSection={<PlusIcon size={14} />} onClick={() => setField(f.key, [...items, ""])}>
            Eintrag hinzufügen
          </Button>
        </Group>
      </Stack>
    )
  }

  if (f.type === "optable") {
    const rows = (values[f.key] as OpRow[]) ?? []
    const update = (i: number, patch: Partial<OpRow>) => {
      setField(f.key, rows.map((r, j) => (j === i ? { ...r, ...patch } : r)))
    }
    return (
      <Stack gap={6}>
        <Stack gap={2}>
          <Text component="label" size="sm" fw={500}>{label}</Text>
          {f.hint && <Text size="xs" c="dimmed">{f.hint}</Text>}
        </Stack>
        {rows.length === 0 ? (
          <Text size="sm" c="dimmed">Noch keine Einträge.</Text>
        ) : (
          <Table.ScrollContainer minWidth={900}>
            <Table verticalSpacing={4} withTableBorder>
              <Table.Thead>
                <Table.Tr>
                  <Table.Th w={140}>Typ</Table.Th>
                  <Table.Th>Beschreibung</Table.Th>
                  <Table.Th>Auswirkung</Table.Th>
                  <Table.Th>Klärung/Validierung</Table.Th>
                  <Table.Th w={110}>Owner</Table.Th>
                  <Table.Th w={120}>Status</Table.Th>
                  <Table.Th w={150}>Fällig bis</Table.Th>
                  <Table.Th w={36} />
                </Table.Tr>
              </Table.Thead>
              <Table.Tbody>
                {rows.map((row, i) => (
                  <Table.Tr key={i}>
                    <Table.Td>
                      <Select size="xs" data={OP_TYPEN} value={row.typ} allowDeselect={false} aria-label="Typ"
                        onChange={v => v && update(i, { typ: v })} />
                    </Table.Td>
                    <Table.Td><TextInput size="xs" aria-label="Beschreibung" value={row.beschreibung} onChange={e => update(i, { beschreibung: e.currentTarget.value })} /></Table.Td>
                    <Table.Td><TextInput size="xs" aria-label="Auswirkung" value={row.auswirkung} onChange={e => update(i, { auswirkung: e.currentTarget.value })} /></Table.Td>
                    <Table.Td><TextInput size="xs" aria-label="Klärung/Validierung" value={row.klaerung} onChange={e => update(i, { klaerung: e.currentTarget.value })} /></Table.Td>
                    <Table.Td><TextInput size="xs" aria-label="Owner" value={row.owner} onChange={e => update(i, { owner: e.currentTarget.value })} /></Table.Td>
                    <Table.Td>
                      <Select size="xs" data={OP_STATUS} value={row.status} allowDeselect={false} aria-label="Status"
                        onChange={v => v && update(i, { status: v })} />
                    </Table.Td>
                    <Table.Td>
                      <DateField size="xs" value={row.faellig} onChange={v => update(i, { faellig: v })} placeholder="Datum" aria-label="Fällig bis" />
                    </Table.Td>
                    <Table.Td>
                      <ActionIcon variant="subtle" color="gray" aria-label="Eintrag entfernen" onClick={() => setField(f.key, rows.filter((_, j) => j !== i))}>
                        <XIcon size={15} />
                      </ActionIcon>
                    </Table.Td>
                  </Table.Tr>
                ))}
              </Table.Tbody>
            </Table>
          </Table.ScrollContainer>
        )}
        <Group>
          <Button variant="light" size="xs" leftSection={<PlusIcon size={14} />} onClick={() => setField(f.key, [...rows, emptyOpRow()])}>
            Eintrag hinzufügen
          </Button>
        </Group>
      </Stack>
    )
  }

  if (f.type === "text") {
    return (
      <TextInput
        label={label}
        description={f.hint}
        value={(values[f.key] as string) ?? ""}
        error={missing || undefined}
        onChange={e => setField(f.key, e.currentTarget.value)}
      />
    )
  }

  if (f.type === "textarea") {
    return (
      <Textarea
        label={label}
        description={f.hint}
        autosize
        minRows={3}
        value={(values[f.key] as string) ?? ""}
        error={missing || undefined}
        onChange={e => setField(f.key, e.currentTarget.value)}
      />
    )
  }

  if (f.type === "date") {
    return (
      <DateField
        label={label}
        description={f.hint}
        value={(values[f.key] as string) ?? ""}
        invalid={missing}
        onChange={v => setField(f.key, v)}
      />
    )
  }

  // select
  return (
    <Select
      label={label}
      description={f.hint}
      maw={360}
      data={f.options ?? []}
      value={((values[f.key] as string) || null)}
      placeholder={f.req ? "– bitte wählen –" : undefined}
      allowDeselect={!f.req}
      error={missing || undefined}
      onChange={v => setField(f.key, v ?? "")}
    />
  )
}
