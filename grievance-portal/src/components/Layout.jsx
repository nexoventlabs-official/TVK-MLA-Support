import { Outlet, useLocation } from 'react-router-dom'
import Topbar from './Topbar'
import Footer from './Footer'

/**
 * App shell. Hides the topbar/footer on the dedicated auth screens — those
 * pages are full-bleed centred panels that look better without the rest of
 * the chrome competing for attention.
 */
export default function Layout() {
  const { pathname } = useLocation()
  const minimal = pathname === '/login' || pathname === '/register'

  if (minimal) {
    return (
      <div className="min-h-screen bg-white">
        <Outlet />
      </div>
    )
  }

  return (
    <div className="min-h-screen flex flex-col bg-white">
      <Topbar />
      <main className="flex-1">
        <Outlet />
      </main>
      <Footer />
    </div>
  )
}
