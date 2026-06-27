import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    include: ["src/**/*.test.{ts,tsx}", "functions/**/*.test.ts", "scripts/**/*.test.mjs"],
  },
});
