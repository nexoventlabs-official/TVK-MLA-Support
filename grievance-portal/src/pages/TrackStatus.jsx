import { useState } from 'react'
import { Search, MapPin, Clock, MessageSquare, AlertCircle } from 'lucide-react'
import api from '../lib/api'

/**
 * Quick lookup by ticket ID. The endpoint is auth-protected, so the result is
 * scoped to the current user — looking up someone else's ticket returns 404.
 * That's intentional: any user who needs the full list of their own tickets
 * can use the My Grievances page instead.
 */

const STATUS = {
  pending:    { label: 'Open',        cls: 'bg-orange-100 text-orange-700', bar: 'bg-saffron',   pct: '12%',  icon: '🔴' },
  accepted:   { label: 'Accepted',    cls: 'bg-blue-100 text-blue-700',     bar: 'bg-tvk-blue',  pct: '30%',  icon: '🔵' },
  processing: { label: 'In Progress', cls: 'bg-blue-100 text-blue-700',     bar: 'bg-tvk-blue',  pct: '55%',  icon: '🔵' },
  completed:  { label: 'Resolved',    cls: 'bg-green-200 text-green-800',   bar: 'bg-tvk-green', pct: '100%', icon: '✅' },
  rejected:   { label: 'Rejected',    cls: 'bg-red-100 text-red-700',       bar: 'bg-red-500',   pct: '100%', icon: '⛔' },
}

function formatDate(d) {
  if (!d) return ''
  return new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
}

export default function TrackStatus() {
  const [trackId, setTrackId] = useState('')
  const [result, setResult] = useState(null)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleTrack(e) {
    e.preventDefault()
    setError('')
    setResult(null)
    const cleanId = trackId.trim().toUpperCase().replace('#', '')
    if (!cleanId) return setError('Please enter a Grievance ID')

    setLoading(true)
    try {
      const { data } = await api.get(`/portal/grievances/${encodeURIComponent(cleanId)}`)
      setResult(data.request)
    } catch (err) {
      const status = err.response?.status
      if (status === 404) setError(`No grievance found with ID "${cleanId}".`)
      else setError(err.response?.data?.error || 'Could not look up that ticket. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="max-w-md mx-auto px-4 py-8 md:py-12">
      <div className="card p-6 md:p-8">
        <div className="text-center mb-6">
          <div className="w-14 h-14 rounded-full bg-navy/10 flex items-center justify-center mx-auto mb-3">
            <Search className="w-7 h-7 text-navy" />
          </div>
          <h2 className="text-lg font-bold text-navy font-serif">Track Your Grievance</h2>
          <p className="text-xs text-gray-500 mt-1">Enter the reference ID you received when filing</p>
        </div>

        <form onSubmit={handleTrack}>
          <div className="mb-4">
            <label className="block text-xs font-semibold text-gray-600 uppercase tracking-wide mb-2">Reference ID</label>
            <input
              type="text"
              className="input-field text-center font-mono uppercase tracking-wider"
              placeholder="TVK-XXXX-XXXX"
              value={trackId}
              onChange={(e) => setTrackId(e.target.value.toUpperCase())}
              autoFocus
            />
          </div>

          {error && (
            <div className="flex items-center gap-2 text-red-600 text-xs mb-4 bg-red-50 p-3 rounded-lg border border-red-100">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              {error}
            </div>
          )}

          <button
            type="submit"
            className="btn-primary w-full py-3.5"
            disabled={loading || !trackId.trim()}
          >
            {loading ? 'Searching...' : 'Track Status'}
          </button>
        </form>

        {result && (() => {
          const status = STATUS[result.status] || STATUS.pending
          const isClosed = result.status === 'completed' || result.status === 'rejected'
          return (
            <div className="mt-6 border rounded-xl p-5 bg-gray-50/60 animate-in fade-in slide-in-from-bottom-2">
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-bold text-tvk-blue tracking-wide">#{result.ticketId}</span>
                <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-semibold ${status.cls}`}>
                  {status.icon} {status.label}
                </span>
              </div>

              <div className="mb-2">
                <span className="inline-block bg-navy-light text-navy text-xs font-bold px-2 py-0.5 rounded">
                  {result.serviceTitle || result.serviceId}
                </span>
              </div>

              <h3 className="font-semibold text-sm text-gray-800 mb-1">{result.optionTitle || result.optionId}</h3>

              {result.location && (
                <div className="flex items-center gap-1.5 text-xs text-gray-500 mb-2">
                  <MapPin className="w-3.5 h-3.5" />
                  {result.location}
                </div>
              )}

              {result.description && (
                <p className="text-xs text-gray-600 italic bg-white rounded p-2 mb-3 border border-gray-100">
                  "{result.description}"
                </p>
              )}

              {result.notes && (
                <div className="bg-white border border-green-200 rounded-lg p-3 mb-3">
                  <div className="flex items-center gap-1.5 text-xs font-semibold text-tvk-green mb-1">
                    <MessageSquare className="w-3.5 h-3.5" />
                    MLA Team Response:
                  </div>
                  <p className="text-sm text-green-800">"{result.notes}"</p>
                </div>
              )}

              <div className="flex items-center justify-between text-xs text-gray-500 pt-2 border-t border-gray-100">
                <span className="flex items-center gap-1">
                  <Clock className="w-3.5 h-3.5" />
                  {formatDate(result.createdAt)}
                </span>
                <span className={`font-semibold ${isClosed ? 'text-tvk-green' : 'text-saffron'}`}>
                  {isClosed ? '✓ Action Taken' : '⏳ Awaiting Review'}
                </span>
              </div>

              <div className="mt-3">
                <div className="h-1.5 bg-gray-200 rounded-full overflow-hidden">
                  <div className={`h-full rounded-full ${status.bar}`} style={{ width: status.pct }} />
                </div>
                <div className="flex justify-between text-[10px] text-gray-400 mt-1">
                  <span>Received</span><span>Review</span><span>Action</span><span>Resolved</span>
                </div>
              </div>
            </div>
          )
        })()}
      </div>
    </div>
  )
}
