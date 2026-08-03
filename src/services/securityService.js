import { delay, getStore, setStore } from './mockApi.js';
import { api } from './api/client.js';
import { routeRequest } from './api/routeRequest.js';

const MFA_KEY = 'sb_security_mfa';
const BACKUP_KEY = 'sb_security_backup_policy';
const DEMO_OTP = '123456';

function normalizeMobile(value) {
  const digits = String(value || '').replace(/\D/g, '');
  if (digits.length === 12 && digits.startsWith('91')) return digits.slice(2);
  if (digits.length === 11 && digits.startsWith('0')) return digits.slice(1);
  return digits;
}

function defaultMfa() {
  return {
    enabled: false,
    method: 'otp_sms',
    recoveryMobile: '',
    pendingVerification: false,
    verifiedAt: null,
    updatedAt: null,
  };
}

function defaultBackupPolicy() {
  return {
    frequency: 'daily',
    encrypted: true,
    retentionDays: 30,
    lastRunAt: null,
    updatedAt: null,
  };
}

export function normalizeMfa(data) {
  if (!data || typeof data !== 'object') return defaultMfa();
  const status = String(data.status || data.mfaStatus || '').toLowerCase();
  const rawEnabled = Boolean(
    data.enabled
    ?? data.mfaEnabled
    ?? data.isEnabled
    ?? ['enabled', 'active', 'verified'].includes(status),
  );
  const rawPending = Boolean(
    data.pendingVerification
    ?? data.requiresVerification
    ?? data.otpRequired
    ?? ['pending', 'pending_verification', 'otp_sent'].includes(status),
  );
  const pendingVerification = rawPending && !rawEnabled;
  const enabled = rawEnabled && !rawPending;
  return {
    enabled,
    method: data.method || data.mfaMethod || 'otp_sms',
    recoveryMobile: normalizeMobile(
      data.recoveryMobile || data.mobile || data.phone || '',
    ),
    pendingVerification,
    verifiedAt: data.verifiedAt || null,
    updatedAt: data.updatedAt || null,
    message: data.message || null,
    otpSent: data.otpSent === true,
  };
}

/** Fix ambiguous enable responses: OTP sent ⇒ pending until verify. */
export function normalizeMfaAfterEnable(data, recoveryMobile) {
  const base = normalizeMfa(data);
  const otpSent = data?.otpSent !== false;
  if (base.enabled && !base.pendingVerification) {
    return {
      ...base,
      recoveryMobile: base.recoveryMobile || normalizeMobile(recoveryMobile),
      message: data?.message || 'Two-factor authentication is enabled.',
    };
  }
  return {
    ...base,
    enabled: false,
    pendingVerification: true,
    recoveryMobile: base.recoveryMobile || normalizeMobile(recoveryMobile),
    otpSent,
    message: data?.message || `OTP sent to ${normalizeMobile(recoveryMobile)}.`,
  };
}

export function normalizeMfaAfterVerify(data) {
  const base = normalizeMfa(data);
  return {
    ...base,
    enabled: data?.enabled === false ? false : true,
    pendingVerification: false,
    message: data?.message || 'Two-factor authentication is now enabled.',
  };
}

function normalizeBackupPolicy(data) {
  if (!data || typeof data !== 'object') return defaultBackupPolicy();
  return {
    frequency: data.frequency || data.schedule || 'daily',
    encrypted: data.encrypted !== false,
    retentionDays: Number(data.retentionDays ?? 30),
    lastRunAt: data.lastRunAt || null,
    updatedAt: data.updatedAt || null,
    message: data.message || null,
  };
}

function readMfa() {
  return normalizeMfa(getStore(MFA_KEY, defaultMfa()));
}

function writeMfa(next) {
  setStore(MFA_KEY, next);
  return next;
}

function readBackup() {
  return normalizeBackupPolicy(getStore(BACKUP_KEY, defaultBackupPolicy()));
}

function writeBackup(next) {
  setStore(BACKUP_KEY, next);
  return next;
}

function missingApiMessage(feature) {
  return `${feature} API is not available on the server.`;
}

function isMissingRouteError(err) {
  const status = Number(err?.status || 0);
  return status === 404 || status === 405;
}

export function isValidRecoveryMobile(value) {
  return /^\d{10}$/.test(normalizeMobile(value));
}

export async function getMfaSettings() {
  return routeRequest({
    mockFn: async () => {
      await delay(120);
      return readMfa();
    },
    apiFn: async () => {
      try {
        return normalizeMfa(await api.get('/admin/security/mfa'));
      } catch (err) {
        if (isMissingRouteError(err)) {
          throw new Error(missingApiMessage('GET /admin/security/mfa'));
        }
        throw err;
      }
    },
  });
}

