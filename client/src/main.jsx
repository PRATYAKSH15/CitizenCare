import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { ClerkProvider } from '@clerk/clerk-react'
import { NotificationProvider } from '@/contexts/NotificationContext'
import { RoleProvider } from '@/contexts/RoleContext'
import './index.css'
import App from './App.jsx'

const PUBLISHABLE_KEY = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY

if (!PUBLISHABLE_KEY) {
  throw new Error('Add VITE_CLERK_PUBLISHABLE_KEY to client/.env')
}

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <ClerkProvider publishableKey={PUBLISHABLE_KEY}>
      <NotificationProvider>
        <RoleProvider>
          <App />
        </RoleProvider>
      </NotificationProvider>
    </ClerkProvider>
  </StrictMode>,
)
