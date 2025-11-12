import { Suspense, useEffect, useState } from 'react'
import { RouterProvider, createBrowserRouter } from 'react-router-dom'
import { OfflinePage } from '~/pages/offline'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'

import 'leaflet/dist/leaflet.css'
import { Toaster } from 'sonner'

const AppLayout = ({ children }: { children: React.ReactNode }) => {
  const [isOnline, setIsOnline] = useState(navigator.onLine)

  useEffect(() => {
    const handleOnline = () => setIsOnline(true)
    const handleOffline = () => setIsOnline(false)

    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)

    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
    }
  }, [])

  if (!isOnline) return <OfflinePage />

  return <>{children}</>
}

const router = createBrowserRouter([
  {
    path: 'login',
    lazy: () => import('./pages/auth/login'),
  },
  {
    path: 'logout',
    lazy: () => import('./pages/auth/logout'),
  },
  {
    path: 'auth',
    lazy: () => import('./pages/auth/auth'),
  },
  {
    path: '',
    lazy: () => import('./layouts/authorized'),
    children: [
      {
        path: 'pair',
        lazy: () => import('./pages/pair'),
      },
      {
        path: ':dongleId',
        lazy: () => import('./layouts/dashboard'),
        children: [
          {
            path: 'settings',
            lazy: () => import('./pages/settings'),
          },
          {
            path: 'prime',
            lazy: () => import('./pages/settings'),
          },
          {
            path: ':date',
            lazy: () => import('./pages/route'),
          },
          {
            path: '',
            lazy: () => import('./pages/empty'),
          },
        ],
      },
    ],
  },
])
const queryClient = new QueryClient()

export const App = () => (
  <QueryClientProvider client={queryClient}>
    <Toaster />
    <AppLayout>
      <Suspense fallback={null}>
        <RouterProvider router={router} />
      </Suspense>
    </AppLayout>
  </QueryClientProvider>
)
