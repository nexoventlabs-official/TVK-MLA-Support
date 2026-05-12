import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { MapPin, Clock, MessageSquare, Plus, Search, ChevronDown, Calendar, Settings, CheckCircle, XCircle } from 'lucide-react'
import api from '../lib/api'
import { useAuth } from '../lib/auth'

/**
 * Lists every ServiceRequest filed by the current user — both the ones raised
 * here on the web and the ones raised earlier through the WhatsApp bot, since
 * the backend keys grievances by phone and our JWT carries that phone.
 */

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

export default function MyGrievances() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [requests, setRequests] = useState([])
  const [loading, setLoading] = useState(true)
  const [expandedId, setExpandedId] = useState(null)

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
    <div className="max-w-5xl mx-auto px-4 py-8 md:py-12">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between mb-8 gap-5">
        <div>
          <h1 className="text-3xl font-black text-gray-900 tracking-tight">My Grievances</h1>
          <p className="text-sm text-gray-500 mt-1 font-medium">
            {user?.name || 'Resident'} — <strong className="text-[#990000]">{requests.length}</strong> grievance{requests.length !== 1 ? 's' : ''} filed
          </p>
        </div>
        <div className="flex gap-3">
          <button onClick={() => navigate('/track')} className="flex items-center gap-2 px-5 py-2.5 bg-white border border-gray-200/80 text-gray-700 text-sm font-bold rounded-xl shadow-sm hover:border-[#990000]/30 hover:bg-[#990000]/5 hover:text-[#990000] transition-all">
            <Search className="w-4 h-4" /> Track Status
          </button>
          <button onClick={() => navigate('/grievance')} className="flex items-center gap-2 px-5 py-2.5 bg-[#990000] text-white text-sm font-bold rounded-xl shadow-[0_4px_14px_rgba(153,0,0,0.3)] hover:bg-[#7a0000] hover:translate-y-[-1px] transition-all">
            <Plus className="w-4 h-4" /> New Ticket
          </button>
        </div>
      </div>

      {loading ? (
        <div className="text-center py-20">
          <div className="animate-spin w-10 h-10 border-3 border-[#990000] border-t-transparent rounded-full mx-auto mb-4" />
          <p className="text-[11px] font-black text-gray-400 uppercase tracking-widest">Loading Tickets...</p>
        </div>
      ) : requests.length === 0 ? (
        <div className="bg-white border-2 border-dashed border-gray-200/80 rounded-3xl p-12 text-center shadow-sm">
          <div className="w-20 h-20 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-5">
            <span className="text-4xl opacity-50">📭</span>
          </div>
          <h3 className="text-xl font-black text-gray-900 tracking-tight mb-2">No tickets found</h3>
          <p className="text-gray-500 mb-6 max-w-sm mx-auto font-medium">You haven't filed any grievances yet. When you do, your digital tickets will appear here.</p>
          <button onClick={() => navigate('/grievance')} className="inline-flex items-center gap-2 px-6 py-3 bg-[#990000] text-white text-sm font-bold rounded-xl shadow-[0_4px_14px_rgba(153,0,0,0.3)] hover:bg-[#7a0000] hover:translate-y-[-1px] transition-all">
            <Plus className="w-4 h-4" /> File a Grievance
          </button>
        </div>
      ) : (
        <div className="space-y-6">
          {requests.map((g) => {
            const status = STATUS_LABELS[g.status] || STATUS_LABELS.pending
            const isClosed = g.status === 'completed' || g.status === 'rejected'
            
            const isExpanded = expandedId === g.ticketId
            const StatusIcon = status.Icon
            
            return (
              <div 
                key={g._id || g.ticketId} 
                onClick={() => setExpandedId(isExpanded ? null : g.ticketId)}
                className={`bg-white rounded-[24px] shadow-[0_8px_24px_rgba(149,157,165,0.12)] border-none overflow-hidden relative group transition-all duration-300 flex flex-col md:flex-row cursor-pointer hover:shadow-[0_16px_40px_rgba(149,157,165,0.2)] ${isExpanded ? 'scale-[1.01]' : 'hover:-translate-y-1'}`}
              >
                {/* LEFT SECTION (Main Info - YELLOW) */}
                <div className="flex-1 p-6 md:p-8 flex flex-col justify-center relative bg-[#FFD700]">
                  {/* Chevron Toggle Mobile */}
                  <div className="absolute top-6 right-6 md:hidden">
                    <ChevronDown className={`w-5 h-5 text-black/40 transition-transform duration-300 ${isExpanded ? 'rotate-180 text-black' : ''}`} />
                  </div>

                  <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-5 mb-7 mt-1 sm:mt-0">
                    <h3 className="text-[24px] font-black text-black tracking-tight">#{g.ticketId}</h3>
                    <div className="flex items-center gap-1.5 bg-black/5 border border-black/10 text-black/80 px-2.5 py-1.5 rounded-lg w-fit shadow-sm">
                      <Calendar className="w-3 h-3" />
                      <span className="text-[10px] font-bold uppercase tracking-widest">{formatDate(g.createdAt)}</span>
                    </div>
                  </div>

                  <div className={`grid grid-cols-1 sm:grid-cols-2 gap-6 ${isExpanded ? 'mb-7' : 'mb-0'}`}>
                    <div>
                      <div className="text-[9px] uppercase tracking-[0.15em] font-black text-black/50 mb-1.5">Category</div>
                      <div className="text-[16px] font-black text-black">{g.serviceTitle || g.serviceId}</div>
                    </div>
                    <div>
                      <div className="text-[9px] uppercase tracking-[0.15em] font-black text-black/50 mb-1.5">Issue</div>
                      <div className="text-[15px] font-bold text-black/90">{g.optionTitle || g.optionId}</div>
                    </div>
                  </div>

                  {/* EXPANDABLE DETAILS */}
                  <div className={`flex flex-col gap-5 transition-all duration-500 overflow-hidden ${isExpanded ? 'max-h-[500px] opacity-100' : 'max-h-0 opacity-0'}`}>
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
                  {/* Chevron Toggle Desktop */}
                  <div className="absolute top-6 right-6 hidden md:block">
                    <ChevronDown className={`w-5 h-5 text-white/40 transition-transform duration-300 ${isExpanded ? 'rotate-180 text-white' : ''}`} />
                  </div>

                  <div className="mb-7 flex flex-col items-start md:items-center mt-2 md:mt-0">
                    <div className="text-[9px] uppercase tracking-[0.15em] font-black text-white/50 mb-2.5">Current Status</div>
                    <span className={`inline-flex items-center justify-center gap-2 px-4 py-2 rounded-xl text-[11px] uppercase tracking-widest font-black ${status.cls}`}>
                      <StatusIcon className={`w-3.5 h-3.5 ${status.iconColor}`} />
                      {status.label}
                    </span>
                  </div>

                  {/* MLA Response Section */}
                  <div className={`transition-all duration-500 overflow-hidden ${isExpanded && g.notes ? 'max-h-[300px] opacity-100 mb-7' : 'max-h-0 opacity-0 mb-0'}`}>
                    {g.notes && (
                      <div className="bg-white/10 p-4 rounded-xl border border-white/20 shadow-sm backdrop-blur-sm">
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
                  </div>

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
            )
          })}
        </div>
      )}
    </div>
  )
}

