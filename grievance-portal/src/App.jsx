import { Routes, Route, Navigate, useLocation } from 'react-router-dom'
import { LangProvider } from './i18n'
import { useAuth } from './lib/auth'

import Layout from './components/Layout'
import LandingPage from './pages/LandingPage'
import LoginPage from './pages/LoginPage'
import RegisterPage from './pages/RegisterPage'
import GrievanceHome from './pages/GrievanceHome'
import MyGrievances from './pages/MyGrievances'
import TrackStatus from './pages/TrackStatus'

/* ─── route gates ─────────────────────────────────────────────────── */

/**
 * Routes that require an authenticated session. Sends unauthenticated callers
 * to /login and remembers where they were going so we can bounce back after
 * sign-in.
 */
function Protected({ children }) {
  const { user, ready } = useAuth()
  const location = useLocation()
  if (!ready) return <FullPageSpinner />
  if (!user) return <Navigate to="/login" state={{ from: location }} replace />
  return children
}

/** Routes that should NOT be reachable once the user is signed in. */
function GuestOnly({ children }) {
  const { user, ready } = useAuth()
  if (!ready) return <FullPageSpinner />
  if (user) return <Navigate to="/grievance" replace />
  return children
}

function FullPageSpinner() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-white">
      <div className="h-8 w-8 rounded-full border-2 border-navy/20 border-t-navy animate-spin" />
    </div>
  )
}

/* ─── routes ──────────────────────────────────────────────────────── */

export default function App() {
  return (
    <LangProvider>
      <Routes>
        <Route element={<Layout />}>
          <Route path="/" element={<LandingPage />} />

          <Route path="/login"    element={<GuestOnly><LoginPage    /></GuestOnly>} />
          <Route path="/register" element={<GuestOnly><RegisterPage /></GuestOnly>} />

          <Route path="/grievance"     element={<Protected><GrievanceHome /></Protected>} />
          <Route path="/my-grievances" element={<Protected><MyGrievances /></Protected>} />
          <Route path="/track"         element={<Protected><TrackStatus  /></Protected>} />

          <Route path="*" element={<Navigate to="/" replace />} />
        </Route>
      </Routes>
    </LangProvider>
  )
}
