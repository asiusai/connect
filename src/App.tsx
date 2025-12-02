import { useEffect, useState } from 'react'
import { RouterProvider, createBrowserRouter } from 'react-router-dom'
import { OfflinePage } from './pages/offline'
import { QueryClientProvider } from '@tanstack/react-query'

import 'leaflet/dist/leaflet.css'
import { Toaster } from 'sonner'
import { api } from './api'
import { queryClient } from './utils/helpers'
import { env } from './utils/env'

const AppLayout = ({ children }: { children: React.ReactNode }) => {
  const [isOnline, setIsOnline] = useState(navigator.onLine)

  if (window.location.host === env.HACK_LOGIN_CALLBACK_HOST) {
    const newUrl = new URL(window.location.href)
    newUrl.hostname = env.HACK_DEFAULT_REDICT_HOST
    window.location.replace(newUrl.toString())
  }

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
    lazy: () => import('./pages/login'),
  },
  {
    path: 'demo',
    lazy: () => import('./pages/demo'),
  },
  {
    path: 'logout',
    lazy: () => import('./pages/logout'),
  },
  {
    path: 'auth',
    lazy: () => import('./pages/auth'),
  },
  {
    path: 'test',
    lazy: () => import('./pages/test'),
  },

  // Route pages
  {
    path: ':dongleId/routes/:date',
    lazy: () => import('./layouts/route'),
    children: [
      {
        path: '',
        lazy: () => import('./pages/route/index'),
      },
      {
        path: 'logs',
        lazy: () => import('./pages/logs'),
      },
      {
        path: 'qlogs',
        lazy: () => import('./pages/logs'),
      },
    ],
  },

  // Other authorized pages
  {
    path: '',
    lazy: () => import('./layouts/authorized'),
    children: [
      {
        path: 'pair',
        lazy: () => import('./pages/pair'),
      },
      {
        path: 'first-pair',
        lazy: () => import('./pages/first-pair'),
      },
      {
        path: ':dongleId',
        children: [
          {
            path: 'settings',
            lazy: () => import('./pages/settings'),
          },
          {
            path: 'prime',
            lazy: () => import('./pages/settings/index'),
          },
          {
            path: 'sentry',
            lazy: () => import('./pages/sentry'),
          },
          {
            path: '',
            lazy: () => import('./pages/device/index'),
          },
        ],
      },
    ],
  },
])

export const App = () => (
  <QueryClientProvider client={queryClient}>
    <api.ReactQueryProvider>
      <Toaster theme="dark" />
      <AppLayout>
        <RouterProvider router={router} />
      </AppLayout>
    </api.ReactQueryProvider>
  </QueryClientProvider>
)
