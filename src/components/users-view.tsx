// Nutzerverwaltung (nur für Admins sichtbar).
import { useCallback, useEffect, useState } from "react"
import { UserPlusIcon } from "lucide-react"
import { toast } from "sonner"

import type { Backend, Profile } from "@/lib/backend"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Skeleton } from "@/components/ui/skeleton"
import { Spinner } from "@/components/ui/spinner"
import { Switch } from "@/components/ui/switch"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"

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
  const [email, setEmail] = useState("")
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

  async function create(e: React.FormEvent) {
    e.preventDefault()
    setCreating(true)
    try {
      await backend.createUser(name.trim(), email.trim(), password)
      toast.success(`Konto für ${name.trim()} angelegt`)
      setName("")
      setEmail("")
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
    <div className="flex flex-col gap-6">
      <Card>
        <CardHeader>
          <CardTitle>Neues Konto anlegen</CardTitle>
          <CardDescription>
            Vom Admin angelegte Konten sind sofort freigeschaltet. Passwort bitte sicher übermitteln; mindestens 6 Zeichen.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={create}>
            <FieldGroup className="gap-4 sm:grid sm:grid-cols-3">
              <Field>
                <FieldLabel htmlFor="nu-name">Name</FieldLabel>
                <Input id="nu-name" required value={name} onChange={e => setName(e.target.value)} />
              </Field>
              <Field>
                <FieldLabel htmlFor="nu-email">E-Mail</FieldLabel>
                <Input id="nu-email" type="email" required value={email} onChange={e => setEmail(e.target.value)} />
              </Field>
              <Field>
                <FieldLabel htmlFor="nu-pw">Passwort</FieldLabel>
                <Input id="nu-pw" type="password" required minLength={6} autoComplete="new-password" value={password} onChange={e => setPassword(e.target.value)} />
              </Field>
            </FieldGroup>
            <div className="mt-4">
              <Button type="submit" disabled={creating}>
                {creating ? <Spinner data-icon="inline-start" /> : <UserPlusIcon data-icon="inline-start" />}
                Konto anlegen
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Nutzer</CardTitle>
          <CardDescription>
            Rollen und Freischaltung verwalten. Das eigene Konto und der letzte aktive Admin sind geschützt.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {users === null ? (
            <div className="flex flex-col gap-2">
              <Skeleton className="h-9 w-full" />
              <Skeleton className="h-9 w-full" />
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>E-Mail</TableHead>
                  <TableHead>Rolle</TableHead>
                  <TableHead>Aktiv</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {users.map(u => {
                  const isSelf = u.id === profile.id
                  return (
                    <TableRow key={u.id}>
                      <TableCell className="font-medium">
                        <span className="flex items-center gap-2">
                          {u.display_name}
                          {isSelf && <Badge variant="secondary">Du</Badge>}
                        </span>
                      </TableCell>
                      <TableCell className="text-muted-foreground">{u.email}</TableCell>
                      <TableCell>
                        {isSelf ? (
                          <Badge>{u.role === "admin" ? "Admin" : "Mitglied"}</Badge>
                        ) : (
                          <Select items={ROLE_ITEMS} value={u.role} onValueChange={v => update(u.id, { role: v as Profile["role"] })}>
                            <SelectTrigger size="sm" aria-label={`Rolle von ${u.display_name}`}>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectGroup>
                                {ROLE_ITEMS.map(it => (
                                  <SelectItem key={it.value} value={it.value}>{it.label}</SelectItem>
                                ))}
                              </SelectGroup>
                            </SelectContent>
                          </Select>
                        )}
                      </TableCell>
                      <TableCell>
                        <Switch
                          checked={u.approved}
                          disabled={isSelf}
                          aria-label={`${u.display_name} aktivieren/deaktivieren`}
                          onCheckedChange={checked => update(u.id, { approved: !!checked })}
                        />
                      </TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
