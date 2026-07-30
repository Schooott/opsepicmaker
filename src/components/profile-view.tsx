// Profil-Einstellungen: Avatar hochladen und eigenes Passwort ändern.
import { useState } from "react"
import { Button, Card, FileButton, Group, PasswordInput, Stack, Text, Title } from "@mantine/core"
import { KeyRoundIcon, UploadIcon } from "lucide-react"

import type { Backend, Profile } from "@/lib/backend"
import { downscaleToJpeg } from "@/lib/image"
import { toast } from "@/lib/notify"
import { UserAvatar } from "@/components/user-avatar"

type Props = {
  backend: Backend
  profile: Profile
  onProfileChange: (profile: Profile) => void
}

export function ProfileView({ backend, profile, onProfileChange }: Props) {
  const [uploading, setUploading] = useState(false)
  const [pw1, setPw1] = useState("")
  const [pw2, setPw2] = useState("")
  const [pwError, setPwError] = useState("")
  const [changing, setChanging] = useState(false)

  async function upload(file: File | null) {
    if (!file) return
    setUploading(true)
    try {
      const blob = await downscaleToJpeg(file, 256)
      const url = await backend.uploadAvatar(blob)
      onProfileChange({ ...profile, avatar_url: url })
      toast.success("Avatar aktualisiert")
    } catch (e) {
      toast.error("Upload fehlgeschlagen: " + (e instanceof Error ? e.message : String(e)))
    } finally {
      setUploading(false)
    }
  }

  async function changePassword(e: React.FormEvent) {
    e.preventDefault()
    setPwError("")
    if (pw1.length < 6) {
      setPwError("Das Passwort braucht mindestens 6 Zeichen.")
      return
    }
    if (pw1 !== pw2) {
      setPwError("Die Passwörter stimmen nicht überein.")
      return
    }
    setChanging(true)
    try {
      await backend.changePassword(pw1)
      setPw1("")
      setPw2("")
      toast.success("Passwort geändert")
    } catch (err) {
      setPwError(err instanceof Error ? err.message : String(err))
    } finally {
      setChanging(false)
    }
  }

  return (
    <Stack gap="lg" maw={560}>
      <Card withBorder radius="md" p="lg">
        <Stack gap="md">
          <Stack gap={2}>
            <Title order={4}>Avatar</Title>
            <Text size="sm" c="dimmed">
              Wird im Header und bei deinen Kommentaren angezeigt. Das Bild wird auf 256 × 256 Pixel zugeschnitten.
            </Text>
          </Stack>
          <Group gap="md">
            <UserAvatar name={profile.display_name} src={profile.avatar_url} size={64} />
            <FileButton onChange={upload} accept="image/png,image/jpeg,image/webp">
              {props => (
                <Button {...props} variant="default" loading={uploading} leftSection={<UploadIcon size={15} />}>
                  Bild hochladen
                </Button>
              )}
            </FileButton>
          </Group>
        </Stack>
      </Card>

      <Card withBorder radius="md" p="lg">
        <form onSubmit={changePassword}>
          <Stack gap="md">
            <Stack gap={2}>
              <Title order={4}>Passwort ändern</Title>
              <Text size="sm" c="dimmed">Gilt ab sofort für die Anmeldung als {profile.display_name}.</Text>
            </Stack>
            <PasswordInput
              label="Neues Passwort"
              autoComplete="new-password"
              required
              value={pw1}
              error={!!pwError}
              onChange={e => setPw1(e.currentTarget.value)}
            />
            <PasswordInput
              label="Neues Passwort wiederholen"
              autoComplete="new-password"
              required
              value={pw2}
              error={pwError || undefined}
              onChange={e => setPw2(e.currentTarget.value)}
            />
            <Group>
              <Button type="submit" loading={changing} leftSection={<KeyRoundIcon size={15} />}>
                Passwort ändern
              </Button>
            </Group>
          </Stack>
        </form>
      </Card>
    </Stack>
  )
}
