import { useEffect, useState } from 'react'
import { Link, useParams, useNavigate } from 'react-router-dom'
import {
  Calendar, MapPin, ArrowLeft, Loader2, Image as ImageIcon,
  Clock, Sparkles, Share2, ExternalLink, AlertTriangle,
} from 'lucide-react'
import api from '../lib/api'

/**
 * Public detail page for a single upcoming event. Mirrors the data shown
 * inside the WhatsApp Flow's EVENT_DETAILS screen, but with the full
 * uploaded image (no Cloudinary 1000×500 crop) and a richer layout.
 *
 * Backend: GET /portal/events/:id  (active-only, 404s otherwise)
 */

function formatDate(d) {
  if (!d) return ''
  return new Date(d).toLocaleDateString('en-IN', {
    weekday: 'short', day: '2-digit', month: 'short', year: 'numeric',
  })
}

function formatTime(d) {
  if (!d) return ''
  return new Date(d).toLocaleTimeString('en-IN', {
    hour: '2-digit', minute: '2-digit', hour12: true,
  })
}

function startsInLabel(from) {
  if (!from) return null
  const diffMs = new Date(from).getTime() - Date.now()
  if (diffMs <= 0) return 'Happening now'
  const days = Math.round(diffMs / 86_400_000)
  if (days === 0) return 'Today'
  if (days === 1) return 'Tomorrow'
  if (days < 7)  return `In ${days} days`
  if (days < 30) return `In ${Math.round(days / 7)} week${days < 14 ? '' : 's'}`
  return `In ${Math.round(days / 30)} month${days < 60 ? '' : 's'}`
}

