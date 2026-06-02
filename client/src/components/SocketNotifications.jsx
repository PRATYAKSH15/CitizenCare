import { useEffect } from 'react'
import { useUser, useAuth } from '@clerk/clerk-react'
import socket from '@/lib/socket'
import { useNotifications } from '@/contexts/NotificationContext'

export function SocketNotifications() {
  const { user, isLoaded } = useUser()
  const { isSignedIn } = useAuth()
  const { addNotification } = useNotifications()

  const adminEmails = (import.meta.env.VITE_ADMIN_EMAILS || '').split(',').map(e => e.trim().toLowerCase())
  const isAdmin = adminEmails.includes(user?.primaryEmailAddress?.emailAddress?.toLowerCase())

  useEffect(() => {
    if (!isLoaded || !isSignedIn || isAdmin || !user?.id) return

    socket.connect()
    socket.emit('join_user', user.id)

    socket.on('citizen_notification', (notif) => {
      addNotification(notif)
    })

    return () => {
      socket.off('citizen_notification')
      socket.disconnect()
    }
  }, [isLoaded, isSignedIn, isAdmin, user?.id, addNotification])

  return null
}
