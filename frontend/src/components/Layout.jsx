import { NavLink, Outlet, useNavigate } from 'react-router-dom';
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
} from 'lucide-react';
import { useState, useEffect, useRef } from 'react';

const NAV = [
  { to: '/', label: 'Dashboard', icon: LayoutDashboard, end: true },
  { to: '/service-requests', label: 'Service Requests', icon: ClipboardList },
  { to: '/members', label: 'Members', icon: Users },
  { to: '/voters', label: 'Voters', icon: ShieldCheck },
  { to: '/campaigns', label: 'Campaigns', icon: Megaphone },
  { to: '/events', label: 'Events', icon: CalendarDays },
  { to: '/flow-images', label: 'Flow Images', icon: ImageIcon },
];

export default function Layout({ user, setAuth }) {
  const nav = useNavigate();
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const menuRef = useRef(null);

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 10);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const logout = () => {
    localStorage.removeItem('tvk_token');
    setAuth(null);
    nav('/login');
  };

  return (
    <div className="min-h-screen flex flex-col relative animate-fade-in">
      <header
        className={`fixed top-0 inset-x-0 z-50 transition-all duration-300 ${
          scrolled
            ? 'bg-white/80 backdrop-blur-xl border-b border-gray-200/50 shadow-sm py-2'
            : 'bg-white py-4 border-b border-gray-100'
        }`}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button
              onClick={() => setOpen(!open)}
              className="lg:hidden p-2 -ml-2 text-gray-600 hover:text-brand-700 transition"
            >
              {open ? <X size={24} /> : <Menu size={24} />}
            </button>
            <div className="flex items-center gap-3">
              <img src="/mla.png" alt="TVK Logo" className="w-10 h-10 object-cover rounded-full drop-shadow-md" />
              <div className="hidden sm:block">
                <div className="font-extrabold text-brand-900 tracking-tight leading-none text-lg">
                  TVK Grievance
                </div>
                <div className="text-xs font-semibold text-brand-600 uppercase tracking-wider mt-0.5">
                  Admin Console
                </div>
              </div>
            </div>
          </div>

          <nav className="hidden lg:flex items-center gap-1">
            {NAV.map(({ to, label, icon: Icon, end }) => (
              <NavLink
                key={to}
                to={to}
                end={end}
                className={({ isActive }) =>
                  `flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-medium transition-all duration-300 ${
                    isActive
                      ? 'bg-brand-50 text-brand-700 shadow-sm'
                      : 'text-gray-600 hover:bg-gray-50 hover:text-brand-600'
                  }`
                }
              >
                <Icon size={16} className="opacity-80" />
                {label}
              </NavLink>
            ))}
          </nav>

          <div className="flex items-center gap-4">
            <div className="hidden md:flex flex-col items-end">
              <span className="text-xs text-gray-500 font-medium">Logged in as</span>
              <span className="text-sm font-bold text-gray-900">{user?.username}</span>
            </div>
            <button
              onClick={logout}
              className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-xl transition-colors"
              title="Logout"
            >
              <LogOut size={20} />
            </button>
          </div>
        </div>
      </header>

      {/* Mobile Drawer */}
      <div
        className={`fixed inset-0 z-40 bg-gray-900/20 backdrop-blur-sm transition-opacity lg:hidden ${
          open ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
        }`}
        onClick={() => setOpen(false)}
      >
        <div
          ref={menuRef}
          className={`absolute inset-y-0 left-0 w-72 bg-white shadow-2xl transform transition-transform duration-300 ease-in-out flex flex-col ${
            open ? 'translate-x-0' : '-translate-x-full'
          }`}
          onClick={(e) => e.stopPropagation()}
        >
          <div className="p-6 border-b border-gray-100 flex items-center gap-3">
             <img src="/logo.png" alt="TVK Logo" className="w-10 h-10 object-contain drop-shadow-md" />
              <div>
                <div className="font-extrabold text-brand-900 tracking-tight leading-none text-lg">
                  TVK Grievance
                </div>
                <div className="text-xs font-semibold text-brand-600 uppercase tracking-wider mt-0.5">
                  Admin Console
                </div>
              </div>
          </div>
          <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
            {NAV.map(({ to, label, icon: Icon, end }) => (
              <NavLink
                key={to}
                to={to}
                end={end}
                onClick={() => setOpen(false)}
                className={({ isActive }) =>
                  `flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all ${
                    isActive
                      ? 'bg-brand-50 text-brand-700'
                      : 'text-gray-600 hover:bg-gray-50 hover:text-brand-600'
                  }`
                }
              >
                <Icon size={18} />
                {label}
              </NavLink>
            ))}
          </nav>
          <div className="p-4 border-t border-gray-100 bg-gray-50">
            <div className="text-xs text-gray-500 mb-1">Signed in as</div>
            <div className="font-bold text-gray-900 mb-3">{user?.username}</div>
            <button
              onClick={logout}
              className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-white border border-gray-200 rounded-xl text-sm font-medium text-red-600 hover:bg-red-50 hover:border-red-100 transition"
            >
              <LogOut size={16} /> Logout
            </button>
          </div>
        </div>
      </div>

      <main className="flex-1 pt-[88px] pb-12 w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 animate-slide-up">
        <Outlet />
      </main>
    </div>
  );
}
