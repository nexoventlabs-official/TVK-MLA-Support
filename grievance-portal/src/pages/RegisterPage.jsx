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
    <div className="min-h-screen bg-[#fdfdfd] flex flex-col lg:flex-row">
      
      {/* ─── LEFT: Image Side ─── */}
      <div className="hidden lg:flex w-1/2 relative items-center justify-center pb-20">
        <img 
          src="/vijay.png" 
          alt="Thalapathy Vijay" 
          className="w-full h-auto max-h-[90vh] object-contain pointer-events-none -translate-y-12"
        />
      </div>

      {/* ─── RIGHT: Form Side ─── */}
      <div className="w-full lg:w-1/2 min-h-screen flex flex-col bg-[#fdfdfd]">
        
        {/* Main Content Centered */}
        <div className="flex-1 flex flex-col justify-center px-8 sm:px-16 lg:px-24 max-w-2xl mx-auto w-full relative pt-24 pb-12">
          
          {/* Back Button */}
          <button 
            onClick={() => navigate('/')} 
            className="absolute top-8 left-8 sm:left-16 lg:left-24 text-gray-400 hover:text-gray-600 flex items-center gap-2 text-sm font-medium transition-colors"
          >
            <ArrowLeft className="w-4 h-4" /> Back
          </button>

          {/* Header Brand */}
          <div className="flex items-center gap-3 mb-10">
            <img src="/logo.png" alt="TVK Logo" className="w-10 h-10 rounded-full object-cover shadow-sm border border-black/5" />
            <div className="flex flex-col">
              <span className="text-[#990000] font-bold text-lg tracking-tight leading-tight">தமிழக வெற்றிக் கழகம்</span>
              <span className="text-gray-400 text-[10px] uppercase font-semibold tracking-wider">பிறப்பொக்கும் எல்லா உயிர்க்கும்</span>
            </div>
          </div>

          <div className="mb-10">
            <h1 className="text-3xl font-black text-gray-800 tracking-tight mb-2">Create Account</h1>
            <p className="text-gray-500 text-sm font-medium">Join the Mylapore Citizen Portal</p>
          </div>

          {/* Step dots */}
          <div className="flex items-center gap-2 mb-8">
            {Array.from({ length: totalSteps }).map((_, i) => (
              <span
                key={i}
                className={`h-1.5 w-12 rounded-full transition-colors ${
                  i < renderedStep ? 'bg-[#E5C77A]' : 'bg-gray-200'
                }`}
              />
            ))}
          </div>

          {error && (
            <div className="mb-6 p-4 bg-red-50 text-red-700 text-sm rounded-lg border border-red-100 flex items-start gap-2 shadow-sm">
              <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}
          {info && step === 3 && !error && (
            <div className="mb-6 p-4 bg-green-50 text-green-700 text-sm rounded-lg border border-green-200 flex items-center gap-2 shadow-sm">
              <ShieldCheck className="w-5 h-5 shrink-0" /> {info}
            </div>
          )}

          {/* ─── STEP 1 ─── EPIC mode form */}
          {step === 1 && mode === 'epic' && (
            <form onSubmit={lookupEpic} className="space-y-5">
              <FieldEpic value={form.epic} onChange={(v) => setForm({ ...form, epic: v })} />
              <FieldPhone value={form.phone} onChange={(v) => setForm({ ...form, phone: v })} />
              <FieldDob value={form.dob} onChange={set('dob')} />

              <button
                type="submit"
                disabled={busy}
                className="w-full flex items-center justify-center py-4 px-4 rounded-md text-sm font-bold text-[#990000] bg-[#FFD700] hover:bg-[#E6C200] disabled:bg-[#E5C77A] disabled:text-[#806B3E] disabled:opacity-60 disabled:cursor-not-allowed transition-all shadow-sm mt-4"
              >
                {busy ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Continue'}
              </button>

              <div className="pt-4 text-center">
                <button
                  type="button"
                  onClick={() => switchMode('manual')}
                  className="text-xs font-medium text-gray-500 hover:text-gray-800 transition-colors"
                >
                  Don't have an EPIC card? <span className="font-bold text-[#990000]">Register Manually</span>
                </button>
              </div>
            </form>
          )}

          {/* ─── STEP 1 ─── Manual mode form */}
          {step === 1 && mode === 'manual' && (
            <form onSubmit={submitManual} className="space-y-5">
              <FieldName value={form.name} onChange={set('name')} />
              <FieldPhone value={form.phone} onChange={(v) => setForm({ ...form, phone: v })} />
              <FieldGender value={form.gender} onChange={set('gender')} />
              <FieldDob value={form.dob} onChange={set('dob')} />

              <button
                type="submit"
                disabled={busy}
                className="w-full flex items-center justify-center py-4 px-4 rounded-md text-sm font-bold text-[#990000] bg-[#FFD700] hover:bg-[#E6C200] disabled:bg-[#E5C77A] disabled:text-[#806B3E] disabled:opacity-60 disabled:cursor-not-allowed transition-all shadow-sm mt-4"
              >
                {busy ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Continue'}
              </button>

              <div className="pt-4 text-center">
                <button
                  type="button"
                  onClick={() => switchMode('epic')}
                  className="text-xs font-medium text-gray-500 hover:text-gray-800 transition-colors"
                >
                  Have an EPIC card? <span className="font-bold text-[#990000]">Use EPIC instead</span>
                </button>
              </div>
            </form>
          )}

          {/* ─── STEP 2 ─── Voter-details confirmation (EPIC only) */}
          {step === 2 && mode === 'epic' && voter && (
            <div className="space-y-6">
              <button
                type="button"
                onClick={() => { setStep(1); setVoter(null); setError('') }}
                className="text-xs font-semibold text-gray-500 hover:text-gray-800 flex items-center gap-1 transition-colors"
              >
                <ArrowLeft className="w-3 h-3" /> Edit details
              </button>

              <div className="rounded-lg border-2 border-[#E5C77A] bg-[#E5C77A]/10 p-5">
                <div className="flex items-center gap-2 mb-4">
                  <CheckCircle2 className="w-5 h-5 text-[#806B3E]" />
                  <span className="text-xs font-bold uppercase tracking-wider text-[#806B3E]">
                    Voter Record Found
                  </span>
                </div>
                <div className="text-xl font-black text-gray-800 leading-snug">
                  {voter.name || '—'}
                </div>
                <div className="text-xs text-gray-500 font-mono mt-1 font-semibold">{voter.epicNo}</div>

                <dl className="mt-6 grid grid-cols-2 gap-x-4 gap-y-4 text-sm">
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

              <p className="text-xs text-gray-500 leading-relaxed font-medium">
                Your account will be registered under the name shown on the
                voter roll. If this is not you, please <button
                  type="button"
                  onClick={() => { setStep(1); setVoter(null) }}
                  className="font-bold text-[#990000] hover:text-red-700 transition-colors"
                >edit your EPIC</button>.
              </p>

              <button
                type="button"
                onClick={requestOtp}
                disabled={busy}
                className="w-full flex items-center justify-center py-4 px-4 rounded-md text-sm font-bold text-[#990000] bg-[#FFD700] hover:bg-[#E6C200] disabled:bg-[#E5C77A] disabled:text-[#806B3E] disabled:opacity-60 disabled:cursor-not-allowed transition-all shadow-sm"
              >
                {busy ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Confirm & Send OTP'}
              </button>
            </div>
          )}

          {/* ─── STEP 3 ─── OTP entry (both modes) */}
          {step === 3 && (
            <form onSubmit={completeRegister} className="space-y-6">
              <button
                type="button"
                onClick={() => {
                  if (mode === 'epic') setStep(2)
                  else setStep(1)
                  setOtp('')
                  setError('')
                  setInfo('')
                }}
                className="text-xs font-semibold text-gray-500 hover:text-gray-800 flex items-center gap-1 transition-colors"
              >
                <ArrowLeft className="w-3 h-3" /> Back
              </button>

              {mode === 'epic' && voter && (
                <div className="flex items-center gap-3 rounded-lg bg-gray-100 border border-gray-200 px-4 py-3">
                  <UserCheck className="w-5 h-5 text-gray-400 shrink-0" />
                  <div className="min-w-0">
                    <div className="text-[10px] text-gray-400 uppercase tracking-wider font-bold">Registering as</div>
                    <div className="text-sm font-bold text-gray-800 truncate">{voter.name}</div>
                  </div>
                  <button
                    type="button"
                    onClick={() => { setStep(2); setOtp('') }}
                    className="ml-auto text-gray-400 hover:text-gray-600 transition-colors"
                    aria-label="Edit"
                  >
                    <Pencil className="w-4 h-4" />
                  </button>
                </div>
              )}

              <div>
                <label className="block text-xs font-bold text-gray-600 mb-2">
                  6-Digit Code
                </label>
                <div className="relative">
                  <input
                    ref={otpRef}
                    type="text"
                    inputMode="numeric"
                    autoComplete="one-time-code"
                    maxLength={6}
                    value={otp}
                    onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                    className="block w-full px-4 py-3.5 bg-gray-100/50 border-2 border-gray-200 rounded-md text-gray-800 font-bold tracking-[0.5em] text-center text-lg focus:outline-none focus:border-[#E5C77A] transition-colors"
                    placeholder="••••••"
                    required
                  />
                </div>
                <div className="flex items-center justify-between mt-2 text-[11px] font-medium">
                  <span className="text-gray-400">Code expires in 5 minutes</span>
                  <button
                    type="button"
                    onClick={requestOtp}
                    disabled={secondsLeft > 0 || busy}
                    className="text-[#990000] hover:text-red-700 disabled:text-gray-300 disabled:cursor-not-allowed transition-colors"
                  >
                    {secondsLeft > 0 ? `Resend in ${secondsLeft}s` : 'Resend OTP'}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={busy || otp.length !== 6}
                className="w-full flex items-center justify-center py-4 px-4 rounded-md text-sm font-bold text-[#990000] bg-[#FFD700] hover:bg-[#E6C200] disabled:bg-[#E5C77A] disabled:text-[#806B3E] disabled:opacity-60 disabled:cursor-not-allowed transition-all shadow-sm"
              >
                {busy ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Verify & Create Account'}
              </button>
            </form>
          )}

          <div className="mt-12 text-center">
            <p className="text-sm font-medium text-gray-500">
              Already registered?{' '}
              <Link to="/login" className="font-bold text-[#990000] hover:text-red-700 transition-colors">
                Log In
              </Link>
            </p>
          </div>

        </div>

        {/* Footer Area */}
        <div className="py-6 text-center text-[10px] text-gray-400 font-medium">
          <p>© 2024 Tamilaga Vettri Kazhagam. All Rights Reserved.</p>
          <div className="flex items-center justify-center gap-3 mt-1">
            <Link to="#" className="hover:text-gray-600 transition-colors">Privacy Policy</Link>
            <span className="text-gray-300">|</span>
            <Link to="#" className="hover:text-gray-600 transition-colors">Terms of Service</Link>
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
      <label className="block text-xs font-bold text-gray-600 mb-2">
        Full Name
      </label>
      <input
        type="text"
        value={value}
        onChange={onChange}
        className="block w-full px-4 py-3.5 bg-gray-100/50 border-2 border-gray-200 rounded-md text-gray-800 font-bold focus:outline-none focus:border-[#E5C77A] transition-colors"
        placeholder="As on your government ID"
        required
      />
    </div>
  )
}

function FieldPhone({ value, onChange }) {
  return (
    <div>
      <label className="block text-xs font-bold text-gray-600 mb-2">
        Mobile Number
      </label>
      <div className="flex rounded-md border-2 border-gray-200 focus-within:border-[#E5C77A] bg-gray-100/50 transition-colors overflow-hidden">
        <span className="px-4 flex items-center text-gray-500 font-semibold border-r border-gray-200 bg-gray-100">
          +91
        </span>
        <input
          type="tel"
          inputMode="numeric"
          value={value}
          onChange={(e) => onChange(e.target.value.replace(/\D/g, '').slice(0, 10))}
          className="block w-full px-4 py-3.5 bg-transparent text-gray-800 font-bold focus:outline-none"
          placeholder="10-digit number"
          required
        />
      </div>
    </div>
  )
}

function FieldDob({ value, onChange }) {
  return (
    <div>
      <label className="block text-xs font-bold text-gray-600 mb-2">
        Date of Birth
      </label>
      <input
        type="date"
        value={value}
        onChange={onChange}
        max={new Date().toISOString().slice(0, 10)}
        className="block w-full px-4 py-3.5 bg-gray-100/50 border-2 border-gray-200 rounded-md text-gray-800 font-bold focus:outline-none focus:border-[#E5C77A] transition-colors"
        required
      />
    </div>
  )
}

function FieldGender({ value, onChange }) {
  const opts = ['Male', 'Female', 'Other']
  return (
    <div>
      <label className="block text-xs font-bold text-gray-600 mb-2">
        Gender
      </label>
      <div className="grid grid-cols-3 gap-2">
        {opts.map((g) => (
          <button
            key={g}
            type="button"
            onClick={() => onChange({ target: { value: g } })}
            className={`py-3 rounded-md text-sm font-bold border-2 transition-all ${
              value === g
                ? 'bg-[#E5C77A] text-[#806B3E] border-[#E5C77A] shadow-sm'
                : 'bg-gray-100/50 text-gray-500 border-gray-200 hover:border-gray-300 hover:text-gray-700'
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
      <label className="block text-xs font-bold text-gray-600 mb-2">
        Voter ID (EPIC)
      </label>
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value.toUpperCase().replace(/\s/g, '').slice(0, 10))}
        className="block w-full px-4 py-3.5 bg-gray-100/50 border-2 border-gray-200 rounded-md text-gray-800 font-bold uppercase tracking-wider focus:outline-none focus:border-[#E5C77A] transition-colors"
        placeholder="TNA1234567"
        maxLength={10}
        required
      />
    </div>
  )
}

function DetailRow({ icon: Icon, label, value, span2 }) {
  return (
    <div className={span2 ? 'col-span-2' : ''}>
      <dt className="text-[10px] font-bold uppercase tracking-wider text-gray-500 flex items-center gap-1.5">
        <Icon className="w-3.5 h-3.5" /> {label}
      </dt>
      <dd className="text-sm font-bold text-gray-800 mt-0.5 break-words">{value}</dd>
    </div>
  )
}
