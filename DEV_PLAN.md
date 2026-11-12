# Development plan: WeAll Canada Stewards Platform

Nov 11, 2026 · Prototype window ~30–90 days

Related: [STEWARD_PRD.md](STEWARD_PRD.md), [ARCHITECTURE.md](ARCHITECTURE.md), [DESIGN.md](DESIGN.md).  
Agent rules: [AGENTS.md](AGENTS.md). Template ops remain in [PRD.md](PRD.md).

## How we work

| Who | Does |
| --- | --- |
| Content / product steward (via agent) | Edits `src/`, new `migrations/`, `seed/`, `tests/`, `TESTS.md`, `TODO.md`; runs `npm run start` / `ship` |
| Tech steward / operator | Secrets, OAuth clients, email provider, DNS/WordPress `/stewards` cutover, `wrangler`/GitHub env, merges to `main`, operator-owned files |
| Steward testers | Use staging; file feedback → `TODO.md` |

Do not overwrite [PRD.md](PRD.md). Ship features behind the existing staging → production path.

## Phase 0 — Foundation (week 1)

**Outcome:** Tokenized shell at `/stewards` with Apply/Login entry points; preview runs locally.

| Work | Owner |
| --- | --- |
| Add `src/styles/tokens.css` from [DESIGN.md](DESIGN.md); wire into layout | Agent |
| Public steward landing (explain + Apply + Login CTAs) | Agent |
| App shell nav scaffolding (Dashboard, Directory, Profile; Admin gated later) | Agent |
| Base path / routing strategy documented in code comments + ARCHITECTURE | Agent |
| PWA manifest + icons (temporary) | Agent |
| Google OAuth client + auth secrets in staging; `.dev.vars` locally | Tech steward |
| Confirm staging Access TODO (Cloudflare) | Tech steward |

**Exit check:** Local preview shows branded `/stewards` landing; tokens control colors/fonts.  
**Status (2026-11-11):** Shell + tokens + circle variants landed; Apply/Login are layout placeholders (auth not wired yet).

## Phase 1 — Steward Management core (weeks 1–4)

**Outcome:** Apply → approve → sign-in → profile → directory → dashboard shell.

| Work | Owner |
| --- | --- |
| Migrations: users, profiles, preferences, roles, applications (+ indexes) | Agent |
| Seed sample stewards / pending applicants | Agent |
| Auth: email+password + Google; session gates | Agent (+ tech steward secrets) |
| Apply form + admin approve/reject UI | Agent |
| Profile edit + privacy/comms prefs | Agent |
| Directory list/sort/filter + profile view | Agent |
| Dashboard bento with placeholder panels | Agent |
| Basic connections + in-app message stub (avoid clash with legacy contact `messages`) | Agent |
| Playwright: apply, auth gate, directory smoke | Agent |
| Staging ship for steward click-through | Both |

**Exit check:** Phase A steward-management acceptance items in STEWARD_PRD mostly checked on staging.  
**Status (2026-11-11):** Apply → approve → dashboard/directory/profile; circles join+approve; connections+DMs; email inbox/reply/campaigns (simulate without Resend); events+RSVP; FAQ. Google OAuth + live Resend still pending tech-steward secrets.

## Phase 2 — Email (weeks 3–6, overlaps Phase 1)

**Outcome:** Admins/leads can work an inbox and send a small confirmed campaign.

| Work | Owner |
| --- | --- |
| Choose email provider; set domain DNS + secrets | Tech steward (ask before paid tier) |
| Migrations: threads, messages, campaigns, recipients | Agent |
| Inbound webhook + signature verify | Agent |
| Inbox UI (clustered threads, who replied) | Agent |
| Reply send path | Agent |
| Campaign MVP: segment, template, preview, test send, confirm N | Agent |
| Basic send/delivery stats from provider webhooks | Agent |
| Permission tests: steward cannot open admin inbox | Agent |

**Exit check:** Test campaign to a small group works on staging; confirmation modal required.

## Phase 3 — Hardening & testability (ongoing; checkpoint ~day 30)

| Work | Owner |
| --- | --- |
| Cloudflare Access on staging | Tech steward |
| Turnstile on all public writes | Agent |
| TESTS.md entries for each bug fix | Agent |
| PWA install verified on iOS/Android | Both |
| Performance pass on directory queries (indexes) | Agent |

**Exit check:** Several stewards can use staging safely; feedback flowing into TODO.md.

## Phase 4 — Prototype expansion (days 30–90)

Order from STEWARD_PRD Phase B; each slice should be demoable even if thin:

1. **Circles** — page shell, members, join request/approve, resources list.
2. **Admin** — user list, roles, profile questions, light activity.
3. **Calendar** — create/list events, RSVP.
4. **Connecting** — matching stub / interest search; network map stretch.
5. **Knowledge Commons** — upload + list first; LLM/vectors only after cost approval.
6. **Onboarding / FAQ** — in-flow tips; editable FAQ.
7. **Production path** — Cloudflare route for `weallcanada.org/stewards` (or subdomain fallback).

## Milestone calendar (indicative)

| When | Milestone |
| --- | --- |
| End of week 1 | Foundation live locally + staging deploy of shell |
| ~Day 30 | Steward Management usable by testers |
| ~Day 45–60 | Email MVP on staging |
| ~Day 90 | Broader prototype (Circles + one more area) in steward hands |

Adjust dates when sample-repo porting or architecture PDF reconciliation changes scope.

## Dependencies / asks

- Readable architecture PDF or Miro export.
- Sample repo URL + feature list (port vs rewrite).
- Answers to vision questions in [DESIGN.md](DESIGN.md).
- Budget OK for email provider (and later LLM) when Phase 2/4 need them.
- Tech steward time for OAuth, DNS, Access, WordPress `/stewards` exclusion.

## Backlog notes (not building yet)

- [x] **Activate your account (nav):** Third public header option + `/stewards/activate` short path for migrating stewards (not the full survey); admins see an Activation badge. Product feedback 2026-11-12 — done 2026-11-12.
- **Google OAuth on Apply + Login:** Offer “Continue with Google” on both the Join/Connect front door and Login once OAuth client secrets are in place (already partially scaffolded; login button currently disabled until keys exist). Product feedback 2026-11-12.
- **Dashboard layout:** Tiles may later move toward a fuller bento composition; for now prefer editorial / non-template tile treatments over generic accent-bar cards. Product feedback 2026-11-12.
- [x] **Circles header hover dropdown** + circle detail pages (`/stewards/circles/[slug]`). Product feedback 2026-11-12 — done 2026-11-12.
- [x] **Directory search & filter:** Search plus region/sector/interest filters on the directory. Product feedback 2026-11-12 — done 2026-11-12.
- [x] **Events UX pass (product feedback 2026-11-12):** list/calendar toggle, happening-now + today emphasis, collapsed add-event form at bottom, dashboard “Events today” + next five upcoming — done 2026-11-12.
- **Events (later):** fuller STEWARD_PRD calendar features (subscribe, richer RSVP/attendance, circle meeting tooling).

## README pointer

[README.md](README.md) is operator-owned. Add a short “Steward product docs” link section there when a tech steward edits it — tracked in [TODO.md](TODO.md).
