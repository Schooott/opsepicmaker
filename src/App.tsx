// App-Shell: Auth-Zustand, Navigation zwischen Übersicht, Wizard und
// Nutzerverwaltung.
import { useEffect, useMemo, useState } from "react"
import { CompassIcon, LogOutIcon } from "lucide-react"
import { toast } from "sonner"

import { createBackend, type EpicRecord, type Profile } from "@/lib/backend"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuGroup, DropdownMenuItem, DropdownMenuLabel,
  DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Spinner } from "@/components/ui/spinner"
import { Toaster } from "@/components/ui/sonner"
import { EpicList } from "@/components/epic-list"
import { LoginView } from "@/components/login-view"
import { UsersView } from "@/components/users-view"
import { Wizard } from "@/components/wizard/wizard"

type View = { name: "list" } | { name: "users" } | { name: "wizard"; epic: EpicRecord | null }

export function App() {
  const backend = useMemo(() => createBackend(), [])
  const [booting, setBooting] = useState(true)
  const [profile, setProfile] = useState<Profile | null>(null)
  const [view, setView] = useState<View>({ name: "list" })

  useEffect(() => {
    backend
      .restoreSession()
      .then(p => setProfile(p?.approved ? p : null))
      .catch(() => setProfile(null))
      .finally(() => setBooting(false))
  }, [backend])

  async function openEpic(id: string) {
    try {
      const epic = await backend.getEpic(id)
      setView({ name: "wizard", epic })
    } catch (e) {
      toast.error("Öffnen fehlgeschlagen: " + (e instanceof Error ? e.message : String(e)))
    }
  }

  async function logout() {
    await backend.signOut()
    setProfile(null)
    setView({ name: "list" })
  }

  if (booting) {
    return (
      <div className="flex min-h-svh items-center justify-center">
        <Spinner className="size-6" />
      </div>
    )
  }

  if (!profile) {
    return (
      <>
        <LoginView backend={backend} onLogin={setProfile} />
        <Toaster />
      </>
    )
  }

  const initials =
    profile.display_name.split(/\s+/).map(p => p[0]).filter(Boolean).slice(0, 2).join("").toUpperCase() || "?"

  return (
    <div className="min-h-svh bg-muted/30">
      <header className="sticky top-0 z-10 border-b bg-background">
        <div className="mx-auto flex max-w-4xl items-center gap-4 px-4 py-2.5">
          <button
            type="button"
            className="flex items-center gap-2 font-semibold"
            onClick={() => setView({ name: "list" })}
          >
            <CompassIcon className="text-primary" /> Ops Epic Maker
          </button>
          <nav className="flex items-center gap-1">
            <Button variant={view.name === "list" ? "secondary" : "ghost"} size="sm" onClick={() => setView({ name: "list" })}>
              Epics
            </Button>
            {profile.role === "admin" && (
              <Button variant={view.name === "users" ? "secondary" : "ghost"} size="sm" onClick={() => setView({ name: "users" })}>
                Nutzer
              </Button>
            )}
          </nav>
          <div className="ml-auto flex items-center gap-2">
            {backend.kind === "demo" && <Badge variant="outline">Demo</Badge>}
            <DropdownMenu>
              <DropdownMenuTrigger render={<Button variant="ghost" size="sm" />}>
                <Avatar className="size-6">
                  <AvatarFallback>{initials}</AvatarFallback>
                </Avatar>
                {profile.display_name}
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuLabel className="flex flex-col gap-0.5">
                  {profile.display_name}
                  <span className="text-xs font-normal text-muted-foreground">
                    {profile.email} · {profile.role === "admin" ? "Admin" : "Mitglied"}
                  </span>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuGroup>
                  <DropdownMenuItem onClick={logout}>
                    <LogOutIcon />
                    Abmelden
                  </DropdownMenuItem>
                </DropdownMenuGroup>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-4xl px-4 py-6">
        {view.name === "list" && (
          <EpicList
            backend={backend}
            profile={profile}
            onOpen={openEpic}
            onNew={() => setView({ name: "wizard", epic: null })}
          />
        )}
        {view.name === "users" && <UsersView backend={backend} profile={profile} />}
        {view.name === "wizard" && (
          <Wizard
            key={view.epic?.id ?? "new"}
            backend={backend}
            profile={profile}
            epic={view.epic}
            onBack={() => setView({ name: "list" })}
          />
        )}
      </main>
      <Toaster />
    </div>
  )
}

export default App
