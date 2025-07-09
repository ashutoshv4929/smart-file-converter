import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";
import runtimeErrorOverlay from "@replit/vite-plugin-runtime-error-modal";
import { viteStaticCopy } from "vite-plugin-static-copy";

export default defineConfig({
  resolve: {
    preserveSymlinks: true,
    alias: {
      "@": path.resolve(__dirname, "client", "src"),
      "@shared": path.resolve(__dirname, "shared"),
      "@assets": path.resolve(__dirname, "attached_assets"),
    },
  },
  plugins: [
    react(),
    runtimeErrorOverlay(),
    viteStaticCopy({
      targets: [
        {
          src: path.resolve(__dirname, "shared"),
          dest: "",
        },
      ],
    }),
    // नीचे async import हटा दिया गया है, क्योंकि Vite config में top-level await allowed नहीं है
    // ...(process.env.NODE_ENV !== "production" &&
    // process.env.REPL_ID !== undefined
    //   ? [
    //       await import("@replit/vite-plugin-cartographer").then((m) =>
    //         m.cartographer(),
    //       ),
    //     ]
    //   : []),
  ],
  root: path.resolve(__dirname, "client"),
  build: {
    outDir: path.resolve(__dirname, "dist/public"),
    emptyOutDir: true,
    rollupOptions: {
      input: "server/index.ts",
      external: ["fsevents", "pkg", "../pkg"],
    },
  },
  server: {
    fs: {
      strict: true,
      deny: ["**/.*"],
    },
  },
});
