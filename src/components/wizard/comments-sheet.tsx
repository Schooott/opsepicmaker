// Kommentar-Sidebar (Sheet) für ein gespeichertes Epic.
import { useCallback, useEffect, useState } from "react"
import { MessageSquareIcon, RefreshCwIcon, SendIcon, Trash2Icon } from "lucide-react"
import { toast } from "sonner"

import type { Backend, CommentRec, Profile } from "@/lib/backend"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "@/components/ui/empty"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet"
import { Spinner } from "@/components/ui/spinner"
import { Textarea } from "@/components/ui/textarea"

function initials(name: string): string {
  return name.split(/\s+/).map(p => p[0]).filter(Boolean).slice(0, 2).join("").toUpperCase() || "?"
}

function formatTime(iso: string): string {
  return new Date(iso).toLocaleString("de-DE", { dateStyle: "short", timeStyle: "short" })
}

type Props = {
  backend: Backend
  profile: Profile
  epicId: string | null
  epicTitle: string
  onCountChange?: (n: number) => void
}

export function CommentsSheet({ backend, profile, epicId, epicTitle, onCountChange }: Props) {
  const [open, setOpen] = useState(false)
  const [comments, setComments] = useState<CommentRec[]>([])
  const [loading, setLoading] = useState(false)
  const [sending, setSending] = useState(false)
  const [body, setBody] = useState("")

  const load = useCallback(async () => {
    if (!epicId) return
    setLoading(true)
    try {
      const list = await backend.listComments(epicId)
      setComments(list)
      onCountChange?.(list.length)
    } catch (e) {
      toast.error(e instanceof Error ? e.message : String(e))
    } finally {
      setLoading(false)
    }
  }, [backend, epicId, onCountChange])

  useEffect(() => {
    if (open) load()
  }, [open, load])

  async function send() {
    if (!epicId || !body.trim()) return
    setSending(true)
    try {
      await backend.addComment(epicId, body.trim())
      setBody("")
      await load()
    } catch (e) {
      toast.error(e instanceof Error ? e.message : String(e))
    } finally {
      setSending(false)
    }
  }

  async function remove(id: string) {
    try {
      await backend.deleteComment(id)
      await load()
    } catch (e) {
      toast.error(e instanceof Error ? e.message : String(e))
    }
  }

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger
        render={<Button variant="outline" disabled={!epicId} title={epicId ? undefined : "Bitte das Epic zuerst speichern"} />}
      >
        <MessageSquareIcon data-icon="inline-start" />
        Kommentare
      </SheetTrigger>
      <SheetContent side="right" className="flex w-full flex-col sm:max-w-md">
        <SheetHeader>
          <SheetTitle>Kommentare</SheetTitle>
          <SheetDescription className="truncate">{epicTitle || "Epic"}</SheetDescription>
        </SheetHeader>
        <div className="flex min-h-0 flex-1 flex-col gap-3 px-4 pb-4">
          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">{comments.length} Kommentar{comments.length === 1 ? "" : "e"}</p>
            <Button variant="ghost" size="sm" onClick={load} disabled={loading}>
              {loading ? <Spinner data-icon="inline-start" /> : <RefreshCwIcon data-icon="inline-start" />}
              Aktualisieren
            </Button>
          </div>
          <ScrollArea className="min-h-0 flex-1 rounded-lg border">
            {comments.length === 0 ? (
              <Empty>
                <EmptyHeader>
                  <EmptyMedia variant="icon">
                    <MessageSquareIcon />
                  </EmptyMedia>
                  <EmptyTitle>Noch keine Kommentare</EmptyTitle>
                  <EmptyDescription>Hinterlasse den ersten Kommentar zu diesem Epic.</EmptyDescription>
                </EmptyHeader>
              </Empty>
            ) : (
              <div className="flex flex-col gap-4 p-3">
                {comments.map(c => (
                  <div key={c.id} className="flex gap-3">
                    <Avatar className="size-8">
                      <AvatarFallback>{initials(c.author_name)}</AvatarFallback>
                    </Avatar>
                    <div className="flex min-w-0 flex-1 flex-col gap-1">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium">{c.author_name}</span>
                        <span className="text-xs text-muted-foreground">{formatTime(c.created_at)}</span>
                        {(c.author === profile.id || profile.role === "admin") && (
                          <Button
                            variant="ghost"
                            size="icon-xs"
                            className="ml-auto"
                            aria-label="Kommentar löschen"
                            onClick={() => remove(c.id)}
                          >
                            <Trash2Icon />
                          </Button>
                        )}
                      </div>
                      <p className="text-sm whitespace-pre-wrap">{c.body}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </ScrollArea>
          <div className="flex flex-col gap-2">
            <Textarea
              placeholder="Kommentar schreiben …"
              rows={3}
              value={body}
              onChange={e => setBody(e.target.value)}
              onKeyDown={e => {
                if ((e.metaKey || e.ctrlKey) && e.key === "Enter") send()
              }}
            />
            <div className="flex justify-end">
              <Button onClick={send} disabled={sending || !body.trim()}>
                {sending ? <Spinner data-icon="inline-start" /> : <SendIcon data-icon="inline-start" />}
                Senden
              </Button>
            </div>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  )
}
