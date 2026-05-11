import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Search,
  Phone,
  Clock,
  MessageCircle,
  ChevronRight,
  ShieldCheck,
  IdCard,
  Inbox,
} from 'lucide-react';
import api from '../api';

const STATUS_COLORS = {
  new: 'bg-amber-50 text-amber-700 ring-1 ring-amber-200/60',
  in_progress: 'bg-blue-50 text-blue-700 ring-1 ring-blue-200/60',
  resolved: 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200/60',
  rejected: 'bg-brand-100 text-brand-600 ring-1 ring-brand-200',
};

const FILTERS = [
  { id: 'registered', label: 'Registered' },
  { id: 'all', label: 'All Contacts' },
];

export default function Members() {
  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState('');
  const [filter, setFilter] = useState('registered');

  // Keep the current search / filter in a ref so the setInterval closure
  // always reads the freshest values without us having to tear down and
  // recreate the timer every time the user types or toggles a chip.
  const queryRef = useRef({ q: '', filter: 'registered' });
  useEffect(() => { queryRef.current = { q, filter }; }, [q, filter]);

  /**
   * Fetch members. `silent: true` skips the loading skeleton — used by the
   * background poller so the table doesn't flash to "Loading…" every 20 s.
   * `overrides` lets the search form / chip switcher request a one-off
   * fetch with values that haven't yet committed to state.
   */
  const load = async ({ silent = false, overrides = {} } = {}) => {
    if (!silent) setLoading(true);
    try {
      const cur = queryRef.current;
      const params = {};
      const search = overrides.q ?? cur.q;
      if (search) params.q = search;
      const f = overrides.filter ?? cur.filter;
      if (f === 'registered') params.registered = '1';
      const { data } = await api.get('/members', { params });
      setMembers(data.members || []);
    } catch (_err) {
      // ignore polling errors — UI keeps showing the last good snapshot
    } finally {
      if (!silent) setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // Live refresh every 20 s. Silent, no skeleton flash, no scroll jump.
    const t = setInterval(() => load({ silent: true }), 20_000);
    return () => clearInterval(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const switchFilter = (f) => {
    if (f === filter) return;
    setFilter(f);
    load({ overrides: { filter: f } });
  };

  const totalIssues = members.reduce((sum, m) => sum + (m.requestCount || 0), 0);

  return (
    <div className="space-y-6">
      <div className="page-header">
        <div>
          <div className="text-[10px] font-semibold tracking-[0.22em] uppercase text-brand-400 mb-2">
            Operations
          </div>
          <h1 className="page-title">Members</h1>
          <p className="page-subtitle tabular">
            {members.length} {filter === 'registered' ? 'registered' : 'contacts'} ·{' '}
            {totalIssues} issue{totalIssues === 1 ? '' : 's'} raised
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <div className="inline-flex bg-brand-100 rounded-md p-0.5 border border-brand-200/70">
            {FILTERS.map((f) => (
              <button
                key={f.id}
                onClick={() => switchFilter(f.id)}
                className={`px-3 py-1.5 text-xs rounded font-semibold tracking-wide transition ${
                  filter === f.id
                    ? 'bg-white text-brand-900 shadow-sheet'
                    : 'text-brand-500 hover:text-brand-900'
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              load();
            }}
            className="relative"
          >
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search name / phone / EPIC / email…"
              className="input pl-9 w-72 max-w-full"
            />
          </form>
        </div>
      </div>

      <div className="card overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-brand-400 font-medium">Loading members…</div>
        ) : members.length === 0 ? (
          <div className="p-12 text-center text-brand-400 font-medium">
            {filter === 'registered'
              ? 'No registered members yet. Members who complete the WhatsApp registration flow will appear here.'
              : 'No contacts yet. As soon as someone messages the bot they will appear here.'}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50/50 border-b border-gray-100 text-gray-500 text-xs font-bold uppercase tracking-wider">
                <tr>
                  <th className="px-6 py-4 text-left">Name</th>
                  <th className="px-6 py-4 text-left">WhatsApp</th>
                  <th className="px-6 py-4 text-left">Status</th>
                  <th className="px-6 py-4 text-left">Age</th>
                  <th className="px-6 py-4 text-left">Issues Raised</th>
                  <th className="px-6 py-4 text-left">Last Seen</th>
                  <th className="px-6 py-4"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100/50">
                {members.map((m) => {
                  const display = m.name || m.profileName || '—';
                  return (
                    <tr key={m._id} className="hover:bg-gray-50/50 align-top transition-colors">
                      <td className="px-6 py-4">
                        <Link to={`/members/${m._id}`} className="flex items-center gap-3 group">
                          <div className="w-9 h-9 rounded-full bg-brand-100 text-brand-700 flex items-center justify-center font-medium shrink-0">
                            {display[0]?.toUpperCase()}
                          </div>
                          <div className="min-w-0">
                            <div className="font-medium group-hover:text-brand-700 truncate">
                              {display}
                            </div>
                            {m.epicNo && (
                              <div className="text-xs text-gray-400 inline-flex items-center gap-1 font-mono">
                                <IdCard size={11} /> {m.epicNo}
                              </div>
                            )}
                          </div>
                        </Link>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="inline-flex items-center gap-1 text-gray-700">
                          <Phone size={14} /> {m.phone}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {m.isRegistered ? (
                          <span
                            className={`pill inline-flex items-center gap-1 ${
                              m.registrationType === 'epic'
                                ? 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200/60'
                                : 'bg-amber-50 text-amber-700 ring-1 ring-amber-200/60'
                            }`}
                          >
                            <ShieldCheck size={12} />{' '}
                            {m.registrationType === 'epic' ? 'EPIC' : 'Manual'}
                          </span>
                        ) : (
                          <span className="pill bg-brand-100 text-brand-500 ring-1 ring-brand-200 inline-flex items-center gap-1">
                            <MessageCircle size={12} /> Guest
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-gray-700 font-medium">
                        {m.age != null ? `${m.age} yrs` : '—'}
                      </td>
                      <td className="px-6 py-4">
                        {m.requestCount ? (
                          <div className="space-y-1.5 max-w-md">
                            <div className="text-xs text-gray-500">
                              <strong className="text-brand-700">{m.requestCount}</strong> total
                            </div>
                            <div className="flex flex-wrap gap-1">
                              {(m.recentIssues || []).map((it) => (
                                <span
                                  key={it._id}
                                  className={`pill text-[11px] ${
                                    STATUS_COLORS[it.status] || 'bg-gray-100 text-gray-700'
                                  }`}
                                  title={`${it.serviceTitle} · ${new Date(
                                    it.createdAt
                                  ).toLocaleString()}`}
                                >
                                  {it.optionTitle}
                                </span>
                              ))}
                              {m.requestCount > (m.recentIssues || []).length && (
                                <Link
                                  to={`/members/${m._id}`}
                                  className="pill text-[11px] bg-brand-50 text-brand-700 ring-1 ring-brand-200 hover:bg-brand-100"
                                >
                                  +{m.requestCount - m.recentIssues.length} more
                                </Link>
                              )}
                            </div>
                          </div>
                        ) : (
                          <span className="text-xs text-gray-400 inline-flex items-center gap-1">
                            <Inbox size={12} /> No issues
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4 text-gray-500 whitespace-nowrap">
                        <span className="inline-flex items-center gap-1">
                          <Clock size={14} /> {new Date(m.lastSeenAt).toLocaleString()}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <Link
                          to={`/members/${m._id}`}
                          className="text-brand-700 hover:bg-brand-50 p-2 rounded-md inline-flex"
                        >
                          <ChevronRight size={16} />
                        </Link>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
