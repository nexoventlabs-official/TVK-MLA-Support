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
  const fromPath = location.state?.from?.pathname || '/'

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
    <div className="min-h-screen bg-[#fdfdfd] flex flex-col lg:flex-row">
      
      {/* ─── LEFT: Image Side ─── */}
      <div className="hidden lg:flex w-1/2 relative items-center justify-center">
        <img 
          src="/vijay.png" 
          alt="Thalapathy Vijay" 
          className="w-full h-auto max-h-[90vh] object-contain pointer-events-none"
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
            <h1 className="text-3xl font-black text-gray-800 tracking-tight mb-2">Welcome Back!</h1>
            <p className="text-gray-500 text-sm font-medium">Login to the Mylapore Citizen Portal</p>
          </div>

          {error && (
            <div className="mb-6 p-4 bg-red-50 text-red-700 text-sm rounded-lg border border-red-100 flex items-start gap-2 shadow-sm">
              <ShieldCheck className="w-5 h-5 shrink-0 mt-0.5" /> {error}
            </div>
          )}
          {info && step === 2 && !error && (
            <div className="mb-6 p-4 bg-green-50 text-green-700 text-sm rounded-lg border border-green-200 flex items-center gap-2 shadow-sm">
              <ShieldCheck className="w-5 h-5 shrink-0" /> {info}
            </div>
          )}

          {step === 1 ? (
            <form onSubmit={requestOtp} className="space-y-6">
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
                    autoComplete="tel-national"
                    inputMode="numeric"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value.replace(/\D/g, '').slice(0, 10))}
                    className="block w-full px-4 py-3.5 bg-transparent text-gray-800 font-bold focus:outline-none"
                    placeholder="10-digt number"
                    required
                    autoFocus
                  />
                </div>
                <p className="text-[11px] text-gray-400 mt-2 font-medium">
                  We'll send a 6-digit code via WhatsApp.
                </p>
              </div>

              <button
                type="submit"
                disabled={busy || phone.length !== 10}
                className="w-full flex items-center justify-center py-4 px-4 rounded-md text-sm font-bold text-[#806B3E] bg-[#E5C77A] hover:bg-[#D4B363] disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-sm"
              >
                {busy ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Send OTP'}
              </button>
            </form>
          ) : (
            <form onSubmit={verifyOtp} className="space-y-6">
              <button
                type="button"
                onClick={() => { setStep(1); setOtp(''); setError(''); setInfo('') }}
                className="text-xs font-semibold text-gray-500 hover:text-gray-800 flex items-center gap-1 transition-colors"
              >
                <ArrowLeft className="w-3 h-3" /> Edit number
              </button>

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
                className="w-full flex items-center justify-center py-4 px-4 rounded-md text-sm font-bold text-[#806B3E] bg-[#E5C77A] hover:bg-[#D4B363] disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-sm"
              >
                {busy ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Verify & Sign In'}
              </button>
            </form>
          )}

          <div className="mt-12 text-center">
            <p className="text-sm font-medium text-gray-500">
              Don't have an account?{' '}
              <Link to="/register" className="font-bold text-[#990000] hover:text-red-700 transition-colors">
                Register now
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
