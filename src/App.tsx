import { Suspense, useEffect, useState } from 'react'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
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

export const App = () => (
  <QueryClientProvider client={queryClient}>
    <ReactQueryDevtools />

    <BrowserRouter>
      <AppLayout>
        <Suspense fallback={null}>
          <Routes>
            <Route path="/login" loader={() => import('./pages/auth/login')} />
            <Route path="/logout" loader={() => import('./pages/auth/login')} />
            <Route path="/auth" loader={() => import('./pages/auth/auth')} />

            {/* Matches /<anything> and passes as param */}
            <Route path="/*dongleId" loader={() => import('./pages/dashboard/Dashboard')} />
          </Routes>
        </Suspense>
      </AppLayout>
    </BrowserRouter>
  </QueryClientProvider>
)
