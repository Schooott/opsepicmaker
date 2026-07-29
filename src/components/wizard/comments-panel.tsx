// Bereichsbezogene Kommentar-Seitenleiste: schiebt sich rechts neben den
// Inhalt (kein Overlay). Unterstützt Antworten (eine Ebene, eingerückt) sowie
// Bearbeiten und Löschen eigener Kommentare.
import { useEffect, useState } from "react"
import { CheckIcon, CornerDownRightIcon, MessageSquareIcon, PencilIcon, SendIcon, Trash2Icon, XIcon } from "lucide-react"

import type { CommentRec, Profile } from "@/lib/backend"
import type { PanelDef } from "@/lib/fields"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardAction } from "@/components/ui/card"
import { Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "@/components/ui/empty"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Separator } from "@/components/ui/separator"
import { Spinner } from "@/components/ui/spinner"
import { Textarea } from "@/components/ui/textarea"

function initials(name: string): string {
  return name.split(/\s+/).map(p => p[0]).filter(Boolean).slice(0, 2).join("").toUpperCase() || "?"
}

function formatTime(iso: string): string {
  return new Date(iso).toLocaleString("de-DE", { dateStyle: "short", timeStyle: "short" })
}

type Props = {
  panel: PanelDef
  comments: CommentRec[]
  loading: boolean
  profile: Profile
  onClose: () => void
  onAdd: (body: string, parentId: string | null) => Promise<void>
  onUpdate: (id: string, body: string) => Promise<void>
  onDelete: (id: string) => Promise<void>
}

