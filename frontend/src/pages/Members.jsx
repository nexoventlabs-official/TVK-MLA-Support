import { useEffect, useState } from 'react';
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
  new: 'bg-amber-100 text-amber-700',
  in_progress: 'bg-blue-100 text-blue-700',
  resolved: 'bg-green-100 text-green-700',
  rejected: 'bg-gray-200 text-gray-700',
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

  const load = async (overrides = {}) => {
    setLoading(true);
    try {
      const params = {};
      const search = overrides.q ?? q;
      if (search) params.q = search;
      const f = overrides.filter ?? filter;
      if (f === 'registered') params.registered = '1';
      const { data } = await api.get('/members', { params });
      setMembers(data.members || []);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const switchFilter = (f) => {
    if (f === filter) return;
    setFilter(f);
    load({ filter: f });
  };

  const totalIssues = members.reduce((sum, m) => sum + (m.requestCount || 0), 0);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-brand-900">Members</h1>
          <p className="text-sm text-gray-600">
            {members.length} {filter === 'registered' ? 'registered' : 'contacts'} ·{' '}
            {totalIssues} issue{totalIssues === 1 ? '' : 's'} raised
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <div className="inline-flex bg-gray-100 rounded-lg p-1">
            {FILTERS.map((f) => (
              <button
                key={f.id}
                onClick={() => switchFilter(f.id)}
                className={`px-3 py-1.5 text-xs rounded-md font-medium transition ${
                  filter === f.id
                    ? 'bg-white text-brand-700 shadow-sm'
                    : 'text-gray-600 hover:text-gray-900'
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
          <div className="p-8 text-center text-gray-500">Loading…</div>
        ) : members.length === 0 ? (
          <div className="p-8 text-center text-gray-500">
            {filter === 'registered'
              ? 'No registered members yet. Members who complete the WhatsApp registration flow will appear here.'
              : 'No contacts yet. As soon as someone messages the bot they will appear here.'}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-gray-600 text-xs uppercase">
                <tr>
                  <th className="px-4 py-3 text-left">Name</th>
                  <th className="px-4 py-3 text-left">WhatsApp</th>
                  <th className="px-4 py-3 text-left">Status</th>
                  <th className="px-4 py-3 text-left">Age</th>
                  <th className="px-4 py-3 text-left">Issues Raised</th>
                  <th className="px-4 py-3 text-left">Last Seen</th>
                  <th className="px-4 py-3"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {members.map((m) => {
                  const display = m.name || m.profileName || '—';
                  return (
                    <tr key={m._id} className="hover:bg-gray-50 align-top">
                      <td className="px-4 py-3">
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
                      <td className="px-4 py-3 whitespace-nowrap">
                        <span className="inline-flex items-center gap-1 text-gray-700">
                          <Phone size={14} /> {m.phone}
                        </span>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        {m.isRegistered ? (
                          <span
                            className={`pill inline-flex items-center gap-1 ${
                              m.registrationType === 'epic'
                                ? 'bg-green-100 text-green-700'
                                : 'bg-amber-100 text-amber-700'
                            }`}
                          >
                            <ShieldCheck size={12} />{' '}
                            {m.registrationType === 'epic' ? 'EPIC' : 'Manual'}
                          </span>
                        ) : (
                          <span className="pill bg-gray-100 text-gray-500 inline-flex items-center gap-1">
                            <MessageCircle size={12} /> Guest
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-gray-700">
                        {m.age != null ? `${m.age} yrs` : '—'}
                      </td>
                      <td className="px-4 py-3">
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
                                  className="pill text-[11px] bg-brand-50 text-brand-700 hover:bg-brand-100"
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
                      <td className="px-4 py-3 text-gray-500 whitespace-nowrap">
                        <span className="inline-flex items-center gap-1">
                          <Clock size={14} /> {new Date(m.lastSeenAt).toLocaleString()}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right">
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
