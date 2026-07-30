import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import {
  ArrowLeft,
  Download,
  FileText,
  HeartPulse,
  History,
  Home,
  Pencil,
  Phone,
  ShieldCheck,
  UserRound,
  Users,
} from 'lucide-react';
import AppLayout from '../../components/layout/AppLayout.jsx';
import PageTransition from '../../components/ui/PageTransition.jsx';
import { EmptyState, LoadingState, PageHeader } from '../../components/ui/index.jsx';
import Button from '../../components/ui/Button.jsx';
import Input from '../../components/ui/Input.jsx';
import Select from '../../components/ui/Select.jsx';
import Textarea from '../../components/ui/Textarea.jsx';
import Modal, { ConfirmModal } from '../../components/ui/Modal.jsx';
import StatusBadge from '../../components/ui/StatusBadge.jsx';
import { usePortalConfig } from '../../context/PortalConfigContext.jsx';
import { useToast } from '../../context/ToastContext.jsx';
import { useAuth } from '../../context/AuthContext.jsx';
import { useTenantPath } from '../../hooks/useTenantPath.js';
import { useClassStudentOptions } from '../../hooks/useClassStudentOptions.js';
import {
  getStudentProfile,
  issueTransferCertificate,
  updateStudentProfile,
} from '../../services/enrollmentService.js';
import { downloadTransferCertificate } from '../../utils/transferCertificate.js';

const EMPTY_FORM = {
  admissionNumber: '',
  fullName: '',
  dateOfBirth: '',
  gender: '',
  classId: '',
  section: '',
  rollNumber: '',
  house: '',
  bloodGroup: '',
  previousSchool: '',
  previousClass: '',
  medicalConditions: '',
  allergies: '',
  specialNeeds: '',
  medications: '',
  doctorName: '',
  doctorPhone: '',
  emergencyName: '',
  emergencyRelation: '',
  emergencyPhone: '',
  changeNote: '',
};

function formatLabel(value = '') {
  return String(value)
    .replace(/([A-Z])/g, ' $1')
    .replace(/[_-]+/g, ' ')
    .replace(/^./, (character) => character.toUpperCase())
    .trim();
}

