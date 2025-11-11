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
    path: "/login",
    lazy: () => import("./pages/auth/login")
  },
  {
    path: "/logout",
    lazy: () => import("./pages/auth/logout")
  },
  {
    path: "/auth",
    lazy: () => import("./pages/auth/auth")
  },
  {
    path: "",
    lazy: () => import("./pages/dashboard/authorized-layout"),
    children: [
      {
        path: "/pair",
        lazy: () => import("./pages/dashboard/activities/PairActivity")
      },
      {
        path: "/*dongleId",
        lazy: () => import("./pages/dashboard/dashboard-layout"),
        children: [
          {
            path:"/settings",
            lazy:()=>import("./pages/dashboard/activities/SettingsActivity")
          },
          {
            path:"/prime",
            lazy:()=>import("./pages/dashboard/activities/SettingsActivity")
          },
          {
            path: "/*date",
            lazy: () => import("./pages/dashboard/activities/RouteActivity")
          },
          {
            path:"",
            lazy:()=>import("./pages/dashboard/activities/EmptyActivity")
          }
        ]
      }

    ]
  }

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
