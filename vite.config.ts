import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react-swc'
import tailwindcss from '@tailwindcss/vite' // Import the plugin

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()

  ],
   server: {
    host: '0.0.0.0',
    port: 5174,
    strictPort: true
  }
})
