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

      {/* ═══════ LOCATION / TN MAP ═══════ */}
      {/* Red on white: hero of the mid-page palette rhythm. The map card
          itself keeps a white surface so the GeoJSON renders legibly, but
          the surrounding section is maroon with white text + yellow accents. */}
      <section className="py-20 bg-[#990000] relative overflow-hidden">
        <div className="absolute top-0 right-0 w-72 h-72 bg-[#FFD700]/10 rounded-full -translate-y-1/3 translate-x-1/3" />
        <div className="absolute bottom-0 left-0 w-64 h-64 bg-white/5 rounded-full translate-y-1/3 -translate-x-1/3" />
        <div className="max-w-6xl mx-auto px-6 relative z-10">
          <div className="text-center mb-12 rv rv-up">
            <p className="text-[11px] font-bold text-[#FFD700] uppercase tracking-[4px] mb-3">
              Where We Serve
            </p>
            <h2 className="text-2xl md:text-3xl font-bold font-serif text-white">
              Mylapore in Tamil Nadu
            </h2>
            <div className="w-16 h-[3px] bg-[#FFD700] mx-auto mt-4 rounded-full" />
          </div>

          <div className="grid lg:grid-cols-5 gap-6 items-stretch">
            {/* Map card — white interior so the map renders properly. The
                yellow ring + frame ties it back into the palette. */}
            <div className="rv rv-up lg:col-span-3 bg-white rounded-2xl ring-2 ring-[#FFD700]/40 p-4 sm:p-6 shadow-xl shadow-black/20">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-bold text-[#990000]">Tamil Nadu District Map</h3>
                <span className="inline-flex items-center gap-2 text-[11px] font-semibold text-[#990000]">
                  <span className="w-2.5 h-2.5 rounded-sm bg-[#990000] ring-2 ring-[#FFD700]" />
                  Chennai (Mylapore)
                </span>
              </div>
              <div className="w-full h-[420px] sm:h-[480px] rounded-xl overflow-hidden bg-gray-50 relative">
                <TamilNaduMap highlightedDistrict="CHENNAI" />
              </div>
              <p className="text-[11px] text-gray-500 mt-3 leading-relaxed">
                Mylapore is one of 16 assembly constituencies in Chennai district. Hover any
                district to view its name.
              </p>
            </div>

            {/* Side panel — facts on yellow, CTA on dark wash of the section. */}
            <div className="rv rv-up lg:col-span-2 flex flex-col gap-4" data-d="2">
              <div className="bg-[#FFD700] rounded-2xl p-6 shadow-xl shadow-black/20 relative overflow-hidden">
                <div className="absolute -top-6 -right-6 w-24 h-24 bg-white/30 rounded-full" />
                <div className="relative z-10">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-11 h-11 rounded-xl bg-[#990000] grid place-items-center">
                      <Landmark className="w-5 h-5 text-[#FFD700]" />
                    </div>
                    <div>
                      <h3 className="text-[15px] font-bold text-[#990000] leading-tight">
                        Mylapore Constituency
                      </h3>
                      <p className="text-[11px] text-[#990000]/70 mt-0.5">
                        Chennai district · Tamil Nadu
                      </p>
                    </div>
                  </div>

                  <dl className="space-y-0 text-xs">
                    {[
                      ['State', 'Tamil Nadu'],
                      ['District', 'Chennai'],
                      ['Constituency', 'Mylapore (AC 22)'],
                      ['Population (approx.)', '3.2 lakh'],
                      ['Wards covered', '15 (Z9 + Z10)'],
                    ].map(([k, v]) => (
                      <div
                        key={k}
                        className="flex justify-between py-2.5 border-b border-[#990000]/15 last:border-0"
                      >
                        <span className="text-[#990000]/60">{k}</span>
                        <span className="font-semibold text-[#990000] text-right">{v}</span>
                      </div>
                    ))}
                  </dl>
                </div>
              </div>

              <div className="bg-white text-[#990000] rounded-2xl p-6 shadow-xl shadow-black/20 relative overflow-hidden ring-2 ring-[#FFD700]/40">
                <div className="absolute -bottom-10 -left-10 w-28 h-28 bg-[#FFD700]/20 rounded-full" />
                <div className="relative z-10">
                  <p className="text-[10px] font-bold uppercase tracking-[3px] text-[#FFD700] mb-2">
                    Direct to MLA
                  </p>
                  <h4 className="text-lg font-bold leading-tight text-[#990000]">
                    Every grievance lands on the MLA's desk within 24 hours.
                  </h4>
                  <p className="text-[12px] text-[#990000]/70 mt-2 leading-relaxed">
                    Tickets are tagged with your ward, geo-pinned and tracked end-to-end.
                  </p>
                  <button
                    onClick={() => go(user ? '/grievance' : '/register')}
                    className="mt-5 inline-flex items-center gap-2 bg-[#990000] text-white px-4 py-2.5 rounded-lg text-xs font-bold hover:bg-[#7a0000] transition-colors"
                  >
                    {user ? 'File a Grievance' : 'Register Now'}{' '}
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ═══════ STATS BAR ═══════ */}
      {/* Yellow band — counter-rhythm to the maroon TN-Map section above
          and the maroon Info Grid below. Forced to red text for legibility
          (white-on-yellow fails contrast outright). */}
      <section className="bg-[#FFD700] py-12 rv rv-up">
        <div className="max-w-6xl mx-auto px-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            {[
              { v: stats.totalReceived, l: t('totalReceived'), Icon: FileText },
              { v: stats.totalResolved, l: t('totalResolved'), Icon: CheckCircle2 },
              { v: stats.avgResponseTime, l: t('responseTime'), Icon: Timer },
              { v: stats.satisfaction, l: t('satisfaction'), Icon: Users },
            ].map((s, i) => (
              <div key={i} className="flex items-center gap-4">
                <div className="w-11 h-11 rounded-xl bg-[#990000] flex items-center justify-center flex-shrink-0 shadow-md shadow-black/10">
                  <s.Icon className="w-5 h-5 text-[#FFD700]" />
                </div>
                <div>
                  <div className="text-2xl md:text-3xl font-extrabold leading-none text-[#990000]">
                    {s.v}
                  </div>
                  <div className="text-[10px] text-[#990000]/70 uppercase tracking-widest mt-1 font-semibold">
                    {s.l}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ═══════ INFO GRID ═══════ */}
      {/* Maroon band with translucent glass cards — white text everywhere,
          yellow used only for accents (icons, divider dots, contact pills). */}
      <section className="py-16 bg-[#990000] relative overflow-hidden">
        <div className="absolute -top-16 -left-16 w-56 h-56 bg-[#FFD700]/10 rounded-full" />
        <div className="absolute -bottom-20 right-0 w-72 h-72 bg-white/5 rounded-full" />
        <div className="max-w-6xl mx-auto px-6 grid md:grid-cols-3 gap-6 relative z-10">

          {/* Announcements */}
          <div className="rv rv-left bg-white/10 backdrop-blur-sm rounded-2xl p-6 ring-1 ring-white/15">
            <h3 className="font-bold text-sm text-white mb-5 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-[#FFD700]" /> {t('announcements')}
            </h3>
            <ul className="space-y-3.5">
              {[
                { t: t('ann1'), d: '05 May 2026' },
                { t: t('ann2'), d: '03 May 2026' },
                { t: t('ann3'), d: '28 Apr 2026' },
              ].map((a, i) => (
                <li key={i} className="flex items-start gap-2.5 text-xs text-white/85 pb-3 border-b border-white/10 last:border-0 last:pb-0">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#FFD700] mt-1.5 flex-shrink-0" />
                  <div>
                    <p className="leading-relaxed">{a.t}</p>
                    <p className="text-[10px] text-white/50 mt-0.5">{a.d}</p>
                  </div>
                </li>
              ))}
            </ul>
          </div>

          {/* Constituency */}
          <div className="rv rv-up bg-white/10 backdrop-blur-sm rounded-2xl p-6 ring-1 ring-white/15" data-d="2">
            <h3 className="font-bold text-sm text-white mb-5 flex items-center gap-2">
              <Globe className="w-4 h-4 text-[#FFD700]" /> {t('constituencyInfo')}
            </h3>
            <div className="space-y-0 text-xs">
              {[
                [t('infoConstituency'), t('infoConstVal')],
                [t('infoDistrict'), t('infoDistVal')],
                [t('infoMLA'), t('infoMLAVal')],
                [t('infoParty'), t('infoPartyVal')],
                [t('infoTerm'), t('infoTermVal')],
              ].map(([k, v], i) => (
                <div key={i} className="flex justify-between py-2.5 border-b border-white/10 last:border-0">
                  <span className="text-white/60">{k}</span>
                  <span className="font-semibold text-white">{v}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Contact */}
          <div className="rv rv-right bg-white/10 backdrop-blur-sm rounded-2xl p-6 ring-1 ring-white/15" data-d="3">
            <h3 className="font-bold text-sm text-white mb-5 flex items-center gap-2">
              <Phone className="w-4 h-4 text-[#FFD700]" /> {t('contactUs')}
            </h3>
            <div className="space-y-3">
              {[
                { Icon: Phone, t: '1800-XXX-XXXX', d: t('tollFree') },
                { Icon: Mail, t: 'mla.mylapore@tn.gov.in', d: t('emailSupport') },
                { Icon: MapPin, t: t('mlaOffice'), d: t('officeHours') },
              ].map((c, i) => (
                <div key={i} className="flex items-center gap-3 p-3 bg-white/5 rounded-xl text-xs ring-1 ring-white/10">
                  <c.Icon className="w-4 h-4 text-[#FFD700] flex-shrink-0" />
                  <div>
                    <p className="font-semibold text-white">{c.t}</p>
                    <p className="text-[10px] text-white/60">{c.d}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ═══════ CTA ═══════ */}
      {/* Yellow closing band — final yellow beat in the red ↔ yellow rhythm. */}
      <section className="py-16 bg-[#FFD700] text-[#990000] rv rv-up relative overflow-hidden">
        <div className="absolute top-0 right-0 w-60 h-60 bg-white/30 rounded-full -translate-y-1/2 translate-x-1/2" />
        <div className="absolute bottom-0 left-0 w-48 h-48 bg-[#990000]/10 rounded-full translate-y-1/2 -translate-x-1/2" />
        <div className="max-w-2xl mx-auto px-6 text-center relative z-10">
          <h2 className="text-2xl md:text-3xl font-bold mb-4 text-[#990000]">{t('ctaTitle')}</h2>
          <p className="text-sm text-[#990000]/80 mb-8 max-w-md mx-auto leading-relaxed">
            {t('ctaDesc')}
          </p>
          <div className="flex flex-wrap justify-center gap-3">
            <button
              onClick={() => go('/grievance')}
              className="bg-[#990000] text-white px-7 py-3.5 rounded-xl text-sm font-bold lift hover:bg-[#7a0000] flex items-center gap-2 shadow-lg shadow-black/10"
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
