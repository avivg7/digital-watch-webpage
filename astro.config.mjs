import { defineConfig } from 'astro/config';

// Static site for GitHub Pages (project site). No server runtime, no integrations that call out at build or run time.
export default defineConfig({
  site: 'https://avivg7.github.io',
  base: '/digital-watch-webpage/',
  output: 'static',
  trailingSlash: 'always',
  build: { format: 'directory', inlineStylesheets: 'auto' },
  compressHTML: true,
  devToolbar: { enabled: false },
  vite: { build: { assetsInlineLimit: 0 } },
});
