import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Lock, User, ShieldCheck, Landmark } from 'lucide-react';
import api, { TOKEN_KEY } from '../api';

/**
 * Formal, government-letterhead style login for the Mylapore
 * constituency admin. Split layout:
 *   Left column  — navy emblem wall with crest, motto and address.
 *   Right column — crisp ivory form card with gold rule, Inter+serif mix.
 *
 * The username is pre-filled with "Mylapore" to match the seeded
 * account — the officer only has to type the password.
 */
export default function Login({ setAuth }) {
  const nav = useNavigate();
  const [form, setForm] = useState({ username: 'Mylapore', password: '' });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const submit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const { data } = await api.post('/auth/login', form);
      localStorage.setItem(TOKEN_KEY, data.token);
      setAuth(data.user);
      nav('/', { replace: true });
    } catch (err) {
      setError(err.response?.data?.error || err.message || 'Sign in failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex bg-ivory-50 relative overflow-hidden animate-fade-in">
      {/* ═══════════════ Left: emblem wall ═══════════════ */}
      <div className="relative hidden md:flex md:w-[55%] lg:w-[60%] flex-col bg-brand-900 text-white overflow-hidden">
        {/* Decorative diagonal light bar */}
        <div className="absolute inset-0 opacity-[0.08] pointer-events-none"
             style={{
               backgroundImage:
                 'repeating-linear-gradient(135deg, #fff 0, #fff 1px, transparent 1px, transparent 24px)',
             }}
        />
        {/* Radial gold glow behind the emblem */}
        <div className="absolute top-1/3 -left-20 w-[520px] h-[520px] rounded-full bg-accent-500/20 blur-3xl pointer-events-none" />
        <div className="absolute bottom-10 right-10 w-[420px] h-[420px] rounded-full bg-brand-500/20 blur-3xl pointer-events-none" />

        {/* Gold ribbon header */}
        <div className="relative h-1.5 bg-gradient-to-r from-accent-400 via-accent-500 to-accent-400" />

        {/* Top chrome: address line */}
        <div className="relative px-10 lg:px-16 pt-8 pb-4 flex items-center justify-between z-10">
          <div className="flex items-center gap-2 text-xs tracking-[0.22em] uppercase text-accent-200 font-semibold">
            <Landmark size={14} />
            Government of Tamil Nadu
          </div>
          <div className="text-xs tracking-[0.18em] uppercase text-white/60 font-semibold">
            Constituency 173 · Mylapore
          </div>
        </div>

        {/* Centre emblem + title block */}
        <div className="relative flex-1 flex flex-col items-center justify-center px-10 lg:px-20 text-center z-10">
          <div className="relative mb-8">
            <div className="absolute inset-0 rounded-full bg-accent-400/30 blur-2xl" />
            <img
              src="/mla.png"
              alt="Emblem"
              className="relative w-32 h-32 lg:w-40 lg:h-40 rounded-full object-cover ring-4 ring-accent-400/60 ring-offset-4 ring-offset-brand-900 shadow-2xl"
            />
          </div>
          <div className="text-[11px] font-bold tracking-[0.32em] uppercase text-accent-300 mb-3">
            Office of the Member of Legislative Assembly
          </div>
          <h1 className="font-serif text-4xl lg:text-5xl xl:text-6xl font-bold tracking-tight leading-tight">
            Mylapore
            <br />
            <span className="text-accent-300">Legislative Assembly</span>
          </h1>
          <span className="block mt-6 h-[3px] w-24 rounded-full bg-gradient-to-r from-accent-400 via-accent-500 to-accent-400" />
          <p className="mt-6 max-w-md text-white/75 text-[13px] leading-relaxed">
            Secure digital gateway for constituency-level grievance redressal,
            citizen outreach and official service requests. Accessible only to
            authorised officers.
          </p>
        </div>

        {/* Bottom seal */}
        <div className="relative px-10 lg:px-16 pb-8 pt-4 flex items-center justify-between z-10 text-[11px] tracking-wide text-white/55">
          <div className="flex items-center gap-2">
            <ShieldCheck size={14} className="text-accent-300" />
            <span className="uppercase tracking-[0.2em]">Secure · Authenticated · Audited</span>
          </div>
          <div className="font-serif italic text-accent-200">In Service of the People</div>
        </div>
      </div>

      {/* ═══════════════ Right: form ═══════════════ */}
      <div className="w-full md:w-[45%] lg:w-[40%] flex items-center justify-center px-6 sm:px-10 py-12 relative">
        {/* Mobile emblem (hidden above md) */}
        <div className="md:hidden absolute top-0 inset-x-0 bg-brand-900 text-white">
          <div className="h-1.5 bg-gradient-to-r from-accent-400 via-accent-500 to-accent-400" />
          <div className="px-6 py-6 flex items-center gap-3">
            <img src="/mla.png" alt="Emblem" className="w-12 h-12 rounded-full object-cover ring-2 ring-accent-400/70" />
            <div className="leading-tight">
              <div className="text-[10px] tracking-[0.22em] uppercase text-accent-300 font-semibold">
                Office of the MLA
              </div>
              <div className="font-serif font-bold text-lg">Mylapore Legislative Assembly</div>
            </div>
          </div>
        </div>

        <div className="w-full max-w-md animate-slide-up mt-28 md:mt-0">
          <div className="mb-8">
            <div className="text-[10px] font-bold tracking-[0.28em] uppercase text-brand-600 mb-2">
              Officer Sign-in
            </div>
            <h2 className="gov-heading text-3xl font-bold text-brand-900">
              Access the Console
            </h2>
            <span className="gold-rule mt-3" />
            <p className="mt-4 text-sm text-gray-600 leading-relaxed">
              Please enter your constituency credentials to continue. Unauthorised
              access is strictly prohibited and monitored.
            </p>
          </div>

          <form onSubmit={submit} className="card p-7 space-y-5 border-l-[3px] border-l-accent-400">
            <div>
              <label className="label">Username</label>
              <div className="relative">
                <User
                  size={16}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none"
                />
                <input
                  className="input pl-10"
                  value={form.username}
                  onChange={(e) => setForm({ ...form, username: e.target.value })}
                  autoFocus
                  required
                  placeholder="Mylapore"
                  autoComplete="username"
                />
              </div>
            </div>

            <div>
              <label className="label">Password</label>
              <div className="relative">
                <Lock
                  size={16}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none"
                />
                <input
                  type="password"
                  className="input pl-10"
                  value={form.password}
                  onChange={(e) => setForm({ ...form, password: e.target.value })}
                  required
                  placeholder="••••••••"
                  autoComplete="current-password"
                />
              </div>
            </div>

            {error && (
              <div className="text-sm font-medium text-red-700 bg-red-50 border border-red-200 rounded-lg px-4 py-3 animate-fade-in">
                {error}
              </div>
            )}

            <button type="submit" disabled={loading} className="btn-primary w-full py-3 mt-2 text-base">
              {loading ? 'Authenticating…' : 'Sign in Securely'}
            </button>

            <div className="text-[11px] text-gray-500 tracking-wide flex items-center gap-2 justify-center pt-2">
              <ShieldCheck size={12} className="text-brand-600" />
              <span>Protected by JWT session · Activity is logged</span>
            </div>
          </form>

          <p className="mt-6 text-center text-[10px] text-gray-400 font-medium tracking-[0.22em] uppercase">
            Mylapore Constituency Grievance Cell
          </p>
        </div>
      </div>
    </div>
  );
}
