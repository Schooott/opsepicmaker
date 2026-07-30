// Schritt 6: Vollständigkeit prüfen und Inhalte für Jira kopieren.
import { useState } from "react"
import { ActionIcon, Badge, Button, Card, Checkbox, Code, Group, Paper, ScrollArea, Stack, Text, Title, UnstyledButton } from "@mantine/core"
import { CheckIcon, ClipboardCopyIcon, SparklesIcon, TriangleAlertIcon, XIcon } from "lucide-react"

import type { StorySuggestion } from "@/lib/ai"
import { missingRequired, requiredFields, stepOfField, type Values } from "@/lib/fields"
import { buildAkText, buildWikiDescription } from "@/lib/exportJira"
import { toast } from "@/lib/notify"

type Props = {
  values: Values
  onJumpToStep: (step: number) => void
  stories: StorySuggestion[]
  storiesLoading: boolean
  /** Abgeschlossenes Epic: keine Änderungen an den Vorschlägen, Kopieren bleibt möglich */
  readOnly: boolean
  onGenerateStories: () => void
  onRemoveStory: (index: number) => void
}

async function copy(text: string, label: string) {
  try {
    await navigator.clipboard.writeText(text)
    toast.success(`${label} kopiert`)
  } catch {
    toast.error("Kopieren fehlgeschlagen – bitte manuell markieren und kopieren.")
  }
}

function CopyCard({ title, description, text, preview }: { title: string; description?: string; text: string; preview?: "block" | "inline" }) {
  return (
    <Card withBorder radius="md" p="lg">
      <Stack gap="sm">
        <Group justify="space-between" align="flex-start" wrap="wrap">
          <Stack gap={2}>
            <Title order={5}>{title}</Title>
            {description && <Text size="xs" c="dimmed">{description}</Text>}
          </Stack>
          <Button variant="default" size="xs" leftSection={<ClipboardCopyIcon size={14} />} onClick={() => copy(text, title)}>
            Kopieren
          </Button>
        </Group>
        {preview === "block" ? (
          <ScrollArea.Autosize mah={260} type="auto">
            <Code block>{text}</Code>
          </ScrollArea.Autosize>
        ) : (
          <Code block>{text}</Code>
        )}
      </Stack>
    </Card>
  )
}

function storyText(s: StorySuggestion): string {
  return `${s.titel}\n\n${s.beschreibung}`
}

