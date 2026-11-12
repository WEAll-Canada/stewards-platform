// @ts-check
import { defineConfig } from "astro/config";
import cloudflare from "@astrojs/cloudflare";

export default defineConfig({
  output: "server",
  adapter: cloudflare({
    // Plain <img> handling; avoids adding a Cloudflare Images binding.
    imageService: "passthrough",
    // Tests use their own throwaway local database so they never touch preview data.
    persistState: process.env.LOCAL_STATE_DIR ? { path: process.env.LOCAL_STATE_DIR } : true,
  }),
  // No KV-backed sessions: keeps each client on Workers + D1 only.
  session: false,
});
