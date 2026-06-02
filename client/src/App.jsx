import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { useAuth } from '@clerk/clerk-react'
import { SignIn, SignUp } from '@clerk/clerk-react'
import Navbar from './components/Navbar'
import LandingPage from './pages/LandingPage'
import CitizenPortal from './pages/CitizenPortal'
import AdminDashboard from './pages/AdminDashboard'
import MyIssues from './pages/MyIssues'
import Analytics from './pages/Analytics'
import IssueMap from './pages/IssueMap'
import Feed from './pages/Feed'
import Profile from './pages/Profile'
import { SocketNotifications } from './components/SocketNotifications'

function ProtectedRoute({ children }) {
  const { isSignedIn, isLoaded } = useAuth()
  if (!isLoaded) return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
    </div>
  )
  if (!isSignedIn) return <Navigate to="/sign-in" replace />
  return children
}

function AuthPage({ component: Component, path }) {
  return (
    <div className="flex items-center justify-center min-h-screen bg-muted/30">
      <Component routing="path" path={path} />
    </div>
  )
}

function App() {
  return (
    <BrowserRouter>
      <div className="min-h-screen bg-background">
        <SocketNotifications />
        <Navbar />
        <Routes>
          <Route path="/" element={<LandingPage />} />
          <Route path="/sign-in/*" element={<AuthPage component={SignIn} path="/sign-in" />} />
          <Route path="/sign-up/*" element={<AuthPage component={SignUp} path="/sign-up" />} />
          <Route path="/submit" element={<ProtectedRoute><CitizenPortal /></ProtectedRoute>} />
          <Route path="/my-issues" element={<ProtectedRoute><MyIssues /></ProtectedRoute>} />
          <Route path="/dashboard" element={<ProtectedRoute><AdminDashboard /></ProtectedRoute>} />
          <Route path="/analytics" element={<ProtectedRoute><Analytics /></ProtectedRoute>} />
          <Route path="/map" element={<IssueMap />} />
          <Route path="/feed" element={<Feed />} />
          <Route path="/profile" element={<ProtectedRoute><Profile /></ProtectedRoute>} />
        </Routes>
      </div>
    </BrowserRouter>
  )
}

export default App
