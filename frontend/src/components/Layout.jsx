import { NavLink, Outlet, useNavigate, useLocation } from 'react-router-dom';
import {
  LayoutDashboard,
  ClipboardList,
  Users,
  ShieldCheck,
  Megaphone,
  Image as ImageIcon,
  CalendarDays,
  LogOut,
  Menu,
  X,
  Search,
  Command,
} from 'lucide-react';
import { useState, useEffect } from 'react';

// ── Navigation grouped into "sections" so the sidebar can render a
// proper IA hierarchy (operations / governance / content) instead of a
// flat list. The labels stay short — the icon + label combo carries
// the meaning without subtitle clutter.
const NAV_SECTIONS = [
  {
    heading: 'Overview',
    items: [{ to: '/', label: 'Dashboard', icon: LayoutDashboard, end: true }],
  },
  {
    heading: 'Operations',
    items: [
      { to: '/service-requests', label: 'Service Requests', icon: ClipboardList },
      { to: '/members', label: 'Members', icon: Users },
      { to: '/voters', label: 'Voters', icon: ShieldCheck },
    ],
  },
  {
    heading: 'Content',
    items: [
      { to: '/campaigns', label: 'Campaigns', icon: Megaphone },
      { to: '/events', label: 'Events', icon: CalendarDays },
      { to: '/flow-images', label: 'Flow Images', icon: ImageIcon },
    ],
  },
];

// Title shown in the desktop top bar — derived from the URL so the
// "where am I" question is answered without each page having to set it.
const PAGE_TITLES = {
  '/': 'Dashboard',
  '/service-requests': 'Service Requests',
  '/members': 'Members',
  '/voters': 'Voters',
  '/campaigns': 'Campaigns',
  '/events': 'Events',
  '/flow-images': 'Flow Images',
};

function deriveTitle(pathname) {
  if (PAGE_TITLES[pathname]) return PAGE_TITLES[pathname];
  // member / voter detail pages → keep the parent label so the chrome
  // doesn't suddenly say "Detail".
  if (pathname.startsWith('/members')) return 'Members';
  if (pathname.startsWith('/voters')) return 'Voters';
  if (pathname.startsWith('/service-requests')) return 'Service Requests';
  return 'Admin Console';
}

