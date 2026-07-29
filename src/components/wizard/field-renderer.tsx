// Rendert ein Feld der Registry als shadcn Field mit passendem Control.
import { PlusIcon, SparklesIcon, XIcon } from "lucide-react"

import { isEmpty, OP_STATUS, OP_TYPEN, emptyOpRow, type FieldDef, type FieldValue, type OpRow, type Sources, type Values } from "@/lib/fields"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Field, FieldDescription, FieldLabel, FieldTitle } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { InputGroup, InputGroupAddon, InputGroupButton, InputGroupInput } from "@/components/ui/input-group"
import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Textarea } from "@/components/ui/textarea"
import { DateField } from "./date-field"

export type SetField = (key: string, value: FieldValue, source?: "ai" | "user") => void

type Props = {
  field: FieldDef
  values: Values
  source: Sources
  setField: SetField
}

function SourceBadge({ src }: { src?: "ai" | "user" }) {
  if (src === "ai") {
    return (
      <Badge variant="secondary">
        <SparklesIcon /> KI-Vorschlag
      </Badge>
    )
  }
  if (src === "user") return <Badge variant="outline">Bearbeitet</Badge>
  return null
}

function selectItems(f: FieldDef) {
  const items: Array<{ label: string; value: string | null }> = []
  if (f.req) items.push({ label: "– bitte wählen –", value: null })
  for (const o of f.options ?? []) items.push({ label: o, value: o })
  return items
}

