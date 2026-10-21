// Datenschicht: identisches Interface für Supabase (Produktion) und einen
// lokalen Demo-Modus (localStorage), der aktiv ist, solange in config.ts
// keine Supabase-Zugangsdaten hinterlegt sind.
import { createClient, type SupabaseClient } from "@supabase/supabase-js"
import { SUPABASE_ANON_KEY, SUPABASE_URL, USERNAME_EMAIL_DOMAIN, supabaseConfigured } from "@/config"
import { AI_MODELS, type StorySuggestion } from "./ai"
import { completionPercent, type Sources, type Values } from "./fields"

const DEFAULT_AI_MODEL = AI_MODELS[0].value

function validAiModel(v: unknown): string {
  return typeof v === "string" && AI_MODELS.some(m => m.value === v) ? v : DEFAULT_AI_MODEL
}

// Benutzername <-> interne E-Mail (Supabase Auth ist E-Mail-basiert).
// Eingaben mit "@" werden unverändert als E-Mail behandelt.
export function loginToEmail(login: string): string {
  const t = login.trim()
  return t.includes("@") ? t : `${t.toLowerCase()}@${USERNAME_EMAIL_DOMAIN}`
}
export function emailToUsername(email: string): string {
  const suffix = "@" + USERNAME_EMAIL_DOMAIN
  return email.endsWith(suffix) ? email.slice(0, -suffix.length) : email
}

export type Profile = {
  id: string
  email: string
  display_name: string
  avatar_url?: string | null
  role: "admin" | "member"
  approved: boolean
  created_at?: string
}

export type EpicData = { values: Values; source: Sources; idea: string; stories?: StorySuggestion[]; okr_id?: string | null }

export type OkrStatus = "aktiv" | "archiviert"

export type Okr = {
  id: string
  objective: string
  description: string
  key_results: string[]
  quarter: string
  status: OkrStatus
  created_by: string
  creator_name: string
  created_at: string
  updated_at: string
}

export type OkrInput = {
  objective: string
  description: string
  key_results: string[]
  quarter: string
  status: OkrStatus
}

export type EpicStatus = "entwurf" | "abgeschlossen"

export type EpicMeta = {
  id: string
  title: string
  status: EpicStatus
  created_at: string
  updated_at: string
  created_by: string
  creator_name: string
  creator_avatar?: string | null
  comment_count: number
  /** Ausfüllstand der Pflichtfelder in Prozent (0–100) */
  progress: number
  /** Referenzierte OKR (aus den Epic-Daten) */
  okr_id?: string | null
}

export type EpicRecord = EpicMeta & {
  data: EpicData
  updated_by?: string | null
  updated_by_name?: string | null
}

/** Nutzer, die ein Epic gerade geöffnet haben (Realtime Presence) */
export type PresenceUser = { id: string; name: string; avatar?: string | null }

export type WatchedTable = "epics" | "comments" | "profiles" | "ai_requests" | "okrs" | "todos"

export type Todo = {
  id: string
  text: string
  done: boolean
  created_by: string
  creator_name: string
  creator_avatar?: string | null
  created_at: string
}

export type AdminStats = {
  aiRequestsMonth: number
  aiRequestsYear: number
  epicsMonth: number
  epicsYear: number
  epicsTotal: number
  /** Anteil KI-befüllter Felder an allen befüllten Feldern, in Prozent (0–100) */
  aiFieldShare: number
}

/** Epic-bezogene Statistik aus (created_at, data)-Zeilen berechnen */
function epicStats(rows: Array<{ created_at: string; data: EpicData | null }>): Pick<AdminStats, "epicsMonth" | "epicsYear" | "epicsTotal" | "aiFieldShare"> {
  const now = new Date()
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1)
  const yearStart = new Date(now.getFullYear(), 0, 1)
  let ai = 0
  let user = 0
  let epicsMonth = 0
  let epicsYear = 0
  for (const r of rows) {
    const created = new Date(r.created_at)
    if (created >= monthStart) epicsMonth++
    if (created >= yearStart) epicsYear++
    for (const src of Object.values(r.data?.source ?? {})) {
      if (src === "ai") ai++
      else user++
    }
  }
  const filled = ai + user
  return {
    epicsMonth,
    epicsYear,
    epicsTotal: rows.length,
    aiFieldShare: filled === 0 ? 0 : Math.round((ai / filled) * 100),
  }
}

export type CommentRec = {
  id: string
  epic_id: string
  author: string
  author_name: string
  author_avatar?: string | null
  body: string
  /** Panel-ID des Templates, zu dem der Kommentar gehört */
  section: string
  /** Gesetzt bei Antworten (eine Ebene) */
  parent_id: string | null
  created_at: string
  /** Gesetzt, wenn nachträglich bearbeitet */
  updated_at: string | null
}

