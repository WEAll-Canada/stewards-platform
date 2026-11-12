# PRD: WeAll Canada Stewards Platform

Nov 11, 2026 · Draft for prototype

Related docs: [ARCHITECTURE.md](ARCHITECTURE.md), [DESIGN.md](DESIGN.md), [DEV_PLAN.md](DEV_PLAN.md).  
Ops / agent template (keep separate): [PRD.md](PRD.md).  
Priorities source: [Steward Platform Priorities](https://docs.google.com/document/d/1m_Dd6FgcjzMeK3rNvxrsKFcWo-IIIT_sgEcq_N2S-ZQ/edit).

## Overview and goals

**Product name:** WeAll Canada Stewards Platform  
**Purpose:** Support collaboration and learning for WeAll Canada stewards, circle leads, and platform admins.

The public marketing site stays at [weallcanada.org](https://weallcanada.org/). The Stewards Platform lives under that domain (target path: `/stewards`) as the place people apply, sign in, manage profiles, find each other, and (for admins/leads) handle email.

### Goals

1. Give stewards a clear place to see themselves, connect, and stay oriented.
2. Let admins approve new stewards and run email without leaving the platform.
3. Ship a **testable prototype** of the full priority surface within ~30–90 days — useful for steward feedback, not a polished final product of every module.
4. Stay simple, accessible, and customizable (modular UI + design tokens).

### Non-goals (prototype window)

- Replacing the whole WordPress marketing site on day one.
- Banking / fundraising payment rails.
- Perfect production hardening of every module (Knowledge Commons LLM, full analytics, etc.).
- Multiple simultaneous editors without coordination (same constraint as the starter template).

## Users and roles

| Role | Who | Can do (app) | Notes |
| --- | --- | --- | --- |
| Public visitor | Anyone | See public pages (explain the steward site, Apply / Login entry points) | No account required |
| Applicant | Person who applied | Submit application; see pending status | Open apply; admins approve |
| Steward | Approved member | Profile, prefs, directory, dashboard, connections (as built) | Primary day-one user |
| Circle lead | Steward with lead rights | Steward capabilities + circle tools + limited email access (as built) | |
| Platform admin | Operators of the alliance platform | Approve applicants, manage users/roles, full email, admin analytics | |
| Tech steward | Person with GitHub access | Same as operator for source code, secrets, deploys | Process role — not only an in-app permission |

## Auth and membership

- Sign-in: **Google** or **email + password**.
- Apply: **open application**; **admins approve** before steward access.
- Sessions persist across the Stewards app; public marketing site may remain separate until routing is unified.

## Feature scope

### Phase A — first cut (build first)

Aligned with the top two priority blocks: **Steward Management** and **Email**.

#### Steward Management

- Public front page for the steward site: short explanation, **Apply** and **Login**.
- Apply to join.
- Create / edit profile.
- Privacy and communications preferences.
- Request to join a circle (minimal hook OK if Circles UI is later).
- Connect to other stewards:
  - View, sort, filter alliance directory
  - View steward / partner profiles
  - Log connection strength (basic)
  - Message (basic in-app; email notify later OK)
- Steward dashboard — bento-style editable panels (Alliance Updates, Circle Updates, Chats, Assigned items, Upcoming events as slots fill in).

#### Email

- Send / receive via alliance inbox (`hello@weallcanada.com` or successor address).
- Cluster by conversation; show which admin replied and when.
- Access limited to platform admins and circle leads (per permissions).
- Mass campaigns (start small; scale toward 100–500):
  - Templates, group filters, rich text + images
  - Test send + HTML preview
  - Confirm “Are you sure you want to email N people?”
- Semi-automatic newsletter compilation with review (prototype-quality OK).
- Analytics: sent, delivered, bounce, open, click; histories by group/user (provider-dependent).
- AI highlights (later in prototype if capacity): flag important replies, suspected spam, unresponsive stewards.

### Phase B — full prototype (within 90 days as capacity allows)

From the priorities doc, in rough order after Phase A:

1. **Circles** — customizable front pages, membership, meetings/events, resources, decision log (stubs → usable slices).
2. **Platform admin** — users, roles, profile questions, activity, ToR fields.
3. **Connecting** — matching / “who is interested in X?”, network map (can be thin).
4. **Calendar** — events, list/calendar views, RSVP, subscribe.
5. **Knowledge Commons** — uploads, light LLM with sources, vectorization (likely paid add-on).
6. **Onboarding & FAQ** — in-flow help; steward-editable FAQ.
7. **Security & versioning** — staging before prod (already in template), activity trail, admin undo (stretch).

## Environments

Reuse the existing agent workflow:

| Environment | Branch | Who uses it |
| --- | --- | --- |
| Local preview | `staging` checkout | Editors + tech stewards via `npm run start` |
| Staging | `staging` | Steward testers behind Access when enabled |
| Production | `main` | Live stewards app after operator/tech steward promote |

Clients and content editors still ship with `npm run ship`; tech stewards handle secrets, DNS, WordPress/Cloudflare cutover, and production merges.

## Success metrics

### ~30 days

- Apply → admin approve → sign-in → edit profile works end-to-end on staging.
- Directory list/filter and a bento dashboard shell are usable.
- Design tokens drive the temporary look; PWA install works on mobile.
- At least a few stewards can click through and give feedback.

### ~90 days

- Phase A (Steward Management + Email) is in steward hands for testing.
- Circles and at least one more Phase B area exist as a coherent prototype (even if rough).
- Staging is the default test surface; path toward `weallcanada.org/stewards` is documented and partly wired.
- Open feedback captured in `TODO.md` / issue list.

## Acceptance criteria (Phase A)

- [ ] Public `/stewards` (or agreed URL) explains the platform and offers Apply + Login.
- [ ] Applicant can submit an application; admin can approve/reject; approved user can sign in with Google or email/password.
- [ ] Steward can create/edit profile and privacy/comms prefs.
- [ ] Alliance directory supports view + sort/filter; profiles are viewable per privacy rules.
- [ ] Dashboard renders a bento layout with at least two live or placeholder panels.
- [ ] Admins (and leads where allowed) can use an inbox view and send a test campaign to a small group with confirmation.
- [ ] Public forms use Turnstile + rate limiting (`src/lib/protect.ts` pattern).
- [ ] Regression tests exist for apply, auth gate, and one email permission check.

## Open inputs (do not block drafting; reconcile later)

- Readable export of the Platform Architecture PDF / Miro board (roles & entities).
- Sample code repo URL + feature list to port.
- Final brand mockups (temporary design from weall.org — WeAll Canada name + global circle logo — is documented in DESIGN.md).
- Confirm path (`/stewards`) vs subdomain for production routing.
