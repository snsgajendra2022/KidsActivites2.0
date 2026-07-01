import usersData from '../data/users.json';
import { delay } from './mockApi.js';

const DEMO_OTP = '123456';
const OTP_STORAGE_KEY = 'sb_login_otp';
const OTP_TTL_MS = 5 * 60 * 1000;

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

  sessionStorage.setItem(
    OTP_STORAGE_KEY,
    JSON.stringify({
      mobile: normalized,
      otp: DEMO_OTP,
      expires: Date.now() + OTP_TTL_MS,
    }),
  );

  return {
    mobile: normalized,
    expiresIn: OTP_TTL_MS / 1000,
    demoOtp: DEMO_OTP,
  };
}

/** Verify OTP and return session user. */
export function verifyLoginOtp(mobile, otp) {
  const normalized = normalizeMobile(mobile);
  const code = String(otp || '').trim();

  if (!normalized || normalized.length !== 10) {
    throw new Error('Please enter a valid mobile number.');
  }
  if (!code || code.length !== 6) {
    throw new Error('Please enter the 6-digit OTP.');
  }

  const stored = (() => {
    try {
      return JSON.parse(sessionStorage.getItem(OTP_STORAGE_KEY) || 'null');
    } catch {
      return null;
    }
  })();

  if (!stored || stored.mobile !== normalized) {
    throw new Error('Please request an OTP first.');
  }
  if (Date.now() > stored.expires) {
    sessionStorage.removeItem(OTP_STORAGE_KEY);
    throw new Error('OTP has expired. Please request a new one.');
  }
  if (stored.otp !== code) {
    throw new Error('Invalid OTP. Please try again.');
  }

  const user = findUserByMobile(normalized);
  if (!user) {
    throw new Error('Account not found.');
  }

  sessionStorage.removeItem(OTP_STORAGE_KEY);
  const { password: _pw, ...sessionUser } = user;
  return { ...sessionUser, identity: normalized, loginMethod: 'otp' };
}

export function findUserById(userId) {
  return usersData.users.find((u) => u.id === userId) || null;
}
