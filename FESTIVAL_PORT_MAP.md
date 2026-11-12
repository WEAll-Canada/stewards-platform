# Festival → Stewards port map

Nov 11, 2026  
Source: https://github.com/nynysaf/Festival · local `WEAll Can/Festival`  
Target: this repo (Astro + Workers + D1) · visuals: [DESIGN.md](DESIGN.md) (weall.org), **not** Festival’s playful-geometric violet theme.

## Stack: rebuild, don’t transplant

| Festival | Stewards |
| --- | --- |
| Next.js App Router | Astro pages + `src/pages/api` |
| Supabase Auth + RLS | Session auth in D1 + route checks |
| Supabase Postgres | Cloudflare D1 (`src/lib/db.ts`) |
| Resend + react-email | Resend (or similar) via Worker fetch — keep provider idea |
| Inngest / OpenAI / Stripe | Out of Phase A; revisit for Knowledge Commons / payments |

## Port by feature (priority)

| Festival capability | Stewards home | Port approach |
| --- | --- | --- |
| Register + Google/email auth | Apply + Login | Rebuild flows; reuse field ideas from survey/settings |
| Entry survey / profile | Steward profile + prefs | Port **field inventory**, not components |
| Participants directory + search | Alliance directory | Port UX patterns (search, cards/rows, no emails exposed) |
| Connections strength 1–4 + reasons | Connect / log strength | Port **model** (strength + reason flags) |
| 1:1 messaging | Steward messaging | Port behaviour; simpler UI first |
| Admin CRM + flags | Platform admin | Port role flags → our admin/lead/steward roles |
| Email CRM (campaigns, inbox, templates) | Phase A Email | Port **product behaviour**; new Worker + provider wiring |
| Dashboard home | Bento dashboard | Port “pulse” idea as panels; new layout |
| Schedule / sessions / RSVP | Calendar (Phase B) | Defer; reuse event field ideas later |
| Harvest / knowledge graph / Ask AI | Knowledge Commons (Phase B) | Defer; expensive (vectors/LLM) |
| Care / Narration / Synthesis consoles | Not 1:1 | Map Care-like inbox → admin/lead email only for now |
| Stripe / registration payment | Out of scope | Skip unless fundraising circle asks later |

## Concrete reuse checklist (when coding)

- [ ] Profile/survey fields list from Festival settings + survey
- [ ] Connection strength enum + reason flags
- [ ] Directory privacy rules (no raw emails in list)
- [ ] Campaign confirm-before-send + test send
- [ ] Role gates on every privileged API (Festival RLS → our explicit checks)

## Do not copy

- Tailwind token set / Outfit / violet accent system  
- Supabase client calls or RLS SQL as-is  
- Festival-specific Care/Narration/Synthesis split for v1 Stewards
