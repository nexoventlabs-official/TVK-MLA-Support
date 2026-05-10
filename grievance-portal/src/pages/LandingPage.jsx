import { useNavigate } from 'react-router-dom'
import { useEffect, useRef, useCallback, useState } from 'react'
import { ShieldCheck, UserPlus, Search, ArrowRight, MapPin, FileText, Eye, Phone, Mail, Globe, ChevronRight, AlertCircle, CheckCircle2, Timer, Users } from 'lucide-react'
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
                    <button onClick={() => go('/grievance')} className="bg-[#FFD700] text-black px-8 py-3.5 rounded-xl text-sm font-bold flex items-center gap-2.5 lift hover:bg-[#FFD700]/90 transition-colors shadow-lg shadow-[#FFD700]/20">
                      <FileText className="w-4 h-4" /> File a Grievance
                    </button>
                    <button onClick={() => go('/my-grievances')} className="bg-white/10 border border-white/20 backdrop-blur-sm text-white px-8 py-3.5 rounded-xl text-sm font-semibold flex items-center gap-2.5 lift hover:bg-white/20 transition-colors shadow-lg shadow-black/10">
                      My Requests <ArrowRight className="w-4 h-4" />
                    </button>
                  </>
                ) : (
                  <>
                    <button onClick={() => go('/login')} className="bg-[#FFD700] text-black px-8 py-3.5 rounded-xl text-sm font-bold flex items-center gap-2.5 lift hover:bg-[#FFD700]/90 transition-colors shadow-lg shadow-[#FFD700]/20">
                      <UserPlus className="w-4 h-4" /> Log In
                    </button>
                    <button onClick={() => go('/register')} className="bg-white/10 border border-white/20 backdrop-blur-sm text-white px-8 py-3.5 rounded-xl text-sm font-semibold flex items-center gap-2.5 lift hover:bg-white/20 transition-colors shadow-lg shadow-black/10">
                      Register Now <ArrowRight className="w-4 h-4" />
                    </button>
                  </>
                )}
              </div>

              {/* Mini stats */}
              <div className="hero-anim hero-anim-d4 flex gap-8 mt-10 pt-8 border-t border-white/20">
                {[
                  { n: stats.totalReceived, l: t('received') },
                  { n: stats.totalResolved, l: t('resolved') },
                  { n: stats.avgResponseTime, l: t('avgResponse') },
                ].map((s, i) => (
                  <div key={i}>
                    <div className="text-xl font-extrabold text-white leading-none">{s.n}</div>
                    <div className="text-[10px] text-white/60 uppercase tracking-widest mt-1">{s.l}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* Right — Image */}
            <div className="img-reveal relative flex justify-center items-end mt-8 lg:mt-0">
              <div className="relative w-full max-w-md">
                <img src="/mla.png" alt="MLA Venkatramanan" className="w-full h-auto block drop-shadow-[0_20px_20px_rgba(0,0,0,0.5)] transform translate-y-4 md:translate-y-8" />
              </div>

            </div>

          </div>
        </div>
      </section>

      {/* ═══════ SERVICES ═══════ */}
      <section className="py-20 bg-gray-50/70">
        <div className="max-w-6xl mx-auto px-6">
          <div className="text-center mb-14 rv rv-up">
            <p className="text-[11px] font-bold text-saffron uppercase tracking-[4px] mb-3">{t('whatYouCanDo')}</p>
            <h2 className="text-2xl md:text-3xl font-bold font-serif text-navy">{t('ourServices')}</h2>
            <div className="section-line mx-auto mt-4" />
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[
              { Icon: FileText, title: t('fileGrievance'), desc: t('fileGrievanceDesc'), color: 'navy', to: '/grievance' },
              { Icon: Search, title: t('trackStatus'), desc: t('trackStatusDesc'), color: 'tvk-green', to: '/track' },
              { Icon: Eye, title: t('viewResponse'), desc: t('viewResponseDesc'), color: 'saffron', to: '/my-grievances' },
            ].map((s, i) => (
              <div key={i} className={`rv rv-up bg-white rounded-2xl p-7 border border-gray-100 cursor-pointer group lift`} data-d={i + 1} onClick={() => go(s.to)}>
                <div className={`icon-box w-14 h-14 rounded-2xl bg-${s.color}/5 flex items-center justify-center mb-5 group-hover:bg-${s.color} group-hover:shadow-lg`}>
                  <s.Icon className={`w-6 h-6 text-${s.color} group-hover:text-white transition-colors`} />
                </div>
                <h3 className="font-bold text-navy text-lg mb-2">{s.title}</h3>
                <p className="text-sm text-gray-500 leading-relaxed mb-5">{s.desc}</p>
                <span className="inline-flex items-center text-xs font-semibold text-navy group-hover:text-saffron transition-colors">
                  {t('getStarted')} <ChevronRight className="w-3.5 h-3.5 ml-1 group-hover:translate-x-1 transition-transform" />
                </span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ═══════ HOW IT WORKS ═══════ */}
      <section className="py-20 bg-white">
        <div className="max-w-5xl mx-auto px-6">
          <div className="text-center mb-14 rv rv-up">
            <p className="text-[11px] font-bold text-saffron uppercase tracking-[4px] mb-3">{t('simpleProcess')}</p>
            <h2 className="text-2xl md:text-3xl font-bold font-serif text-navy">{t('howItWorks')}</h2>
            <div className="section-line mx-auto mt-4" />
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 md:gap-6">
            {[
              { n: '01', Icon: ShieldCheck, t: t('step1'), d: t('step1Desc') },
              { n: '02', Icon: FileText, t: t('step2'), d: t('step2Desc') },
              { n: '03', Icon: MapPin, t: t('step3'), d: t('step3Desc') },
              { n: '04', Icon: CheckCircle2, t: t('step4'), d: t('step4Desc') },
            ].map((s, i) => (
              <div key={i} className="rv rv-up text-center" data-d={i + 1}>
                <div className="relative inline-block mb-5">
                  <div className="w-18 h-18 w-[72px] h-[72px] rounded-2xl bg-gray-50 border border-gray-100 flex items-center justify-center mx-auto">
                    <s.Icon className="w-7 h-7 text-navy" />
                  </div>
                  <span className="absolute -top-2.5 -right-2.5 w-7 h-7 rounded-full bg-navy text-white text-[11px] font-bold flex items-center justify-center shadow-md">
                    {s.n}
                  </span>
                </div>
                <h4 className="font-bold text-sm text-navy mb-1">{s.t}</h4>
                <p className="text-xs text-gray-400 leading-relaxed">{s.d}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ═══════ STATS BAR ═══════ */}
      <section className="rv rv-up">
        <div className="max-w-6xl mx-auto px-6 py-6">
          <div className="rounded-2xl bg-gradient-to-br from-navy-dark to-navy text-white p-8 md:p-10 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-60 h-60 bg-white/[0.03] rounded-full -translate-y-1/2 translate-x-1/2" />
            <div className="absolute bottom-0 left-0 w-48 h-48 bg-white/[0.03] rounded-full translate-y-1/2 -translate-x-1/2" />
            <div className="relative z-10 grid grid-cols-2 md:grid-cols-4 gap-8">
              {[
                { v: stats.totalReceived, l: t('totalReceived'), Icon: FileText, c: 'text-white' },
                { v: stats.totalResolved, l: t('totalResolved'), Icon: CheckCircle2, c: 'text-green-400' },
                { v: stats.avgResponseTime, l: t('responseTime'), Icon: Timer, c: 'text-orange-300' },
                { v: stats.satisfaction, l: t('satisfaction'), Icon: Users, c: 'text-blue-300' },
              ].map((s, i) => (
                <div key={i} className="flex items-center gap-4">
                  <div className="w-11 h-11 rounded-xl bg-white/10 flex items-center justify-center flex-shrink-0">
                    <s.Icon className="w-5 h-5 text-blue-300" />
                  </div>
                  <div>
                    <div className={`text-2xl md:text-3xl font-extrabold leading-none ${s.c}`}>{s.v}</div>
                    <div className="text-[10px] text-blue-200/60 uppercase tracking-widest mt-1">{s.l}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ═══════ INFO GRID ═══════ */}
      <section className="py-16 bg-gray-50/50">
        <div className="max-w-6xl mx-auto px-6 grid md:grid-cols-3 gap-6">

          {/* Announcements */}
          <div className="rv rv-left bg-white rounded-2xl p-6 border border-gray-100">
            <h3 className="font-bold text-sm text-navy mb-5 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-saffron" /> {t('announcements')}
            </h3>
            <ul className="space-y-3.5">
              {[
                { t: t('ann1'), d: '05 May 2026' },
                { t: t('ann2'), d: '03 May 2026' },
                { t: t('ann3'), d: '28 Apr 2026' },
              ].map((a, i) => (
                <li key={i} className="flex items-start gap-2.5 text-xs text-gray-600 pb-3 border-b border-gray-50 last:border-0 last:pb-0">
                  <span className="w-1.5 h-1.5 rounded-full bg-saffron mt-1.5 flex-shrink-0" />
                  <div><p className="leading-relaxed">{a.t}</p><p className="text-[10px] text-gray-400 mt-0.5">{a.d}</p></div>
                </li>
              ))}
            </ul>
          </div>

          {/* Constituency */}
          <div className="rv rv-up bg-white rounded-2xl p-6 border border-gray-100" data-d="2">
            <h3 className="font-bold text-sm text-navy mb-5 flex items-center gap-2">
              <Globe className="w-4 h-4 text-navy" /> {t('constituencyInfo')}
            </h3>
            <div className="space-y-0 text-xs">
              {[
                [t('infoConstituency'), t('infoConstVal')],
                [t('infoDistrict'), t('infoDistVal')],
                [t('infoMLA'), t('infoMLAVal')],
                [t('infoParty'), t('infoPartyVal')],
                [t('infoTerm'), t('infoTermVal')],
              ].map(([k, v], i) => (
                <div key={i} className="flex justify-between py-2.5 border-b border-gray-50 last:border-0">
                  <span className="text-gray-400">{k}</span>
                  <span className="font-semibold text-navy">{v}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Contact */}
          <div className="rv rv-right bg-white rounded-2xl p-6 border border-gray-100" data-d="3">
            <h3 className="font-bold text-sm text-navy mb-5 flex items-center gap-2">
              <Phone className="w-4 h-4 text-tvk-green" /> {t('contactUs')}
            </h3>
            <div className="space-y-3">
              {[
                { Icon: Phone, t: '1800-XXX-XXXX', d: t('tollFree') },
                { Icon: Mail, t: 'mla.mylapore@tn.gov.in', d: t('emailSupport') },
                { Icon: MapPin, t: t('mlaOffice'), d: t('officeHours') },
              ].map((c, i) => (
                <div key={i} className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl text-xs">
                  <c.Icon className="w-4 h-4 text-navy flex-shrink-0" />
                  <div><p className="font-semibold text-navy">{c.t}</p><p className="text-[10px] text-gray-400">{c.d}</p></div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ═══════ CTA ═══════ */}
      <section className="py-16 bg-navy text-white rv rv-up">
        <div className="max-w-2xl mx-auto px-6 text-center">
          <h2 className="text-2xl md:text-3xl font-bold mb-4">{t('ctaTitle')}</h2>
          <p className="text-sm text-blue-200/80 mb-8 max-w-md mx-auto leading-relaxed">
            {t('ctaDesc')}
          </p>
          <div className="flex flex-wrap justify-center gap-3">
            <button onClick={() => go('/grievance')} className="bg-white text-navy px-7 py-3.5 rounded-xl text-sm font-bold lift hover:bg-gray-50 flex items-center gap-2">
              {t('ctaBtn')} <ArrowRight className="w-4 h-4" />
            </button>
            <button onClick={() => go('/track')} className="border-2 border-white/20 text-white px-7 py-3.5 rounded-xl text-sm font-semibold hover:bg-white/10 transition-all flex items-center gap-2">
              {t('trackBtn')} <Search className="w-4 h-4" />
            </button>
          </div>
        </div>
      </section>

    </div>
  )
}
