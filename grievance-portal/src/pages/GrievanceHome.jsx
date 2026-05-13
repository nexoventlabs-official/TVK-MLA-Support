import { useState, useCallback, useEffect, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  MapPin, Send, ChevronRight, AlertCircle, Camera, X,
  Loader2, ExternalLink, FileText, CheckCircle2, ArrowLeft,
  Pencil,
} from 'lucide-react'
import api from '../lib/api'
import { useAuth } from '../lib/auth'
import LocationPicker from '../components/LocationPicker'

/**
 * Multi-screen grievance flow.
 *
 * The page lives at a single route (`/grievance`) but renders three distinct
 * full-bleed screens depending on `screen` state — category → issue → details
 * — mimicking a multi-page wizard without nested routing. The browser Back
 * button is wired up via `window.history.pushState` so users can return to
 * the previous screen the way they would on a real multi-page app.
 *
 * Visual language matches the login page: off-white `#fdfdfd` canvas, gold
 * `#E5C77A` accent buttons, deep red `#990000` brand text. No heavy red
 * section blocks.
 *
 * Backend contract is untouched: same `GET /portal/services` fetch and same
 * multipart `POST /portal/grievances` payload (serviceId, serviceTitle,
 * optionId, optionTitle, description, location, lat, lng, image). Required
 * fields per `action.kind` match `backend/services/issueActions.js`.
 */

const DEFAULT_KIND = 'ticket'
const MAX_IMAGE_BYTES = 10 * 1024 * 1024

/**
 * Field requirements per action kind, kept in lock-step with the WhatsApp
 * Flow contract (`backend/services/issueActions.js` and the DETAILS schema
 * at `backend/services/flowJson.js`). The keys are:
 *
 *   description  — required textarea
 *   location     — required map picker (live geo)
 *   locationText — optional free-text Location / Address field (mirrors
 *                  the WhatsApp DETAILS form's optional `location` input)
 *   photo        — required photo upload
 *   ticket       — whether this option creates a ticket at all
 *
 * IMPORTANT: keep this table aligned with the WhatsApp flow. Adding an
 * extra field here that the bot does not collect creates a UX divergence
 * (e.g. previously the web asked for a photo on `details_then_url` issues
 * like "New PHC" while the bot did not).
 */
const KIND_NEEDS = {
  url:                    { description: false, location: false, locationText: false, photo: false, ticket: false },
  pdf:                    { description: false, location: false, locationText: false, photo: false, ticket: false },
  ticket:                 { description: true,  location: false, locationText: true,  photo: false, ticket: true  },
  details_then_url:       { description: true,  location: false, locationText: true,  photo: false, ticket: true  },
  location_only_ticket:   { description: false, location: true,  locationText: false, photo: false, ticket: true  },
  location_photos_ticket: { description: false, location: true,  locationText: false, photo: true,  ticket: true  },
}

const SCREEN = {
  CATEGORY: 'category',
  DETAILS:  'details',
  SUCCESS:  'success',
}