export interface Backend {
  kind: "supabase" | "demo"
  restoreSession(): Promise<Profile | null>
  /** login = Benutzername oder vollständige E-Mail */
  signIn(login: string, password: string): Promise<Profile>
  signOut(): Promise<void>
  /** Access-Token der aktuellen Session (für Edge-Function-Aufrufe); null im Demo-Modus */
  getAccessToken(): Promise<string | null>
  listEpics(): Promise<EpicMeta[]>
  getEpic(id: string): Promise<EpicRecord>
  createEpic(title: string, data: EpicData, status: EpicStatus): Promise<string>
  updateEpic(id: string, title: string, data: EpicData, status: EpicStatus): Promise<void>
  deleteEpic(id: string): Promise<void>
  listComments(epicId: string): Promise<CommentRec[]>
  addComment(epicId: string, section: string, body: string, parentId?: string | null): Promise<void>
  updateComment(id: string, body: string): Promise<void>
  deleteComment(id: string): Promise<void>
  listProfiles(): Promise<Profile[]>
  /** login = Benutzername oder vollständige E-Mail */
  createUser(name: string, login: string, password: string): Promise<void>
  updateProfile(id: string, patch: Partial<Pick<Profile, "role" | "approved" | "display_name">>): Promise<void>
  /** Nutzungs-Statistik für den Admin-Bereich */
  getAdminStats(): Promise<AdminStats>
  /** Team-weit konfiguriertes KI-Modell */
  getAiModel(): Promise<string>
  setAiModel(model: string): Promise<void>
  /** Eigenes Passwort ändern */
  changePassword(newPassword: string): Promise<void>
  /** Eigenen Avatar hochladen (bereits verkleinertes JPEG); liefert die neue URL */
  uploadAvatar(blob: Blob): Promise<string>
  listOkrs(): Promise<Okr[]>
  createOkr(input: OkrInput): Promise<string>
  updateOkr(id: string, input: OkrInput): Promise<void>
  deleteOkr(id: string): Promise<void>
  listTodos(): Promise<Todo[]>
  addTodo(text: string): Promise<void>
  updateTodo(id: string, patch: Partial<Pick<Todo, "text" | "done">>): Promise<void>
  deleteTodo(id: string): Promise<void>
  /** Ungelesene fremde Kommentare je Epic (für die Übersicht) */
  getUnreadCommentCounts(): Promise<Record<string, number>>
  /** Eigener Lese-Status je Bereich eines Epics: section → last_read_at (ISO) */
  getReadMarks(epicId: string): Promise<Record<string, string>>
  /** Bereich als gelesen markieren (jetzt) */
  markSectionRead(epicId: string, section: string): Promise<void>
  /** Live-Updates: onChange feuert bei jeder Änderung an einer der Tabellen; liefert Unsubscribe */
  subscribeChanges(tables: WatchedTable[], onChange: (table: WatchedTable) => void): () => void
  /** Presence: meldet, wer (außer der eigenen Person) das Epic gerade geöffnet hat; liefert Leave-Funktion */
  joinEpicPresence(epicId: string, onOthers: (users: PresenceUser[]) => void): () => void
}

/* ------------------------------ Supabase ------------------------------ */

class SupabaseBackend implements Backend {
  kind = "supabase" as const
  private sb: SupabaseClient
  private sbSignup: SupabaseClient
  private me: Profile | null = null

