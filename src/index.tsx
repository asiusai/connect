/* @refresh reload */
import './index.css'

import { App } from './App'
import './pwa.ts'
import { createRoot } from 'react-dom/client'

// TODO: sentry
// const environment = import.meta.env.VITE_SENTRY_ENVIRONMENT as string | undefined
// Sentry.init({
//   enabled: !!environment,
//   dsn: 'https://c3402db23a1a02fe83b7a43b7dbbbac0@o33823.ingest.us.sentry.io/4508738328854529',
//   environment,
// })


const rootElement = document.getElementById('root')
if (!rootElement) throw new Error('No #root element found in the DOM.')

createRoot(rootElement).render(<App />)