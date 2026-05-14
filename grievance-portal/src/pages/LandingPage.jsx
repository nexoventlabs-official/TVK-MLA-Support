import { useNavigate } from 'react-router-dom'
import { useEffect, useRef, useCallback, useState } from 'react'
import { ShieldCheck, UserPlus, Search, ArrowRight, MapPin, FileText, Eye, Phone, Mail, Globe, ChevronRight, AlertCircle, CheckCircle2, Timer, Users, Landmark } from 'lucide-react'
import TamilNaduMap from '../components/TamilNaduMap'
import { useLang } from '../i18n'
import { useAuth } from '../lib/auth'
import api from '../lib/api'

/* ——— Scroll-triggered reveal (landing.love style) ——— */
function useReveal() {
  const ref = useRef(null)
  const init = useCallback(() => {
    const el = ref.current
    if (!el) return
    const io = new IntersectionObserver(
      (entries) => entries.forEach((e) => {
        if (e.isIntersecting) { e.target.classList.add('shown'); io.unobserve(e.target) }
      }),
      { threshold: 0.1, rootMargin: '0px 0px -40px 0px' }
    )
    el.querySelectorAll('.rv').forEach((c) => io.observe(c))
    return () => io.disconnect()
  }, [])
  useEffect(init, [init])
  return ref
}

