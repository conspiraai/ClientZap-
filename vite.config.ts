import { defineConfig } from "vite"
import react from "@vitejs/plugin-react"
import path from "path"

export default defineConfig({
  plugins: [react()],
  root: ".", // 👈 ensures Vite looks in the project root for index.html
  build: {
    outDir: "dist"
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "src"),
      components: path.resolve(__dirname, "src/components"),
      pages: path.resolve(__dirname, "src/pages"),
      lib: path.resolve(__dirname, "src/lib"),
      hooks: path.resolve(__dirname, "src/hooks")
    }
  }
})
