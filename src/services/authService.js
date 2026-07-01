import usersData from '../data/users.json';

function normalizeIdentity(value) {
  return String(value || '').trim();
}

function matchesIdentity(user, identity) {
  const trimmed = normalizeIdentity(identity);
  if (!trimmed) return false;
  const emailMatch = user.email.toLowerCase() === trimmed.toLowerCase();
  const mobileMatch = user.mobile === trimmed.replace(/\s+/g, '');
  return emailMatch || mobileMatch;
}

/** Public demo accounts for login page (no passwords). */
export function getDemoAccounts() {
  return usersData.users.map(({ password, ...account }) => account);
}

/** Authenticate by email or mobile + password; role comes from user record. */
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
  return { ...sessionUser, identity: trimmedIdentity };
}

export function findUserById(userId) {
  return usersData.users.find((u) => u.id === userId) || null;
}
