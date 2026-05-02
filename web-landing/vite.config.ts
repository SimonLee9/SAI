import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

// Vitest configuration lives in vitest.config.ts to avoid the type
// collision between vite's exported types and the vite version that
// vitest bundles internally.

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    port: 5174, // web-dashboard reserves 5173
    open: true,
  },
});
