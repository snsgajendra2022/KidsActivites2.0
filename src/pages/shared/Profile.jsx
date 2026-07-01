import { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowLeft, Building2, Eye, EyeOff, KeyRound, Save, Shield, User,
} from 'lucide-react';
import AppLayout from '../../components/layout/AppLayout.jsx';
import PageTransition from '../../components/ui/PageTransition.jsx';
import { PageHeader } from '../../components/ui/index.jsx';
import { useAuth } from '../../context/AuthContext.jsx';
import { useToast } from '../../context/ToastContext.jsx';
import { usePortalConfig } from '../../context/PortalConfigContext.jsx';
import { ROLE_LABELS, ROLE_DASHBOARD } from '../../constants/roles.js';
import '../../styles/account-settings.css';

function PasswordField({ label, name, value, onChange, show, onToggle }) {
  return (
    <div className="account-settings-field">
      <label htmlFor={name}>{label}</label>
      <div className="account-settings-password-wrap">
        <input
          id={name}
          name={name}
          type={show ? 'text' : 'password'}
          value={value}
          onChange={onChange}
          autoComplete={name === 'currentPassword' ? 'current-password' : 'new-password'}
          placeholder={`Enter ${label.toLowerCase()}`}
        />
        <button
          type="button"
          className="account-settings-password-toggle"
          onClick={onToggle}
          aria-label={show ? 'Hide password' : 'Show password'}
        >
          {show ? <EyeOff size={18} /> : <Eye size={18} />}
        </button>
      </div>
    </div>
  );
}

