import { create } from 'zustand'

export const useOffline = create<{ isOnline: boolean }>(() => ({ isOnline: navigator.onLine }))

window.addEventListener('online', () => useOffline.setState({ isOnline: true }))
window.addEventListener('offline', () => useOffline.setState({ isOnline: false }))
