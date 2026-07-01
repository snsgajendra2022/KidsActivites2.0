import usersData from '../data/users.json';
import { delay } from './mockApi.js';

const DEMO_OTP = '123456';
const OTP_STORAGE_KEY = 'sb_login_otp';
const OTP_TTL_MS = 5 * 60 * 1000;

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

export function findUserByMobile(mobile) {
  return usersData.users.find((u) => matchesMobile(u, mobile)) || null;
}

export function findUserByEmail(email) {
  return usersData.users.find((u) => matchesEmail(u, email)) || null;
}

/** Public demo accounts for login page (no passwords). */
export function getDemoAccounts() {
  return usersData.users.map(({ password, ...account }) => account);
}

/** Authenticate by email + password only. */
export function authenticateByEmail(email, password) {
  const trimmedEmail = normalizeIdentity(email);
  if (!trimmedEmail) {
    throw new Error('Please enter your email address.');
  }
  if (!trimmedEmail.includes('@')) {
    throw new Error('Please enter a valid email address.');
  }
  if (!password) {
    throw new Error('Please enter your password.');
  }

  const user = usersData.users.find((u) => matchesEmail(u, trimmedEmail));
  if (!user || user.password !== password) {
    throw new Error('Invalid email or password.');
  }

  const { password: _pw, ...sessionUser } = user;
  return { ...sessionUser, identity: trimmedEmail, loginMethod: 'email' };
}

/** Authenticate by email or mobile + password (legacy). */
export function authenticate(identity, password) {
  const trimmedIdentity = normalizeIdentity(identity);
  if (!trimmedIdentity) {
    throw new Error('Please enter email or mobile number.');
  }
  if (!password) {
    throw new Error('Please enter your password.');
  }

  const user = usersData.users.find((u) => matchesIdentity(u, trimmedIdentity));
  if (!user || user.password !== password) {
    throw new Error('Invalid email/mobile or password.');
  }

  const { password: _pw, ...sessionUser } = user;
  return { ...sessionUser, identity: trimmedIdentity, loginMethod: 'password' };
}

/** Mock: send OTP to registered mobile. Demo OTP is always 123456. */
export async function sendLoginOtp(mobile) {
  await delay(700);
  const normalized = normalizeMobile(mobile);
  if (!normalized || normalized.length !== 10) {
    throw new Error('Please enter a valid 10-digit mobile number.');
  }

  const user = findUserByMobile(normalized);
  if (!user) {
    throw new Error('No account found with this mobile number.');
  }

  saveOtpSession('mobile', normalized, DEMO_OTP);

  return {
    mobile: normalized,
    expiresIn: OTP_TTL_MS / 1000,
    demoOtp: DEMO_OTP,
  };
}

/** Mock: send OTP to registered email. Demo OTP is always 123456. */
export async function sendEmailLoginOtp(email) {
  await delay(700);
  const trimmed = normalizeIdentity(email);
  if (!trimmed || !trimmed.includes('@')) {
    throw new Error('Please enter a valid email address.');
  }

  const user = findUserByEmail(trimmed);
  if (!user) {
    throw new Error('No account found with this email address.');
  }

  const normalized = saveOtpSession('email', trimmed, DEMO_OTP);

  return {
    email: normalized,
    expiresIn: OTP_TTL_MS / 1000,
    demoOtp: DEMO_OTP,
  };
}

/** Verify OTP for mobile or email channel. */
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
  if (!code || code.length !== 6) {
    throw new Error('Please enter the 6-digit OTP.');
  }

  const stored = readOtpSession();
  if (!stored || stored.channel !== channel || stored.target !== normalizedTarget) {
    throw new Error('Please request an OTP first.');
  }
  if (Date.now() > stored.expires) {
    sessionStorage.removeItem(OTP_STORAGE_KEY);
    throw new Error('OTP has expired. Please request a new one.');
  }
  if (stored.otp !== code) {
    throw new Error('Invalid OTP. Please try again.');
  }

  const user = channel === 'email'
    ? findUserByEmail(normalizedTarget)
    : findUserByMobile(normalizedTarget);
  if (!user) {
    throw new Error('Account not found.');
  }

  sessionStorage.removeItem(OTP_STORAGE_KEY);
  const { password: _pw, ...sessionUser } = user;
  return {
    ...sessionUser,
    identity: normalizedTarget,
    loginMethod: channel === 'email' ? 'email_otp' : 'otp',
  };
}

/** Verify mobile OTP and return session user. */
export function verifyLoginOtp(mobile, otp) {
  return verifyLoginOtpByChannel('mobile', mobile, otp);
}

export function findUserById(userId) {
  return usersData.users.find((u) => u.id === userId) || null;
}
