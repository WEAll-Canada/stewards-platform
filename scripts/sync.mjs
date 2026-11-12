// Download the latest version of the site from staging.
// Usage: npm run sync
import { checkNodeModules } from "./doctor.mjs";
import { CONTACT, hasChanges, pullLatest, requireStaging, run, say, setupLocalDatabase, stop } from "./lib.mjs";

requireStaging();
if (hasChanges()) {
  stop(
    "You have changes that haven't been shipped yet. Ship them (`npm run ship`) or undo them (`npm run undo`) first, then get the latest.",
  );
}

say("Getting the latest version of the site...");
if (!pullLatest()) {
  say("Already up to date.");
  process.exit(0);
}

if (checkNodeModules().status !== "ok") {
  say("Updating site packages...");
  if (run("npm", ["ci"], { show: true }).code !== 0) stop(`Couldn't update site packages. ${CONTACT}`);
}
setupLocalDatabase();
say("Downloaded the latest changes. The preview will pick them up automatically.");
