import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { MapPin, Clock, MessageSquare, Plus, Search } from 'lucide-react'
import api from '../lib/api'
import { useAuth } from '../lib/auth'

/**
 * Lists every ServiceRequest filed by the current user — both the ones raised
 * here on the web and the ones raised earlier through the WhatsApp bot, since
 * the backend keys grievances by phone and our JWT carries that phone.
 */

const STATUS_LABELS = {
  pending:    { label: 'Open',        cls: 'bg-orange-100 text-orange-700',  bar: 'bg-saffron',    pct: '12%', icon: '🔴' },
  accepted:   { label: 'Accepted',    cls: 'bg-blue-100 text-blue-700',      bar: 'bg-tvk-blue',   pct: '30%', icon: '🔵' },
  processing: { label: 'In Progress', cls: 'bg-blue-100 text-blue-700',      bar: 'bg-tvk-blue',   pct: '55%', icon: '🔵' },
  completed:  { label: 'Resolved',    cls: 'bg-green-200 text-green-800',    bar: 'bg-tvk-green',  pct: '100%',icon: '✅' },
  rejected:   { label: 'Rejected',    cls: 'bg-red-100 text-red-700',        bar: 'bg-red-500',    pct: '100%',icon: '⛔' },
}

function formatDate(d) {
  if (!d) return ''
  return new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
}

export default function MyGrievances() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [requests, setRequests] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    api
      .get('/portal/grievances')
      .then((r) => { if (!cancelled) setRequests(Array.isArray(r.data?.requests) ? r.data.requests : []) })
      .catch(() => { if (!cancelled) setRequests([]) })
      .finally(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [])

  return (
    <div className="max-w-2xl mx-auto px-4 py-6 md:py-10">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold text-navy font-serif">📂 My Grievances</h1>
          <p className="text-sm text-gray-500">
            {user?.name || 'Mylapore Resident'} — <strong>{requests.length}</strong> grievance{requests.length !== 1 ? 's' : ''} filed
          </p>
        </div>
        <div className="flex gap-2">
          <button onClick={() => navigate('/track')} className="btn-outline text-xs py-2 px-3 flex items-center gap-1">
            <Search className="w-3.5 h-3.5" /> Track
          </button>
          <button onClick={() => navigate('/grievance')} className="btn-primary text-xs py-2 px-3 flex items-center gap-1">
            <Plus className="w-3.5 h-3.5" /> New
          </button>
        </div>
      </div>

      {loading ? (
        <div className="text-center py-12 text-gray-400">
          <div className="animate-spin w-8 h-8 border-2 border-navy border-t-transparent rounded-full mx-auto mb-3" />
          Loading grievances...
        </div>
      ) : requests.length === 0 ? (
        <div className="card p-8 text-center">
          <div className="text-4xl mb-3">📭</div>
          <p className="text-gray-500 mb-4">No grievances raised yet.</p>
          <button onClick={() => navigate('/grievance')} className="btn-primary text-sm">
            📋 Raise Your First Grievance
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          {requests.map((g) => {
            const status = STATUS_LABELS[g.status] || STATUS_LABELS.pending
            const isClosed = g.status === 'completed' || g.status === 'rejected'
            return (
              <div key={g._id || g.ticketId} className={`card p-5 ${g.status === 'completed' ? 'border-green-200 bg-green-50/30' : ''}`}>
                <div className="flex items-center justify-between mb-3">
                  <span className="text-xs font-bold text-tvk-blue tracking-wide">#{g.ticketId}</span>
                  <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-semibold ${status.cls}`}>
                    {status.icon} {status.label}
                  </span>
                </div>

                <div className="mb-2">
                  <span className="inline-block bg-navy-light text-navy text-xs font-bold px-2 py-0.5 rounded">
                    {g.serviceTitle || g.serviceId}
                  </span>
                </div>

                <h3 className="font-semibold text-sm text-gray-800 mb-1">{g.optionTitle || g.optionId}</h3>

                {g.location && (
                  <div className="flex items-center gap-1.5 text-xs text-gray-500 mb-2">
                    <MapPin className="w-3.5 h-3.5" />
                    {g.location}
                  </div>
                )}

                {g.description && (
                  <p className="text-xs text-gray-600 italic bg-gray-50 rounded p-2 mb-3">
                    "{g.description.substring(0, 140)}{g.description.length > 140 ? '...' : ''}"
                  </p>
                )}

                {g.notes && (
                  <div className="bg-white border border-green-200 rounded-lg p-3 mb-3">
                    <div className="flex items-center gap-1.5 text-xs font-semibold text-tvk-green mb-1">
                      <MessageSquare className="w-3.5 h-3.5" />
                      MLA Team Response:
                    </div>
                    <p className="text-sm text-green-800">"{g.notes}"</p>
                    {g.updatedAt && (
                      <p className="text-xs text-green-600 mt-1">Updated: {formatDate(g.updatedAt)}</p>
                    )}
                  </div>
                )}

                <div className="flex items-center justify-between text-xs text-gray-500 pt-2 border-t border-gray-100">
                  <span className="flex items-center gap-1">
                    <Clock className="w-3.5 h-3.5" />
                    {formatDate(g.createdAt)}
                  </span>
                  <span className={`font-semibold ${isClosed ? 'text-tvk-green' : 'text-saffron'}`}>
                    {isClosed ? '✓ Action Taken' : '⏳ Awaiting Review'}
                  </span>
                </div>

                <div className="mt-3">
                  <div className="h-1.5 bg-gray-200 rounded-full overflow-hidden">
                    <div className={`h-full rounded-full transition-all duration-700 ${status.bar}`} style={{ width: status.pct }} />
                  </div>
                  <div className="flex justify-between text-[10px] text-gray-400 mt-1">
                    <span>Received</span><span>Review</span><span>Action</span><span>Resolved</span>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
