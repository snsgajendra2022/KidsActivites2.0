import { useState } from 'react';
import DashboardLayout from '../../components/layout/DashboardLayout.jsx';
import PageTransition from '../../components/ui/PageTransition.jsx';
import { PageHeader } from '../../components/ui/index.jsx';
import Button from '../../components/ui/Button.jsx';
import Input from '../../components/ui/Input.jsx';
import Select from '../../components/ui/Select.jsx';
import { useToast } from '../../context/ToastContext.jsx';
import { Link } from 'react-router-dom';
import { useTenantPath } from '../../hooks/useTenantPath.js';

export default function SecurityCenterPage() {
  const { toast } = useToast();
  const { tenantPath } = useTenantPath();
  const [mfaEnabled, setMfaEnabled] = useState(false);
  const [backupSchedule, setBackupSchedule] = useState('daily');
  const [phone, setPhone] = useState('');

  return (
    <DashboardLayout>
      <PageTransition>
        <PageHeader
          title="Security Center"
          subtitle="2FA, backups, encryption posture, audit logs, and login history."
        />

        <div className="grid gap-5 xl:grid-cols-2">
          <section className="sb-card p-5">
            <h2 className="text-base font-bold text-[#0b1c30]">Two-Factor Authentication</h2>
            <p className="mt-2 text-sm text-[#667085]">
              Require a second factor for privileged school roles. OTP login already exists; this adds explicit 2FA enrollment.
            </p>
            <div className="mt-4 space-y-3">
              <Input label="Recovery mobile" value={phone} onChange={(event) => setPhone(event.target.value)} placeholder="10-digit mobile" />
              <Button
                onClick={() => {
                  setMfaEnabled(true);
                  toast('2FA enrollment enabled for this admin account (demo).', 'success');
                }}
              >
                {mfaEnabled ? '2FA Enabled' : 'Enable 2FA'}
              </Button>
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
              <Button variant="secondary" onClick={() => toast(`${backupSchedule} encrypted backup schedule saved.`, 'success')}>
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
      </PageTransition>
    </DashboardLayout>
  );
}
