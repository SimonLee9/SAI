import { defineConfig } from "vitest/config";

// Separate from vite.config.ts to dodge the type collision between vite's
// exported types and the vite version that vitest bundles internally.
// We don't pull @vitejs/plugin-react here — vitest handles TS/JSX via
// esbuild for tests, and we don't need HMR in CI runs. CSS is enabled
// only so component imports of Tailwind classes don't crash the loader.

export default defineConfig({
  test: {
    environment: "jsdom",
    globals: true,
    setupFiles: ["./src/test/setup.ts"],
    css: true,
  },
});