  constructor() {
    this.sb = createClient(SUPABASE_URL, SUPABASE_ANON_KEY)
    // Zweiter Client ohne Session-Persistenz: Nutzer anlegen (signUp),
    // ohne die Admin-Session des Hauptclients zu ersetzen.
    this.sbSignup = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      auth: { persistSession: false, autoRefreshToken: false, storageKey: "sb-signup" },
    })
  }

  private async loadProfile(userId: string): Promise<Profile> {
    const { data, error } = await this.sb.from("profiles").select("*").eq("id", userId).single()
    if (error) throw new Error(error.message)
    return data as Profile
  }

  async restoreSession(): Promise<Profile | null> {
    const { data } = await this.sb.auth.getSession()
    if (!data.session) return null
    this.me = await this.loadProfile(data.session.user.id)
    return this.me
  }

  async signIn(login: string, password: string): Promise<Profile> {
    const { data, error } = await this.sb.auth.signInWithPassword({ email: loginToEmail(login), password })
    if (error) throw new Error(error.message === "Invalid login credentials" ? "Benutzername oder Passwort ist falsch." : error.message)
    this.me = await this.loadProfile(data.user.id)
    if (!this.me.approved) {
      await this.sb.auth.signOut()
      throw new Error("Dieses Konto ist noch nicht freigeschaltet. Bitte an eine Admin-Person wenden.")
    }
    return this.me
  }

  async signOut(): Promise<void> {
    await this.sb.auth.signOut()
    this.me = null
  }

  async getAccessToken(): Promise<string | null> {
    const { data } = await this.sb.auth.getSession()
    return data.session?.access_token ?? null
  }

  async listEpics(): Promise<EpicMeta[]> {
    const { data, error } = await this.sb
      .from("epics")
      .select("id,title,status,data,created_at,updated_at,created_by,creator:profiles!epics_created_by_fkey(display_name,avatar_url),comments(count)")
      .order("updated_at", { ascending: false })
    if (error) throw new Error(error.message)
    type Row = {
      id: string; title: string; status: EpicStatus; data: EpicData; created_at: string; updated_at: string; created_by: string
      creator: { display_name: string; avatar_url: string | null } | null
      comments: { count: number }[]
    }
    return (data as unknown as Row[]).map(r => ({
      id: r.id, title: r.title, status: r.status, created_at: r.created_at, updated_at: r.updated_at, created_by: r.created_by,
      creator_name: r.creator?.display_name ?? "?",
      creator_avatar: r.creator?.avatar_url ?? null,
      comment_count: r.comments?.[0]?.count ?? 0,
      progress: completionPercent(r.data?.values ?? {}),
      okr_id: r.data?.okr_id ?? null,
    }))
  }

  async getEpic(id: string): Promise<EpicRecord> {
    const { data, error } = await this.sb
      .from("epics")
      .select("id,title,status,data,created_at,updated_at,created_by,updated_by,creator:profiles!epics_created_by_fkey(display_name),updater:profiles!epics_updated_by_fkey(display_name),comments(count)")
      .eq("id", id)
      .single()
    if (error) throw new Error(error.message)
    const r = data as unknown as { id: string; title: string; status: EpicStatus; data: EpicData; created_at: string; updated_at: string; created_by: string; updated_by: string | null; creator: { display_name: string } | null; updater: { display_name: string } | null; comments: { count: number }[] }
    return {
      id: r.id, title: r.title, status: r.status, data: r.data, created_at: r.created_at, updated_at: r.updated_at,
      created_by: r.created_by, creator_name: r.creator?.display_name ?? "?",
      updated_by: r.updated_by, updated_by_name: r.updater?.display_name ?? null,
      comment_count: r.comments?.[0]?.count ?? 0,
      progress: completionPercent(r.data?.values ?? {}),
    }
  }

  async createEpic(title: string, data: EpicData, status: EpicStatus): Promise<string> {
    if (!this.me) throw new Error("Nicht angemeldet.")
    const { data: row, error } = await this.sb
      .from("epics")
      .insert({ title, data, status, created_by: this.me.id, updated_by: this.me.id })
      .select("id")
      .single()
    if (error) throw new Error(error.message)
    return row.id as string
  }

  async updateEpic(id: string, title: string, data: EpicData, status: EpicStatus): Promise<void> {
    if (!this.me) throw new Error("Nicht angemeldet.")
    const { error } = await this.sb
      .from("epics")
      .update({ title, data, status, updated_by: this.me.id, updated_at: new Date().toISOString() })
      .eq("id", id)
    if (error) throw new Error(error.message)
  }

  async deleteEpic(id: string): Promise<void> {
    const { error } = await this.sb.from("epics").delete().eq("id", id)
    if (error) throw new Error(error.message)
  }

  async listComments(epicId: string): Promise<CommentRec[]> {
    const { data, error } = await this.sb
      .from("comments")
      .select("id,epic_id,author,body,section,parent_id,created_at,updated_at,profile:profiles!comments_author_fkey(display_name,avatar_url)")
      .eq("epic_id", epicId)
      .order("created_at", { ascending: true })
    if (error) throw new Error(error.message)
    type Row = {
      id: string; epic_id: string; author: string; body: string; section: string
      parent_id: string | null; created_at: string; updated_at: string | null
      profile: { display_name: string; avatar_url: string | null } | null
    }
    return (data as unknown as Row[]).map(r => ({
      id: r.id, epic_id: r.epic_id, author: r.author, body: r.body, section: r.section,
      parent_id: r.parent_id, created_at: r.created_at, updated_at: r.updated_at,
      author_name: r.profile?.display_name ?? "?",
      author_avatar: r.profile?.avatar_url ?? null,
    }))
  }

  async addComment(epicId: string, section: string, body: string, parentId?: string | null): Promise<void> {
    if (!this.me) throw new Error("Nicht angemeldet.")
    const { error } = await this.sb.from("comments").insert({
      epic_id: epicId, author: this.me.id, body, section, parent_id: parentId ?? null,
    })
    if (error) throw new Error(error.message)
  }

  async updateComment(id: string, body: string): Promise<void> {
    const { error } = await this.sb.from("comments").update({ body, updated_at: new Date().toISOString() }).eq("id", id)
    if (error) throw new Error(error.message)
  }

  async deleteComment(id: string): Promise<void> {
    const { error } = await this.sb.from("comments").delete().eq("id", id)
    if (error) throw new Error(error.message)
  }

  async listProfiles(): Promise<Profile[]> {
    const { data, error } = await this.sb.from("profiles").select("*").order("created_at", { ascending: true })
    if (error) throw new Error(error.message)
    return data as Profile[]
  }

  async createUser(name: string, login: string, password: string): Promise<void> {
    const { data, error } = await this.sbSignup.auth.signUp({
      email: loginToEmail(login), password,
      options: { data: { display_name: name } },
    })
    if (error) throw new Error(error.message)
    const uid = data.user?.id
    if (uid) {
      // Vom Admin angelegte Konten sind direkt freigeschaltet.
      const { error: e2 } = await this.sb.from("profiles").update({ approved: true, display_name: name }).eq("id", uid)
      if (e2) throw new Error(e2.message)
    }
  }

  async updateProfile(id: string, patch: Partial<Pick<Profile, "role" | "approved" | "display_name">>): Promise<void> {
    const { error } = await this.sb.from("profiles").update(patch).eq("id", id)
    if (error) throw new Error(error.message)
  }

  async listOkrs(): Promise<Okr[]> {
    const { data, error } = await this.sb
      .from("okrs")
      .select("id,objective,description,key_results,quarter,status,created_by,created_at,updated_at,creator:profiles!okrs_created_by_fkey(display_name)")
      .order("quarter", { ascending: false })
      .order("created_at", { ascending: true })
    if (error) throw new Error(error.message)
    type Row = Omit<Okr, "creator_name" | "key_results"> & { key_results: unknown; creator: { display_name: string } | null }
    return (data as unknown as Row[]).map(r => ({
      ...r,
      key_results: Array.isArray(r.key_results) ? r.key_results.map(String) : [],
      creator_name: r.creator?.display_name ?? "?",
    }))
  }

  async createOkr(input: OkrInput): Promise<string> {
    if (!this.me) throw new Error("Nicht angemeldet.")
    const { data, error } = await this.sb
      .from("okrs")
      .insert({ ...input, created_by: this.me.id })
      .select("id")
      .single()
    if (error) throw new Error(error.message)
    return (data as { id: string }).id
  }

  async updateOkr(id: string, input: OkrInput): Promise<void> {
    const { error } = await this.sb
      .from("okrs")
      .update({ ...input, updated_at: new Date().toISOString() })
      .eq("id", id)
    if (error) throw new Error(error.message)
  }

  async deleteOkr(id: string): Promise<void> {
    const { error } = await this.sb.from("okrs").delete().eq("id", id)
    if (error) throw new Error(error.message)
  }

  async listTodos(): Promise<Todo[]> {
    const { data, error } = await this.sb
      .from("todos")
      .select("id,text,done,created_by,created_at,creator:profiles!todos_created_by_fkey(display_name,avatar_url)")
      .order("created_at", { ascending: false })
    if (error) throw new Error(error.message)
    type Row = Omit<Todo, "creator_name" | "creator_avatar"> & { creator: { display_name: string; avatar_url: string | null } | null }
    return (data as unknown as Row[]).map(r => ({
      id: r.id, text: r.text, done: r.done, created_by: r.created_by, created_at: r.created_at,
      creator_name: r.creator?.display_name ?? "?",
      creator_avatar: r.creator?.avatar_url ?? null,
    }))
  }

  async addTodo(text: string): Promise<void> {
    if (!this.me) throw new Error("Nicht angemeldet.")
    const { error } = await this.sb.from("todos").insert({ text, created_by: this.me.id })
    if (error) throw new Error(error.message)
  }

  async updateTodo(id: string, patch: Partial<Pick<Todo, "text" | "done">>): Promise<void> {
    const { error } = await this.sb.from("todos").update(patch).eq("id", id)
    if (error) throw new Error(error.message)
  }

  async deleteTodo(id: string): Promise<void> {
    const { error } = await this.sb.from("todos").delete().eq("id", id)
    if (error) throw new Error(error.message)
  }

  async getUnreadCommentCounts(): Promise<Record<string, number>> {
    if (!this.me) return {}
    const [commentsRes, readsRes] = await Promise.all([
      this.sb.from("comments").select("epic_id,section,author,created_at"),
      this.sb.from("comment_reads").select("epic_id,section,last_read_at"),
    ])
    if (commentsRes.error) throw new Error(commentsRes.error.message)
    if (readsRes.error) throw new Error(readsRes.error.message)
    const reads = new Map<string, string>()
    for (const r of readsRes.data ?? []) reads.set(`${r.epic_id}:${r.section}`, r.last_read_at)
    const counts: Record<string, number> = {}
    for (const c of commentsRes.data ?? []) {
      if (c.author === this.me.id) continue
      const mark = reads.get(`${c.epic_id}:${c.section}`)
      if (mark && c.created_at <= mark) continue
      counts[c.epic_id] = (counts[c.epic_id] ?? 0) + 1
    }
    return counts
  }

  async getReadMarks(epicId: string): Promise<Record<string, string>> {
    const { data, error } = await this.sb.from("comment_reads").select("section,last_read_at").eq("epic_id", epicId)
    if (error) throw new Error(error.message)
    return Object.fromEntries((data ?? []).map(r => [r.section, r.last_read_at]))
  }

  async markSectionRead(epicId: string, section: string): Promise<void> {
    if (!this.me) return
    const { error } = await this.sb
      .from("comment_reads")
      .upsert({ user_id: this.me.id, epic_id: epicId, section, last_read_at: new Date().toISOString() }, { onConflict: "user_id,epic_id,section" })
    if (error) throw new Error(error.message)
  }

  subscribeChanges(tables: WatchedTable[], onChange: (table: WatchedTable) => void): () => void {
    const ch = this.sb.channel("db-changes-" + crypto.randomUUID())
    for (const t of tables) {
      ch.on("postgres_changes", { event: "*", schema: "public", table: t }, () => onChange(t))
    }
    ch.subscribe()
    return () => {
      void this.sb.removeChannel(ch)
    }
  }

  joinEpicPresence(epicId: string, onOthers: (users: PresenceUser[]) => void): () => void {
    const me = this.me
    if (!me) return () => {}
    const ch = this.sb.channel(`presence-epic-${epicId}`, { config: { presence: { key: me.id } } })
    ch.on("presence", { event: "sync" }, () => {
      const state = ch.presenceState<{ name: string; avatar: string | null }>()
      onOthers(
        Object.entries(state)
          .filter(([key]) => key !== me.id)
          .map(([key, metas]) => ({ id: key, name: metas[0]?.name ?? "?", avatar: metas[0]?.avatar ?? null })),
      )
    })
    ch.subscribe(s => {
      if (s === "SUBSCRIBED") void ch.track({ name: me.display_name, avatar: me.avatar_url ?? null })
    })
    return () => {
      void this.sb.removeChannel(ch)
    }
  }

  async getAdminStats(): Promise<AdminStats> {
    const now = new Date()
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString()
    const yearStart = new Date(now.getFullYear(), 0, 1).toISOString()
    const [aiMonth, aiYear, epicsRes] = await Promise.all([
      this.sb.from("ai_requests").select("id", { count: "exact", head: true }).gte("created_at", monthStart),
      this.sb.from("ai_requests").select("id", { count: "exact", head: true }).gte("created_at", yearStart),
      this.sb.from("epics").select("created_at,data"),
    ])
    if (aiMonth.error) throw new Error(aiMonth.error.message)
    if (aiYear.error) throw new Error(aiYear.error.message)
    if (epicsRes.error) throw new Error(epicsRes.error.message)
    return {
      aiRequestsMonth: aiMonth.count ?? 0,
      aiRequestsYear: aiYear.count ?? 0,
      ...epicStats((epicsRes.data ?? []) as Array<{ created_at: string; data: EpicData | null }>),
    }
  }

  async getAiModel(): Promise<string> {
    const { data } = await this.sb.from("app_settings").select("value").eq("key", "ai_model").maybeSingle()
    return validAiModel(data?.value)
  }

  async setAiModel(model: string): Promise<void> {
    if (!this.me) throw new Error("Nicht angemeldet.")
    const { error } = await this.sb.from("app_settings").upsert({
      key: "ai_model",
      value: validAiModel(model),
      updated_at: new Date().toISOString(),
      updated_by: this.me.id,
    })
    if (error) throw new Error(error.message)
  }

  async changePassword(newPassword: string): Promise<void> {
    const { error } = await this.sb.auth.updateUser({ password: newPassword })
    if (error) throw new Error(error.message)
  }

  async uploadAvatar(blob: Blob): Promise<string> {
    if (!this.me) throw new Error("Nicht angemeldet.")
    const path = `${this.me.id}.jpg`
    const { error } = await this.sb.storage.from("avatars").upload(path, blob, {
      upsert: true,
      contentType: "image/jpeg",
      cacheControl: "3600",
    })
    if (error) throw new Error(error.message)
    // Versions-Parameter, damit Browser-Caches den neuen Avatar laden
    const { data } = this.sb.storage.from("avatars").getPublicUrl(path)
    const url = `${data.publicUrl}?v=${Date.now()}`
    const { error: e2 } = await this.sb.rpc("update_own_profile", { new_avatar_url: url })
    if (e2) throw new Error(e2.message)
    this.me = { ...this.me, avatar_url: url }
    return url
  }
}

