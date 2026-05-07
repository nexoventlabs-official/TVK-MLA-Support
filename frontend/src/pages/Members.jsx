import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Search, Phone, Clock, MessageCircle, ChevronRight, ShieldCheck } from 'lucide-react';
import api from '../api';

export default function Members() {
  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState('');

  const load = async () => {
    setLoading(true);
    try {
      const { data } = await api.get('/members', { params: q ? { q } : {} });
      setMembers(data.members);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-brand-900">Members</h1>
          <p className="text-sm text-gray-600">
            {members.length} contacts · {members.filter((m) => m.isRegistered).length} registered
          </p>
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
            placeholder="Search name / phone / profile…"
            className="input pl-9 w-72 max-w-full"
          />
        </form>
      </div>

      <div className="card overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-gray-500">Loading…</div>
        ) : members.length === 0 ? (
          <div className="p-8 text-center text-gray-500">No members yet. As soon as someone messages the bot they will appear here.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-gray-600 text-xs uppercase">
                <tr>
                  <th className="px-4 py-3 text-left">Name</th>
                  <th className="px-4 py-3 text-left">WhatsApp</th>
                  <th className="px-4 py-3 text-left">Status</th>
                  <th className="px-4 py-3 text-left">Age</th>
                  <th className="px-4 py-3 text-left">Requests</th>
                  <th className="px-4 py-3 text-left">Messages</th>
                  <th className="px-4 py-3 text-left">Last Seen</th>
                  <th className="px-4 py-3"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {members.map((m) => {
                  const display = m.name || m.profileName || '—';
                  return (
                    <tr key={m._id} className="hover:bg-gray-50">
                      <td className="px-4 py-3">
                        <Link to={`/members/${m._id}`} className="flex items-center gap-3 group">
                          <div className="w-9 h-9 rounded-full bg-brand-100 text-brand-700 flex items-center justify-center font-medium">
                            {display[0]?.toUpperCase()}
                          </div>
                          <div>
                            <div className="font-medium group-hover:text-brand-700">{display}</div>
                            {m.profileName && m.name && m.name !== m.profileName && (
                              <div className="text-xs text-gray-400">WhatsApp: {m.profileName}</div>
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
                        <span className="pill bg-brand-50 text-brand-700">{m.requestCount || 0}</span>
                      </td>
                      <td className="px-4 py-3">{m.messageCount}</td>
                      <td className="px-4 py-3 text-gray-500 whitespace-nowrap">
                        <span className="inline-flex items-center gap-1">
                          <Clock size={14} /> {new Date(m.lastSeenAt).toLocaleString()}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <Link to={`/members/${m._id}`} className="text-brand-700 hover:bg-brand-50 p-2 rounded-md inline-flex">
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