export function StepExport({ values, onJumpToStep, stories, storiesLoading, readOnly, onGenerateStories, onRemoveStory }: Props) {
  const [withLeitfragen, setWithLeitfragen] = useState(true)
  const missing = missingRequired(values)
  const required = requiredFields(values)
  const titel = String(values.titel || "").trim() || "(Titel fehlt)"
  const epicName = String(values.epicName || "").trim() || "(Epic Name fehlt)"

  return (
    <Stack gap="lg">
      <Card withBorder radius="md" p="lg">
        <Stack gap="sm">
          <Stack gap={2}>
            <Title order={4}>Vollständigkeit wichtiger Felder</Title>
            <Text size="sm" c="dimmed">
              {missing.length === 0
                ? "Alle Pflichtfelder sind befüllt."
                : `${missing.length} von ${required.length} Pflichtfeldern fehlen noch – Klick springt zum Feld.`}
            </Text>
          </Stack>
          <Stack gap={6}>
            {required.map(f => {
              const isMissing = missing.includes(f)
              return isMissing ? (
                <UnstyledButton key={f.key} onClick={() => onJumpToStep(stepOfField(f))}>
                  <Group gap={8}>
                    <TriangleAlertIcon size={15} color="var(--mantine-color-red-7)" />
                    <Text size="sm" c="red.7" td="underline">{f.label} – fehlt noch</Text>
                  </Group>
                </UnstyledButton>
              ) : (
                <Group key={f.key} gap={8}>
                  <CheckIcon size={15} color="var(--mantine-color-teal-7)" />
                  <Text size="sm" c="dimmed">{f.label}</Text>
                </Group>
              )
            })}
          </Stack>
        </Stack>
      </Card>

      <CopyCard title="1 · Titel (Zusammenfassung)" text={titel} />
      <CopyCard title="2 · Epic Name (Kurzname)" text={epicName} />

      <Card withBorder radius="md" p="lg">
        <Stack gap="sm">
          <Group justify="space-between" align="flex-start" wrap="wrap">
            <Stack gap={2}>
              <Title order={5}>3 · Beschreibung (Jira-Wiki-Markup)</Title>
              <Text size="xs" c="dimmed">In das Beschreibungsfeld des neuen Jira-Epics einfügen.</Text>
            </Stack>
            <Button size="xs" leftSection={<ClipboardCopyIcon size={14} />} onClick={() => copy(buildWikiDescription(values, withLeitfragen), "Beschreibung")}>
              Beschreibung kopieren
            </Button>
          </Group>
          <Checkbox
            label="Leitfragen aus dem Template im Export behalten (Struktur wie Vorlage)"
            checked={withLeitfragen}
            onChange={e => setWithLeitfragen(e.currentTarget.checked)}
          />
          <ScrollArea.Autosize mah={340} type="auto">
            <Code block>{buildWikiDescription(values, withLeitfragen)}</Code>
          </ScrollArea.Autosize>
        </Stack>
      </Card>

      <CopyCard
        title="4 · Akzeptanzkriterien (Checklisten-Feld)"
        description="Einzeln in das Checklisten-Feld „Akzeptanzkriterien“ übernehmen (Überschrift: Outcome-Akzeptanzkriterien)."
        text={buildAkText(values)}
        preview="block"
      />

      <Card withBorder radius="md" p="lg">
        <Stack gap="sm">
          <Group justify="space-between" align="flex-start" wrap="wrap">
            <Stack gap={2}>
              <Title order={5}>5 · Story- und Task-Vorschläge</Title>
              <Text size="xs" c="dimmed">
                Schlägt auf Basis des geschärften Epics einen Schnitt in Storys und Tasks vor – als Startpunkt für die Planung, einzeln kopierbar.
              </Text>
            </Stack>
            {!readOnly && (
              <Button
                size="xs"
                variant={stories.length > 0 ? "default" : "filled"}
                loading={storiesLoading}
                leftSection={<SparklesIcon size={14} />}
                onClick={onGenerateStories}
              >
                {stories.length > 0 ? "Neu vorschlagen" : "Storys vorschlagen"}
              </Button>
            )}
          </Group>
          {stories.length === 0 && !storiesLoading && (
            <Text size="sm" c="dimmed">
              {readOnly
                ? "Keine Vorschläge vorhanden."
                : "Noch keine Vorschläge. Am besten erst alle Pflichtfelder schärfen, dann liefern die Vorschläge die besten Ergebnisse."}
            </Text>
          )}
          {stories.length > 0 && (
            <Stack gap="xs">
              {stories.map((s, i) => (
                <Paper key={i} withBorder radius="md" p="sm">
                  <Group align="flex-start" wrap="nowrap" gap="sm">
                    <Stack gap={4} style={{ flex: 1, minWidth: 0 }}>
                      <Group gap={8} wrap="nowrap">
                        <Badge size="sm" variant="light" color={s.typ === "Story" ? "indigo" : "gray"}>{s.typ}</Badge>
                        <Text size="sm" fw={600} style={{ minWidth: 0 }}>{s.titel}</Text>
                      </Group>
                      <Text size="sm" c="dimmed">{s.beschreibung}</Text>
                    </Stack>
                    <Group gap={4} wrap="nowrap">
                      <ActionIcon variant="subtle" color="gray" aria-label="Story kopieren" onClick={() => copy(storyText(s), s.titel)}>
                        <ClipboardCopyIcon size={15} />
                      </ActionIcon>
                      {!readOnly && (
                        <ActionIcon variant="subtle" color="gray" aria-label="Vorschlag entfernen" onClick={() => onRemoveStory(i)}>
                          <XIcon size={15} />
                        </ActionIcon>
                      )}
                    </Group>
                  </Group>
                </Paper>
              ))}
              <Group justify="flex-end">
                <Button
                  variant="default"
                  size="xs"
                  leftSection={<ClipboardCopyIcon size={14} />}
                  onClick={() => copy(stories.map(storyText).join("\n\n---\n\n"), "Alle Vorschläge")}
                >
                  Alle kopieren
                </Button>
              </Group>
            </Stack>
          )}
        </Stack>
      </Card>
    </Stack>
  )
}
