import { useState, useCallback, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  MapPin, Send, ChevronRight, AlertCircle, Camera, X,
  Loader2, ExternalLink, FileText, ArrowLeft,
} from 'lucide-react'
import api from '../lib/api'
import { useAuth } from '../lib/auth'
import LocationPicker from '../components/LocationPicker'

/**
 * Phase machine that mirrors the WhatsApp flow's terminal actions defined in
 * backend/services/issueActions.js. The route AFTER sub-category branches on
 * optionObj.action.kind so each grievance type asks for only the fields that
 * specific issue needs — location-only, location+photo, description, or just
 * a URL/PDF resource pointer with no ticket created at all.
 */
const PHASE = {
  CATEGORY: 'category',
  OPTION:   'option',
  CTA:      'cta',      // for kind=url / kind=pdf  (no ticket)
  DETAILS:  'details',  // for kind=ticket / details_then_url
  LOCATION: 'location', // for both location flows
  PHOTO:    'photo',    // for location_photos_ticket
  CONFIRM:  'confirm',
}

// Ordered phase sequence per action kind — drives the progress bar and the
// "Back" buttons. CTA flows (url/pdf) terminate at the CTA step without
// hitting /portal/grievances.
const FLOWS = {
  url:                    [PHASE.CATEGORY, PHASE.OPTION, PHASE.CTA],
  pdf:                    [PHASE.CATEGORY, PHASE.OPTION, PHASE.CTA],
  ticket:                 [PHASE.CATEGORY, PHASE.OPTION, PHASE.DETAILS,  PHASE.CONFIRM],
  details_then_url:       [PHASE.CATEGORY, PHASE.OPTION, PHASE.DETAILS,  PHASE.CONFIRM],
  location_only_ticket:   [PHASE.CATEGORY, PHASE.OPTION, PHASE.LOCATION, PHASE.CONFIRM],
  location_photos_ticket: [PHASE.CATEGORY, PHASE.OPTION, PHASE.LOCATION, PHASE.PHOTO, PHASE.CONFIRM],
}

const LABELS = {
  url:                    ['Category', 'Issue', 'Resource'],
  pdf:                    ['Category', 'Issue', 'Document'],
  ticket:                 ['Category', 'Issue', 'Details',  'Done'],
  details_then_url:       ['Category', 'Issue', 'Details',  'Done'],
  location_only_ticket:   ['Category', 'Issue', 'Location', 'Done'],
  location_photos_ticket: ['Category', 'Issue', 'Location', 'Photo', 'Done'],
}

// Sensible default when an option has no action mapping (shouldn't normally
// happen, but keeps the wizard usable in that edge case).
const DEFAULT_KIND = 'ticket'

const MAX_IMAGE_BYTES = 10 * 1024 * 1024