/* ------------------------------ Demo (lokal) ------------------------------ */

const DEMO_KEY = "opsepic.demo.v2"
export const DEMO_LOGIN = { username: "admin", password: "demo" }

type DemoStore = {
  users: Array<Profile & { password: string }>
  epics: Array<{ id: string; title: string; data: EpicData; status?: EpicStatus; created_by: string; created_at: string; updated_at: string }>
  comments: CommentRec[]
  session: string | null
  settings?: Record<string, string>
  reads?: Array<{ user_id: string; epic_id: string; section: string; last_read_at: string }>
  okrs?: Array<Omit<Okr, "creator_name">>
  todos?: Array<Omit<Todo, "creator_name" | "creator_avatar">>
}

class DemoBackend implements Backend {
  kind = "demo" as const
  private me: Profile | null = null

  private read(): DemoStore {
    const raw = localStorage.getItem(DEMO_KEY)
    if (raw) return JSON.parse(raw) as DemoStore
    const store: DemoStore = {
      users: [{ id: "u-admin", email: loginToEmail(DEMO_LOGIN.username), display_name: "Demo Admin", role: "admin", approved: true, password: DEMO_LOGIN.password, created_at: new Date().toISOString() }],
      epics: [], comments: [], session: null,
    }
    localStorage.setItem(DEMO_KEY, JSON.stringify(store))
    return store
  }

