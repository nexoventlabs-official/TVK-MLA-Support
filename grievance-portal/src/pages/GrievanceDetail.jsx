import { useEffect, useState } from 'react'
import { useNavigate, useParams, Link } from 'react-router-dom'
import {
  ArrowLeft, MapPin, Calendar, Clock, Search, Settings,
  CheckCircle, XCircle, MessageSquare, ImageIcon, ExternalLink,
  Loader2, AlertCircle, FileText, Building2, Phone, User,
} from 'lucide-react'
import api from '../lib/api'

/**
 * Dedicated full-page details view for a single grievance.
 *
 * Replaces the previous "click row → expand inline" UX on `/my-grievances`.
 * Shows everything we have about a ticket on one scrollable page:
 *   - meta (ticket id, dates, status, progress)
 *   - the citizen's submission (category, issue, school, description, location, photos)
 *   - the admin's response (status, official notes / message, last updated)
 *
 * Data source: GET /portal/grievances/:ticketId (already auth-protected and
 * scoped to the caller's phone in backend/routes/portal.js).
 */

const STATUS_META = {
  pending:    { label: 'Pending Review', pct: 25,  bar: 'bg-orange-400', tone: 'text-orange-600',   chipBg: 'bg-orange-50',  chipBorder: 'border-orange-200',  Icon: Clock },
  accepted:   { label: 'Accepted',       pct: 50,  bar: 'bg-blue-400',   tone: 'text-blue-600',     chipBg: 'bg-blue-50',    chipBorder: 'border-blue-200',    Icon: Search },
  processing: { label: 'In Progress',    pct: 75,  bar: 'bg-blue-400',   tone: 'text-blue-600',     chipBg: 'bg-blue-50',    chipBorder: 'border-blue-200',    Icon: Settings },
  completed:  { label: 'Resolved',       pct: 100, bar: 'bg-green-400',  tone: 'text-green-600',    chipBg: 'bg-green-50',   chipBorder: 'border-green-200',   Icon: CheckCircle },
  rejected:   { label: 'Rejected',       pct: 100, bar: 'bg-red-400',    tone: 'text-red-600',      chipBg: 'bg-red-50',     chipBorder: 'border-red-200',     Icon: XCircle },
}

const STATUS_FLOW = ['pending', 'accepted', 'processing', 'completed']

function formatDate(d, withTime = false) {
  if (!d) return ''
  const date = new Date(d)
  const opts = { day: '2-digit', month: 'short', year: 'numeric' }
  if (withTime) Object.assign(opts, { hour: '2-digit', minute: '2-digit' })
  return date.toLocaleDateString('en-IN', opts)
}

