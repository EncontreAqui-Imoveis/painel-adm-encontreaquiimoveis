import { defineConfig } from 'vite'
import { svelte } from '@sveltejs/vite-plugin-svelte'
import tailwindcss from '@tailwindcss/vite'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

export default defineConfig(({ mode }) => ({
  plugins: [
    tailwindcss(),
    svelte(),
    {
      name: 'local-smoke-csp',
      transformIndexHtml(html) {
        if (mode !== 'smoke') return html
        return html.replace(
          "connect-src 'self' https: ws: wss: https://api.cloudinary.com",
          "connect-src 'self' http://127.0.0.1:3335 https: ws: wss: https://api.cloudinary.com",
        )
      },
    },
  ],
  resolve: {
    alias: {
      $lib: path.resolve(__dirname, 'src/lib'),
    },
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('node_modules')) {
            if (id.includes('node_modules/chart.js')) return 'vendor-chartjs';
            if (id.includes('node_modules/lucide-svelte')) return 'vendor-icons';
            if (id.includes('node_modules/axios')) return 'vendor-axios';
            if (id.includes('node_modules/svelte') || id.includes('node_modules/@sveltejs')) {
              return 'vendor-svelte';
            }
            return undefined;
          }
          return undefined;
        },
      },
    },
  },
}))
