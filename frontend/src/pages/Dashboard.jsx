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
  ArrowUpRight,
  RefreshCw,
} from 'lucide-react';
import api from '../api';

// ─── Status pill recipes ─────────────────────────────────────────
// Soft tinted backgrounds + matching ring give us refined, low-saturation
// status indicators that sit comfortably on a white surface. Each entry
// is intentionally consistent: bg-X-50, text-X-700, ring-1 ring-X-200.
const STATUS_COLORS = {
  new: 'bg-amber-50 text-amber-700 ring-1 ring-amber-200/60',
  in_progress: 'bg-blue-50 text-blue-700 ring-1 ring-blue-200/60',
  resolved: 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200/60',
  rejected: 'bg-brand-100 text-brand-600 ring-1 ring-brand-200',
};

const TPL_COLORS = {
  PENDING: 'bg-amber-50 text-amber-700 ring-1 ring-amber-200/60',
  APPROVED: 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200/60',
  REJECTED: 'bg-red-50 text-red-700 ring-1 ring-red-200/60',
  DRAFT: 'bg-brand-100 text-brand-600 ring-1 ring-brand-200',
  PAUSED: 'bg-brand-100 text-brand-600 ring-1 ring-brand-200',
  DISABLED: 'bg-brand-100 text-brand-600 ring-1 ring-brand-200',
  IN_APPEAL: 'bg-blue-50 text-blue-700 ring-1 ring-blue-200/60',
};

// Stat-card metadata. Every card uses the same monochrome treatment —
// the icon receives a neutral square chip; the label + huge tabular
// number do the heavy lifting. No coloured backgrounds, no gradients.
const cards = [
  { key: 'members', label: 'Members', icon: Users, to: '/members', help: 'Registered & active' },
  { key: 'totalRequests', label: 'Total Requests', icon: ClipboardList, to: '/service-requests', help: 'All grievances raised' },
  { key: 'newRequests', label: 'New Requests', icon: AlertCircle, to: '/service-requests?status=new', help: 'Awaiting triage' },
  { key: 'resolved', label: 'Resolved', icon: CheckCircle2, to: '/service-requests?status=resolved', help: 'Closed successfully' },
];