export default function GrievanceDetail() {
  const { ticketId } = useParams()
  const navigate = useNavigate()
  const [grievance, setGrievance] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [photoOpen, setPhotoOpen] = useState(null) // url of photo to show in lightbox

  useEffect(() => {
    let alive = true
    setLoading(true); setError('')
    api.get(`/portal/grievances/${encodeURIComponent(ticketId)}`)
      .then((r) => { if (alive) setGrievance(r.data?.request || null) })
      .catch((err) => {
        if (!alive) return
        const status = err.response?.status
        setError(
          status === 404
            ? 'This grievance does not exist or you do not have access to it.'
            : err.response?.data?.error || 'Could not load this grievance.'
        )
      })
      .finally(() => { if (alive) setLoading(false) })
    return () => { alive = false }
  }, [ticketId])

  /* ─── loading / error ─────────────────────────────────────────── */

  if (loading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-10 h-10 text-[#990000] animate-spin mx-auto mb-3" />
          <p className="text-[11px] font-black text-gray-400 uppercase tracking-widest">
            Loading Ticket…
          </p>
        </div>
      </div>
    )
  }

  if (error || !grievance) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-16 text-center">
        <div className="w-16 h-16 rounded-full bg-red-50 border border-red-100 grid place-items-center mx-auto mb-4">
          <AlertCircle className="w-8 h-8 text-[#990000]" />
        </div>
        <h1 className="text-2xl font-black text-gray-900 tracking-tight mb-2">Ticket not found</h1>
        <p className="text-gray-500 mb-6">{error || 'No grievance with that reference.'}</p>
        <Link
          to="/my-grievances"
          className="inline-flex items-center gap-2 px-5 py-2.5 bg-[#990000] text-white text-sm font-bold rounded-xl shadow-[0_4px_14px_rgba(153,0,0,0.3)] hover:bg-[#7a0000] transition-all"
        >
          <ArrowLeft className="w-4 h-4" /> Back to My Grievances
        </Link>
      </div>
    )
  }

  /* ─── derived ─────────────────────────────────────────────────── */

  const status = STATUS_META[grievance.status] || STATUS_META.pending
  const StatusIcon = status.Icon
  const isClosed = grievance.status === 'completed' || grievance.status === 'rejected'
  const photos = Array.isArray(grievance.mediaUrls) ? grievance.mediaUrls : []
  const geo = grievance.geo
  const hasGeo = geo && geo.latitude != null && geo.longitude != null
  const mapsUrl = hasGeo
    ? `https://www.google.com/maps/search/?api=1&query=${geo.latitude},${geo.longitude}`
    : null

  return (
    <div className="bg-gray-50 min-h-[calc(100vh-64px)]">
      {/* ─── Page header ─── */}
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <button
            onClick={() => navigate('/my-grievances')}
            className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-[#990000] font-semibold mb-4 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" /> Back to My Grievances
          </button>

          <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
            <div>
              <p className="text-[10px] font-black uppercase tracking-[3px] text-[#990000] mb-1">
                Grievance Details
              </p>
              <h1 className="text-2xl md:text-3xl font-black text-gray-900 tracking-tight">
                #{grievance.ticketId}
              </h1>
              <p className="text-sm text-gray-500 mt-1 font-medium flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5" />
                Filed on {formatDate(grievance.createdAt, true)}
              </p>
            </div>

            <span
              className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl text-[11px] uppercase tracking-widest font-black border ${status.chipBg} ${status.chipBorder} ${status.tone} self-start sm:self-end`}
            >
              <StatusIcon className="w-4 h-4" />
              {status.label}
            </span>
          </div>
        </div>
      </header>

      {/* ─── Body ─── */}
      <main className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8 grid lg:grid-cols-3 gap-6">

        {/* ─── LEFT (main, 2/3) ─── */}
        <div className="lg:col-span-2 space-y-6">

          {/* Status & progress card */}
          <Card>
            <CardHeader title="Status & Progress" subtitle="Where your ticket stands right now" />
            <div className="p-6">
              <div className="flex items-center justify-between mb-3">
                <span className="text-[10px] uppercase tracking-[0.15em] font-black text-gray-400">
                  Progress
                </span>
                <span className={`text-[11px] font-black flex items-center gap-1.5 ${isClosed ? 'text-green-600' : 'text-orange-600'}`}>
                  <StatusIcon className="w-3.5 h-3.5" />
                  {isClosed ? 'CLOSED' : 'IN PIPELINE'}
                </span>
              </div>
              <div className="h-3 bg-gray-100 rounded-full overflow-hidden border border-gray-200">
                <div
                  className={`h-full rounded-full transition-all duration-1000 ease-out ${status.bar}`}
                  style={{ width: `${status.pct}%` }}
                />
              </div>

              <ol className="grid grid-cols-4 gap-2 mt-5">
                {STATUS_FLOW.map((s, i) => {
                  const meta = STATUS_META[s]
                  const reached =
                    grievance.status === 'rejected'
                      ? s === 'pending'
                      : STATUS_FLOW.indexOf(grievance.status) >= i
                  return (
                    <li key={s} className="text-center">
                      <div
                        className={`w-8 h-8 rounded-full grid place-items-center mx-auto mb-1.5 border-2 ${
                          reached ? 'bg-[#990000] border-[#990000] text-white' : 'bg-white border-gray-200 text-gray-300'
                        }`}
                      >
                        <meta.Icon className="w-3.5 h-3.5" />
                      </div>
                      <span className={`text-[10px] font-bold uppercase tracking-wider ${reached ? 'text-gray-700' : 'text-gray-300'}`}>
                        {meta.label}
                      </span>
                    </li>
                  )
                })}
              </ol>
            </div>
          </Card>

          {/* Citizen submission */}
          <Card>
            <CardHeader title="Your Submission" subtitle="What you reported when filing this grievance" />
            <div className="p-6 space-y-5">
              <div className="grid sm:grid-cols-2 gap-4">
                <DataRow icon={Building2} label="Category" value={grievance.serviceTitle || grievance.serviceId} />
                <DataRow icon={FileText}  label="Issue"    value={grievance.optionTitle  || grievance.optionId} />
              </div>

              {grievance.schoolName && (
                <DataRow icon={Building2} label="School" value={grievance.schoolName} />
              )}

              {grievance.description && (
                <div>
                  <div className="text-[10px] uppercase tracking-[0.15em] font-black text-gray-400 mb-2">
                    Description
                  </div>
                  <div className="bg-gray-50 border border-gray-200 rounded-xl p-4 text-sm text-gray-700 leading-relaxed whitespace-pre-wrap">
                    {grievance.description}
                  </div>
                </div>
              )}

              {(grievance.location || hasGeo) && (
                <div>
                  <div className="text-[10px] uppercase tracking-[0.15em] font-black text-gray-400 mb-2">
                    Location
                  </div>
                  <div className="bg-gray-50 border border-gray-200 rounded-xl p-4">
                    <div className="flex items-start gap-2.5 text-sm text-gray-700 mb-2">
                      <MapPin className="w-4 h-4 text-[#990000] mt-0.5 flex-shrink-0" />
                      <span className="leading-snug">
                        {grievance.location || geo?.address || 'Pinned on map'}
                      </span>
                    </div>
                    {hasGeo && (
                      <a
                        href={mapsUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1.5 text-xs font-bold text-[#990000] hover:underline mt-1"
                      >
                        <ExternalLink className="w-3 h-3" />
                        Open in Google Maps ({Number(geo.latitude).toFixed(5)}, {Number(geo.longitude).toFixed(5)})
                      </a>
                    )}
                  </div>
                </div>
              )}
            </div>
          </Card>

          {/* Photos */}
          <Card>
            <CardHeader
              title="Attached Photos"
              subtitle={photos.length ? `${photos.length} photo${photos.length > 1 ? 's' : ''} you uploaded` : 'No photos attached'}
            />
            <div className="p-6">
              {photos.length === 0 ? (
                <div className="text-center py-8 text-gray-400">
                  <ImageIcon className="w-10 h-10 mx-auto mb-2 opacity-40" />
                  <p className="text-sm">No photos were attached to this ticket.</p>
                </div>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  {photos.map((url, i) => (
                    <button
                      key={url + i}
                      onClick={() => setPhotoOpen(url)}
                      className="group aspect-square rounded-xl overflow-hidden bg-gray-100 border border-gray-200 hover:border-[#990000] hover:shadow-md transition-all"
                    >
                      <img
                        src={url}
                        alt={`Attachment ${i + 1}`}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                        loading="lazy"
                      />
                    </button>
                  ))}
                </div>
              )}
            </div>
          </Card>

          {/* Official response */}
          <Card>
            <CardHeader
              title="Official Response"
              subtitle={grievance.notes ? 'Message from MLA Venkatramanan\'s office' : 'No response yet from the MLA office'}
              accent
            />
            <div className="p-6">
              {grievance.notes ? (
                <div className="bg-[#990000]/5 border border-[#990000]/15 rounded-xl p-5">
                  <div className="flex items-center gap-2 text-[10px] uppercase tracking-[0.15em] font-black text-[#990000] mb-3">
                    <div className="w-6 h-6 rounded-full bg-[#990000] grid place-items-center">
                      <MessageSquare className="w-3 h-3 text-[#FFD700]" />
                    </div>
                    MLA Office
                  </div>
                  <p className="text-sm text-gray-800 leading-relaxed whitespace-pre-wrap">
                    {grievance.notes}
                  </p>
                  {grievance.updatedAt && (
                    <p className="text-[10px] text-gray-400 mt-4 font-bold uppercase tracking-[0.15em]">
                      Replied on {formatDate(grievance.updatedAt, true)}
                    </p>
                  )}
                </div>
              ) : (
                <div className="text-center py-8 text-gray-400 bg-gray-50 rounded-xl border border-dashed border-gray-200">
                  <MessageSquare className="w-10 h-10 mx-auto mb-2 opacity-40" />
                  <p className="text-sm">
                    The MLA's office hasn't replied yet. You'll see their message here as soon as they do.
                  </p>
                </div>
              )}
            </div>
          </Card>

        </div>

        {/* ─── RIGHT (sidebar, 1/3) ─── */}
        <aside className="lg:col-span-1">
          <div className="lg:sticky lg:top-20 space-y-4">

            <Card>
              <div className="bg-[#990000] text-white px-5 py-4">
                <p className="text-[10px] font-black uppercase tracking-[3px] text-[#FFD700]">Filed By</p>
              </div>
              <div className="p-5 space-y-3 text-sm">
                {grievance.name && (
                  <SidebarRow icon={User}  label="Name"  value={grievance.name} />
                )}
                {grievance.phone && (
                  <SidebarRow icon={Phone} label="Phone" value={`+91 ${grievance.phone.replace(/^91/, '')}`} />
                )}
                <SidebarRow icon={Calendar} label="Filed on" value={formatDate(grievance.createdAt, true)} />
                {grievance.updatedAt && grievance.updatedAt !== grievance.createdAt && (
                  <SidebarRow icon={Clock} label="Last update" value={formatDate(grievance.updatedAt, true)} />
                )}
              </div>
            </Card>

            <div className="bg-[#FFD700]/15 border border-[#FFD700] rounded-2xl p-4 text-xs text-[#990000] leading-relaxed">
              <strong className="block mb-1">Need help?</strong>
              Call our toll-free helpline at <strong className="whitespace-nowrap">1800-XXX-XXXX</strong>{' '}
              or visit the MLA's office in Mylapore between 10 am – 5 pm. Quote your ticket{' '}
              <strong>#{grievance.ticketId}</strong>.
            </div>

            <button
              onClick={() => navigate('/my-grievances')}
              className="w-full py-3 px-4 rounded-xl text-sm font-bold border-2 border-gray-200 hover:border-[#990000]/30 hover:bg-[#990000]/5 hover:text-[#990000] text-gray-700 transition-all"
            >
              ← All My Grievances
            </button>
          </div>
        </aside>
      </main>

      {/* Photo lightbox */}
      {photoOpen && (
        <div
          onClick={() => setPhotoOpen(null)}
          className="fixed inset-0 z-50 bg-black/80 grid place-items-center p-4 cursor-zoom-out"
        >
          <img
            src={photoOpen}
            alt="Attachment full size"
            className="max-h-[90vh] max-w-full rounded-xl shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          />
          <button
            onClick={() => setPhotoOpen(null)}
            className="absolute top-4 right-4 w-10 h-10 rounded-full bg-white/90 grid place-items-center shadow-lg hover:bg-white"
          >
            <XCircle className="w-6 h-6 text-[#990000]" />
          </button>
        </div>
      )}
    </div>
  )
}

/* ─── presentational helpers ───────────────────────────────────── */

function Card({ children }) {
  return (
    <section className="bg-white rounded-2xl border border-gray-200 shadow-[0_2px_8px_rgba(0,0,0,0.04)] overflow-hidden">
      {children}
    </section>
  )
}

function CardHeader({ title, subtitle, accent }) {
  return (
    <header className={`px-6 py-4 border-b border-gray-100 ${accent ? 'bg-[#990000]/[0.03]' : ''}`}>
      <h2 className="text-base font-black text-gray-900 tracking-tight">{title}</h2>
      {subtitle && <p className="text-xs text-gray-500 mt-0.5 font-medium">{subtitle}</p>}
    </header>
  )
}

function DataRow({ icon: Icon, label, value }) {
  return (
    <div>
      <div className="text-[10px] uppercase tracking-[0.15em] font-black text-gray-400 mb-1.5 flex items-center gap-1.5">
        {Icon && <Icon className="w-3 h-3" />}
        {label}
      </div>
      <div className="text-sm font-bold text-gray-800 leading-tight">{value || '—'}</div>
    </div>
  )
}

function SidebarRow({ icon: Icon, label, value }) {
  return (
    <div className="flex items-start gap-2.5">
      {Icon && (
        <div className="w-7 h-7 rounded-lg bg-gray-100 grid place-items-center flex-shrink-0">
          <Icon className="w-3.5 h-3.5 text-gray-500" />
        </div>
      )}
      <div className="flex-1 min-w-0">
        <div className="text-[10px] uppercase tracking-[0.15em] font-black text-gray-400">{label}</div>
        <div className="text-sm font-bold text-gray-800 truncate">{value}</div>
      </div>
    </div>
  )
}
