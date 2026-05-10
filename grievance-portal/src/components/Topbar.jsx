import { useState, useRef, useEffect } from 'react'
import { Link, NavLink, useNavigate } from 'react-router-dom'
import { Menu, X, LogOut, User as UserIcon, FileText, Eye, Search, Home } from 'lucide-react'
import { useAuth } from '../lib/auth'

/**
 * Sticky portal navigation. The CTA cluster on the right swaps based on auth
 * state — Login/Register pills when signed-out, a user menu when signed-in —
 * so the hero never shows "register" links to someone already inside.
 */
export default function Topbar() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const [mobileOpen, setMobileOpen] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)
  const menuRef = useRef(null)

  // Close the avatar dropdown when clicking outside.
  useEffect(() => {
    function onDocClick(e) {
      if (menuRef.current && !menuRef.current.contains(e.target)) setMenuOpen(false)
    }
    document.addEventListener('mousedown', onDocClick)
    return () => document.removeEventListener('mousedown', onDocClick)
  }, [])

  const navItems = user
    ? [
        { to: '/',              label: 'Home',         Icon: Home },
        { to: '/grievance',     label: 'File',         Icon: FileText },
        { to: '/my-grievances', label: 'My Requests',  Icon: Eye },
        { to: '/track',         label: 'Track',        Icon: Search },
      ]
    : [
        { to: '/',              label: 'Home',         Icon: Home },
      ]

  const initial = (user?.name || user?.phone || 'U').charAt(0).toUpperCase()

  function handleLogout() {
    setMenuOpen(false)
    logout()
    navigate('/')
  }

  return (
    <header className="sticky top-0 z-40 bg-white/90 backdrop-blur-md border-b border-gray-200">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-4">
        {/* Brand */}
        <Link to="/" className="flex items-center gap-2.5 group">
          <div className="w-9 h-9 rounded-lg bg-navy text-white grid place-items-center font-extrabold text-sm tracking-tighter group-hover:scale-105 transition-transform">
            M
          </div>
          <div className="leading-tight">
            <div className="font-bold text-navy text-[15px]">Mylapore</div>
            <div className="text-[10px] text-gray-500 uppercase tracking-widest">Constituency</div>
          </div>
        </Link>

        {/* Desktop nav */}
        <nav className="hidden md:flex items-center gap-1">
          {navItems.map(({ to, label, Icon }) => (
            <NavLink
              key={to}
              to={to}
              end={to === '/'}
              className={({ isActive }) =>
                `flex items-center gap-1.5 px-3 py-2 rounded-lg text-[13px] font-semibold transition-colors ${
                  isActive
                    ? 'bg-navy/5 text-navy'
                    : 'text-gray-600 hover:text-navy hover:bg-gray-50'
                }`
              }
            >
              <Icon className="w-3.5 h-3.5" />
              {label}
            </NavLink>
          ))}
        </nav>

        {/* Auth cluster */}
        <div className="flex items-center gap-2">
          {!user ? (
            <>
              <Link
                to="/login"
                className="hidden sm:inline-flex items-center px-4 py-2 rounded-lg text-[13px] font-semibold text-navy hover:bg-gray-50 transition-colors"
              >
                Log In
              </Link>
              <Link
                to="/register"
                className="inline-flex items-center px-4 py-2 rounded-lg text-[13px] font-bold bg-navy text-white hover:bg-navy-dark transition-colors shadow-sm"
              >
                Register
              </Link>
            </>
          ) : (
            <div className="relative" ref={menuRef}>
              <button
                type="button"
                onClick={() => setMenuOpen((v) => !v)}
                className="flex items-center gap-2 pl-1 pr-3 py-1 rounded-full hover:bg-gray-50 transition-colors"
              >
                <span className="w-8 h-8 rounded-full bg-navy text-white grid place-items-center text-sm font-bold">
                  {initial}
                </span>
                <span className="hidden sm:inline text-[13px] font-semibold text-navy max-w-[140px] truncate">
                  {user.name || user.phone}
                </span>
              </button>
              {menuOpen && (
                <div className="absolute right-0 mt-2 w-60 rounded-xl bg-white border border-gray-200 shadow-lg overflow-hidden">
                  <div className="px-4 py-3 border-b border-gray-100">
                    <div className="text-[13px] font-bold text-navy truncate">{user.name || 'Member'}</div>
                    <div className="text-[11px] text-gray-500 mt-0.5">+{user.phone}</div>
                    {user.epic && (
                      <div className="text-[11px] text-gray-400 mt-0.5">EPIC: {user.epic}</div>
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={() => { setMenuOpen(false); navigate('/my-grievances') }}
                    className="w-full text-left px-4 py-2.5 text-[13px] text-gray-700 hover:bg-gray-50 flex items-center gap-2"
                  >
                    <UserIcon className="w-4 h-4" /> My Requests
                  </button>
                  <button
                    type="button"
                    onClick={handleLogout}
                    className="w-full text-left px-4 py-2.5 text-[13px] text-red-600 hover:bg-red-50 flex items-center gap-2 border-t border-gray-100"
                  >
                    <LogOut className="w-4 h-4" /> Sign Out
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Mobile menu toggle */}
          <button
            type="button"
            onClick={() => setMobileOpen((v) => !v)}
            className="md:hidden p-2 rounded-lg text-gray-600 hover:bg-gray-50"
            aria-label="Toggle menu"
          >
            {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {/* Mobile drawer */}
      {mobileOpen && (
        <div className="md:hidden border-t border-gray-100 bg-white">
          <nav className="max-w-6xl mx-auto px-4 py-3 flex flex-col gap-1">
            {navItems.map(({ to, label, Icon }) => (
              <NavLink
                key={to}
                to={to}
                end={to === '/'}
                onClick={() => setMobileOpen(false)}
                className={({ isActive }) =>
                  `flex items-center gap-2 px-3 py-2.5 rounded-lg text-sm font-semibold ${
                    isActive ? 'bg-navy/5 text-navy' : 'text-gray-700 hover:bg-gray-50'
                  }`
                }
              >
                <Icon className="w-4 h-4" />
                {label}
              </NavLink>
            ))}
            {!user && (
              <Link
                to="/login"
                onClick={() => setMobileOpen(false)}
                className="mt-1 px-3 py-2.5 rounded-lg text-sm font-semibold text-navy bg-gray-50 text-center"
              >
                Log In
              </Link>
            )}
          </nav>
        </div>
      )}
    </header>
  )
}
