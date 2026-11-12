// Undo changes. Never rewrites shared history.
// - Unshipped changes: discards them.
// - Otherwise: reverses the last shipped change with a new commit and ships that.
// Usage: npm run undo            (do it)
//        npm run undo -- --check (only describe what would be undone)
import { CONTACT, git, hasChanges, hasRemote, requireStaging, run, say, stop, unshippedCount } from "./lib.mjs";

const checkOnly = process.argv.includes("--check");
requireStaging();

if (hasChanges()) {
  const files = git("status", "--porcelain").out.split("\n").map((line) => line.slice(3));
  if (checkOnly) {
    say("Undo would throw away these unshipped changes:");
    for (const f of files) say(`  - ${f}`);
    process.exit(0);
  }
  git("restore", "--source=HEAD", "--staged", "--worktree", "--", ".");
  git("clean", "-fd"); // removes new files; git-ignored files like .dev.vars are kept
  say(`Threw away unshipped changes to ${files.length} file${files.length === 1 ? "" : "s"}. The preview is back to the last shipped version.`);
  process.exit(0);
}

// Nothing unshipped: reverse the last shipped change.
if (hasRemote()) {
  git("fetch", "origin", "staging");
  if (git("rev-list", "--count", "HEAD..origin/staging").out !== "0") {
    stop("There are newer changes online. Get the latest first (`npm run sync`), then try undo again.");
  }
}

const [subject, parents] = git("log", "-1", "--format=%s%x00%P").out.split("\0");
const parentCount = parents.trim() ? parents.trim().split(" ").length : 0;
if (parentCount !== 1) stop(`The last change can't be undone automatically. ${CONTACT}`);

const touched = git("diff-tree", "--no-commit-id", "--name-only", "-r", "HEAD").out.split("\n");
if (touched.some((f) => f.startsWith("migrations/"))) {
  stop(`The last change included a database change, which can't be undone automatically. ${CONTACT}`);
}

if (checkOnly) {
  say(`Undo would reverse the last shipped change: "${subject}"`);
  process.exit(0);
}

const reverted = git("revert", "--no-edit", "HEAD");
if (reverted.code !== 0) {
  git("revert", "--abort");
  stop(`Couldn't undo the last change. Your files are unchanged. ${CONTACT}`);
}

say(`Reversed "${subject}". Shipping the undo to staging...`);
const shipped = run("node", ["scripts/ship.mjs", `Undo: ${subject}`], { show: true });
if (shipped.code !== 0) {
  // If the undo never left this computer, take it back so the files match staging again.
  // (--keep refuses if any files changed.)
  if (unshippedCount() > 0) git("reset", "--keep", "HEAD~1");
  process.exit(1);
}
