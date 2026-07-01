import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowRight, Mail, Smartphone, X, Shield, Sparkles } from 'lucide-react';
import { useAuth } from '../../context/AuthContext.jsx';
import { ROLE_DASHBOARD, ROLE_LABELS } from '../../constants/roles.js';
import { getDemoAccounts } from '../../services/authService.js';
import StatusBadge from '../../components/ui/StatusBadge.jsx';
import PublicHeader from '../../components/layout/PublicHeader.jsx';
import PublicFooter from '../../components/layout/PublicFooter.jsx';
import PortalLogo from '../../components/brand/PortalLogo.jsx';
import { usePortalConfig } from '../../context/PortalConfigContext.jsx';

const DEMO_ACCOUNTS = getDemoAccounts();
const DEMO_PASSWORD = '123456';
const DEMO_OTP = '123456';
const OTP_RESEND_SECONDS = 30;

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

function OtpInput({ value, onChange, disabled }) {
  const inputsRef = useRef([]);
  const digits = (value + '      ').slice(0, 6).split('');

  const setDigit = (index, char) => {
    const next = digits.map((d, i) => (i === index ? char : d)).join('').replace(/\s/g, '').slice(0, 6);
    onChange(next);
  };

  const handleChange = (index, e) => {
    const raw = e.target.value.replace(/\D/g, '');
    if (!raw) {
      setDigit(index, '');
      return;
    }
    if (raw.length > 1) {
      onChange(raw.slice(0, 6));
      const focusIdx = Math.min(raw.length, 5);
      inputsRef.current[focusIdx]?.focus();
      return;
    }
    setDigit(index, raw);
    if (index < 5) inputsRef.current[index + 1]?.focus();
  };

  const handleKeyDown = (index, e) => {
    if (e.key === 'Backspace' && !digits[index] && index > 0) {
      inputsRef.current[index - 1]?.focus();
    }
  };

  const handlePaste = (e) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
    if (pasted) {
      onChange(pasted);
      inputsRef.current[Math.min(pasted.length, 5)]?.focus();
    }
  };

  return (
    <div className="login-otp-grid" onPaste={handlePaste}>
      {digits.map((digit, i) => (
        <input
          key={i}
          ref={(el) => { inputsRef.current[i] = el; }}
          type="text"
          inputMode="numeric"
          maxLength={6}
          className="login-otp-box"
          value={digit.trim()}
          disabled={disabled}
          onChange={(e) => handleChange(i, e)}
          onKeyDown={(e) => handleKeyDown(i, e)}
          aria-label={`OTP digit ${i + 1}`}
        />
      ))}
    </div>
  );
}

