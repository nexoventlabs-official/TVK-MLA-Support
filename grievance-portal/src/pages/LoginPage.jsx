import { useState, useRef, useEffect } from 'react'
import { useNavigate, Link, useLocation } from 'react-router-dom'
import { ArrowRight, Loader2, Phone, Lock, UserPlus, ShieldCheck, ArrowLeft } from 'lucide-react'
import api from '../lib/api'
import { useAuth } from '../lib/auth'

/**
 * Two-step login: mobile → OTP. The code is delivered via the WhatsApp
 * Authentication-category template (with copy-code button) so the same number
 * can be used to receive bot replies and portal codes.
 */
export default function LoginPage() {
  const { login } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const fromPath = location.state?.from?.pathname || '/grievance'

  const [step, setStep] = useState(1)            // 1 = phone, 2 = otp
  const [phone, setPhone] = useState('')
  const [otp, setOtp] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [info, setInfo] = useState('')
  const [secondsLeft, setSecondsLeft] = useState(0)
  const otpRef = useRef(null)

  useEffect(() => { if (step === 2) setTimeout(() => otpRef.current?.focus(), 50) }, [step])

  // Countdown for the resend button.
  useEffect(() => {
    if (secondsLeft <= 0) return
    const t = setTimeout(() => setSecondsLeft((s) => s - 1), 1000)
    return () => clearTimeout(t)
  }, [secondsLeft])

  async function requestOtp(e) {
    e?.preventDefault()
    setError('')
    if (phone.length !== 10) return setError('Enter a 10-digit mobile number')
    setBusy(true)
    try {
      await api.post('/portal/auth/send-otp', { phone, mode: 'login' })
      setStep(2)
      setInfo(`We sent a 6-digit code to your WhatsApp on +91 ${phone}.`)
      setSecondsLeft(45)
    } catch (err) {
      setError(err.response?.data?.error || 'Could not send OTP. Try again.')
    } finally {
      setBusy(false)
    }
  }

  async function verifyOtp(e) {
    e?.preventDefault()
    setError('')
    if (otp.length < 6) return setError('Enter the 6-digit code')
    setBusy(true)
    try {
      const { data } = await api.post('/portal/auth/verify-otp', { phone, otp })
      login(data.token, data.user)
      navigate(fromPath, { replace: true })
    } catch (err) {
      setError(err.response?.data?.error || 'Invalid OTP')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="min-h-screen bg-white flex items-center justify-center p-4 relative overflow-hidden">
      {/* Soft brand glow */}
      <div className="absolute -top-32 -left-32 w-[40%] h-[40%] bg-navy/5 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-32 -right-32 w-[40%] h-[40%] bg-saffron/5 rounded-full blur-3xl pointer-events-none" />

      <div className="w-full max-w-md bg-white rounded-3xl shadow-xl ring-1 ring-black/5 overflow-hidden relative z-10">
        {/* Brand strip */}
        <div className="bg-navy p-7 text-center relative">
          <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-saffron via-red-500 to-tvk-green" />
          <div className="w-14 h-14 mx-auto rounded-2xl bg-white/10 backdrop-blur grid place-items-center border border-white/20 mb-3">
            <span className="text-xl font-black text-white tracking-tighter">M</span>
          </div>
          <h2 className="text-xl font-bold text-white">Welcome Back</h2>
          <p className="text-white/70 text-xs mt-1">Sign in to the Mylapore Citizen Portal</p>
        </div>

        <div className="p-7">
          {/* Step indicator */}
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
            <form onSubmit={requestOtp} className="space-y-5">
              <div>
                <label className="block text-[11px] font-bold text-gray-500 uppercase tracking-wider mb-2">
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
                      autoComplete="tel-national"
                      inputMode="numeric"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value.replace(/\D/g, '').slice(0, 10))}
                      className="block w-full pl-9 pr-4 py-3.5 bg-transparent rounded-r-xl text-navy font-semibold focus:outline-none"
                      placeholder="98xxxxxxxx"
                      required
                      autoFocus
                    />
                  </div>
                </div>
                <p className="text-[11px] text-gray-400 mt-1.5">
                  We'll send a 6-digit code via WhatsApp.
                </p>
              </div>

              <button
                type="submit"
                disabled={busy || phone.length !== 10}
                className="w-full flex items-center justify-center py-3.5 px-4 rounded-xl text-sm font-bold text-white bg-navy hover:bg-navy-dark disabled:opacity-50 disabled:cursor-not-allowed transition-all"
              >
                {busy ? <Loader2 className="w-5 h-5 animate-spin" /> : (<>Send OTP <ArrowRight className="ml-2 w-4 h-4" /></>)}
              </button>
            </form>
          ) : (
            <form onSubmit={verifyOtp} className="space-y-5">
              <button
                type="button"
                onClick={() => { setStep(1); setOtp(''); setError(''); setInfo('') }}
                className="text-xs font-semibold text-gray-500 hover:text-navy flex items-center gap-1"
              >
                <ArrowLeft className="w-3 h-3" /> Edit number
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
                {busy ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Verify & Sign In'}
              </button>
            </form>
          )}

          <div className="mt-7 pt-5 border-t border-gray-100 text-center">
            <p className="text-xs text-gray-500">
              New here?{' '}
              <Link to="/register" className="font-bold text-saffron hover:text-orange-600 inline-flex items-center gap-1">
                <UserPlus className="w-3.5 h-3.5" /> Create an account
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
