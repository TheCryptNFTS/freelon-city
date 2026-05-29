import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

// Map the "@/" path alias (tsconfig.json "paths") to the repo root so test
// files and the modules they import can use "@/lib/..." specifiers.
const root = fileURLToPath(new URL(".", import.meta.url));

export default defineConfig({
  resolve: {
    alias: {
      "@": root,
    },
  },
  test: {
    environment: "node",
    globals: true,
    include: ["lib/**/*.test.ts"],
  },
});
