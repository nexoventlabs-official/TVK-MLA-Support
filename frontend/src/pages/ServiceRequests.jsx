import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Phone, Trash2, Filter, MapPin, Calendar, Ticket, ExternalLink, Image as ImageIcon, X } from 'lucide-react';
import api from '../api';

const STATUSES = ['pending', 'accepted', 'processing', 'completed', 'rejected'];
const STATUS_LABELS = {
  pending: 'Pending',
  accepted: 'Accepted',
  processing: 'Processing',
  completed: 'Completed',
  rejected: 'Rejected',
};
const STATUS_COLORS = {
  pending: 'bg-amber-50 text-amber-700 ring-1 ring-amber-200/60',
  accepted: 'bg-sky-50 text-sky-700 ring-1 ring-sky-200/60',
  processing: 'bg-blue-50 text-blue-700 ring-1 ring-blue-200/60',
  completed: 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200/60',
  rejected: 'bg-brand-100 text-brand-600 ring-1 ring-brand-200',
};

export default function ServiceRequests() {
  const [params, setParams] = useSearchParams();
  const [items, setItems] = useState([]);
  const [services, setServices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState(params.get('status') || '');
  const [serviceFilter, setServiceFilter] = useState(params.get('serviceId') || '');
  const [q, setQ] = useState('');
  const [lightbox, setLightbox] = useState(null); // url string

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
    <div className="space-y-6">
      <div className="page-header">
        <div>
          <div className="text-[10px] font-semibold tracking-[0.22em] uppercase text-brand-400 mb-2">
            Operations
          </div>
          <h1 className="page-title">Service Requests</h1>
          <p className="page-subtitle tabular">
            {items.length} {STATUS_LABELS[statusFilter] || 'total'} grievances submitted via WhatsApp.
          </p>
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
            placeholder="Search ticket / phone / description"
            className="input w-64"
          />
          <button type="submit" className="btn-secondary">
            Search
          </button>
          <span className="inline-flex items-center gap-1 ml-2 text-brand-400">
            <Filter size={14} />
          </span>
          <select
            className="input !w-auto"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
          >
            <option value="">All status</option>
            {STATUSES.map((s) => (
              <option key={s} value={s}>
                {STATUS_LABELS[s]}
              </option>
            ))}
          </select>
          <select
            className="input !w-auto"
            value={serviceFilter}
            onChange={(e) => setServiceFilter(e.target.value)}
          >
            <option value="">All services</option>
            {services.map((s) => (
              <option key={s.id} value={s.id}>
                {s.title}
              </option>
            ))}
          </select>
        </form>
      </div>

      {loading ? (
        <div className="card p-10 text-center text-brand-400">Loading…</div>
      ) : items.length === 0 ? (
        <div className="card p-12 text-center text-brand-400">No requests.</div>
      ) : (
        <div className="space-y-3">
          {items.map((r) => {
            const mapUrl = r.geo?.latitude && r.geo?.longitude
              ? `https://www.google.com/maps?q=${r.geo.latitude},${r.geo.longitude}`
              : null;
            return (
              <div key={r._id} className="card-hover p-5">
                <div className="flex items-start justify-between flex-wrap gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      {r.ticketId && (
                        <span className="pill bg-brand-900 text-white font-mono ring-1 ring-brand-900">
                          <Ticket size={11} /> {r.ticketId}
                        </span>
                      )}
                      <div className="font-semibold text-brand-900 text-[14px]">{r.optionTitle}</div>
                      <span className="pill bg-brand-50 text-brand-700 ring-1 ring-brand-200">{r.serviceTitle}</span>
                      <span className={`pill ${STATUS_COLORS[r.status] || STATUS_COLORS.rejected}`}>
                        {STATUS_LABELS[r.status] || r.status}
                      </span>
                    </div>
                    <div className="text-xs text-gray-500 mt-1 flex items-center flex-wrap gap-3">
                      <span className="inline-flex items-center gap-1">
                        <Phone size={12} /> {r.phone}
                      </span>
                      {r.name && <span>by {r.name}</span>}
                      {r.location && (
                        <span className="inline-flex items-center gap-1">
                          <MapPin size={12} /> {r.location}
                        </span>
                      )}
                      {mapUrl && (
                        <a
                          href={mapUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-1 text-brand-700 hover:underline"
                        >
                          <MapPin size={12} /> View on Map <ExternalLink size={10} />
                        </a>
                      )}
                      <span className="inline-flex items-center gap-1">
                        <Calendar size={12} /> {new Date(r.createdAt).toLocaleString()}
                      </span>
                    </div>
                    {r.schoolName && (
                      <div className="text-xs text-gray-600 mt-1">
                        <span className="font-medium">School:</span> {r.schoolName}
                      </div>
                    )}
                    {r.description && (
                      <p className="text-sm text-gray-700 mt-2 whitespace-pre-wrap">{r.description}</p>
                    )}
                    {Array.isArray(r.mediaUrls) && r.mediaUrls.length > 0 && (
                      <div className="mt-3 flex gap-2 flex-wrap">
                        {r.mediaUrls.map((u, i) => (
                          <button
                            key={u + i}
                            type="button"
                            onClick={() => setLightbox(u)}
                            className="relative w-20 h-20 rounded-md overflow-hidden border border-gray-200 hover:ring-2 hover:ring-brand-400"
                          >
                            <img src={u} alt={`photo ${i + 1}`} className="w-full h-full object-cover" />
                          </button>
                        ))}
                        <div className="inline-flex items-center gap-1 text-xs text-gray-500">
                          <ImageIcon size={12} /> {r.mediaUrls.length} photo{r.mediaUrls.length > 1 ? 's' : ''}
                        </div>
                      </div>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <select
                      className="input !w-auto !py-1.5"
                      value={r.status}
                      onChange={(ev) => updateStatus(r._id, ev.target.value)}
                    >
                      {STATUSES.map((s) => (
                        <option key={s} value={s}>
                          {STATUS_LABELS[s]}
                        </option>
                      ))}
                    </select>
                    <button
                      onClick={() => remove(r._id)}
                      className="p-2 rounded-md text-brand-400 hover:text-red-700 hover:bg-red-50 transition-colors"
                      title="Delete"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
                <div className="mt-4 pt-4 border-t border-brand-100">
                  <textarea
                    rows={2}
                    placeholder="Add internal notes here…"
                    defaultValue={r.notes || ''}
                    onBlur={(ev) => updateNotes(r._id, ev.target.value)}
                    className="input w-full text-sm bg-brand-50/60 hover:bg-white focus:bg-white"
                  />
                </div>
              </div>
            );
          })}
        </div>
      )}

      {lightbox && (
        <div
          onClick={() => setLightbox(null)}
          className="fixed inset-0 bg-black/80 z-40 flex items-center justify-center p-4"
        >
          <button
            onClick={() => setLightbox(null)}
            className="absolute top-4 right-4 text-white bg-black/40 rounded-full p-2"
          >
            <X size={20} />
          </button>
          <img src={lightbox} alt="photo" className="max-h-[90vh] max-w-[90vw] rounded-lg shadow-2xl" />
        </div>
      )}
    </div>
  );
}
