import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowRight, Lock, User, ShieldCheck } from 'lucide-react';
import api from '../api';

/**
 * Monochrome admin sign-in. Two-column layout:
 *
 *   Left  — pitch-black brand panel with a subtle dot lattice, the TVK
 *           emblem and a single-line mission statement. Stays fixed to
 *           ~45% of the viewport so the form keeps the focus.
 *   Right — pure white form column. Inter Tight title, single accent
 *           via the underline rule, icon-prefixed inputs, ⌘+enter
 *           keyboard hint on the primary action.
 *
 * No saturated colours, no glow blobs, no gradients — every visual is
 * black, white, or a step in between.
 */
export default function Login({ setAuth }) {
  const nav = useNavigate();
  const [form, setForm] = useState({ username: 'admin', password: '' });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const submit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const { data } = await api.post('/auth/login', form);
      localStorage.setItem('tvk_token', data.token);
      setAuth(data.user);
      nav('/', { replace: true });
    } catch (err) {
      setError(err.response?.data?.error || err.message || 'Sign in failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex bg-white animate-fade-in">
      {/* ─── Left: black brand panel ─── */}
      <div className="relative hidden md:flex md:w-[45%] lg:w-[48%] flex-col bg-brand-950 text-white overflow-hidden">
        {/* Dot lattice — pure CSS, very subtle. */}
        <div
          className="absolute inset-0 opacity-[0.06]"
          style={{
            backgroundImage:
              'radial-gradient(rgba(255,255,255,0.6) 1px, transparent 1px)',
            backgroundSize: '22px 22px',
          }}
        />
        {/* Soft white wash near top-left so the headline lifts off the field. */}
        <div className="absolute -top-24 -left-24 w-[360px] h-[360px] rounded-full bg-white/5 blur-3xl" />

        <div className="relative z-10 flex flex-col h-full p-10 lg:p-14">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-md bg-white/10 border border-white/15 overflow-hidden">
              <img src="/mla.png" alt="TVK" className="w-full h-full object-cover" />
            </div>
            <div className="leading-tight">
              <div className="font-display text-[15px] font-semibold tracking-tightest">
                TVK Grievance
              </div>
              <div className="text-[10px] font-semibold tracking-[0.22em] uppercase text-white/45 mt-0.5">
                Admin Console
              </div>
            </div>
          </div>

          <div className="mt-auto">
            <div className="text-[10px] font-semibold tracking-[0.28em] uppercase text-white/40 mb-4">
              Authorised Access
            </div>
            <h1 className="font-display text-4xl lg:text-5xl xl:text-[56px] font-semibold tracking-tightest leading-[1.05]">
              A calmer way to
              <br />
              run the office.
            </h1>
            <span className="block h-px w-16 mt-8 bg-white/30" />
            <p className="mt-6 max-w-md text-white/65 text-[14px] leading-relaxed">
              Sign in to manage citizen grievances, voter records, broadcast
              campaigns, and the constituency outreach calendar — from a single
              minimal console.
            </p>

            <div className="mt-12 inline-flex items-center gap-2 text-[11px] tracking-[0.16em] uppercase text-white/40">
              <ShieldCheck size={12} /> Secure JWT session · Activity audited
            </div>
          </div>
        </div>
      </div>

      {/* ─── Right: form column ─── */}
      <div className="w-full md:w-[55%] lg:w-[52%] flex items-center justify-center px-6 sm:px-12 py-12 relative">
        {/* Mobile mini-header so users on phones still see the brand. */}
        <div className="md:hidden absolute top-0 inset-x-0 px-5 py-4 flex items-center gap-3 border-b border-brand-200">
          <div className="w-8 h-8 rounded-md bg-brand-950 overflow-hidden">
            <img src="/mla.png" alt="TVK" className="w-full h-full object-cover" />
          </div>
          <div className="leading-tight">
            <div className="font-display text-[14px] font-semibold tracking-tightest text-brand-900">
              TVK Grievance
            </div>
            <div className="text-[10px] font-semibold tracking-[0.22em] uppercase text-brand-400 mt-0.5">
              Admin Console
            </div>
          </div>
        </div>

        <div className="w-full max-w-[420px] animate-slide-up mt-20 md:mt-0">
          <div className="mb-10">
            <div className="text-[10px] font-semibold tracking-[0.28em] uppercase text-brand-500 mb-3">
              Sign in
            </div>
            <h2 className="font-display text-[34px] sm:text-[40px] font-semibold tracking-tightest leading-[1.05] text-brand-900">
              Welcome back.
            </h2>
            <span className="block h-[2px] w-10 bg-brand-900 mt-5" />
            <p className="mt-5 text-[14px] text-brand-500 leading-relaxed">
              Use your administrator credentials to continue.
            </p>
          </div>

          <form onSubmit={submit} className="space-y-5">
            <div>
              <label className="label">Username</label>
              <div className="relative">
                <User
                  size={15}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-brand-400 pointer-events-none"
                />
                <input
                  className="input pl-9"
                  value={form.username}
                  onChange={(e) => setForm({ ...form, username: e.target.value })}
                  autoFocus
                  required
                  placeholder="admin"
                  autoComplete="username"
                />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between">
                <label className="label">Password</label>
              </div>
              <div className="relative">
                <Lock
                  size={15}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-brand-400 pointer-events-none"
                />
                <input
                  type="password"
                  className="input pl-9"
                  value={form.password}
                  onChange={(e) => setForm({ ...form, password: e.target.value })}
                  required
                  placeholder="••••••••"
                  autoComplete="current-password"
                />
              </div>
            </div>

            {error && (
              <div className="text-[13px] font-medium text-red-700 bg-red-50 border border-red-200 rounded-md px-3.5 py-2.5 animate-fade-in">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="btn-primary w-full justify-between py-2.5 text-[14px] mt-2 group"
            >
              <span>{loading ? 'Signing in…' : 'Sign in to console'}</span>
              <ArrowRight
                size={15}
                className="transition-transform duration-200 group-hover:translate-x-0.5"
              />
            </button>
          </form>

          <div className="mt-10 pt-6 border-t border-brand-200/70 text-[11px] text-brand-400 tracking-wide flex items-center justify-between">
            <span>© {new Date().getFullYear()} TVK Grievance</span>
            <span className="font-mono">v1.0</span>
          </div>
        </div>
      </div>
    </div>
  );
}
