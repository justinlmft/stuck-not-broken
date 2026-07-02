# Stuck Not Broken — app

**This repo is the single source of truth for the SNB app.** Everything the app needs lives here: code, practice audio (`clips/`, `packs/`), icons, and assets. No build step — the files are served as-is by GitHub Pages from the repo root at https://app.stucknotbroken.com (custom domain via `CNAME`).

## Entry point

`index.html` — the app. It loads `current.js`, Supabase, `config.js`, `store.js`, `from-justin.js`, `icons.js`, and `app.js`. The guided-practice player is `player.html`, embedded by the app in an iframe.

## Deploying

Upload changed files to this repo (main branch) and bump the cache versions: the `?v=N` query strings in `index.html` and `sw.js`, plus `SHELL_VERSION` in `sw.js`. The service worker is network-first, so devices pick up changes on next launch.

## Backend

Supabase keys live in `config.js`. The anon key is safe to ship in client code — it only works through row-level security enforced in the database. If the keys are blank, the app runs in on-device mode (no account).

## Note for AI agents

There is exactly one app and one repo. Do not look for, create, or deploy to any other repo or "mirror". Historical copies (e.g. `snb-guided-practice`) are deprecated.