  private write(store: DemoStore) {
    localStorage.setItem(DEMO_KEY, JSON.stringify(store))
  }

  private profileOf(u: Profile & { password: string }): Profile {
    const p: Profile & { password?: string } = { ...u }
    delete p.password
    return p
  }

  async restoreSession(): Promise<Profile | null> {
    const store = this.read()
    const u = store.users.find(x => x.id === store.session)
    this.me = u ? this.profileOf(u) : null
    return this.me
  }

  async signIn(login: string, password: string): Promise<Profile> {
    const store = this.read()
    const email = loginToEmail(login)
    const u = store.users.find(x => x.email.toLowerCase() === email.toLowerCase())
    if (!u || u.password !== password) throw new Error("Benutzername oder Passwort ist falsch.")
    if (!u.approved) throw new Error("Dieses Konto ist noch nicht freigeschaltet.")
    store.session = u.id
    this.write(store)
    this.me = this.profileOf(u)
    return this.me
  }

  async signOut(): Promise<void> {
    const store = this.read()
    store.session = null
    this.write(store)
    this.me = null
  }

  async getAccessToken(): Promise<string | null> {
    return null
  }

  private meta(store: DemoStore, e: DemoStore["epics"][number]): EpicMeta {
    const creator = store.users.find(u => u.id === e.created_by)
    return {
      id: e.id, title: e.title, status: e.status ?? "entwurf",
      created_at: e.created_at, updated_at: e.updated_at, created_by: e.created_by,
      creator_name: creator?.display_name ?? "?",
      creator_avatar: creator?.avatar_url ?? null,
      comment_count: store.comments.filter(c => c.epic_id === e.id).length,
      progress: completionPercent(e.data?.values ?? {}),
      okr_id: e.data?.okr_id ?? null,
    }
  }

