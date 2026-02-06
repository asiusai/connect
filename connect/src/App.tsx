import { RouterProvider, createBrowserRouter } from 'react-router-dom'
import { ErrorPage } from './pages/error'

import 'leaflet/dist/leaflet.css'
import { Toaster } from 'sonner'
import { OfflineBanner } from './components/OfflineBanner'

const router = createBrowserRouter([
  {
    path: 'login',
    lazy: () => import('./pages/login'),
    errorElement: <ErrorPage />,
  },
  {
    path: 'add-provider',
    lazy: () => import('./pages/add-provider'),
    errorElement: <ErrorPage />,
  },
  {
    path: 'demo',
    lazy: () => import('./pages/demo'),
    errorElement: <ErrorPage />,
  },
  {
    path: 'logout',
    lazy: () => import('./pages/logout'),
    errorElement: <ErrorPage />,
  },
  {
    path: 'auth',
    lazy: () => import('./pages/auth'),
    errorElement: <ErrorPage />,
  },
  // for konik
  {
    path: 'v2/auth',
    lazy: () => import('./pages/auth'),
    errorElement: <ErrorPage />,
  },
  {
    path: 'test',
    lazy: () => import('./pages/test'),
    errorElement: <ErrorPage />,
  },
  {
    path: 'docs',
    lazy: () => import('./pages/docs'),
    errorElement: <ErrorPage />,
  },

  // Route pages
  {
    path: ':dongleId/:routeId/:start?/:end?',
    lazy: () => import('./layouts/route'),
    errorElement: <ErrorPage />,
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
    errorElement: <ErrorPage />,
    children: [
      {
        path: 'admin',
        lazy: () => import('./pages/admin'),
      },
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
            path: 'live',
            lazy: () => import('./pages/live'),
          },
          {
            path: 'snapshot',
            lazy: () => import('./pages/snapshot'),
          },
          // {
          //   path: 'controls',
          //   lazy: () => import('./pages/controls/index'),
          // },
          {
            path: 'settings',
            lazy: () => import('./pages/settings'),
          },
          {
            path: 'ssh',
            lazy: () => import('./pages/ssh'),
          },
          {
            path: 'terminal',
            lazy: () => import('./pages/terminal'),
          },
          {
            path: 'prime',
            lazy: () => import('./pages/settings/index'),
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
  <>
    <Toaster theme="dark" toastOptions={{ className: '!bg-background !text-background-x' }} />
    <OfflineBanner />
    <RouterProvider router={router} />
  </>
)
