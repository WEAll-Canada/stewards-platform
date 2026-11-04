# Operator guide

How to set up a new client site from this template. Only the operator does this; clients never see it.

Commands below use `OWNER/REPO` for the client's repo and `client` for the client's short name. Run them from the repo folder.

## What you need first

- **A GitHub organization to own the client repos.** Which plan you need depends on repo visibility:
  - **Public repos:** any plan, including Free. Rulesets, environment secrets, and required reviewers all work.
  - **Private repos:** the Team plan gives rulesets and environment secrets, but *not* required reviewers (those need Enterprise on private repos). Without them, the gate is the `main` ruleset: only admins can update `main`, so your merge is the approval. Skip the required-reviewer command in step 4.
  - Client editors are added as outside collaborators, which don't need paid seats.
- The GitHub CLI, signed in as an org owner: `gh auth login`.

## Using Claude Code yourself in a client repo

The repo's `.claude/settings.json` holds the *client's* guardrails: it blocks raw `git push`/`commit`, edits to `scripts/`, `.github/` and other operator files, and Cloudflare commands. To work on those files with Claude Code as the operator, skip the project settings:

```sh
claude --setting-sources user,local
```

## New-client checklist

### 1. Create the repo and the `staging` branch

```sh
gh repo create OWNER/REPO --private --template OWNER/client-site-starter --clone
cd REPO
git switch -c staging && git push -u origin staging
```

### 2. Add people and the Cloudflare account

- Add each client editor as a collaborator with **Write** access (never Admin):
  `gh api -X PUT repos/OWNER/REPO/collaborators/THEIR_USERNAME -f permission=push`
- Create a free Cloudflare account in the client's name (their email), then have them invite you as an **Administrator** (Manage Account → Members).

### 3. Point the code at the client's Cloudflare account

Sign in to the client's account (`npx wrangler login`), then:

```sh
npx wrangler d1 create client-staging
npx wrangler d1 create client-prod
```

In `wrangler.jsonc`, set:
- `name` (top level): `client-local`
- `env.staging.name`: `client-staging`, and its `database_name` / `database_id` from the first command
- `env.production.name`: `client-prod`, and its `database_name` / `database_id` from the second command
- When the client has a domain: add it to their Cloudflare account, then add a `routes` entry to each environment (`staging.<domain>` and `<domain>`) and set `workers_dev` to `false`.

Also update:
- `package.json` → `config.stagingUrl` (the staging link `npm run ship` shows clients)
- `.github/CODEOWNERS` if your GitHub username isn't `@almithani`

Run `npm run types`, commit to `staging`, and push.

### 4. GitHub Environments and the Cloudflare token

Create a Cloudflare API token in the client's account (My Profile → API Tokens → Create Token → **Edit Cloudflare Workers** template, then add **Account → D1 → Edit**; limit it to the client's account). Then:

```sh
ACCOUNT_ID=<client's Cloudflare account ID>
for ENV in staging production; do
  BRANCH=$([ "$ENV" = production ] && echo main || echo staging)
  gh api -X PUT "repos/OWNER/REPO/environments/$ENV" --input - <<JSON
{"deployment_branch_policy": {"protected_branches": false, "custom_branch_policies": true}}
JSON
  gh api -X POST "repos/OWNER/REPO/environments/$ENV/deployment-branch-policies" -f name="$BRANCH" -f type=branch
  gh secret set CLOUDFLARE_API_TOKEN --env "$ENV"   # paste the token when asked
  gh variable set CLOUDFLARE_ACCOUNT_ID --env "$ENV" --body "$ACCOUNT_ID"
done
# Production deploys wait for your approval (public repos, or Enterprise for private ones):
OPERATOR_ID=$(gh api user --jq .id)
gh api -X PUT repos/OWNER/REPO/environments/production --input - <<JSON
{"reviewers": [{"type": "User", "id": $OPERATOR_ID}],
 "deployment_branch_policy": {"protected_branches": false, "custom_branch_policies": true}}
JSON
gh variable set SITE_URL --env staging --body "https://client-staging.<subdomain>.workers.dev"
gh variable set SITE_URL --env production --body "https://client-prod.<subdomain>.workers.dev"
```

Each environment only accepts deploys from its own branch. The token is stored only here, never in repo secrets or on client computers.

### 5. Switch on spam protection for forms

Public forms refuse submissions until Turnstile is set up for that environment. In the client's Cloudflare account: **Turnstile → Add widget**, mode **Managed**, hostnames = the staging and production hostnames. Then:

- Put the **site key** (public) in `wrangler.jsonc` as `TURNSTILE_SITE_KEY` under `env.staging.vars` and `env.production.vars`.
- Store the **secret key**: `npx wrangler secret put TURNSTILE_SECRET_KEY --env staging`, then the same with `--env production`.

The rate limit (5 submissions per visitor per minute) needs no setup. Local previews and tests use Cloudflare's always-pass test keys.

