import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Search,
  Phone,
  IdCard,
  Calendar,
  ChevronRight,
  ShieldCheck,
} from 'lucide-react';
import api from '../api';

function fmtDate(d) {
  if (!d) return '—';
  const x = new Date(d);
  if (isNaN(x.getTime())) return '—';
  return x.toLocaleDateString();
}

export default function Voters() {
  const [voters, setVoters] = useState([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState('');

  const load = async () => {
    setLoading(true);
    try {
      const { data } = await api.get('/voters', { params: q ? { q } : {} });
      setVoters(data.voters || []);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const epicCount = voters.filter((v) => v.registrationType === 'epic').length;
  const manualCount = voters.filter((v) => v.registrationType === 'manual').length;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-brand-900">Voters</h1>
          <p className="text-sm text-gray-600">
            {voters.length} registered · {epicCount} via EPIC · {manualCount} manual
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
            placeholder="Search name / phone / EPIC / email…"
            className="input pl-9 w-80 max-w-full"
          />
        </form>
      </div>

      <div className="card overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-gray-500">Loading…</div>
        ) : voters.length === 0 ? (
          <div className="p-8 text-center text-gray-500">
            No registered voters yet. Voters appear here once they complete the registration flow.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-gray-600 text-xs uppercase">
                <tr>
                  <th className="px-4 py-3 text-left">Voter</th>
                  <th className="px-4 py-3 text-left">EPIC</th>
                  <th className="px-4 py-3 text-left">Phone</th>
                  <th className="px-4 py-3 text-left">Age / Gender</th>
                  <th className="px-4 py-3 text-left">Assembly</th>
                  <th className="px-4 py-3 text-left">Registered</th>
                  <th className="px-4 py-3"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {voters.map((v) => {
                  const display = v.name || v.profileName || '—';
                  const isEpic = v.registrationType === 'epic';
                  return (
                    <tr key={v._id} className="hover:bg-gray-50">
                      <td className="px-4 py-3">
                        <Link to={`/voters/${v._id}`} className="flex items-center gap-3 group">
                          <div className="w-9 h-9 rounded-full bg-brand-100 text-brand-700 flex items-center justify-center font-medium">
                            {display[0]?.toUpperCase()}
                          </div>
                          <div>
                            <div className="font-medium group-hover:text-brand-700">{display}</div>
                            <div className="text-xs text-gray-400 inline-flex items-center gap-1">
                              <ShieldCheck size={12} /> {isEpic ? 'EPIC verified' : 'Manual'}
                            </div>
                          </div>
                        </Link>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <span className="inline-flex items-center gap-1 text-gray-700 font-mono text-xs">
                          <IdCard size={14} /> {v.epicNo || '—'}
                        </span>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <span className="inline-flex items-center gap-1 text-gray-700">
                          <Phone size={14} /> {v.phone}
                        </span>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        {v.age != null ? `${v.age} yrs` : '—'}
                        {v.gender ? ` · ${v.gender}` : ''}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-gray-600">
                        {v.voterSnapshot?.assemblyName || '—'}
                        {v.voterSnapshot?.assemblyNo ? ` (${v.voterSnapshot.assemblyNo})` : ''}
                      </td>
                      <td className="px-4 py-3 text-gray-500 whitespace-nowrap">
                        <span className="inline-flex items-center gap-1">
                          <Calendar size={14} /> {fmtDate(v.registeredAt)}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <Link
                          to={`/voters/${v._id}`}
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
