import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  Calendar, MapPin, Loader2, ArrowRight, Image as ImageIcon,
  Sparkles, Clock,
} from 'lucide-react'
import api from '../lib/api'

/**
 * Public-facing list of upcoming events organised by the MLA's office.
 *
 * Same data source as the WhatsApp "Upcoming Events" branch and the admin
 * panel — see `backend/routes/portal.js:802` (GET /portal/events). The
 * endpoint already filters to `active: true` and `toDate >= now`, sorted by
 * `fromDate`, so we just render whatever comes back.
 *
 * Replaces the legacy `/track` page (citizens now use `/my-grievances` for
 * tracking).
 */

function formatDate(d) {
  if (!d) return ''
  return new Date(d).toLocaleDateString('en-IN', {
    day: '2-digit', month: 'short', year: 'numeric',
  })
}

/** Same-day events show just one date; multi-day shows the range. */
function formatDateRange(from, to) {
  if (!from) return ''
  const f = new Date(from)
  const t = to ? new Date(to) : f
  const sameDay = f.toDateString() === t.toDateString()
  return sameDay ? formatDate(from) : `${formatDate(from)} – ${formatDate(to)}`
}

/** Returns a relative-time hint for events starting soon. */
function startsInLabel(from) {
  if (!from) return null
  const now = Date.now()
  const start = new Date(from).getTime()
  const diffMs = start - now
  if (diffMs <= 0) return 'Happening now'
  const days = Math.round(diffMs / 86_400_000)
  if (days === 0) return 'Today'
  if (days === 1) return 'Tomorrow'
  if (days < 7)  return `In ${days} days`
  if (days < 30) return `In ${Math.round(days / 7)} week${days < 14 ? '' : 's'}`
  return `In ${Math.round(days / 30)} month${days < 60 ? '' : 's'}`
}