### 6. Protect the staging site

Once staging has its own hostname, add a Cloudflare Access application for `staging.<domain>` (Zero Trust → Access → Applications) with an **Allow** policy listing the client team's emails. (A `*.workers.dev` URL can be protected from the Worker's Settings → Domains & Routes instead.)

### 7. Apply the rulesets

```sh
gh api -X POST repos/OWNER/REPO/rulesets --input .github/rulesets/main.json
gh api -X POST repos/OWNER/REPO/rulesets --input .github/rulesets/protect-automation.json
```

- **Protect main**: nobody but repo admins (you) can update `main`; changes arrive by PR, with CODEOWNERS review and passing tests. Admins bypass, so you can merge your own staging → main PR.
- **Protect deploy automation** (private repos on Team/Enterprise only; GitHub doesn't allow push rules on public repos): pushes to *any* branch that change `.github/`, `scripts/`, `package.json`, `package-lock.json`, `astro.config.mjs` or `wrangler.jsonc` are rejected unless an admin pushes them. This matters because the staging deploy runs those files with a Cloudflare token that can reach the whole account, production included.

**Known gap on public repos:** without that push ruleset, anyone with write access could push a changed workflow or script to `staging` and run it with the staging token, which can also reach production. The guards are the agent rules (never edit `.github/` or `scripts/`) and giving write access only to trusted client editors. **Private repos on the Free plan** lose more: no rulesets and no required reviewers at all, so keep client repos public or on a paid plan.

### 8. Dry run

1. On `staging`, change the home page heading and run `npm run ship -- "Dry run"`. Check the **Deploy** run in the Actions tab and the change on the staging URL.
2. As a client editor (or with a test account with Write access), confirm `git push origin HEAD:main` is rejected.
3. Open the staging → main PR: `gh pr create --base main --head staging --title "Release"`. Review it, merge it, approve the production deploy, and watch it run: tests, database backup, migrations, then the new code.
4. Check the production URL, then revert the heading the same way.

## Every release

1. The client tells you staging is ready.
2. `gh pr create --base main --head staging --title "Release YYYY-MM-DD"`
3. Review the diff. Look hardest at `migrations/` (anything destructive?) and `tests/` (was any test weakened?).
4. Merge, then approve the production deploy (Actions tab → the Deploy run → Review deployments). It backs up the database (kept 90 days as a workflow artifact named `d1-backup-<commit>`), applies migrations, then deploys.

## Updating the pinned tools

`scripts/setup-tools.sh` (Mac) and `scripts/setup-tools.ps1` (Windows) install exact versions of Node and the GitHub CLI and refuse any download whose SHA-256 doesn't match. They only install a tool that's missing, or a Node whose major version doesn't match `.nvmrc`, so an older pin keeps working; update a few times a year, or sooner for a Node security release.

1. Get the new versions and checksums from the official lists:
   ```sh
   curl -fsSL https://nodejs.org/dist/latest-v24.x/SHASUMS256.txt | grep -E 'darwin-(arm64|x64)\.tar\.gz|win-(x64|arm64)\.zip'
   V=$(gh release view -R cli/cli --json tagName -q .tagName | sed 's/^v//')
   curl -fsSL "https://github.com/cli/cli/releases/download/v$V/gh_${V}_checksums.txt" | grep -E '(macOS|windows)_(amd64|arm64)\.zip'
   ```
2. Update `NODE_VERSION`, `GH_VERSION` and the four checksums in **both** scripts.
3. Test on a Mac with an empty home folder: `HOME=$(mktemp -d) PATH=/usr/bin:/bin sh scripts/setup-tools.sh`, which should download both and say RESTART NEEDED. Test the Windows script on a Windows account.
4. When `.nvmrc` moves to a new Node major, change the `latest-v24.x` URL above to match; both scripts refuse to run while their pinned Node disagrees with `.nvmrc`.

## Restoring the production database from a backup

Download the `d1-backup-<commit>` artifact from that deploy's Actions run, then:

```sh
npx wrangler d1 execute DB --env production --remote --file d1-backup-<commit>.sql
```

The backup recreates every table, so restore into an emptied database (or a fresh one created with `wrangler d1 create` and swapped into `wrangler.jsonc`).

## App secrets

API keys the site needs (email, payments, …) are set per environment and never committed:

```sh
npx wrangler secret put SECRET_NAME --env staging
npx wrangler secret put SECRET_NAME --env production
```

For local previews, put development values in `.dev.vars` (git-ignored; copy `.dev.vars.example`).

## Free-tier budget

Staging and production share the client's free Cloudflare account: 100,000 Worker requests/day, 10 ms CPU per request, 5 million D1 rows read/day, 100,000 rows written/day, 5 GB storage. Limits reset at 00:00 UTC. If a client outgrows it, upgrade their account to Workers Paid ($5/month).
