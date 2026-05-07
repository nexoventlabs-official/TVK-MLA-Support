import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard,
  ClipboardList,
  Users,
  ShieldCheck,
  Megaphone,
  Image as ImageIcon,
  LogOut,
  Menu,
} from 'lucide-react';
import { useState } from 'react';

const NAV = [
  { to: '/', label: 'Dashboard', icon: LayoutDashboard, end: true },
  { to: '/service-requests', label: 'Service Requests', icon: ClipboardList },
  { to: '/members', label: 'Members', icon: Users },
  { to: '/voters', label: 'Voters', icon: ShieldCheck },
  { to: '/campaigns', label: 'Campaigns', icon: Megaphone },
  { to: '/flow-images', label: 'Flow Images', icon: ImageIcon },
];

export default function Layout({ user, setAuth }) {
  const nav = useNavigate();
  const [open, setOpen] = useState(false);

  const logout = () => {
    localStorage.removeItem('tvk_token');
    setAuth(null);
    nav('/login');
  };

  return (
    <div className="min-h-screen flex">
      <aside
        className={`fixed lg:static inset-y-0 left-0 z-30 w-64 bg-brand-900 text-white flex flex-col transition-transform ${
          open ? 'translate-x-0' : '-translate-x-full'
        } lg:translate-x-0`}
      >
        <div className="px-5 py-6 flex items-center gap-3 border-b border-brand-800">
          <div className="w-11 h-11 rounded-full bg-accent-500 flex items-center justify-center text-brand-900 font-extrabold">
            TVK
          </div>
          <div>
            <div className="font-bold leading-tight">TVK Grievance</div>
            <div className="text-xs text-brand-200">Admin Console</div>
          </div>
        </div>

        <nav className="flex-1 py-4 space-y-1 px-3 overflow-y-auto">
          {NAV.map(({ to, label, icon: Icon, end }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              onClick={() => setOpen(false)}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition ${
                  isActive
                    ? 'bg-brand-700 text-white font-medium'
                    : 'text-brand-100 hover:bg-brand-800 hover:text-white'
                }`
              }
            >
              <Icon size={18} />
              {label}
            </NavLink>
          ))}
        </nav>

        <div className="p-3 border-t border-brand-800">
          <div className="px-3 py-2 mb-2 text-xs text-brand-200">
            Signed in as <span className="text-white font-medium">{user?.username}</span>
          </div>
          <button
            onClick={logout}
            className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-brand-100 hover:bg-brand-800"
          >
            <LogOut size={16} /> Logout
          </button>
        </div>
      </aside>

      {open && (
        <div
          onClick={() => setOpen(false)}
          className="fixed inset-0 bg-black/40 z-20 lg:hidden"
        />
      )}

      <div className="flex-1 flex flex-col min-w-0">
        <header className="bg-white border-b border-gray-200 px-4 lg:px-6 py-3 flex items-center justify-between sticky top-0 z-10">
          <button onClick={() => setOpen(true)} className="lg:hidden p-2 -ml-2">
            <Menu size={22} />
          </button>
          <div className="font-semibold text-brand-800 truncate">TVK – Tamilaga Vettri Kazhagam</div>
          <div className="w-8" />
        </header>

        <main className="flex-1 p-4 lg:p-6 overflow-x-hidden">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
