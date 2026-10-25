import { defineConfig } from "vitest/config";
import { fileURLToPath } from "node:url";

// Row-level security tests against the local Supabase stack.
export default defineConfig({
  resolve: { alias: { "@": fileURLToPath(new URL("./", import.meta.url)) } },
  test: { include: ["tests/rls/**/*.test.ts"], environment: "node", testTimeout: 30_000, fileParallelism: false },
});
