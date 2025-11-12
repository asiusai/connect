import { Suspense, useEffect, useState } from 'react'
import { RouterProvider, createBrowserRouter } from 'react-router-dom'
import { QueryClientProvider } from '@tanstack/react-query'
import { ReactQueryDevtools } from '@tanstack/react-query-devtools'
import { getAppQueryClient } from '~/api/query-client'
import { OfflinePage } from '~/pages/offline'

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

const queryClient = getAppQueryClient()

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
            path: '*date',
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

export const App = () => (
  <QueryClientProvider client={queryClient}>
    <ReactQueryDevtools />
    <Toaster />
    <AppLayout>
      <Suspense fallback={null}>
        <RouterProvider router={router} />
      </Suspense>
    </AppLayout>
  </QueryClientProvider>
)
