// Datums-Hybrid: Freitext-Eingabe (auch "Q4 2026" o. Ä.) plus nativer
// Kalender-Picker über Popover + Calendar.
import { useState } from "react"
import { format } from "date-fns"
import { de } from "date-fns/locale"
import { CalendarIcon } from "lucide-react"

import { deToDate } from "@/lib/fields"
import { Calendar } from "@/components/ui/calendar"
import { InputGroup, InputGroupAddon, InputGroupButton, InputGroupInput } from "@/components/ui/input-group"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"

type Props = {
  id?: string
  value: string
  onChange: (value: string) => void
  invalid?: boolean
  placeholder?: string
}

export function DateField({ id, value, onChange, invalid, placeholder }: Props) {
  const [open, setOpen] = useState(false)
  return (
    <InputGroup>
      <InputGroupInput
        id={id}
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder ?? "TT.MM.JJJJ oder Freitext, z. B. Q4 2026"}
        aria-invalid={invalid || undefined}
      />
      <InputGroupAddon align="inline-end">
        <Popover open={open} onOpenChange={setOpen}>
          <PopoverTrigger render={<InputGroupButton size="icon-xs" aria-label="Datum wählen" />}>
            <CalendarIcon />
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="end">
            <Calendar
              mode="single"
              locale={de}
              selected={deToDate(value)}
              defaultMonth={deToDate(value)}
              onSelect={d => {
                if (d) onChange(format(d, "dd.MM.yyyy"))
                setOpen(false)
              }}
            />
          </PopoverContent>
        </Popover>
      </InputGroupAddon>
    </InputGroup>
  )
}
