# Alliance email setup (Resend + Ethical Host)

Last updated: 2026-11-24  
Related: [ARCHITECTURE.md](ARCHITECTURE.md) (email subsystem), [DEV_PLAN.md](DEV_PLAN.md) Phase 2, [STEWARD_PRD.md](STEWARD_PRD.md).

This is the live ops runbook for how WeAll Canada mail is split between Ethical Host / Gmail and Resend / the Stewards website. Use it for the next wiring steps and for troubleshooting.

## Goals

- Keep day-to-day human mail readable in **Gmail** (two people connected via Ethical Host).
- Use **Resend** for website **sending** and for mail that should appear in the **Alliance Email** inbox on the Stewards site.
- Stay on Resend **free tier** where possible (100 emails/day UTC, 3,000/month for transactional send + receive; inbound counts).

## Addresses and roles

| Address | Provider | Purpose |
| --- | --- | --- |
| `hello@weallcanada.org` | Ethical Host → Gmail (existing) | Human alliance inbox. Also **forwarded** into Resend so copies can show on the website. |
| `contact@weallcanada.org` | Ethical Host **forwarder** → Resend | Public / website address. People write here; Ethical Host forwards into Resend. Site sends **as** this address via Resend. |
| `contact@mail.weallcanada.org` | Resend **receiving** domain | Inbound destination Resend actually accepts. Not the public brand address; used as the forwarder target. |

**Do not** enable Resend **Receiving** on the root domain `weallcanada.org`. That would steal MX from Ethical Host and break `hello@` / Gmail delivery.

## Domains in Resend

| Resend domain | Receiving | Role |
| --- | --- | --- |
| `weallcanada.org` | **Off** | **Sending only.** Verifies the site may send as `contact@weallcanada.org` (DKIM / send / return-path records). Already added earlier in setup — **do not add a second copy**. |
| `mail.weallcanada.org` | **On** | **Receiving.** MX (and any other records Resend shows) live in Ethical Host DNS. Accepts mail to any mailbox on this subdomain (e.g. `contact@mail.weallcanada.org`). |

DNS for both is edited in the **same** Ethical Host place: cPanel → **Zone Editor** → **Manage** → `weallcanada.org`. Subdomain rows use Name `mail`, `send`, `resend._domainkey`, etc. — not a separate zone.

## Ethical Host

| Item | Setting |
| --- | --- |
| Root MX for `weallcanada.org` | Unchanged — still Ethical Host (keeps normal delivery for `@weallcanada.org`). |
| Forwarder `contact@weallcanada.org` | → `contact@mail.weallcanada.org` (and optionally the two Gmail accounts). |
| Forwarder `hello@weallcanada.org` | → Resend inbound (`contact@mail.weallcanada.org` and/or same pattern) **in addition to** existing Gmail connections. Every forwarded message counts against Resend quota. |
| Gmail | Two teammates still connected to Ethical Host mail for human reading. |

## How a message flows

### Website sends a campaign or reply

```
Stewards app → Resend API → recipient
From: WeAll Canada <contact@weallcanada.org>
```

Requires: `weallcanada.org` verified for send in Resend, plus secrets `RESEND_API_KEY` and `EMAIL_FROM` (see below).

### Someone emails or replies to `contact@weallcanada.org`

```
Sender → Ethical Host (root MX)
      → forwarder contact@
      → contact@mail.weallcanada.org (Resend Receiving)
      → (next) webhook → Stewards Alliance Email inbox
```

Until the inbound webhook is built, mail is visible in Resend → Emails → **Receiving**, not yet automatically in the site UI.

### Someone emails `hello@weallcanada.org`

```
Sender → Ethical Host → Gmail (existing)
              └→ forwarder → Resend (also counts toward free-tier limits)
```

## Secrets and From address

| Name | Value / notes |
| --- | --- |
| `RESEND_API_KEY` | Resend API key (full access if using Usage API for a Settings tab). Local: `.dev.vars`. Staging/production: operator `wrangler secret put`. |
| `EMAIL_FROM` | `WeAll Canada <contact@weallcanada.org>` |

Without `RESEND_API_KEY`, the app **simulates** sends locally (see `src/lib/email.ts`).

## Free-tier implications

- Counts toward Resend: every **send** from the site + every message **received** by Resend (including forwards from `contact@` and `hello@`).
- Does **not** count: mail that only stays on Ethical Host / Gmail and never hits Resend.
- Forwarding `hello@` into Resend increases quota use; if daily limits become tight, remove the `hello@` → Resend forward and keep `hello@` Gmail-only.

Planned product follow-ups: Email **Settings** tab showing Resend usage; stagger campaign sends across days when over the daily cap.

## Checklist status (2026-11-24)

- [x] `weallcanada.org` added in Resend for **sending** (Receiving off)
- [x] Send DNS records in Ethical Host Zone Editor
- [x] `mail.weallcanada.org` added in Resend with **Receiving on**
- [x] Receive DNS records in Ethical Host Zone Editor
- [x] Forwarder `contact@weallcanada.org` → Resend inbound
- [x] Forwarder `hello@weallcanada.org` → Resend inbound (also keeps Gmail path)
- [ ] Local `.dev.vars`: `RESEND_API_KEY` + `EMAIL_FROM`
- [ ] Staging/production secrets for the same
- [ ] Inbound webhook → Alliance Email inbox UI
- [ ] Delivery/open/click webhooks for campaign stats
- [ ] Settings tab (usage/limits) + staggered blasts

## Troubleshooting

| Symptom | Likely cause | What to check |
| --- | --- | --- |
| `hello@` stops arriving in Gmail | Root MX or Receiving enabled on `weallcanada.org` in Resend | Resend domain `weallcanada.org` must have Receiving **off**; root MX still Ethical Host |
| `contact@weallcanada.org` never hits Resend | Forwarder missing/wrong, or `mail.` DNS not verified | Ethical Host Forwarders; Resend domain status; test send to `contact@mail.weallcanada.org` directly |
| Direct `contact@mail.weallcanada.org` works but `contact@weallcanada.org` does not | Forwarder only | cPanel → Forwarders for `weallcanada.org` |
| Site still “simulate mode” | No API key in env | Local `.dev.vars` / staging secrets; never commit real keys |
| Hits `daily_quota_exceeded` | Free tier 100/day (UTC) | Resend Usage; reduce `hello@` forwards; stagger campaigns |
| Sends as wrong From | Default/env still old address | `EMAIL_FROM`; code default in `src/lib/email.ts` |

## Next implementation steps (agents)

1. Confirm local/staging `EMAIL_FROM` uses `contact@weallcanada.org`.
2. Wire Resend **received** webhook → store threads/messages in D1 → Alliance Email Inbox.
3. Optional: forward or notify the two Gmail users from the app if Ethical Host multi-target forward is incomplete.
4. Settings tab: Resend `GET /usage` + queue/stagger for large campaigns.
