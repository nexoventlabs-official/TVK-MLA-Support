import { useState, useRef, useEffect } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import {
  ArrowRight, ArrowLeft, Loader2, Phone, User, Calendar, CreditCard,
  Lock, ShieldCheck, UserCheck, Users as UsersIcon, MapPin, Home,
  CheckCircle2, AlertCircle, Pencil,
} from 'lucide-react'
import api from '../lib/api'
import { useAuth } from '../lib/auth'

/**
 * Registration is a small state-machine with two source-of-truth modes:
 *
 *   mode = 'epic'    EPIC + Mobile + DOB → server looks up the voter roll
 *                    → user confirms voter details → OTP → register.
 *                    The user's display name comes from the voter record,
 *                    NOT from the form.
 *
 *   mode = 'manual'  Name + Mobile + Gender + DOB → OTP → register.
 *                    For citizens who don't have an EPIC card.
 *
 * Steps used by the wizard:
 *   1 → form (different fields per mode)
 *   2 → voter-details confirmation card  [EPIC mode only]
 *   3 → OTP entry
 *
 * Mode switching always resets state so half-typed values from one path
 * never leak into the other.
 */
export default function RegisterPage() {
  const { login } = useAuth()
  const navigate = useNavigate()

  const [mode, setMode] = useState('epic')          // 'epic' | 'manual'
  const [step, setStep] = useState(1)               // 1 | 2 | 3
  const [form, setForm] = useState({
    name: '',
    phone: '',
    dob: '',
    gender: '',
    epic: '',
  })
  const [voter, setVoter] = useState(null)          // populated after lookup-epic
  const [otp, setOtp] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [info, setInfo] = useState('')
  const [secondsLeft, setSecondsLeft] = useState(0)
  const otpRef = useRef(null)

  useEffect(() => {
    if (step === 3) setTimeout(() => otpRef.current?.focus(), 50)
  }, [step])

  // Resend cooldown timer.
  useEffect(() => {
    if (secondsLeft <= 0) return
    const t = setTimeout(() => setSecondsLeft((s) => s - 1), 1000)
    return () => clearTimeout(t)
  }, [secondsLeft])

  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value })

  // Reset everything when the user toggles between EPIC ↔ manual modes.
  function switchMode(next) {
    if (next === mode) return
    setMode(next)
    setStep(1)
    setForm({ name: '', phone: '', dob: '', gender: '', epic: '' })
    setVoter(null)
    setOtp('')
    setError('')
    setInfo('')
    setSecondsLeft(0)
  }

  function validatePhoneDob() {
    if (form.phone.length !== 10) return 'Enter a 10-digit mobile number'
    if (!form.dob) return 'Select your date of birth'
    const d = new Date(form.dob)
    if (Number.isNaN(d.getTime()) || d > new Date()) return 'Date of birth looks invalid'
    return ''
  }

  /** Step 1 — EPIC mode: hit /auth/lookup-epic and route to confirm screen. */
  async function lookupEpic(e) {
    e?.preventDefault()
    setError('')
    const epic = form.epic.trim().toUpperCase()
    if (!/^[A-Z]{2,3}[0-9]{6,7}$/.test(epic)) {
      return setError('EPIC format looks invalid (expected e.g. TNA1234567)')
    }
    const phoneErr = validatePhoneDob()
    if (phoneErr) return setError(phoneErr)
    setBusy(true)
    try {
      const { data } = await api.post('/portal/auth/lookup-epic', {
        epic,
        phone: form.phone,
        dob: form.dob,
      })
      setVoter(data.voter)
      setStep(2)
    } catch (err) {
      setError(err.response?.data?.error || 'Could not look up EPIC. Try again.')
    } finally {
      setBusy(false)
    }
  }

  /** Step 1 — manual mode: skip the voter lookup, request the OTP straight away. */
  async function submitManual(e) {
    e?.preventDefault()
    setError('')
    if (!form.name.trim() || form.name.trim().length < 2) return setError('Enter your full name')
    const phoneErr = validatePhoneDob()
    if (phoneErr) return setError(phoneErr)
    if (!form.gender) return setError('Please select a gender')
    await requestOtp()
  }

  /**
   * Send the OTP for registration. Called from:
   *   - manual flow once the form passes validation
   *   - EPIC flow once the user clicks Confirm on the voter card
   *   - resend button on step 3
   */
  async function requestOtp() {
    setBusy(true)
    setError('')
    try {
      await api.post('/portal/auth/send-otp', { phone: form.phone, mode: 'register' })
      setStep(3)
      setInfo(`We sent a 6-digit code to your phone +91 ${form.phone}.`)
      setSecondsLeft(45)
    } catch (err) {
      setError(err.response?.data?.error || 'Could not send OTP. Try again.')
    } finally {
      setBusy(false)
    }
  }

  /** Step 3 — verify the OTP and finalise the account. */
  async function completeRegister(e) {
    e?.preventDefault()
    setError('')
    if (otp.length < 6) return setError('Enter the 6-digit code')
    setBusy(true)
    try {
      const payload = {
        phone: form.phone,
        otp,
        dob: form.dob,
      }
      if (mode === 'epic') {
        payload.epic = form.epic.trim().toUpperCase()
        // Name + gender are pulled from the voter record by the server.
      } else {
        payload.name = form.name.trim()
        payload.gender = form.gender
      }
      const { data } = await api.post('/portal/auth/register', payload)
      login(data.token, data.user)
      navigate('/grievance', { replace: true })
    } catch (err) {
      setError(err.response?.data?.error || 'Registration failed')
    } finally {
      setBusy(false)
    }
  }

  // Step indicator dots — 3 for EPIC mode, 2 for manual.
  const totalSteps = mode === 'epic' ? 3 : 2
  const renderedStep = mode === 'epic' ? step : (step === 3 ? 2 : 1)

  return (
    <div className="min-h-screen bg-white flex items-center justify-center p-4 relative overflow-hidden">
      <div className="absolute -top-32 -right-32 w-[40%] h-[40%] bg-tvk-green/5 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-32 -left-32 w-[40%] h-[40%] bg-navy/5 rounded-full blur-3xl pointer-events-none" />

      <div className="w-full max-w-md bg-white rounded-3xl shadow-xl ring-1 ring-black/5 overflow-hidden relative z-10">
        <div className="bg-gradient-to-br from-navy to-slate-900 p-7 text-center relative">
          <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-tvk-green via-saffron to-red-500" />
          <div className="w-14 h-14 mx-auto rounded-2xl bg-white/10 backdrop-blur grid place-items-center border border-white/20 mb-3">
            <UserCheck className="w-7 h-7 text-white" />
          </div>
          <h2 className="text-xl font-bold text-white">Create Account</h2>
          <p className="text-white/70 text-xs mt-1">Join the Mylapore Citizen Portal</p>
        </div>

        <div className="p-7">
          {/* Step dots — visual count adapts to whichever mode is active. */}
          <div className="flex items-center justify-center gap-2 mb-6">
            {Array.from({ length: totalSteps }).map((_, i) => (
              <span
                key={i}
                className={`h-1.5 w-8 rounded-full ${
                  i < renderedStep ? 'bg-navy' : 'bg-gray-200'
                }`}
              />
            ))}
          </div>

          {error && (
            <div className="mb-4 p-3 bg-red-50 text-red-700 text-xs rounded-xl border border-red-100 flex items-start gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}
          {info && step === 3 && !error && (
            <div className="mb-4 p-3 bg-tvk-green/5 text-tvk-green text-xs rounded-xl border border-tvk-green/20 flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 shrink-0" /> {info}
            </div>
          )}

          {/* ─── STEP 1 ─── EPIC mode form */}
          {step === 1 && mode === 'epic' && (
            <form onSubmit={lookupEpic} className="space-y-4">
              <FieldEpic value={form.epic} onChange={(v) => setForm({ ...form, epic: v })} />
              <FieldPhone value={form.phone} onChange={(v) => setForm({ ...form, phone: v })} />
              <FieldDob value={form.dob} onChange={set('dob')} />

              <button
                type="submit"
                disabled={busy}
                className="w-full flex items-center justify-center py-3.5 px-4 rounded-xl text-sm font-bold text-white bg-navy hover:bg-navy-dark disabled:opacity-50 disabled:cursor-not-allowed transition-all mt-2"
              >
                {busy ? <Loader2 className="w-5 h-5 animate-spin" /> : (<>Continue <ArrowRight className="ml-2 w-4 h-4" /></>)}
              </button>

              <div className="pt-2 text-center">
                <button
                  type="button"
                  onClick={() => switchMode('manual')}
                  className="text-xs text-gray-500 hover:text-navy"
                >
                  Don't have EPIC? <span className="font-semibold underline">Click here</span>
                </button>
              </div>
            </form>
          )}

          {/* ─── STEP 1 ─── Manual mode form */}
          {step === 1 && mode === 'manual' && (
            <form onSubmit={submitManual} className="space-y-4">
              <FieldName value={form.name} onChange={set('name')} />
              <FieldPhone value={form.phone} onChange={(v) => setForm({ ...form, phone: v })} />
              <FieldGender value={form.gender} onChange={set('gender')} />
              <FieldDob value={form.dob} onChange={set('dob')} />

              <button
                type="submit"
                disabled={busy}
                className="w-full flex items-center justify-center py-3.5 px-4 rounded-xl text-sm font-bold text-white bg-navy hover:bg-navy-dark disabled:opacity-50 disabled:cursor-not-allowed transition-all mt-2"
              >
                {busy ? <Loader2 className="w-5 h-5 animate-spin" /> : (<>Continue <ArrowRight className="ml-2 w-4 h-4" /></>)}
              </button>

              <div className="pt-2 text-center">
                <button
                  type="button"
                  onClick={() => switchMode('epic')}
                  className="text-xs text-gray-500 hover:text-navy"
                >
                  Have an EPIC? <span className="font-semibold underline">Use EPIC instead</span>
                </button>
              </div>
            </form>
          )}

          {/* ─── STEP 2 ─── Voter-details confirmation (EPIC only) */}
          {step === 2 && mode === 'epic' && voter && (
            <div className="space-y-4">
              <button
                type="button"
                onClick={() => { setStep(1); setVoter(null); setError('') }}
                className="text-xs font-semibold text-gray-500 hover:text-navy flex items-center gap-1"
              >
                <ArrowLeft className="w-3 h-3" /> Edit details
              </button>

              <div className="rounded-2xl border border-tvk-green/30 bg-tvk-green/5 p-4">
                <div className="flex items-center gap-2 mb-3">
                  <CheckCircle2 className="w-4 h-4 text-tvk-green" />
                  <span className="text-[11px] font-bold uppercase tracking-wider text-tvk-green">
                    Voter Record Found
                  </span>
                </div>
                <div className="text-lg font-bold text-navy leading-snug">
                  {voter.name || '—'}
                </div>
                <div className="text-[11px] text-gray-500 font-mono mt-0.5">{voter.epicNo}</div>

                <dl className="mt-4 grid grid-cols-2 gap-x-4 gap-y-3 text-xs">
                  {voter.gender && (
                    <DetailRow icon={UsersIcon} label="Gender" value={voter.gender} />
                  )}
                  {(voter.relationType || voter.relationName) && (
                    <DetailRow
                      icon={User}
                      label={voter.relationType || 'Relation'}
                      value={voter.relationName || '—'}
                    />
                  )}
                  {voter.houseNo && (
                    <DetailRow icon={Home} label="House No" value={voter.houseNo} />
                  )}
                  {voter.assemblyName && (
                    <DetailRow
                      icon={MapPin}
                      label="Constituency"
                      value={`${voter.assemblyName}${voter.assemblyNo ? ` (${voter.assemblyNo})` : ''}`}
                      span2
                    />
                  )}
                </dl>
              </div>

              <p className="text-[11px] text-gray-500 leading-relaxed px-1">
                Your account will be registered under the name shown on the
                voter roll. If this is not you, please <button
                  type="button"
                  onClick={() => { setStep(1); setVoter(null) }}
                  className="text-navy font-semibold underline"
                >edit your EPIC</button>.
              </p>

              <button
                type="button"
                onClick={requestOtp}
                disabled={busy}
                className="w-full flex items-center justify-center py-3.5 px-4 rounded-xl text-sm font-bold text-white bg-navy hover:bg-navy-dark disabled:opacity-50 disabled:cursor-not-allowed transition-all"
              >
                {busy ? <Loader2 className="w-5 h-5 animate-spin" /> : (<>Confirm &amp; Send OTP <ArrowRight className="ml-2 w-4 h-4" /></>)}
              </button>
            </div>
          )}

          {/* ─── STEP 3 ─── OTP entry (both modes) */}
          {step === 3 && (
            <form onSubmit={completeRegister} className="space-y-5">
              <button
                type="button"
                onClick={() => {
                  // Manual mode jumps back to its form. EPIC mode goes back
                  // to the voter-confirmation screen so we don't drop the
                  // already-fetched record.
                  if (mode === 'epic') setStep(2)
                  else setStep(1)
                  setOtp('')
                  setError('')
                  setInfo('')
                }}
                className="text-xs font-semibold text-gray-500 hover:text-navy flex items-center gap-1"
              >
                <ArrowLeft className="w-3 h-3" /> Back
              </button>

              {/* Tiny summary chip so the user sees who they're registering as. */}
              {mode === 'epic' && voter && (
                <div className="flex items-center gap-2 rounded-xl bg-gray-50 border border-gray-200 px-3 py-2">
                  <UserCheck className="w-4 h-4 text-tvk-green shrink-0" />
                  <div className="min-w-0">
                    <div className="text-[11px] text-gray-500 uppercase tracking-wider font-bold">Registering as</div>
                    <div className="text-sm font-semibold text-navy truncate">{voter.name}</div>
                  </div>
                  <button
                    type="button"
                    onClick={() => { setStep(2); setOtp('') }}
                    className="ml-auto text-gray-400 hover:text-navy"
                    aria-label="Edit"
                  >
                    <Pencil className="w-3.5 h-3.5" />
                  </button>
                </div>
              )}

              <div>
                <label className="block text-[11px] font-bold text-gray-500 uppercase tracking-wider mb-2">
                  6-Digit Code
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                    <Lock className="w-4 h-4 text-gray-400" />
                  </div>
                  <input
                    ref={otpRef}
                    type="text"
                    inputMode="numeric"
                    autoComplete="one-time-code"
                    maxLength={6}
                    value={otp}
                    onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                    className="block w-full pl-11 pr-4 py-3.5 bg-gray-50 border border-gray-200 rounded-xl text-navy font-bold tracking-[0.4em] text-center text-lg focus:ring-2 focus:ring-navy focus:border-navy"
                    placeholder="••••••"
                    required
                  />
                </div>
                <div className="flex items-center justify-between mt-2 text-[11px]">
                  <span className="text-gray-400">Code expires in 5 minutes</span>
                  <button
                    type="button"
                    onClick={requestOtp}
                    disabled={secondsLeft > 0 || busy}
                    className="font-semibold text-navy hover:text-navy-dark disabled:text-gray-300 disabled:cursor-not-allowed"
                  >
                    {secondsLeft > 0 ? `Resend in ${secondsLeft}s` : 'Resend OTP'}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={busy || otp.length !== 6}
                className="w-full flex items-center justify-center py-3.5 px-4 rounded-xl text-sm font-bold text-white bg-saffron hover:bg-orange-600 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
              >
                {busy ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Verify & Create Account'}
              </button>
            </form>
          )}

          <div className="mt-7 pt-5 border-t border-gray-100 text-center">
            <p className="text-xs text-gray-500">
              Already registered?{' '}
              <Link to="/login" className="font-bold text-navy hover:text-navy-dark">
                Log In
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}

/* ──────────────────────────────────────────────────────────────────
   Reusable form-field components
   The Register form is rendered in two distinct shapes (EPIC vs
   manual) but every field reused between them is locally identical
   in styling and behaviour — extracting them keeps the wizard above
   readable and removes 100+ lines of duplication.
   ────────────────────────────────────────────────────────────── */

function FieldName({ value, onChange }) {
  return (
    <div>
      <label className="block text-[11px] font-bold text-gray-500 uppercase tracking-wider mb-1.5">
        Full Name
      </label>
      <div className="relative">
        <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
          <User className="w-4 h-4 text-gray-400" />
        </div>
        <input
          type="text"
          value={value}
          onChange={onChange}
          className="block w-full pl-11 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-navy font-semibold focus:ring-2 focus:ring-navy focus:border-navy"
          placeholder="As on your government ID"
          required
        />
      </div>
    </div>
  )
}

function FieldPhone({ value, onChange }) {
  return (
    <div>
      <label className="block text-[11px] font-bold text-gray-500 uppercase tracking-wider mb-1.5">
        Mobile Number
      </label>
      <div className="flex rounded-xl border border-gray-200 focus-within:ring-2 focus-within:ring-navy focus-within:border-navy bg-gray-50">
        <span className="pl-4 pr-2 flex items-center text-gray-400 text-sm font-semibold border-r border-gray-200">+91</span>
        <div className="relative flex-1">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <Phone className="w-4 h-4 text-gray-400" />
          </div>
          <input
            type="tel"
            inputMode="numeric"
            value={value}
            onChange={(e) => onChange(e.target.value.replace(/\D/g, '').slice(0, 10))}
            className="block w-full pl-9 pr-4 py-3 bg-transparent rounded-r-xl text-navy font-semibold focus:outline-none"
            placeholder="10-digit number"
            required
          />
        </div>
      </div>
    </div>
  )
}

function FieldDob({ value, onChange }) {
  return (
    <div>
      <label className="block text-[11px] font-bold text-gray-500 uppercase tracking-wider mb-1.5">
        Date of Birth
      </label>
      <div className="relative">
        <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
          <Calendar className="w-4 h-4 text-gray-400" />
        </div>
        <input
          type="date"
          value={value}
          onChange={onChange}
          max={new Date().toISOString().slice(0, 10)}
          className="block w-full pl-11 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-navy font-semibold focus:ring-2 focus:ring-navy focus:border-navy"
          required
        />
      </div>
    </div>
  )
}

function FieldGender({ value, onChange }) {
  const opts = ['Male', 'Female', 'Other']
  return (
    <div>
      <label className="block text-[11px] font-bold text-gray-500 uppercase tracking-wider mb-1.5">
        Gender
      </label>
      <div className="grid grid-cols-3 gap-2">
        {opts.map((g) => (
          <button
            key={g}
            type="button"
            onClick={() => onChange({ target: { value: g } })}
            className={`py-3 rounded-xl text-sm font-semibold border transition-all ${
              value === g
                ? 'bg-navy text-white border-navy shadow-sm'
                : 'bg-gray-50 text-gray-600 border-gray-200 hover:border-navy/30 hover:text-navy'
            }`}
          >
            {g}
          </button>
        ))}
      </div>
    </div>
  )
}

function FieldEpic({ value, onChange }) {
  return (
    <div>
      <label className="block text-[11px] font-bold text-gray-500 uppercase tracking-wider mb-1.5">
        Voter ID (EPIC)
      </label>
      <div className="relative">
        <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
          <CreditCard className="w-4 h-4 text-gray-400" />
        </div>
        <input
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value.toUpperCase().replace(/\s/g, '').slice(0, 10))}
          className="block w-full pl-11 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-navy font-semibold uppercase tracking-wider focus:ring-2 focus:ring-navy focus:border-navy"
          placeholder="TNA1234567"
          maxLength={10}
          required
        />
      </div>
    </div>
  )
}

function DetailRow({ icon: Icon, label, value, span2 }) {
  return (
    <div className={span2 ? 'col-span-2' : ''}>
      <dt className="text-[10px] font-bold uppercase tracking-wider text-gray-500 flex items-center gap-1">
        <Icon className="w-3 h-3" /> {label}
      </dt>
      <dd className="text-sm font-medium text-navy mt-0.5 break-words">{value}</dd>
    </div>
  )
}
