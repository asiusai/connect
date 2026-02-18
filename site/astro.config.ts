import { defineConfig } from 'astro/config'
import tailwindcss from '@tailwindcss/vite'
import react from '@astrojs/react'

import mdx from '@astrojs/mdx'

export default defineConfig({
  site: 'https://asius.ai',
  integrations: [react(), mdx()],
  vite: {
    plugins: [tailwindcss()],
  },
  devToolbar: { enabled: false },
  redirects: {
    '/issues': 'https://github.com/asiusai/connect/issues',
    '/discussions': 'https://github.com/asiusai/connect/discussions',
    '/pulls': 'https://github.com/asiusai/connect/pulls',
    '/todo': 'https://github.com/orgs/asiusai/projects/1/views/1',

    '/gh': 'https://github.com/asiusai/connect',
    '/github': 'https://github.com/asiusai/connect',

    '/op': 'https://github.com/asiusai/openpilot',

    '/connect': 'https://connect.asius.ai',

    '/x': 'https://x.com/asius_ai',
  },
})
