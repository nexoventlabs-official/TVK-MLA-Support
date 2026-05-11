import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Search,
  Phone,
  Clock,
  MessageCircle,
  ShieldCheck,
  IdCard,
  Inbox,
  Ticket,
} from 'lucide-react';
import api from '../api';

const FILTERS = [
  { id: 'registered', label: 'Registered' },
  { id: 'all', label: 'All Contacts' },
];

export default function Members() {
  const navigate = useNavigate();
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
                  <th className="px-6 py-4 text-left">Requests</th>
                  <th className="px-6 py-4 text-left">Last Seen</th>
                </tr>
              </thead>
              {/*
                Each row is a single click target: clicking ANY cell navigates
                to /members/:id. We keep semantics tidy by attaching `onClick`
                to the <tr> directly + a keyboard-friendly fallback (Enter /
                Space) so the whole row behaves like a link, not just the
                old chevron column.
              */}
              <tbody className="divide-y divide-gray-100/50">
                {members.map((m) => {
                  const display = m.name || m.profileName || '—';
                  const goToDetail = () => navigate(`/members/${m._id}`);
                  return (
                    <tr
                      key={m._id}
                      onClick={goToDetail}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                          e.preventDefault();
                          goToDetail();
                        }
                      }}
                      tabIndex={0}
                      role="button"
                      aria-label={`Open details for ${display}`}
                      className="cursor-pointer hover:bg-brand-50/40 focus:bg-brand-50/60 focus:outline-none align-middle transition-colors"
                    >
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-full bg-brand-100 text-brand-700 flex items-center justify-center font-medium shrink-0">
                            {display[0]?.toUpperCase()}
                          </div>
                          <div className="min-w-0">
                            <div className="font-medium text-brand-900 truncate">
                              {display}
                            </div>
                            {m.epicNo && (
                              <div className="text-xs text-gray-400 inline-flex items-center gap-1 font-mono">
                                <IdCard size={11} /> {m.epicNo}
                              </div>
                            )}
                          </div>
                        </div>
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
                      <td className="px-6 py-4 whitespace-nowrap">
                        {/*
                          Request count only — no per-issue chips here. Full
                          issue list (with photos, location, status) lives on
                          the member detail page.
                        */}
                        {m.requestCount ? (
                          <span className="inline-flex items-center gap-1.5 pill bg-brand-900 text-white ring-1 ring-brand-900 font-mono">
                            <Ticket size={12} /> {m.requestCount}
                          </span>
                        ) : (
                          <span className="text-xs text-gray-400 inline-flex items-center gap-1">
                            <Inbox size={12} /> 0
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4 text-gray-500 whitespace-nowrap">
                        <span className="inline-flex items-center gap-1">
                          <Clock size={14} /> {new Date(m.lastSeenAt).toLocaleString()}
                        </span>
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
