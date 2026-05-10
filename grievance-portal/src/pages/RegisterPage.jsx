import { useState, useRef, useEffect } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { ArrowRight, Loader2, Phone, User, Calendar, CreditCard, Lock, ArrowLeft, ShieldCheck, UserCheck } from 'lucide-react'
import api from '../lib/api'
import { useAuth } from '../lib/auth'

/**
 * Registration form. Step 1 collects the profile (name, mobile, DOB, EPIC?)
 * and triggers an OTP. Step 2 verifies the OTP and creates the account in one
 * round-trip. The EPIC field is optional — citizens without a Voter ID can
 * still register; their `registrationType` is recorded as 'manual'.
 *
 * The portal Member is keyed by phone, so anyone who has previously messaged
 * the WhatsApp bot ends up with the same record once they finish registering
 * here. Mobile numbers are unique across both surfaces.
 */
export default function RegisterPage() {
  const { login } = useAuth()
  const navigate = useNavigate()

  const [step, setStep] = useState(1)
  const [form, setForm] = useState({
    name: '',
    phone: '',
    dob: '',
    epic: '',
    hasEpic: true,
  })
  const [otp, setOtp] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [info, setInfo] = useState('')
  const [secondsLeft, setSecondsLeft] = useState(0)
  const otpRef = useRef(null)

  useEffect(() => { if (step === 2) setTimeout(() => otpRef.current?.focus(), 50) }, [step])
  useEffect(() => {
    if (secondsLeft <= 0) return
    const t = setTimeout(() => setSecondsLeft((s) => s - 1), 1000)
    return () => clearTimeout(t)
  }, [secondsLeft])

  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value })

  function validateStep1() {
    if (!form.name.trim() || form.name.trim().length < 2) return 'Enter your full name'
    if (form.phone.length !== 10) return 'Enter a 10-digit mobile number'
    if (!form.dob) return 'Select your date of birth'
    const dobDate = new Date(form.dob)
    if (Number.isNaN(dobDate.getTime()) || dobDate > new Date()) return 'Date of birth looks invalid'
    if (form.hasEpic) {
      const e = form.epic.trim().toUpperCase()
      if (!/^[A-Z]{2,3}[0-9]{6,7}$/.test(e)) {
        return 'EPIC format looks invalid (expected e.g. TNA1234567)'
      }
    }
    return ''
  }

  async function requestOtp(e) {
    e?.preventDefault()
    setError('')
    const err = validateStep1()
    if (err) return setError(err)
    setBusy(true)
    try {
      await api.post('/portal/auth/send-otp', { phone: form.phone, mode: 'register' })
      setStep(2)
      setInfo(`We sent a 6-digit code to your WhatsApp on +91 ${form.phone}.`)
      setSecondsLeft(45)
    } catch (err) {
      setError(err.response?.data?.error || 'Could not send OTP. Try again.')
    } finally {
      setBusy(false)
    }
  }

  async function completeRegister(e) {
    e?.preventDefault()
    setError('')
    if (otp.length < 6) return setError('Enter the 6-digit code')
    setBusy(true)
    try {
      const { data } = await api.post('/portal/auth/register', {
        phone: form.phone,
        otp,
        name: form.name.trim(),
        dob: form.dob,
        epic: form.hasEpic ? form.epic.trim().toUpperCase() : '',
      })
      login(data.token, data.user)
      navigate('/grievance', { replace: true })
    } catch (err) {
      setError(err.response?.data?.error || 'Registration failed')
    } finally {
      setBusy(false)
    }
  }

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
          <div className="flex items-center justify-center gap-2 mb-6">
            <span className={`h-1.5 w-8 rounded-full ${step >= 1 ? 'bg-navy' : 'bg-gray-200'}`} />
            <span className={`h-1.5 w-8 rounded-full ${step >= 2 ? 'bg-navy' : 'bg-gray-200'}`} />
          </div>

          {error && (
            <div className="mb-4 p-3 bg-red-50 text-red-700 text-xs rounded-xl border border-red-100 flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 shrink-0" /> {error}
            </div>
          )}
          {info && step === 2 && !error && (
            <div className="mb-4 p-3 bg-tvk-green/5 text-tvk-green text-xs rounded-xl border border-tvk-green/20 flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 shrink-0" /> {info}
            </div>
          )}

          {step === 1 ? (
            <form onSubmit={requestOtp} className="space-y-4">
              {/* Name */}
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
                    value={form.name}
                    onChange={set('name')}
                    className="block w-full pl-11 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-navy font-semibold focus:ring-2 focus:ring-navy focus:border-navy"
                    placeholder="As on your government ID"
                    required
                  />
                </div>
              </div>

              {/* Phone */}
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
                      value={form.phone}
                      onChange={(e) => setForm({ ...form, phone: e.target.value.replace(/\D/g, '').slice(0, 10) })}
                      className="block w-full pl-9 pr-4 py-3 bg-transparent rounded-r-xl text-navy font-semibold focus:outline-none"
                      placeholder="10-digit number"
                      required
                    />
                  </div>
                </div>
              </div>

              {/* DOB */}
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
                    value={form.dob}
                    onChange={set('dob')}
                    max={new Date().toISOString().slice(0, 10)}
                    className="block w-full pl-11 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-navy font-semibold focus:ring-2 focus:ring-navy focus:border-navy"
                    required
                  />
                </div>
              </div>

              {/* EPIC */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block text-[11px] font-bold text-gray-500 uppercase tracking-wider">
                    Voter ID (EPIC)
                  </label>
                  <label className="inline-flex items-center gap-1.5 text-[11px] text-gray-500 select-none">
                    <input
                      type="checkbox"
                      checked={!form.hasEpic}
                      onChange={(e) => setForm({ ...form, hasEpic: !e.target.checked, epic: '' })}
                      className="w-3.5 h-3.5 rounded border-gray-300 text-navy focus:ring-navy"
                    />
                    I don't have one
                  </label>
                </div>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                    <CreditCard className="w-4 h-4 text-gray-400" />
                  </div>
                  <input
                    type="text"
                    disabled={!form.hasEpic}
                    value={form.epic}
                    onChange={(e) => setForm({ ...form, epic: e.target.value.toUpperCase().replace(/\s/g, '').slice(0, 10) })}
                    className="block w-full pl-11 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-navy font-semibold uppercase tracking-wider focus:ring-2 focus:ring-navy focus:border-navy disabled:bg-gray-100 disabled:text-gray-400"
                    placeholder={form.hasEpic ? 'TNA1234567' : 'Skipped'}
                    maxLength={10}
                  />
                </div>
                {!form.hasEpic && (
                  <p className="text-[11px] text-gray-400 mt-1.5">
                    You can still file grievances. Add your EPIC later from Profile to verify your roll record.
                  </p>
                )}
              </div>

              <button
                type="submit"
                disabled={busy}
                className="w-full flex items-center justify-center py-3.5 px-4 rounded-xl text-sm font-bold text-white bg-navy hover:bg-navy-dark disabled:opacity-50 disabled:cursor-not-allowed transition-all mt-2"
              >
                {busy ? <Loader2 className="w-5 h-5 animate-spin" /> : (<>Continue <ArrowRight className="ml-2 w-4 h-4" /></>)}
              </button>
            </form>
          ) : (
            <form onSubmit={completeRegister} className="space-y-5">
              <button
                type="button"
                onClick={() => { setStep(1); setOtp(''); setError(''); setInfo('') }}
                className="text-xs font-semibold text-gray-500 hover:text-navy flex items-center gap-1"
              >
                <ArrowLeft className="w-3 h-3" /> Edit details
              </button>

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
