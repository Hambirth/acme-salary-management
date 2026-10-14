import { defineConfig } from "vitest/config";
export default defineConfig({
  test: {
    environment: "jsdom",
    include: ["tests/web/**/*.test.tsx"],
    setupFiles: ["./tests/web/setup.ts"],
  },
});
