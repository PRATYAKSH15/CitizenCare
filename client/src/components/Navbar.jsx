import { useState, useRef, useEffect } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { SignedIn, SignedOut, UserButton, useUser } from '@clerk/clerk-react'
import { Button } from '@/components/ui/button'
import { useNotifications } from '@/contexts/NotificationContext'
import { Building2, LayoutDashboard, FileText, PlusCircle, BarChart2, Map, Globe2, Bell, User } from 'lucide-react'
import { cn } from '@/lib/utils'

function NavLink({ to, children, icon: Icon }) {
  const { pathname } = useLocation()
  const active = pathname === to
  return (
    <Link
      to={to}
      className={cn(
        "flex items-center gap-1.5 text-sm font-medium transition-colors px-3 py-1.5 rounded-md",
        active
          ? "bg-primary/10 text-primary"
          : "text-muted-foreground hover:text-foreground hover:bg-accent"
      )}
    >
      {Icon && <Icon className="h-4 w-4" />}
      {children}
    </Link>
  )
}

function NotificationBell() {
  const { notifications, unread, markAllRead } = useNotifications()
  const [open, setOpen] = useState(false)
  const ref = useRef(null)

  useEffect(() => {
    const handler = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false) }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const toggle = () => {
    setOpen(v => !v)
    if (!open && unread > 0) markAllRead()
  }

  return (
    <div ref={ref} className="relative">
      <button
        onClick={toggle}
        className="relative p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
        aria-label="Notifications"
      >
        <Bell className="h-4 w-4" />
        {unread > 0 && (
          <span className="absolute -top-0.5 -right-0.5 bg-red-500 text-white text-[10px] font-bold rounded-full min-w-[16px] h-4 flex items-center justify-center px-0.5 leading-none">
            {unread > 9 ? '9+' : unread}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-9 w-72 bg-background border rounded-xl shadow-xl z-50 overflow-hidden">
          <div className="px-3 py-2.5 border-b">
            <p className="text-sm font-semibold">Notifications</p>
          </div>
          {notifications.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">No notifications yet</p>
          ) : (
            <div className="max-h-64 overflow-y-auto divide-y">
              {notifications.slice(0, 10).map(n => (
                <div key={n.id} className={`px-3 py-3 text-sm ${!n.read ? 'bg-primary/5' : ''}`}>
                  <p className="leading-snug">{n.message}</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {new Date(n.createdAt).toLocaleString('en-IN', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

export default function Navbar() {
  const { user } = useUser()
  const adminEmails = (import.meta.env.VITE_ADMIN_EMAILS || '').split(',').map(e => e.trim().toLowerCase())
  const isAdmin = adminEmails.includes(user?.primaryEmailAddress?.emailAddress?.toLowerCase())

  return (
    <header className="sticky top-0 z-40 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="mx-auto max-w-7xl flex h-14 items-center gap-6 px-4 sm:px-6">
        <Link to="/" className="flex items-center gap-2 font-bold text-lg">
          <Building2 className="h-5 w-5 text-primary" />
          CitizenCare
        </Link>

        <nav className="hidden md:flex items-center gap-1">
          <NavLink to="/map" icon={Map}>Issue Map</NavLink>
          <NavLink to="/feed" icon={Globe2}>Community</NavLink>
          <SignedIn>
            {isAdmin ? (
              <>
                <NavLink to="/dashboard" icon={LayoutDashboard}>Dashboard</NavLink>
                <NavLink to="/analytics" icon={BarChart2}>Analytics</NavLink>
              </>
            ) : (
              <>
                <NavLink to="/submit" icon={PlusCircle}>Report Issue</NavLink>
                <NavLink to="/my-issues" icon={FileText}>My Issues</NavLink>
                <NavLink to="/profile" icon={User}>Profile</NavLink>
              </>
            )}
          </SignedIn>
        </nav>

        <div className="ml-auto flex items-center gap-2">
          <SignedIn>
            {!isAdmin && <NotificationBell />}
          </SignedIn>
          <SignedOut>
            <Button variant="ghost" size="sm" asChild>
              <Link to="/sign-in">Sign In</Link>
            </Button>
            <Button size="sm" asChild>
              <Link to="/sign-up">Get Started</Link>
            </Button>
          </SignedOut>
          <SignedIn>
            <UserButton afterSignOutUrl="/" />
          </SignedIn>
        </div>
      </div>
    </header>
  )
}
