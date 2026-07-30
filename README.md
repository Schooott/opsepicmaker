# Ops Epic Maker

A small team app for drafting well-structured Jira epics for ops initiatives.

Paste or dictate a rough idea, let AI pre-fill the epic template fields, review them step by step, save drafts, discuss them in a per-epic comment sidebar, and copy the result (Jira wiki markup) into your ticket.

Built with React, Vite and [Mantine](https://mantine.dev). Hosted as a static build on GitHub Pages; login, users, epics and comments are backed by a [Supabase](https://supabase.com) project.

## Setup

1. Create a Supabase project and run `supabase-setup.sql` in its SQL editor.
2. In Supabase: Authentication → Sign In / Up → disable "Confirm email".
3. Create the first user in the Supabase dashboard (Authentication → Add user, auto-confirm). The first user automatically becomes admin; all further accounts are created inside the app.
4. Put the project URL and publishable key into `src/config.ts`.
5. Deploy `supabase/functions/ai-prefill` as an edge function and set the `ANTHROPIC_API_KEY` secret (Dashboard → Edge Functions → Secrets). The AI key then lives server-side only.
6. Push to `main` — the GitHub Actions workflow builds and deploys to Pages (Pages source must be set to "GitHub Actions").

Sign-in uses usernames: the app maps `<username>` to the synthetic address `<username>@epicmaker.local` internally (Supabase Auth is email-based). Inputs containing `@` are treated as full email addresses.

Without Supabase credentials the app runs in a local demo mode (browser-only storage, login `admin` / `demo`; the AI call then requires entering an Anthropic API key in the app).

## Development

```
npm install
npm run dev
```

- AI pre-fill requires an Anthropic API key (entered in the app, stored locally in the browser only).
- Voice dictation and audio recording use the browser's built-in speech recognition and microphone APIs (Chrome/Edge).
