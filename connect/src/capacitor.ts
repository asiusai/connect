import { Capacitor } from '@capacitor/core'
import { App } from '@capacitor/app'

export const initCapacitor = async () => {
  if (!Capacitor.isNativePlatform()) return

  // Handle deep link when app is already running
  App.addListener('appUrlOpen', ({ url }) => {
    const parsed = new URL(url)
    const path = parsed.pathname + parsed.search
    console.log('Deep link received:', path)
    window.location.href = path
  })

  // Handle deep link on cold start
  const launchUrl = await App.getLaunchUrl()
  if (launchUrl?.url) {
    const parsed = new URL(launchUrl.url)
    const path = parsed.pathname + parsed.search
    console.log('Launch URL:', path)
    window.location.href = path
  }
}
