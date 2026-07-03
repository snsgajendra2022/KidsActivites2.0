import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowRight, Mail, Shield, Sparkles, Smartphone, Eye, EyeOff } from 'lucide-react';
import { useAuth } from '../../context/AuthContext.jsx';
import { useTenantPath } from '../../hooks/useTenantPath.js';
import PublicHeader from '../../components/layout/PublicHeader.jsx';
import PublicFooter from '../../components/layout/PublicFooter.jsx';
import PortalLogo from '../../components/brand/PortalLogo.jsx';
import { usePortalConfig } from '../../context/PortalConfigContext.jsx';

const OTP_RESEND_SECONDS = 30;

function detectOtpChannel(identity, { mobileEnabled, emailEnabled }) {
  const value = identity.trim();
  if (!value) return null;

  if (value.includes('@')) {
    if (emailEnabled) return 'email';
    if (mobileEnabled && value.replace(/\D/g, '').length === 10) return 'mobile';
    return null;
  }

  const digits = value.replace(/\D/g, '');
  if (digits.length > 0) {
    if (mobileEnabled) return 'mobile';
    if (emailEnabled && /[a-zA-Z]/.test(value)) return 'email';
    return null;
  }

  if (/[a-zA-Z]/.test(value) && emailEnabled) return 'email';
  return null;
}

function isOtpIdentityValid(identity, channel) {
  if (!channel) return false;
  const value = identity.trim();
  if (channel === 'email') {
    const [local, domain] = value.split('@');
    return Boolean(local?.trim() && domain?.includes('.'));
  }
  return value.replace(/\D/g, '').length === 10;
}

function formatOtpIdentityInput(raw) {
  if (raw.includes('@') || /[a-zA-Z]/.test(raw)) return raw;
  return raw.replace(/\D/g, '').slice(0, 10);
}

