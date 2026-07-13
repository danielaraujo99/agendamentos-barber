import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import { VitePWA } from "vite-plugin-pwa";
import path from "path";
import { componentTagger } from "lovable-tagger";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  server: {
    // 0.0.0.0 garante que o celular na mesma Wi-Fi acesse pelo IP local
    host: "0.0.0.0",
    port: 8080,
    strictPort: false,
    hmr: {
      overlay: false,
    },
  },
  plugins: [
    react(),
    VitePWA({
      injectRegister: null,
      registerType: "autoUpdate",
      strategies: "generateSW",
      filename: "notifications-sw.js",
      manifest: false,
      devOptions: { enabled: false },
      workbox: {
        cleanupOutdatedCaches: true,
        clientsClaim: true,
        skipWaiting: true,
        navigateFallback: "/index.html",
        navigateFallbackDenylist: [/^\/~oauth/],
        globPatterns: ["**/*.{js,css,html,ico,png,svg,webp,jpg,jpeg,woff,woff2}"],
        importScripts: ["/push-handlers.js"],
        runtimeCaching: [
          {
            urlPattern: ({ request, url }) => request.mode === "navigate" && !url.pathname.startsWith("/~oauth"),
            handler: "NetworkFirst",
            options: {
              cacheName: "genesis-pages",
              networkTimeoutSeconds: 3,
              expiration: { maxEntries: 24, maxAgeSeconds: 60 * 60 * 24 },
            },
          },
          {
            urlPattern: ({ request, sameOrigin }) =>
              sameOrigin && ["script", "style", "worker"].includes(request.destination),
            handler: "CacheFirst",
            options: {
              cacheName: "genesis-app-assets",
              expiration: { maxEntries: 96, maxAgeSeconds: 60 * 60 * 24 * 30 },
            },
          },
          {
            urlPattern: ({ request, sameOrigin }) => sameOrigin && ["image", "font"].includes(request.destination),
            handler: "CacheFirst",
            options: {
              cacheName: "genesis-static-assets",
              expiration: { maxEntries: 96, maxAgeSeconds: 60 * 60 * 24 * 30 },
            },
          },
        ],
      },
    }),
    mode === "development" && componentTagger(),
  ].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  optimizeDeps: {
    esbuildOptions: {
      target: "es2022",
    },
  },
  build: {
    target: "es2022",
    cssCodeSplit: true,
    reportCompressedSize: false,
    chunkSizeWarningLimit: 1200,
    minify: "esbuild",
    sourcemap: false,
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (!id.includes("node_modules")) return;
          if (id.includes("react-dom") || id.match(/[\\/]react[\\/]/) || id.includes("scheduler"))
            return "react-vendor";
          if (id.includes("react-router")) return "router";
          if (id.includes("@tanstack/react-query")) return "query";
          if (id.includes("@supabase")) return "supabase";
          if (id.includes("@radix-ui")) return "radix";
          if (id.includes("lucide-react")) return "icons";
          if (id.includes("maplibre-gl")) return "maplibre";
          if (id.includes("recharts") || id.includes("d3-")) return "charts";
          if (id.includes("date-fns") || id.includes("dayjs")) return "date";
          if (id.includes("framer-motion")) return "motion";
          if (id.includes("zod") || id.includes("react-hook-form")) return "forms";
          return "vendor";
        },
      },
    },
  },
}));