export async function enableMfa({ recoveryMobile, method = 'otp_sms' } = {}) {
  const mobile = normalizeMobile(recoveryMobile);
  if (!isValidRecoveryMobile(mobile)) {
    throw new Error('Enter a valid 10-digit recovery mobile number.');
  }

  return routeRequest({
    mockFn: async () => {
      await delay(250);
      const next = writeMfa({
        ...readMfa(),
        enabled: false,
        method,
        recoveryMobile: mobile,
        pendingVerification: true,
        verifiedAt: null,
        updatedAt: new Date().toISOString(),
        demoOtp: DEMO_OTP,
      });
      return {
        ...normalizeMfaAfterEnable(next, mobile),
        message: `OTP sent to ${mobile}. Demo OTP: ${DEMO_OTP}`,
      };
    },
    apiFn: async () => {
      try {
        const data = await api.post('/admin/security/mfa/enable', {
          recoveryMobile: mobile,
          method,
        });
        return normalizeMfaAfterEnable(data, mobile);
      } catch (err) {
        if (isMissingRouteError(err)) {
          throw new Error(missingApiMessage('POST /admin/security/mfa/enable'));
        }
        throw err;
      }
    },
  });
}

export async function verifyMfa({ otp, recoveryMobile } = {}) {
  const code = String(otp || '').trim();
  if (!/^\d{4,8}$/.test(code)) {
    throw new Error('Enter the OTP code sent to your recovery mobile.');
  }
  const mobile = recoveryMobile ? normalizeMobile(recoveryMobile) : undefined;

  return routeRequest({
    mockFn: async () => {
      await delay(220);
      const raw = getStore(MFA_KEY, defaultMfa());
      const expected = String(raw.demoOtp || DEMO_OTP);
      if (code !== expected) throw new Error('Invalid OTP. Please try again.');
      const next = writeMfa({
        ...raw,
        enabled: true,
        pendingVerification: false,
        recoveryMobile: mobile || normalizeMobile(raw.recoveryMobile),
        verifiedAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        demoOtp: undefined,
      });
      return normalizeMfaAfterVerify(next);
    },
    apiFn: async () => {
      try {
        const data = await api.post('/admin/security/mfa/verify', {
          otp: code,
          recoveryMobile: mobile,
        });
        return normalizeMfaAfterVerify(data);
      } catch (err) {
        if (isMissingRouteError(err)) {
          throw new Error(missingApiMessage('POST /admin/security/mfa/verify'));
        }
        throw err;
      }
    },
  });
}

export async function disableMfa({ otp } = {}) {
  const body = { enabled: false };
  if (otp) body.otp = String(otp).trim();

  return routeRequest({
    mockFn: async () => {
      await delay(180);
      const next = writeMfa({
        ...defaultMfa(),
        updatedAt: new Date().toISOString(),
      });
      return {
        ...normalizeMfa(next),
        message: 'Two-factor authentication has been disabled.',
      };
    },
    apiFn: async () => {
      let lastErr;
      const attempts = [
        () => api.patch('/admin/security/mfa', body),
        () => api.post('/admin/security/mfa/disable', body),
      ];
      for (const attempt of attempts) {
        try {
          const data = await attempt();
          return {
            ...normalizeMfa({ ...data, enabled: false, pendingVerification: false }),
            message: data?.message || 'Two-factor authentication has been disabled.',
          };
        } catch (err) {
          lastErr = err;
          if (!isMissingRouteError(err)) throw err;
        }
      }
      throw new Error(
        lastErr?.message || missingApiMessage('PATCH /admin/security/mfa (or POST .../mfa/disable)'),
      );
    },
  });
}

export async function cancelMfaEnrollment() {
  return routeRequest({
    mockFn: async () => {
      await delay(100);
      const current = readMfa();
      if (current.enabled) return current;
      const next = writeMfa({
        ...defaultMfa(),
        updatedAt: new Date().toISOString(),
      });
      return normalizeMfa(next);
    },
    apiFn: async () => {
      try {
        const data = await api.patch('/admin/security/mfa', {
          enabled: false,
          cancelPending: true,
        });
        return normalizeMfa({ ...data, enabled: false, pendingVerification: false });
      } catch (err) {
        if (isMissingRouteError(err)) {
          // Allow UI to leave pending state locally when cancel endpoint missing
          return { ...defaultMfa(), message: 'Enrollment cancelled.' };
        }
        throw err;
      }
    },
  });
}

export async function getBackupPolicy() {
  return routeRequest({
    mockFn: async () => {
      await delay(100);
      return readBackup();
    },
    apiFn: async () => {
      try {
        return normalizeBackupPolicy(await api.get('/admin/security/backup-policy'));
      } catch (err) {
        if (isMissingRouteError(err)) {
          throw new Error(missingApiMessage('GET /admin/security/backup-policy'));
        }
        throw err;
      }
    },
  });
}

export async function saveBackupPolicy(policy = {}) {
  const payload = {
    frequency: policy.frequency || 'daily',
    encrypted: policy.encrypted !== false,
    retentionDays: Number(policy.retentionDays ?? 30),
  };

  return routeRequest({
    mockFn: async () => {
      await delay(180);
      const next = writeBackup({
        ...readBackup(),
        ...payload,
        updatedAt: new Date().toISOString(),
      });
      return {
        ...normalizeBackupPolicy(next),
        message: `${payload.frequency} encrypted backup schedule saved.`,
      };
    },
    apiFn: async () => {
      try {
        const data = await api.put('/admin/security/backup-policy', payload);
        return {
          ...normalizeBackupPolicy(data),
          message: data?.message || `${payload.frequency} encrypted backup schedule saved.`,
        };
      } catch (err) {
        if (isMissingRouteError(err)) {
          throw new Error(missingApiMessage('PUT /admin/security/backup-policy'));
        }
        throw err;
      }
    },
  });
}
