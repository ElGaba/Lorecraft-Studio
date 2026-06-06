import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "jsdom",
    include: ["packages/**/*.test.ts", "apps/**/*.test.ts", "packages/**/*.test.tsx", "apps/**/*.test.tsx"]
  }
});
