import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react-swc'
import tailwindcss from '@tailwindcss/vite'
import { copyFileSync } from 'fs'
import { resolve } from 'path'

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    
    // Custom plugin to copy service worker to dist
    {
      name: 'copy-sw',
      closeBundle() {
        // Only in production builds
        if (process.env.NODE_ENV === 'production') {
          try {
            const swPath = resolve(__dirname, 'public/sw.js');
            const distPath = resolve(__dirname, 'dist/sw.js');
            copyFileSync(swPath, distPath);
            console.log('✅ Service Worker copied to dist');
          } catch (error: any) {
            console.warn('⚠️ Service Worker copy failed:', error.message);
          }
        }
      }
    }
  ],

  // Public directory for static assets
  publicDir: 'public',

  server: {
    host: '0.0.0.0',
    port: 5174,
    strictPort: true,
    proxy: {
      '/api': {
        target: 'http://localhost:3000',
        changeOrigin: true,
        secure: false,
      }
    },
    hmr: {
      overlay: true,
    },
    cors: true,
  },

  // Build optimization - AGGRESSIVE
  build: {
    target: 'esnext',
    minify: 'terser', // Terser will use default aggressive minification
    rollupOptions: {
      output: {
        manualChunks: {
          'react-core': ['react', 'react-dom'],
          'icons': ['lucide-react'],
        },
        chunkFileNames: 'assets/[name]-[hash].js',
        entryFileNames: 'assets/[name]-[hash].js',
        assetFileNames: 'assets/[name]-[hash].[ext]',
      },
    },
    cssCodeSplit: true,
    sourcemap: false,
    chunkSizeWarningLimit: 500,
    assetsInlineLimit: 4096,
    cssMinify: 'lightningcss',
  },

  // Optimize dependencies
  optimizeDeps: {
    include: [
      'react',
      'react-dom',
      'react/jsx-runtime',
      'lucide-react',
    ],
    entries: ['./src/main.tsx'],
  },

  resolve: {
    alias: {
      '@': '/src',
    },
  },

  define: {
    __APP_VERSION__: JSON.stringify('1.0.0'),
  },
})