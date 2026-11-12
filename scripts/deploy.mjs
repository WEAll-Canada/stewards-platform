// Build and deploy one Cloudflare environment: node scripts/deploy.mjs <staging|production>
// The Cloudflare Vite plugin picks the environment at build time from CLOUDFLARE_ENV,
// so the build and the deploy must target the same environment.
import { spawnSync } from "node:child_process";

const ENVS = ["staging", "production"];
const env = process.argv[2];

if (!ENVS.includes(env)) {
  console.error(`Please say which environment to deploy: ${ENVS.join(" or ")}.`);
  process.exit(1);
}

function run(args, extraEnv = {}) {
  const result = spawnSync("npx", args, {
    stdio: "inherit",
    shell: process.platform === "win32",
    env: { ...process.env, ...extraEnv },
  });
  if (result.status !== 0) {
    console.error(`\nStopped: "npx ${args.join(" ")}" did not finish successfully.`);
    process.exit(result.status ?? 1);
  }
}

run(["astro", "build"], { CLOUDFLARE_ENV: env });
run(["wrangler", "deploy", "--env", env]);