function CommentItem({
  comment, profile, isReply, onReply, onUpdate, onDelete,
}: {
  comment: CommentRec
  profile: Profile
  isReply: boolean
  onReply?: () => void
  onUpdate: (id: string, body: string) => Promise<void>
  onDelete: (id: string) => Promise<void>
}) {
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(comment.body)
  const [busy, setBusy] = useState(false)
  const own = comment.author === profile.id
  const canDelete = own || profile.role === "admin"

  async function saveEdit() {
    if (!draft.trim()) return
    setBusy(true)
    try {
      await onUpdate(comment.id, draft.trim())
      setEditing(false)
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className={isReply ? "ml-7 border-l-2 pl-3" : ""}>
      <div className="flex gap-2.5">
        <Avatar className="size-6">
          <AvatarFallback>{initials(comment.author_name)}</AvatarFallback>
        </Avatar>
        <div className="flex min-w-0 flex-1 flex-col gap-1">
          <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
            <span className="text-sm font-medium">{comment.author_name}</span>
            <span className="text-xs text-muted-foreground">
              {formatTime(comment.created_at)}
              {comment.updated_at ? " · bearbeitet" : ""}
            </span>
          </div>
          {editing ? (
            <div className="flex flex-col gap-2">
              <Textarea rows={3} value={draft} onChange={e => setDraft(e.target.value)} disabled={busy} />
              <div className="flex gap-2">
                <Button size="xs" onClick={saveEdit} disabled={busy || !draft.trim()}>
                  {busy ? <Spinner data-icon="inline-start" /> : <CheckIcon data-icon="inline-start" />}
                  Speichern
                </Button>
                <Button size="xs" variant="ghost" onClick={() => { setEditing(false); setDraft(comment.body) }} disabled={busy}>
                  Abbrechen
                </Button>
              </div>
            </div>
          ) : (
            <p className="text-sm whitespace-pre-wrap">{comment.body}</p>
          )}
          {!editing && (
            <div className="flex items-center gap-1">
              {onReply && (
                <Button variant="ghost" size="xs" onClick={onReply}>
                  <CornerDownRightIcon data-icon="inline-start" />
                  Antworten
                </Button>
              )}
              {own && (
                <Button variant="ghost" size="icon-xs" aria-label="Kommentar bearbeiten" onClick={() => setEditing(true)}>
                  <PencilIcon />
                </Button>
              )}
              {canDelete && (
                <Button variant="ghost" size="icon-xs" aria-label="Kommentar löschen" onClick={() => onDelete(comment.id)}>
                  <Trash2Icon />
                </Button>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export function CommentsPanel({ panel, comments, loading, profile, onClose, onAdd, onUpdate, onDelete }: Props) {
  const [body, setBody] = useState("")
  const [replyTo, setReplyTo] = useState<CommentRec | null>(null)
  const [sending, setSending] = useState(false)

  // Beim Bereichswechsel Antwort-Kontext zurücksetzen
  useEffect(() => {
    setReplyTo(null)
  }, [panel.id])

  const topLevel = comments.filter(c => !c.parent_id)
  const repliesOf = (id: string) => comments.filter(c => c.parent_id === id)

  async function send() {
    if (!body.trim()) return
    setSending(true)
    try {
      await onAdd(body.trim(), replyTo?.id ?? null)
      setBody("")
      setReplyTo(null)
    } finally {
      setSending(false)
    }
  }

  return (
    <Card className="flex max-h-[calc(100svh-8.5rem)] flex-col animate-in slide-in-from-right-4 fade-in duration-200">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <MessageSquareIcon className="text-muted-foreground" />
          Kommentare
        </CardTitle>
        <CardDescription className="truncate">{panel.title}</CardDescription>
        <CardAction>
          <Button variant="ghost" size="icon" aria-label="Kommentare schließen" onClick={onClose}>
            <XIcon />
          </Button>
        </CardAction>
      </CardHeader>
      <CardContent className="flex min-h-0 flex-1 flex-col gap-3">
        <ScrollArea className="min-h-0 flex-1 -mx-2 px-2">
          {loading ? (
            <div className="flex justify-center py-8">
              <Spinner />
            </div>
          ) : topLevel.length === 0 ? (
            <Empty className="py-8">
              <EmptyHeader>
                <EmptyMedia variant="icon">
                  <MessageSquareIcon />
                </EmptyMedia>
                <EmptyTitle>Noch keine Kommentare</EmptyTitle>
                <EmptyDescription>Hinterlasse den ersten Kommentar zu diesem Bereich.</EmptyDescription>
              </EmptyHeader>
            </Empty>
          ) : (
            <div className="flex flex-col gap-4 py-1">
              {topLevel.map(c => (
                <div key={c.id} className="flex flex-col gap-3">
                  <CommentItem
                    comment={c}
                    profile={profile}
                    isReply={false}
                    onReply={() => setReplyTo(c)}
                    onUpdate={onUpdate}
                    onDelete={onDelete}
                  />
                  {repliesOf(c.id).map(r => (
                    <CommentItem key={r.id} comment={r} profile={profile} isReply onUpdate={onUpdate} onDelete={onDelete} />
                  ))}
                </div>
              ))}
            </div>
          )}
        </ScrollArea>
        <Separator />
        <div className="flex flex-col gap-2">
          {replyTo && (
            <div className="flex items-center gap-2 rounded-md bg-muted px-2.5 py-1.5 text-xs text-muted-foreground">
              <CornerDownRightIcon className="size-3.5" />
              <span className="min-w-0 flex-1 truncate">Antwort auf {replyTo.author_name}: „{replyTo.body}“</span>
              <Button variant="ghost" size="icon-xs" aria-label="Antwort verwerfen" onClick={() => setReplyTo(null)}>
                <XIcon />
              </Button>
            </div>
          )}
          <Textarea
            placeholder={replyTo ? "Antwort schreiben …" : "Kommentar schreiben …"}
            rows={3}
            value={body}
            onChange={e => setBody(e.target.value)}
            onKeyDown={e => {
              if ((e.metaKey || e.ctrlKey) && e.key === "Enter") send()
            }}
          />
          <div className="flex justify-end">
            <Button size="sm" onClick={send} disabled={sending || !body.trim()}>
              {sending ? <Spinner data-icon="inline-start" /> : <SendIcon data-icon="inline-start" />}
              {replyTo ? "Antworten" : "Senden"}
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