function otpIdentityHint(channel, { mobileEnabled, emailEnabled }) {
  if (channel === 'mobile') return 'OTP will be sent to your registered mobile number.';
  if (channel === 'email') return 'OTP will be sent to your registered email address.';
  if (mobileEnabled && emailEnabled) {
    return 'Enter your registered mobile number or email — we detect automatically.';
  }
  if (mobileEnabled) return 'Enter your 10-digit registered mobile number.';
  return 'Enter your registered email address.';
}

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
  const [otpIdentity, setOtpIdentity] = useState('');
  const [sentOtpChannel, setSentOtpChannel] = useState(null);
  const [otp, setOtp] = useState('');
  const [otpSent, setOtpSent] = useState(false);
  const [resendIn, setResendIn] = useState(0);
  const [remember, setRemember] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login, requestOtp, requestEmailOtp, loginWithOtp, loginWithEmailOtp } = useAuth();
  const navigate = useNavigate();
  const { roleDashboard, tenantPath } = useTenantPath();
  const { portalName, school, branding, loginMethods } = usePortalConfig();
  const heroImage = branding?.loginHeroUrl || branding?.heroImageUrl;

  const isMethodEnabled = (key) => loginMethods?.[key] !== false;
  const emailLoginEnabled = isMethodEnabled('emailLogin');
  const mobileOtpEnabled = isMethodEnabled('mobileOtp');
  const emailOtpEnabled = isMethodEnabled('emailOtp');
  const otpLoginEnabled = mobileOtpEnabled || emailOtpEnabled;
  const anyLoginEnabled = emailLoginEnabled || otpLoginEnabled;

  const otpChannelOptions = { mobileEnabled: mobileOtpEnabled, emailEnabled: emailOtpEnabled };
  const activeOtpChannel = sentOtpChannel || detectOtpChannel(otpIdentity, otpChannelOptions);
  const otpTargetReady = isOtpIdentityValid(otpIdentity, activeOtpChannel);

  const pickDefaultMethod = () => {
    if (emailLoginEnabled) return 'email';
    if (otpLoginEnabled) return 'otp';
    return 'email';
  };

  useEffect(() => {
    setMethod((current) => {
      if (current === 'email' && emailLoginEnabled) return 'email';
      if (current === 'otp' && otpLoginEnabled) return 'otp';
      return pickDefaultMethod();
    });
  }, [emailLoginEnabled, otpLoginEnabled]);

  const welcomeBlurb = (() => {
    if (!anyLoginEnabled) {
      return `Contact your school administrator for login access to ${school?.name}.`;
    }
    if (emailLoginEnabled && otpLoginEnabled) {
      const otpParts = [];
      if (mobileOtpEnabled) otpParts.push('mobile');
      if (emailOtpEnabled) otpParts.push('email');
      const otpText = otpParts.length === 2 ? 'mobile or email OTP' : `${otpParts[0]} OTP`;
      return `Sign in with email and password, or use ${otpText} for quick access to ${school?.name}.`;
    }
    if (emailLoginEnabled) {
      return `Sign in with your school-registered email and password to access ${school?.name}.`;
    }
    const otpParts = [];
    if (mobileOtpEnabled) otpParts.push('mobile');
    if (emailOtpEnabled) otpParts.push('email');
    const otpText = otpParts.length === 2 ? 'mobile or email OTP' : `${otpParts[0]} OTP`;
    return `Sign in with ${otpText} to access ${school?.name}.`;
  })();

  useEffect(() => {
    if (resendIn <= 0) return undefined;
    const timer = setInterval(() => setResendIn((s) => s - 1), 1000);
    return () => clearInterval(timer);
  }, [resendIn]);

  useEffect(() => {
    const html = document.documentElement;
    const body = document.body;
    const prevHtmlOverflow = html.style.overflow;
    const prevBodyOverflow = body.style.overflow;
    const prevHtmlHeight = html.style.height;
    html.style.overflow = 'hidden';
    body.style.overflow = 'hidden';
    html.style.height = '100%';
    return () => {
      html.style.overflow = prevHtmlOverflow;
      body.style.overflow = prevBodyOverflow;
      html.style.height = prevHtmlHeight;
    };
  }, []);

  const switchMethod = (next) => {
    setMethod(next);
    setError('');
    setOtp('');
    setOtpSent(false);
    setResendIn(0);
    setSentOtpChannel(null);
    if (next === 'otp') setOtpIdentity('');
  };

  const handleSendOtp = async () => {
    const channel = detectOtpChannel(otpIdentity, otpChannelOptions);
    if (!channel || !isOtpIdentityValid(otpIdentity, channel)) {
      setError(mobileOtpEnabled && emailOtpEnabled
        ? 'Enter a valid 10-digit mobile number or email address.'
        : mobileOtpEnabled
          ? 'Enter a valid 10-digit mobile number.'
          : 'Enter a valid email address.');
      return;
    }

    setError('');
    setLoading(true);
    try {
      if (channel === 'email') {
        await requestEmailOtp(otpIdentity.trim());
      } else {
        await requestOtp(otpIdentity.replace(/\D/g, ''));
      }
      setSentOtpChannel(channel);
      setOtpSent(true);
      setResendIn(OTP_RESEND_SECONDS);
      setOtp('');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleResendOtp = () => handleSendOtp();

  const handleEmailSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const user = await login(emailForm);
      navigate(roleDashboard(user.role) || tenantPath('/'));
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleOtpSubmit = async (e) => {
    e.preventDefault();
    const channel = sentOtpChannel || detectOtpChannel(otpIdentity, otpChannelOptions);
    setError('');
    setLoading(true);
    try {
      const user = channel === 'email'
        ? await loginWithEmailOtp({ email: otpIdentity.trim(), otp })
        : await loginWithOtp({ mobile: otpIdentity.replace(/\D/g, ''), otp });
      navigate(roleDashboard(user.role) || tenantPath('/'));
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const resetOtpIdentity = () => {
    setOtpSent(false);
    setOtp('');
    setError('');
    setSentOtpChannel(null);
  };

  const otpIdentityLabel = mobileOtpEnabled && emailOtpEnabled
    ? 'Mobile or Email'
    : mobileOtpEnabled
      ? 'Mobile Number'
      : 'Email Address';

  const otpIdentityPlaceholder = mobileOtpEnabled && emailOtpEnabled
    ? '10-digit mobile or email address'
    : mobileOtpEnabled
      ? '10-digit mobile number'
      : 'you@school.edu.in';

  const renderMethodFooter = () => {
    if (!emailLoginEnabled || !otpLoginEnabled) return null;
    const isEmail = method === 'email';
    return (
      <div className="login-method-footer">
        <p className="login-method-footer__or">or continue with</p>
        <button
          type="button"
          className="login-method-switch"
          onMouseDown={(e) => e.preventDefault()}
          onClick={() => switchMethod(isEmail ? 'otp' : 'email')}
        >
          {isEmail ? <Shield size={16} /> : <Mail size={16} />}
          {isEmail ? 'Sign in with OTP' : 'Sign in with Email & Password'}
        </button>
      </div>
    );
  };

  const renderOtpStep = (changeLabel, onChangeTarget) => (
    <>
      <div className="space-y-2">
        <label className="login-field-label block text-sm font-semibold">Enter 6-digit OTP</label>
        <OtpInput value={otp} onChange={setOtp} disabled={loading} />
      </div>
      <div className="login-otp-actions flex flex-wrap items-center justify-between gap-x-2 gap-y-1 text-xs">
        {resendIn > 0 ? (
          <span className="login-muted-text text-xs">Resend OTP in {resendIn}s</span>
        ) : (
          <button
            type="button"
            onClick={handleResendOtp}
            disabled={loading}
            className="font-semibold hover:underline"
            style={{ color: 'var(--sb-secondary)' }}
          >
            Resend OTP
          </button>
        )}
        <button
          type="button"
          onClick={onChangeTarget}
          className="font-medium login-card-subtitle hover:text-brand"
        >
          {changeLabel}
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
  );

  return (
    <div className="login-portal flex h-dvh max-h-dvh flex-col overflow-hidden sb-surface text-[var(--sb-on-surface,#0b1c30)]">
      <PublicHeader glass loginMobile />

      <main className="login-portal-main relative min-h-0 flex-1">
        <div className="login-portal-bg absolute inset-0 z-0">
          {heroImage && <img alt="" className="h-full w-full object-cover" src={heroImage} />}
          <div className="hero-gradient absolute inset-0" />
        </div>

        <div className="login-portal-body relative z-10 mx-auto flex w-full max-w-screen-2xl flex-col items-stretch px-0 xl:flex-row xl:items-center xl:px-10">
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
                {welcomeBlurb}
              </p>
              <div className="flex flex-col gap-4">
                {emailLoginEnabled && (
                  <div className="flex items-center gap-3 rounded-2xl border border-white/15 bg-white/10 p-4 backdrop-blur-sm">
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/15 text-white">
                      <Mail size={18} />
                    </div>
                    <div>
                      <p className="text-xs font-bold uppercase tracking-wider text-white/50">Email Login</p>
                      <p className="text-sm font-semibold text-white">School-registered email + password</p>
                    </div>
                  </div>
                )}
                {otpLoginEnabled && (
                  <div className="flex items-center gap-3 rounded-2xl border border-white/15 bg-white/10 p-4 backdrop-blur-sm">
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/15 text-white">
                      <Shield size={18} />
                    </div>
                    <div>
                      <p className="text-xs font-bold uppercase tracking-wider text-white/50">OTP Login</p>
                      <p className="text-sm font-semibold text-white">
                        {mobileOtpEnabled && emailOtpEnabled
                          ? '6-digit code via mobile or email'
                          : mobileOtpEnabled
                            ? '6-digit code sent to your mobile'
                            : '6-digit code sent to your email'}
                      </p>
                    </div>
                  </div>
                )}
                <div className="flex items-center gap-2 text-sm text-white/70">
                  <Shield size={16} />
                  Enterprise-grade security · Role-based access
                </div>
              </div>
            </div>
          </div>

          <div className="login-portal-card-wrap flex w-full justify-center lg:ml-auto lg:w-[24rem] xl:w-[28rem]">
            <div className="login-portal-card glass-card w-full max-w-full rounded-3xl p-4 shadow-2xl sm:p-5 md:p-7" style={{ boxShadow: '0 8px 32px color-mix(in srgb, var(--sb-primary) 12%, transparent)' }}>
              <div className="mb-4 flex items-center gap-3 sm:mb-5">
                <PortalLogo size="lg" />
                <div className="min-w-0">
                  <h2 className="login-card-title">Sign In</h2>
                  <p className="login-card-subtitle truncate">{school?.name}</p>
                </div>
              </div>

              {error && (
                <div className="mb-4 rounded-xl border border-rose-100 bg-rose-50 px-3 py-2.5 text-sm font-medium text-rose-600">
                  {error}
                </div>
              )}

              {!anyLoginEnabled ? (
                <div className="rounded-xl border border-amber-100 bg-amber-50 px-4 py-6 text-center text-sm text-amber-800">
                  Login is temporarily unavailable. Please contact your school administrator.
                </div>
              ) : method === 'email' && emailLoginEnabled ? (
                <form className="space-y-4" onSubmit={handleEmailSubmit}>
                  <div className="field-group space-y-1.5">
                    <label className="field-label login-field-label block" htmlFor="email">
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
                    <p className="text-[11px] login-muted-text">Use the email registered with your school account.</p>
                  </div>

                  <div className="field-group space-y-1.5">
                    <div className="flex flex-wrap items-center justify-between gap-x-2 gap-y-1">
                      <label className="field-label login-field-label block" htmlFor="password">
                        Password
                      </label>
                      <Link to={tenantPath('/forgot-password')} className="text-xs font-semibold hover:underline" style={{ color: 'var(--sb-secondary)' }}>
                        Forgot password?
                      </Link>
                    </div>
                    <div className="login-password-wrap">
                      <input
                        className="login-password-input"
                        id="password"
                        name="password"
                        type={showPassword ? 'text' : 'password'}
                        autoComplete="current-password"
                        placeholder="Enter your password"
                        value={emailForm.password}
                        onChange={(e) => setEmailForm({ ...emailForm, password: e.target.value })}
                      />
                      <button
                        type="button"
                        className="login-password-toggle"
                        onClick={() => setShowPassword((v) => !v)}
                        aria-label={showPassword ? 'Hide password' : 'Show password'}
                        aria-pressed={showPassword}
                      >
                        {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                      </button>
                    </div>
                  </div>

                  <label className="flex cursor-pointer items-center gap-2">
                    <input
                      className="h-4 w-4 rounded border-black/10 focus:ring-[var(--sb-primary)]/20"
                      type="checkbox"
                      checked={remember}
                      onChange={(e) => setRemember(e.target.checked)}
                    />
                    <span className="text-sm font-medium login-card-subtitle">Keep me signed in</span>
                  </label>

                  <button type="submit" disabled={loading} className="login-submit-btn">
                    {loading ? 'Signing in…' : 'Sign In with Email'}
                    {!loading && <ArrowRight size={18} />}
                  </button>

                  {renderMethodFooter()}
                </form>
              ) : method === 'otp' && otpLoginEnabled ? (
                <form className="space-y-4" onSubmit={handleOtpSubmit}>
                  <div className="field-group space-y-1.5">
                    <label className="field-label login-field-label block" htmlFor="otp-identity">
                      {otpIdentityLabel}
                    </label>
                    <div className="login-identity-wrap">
                      <span className="login-identity-icon" aria-hidden>
                        {activeOtpChannel === 'mobile' ? <Smartphone size={16} /> : activeOtpChannel === 'email' ? <Mail size={16} /> : <Shield size={16} />}
                      </span>
                      <input
                        id="otp-identity"
                        className="login-identity-input"
                        type="text"
                        inputMode={activeOtpChannel === 'mobile' ? 'numeric' : 'text'}
                        autoComplete={activeOtpChannel === 'email' ? 'email' : 'tel'}
                        placeholder={otpIdentityPlaceholder}
                        value={otpIdentity}
                        onChange={(e) => {
                          if (otpSent) return;
                          setOtpIdentity(formatOtpIdentityInput(e.target.value));
                        }}
                        disabled={otpSent && loading}
                      />
                    </div>
                    <p className="text-[11px] login-muted-text">
                      {otpIdentityHint(activeOtpChannel, otpChannelOptions)}
                    </p>
                  </div>

                  {!otpSent ? (
                    <button
                      type="button"
                      disabled={loading || !otpTargetReady}
                      onClick={handleSendOtp}
                      className="login-submit-btn"
                    >
                      {loading ? 'Sending OTP…' : 'Send OTP'}
                      {!loading && <Shield size={18} />}
                    </button>
                  ) : (
                    renderOtpStep('Change', resetOtpIdentity)
                  )}

                  {renderMethodFooter()}
                </form>
              ) : null}

              <div className="login-enroll-section">
                <p className="login-enroll-section__label">New Applicant</p>
                <Link to={tenantPath('/enroll')} className="login-enroll-btn group">
                  Start Admission Process
                  <ArrowRight size={16} />
                </Link>
              </div>
            </div>
          </div>
        </div>
      </main>

      <div className="login-portal-footer-slot login-portal-footer-slot--minimal xl:hidden">
        <PublicFooter compact minimal />
      </div>
      <div className="login-portal-footer-slot hidden shrink-0 xl:block">
        <PublicFooter compact />
      </div>
    </div>
  );
}