export default function LandingPage() {
  const go = useNavigate()
  const root = useReveal()
  const { t } = useLang()
  const { user } = useAuth()

  const [stats, setStats] = useState({
    totalReceived: '1,247',
    totalResolved: '834',
    avgResponseTime: '7 days',
    satisfaction: '14,500+'
  })

  useEffect(() => {
    let cancelled = false
    api.get('/portal/stats')
      .then((r) => {
        if (cancelled || !r.data?.success) return
        const s = r.data.stats || {}
        setStats({
          totalReceived: Number(s.totalReceived || 0).toLocaleString('en-IN'),
          totalResolved: Number(s.totalResolved || 0).toLocaleString('en-IN'),
          avgResponseTime: s.avgResponseTime || '7 days',
          satisfaction: s.satisfaction || '0+',
        })
      })
      .catch(() => { /* keep defaults */ })
    return () => { cancelled = true }
  }, [])

  return (
    <div ref={root} className="bg-white" style={{ overflowX: 'clip' }}>


      {/* ═══════ HERO ═══════ */}
      <section className="relative bg-[#990000]" style={{ overflow: 'clip' }}>
        {/* Background Overlay */}
        <div className="absolute inset-0 z-0">
          <img src="/bg.png" alt="Background" className="w-full h-full object-cover opacity-15" />
        </div>

        <div className="max-w-6xl mx-auto px-6 py-16 md:py-24 relative z-10">
          <div className="grid lg:grid-cols-2 gap-12 lg:gap-16 items-center">

            {/* Left — Copy */}
            <div>
              <div className="hero-anim inline-flex items-center gap-2 bg-[#FFD700]/20 text-[#FFD700] text-[11px] font-bold px-3.5 py-1.5 rounded-full mb-6 tracking-wider">
                <span className="w-1.5 h-1.5 rounded-full bg-[#FFD700] dot-pulse" />{t('portalActive')}
              </div>

              <h1 className="hero-anim hero-anim-d1 text-[2rem] md:text-[2.75rem] lg:text-[3.25rem] font-bold font-serif text-white leading-[1.15] tracking-tight">
                {t('heroTitle1')}<br />{t('heroTitle2')}{' '}
                <span className="text-[#FFD700]">{t('heroTitle3')}</span>
              </h1>

              <p className="hero-anim hero-anim-d2 text-white/80 text-[15px] md:text-base leading-relaxed mt-6 max-w-md">
                {t('heroDesc')} <strong className="text-white">{t('heroMLA')}</strong>. 
                {t('heroResponse')} <strong className="text-[#FFD700]">{t('heroResponseDays')}</strong>.
              </p>

              <div className="hero-anim hero-anim-d3 flex flex-wrap gap-3 mt-8">
                {user ? (
                  <>
                    <button 
                      onClick={() => go('/grievance')} 
                      style={{ WebkitMaskImage: "url('/button.png')", maskImage: "url('/button.png')", WebkitMaskSize: "100% 100%", maskSize: "100% 100%", WebkitMaskRepeat: "no-repeat", maskRepeat: "no-repeat" }}
                      className="bg-[#FFD700] text-[#990000] px-10 py-4 text-sm font-extrabold flex items-center justify-center gap-2.5 lift hover:bg-[#FFD700]/90 transition-colors drop-shadow-lg"
                    >
                      <FileText className="w-4 h-4" /> File a Grievance
                    </button>
                    <button onClick={() => go('/my-grievances')} className="bg-white/10 border border-white/20 backdrop-blur-sm text-white px-8 py-3.5 rounded-xl text-sm font-semibold flex items-center gap-2.5 lift hover:bg-white/20 transition-colors shadow-lg shadow-black/10">
                      My Requests <ArrowRight className="w-4 h-4" />
                    </button>
                  </>
                ) : (
                  <>
                    <button 
                      onClick={() => go('/login')} 
                      style={{ WebkitMaskImage: "url('/button.png')", maskImage: "url('/button.png')", WebkitMaskSize: "100% 100%", maskSize: "100% 100%", WebkitMaskRepeat: "no-repeat", maskRepeat: "no-repeat" }}
                      className="bg-[#FFD700] text-[#990000] px-10 py-4 text-sm font-extrabold flex items-center justify-center gap-2.5 lift hover:bg-[#FFD700]/90 transition-colors drop-shadow-lg"
                    >
                      <UserPlus className="w-4 h-4" /> Log In
                    </button>
                    <button 
                      onClick={() => go('/register')} 
                      style={{ WebkitMaskImage: "url('/button.png')", maskImage: "url('/button.png')", WebkitMaskSize: "100% 100%", maskSize: "100% 100%", WebkitMaskRepeat: "no-repeat", maskRepeat: "no-repeat" }}
                      className="bg-[#FFD700] text-[#990000] px-10 py-4 text-sm font-extrabold flex items-center justify-center gap-2.5 lift hover:bg-[#FFD700]/90 transition-colors drop-shadow-lg"
                    >
                      Register Now <ArrowRight className="w-4 h-4" />
                    </button>
                  </>
                )}
              </div>


            </div>

            {/* Right — Image */}
            <div className="img-reveal relative flex justify-center items-end mt-8 lg:mt-0">
              <div className="relative w-full max-w-md transform -translate-y-6 md:-translate-y-10">
                <img 
                  src="/cta-bg-1-1.png" 
                  alt="" 
                  className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[200%] md:w-[220%] max-w-none z-0 pointer-events-none"
                />
                <img src="/footer.png" alt="MLA Venkatramanan" className="relative z-10 w-full h-auto block drop-shadow-[0_20px_20px_rgba(0,0,0,0.5)]" />
              </div>
            </div>

          </div>
        </div>
      </section>

      {/* ═══════ STATS BAR ═══════ */}
      <section className="bg-[#FFD700] py-8 relative z-20 shadow-[0_10px_30px_rgba(0,0,0,0.1)] rv rv-up">
        <div className="max-w-6xl mx-auto px-6 flex flex-wrap justify-center gap-12 md:gap-32">
          {[
            { n: stats.totalReceived, l: t('received') },
            { n: stats.totalResolved, l: t('resolved') },
            { n: stats.avgResponseTime, l: t('avgResponse') },
          ].map((s, i) => (
            <div key={i} className="text-center">
              <div className="text-4xl font-extrabold text-[#990000] leading-none mb-2 drop-shadow-sm">{s.n}</div>
              <div className="text-xs text-[#990000]/80 font-bold uppercase tracking-widest">{s.l}</div>
            </div>
          ))}
        </div>
      </section>

      {/* ═══════ LOCATION / TN MAP ═══════ */}
      <section className="relative py-20 overflow-hidden">
        <img 
          alt="Districts background" 
          decoding="async"
          className="object-cover absolute inset-0 w-full h-full z-0"
          style={{ color: 'transparent' }}
          src="/bg-lap.png" 
        />
        {/* Dark red overlay for text contrast and blending */}
        <div className="absolute inset-0 bg-[#990000]/85 z-0 mix-blend-multiply" />
        <div className="absolute inset-0 bg-[#990000]/60 z-0" />
        
        <div className="max-w-6xl mx-auto px-6 relative z-10">
          <div className="mb-8 rv rv-up">
            <h2 className="text-4xl md:text-[3.5rem] font-black text-white tracking-tight drop-shadow-md font-sans uppercase" style={{ fontFamily: 'Impact, sans-serif' }}>
              District Structure
            </h2>
          </div>

          <div className="relative border-2 border-white rounded-[2rem] p-6 md:p-10 min-h-[450px] md:min-h-[550px] flex items-center justify-center shadow-2xl bg-transparent rv rv-up">
            
            {/* Main TN Map */}
            <div className="w-full md:w-[80%] lg:w-[70%] h-[350px] md:h-[450px] relative pointer-events-auto z-10">
               <TamilNaduMap 
                 highlightedDistrict="CHENNAI" 
                 baseFill="#ffffff"
                 baseColor="#990000"
                 baseOpacity={1}
                 hoverFill="#fef08a"
                 highlightFill="#FFD700"
                 highlightColor="#990000"
                 highlightOpacity={1}
                 zoom={6.8}
                 center={[10.9, 78.4]}
               />
            </div>

          </div>
        </div>
      </section>


      {/* ═══════ WHATSAPP CTA ═══════ */}
      {/* Yellow closing band with WhatsApp integration */}
      <section className="py-16 bg-[#FFD700] text-[#990000] rv rv-up">
        <div className="max-w-4xl mx-auto px-6">
          <div className="flex flex-col md:flex-row items-center justify-between gap-10">
            {/* Left — Text */}
            <div className="text-center md:text-left flex-1">
              <h2 className="text-2xl md:text-3xl font-bold mb-4 text-[#990000]">
                Connect on WhatsApp
              </h2>
              <p className="text-sm text-[#990000]/80 mb-6 leading-relaxed max-w-md mx-auto md:mx-0">
                Have a question or need direct assistance? Scan the QR code to chat with the MLA's office directly on WhatsApp. We are ready to listen and help you.
              </p>
              <a 
                href="https://wa.me/919791659816"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 bg-[#990000] text-[#FFD700] hover:bg-[#800000] transition-colors px-6 py-3 rounded-full font-bold text-sm shadow-md lift"
              >
                <svg viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
                  <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51a12.8 12.8 0 0 0-.57-.01c-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 0 1-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 0 1-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 0 1 2.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0 0 12.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 0 0 5.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 0 0-3.48-8.413Z"/>
                </svg>
                +91 9791659816
              </a>
            </div>

            {/* Right — QR Code */}
            <div className="flex flex-col items-center flex-shrink-0">
              <div className="bg-white p-4 rounded-3xl shadow-2xl rotate-2 hover:rotate-0 transition-transform duration-300">
                <img 
                  src="https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=https://wa.me/919791659816&color=990000" 
                  alt="WhatsApp QR Code" 
                  className="w-40 h-40 md:w-48 md:h-48"
                  loading="lazy"
                />
              </div>
              <p className="mt-4 text-[11px] font-bold uppercase tracking-[3px] text-[#990000]">
                Scan to Chat
              </p>
            </div>
          </div>
        </div>
      </section>

    </div>
  )
}
