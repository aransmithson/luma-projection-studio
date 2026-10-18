import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  base: "./",
  server: {
    host: "127.0.0.1",
    port: 5173,
    strictPort: true,
    // Generated Windows executables and Chromium profiles are not source.
    // Watching them also holds directories open during packaging on Windows.
    watch: { ignored: ["**/release/**", "**/test-results/**"] },
  },
});