export default function Layout({ user, setAuth }) {
  const nav = useNavigate();
  const loc = useLocation();
  const [open, setOpen] = useState(false); // mobile drawer

  // Close the drawer whenever the route changes (mobile UX).
  useEffect(() => {
    setOpen(false);
  }, [loc.pathname]);

  const logout = () => {
    localStorage.removeItem('tvk_token');
    setAuth(null);
    nav('/login');
  };

  const renderNav = (onClick) => (
    <nav className="px-3 py-2 space-y-6">
      {NAV_SECTIONS.map((section) => (
        <div key={section.heading}>
          <div className="px-3 mb-1.5 text-[10px] font-semibold tracking-[0.16em] uppercase text-brand-400">
            {section.heading}
          </div>
          <ul className="space-y-0.5">
            {section.items.map(({ to, label, icon: Icon, end }) => (
              <li key={to}>
                <NavLink
                  to={to}
                  end={end}
                  onClick={onClick}
                  className={({ isActive }) =>
                    [
                      'group flex items-center gap-2.5 px-3 py-2 rounded-md text-sm font-medium transition-all',
                      isActive
                        ? 'bg-brand-900 text-white shadow-sheet'
                        : 'text-brand-600 hover:bg-brand-100 hover:text-brand-900',
                    ].join(' ')
                  }
                >
                  {({ isActive }) => (
                    <>
                      <Icon
                        size={16}
                        className={isActive ? 'text-white' : 'text-brand-400 group-hover:text-brand-700'}
                        strokeWidth={2}
                      />
                      <span className="truncate">{label}</span>
                    </>
                  )}
                </NavLink>
              </li>
            ))}
          </ul>
        </div>
      ))}
    </nav>
  );

  const initial = (user?.username || '?').slice(0, 1).toUpperCase();

  return (
    <div className="min-h-screen flex bg-brand-50 text-brand-900 animate-fade-in">
      {/* ─── Desktop sidebar (lg+) ─── */}
      <aside className="hidden lg:flex lg:flex-col fixed inset-y-0 left-0 w-64 bg-white border-r border-brand-200/70 z-40">
        <div className="px-5 pt-6 pb-5 border-b border-brand-200/60">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-brand-900 text-white flex items-center justify-center overflow-hidden shadow-sheet">
              <img
                src="/mla.png"
                alt="TVK"
                className="w-full h-full object-cover opacity-95"
              />
            </div>
            <div className="leading-tight min-w-0">
              <div className="font-display text-[15px] font-semibold tracking-tightest text-brand-900 truncate">
                TVK Grievance
              </div>
              <div className="text-[10px] font-semibold tracking-[0.18em] uppercase text-brand-400 mt-0.5">
                Admin Console
              </div>
            </div>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto py-3">{renderNav()}</div>

        <div className="border-t border-brand-200/60 p-3">
          <div className="flex items-center gap-2.5 px-2 py-2 rounded-md hover:bg-brand-100 transition-colors group">
            <div className="w-8 h-8 rounded-full bg-brand-900 text-white flex items-center justify-center font-semibold text-xs">
              {initial}
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-sm font-semibold text-brand-900 truncate leading-tight">
                {user?.username}
              </div>
              <div className="text-[10px] text-brand-400 tracking-wide uppercase mt-0.5">
                {user?.role || 'Admin'}
              </div>
            </div>
            <button
              onClick={logout}
              title="Sign out"
              className="p-1.5 rounded-md text-brand-400 hover:text-brand-900 hover:bg-white transition-colors"
            >
              <LogOut size={15} />
            </button>
          </div>
        </div>
      </aside>

      {/* ─── Mobile top bar ─── */}
      <header className="lg:hidden fixed top-0 inset-x-0 z-40 bg-white/85 backdrop-blur-md border-b border-brand-200/70">
        <div className="flex items-center justify-between px-4 h-14">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setOpen(true)}
              className="p-2 -ml-2 rounded-md text-brand-600 hover:bg-brand-100 transition"
              aria-label="Open menu"
            >
              <Menu size={20} />
            </button>
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-md bg-brand-900 overflow-hidden">
                <img src="/mla.png" alt="TVK" className="w-full h-full object-cover" />
              </div>
              <span className="font-display font-semibold tracking-tightest text-brand-900 text-sm">
                {deriveTitle(loc.pathname)}
              </span>
            </div>
          </div>
          <button
            onClick={logout}
            className="p-2 -mr-2 rounded-md text-brand-400 hover:text-brand-900 hover:bg-brand-100 transition"
            title="Sign out"
          >
            <LogOut size={18} />
          </button>
        </div>
      </header>

      {/* ─── Mobile drawer ─── */}
      <div
        className={`lg:hidden fixed inset-0 z-50 transition-opacity duration-200 ${
          open ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
        }`}
        onClick={() => setOpen(false)}
        aria-hidden={!open}
      >
        <div className="absolute inset-0 bg-brand-900/30 backdrop-blur-sm" />
        <aside
          className={`absolute inset-y-0 left-0 w-72 max-w-[85%] bg-white border-r border-brand-200 flex flex-col transform transition-transform duration-300 ease-out ${
            open ? 'translate-x-0' : '-translate-x-full'
          }`}
          onClick={(e) => e.stopPropagation()}
        >
          <div className="px-5 pt-5 pb-4 flex items-center justify-between border-b border-brand-200/70">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-brand-900 overflow-hidden">
                <img src="/mla.png" alt="TVK" className="w-full h-full object-cover" />
              </div>
              <div className="leading-tight">
                <div className="font-display font-semibold tracking-tightest text-[15px] text-brand-900">
                  TVK Grievance
                </div>
                <div className="text-[10px] font-semibold tracking-[0.18em] uppercase text-brand-400 mt-0.5">
                  Admin Console
                </div>
              </div>
            </div>
            <button
              onClick={() => setOpen(false)}
              className="p-2 -mr-2 rounded-md text-brand-400 hover:text-brand-900 hover:bg-brand-100"
              aria-label="Close menu"
            >
              <X size={18} />
            </button>
          </div>
          <div className="flex-1 overflow-y-auto py-3">
            {renderNav(() => setOpen(false))}
          </div>
          <div className="border-t border-brand-200/60 p-4 flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-brand-900 text-white flex items-center justify-center font-semibold text-xs">
              {initial}
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-sm font-semibold text-brand-900 truncate">{user?.username}</div>
              <div className="text-[10px] text-brand-400 tracking-wide uppercase">
                {user?.role || 'Admin'}
              </div>
            </div>
            <button
              onClick={logout}
              className="p-2 rounded-md text-brand-400 hover:text-brand-900 hover:bg-brand-100"
            >
              <LogOut size={16} />
            </button>
          </div>
        </aside>
      </div>

      {/* ─── Main column ─── */}
      <div className="flex-1 lg:ml-64 flex flex-col min-h-screen">
        {/* Desktop top bar — current page title + a placeholder ⌘K affordance.
            Stays sticky so it's always available when scrolling long lists. */}
        <div className="hidden lg:flex items-center justify-between sticky top-0 z-30 px-8 h-16 border-b border-brand-200/70 bg-white/85 backdrop-blur-md">
          <div className="flex items-center gap-3">
            <h2 className="font-display text-[17px] font-semibold tracking-tightest text-brand-900">
              {deriveTitle(loc.pathname)}
            </h2>
          </div>
          <div className="flex items-center gap-3">
            <div className="hidden xl:inline-flex items-center gap-2 px-3 py-1.5 rounded-md border border-brand-200/80 bg-brand-50 text-brand-500 text-xs">
              <Search size={13} />
              <span>Search…</span>
              <span className="ml-3 inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded border border-brand-200 bg-white text-[10px] font-mono text-brand-500">
                <Command size={10} /> K
              </span>
            </div>
            <div className="text-[11px] text-brand-400 font-semibold tracking-[0.14em] uppercase">
              {new Date().toLocaleDateString('en-IN', {
                day: '2-digit',
                month: 'short',
                year: 'numeric',
              })}
            </div>
          </div>
        </div>

        <main className="flex-1 px-4 sm:px-6 lg:px-8 py-6 lg:py-8 pt-[68px] lg:pt-8 max-w-[1400px] w-full mx-auto animate-slide-up">
          <Outlet />
        </main>

        <footer className="border-t border-brand-200/60 bg-white/60 px-4 sm:px-6 lg:px-8 py-4 mt-auto">
          <div className="max-w-[1400px] mx-auto flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 text-[11px] text-brand-400 font-medium">
            <div>© {new Date().getFullYear()} TVK Grievance · For Official Use</div>
            <div className="tracking-[0.14em] uppercase">
              v1.0 · Admin Console
            </div>
          </div>
        </footer>
      </div>
    </div>
  );
}
