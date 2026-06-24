# Stuck Not Broken — app

A static web app (HTML/CSS/JS) with a Supabase backend for accounts and
cross-device sync. No build step — the files in this repo are served as-is.

## Entry points
- `index.html` — the modular app (loads `current.js`, Supabase, `config.js`, `store.js`, `app.js`)
- `practice.html` — a standalone, installable single-file version of the guided practice

## Hosting
Served via GitHub Pages straight from the repo root.

## Backend
Supabase keys live in `config.js`. The anon key is safe to ship in client code —
it only works through row-level security enforced in the database. If the keys
are blank, the app runs in on-device mode (no account).
