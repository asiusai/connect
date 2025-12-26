import type { Config } from 'tailwindcss'

export default {
  content: ['./src/**/*.{ts,tsx}', './templates/**/*.{ts,tsx}', './index.html'],
  darkMode: ['class', '[data-theme="dark"]'],
  theme: {
    extend: {
      animation: {
        'upload-pulse': 'upload-pulse 1.5s ease-in-out infinite',
      },
      keyframes: {
        'upload-pulse': {
          '0%, 100%': { opacity: '0.4', transform: 'scaleY(1)' },
          '50%': { opacity: '1', transform: 'scaleY(1.5)' },
        },
      },
      colors: Object.fromEntries(
        [
          'primary',
          'primary-x',
          'primary-alt',
          'primary-alt-x',

          'secondary',
          'secondary-x',
          'secondary-alt',
          'secondary-alt-x',

          'tertiary',
          'tertiary-x',
          'tertiary-alt',
          'tertiary-alt-x',

          'error',
          'error-x',
          'error-alt',
          'error-alt-x',

          'background',
          'background-x',
          'background-alt',
          'background-alt-x',
        ].map((name) => [name, `rgb(var(--color-${name}))`]),
      ),
    },
  },
} satisfies Config