export default function GrievanceHome() {
  const { user } = useAuth()
  const navigate = useNavigate()

  const [phase, setPhase] = useState(PHASE.CATEGORY)
  const [serviceObj, setServiceObj] = useState(null)
  const [optionObj, setOptionObj] = useState(null)
  const [location, setLocation] = useState({ text: '', lat: null, lng: null })
  const [description, setDescription] = useState('')
  const [image, setImage] = useState(null)
  const [imagePreview, setImagePreview] = useState(null)
  const [loading, setLoading] = useState(false)
  const [grievanceId, setGrievanceId] = useState(null)
  const [submitError, setSubmitError] = useState('')

  // Catalog fetched from /portal/services — same admin-uploaded icons that
  // drive the WhatsApp flow show up here, single source of truth.
  const [services, setServices] = useState([])
  const [catalogLoading, setCatalogLoading] = useState(true)
  const [catalogError, setCatalogError] = useState('')

  useEffect(() => {
    let alive = true
    setCatalogLoading(true); setCatalogError('')
    api.get('/portal/services')
      .then((res) => { if (alive) setServices(Array.isArray(res.data?.services) ? res.data.services : []) })
      .catch((err) => { if (alive) setCatalogError(err.response?.data?.error || 'Could not load services. Please retry in a moment.') })
      .finally(() => { if (alive) setCatalogLoading(false) })
    return () => { alive = false }
  }, [])

  const action = optionObj?.action || null
  const kind   = action?.kind || DEFAULT_KIND
  const flow   = FLOWS[kind]  || FLOWS[DEFAULT_KIND]
  const labels = LABELS[kind] || LABELS[DEFAULT_KIND]
  const stepIndex = Math.max(0, flow.indexOf(phase))

  /* ─── handlers ─────────────────────────────────────────────────── */

  const handleImageChange = (e) => {
    const file = e.target.files[0]
    if (!file) return
    if (file.size > MAX_IMAGE_BYTES) {
      alert('Image too large. Please select a photo smaller than 10MB.')
      e.target.value = ''
      return
    }
    setImage(file)
    setImagePreview(URL.createObjectURL(file))
  }

  const removeImage = () => {
    setImage(null); setImagePreview(null)
  }

  const handleLocationSelect = useCallback((loc) => setLocation(loc), [])

  // Wipe everything past sub-category so going Back never carries a stale
  // description / location / photo into a different action kind.
  const resetDownstream = () => {
    setLocation({ text: '', lat: null, lng: null })
    setDescription('')
    setImage(null); setImagePreview(null)
    setSubmitError('')
    setGrievanceId(null)
  }

  const pickService = (s) => {
    setServiceObj(s); setOptionObj(null); resetDownstream(); setPhase(PHASE.OPTION)
  }

  const pickOption = (o) => {
    setOptionObj(o); resetDownstream()
    const k = o.action?.kind || DEFAULT_KIND
    if (k === 'url' || k === 'pdf') setPhase(PHASE.CTA)
    else if (k === 'location_only_ticket' || k === 'location_photos_ticket') setPhase(PHASE.LOCATION)
    else setPhase(PHASE.DETAILS)
  }

  const submitTicket = async () => {
    if (!user) {
      alert('Please log in to submit a grievance.')
      navigate('/login')
      return
    }
    if (!serviceObj || !optionObj) return

    setLoading(true); setSubmitError('')
    try {
      const fd = new FormData()
      fd.append('serviceId',    serviceObj.id)
      fd.append('serviceTitle', serviceObj.title)
      fd.append('optionId',     optionObj.id)
      fd.append('optionTitle',  optionObj.title)
      fd.append('description',  description.trim())
      fd.append('location',     location.text || '')
      if (location.lat != null) fd.append('lat', location.lat)
      if (location.lng != null) fd.append('lng', location.lng)
      if (image) fd.append('image', image)

      const res = await api.post('/portal/grievances', fd, {
        headers: { 'Content-Type': 'multipart/form-data' },
      })
      setGrievanceId(res.data.grievanceId)
      setPhase(PHASE.CONFIRM)
    } catch (err) {
      setSubmitError(err.response?.data?.error || 'Failed to submit. Please check your connection and try again.')
    } finally {
      setLoading(false)
    }
  }

  /* ─── render ───────────────────────────────────────────────────── */

  return (
    <div className="max-w-2xl mx-auto px-4 py-6 md:py-10">
      {/* Adaptive progress bar — labels and length change with action.kind */}
      <div className="flex items-center justify-between mb-6">
        {labels.map((s, i) => (
          <div key={`${kind}-${i}-${s}`} className="flex items-center">
            <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold ${
              i <= stepIndex ? 'bg-navy text-white' : 'bg-gray-200 text-gray-500'
            } ${i === stepIndex ? 'ring-2 ring-navy/30 ring-offset-1' : ''}`}>
              {i < stepIndex ? '✓' : i + 1}
            </div>
            <span className={`ml-1 text-xs hidden lg:inline ${i <= stepIndex ? 'text-navy font-semibold' : 'text-gray-400'}`}>{s}</span>
            {i < labels.length - 1 && (
              <div className={`w-4 md:w-8 h-0.5 mx-1 ${i < stepIndex ? 'bg-navy' : 'bg-gray-200'}`}></div>
            )}
          </div>
        ))}
      </div>

      {/* ── PHASE: CATEGORY ─────────────────────────────────────── */}
      {phase === PHASE.CATEGORY && (
        <div className="card p-6">
          <h2 className="text-lg font-bold text-navy font-serif mb-2">📋 Step 1: Select Category</h2>
          <p className="text-sm text-gray-500 mb-6">Choose the department / type of issue you want to report</p>

          {catalogLoading && (
            <div className="flex items-center justify-center py-12 text-gray-400">
              <Loader2 className="w-5 h-5 animate-spin mr-2" />
              <span className="text-sm">Loading services…</span>
            </div>
          )}

          {!catalogLoading && catalogError && (
            <div className="flex items-start gap-2 bg-red-50 border border-red-200 text-red-700 rounded-lg p-4">
              <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
              <div className="text-sm">{catalogError}</div>
            </div>
          )}

          {!catalogLoading && !catalogError && (
            <div className="grid sm:grid-cols-2 gap-3">
              {services.map((s) => (
                <button
                  key={s.id}
                  onClick={() => pickService(s)}
                  className="w-full text-left p-4 border border-gray-200 rounded-xl hover:border-navy hover:bg-navy/5 transition-all flex items-start gap-3 group bg-white shadow-sm hover:shadow-md"
                >
                  <div className="w-12 h-12 rounded-xl bg-gray-50 flex items-center justify-center overflow-hidden group-hover:scale-110 transition-transform flex-shrink-0 p-1 border border-gray-100">
                    {s.iconUrl ? (
                      <img src={s.iconUrl} alt={s.title} className="w-full h-full object-contain" loading="lazy" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center bg-navy/5 text-navy text-sm font-bold">
                        {s.title?.charAt(0) || '?'}
                      </div>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-bold text-navy text-sm mb-0.5 flex items-center justify-between">
                      <span className="truncate">{s.title}</span>
                      <ChevronRight className="w-4 h-4 text-gray-300 group-hover:text-navy group-hover:translate-x-1 transition-all flex-shrink-0" />
                    </h3>
                    <p className="text-[11px] text-gray-500 leading-tight">{s.description}</p>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── PHASE: OPTION (sub-category) ─────────────────────────── */}
      {phase === PHASE.OPTION && serviceObj && (
        <div className="card p-6">
          <h2 className="text-lg font-bold text-navy font-serif mb-2">🔍 Step 2: Select Issue Type</h2>
          <p className="text-sm text-gray-500 mb-4">Choose the specific issue under <strong>{serviceObj.title}</strong></p>

          {serviceObj.bannerUrl && (
            <div className="mb-4 rounded-2xl overflow-hidden border border-gray-100 bg-gray-50">
              <img src={serviceObj.bannerUrl} alt={`${serviceObj.title} banner`} className="w-full h-32 object-cover" loading="lazy" />
            </div>
          )}

          <div className="space-y-3 max-h-[450px] overflow-y-auto pr-2 custom-scrollbar">
            {(serviceObj.options || []).map((opt, i) => (
              <button
                key={opt.id}
                onClick={() => pickOption(opt)}
                className="w-full text-left p-4 border border-gray-200 rounded-2xl hover:border-navy hover:bg-navy/5 transition-all flex items-center gap-4 group bg-white shadow-sm hover:shadow-md"
              >
                <div className="w-12 h-12 rounded-xl bg-gray-50 flex items-center justify-center overflow-hidden group-hover:scale-105 transition-transform flex-shrink-0 p-1 border border-gray-100">
                  {opt.iconUrl ? (
                    <img src={opt.iconUrl} alt={opt.title} className="w-full h-full object-contain" loading="lazy" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center bg-navy/5 text-navy text-xs font-bold">
                      {i + 1}
                    </div>
                  )}
                </div>
                <div className="flex-1">
                  <div className="font-bold text-sm text-navy mb-0.5">{opt.title}</div>
                  <div className="text-[11px] text-gray-500">{opt.description}</div>
                </div>
                <ChevronRight className="w-4 h-4 text-gray-200 group-hover:text-navy group-hover:translate-x-1 transition-all" />
              </button>
            ))}
          </div>

          <button onClick={() => setPhase(PHASE.CATEGORY)} className="mt-4 text-xs text-navy hover:underline">
            ← Back to Categories
          </button>
        </div>
      )}

      {/* ── PHASE: CTA (url / pdf — no ticket) ───────────────────── */}
      {phase === PHASE.CTA && optionObj && action && (
        <div className="card p-6">
          <h2 className="text-lg font-bold text-navy font-serif mb-2">
            {kind === 'pdf' ? '📄 Download Document' : '🔗 Open Service Portal'}
          </h2>
          <p className="text-sm text-gray-500 mb-4">{optionObj.title}</p>

          {action.headerUrl && (
            <div className="mb-4 rounded-2xl overflow-hidden border border-gray-100 bg-gray-50">
              <img src={action.headerUrl} alt={optionObj.title} className="w-full h-40 object-cover" loading="lazy" />
            </div>
          )}

          <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 text-sm text-gray-700 mb-4">
            {kind === 'pdf'
              ? 'Open the official document below for application details, required forms, and contact numbers.'
              : 'Use the official government portal below to apply, check status, or get more information.'}
          </div>

          <div className="flex flex-col sm:flex-row gap-3">
            <button onClick={() => setPhase(PHASE.OPTION)} className="btn-outline text-sm flex items-center justify-center gap-2">
              <ArrowLeft className="w-4 h-4" /> Back
            </button>
            <a
              href={kind === 'pdf' ? action.pdfUrl : action.url}
              target="_blank"
              rel="noopener noreferrer"
              className={`btn-primary text-sm flex-1 flex items-center justify-center gap-2 ${
                (kind === 'pdf' && !action.pdfUrl) || (kind === 'url' && !action.url)
                  ? 'opacity-50 pointer-events-none' : ''
              }`}
            >
              {kind === 'pdf' ? (
                <><FileText className="w-4 h-4" /> Open PDF</>
              ) : (
                <><ExternalLink className="w-4 h-4" /> {action.ctaLabel || 'Open Portal'}</>
              )}
            </a>
          </div>

          {kind === 'pdf' && !action.pdfUrl && (
            <p className="mt-3 text-xs text-saffron">PDF not yet uploaded. Please contact MLA's office.</p>
          )}
          {kind === 'url' && !action.url && (
            <p className="mt-3 text-xs text-saffron">Resource link unavailable. Please contact MLA's office.</p>
          )}
        </div>
      )}

      {/* ── PHASE: DETAILS (description + optional photo) ────────── */}
      {phase === PHASE.DETAILS && optionObj && (
        <div className="card p-6">
          <h2 className="text-lg font-bold text-navy font-serif mb-2">💬 Describe Your Issue</h2>
          <p className="text-sm text-gray-500 mb-4">{optionObj.title}</p>

          {action?.headerUrl && (
            <div className="mb-4 rounded-2xl overflow-hidden border border-gray-100 bg-gray-50">
              <img src={action.headerUrl} alt={optionObj.title} className="w-full h-32 object-cover" loading="lazy" />
            </div>
          )}

          <div className="relative">
            <textarea
              className="input-field h-32 resize-none"
              placeholder="Describe the problem clearly..."
              value={description}
              onChange={(e) => e.target.value.length <= 500 && setDescription(e.target.value)}
              autoFocus
            />
            <span className={`absolute bottom-2 right-3 text-xs ${description.length > 400 ? 'text-saffron font-semibold' : 'text-gray-400'}`}>
              {description.length}/500
            </span>
          </div>

          <div className="mt-4">
            <label className="block text-xs font-semibold text-gray-600 uppercase tracking-wide mb-2">
              📷 Attach Photo <span className="text-gray-400 font-normal normal-case">(optional, max 10MB)</span>
            </label>
            {imagePreview ? (
              <div className="relative inline-block">
                <img src={imagePreview} alt="Preview" className="w-full max-h-48 object-cover rounded-lg border border-gray-200" />
                <button
                  type="button"
                  onClick={removeImage}
                  className="absolute top-2 right-2 w-6 h-6 rounded-full bg-red-500 text-white flex items-center justify-center shadow-md hover:bg-red-600"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            ) : (
              <label className="flex items-center justify-center gap-2 border-2 border-dashed border-gray-300 rounded-lg p-6 cursor-pointer hover:border-navy hover:bg-navy/5 transition-all">
                <Camera className="w-5 h-5 text-gray-400" />
                <span className="text-sm text-gray-500">Click to upload issue photo</span>
                <input type="file" accept="image/*" className="hidden" onChange={handleImageChange} />
              </label>
            )}
          </div>

          {submitError && (
            <div className="mt-4 flex items-start gap-2 bg-red-50 border border-red-200 text-red-700 rounded-lg p-3">
              <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
              <span className="text-xs">{submitError}</span>
            </div>
          )}

          <div className="flex gap-3 mt-6">
            <button onClick={() => setPhase(PHASE.OPTION)} className="btn-outline text-sm flex-1">← Back</button>
            <button
              onClick={submitTicket}
              className="btn-primary text-sm flex-1 flex items-center justify-center gap-2"
              disabled={loading || !description.trim()}
            >
              {loading ? (
                <><Loader2 className="w-4 h-4 animate-spin" /> Submitting…</>
              ) : (
                <><Send className="w-4 h-4" /> Submit</>
              )}
            </button>
          </div>
        </div>
      )}

      {/* ── PHASE: LOCATION ──────────────────────────────────────── */}
      {phase === PHASE.LOCATION && optionObj && (
        <div className="card p-6">
          <h2 className="text-lg font-bold text-navy font-serif mb-2">📍 Share Issue Location</h2>
          <p className="text-sm text-gray-500 mb-4">{optionObj.title}</p>

          {action?.headerUrl && (
            <div className="mb-4 rounded-2xl overflow-hidden border border-gray-100 bg-gray-50">
              <img src={action.headerUrl} alt={optionObj.title} className="w-full h-32 object-cover" loading="lazy" />
            </div>
          )}

          <LocationPicker onLocationSelect={handleLocationSelect} />

          {location.text && (
            <div className="mt-4 bg-green-50 border border-green-200 rounded-lg p-3 flex items-center gap-2">
              <MapPin className="w-4 h-4 text-tvk-green flex-shrink-0" />
              <span className="text-sm text-green-700">{location.text}</span>
            </div>
          )}

          {submitError && (
            <div className="mt-4 flex items-start gap-2 bg-red-50 border border-red-200 text-red-700 rounded-lg p-3">
              <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
              <span className="text-xs">{submitError}</span>
            </div>
          )}

          <div className="flex gap-3 mt-6">
            <button onClick={() => setPhase(PHASE.OPTION)} className="btn-outline text-sm flex-1">← Back</button>
            {kind === 'location_photos_ticket' ? (
              <button
                onClick={() => setPhase(PHASE.PHOTO)}
                className="btn-primary text-sm flex-1"
                disabled={!location.text}
              >
                Next: Add Photo →
              </button>
            ) : (
              <button
                onClick={submitTicket}
                className="btn-primary text-sm flex-1 flex items-center justify-center gap-2"
                disabled={loading || !location.text}
              >
                {loading ? (
                  <><Loader2 className="w-4 h-4 animate-spin" /> Submitting…</>
                ) : (
                  <><Send className="w-4 h-4" /> Submit</>
                )}
              </button>
            )}
          </div>
        </div>
      )}

      {/* ── PHASE: PHOTO (required for location_photos_ticket) ───── */}
      {phase === PHASE.PHOTO && optionObj && (
        <div className="card p-6">
          <h2 className="text-lg font-bold text-navy font-serif mb-2">📷 Attach Photo</h2>
          <p className="text-sm text-gray-500 mb-4">A photo helps the MLA's team verify and act faster. At least one is required.</p>

          {imagePreview ? (
            <div className="relative inline-block w-full">
              <img src={imagePreview} alt="Preview" className="w-full max-h-72 object-cover rounded-lg border border-gray-200" />
              <button
                type="button"
                onClick={removeImage}
                className="absolute top-2 right-2 w-7 h-7 rounded-full bg-red-500 text-white flex items-center justify-center shadow-md hover:bg-red-600"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <label className="flex flex-col items-center justify-center gap-2 border-2 border-dashed border-gray-300 rounded-lg p-10 cursor-pointer hover:border-navy hover:bg-navy/5 transition-all">
              <Camera className="w-8 h-8 text-gray-400" />
              <span className="text-sm text-gray-500">Click to upload issue photo</span>
              <span className="text-[11px] text-gray-400">PNG / JPG, max 10 MB</span>
              <input type="file" accept="image/*" className="hidden" onChange={handleImageChange} />
            </label>
          )}

          <div className="mt-4 bg-gray-50 rounded-lg p-3 text-xs text-gray-600 space-y-1">
            <div><strong>Issue:</strong> {optionObj.title}</div>
            <div><strong>Location:</strong> {location.text}</div>
          </div>

          {submitError && (
            <div className="mt-4 flex items-start gap-2 bg-red-50 border border-red-200 text-red-700 rounded-lg p-3">
              <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
              <span className="text-xs">{submitError}</span>
            </div>
          )}

          <div className="flex gap-3 mt-6">
            <button onClick={() => setPhase(PHASE.LOCATION)} className="btn-outline text-sm flex-1">← Back</button>
            <button
              onClick={submitTicket}
              className="btn-primary text-sm flex-1 flex items-center justify-center gap-2"
              disabled={loading || !image}
            >
              {loading ? (
                <><Loader2 className="w-4 h-4 animate-spin" /> Submitting…</>
              ) : (
                <><Send className="w-4 h-4" /> Submit</>
              )}
            </button>
          </div>
        </div>
      )}

      {/* ── PHASE: CONFIRM ───────────────────────────────────────── */}
      {phase === PHASE.CONFIRM && (
        <div className="card p-6">
          <div className="text-center mb-6">
            <div className="text-4xl mb-3">📬</div>
            <h2 className="text-lg font-bold text-tvk-green font-serif">Grievance Successfully Registered!</h2>
          </div>

          <div className="bg-green-50 border border-green-200 rounded-lg p-5">
            <div className="text-lg font-extrabold text-tvk-green mb-3">✅ Reference ID: #{grievanceId}</div>
            <div className="text-sm text-green-800 space-y-1">
              <div><strong>Category:</strong> {serviceObj?.title}</div>
              <div><strong>Issue:</strong> {optionObj?.title}</div>
              {location.text && <div><strong>Location:</strong> {location.text}</div>}
              {description.trim() && (
                <div>
                  <strong>Your Message:</strong>{' '}
                  "{description.substring(0, 100)}{description.length > 100 ? '…' : ''}"
                </div>
              )}
            </div>

            <div className="mt-4 bg-white border border-green-200 rounded-lg p-3 flex items-center gap-2">
              <span className="text-sm text-tvk-green">⏱ MLA Venkatramanan's office will respond within <strong>7 working days</strong></span>
            </div>

            <div className="mt-4">
              <div className="flex justify-between text-xs text-gray-500 mb-1">
                <span>Status</span><span>Received</span>
              </div>
              <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                <div className="h-full bg-saffron rounded-full w-[12%]"></div>
              </div>
              <div className="flex justify-between text-xs text-gray-400 mt-1">
                <span>✅ Received</span><span>Under Review</span><span>Action Taken</span><span>Resolved</span>
              </div>
            </div>
          </div>

          {/* For details_then_url options, mirror the WhatsApp bot's bonus URL
              CTA — ticket is created AND the related portal is offered. */}
          {kind === 'details_then_url' && action?.url && (
            <a
              href={action.url}
              target="_blank"
              rel="noopener noreferrer"
              className="btn-outline text-sm w-full mt-4 flex items-center justify-center gap-2"
            >
              <ExternalLink className="w-4 h-4" /> {action.ctaLabel || 'Open Related Portal'}
            </a>
          )}

          <div className="grid grid-cols-2 gap-3 mt-6">
            <button onClick={() => navigate('/my-grievances')} className="btn-outline text-sm">
              📂 My Grievances
            </button>
            <button
              onClick={() => {
                setPhase(PHASE.CATEGORY)
                setServiceObj(null); setOptionObj(null)
                resetDownstream()
              }}
              className="btn-primary text-sm"
            >
              ➕ Raise Another
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
