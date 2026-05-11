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

const KIND_NEEDS = {
  url:                    { description: false, location: false, photo: false, ticket: false },
  pdf:                    { description: false, location: false, photo: false, ticket: false },
  ticket:                 { description: true,  location: false, photo: false, ticket: true },
  details_then_url:       { description: true,  location: false, photo: false, ticket: true },
  location_only_ticket:   { description: false, location: true,  photo: false, ticket: true },
  location_photos_ticket: { description: false, location: true,  photo: true,  ticket: true },
}

const SCREEN = {
  CATEGORY: 'category',
  ISSUE:    'issue',
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
      .then((res) => { if (alive) setServices(Array.isArray(res.data?.services) ? res.data.services : []) })
      .catch((err) => { if (alive) setCatalogError(err.response?.data?.error || 'Could not load services. Please retry in a moment.') })
      .finally(() => { if (alive) setCatalogLoading(false) })
    return () => { alive = false }
  }, [])

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
    setImage(null); setImagePreview(null)
    setSubmitError('')
  }

  const pickService = (s) => {
    setServiceObj(s)
    setOptionObj(null)
    resetDownstream()
    setScreen(SCREEN.ISSUE)
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
    setScreen(SCREEN.ISSUE)
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
      {/* Top page chrome — brand strip + breadcrumb pills, edge-to-edge */}
      <header className="border-b border-gray-200 bg-white">
        <div className="w-full px-4 sm:px-8 lg:px-12 py-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center gap-3">
            <img
              src="/logo.png"
              alt="TVK"
              className="w-10 h-10 rounded-full object-cover shadow-sm border border-black/5"
            />
            <div>
              <p className="text-[10px] font-bold uppercase tracking-[3px] text-[#990000]">
                Citizen Service
              </p>
              <h1 className="text-xl md:text-2xl font-black text-gray-800 tracking-tight">
                File a Grievance
              </h1>
            </div>
          </div>

          {/* Breadcrumb — replaces the stepper. Pills are clickable on
              the done steps so users can jump back without losing context. */}
          <nav className="flex items-center gap-1.5 text-[12px] flex-wrap">
            <Crumb
              done={screen !== SCREEN.CATEGORY}
              active={screen === SCREEN.CATEGORY}
              onClick={screen !== SCREEN.CATEGORY ? backToCategory : null}
            >
              1. Category
            </Crumb>
            <ChevronRight className="w-3.5 h-3.5 text-gray-300" />
            <Crumb
              done={screen === SCREEN.DETAILS || screen === SCREEN.SUCCESS}
              active={screen === SCREEN.ISSUE}
              disabled={!serviceObj}
              onClick={serviceObj && (screen === SCREEN.DETAILS) ? backToIssue : null}
            >
              2. Issue
            </Crumb>
            <ChevronRight className="w-3.5 h-3.5 text-gray-300" />
            <Crumb
              done={screen === SCREEN.SUCCESS}
              active={screen === SCREEN.DETAILS}
              disabled={!optionObj}
            >
              3. Details
            </Crumb>
          </nav>
        </div>
      </header>

      {/* Screen body — edge to edge, internal padding only */}
      <main className="w-full px-4 sm:px-8 lg:px-12 py-8 md:py-10">
        {screen === SCREEN.CATEGORY && (
          <CategoryScreen
            services={services}
            loading={catalogLoading}
            error={catalogError}
            onPick={pickService}
          />
        )}

        {screen === SCREEN.ISSUE && serviceObj && (
          <IssueScreen
            service={serviceObj}
            onPick={pickOption}
            onBack={backToCategory}
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
/*  SCREEN: 1. CATEGORY                                              */
/* ════════════════════════════════════════════════════════════════ */

function CategoryScreen({ services, loading, error, onPick }) {
  return (
    <section>
      <div className="mb-8 max-w-3xl">
        <h2 className="text-2xl md:text-3xl font-black text-gray-800 tracking-tight mb-2">
          Choose a category
        </h2>
        <p className="text-gray-500 text-sm md:text-base">
          Pick the department or service area that best matches your issue. You'll choose
          the specific issue on the next page.
        </p>
      </div>

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

      {!loading && !error && (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 md:gap-5">
          {services.map((s) => (
            <GridCard
              key={s.id}
              iconUrl={s.iconUrl}
              fallbackInitial={s.title?.charAt(0) || '?'}
              title={s.title}
              subtitle={s.description}
              onClick={() => onPick(s)}
            />
          ))}
        </div>
      )}
    </section>
  )
}

/* ════════════════════════════════════════════════════════════════ */
/*  SCREEN: 2. ISSUE                                                 */
/* ════════════════════════════════════════════════════════════════ */

function IssueScreen({ service, onPick, onBack }) {
  return (
    <section>
      <button
        onClick={onBack}
        className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-800 font-semibold mb-6 transition-colors"
      >
        <ArrowLeft className="w-4 h-4" /> Back to categories
      </button>

      <div className="mb-6 max-w-3xl">
        <p className="text-[11px] font-bold uppercase tracking-[3px] text-[#990000] mb-1">
          Step 2 of 3
        </p>
        <h2 className="text-2xl md:text-3xl font-black text-gray-800 tracking-tight mb-2">
          Choose the specific issue
        </h2>
        <p className="text-gray-500 text-sm md:text-base">
          What kind of <strong className="text-gray-800">{service.title}</strong> issue are
          you reporting?
        </p>
      </div>

      {/* Active category chip */}
      <div className="inline-flex items-center gap-3 px-4 py-2.5 rounded-full bg-[#E5C77A]/25 border border-[#E5C77A] mb-6">
        <div className="w-7 h-7 rounded-full bg-white grid place-items-center overflow-hidden p-0.5 border border-black/5">
          {service.iconUrl ? (
            <img src={service.iconUrl} alt={service.title} className="w-full h-full object-contain" />
          ) : (
            <span className="text-[#806B3E] text-[11px] font-bold">{service.title?.charAt(0)}</span>
          )}
        </div>
        <span className="text-sm font-bold text-[#806B3E]">{service.title}</span>
        <button
          onClick={onBack}
          className="text-[11px] font-bold text-[#806B3E] hover:text-[#806B3E]/80 inline-flex items-center gap-1"
        >
          <Pencil className="w-3 h-3" /> Change
        </button>
      </div>

      {service.bannerUrl && (
        <div className="mb-6 rounded-2xl overflow-hidden border border-gray-200 bg-white max-w-5xl">
          <img
            src={service.bannerUrl}
            alt={`${service.title} banner`}
            className="w-full h-40 md:h-48 object-cover"
            loading="lazy"
          />
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 md:gap-5">
        {(service.options || []).map((opt, i) => (
          <GridCard
            key={opt.id}
            iconUrl={opt.iconUrl}
            fallbackInitial={String(i + 1)}
            title={opt.title}
            subtitle={opt.description}
            onClick={() => onPick(opt)}
          />
        ))}
      </div>
    </section>
  )
}

/* ════════════════════════════════════════════════════════════════ */
/*  SCREEN: 3. DETAILS                                               */
/* ════════════════════════════════════════════════════════════════ */

function DetailsScreen({
  service, option, action, kind, needs,
  description, setDescription,
  location, onLocationSelect,
  imagePreview, onImageChange, onImageRemove,
  submitError, loading, canSubmit, onSubmit,
  onBack, onChangeCategory,
}) {
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
              className={`w-full flex items-center justify-center gap-2 py-3.5 px-4 rounded-md text-sm font-bold text-[#806B3E] bg-[#E5C77A] hover:bg-[#D4B363] transition-all shadow-sm ${
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
    <section>
      <button
        onClick={onBack}
        className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-800 font-semibold mb-6 transition-colors"
      >
        <ArrowLeft className="w-4 h-4" /> Back to issues
      </button>

      <div className="mb-6 max-w-3xl">
        <p className="text-[11px] font-bold uppercase tracking-[3px] text-[#990000] mb-1">
          Step 3 of 3
        </p>
        <h2 className="text-2xl md:text-3xl font-black text-gray-800 tracking-tight mb-2">
          Provide the details
        </h2>
        <p className="text-gray-500 text-sm md:text-base">
          Fill in the fields below — marked fields are required.
        </p>
      </div>

      {/* Selection chips */}
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
          {action?.headerUrl && (
            <div className="rounded-2xl overflow-hidden border border-gray-200 bg-white">
              <img
                src={action.headerUrl}
                alt={option.title}
                className="w-full h-32 md:h-40 object-cover"
                loading="lazy"
              />
            </div>
          )}

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

          {/* Optional photo on description-only flows */}
          {!needs.photo && (kind === 'ticket' || kind === 'details_then_url') && (
            <FieldCard label="Attach a photo" hint="Optional — include any picture that helps explain the issue. Max 10 MB.">
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
          <div className="lg:sticky lg:top-20 space-y-4">
            <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
              <div className="px-5 py-4 border-b border-gray-200">
                <p className="text-[10px] font-bold uppercase tracking-[3px] text-[#990000]">Summary</p>
                <h3 className="text-base font-bold text-gray-800 mt-0.5">Your grievance</h3>
              </div>
              <ul className="p-5 space-y-3 text-sm">
                <SummaryRow label="Category" value={service.title} filled />
                <SummaryRow label="Issue" value={option.title} filled />
                {needs.description && (
                  <SummaryRow
                    label="Description"
                    value={description.trim() ? `${description.trim().slice(0, 60)}${description.length > 60 ? '…' : ''}` : null}
                    filled={!!description.trim()}
                  />
                )}
                {needs.location && (
                  <SummaryRow label="Location" value={location.text || null} filled={!!location.text} />
                )}
                {needs.photo && (
                  <SummaryRow label="Photo" value={imagePreview ? 'Attached' : null} filled={!!imagePreview} />
                )}
              </ul>

              <div className="px-5 pb-5">
                <button
                  onClick={onSubmit}
                  disabled={!canSubmit || loading}
                  className="w-full flex items-center justify-center gap-2 py-3.5 px-4 rounded-md text-sm font-bold text-[#806B3E] bg-[#E5C77A] hover:bg-[#D4B363] disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-sm"
                >
                  {loading ? (
                    <><Loader2 className="w-4 h-4 animate-spin" /> Submitting…</>
                  ) : (
                    <><Send className="w-4 h-4" /> Submit Grievance</>
                  )}
                </button>
                <p className="text-[11px] text-gray-400 mt-2 leading-relaxed">
                  By submitting, you confirm the information above is accurate.
                </p>
              </div>
            </div>

            <div className="bg-[#E5C77A]/15 border border-[#E5C77A] rounded-2xl p-4 text-xs text-[#806B3E] leading-relaxed">
              <strong>Need help?</strong> Call our toll-free helpline at{' '}
              <strong className="whitespace-nowrap">1800-XXX-XXXX</strong>, or visit the
              MLA's office in Mylapore between 10 am – 5 pm.
            </div>
          </div>
        </aside>
      </div>
    </section>
  )
}

/* ════════════════════════════════════════════════════════════════ */
/*  SCREEN: 4. SUCCESS                                               */
/* ════════════════════════════════════════════════════════════════ */

function SuccessScreen({
  grievanceId, service, option, location, description, kind, action,
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
              className="py-3 px-4 rounded-md text-sm font-bold text-[#806B3E] bg-[#E5C77A] hover:bg-[#D4B363] transition-colors shadow-sm"
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

/**
 * E-commerce style product card.
 *
 * Vertical layout: image-area on top (square, gray-tinted, scales on hover),
 * body with title + 2-line description, and a gold action footer that doubles
 * as the affordance (Amazon/Flipkart-style). The whole card is one big
 * clickable button so a tap anywhere navigates forward.
 */
function GridCard({ iconUrl, fallbackInitial, title, subtitle, onClick }) {
  return (
    <button
      onClick={onClick}
      className="group flex flex-col bg-white border border-gray-200 rounded-2xl overflow-hidden hover:border-[#E5C77A] hover:shadow-xl hover:-translate-y-1 transition-all duration-200 text-left"
    >
      {/* Product image — fills a 1:1 square box edge-to-edge.
          `object-cover` makes square logos and portraits fill cleanly without
          letterbox gaps; the gentle scale-up on hover gives a gallery feel. */}
      <div className="aspect-square bg-gradient-to-br from-gray-50 to-gray-100 overflow-hidden border-b border-gray-100 group-hover:from-[#E5C77A]/15 group-hover:to-[#E5C77A]/5 transition-colors">
        {iconUrl ? (
          <img
            src={iconUrl}
            alt={title}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
            loading="lazy"
          />
        ) : (
          <div className="w-full h-full grid place-items-center text-[#990000] text-5xl font-black">
            {fallbackInitial}
          </div>
        )}
      </div>

      {/* Body */}
      <div className="flex-1 flex flex-col p-4 md:p-5">
        <h3 className="font-black text-gray-800 text-[15px] leading-tight mb-1.5 line-clamp-2">
          {title}
        </h3>
        {subtitle && (
          <p className="text-[12px] text-gray-500 leading-snug line-clamp-2 mb-4">
            {subtitle}
          </p>
        )}

        {/* Footer button — sticks to bottom regardless of body height */}
        <div className="mt-auto pt-1">
          <div className="w-full inline-flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-md text-[12px] font-bold text-[#806B3E] bg-[#E5C77A]/40 group-hover:bg-[#E5C77A] transition-colors">
            Select
            <ChevronRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
          </div>
        </div>
      </div>
    </button>
  )
}

function SelectionChip({ iconUrl, fallbackInitial, label, onChange }) {
  return (
    <span className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-[#E5C77A]/25 border border-[#E5C77A]">
      <span className="w-6 h-6 rounded-full bg-white grid place-items-center overflow-hidden p-0.5 border border-black/5">
        {iconUrl ? (
          <img src={iconUrl} alt={label} className="w-full h-full object-contain" />
        ) : (
          <span className="text-[#806B3E] text-[10px] font-bold">{fallbackInitial}</span>
        )}
      </span>
      <span className="text-xs font-bold text-[#806B3E]">{label}</span>
      <button
        type="button"
        onClick={onChange}
        className="text-[10px] font-bold text-[#806B3E]/70 hover:text-[#806B3E] inline-flex items-center gap-0.5 pl-1"
      >
        <Pencil className="w-3 h-3" />
      </button>
    </span>
  )
}

function FieldCard({ label, required, hint, children }) {
  return (
    <div className="bg-white border border-gray-200 rounded-2xl p-5 md:p-6 shadow-sm">
      <label className="block text-xs font-black text-gray-700 uppercase tracking-wide mb-1">
        {label}{' '}
        {required ? (
          <span className="text-[#990000]">*</span>
        ) : (
          <span className="text-gray-400 font-normal normal-case">(optional)</span>
        )}
      </label>
      {hint && <p className="text-[11px] text-gray-500 mb-3 leading-relaxed">{hint}</p>}
      {children}
    </div>
  )
}

function PhotoUploader({ imagePreview, onChange, onRemove }) {
  if (imagePreview) {
    return (
      <div className="relative inline-block w-full">
        <img src={imagePreview} alt="Preview" className="w-full max-h-72 object-cover rounded-lg border border-gray-200" />
        <button
          type="button"
          onClick={onRemove}
          className="absolute top-2 right-2 w-7 h-7 rounded-full bg-[#990000] text-white grid place-items-center shadow-md hover:bg-[#7a0000]"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    )
  }
  return (
    <label className="flex flex-col items-center justify-center gap-2 border-2 border-dashed border-gray-300 rounded-lg p-8 cursor-pointer hover:border-[#E5C77A] hover:bg-[#E5C77A]/10 transition-all">
      <Camera className="w-7 h-7 text-gray-400" />
      <span className="text-sm text-gray-600 font-semibold">Click to upload a photo</span>
      <span className="text-[11px] text-gray-400">PNG / JPG, max 10 MB</span>
      <input type="file" accept="image/*" className="hidden" onChange={onChange} />
    </label>
  )
}

function SummaryRow({ label, value, filled }) {
  return (
    <li className="flex items-start gap-2.5">
      <span
        className={`w-4 h-4 rounded-full grid place-items-center flex-shrink-0 mt-0.5 ${
          filled ? 'bg-[#E5C77A]' : 'border border-gray-300 bg-white'
        }`}
      >
        {filled && <CheckCircle2 className="w-3 h-3 text-[#806B3E]" />}
      </span>
      <div className="flex-1 min-w-0">
        <div className="text-[10px] uppercase tracking-wider font-bold text-gray-400">{label}</div>
        <div className={`text-sm mt-0.5 truncate ${filled ? 'text-gray-800 font-semibold' : 'text-gray-400 italic'}`}>
          {value || 'Pending'}
        </div>
      </div>
    </li>
  )
}
