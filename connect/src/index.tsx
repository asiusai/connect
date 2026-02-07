/* @refresh reload */
import '../../shared/index.css'

import { App } from './App'
import './pwa.ts'
import { initCapacitor } from './capacitor'
import { createRoot } from 'react-dom/client'

initCapacitor()

const rootElement = document.getElementById('root')
if (!rootElement) throw new Error('No #root element found in the DOM.')

createRoot(rootElement).render(<App />)
