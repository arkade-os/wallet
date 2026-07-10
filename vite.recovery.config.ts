import { defineConfig } from 'vite'
import { resolve } from 'path'
import { viteSingleFile } from 'vite-plugin-singlefile'

// Builds the self-contained offline recovery tool (recovery/recover.html →
// public/recover.html). Everything is inlined into one HTML file so users can
// keep it on disk and run it without any server or network access.
export default defineConfig({
  root: resolve(__dirname, 'recovery'),
  plugins: [viteSingleFile()],
  build: {
    outDir: resolve(__dirname, 'public'),
    emptyOutDir: false,
    // everything is inlined — the preload polyfill would only add a dead fetch() path
    modulePreload: { polyfill: false },
    rollupOptions: {
      input: resolve(__dirname, 'recovery/recover.html'),
    },
  },
})
