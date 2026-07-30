// Nutzerverwaltung (nur für Admins sichtbar).
import { useCallback, useEffect, useState } from "react"
import {
  Badge, Button, Card, Group, PasswordInput, Select, SimpleGrid, Skeleton, Stack, Switch, Table, Text, TextInput, Title,
} from "@mantine/core"
import { UserPlusIcon } from "lucide-react"

import { emailToUsername, type Backend, type Profile } from "@/lib/backend"
import { toast } from "@/lib/notify"

const ROLE_ITEMS = [
  { label: "Mitglied", value: "member" },
  { label: "Admin", value: "admin" },
]

type Props = {
  backend: Backend
  profile: Profile
}

export function UsersView({ backend, profile }: Props) {
  const [users, setUsers] = useState<Profile[] | null>(null)
  const [name, setName] = useState("")
  const [username, setUsername] = useState("")
  const [password, setPassword] = useState("")
  const [creating, setCreating] = useState(false)

  const load = useCallback(async () => {
    try {
      setUsers(await backend.listProfiles())
    } catch (e) {
      toast.error("Laden fehlgeschlagen: " + (e instanceof Error ? e.message : String(e)))
      setUsers([])
    }
  }, [backend])

  useEffect(() => {
    load()
  }, [load])

  // Live-Updates: Nutzerliste folgt Profil-Änderungen ohne Neuladen
  useEffect(() => backend.subscribeChanges(["profiles"], () => load()), [backend, load])

  async function create(e: React.FormEvent) {
    e.preventDefault()
    setCreating(true)
    try {
      await backend.createUser(name.trim(), username.trim(), password)
      toast.success(`Konto für ${name.trim()} angelegt`)
      setName("")
      setUsername("")
      setPassword("")
      load()
    } catch (err) {
      toast.error("Anlegen fehlgeschlagen: " + (err instanceof Error ? err.message : String(err)))
    } finally {
      setCreating(false)
    }
  }

  async function update(id: string, patch: Partial<Pick<Profile, "role" | "approved">>) {
    try {
      await backend.updateProfile(id, patch)
      load()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : String(err))
      load()
    }
  }

  return (
    <Stack gap="lg">
      <Card withBorder radius="md" p="lg">
        <form onSubmit={create}>
          <Stack gap="md">
            <Stack gap={2}>
              <Title order={4}>Neues Konto anlegen</Title>
              <Text size="sm" c="dimmed">
                Vom Admin angelegte Konten sind sofort freigeschaltet. Passwort bitte sicher übermitteln; mindestens 6 Zeichen.
              </Text>
            </Stack>
            <SimpleGrid cols={{ base: 1, sm: 3 }} spacing="md">
              <TextInput label="Name" required value={name} onChange={e => setName(e.currentTarget.value)} />
              <TextInput
                label="Benutzername"
                required
                pattern="[A-Za-z0-9._\-]+"
                title="Nur Buchstaben, Zahlen, Punkt, Unterstrich und Bindestrich"
                autoComplete="off"
                value={username}
                onChange={e => setUsername(e.currentTarget.value)}
              />
              <PasswordInput
                label="Passwort"
                required
                minLength={6}
                autoComplete="new-password"
                value={password}
                onChange={e => setPassword(e.currentTarget.value)}
              />
            </SimpleGrid>
            <Group>
              <Button type="submit" loading={creating} leftSection={<UserPlusIcon size={16} />}>
                Konto anlegen
              </Button>
            </Group>
          </Stack>
        </form>
      </Card>

      <Card withBorder radius="md" p="lg">
        <Stack gap="md">
          <Stack gap={2}>
            <Title order={4}>Nutzer</Title>
            <Text size="sm" c="dimmed">
              Rollen und Freischaltung verwalten. Das eigene Konto und der letzte aktive Admin sind geschützt.
            </Text>
          </Stack>
          {users === null ? (
            <Stack gap="xs">
              <Skeleton h={36} />
              <Skeleton h={36} />
            </Stack>
          ) : (
            <Table verticalSpacing="sm">
              <Table.Thead>
                <Table.Tr>
                  <Table.Th>Name</Table.Th>
                  <Table.Th>Benutzername</Table.Th>
                  <Table.Th>Rolle</Table.Th>
                  <Table.Th>Aktiv</Table.Th>
                </Table.Tr>
              </Table.Thead>
              <Table.Tbody>
                {users.map(u => {
                  const isSelf = u.id === profile.id
                  return (
                    <Table.Tr key={u.id}>
                      <Table.Td>
                        <Group gap={8}>
                          <Text size="sm" fw={600}>{u.display_name}</Text>
                          {isSelf && <Badge variant="light" size="sm">Du</Badge>}
                        </Group>
                      </Table.Td>
                      <Table.Td c="dimmed">{emailToUsername(u.email)}</Table.Td>
                      <Table.Td>
                        {isSelf ? (
                          <Badge>{u.role === "admin" ? "Admin" : "Mitglied"}</Badge>
                        ) : (
                          <Select
                            size="xs"
                            w={130}
                            data={ROLE_ITEMS}
                            value={u.role}
                            allowDeselect={false}
                            aria-label={`Rolle von ${u.display_name}`}
                            onChange={v => v && update(u.id, { role: v as Profile["role"] })}
                          />
                        )}
                      </Table.Td>
                      <Table.Td>
                        <Switch
                          checked={u.approved}
                          disabled={isSelf}
                          aria-label={`${u.display_name} aktivieren/deaktivieren`}
                          onChange={e => update(u.id, { approved: e.currentTarget.checked })}
                        />
                      </Table.Td>
                    </Table.Tr>
                  )
                })}
              </Table.Tbody>
            </Table>
          )}
        </Stack>
      </Card>
    </Stack>
  )
}
