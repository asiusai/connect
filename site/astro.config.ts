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
    '/issues': 'https://github.com/asiusai/asiusai/issues',
    '/discussions': 'https://github.com/asiusai/asiusai/discussions',
    '/pulls': 'https://github.com/asiusai/asiusai/pulls',
    '/todo': 'https://github.com/orgs/asiusai/projects/1/views/1',

    '/gh': 'https://github.com/asiusai/asiusai',
    '/github': 'https://github.com/asiusai/asiusai',

    '/openpilot': 'https://github.com/asiusai/openpilot',
    '/sunnypilot': 'https://github.com/asiusai/sunnypilot',

    '/connect': 'https://connect.asius.ai',

    '/x': 'https://x.com/asius_ai',
  },
})
