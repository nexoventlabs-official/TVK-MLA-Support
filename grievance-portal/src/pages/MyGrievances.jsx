import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  ArrowRight, Calendar, MapPin, Loader2, Inbox, Search, Settings,
  CheckCircle, XCircle, Clock, ChevronRight,
} from 'lucide-react'
import api from '../lib/api'

/**
 * List view of every grievance filed by the logged-in citizen across both
 * the WhatsApp bot and the web portal (both write to the same
 * `ServiceRequest` collection keyed by phone — see
 * `backend/routes/portal.js:859`).
 *
 * Each row is a flat clickable card that navigates to
 * `/my-grievances/:ticketId` — the dedicated detail page replaces the
 * previous expand-in-place dropdown UX.
 */

const STATUS_META = {
  pending:    { label: 'Pending Review', tone: 'text-orange-600',   chipBg: 'bg-orange-50',  chipBorder: 'border-orange-200',  Icon: Clock },
  accepted:   { label: 'Accepted',       tone: 'text-blue-600',     chipBg: 'bg-blue-50',    chipBorder: 'border-blue-200',    Icon: Search },
  processing: { label: 'In Progress',    tone: 'text-blue-600',     chipBg: 'bg-blue-50',    chipBorder: 'border-blue-200',    Icon: Settings },
  completed:  { label: 'Resolved',       tone: 'text-green-600',    chipBg: 'bg-green-50',   chipBorder: 'border-green-200',   Icon: CheckCircle },
  rejected:   { label: 'Rejected',       tone: 'text-red-600',      chipBg: 'bg-red-50',     chipBorder: 'border-red-200',     Icon: XCircle },
}

function formatDate(d) {
  if (!d) return ''
  return new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
}

export default function MyGrievances() {
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    let alive = true
    setLoading(true); setError('')
    // Backend responds with `{ requests: [...] }` (see backend/routes/portal.js:865).
    // The legacy `items` fallback covers older deployments still in flight.
    api.get('/portal/grievances')
      .then((r) => {
        if (!alive) return
        const list = Array.isArray(r.data?.requests)
          ? r.data.requests
          : Array.isArray(r.data?.items) ? r.data.items : []
        setItems(list)
      })
      .catch((err) => { if (alive) setError(err.response?.data?.error || 'Could not load your grievances.') })
      .finally(() => { if (alive) setLoading(false) })
    return () => { alive = false }
  }, [])

  /* ─── render ────────────────────────────────────────────────── */

  if (loading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-10 h-10 text-[#990000] animate-spin mx-auto mb-3" />
          <p className="text-[11px] font-black text-gray-400 uppercase tracking-widest">
            Loading Your Grievances…
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="bg-gray-50 min-h-[calc(100vh-64px)]">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        <div className="mb-8 flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
          <div>
            <p className="text-[10px] font-black uppercase tracking-[3px] text-[#990000] mb-1">
              Your Tickets
            </p>
            <h1 className="text-2xl md:text-3xl font-black text-gray-900 tracking-tight">
              My Grievances
            </h1>
            <p className="text-sm text-gray-500 mt-1 font-medium">
              Tap any ticket to see the full details, photos, and the MLA office's response.
            </p>
          </div>
          <Link
            to="/grievance"
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-[#990000] text-white text-sm font-bold rounded-xl shadow-[0_4px_14px_rgba(153,0,0,0.3)] hover:bg-[#7a0000] transition-all self-start sm:self-auto"
          >
            File New Grievance <ArrowRight className="w-4 h-4" />
          </Link>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 rounded-xl p-4 text-sm mb-6">
            {error}
          </div>
        )}

        {!error && items.length === 0 && (
          <div className="bg-white rounded-2xl border border-gray-200 p-10 text-center">
            <div className="w-16 h-16 rounded-full bg-gray-50 grid place-items-center mx-auto mb-4 border border-gray-100">
              <Inbox className="w-8 h-8 text-gray-300" />
            </div>
            <h2 className="text-lg font-black text-gray-800 mb-1">No grievances yet</h2>
            <p className="text-sm text-gray-500 mb-5">
              You haven't filed a grievance yet. Tap below to register your first one.
            </p>
            <Link
              to="/grievance"
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-[#FFD700] text-[#990000] text-sm font-bold rounded-xl hover:bg-[#E6C200] transition-all"
            >
              File a Grievance <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        )}

        {items.length > 0 && (
          <ul className="space-y-3">
            {items.map((g) => {
              const status = STATUS_META[g.status] || STATUS_META.pending
              const StatusIcon = status.Icon
              return (
                <li key={g.ticketId || g._id}>
                  <Link
                    to={`/my-grievances/${encodeURIComponent(g.ticketId)}`}
                    className="group flex flex-col sm:flex-row sm:items-center gap-4 bg-white rounded-2xl border border-gray-200 p-5 hover:border-[#990000]/30 hover:shadow-md transition-all"
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap mb-1.5">
                        <span className="text-base font-black text-gray-900 tracking-tight">
                          #{g.ticketId}
                        </span>
                        <span
                          className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[10px] uppercase tracking-widest font-black border ${status.chipBg} ${status.chipBorder} ${status.tone}`}
                        >
                          <StatusIcon className="w-3 h-3" />
                          {status.label}
                        </span>
                      </div>
                      <div className="text-sm font-bold text-gray-800 mb-0.5">
                        {g.optionTitle || g.optionId}
                      </div>
                      <div className="text-xs text-gray-500 font-medium">
                        {g.serviceTitle || g.serviceId}
                      </div>
                      <div className="flex flex-wrap items-center gap-3 mt-2 text-[11px] font-medium text-gray-400">
                        <span className="inline-flex items-center gap-1">
                          <Calendar className="w-3 h-3" /> {formatDate(g.createdAt)}
                        </span>
                        {g.location && (
                          <span className="inline-flex items-center gap-1 truncate max-w-[240px]">
                            <MapPin className="w-3 h-3" /> {g.location}
                          </span>
                        )}
                        {Array.isArray(g.mediaUrls) && g.mediaUrls.length > 0 && (
                          <span className="inline-flex items-center gap-1">
                            📎 {g.mediaUrls.length} photo{g.mediaUrls.length > 1 ? 's' : ''}
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-2 flex-shrink-0 self-end sm:self-center">
                      <span className="text-xs font-bold text-[#990000] hidden sm:inline">
                        View details
                      </span>
                      <ChevronRight className="w-4 h-4 text-gray-300 group-hover:text-[#990000] group-hover:translate-x-0.5 transition-all" />
                    </div>
                  </Link>
                </li>
              )
            })}
          </ul>
        )}
      </div>
    </div>
  )
}
