// Shared helpers for the npm scripts. Messages are written for non-technical clients.
import { spawnSync } from "node:child_process";
import { copyFileSync, existsSync, readdirSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

export const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
export const BRANCH = "staging";
export const CONTACT = "Please contact your site operator.";

const pkg = JSON.parse(readFileSync(join(ROOT, "package.json"), "utf8"));
export const STAGING_URL = pkg.config?.stagingUrl;

export function say(message = "") {
  console.log(message);
}

// Print a plain-English reason and exit with failure.
export function stop(message) {
  console.error(`\n${message}`);
  process.exit(1);
}

// Run a command. Returns { code, out }. Output is captured unless `show` is set.
export function run(cmd, args, { show = false, env } = {}) {
  const result = spawnSync(cmd, args, {
    cwd: ROOT,
    encoding: "utf8",
    stdio: show ? "inherit" : "pipe",
    // npx/npm are .cmd files on Windows and need a shell.
    shell: process.platform === "win32" && (cmd === "npx" || cmd === "npm"),
    env: env ? { ...process.env, ...env } : process.env,
  });
  if (result.error) return { code: 1, out: String(result.error.message) };
  return { code: result.status ?? 1, out: `${result.stdout ?? ""}${result.stderr ?? ""}`.trimEnd() };
}

export function git(...args) {
  return run("git", args);
}

export function currentBranch() {
  return git("rev-parse", "--abbrev-ref", "HEAD").out;
}

export function head() {
  return git("rev-parse", "HEAD").out;
}

// True when there are uncommitted changes, including new files (ignored files don't count).
export function hasChanges() {
  return git("status", "--porcelain").out !== "";
}

export function hasRemote() {
  return git("remote").out.split("\n").includes("origin");
}

// A rebase, merge, or revert left half-finished (e.g. by a crash) needs a human.
export function gitIsBusy() {
  const gitDir = git("rev-parse", "--git-dir").out;
  return ["rebase-merge", "rebase-apply", "MERGE_HEAD", "REVERT_HEAD", "CHERRY_PICK_HEAD"].some((p) =>
    existsSync(join(ROOT, gitDir, p)),
  );
}

export function requireStaging() {
  if (gitIsBusy()) stop(`Git is in the middle of an unfinished operation. ${CONTACT}`);
  if (currentBranch() !== BRANCH) {
    stop(`This only works on the "${BRANCH}" version of the site. Run \`npm run start\` first.`);
  }
}

// Pull the latest staging with rebase. On failure, abort the rebase, run `cleanup`
// so the caller can put its own changes back, then stop. Returns true if new changes arrived.
export function pullLatest(cleanup = () => {}) {
  if (!hasRemote()) {
    say("No online copy of the site is set up yet, so there is nothing to download.");
    return false;
  }
  const before = head();
  const pulled = git("pull", "--rebase", "origin", BRANCH);
  if (pulled.code !== 0) {
    if (gitIsBusy()) git("rebase", "--abort");
    cleanup();
    const conflict = /conflict/i.test(pulled.out);
    stop(
      conflict
        ? `Someone else changed the same part of the site, so the latest version couldn't be combined with yours. Your files are unchanged. ${CONTACT}`
        : `Couldn't download the latest version of the site (check your internet connection). Your files are unchanged.\n\nDetails: ${pulled.out}`,
    );
  }
  return head() !== before;
}

// Number of local commits not yet on the online staging branch.
export function unshippedCount() {
  if (!hasRemote()) return 0;
  git("fetch", "origin", BRANCH);
  const count = git("rev-list", "--count", `origin/${BRANCH}..HEAD`);
  return count.code === 0 ? Number(count.out) : 0;
}

// Apply migrations to the local D1 database, then load every seed/*.sql file in order.
// `persistTo` selects a different local database folder (used by the tests).
export function setupLocalDatabase(persistTo) {
  const where = ["--local", ...(persistTo ? ["--persist-to", persistTo] : [])];
  const migrated = run("npx", ["wrangler", "d1", "migrations", "apply", "DB", ...where]);
  if (migrated.code !== 0) stop(`Couldn't set up the local database. ${CONTACT}\n\nDetails: ${migrated.out}`);

  const seedDir = join(ROOT, "seed");
  const seeds = existsSync(seedDir) ? readdirSync(seedDir).filter((f) => f.endsWith(".sql")).sort() : [];
  for (const file of seeds) {
    const seeded = run("npx", ["wrangler", "d1", "execute", "DB", ...where, "--file", join("seed", file)]);
    if (seeded.code !== 0) {
      stop(`Couldn't load sample data from seed/${file}. ${CONTACT}\n\nDetails: ${seeded.out}`);
    }
  }
}

// Local secrets live in .dev.vars (git-ignored). Create it from the example on first run.
export function ensureDevVars() {
  const devVars = join(ROOT, ".dev.vars");
  if (!existsSync(devVars)) copyFileSync(join(ROOT, ".dev.vars.example"), devVars);
}
