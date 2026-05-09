import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard,
  ClipboardList,
  Users,
  ShieldCheck,
  Megaphone,
  CalendarDays,
  LogOut,
  Menu,
  X,
  ChevronRight,
} from 'lucide-react';
import { useState, useEffect } from 'react';
import { TOKEN_KEY } from '../api';

// The Mylapore constituency admin panel intentionally hides the Flow
// Images page — that's a content-management concern for the party-level
// admin, not the constituency office.
const NAV = [
  { to: '/', label: 'Dashboard', icon: LayoutDashboard, end: true, hint: 'Overview & key metrics' },
  { to: '/service-requests', label: 'Service Requests', icon: ClipboardList, hint: 'Grievances & tickets' },
  { to: '/members', label: 'Members', icon: Users, hint: 'Registered constituents' },
  { to: '/voters', label: 'Voters', icon: ShieldCheck, hint: 'EPIC roll directory' },
  { to: '/campaigns', label: 'Campaigns', icon: Megaphone, hint: 'Outreach broadcasts' },
  { to: '/events', label: 'Events', icon: CalendarDays, hint: 'Camps & public events' },
];

export default function Layout({ user, setAuth }) {
  const nav = useNavigate();
  const [open, setOpen] = useState(false); // mobile drawer
  const [now, setNow] = useState(new Date());

  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 30 * 1000);
    return () => clearInterval(t);
  }, []);

  const logout = () => {
    localStorage.removeItem(TOKEN_KEY);
    setAuth(null);
    nav('/login');
  };

  const dateLabel = now.toLocaleDateString('en-IN', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });

  return (
    <div className="min-h-screen flex bg-ivory-50 relative animate-fade-in">
      {/* ─── Desktop sidebar ─── */}
      <aside className="hidden lg:flex lg:flex-col fixed inset-y-0 left-0 w-72 bg-brand-900 text-white shadow-2xl z-40">
        {/* Gold ribbon across the top — formal government letterhead feel. */}
        <div className="h-1 bg-gradient-to-r from-accent-400 via-accent-500 to-accent-400" />

        <div className="px-6 pt-7 pb-6 border-b border-white/10">
          <div className="flex items-center gap-3">
            <div className="relative">
              <img
                src="/mla.png"
                alt="Office of the Mylapore MLA"
                className="w-12 h-12 rounded-full object-cover ring-2 ring-accent-400/70 ring-offset-2 ring-offset-brand-900"
              />
            </div>
            <div className="leading-tight">
              <div className="font-serif text-lg font-bold tracking-tight">Mylapore</div>
              <div className="text-[10px] font-semibold tracking-[0.18em] uppercase text-accent-200">
                Legislative Assembly
              </div>
            </div>
          </div>
          <div className="mt-4 text-[11px] tracking-wide text-white/60 leading-relaxed">
            Constituency Grievance &amp; Outreach Console
          </div>
        </div>

        <nav className="flex-1 overflow-y-auto px-4 py-5 space-y-1">
          <div className="text-[10px] font-bold tracking-[0.22em] text-accent-300/80 uppercase px-3 pb-2">
            Governance
          </div>
          {NAV.map(({ to, label, icon: Icon, end, hint }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              className={({ isActive }) =>
                [
                  'group relative flex items-start gap-3 px-3 py-2.5 rounded-lg text-sm transition-all',
                  isActive
                    ? 'bg-white/10 text-white shadow-inner'
                    : 'text-white/75 hover:bg-white/5 hover:text-white',
                ].join(' ')
              }
            >
              {({ isActive }) => (
                <>
                  {isActive && (
                    <span className="absolute left-0 top-2 bottom-2 w-[3px] rounded-r bg-accent-400" />
                  )}
                  <Icon
                    size={18}
                    className={
                      isActive
                        ? 'mt-0.5 text-accent-300'
                        : 'mt-0.5 text-white/55 group-hover:text-accent-200'
                    }
                  />
                  <div className="flex-1">
                    <div className="font-semibold leading-tight">{label}</div>
                    <div className="text-[10.5px] tracking-wide text-white/45 mt-0.5">
                      {hint}
                    </div>
                  </div>
                </>
              )}
            </NavLink>
          ))}
        </nav>

        <div className="px-5 py-4 border-t border-white/10 bg-brand-900/60 backdrop-blur-sm">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-full bg-accent-400/20 border border-accent-400/40 flex items-center justify-center text-accent-200 font-bold text-sm">
              {(user?.username || 'M').slice(0, 1).toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-sm font-semibold truncate">{user?.username}</div>
              <div className="text-[10px] tracking-wide text-white/50 uppercase">
                {user?.role || 'Officer'}
              </div>
            </div>
            <button
              onClick={logout}
              title="Sign out"
              className="p-2 rounded-lg text-white/60 hover:text-white hover:bg-white/10 transition"
            >
              <LogOut size={16} />
            </button>
          </div>
        </div>
      </aside>

      {/* ─── Mobile top bar + drawer ─── */}
      <header className="lg:hidden fixed top-0 inset-x-0 z-40 bg-brand-900 text-white shadow-lg">
        <div className="h-1 bg-gradient-to-r from-accent-400 via-accent-500 to-accent-400" />
        <div className="flex items-center justify-between px-4 py-3">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setOpen(true)}
              className="p-2 -ml-2 rounded-lg hover:bg-white/10"
            >
              <Menu size={22} />
            </button>
            <img src="/mla.png" alt="Logo" className="w-8 h-8 rounded-full object-cover ring-1 ring-accent-400/60" />
            <div className="leading-tight">
              <div className="font-serif font-bold text-sm">Mylapore</div>
              <div className="text-[9px] tracking-[0.2em] uppercase text-accent-200">
                Legislative Assembly
              </div>
            </div>
          </div>
          <button
            onClick={logout}
            className="p-2 rounded-lg text-white/70 hover:bg-white/10"
            title="Sign out"
          >
            <LogOut size={18} />
          </button>
        </div>
      </header>

      <div
        className={`lg:hidden fixed inset-0 z-50 bg-black/50 backdrop-blur-sm transition-opacity ${
          open ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
        }`}
        onClick={() => setOpen(false)}
      >
        <aside
          className={`absolute inset-y-0 left-0 w-80 max-w-[85%] bg-brand-900 text-white shadow-2xl flex flex-col transform transition-transform duration-300 ${
            open ? 'translate-x-0' : '-translate-x-full'
          }`}
          onClick={(e) => e.stopPropagation()}
        >
          <div className="h-1 bg-gradient-to-r from-accent-400 via-accent-500 to-accent-400" />
          <div className="px-5 pt-5 pb-4 flex items-center justify-between border-b border-white/10">
            <div className="flex items-center gap-3">
              <img src="/mla.png" alt="Logo" className="w-10 h-10 rounded-full object-cover ring-2 ring-accent-400/70" />
              <div className="leading-tight">
                <div className="font-serif font-bold text-lg">Mylapore</div>
                <div className="text-[10px] tracking-[0.2em] uppercase text-accent-200">
                  Legislative Assembly
                </div>
              </div>
            </div>
            <button onClick={() => setOpen(false)} className="p-2 rounded-lg hover:bg-white/10">
              <X size={20} />
            </button>
          </div>

          <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-1">
            {NAV.map(({ to, label, icon: Icon, end, hint }) => (
              <NavLink
                key={to}
                to={to}
                end={end}
                onClick={() => setOpen(false)}
                className={({ isActive }) =>
                  [
                    'flex items-start gap-3 px-3 py-3 rounded-lg text-sm transition-all',
                    isActive ? 'bg-white/10 text-white' : 'text-white/80 hover:bg-white/5',
                  ].join(' ')
                }
              >
                <Icon size={18} className="mt-0.5 text-accent-300" />
                <div>
                  <div className="font-semibold leading-tight">{label}</div>
                  <div className="text-[10px] text-white/50 mt-0.5">{hint}</div>
                </div>
                <ChevronRight size={14} className="ml-auto mt-1 text-white/40" />
              </NavLink>
            ))}
          </nav>

          <div className="px-5 py-4 border-t border-white/10 flex items-center gap-3">
            <div className="w-9 h-9 rounded-full bg-accent-400/20 border border-accent-400/40 flex items-center justify-center text-accent-200 font-bold text-sm">
              {(user?.username || 'M').slice(0, 1).toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-sm font-semibold truncate">{user?.username}</div>
              <div className="text-[10px] tracking-wide text-white/50 uppercase">
                {user?.role || 'Officer'}
              </div>
            </div>
            <button
              onClick={logout}
              className="p-2 rounded-lg text-white/70 hover:bg-white/10"
              title="Sign out"
            >
              <LogOut size={16} />
            </button>
          </div>
        </aside>
      </div>

      {/* ─── Main content column ─── */}
      <div className="flex-1 lg:ml-72 flex flex-col min-h-screen">
        {/* Desktop "page frame" header — formal chrome with the date. */}
        <div className="hidden lg:flex items-center justify-between px-8 py-5 border-b border-gray-200/70 bg-white/80 backdrop-blur-sm">
          <div>
            <div className="text-[10px] font-bold tracking-[0.22em] text-brand-600 uppercase">
              Office of the MLA
            </div>
            <div className="font-serif text-xl text-brand-900 font-bold mt-0.5">
              Constituency Administration Console
            </div>
          </div>
          <div className="text-right">
            <div className="text-[10px] font-bold tracking-[0.2em] text-gray-400 uppercase">
              {dateLabel}
            </div>
            <div className="text-xs text-gray-500 mt-0.5">
              Session: <span className="font-semibold text-brand-800">{user?.username}</span>
            </div>
          </div>
        </div>

        <main className="flex-1 px-4 sm:px-6 lg:px-10 py-6 lg:py-8 pt-[68px] lg:pt-8 relative z-10 animate-slide-up">
          <Outlet />
        </main>

        <footer className="px-4 sm:px-6 lg:px-10 py-5 text-[11px] text-gray-500 tracking-wide border-t border-gray-200/60 bg-white/60">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
            <div>
              © {new Date().getFullYear()} Office of the Mylapore MLA — Grievance Cell.
              All rights reserved.
            </div>
            <div className="uppercase tracking-[0.15em] text-brand-700 font-semibold">
              Government Service · For Official Use
            </div>
          </div>
        </footer>
      </div>
    </div>
  );
}
