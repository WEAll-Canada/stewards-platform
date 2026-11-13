// Checks that this computer has everything the site needs. Never installs anything:
// missing Node or GitHub CLI is installed by scripts/setup-tools.sh (Mac) or .ps1 (Windows).
// Usage: npm run doctor
// Uses only Node built-ins so it works before `npm ci` has run.
import { spawnSync } from "node:child_process";
import { existsSync, readFileSync, statSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");

const WINDOWS = process.platform === "win32";
const GIT_FIX = WINDOWS
  ? "Install it from https://git-scm.com/downloads/win, then restart your agent app."
  : "Your agent will run the setup script, which asks Apple to install it.";
const INSTALL_FIX = "Your agent will install it with the setup script.";

// Each check returns { status, label, detail }.
// status: "ok" | "fail" | "setup" ("setup" = fixed automatically by `npm run start`).
function ok(label, detail) {
  return { status: "ok", label, detail };
}
function fail(label, detail) {
  return { status: "fail", label, detail };
}

function run(cmd, args) {
  const result = spawnSync(cmd, args, { cwd: ROOT, encoding: "utf8" });
  if (result.error) return { found: false, code: null, out: "" };
  return { found: true, code: result.status, out: `${result.stdout}${result.stderr}`.trim() };
}

function requiredNodeMajor() {
  const raw = readFileSync(join(ROOT, ".nvmrc"), "utf8").trim().replace(/^v/, "");
  return Number.parseInt(raw, 10);
}

function checkGit() {
  const r = run("git", ["--version"]);
  if (!r.found || r.code !== 0) {
    return fail("Git", `MISSING. ${GIT_FIX}`);
  }
  return ok("Git", r.out.replace(/^git version /, ""));
}

function checkNode() {
  const need = requiredNodeMajor();
  const have = process.versions.node;
  if (Number.parseInt(have, 10) < need) {
    return fail(
      "Node",
      `WRONG VERSION. You have ${have}, this site needs version ${need} or newer. ${INSTALL_FIX}`,
    );
  }
  return ok("Node", have);
}

function checkGh() {
  const r = run("gh", ["--version"]);
  if (!r.found || r.code !== 0) {
    return fail("GitHub CLI", `MISSING. ${INSTALL_FIX}`);
  }
  return ok("GitHub CLI", r.out.split("\n")[0].replace(/^gh version /, ""));
}

function checkGhAuth() {
  const r = run("gh", ["auth", "status"]);
  if (!r.found) return fail("GitHub sign-in", "Needs the GitHub CLI first (see above).");
  if (r.code !== 0) {
    return fail("GitHub sign-in", "NOT SIGNED IN. Ask your agent to sign you in to GitHub.");
  }
  // Signed in to gh isn't enough: git must use that sign-in, or `npm run ship` can't send changes.
  const helper = run("git", ["config", "--get-all", "credential.https://github.com.helper"]);
  if (!/gh(\.exe)?["']? auth git-credential/.test(helper.out)) {
    return fail("GitHub sign-in", "NOT CONNECTED TO GIT. Ask your agent to sign you in to GitHub.");
  }
  return ok("GitHub sign-in", "signed in");
}

function checkGitIdentity() {
  const name = run("git", ["config", "user.name"]);
  const email = run("git", ["config", "user.email"]);
  if (!name.found) return fail("Git name and email", "Needs Git first (see above).");
  const missing = [];
  if (!name.out) missing.push("name");
  if (!email.out) missing.push("email");
  if (missing.length) {
    return fail(
      "Git name and email",
      `MISSING ${missing.join(" and ")}. Your agent will ask you for it and save it for this site.`,
    );
  }
  return ok("Git name and email", `${name.out} <${email.out}>`);
}

export function checkNodeModules() {
  const installed = join(ROOT, "node_modules", ".package-lock.json");
  const lock = join(ROOT, "package-lock.json");
  if (!existsSync(installed)) {
    return { status: "setup", label: "Site packages", detail: "Not installed yet. `npm run start` installs them." };
  }
  if (existsSync(lock) && statSync(lock).mtimeMs > statSync(installed).mtimeMs) {
    return { status: "setup", label: "Site packages", detail: "Out of date. `npm run start` updates them." };
  }
  return ok("Site packages", "installed");
}

export function runChecks() {
  return [checkGit(), checkNode(), checkGh(), checkGhAuth(), checkGitIdentity(), checkNodeModules()];
}

export function printReport(results) {
  const tag = { ok: "OK   ", fail: "FIX  ", setup: "SETUP" };
  console.log("Checking this computer...\n");
  for (const r of results) console.log(`  ${tag[r.status]}  ${r.label}: ${r.detail}`);
  const problems = results.filter((r) => r.status === "fail").length;
  console.log(
    problems === 0
      ? "\nAll set. This computer is ready to work on the site."
      : `\n${problems} thing${problems === 1 ? "" : "s"} to fix before working on the site.`,
  );
  return problems === 0;
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  process.exit(printReport(runChecks()) ? 0 : 1);
}