  async listEpics(): Promise<EpicMeta[]> {
    const store = this.read()
    return [...store.epics].sort((a, b) => b.updated_at.localeCompare(a.updated_at)).map(e => this.meta(store, e))
  }

  async getEpic(id: string): Promise<EpicRecord> {
    const store = this.read()
    const e = store.epics.find(x => x.id === id)
    if (!e) throw new Error("Epic nicht gefunden.")
    return { ...this.meta(store, e), data: e.data }
  }

  async createEpic(title: string, data: EpicData, status: EpicStatus): Promise<string> {
    if (!this.me) throw new Error("Nicht angemeldet.")
    const store = this.read()
    const id = crypto.randomUUID()
    const now = new Date().toISOString()
    store.epics.push({ id, title, data, status, created_by: this.me.id, created_at: now, updated_at: now })
    this.write(store)
    return id
  }

  async updateEpic(id: string, title: string, data: EpicData, status: EpicStatus): Promise<void> {
    const store = this.read()
    const e = store.epics.find(x => x.id === id)
    if (!e) throw new Error("Epic nicht gefunden.")
    e.title = title
    e.data = data
    e.status = status
    e.updated_at = new Date().toISOString()
    this.write(store)
  }

  async deleteEpic(id: string): Promise<void> {
    const store = this.read()
    store.epics = store.epics.filter(x => x.id !== id)
    store.comments = store.comments.filter(c => c.epic_id !== id)
    this.write(store)
  }

