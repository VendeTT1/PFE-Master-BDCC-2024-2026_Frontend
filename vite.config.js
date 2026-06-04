import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  // base: process.env.VITE_BASE_PATH || '/PFE-Master-BDCC-2024-2026_Frontend',
  server: {
    allowedHosts: ['tapioca-sanding-outshine.ngrok-free.dev']
  }
})