export default function GrievanceHome() {
  const { user } = useAuth()
  const navigate = useNavigate()

  /* ─── state ────────────────────────────────────────────────────── */

  const [screen, setScreen] = useState(SCREEN.CATEGORY)
  const [serviceObj, setServiceObj] = useState(null)
  const [optionObj,  setOptionObj]  = useState(null)
  const [location,   setLocation]   = useState({ text: '', lat: null, lng: null })
  const [description, setDescription] = useState('')
  // Issue-specific extra field. Currently only `education.mid_day_meal_issue`
  // collects this (matches the WhatsApp DETAILS form at flowJson.js).
  const [schoolName,  setSchoolName]  = useState('')
  const [image,        setImage]        = useState(null)
  const [imagePreview, setImagePreview] = useState(null)
  const [loading,      setLoading]      = useState(false)
  const [submitError,  setSubmitError]  = useState('')
  const [grievanceId,  setGrievanceId]  = useState(null)

  const [services,       setServices]       = useState([])
  const [catalogLoading, setCatalogLoading] = useState(true)
  const [catalogError,   setCatalogError]   = useState('')

  useEffect(() => {
    let alive = true
    setCatalogLoading(true); setCatalogError('')
    api.get('/portal/services')
      .then((res) => { 
        if (alive) {
          const loadedServices = Array.isArray(res.data?.services) ? res.data.services : []
          setServices(loadedServices)
          // Automatically select the first category if none is selected
          if (loadedServices.length > 0 && !serviceObj) {
            setServiceObj(loadedServices[0])
          }
        }
      })
      .catch((err) => { if (alive) setCatalogError(err.response?.data?.error || 'Could not load services. Please retry in a moment.') })
      .finally(() => { if (alive) setCatalogLoading(false) })
    return () => { alive = false }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // Scroll to top on every screen change so the new "page" reads from the top.
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'instant' in window ? 'instant' : 'auto' })
  }, [screen])

  /* ─── derived ──────────────────────────────────────────────────── */

  const action = optionObj?.action || null
  const kind   = action?.kind || DEFAULT_KIND
  const needs  = KIND_NEEDS[kind] || KIND_NEEDS[DEFAULT_KIND]

  const canSubmit = useMemo(() => {
    if (!serviceObj || !optionObj) return false
    if (!needs.ticket) return false
    if (needs.description && !description.trim()) return false
    if (needs.location && !location.text) return false
    if (needs.photo && !image) return false
    return true
  }, [serviceObj, optionObj, needs, description, location.text, image])

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

  const removeImage = () => { setImage(null); setImagePreview(null) }
  const handleLocationSelect = useCallback((loc) => setLocation(loc), [])

  const resetDownstream = () => {
    setLocation({ text: '', lat: null, lng: null })
    setDescription('')
    setSchoolName('')
    setImage(null); setImagePreview(null)
    setSubmitError('')
  }

  const pickService = (s) => {
    setServiceObj(s)
    setOptionObj(null)
    resetDownstream()
  }

  const pickOption = (o) => {
    setOptionObj(o)
    resetDownstream()
    setScreen(SCREEN.DETAILS)
  }

  const backToCategory = () => {
    setOptionObj(null)
    resetDownstream()
    setScreen(SCREEN.CATEGORY)
  }

  const backToIssue = () => {
    setOptionObj(null)
    resetDownstream()
    setScreen(SCREEN.CATEGORY)
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
      if (schoolName.trim()) fd.append('schoolName', schoolName.trim())
      fd.append('location',     location.text || '')
      if (location.lat != null) fd.append('lat', location.lat)
      if (location.lng != null) fd.append('lng', location.lng)
      if (image) fd.append('image', image)

      const res = await api.post('/portal/grievances', fd, {
        headers: { 'Content-Type': 'multipart/form-data' },
      })
      setGrievanceId(res.data.grievanceId)
      setScreen(SCREEN.SUCCESS)
    } catch (err) {
      setSubmitError(err.response?.data?.error || 'Failed to submit. Please check your connection and try again.')
    } finally {
      setLoading(false)
    }
  }

  const resetForNewGrievance = () => {
    setGrievanceId(null)
    setServiceObj(null)
    setOptionObj(null)
    resetDownstream()
    setScreen(SCREEN.CATEGORY)
  }

  /* ─── render ───────────────────────────────────────────────────── */

  return (
    <div className="min-h-[calc(100vh-64px)] bg-[#fdfdfd]">


      {/* Screen body — edge to edge, internal padding only */}
      <main className="w-full px-4 sm:px-8 lg:px-12 py-8 md:py-10">
        {screen === SCREEN.CATEGORY && (
          <SelectionScreen
            services={services}
            activeService={serviceObj}
            loading={catalogLoading}
            error={catalogError}
            onPickService={pickService}
            onPickOption={pickOption}
          />
        )}

        {screen === SCREEN.DETAILS && optionObj && (
          <DetailsScreen
            service={serviceObj}
            option={optionObj}
            action={action}
            kind={kind}
            needs={needs}
            description={description}
            setDescription={setDescription}
            schoolName={schoolName}
            setSchoolName={setSchoolName}
            location={location}
            onLocationSelect={handleLocationSelect}
            imagePreview={imagePreview}
            onImageChange={handleImageChange}
            onImageRemove={removeImage}
            submitError={submitError}
            loading={loading}
            canSubmit={canSubmit}
            onSubmit={submitTicket}
            onBack={backToIssue}
            onChangeCategory={backToCategory}
          />
        )}

        {screen === SCREEN.SUCCESS && (
          <SuccessScreen
            grievanceId={grievanceId}
            service={serviceObj}
            option={optionObj}
            location={location}
            description={description}
            schoolName={schoolName}
            kind={kind}
            action={action}
            onAnother={resetForNewGrievance}
            onMine={() => navigate('/my-grievances')}
          />
        )}
      </main>
    </div>
  )
}

/* ════════════════════════════════════════════════════════════════ */
/*  SCREEN: 1. SELECTION (Categories + Issues)                       */
/* ════════════════════════════════════════════════════════════════ */

