import { defineConfig } from 'astro/config';
// Static output, one html file per page so Vercel's cleanUrls serves /move/dolly-in without a slash.
export default defineConfig({ site: 'https://directorchair.ai', output: 'static', trailingSlash: 'never', build: { format: 'file' }, devToolbar: { enabled: false } });
