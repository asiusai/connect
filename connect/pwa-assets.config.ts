import { createAppleSplashScreens, defineConfig, minimal2023Preset } from '@vite-pwa/assets-generator/config'

export default defineConfig({
  headLinkOptions: {
    preset: '2023',
    xhtml: true,
  },
  preset: {
    ...minimal2023Preset,
    maskable: {
      ...minimal2023Preset.maskable,
      padding: 0.2,
      resizeOptions: { background: '#181a23' },
    },
    apple: {
      ...minimal2023Preset.apple,
      padding: 0.2,
      resizeOptions: { background: '#181a23' },
    },
    appleSplashScreens: createAppleSplashScreens({
      padding: 0.5,
      resizeOptions: { fit: 'contain', background: '#181a23' },
      linkMediaOptions: {
        addMediaScreen: true,
        xhtml: true,
      },
      name: (landscape, size) => {
        return `apple-splash-${landscape ? 'landscape' : 'portrait'}-${size.width}x${size.height}.png`
      },
    }),
  },
  images: ['public/asius-favicon.svg'],
})
