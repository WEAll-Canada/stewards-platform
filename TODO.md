# To do

Requests to handle later. One item per line, added at the bottom, with who asked and the date:

`- [ ] Add a photo gallery to the About page (Sam, 2026-11-04)`

When an item is finished, check it off and add the date it was done:

`- [x] Add a photo gallery to the About page (Sam, 2026-11-04) — done 2026-11-10`

- [ ] Lock the staging URL with Cloudflare Access: Workers & Pages → weall-staging → Settings → Domains & Routes → workers.dev → enable Cloudflare Access, allow team emails (Al, 2026-11-04)
- [x] Switch on spam protection for the messages form: Cloudflare dashboard → Turnstile → Add widget (hostnames weall-staging.almithani.workers.dev and weall-prod.almithani.workers.dev), put the site key in wrangler.jsonc for staging and production, then `npx wrangler secret put TURNSTILE_SECRET_KEY --env staging` and `--env production` (Al, 2026-11-04) — done 2026-11-04
- [x] Allow Node 26 in the setup check: `scripts/doctor.mjs` currently requires an exact major match to 24 even though `package.json` engines says `>=24`; update the check to accept Node 26 (or any `>=24`) so agents can proceed (site operator, 2026-11-09) — done 2026-11-09
- [ ] Add a short “Steward product docs” section to README.md linking STEWARD_PRD.md, ARCHITECTURE.md, DESIGN.md, DEV_PLAN.md, EMAIL_SETUP.md (operator/tech steward; README is operator-owned) (Naryan, 2026-11-11)
- [ ] Provide readable Platform Architecture export (PNG/Miro link/text) and reconcile ARCHITECTURE.md roles/entities (Naryan, 2026-11-11)
- [x] Link Festival sample repo (`weall-can-festival` / reimaginefestival.ca) via GitHub URL or open local clone in Cursor; port map from PROJECT_REFERENCE.md (Naryan, 2026-11-11) — done 2026-11-11 (https://github.com/nynysaf/Festival + workspace folder)
- [x] Draft Festival → Stewards port map (features/patterns to reuse vs rebuild on Workers+D1; keep weall.org design, not Festival playful-geometric) (Naryan, 2026-11-11) — done 2026-11-11 (FESTIVAL_PORT_MAP.md)
- [ ] Set SESSION_SECRET for staging and production (`wrangler secret put SESSION_SECRET --env staging` / `--env production`) (tech steward, 2026-11-11)
- [ ] Add Google OAuth client IDs/secrets for steward login (tech steward, 2026-11-11)
- [x] Resend + Ethical Host DNS/forwarders for alliance email: send domain weallcanada.org (Receiving off), receive domain mail.weallcanada.org (Receiving on), contact@ + hello@ forward into Resend; documented in EMAIL_SETUP.md (Naryan, 2026-11-24) — done 2026-11-24
- [ ] Add Resend API key and EMAIL_FROM=`WeAll Canada <contact@weallcanada.org>` for live alliance email locally (`.dev.vars`) and staging/production (`wrangler secret put`) (tech steward / Naryan, 2026-11-24)
- [ ] Wire Resend inbound webhook into Alliance Email inbox; add Settings tab (usage/limits) and staggered campaign sends for free-tier daily cap (Naryan, 2026-11-24)
- [ ] Add Cloudflare R2 (or similar) file storage for Knowledge Commons binary uploads; wire a bucket binding in wrangler.jsonc and secrets as needed (Naryan, 2026-11-16)
- [ ] Production cutover: attach custom domain stewards.weallcanada.org to weall-prod Worker; DNS CNAME at EthicalHost/registrar; link from WordPress main site; confirm SESSION_SECRET and Turnstile hostnames for the new domain (Naryan, 2026-11-17)
- [ ] Gitignore private member import paths so PII never lands in the public repo: add `private/`, `*.csv`, `*.xlsx`, and `import-*.sql` to `.gitignore` (operator; `.gitignore` is operator-owned) (Naryan, 2026-11-18)
- [ ] Operator member import: export members + connections CSVs into gitignored `private/`, generate SQL (`users` active + null password, profiles, preferences, steward role, connections by email), back up production D1, then `npx wrangler d1 execute DB --env production --remote --file private/import-members.sql` (never commit the SQL) (Naryan, 2026-11-18)
- [ ] After production member import, send invite campaign via Alliance Email pointing to `/stewards/activate` with the email already on file (Naryan, 2026-11-18)
- [ ] `scripts/test.mjs`: after wiping `.wrangler/test-state`, create `.wrangler/test-state/v3/cache` before migrations — Wrangler 4.157 on Windows/OneDrive fails with CreateDirectory path-not-found mid-migration (Naryan, 2026-11-25)
