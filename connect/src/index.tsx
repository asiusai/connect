/* @refresh reload */
import '../../shared/index.css'

import { App } from './App'
import './pwa.ts'
import { createRoot } from 'react-dom/client'

const rootElement = document.getElementById('root')
if (!rootElement) throw new Error('No #root element found in the DOM.')

createRoot(rootElement).render(<App />)
