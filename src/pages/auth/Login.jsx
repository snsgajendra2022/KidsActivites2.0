import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { X } from 'lucide-react';
import { useAuth } from '../../context/AuthContext.jsx';
import { ROLE_DASHBOARD, ROLE_LABELS } from '../../constants/roles.js';
import { getDemoAccounts } from '../../services/authService.js';
import StatusBadge from '../../components/ui/StatusBadge.jsx';
import PublicHeader from '../../components/layout/PublicHeader.jsx';
import PublicFooter from '../../components/layout/PublicFooter.jsx';

const HERO_IMAGE =
  'https://lh3.googleusercontent.com/aida-public/AB6AXuA1Jp3AHHVfUbFSqzf3O-N5gFgr6s8ML-K8DwGD2GEXOTz15s-4fyzZM4Y1dwZ6vZaWqtLWEKGdZc1bwrXQMzn5bsiPQqN0FxnQdD3b2YNt-S05QXmCsAO0IBilprdNSAsdI39s5hIV7B5YPuyk0f-9esE0RwWHTQT0N5w6Qv9bcBb0Q1upVt_zm2uL6H9KaHy8QbCqOoaRNzNUIsoa0zzl2ZYB9sGHKd1fetYmj5dyKWuq4kD1hxjHmQ';

const DEMO_ACCOUNTS = getDemoAccounts();
const DEMO_PASSWORD = '123456';

const roleBadgeVariant = {
  super_admin: 'danger',
  school_admin: 'primary',
  admission_officer: 'info',
  accountant: 'warning',
  teacher: 'success',
  parent: 'primary',
  student: 'default',
  support_staff: 'info',
};