function formatDate(value) {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

function initials(name = '') {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return 'S';
  return parts.slice(0, 2).map((part) => part[0]).join('').toUpperCase();
}

function Detail({ label, value }) {
  return (
    <div className="min-w-0">
      <dt className="text-[11px] font-bold uppercase tracking-wide text-[#6a7282]">{label}</dt>
      <dd className="mt-1 break-words text-sm font-semibold text-[#0b1c30]">{value || '—'}</dd>
    </div>
  );
}

function Section({ icon: Icon, title, children }) {
  return (
    <section className="rounded-xl border border-[#e5e8ef] bg-white">
      <div className="flex items-center gap-2 border-b border-[#edf0f5] px-5 py-4">
        <Icon size={18} className="text-[#0058be]" aria-hidden />
        <h2 className="text-base font-bold text-[#0b1c30]">{title}</h2>
      </div>
      <div className="p-5">{children}</div>
    </section>
  );
}

function profileToForm(profile) {
  const emergency = profile?.emergencyContacts?.[0] || {};
  return {
    ...EMPTY_FORM,
    admissionNumber: profile?.admissionNumber || '',
    fullName: profile?.fullName || '',
    dateOfBirth: profile?.dateOfBirth || '',
    gender: profile?.gender || '',
    classId: profile?.classId || profile?.class?.id || '',
    section: profile?.section || '',
    rollNumber: profile?.rollNumber || '',
    house: profile?.house || '',
    bloodGroup: profile?.bloodGroup || '',
    previousSchool: profile?.previousSchool || '',
    previousClass: profile?.previousClass || '',
    medicalConditions: profile?.medical?.medicalConditions || '',
    allergies: profile?.medical?.allergies || '',
    specialNeeds: profile?.medical?.specialNeeds || '',
    medications: profile?.medical?.medications || '',
    doctorName: profile?.medical?.doctorName || '',
    doctorPhone: profile?.medical?.doctorPhone || '',
    emergencyName: emergency.name || '',
    emergencyRelation: emergency.relation || '',
    emergencyPhone: emergency.phone || '',
  };
}

export default function StudentProfile() {
  const { studentId } = useParams();
  const { tenantPath } = useTenantPath();
  const { school, portalName } = usePortalConfig();
  const { toast } = useToast();
  const { user } = useAuth();
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [editOpen, setEditOpen] = useState(false);
  const [transferOpen, setTransferOpen] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const {
    classOptions,
    classesLoading,
    classesError,
  } = useClassStudentOptions(user, form.classId, { loadStudents: false });

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      setProfile(await getStudentProfile(studentId));
    } catch (err) {
      setError(err?.message || 'Unable to load student profile.');
    } finally {
      setLoading(false);
    }
  }, [studentId]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- fetch profile on route change
    load();
  }, [load]);

  const documents = useMemo(
    () => Object.entries(profile?.documents || {}).map(([key, document]) => ({
      key,
      ...document,
    })),
    [profile?.documents],
  );

  const openEdit = () => {
    setForm(profileToForm(profile));
    setEditOpen(true);
  };

  const setField = (field, value) => {
    setForm((current) => ({ ...current, [field]: value }));
  };

  const handleSave = async () => {
    if (!form.fullName.trim() || !form.admissionNumber.trim()) {
      toast('Student name and admission number are required.', 'warning');
      return;
    }
    setSaving(true);
    try {
      const updated = await updateStudentProfile(studentId, {
        admissionNumber: form.admissionNumber.trim(),
        fullName: form.fullName.trim(),
        dateOfBirth: form.dateOfBirth,
        gender: form.gender,
        classId: form.classId || null,
        section: form.section.trim(),
        rollNumber: form.rollNumber.trim(),
        house: form.house.trim(),
        bloodGroup: form.bloodGroup.trim(),
        previousSchool: form.previousSchool.trim(),
        previousClass: form.previousClass.trim(),
        emergencyContacts: form.emergencyName || form.emergencyPhone
          ? [{
            name: form.emergencyName.trim(),
            relation: form.emergencyRelation.trim(),
            phone: form.emergencyPhone.trim(),
          }]
          : [],
        medical: {
          medicalConditions: form.medicalConditions.trim(),
          allergies: form.allergies.trim(),
          specialNeeds: form.specialNeeds.trim(),
          medications: form.medications.trim(),
          doctorName: form.doctorName.trim(),
          doctorPhone: form.doctorPhone.trim(),
        },
        changeNote: form.changeNote.trim(),
      });
      setProfile(updated);
      setEditOpen(false);
      toast('Student profile updated.', 'success');
    } catch (err) {
      toast(err?.message || 'Unable to update student profile.', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleIssueTransferCertificate = async () => {
    setSaving(true);
    try {
      const updated = await issueTransferCertificate(studentId, {
        lastClass: [profile.classApplying, profile.section].filter(Boolean).join(' - '),
      });
      setProfile(updated);
      setTransferOpen(false);
      toast('Transfer certificate issued.', 'success');
      downloadTransferCertificate(updated, { school, portalName });
    } catch (err) {
      toast(err?.message || 'Unable to issue transfer certificate.', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleDownloadTransferCertificate = () => {
    try {
      downloadTransferCertificate(profile, { school, portalName });
      toast('Transfer certificate downloaded.', 'success');
    } catch (err) {
      toast(err?.message || 'Transfer certificate is unavailable.', 'error');
    }
  };

  if (loading) {
    return <AppLayout><LoadingState message="Loading student profile…" /></AppLayout>;
  }

  if (error || !profile) {
    return (
      <AppLayout>
        <EmptyState
          icon={UserRound}
          title="Could Not Load Student"
          description={error || 'Student not found.'}
          action={<Button onClick={load}>Try Again</Button>}
        />
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <PageTransition>
        <Link
          to={tenantPath('/admin/students')}
          className="mb-4 inline-flex items-center gap-2 text-sm font-semibold text-[#0058be] hover:underline"
        >
          <ArrowLeft size={16} aria-hidden />
          Back to Students
        </Link>

        <PageHeader
          title={profile.fullName || 'Student Profile'}
          subtitle={`Admission ${profile.admissionNumber || '—'} · Complete student record`}
          actions={(
            <div className="flex flex-wrap gap-2">
              <Button variant="outline" onClick={openEdit}>
                <Pencil size={15} /> Edit Profile
              </Button>
              {profile.transferCertificate ? (
                <Button variant="secondary" onClick={handleDownloadTransferCertificate}>
                  <Download size={15} /> Download TC
                </Button>
              ) : (
                <Button variant="secondary" onClick={() => setTransferOpen(true)}>
                  <FileText size={15} /> Generate TC
                </Button>
              )}
            </div>
          )}
        />

        <section className="mb-5 flex flex-col gap-5 rounded-2xl border border-[#dfe4ed] bg-white p-5 sm:flex-row sm:items-center">
          {profile.photoUrl ? (
            <img
              src={profile.photoUrl}
              alt={profile.fullName}
              className="h-24 w-24 rounded-2xl border border-[#e5e8ef] object-cover"
            />
          ) : (
            <div className="grid h-24 w-24 shrink-0 place-items-center rounded-2xl bg-[#eaf2ff] text-2xl font-black text-[#0058be]">
              {initials(profile.fullName)}
            </div>
          )}
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-xl font-extrabold text-[#0b1c30]">{profile.fullName}</h2>
              <span className={`rounded-full px-2.5 py-1 text-xs font-bold ${
                profile.lifecycleStatus === 'transferred'
                  ? 'bg-amber-100 text-amber-800'
                  : 'bg-emerald-100 text-emerald-800'
              }`}>
                {formatLabel(profile.lifecycleStatus)}
              </span>
            </div>
            <p className="mt-1 text-sm text-[#667085]">
              {[profile.classApplying?.toUpperCase(), profile.section && `Section ${profile.section}`, profile.house].filter(Boolean).join(' · ') || 'Class assignment pending'}
            </p>
            <div className="mt-4 grid grid-cols-2 gap-4 sm:grid-cols-4">
              <Detail label="Roll Number" value={profile.rollNumber} />
              <Detail label="Date of Birth" value={formatDate(profile.dateOfBirth)} />
              <Detail label="Gender" value={formatLabel(profile.gender)} />
              <Detail label="Blood Group" value={profile.bloodGroup} />
            </div>
          </div>
        </section>

        <div className="grid gap-5 xl:grid-cols-2">
          <Section icon={Home} title="Academic & House">
            <dl className="grid grid-cols-2 gap-5">
              <Detail label="Class" value={profile.classApplying?.toUpperCase()} />
              <Detail label="Section" value={profile.section} />
              <Detail label="House / Group" value={profile.house} />
              <Detail label="Previous Class" value={profile.previousClass} />
              <div className="col-span-2">
                <Detail label="Previous School" value={profile.previousSchool} />
              </div>
            </dl>
          </Section>

          <Section icon={Users} title="Parents & Guardians">
            {profile.guardians?.length ? (
              <div className="space-y-4">
                {profile.guardians.map((guardian, index) => (
                  <div key={`${guardian.relation}-${index}`} className="rounded-lg bg-[#f7f9fc] p-4">
                    <p className="text-xs font-bold uppercase tracking-wide text-[#0058be]">{guardian.relation || 'Guardian'}</p>
                    <p className="mt-1 font-bold text-[#0b1c30]">{guardian.name || '—'}</p>
                    <p className="mt-1 text-sm text-[#667085]">{[guardian.phone, guardian.email].filter(Boolean).join(' · ') || 'No contact details'}</p>
                  </div>
                ))}
              </div>
            ) : <p className="text-sm text-[#667085]">No guardian details recorded.</p>}
          </Section>

          <Section icon={HeartPulse} title="Medical Information">
            <dl className="grid grid-cols-2 gap-5">
              <Detail label="Conditions" value={profile.medical?.medicalConditions} />
              <Detail label="Allergies" value={profile.medical?.allergies} />
              <Detail label="Special Needs" value={profile.medical?.specialNeeds} />
              <Detail label="Medications" value={profile.medical?.medications} />
              <Detail label="Doctor" value={profile.medical?.doctorName} />
              <Detail label="Doctor Phone" value={profile.medical?.doctorPhone} />
            </dl>
          </Section>

          <Section icon={Phone} title="Emergency Contacts">
            {profile.emergencyContacts?.length ? (
              <dl className="grid grid-cols-1 gap-5 sm:grid-cols-3">
                <Detail label="Name" value={profile.emergencyContacts[0].name} />
                <Detail label="Relation" value={profile.emergencyContacts[0].relation} />
                <Detail label="Phone" value={profile.emergencyContacts[0].phone} />
              </dl>
            ) : <p className="text-sm text-[#667085]">No emergency contact recorded.</p>}
          </Section>

          <Section icon={ShieldCheck} title="Documents">
            {documents.length ? (
              <div className="space-y-2">
                {documents.map((document) => (
                  <div key={document.key} className="flex items-center justify-between gap-3 rounded-lg border border-[#edf0f5] px-4 py-3">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold text-[#0b1c30]">{formatLabel(document.key)}</p>
                      <p className="truncate text-xs text-[#667085]">{document.name || 'Uploaded document'}</p>
                    </div>
                    <StatusBadge status={document.status || 'documents_pending'} />
                  </div>
                ))}
              </div>
            ) : <p className="text-sm text-[#667085]">No documents uploaded.</p>}
            <Link
              to={tenantPath(`/admin/applications/${profile.applicationId}`)}
              className="mt-4 inline-flex text-sm font-semibold text-[#0058be] hover:underline"
            >
              Review and manage admission documents
            </Link>
          </Section>

          <Section icon={History} title="Student History">
            {profile.history?.length ? (
              <div className="space-y-4">
                {profile.history.slice(0, 12).map((item, index) => (
                  <div key={`${item.date}-${index}`} className="relative border-l-2 border-[#dce5f2] pl-4">
                    <span className="absolute -left-[5px] top-1 h-2 w-2 rounded-full bg-[#0058be]" />
                    <p className="text-sm font-bold text-[#0b1c30]">{formatLabel(item.title)}</p>
                    {item.note && <p className="mt-1 text-xs text-[#667085]">{item.note}</p>}
                    <p className="mt-1 text-[11px] font-semibold text-[#8a93a3]">{formatDate(item.date)}</p>
                  </div>
                ))}
              </div>
            ) : <p className="text-sm text-[#667085]">No student history recorded.</p>}
          </Section>
        </div>

        {profile.transferCertificate && (
          <section className="mt-5 rounded-xl border border-amber-200 bg-amber-50 p-5">
            <h2 className="font-bold text-amber-950">Transfer Certificate Issued</h2>
            <p className="mt-1 text-sm text-amber-800">
              {profile.transferCertificate.certificateNumber} · {formatDate(profile.transferCertificate.issueDate)}
            </p>
            <Button className="mt-4" variant="outline" size="sm" onClick={handleDownloadTransferCertificate}>
              <Download size={14} /> Download Certificate
            </Button>
          </section>
        )}

        <Modal
          open={editOpen}
          onClose={() => setEditOpen(false)}
          title="Edit Student Profile"
          size="xl"
          footer={(
            <>
              <Button variant="secondary" onClick={() => setEditOpen(false)}>Cancel</Button>
              <Button loading={saving} onClick={handleSave}>Save Profile</Button>
            </>
          )}
        >
          <div className="grid gap-4 md:grid-cols-2">
            <Input label="Admission Number" required value={form.admissionNumber} onChange={(event) => setField('admissionNumber', event.target.value)} />
            <Input label="Student Name" required value={form.fullName} onChange={(event) => setField('fullName', event.target.value)} />
            <Input label="Date of Birth" type="date" value={form.dateOfBirth} onChange={(event) => setField('dateOfBirth', event.target.value)} />
            <Select
              label="Gender"
              placeholder="Select gender"
              value={form.gender}
              onChange={(event) => setField('gender', event.target.value)}
              options={[
                { value: 'male', label: 'Male' },
                { value: 'female', label: 'Female' },
                { value: 'other', label: 'Other' },
              ]}
            />
            <div>
              <Select
                label="Class"
                value={form.classId}
                onChange={(event) => setField('classId', event.target.value)}
                options={classOptions}
                placeholder={classesLoading ? 'Loading classes…' : 'Select class'}
                disabled={classesLoading}
              />
              {classesError && <p className="mt-1 text-xs text-[#b42318]">{classesError}</p>}
            </div>
            <Input label="Section" value={form.section} onChange={(event) => setField('section', event.target.value)} />
            <Input label="Roll Number" value={form.rollNumber} onChange={(event) => setField('rollNumber', event.target.value)} />
            <Input label="House / Group" value={form.house} onChange={(event) => setField('house', event.target.value)} />
            <Input label="Blood Group" value={form.bloodGroup} onChange={(event) => setField('bloodGroup', event.target.value)} />
            <Input label="Previous Class" value={form.previousClass} onChange={(event) => setField('previousClass', event.target.value)} />
            <Input className="md:col-span-2" label="Previous School" value={form.previousSchool} onChange={(event) => setField('previousSchool', event.target.value)} />
            <Textarea label="Medical Conditions" value={form.medicalConditions} onChange={(event) => setField('medicalConditions', event.target.value)} />
            <Textarea label="Allergies" value={form.allergies} onChange={(event) => setField('allergies', event.target.value)} />
            <Textarea label="Special Needs" value={form.specialNeeds} onChange={(event) => setField('specialNeeds', event.target.value)} />
            <Textarea label="Medications" value={form.medications} onChange={(event) => setField('medications', event.target.value)} />
            <Input label="Doctor Name" value={form.doctorName} onChange={(event) => setField('doctorName', event.target.value)} />
            <Input label="Doctor Phone" value={form.doctorPhone} onChange={(event) => setField('doctorPhone', event.target.value)} />
            <Input label="Emergency Contact" value={form.emergencyName} onChange={(event) => setField('emergencyName', event.target.value)} />
            <Input label="Relation" value={form.emergencyRelation} onChange={(event) => setField('emergencyRelation', event.target.value)} />
            <Input label="Emergency Phone" value={form.emergencyPhone} onChange={(event) => setField('emergencyPhone', event.target.value)} />
            <Input label="Change Note" placeholder="Why was this profile updated?" value={form.changeNote} onChange={(event) => setField('changeNote', event.target.value)} />
          </div>
        </Modal>

        <ConfirmModal
          open={transferOpen}
          onClose={() => setTransferOpen(false)}
          onConfirm={handleIssueTransferCertificate}
          title="Issue Transfer Certificate?"
          message="This generates a numbered certificate, marks the student as transferred, and adds an immutable history entry."
          confirmText="Issue Certificate"
          confirmVariant="primary"
          loading={saving}
        />
      </PageTransition>
    </AppLayout>
  );
}
