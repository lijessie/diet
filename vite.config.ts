import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { VitePWA } from "vite-plugin-pwa";
export default defineConfig(({ mode }) => ({
  build: {
    outDir:
      mode === "desktop"
        ? "dist-desktop"
        : mode === "android"
          ? "dist-android"
          : "dist",
  },
  plugins: [
    react(),
    ...(["desktop", "android"].includes(mode)
      ? []
      : [
          VitePWA({
            registerType: "autoUpdate",
            includeAssets: ["icon.svg"],
            manifest: {
              name: "Daily — Macro tracker",
              short_name: "Daily",
              description: "Your food, recipes and daily nutrition.",
              theme_color: "#245b46",
              background_color: "#f6f7f2",
              display: "standalone",
              start_url: "/",
              icons: [
                { src: "/icon-192.png", sizes: "192x192", type: "image/png" },
                { src: "/icon-512.png", sizes: "512x512", type: "image/png" },
                {
                  src: "/icon.svg",
                  sizes: "any",
                  type: "image/svg+xml",
                  purpose: "any",
                },
              ],
            },
            workbox: { globPatterns: ["**/*.{js,css,html,svg,png,woff2}"] },
          }),
        ]),
  ],
}));
