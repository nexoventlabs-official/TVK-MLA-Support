import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api';

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
      setError(err.response?.data?.error || err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col md:flex-row bg-white animate-fade-in">
      {/* Left side: Image and Branding */}
      <div className="relative w-full md:w-1/2 h-64 md:h-screen flex flex-col justify-end overflow-hidden bg-brand-900">
        <div className="absolute inset-0">
          <img
            src="/logo.png"
            alt="Logo Background"
            className="w-full h-full object-cover object-top opacity-80"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-brand-900 via-brand-900/60 to-transparent mix-blend-multiply" />
        </div>
        <div className="relative z-10 p-8 md:p-16 text-white pb-12 md:pb-24">
          <h2 className="text-3xl md:text-5xl font-extrabold tracking-tight mb-4 drop-shadow-lg">
            Tamilaga Vettri Kazhagam
          </h2>
          <p className="text-lg md:text-xl font-medium text-brand-100 max-w-md drop-shadow-md">
            Grievance Redressal System Admin Console.
          </p>
        </div>
      </div>

      {/* Right side: Login Form */}
      <div className="w-full md:w-1/2 flex items-center justify-center p-8 md:p-16 bg-gray-50/50 relative">
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
           <div className="absolute -top-40 -right-40 w-96 h-96 bg-brand-200 rounded-full mix-blend-multiply filter blur-3xl opacity-30 animate-pulse"></div>
           <div className="absolute -bottom-40 -left-40 w-96 h-96 bg-accent-200 rounded-full mix-blend-multiply filter blur-3xl opacity-30 animate-pulse" style={{ animationDelay: '2s' }}></div>
        </div>

        <div className="w-full max-w-md relative z-10 animate-slide-up">
          <div className="text-center mb-10">
            <img src="/mla.png" alt="MLA Logo" className="w-20 h-20 mx-auto object-cover rounded-full drop-shadow-xl mb-6" />
            <h1 className="text-3xl font-extrabold text-gray-900 tracking-tight">Welcome Back</h1>
            <p className="mt-2 text-gray-500 font-medium">Please sign in to your account</p>
          </div>

          <form onSubmit={submit} className="card p-8 space-y-6">
            <div>
              <label className="label">Username</label>
              <input
                className="input"
                value={form.username}
                onChange={(e) => setForm({ ...form, username: e.target.value })}
                autoFocus
                required
                placeholder="Enter your username"
              />
            </div>
            <div>
              <label className="label">Password</label>
              <input
                type="password"
                className="input"
                value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
                required
                placeholder="••••••••"
              />
            </div>

            {error && (
              <div className="text-sm font-medium text-red-600 bg-red-50 border border-red-200 rounded-xl px-4 py-3 animate-fade-in">
                {error}
              </div>
            )}

            <button type="submit" disabled={loading} className="btn-primary w-full py-3 text-base mt-2 shadow-brand-500/40">
              {loading ? 'Signing in…' : 'Sign in'}
            </button>
          </form>

          <p className="mt-8 text-center text-xs text-gray-400 font-medium tracking-wide uppercase">
            Default credentials configured in backend/.env
          </p>
        </div>
      </div>
    </div>
  );
}
