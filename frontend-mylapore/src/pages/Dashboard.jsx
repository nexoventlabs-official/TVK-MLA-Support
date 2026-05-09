import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Users,
  ClipboardList,
  AlertCircle,
  CheckCircle2,
  Megaphone,
  Phone,
  Clock,
} from 'lucide-react';
import api from '../api';

const STATUS_COLORS = {
  new: 'bg-amber-100 text-amber-700',
  in_progress: 'bg-blue-100 text-blue-700',
  resolved: 'bg-green-100 text-green-700',
  rejected: 'bg-gray-200 text-gray-700',
};

const TPL_COLORS = {
  PENDING: 'bg-amber-100 text-amber-700',
  APPROVED: 'bg-green-100 text-green-700',
  REJECTED: 'bg-red-100 text-red-700',
  DRAFT: 'bg-gray-200 text-gray-700',
  PAUSED: 'bg-gray-200 text-gray-700',
  DISABLED: 'bg-gray-200 text-gray-700',
  IN_APPEAL: 'bg-blue-100 text-blue-700',
};

const cards = [
  { key: 'members', label: 'Members', icon: Users, to: '/members', color: 'bg-brand-100 text-brand-700' },
  { key: 'totalRequests', label: 'Total Requests', icon: ClipboardList, to: '/service-requests', color: 'bg-blue-100 text-blue-700' },
  { key: 'newRequests', label: 'New Requests', icon: AlertCircle, to: '/service-requests?status=new', color: 'bg-amber-100 text-amber-700' },
  { key: 'resolved', label: 'Resolved', icon: CheckCircle2, to: '/service-requests?status=resolved', color: 'bg-green-100 text-green-700' },
];