export default function EventsPage() {
  const [events, setEvents]   = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError]     = useState('')

  useEffect(() => {
    let alive = true
    setLoading(true); setError('')
    api.get('/portal/events')
      .then((r) => { if (alive) setEvents(Array.isArray(r.data?.events) ? r.data.events : []) })
      .catch((err) => { if (alive) setError(err.response?.data?.error || 'Could not load events. Please try again.') })
      .finally(() => { if (alive) setLoading(false) })
    return () => { alive = false }
  }, [])

  return (
    <div className="bg-gray-50 min-h-[calc(100vh-64px)]">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-10">

        {/* ─── Page header ─── */}
        <header className="mb-8 flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
          <div>
            <p className="text-[10px] font-black uppercase tracking-[3px] text-[#990000] mb-1">
              MLA Mylapore
            </p>
            <h1 className="text-2xl md:text-3xl font-black text-gray-900 tracking-tight">
              Upcoming Events
            </h1>
            <p className="text-sm text-gray-500 mt-1 font-medium max-w-xl">
              Public meetings, yatras, camps, and outreach drives organised by the MLA's office.
              Join us in person or follow along on WhatsApp for updates.
            </p>
          </div>
          <Link
            to="/grievance"
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-[#FFD700] text-[#990000] text-sm font-bold rounded-xl shadow-sm hover:bg-[#E6C200] transition-all self-start sm:self-auto"
          >
            File a Grievance <ArrowRight className="w-4 h-4" />
          </Link>
        </header>

        {/* ─── Loading ─── */}
        {loading && (
          <div className="min-h-[40vh] flex items-center justify-center">
            <div className="text-center">
              <Loader2 className="w-10 h-10 text-[#990000] animate-spin mx-auto mb-3" />
              <p className="text-[11px] font-black text-gray-400 uppercase tracking-widest">
                Loading Events…
              </p>
            </div>
          </div>
        )}

        {/* ─── Error ─── */}
        {!loading && error && (
          <div className="bg-red-50 border border-red-200 text-red-700 rounded-xl p-4 text-sm mb-6">
            {error}
          </div>
        )}

        {/* ─── Empty state ─── */}
        {!loading && !error && events.length === 0 && (
          <div className="bg-white rounded-2xl border border-gray-200 p-12 text-center">
            <div className="w-16 h-16 rounded-full bg-[#FFD700]/20 grid place-items-center mx-auto mb-4 border border-[#FFD700]/40">
              <Calendar className="w-8 h-8 text-[#990000]" />
            </div>
            <h2 className="text-lg font-black text-gray-800 mb-1">No events scheduled yet</h2>
            <p className="text-sm text-gray-500 mb-5 max-w-sm mx-auto">
              The MLA's office hasn't announced any upcoming events at the moment. Check back
              soon — new events are posted here as soon as they're confirmed.
            </p>
            <Link
              to="/"
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-[#990000] text-white text-sm font-bold rounded-xl shadow-[0_4px_14px_rgba(153,0,0,0.3)] hover:bg-[#7a0000] transition-all"
            >
              Back to Home
            </Link>
          </div>
        )}

        {/* ─── Events grid ─── */}
        {!loading && !error && events.length > 0 && (
          <ul className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {events.map((ev) => (
              <li key={ev._id}>
                <EventCard event={ev} />
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  )
}

/* ─── card ────────────────────────────────────────────────────── */

function EventCard({ event }) {
  const startsIn = startsInLabel(event.fromDate)
  const isToday  = startsIn === 'Today' || startsIn === 'Happening now'

  return (
    <Link
      to={`/events/${event._id}`}
      className="group block bg-white rounded-2xl border border-gray-200 overflow-hidden hover:border-[#990000]/30 hover:shadow-lg transition-all h-full flex flex-col"
    >
      {/* Banner image — 16:9 frame with `object-contain` so the full uploaded
          image is visible (no cropping). The faint gradient plus a soft
          backdrop image provide a clean letterbox when aspect ratios mismatch. */}
      <div className="aspect-[16/9] bg-gradient-to-br from-gray-50 to-gray-100 overflow-hidden border-b border-gray-100 relative">
        {event.image ? (
          <>
            {/* Blurred backdrop fills the letterbox area in the same colours
                as the photo so it doesn't feel like there's wasted space. */}
            <img
              src={event.image}
              alt=""
              aria-hidden
              className="absolute inset-0 w-full h-full object-cover scale-110 blur-2xl opacity-40"
            />
            <img
              src={event.image}
              alt={event.title}
              className="relative w-full h-full object-contain group-hover:scale-[1.02] transition-transform duration-300"
              loading="lazy"
            />
          </>
        ) : (
          <div className="w-full h-full grid place-items-center text-gray-300">
            <ImageIcon className="w-12 h-12" />
          </div>
        )}

        {/* "Starts in" pill — top-left overlay */}
        {startsIn && (
          <span
            className={`absolute top-3 left-3 inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[10px] uppercase tracking-widest font-black backdrop-blur-sm border z-10 ${
              isToday
                ? 'bg-[#990000] text-white border-[#990000]'
                : 'bg-white/90 text-[#990000] border-white'
            }`}
          >
            {isToday ? <Sparkles className="w-3 h-3" /> : <Clock className="w-3 h-3" />}
            {startsIn}
          </span>
        )}
      </div>

      {/* Body */}
      <div className="p-5 flex-1 flex flex-col">
        <h3 className="text-base font-black text-gray-900 tracking-tight leading-snug mb-2 line-clamp-2 group-hover:text-[#990000] transition-colors">
          {event.title}
        </h3>

        <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5 text-xs text-gray-500 font-medium mb-3">
          <span className="inline-flex items-center gap-1.5">
            <Calendar className="w-3.5 h-3.5 text-[#990000]" />
            {formatDateRange(event.fromDate, event.toDate)}
          </span>
          {event.location && (
            <span className="inline-flex items-center gap-1.5 truncate max-w-full">
              <MapPin className="w-3.5 h-3.5 text-[#990000]" />
              {event.location}
            </span>
          )}
        </div>

        {event.description && (
          <p className="text-sm text-gray-600 leading-relaxed line-clamp-3 whitespace-pre-wrap mb-3">
            {event.description}
          </p>
        )}

        <div className="mt-auto pt-2 inline-flex items-center gap-1.5 text-[11px] font-black uppercase tracking-widest text-[#990000]">
          View Details <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
        </div>
      </div>
    </Link>
  )
}