export function FieldRenderer({ field: f, values, source, setField }: Props) {
  if (f.showIf && !f.showIf(values)) return null

  if (f.type === "grouplabel") {
    return (
      <Field>
        <FieldTitle>{f.label}</FieldTitle>
        {f.hint && <FieldDescription>{f.hint}</FieldDescription>}
      </Field>
    )
  }

  const src = source[f.key]
  const missing = !!f.req && isEmpty(values[f.key])
  const labelRow = (
    <FieldLabel htmlFor={`f-${f.key}`} className="flex flex-wrap items-center gap-2">
      {f.label}
      {f.req && <Badge variant="destructive">Pflicht</Badge>}
      <SourceBadge src={src} />
    </FieldLabel>
  )

  if (f.type === "check") {
    return (
      <Field orientation="horizontal" data-invalid={missing || undefined}>
        <Checkbox
          id={`f-${f.key}`}
          checked={!!values[f.key]}
          onCheckedChange={checked => setField(f.key, !!checked)}
        />
        <FieldLabel htmlFor={`f-${f.key}`} className="flex flex-wrap items-center gap-2 font-normal">
          {f.label}
          <SourceBadge src={src} />
        </FieldLabel>
      </Field>
    )
  }

  if (f.type === "list") {
    const items = (values[f.key] as string[]) ?? []
    return (
      <Field data-invalid={missing || undefined}>
        {labelRow}
        {f.hint && <FieldDescription>{f.hint}</FieldDescription>}
        <div className="flex flex-col gap-2">
          {items.length === 0 && <p className="text-sm text-muted-foreground">Noch keine Einträge.</p>}
          {items.map((val, i) => (
            <InputGroup key={i}>
              <InputGroupInput
                value={val}
                aria-label={`${f.label} – Eintrag ${i + 1}`}
                aria-invalid={missing || undefined}
                onChange={e => {
                  const next = [...items]
                  next[i] = e.target.value
                  setField(f.key, next)
                }}
              />
              <InputGroupAddon align="inline-end">
                <InputGroupButton
                  size="icon-xs"
                  aria-label="Eintrag entfernen"
                  onClick={() => setField(f.key, items.filter((_, j) => j !== i))}
                >
                  <XIcon />
                </InputGroupButton>
              </InputGroupAddon>
            </InputGroup>
          ))}
          <div>
            <Button variant="outline" size="sm" onClick={() => setField(f.key, [...items, ""])}>
              <PlusIcon data-icon="inline-start" />
              Eintrag hinzufügen
            </Button>
          </div>
        </div>
      </Field>
    )
  }

  if (f.type === "optable") {
    const rows = (values[f.key] as OpRow[]) ?? []
    const update = (i: number, patch: Partial<OpRow>) => {
      const next = rows.map((r, j) => (j === i ? { ...r, ...patch } : r))
      setField(f.key, next)
    }
    const typItems = OP_TYPEN.map(t => ({ label: t, value: t }))
    const statusItems = OP_STATUS.map(t => ({ label: t, value: t }))
    return (
      <Field>
        {labelRow}
        {f.hint && <FieldDescription>{f.hint}</FieldDescription>}
        <div className="flex flex-col gap-2">
          {rows.length === 0 ? (
            <p className="text-sm text-muted-foreground">Noch keine Einträge.</p>
          ) : (
            <div className="overflow-x-auto rounded-lg border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="min-w-32">Typ</TableHead>
                    <TableHead className="min-w-40">Beschreibung</TableHead>
                    <TableHead className="min-w-36">Auswirkung</TableHead>
                    <TableHead className="min-w-36">Klärung/Validierung</TableHead>
                    <TableHead className="min-w-24">Owner</TableHead>
                    <TableHead className="min-w-28">Status</TableHead>
                    <TableHead className="min-w-36">Fällig bis</TableHead>
                    <TableHead />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rows.map((row, i) => (
                    <TableRow key={i}>
                      <TableCell>
                        <Select items={typItems} value={row.typ} onValueChange={v => update(i, { typ: String(v) })}>
                          <SelectTrigger size="sm" className="w-full" aria-label="Typ">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectGroup>
                              {typItems.map(it => (
                                <SelectItem key={it.value} value={it.value}>{it.label}</SelectItem>
                              ))}
                            </SelectGroup>
                          </SelectContent>
                        </Select>
                      </TableCell>
                      <TableCell><Input aria-label="Beschreibung" value={row.beschreibung} onChange={e => update(i, { beschreibung: e.target.value })} /></TableCell>
                      <TableCell><Input aria-label="Auswirkung" value={row.auswirkung} onChange={e => update(i, { auswirkung: e.target.value })} /></TableCell>
                      <TableCell><Input aria-label="Klärung/Validierung" value={row.klaerung} onChange={e => update(i, { klaerung: e.target.value })} /></TableCell>
                      <TableCell><Input aria-label="Owner" value={row.owner} onChange={e => update(i, { owner: e.target.value })} /></TableCell>
                      <TableCell>
                        <Select items={statusItems} value={row.status} onValueChange={v => update(i, { status: String(v) })}>
                          <SelectTrigger size="sm" className="w-full" aria-label="Status">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectGroup>
                              {statusItems.map(it => (
                                <SelectItem key={it.value} value={it.value}>{it.label}</SelectItem>
                              ))}
                            </SelectGroup>
                          </SelectContent>
                        </Select>
                      </TableCell>
                      <TableCell>
                        <DateField value={row.faellig} onChange={v => update(i, { faellig: v })} placeholder="Datum" />
                      </TableCell>
                      <TableCell>
                        <Button variant="ghost" size="icon-xs" aria-label="Eintrag entfernen" onClick={() => setField(f.key, rows.filter((_, j) => j !== i))}>
                          <XIcon />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
          <div>
            <Button variant="outline" size="sm" onClick={() => setField(f.key, [...rows, emptyOpRow()])}>
              <PlusIcon data-icon="inline-start" />
              Eintrag hinzufügen
            </Button>
          </div>
        </div>
      </Field>
    )
  }

  // text / textarea / select / date
  return (
    <Field data-invalid={missing || undefined}>
      {labelRow}
      {f.hint && <FieldDescription>{f.hint}</FieldDescription>}
      {f.type === "text" && (
        <Input
          id={`f-${f.key}`}
          value={(values[f.key] as string) ?? ""}
          aria-invalid={missing || undefined}
          onChange={e => setField(f.key, e.target.value)}
        />
      )}
      {f.type === "textarea" && (
        <Textarea
          id={`f-${f.key}`}
          value={(values[f.key] as string) ?? ""}
          aria-invalid={missing || undefined}
          rows={3}
          onChange={e => setField(f.key, e.target.value)}
        />
      )}
      {f.type === "date" && (
        <DateField
          id={`f-${f.key}`}
          value={(values[f.key] as string) ?? ""}
          invalid={missing}
          onChange={v => setField(f.key, v)}
        />
      )}
      {f.type === "select" && (
        <Select
          items={selectItems(f)}
          value={((values[f.key] as string) || null) as string | null}
          onValueChange={v => setField(f.key, v == null ? "" : String(v))}
        >
          <SelectTrigger id={`f-${f.key}`} className="w-full max-w-xs" aria-invalid={missing || undefined}>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectGroup>
              {selectItems(f).map(it => (
                <SelectItem key={String(it.value)} value={it.value}>{it.label}</SelectItem>
              ))}
            </SelectGroup>
          </SelectContent>
        </Select>
      )}
    </Field>
  )
}