export default function EventDetailPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [event, setEvent]     = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError]     = useState('')

  useEffect(() => {
    let alive = true
    setLoading(true); setError(''); setEvent(null)
    api.get(`/portal/events/${id}`)
      .then((r) => { if (alive) setEvent(r.data?.event || null) })
      .catch((err) => {
        if (!alive) return
        if (err.response?.status === 404) setError('This event no longer exists or has ended.')
        else setError(err.response?.data?.error || 'Could not load event details.')
      })
      .finally(() => { if (alive) setLoading(false) })
    return () => { alive = false }
  }, [id])

  /* ─── loading ─── */
  if (loading) {
    return (
      <div className="bg-gray-50 min-h-[calc(100vh-64px)] flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-10 h-10 text-[#990000] animate-spin mx-auto mb-3" />
          <p className="text-[11px] font-black text-gray-400 uppercase tracking-widest">
            Loading Event…
          </p>
        </div>
      </div>
    )
  }

  /* ─── error / not-found ─── */
  if (error || !event) {
    return (
      <div className="bg-gray-50 min-h-[calc(100vh-64px)]">
        <div className="max-w-2xl mx-auto px-4 sm:px-6 py-16">
          <Link
            to="/events"
            className="inline-flex items-center gap-1.5 text-sm font-bold text-gray-500 hover:text-[#990000] mb-8"
          >
            <ArrowLeft className="w-4 h-4" /> Back to Events
          </Link>
          <div className="bg-white rounded-2xl border border-gray-200 p-10 text-center">
            <div className="w-16 h-16 rounded-full bg-red-50 grid place-items-center mx-auto mb-4 border border-red-100">
              <AlertTriangle className="w-8 h-8 text-[#990000]" />
            </div>
            <h2 className="text-lg font-black text-gray-800 mb-1">Event unavailable</h2>
            <p className="text-sm text-gray-500 mb-6">{error || 'This event could not be found.'}</p>
            <button
              onClick={() => navigate('/events')}
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-[#990000] text-white text-sm font-bold rounded-xl shadow-[0_4px_14px_rgba(153,0,0,0.3)] hover:bg-[#7a0000] transition-all"
            >
              See All Events
            </button>
          </div>
        </div>
      </div>
    )
  }

  /* ─── happy path ─── */
  const startsIn = startsInLabel(event.fromDate)
  const isToday  = startsIn === 'Today' || startsIn === 'Happening now'
  const sameDay  = event.fromDate && event.toDate &&
    new Date(event.fromDate).toDateString() === new Date(event.toDate).toDateString()
  const mapsHref = event.location
    ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(event.location)}`
    : null

  async function handleShare() {
    const shareData = {
      title: event.title,
      text: `${event.title} — ${formatDate(event.fromDate)}${event.location ? ` · ${event.location}` : ''}`,
      url: window.location.href,
    }
    try {
      if (navigator.share) await navigator.share(shareData)
      else {
        await navigator.clipboard.writeText(window.location.href)
        alert('Link copied to clipboard')
      }
    } catch { /* user dismissed */ }
  }

  return (
    <div className="bg-gray-50 min-h-[calc(100vh-64px)]">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">

        {/* Back */}
        <Link
          to="/events"
          className="inline-flex items-center gap-1.5 text-sm font-bold text-gray-500 hover:text-[#990000] mb-6 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" /> Back to Events
        </Link>

        <article className="bg-white rounded-3xl border border-gray-200 overflow-hidden shadow-[0_8px_30px_rgba(0,0,0,0.04)]">

          {/* ─── Hero image (full, uncropped) ─── */}
          <div className="relative bg-gradient-to-br from-gray-100 to-gray-50 border-b border-gray-100">
            {event.image ? (
              <div className="relative w-full" style={{ minHeight: '240px' }}>
                {/* Blurred backdrop softens letterbox bars when aspect ratios differ. */}
                <img
                  src={event.image}
                  alt=""
                  aria-hidden
                  className="absolute inset-0 w-full h-full object-cover scale-110 blur-3xl opacity-40"
                />
                <img
                  src={event.image}
                  alt={event.title}
                  className="relative w-full h-auto max-h-[600px] object-contain mx-auto"
                />
              </div>
            ) : (
              <div className="aspect-[16/9] grid place-items-center text-gray-300">
                <ImageIcon className="w-16 h-16" />
              </div>
            )}

            {startsIn && (
              <span
                className={`absolute top-4 left-4 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] uppercase tracking-widest font-black backdrop-blur-sm border z-10 ${
                  isToday
                    ? 'bg-[#990000] text-white border-[#990000]'
                    : 'bg-white/95 text-[#990000] border-white'
                }`}
              >
                {isToday ? <Sparkles className="w-3.5 h-3.5" /> : <Clock className="w-3.5 h-3.5" />}
                {startsIn}
              </span>
            )}
          </div>

          {/* ─── Body ─── */}
          <div className="p-6 sm:p-10">

            <p className="text-[10px] font-black uppercase tracking-[3px] text-[#990000] mb-2">
              MLA Mylapore · Event
            </p>
            <h1 className="text-2xl sm:text-3xl md:text-4xl font-black text-gray-900 tracking-tight mb-6 leading-tight">
              {event.title}
            </h1>

            {/* Meta grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-8">
              {/* Date(s) */}
              <div className="flex items-start gap-3 p-4 bg-[#FFD700]/10 border border-[#FFD700]/40 rounded-xl">
                <div className="w-10 h-10 rounded-lg bg-[#990000] grid place-items-center shrink-0">
                  <Calendar className="w-5 h-5 text-white" />
                </div>
                <div className="min-w-0">
                  <div className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-0.5">
                    {sameDay ? 'Date' : 'Dates'}
                  </div>
                  <div className="text-sm font-bold text-gray-900">
                    {sameDay
                      ? formatDate(event.fromDate)
                      : <>
                          {formatDate(event.fromDate)}
                          <span className="text-gray-400 font-medium"> to </span>
                          {formatDate(event.toDate)}
                        </>}
                  </div>
                  {sameDay && event.fromDate && (
                    <div className="text-xs text-gray-500 mt-0.5">
                      {formatTime(event.fromDate)}
                      {event.toDate && new Date(event.fromDate).getTime() !== new Date(event.toDate).getTime() && (
                        <> – {formatTime(event.toDate)}</>
                      )}
                    </div>
                  )}
                </div>
              </div>

              {/* Location */}
              {event.location ? (
                <a
                  href={mapsHref}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-start gap-3 p-4 bg-red-50/50 border border-red-100 rounded-xl hover:border-[#990000]/40 hover:bg-red-50 transition-colors group"
                >
                  <div className="w-10 h-10 rounded-lg bg-[#990000] grid place-items-center shrink-0">
                    <MapPin className="w-5 h-5 text-white" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-0.5 flex items-center gap-1.5">
                      Location <ExternalLink className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity" />
                    </div>
                    <div className="text-sm font-bold text-gray-900 break-words">
                      {event.location}
                    </div>
                    <div className="text-[11px] text-[#990000] font-bold mt-0.5">
                      View on Google Maps →
                    </div>
                  </div>
                </a>
              ) : (
                <div className="flex items-start gap-3 p-4 bg-gray-50 border border-gray-100 rounded-xl">
                  <div className="w-10 h-10 rounded-lg bg-gray-300 grid place-items-center shrink-0">
                    <MapPin className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <div className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-0.5">
                      Location
                    </div>
                    <div className="text-sm font-bold text-gray-400">To be announced</div>
                  </div>
                </div>
              )}
            </div>

            {/* Description */}
            {event.description ? (
              <div className="mb-8">
                <h2 className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-3">
                  About this event
                </h2>
                <p className="text-[15px] text-gray-700 leading-relaxed whitespace-pre-wrap">
                  {event.description}
                </p>
              </div>
            ) : (
              <p className="text-sm text-gray-400 italic mb-8">
                More details about this event will be shared soon.
              </p>
            )}

            {/* Actions */}
            <div className="flex flex-col sm:flex-row gap-3 pt-6 border-t border-gray-100">
              <button
                onClick={handleShare}
                className="inline-flex items-center justify-center gap-2 px-5 py-3 bg-[#FFD700] text-[#990000] text-sm font-black rounded-xl shadow-sm hover:bg-[#E6C200] transition-all"
              >
                <Share2 className="w-4 h-4" /> Share Event
              </button>
              {mapsHref && (
                <a
                  href={mapsHref}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center justify-center gap-2 px-5 py-3 bg-[#990000] text-white text-sm font-black rounded-xl shadow-[0_4px_14px_rgba(153,0,0,0.3)] hover:bg-[#7a0000] transition-all"
                >
                  <MapPin className="w-4 h-4" /> Get Directions
                </a>
              )}
              <Link
                to="/events"
                className="inline-flex items-center justify-center gap-2 px-5 py-3 bg-white border border-gray-200 text-gray-700 text-sm font-black rounded-xl hover:border-gray-300 hover:bg-gray-50 transition-all sm:ml-auto"
              >
                See All Events
              </Link>
            </div>
          </div>
        </article>
      </div>
    </div>
  )
}