export default function Profile() {
  const { user, updateProfile, changePassword, isDemoSession } = useAuth();
  const { school } = usePortalConfig();
  const { toast } = useToast();
  const [savingProfile, setSavingProfile] = useState(false);
  const [savingPassword, setSavingPassword] = useState(false);
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [profile, setProfile] = useState({
    name: user?.name || '',
    mobile: user?.mobile || '',
  });
  const [passwords, setPasswords] = useState({
    current: '',
    next: '',
    confirm: '',
  });

  const initials =
    user?.name
      ?.split(' ')
      .map((n) => n[0])
      .join('')
      .slice(0, 2)
      .toUpperCase() || 'U';

  const dashboardPath = ROLE_DASHBOARD[user?.role] || '/';

  const handleProfileSave = async (e) => {
    e.preventDefault();
    if (!profile.name.trim()) {
      toast('Full name is required.', 'warning');
      return;
    }
    setSavingProfile(true);
    try {
      await updateProfile({
        name: profile.name.trim(),
        mobile: profile.mobile.trim(),
      });
      toast('Profile updated successfully.', 'success');
    } catch (err) {
      toast(err.message || 'Unable to update profile.', 'error');
    } finally {
      setSavingProfile(false);
    }
  };

  const handlePasswordSave = async (e) => {
    e.preventDefault();
    if (!passwords.current || !passwords.next || !passwords.confirm) {
      toast('Please fill in all password fields.', 'warning');
      return;
    }
    if (passwords.next.length < 6) {
      toast('New password must be at least 6 characters.', 'warning');
      return;
    }
    if (passwords.next !== passwords.confirm) {
      toast('New passwords do not match.', 'warning');
      return;
    }
    setSavingPassword(true);
    try {
      await changePassword({
        currentPassword: passwords.current,
        newPassword: passwords.next,
      });
      toast('Password updated successfully.', 'success');
      setPasswords({ current: '', next: '', confirm: '' });
    } catch (err) {
      toast(err.message || 'Unable to update password.', 'error');
    } finally {
      setSavingPassword(false);
    }
  };

  return (
    <AppLayout>
      <PageTransition>
        <PageHeader
          title="Account Settings"
          subtitle={(
            <>
              Manage your profile, contact details, and account security.
              {isDemoSession && (
                <span className="ml-2 text-xs font-medium text-amber-700 bg-amber-50 px-2 py-0.5 rounded-full">
                  Demo account
                </span>
              )}
            </>
          )}
          actions={(
            <Link to={dashboardPath} className="account-settings-back">
              <ArrowLeft size={16} />
              Back to Dashboard
            </Link>
          )}
        />

        <div className="account-settings-layout">
          <aside className="account-settings-profile">
            <div className="account-settings-profile__hero">
              <div className="account-settings-avatar" aria-hidden>
                {initials}
              </div>
              <h2 className="account-settings-profile__name">{user?.name}</h2>
              <span className="account-settings-role-badge">
                <Shield size={12} />
                {ROLE_LABELS[user?.role]}
              </span>
            </div>
            <div className="account-settings-profile__body">
              <div className="account-settings-school">
                <Building2 size={16} />
                <div>
                  <strong>School</strong>
                  {school?.name || '—'}
                </div>
              </div>
            </div>
          </aside>

          <div className="account-settings-forms">
            <form onSubmit={handleProfileSave} className="account-settings-panel">
              <div className="account-settings-panel__head">
                <div className="account-settings-panel__icon account-settings-panel__icon--profile">
                  <User size={18} />
                </div>
                <div>
                  <h3>Profile Information</h3>
                  <p>Update your display name and mobile number.</p>
                </div>
              </div>

              <div className="account-settings-panel__body">
                <div className="account-settings-fields">
                  <div className="account-settings-field">
                    <label htmlFor="profile-name">
                      Full Name <span className="required">*</span>
                    </label>
                    <input
                      id="profile-name"
                      name="name"
                      value={profile.name}
                      onChange={(e) => setProfile((p) => ({ ...p, name: e.target.value }))}
                      required
                    />
                  </div>
                  <div className="account-settings-field">
                    <label htmlFor="profile-mobile">Mobile Number</label>
                    <input
                      id="profile-mobile"
                      name="mobile"
                      type="tel"
                      value={profile.mobile}
                      onChange={(e) => setProfile((p) => ({ ...p, mobile: e.target.value }))}
                      placeholder="10-digit mobile"
                    />
                  </div>
                  <div className="account-settings-field account-settings-fields--full">
                    <label htmlFor="profile-email">Email Address</label>
                    <input
                      id="profile-email"
                      name="email"
                      type="email"
                      value={user?.email || ''}
                      disabled
                    />
                    <p className="account-settings-field__hint">
                      Email cannot be changed. Contact your school administrator for updates.
                    </p>
                  </div>
                </div>
              </div>

              <div className="account-settings-panel__actions">
                <button
                  type="submit"
                  disabled={savingProfile}
                  className="account-settings-btn account-settings-btn--primary"
                >
                  <Save size={16} />
                  {savingProfile ? 'Saving…' : 'Save Profile'}
                </button>
              </div>
            </form>

            <form onSubmit={handlePasswordSave} className="account-settings-panel">
              <div className="account-settings-panel__head">
                <div className="account-settings-panel__icon account-settings-panel__icon--security">
                  <KeyRound size={18} />
                </div>
                <div>
                  <h3>Change Password</h3>
                  <p>Use a strong password with at least 6 characters.</p>
                </div>
              </div>

              <div className="account-settings-panel__body">
                <div className="account-settings-fields">
                  <div className="account-settings-field account-settings-fields--full">
                    <PasswordField
                      label="Current Password"
                      name="currentPassword"
                      value={passwords.current}
                      onChange={(e) => setPasswords((p) => ({ ...p, current: e.target.value }))}
                      show={showCurrent}
                      onToggle={() => setShowCurrent((v) => !v)}
                    />
                  </div>
                  <PasswordField
                    label="New Password"
                    name="newPassword"
                    value={passwords.next}
                    onChange={(e) => setPasswords((p) => ({ ...p, next: e.target.value }))}
                    show={showNew}
                    onToggle={() => setShowNew((v) => !v)}
                  />
                  <PasswordField
                    label="Confirm New Password"
                    name="confirmPassword"
                    value={passwords.confirm}
                    onChange={(e) => setPasswords((p) => ({ ...p, confirm: e.target.value }))}
                    show={showConfirm}
                    onToggle={() => setShowConfirm((v) => !v)}
                  />
                </div>
              </div>

              <div className="account-settings-panel__actions">
                <button
                  type="submit"
                  disabled={savingPassword}
                  className="account-settings-btn account-settings-btn--secondary"
                >
                  <KeyRound size={16} />
                  {savingPassword ? 'Updating…' : 'Update Password'}
                </button>
              </div>
            </form>
          </div>
        </div>
      </PageTransition>
    </AppLayout>
  );
}
