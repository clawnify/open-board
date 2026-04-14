import { defineConfig } from "vite";
import preact from "@preact/preset-vite";
import tailwindcss from "@tailwindcss/vite";

export default defineConfig({
  plugins: [preact(), tailwindcss()],
  build: { outDir: "dist" },
  server: {
    port: 5179,
    proxy: {
      "/api": "http://localhost:3007",
    },
  },
});