  async listComments(epicId: string): Promise<CommentRec[]> {
    const store = this.read()
    return store.comments
      .filter(c => c.epic_id === epicId)
      // Ältere Demo-Datenstände kennen die neuen Felder noch nicht;
      // Name/Avatar immer frisch aus dem Profil auflösen
      .map(c => {
        const u = store.users.find(x => x.id === c.author)
        return {
          ...c,
          section: c.section ?? "epic",
          parent_id: c.parent_id ?? null,
          updated_at: c.updated_at ?? null,
          author_name: u?.display_name ?? c.author_name,
          author_avatar: u?.avatar_url ?? null,
        }
      })
      .sort((a, b) => a.created_at.localeCompare(b.created_at))
  }

  async addComment(epicId: string, section: string, body: string, parentId?: string | null): Promise<void> {
    if (!this.me) throw new Error("Nicht angemeldet.")
    const store = this.read()
    store.comments.push({
      id: crypto.randomUUID(), epic_id: epicId, author: this.me.id,
      author_name: this.me.display_name, body, section, parent_id: parentId ?? null,
      created_at: new Date().toISOString(), updated_at: null,
    })
    this.write(store)
  }

  async updateComment(id: string, body: string): Promise<void> {
    const store = this.read()
    const c = store.comments.find(x => x.id === id)
    if (!c) throw new Error("Kommentar nicht gefunden.")
    c.body = body
    c.updated_at = new Date().toISOString()
    this.write(store)
  }

  async deleteComment(id: string): Promise<void> {
    const store = this.read()
    store.comments = store.comments.filter(c => c.id !== id && c.parent_id !== id)
    this.write(store)
  }

  async listProfiles(): Promise<Profile[]> {
    return this.read().users.map(u => this.profileOf(u))
  }

  async createUser(name: string, login: string, password: string): Promise<void> {
    const store = this.read()
    const email = loginToEmail(login)
    if (store.users.some(u => u.email.toLowerCase() === email.toLowerCase())) throw new Error("Dieser Benutzername ist bereits vergeben.")
    store.users.push({ id: crypto.randomUUID(), email, display_name: name, role: "member", approved: true, password, created_at: new Date().toISOString() })
    this.write(store)
  }

  async updateProfile(id: string, patch: Partial<Pick<Profile, "role" | "approved" | "display_name">>): Promise<void> {
    const store = this.read()
    const u = store.users.find(x => x.id === id)
    if (!u) throw new Error("Nutzer nicht gefunden.")
    const wouldRemoveAdmin = u.role === "admin" && u.approved && ((patch.role && patch.role !== "admin") || patch.approved === false)
    if (wouldRemoveAdmin && store.users.filter(x => x.role === "admin" && x.approved).length <= 1) {
      throw new Error("Der letzte aktive Admin kann nicht entfernt werden.")
    }
    Object.assign(u, patch)
    this.write(store)
  }

  async listOkrs(): Promise<Okr[]> {
    const store = this.read()
    return [...(store.okrs ?? [])]
      .sort((a, b) => b.quarter.localeCompare(a.quarter) || a.created_at.localeCompare(b.created_at))
      .map(o => ({ ...o, creator_name: store.users.find(u => u.id === o.created_by)?.display_name ?? "?" }))
  }

  async createOkr(input: OkrInput): Promise<string> {
    if (!this.me) throw new Error("Nicht angemeldet.")
    const store = this.read()
    const id = crypto.randomUUID()
    const now = new Date().toISOString()
    store.okrs = store.okrs ?? []
    store.okrs.push({ id, ...input, created_by: this.me.id, created_at: now, updated_at: now })
    this.write(store)
    return id
  }

  async updateOkr(id: string, input: OkrInput): Promise<void> {
    const store = this.read()
    const o = (store.okrs ?? []).find(x => x.id === id)
    if (!o) throw new Error("OKR nicht gefunden.")
    Object.assign(o, input, { updated_at: new Date().toISOString() })
    this.write(store)
  }

