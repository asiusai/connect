import { defineConfig } from 'astro/config'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  site: 'https://asius.ai',
  vite: {
    plugins: [tailwindcss()]
  }
})