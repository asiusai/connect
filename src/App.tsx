import { Suspense, useEffect, useState } from 'react'
import { RouterProvider, createBrowserRouter } from 'react-router-dom'
import { QueryClientProvider } from '@tanstack/react-query'
import { ReactQueryDevtools } from '@tanstack/react-query-devtools'
import { getAppQueryClient } from '~/api/query-client'
import { OfflinePage } from '~/pages/offline'

import 'leaflet/dist/leaflet.css'

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
    path: "/test",
    lazy: () => import("./pages/auth/test")
  }, {
    path: "/login",
    lazy: () => import("./pages/auth/login")
  }, {
    path: "/logout",
    lazy: () => import("./pages/auth/logout")
  }, {
    path: "/auth",
    lazy: () => import("./pages/auth/auth")
  }, {
    path: "/*dongleId",
    lazy: () => import("./pages/dashboard/dashboard")
  },
]);


export const App = () => (
  <QueryClientProvider client={queryClient}>
    <ReactQueryDevtools />

    <AppLayout>
      <Suspense fallback={null}>
        <RouterProvider router={router} />
      </Suspense>
    </AppLayout>
  </QueryClientProvider>
)
