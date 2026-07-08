import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Bell, Calendar, GraduationCap, IndianRupee, Save, Settings, Tv } from 'lucide-react';
import DashboardLayout from '../../components/layout/DashboardLayout.jsx';
import { PageHeader } from '../../components/ui/index.jsx';
import Input from '../../components/ui/Input.jsx';
import Select from '../../components/ui/Select.jsx';
import Button from '../../components/ui/Button.jsx';
import Modal from '../../components/ui/Modal.jsx';
import {
  ResponsiveDataTable,
  TableActionButton,
} from '../../components/ui/DataTable.jsx';
import { useToast } from '../../context/ToastContext.jsx';
import { useAuth } from '../../context/AuthContext.jsx';
import { useTenantPath } from '../../hooks/useTenantPath.js';
import {
  getSchoolSettings,
  updateSchoolSettings,
  getFeeStructures,
  updateFeeStructure,
  toggleFeeStructure,
} from '../../services/settingsService.js';
import { calculateTotal } from '../../data/mockFees.js';
import '../../styles/admin-modules.css';
import '../../styles/class-management.css';

const TABS = [
  { id: 'general', label: 'General', icon: Settings },
  { id: 'classes', label: 'Class & Fees', icon: GraduationCap, href: '/admin/class-management' },
  { id: 'fees', label: 'Fee Structures', icon: IndianRupee },
  { id: 'notifications', label: 'Notifications', icon: Bell },
];

function ClassManagementHubCard() {
  const { tenantPath } = useTenantPath();
  return (
    <div className="admin-settings-hub">
      <Link to={tenantPath('/admin/class-management')} className="admin-settings-hub-card">
        <GraduationCap size={22} />
        <h3>Class &amp; Fees Management</h3>
        <p>Add daycare classes, assign teachers, and define class-wise fee structures.</p>
      </Link>
      <Link to={tenantPath('/admin/albums')} className="admin-settings-hub-card">
        <Tv size={22} />
        <h3>Class Albums &amp; TV Playback</h3>
        <p>Manage class album codes for TV slideshows and classroom media.</p>
      </Link>
    </div>
  );
}

const FEE_FIELDS = [
  { key: 'admissionFee', label: 'Admission Fee' },
  { key: 'registrationFee', label: 'Registration Fee' },
  { key: 'tuitionFee', label: 'Tuition Fee' },
  { key: 'transportFee', label: 'Transport Fee' },
  { key: 'activityFee', label: 'Activity Fee' },
  { key: 'discount', label: 'Discount' },
];

const FEE_COLUMNS = [
  { label: 'Class', primary: true, render: (row) => row.label },
  {
    label: 'Total',
    render: (row) => `₹${row.total?.toLocaleString()}`,
  },
  {
    label: 'Status',
    badge: true,
    render: (row) => (
      <span className={`admin-badge ${row.active ? 'admin-badge--success' : 'admin-badge--muted'}`}>
        {row.active ? 'Active' : 'Inactive'}
      </span>
    ),
  },
  {
    label: 'Last Updated',
    muted: true,
    render: (row) => (row.updatedAt ? new Date(row.updatedAt).toLocaleDateString() : '—'),
  },
];

function ToggleRow({ label, description, checked, onChange }) {
  return (
    <label className="admin-toggle-row">
      <div>
        <span className="admin-toggle-row__label">{label}</span>
        {description && <span className="admin-toggle-row__desc">{description}</span>}
      </div>
      <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} />
    </label>
  );
}

