// Run the Playwright tests against a local production build.
// Usage: npm run test            (all tests)
//        npm run test -- <args>  (passed to Playwright, e.g. a file name)
// Tests get a fresh throwaway database in .wrangler/test-state, separate from the preview's.
import { rmSync } from "node:fs";
import { join } from "node:path";
import { CONTACT, ROOT, ensureDevVars, run, say, setupLocalDatabase, stop } from "./lib.mjs";

const TEST_STATE = join(".wrangler", "test-state");

ensureDevVars();
say("Preparing a fresh test database...");
rmSync(join(ROOT, TEST_STATE), { recursive: true, force: true });
setupLocalDatabase(TEST_STATE);

// Downloads the test browser into Playwright's own cache the first time; no-op afterwards.
const browser = run("npx", ["playwright", "install", "chromium"]);
if (browser.code !== 0) stop(`Couldn't download the test browser. ${CONTACT}\n\nDetails: ${browser.out}`);

say("Building the site...");
const built = run("npx", ["astro", "build"]);
if (built.code !== 0) stop(`The site doesn't build:\n\n${built.out.split("\n").slice(-20).join("\n")}`);

say("Running tests...");
const tested = run("npx", ["playwright", "test", ...process.argv.slice(2)], {
  show: true,
  env: { LOCAL_STATE_DIR: TEST_STATE },
});
process.exit(tested.code);
