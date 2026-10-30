import { fileURLToPath, URL } from "node:url";
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// The platform app is a separate deployment from any school instance
// (docs/adr/0011): its dev server runs on 5174 and proxies the control
// plane API on :8090.
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: { "@": fileURLToPath(new URL("./src", import.meta.url)) },
  },
  server: {
    port: 5174,
    proxy: {
      "/platform": {
        target: "http://localhost:8090",
        changeOrigin: true,
      },
    },
  },
  build: {
    target: "es2022",
    sourcemap: true,
  },
});
