import { useEffect, useRef, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  Phone,
  Filter,
  MapPin,
  Calendar,
  Ticket,
  Image as ImageIcon,
  ChevronRight,
} from 'lucide-react';
import api from '../api';

/**
 * Status taxonomy must match the backend enum on `ServiceRequest`. Kept in
 * lockstep with `MemberDetail.jsx` so the same pill colour appears wherever
 * a request status is rendered.
 */
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
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();
  const [items, setItems] = useState([]);
  const [services, setServices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState(params.get('status') || '');
  const [serviceFilter, setServiceFilter] = useState(params.get('serviceId') || '');
  const [q, setQ] = useState('');

  // Snapshot of the current filters / search so the polling closure always
  // reads the freshest values without us tearing the timer down on every
  // keystroke.
  const queryRef = useRef({ statusFilter: '', serviceFilter: '', q: '' });
  useEffect(() => {
    queryRef.current = { statusFilter, serviceFilter, q };
  }, [statusFilter, serviceFilter, q]);

  /**
   * Loader. `silent: true` skips the loading skeleton — used by the 20 s
   * polling tick so the list refreshes in-place with no flicker.
   */
  const load = async ({ silent = false } = {}) => {
    if (!silent) setLoading(true);
    try {
      const cur = queryRef.current;
      const { data } = await api.get('/service-requests', {
        params: {
          ...(cur.statusFilter ? { status: cur.statusFilter } : {}),
          ...(cur.serviceFilter ? { serviceId: cur.serviceFilter } : {}),
          ...(cur.q ? { q: cur.q } : {}),
        },
      });
      setItems(data.requests || []);
    } catch (_err) {
      // ignore polling errors — keep the last good snapshot on screen
    } finally {
      if (!silent) setLoading(false);
    }
  };

  // Catalog only needs to load once for the service filter dropdown.
  useEffect(() => {
    api.get('/service-requests/catalog').then((r) => setServices(r.data.services || []));
  }, []);

  // Refetch whenever the user changes a filter; also keep URL params in sync
  // so the page is shareable / refresh-safe.
  useEffect(() => {
    load();
    const next = new URLSearchParams();
    if (statusFilter) next.set('status', statusFilter);
    if (serviceFilter) next.set('serviceId', serviceFilter);
    setParams(next, { replace: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [statusFilter, serviceFilter]);

  // Background poller — refreshes the list every 20 s without disturbing
  // the operator (no skeleton flash, no scroll jump).
  useEffect(() => {
    const t = setInterval(() => load({ silent: true }), 20_000);
    return () => clearInterval(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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
        <div className="space-y-2">
          {items.map((r) => (
            <RequestRow
              key={r._id}
              r={r}
              onClick={() => navigate(`/service-requests/${r._id}`)}
            />
          ))}
        </div>
      )}
    </div>
  );
}

/**
 * Compact summary row for a ServiceRequest. Whole card is clickable —
 * mirrors the Members list pattern. Status edits, photos, notes, geo and
 * description live on the detail page (`/service-requests/:id`), so this
 * row deliberately avoids any nested interactive controls that would steal
 * the click.
 */
function RequestRow({ r, onClick }) {
  const photoCount = Array.isArray(r.mediaUrls) ? r.mediaUrls.length : 0;
  const hasGeo = !!(r.geo?.latitude && r.geo?.longitude);

  return (
    <div
      onClick={onClick}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onClick();
        }
      }}
      tabIndex={0}
      role="button"
      aria-label={`Open ticket ${r.ticketId || r.optionTitle}`}
      className="card-hover p-4 cursor-pointer flex items-center gap-4 group"
    >
      <div className="flex-1 min-w-0">
        {/* Title row — ticket id + option + service + status pill */}
        <div className="flex items-center gap-2 flex-wrap">
          {r.ticketId && (
            <span className="pill bg-brand-900 text-white font-mono ring-1 ring-brand-900">
              <Ticket size={11} /> {r.ticketId}
            </span>
          )}
          <span className="font-semibold text-brand-900 text-[14px] truncate">
            {r.optionTitle}
          </span>
          <span className="pill bg-brand-50 text-brand-700 ring-1 ring-brand-200">
            {r.serviceTitle}
          </span>
          <span className={`pill ${STATUS_COLORS[r.status] || STATUS_COLORS.rejected}`}>
            {STATUS_LABELS[r.status] || r.status}
          </span>
        </div>

        {/* Meta row — phone, name, location, date, attachments */}
        <div className="text-xs text-gray-500 mt-1.5 flex items-center flex-wrap gap-x-3 gap-y-1">
          <span className="inline-flex items-center gap-1">
            <Phone size={12} /> {r.phone}
          </span>
          {r.name && <span>by {r.name}</span>}
          {(r.location || hasGeo) && (
            <span className="inline-flex items-center gap-1">
              <MapPin size={12} />
              {r.location || (hasGeo ? 'Geo location attached' : '')}
            </span>
          )}
          {photoCount > 0 && (
            <span className="inline-flex items-center gap-1 text-brand-700">
              <ImageIcon size={12} /> {photoCount} photo{photoCount > 1 ? 's' : ''}
            </span>
          )}
          <span className="inline-flex items-center gap-1 ml-auto">
            <Calendar size={12} /> {new Date(r.createdAt).toLocaleString()}
          </span>
        </div>
      </div>

      <ChevronRight
        size={18}
        className="text-brand-300 group-hover:text-brand-700 shrink-0 transition-colors"
      />
    </div>
  );
}
