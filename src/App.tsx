import { useEffect, useState } from 'react'
import { RouterProvider, createBrowserRouter } from 'react-router-dom'
import { OfflinePage } from './pages/offline'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'

import 'leaflet/dist/leaflet.css'
import { Toaster } from 'sonner'
import { api } from './api'
import { HACK_DEFAULT_REDICT_HOST, HACK_LOGIN_CALLBACK_HOST } from './utils/consts'

const AppLayout = ({ children }: { children: React.ReactNode }) => {
  const [isOnline, setIsOnline] = useState(navigator.onLine)

  if (window.location.host === HACK_LOGIN_CALLBACK_HOST) {
    const newUrl = new URL(window.location.href)
    newUrl.hostname = HACK_DEFAULT_REDICT_HOST
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
            lazy: () => import('./pages/settings'),
          },
          {
            path: 'routes',
            lazy: () => import('./pages/routes'),
          },
          {
            path: 'routes/:date',
            lazy: () => import('./pages/route'),
          },
          {
            path: 'routes/:date/logs',
            lazy: () => import('./pages/logs'),
          },
          {
            path: 'routes/:date/qlogs',
            lazy: () => import('./pages/logs'),
          },
          {
            path: 'sentry',
            lazy: () => import('./pages/sentry'),
          },
          {
            path: '',
            lazy: () => import('./pages/device'),
          },
        ],
      },
    ],
  },
])
export const queryClient = new QueryClient({
  defaultOptions: { queries: { queryKeyHashFn: (x) => x.toString() } },
})
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
