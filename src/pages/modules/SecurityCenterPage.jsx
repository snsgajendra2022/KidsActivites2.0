import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import DashboardLayout from '../../components/layout/DashboardLayout.jsx';
import PageTransition from '../../components/ui/PageTransition.jsx';
import { PageHeader } from '../../components/ui/index.jsx';
import Button from '../../components/ui/Button.jsx';
import Input from '../../components/ui/Input.jsx';
import Select from '../../components/ui/Select.jsx';
import LoadingState from '../../components/ui/LoadingState.jsx';
import StatusBadge from '../../components/ui/StatusBadge.jsx';
import { useToast } from '../../context/ToastContext.jsx';
import { useTenantPath } from '../../hooks/useTenantPath.js';
import {
  cancelMfaEnrollment,
  disableMfa,
  enableMfa,
  getBackupPolicy,
  getMfaSettings,
  isValidRecoveryMobile,
  saveBackupPolicy,
  verifyMfa,
} from '../../services/securityService.js';

function maskMobile(mobile) {
  const digits = String(mobile || '').replace(/\D/g, '');
  if (digits.length < 4) return digits || '—';
  return `${'*'.repeat(Math.max(0, digits.length - 4))}${digits.slice(-4)}`;
}

export default function SecurityCenterPage() {
  const { toast } = useToast();
  const { tenantPath } = useTenantPath();

  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [mfa, setMfa] = useState(null);
  const [phone, setPhone] = useState('');
  const [otp, setOtp] = useState('');
  const [phoneError, setPhoneError] = useState('');
  const [otpError, setOtpError] = useState('');
  const [enabling, setEnabling] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [disabling, setDisabling] = useState(false);
  const [cancelling, setCancelling] = useState(false);

  const [backupSchedule, setBackupSchedule] = useState('daily');
  const [savingBackup, setSavingBackup] = useState(false);
  const [backupError, setBackupError] = useState('');

  const reload = async () => {
    setLoading(true);
    setLoadError('');
    try {
      const [mfaSettings, backupPolicy] = await Promise.all([
        getMfaSettings().catch((err) => {
          throw Object.assign(err, { scope: 'mfa' });
        }),
        getBackupPolicy().catch((err) => {
          // Backup is independent — keep MFA usable if only backup is missing
          setBackupError(err?.message || 'Unable to load backup policy.');
          return { frequency: 'daily' };
        }),
      ]);
      setMfa(mfaSettings);
      setPhone(mfaSettings.recoveryMobile || '');
      setBackupSchedule(backupPolicy.frequency || 'daily');
    } catch (err) {
      setLoadError(err?.message || 'Unable to load security settings.');
      setMfa({ enabled: false, pendingVerification: false, recoveryMobile: '' });
      toast(err?.message || 'Unable to load security settings.', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    reload();
  }, []);

  const pending = Boolean(mfa?.pendingVerification);
  const enabled = Boolean(mfa?.enabled);

  const handleEnable = async () => {
    setPhoneError('');
    if (!isValidRecoveryMobile(phone)) {
      setPhoneError('Enter a valid 10-digit mobile number.');
      return;
    }
    setEnabling(true);
    try {
      const result = await enableMfa({ recoveryMobile: phone, method: 'otp_sms' });
      setMfa(result);
      setPhone(result.recoveryMobile || phone);
      setOtp('');
      toast(result.message || 'OTP sent to your recovery mobile.', 'success');
    } catch (err) {
      setPhoneError(err?.message || 'Unable to enable 2FA.');
      toast(err?.message || 'Unable to enable 2FA.', 'error');
    } finally {
      setEnabling(false);
    }
  };

  const handleVerify = async () => {
    setOtpError('');
    if (!/^\d{4,8}$/.test(String(otp || '').trim())) {
      setOtpError('Enter the OTP code from SMS.');
      return;
    }
    setVerifying(true);
    try {
      const result = await verifyMfa({ otp, recoveryMobile: phone });
      setMfa(result);
      setOtp('');
      toast(result.message || '2FA enabled successfully.', 'success');
    } catch (err) {
      setOtpError(err?.message || 'Invalid OTP.');
      toast(err?.message || 'Unable to verify OTP.', 'error');
    } finally {
      setVerifying(false);
    }
  };

  const handleDisable = async () => {
    setDisabling(true);
    try {
      const result = await disableMfa();
      setMfa(result);
      setOtp('');
      toast(result.message || '2FA disabled.', 'success');
    } catch (err) {
      toast(err?.message || 'Unable to disable 2FA.', 'error');
    } finally {
      setDisabling(false);
    }
  };

  const handleCancelPending = async () => {
    setCancelling(true);
    try {
      const result = await cancelMfaEnrollment();
      setMfa(result);
      setOtp('');
      toast('2FA enrollment cancelled.', 'success');
    } catch (err) {
      toast(err?.message || 'Unable to cancel enrollment.', 'error');
    } finally {
      setCancelling(false);
    }
  };

  const handleSaveBackup = async () => {
    setSavingBackup(true);
    setBackupError('');
    try {
      const result = await saveBackupPolicy({ frequency: backupSchedule, encrypted: true });
      setBackupSchedule(result.frequency || backupSchedule);
      toast(result.message || 'Backup schedule saved.', 'success');
    } catch (err) {
      setBackupError(err?.message || 'Unable to save backup policy.');
      toast(err?.message || 'Unable to save backup policy.', 'error');
    } finally {
      setSavingBackup(false);
    }
  };

  return (
    <DashboardLayout>
      <PageTransition>
        <PageHeader
          title="Security Center"
          subtitle="2FA, backups, encryption posture, audit logs, and login history."
        />

        {loading ? (
          <LoadingState message="Loading security settings…" />
        ) : (
          <div className="grid gap-5 xl:grid-cols-2">
            <section className="sb-card p-5">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <h2 className="text-base font-bold text-[#0b1c30]">Two-Factor Authentication</h2>
                  <p className="mt-2 text-sm text-[#667085]">
                    Add SMS OTP as a second factor for this admin account. You will confirm with a one-time code before 2FA is activated.
                  </p>
                </div>
                <StatusBadge
                  status={enabled ? 'verified' : pending ? 'pending' : 'inactive'}
                  variant={enabled ? 'success' : pending ? 'warning' : 'info'}
                >
                  {enabled ? 'Enabled' : pending ? 'Pending OTP' : 'Disabled'}
                </StatusBadge>
              </div>

              {loadError && (
                <div className="mt-3 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700" role="alert">
                  {loadError}
                  <div className="mt-2">
                    <Button type="button" size="sm" variant="secondary" onClick={reload}>
                      Retry
                    </Button>
                  </div>
                </div>
              )}

              <div className="mt-4 space-y-3">
                <Input
                  label="Recovery mobile"
                  required
                  name="recoveryMobile"
                  inputMode="numeric"
                  autoComplete="tel"
                  value={phone}
                  onChange={(event) => {
                    setPhone(event.target.value.replace(/[^\d]/g, '').slice(0, 10));
                    setPhoneError('');
                  }}
                  placeholder="10-digit mobile"
                  error={phoneError}
                  disabled={enabled || enabling || verifying || Boolean(loadError)}
                  helper={
                    enabled
                      ? `Protected number ending in ${maskMobile(mfa?.recoveryMobile || phone).slice(-4)}`
                      : 'Indian 10-digit mobile. OTP will be sent to this number.'
                  }
                />

                {pending && !enabled && (
                  <Input
                    label="Enter OTP"
                    required
                    name="mfaOtp"
                    inputMode="numeric"
                    autoComplete="one-time-code"
                    value={otp}
                    onChange={(event) => {
                      setOtp(event.target.value.replace(/[^\d]/g, '').slice(0, 8));
                      setOtpError('');
                    }}
                    placeholder="6-digit code"
                    error={otpError}
                    disabled={verifying}
                    helper="Check SMS on your recovery mobile."
                  />
                )}

                <div className="flex flex-wrap gap-2">
                  {!enabled && !pending && (
                    <Button type="button" loading={enabling} disabled={Boolean(loadError)} onClick={handleEnable}>
                      Enable 2FA
                    </Button>
                  )}
                  {pending && !enabled && (
                    <>
                      <Button type="button" loading={verifying} onClick={handleVerify}>
                        Verify OTP
                      </Button>
                      <Button type="button" variant="secondary" loading={enabling} onClick={handleEnable}>
                        Resend OTP
                      </Button>
                      <Button type="button" variant="secondary" loading={cancelling} onClick={handleCancelPending}>
                        Cancel
                      </Button>
                    </>
                  )}
                  {enabled && (
                    <Button type="button" variant="secondary" loading={disabling} onClick={handleDisable}>
                      Disable 2FA
                    </Button>
                  )}
                </div>
              </div>
            </section>

            <section className="sb-card p-5">
              <h2 className="text-base font-bold text-[#0b1c30]">Backup System</h2>
              <p className="mt-2 text-sm text-[#667085]">
                Schedule encrypted tenant backups and restore drills.
              </p>
              <div className="mt-4 space-y-3">
                <Select
                  label="Backup frequency"
                  value={backupSchedule}
                  onChange={(event) => setBackupSchedule(event.target.value)}
                  options={[
                    { value: 'hourly', label: 'Hourly' },
                    { value: 'daily', label: 'Daily' },
                    { value: 'weekly', label: 'Weekly' },
                  ]}
                />
                {backupError && (
                  <p className="text-xs font-medium text-rose-600" role="alert">{backupError}</p>
                )}
                <Button type="button" variant="secondary" loading={savingBackup} onClick={handleSaveBackup}>
                  Save Backup Policy
                </Button>
              </div>
            </section>

            <section className="sb-card p-5">
              <h2 className="text-base font-bold text-[#0b1c30]">Data Encryption</h2>
              <ul className="mt-3 space-y-2 text-sm text-[#455168]">
                <li>TLS in transit for all API and app traffic</li>
                <li>Encrypted object storage for documents and media</li>
                <li>Secrets managed outside application source</li>
              </ul>
            </section>

            <section className="sb-card p-5">
              <h2 className="text-base font-bold text-[#0b1c30]">Security Links</h2>
              <div className="mt-4 flex flex-wrap gap-2">
                <Link to={tenantPath('/admin/audit-logs')} className="sb-button-secondary">Audit Logs</Link>
                <Link to={tenantPath('/admin/login-history')} className="sb-button-secondary">Login History</Link>
                <Link to={tenantPath('/admin/roles')} className="sb-button-secondary">Roles & Permissions</Link>
              </div>
            </section>
          </div>
        )}
      </PageTransition>
    </DashboardLayout>
  );
}
