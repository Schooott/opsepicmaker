// Einheitlicher Avatar: hochgeladenes Bild, sonst Initialen.
import { Avatar } from "@mantine/core"

function initials(name: string): string {
  return name.split(/\s+/).map(p => p[0]).filter(Boolean).slice(0, 2).join("").toUpperCase() || "?"
}

type Props = {
  name: string
  src?: string | null
  size?: number
}

export function UserAvatar({ name, src, size = 24 }: Props) {
  return (
    <Avatar src={src || undefined} alt={name} radius="xl" size={size} color="indigo">
      {initials(name)}
    </Avatar>
  )
}
