import { useState } from 'react';
import { Link } from 'react-router-dom';
import { SCHOOL, CLASSES, GENDERS, BLOOD_GROUPS } from '../../data/mockSchool.js';
import { getEmptyForm, saveDraft, submitApplication } from '../../services/enrollmentService.js';
import { useToast } from '../../context/ToastContext.jsx';
import Input from '../../components/ui/Input.jsx';
import Select from '../../components/ui/Select.jsx';
import Textarea from '../../components/ui/Textarea.jsx';
import FileUpload from '../../components/upload/SmartFileUpload.jsx';
import { validateEnrollmentStep } from '../../schemas/enrollmentSchema.js';
import { useUploadStore } from '../../store/uploadStore.js';
import { SignaturePad } from '../../components/ui/index.jsx';
import EnrollmentStepper from '../../components/enrollment/EnrollmentStepper.jsx';
import PublicHeader from '../../components/layout/PublicHeader.jsx';
import NetworkBanner from '../../components/layout/NetworkBanner.jsx';
import { ConfirmModal } from '../../components/ui/Modal.jsx';
import StatusBadge from '../../components/ui/StatusBadge.jsx';

const DOC_FIELDS = [
  { key: 'birthCertificate', label: 'Birth Certificate', category: 'document', required: true },
  { key: 'studentPhoto', label: 'Student Photo', category: 'photo', required: true },
  { key: 'parentIdProof', label: 'Parent ID Proof', category: 'document', required: true },
  { key: 'addressProof', label: 'Address Proof', category: 'document', required: false },
  { key: 'reportCard', label: 'Previous Report Card', category: 'document', required: false },
  { key: 'transferCertificate', label: 'Transfer Certificate', category: 'document', required: false },
];

const STEP_TITLES = [
  'Student Details',
  'Parent / Guardian Details',
  'Address Details',
  'Academic Details',
  'Medical & Emergency',
  'Required Documents',
  'Declaration & Signature',
  'Review & Submit',
];

const BENTO_CARDS = [
  {
    icon: 'security',
    color: 'bg-blue-100 text-[#0058be]',
    title: 'Encrypted Data',
    desc: 'All enrollment data is processed with 256-bit institutional grade encryption.',
  },
  {
    icon: 'description',
    color: 'bg-green-100 text-green-700',
    title: 'Doc Auto-Save',
    desc: 'Progress is saved automatically as you navigate through the multi-step form.',
  },
  {
    icon: 'support_agent',
    color: 'bg-amber-100 text-amber-700',
    title: 'Need Help?',
    desc: 'Our admissions desk is available Mon–Fri, 8 AM to 4 PM for guided registration.',
  },
];

const fieldVariant = 'enrollment';
const formGrid = 'grid grid-cols-1 gap-8 md:grid-cols-2';

