import { Link, useLocation } from 'react-router-dom'
import { SignedIn, SignedOut, UserButton, useUser } from '@clerk/clerk-react'
import { Button } from '@/components/ui/button'
import { Building2, LayoutDashboard, FileText, PlusCircle } from 'lucide-react'
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
          <SignedIn>
            <NavLink to="/submit" icon={PlusCircle}>Report Issue</NavLink>
            <NavLink to="/my-issues" icon={FileText}>My Issues</NavLink>
            {isAdmin && <NavLink to="/dashboard" icon={LayoutDashboard}>Dashboard</NavLink>}
          </SignedIn>
        </nav>

        <div className="ml-auto flex items-center gap-3">
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
