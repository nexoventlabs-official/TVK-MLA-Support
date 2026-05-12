import { useState } from 'react'
import { Search, MapPin, Clock, MessageSquare, AlertCircle, ChevronDown, Calendar, Settings, CheckCircle, XCircle } from 'lucide-react'
import api from '../lib/api'

const STATUS_LABELS = {
  pending:    { label: 'Pending Review', cls: 'bg-white text-orange-600 shadow-sm', bar: 'bg-orange-400 shadow-[0_0_12px_rgba(251,146,60,0.6)]', pct: '25%', Icon: Clock, iconColor: 'text-orange-500', border: 'from-orange-500 to-orange-400' },
  accepted:   { label: 'Accepted',       cls: 'bg-white text-blue-600 shadow-sm',     bar: 'bg-blue-400 shadow-[0_0_12px_rgba(96,165,250,0.6)]',   pct: '50%', Icon: Search, iconColor: 'text-blue-500', border: 'from-blue-500 to-blue-400' },
  processing: { label: 'In Progress',    cls: 'bg-white text-blue-600 shadow-sm',     bar: 'bg-blue-400 shadow-[0_0_12px_rgba(96,165,250,0.6)]',   pct: '75%', Icon: Settings, iconColor: 'text-blue-500', border: 'from-blue-500 to-blue-400' },
  completed:  { label: 'Resolved',       cls: 'bg-white text-green-600 shadow-sm',  bar: 'bg-green-400 shadow-[0_0_12px_rgba(74,222,128,0.6)]',  pct: '100%', Icon: CheckCircle, iconColor: 'text-green-500', border: 'from-green-500 to-green-400' },
  rejected:   { label: 'Rejected',       cls: 'bg-white text-red-600 shadow-sm',        bar: 'bg-red-400 shadow-[0_0_12px_rgba(248,113,113,0.6)]',    pct: '100%', Icon: XCircle, iconColor: 'text-red-500', border: 'from-red-600 to-red-500' },
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
    <div className="max-w-4xl mx-auto px-4 py-12 md:py-20">
      
      {/* SEARCH HEADER & FORM */}
      <div className="text-center mb-10 transition-all duration-500">
        <div className="w-20 h-20 rounded-full bg-red-50/50 border border-red-100 flex items-center justify-center mx-auto mb-6 shadow-sm">
          <Search className="w-8 h-8 text-[#990000]" />
        </div>
        <h1 className="text-4xl font-black text-gray-900 tracking-tight mb-2">Track Your Grievance</h1>
        <p className="text-base text-gray-500 font-medium">Enter the reference ID you received when filing</p>
      </div>

      <form onSubmit={handleTrack} className="bg-white p-6 md:p-8 rounded-[24px] shadow-[0_8px_30px_rgb(0,0,0,0.06)] border border-gray-100 mb-12 max-w-lg mx-auto">
        <div className="mb-6">
          <label className="block text-[11px] font-black text-gray-400 uppercase tracking-widest mb-3">Reference ID</label>
          <input
            type="text"
            className="w-full px-5 py-4 bg-gray-50 border border-gray-200 rounded-xl text-center font-mono text-lg font-bold tracking-widest text-gray-800 focus:outline-none focus:ring-2 focus:ring-[#990000]/20 focus:border-[#990000] focus:bg-white transition-all uppercase placeholder:text-gray-300"
            placeholder="TVK-XXXX-XXXX"
            value={trackId}
            onChange={(e) => setTrackId(e.target.value.toUpperCase())}
            autoFocus
          />
        </div>

        {error && (
          <div className="flex items-center gap-2 text-[#990000] text-xs font-bold mb-6 bg-red-50 p-4 rounded-xl border border-red-100">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            {error}
          </div>
        )}

        <button
          type="submit"
          className="w-full py-4 bg-[#990000] text-white text-sm font-bold rounded-xl shadow-[0_4px_14px_rgba(153,0,0,0.3)] hover:bg-[#7a0000] hover:translate-y-[-2px] transition-all disabled:opacity-50 disabled:hover:translate-y-0"
          disabled={loading || !trackId.trim()}
        >
          {loading ? (
            <span className="flex items-center justify-center gap-2">
              <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              SEARCHING...
            </span>
          ) : 'TRACK STATUS'}
        </button>
      </form>

      {/* RESULT TICKET */}
      {result && (() => {
        const status = STATUS_LABELS[result.status] || STATUS_LABELS.pending
        const isClosed = result.status === 'completed' || result.status === 'rejected'
        const StatusIcon = status.Icon
        const g = result // Map to same variable name as MyGrievances
        
        return (
          <div className="animate-in fade-in slide-in-from-bottom-8 duration-700">
            <h2 className="text-center text-sm font-black text-gray-400 uppercase tracking-widest mb-6">Search Result</h2>
            
            {/* The Ticket (Always Expanded since it's the only result) */}
            <div className="bg-white rounded-[24px] shadow-[0_12px_40px_rgba(149,157,165,0.2)] border-none overflow-hidden relative flex flex-col md:flex-row max-w-4xl mx-auto scale-[1.02]">
              
              {/* LEFT SECTION (Main Info - YELLOW) */}
              <div className="flex-1 p-6 md:p-8 flex flex-col justify-center relative bg-[#FFD700]">
                <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-5 mb-7">
                  <h3 className="text-[28px] font-black text-black tracking-tight">#{g.ticketId}</h3>
                  <div className="flex items-center gap-1.5 bg-black/5 border border-black/10 text-black/80 px-2.5 py-1.5 rounded-lg w-fit shadow-sm">
                    <Calendar className="w-3 h-3" />
                    <span className="text-[10px] font-bold uppercase tracking-widest">{formatDate(g.createdAt)}</span>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 mb-7">
                  <div>
                    <div className="text-[9px] uppercase tracking-[0.15em] font-black text-black/50 mb-1.5">Category</div>
                    <div className="text-[16px] font-black text-black">{g.serviceTitle || g.serviceId}</div>
                  </div>
                  <div>
                    <div className="text-[9px] uppercase tracking-[0.15em] font-black text-black/50 mb-1.5">Issue</div>
                    <div className="text-[15px] font-bold text-black/90">{g.optionTitle || g.optionId}</div>
                  </div>
                </div>

                <div className="flex flex-col gap-5">
                  {g.location && (
                    <div className="flex items-start gap-2.5 text-[14px] text-black/80 bg-black/5 p-3.5 rounded-xl border border-black/10 font-medium">
                      <MapPin className="w-4 h-4 text-black mt-0.5 flex-shrink-0" />
                      <span className="leading-snug">{g.location}</span>
                    </div>
                  )}

                  {g.description && (
                    <div className="bg-black/5 rounded-xl p-5 border border-black/10 relative">
                      <MessageSquare className="w-5 h-5 text-black/10 absolute top-5 right-5" />
                      <p className="text-[14px] text-black/80 italic leading-relaxed pr-8 font-medium">
                        "{g.description}"
                      </p>
                    </div>
                  )}
                </div>
              </div>

              {/* VERTICAL TEAR LINE (Desktop - RED) */}
              <div className="hidden md:flex flex-col justify-between items-center relative w-8 flex-shrink-0 bg-[#990000]">
                <div className="w-6 h-6 rounded-full bg-white shadow-[inset_0_3px_6px_rgba(0,0,0,0.1)] absolute -top-3 z-10"></div>
                <div className="h-full border-l-2 border-dashed border-white/30 absolute left-1/2 -translate-x-1/2 z-0"></div>
                <div className="w-6 h-6 rounded-full bg-white shadow-[inset_0_-3px_6px_rgba(0,0,0,0.1)] absolute -bottom-3 z-10"></div>
              </div>

              {/* HORIZONTAL TEAR LINE (Mobile - RED) */}
              <div className="md:hidden relative w-full overflow-hidden h-6 flex items-center bg-[#990000]">
                <div className="absolute -left-3 w-6 h-6 rounded-full bg-white shadow-[inset_3px_0_6px_rgba(0,0,0,0.1)] z-10"></div>
                <div className="absolute -right-3 w-6 h-6 rounded-full bg-white shadow-[inset_-3px_0_6px_rgba(0,0,0,0.1)] z-10"></div>
                <div className="w-full border-t-2 border-dashed border-white/30 mx-3 z-0"></div>
              </div>

              {/* RIGHT SECTION (Status & Progress - RED) */}
              <div className="w-full md:w-[340px] bg-[#990000] p-6 md:p-8 flex flex-col justify-center relative z-0">
                <div className="mb-7 flex flex-col items-start md:items-center">
                  <div className="text-[9px] uppercase tracking-[0.15em] font-black text-white/50 mb-2.5">Current Status</div>
                  <span className={`inline-flex items-center justify-center gap-2 px-4 py-2 rounded-xl text-[11px] uppercase tracking-widest font-black ${status.cls}`}>
                    <StatusIcon className={`w-3.5 h-3.5 ${status.iconColor}`} />
                    {status.label}
                  </span>
                </div>

                {g.notes && (
                  <div className="bg-white/10 p-4 rounded-xl border border-white/20 shadow-sm backdrop-blur-sm mb-7">
                    <div className="flex items-center gap-2 text-[9px] uppercase tracking-[0.15em] font-black text-white/80 mb-2.5">
                      <div className="w-5 h-5 rounded-full bg-white/20 flex items-center justify-center">
                        <MessageSquare className="w-3 h-3 text-white" />
                      </div>
                      Official Response
                    </div>
                    <p className="text-[13px] text-white font-medium leading-relaxed">"{g.notes}"</p>
                    {g.updatedAt && (
                      <p className="text-[9px] text-white/50 mt-2.5 font-bold uppercase tracking-[0.15em]">Updated • {formatDate(g.updatedAt)}</p>
                    )}
                  </div>
                )}

                <div className="w-full">
                  <div className="flex items-center justify-between mb-3">
                    <div className="text-[9px] uppercase tracking-[0.15em] font-black text-white/50">Progress Tracker</div>
                    <span className={`text-[10px] font-black flex items-center gap-1.5 ${isClosed ? 'text-green-400' : 'text-orange-300'}`}>
                      <StatusIcon className="w-3 h-3" />
                      {isClosed ? 'CLOSED' : 'PENDING'}
                    </span>
                  </div>
                  
                  <div className="h-3 bg-black/20 rounded-full overflow-hidden shadow-inner border border-white/5 backdrop-blur-sm">
                    <div className={`h-full rounded-full transition-all duration-1000 ease-out ${status.bar}`} style={{ width: status.pct }} />
                  </div>
                  <div className="flex justify-between text-[9px] uppercase tracking-[0.15em] font-bold text-white/40 mt-2.5 px-1">
                    <span className={status.pct !== '0%' ? 'text-white/90' : ''}>Received</span>
                    <span className={status.pct === '50%' || status.pct === '75%' || status.pct === '100%' ? 'text-white/90' : ''}>Reviewing</span>
                    <span className={status.pct === '100%' ? 'text-white/90' : ''}>Resolved</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )
      })()}
    </div>
  )
}