export default function Login() {
  const [method, setMethod] = useState('email');
  const [emailForm, setEmailForm] = useState({ email: '', password: '' });
  const [mobile, setMobile] = useState('');
  const [otp, setOtp] = useState('');
  const [otpSent, setOtpSent] = useState(false);
  const [resendIn, setResendIn] = useState(0);
  const [remember, setRemember] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [demoOpen, setDemoOpen] = useState(false);
  const { login, requestOtp, loginWithOtp } = useAuth();
  const navigate = useNavigate();
  const { portalName, school, branding } = usePortalConfig();
  const heroImage = branding?.loginHeroUrl || branding?.heroImageUrl;

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

  useEffect(() => {
    if (resendIn <= 0) return undefined;
    const timer = setInterval(() => setResendIn((s) => s - 1), 1000);
    return () => clearInterval(timer);
  }, [resendIn]);

  const switchMethod = (next) => {
    setMethod(next);
    setError('');
    setOtp('');
    setOtpSent(false);
    setResendIn(0);
  };

  const fillDemo = (account) => {
    if (method === 'email') {
      setEmailForm({ email: account.email, password: DEMO_PASSWORD });
    } else {
      setMobile(account.mobile);
      setOtp('');
      setOtpSent(false);
    }
    setError('');
    setDemoOpen(false);
  };

  const handleSendOtp = async () => {
    setError('');
    setLoading(true);
    try {
      await requestOtp(mobile);
      setOtpSent(true);
      setResendIn(OTP_RESEND_SECONDS);
      setOtp('');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleEmailSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const user = await login(emailForm);
      navigate(ROLE_DASHBOARD[user.role] || '/');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleOtpSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const user = await loginWithOtp({ mobile, otp });
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

      <main className="relative min-h-0 flex-1 overflow-hidden">
        <div className="absolute inset-0 z-0">
          {heroImage && <img alt="" className="h-full w-full object-cover" src={heroImage} />}
          <div className="hero-gradient absolute inset-0" />
        </div>

        <div className="relative z-10 mx-auto flex h-full w-full max-w-screen-2xl items-center px-4 md:px-10">
          <div className="hidden h-full w-[42%] items-center pr-10 xl:flex">
            <div className="max-w-lg">
              <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-4 py-1.5 text-sm font-semibold text-white backdrop-blur-sm">
                <Sparkles size={14} />
                {school?.academicYear} · Secure Portal
              </div>
              <h1 className="font-display mb-4 text-[2rem] font-extrabold leading-tight tracking-[-0.04em] text-white xl:text-[2.5rem]">
                Welcome to {portalName}
              </h1>
              <p className="mb-8 text-base leading-relaxed text-white/80 xl:text-lg">
                Sign in with your registered email and password, or use mobile OTP for quick access to {school?.name}.
              </p>
              <div className="flex flex-col gap-4">
                <div className="flex items-center gap-3 rounded-2xl border border-white/15 bg-white/10 p-4 backdrop-blur-sm">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/15 text-white">
                    <Mail size={18} />
                  </div>
                  <div>
                    <p className="text-xs font-bold uppercase tracking-wider text-white/50">Email Login</p>
                    <p className="text-sm font-semibold text-white">School-registered email + password</p>
                  </div>
                </div>
                <div className="flex items-center gap-3 rounded-2xl border border-white/15 bg-white/10 p-4 backdrop-blur-sm">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/15 text-white">
                    <Smartphone size={18} />
                  </div>
                  <div>
                    <p className="text-xs font-bold uppercase tracking-wider text-white/50">Mobile OTP</p>
                    <p className="text-sm font-semibold text-white">6-digit code sent to your mobile</p>
                  </div>
                </div>
                <div className="flex items-center gap-2 text-sm text-white/70">
                  <Shield size={16} />
                  Enterprise-grade security · Role-based access
                </div>
              </div>
            </div>
          </div>

          <div className="flex w-full justify-center lg:ml-auto lg:w-[24rem] xl:w-[28rem]">
            <div className="glass-card w-full rounded-3xl p-5 shadow-2xl shadow-[#091426]/10 md:p-7">
              <div className="mb-5 flex items-center gap-3">
                <PortalLogo size="lg" />
                <div>
                  <h2 className="font-display text-xl font-extrabold tracking-tight text-[#091426] md:text-2xl">
                    Sign In
                  </h2>
                  <p className="text-xs text-[#45474c]">{school?.name}</p>
                </div>
              </div>

              {error && (
                <div className="mb-4 rounded-xl border border-rose-100 bg-rose-50 px-3 py-2.5 text-sm font-medium text-rose-600">
                  {error}
                </div>
              )}

              {method === 'email' ? (
                <form className="space-y-4" onSubmit={handleEmailSubmit}>
                  <div className="field-group space-y-1.5">
                    <label className="field-label block text-sm font-semibold text-[#091426]/80" htmlFor="email">
                      Email Address
                    </label>
                    <input
                      className="input-premium w-full rounded-xl border border-black/5 bg-white/60 px-4 py-3 text-sm placeholder:text-[#9aa3b2]"
                      id="email"
                      name="email"
                      type="email"
                      autoComplete="email"
                      placeholder="you@school.edu.in"
                      value={emailForm.email}
                      onChange={(e) => setEmailForm({ ...emailForm, email: e.target.value })}
                    />
                    <p className="text-[11px] text-[#6b7a8c]">Use the email registered with your school account.</p>
                  </div>

                  <div className="field-group space-y-1.5">
                    <div className="flex items-center justify-between">
                      <label className="field-label block text-sm font-semibold text-[#091426]/80" htmlFor="password">
                        Password
                      </label>
                      <button type="button" className="text-xs font-semibold hover:underline" style={{ color: 'var(--sb-secondary)' }}>
                        Forgot password?
                      </button>
                    </div>
                    <input
                      className="input-premium w-full rounded-xl border border-black/5 bg-white/60 px-4 py-3 text-sm placeholder:text-[#9aa3b2]"
                      id="password"
                      name="password"
                      type="password"
                      autoComplete="current-password"
                      placeholder="Enter your password"
                      value={emailForm.password}
                      onChange={(e) => setEmailForm({ ...emailForm, password: e.target.value })}
                    />
                  </div>

                  <label className="flex cursor-pointer items-center gap-2">
                    <input
                      className="h-4 w-4 rounded border-black/10 focus:ring-[var(--sb-primary)]/20"
                      type="checkbox"
                      checked={remember}
                      onChange={(e) => setRemember(e.target.checked)}
                    />
                    <span className="text-sm font-medium text-[#45474c]">Keep me signed in</span>
                  </label>

                  <button type="submit" disabled={loading} className="login-submit-btn">
                    {loading ? 'Signing in…' : 'Sign In with Email'}
                    {!loading && <ArrowRight size={18} />}
                  </button>

                  <div className="login-method-footer">
                    <p className="login-method-footer__or">or continue with</p>
                    <button
                      type="button"
                      className="login-method-switch"
                      onMouseDown={(e) => e.preventDefault()}
                      onClick={() => switchMethod('mobile')}
                    >
                      <Smartphone size={16} />
                      Sign in with Mobile OTP
                    </button>
                  </div>
                </form>
              ) : (
                <form className="space-y-4" onSubmit={handleOtpSubmit}>
                  <div className="field-group space-y-1.5">
                    <label className="field-label block text-sm font-semibold text-[#091426]/80" htmlFor="mobile">
                      Mobile Number
                    </label>
                    <div className="login-phone-wrap">
                      <span className="login-phone-prefix">+91</span>
                      <input
                        id="mobile"
                        className="login-phone-input"
                        type="tel"
                        inputMode="numeric"
                        autoComplete="tel"
                        placeholder="10-digit mobile number"
                        maxLength={10}
                        value={mobile}
                        onChange={(e) => setMobile(e.target.value.replace(/\D/g, '').slice(0, 10))}
                        disabled={otpSent && loading}
                      />
                    </div>
                    <p className="text-[11px] text-[#6b7a8c]">OTP will be sent to your registered mobile number.</p>
                  </div>

                  {!otpSent ? (
                    <button
                      type="button"
                      disabled={loading || mobile.length !== 10}
                      onClick={handleSendOtp}
                      className="login-submit-btn"
                    >
                      {loading ? 'Sending OTP…' : 'Send OTP'}
                      {!loading && <Smartphone size={18} />}
                    </button>
                  ) : (
                    <>
                      <div className="login-otp-demo">
                        <Shield size={14} className="shrink-0" />
                        <span>Demo OTP: <strong>{DEMO_OTP}</strong> (valid 5 minutes)</span>
                      </div>

                      <div className="space-y-2">
                        <label className="block text-sm font-semibold text-[#091426]/80">Enter 6-digit OTP</label>
                        <OtpInput value={otp} onChange={setOtp} disabled={loading} />
                      </div>

                      <div className="flex items-center justify-between text-xs">
                        {resendIn > 0 ? (
                          <span className="text-[#6b7a8c]">Resend OTP in {resendIn}s</span>
                        ) : (
                          <button
                            type="button"
                            onClick={handleSendOtp}
                            disabled={loading}
                            className="font-semibold hover:underline"
                            style={{ color: 'var(--sb-secondary)' }}
                          >
                            Resend OTP
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => { setOtpSent(false); setOtp(''); setError(''); }}
                          className="font-medium text-[#45474c] hover:text-[#091426]"
                        >
                          Change number
                        </button>
                      </div>

                      <button
                        type="submit"
                        disabled={loading || otp.length !== 6}
                        className="login-submit-btn"
                      >
                        {loading ? 'Verifying…' : 'Verify & Sign In'}
                        {!loading && <ArrowRight size={18} />}
                      </button>
                    </>
                  )}

                  <div className="login-method-footer">
                    <p className="login-method-footer__or">or continue with</p>
                    <button
                      type="button"
                      className="login-method-switch"
                      onMouseDown={(e) => e.preventDefault()}
                      onClick={() => switchMethod('email')}
                    >
                      <Mail size={16} />
                      Sign in with Email
                    </button>
                  </div>
                </form>
              )}

              <div className="mt-6 border-t border-black/5 pt-5">
                <p className="mb-3 text-center text-[10px] font-bold uppercase tracking-widest text-[#6b7a8c]">
                  New Applicant
                </p>
                <Link
                  to="/enroll"
                  className="sb-link-btn sb-link-btn--dark group flex w-full items-center justify-center gap-2 rounded-xl border border-black/5 bg-white px-6 py-3 text-sm font-semibold text-[#091426] shadow-sm transition-all hover:bg-[#eff4ff]"
                >
                  Start Admission Process
                  <ArrowRight size={16} className="transition-transform group-hover:translate-x-0.5" />
                </Link>
              </div>

              <button
                type="button"
                onClick={() => setDemoOpen(true)}
                className="mt-4 w-full text-center text-[10px] font-bold uppercase tracking-widest text-[#6b7a8c] transition-colors hover:text-[#091426]"
              >
                Demo accounts · password {DEMO_PASSWORD} · OTP {DEMO_OTP}
              </button>
            </div>
          </div>
        </div>
      </main>

      <PublicFooter compact />

      {demoOpen && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-[#091426]/50 p-4 backdrop-blur-sm"
          onClick={() => setDemoOpen(false)}
        >
          <div
            className="glass-card max-h-[min(26rem,85dvh)] w-full max-w-lg overflow-hidden rounded-2xl p-5"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-4 flex items-center justify-between">
              <div>
                <h3 className="font-display text-lg font-bold text-[#091426]">Demo Accounts</h3>
                <p className="text-xs text-[#45474c]">
                  {method === 'email' ? 'Tap to fill email' : 'Tap to fill mobile'} · Password <strong>{DEMO_PASSWORD}</strong> · OTP <strong>{DEMO_OTP}</strong>
                </p>
              </div>
              <button
                type="button"
                onClick={() => setDemoOpen(false)}
                className="rounded-lg p-1 text-[#45474c] hover:bg-black/5"
                aria-label="Close"
              >
                <X size={18} />
              </button>
            </div>
            <div className="grid max-h-[min(18rem,60dvh)] grid-cols-1 gap-2 overflow-y-auto sm:grid-cols-2">
              {DEMO_ACCOUNTS.map((account) => (
                <button
                  key={account.id}
                  type="button"
                  onClick={() => fillDemo(account)}
                  className="rounded-xl border border-black/5 bg-white/70 p-3 text-left transition-all hover:bg-white hover:shadow-md"
                >
                  <div className="flex items-start justify-between gap-2">
                    <span className="text-xs font-semibold text-[#0b1c30]">{account.name}</span>
                    <StatusBadge variant={roleBadgeVariant[account.role] || 'default'}>
                      {ROLE_LABELS[account.role]}
                    </StatusBadge>
                  </div>
                  <p className="mt-1 truncate text-[11px] text-[#45474c]">{account.email}</p>
                  <p className="truncate text-[11px] font-medium" style={{ color: 'var(--sb-secondary)' }}>+91 {account.mobile}</p>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
