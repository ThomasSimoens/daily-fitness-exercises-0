import { defineConfig } from "astro/config";
import tailwind from '@astrojs/tailwind';
import cloudflare from '@astrojs/cloudflare';

export default defineConfig({
  site: "https://daily-fitness-exercises-0.pages.dev",
  integrations: [tailwind(), cloudflare()],
});
