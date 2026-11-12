// Get the latest site, set up the local database, and start the preview.
// Usage: npm run start
import { spawn } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { checkNodeModules, printReport, runChecks } from "./doctor.mjs";
import {
  BRANCH,
  CONTACT,
  ROOT,
  currentBranch,
  git,
  gitIsBusy,
  hasChanges,
  pullLatest,
  run,
  ensureDevVars,
  say,
  setupLocalDatabase,
  stop,
} from "./lib.mjs";

// 1. Check the computer.
if (!printReport(runChecks())) stop("Fix the items above, then try again.");
say();

// 2. Switch to the staging version of the site.
if (gitIsBusy()) stop(`Git is in the middle of an unfinished operation. ${CONTACT}`);
if (currentBranch() !== BRANCH) {
  if (hasChanges()) {
    stop(
      `You have unsaved changes on the "${currentBranch()}" version of the site, and switching would lose them. ${CONTACT}`,
    );
  }
  say(`Switching to the "${BRANCH}" version of the site...`);
  if (git("switch", BRANCH).code !== 0) {
    stop(`Couldn't find the "${BRANCH}" version of the site. ${CONTACT}`);
  }
}

// 3. Get the latest version, unless that would mix with unshipped work.
if (hasChanges()) {
  say("You have changes that haven't been shipped yet, so I kept them and skipped downloading the latest version.");
} else {
  say("Getting the latest version of the site...");
  say(pullLatest() ? "Downloaded the latest changes." : "Already up to date.");
}

// 4. Install site packages if missing or out of date.
if (checkNodeModules().status !== "ok") {
  say("Installing site packages (this can take a minute)...");
  if (run("npm", ["ci"], { show: true }).code !== 0) stop(`Couldn't install site packages. ${CONTACT}`);
}

// 5. Local database: apply migrations, then load sample data.
say("Setting up the local database...");
ensureDevVars();
setupLocalDatabase();

// 6. Start the preview (or reuse one that's already running).
let status = run("npx", ["astro", "dev", "status"]);
if (!/running at/i.test(status.out)) {
  say("Starting the preview...");
  const started = run("npx", ["astro", "dev", "--background"]);
  if (started.code !== 0) stop(`Couldn't start the preview. ${CONTACT}\n\nDetails: ${started.out}`);
  status = run("npx", ["astro", "dev", "status"]);
}
const url = status.out.match(/https?:\/\/[^\s)"\\]+/)?.[0];
if (!url) stop(`The preview didn't start. ${CONTACT}\n\nDetails: ${status.out}`);

say(`\nThe preview is running at ${url}`);
say("Changes to the site show up there automatically.");

// 7. Mention open to-do items.
const todoPath = join(ROOT, "TODO.md");
if (existsSync(todoPath)) {
  const open = readFileSync(todoPath, "utf8")
    .split("\n")
    .filter((line) => /^\s*- \[ \]/.test(line));
  if (open.length) {
    say(`\nOpen to-do items (${open.length}):`);
    for (const line of open) say(`  ${line.trim().replace(/^- \[ \] /, "- ")}`);
  }
}

// 8. Open the preview in the browser.
if (!process.env.CI && !process.env.NO_OPEN) {
  const [cmd, args] =
    process.platform === "darwin"
      ? ["open", [url]]
      : process.platform === "win32"
        ? ["cmd", ["/c", "start", "", url]]
        : ["xdg-open", [url]];
  spawn(cmd, args, { stdio: "ignore", detached: true }).on("error", () => {}).unref();
}
