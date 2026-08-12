// @ts-check
import { defineConfig } from 'astro/config';

import sitemap from '@astrojs/sitemap';

// https://astro.build/config
export default defineConfig({
  site: 'https://fiction.graboski.ca',

  build: {
    inlineStylesheets: 'always',
  },

  server: {
    port: 5173,
  },

  integrations: [
    sitemap({
      filter: (page) => {
        const pathname = new URL(page).pathname;
        return pathname !== '/share' && !pathname.startsWith('/share/');
      },
    }),
  ],
});