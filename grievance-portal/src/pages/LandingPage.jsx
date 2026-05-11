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
                <img src="/mla.png" alt="MLA Venkatramanan" className="relative z-10 w-full h-auto block drop-shadow-[0_20px_20px_rgba(0,0,0,0.5)]" />
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


      {/* ═══════ CTA ═══════ */}
      {/* Yellow closing band — final yellow beat in the red ↔ yellow rhythm. */}
      <section className="py-16 bg-[#FFD700] text-[#990000] rv rv-up">
        <div className="max-w-2xl mx-auto px-6 text-center">
          <h2 className="text-2xl md:text-3xl font-bold mb-4 text-[#990000]">{t('ctaTitle')}</h2>
          <p className="text-sm text-[#990000]/80 mb-8 max-w-md mx-auto leading-relaxed">
            {t('ctaDesc')}
          </p>
          <div className="flex flex-wrap justify-center gap-3">
            <button
              onClick={() => go('/grievance')}
              className="bg-[url('/button.png')] bg-[length:100%_100%] bg-no-repeat bg-center bg-transparent text-white px-10 py-4 text-sm font-bold lift hover:opacity-90 transition-opacity drop-shadow-lg flex items-center gap-2"
            >
              {t('ctaBtn')} <ArrowRight className="w-4 h-4" />
            </button>
            <button
              onClick={() => go('/track')}
              className="border-2 border-[#990000]/30 text-[#990000] px-7 py-3.5 rounded-xl text-sm font-semibold hover:bg-[#990000] hover:text-white hover:border-[#990000] transition-all flex items-center gap-2"
            >
              {t('trackBtn')} <Search className="w-4 h-4" />
            </button>
          </div>
        </div>
      </section>

    </div>
  )
}
