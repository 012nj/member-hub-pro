import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { TanStackRouterVite } from "@tanstack/router-plugin/vite";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { defineConfig } from "vite";

const projectRoot = fileURLToPath(new URL(".", import.meta.url));

export default defineConfig({
  root: resolve(projectRoot, "spa"),
  envDir: projectRoot,
  base: "/",
  publicDir: resolve(projectRoot, "public"),
  plugins: [
    TanStackRouterVite({
      autoCodeSplitting: true,
      enableRouteGeneration: false,
      routesDirectory: resolve(projectRoot, "src/routes"),
    }),
    react(),
    tailwindcss(),
  ],
  resolve: {
    alias: {
      "@": resolve(projectRoot, "src"),
    },
  },
  build: {
    outDir: resolve(projectRoot, "dist"),
    emptyOutDir: true,
  },
});
