export const ClearCache = () => {
  const handleClearCache = async () => {
    if (!confirm('Clear cache and reload the app?')) return

    try {
      if ('serviceWorker' in navigator) {
        const registrations = await navigator.serviceWorker.getRegistrations()
        await Promise.all(registrations.map((reg) => reg.unregister()))
      }

      if ('caches' in window) {
        const cacheNames = await caches.keys()
        await Promise.all(cacheNames.map((name) => caches.delete(name)))
      }

      window.location.reload()
    } catch (error) {
      console.error('Failed to clear cache:', error)
      alert('Failed to clear cache. Please try again.')
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <h2 className="text-xl font-bold px-2">Cache</h2>
      <button
        onClick={handleClearCache}
        className="bg-background-alt rounded-xl p-4 flex items-center justify-between hover:bg-background-alt/80 transition-colors"
      >
        <div className="flex flex-col items-start">
          <span className="font-medium">Clear cache</span>
          <span className="text-xs text-white/60">Clear PWA cache and reload the app</span>
        </div>
      </button>
    </div>
  )
}
