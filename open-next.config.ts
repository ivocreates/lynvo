import { defineCloudflareConfig } from "@opennextjs/cloudflare";

// `npm run build` runs the OpenNext build (so every Cloudflare build command
// produces .open-next/worker.js); OpenNext then runs the plain Next.js build
// through `build:next` instead of `npm run build`, which would recurse.
export default {
  ...defineCloudflareConfig(),
  buildCommand: "npm run build:next",
};
