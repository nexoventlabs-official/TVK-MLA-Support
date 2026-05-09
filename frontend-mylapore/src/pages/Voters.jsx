import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Search,
  Phone,
  IdCard,
  ChevronRight,
  ChevronLeft,
  ChevronsLeft,
  ChevronsRight,
  MapPin,
  Users as UsersIcon,
} from 'lucide-react';
import api from '../api';

const PAGE_SIZE = 50;

export default function Voters() {
  const [items, setItems] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [collections, setCollections] = useState([]);
  const [assembly, setAssembly] = useState('');
  const [q, setQ] = useState('');
  const [searched, setSearched] = useState('');

  const load = async (overrides = {}) => {
    setLoading(true);
    try {
      const params = {
        page: overrides.page ?? page,
        limit: PAGE_SIZE,
      };
      const search = overrides.q ?? searched;
      if (search) params.q = search;
      const asm = overrides.assembly ?? assembly;
      if (asm) params.assembly = asm;

      const { data } = await api.get('/voters', { params });
      setItems(data.items || []);
      setTotal(data.total || 0);
      if (data.collections) setCollections(data.collections);
    } catch (err) {
      console.error('voters load failed', err);
      setItems([]);
      setTotal(0);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const goto = (p) => {
    const next = Math.min(Math.max(1, p), totalPages);
    if (next === page) return;
    setPage(next);
    load({ page: next });
  };

  const submitSearch = (e) => {
    e.preventDefault();
    setSearched(q);
    setPage(1);
    load({ page: 1, q });
  };

  const onAssemblyChange = (val) => {
    setAssembly(val);
    setPage(1);
    load({ page: 1, assembly: val });
  };

  const fmtRange = () => {
    if (!total) return '0';
    const start = (page - 1) * PAGE_SIZE + 1;
    const end = Math.min(page * PAGE_SIZE, total);
    return `${start}–${end} of ${total.toLocaleString()}`;
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-brand-900">Voters</h1>
          <p className="text-sm text-gray-600">
            Showing {fmtRange()} from voter roll
            {assembly ? ` · ${assembly}` : collections.length > 1 ? ` · ${collections.length} assemblies` : ''}
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {collections.length > 1 && (
            <select
              value={assembly}
              onChange={(e) => onAssemblyChange(e.target.value)}
              className="input w-44"
            >
              <option value="">All assemblies</option>
              {collections.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          )}
          <form onSubmit={submitSearch} className="relative">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search name / EPIC / mobile / relation…"
              className="input pl-9 w-80 max-w-full"
            />
          </form>
        </div>
      </div>

      <div className="card overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-gray-500">Loading…</div>
        ) : items.length === 0 ? (
          <div className="p-8 text-center text-gray-500">
            No voters found{searched ? ` for "${searched}"` : ''}.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-gray-600 text-xs uppercase">
                <tr>
                  <th className="px-4 py-3 text-left">Voter</th>
                  <th className="px-4 py-3 text-left">EPIC</th>
                  <th className="px-4 py-3 text-left">Relation</th>
                  <th className="px-4 py-3 text-left">Gender</th>
                  <th className="px-4 py-3 text-left">House</th>
                  <th className="px-4 py-3 text-left">Mobile</th>
                  <th className="px-4 py-3 text-left">Assembly</th>
                  <th className="px-4 py-3"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {items.map((v) => {
                  const name = v.name || '—';
                  return (
                    <tr key={v._id} className="hover:bg-gray-50">
                      <td className="px-4 py-3">
                        <Link to={`/voters/${v._id}`} className="flex items-center gap-3 group">
                          <div className="w-9 h-9 rounded-full bg-brand-100 text-brand-700 flex items-center justify-center font-medium">
                            {name[0]?.toUpperCase()}
                          </div>
                          <div className="font-medium group-hover:text-brand-700">{name}</div>
                        </Link>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <span className="inline-flex items-center gap-1 text-gray-700 font-mono text-xs">
                          <IdCard size={14} /> {v.epicNo || '—'}
                        </span>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-gray-700">
                        {v.relationName ? (
                          <span>
                            <span className="text-gray-400">{v.relationType || ''}</span>{' '}
                            {v.relationName}
                          </span>
                        ) : (
                          '—'
                        )}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-gray-700">
                        {v.gender || '—'}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-gray-700">
                        {v.houseNo || '—'}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-gray-700">
                        {v.mobile ? (
                          <span className="inline-flex items-center gap-1">
                            <Phone size={14} /> {v.mobile}
                          </span>
                        ) : (
                          '—'
                        )}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-gray-600">
                        <span className="inline-flex items-center gap-1">
                          <MapPin size={14} />
                          {v.assemblyName || v.sourceCollection || '—'}
                          {v.assemblyNo ? ` (${v.assemblyNo})` : ''}
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

        {total > 0 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-gray-100 bg-gray-50">
            <div className="text-xs text-gray-500 inline-flex items-center gap-1">
              <UsersIcon size={14} /> {fmtRange()}
            </div>
            <div className="flex items-center gap-1">
              <button
                onClick={() => goto(1)}
                disabled={page <= 1}
                className="p-1.5 rounded-md text-gray-600 hover:bg-white disabled:opacity-30 disabled:hover:bg-transparent"
              >
                <ChevronsLeft size={16} />
              </button>
              <button
                onClick={() => goto(page - 1)}
                disabled={page <= 1}
                className="p-1.5 rounded-md text-gray-600 hover:bg-white disabled:opacity-30 disabled:hover:bg-transparent"
              >
                <ChevronLeft size={16} />
              </button>
              <span className="px-3 text-xs text-gray-700">
                Page <strong>{page}</strong> / {totalPages}
              </span>
              <button
                onClick={() => goto(page + 1)}
                disabled={page >= totalPages}
                className="p-1.5 rounded-md text-gray-600 hover:bg-white disabled:opacity-30 disabled:hover:bg-transparent"
              >
                <ChevronRight size={16} />
              </button>
              <button
                onClick={() => goto(totalPages)}
                disabled={page >= totalPages}
                className="p-1.5 rounded-md text-gray-600 hover:bg-white disabled:opacity-30 disabled:hover:bg-transparent"
              >
                <ChevronsRight size={16} />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
