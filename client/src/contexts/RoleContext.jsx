import { createContext, useContext, useEffect, useState } from 'react'
import { useAuth, useUser } from '@clerk/clerk-react'
import api from '@/lib/api'

const RoleContext = createContext({ role: 'citizen', department: null, synced: false })

export function RoleProvider({ children }) {
  const { getToken, isSignedIn } = useAuth()
  const { user, isLoaded } = useUser()
  const [roleData, setRoleData] = useState({ role: 'citizen', department: null, synced: false })

  useEffect(() => {
    if (!isLoaded || !isSignedIn) {
      setRoleData({ role: 'citizen', department: null, synced: true })
      return
    }

    const adminEmails = (import.meta.env.VITE_ADMIN_EMAILS || '').split(',').map(e => e.trim().toLowerCase())
    const email = user?.primaryEmailAddress?.emailAddress?.toLowerCase()

    if (adminEmails.includes(email)) {
      setRoleData({ role: 'admin', department: null, synced: true })
      return
    }

    const sync = async () => {
      try {
        const token = await getToken()
        const { data } = await api.post('/auth/sync', {}, {
          headers: { Authorization: `Bearer ${token}` },
        })
        setRoleData({ role: data.role, department: data.department, synced: true })
      } catch {
        setRoleData({ role: 'citizen', department: null, synced: true })
      }
    }
    sync()
  }, [isLoaded, isSignedIn, user, getToken])

  return (
    <RoleContext.Provider value={roleData}>
      {children}
    </RoleContext.Provider>
  )
}

export const useRole = () => useContext(RoleContext)
