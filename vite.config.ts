import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'
import path from 'path'

// https://vitejs.dev/config/
export default defineConfig({
    plugins: [
        react(),
        VitePWA({
            registerType: 'autoUpdate',
            injectRegister: 'auto',
            includeAssets: ['favicon.ico', 'apple-touch-icon.png', 'mask-icon.svg', 'logo.png', 'zoabi_icon.jpg'],
            manifest: {
                name: 'Zoabi Planner',
                short_name: 'Zoabi',
                description: 'Premium Digital Planner & Vault',
                theme_color: '#fafbff',
                background_color: '#fafbff',
                display: 'standalone',
                start_url: '/',
                icons: [
                    {
                        src: 'pwa-192x192.png',
                        sizes: '192x192',
                        type: 'image/png',
                        purpose: 'any'
                    },
                    {
                        src: 'pwa-512x512.png',
                        sizes: '512x512',
                        type: 'image/png',
                        purpose: 'any'
                    },
                    {
                        src: 'pwa-512x512.png',
                        sizes: '512x512',
                        type: 'image/png',
                        purpose: 'maskable'
                    }
                ]
            },
            devOptions: {
                enabled: true
            },
            workbox: {
                maximumFileSizeToCacheInBytes: 5 * 1024 * 1024, // 5MB
            }
        })
    ],
    build: {
        chunkSizeWarningLimit: 2000,
    },
    resolve: {
        alias: {
            '@': path.resolve(__dirname, './src'),
        },
    },
    server: {
        host: true,
    },
})