export default function Enrollment() {
  const [step, setStep] = useState(1);
  const [form, setForm] = useState(getEmptyForm);
  const [draftId, setDraftId] = useState(null);
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const [showSubmitModal, setShowSubmitModal] = useState(false);
  const [submitted, setSubmitted] = useState(null);
  const { toast } = useToast();

  const update = (section, field, value) => {
    setForm((prev) => ({ ...prev, [section]: { ...prev[section], [field]: value } }));
    setErrors((prev) => ({ ...prev, [`${section}.${field}`]: '' }));
  };

  const updateDoc = (key, data) => {
    setForm((prev) => ({
      ...prev,
      documents: { ...prev.documents, [key]: data ? { ...data, status: 'uploaded' } : null },
    }));
  };

  const validateStep = () => {
    const { success, errors: zodErrors } = validateEnrollmentStep(step, form);
    const e = { ...zodErrors };

    if (step === 6) {
      DOC_FIELDS.filter((d) => d.required).forEach(({ key, label }) => {
        if (!form.documents[key]) e[`documents.${key}`] = `Please upload ${label.toLowerCase()}.`;
      });
      if (useUploadStore.getState().hasIncompleteUploads()) {
        toast('Some files are still uploading. Please wait before submitting.', 'warning');
        return false;
      }
    }

    setErrors(e);
    if (!success || Object.keys(e).length > 0) {
      if (Object.keys(e).length > 0) toast('Please complete all required fields before submitting.', 'warning');
      return false;
    }
    return true;
  };

  const handleSaveDraft = async () => {
    setLoading(true);
    try {
      const saved = await saveDraft(form, draftId);
      setDraftId(saved.id);
      toast('Application saved successfully.', 'success');
    } catch {
      toast('Unable to save draft. Please try again.', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async () => {
    setLoading(true);
    try {
      const result = await submitApplication(form, draftId);
      setSubmitted(result);
      setShowSubmitModal(false);
      toast('Enrollment form submitted successfully.', 'success');
    } catch {
      toast('Please complete all required fields before submitting.', 'error');
    } finally {
      setLoading(false);
    }
  };

  const next = () => { if (validateStep()) setStep((s) => Math.min(s + 1, 8)); };
  const back = () => setStep((s) => Math.max(s - 1, 1));

  if (submitted) {
    return (
      <div className="flex min-h-screen flex-col bg-[#f8f9ff] text-[#0b1c30]">
        <PublicHeader />
        <main className="flex flex-1 items-center justify-center px-4 py-12">
          <div className="w-full max-w-lg rounded-xl border border-slate-200/80 bg-white/95 p-8 text-center shadow-sm backdrop-blur-md">
            <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-full bg-green-100 text-2xl text-green-700">
              <span className="material-symbols-outlined text-[32px]">check_circle</span>
            </div>
            <h1 className="font-display mb-2 text-2xl font-bold text-[#0b1c30]">Application Submitted</h1>
            <p className="mb-6 text-sm text-[#45474c]">
              Your enrollment application has been sent to the school admin for verification.
            </p>
            <div className="mb-6 rounded-lg border border-[#c5c6cd]/50 bg-[#eff4ff] p-4 text-left text-sm">
              <div className="mb-2"><strong>Application Number:</strong> {submitted.applicationNo}</div>
              <div className="mb-2"><strong>Student:</strong> {submitted.student?.fullName}</div>
              <StatusBadge variant="success">{submitted.status}</StatusBadge>
            </div>
            <div className="flex flex-wrap justify-center gap-3">
              <Link
                to="/"
                className="inline-flex items-center justify-center rounded-lg border border-[#c5c6cd] px-6 py-3 text-sm font-semibold text-[#091426] transition-all hover:bg-[#eff4ff]"
              >
                Back to Home
              </Link>
              <Link
                to="/login"
                className="inline-flex items-center justify-center rounded-lg bg-[#091426] px-6 py-3 text-sm font-semibold text-white shadow-md transition-all hover:bg-[#1e293b]"
              >
                Login to Track Status
              </Link>
            </div>
          </div>
        </main>
        <EnrollmentFooter />
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col bg-[#f8f9ff] font-[Inter,system-ui,sans-serif] text-[#0b1c30]">
      <PublicHeader />
      <NetworkBanner />

      <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-8 md:px-10">
        {/* Page header */}
        <div className="mb-8 flex flex-col justify-between gap-4 md:flex-row md:items-end">
          <div>
            <h1 className="font-display mb-1 text-[28px] font-bold leading-tight text-[#0b1c30] md:text-[32px]">
              Student Enrollment Form
            </h1>
            <p className="text-base text-[#45474c]">
              {SCHOOL.name} • Academic Year {SCHOOL.academicYear}
            </p>
          </div>
          <button
            type="button"
            onClick={handleSaveDraft}
            disabled={loading}
            className="inline-flex items-center justify-center gap-2 rounded-lg border border-[#c5c6cd] px-6 py-2.5 text-sm font-semibold text-[#091426] transition-all hover:bg-[#eff4ff] disabled:opacity-60"
          >
            <span className="material-symbols-outlined text-[20px]">save</span>
            Save Draft
          </button>
        </div>

        {/* Main card */}
        <div className="rounded-xl border border-slate-200/80 bg-white/95 p-6 shadow-sm backdrop-blur-md md:p-10">
          <EnrollmentStepper currentStep={step} />

          <div className="mb-8">
            <h2 className="font-display text-xl font-semibold text-[#0b1c30]">{STEP_TITLES[step - 1]}</h2>
            <p className="mt-1 text-sm text-[#45474c]">
              Please fill in all required details carefully. Fields marked with{' '}
              <span className="text-[#ba1a1a]">*</span> are mandatory.
            </p>
          </div>

          {step === 1 && (
            <div className={formGrid}>
              <Input variant={fieldVariant} label="Student Full Name" required value={form.student.fullName} onChange={(e) => update('student', 'fullName', e.target.value)} error={errors['student.fullName']} helper="Name should match the birth certificate." placeholder="Enter student full name" />
              <Input variant={fieldVariant} label="Date of Birth" required type="date" value={form.student.dateOfBirth} onChange={(e) => update('student', 'dateOfBirth', e.target.value)} error={errors['student.dateOfBirth']} />
              <Select variant={fieldVariant} label="Gender" required options={GENDERS} placeholder="Select gender" value={form.student.gender} onChange={(e) => update('student', 'gender', e.target.value)} error={errors['student.gender']} />
              <Select variant={fieldVariant} label="Blood Group" options={BLOOD_GROUPS} placeholder="Select blood group" value={form.student.bloodGroup} onChange={(e) => update('student', 'bloodGroup', e.target.value)} />
              <Input variant={fieldVariant} label="Nationality" value={form.student.nationality} onChange={(e) => update('student', 'nationality', e.target.value)} />
              <Select variant={fieldVariant} label="Class Applying For" required options={CLASSES} placeholder="Select class" value={form.student.classApplying} onChange={(e) => update('student', 'classApplying', e.target.value)} error={errors['student.classApplying']} />
              <Input variant={fieldVariant} label="Previous School Name" value={form.student.previousSchool} onChange={(e) => update('student', 'previousSchool', e.target.value)} placeholder="Enter previous school name" />
              <Input variant={fieldVariant} label="Aadhaar / ID Number" value={form.student.aadhaar} onChange={(e) => update('student', 'aadhaar', e.target.value)} placeholder="Optional" />
            </div>
          )}

          {step === 2 && (
            <div className={formGrid}>
              <Input variant={fieldVariant} label="Father Name" required value={form.parent.fatherName} onChange={(e) => update('parent', 'fatherName', e.target.value)} error={errors['parent.fatherName']} />
              <Input variant={fieldVariant} label="Father Mobile" required value={form.parent.fatherMobile} onChange={(e) => update('parent', 'fatherMobile', e.target.value)} error={errors['parent.fatherMobile']} />
              <Input variant={fieldVariant} label="Father Email" type="email" value={form.parent.fatherEmail} onChange={(e) => update('parent', 'fatherEmail', e.target.value)} />
              <Input variant={fieldVariant} label="Father Occupation" value={form.parent.fatherOccupation} onChange={(e) => update('parent', 'fatherOccupation', e.target.value)} />
              <Input variant={fieldVariant} label="Mother Name" required value={form.parent.motherName} onChange={(e) => update('parent', 'motherName', e.target.value)} error={errors['parent.motherName']} />
              <Input variant={fieldVariant} label="Mother Mobile" value={form.parent.motherMobile} onChange={(e) => update('parent', 'motherMobile', e.target.value)} />
              <Input variant={fieldVariant} label="Mother Email" type="email" value={form.parent.motherEmail} onChange={(e) => update('parent', 'motherEmail', e.target.value)} />
              <Input variant={fieldVariant} label="Mother Occupation" value={form.parent.motherOccupation} onChange={(e) => update('parent', 'motherOccupation', e.target.value)} />
              <Input variant={fieldVariant} label="Guardian Name" value={form.parent.guardianName} onChange={(e) => update('parent', 'guardianName', e.target.value)} placeholder="If applicable" />
              <Input variant={fieldVariant} label="Alternate Contact Number" value={form.parent.alternateContact} onChange={(e) => update('parent', 'alternateContact', e.target.value)} />
            </div>
          )}

          {step === 3 && (
            <div className={formGrid}>
              <Textarea variant={fieldVariant} className="full" label="Current Address" required value={form.address.currentAddress} onChange={(e) => update('address', 'currentAddress', e.target.value)} error={errors['address.currentAddress']} />
              <div className="md:col-span-2">
                <label className="flex cursor-pointer items-center gap-3 rounded-lg border border-[#c5c6cd]/50 bg-[#eff4ff]/50 px-4 py-3 text-sm text-[#45474c]">
                  <input
                    type="checkbox"
                    className="h-4 w-4 rounded border-[#c5c6cd] text-[#0058be] focus:ring-[#0058be]/20"
                    checked={form.address.sameAsCurrent}
                    onChange={(e) => {
                      update('address', 'sameAsCurrent', e.target.checked);
                      if (e.target.checked) update('address', 'permanentAddress', form.address.currentAddress);
                    }}
                  />
                  Permanent address same as current address
                </label>
              </div>
              <Textarea variant={fieldVariant} className="full" label="Permanent Address" value={form.address.permanentAddress} onChange={(e) => update('address', 'permanentAddress', e.target.value)} />
              <Input variant={fieldVariant} label="City" required value={form.address.city} onChange={(e) => update('address', 'city', e.target.value)} error={errors['address.city']} />
              <Input variant={fieldVariant} label="State" value={form.address.state} onChange={(e) => update('address', 'state', e.target.value)} />
              <Input variant={fieldVariant} label="PIN Code" required value={form.address.pinCode} onChange={(e) => update('address', 'pinCode', e.target.value)} error={errors['address.pinCode']} />
              <Input variant={fieldVariant} label="Country" value={form.address.country} onChange={(e) => update('address', 'country', e.target.value)} />
            </div>
          )}

          {step === 4 && (
            <div className={formGrid}>
              <Input variant={fieldVariant} label="Previous Class" value={form.academic.previousClass} onChange={(e) => update('academic', 'previousClass', e.target.value)} />
              <Input variant={fieldVariant} label="Previous School" value={form.academic.previousSchool} onChange={(e) => update('academic', 'previousSchool', e.target.value)} />
              <Input variant={fieldVariant} label="Previous Board" value={form.academic.previousBoard} onChange={(e) => update('academic', 'previousBoard', e.target.value)} placeholder="e.g. CBSE, ICSE" />
              <Textarea variant={fieldVariant} className="full" label="Achievements" value={form.academic.achievements} onChange={(e) => update('academic', 'achievements', e.target.value)} placeholder="Any notable achievements" />
              <Textarea variant={fieldVariant} className="full" label="Reason for School Change" value={form.academic.reasonForChange} onChange={(e) => update('academic', 'reasonForChange', e.target.value)} />
            </div>
          )}

          {step === 5 && (
            <div className={formGrid}>
              <Textarea variant={fieldVariant} className="full" label="Medical Conditions" value={form.medical.medicalConditions} onChange={(e) => update('medical', 'medicalConditions', e.target.value)} placeholder="Enter none if not applicable" />
              <Textarea variant={fieldVariant} className="full" label="Allergies" value={form.medical.allergies} onChange={(e) => update('medical', 'allergies', e.target.value)} placeholder="Enter none if not applicable" />
              <Textarea variant={fieldVariant} className="full" label="Special Needs" value={form.medical.specialNeeds} onChange={(e) => update('medical', 'specialNeeds', e.target.value)} />
              <Input variant={fieldVariant} label="Emergency Contact Name" value={form.medical.emergencyContactName} onChange={(e) => update('medical', 'emergencyContactName', e.target.value)} />
              <Input variant={fieldVariant} label="Emergency Contact Number" value={form.medical.emergencyContactNumber} onChange={(e) => update('medical', 'emergencyContactNumber', e.target.value)} />
            </div>
          )}

          {step === 6 && (
            <div className="grid grid-cols-1 gap-6">
              {DOC_FIELDS.map(({ key, label, category, required }) => (
                <FileUpload
                  key={key}
                  fieldKey={key}
                  label={label}
                  category={category}
                  required={required}
                  value={form.documents[key]}
                  onChange={(data) => updateDoc(key, data)}
                  error={errors[`documents.${key}`]}
                />
              ))}
            </div>
          )}

          {step === 7 && (
            <div className="space-y-6">
              <div className="space-y-3">
                {[
                  { key: 'accuracyConfirmed', text: 'I confirm that the information provided in this application is true and accurate to the best of my knowledge.' },
                  { key: 'communicationConsent', text: 'I consent to receive school communication via email, SMS, and in-app notifications.' },
                  { key: 'mediaConsent', text: 'I consent to my child being photographed for classroom activities and shared with parents via the school platform.' },
                ].map(({ key, text }) => (
                  <label
                    key={key}
                    className="flex cursor-pointer items-start gap-3 rounded-lg border border-[#c5c6cd]/50 bg-[#eff4ff]/30 px-4 py-3 text-sm text-[#45474c]"
                  >
                    <input
                      type="checkbox"
                      className="mt-0.5 h-4 w-4 rounded border-[#c5c6cd] text-[#0058be]"
                      checked={form.declaration[key]}
                      onChange={(e) => update('declaration', key, e.target.checked)}
                    />
                    {text}
                  </label>
                ))}
              </div>
              <div className="space-y-2">
                <label className="block text-sm font-semibold text-[#0b1c30]">
                  Digital Signature <span className="text-[#ba1a1a]">*</span>
                </label>
                <div className="overflow-hidden rounded-lg border border-[#c5c6cd] bg-[#f8f9ff]">
                  <SignaturePad value={form.declaration.signature} onChange={(sig) => update('declaration', 'signature', sig)} />
                </div>
                {errors.signature && <p className="text-xs font-medium text-rose-600">{errors.signature}</p>}
              </div>
              <Input variant={fieldVariant} label="Signature Date" type="date" value={form.declaration.signatureDate} onChange={(e) => update('declaration', 'signatureDate', e.target.value)} className="max-w-xs" />
              {errors.declaration && <p className="text-xs font-medium text-rose-600">{errors.declaration}</p>}
            </div>
          )}

          {step === 8 && (
            <div className="space-y-6">
              {['student', 'parent', 'address', 'academic', 'medical'].map((section) => (
                <div key={section} className="rounded-lg border border-[#c5c6cd]/50 bg-[#eff4ff]/30 p-5">
                  <h3 className="mb-4 font-display text-base font-semibold capitalize text-[#091426]">
                    {section} Details
                  </h3>
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    {Object.entries(form[section] || {})
                      .filter(([, v]) => v && typeof v !== 'object')
                      .map(([k, v]) => (
                        <div key={k}>
                          <p className="text-xs font-medium uppercase tracking-wide text-[#45474c]/70">
                            {k.replace(/([A-Z])/g, ' $1').trim()}
                          </p>
                          <p className="mt-0.5 text-sm font-medium text-[#0b1c30]">{String(v)}</p>
                        </div>
                      ))}
                  </div>
                </div>
              ))}
              <div className="rounded-lg border border-[#c5c6cd]/50 bg-[#eff4ff]/30 p-5">
                <h3 className="mb-4 font-display text-base font-semibold text-[#091426]">Documents</h3>
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  {Object.entries(form.documents)
                    .filter(([, v]) => v)
                    .map(([k, v]) => (
                      <div key={k}>
                        <p className="text-xs font-medium uppercase tracking-wide text-[#45474c]/70">{k}</p>
                        <p className="mt-0.5 text-sm font-medium text-[#0b1c30]">{v.name}</p>
                      </div>
                    ))}
                </div>
              </div>
            </div>
          )}

          {/* Card footer actions */}
          <div className="mt-10 flex flex-col items-center justify-between gap-4 border-t border-[#c5c6cd]/60 pt-8 md:flex-row">
            <div className="flex w-full flex-wrap items-center gap-3 md:w-auto">
              {step > 1 && (
                <button
                  type="button"
                  onClick={back}
                  className="inline-flex w-full items-center justify-center gap-2 rounded-lg border border-[#c5c6cd] px-6 py-3 text-sm font-semibold text-[#091426] transition-all hover:bg-[#eff4ff] md:w-auto"
                >
                  <span className="material-symbols-outlined text-[20px]">arrow_back</span>
                  Back
                </button>
              )}
              <button
                type="button"
                onClick={handleSaveDraft}
                disabled={loading}
                className="inline-flex w-full items-center justify-center gap-2 rounded-lg border border-[#c5c6cd] px-6 py-3 text-sm font-semibold text-[#091426] transition-all hover:bg-[#eff4ff] disabled:opacity-60 md:w-auto"
              >
                <span className="material-symbols-outlined text-[20px]">drafts</span>
                Save Draft
              </button>
            </div>

            {step < 8 ? (
              <button
                type="button"
                onClick={next}
                className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-[#091426] px-10 py-3 text-sm font-semibold text-white shadow-md transition-all hover:bg-[#1e293b] active:scale-[0.98] md:w-auto"
              >
                Continue
                <span className="material-symbols-outlined text-[20px]">arrow_forward</span>
              </button>
            ) : (
              <button
                type="button"
                onClick={() => { if (validateStep()) setShowSubmitModal(true); }}
                className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-[#091426] px-10 py-3 text-sm font-semibold text-white shadow-md transition-all hover:bg-[#1e293b] active:scale-[0.98] md:w-auto"
              >
                Submit Application
                <span className="material-symbols-outlined text-[20px]">send</span>
              </button>
            )}
          </div>
        </div>

        {/* Bento info cards */}
        <div className="mt-10 grid grid-cols-1 gap-6 md:grid-cols-3">
          {BENTO_CARDS.map(({ icon, color, title, desc }) => (
            <div
              key={title}
              className="flex items-start gap-4 rounded-xl border border-[#c5c6cd]/30 bg-[#eff4ff] p-6"
            >
              <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full ${color}`}>
                <span className="material-symbols-outlined">{icon}</span>
              </div>
              <div>
                <h4 className="mb-1 text-sm font-semibold text-[#0b1c30]">{title}</h4>
                <p className="text-xs leading-relaxed text-[#45474c]">{desc}</p>
              </div>
            </div>
          ))}
        </div>
      </main>

      <EnrollmentFooter />

      <ConfirmModal
        open={showSubmitModal}
        onClose={() => setShowSubmitModal(false)}
        onConfirm={handleSubmit}
        title="Submit Enrollment Application?"
        message="Please review all details carefully. Once submitted, the application will be sent to the school admin for verification."
        confirmText="Submit Application"
        loading={loading}
      />
    </div>
  );
}

function EnrollmentFooter() {
  return (
    <footer className="mt-auto bg-[#091426] px-4 py-10 text-white md:px-10">
      <div className="mx-auto flex max-w-5xl flex-col items-center justify-between gap-6 md:flex-row">
        <div className="flex flex-col items-center md:items-start">
          <span className="font-display text-lg font-bold">SchoolBridge</span>
          <p className="mt-1 text-sm text-white/70">© 2026 SchoolBridge Enrollment Systems. Secure & Certified.</p>
        </div>
        <div className="flex flex-wrap justify-center gap-6 md:gap-8">
          <a className="text-sm text-white/70 transition-colors hover:text-[#d8e2ff]" href="#">Privacy Policy</a>
          <a className="text-sm text-white/70 transition-colors hover:text-[#d8e2ff]" href="#">Terms of Service</a>
          <a className="text-sm text-white/70 transition-colors hover:text-[#d8e2ff]" href="#">Accessibility</a>
          <a className="text-sm text-white/70 transition-colors hover:text-[#d8e2ff]" href="#">Support</a>
        </div>
      </div>
    </footer>
  );
}