export default function Login() {
  const [form, setForm] = useState({ identity: '', password: '' });
  const [remember, setRemember] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [demoOpen, setDemoOpen] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    const html = document.documentElement;
    const body = document.body;
    const prevHtml = html.style.overflow;
    const prevBody = body.style.overflow;
    html.style.overflow = 'hidden';
    body.style.overflow = 'hidden';
    return () => {
      html.style.overflow = prevHtml;
      body.style.overflow = prevBody;
    };
  }, []);

  const fillDemo = (account) => {
    setForm({ identity: account.email, password: DEMO_PASSWORD });
    setError('');
    setDemoOpen(false);
  };

  const submit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const user = await login(form);
      navigate(ROLE_DASHBOARD[user.role] || '/');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-portal flex h-dvh max-h-dvh flex-col overflow-hidden bg-[#f8f9ff] text-[#0b1c30]">
      <PublicHeader glass />

      {/* Main — fills space between header and footer, no overflow */}
      <main className="relative min-h-0 flex-1 overflow-hidden">
        <div className="absolute inset-0 z-0">
          <img alt="" className="h-full w-full object-cover" src={HERO_IMAGE} />
          <div className="hero-gradient absolute inset-0" />
        </div>

        <div className="relative z-10 mx-auto flex h-full w-full max-w-screen-2xl items-center px-4 md:px-10">
          {/* Left hero — desktop only */}
          <div className="hidden h-full w-2/5 items-center pr-8 lg:flex">
            <div className="max-w-lg">
              <h1 className="font-display mb-4 text-[2rem] font-extrabold leading-tight tracking-[-0.04em] text-white xl:text-[2.5rem] xl:leading-[3rem]">
                Architecting the Future of Academic Excellence.
              </h1>
              <p className="mb-6 text-base leading-relaxed text-white/80 xl:text-lg">
                Step into a world-class educational ecosystem. Our secure portal integrates advanced
                enrollment management with intuitive student success tracking.
              </p>
              <div className="flex flex-col gap-4 xl:flex-row xl:gap-6">
                <div className="flex items-center gap-3 text-white/90">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-white/20 bg-white/10">
                    <span className="material-symbols-outlined text-[18px]">verified_user</span>
                  </div>
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-widest text-white/50">Security</p>
                    <p className="text-sm font-semibold">Enterprise-Grade</p>
                  </div>
                </div>
                <div className="flex items-center gap-3 text-white/90">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-white/20 bg-white/10">
                    <span className="material-symbols-outlined text-[18px]">public</span>
                  </div>
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-widest text-white/50">Compliance</p>
                    <p className="text-sm font-semibold">ISO 27001 Certified</p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Login card */}
          <div className="flex w-full justify-center lg:ml-auto lg:w-[22rem] xl:w-[26rem]">
            <div className="glass-card w-full rounded-3xl p-5 md:p-7">
              <div className="mb-5">
                <h2 className="font-display mb-0.5 text-2xl font-extrabold tracking-[-0.03em] text-[#091426] md:text-[1.75rem]">
                  Sign In
                </h2>
                <p className="text-sm text-[#45474c]">Access your administrative dashboard.</p>
              </div>

              {error && (
                <div className="mb-3 rounded-xl border border-rose-100 bg-rose-50/90 px-3 py-2 text-sm font-medium text-rose-600">
                  {error}
                </div>
              )}

              <form className="space-y-4" onSubmit={submit}>
                <div className="field-group space-y-1">
                  <label
                    className="field-label block text-sm font-semibold text-[#091426]/80 transition-premium"
                    htmlFor="identity"
                  >
                    Username or Email
                  </label>
                  <input
                    className="input-premium w-full rounded-xl border border-black/5 bg-white/50 px-4 py-3 text-sm placeholder:text-[#c5c6cd] md:px-5 md:py-3.5"
                    id="identity"
                    name="identity"
                    value={form.identity}
                    onChange={(e) => setForm({ ...form, identity: e.target.value })}
                    placeholder="Enter your credentials"
                    type="text"
                    autoComplete="username"
                  />
                </div>

                <div className="field-group space-y-1">
                  <div className="flex items-center justify-between">
                    <label
                      className="field-label block text-sm font-semibold text-[#091426]/80 transition-premium"
                      htmlFor="password"
                    >
                      Password
                    </label>
                    <button type="button" className="text-xs font-medium text-[#0058be] hover:underline">
                      Reset password
                    </button>
                  </div>
                  <input
                    className="input-premium w-full rounded-xl border border-black/5 bg-white/50 px-4 py-3 text-sm placeholder:text-[#c5c6cd] md:px-5 md:py-3.5"
                    id="password"
                    name="password"
                    value={form.password}
                    onChange={(e) => setForm({ ...form, password: e.target.value })}
                    placeholder="••••••••"
                    type="password"
                    autoComplete="current-password"
                  />
                </div>

                <div className="flex items-center gap-2">
                  <input
                    className="h-4 w-4 rounded border-black/10 text-[#091426] focus:ring-[#091426]/20"
                    id="remember"
                    type="checkbox"
                    checked={remember}
                    onChange={(e) => setRemember(e.target.checked)}
                  />
                  <label className="text-sm font-semibold text-[#45474c]" htmlFor="remember">
                    Keep me signed in
                  </label>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="btn-hover-lift w-full rounded-xl bg-[#091426] py-3.5 text-base font-semibold tracking-tight text-white disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {loading ? 'Signing in…' : 'Enter Dashboard'}
                </button>
              </form>

              <div className="mt-5 border-t border-black/5 pt-5 text-center">
                <p className="mb-3 text-[10px] font-bold uppercase tracking-widest text-[#45474c]">
                  New Applicant
                </p>
                <Link
                  to="/enroll"
                  className="group inline-flex w-full items-center justify-center gap-2 rounded-xl border border-black/5 bg-white px-6 py-3 text-sm font-semibold text-[#091426] shadow-sm transition-premium hover:bg-[#dce9ff]"
                >
                  <span className="material-symbols-outlined text-base transition-transform group-hover:rotate-12">
                    assignment_ind
                  </span>
                  Start Admission Process
                </Link>
              </div>

              <button
                type="button"
                onClick={() => setDemoOpen(true)}
                className="mt-4 w-full text-center text-[10px] font-bold uppercase tracking-widest text-[#45474c] transition-premium hover:text-[#091426]"
              >
                Demo accounts · password {DEMO_PASSWORD}
              </button>
            </div>
          </div>
        </div>
      </main>

      <PublicFooter compact />

      {/* Demo accounts modal — no page scroll */}
      {demoOpen && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-[#091426]/50 p-4 backdrop-blur-sm"
          onClick={() => setDemoOpen(false)}
        >
          <div
            className="glass-card max-h-[min(24rem,80dvh)] w-full max-w-md overflow-hidden rounded-2xl p-5"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-4 flex items-center justify-between">
              <h3 className="font-display text-lg font-bold text-[#091426]">Demo accounts</h3>
              <button
                type="button"
                onClick={() => setDemoOpen(false)}
                className="rounded-lg p-1 text-[#45474c] hover:bg-black/5"
                aria-label="Close"
              >
                <X size={18} />
              </button>
            </div>
            <p className="mb-3 text-xs text-[#45474c]">Password for all: <strong>{DEMO_PASSWORD}</strong></p>
            <div className="grid max-h-[min(16rem,55dvh)] grid-cols-1 gap-2 overflow-y-auto sm:grid-cols-2">
              {DEMO_ACCOUNTS.map((account) => (
                <button
                  key={account.id}
                  type="button"
                  onClick={() => fillDemo(account)}
                  className="rounded-xl border border-black/5 bg-white/50 p-3 text-left transition-premium hover:bg-white hover:shadow-sm"
                >
                  <div className="flex items-start justify-between gap-2">
                    <span className="text-xs font-semibold text-[#0b1c30]">{account.name}</span>
                    <StatusBadge variant={roleBadgeVariant[account.role] || 'default'}>
                      {ROLE_LABELS[account.role]}
                    </StatusBadge>
                  </div>
                  <p className="mt-1 truncate text-[11px] text-[#45474c]">{account.email}</p>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
