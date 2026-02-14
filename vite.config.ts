import { defineConfig, type Plugin } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

/**
 * Vite plugin that adds a dev server middleware to resolve shortened Google Maps URLs.
 * Shortened URLs (maps.app.goo.gl, goo.gl/maps) are redirect-only and can't be
 * parsed client-side for coordinates due to CORS. This middleware follows the
 * redirect chain server-side and returns the final expanded URL.
 */
function resolveUrlPlugin(): Plugin {
    return {
        name: 'resolve-short-url',
        configureServer(server) {
            server.middlewares.use('/api/resolve-url', async (req: any, res: any) => {
                const parsedUrl = new URL(req.url!, `http://${req.headers.host}`);
                const targetUrl = parsedUrl.searchParams.get('url');

                if (!targetUrl) {
                    res.writeHead(400, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify({ error: 'Missing url parameter' }));
                    return;
                }

                try {
                    // Follow all redirects to get the final, full Google Maps URL
                    const response = await fetch(targetUrl, { redirect: 'follow' });
                    res.writeHead(200, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify({ url: response.url }));
                } catch (err) {
                    res.writeHead(500, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify({ error: 'Failed to resolve URL' }));
                }
            });
        }
    };
}

export default defineConfig({
    plugins: [
        react(),
        tailwindcss(),
        resolveUrlPlugin(),
    ],
})
