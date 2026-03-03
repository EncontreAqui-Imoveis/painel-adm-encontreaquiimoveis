import { defineConfig } from 'vite';
import { svelte } from '@sveltejs/vite-plugin-svelte';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
export default defineConfig({
    plugins: [
        svelte()
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
                        if (id.includes('node_modules/chart.js'))
                            return 'vendor-chartjs';
                        if (id.includes('node_modules/lucide-svelte'))
                            return 'vendor-icons';
                        if (id.includes('node_modules/axios'))
                            return 'vendor-axios';
                        if (id.includes('node_modules/svelte') || id.includes('node_modules/@sveltejs')) {
                            return 'vendor-svelte';
                        }
                        return 'vendor-misc';
                    }
                    return undefined;
                },
            },
        },
    },
});
//# sourceMappingURL=vite.config.js.map