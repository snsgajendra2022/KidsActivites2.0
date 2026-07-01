import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Mail, Phone, Shield, User, KeyRound, Building2 } from 'lucide-react';
import AppLayout from '../../components/layout/AppLayout.jsx';
import PageTransition from '../../components/ui/PageTransition.jsx';
import { PageHeader } from '../../components/ui/index.jsx';
import Input from '../../components/ui/Input.jsx';
import { useAuth } from '../../context/AuthContext.jsx';
import { useToast } from '../../context/ToastContext.jsx';
import { ROLE_LABELS, ROLE_DASHBOARD } from '../../constants/roles.js';
import { SCHOOL } from '../../data/mockSchool.js';

export default function Profile() {
  const { user, updateProfile } = useAuth();
  const { toast } = useToast();
  const [saving, setSaving] = useState(false);
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
    setSaving(true);
    await new Promise((r) => setTimeout(r, 400));
    updateProfile({
      name: profile.name.trim(),
      mobile: profile.mobile.trim(),
    });
    toast('Profile updated successfully.', 'success');
    setSaving(false);
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
    setSaving(true);
    await new Promise((r) => setTimeout(r, 500));
    toast('Password updated successfully.', 'success');
    setPasswords({ current: '', next: '', confirm: '' });
    setSaving(false);
  };

  return (
    <AppLayout>
      <PageTransition>
        <PageHeader
          title="Account Settings"
          subtitle="Manage your profile, contact details, and account security."
          actions={(
            <Link to={dashboardPath} className="premium-btn premium-btn-secondary premium-btn-sm">
              Back to Dashboard
            </Link>
          )}
        />

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          {/* Profile summary */}
          <div className="sb-card p-6 lg:col-span-1">
            <div className="flex flex-col items-center text-center">
              <div className="mb-4 flex h-20 w-20 items-center justify-center rounded-2xl bg-[#091426] text-2xl font-bold text-white">
                {initials}
              </div>
              <h2 className="font-display text-lg font-bold text-[#091426]">{user?.name}</h2>
              <p className="mt-1 text-sm text-[#45474c]">{user?.email}</p>
              <span className="mt-3 inline-flex rounded-full bg-[#dce9ff] px-3 py-1 text-xs font-semibold text-[#0058be]">
                {ROLE_LABELS[user?.role]}
              </span>
            </div>

            <div className="mt-6 space-y-3 border-t border-black/5 pt-6">
              <div className="flex items-center gap-3 text-sm text-[#45474c]">
                <Mail size={16} className="shrink-0 text-[#6b7a8c]" />
                <span className="truncate">{user?.email || '—'}</span>
              </div>
              <div className="flex items-center gap-3 text-sm text-[#45474c]">
                <Phone size={16} className="shrink-0 text-[#6b7a8c]" />
                <span>{user?.mobile || '—'}</span>
              </div>
              <div className="flex items-center gap-3 text-sm text-[#45474c]">
                <Shield size={16} className="shrink-0 text-[#6b7a8c]" />
                <span>{ROLE_LABELS[user?.role]}</span>
              </div>
              <div className="flex items-center gap-3 text-sm text-[#45474c]">
                <Building2 size={16} className="shrink-0 text-[#6b7a8c]" />
                <span className="truncate">{SCHOOL.name}</span>
              </div>
            </div>
          </div>

          {/* Forms */}
          <div className="space-y-6 lg:col-span-2">
            <form onSubmit={handleProfileSave} className="sb-card p-6">
              <div className="mb-5 flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#dce9ff] text-[#0058be]">
                  <User size={18} />
                </div>
                <div>
                  <h3 className="font-display text-base font-bold text-[#091426]">Profile Information</h3>
                  <p className="text-sm text-[#45474c]">Update your name and contact number.</p>
                </div>
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <Input
                  label="Full Name"
                  name="name"
                  value={profile.name}
                  onChange={(e) => setProfile((p) => ({ ...p, name: e.target.value }))}
                  required
                  variant="enrollment"
                />
                <Input
                  label="Mobile Number"
                  name="mobile"
                  type="tel"
                  value={profile.mobile}
                  onChange={(e) => setProfile((p) => ({ ...p, mobile: e.target.value }))}
                  variant="enrollment"
                />
                <Input
                  label="Email Address"
                  name="email"
                  type="email"
                  value={user?.email || ''}
                  disabled
                  variant="enrollment"
                  className="sm:col-span-2"
                  helper="Email cannot be changed. Contact school admin for updates."
                />
              </div>

              <div className="mt-6 flex justify-end">
                <button
                  type="submit"
                  disabled={saving}
                  className="premium-btn premium-btn-primary premium-btn-sm"
                >
                  {saving ? 'Saving…' : 'Save Profile'}
                </button>
              </div>
            </form>

            <form onSubmit={handlePasswordSave} className="sb-card p-6">
              <div className="mb-5 flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#fff4e5] text-[#d97706]">
                  <KeyRound size={18} />
                </div>
                <div>
                  <h3 className="font-display text-base font-bold text-[#091426]">Change Password</h3>
                  <p className="text-sm text-[#45474c]">Use a strong password with at least 6 characters.</p>
                </div>
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <Input
                  label="Current Password"
                  name="currentPassword"
                  type="password"
                  value={passwords.current}
                  onChange={(e) => setPasswords((p) => ({ ...p, current: e.target.value }))}
                  variant="enrollment"
                  className="sm:col-span-2"
                />
                <Input
                  label="New Password"
                  name="newPassword"
                  type="password"
                  value={passwords.next}
                  onChange={(e) => setPasswords((p) => ({ ...p, next: e.target.value }))}
                  variant="enrollment"
                />
                <Input
                  label="Confirm New Password"
                  name="confirmPassword"
                  type="password"
                  value={passwords.confirm}
                  onChange={(e) => setPasswords((p) => ({ ...p, confirm: e.target.value }))}
                  variant="enrollment"
                />
              </div>

              <div className="mt-6 flex justify-end">
                <button
                  type="submit"
                  disabled={saving}
                  className="premium-btn premium-btn-secondary premium-btn-sm"
                >
                  {saving ? 'Updating…' : 'Update Password'}
                </button>
              </div>
            </form>
          </div>
        </div>
      </PageTransition>
    </AppLayout>
  );
}
