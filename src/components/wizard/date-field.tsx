// Datums-Hybrid: Freitext-Eingabe (auch "Q4 2026" o. Ä.) plus Kalender-Picker
// über Popover + DatePicker.
import { useState } from "react"
import { ActionIcon, Popover, TextInput } from "@mantine/core"
import { DatePicker } from "@mantine/dates"
import dayjs from "dayjs"
import { CalendarIcon } from "lucide-react"

import { deToDate } from "@/lib/fields"

type Props = {
  label?: React.ReactNode
  description?: string
  value: string
  onChange: (value: string) => void
  invalid?: boolean
  placeholder?: string
  size?: "xs" | "sm"
  "aria-label"?: string
}

export function DateField({ label, description, value, onChange, invalid, placeholder, size = "sm", ...rest }: Props) {
  const [open, setOpen] = useState(false)
  const base = deToDate(value)
  return (
    <TextInput
      label={label}
      description={description}
      size={size}
      value={value}
      error={invalid || undefined}
      placeholder={placeholder ?? "TT.MM.JJJJ oder Freitext, z. B. Q4 2026"}
      aria-label={rest["aria-label"]}
      onChange={e => onChange(e.currentTarget.value)}
      rightSection={
        <Popover opened={open} onChange={setOpen} position="bottom-end" withArrow>
          <Popover.Target>
            <ActionIcon variant="subtle" color="gray" size={size} aria-label="Datum wählen" onClick={() => setOpen(o => !o)}>
              <CalendarIcon size={size === "xs" ? 13 : 15} />
            </ActionIcon>
          </Popover.Target>
          <Popover.Dropdown p="xs">
            <DatePicker
              value={base ? dayjs(base).format("YYYY-MM-DD") : null}
              defaultDate={base ? dayjs(base).format("YYYY-MM-DD") : undefined}
              onChange={val => {
                if (val) {
                  const d = dayjs(val)
                  if (d.isValid()) onChange(d.format("DD.MM.YYYY"))
                }
                setOpen(false)
              }}
            />
          </Popover.Dropdown>
        </Popover>
      }
    />
  )
}
