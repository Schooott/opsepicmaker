// Übersicht aller gespeicherten Epics des Teams.
import { useCallback, useEffect, useState } from "react"
import { FilePlus2Icon, MessageSquareIcon, PencilIcon, Trash2Icon } from "lucide-react"
import { toast } from "sonner"

import type { Backend, EpicMeta, Profile } from "@/lib/backend"
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription,
  AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Empty, EmptyContent, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "@/components/ui/empty"
import { Skeleton } from "@/components/ui/skeleton"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"

function formatTime(iso: string): string {
  return new Date(iso).toLocaleString("de-DE", { dateStyle: "medium", timeStyle: "short" })
}

type Props = {
  backend: Backend
  profile: Profile
  onOpen: (id: string) => void
  onNew: () => void
}

export function EpicList({ backend, profile, onOpen, onNew }: Props) {
  const [epics, setEpics] = useState<EpicMeta[] | null>(null)

  const load = useCallback(async () => {
    try {
      setEpics(await backend.listEpics())
    } catch (e) {
      toast.error("Laden fehlgeschlagen: " + (e instanceof Error ? e.message : String(e)))
      setEpics([])
    }
  }, [backend])

  useEffect(() => {
    load()
  }, [load])

  async function remove(id: string) {
    try {
      await backend.deleteEpic(id)
      toast.success("Epic gelöscht")
      load()
    } catch (e) {
      toast.error("Löschen fehlgeschlagen: " + (e instanceof Error ? e.message : String(e)))
    }
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex flex-col gap-1.5">
            <CardTitle>Epics</CardTitle>
            <CardDescription>Gespeicherte Entwürfe des Teams – öffnen, weiterbearbeiten, kommentieren.</CardDescription>
          </div>
          <Button onClick={onNew}>
            <FilePlus2Icon data-icon="inline-start" />
            Neues Epic
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {epics === null ? (
          <div className="flex flex-col gap-2">
            <Skeleton className="h-9 w-full" />
            <Skeleton className="h-9 w-full" />
            <Skeleton className="h-9 w-full" />
          </div>
        ) : epics.length === 0 ? (
          <Empty>
            <EmptyHeader>
              <EmptyMedia variant="icon">
                <FilePlus2Icon />
              </EmptyMedia>
              <EmptyTitle>Noch keine Epics</EmptyTitle>
              <EmptyDescription>Lege das erste Epic an – die KI hilft beim Vorbefüllen.</EmptyDescription>
            </EmptyHeader>
            <EmptyContent>
              <Button onClick={onNew}>
                <FilePlus2Icon data-icon="inline-start" />
                Neues Epic
              </Button>
            </EmptyContent>
          </Empty>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Titel</TableHead>
                <TableHead>Autor:in</TableHead>
                <TableHead>Aktualisiert</TableHead>
                <TableHead className="text-center">Kommentare</TableHead>
                <TableHead className="text-right">Aktionen</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {epics.map(e => {
                const canDelete = e.created_by === profile.id || profile.role === "admin"
                return (
                  <TableRow key={e.id} className="cursor-pointer" onClick={() => onOpen(e.id)}>
                    <TableCell className="max-w-64 truncate font-medium">{e.title}</TableCell>
                    <TableCell>{e.creator_name}</TableCell>
                    <TableCell className="text-muted-foreground">{formatTime(e.updated_at)}</TableCell>
                    <TableCell className="text-center">
                      <Badge variant="secondary">
                        <MessageSquareIcon /> {e.comment_count}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right" onClick={ev => ev.stopPropagation()}>
                      <div className="flex justify-end gap-1">
                        <Button variant="ghost" size="icon" aria-label="Bearbeiten" onClick={() => onOpen(e.id)}>
                          <PencilIcon />
                        </Button>
                        {canDelete && (
                          <AlertDialog>
                            <AlertDialogTrigger render={<Button variant="ghost" size="icon" aria-label="Löschen" />}>
                              <Trash2Icon />
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Epic löschen?</AlertDialogTitle>
                                <AlertDialogDescription>
                                  „{e.title}“ wird mitsamt allen Kommentaren dauerhaft gelöscht. Das kann nicht rückgängig
                                  gemacht werden.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Abbrechen</AlertDialogCancel>
                                <AlertDialogAction onClick={() => remove(e.id)}>Löschen</AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  )
}
