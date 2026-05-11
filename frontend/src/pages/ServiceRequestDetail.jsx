import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import {
  ArrowLeft,
  Phone,
  Calendar,
  MapPin,
  Ticket,
  Image as ImageIcon,
  ExternalLink,
  X,
  Trash2,
  School,
  User,
} from 'lucide-react';
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

/**
 * Full-page view for a single ServiceRequest, opened from the list at
 * `/service-requests`. Renders every field the API returns — ticket id,
 * citizen identity, status (editable), service / option, description,
 * geo + map link, media gallery with lightbox, internal notes, and a
 * destructive Delete action gated by a confirm dialog.
 *
 * The page polls every 20 s in the background so an admin watching a
 * ticket sees status / notes changes made by other operators without
 * having to refresh.
 */
export default function ServiceRequestDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [r, setR] = useState(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [savingStatus, setSavingStatus] = useState(false);
  const [notesDirty, setNotesDirty] = useState(false);
  const [notesValue, setNotesValue] = useState('');
  const [savingNotes, setSavingNotes] = useState(false);
  const [lightbox, setLightbox] = useState(null);

  /**
   * Fetch the request. Initial load shows the skeleton; subsequent silent
   * polls update fields in-place. We avoid clobbering the notes textarea
   * if the operator has unsaved edits — otherwise typing-then-poll would
   * eat their input.
   */
  const load = async ({ silent = false } = {}) => {
    if (!silent) setLoading(true);
    try {
      const { data } = await api.get(`/service-requests/${id}`);
      setR(data.request || data);
      if (!notesDirty) setNotesValue((data.request || data).notes || '');
      setNotFound(false);
    } catch (err) {
      if (err.response?.status === 404) setNotFound(true);
      // ignore other errors during silent poll — keep last good state
    } finally {
      if (!silent) setLoading(false);
    }
  };

  useEffect(() => {
    load();
    const t = setInterval(() => load({ silent: true }), 20_000);
    return () => clearInterval(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const updateStatus = async (next) => {
    if (!r || next === r.status) return;
    setSavingStatus(true);
    // Optimistic update so the pill flips colour instantly.
    setR((prev) => (prev ? { ...prev, status: next } : prev));
    try {
      await api.patch(`/service-requests/${id}`, { status: next });
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to update status');
      // Re-fetch to reconcile the optimistic update on failure.
      await load({ silent: true });
    } finally {
      setSavingStatus(false);
    }
  };

  const saveNotes = async () => {
    if (!r) return;
    setSavingNotes(true);
    try {
      await api.patch(`/service-requests/${id}`, { notes: notesValue });
      setNotesDirty(false);
      setR((prev) => (prev ? { ...prev, notes: notesValue } : prev));
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to save notes');
    } finally {
      setSavingNotes(false);
    }
  };

  const remove = async () => {
    if (!confirm('Delete this request? This cannot be undone.')) return;
    try {
      await api.delete(`/service-requests/${id}`);
      navigate('/service-requests', { replace: true });
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to delete request');
    }
  };

  if (loading) {
    return <div className="card p-8 text-center text-gray-500">Loading…</div>;
  }
  if (notFound || !r) {
    return (
      <div className="card p-8 text-center text-gray-500">
        Request not found.{' '}
        <Link to="/service-requests" className="text-brand-700 underline">
          Back to list
        </Link>
      </div>
    );
  }

  const photoCount = Array.isArray(r.mediaUrls) ? r.mediaUrls.length : 0;
  const mapUrl =
    r.geo?.latitude && r.geo?.longitude
      ? `https://www.google.com/maps?q=${r.geo.latitude},${r.geo.longitude}`
      : null;

  return (
    <div className="space-y-6">
      {/* Top bar — back link and destructive action */}
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <Link
          to="/service-requests"
          className="inline-flex items-center gap-1.5 text-[12px] font-semibold tracking-wide uppercase text-brand-500 hover:text-brand-900 transition"
        >
          <ArrowLeft size={13} /> Back to requests
        </Link>
        <button
          onClick={remove}
          className="btn-danger !py-1.5 !text-xs"
          title="Delete request"
        >
          <Trash2 size={14} /> Delete
        </button>
      </div>

      {/* ─── Header card — title, status, citizen identity, timestamps ─── */}
      <div className="card p-6 space-y-4">
        <div className="flex items-start justify-between gap-3 flex-wrap">
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap mb-1.5">
              {r.ticketId && (
                <span className="pill bg-brand-900 text-white font-mono ring-1 ring-brand-900 text-[12px]">
                  <Ticket size={12} /> {r.ticketId}
                </span>
              )}
              <span className="pill bg-brand-50 text-brand-700 ring-1 ring-brand-200">
                {r.serviceTitle}
              </span>
            </div>
            <h1 className="text-2xl font-bold text-brand-900 break-words">
              {r.optionTitle}
            </h1>
          </div>

          {/* Status editor sits in the header so it's always reachable */}
          <div className="flex items-center gap-2">
            <span
              className={`pill ${STATUS_COLORS[r.status] || STATUS_COLORS.rejected} !text-[12px]`}
            >
              {STATUS_LABELS[r.status] || r.status}
            </span>
            <select
              className="input !w-auto !py-1.5"
              value={r.status}
              disabled={savingStatus}
              onChange={(e) => updateStatus(e.target.value)}
            >
              {STATUSES.map((s) => (
                <option key={s} value={s}>
                  {STATUS_LABELS[s]}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Citizen identity row */}
        <dl className="grid sm:grid-cols-3 gap-x-6 gap-y-3 text-sm pt-2 border-t border-brand-100">
          <Field icon={User} label="Filed by">
            <Link
              to={`/members/${encodeURIComponent(r.phone)}`}
              className="text-brand-900 font-semibold hover:text-brand-700 hover:underline"
            >
              {r.name || '—'}
            </Link>
          </Field>
          <Field icon={Phone} label="WhatsApp">
            <a
              href={`tel:+${r.phone}`}
              className="text-brand-900 font-medium hover:text-brand-700"
            >
              {r.phone}
            </a>
          </Field>
          <Field icon={Calendar} label="Submitted">
            <span className="text-brand-900 font-medium">
              {new Date(r.createdAt).toLocaleString()}
            </span>
          </Field>
        </dl>
      </div>

      {/* ─── Description card ─── */}
      <div className="card p-6 space-y-3">
        <h2 className="text-[11px] font-bold uppercase tracking-[0.22em] text-brand-400">
          Description
        </h2>
        {r.schoolName && (
          <div className="inline-flex items-center gap-2 text-sm text-brand-900 bg-brand-50 border border-brand-200/60 rounded-lg px-3 py-1.5">
            <School size={14} /> <span className="font-medium">{r.schoolName}</span>
          </div>
        )}
        {r.description ? (
          <p className="text-sm text-gray-800 whitespace-pre-wrap leading-relaxed">
            {r.description}
          </p>
        ) : (
          <p className="text-sm text-gray-400 italic">No description provided.</p>
        )}
      </div>

      {/* ─── Location card ─── */}
      {(r.location || mapUrl) && (
        <div className="card p-6 space-y-3">
          <h2 className="text-[11px] font-bold uppercase tracking-[0.22em] text-brand-400">
            Location
          </h2>
          {r.location && (
            <div className="text-sm text-gray-800 inline-flex items-start gap-2">
              <MapPin size={14} className="text-gray-500 mt-0.5 shrink-0" />
              <span className="break-words">{r.location}</span>
            </div>
          )}
          {mapUrl && (
            <div className="space-y-2">
              <a
                href={mapUrl}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1.5 text-sm font-semibold text-brand-700 hover:underline"
              >
                <MapPin size={14} /> Open in Google Maps <ExternalLink size={12} />
              </a>
              <div className="text-[11px] font-mono text-gray-500">
                {Number(r.geo.latitude).toFixed(6)}, {Number(r.geo.longitude).toFixed(6)}
              </div>
              {/* Lightweight static map preview via Maps embed (no API key
                  required for the iframe variant). Keeps the page useful
                  even when the operator can't switch tabs. */}
              <iframe
                title="Location preview"
                src={`https://www.google.com/maps?q=${r.geo.latitude},${r.geo.longitude}&z=16&output=embed`}
                className="w-full h-64 rounded-xl border border-brand-200/60"
                loading="lazy"
                referrerPolicy="no-referrer-when-downgrade"
              />
            </div>
          )}
        </div>
      )}

      {/* ─── Photos card ─── */}
      {photoCount > 0 && (
        <div className="card p-6 space-y-3">
          <h2 className="text-[11px] font-bold uppercase tracking-[0.22em] text-brand-400 inline-flex items-center gap-1.5">
            <ImageIcon size={12} /> Photos ({photoCount})
          </h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
            {r.mediaUrls.map((u, i) => (
              <button
                key={u + i}
                type="button"
                onClick={() => setLightbox(u)}
                className="relative aspect-square rounded-lg overflow-hidden border border-brand-200/60 hover:ring-2 hover:ring-brand-400 transition"
              >
                <img
                  src={u}
                  alt={`attachment ${i + 1}`}
                  className="w-full h-full object-cover"
                  loading="lazy"
                />
              </button>
            ))}
          </div>
        </div>
      )}

      {/* ─── Internal notes card ─── */}
      <div className="card p-6 space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-[11px] font-bold uppercase tracking-[0.22em] text-brand-400">
            Internal Notes
          </h2>
          {notesDirty && (
            <span className="text-[11px] text-amber-700">Unsaved changes</span>
          )}
        </div>
        <textarea
          rows={4}
          placeholder="Add internal notes here. Visible only to admins."
          value={notesValue}
          onChange={(e) => {
            setNotesValue(e.target.value);
            setNotesDirty(true);
          }}
          className="input w-full text-sm bg-brand-50/60 hover:bg-white focus:bg-white"
        />
        <div className="flex justify-end">
          <button
            onClick={saveNotes}
            disabled={!notesDirty || savingNotes}
            className="btn-primary !py-1.5 !text-xs disabled:opacity-50"
          >
            {savingNotes ? 'Saving…' : 'Save notes'}
          </button>
        </div>
      </div>

      {/* ─── Lightbox ─── */}
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
 * Shared definition-list row used in the header card. Keeps the icon /
 * label / value alignment identical for every field.
 */
function Field({ icon: Icon, label, children }) {
  return (
    <div className="min-w-0">
      <dt className="text-[10px] font-bold uppercase tracking-[0.22em] text-brand-400 inline-flex items-center gap-1">
        <Icon size={11} /> {label}
      </dt>
      <dd className="mt-1 text-sm break-words">{children}</dd>
    </div>
  );
}
