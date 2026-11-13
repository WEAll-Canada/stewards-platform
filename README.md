# Stewards Platform

WEAll Canada's Stewards Platform. Editors change the site by talking to an AI agent (Claude Code, Codex, or Antigravity), preview changes on their own computer, and ship them to a private staging site; only the operator puts changes live.

Built from the [client-site-starter](https://github.com/Bankless-Card/client-site-starter) template on Astro + Cloudflare Workers + D1.

## Quickstart

### I'm a client editing my site

1. Follow **[SETUP.md](SETUP.md)** once: install an AI assistant app (plus Git on Windows), and it sets up the rest (about 10 minutes).
2. Open your site's folder in your AI assistant and say **"get me set up"**.
3. From then on, say **"start the site"**, describe your changes, and say **"ship it"** when you're happy.

### I'm the operator

See **[OPERATOR.md](OPERATOR.md)** for releases, backups, secrets, and the free-tier budget. To set up a *new* client site, use the [client-site-starter](https://github.com/Bankless-Card/client-site-starter) template instead of this repo.

### I'm developing this site

```sh
npm ci
npm run start      # doctor check, local database + sample data, preview at http://localhost:4321
npm run test       # Playwright tests against a local build
```

Requires Git, Node 24 (see `.nvmrc`), and the GitHub CLI. `npm run doctor` checks all three; `sh scripts/setup-tools.sh` (Mac) or `scripts\setup-tools.ps1` (Windows) installs pinned, checksum-verified Node and GitHub CLI into your user folder without admin rights.

## How it works

```
client's computer ── npm run ship ──▶ staging branch ──▶ GitHub Actions ──▶ staging site
                                                          (tests, migrations, deploy)
                                            │
                              operator: PR staging → main, merge, approve
                                            ▼
                                      main branch ──▶ GitHub Actions ──▶ production site
                                                     (tests, DB backup, migrations, deploy)
```

| Command | What it does |
| --- | --- |
| `npm run doctor` | Checks Git, Node, GitHub CLI, sign-in, and Git identity. Never installs anything. |
| `npm run start` | Gets the latest `staging`, installs packages, sets up the local database, and starts and opens the preview. |
| `npm run ship -- "summary"` | Builds, tests, commits, and pushes to `staging`, then waits for the staging deploy. |
| `npm run sync` | Gets the latest `staging`. |
| `npm run undo` | Discards unshipped changes, or reverts the last shipped change. Never rewrites history. |
| `npm run test` | Runs the Playwright tests against a local build with a throwaway database. |

## What's where

| Path | What |
| --- | --- |
| `AGENTS.md` | The rules every agent follows (`CLAUDE.md` points to it) |
| `src/pages/`, `src/pages/api/` | Site pages and API routes (client-editable) |
| `src/lib/db.ts` | All SQL queries |
| `src/lib/protect.ts` | Spam protection and rate limit for public forms |
| `migrations/`, `seed/` | D1 schema changes and sample data |
| `tests/`, `TESTS.md` | Playwright tests and their plain-language index |
| `TODO.md` | Client requests for later |
| `scripts/` | The npm scripts above (operator-owned) |
| `.github/` | Deploy and test workflows, CODEOWNERS, rulesets (operator-owned) |
| `PRD.md` | The full product spec |
