import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";

export default defineConfig({
  // <-- IMPORTANT: our app lives in /src
  root: path.resolve(__dirname, "src"),

  plugins: [react()],

  resolve: {
    alias: {
      "@": path.resolve(__dirname, "src"),
      components: path.resolve(__dirname, "src/components"),
      pages: path.resolve(__dirname, "src/pages"),
      lib: path.resolve(__dirname, "src/lib"),
      hooks: path.resolve(__dirname, "src/hooks"),
    },
  },

  // build output goes back to project root /dist
  build: {
    outDir: "../dist",
    emptyOutDir: true,
  },

  // optional local dev niceties
  server: { port: 5173, open: true },
  preview: { port: 5173 },
});