function SelectionScreen({ services, activeService, loading, error, onPickService, onPickOption }) {
  return (
    <section>
      {loading && (
        <div className="flex items-center justify-center py-20 text-gray-400">
          <Loader2 className="w-5 h-5 animate-spin mr-2" />
          <span className="text-sm">Loading services…</span>
        </div>
      )}

      {!loading && error && (
        <div className="flex items-start gap-2 bg-red-50 border border-red-200 text-red-700 rounded-lg p-4 max-w-2xl">
          <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
          <div className="text-sm">{error}</div>
        </div>
      )}

      {!loading && !error && services.length > 0 && (
        <>
          <div className="mb-8">
            <h2 className="text-2xl md:text-3xl font-black text-gray-800 tracking-tight mb-6 text-center">
              Select a Category
            </h2>
            {/* Wrapped Categories without boxes */}
            <div className="flex flex-wrap justify-center gap-x-4 gap-y-6 md:gap-x-8 mb-4">
              {services.map((s) => {
                const isActive = activeService?.id === s.id;
                return (
                  <button
                    key={s.id}
                    onClick={() => onPickService(s)}
                    className="group shrink-0 flex flex-col items-center justify-start gap-2 w-[72px] sm:w-[80px] md:w-[90px] transition-all bg-transparent"
                  >
                    <div className={`w-14 h-14 md:w-16 md:h-16 rounded-full flex items-center justify-center overflow-hidden transition-all duration-300 ${
                      isActive 
                        ? 'ring-2 ring-[#990000] ring-offset-2 bg-white shadow-md transform scale-110' 
                        : 'border border-gray-200 bg-white group-hover:border-[#E5C77A] group-hover:shadow-sm'
                    }`}>
                      {s.iconUrl ? (
                        <img src={s.iconUrl} alt={s.title} className="w-full h-full object-cover" />
                      ) : (
                        <span className={`text-lg font-bold ${isActive ? 'text-[#990000]' : 'text-gray-500'}`}>
                          {s.title?.charAt(0)}
                        </span>
                      )}
                    </div>
                    <span className={`font-bold text-center text-[11px] md:text-[12px] leading-tight break-words whitespace-normal transition-colors ${
                      isActive ? 'text-[#990000]' : 'text-gray-600 group-hover:text-gray-900'
                    }`}>
                      {s.title}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Issues Grid for Active Service */}
          {activeService && (
            <div className="mt-8 pt-8 border-t border-gray-100">
              <div className="mb-8 max-w-3xl mx-auto text-center">
                <h3 className="text-xl md:text-2xl font-black text-gray-800 tracking-tight mb-2">
                  Choose the specific issue
                </h3>
                <p className="text-gray-500 text-sm md:text-base">
                  What kind of <strong className="text-gray-800">{activeService.title}</strong> issue are you reporting?
                </p>
              </div>

              {activeService.bannerUrl && (
                <div className="mb-6 rounded-2xl overflow-hidden border border-gray-200 bg-white max-w-5xl">
                  <img
                    src={activeService.bannerUrl}
                    alt={`${activeService.title} banner`}
                    className="w-full h-40 md:h-48 object-cover"
                    loading="lazy"
                  />
                </div>
              )}

              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 md:gap-5">
                {(activeService.options || []).map((opt, i) => (
                  <GridCard
                    key={opt.id}
                    iconUrl={opt.iconUrl}
                    fallbackInitial={String(i + 1)}
                    title={opt.title}
                    subtitle={opt.description}
                    onClick={() => onPickOption(opt)}
                  />
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </section>
  )
}

/* ════════════════════════════════════════════════════════════════ */
/*  SCREEN: 3. DETAILS                                               */
/* ════════════════════════════════════════════════════════════════ */

function DetailsScreen({
  service, option, action, kind, needs,
  description, setDescription,
  schoolName, setSchoolName,
  location, onLocationSelect,
  imagePreview, onImageChange, onImageRemove,
  submitError, loading, canSubmit, onSubmit,
  onBack, onChangeCategory,
}) {
  // Issue-specific extra fields. Today only the mid-day-meal issue collects
  // the school name (matches the WhatsApp DETAILS form). If the catalog grows
  // to need more option-keyed extras, extend this gate here.
  const showSchoolName = option?.id === 'mid_day_meal_issue'
  // CTA-only flows (url / pdf) — no ticket created.
  if (!needs.ticket) {
    return (
      <section>
        <button
          onClick={onBack}
          className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-800 font-semibold mb-6 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" /> Back to issues
        </button>

        <div className="mb-6 max-w-3xl">
          <p className="text-[11px] font-bold uppercase tracking-[3px] text-[#990000] mb-1">
            Resource
          </p>
          <h2 className="text-2xl md:text-3xl font-black text-gray-800 tracking-tight mb-2">
            {kind === 'pdf' ? 'Download the official document' : 'Open the service portal'}
          </h2>
          <p className="text-gray-500 text-sm md:text-base">
            This issue doesn't need a ticket. Use the official resource below.
          </p>
        </div>

        <div className="max-w-2xl bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
          {action?.headerUrl && (
            <img
              src={action.headerUrl}
              alt={option.title}
              className="w-full h-44 object-cover"
              loading="lazy"
            />
          )}
          <div className="p-6">
            <p className="text-xs font-bold uppercase tracking-wider text-gray-400 mb-1">
              {service.title}
            </p>
            <h3 className="text-lg font-bold text-gray-800 mb-3">{option.title}</h3>
            <p className="text-sm text-gray-500 mb-5 leading-relaxed">
              {kind === 'pdf'
                ? 'Open the official document below for application details, required forms, and contact numbers.'
                : 'Use the official government portal below to apply, check status, or get more information.'}
            </p>

            <a
              href={kind === 'pdf' ? action?.pdfUrl : action?.url}
              target="_blank"
              rel="noopener noreferrer"
              className={`w-full flex items-center justify-center gap-2 py-3.5 px-4 rounded-md text-sm font-bold text-[#990000] bg-[#FFD700] hover:bg-[#E6C200] transition-all shadow-sm ${
                (kind === 'pdf' && !action?.pdfUrl) || (kind === 'url' && !action?.url)
                  ? 'opacity-50 pointer-events-none' : ''
              }`}
            >
              {kind === 'pdf' ? (
                <><FileText className="w-4 h-4" /> Open PDF</>
              ) : (
                <><ExternalLink className="w-4 h-4" /> {action?.ctaLabel || 'Open Portal'}</>
              )}
            </a>

            {kind === 'pdf' && !action?.pdfUrl && (
              <p className="mt-3 text-xs text-[#990000]">PDF not yet uploaded. Please contact MLA's office.</p>
            )}
            {kind === 'url' && !action?.url && (
              <p className="mt-3 text-xs text-[#990000]">Resource link unavailable. Please contact MLA's office.</p>
            )}
          </div>
        </div>
      </section>
    )
  }

  // Ticket-creating flows.
  return (
    <section className="-mt-8 md:-mt-10 -mx-4 sm:-mx-8 lg:-mx-12">

      {/* ─── Full-bleed hero banner ──────────────────────────────────
          The admin-uploaded `header_*` Cloudinary image is rendered
          uncropped via `object-contain` so the whole banner is always
          visible. A blurred copy fills the letterbox so the area never
          looks empty when the banner aspect ratio differs from the
          frame's 3:1. */}
      <header className="relative w-full bg-gradient-to-br from-gray-100 via-white to-gray-100 border-b border-gray-200 overflow-hidden">
        {action?.headerUrl ? (
          <div className="relative w-full aspect-[1200/400] max-h-[360px]">
            <img
              src={action.headerUrl}
              alt=""
              aria-hidden
              className="absolute inset-0 w-full h-full object-cover scale-110 blur-2xl opacity-40"
            />
            <img
              src={action.headerUrl}
              alt={option.title}
              className="relative w-full h-full object-contain mx-auto"
              loading="lazy"
            />
          </div>
        ) : (
          <div className="h-24 md:h-32 grid place-items-center">
            <span className="text-[10px] font-black uppercase tracking-[3px] text-gray-400">
              {service.title} · {option.title}
            </span>
          </div>
        )}

        {/* Floating Back chip — anchored to the banner so it never feels orphaned. */}
        <button
          onClick={onBack}
          className="absolute top-3 left-3 sm:top-4 sm:left-4 inline-flex items-center gap-1.5 bg-white/95 backdrop-blur-sm border border-gray-200 px-3 py-1.5 rounded-full text-xs font-bold text-gray-700 hover:text-[#990000] hover:border-[#990000]/30 transition-colors shadow-sm z-10"
        >
          <ArrowLeft className="w-3.5 h-3.5" /> Back to issues
        </button>

        {/* Step pill — anchored top-right, mirrors the back chip. */}
        <span className="absolute top-3 right-3 sm:top-4 sm:right-4 inline-flex items-center gap-1.5 bg-[#990000] text-white px-3 py-1.5 rounded-full text-[10px] font-black uppercase tracking-[2px] shadow-sm z-10">
          Step 3 of 3
        </span>
      </header>

      {/* ─── Page body — restore the parent padding inside a constrained wrapper ─── */}
      <div className="max-w-7xl mx-auto px-4 sm:px-8 lg:px-12 pt-8 md:pt-10 pb-10">

        {/* Title block */}
        <div className="mb-6 max-w-3xl">
          <p className="text-[11px] font-bold uppercase tracking-[3px] text-[#990000] mb-1.5">
            {service.title}
          </p>
          <h2 className="text-2xl md:text-3xl lg:text-4xl font-black text-gray-900 tracking-tight mb-2">
            {option.title}
          </h2>
          <p className="text-gray-500 text-sm md:text-base">
            Fill in the fields below — required fields are marked.
          </p>
        </div>

        {/* Selection chips (edit) */}
        <div className="flex flex-wrap items-center gap-2 mb-8">
          <SelectionChip
            iconUrl={service.iconUrl}
            fallbackInitial={service.title?.charAt(0) || '?'}
            label={service.title}
            onChange={onChangeCategory}
          />
          <ChevronRight className="w-4 h-4 text-gray-300" />
          <SelectionChip
            iconUrl={option.iconUrl}
            fallbackInitial="?"
            label={option.title}
            onChange={onBack}
          />
        </div>

        {/* 2-column desktop / 1-column mobile — form on left, summary on right */}
        <div className="grid lg:grid-cols-3 gap-6 md:gap-8">
          <div className="lg:col-span-2 space-y-6">

            {needs.description && (
            <FieldCard label="Description" required hint="Describe the issue in detail so we can act on it faster.">
              <div className="relative">
                <textarea
                  className="w-full bg-gray-100/50 border-2 border-gray-200 rounded-md px-4 py-3 text-sm h-36 resize-none focus:outline-none focus:border-[#E5C77A] transition-colors text-gray-800"
                  placeholder="Describe the problem clearly…"
                  value={description}
                  onChange={(e) => e.target.value.length <= 500 && setDescription(e.target.value)}
                />
                <span className={`absolute bottom-2 right-3 text-xs ${description.length > 400 ? 'text-[#990000] font-semibold' : 'text-gray-400'}`}>
                  {description.length}/500
                </span>
              </div>
            </FieldCard>
          )}

          {/* Mid-day-meal issue specific extra — mirrors the WhatsApp form. */}
          {showSchoolName && (
            <FieldCard
              label="School name"
              hint="Which school is this about? Helps us route the request to the right Education officer."
            >
              <input
                type="text"
                className="w-full bg-gray-100/50 border-2 border-gray-200 rounded-md px-4 py-3 text-sm focus:outline-none focus:border-[#E5C77A] transition-colors text-gray-800"
                placeholder="e.g. Govt. Higher Secondary School, Mylapore"
                value={schoolName}
                onChange={(e) => e.target.value.length <= 200 && setSchoolName(e.target.value)}
                maxLength={200}
              />
            </FieldCard>
          )}

          {/* Optional free-text location for ticket / details_then_url kinds.
              Matches the WhatsApp DETAILS form's optional `location` input —
              user types a village / town / address rather than dropping a pin. */}
          {needs.locationText && (
            <FieldCard label="Location / Address" hint="Optional — village, town, or area where this issue is happening.">
              <input
                type="text"
                className="w-full bg-gray-100/50 border-2 border-gray-200 rounded-md px-4 py-3 text-sm focus:outline-none focus:border-[#E5C77A] transition-colors text-gray-800"
                placeholder="e.g. Mylapore, Chennai"
                value={location.text}
                onChange={(e) => e.target.value.length <= 200 && onLocationSelect({ text: e.target.value, lat: null, lng: null })}
                maxLength={200}
              />
            </FieldCard>
          )}

          {needs.location && (
            <FieldCard label="Location" required hint="Pin the issue on the map or share your live location.">
              <LocationPicker onLocationSelect={onLocationSelect} />
              {location.text && (
                <div className="mt-3 bg-green-50 border border-green-200 rounded-lg p-3 flex items-center gap-2">
                  <MapPin className="w-4 h-4 text-tvk-green flex-shrink-0" />
                  <span className="text-sm text-green-700">{location.text}</span>
                </div>
              )}
            </FieldCard>
          )}

          {needs.photo && (
            <FieldCard label="Issue photo" required hint="A photo helps the MLA's team verify and act faster. PNG / JPG, max 10 MB.">
              <PhotoUploader imagePreview={imagePreview} onChange={onImageChange} onRemove={onImageRemove} />
            </FieldCard>
          )}

          {submitError && (
            <div className="flex items-start gap-2 bg-red-50 border border-red-200 text-red-700 rounded-lg p-3">
              <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
              <span className="text-xs">{submitError}</span>
            </div>
          )}
        </div>

        {/* Sticky summary + submit */}
        <aside className="lg:col-span-1">
          <div className="lg:sticky lg:top-24 space-y-5">
            <div className="bg-white rounded-3xl shadow-[0_8px_30px_rgb(0,0,0,0.06)] border border-gray-100 overflow-hidden relative">
              {/* Ticket Top accent line */}
              <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-[#990000] via-[#FFD700] to-[#990000]"></div>
              
              <div className="px-6 pt-7 pb-4 bg-gray-50/50">
                <div className="flex items-center justify-between mb-1">
                  <h3 className="text-[18px] font-black text-gray-800 tracking-tight">Ticket Summary</h3>
                  <span className="text-[10px] font-bold uppercase bg-white border border-gray-200 text-gray-500 px-2 py-1 rounded-md tracking-widest shadow-sm">Draft</span>
                </div>
                <p className="text-xs text-gray-500">Review your details before submitting</p>
              </div>

              {/* Dashed separator mimicking a receipt tear line */}
              <div className="relative w-full overflow-hidden h-4 -mt-2 -mb-2 z-10 flex items-center">
                <div className="absolute -left-2 w-4 h-4 rounded-full bg-gray-50 border border-gray-100"></div>
                <div className="absolute -right-2 w-4 h-4 rounded-full bg-gray-50 border border-gray-100"></div>
                <div className="w-full border-t-2 border-dashed border-gray-200 mx-2"></div>
              </div>

              <ul className="px-6 py-4">
                <SummaryRow label="Category" value={service.title} filled />
                <SummaryRow label="Issue" value={option.title} filled />
                {needs.description && (
                  <SummaryRow
                    label="Description"
                    value={description.trim() ? `${description.trim().slice(0, 60)}${description.length > 60 ? '…' : ''}` : null}
                    filled={!!description.trim()}
                  />
                )}
                {showSchoolName && (
                  <SummaryRow
                    label="School"
                    value={schoolName.trim() || null}
                    filled={!!schoolName.trim()}
                  />
                )}
                {(needs.location || needs.locationText) && (
                  <SummaryRow
                    label="Location"
                    value={location.text || (needs.locationText ? 'Optional' : null)}
                    filled={!!location.text}
                  />
                )}
                {needs.photo && (
                  <SummaryRow label="Photo" value={imagePreview ? 'Attached' : null} filled={!!imagePreview} />
                )}
              </ul>

              <div className="px-6 pb-7 pt-5 bg-gray-50/80 border-t border-dashed border-gray-200">
                <button
                  onClick={onSubmit}
                  disabled={!canSubmit || loading}
                  className="group relative w-full flex items-center justify-center gap-2 py-4 px-4 rounded-xl text-[15px] font-black text-white bg-[#990000] hover:bg-[#7a0000] disabled:bg-gray-200 disabled:text-gray-400 disabled:cursor-not-allowed transition-all shadow-[0_4px_14px_rgba(153,0,0,0.3)] disabled:shadow-none overflow-hidden"
                >
                  <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-1000"></div>
                  {loading ? (
                    <><Loader2 className="w-5 h-5 animate-spin" /> Submitting…</>
                  ) : (
                    <><Send className="w-5 h-5 group-hover:translate-x-1 group-hover:-translate-y-1 transition-transform" /> Submit Grievance</>
                  )}
                </button>
                <p className="text-[11px] text-gray-400 mt-3 text-center leading-relaxed px-2">
                  By submitting, you confirm the information above is accurate.
                </p>
              </div>
            </div>

            <div className="bg-[#FFD700]/10 border-l-4 border-[#FFD700] rounded-r-xl p-5 shadow-sm">
              <p className="text-sm text-gray-700 leading-relaxed">
                <strong>Need help?</strong> Call our helpline at{' '}
                <strong className="text-[#990000] whitespace-nowrap">1800-XXX-XXXX</strong>, or visit the MLA's office.
              </p>
            </div>
          </div>
        </aside>
        </div>
      </div>
    </section>
  )
}

/* ════════════════════════════════════════════════════════════════ */
/*  SCREEN: 4. SUCCESS                                               */
/* ════════════════════════════════════════════════════════════════ */

function SuccessScreen({
  grievanceId, service, option, location, description, schoolName = '', kind, action,
  onAnother, onMine,
}) {
  return (
    <section className="max-w-3xl mx-auto">
      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="bg-[#E5C77A]/30 px-8 py-10 text-center border-b border-[#E5C77A]/40">
          <div className="w-16 h-16 rounded-full bg-[#E5C77A] grid place-items-center mx-auto mb-4 shadow-md">
            <CheckCircle2 className="w-8 h-8 text-[#806B3E]" />
          </div>
          <h1 className="text-2xl md:text-3xl font-black text-gray-800 tracking-tight">
            Grievance Successfully Registered
          </h1>
          <p className="text-gray-600 text-sm mt-2">
            Your reference number is{' '}
            <strong className="text-[#990000]">#{grievanceId}</strong>
          </p>
        </div>

        <div className="p-6 md:p-8">
          <dl className="grid sm:grid-cols-2 gap-4 text-sm">
            <div>
              <dt className="text-[11px] font-bold uppercase tracking-wider text-gray-400 mb-1">Category</dt>
              <dd className="font-semibold text-gray-800">{service?.title}</dd>
            </div>
            <div>
              <dt className="text-[11px] font-bold uppercase tracking-wider text-gray-400 mb-1">Issue</dt>
              <dd className="font-semibold text-gray-800">{option?.title}</dd>
            </div>
            {schoolName.trim() && (
              <div className="sm:col-span-2">
                <dt className="text-[11px] font-bold uppercase tracking-wider text-gray-400 mb-1">School</dt>
                <dd className="font-semibold text-gray-800">{schoolName.trim()}</dd>
              </div>
            )}
            {location.text && (
              <div className="sm:col-span-2">
                <dt className="text-[11px] font-bold uppercase tracking-wider text-gray-400 mb-1">Location</dt>
                <dd className="font-semibold text-gray-800">{location.text}</dd>
              </div>
            )}
            {description.trim() && (
              <div className="sm:col-span-2">
                <dt className="text-[11px] font-bold uppercase tracking-wider text-gray-400 mb-1">Your message</dt>
                <dd className="text-gray-700 leading-relaxed">
                  "{description.substring(0, 200)}{description.length > 200 ? '…' : ''}"
                </dd>
              </div>
            )}
          </dl>

          <div className="mt-6 bg-[#E5C77A]/20 border border-[#E5C77A] rounded-xl p-4 flex items-start gap-3">
            <div className="w-8 h-8 rounded-full bg-[#E5C77A] grid place-items-center flex-shrink-0">
              <CheckCircle2 className="w-4 h-4 text-[#806B3E]" />
            </div>
            <p className="text-sm text-[#806B3E]">
              MLA Venkatramanan's office will respond within <strong>7 working days</strong>.
              You can track this ticket's status anytime from the <strong>My Requests</strong> page.
            </p>
          </div>

          {kind === 'details_then_url' && action?.url && (
            <a
              href={action.url}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-4 inline-flex items-center justify-center gap-2 w-full border-2 border-gray-200 hover:border-[#E5C77A] hover:bg-[#E5C77A]/10 text-gray-700 px-6 py-3 rounded-md font-semibold text-sm transition-colors"
            >
              <ExternalLink className="w-4 h-4" /> {action.ctaLabel || 'Open Related Portal'}
            </a>
          )}

          <div className="grid sm:grid-cols-2 gap-3 mt-6">
            <button
              onClick={onMine}
              className="py-3 px-4 rounded-md text-sm font-bold border-2 border-gray-200 hover:border-gray-300 text-gray-700 hover:bg-gray-50 transition-colors"
            >
              View My Grievances
            </button>
            <button
              onClick={onAnother}
              className="py-3 px-4 rounded-md text-sm font-bold text-[#990000] bg-[#FFD700] hover:bg-[#E6C200] transition-colors shadow-sm"
            >
              File Another
            </button>
          </div>
        </div>
      </div>
    </section>
  )
}

/* ════════════════════════════════════════════════════════════════ */
/*  Reusable presentational helpers                                  */
/* ════════════════════════════════════════════════════════════════ */

function Crumb({ children, done, active, disabled, onClick }) {
  const clickable = typeof onClick === 'function' && !disabled
  const Tag = clickable ? 'button' : 'span'
  return (
    <Tag
      onClick={clickable ? onClick : undefined}
      className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full font-semibold transition-colors ${
        disabled
          ? 'bg-gray-50 text-gray-300 cursor-not-allowed'
          : done
          ? 'bg-[#E5C77A]/30 text-[#806B3E] hover:bg-[#E5C77A]/50 cursor-pointer'
          : active
          ? 'bg-[#990000] text-white'
          : 'bg-gray-100 text-gray-500'
      }`}
    >
      {done && <CheckCircle2 className="w-3.5 h-3.5" />}
      {children}
    </Tag>
  )
}

function GridCard({ iconUrl, fallbackInitial, title, subtitle, onClick }) {
  return (
    <div
      onClick={onClick}
      className="group relative w-full aspect-square cursor-pointer [perspective:1500px]"
    >
      <div className="w-full h-full relative transition-all duration-700 ease-[cubic-bezier(0.23,1,0.32,1)] [transform-style:preserve-3d] group-hover:[transform:rotateY(180deg)]">
        
        {/* FRONT SIDE */}
        <div className="absolute inset-0 w-full h-full bg-white border border-gray-100 rounded-2xl overflow-hidden shadow-sm [backface-visibility:hidden] flex items-center justify-center p-2 bg-gradient-to-br from-gray-50 to-gray-100">
          {iconUrl ? (
            <img
              src={iconUrl}
              alt={title}
              className="w-full h-full object-contain drop-shadow-md group-hover:scale-105 transition-transform duration-500"
              loading="lazy"
            />
          ) : (
            <div className="w-full h-full grid place-items-center text-[#990000] text-7xl font-black opacity-30">
              {fallbackInitial}
            </div>
          )}
        </div>

        {/* BACK SIDE */}
        <div className="absolute inset-0 w-full h-full bg-[#FFE600] border-4 border-[#990000] rounded-2xl overflow-hidden shadow-2xl [backface-visibility:hidden] [transform:rotateY(180deg)] flex flex-col p-4 sm:p-6 text-center relative">
          
          {/* Glossy Shine Effect */}
          <div className="absolute inset-0 -translate-x-[150%] group-hover:translate-x-[150%] bg-gradient-to-tr from-transparent via-white/60 to-transparent transition-transform duration-[1200ms] ease-in-out z-10 pointer-events-none"></div>

          <div className="flex-1 flex flex-col items-center justify-center relative z-20">
            <h3 className="font-black text-[#990000] text-[18px] sm:text-[20px] leading-tight mb-2 line-clamp-3">
              {title}
            </h3>
            {subtitle && (
              <p className="text-[12px] sm:text-[13px] font-bold text-[#990000]/80 leading-snug line-clamp-3 mb-4">
                {subtitle}
              </p>
            )}
          </div>

          <div className="w-full inline-flex items-center justify-center gap-1.5 py-2.5 sm:py-3.5 px-4 rounded-xl text-[14px] sm:text-[15px] font-black text-white bg-[#990000] shadow-[0_4px_14px_rgba(153,0,0,0.4)] hover:scale-105 transition-transform duration-300 relative z-20">
            Select Issue
            <ChevronRight className="w-4 h-4" />
          </div>
        </div>
        
      </div>
    </div>
  )
}

function SelectionChip({ iconUrl, fallbackInitial, label, onChange }) {
  return (
    <span className="inline-flex items-center gap-2 px-3 py-2 rounded-full bg-white shadow-sm border border-gray-100 transition-all hover:shadow-md">
      <span className="w-6 h-6 rounded-full bg-gray-50 grid place-items-center overflow-hidden p-0.5 border border-black/5">
        {iconUrl ? (
          <img src={iconUrl} alt={label} className="w-full h-full object-contain" />
        ) : (
          <span className="text-[#990000] text-[10px] font-bold">{fallbackInitial}</span>
        )}
      </span>
      <span className="text-[13px] font-bold text-gray-800">{label}</span>
      <button
        type="button"
        onClick={onChange}
        className="text-[10px] font-bold text-gray-400 hover:text-[#990000] inline-flex items-center gap-0.5 pl-1 transition-colors"
      >
        <Pencil className="w-3.5 h-3.5" />
      </button>
    </span>
  )
}

function FieldCard({ label, required, hint, children }) {
  return (
    <div className="bg-white rounded-3xl p-6 md:p-8 shadow-[0_2px_12px_rgb(0,0,0,0.04)] border border-gray-50/50">
      <label className="flex items-center gap-2 text-sm font-black text-gray-800 uppercase tracking-wider mb-1.5">
        {label}
        {required ? (
          <span className="text-[#990000] text-lg leading-none mt-1">*</span>
        ) : (
          <span className="text-gray-400 font-medium normal-case text-xs tracking-normal mt-0.5">(optional)</span>
        )}
      </label>
      {hint && <p className="text-[12px] text-gray-500 mb-5 leading-relaxed">{hint}</p>}
      {children}
    </div>
  )
}

function PhotoUploader({ imagePreview, onChange, onRemove }) {
  if (imagePreview) {
    return (
      <div className="relative inline-block w-full">
        <img src={imagePreview} alt="Preview" className="w-full max-h-[300px] object-cover rounded-2xl border border-gray-100 shadow-sm" />
        <button
          type="button"
          onClick={onRemove}
          className="absolute top-3 right-3 w-8 h-8 rounded-full bg-[#990000] text-white grid place-items-center shadow-lg hover:bg-[#7a0000] transition-colors hover:scale-105"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    )
  }
  return (
    <label className="group flex flex-col items-center justify-center gap-3 border-2 border-dashed border-gray-200 rounded-2xl p-10 cursor-pointer bg-gray-50/50 hover:border-[#990000]/40 hover:bg-[#990000]/5 transition-all duration-300">
      <div className="w-12 h-12 rounded-full bg-white shadow-sm flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
        <Camera className="w-5 h-5 text-gray-400 group-hover:text-[#990000] transition-colors" />
      </div>
      <div className="text-center">
        <span className="block text-[15px] text-gray-700 font-bold group-hover:text-[#990000] transition-colors">Click to upload a photo</span>
        <span className="block text-xs text-gray-400 mt-1">PNG / JPG, max 10 MB</span>
      </div>
      <input type="file" accept="image/*" className="hidden" onChange={onChange} />
    </label>
  )
}

function SummaryRow({ label, value, filled }) {
  return (
    <li className="flex flex-col gap-1 py-3 border-b border-dashed border-gray-100 last:border-0 last:pb-1">
      <div className="text-[10px] uppercase tracking-widest font-black text-gray-400">{label}</div>
      <div className="flex items-start gap-2.5">
        <span
          className={`w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5 transition-colors ${
            filled ? 'bg-green-100 text-green-600' : 'border-2 border-dashed border-gray-200 bg-transparent text-transparent'
          }`}
        >
          {filled && <CheckCircle2 className="w-3.5 h-3.5" />}
        </span>
        <div className={`text-[14px] leading-snug break-words ${filled ? 'text-gray-800 font-bold' : 'text-gray-400 font-medium italic'}`}>
          {value || 'Pending details...'}
        </div>
      </div>
    </li>
  )
}