export default function AdminSettings() {
  const { user, isDemoSession } = useAuth();
  const { toast } = useToast();
  const { tenantPath } = useTenantPath();
  const navigate = useNavigate();
  const [tab, setTab] = useState('general');
  const [settings, setSettings] = useState(null);
  const [feeStructures, setFeeStructures] = useState([]);
  const [saving, setSaving] = useState(false);
  const [loadError, setLoadError] = useState(null);
  const [editFee, setEditFee] = useState(null);
  const [feeForm, setFeeForm] = useState({});

  const load = async () => {
    setLoadError(null);
    try {
      const [s, fees] = await Promise.all([getSchoolSettings(), getFeeStructures()]);
      setSettings(s);
      setFeeStructures(fees);
    } catch {
      setLoadError('Failed to load school settings.');
      setSettings(null);
      setFeeStructures([]);
    }
  };

  useEffect(() => { load(); }, []);

  const handleSaveSettings = async () => {
    setSaving(true);
    try {
      const updated = await updateSchoolSettings(settings, user?.name);
      setSettings(updated);
      toast('Settings saved successfully.', 'success');
    } catch {
      toast('Failed to save settings.', 'error');
    } finally {
      setSaving(false);
    }
  };

  const openFeeEdit = (structure) => {
    setEditFee(structure);
    setFeeForm({ ...structure.breakdown });
  };

  const handleSaveFee = async () => {
    setSaving(true);
    try {
      const updated = await updateFeeStructure(editFee.id, feeForm, user?.name);
      setFeeStructures((prev) => prev.map((f) => (f.id === updated.id ? updated : f)));
      setEditFee(null);
      toast(`Fee structure for ${updated.label} updated.`, 'success');
    } catch {
      toast('Failed to update fee structure.', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleToggleFee = async (structure) => {
    try {
      const updated = await toggleFeeStructure(structure.id, !structure.active, user?.name);
      setFeeStructures((prev) => prev.map((f) => (f.id === updated.id ? updated : f)));
      toast(`${updated.label} fee structure ${updated.active ? 'activated' : 'deactivated'}.`, 'success');
    } catch {
      toast('Failed to update fee structure.', 'error');
    }
  };

  if (!settings) {
    return (
      <DashboardLayout>
        <PageHeader title="Settings" subtitle="School configuration and fee structures." />
        <ClassManagementHubCard />
        {loadError ? (
          <div className="sb-card admin-modules-panel">
            <p>{loadError}</p>
            <Button variant="primary" onClick={load}>Retry</Button>
          </div>
        ) : (
          <div className="admin-modules-loading" />
        )}
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <PageHeader
        title="Settings"
        subtitle="School configuration and fee structures."
        actions={isDemoSession && (
          <span className="admin-demo-badge">Demo data</span>
        )}
      />

      <ClassManagementHubCard />

      <div className="admin-modules-tabs">
        {TABS.map(({ id, label, icon: Icon, href }) => (
          <button
            key={id}
            type="button"
            className={`admin-modules-tab ${tab === id ? 'active' : ''}`}
            onClick={() => {
              if (href) {
                navigate(tenantPath(href));
                return;
              }
              setTab(id);
            }}
          >
            <Icon size={16} />
            {label}
          </button>
        ))}
      </div>

      {tab === 'general' && (
        <section className="sb-card admin-modules-panel">
          <h3 className="admin-modules-panel__title">Academic &amp; Admissions</h3>
          <div className="admin-modules-form-grid">
            <Input
              label="Academic Year"
              value={settings.academicYear}
              onChange={(e) => setSettings({ ...settings, academicYear: e.target.value })}
            />
            <Input
              label="Enrollment Deadline"
              type="date"
              value={settings.enrollmentDeadline}
              onChange={(e) => setSettings({ ...settings, enrollmentDeadline: e.target.value })}
            />
            <Input
              label="Admission Start Date"
              type="date"
              value={settings.admissionStartDate}
              onChange={(e) => setSettings({ ...settings, admissionStartDate: e.target.value })}
            />
            <Select
              label="Timezone"
              value={settings.timezone}
              onChange={(e) => setSettings({ ...settings, timezone: e.target.value })}
              options={[
                { value: 'Asia/Kolkata', label: 'Asia/Kolkata (IST)' },
                { value: 'Asia/Dubai', label: 'Asia/Dubai (GST)' },
              ]}
            />
            <Input
              label="Late Fee (%)"
              type="number"
              min="0"
              value={settings.lateFeePercent}
              onChange={(e) => setSettings({ ...settings, lateFeePercent: Number(e.target.value) })}
            />
            <Input
              label="Grace Period (days)"
              type="number"
              min="0"
              value={settings.gracePeriodDays}
              onChange={(e) => setSettings({ ...settings, gracePeriodDays: Number(e.target.value) })}
            />
          </div>

          <ToggleRow
            label="Admissions Open"
            description="Allow new enrollment applications on the public portal."
            checked={settings.admissionsOpen}
            onChange={(v) => setSettings({ ...settings, admissionsOpen: v })}
          />

          <div className="admin-modules-actions">
            <Button variant="primary" loading={saving} onClick={handleSaveSettings}>
              <Save size={16} />
              Save General Settings
            </Button>
          </div>
        </section>
      )}

      {tab === 'fees' && (
        <section className="sb-card admin-modules-panel admin-modules-panel--flush">
          <div className="admin-modules-panel__head">
            <div>
              <h3 className="admin-modules-panel__title">Fee Structures by Class</h3>
              <p className="admin-modules-panel__subtitle">
                Default fee breakdown applied when assigning fees to applications.
              </p>
            </div>
          </div>
          <ResponsiveDataTable
            nested
            columns={FEE_COLUMNS}
            data={feeStructures}
            keyExtractor={(row) => row.id}
            minWidth={640}
            renderActions={(row) => (
              <>
                <TableActionButton variant="outline" onClick={() => openFeeEdit(row)}>
                  Edit
                </TableActionButton>
                <TableActionButton
                  variant={row.active ? 'outline' : 'success'}
                  onClick={() => handleToggleFee(row)}
                >
                  {row.active ? 'Deactivate' : 'Activate'}
                </TableActionButton>
              </>
            )}
          />
        </section>
      )}

      {tab === 'notifications' && (
        <section className="sb-card admin-modules-panel">
          <h3 className="admin-modules-panel__title">Notification Preferences</h3>
          <div className="admin-toggle-list">
            <ToggleRow
              label="Email on Application Submitted"
              checked={settings.notifications.emailOnApplicationSubmitted}
              onChange={(v) => setSettings({
                ...settings,
                notifications: { ...settings.notifications, emailOnApplicationSubmitted: v },
              })}
            />
            <ToggleRow
              label="Email on Fee Verified"
              checked={settings.notifications.emailOnFeeVerified}
              onChange={(v) => setSettings({
                ...settings,
                notifications: { ...settings.notifications, emailOnFeeVerified: v },
              })}
            />
            <ToggleRow
              label="SMS on Admission Confirmed"
              checked={settings.notifications.smsOnAdmissionConfirmed}
              onChange={(v) => setSettings({
                ...settings,
                notifications: { ...settings.notifications, smsOnAdmissionConfirmed: v },
              })}
            />
            <ToggleRow
              label="Parent Photo Alerts"
              checked={settings.notifications.parentPhotoAlerts}
              onChange={(v) => setSettings({
                ...settings,
                notifications: { ...settings.notifications, parentPhotoAlerts: v },
              })}
            />
            <ToggleRow
              label="Daily Admin Digest"
              checked={settings.notifications.dailyDigest}
              onChange={(v) => setSettings({
                ...settings,
                notifications: { ...settings.notifications, dailyDigest: v },
              })}
            />
          </div>
          <div className="admin-modules-actions">
            <Button variant="primary" loading={saving} onClick={handleSaveSettings}>
              <Save size={16} />
              Save Notification Settings
            </Button>
          </div>
        </section>
      )}

      <Modal
        open={Boolean(editFee)}
        onClose={() => setEditFee(null)}
        title={editFee ? `Edit Fee — ${editFee.label}` : 'Edit Fee'}
        footer={(
          <>
            <Button variant="secondary" onClick={() => setEditFee(null)}>Cancel</Button>
            <Button variant="primary" loading={saving} onClick={handleSaveFee}>Save Fee Structure</Button>
          </>
        )}
      >
        <div className="admin-modules-form-grid">
          {FEE_FIELDS.map(({ key, label }) => (
            <Input
              key={key}
              label={label}
              type="number"
              min="0"
              value={feeForm[key] ?? 0}
              onChange={(e) => setFeeForm({ ...feeForm, [key]: Number(e.target.value) })}
            />
          ))}
        </div>
        <p className="admin-fee-total">
          <Calendar size={14} />
          Total: <strong>₹{calculateTotal(feeForm).toLocaleString()}</strong>
        </p>
      </Modal>
    </DashboardLayout>
  );
}
