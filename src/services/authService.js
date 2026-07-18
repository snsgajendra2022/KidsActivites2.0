import usersData from '../data/users.json';
import { delay } from './mockApi.js';
import { api } from './api/client.js';
import { isApiEnabled, TENANT_HEADER } from './api/config.js';
import { clearMockStorage } from './api/clearMockStorage.js';
import { markDemoSession } from './api/demoMode.js';
import { clearTokens, getRefreshToken, setTokens } from './api/tokenStorage.js';

const DEMO_OTP = '123456';
const OTP_STORAGE_KEY = 'sb_login_otp';
const OTP_TTL_MS = 5 * 60 * 1000;

/** Force master-DB tenant header on /admin/* (never fall back to VITE_TENANT_SLUG). */
function platformAdminRequestOpts() {
  if (typeof window === 'undefined') return {};
  const first = window.location.pathname.split('/').filter(Boolean)[0]?.toLowerCase();
  if (first !== 'admin') return {};
  return {
    skipTenantHeader: true,
    headers: { [TENANT_HEADER]: 'admin' },
  };
}

function saveOtpSession(channel, target, otp) {
  const normalizedTarget = channel === 'email'
    ? normalizeIdentity(target).toLowerCase()
    : normalizeMobile(target);
  sessionStorage.setItem(
    OTP_STORAGE_KEY,
    JSON.stringify({
      channel,
      target: normalizedTarget,
      otp,
      expires: Date.now() + OTP_TTL_MS,
    }),
  );
  return normalizedTarget;
}

function readOtpSession() {
  try {
    return JSON.parse(sessionStorage.getItem(OTP_STORAGE_KEY) || 'null');
  } catch {
    return null;
  }
}

function normalizeIdentity(value) {
  return String(value || '').trim();
}

export function normalizeMobile(value) {
  const digits = String(value || '').replace(/\D/g, '');
  if (digits.length === 12 && digits.startsWith('91')) return digits.slice(2);
  if (digits.length === 11 && digits.startsWith('0')) return digits.slice(1);
  return digits;
}

function matchesEmail(user, email) {
  const trimmed = normalizeIdentity(email);
  if (!trimmed || !trimmed.includes('@')) return false;
  return user.email.toLowerCase() === trimmed.toLowerCase();
}

function matchesMobile(user, mobile) {
  const normalized = normalizeMobile(mobile);
  if (!normalized || normalized.length !== 10) return false;
  return normalizeMobile(user.mobile) === normalized;
}

function matchesIdentity(user, identity) {
  return matchesEmail(user, identity) || matchesMobile(user, identity);
}

function stripPassword(user) {
  const { password: _pw, ...sessionUser } = user;
  return sessionUser;
}

export function findUserByMobile(mobile) {
  return usersData.users.find((u) => matchesMobile(u, mobile)) || null;
}

export function findUserByEmail(email) {
  return usersData.users.find((u) => matchesEmail(u, email)) || null;
}

export function getDemoAccounts() {
  return usersData.users.map(({ password, ...account }) => account);
}

export function authenticateByEmail(email, password) {
  const trimmedEmail = normalizeIdentity(email);
  if (!trimmedEmail) throw new Error('Please enter your email address.');
  if (!trimmedEmail.includes('@')) throw new Error('Please enter a valid email address.');
  if (!password) throw new Error('Please enter your password.');

  const user = usersData.users.find((u) => matchesEmail(u, trimmedEmail));
  if (!user || user.password !== password) throw new Error('Invalid email or password.');

  return {
    ...stripPassword(user),
    identity: trimmedEmail,
    loginMethod: 'email',
    isDemoSession: true,
  };
}

export function authenticate(identity, password) {
  const trimmedIdentity = normalizeIdentity(identity);
  if (!trimmedIdentity) throw new Error('Please enter email or mobile number.');
  if (!password) throw new Error('Please enter your password.');

  const user = usersData.users.find((u) => matchesIdentity(u, trimmedIdentity));
  if (!user || user.password !== password) throw new Error('Invalid email/mobile or password.');

  return {
    ...stripPassword(user),
    identity: trimmedIdentity,
    loginMethod: 'password',
    isDemoSession: true,
  };
}

/** Unified email login — live API when VITE_API_URL is set, otherwise local mock. */
export async function loginByEmail(email, password) {
  if (!isApiEnabled()) {
    await delay(300);
    return authenticateByEmail(email, password);
  }

  const data = await api.post('/auth/login', { email, password }, {
    auth: false,
    ...platformAdminRequestOpts(),
  });
  setTokens(data.accessToken, data.refreshToken);
  return markDemoSession(
    { ...data.user, identity: email, loginMethod: 'email' },
    false,
  );
}

/** Apply tokens from QR login poll response. */
export async function loginWithQrTokens(data) {
  if (!data?.accessToken || !data?.user) {
    throw new Error('QR login did not return a valid session.');
  }
  setTokens(data.accessToken, data.refreshToken);
  if (isApiEnabled()) clearMockStorage();
  return markDemoSession(
    { ...data.user, loginMethod: 'qr_web' },
    false,
  );
}

