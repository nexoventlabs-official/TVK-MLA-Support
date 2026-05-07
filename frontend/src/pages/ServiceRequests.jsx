import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Phone, Trash2, Filter, MapPin, Calendar } from 'lucide-react';
import api from '../api';

const STATUSES = ['new', 'in_progress', 'resolved', 'rejected'];
const STATUS_COLORS = {
  new: 'bg-amber-100 text-amber-700',
  in_progress: 'bg-blue-100 text-blue-700',
  resolved: 'bg-green-100 text-green-700',
  rejected: 'bg-gray-200 text-gray-700',
};

export default function ServiceRequests() {
  const [params, setParams] = useSearchParams();
  const [items, setItems] = useState([]);
  const [services, setServices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState(params.get('status') || '');
  const [serviceFilter, setServiceFilter] = useState(params.get('serviceId') || '');
  const [q, setQ] = useState('');

  const load = async () => {
    setLoading(true);
    try {
      const { data } = await api.get('/service-requests', {
        params: {
          ...(statusFilter ? { status: statusFilter } : {}),
          ...(serviceFilter ? { serviceId: serviceFilter } : {}),
          ...(q ? { q } : {}),
        },
      });
      setItems(data.requests);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    api.get('/service-requests/catalog').then((r) => setServices(r.data.services || []));
  }, []);

  useEffect(() => {
    load();
    // sync URL
    const next = new URLSearchParams();
    if (statusFilter) next.set('status', statusFilter);
    if (serviceFilter) next.set('serviceId', serviceFilter);
    setParams(next, { replace: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [statusFilter, serviceFilter]);

  const updateStatus = async (id, status) => {
    await api.patch(`/service-requests/${id}`, { status });
    load();
  };

  const updateNotes = async (id, notes) => {
    await api.patch(`/service-requests/${id}`, { notes });
  };

  const remove = async (id) => {
    if (!confirm('Delete this request?')) return;
    await api.delete(`/service-requests/${id}`);
    load();
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-brand-900">Service Requests</h1>
          <p className="text-sm text-gray-600">{items.length} {statusFilter || 'total'} grievances submitted via WhatsApp.</p>
        </div>
        <form
          className="flex items-center gap-2 flex-wrap"
          onSubmit={(e) => {
            e.preventDefault();
            load();
          }}
        >
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search name / phone / description"
            className="input !py-1.5 w-64"
          />
          <button type="submit" className="btn-secondary !py-1.5 !text-xs">Search</button>
          <Filter size={16} className="text-gray-400 ml-2" />
          <select className="input !py-1.5 !w-auto" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
            <option value="">All status</option>
            {STATUSES.map((s) => <option key={s} value={s}>{s.replace('_', ' ')}</option>)}
          </select>
          <select className="input !py-1.5 !w-auto" value={serviceFilter} onChange={(e) => setServiceFilter(e.target.value)}>
            <option value="">All services</option>
            {services.map((s) => <option key={s.id} value={s.id}>{s.title}</option>)}
          </select>
        </form>
      </div>

      {loading ? (
        <div className="card p-8 text-center text-gray-500">Loading…</div>
      ) : items.length === 0 ? (
        <div className="card p-10 text-center text-gray-500">No requests.</div>
      ) : (
        <div className="space-y-3">
          {items.map((r) => (
            <div key={r._id} className="card p-4">
              <div className="flex items-start justify-between flex-wrap gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <div className="font-semibold text-brand-900">{r.optionTitle}</div>
                    <span className="pill bg-brand-50 text-brand-700">{r.serviceTitle}</span>
                    <span className={`pill ${STATUS_COLORS[r.status]}`}>{r.status.replace('_', ' ')}</span>
                  </div>
                  <div className="text-xs text-gray-500 mt-1 flex items-center flex-wrap gap-3">
                    <span className="inline-flex items-center gap-1"><Phone size={12} /> {r.phone}</span>
                    {r.name && <span>by {r.name}</span>}
                    {r.location && <span className="inline-flex items-center gap-1"><MapPin size={12} /> {r.location}</span>}
                    <span className="inline-flex items-center gap-1"><Calendar size={12} /> {new Date(r.createdAt).toLocaleString()}</span>
                  </div>
                  <p className="text-sm text-gray-700 mt-2 whitespace-pre-wrap">{r.description}</p>
                </div>
                <div className="flex items-center gap-2">
                  <select
                    className="input !py-1.5 !w-auto"
                    value={r.status}
                    onChange={(ev) => updateStatus(r._id, ev.target.value)}
                  >
                    {STATUSES.map((s) => <option key={s} value={s}>{s.replace('_', ' ')}</option>)}
                  </select>
                  <button onClick={() => remove(r._id)} className="text-red-600 hover:bg-red-50 p-2 rounded-md">
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
              <textarea
                rows={2}
                placeholder="Internal notes…"
                defaultValue={r.notes || ''}
                onBlur={(ev) => updateNotes(r._id, ev.target.value)}
                className="input mt-3 text-sm"
              />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
