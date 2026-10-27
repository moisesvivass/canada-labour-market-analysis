import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
// Fonts are bundled and served from our own domain, so visitors' IPs aren't sent to Google.
import '@fontsource-variable/inter'
import '@fontsource/source-serif-4/600.css'
import './index.css'
import App from './App.tsx'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
