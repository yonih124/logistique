import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from '@/app/App'
import '@/styles/base.css'
import '@/styles/app.css'
import '@/styles/list-typography.css'
import '@/styles/theme.css'
import '@/styles/enhancements.css'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
