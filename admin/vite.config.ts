import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import svgr from "vite-plugin-svgr";

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    svgr({
      svgrOptions: {
        icon: true,
        exportType: "named",
        namedExport: "ReactComponent",
      },
    }),
  ],
  server: {
    host: true,
    port: 5173,
    allowedHosts: ["cristians-macbook-air.local"],
    proxy: {
      "/api": {
        target: "http://cristians-macbook-air.local:4000",
        changeOrigin: true,
        secure: false,
      },
    },
  },
});