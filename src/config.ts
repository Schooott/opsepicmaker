// Supabase-Projektdaten. Der anon-Key ist als öffentlicher Schlüssel konzipiert —
// der Datenzugriff wird serverseitig über Row Level Security abgesichert.
// Solange die Platzhalter nicht ersetzt sind, läuft die App im lokalen Demo-Modus.
export const SUPABASE_URL = "https://lmpdsoniypdlluvhbhhe.supabase.co"
export const SUPABASE_ANON_KEY = "sb_publishable_cHVWOYjbw1meD7BUzYcaqg_fGVJ0bCb"

export const supabaseConfigured = () =>
  SUPABASE_URL.startsWith("https://") && !SUPABASE_ANON_KEY.includes("%%")
