import { useState, useRef, useEffect } from 'react'
import { Link, NavLink, useLocation, useNavigate } from 'react-router-dom'
import { Menu, X, LogOut, User as UserIcon, FileText, Eye, Search, Home } from 'lucide-react'
import { useAuth } from '../lib/auth'

/**
 * Portal navigation.
 *
 * Two visual modes:
 *
 *   1. **Overlay** — used on the landing page (`/`) while the user is still
 *      near the top of the page. The bar is `position: fixed`, fully
 *      transparent with white text, so the maroon hero shows through.
 *      Hover state on links / brand turns yellow (`#FFD700`) to echo the
 *      hero's accent colour.
 *
 *   2. **Solid** — every inner page, plus the landing page once scrolled
 *      past ~20px. Sticky white bar with the original dark-on-light look,
 *      so links remain readable over white page content below the hero.
 *
 * Mobile drawer is always rendered with a white panel since it covers the
 * page on tap and needs its own contrast.
 */
export default function Topbar() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const { pathname } = useLocation()
  const [mobileOpen, setMobileOpen] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)
  const [scrolled, setScrolled] = useState(false)
  const menuRef = useRef(null)

  // Only the landing page gets the transparent-over-hero treatment.
  const isLanding = pathname === '/'

  // Track scroll position so we can fade from transparent → white once the
  // hero scrolls out of view. Inner pages skip the listener entirely.
  useEffect(() => {
    if (!isLanding) {
      setScrolled(false)
      return
    }
    const onScroll = () => setScrolled(window.scrollY > 20)
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [isLanding])

  // Close the avatar dropdown when clicking outside.
  useEffect(() => {
    function onDocClick(e) {
      if (menuRef.current && !menuRef.current.contains(e.target)) setMenuOpen(false)
    }
    document.addEventListener('mousedown', onDocClick)
    return () => document.removeEventListener('mousedown', onDocClick)
  }, [])

  const overlay = isLanding && !scrolled

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

  // Outer header positioning + chrome. Landing uses `fixed` so it floats
  // above the hero (which now starts at y=0). Inner pages keep `sticky`.
  const headerCls = isLanding
    ? `fixed top-0 inset-x-0 z-40 transition-colors duration-300 ${
        overlay
          ? 'bg-transparent'
          : 'bg-white/95 backdrop-blur-md border-b border-gray-200 shadow-sm'
      }`
    : 'sticky top-0 z-40 bg-white/90 backdrop-blur-md border-b border-gray-200'

  // Brand square + text. In overlay mode we lean on the yellow accent so
  // the badge reads against the dark hero; in solid mode it stays navy.
  const brandSquareCls = overlay
    ? 'w-9 h-9 rounded-lg bg-[#FFD700] text-black grid place-items-center font-extrabold text-sm tracking-tighter group-hover:scale-105 transition-transform shadow-md shadow-black/20'
    : 'w-9 h-9 rounded-lg bg-navy text-white grid place-items-center font-extrabold text-sm tracking-tighter group-hover:scale-105 transition-transform'

  const brandPrimaryCls = overlay
    ? 'font-bold text-white text-[15px] group-hover:text-[#FFD700] transition-colors'
    : 'font-bold text-navy text-[15px]'

  const brandSecondaryCls = overlay
    ? 'text-[10px] text-white/70 uppercase tracking-widest'
    : 'text-[10px] text-gray-500 uppercase tracking-widest'

  // Desktop link colours. Yellow hover everywhere when overlaid; navy when solid.
  const navLinkCls = ({ isActive }) =>
    overlay
      ? `flex items-center gap-1.5 px-3 py-2 rounded-lg text-[13px] font-semibold transition-colors ${
          isActive
            ? 'bg-white/15 text-[#FFD700]'
            : 'text-white hover:text-[#FFD700] hover:bg-white/10'
        }`
      : `flex items-center gap-1.5 px-3 py-2 rounded-lg text-[13px] font-semibold transition-colors ${
          isActive
            ? 'bg-navy/5 text-navy'
            : 'text-gray-600 hover:text-navy hover:bg-gray-50'
        }`

  return (
    <header className={headerCls}>
      <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-4">
        {/* Brand */}
        <Link to="/" className="flex items-center gap-2.5 group">
          <div className={brandSquareCls}>M</div>
          <div className="leading-tight">
            <div className={brandPrimaryCls}>Mylapore</div>
            <div className={brandSecondaryCls}>Constituency</div>
          </div>
        </Link>

        {/* Desktop nav */}
        <nav className="hidden md:flex items-center gap-1">
          {navItems.map(({ to, label, Icon }) => (
            <NavLink key={to} to={to} end={to === '/'} className={navLinkCls}>
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
                className={
                  overlay
                    ? 'hidden sm:inline-flex items-center px-4 py-2 rounded-lg text-[13px] font-semibold text-white hover:text-[#FFD700] hover:bg-white/10 transition-colors'
                    : 'hidden sm:inline-flex items-center px-4 py-2 rounded-lg text-[13px] font-semibold text-navy hover:bg-gray-50 transition-colors'
                }
              >
                Log In
              </Link>
              <Link
                to="/register"
                className={
                  overlay
                    ? 'inline-flex items-center px-4 py-2 rounded-lg text-[13px] font-bold bg-[#FFD700] text-black hover:bg-[#FFD700]/90 transition-colors shadow-lg shadow-black/20'
                    : 'inline-flex items-center px-4 py-2 rounded-lg text-[13px] font-bold bg-navy text-white hover:bg-navy-dark transition-colors shadow-sm'
                }
              >
                Register
              </Link>
            </>
          ) : (
            <div className="relative" ref={menuRef}>
              <button
                type="button"
                onClick={() => setMenuOpen((v) => !v)}
                className={
                  overlay
                    ? 'flex items-center gap-2 pl-1 pr-3 py-1 rounded-full hover:bg-white/10 transition-colors'
                    : 'flex items-center gap-2 pl-1 pr-3 py-1 rounded-full hover:bg-gray-50 transition-colors'
                }
              >
                <span
                  className={
                    overlay
                      ? 'w-8 h-8 rounded-full bg-[#FFD700] text-black grid place-items-center text-sm font-bold'
                      : 'w-8 h-8 rounded-full bg-navy text-white grid place-items-center text-sm font-bold'
                  }
                >
                  {initial}
                </span>
                <span
                  className={
                    overlay
                      ? 'hidden sm:inline text-[13px] font-semibold text-white max-w-[140px] truncate'
                      : 'hidden sm:inline text-[13px] font-semibold text-navy max-w-[140px] truncate'
                  }
                >
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
            className={
              overlay
                ? 'md:hidden p-2 rounded-lg text-white hover:text-[#FFD700] hover:bg-white/10'
                : 'md:hidden p-2 rounded-lg text-gray-600 hover:bg-gray-50'
            }
            aria-label="Toggle menu"
          >
            {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {/* Mobile drawer — always on a white panel for legibility regardless
          of the overlay state above. */}
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