export default function Dashboard() {
  const [data, setData] = useState({ stats: {}, byService: [], recentRequests: [], recentMembers: [], recentCampaigns: [] });
  const [loading, setLoading] = useState(true);

  const load = async () => {
    try {
      const r = await api.get('/dashboard/stats');
      setData(r.data);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // Auto-refresh every 30s so template statuses stay live
    const t = setInterval(load, 30_000);
    return () => clearInterval(t);
  }, []);

  return (
    <div className="space-y-8 animate-fade-in">
      <div className="flex items-end justify-between flex-wrap gap-4 bg-white/50 p-6 rounded-2xl border border-gray-100 shadow-sm backdrop-blur-sm">
        <div>
          <h1 className="text-3xl font-extrabold text-gray-900 tracking-tight">Dashboard</h1>
          <p className="text-sm font-medium text-gray-500 mt-1">Overview of grievance activity & WhatsApp campaigns.</p>
        </div>
        <button onClick={() => api.post('/campaigns/sync').then(load)} className="btn-secondary">
          Sync Template Status
        </button>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
        {cards.map(({ key, label, icon: Icon, to, color }, idx) => (
          <Link key={key} to={to} className="card p-6 group hover:-translate-y-1" style={{ animationDelay: `${idx * 100}ms` }}>
            <div className="flex items-center justify-between">
              <div>
                <div className="text-xs font-bold text-gray-500 uppercase tracking-wider">{label}</div>
                <div className="text-4xl font-extrabold text-gray-900 mt-2">
                  {loading ? '…' : data.stats[key] ?? 0}
                </div>
              </div>
              <div className={`w-14 h-14 rounded-2xl flex items-center justify-center bg-gradient-to-br from-white to-gray-50 shadow-sm border border-gray-100 transition-transform group-hover:scale-110 ${color}`}>
                <Icon size={26} />
              </div>
            </div>
          </Link>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="card lg:col-span-2 overflow-hidden">
          <div className="px-6 py-5 border-b border-gray-100/50 bg-gray-50/30 flex items-center justify-between">
            <span className="font-bold text-gray-800 tracking-tight">Requests by Service</span>
            <Link to="/service-requests" className="text-xs font-semibold text-brand-600 hover:text-brand-800 transition">View all &rarr;</Link>
          </div>
          <ul className="divide-y divide-gray-100">
            {data.byService.map((s) => (
              <li key={s.id} className="px-5 py-3 flex items-center justify-between">
                <span className="font-medium text-gray-800">{s.title}</span>
                <span className="pill bg-brand-50 text-brand-700">{s.count}</span>
              </li>
            ))}
            {!data.byService.length && (
              <li className="p-6 text-sm text-gray-500 text-center">No data yet.</li>
            )}
          </ul>
        </div>

        <div className="card overflow-hidden">
          <div className="px-6 py-5 border-b border-gray-100/50 bg-gray-50/30 flex items-center justify-between">
            <span className="font-bold text-gray-800 tracking-tight flex items-center gap-2"><Megaphone size={16} className="text-brand-500" /> Campaigns</span>
            <Link to="/campaigns" className="text-xs font-semibold text-brand-600 hover:text-brand-800 transition">Manage &rarr;</Link>
          </div>
          <ul className="divide-y divide-gray-100">
            {data.recentCampaigns.map((c) => (
              <li key={c._id} className="px-5 py-3">
                <div className="flex items-center justify-between gap-2">
                  <span className="font-medium truncate">{c.name}</span>
                  <span className={`pill ${TPL_COLORS[c.status] || 'bg-gray-200 text-gray-700'}`}>
                    {c.status}
                  </span>
                </div>
                <div className="text-xs text-gray-500 mt-0.5">
                  {new Date(c.createdAt).toLocaleString()}
                </div>
              </li>
            ))}
            {!data.recentCampaigns?.length && (
              <li className="p-6 text-sm text-gray-500 text-center">No campaigns yet.</li>
            )}
          </ul>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="card overflow-hidden">
          <div className="px-6 py-5 border-b border-gray-100/50 bg-gray-50/30 font-bold text-gray-800 tracking-tight">Recent Service Requests</div>
          {!data.recentRequests?.length ? (
            <div className="p-6 text-sm text-gray-500 text-center">No requests yet.</div>
          ) : (
            <ul className="divide-y divide-gray-100">
              {data.recentRequests.map((r) => (
                <li key={r._id} className="px-5 py-3">
                  <div className="flex items-center justify-between gap-2">
                    <div className="font-medium text-gray-900">{r.optionTitle}</div>
                    <span className={`pill ${STATUS_COLORS[r.status]}`}>{r.status.replace('_', ' ')}</span>
                  </div>
                  <div className="text-xs text-gray-500 mt-0.5">
                    {r.serviceTitle} • <Phone size={11} className="inline" /> {r.phone}
                  </div>
                  {r.description && <div className="text-sm text-gray-700 mt-1 line-clamp-2">{r.description}</div>}
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="card overflow-hidden">
          <div className="px-6 py-5 border-b border-gray-100/50 bg-gray-50/30 font-bold text-gray-800 tracking-tight">Recent Members</div>
          {!data.recentMembers?.length ? (
            <div className="p-6 text-sm text-gray-500 text-center">No members yet.</div>
          ) : (
            <ul className="divide-y divide-gray-100">
              {data.recentMembers.map((m) => (
                <li key={m._id} className="px-5 py-3 flex items-center gap-3">
                  <div className="w-9 h-9 rounded-full bg-brand-100 text-brand-700 flex items-center justify-center font-medium">
                    {(m.name || m.profileName || '?')[0]?.toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-medium truncate">{m.name || m.profileName || '—'}</div>
                    <div className="text-xs text-gray-500 flex items-center gap-1">
                      <Phone size={12} /> {m.phone}
                    </div>
                  </div>
                  <div className="text-xs text-gray-400 inline-flex items-center gap-1">
                    <Clock size={11} /> {new Date(m.lastSeenAt).toLocaleDateString()}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
