// Supabase-Projektdaten. Der anon-Key ist als öffentlicher Schlüssel konzipiert —
// der Datenzugriff wird serverseitig über Row Level Security abgesichert.
// Solange die Platzhalter nicht ersetzt sind, läuft die App im lokalen Demo-Modus.
export const SUPABASE_URL = "%%SUPABASE_URL%%"
export const SUPABASE_ANON_KEY = "%%SUPABASE_ANON_KEY%%"

export const supabaseConfigured = () =>
  SUPABASE_URL.startsWith("https://") && !SUPABASE_ANON_KEY.includes("%%")
