// Admin-Bereich: Nutzerverwaltung und zentrale KI-Einstellungen.
// Wird nur für Admins gerendert (Guard in App.tsx).
import { useEffect, useState } from "react"
import { toast } from "sonner"

import { AI_MODELS } from "@/lib/ai"
import type { Backend, Profile } from "@/lib/backend"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Field, FieldDescription, FieldGroup, FieldLabel } from "@/components/ui/field"
import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Skeleton } from "@/components/ui/skeleton"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { UsersView } from "@/components/users-view"

function AiSettings({ backend }: { backend: Backend }) {
  const [model, setModel] = useState<string | null>(null)

  useEffect(() => {
    backend
      .getAiModel()
      .then(setModel)
      .catch(e => {
        toast.error("Laden fehlgeschlagen: " + (e instanceof Error ? e.message : String(e)))
        setModel(AI_MODELS[0].value)
      })
  }, [backend])

  async function change(next: string) {
    const previous = model
    setModel(next)
    try {
      await backend.setAiModel(next)
      toast.success("KI-Modell gespeichert")
    } catch (e) {
      setModel(previous)
      toast.error("Speichern fehlgeschlagen: " + (e instanceof Error ? e.message : String(e)))
    }
  }

  const items = AI_MODELS.map(m => ({ label: m.label, value: m.value }))

  return (
    <Card>
      <CardHeader>
        <CardTitle>KI-Einstellungen</CardTitle>
        <CardDescription>
          Gilt für das gesamte Team: Mit diesem Modell befüllt der Wizard die Epic-Felder vor.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {model === null ? (
          <Skeleton className="h-8 w-full max-w-md" />
        ) : (
          <FieldGroup>
            <Field>
              <FieldLabel htmlFor="ai-model">KI-Modell</FieldLabel>
              <Select items={items} value={model} onValueChange={v => change(String(v))}>
                <SelectTrigger id="ai-model" className="w-full max-w-md">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectGroup>
                    {items.map(it => (
                      <SelectItem key={it.value} value={it.value}>{it.label}</SelectItem>
                    ))}
                  </SelectGroup>
                </SelectContent>
              </Select>
              <FieldDescription>
                Haiku kostet etwa 1–2 Cent pro Epic-Vorbefüllung, Sonnet etwa das Dreifache bei höherer Qualität.
                Änderungen werden sofort gespeichert.
              </FieldDescription>
            </Field>
          </FieldGroup>
        )}
      </CardContent>
    </Card>
  )
}

type Props = {
  backend: Backend
  profile: Profile
}

export function AdminView({ backend, profile }: Props) {
  return (
    <Tabs defaultValue="users">
      <TabsList>
        <TabsTrigger value="users">Nutzer</TabsTrigger>
        <TabsTrigger value="ai">KI-Einstellungen</TabsTrigger>
      </TabsList>
      <TabsContent value="users" className="mt-4">
        <UsersView backend={backend} profile={profile} />
      </TabsContent>
      <TabsContent value="ai" className="mt-4">
        <AiSettings backend={backend} />
      </TabsContent>
    </Tabs>
  )
}