export default function Dashboard() {
  const [data, setData] = useState({
    stats: {},
    byService: [],
    recentRequests: [],
    recentMembers: [],
    recentCampaigns: [],
  });
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);

  const load = async () => {
    try {
      const r = await api.get('/dashboard/stats');
      setData(r.data);
    } finally {
      setLoading(false);
    }
  };

  const sync = async () => {
    setSyncing(true);
    try {
      await api.post('/campaigns/sync');
      await load();
    } finally {
      setSyncing(false);
    }
  };

  useEffect(() => {
    load();
    // Auto-refresh every 30s so template statuses stay live
    const t = setInterval(load, 30_000);
    return () => clearInterval(t);
  }, []);

  return (
    <div className="space-y-8">
      {/* ─── Page header ─── */}
      <div className="page-header">
        <div>
          <div className="text-[10px] font-semibold tracking-[0.22em] uppercase text-brand-400 mb-2">
            Overview
          </div>
          <h1 className="page-title">Dashboard</h1>
          <p className="page-subtitle">
            Snapshot of grievance activity, members and broadcast campaigns.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={sync} disabled={syncing} className="btn-secondary">
            <RefreshCw size={14} className={syncing ? 'animate-spin' : ''} />
            <span>{syncing ? 'Syncing…' : 'Sync templates'}</span>
          </button>
        </div>
      </div>

      {/* ─── Stat cards ─── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {cards.map(({ key, label, icon: Icon, to, help }) => (
          <Link
            key={key}
            to={to}
            className="card-hover group p-5 flex flex-col gap-4 relative overflow-hidden"
          >
            <div className="flex items-start justify-between">
              <div className="w-9 h-9 rounded-md bg-brand-100 text-brand-700 flex items-center justify-center transition-colors group-hover:bg-brand-900 group-hover:text-white">
                <Icon size={16} strokeWidth={2} />
              </div>
              <ArrowUpRight
                size={14}
                className="text-brand-300 group-hover:text-brand-900 transition-colors"
              />
            </div>
            <div>
              <div className="text-[11px] font-semibold tracking-wide uppercase text-brand-500">
                {label}
              </div>
              <div className="font-display text-[34px] sm:text-[40px] font-semibold tracking-tightest text-brand-900 leading-none mt-1.5 tabular">
                {loading ? (
                  <span className="inline-block w-12 h-8 bg-brand-100 rounded animate-pulse" />
                ) : (
                  data.stats[key] ?? 0
                )}
              </div>
              <div className="text-[11px] text-brand-400 mt-1.5">{help}</div>
            </div>
          </Link>
        ))}
      </div>

      {/* ─── Two-column: requests by service + campaigns ─── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 lg:gap-5">
        <div className="card lg:col-span-2 overflow-hidden">
          <div className="section-bar">
            <div>
              <div className="font-display font-semibold text-brand-900 tracking-tightest">
                Requests by Service
              </div>
              <div className="text-[11px] text-brand-400 mt-0.5">
                Distribution across grievance categories
              </div>
            </div>
            <Link
              to="/service-requests"
              className="text-[11px] font-semibold tracking-wide uppercase text-brand-600 hover:text-brand-900 transition inline-flex items-center gap-1"
            >
              View all <ArrowUpRight size={12} />
            </Link>
          </div>
          {data.byService.length === 0 ? (
            <div className="p-10 text-sm text-brand-400 text-center">No data yet.</div>
          ) : (
            <ul>
              {data.byService.map((s, i) => {
                // Render each row with a thin proportional bar so density
                // is visible at a glance without needing a chart library.
                const max = Math.max(...data.byService.map((x) => x.count || 0), 1);
                const pct = Math.max(2, Math.round(((s.count || 0) / max) * 100));
                return (
                  <li
                    key={s.id}
                    className={`px-5 py-3.5 flex items-center gap-4 ${
                      i !== data.byService.length - 1 ? 'border-b border-brand-100' : ''
                    }`}
                  >
                    <span className="flex-1 text-sm font-medium text-brand-800 truncate">
                      {s.title}
                    </span>
                    <div className="hidden sm:block w-40 h-1.5 rounded-full bg-brand-100 overflow-hidden">
                      <span
                        className="block h-full bg-brand-900 rounded-full"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                    <span className="font-mono text-[13px] font-semibold tabular text-brand-900 w-10 text-right">
                      {s.count}
                    </span>
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        <div className="card overflow-hidden">
          <div className="section-bar">
            <div>
              <div className="font-display font-semibold text-brand-900 tracking-tightest flex items-center gap-2">
                <Megaphone size={14} className="text-brand-500" /> Campaigns
              </div>
              <div className="text-[11px] text-brand-400 mt-0.5">
                Recent template status
              </div>
            </div>
            <Link
              to="/campaigns"
              className="text-[11px] font-semibold tracking-wide uppercase text-brand-600 hover:text-brand-900 inline-flex items-center gap-1"
            >
              Manage <ArrowUpRight size={12} />
            </Link>
          </div>
          {!data.recentCampaigns?.length ? (
            <div className="p-10 text-sm text-brand-400 text-center">No campaigns yet.</div>
          ) : (
            <ul>
              {data.recentCampaigns.map((c, i) => (
                <li
                  key={c._id}
                  className={`px-5 py-3 ${
                    i !== data.recentCampaigns.length - 1 ? 'border-b border-brand-100' : ''
                  }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-medium truncate text-brand-900 text-[13px]">
                      {c.name}
                    </span>
                    <span className={`pill ${TPL_COLORS[c.status] || TPL_COLORS.DRAFT}`}>
                      {c.status}
                    </span>
                  </div>
                  <div className="text-[11px] text-brand-400 mt-1 tabular">
                    {new Date(c.createdAt).toLocaleString()}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      {/* ─── Two-column: recent requests + recent members ─── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 lg:gap-5">
        <div className="card overflow-hidden">
          <div className="section-bar">
            <div>
              <div className="font-display font-semibold text-brand-900 tracking-tightest">
                Recent Service Requests
              </div>
              <div className="text-[11px] text-brand-400 mt-0.5">
                The latest grievances submitted via WhatsApp
              </div>
            </div>
            <Link
              to="/service-requests"
              className="text-[11px] font-semibold tracking-wide uppercase text-brand-600 hover:text-brand-900 inline-flex items-center gap-1"
            >
              All <ArrowUpRight size={12} />
            </Link>
          </div>
          {!data.recentRequests?.length ? (
            <div className="p-10 text-sm text-brand-400 text-center">No requests yet.</div>
          ) : (
            <ul>
              {data.recentRequests.map((r, i) => (
                <li
                  key={r._id}
                  className={`px-5 py-3.5 ${
                    i !== data.recentRequests.length - 1 ? 'border-b border-brand-100' : ''
                  }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className="font-medium text-brand-900 text-[13.5px] truncate">
                      {r.optionTitle}
                    </div>
                    <span className={`pill ${STATUS_COLORS[r.status] || STATUS_COLORS.rejected}`}>
                      {String(r.status || '').replace('_', ' ')}
                    </span>
                  </div>
                  <div className="text-[11px] text-brand-500 mt-0.5 inline-flex items-center gap-2 tabular">
                    <span>{r.serviceTitle}</span>
                    <span className="text-brand-300">·</span>
                    <span className="inline-flex items-center gap-1">
                      <Phone size={10} /> {r.phone}
                    </span>
                  </div>
                  {r.description && (
                    <div className="text-[13px] text-brand-700 mt-1.5 line-clamp-2">
                      {r.description}
                    </div>
                  )}
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="card overflow-hidden">
          <div className="section-bar">
            <div>
              <div className="font-display font-semibold text-brand-900 tracking-tightest">
                Recent Members
              </div>
              <div className="text-[11px] text-brand-400 mt-0.5">
                Newly registered constituents
              </div>
            </div>
            <Link
              to="/members"
              className="text-[11px] font-semibold tracking-wide uppercase text-brand-600 hover:text-brand-900 inline-flex items-center gap-1"
            >
              All <ArrowUpRight size={12} />
            </Link>
          </div>
          {!data.recentMembers?.length ? (
            <div className="p-10 text-sm text-brand-400 text-center">No members yet.</div>
          ) : (
            <ul>
              {data.recentMembers.map((m, i) => (
                <li
                  key={m._id}
                  className={`px-5 py-3 flex items-center gap-3 ${
                    i !== data.recentMembers.length - 1 ? 'border-b border-brand-100' : ''
                  }`}
                >
                  <div className="w-9 h-9 rounded-full bg-brand-100 text-brand-800 flex items-center justify-center font-semibold text-sm">
                    {(m.name || m.profileName || '?')[0]?.toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-brand-900 truncate text-[13.5px]">
                      {m.name || m.profileName || '—'}
                    </div>
                    <div className="text-[11px] text-brand-500 inline-flex items-center gap-1 tabular">
                      <Phone size={10} /> {m.phone}
                    </div>
                  </div>
                  <div className="text-[11px] text-brand-400 inline-flex items-center gap-1 tabular">
                    <Clock size={10} /> {new Date(m.lastSeenAt).toLocaleDateString()}
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
