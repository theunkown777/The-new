import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';

// GitHub Pages deployment settings.
// If you deploy to a custom domain, set `base: '/'` and update `site` below.
const site = 'https://lucakolhoff1777.github.io';
const base = '/The-new/';

export default defineConfig({
  site: `${site}${base}`,
  base,
  integrations: [sitemap()],
});
