// Check the site, save the changes, and send them to the staging site.
// Usage: npm run ship -- "What changed, in plain words"
// Staging migrations and the deploy itself run in GitHub Actions after the push,
// so no Cloudflare credentials are ever needed on this computer.
import {
  BRANCH,
  CONTACT,
  STAGING_URL,
  git,
  hasChanges,
  hasRemote,
  head,
  pullLatest,
  requireStaging,
  run,
  say,
  stop,
  unshippedCount,
} from "./lib.mjs";

const summary = process.argv.slice(2).join(" ").trim();
if (!summary) stop('Please describe what changed, for example: npm run ship -- "Updated the opening hours"');

requireStaging();
if (!hasRemote()) stop(`No online copy of the site is set up yet. ${CONTACT}`);
if (!hasChanges() && unshippedCount() === 0) {
  say("There are no new changes to ship.");
  process.exit(0);
}

function checkSite(when) {
  say(`Checking that the site builds${when}...`);
  const built = run("npx", ["astro", "build"]);
  if (built.code !== 0) {
    stop(`The site doesn't build, so nothing was shipped. Here's what went wrong:\n\n${built.out.split("\n").slice(-20).join("\n")}`);
  }
  say(`Running the site's tests${when}...`);
  const tested = run("npm", ["run", "-s", "test"]);
  if (tested.code !== 0) {
    stop(`Some tests failed, so nothing was shipped. Here's what went wrong:\n\n${tested.out.split("\n").slice(-40).join("\n")}`);
  }
}

checkSite("");

// Save the changes as a commit (remember where we started, so a conflict can put things back).
const before = head();
let committed = false;
if (hasChanges()) {
  git("add", "-A");
  const commit = git("commit", "-m", summary);
  if (commit.code !== 0) stop(`Couldn't save your changes. ${CONTACT}\n\nDetails: ${commit.out}`);
  committed = true;
}

// Combine with anyone else's changes. On conflict, undo our commit so the files are as they were.
const gotNew = pullLatest(() => {
  if (committed) {
    git("reset", "--soft", before);
    git("reset", "-q");
  }
});

// Other people's changes arrived: make sure the combination still works before sending it.
if (gotNew) checkSite(" with the latest changes from others");

say("Sending to the staging site...");
const sha = head();
const pushed = git("push", "origin", BRANCH);
if (pushed.code !== 0) {
  stop(
    `Couldn't send your changes (check your internet connection). They're saved on this computer; try shipping again in a moment.\n\nDetails: ${pushed.out}`,
  );
}

// Follow the GitHub Actions deploy for this commit, if there is one.
function findDeployRun() {
  for (let attempt = 0; attempt < 12; attempt++) {
    const list = run("gh", ["run", "list", "--workflow", "deploy.yml", "--commit", sha, "--json", "databaseId"]);
    if (list.code !== 0) return null; // No deploy workflow or not a GitHub repo.
    const runs = JSON.parse(list.out || "[]");
    if (runs.length) return runs[0].databaseId;
    Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, 5000);
  }
  return null;
}

const runId = findDeployRun();
if (!runId) {
  say(`\nShipped! The staging site updates in a few minutes${STAGING_URL ? `: ${STAGING_URL}` : "."}`);
  process.exit(0);
}

say("Updating the staging site (usually 2-3 minutes)...");
const watched = run("gh", ["run", "watch", String(runId), "--exit-status"]);
if (watched.code !== 0) {
  stop(`Your changes were sent, but updating the staging site failed. ${CONTACT}`);
}
say(`\nShipped! See it on the staging site: ${STAGING_URL ?? "(ask your operator for the link)"}`);
