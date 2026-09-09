import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// base must match the GitHub Pages project path: MTBasso.github.io/palette-creator/
export default defineConfig({
  base: "/palette-creator/",
  plugins: [react()],
});
