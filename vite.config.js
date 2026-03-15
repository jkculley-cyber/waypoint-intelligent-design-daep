import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  optimizeDeps: {
    include: ['react-is'],
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          'vendor-react':    ['react', 'react-dom', 'react-router-dom', 'react-is', 'react-hot-toast'],
          'vendor-supabase': ['@supabase/supabase-js'],
          'vendor-charts':   ['recharts'],
          'vendor-export':   ['jspdf', 'jspdf-autotable', 'xlsx'],
          'vendor-dates':    ['date-fns'],
        },
      },
    },
  },
})
