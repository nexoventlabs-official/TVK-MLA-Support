import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import {
  ArrowLeft,
  Phone,
  MessageCircle,
  Calendar,
  MapPin,
  ShieldCheck,
  IdCard,
  Ticket,
  Image as ImageIcon,
  ExternalLink,
  X,
  Inbox,
} from 'lucide-react';
import api from '../api';

/**
 * Status taxonomy must match the ServiceRequest model on the backend
 * (`pending|accepted|processing|completed|rejected`). Keep these arrays in
 * sync with `ServiceRequests.jsx` so the same look applies wherever a
 * request card is rendered.
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

export default function MemberDetail() {
  const { id } = useParams();
  const [data, setData] = useState({ member: null, requests: [] });
  const [loading, setLoading] = useState(true);
  const [lightbox, setLightbox] = useState(null); // active image URL

  // Loader extracted so PATCH operations (status / notes) can refetch the
  // page after a mutation without us reaching for a second copy of the URL.
  const load = async () => {
    try {
      const r = await api.get(`/members/${id}`);
      setData(r.data);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    setLoading(true);
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const updateStatus = async (rid, status) => {
    await api.patch(`/service-requests/${rid}`, { status });
    await load();
  };

  // Notes save on blur — the input keeps its own state until the user tabs
  // out, then we flush. Saves a network round-trip for every keystroke.
  const updateNotes = async (rid, notes) => {
    await api.patch(`/service-requests/${rid}`, { notes });
  };

  if (loading) {
    return <div className="card p-8 text-center text-gray-500">Loading…</div>;
  }
  if (!data.member) {
    return <div className="card p-8 text-center text-gray-500">Member not found.</div>;
  }

  const m = data.member;
  const display = m.name || m.profileName || '—';
  const requests = data.requests || [];

  return (
    <div className="space-y-6">
      <Link
        to="/members"
        className="inline-flex items-center gap-1.5 text-[12px] font-semibold tracking-wide uppercase text-brand-500 hover:text-brand-900 transition"
      >
        <ArrowLeft size={13} /> Back to members
      </Link>

      {/* ─── Profile card ──────────────────────────────────────────── */}
      <div className="card p-6">
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 rounded-full bg-brand-100 text-brand-700 flex items-center justify-center text-2xl font-medium shrink-0">
            {display[0]?.toUpperCase()}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-2xl font-bold text-brand-900">{display}</h1>
              {m.isRegistered ? (
                m.registrationType === 'epic' && m.epicNo ? (
                  <Link
                    to={`/voters/${m.epicNo}`}
                    className="pill inline-flex items-center gap-1 bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200/60 hover:bg-emerald-100"
                  >
                    <ShieldCheck size={12} /> EPIC Verified
                  </Link>
                ) : (
                  <span className="pill inline-flex items-center gap-1 bg-amber-50 text-amber-700 ring-1 ring-amber-200/60">
                    <ShieldCheck size={12} /> Manual
                  </span>
                )
              ) : (
                <span className="pill bg-brand-100 text-brand-500 ring-1 ring-brand-200">
                  Not registered
                </span>
              )}
            </div>
            <div className="text-sm text-gray-600 flex flex-wrap gap-x-4 gap-y-1 mt-1">
              <span className="inline-flex items-center gap-1">
                <Phone size={14} /> {m.phone}
              </span>
              {m.profileName && (
                <span className="text-gray-400">WhatsApp profile: {m.profileName}</span>
              )}
              {m.email && <span>{m.email}</span>}
              {m.epicNo && (
                <span className="inline-flex items-center gap-1 font-mono text-xs">
                  <IdCard size={14} /> {m.epicNo}
                </span>
              )}
              {m.age != null && (
                <span>
                  Age: <strong>{m.age}</strong>
                </span>
              )}
              {m.gender && <span>{m.gender}</span>}
            </div>
            <div className="text-xs text-gray-500 mt-2 flex flex-wrap gap-x-4">
              <span>First seen: {new Date(m.firstSeenAt).toLocaleString()}</span>
              <span>Last seen: {new Date(m.lastSeenAt).toLocaleString()}</span>
              {m.registeredAt && (
                <span>Registered: {new Date(m.registeredAt).toLocaleString()}</span>
              )}
              <span>
                Messages: <strong>{m.messageCount || 0}</strong>
              </span>
              <span>
                Requests: <strong>{m.requestCount ?? requests.length}</strong>
              </span>
            </div>
            {m.lastMessage && (
              <div className="text-sm text-gray-600 mt-3 inline-flex items-center gap-2 bg-gray-50 px-3 py-1.5 rounded-lg">
                <MessageCircle size={14} className="text-gray-400" /> {m.lastMessage}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ─── Requests list ─────────────────────────────────────────── */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-semibold text-brand-900">
            Requests submitted{' '}
            <span className="text-gray-400 font-medium tabular text-base">
              ({requests.length})
            </span>
          </h2>
        </div>

        {requests.length === 0 ? (
          <div className="card p-10 text-center text-gray-400 inline-flex flex-col items-center gap-2 w-full">
            <Inbox size={32} className="text-gray-300" />
            <span>No service requests submitted yet.</span>
          </div>
        ) : (
          <div className="space-y-3">
            {requests.map((r) => (
              <RequestCard
                key={r._id}
                r={r}
                onStatus={(s) => updateStatus(r._id, s)}
                onNotes={(n) => updateNotes(r._id, n)}
                onLightbox={setLightbox}
              />
            ))}
          </div>
        )}
      </div>

      {/* ─── Lightbox modal ────────────────────────────────────────── */}
      {lightbox && (
        <div
          onClick={() => setLightbox(null)}
          className="fixed inset-0 bg-black/80 z-40 flex items-center justify-center p-4"
        >
          <button
            onClick={(e) => {
              e.stopPropagation();
              setLightbox(null);
            }}
            className="absolute top-4 right-4 text-white bg-black/40 rounded-full p-2"
            aria-label="Close"
          >
            <X size={20} />
          </button>
          <img
            src={lightbox}
            alt="attachment"
            className="max-h-[90vh] max-w-[90vw] rounded-lg shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}
    </div>
  );
}

/**
 * Visual card for a single ServiceRequest. Mirrors the layout used on the
 * Service Requests page so an admin who's used to that view feels at home
 * here too. Receives only the data + callbacks it needs — keeps the parent
 * lean and makes this trivially reusable should we ever embed requests on
 * another page.
 */
function RequestCard({ r, onStatus, onNotes, onLightbox }) {
  const mapUrl =
    r.geo?.latitude && r.geo?.longitude
      ? `https://www.google.com/maps?q=${r.geo.latitude},${r.geo.longitude}`
      : null;

  return (
    <div className="card p-5">
      <div className="flex items-start justify-between flex-wrap gap-4">
        <div className="flex-1 min-w-0">
          {/* Title row — ticket ID + option/service + status pill */}
          <div className="flex items-center gap-2 flex-wrap">
            {r.ticketId && (
              <span className="pill bg-brand-900 text-white font-mono ring-1 ring-brand-900">
                <Ticket size={11} /> {r.ticketId}
              </span>
            )}
            <div className="font-semibold text-brand-900 text-[14px]">{r.optionTitle}</div>
            <span className="pill bg-brand-50 text-brand-700 ring-1 ring-brand-200">
              {r.serviceTitle}
            </span>
            <span className={`pill ${STATUS_COLORS[r.status] || STATUS_COLORS.rejected}`}>
              {STATUS_LABELS[r.status] || r.status}
            </span>
          </div>

          {/* Meta row — phone, location, map link, timestamp */}
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

          {/* Optional school name (used by the mid-day-meal-issue flow) */}
          {r.schoolName && (
            <div className="text-xs text-gray-600 mt-1">
              <span className="font-medium">School:</span> {r.schoolName}
            </div>
          )}

          {r.description && (
            <p className="text-sm text-gray-700 mt-2 whitespace-pre-wrap">{r.description}</p>
          )}

          {/* Photo gallery — thumbnail strip + lightbox */}
          {Array.isArray(r.mediaUrls) && r.mediaUrls.length > 0 && (
            <div className="mt-3 flex gap-2 flex-wrap items-center">
              {r.mediaUrls.map((u, i) => (
                <button
                  key={u + i}
                  type="button"
                  onClick={() => onLightbox(u)}
                  className="relative w-20 h-20 rounded-md overflow-hidden border border-gray-200 hover:ring-2 hover:ring-brand-400"
                >
                  <img
                    src={u}
                    alt={`photo ${i + 1}`}
                    className="w-full h-full object-cover"
                  />
                </button>
              ))}
              <div className="inline-flex items-center gap-1 text-xs text-gray-500">
                <ImageIcon size={12} /> {r.mediaUrls.length} photo
                {r.mediaUrls.length > 1 ? 's' : ''}
              </div>
            </div>
          )}
        </div>

        {/* Status switcher — single inline action; delete lives only on the
            global Service Requests page so we don't accidentally orphan a
            ticket from the member detail context. */}
        <div className="flex items-center gap-2">
          <select
            className="input !w-auto !py-1.5"
            value={r.status}
            onChange={(ev) => onStatus(ev.target.value)}
          >
            {STATUSES.map((s) => (
              <option key={s} value={s}>
                {STATUS_LABELS[s]}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Internal notes textarea — saves on blur. */}
      <div className="mt-4 pt-4 border-t border-brand-100">
        <textarea
          rows={2}
          placeholder="Add internal notes here…"
          defaultValue={r.notes || ''}
          onBlur={(ev) => onNotes(ev.target.value)}
          className="input w-full text-sm bg-brand-50/60 hover:bg-white focus:bg-white"
        />
      </div>
    </div>
  );
}
