import { defineConfig } from "astro/config";
import tailwind from '@astrojs/tailwind';

export default defineConfig({
  site: "https://daily-fitness-exercises-0.pages.dev",
  integrations: [tailwind()],
  output: "static",
});