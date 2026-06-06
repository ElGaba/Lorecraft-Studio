import { fileURLToPath, URL } from "node:url";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

export default defineConfig({
  plugins: [react()],
  server: {
    fs: {
      allow: [fileURLToPath(new URL("../..", import.meta.url))]
    }
  },
  resolve: {
    alias: {
      "@adventurekit/core": fileURLToPath(new URL("../../packages/core/src/index.ts", import.meta.url)),
      "@adventurekit/react-runtime": fileURLToPath(new URL("../../packages/react-runtime/src/index.tsx", import.meta.url))
    }
  }
});