  async deleteOkr(id: string): Promise<void> {
    const store = this.read()
    store.okrs = (store.okrs ?? []).filter(x => x.id !== id)
    this.write(store)
  }

  async listTodos(): Promise<Todo[]> {
    const store = this.read()
    return [...(store.todos ?? [])]
      .sort((a, b) => b.created_at.localeCompare(a.created_at))
      .map(t => {
        const creator = store.users.find(u => u.id === t.created_by)
        return { ...t, creator_name: creator?.display_name ?? "?", creator_avatar: creator?.avatar_url ?? null }
      })
  }

  async addTodo(text: string): Promise<void> {
    if (!this.me) throw new Error("Nicht angemeldet.")
    const store = this.read()
    store.todos = store.todos ?? []
    store.todos.push({ id: crypto.randomUUID(), text, done: false, created_by: this.me.id, created_at: new Date().toISOString() })
    this.write(store)
  }

  async updateTodo(id: string, patch: Partial<Pick<Todo, "text" | "done">>): Promise<void> {
    const store = this.read()
    const t = (store.todos ?? []).find(x => x.id === id)
    if (!t) throw new Error("Eintrag nicht gefunden.")
    Object.assign(t, patch)
    this.write(store)
  }

  async deleteTodo(id: string): Promise<void> {
    const store = this.read()
    store.todos = (store.todos ?? []).filter(x => x.id !== id)
    this.write(store)
  }

  async getUnreadCommentCounts(): Promise<Record<string, number>> {
    if (!this.me) return {}
    const store = this.read()
    const reads = new Map((store.reads ?? []).filter(r => r.user_id === this.me!.id).map(r => [`${r.epic_id}:${r.section}`, r.last_read_at]))
    const counts: Record<string, number> = {}
    for (const c of store.comments) {
      if (c.author === this.me.id) continue
      const mark = reads.get(`${c.epic_id}:${c.section}`)
      if (mark && c.created_at <= mark) continue
      counts[c.epic_id] = (counts[c.epic_id] ?? 0) + 1
    }
    return counts
  }

  async getReadMarks(epicId: string): Promise<Record<string, string>> {
    if (!this.me) return {}
    const store = this.read()
    return Object.fromEntries(
      (store.reads ?? []).filter(r => r.user_id === this.me!.id && r.epic_id === epicId).map(r => [r.section, r.last_read_at]),
    )
  }

  async markSectionRead(epicId: string, section: string): Promise<void> {
    if (!this.me) return
    const store = this.read()
    store.reads = store.reads ?? []
    const existing = store.reads.find(r => r.user_id === this.me!.id && r.epic_id === epicId && r.section === section)
    if (existing) existing.last_read_at = new Date().toISOString()
    else store.reads.push({ user_id: this.me.id, epic_id: epicId, section, last_read_at: new Date().toISOString() })
    this.write(store)
  }

  subscribeChanges(): () => void {
    // Demo-Modus: kein Backend, keine Live-Updates
    return () => {}
  }

  joinEpicPresence(): () => void {
    return () => {}
  }

  async getAdminStats(): Promise<AdminStats> {
    const store = this.read()
    return {
      aiRequestsMonth: 0,
      aiRequestsYear: 0,
      ...epicStats(store.epics.map(e => ({ created_at: e.created_at, data: e.data }))),
    }
  }

  async getAiModel(): Promise<string> {
    return validAiModel(this.read().settings?.ai_model)
  }

  async setAiModel(model: string): Promise<void> {
    const store = this.read()
    store.settings = { ...store.settings, ai_model: validAiModel(model) }
    this.write(store)
  }

  async changePassword(newPassword: string): Promise<void> {
    if (!this.me) throw new Error("Nicht angemeldet.")
    const store = this.read()
    const u = store.users.find(x => x.id === this.me!.id)
    if (!u) throw new Error("Nutzer nicht gefunden.")
    u.password = newPassword
    this.write(store)
  }

  async uploadAvatar(blob: Blob): Promise<string> {
    if (!this.me) throw new Error("Nicht angemeldet.")
    const url: string = await new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.onload = () => resolve(String(reader.result))
      reader.onerror = () => reject(new Error("Bild konnte nicht gelesen werden."))
      reader.readAsDataURL(blob)
    })
    const store = this.read()
    const u = store.users.find(x => x.id === this.me!.id)
    if (!u) throw new Error("Nutzer nicht gefunden.")
    u.avatar_url = url
    // Bestehende Kommentar-Avatare aktualisieren sich beim nächsten Laden über das Profil
    this.write(store)
    this.me = { ...this.me, avatar_url: url }
    return url
  }
}

export function createBackend(): Backend {
  return supabaseConfigured() ? new SupabaseBackend() : new DemoBackend()
}