export async function sendLoginOtp(mobile) {
  if (isApiEnabled()) {
    const normalized = normalizeMobile(mobile);
    const data = await api.post('/auth/login/otp/send', { channel: 'mobile', mobile: normalized }, { auth: false });
    return { mobile: data.mobile || normalized, expiresIn: data.expiresIn || 300 };
  }

  await delay(700);
  const normalized = normalizeMobile(mobile);
  if (!normalized || normalized.length !== 10) {
    throw new Error('Please enter a valid 10-digit mobile number.');
  }
  const user = findUserByMobile(normalized);
  if (!user) throw new Error('No account found with this mobile number.');

  saveOtpSession('mobile', normalized, DEMO_OTP);
  return { mobile: normalized, expiresIn: OTP_TTL_MS / 1000, demoOtp: DEMO_OTP };
}

export async function sendEmailLoginOtp(email) {
  if (isApiEnabled()) {
    const trimmed = normalizeIdentity(email).toLowerCase();
    const data = await api.post('/auth/login/otp/send', { channel: 'email', email: trimmed }, { auth: false });
    return { email: data.email || trimmed, expiresIn: data.expiresIn || 300 };
  }

  await delay(700);
  const trimmed = normalizeIdentity(email);
  if (!trimmed || !trimmed.includes('@')) throw new Error('Please enter a valid email address.');

  const user = findUserByEmail(trimmed);
  if (!user) throw new Error('No account found with this email address.');

  const normalized = saveOtpSession('email', trimmed, DEMO_OTP);
  return { email: normalized, expiresIn: OTP_TTL_MS / 1000, demoOtp: DEMO_OTP };
}

export function verifyLoginOtpByChannel(channel, target, otp) {
  const code = String(otp || '').trim();
  const normalizedTarget = channel === 'email'
    ? normalizeIdentity(target).toLowerCase()
    : normalizeMobile(target);

  if (channel === 'mobile' && (!normalizedTarget || normalizedTarget.length !== 10)) {
    throw new Error('Please enter a valid mobile number.');
  }
  if (channel === 'email' && (!normalizedTarget || !normalizedTarget.includes('@'))) {
    throw new Error('Please enter a valid email address.');
  }
  if (!code || code.length !== 6) throw new Error('Please enter the 6-digit OTP.');

  const stored = readOtpSession();
  if (!stored || stored.channel !== channel || stored.target !== normalizedTarget) {
    throw new Error('Please request an OTP first.');
  }
  if (Date.now() > stored.expires) {
    sessionStorage.removeItem(OTP_STORAGE_KEY);
    throw new Error('OTP has expired. Please request a new one.');
  }
  if (stored.otp !== code) throw new Error('Invalid OTP. Please try again.');

  const user = channel === 'email'
    ? findUserByEmail(normalizedTarget)
    : findUserByMobile(normalizedTarget);
  if (!user) throw new Error('Account not found.');

  sessionStorage.removeItem(OTP_STORAGE_KEY);
  return {
    ...stripPassword(user),
    identity: normalizedTarget,
    loginMethod: channel === 'email' ? 'email_otp' : 'otp',
    isDemoSession: true,
  };
}

export async function verifyOtpByChannel(channel, target, otp) {
  if (isApiEnabled()) {
    const body = channel === 'email'
      ? { channel: 'email', email: normalizeIdentity(target).toLowerCase(), otp }
      : { channel: 'mobile', mobile: normalizeMobile(target), otp };
    const data = await api.post('/auth/login/otp/verify', body, { auth: false });
    setTokens(data.accessToken, data.refreshToken);
    return markDemoSession(
      {
        ...data.user,
        identity: channel === 'email' ? body.email : body.mobile,
        loginMethod: channel === 'email' ? 'email_otp' : 'otp',
      },
      false,
    );
  }

  return verifyLoginOtpByChannel(channel, target, otp);
}

export function verifyLoginOtp(mobile, otp) {
  return verifyLoginOtpByChannel('mobile', mobile, otp);
}

export async function verifyOtp(mobile, otp) {
  return verifyOtpByChannel('mobile', mobile, otp);
}

export function findUserById(userId) {
  return usersData.users.find((u) => u.id === userId) || null;
}

export async function logoutSession() {
  const refreshToken = getRefreshToken();
  if (isApiEnabled() && refreshToken) {
    try {
      await api.post('/auth/logout', { refreshToken }, { auth: false });
    } catch {
      // Best-effort server logout; always clear local session.
    }
  }
  clearTokens();
  sessionStorage.removeItem(OTP_STORAGE_KEY);
}

export async function forgotPassword(email) {
  if (!isApiEnabled()) {
    await delay(300);
    return { message: 'If an account exists, a reset link has been sent.' };
  }
  return api.post('/auth/forgot-password', { email }, { auth: false });
}

export async function resetPassword(token, newPassword) {
  if (!isApiEnabled()) {
    await delay(300);
    return { message: 'Password updated successfully' };
  }
  return api.post('/auth/reset-password', { token, newPassword }, { auth: false });
}

export async function verifyEmail(token) {
  if (!isApiEnabled()) {
    await delay(300);
    return { message: 'Email verified successfully' };
  }
  return api.post('/auth/verify-email', { token }, { auth: false });
}

export async function resendVerification(email) {
  if (!isApiEnabled()) {
    await delay(300);
    return { message: 'Verification email sent' };
  }
  return api.post('/auth/resend-verification', { email }, { auth: false });
}
