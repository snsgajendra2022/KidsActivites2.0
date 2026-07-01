import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowLeft, ArrowRight, Save } from 'lucide-react';
import { SCHOOL, CLASSES, GENDERS, BLOOD_GROUPS } from '../../data/mockSchool.js';
import { getEmptyForm, saveDraft, submitApplication } from '../../services/enrollmentService.js';
import { useToast } from '../../context/ToastContext.jsx';
import Button from '../../components/ui/Button.jsx';
import Input from '../../components/ui/Input.jsx';
import Select from '../../components/ui/Select.jsx';
import Textarea from '../../components/ui/Textarea.jsx';
import FileUpload from '../../components/upload/SmartFileUpload.jsx';
import { validateEnrollmentStep } from '../../schemas/enrollmentSchema.js';
import { useUploadStore } from '../../store/uploadStore.js';
import { Stepper, SignaturePad, PageHeader } from '../../components/ui/index.jsx';
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

export default function Enrollment() {
  const [step, setStep] = useState(1);
  const [form, setForm] = useState(getEmptyForm);
  const [draftId, setDraftId] = useState(null);
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const [showSubmitModal, setShowSubmitModal] = useState(false);
  const [submitted, setSubmitted] = useState(null);
  const { toast } = useToast();
  const navigate = useNavigate();

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
      const requiredDocs = DOC_FIELDS.filter((d) => d.required);
      requiredDocs.forEach(({ key, label }) => {
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
      <div style={{ minHeight: '100vh', background: 'var(--bg)', padding: 24 }}>
        <div className="card" style={{ maxWidth: 560, margin: '60px auto', textAlign: 'center' }}>
          <div style={{ fontSize: 48, marginBottom: 16 }}>✓</div>
          <h1 className="page-title">Application Submitted</h1>
          <p className="text-muted" style={{ marginBottom: 24 }}>Your enrollment application has been sent to the school admin for verification.</p>
          <div style={{ background: '#f8fafc', borderRadius: 12, padding: 20, marginBottom: 24, textAlign: 'left' }}>
            <div style={{ marginBottom: 8 }}><strong>Application Number:</strong> {submitted.applicationNo}</div>
            <div style={{ marginBottom: 8 }}><strong>Student:</strong> {submitted.student?.fullName}</div>
            <div><StatusBadge status={submitted.status} /></div>
          </div>
          <div className="btn-group" style={{ justifyContent: 'center' }}>
            <Link to="/"><Button variant="secondary">Back to Home</Button></Link>
            <Link to="/login"><Button variant="primary">Login to Track Status</Button></Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)' }}>
      <nav className="landing-nav">
        <Link to="/" className="sidebar-brand">
          <span className="sidebar-brand-icon">SB</span>
          <span style={{ fontWeight: 700, color: 'var(--navy)' }}>SchoolBridge</span>
        </Link>
        <Button variant="secondary" size="sm" onClick={handleSaveDraft} loading={loading}>
          <Save size={16} /> Save Draft
        </Button>
      </nav>

      <div style={{ maxWidth: 900, margin: '0 auto', padding: '24px 16px 48px' }}>
        <PageHeader
          title="Student Enrollment Form"
          subtitle={`${SCHOOL.name} · Academic Year ${SCHOOL.academicYear}`}
        />
        <p className="text-muted" style={{ marginBottom: 24 }}>
          Please fill in all required details carefully. You can save your progress and continue later.
        </p>

        <div className="card">
          <Stepper currentStep={step} />

          {step === 1 && (
            <div className="form-grid">
              <Input label="Student Full Name" required value={form.student.fullName} onChange={(e) => update('student', 'fullName', e.target.value)} error={errors['student.fullName']} helper="Name should match the birth certificate." placeholder="Enter student full name" />
              <Input label="Date of Birth" required type="date" value={form.student.dateOfBirth} onChange={(e) => update('student', 'dateOfBirth', e.target.value)} error={errors['student.dateOfBirth']} />
              <Select label="Gender" required options={GENDERS} placeholder="Select gender" value={form.student.gender} onChange={(e) => update('student', 'gender', e.target.value)} error={errors['student.gender']} />
              <Select label="Blood Group" options={BLOOD_GROUPS} placeholder="Select blood group" value={form.student.bloodGroup} onChange={(e) => update('student', 'bloodGroup', e.target.value)} />
              <Input label="Nationality" value={form.student.nationality} onChange={(e) => update('student', 'nationality', e.target.value)} />
              <Select label="Class Applying For" required options={CLASSES} placeholder="Select class" value={form.student.classApplying} onChange={(e) => update('student', 'classApplying', e.target.value)} error={errors['student.classApplying']} />
              <Input label="Previous School Name" value={form.student.previousSchool} onChange={(e) => update('student', 'previousSchool', e.target.value)} placeholder="Enter previous school name" />
              <Input label="Aadhaar / ID Number" value={form.student.aadhaar} onChange={(e) => update('student', 'aadhaar', e.target.value)} placeholder="Optional" />
            </div>
          )}

          {step === 2 && (
            <div className="form-grid">
              <Input label="Father Name" required value={form.parent.fatherName} onChange={(e) => update('parent', 'fatherName', e.target.value)} error={errors['parent.fatherName']} />
              <Input label="Father Mobile" required value={form.parent.fatherMobile} onChange={(e) => update('parent', 'fatherMobile', e.target.value)} error={errors['parent.fatherMobile']} />
              <Input label="Father Email" type="email" value={form.parent.fatherEmail} onChange={(e) => update('parent', 'fatherEmail', e.target.value)} />
              <Input label="Father Occupation" value={form.parent.fatherOccupation} onChange={(e) => update('parent', 'fatherOccupation', e.target.value)} />
              <Input label="Mother Name" required value={form.parent.motherName} onChange={(e) => update('parent', 'motherName', e.target.value)} error={errors['parent.motherName']} />
              <Input label="Mother Mobile" value={form.parent.motherMobile} onChange={(e) => update('parent', 'motherMobile', e.target.value)} />
              <Input label="Mother Email" type="email" value={form.parent.motherEmail} onChange={(e) => update('parent', 'motherEmail', e.target.value)} />
              <Input label="Mother Occupation" value={form.parent.motherOccupation} onChange={(e) => update('parent', 'motherOccupation', e.target.value)} />
              <Input label="Guardian Name" value={form.parent.guardianName} onChange={(e) => update('parent', 'guardianName', e.target.value)} placeholder="If applicable" />
              <Input label="Alternate Contact Number" value={form.parent.alternateContact} onChange={(e) => update('parent', 'alternateContact', e.target.value)} />
            </div>
          )}

          {step === 3 && (
            <div className="form-grid">
              <Textarea className="full" label="Current Address" required value={form.address.currentAddress} onChange={(e) => update('address', 'currentAddress', e.target.value)} error={errors['address.currentAddress']} />
              <div className="form-field full">
                <label className="form-checkbox-row">
                  <input type="checkbox" checked={form.address.sameAsCurrent} onChange={(e) => { update('address', 'sameAsCurrent', e.target.checked); if (e.target.checked) update('address', 'permanentAddress', form.address.currentAddress); }} />
                  Permanent address same as current address
                </label>
              </div>
              <Textarea className="full" label="Permanent Address" value={form.address.permanentAddress} onChange={(e) => update('address', 'permanentAddress', e.target.value)} />
              <Input label="City" required value={form.address.city} onChange={(e) => update('address', 'city', e.target.value)} error={errors['address.city']} />
              <Input label="State" value={form.address.state} onChange={(e) => update('address', 'state', e.target.value)} />
              <Input label="PIN Code" required value={form.address.pinCode} onChange={(e) => update('address', 'pinCode', e.target.value)} error={errors['address.pinCode']} />
              <Input label="Country" value={form.address.country} onChange={(e) => update('address', 'country', e.target.value)} />
            </div>
          )}

          {step === 4 && (
            <div className="form-grid">
              <Input label="Previous Class" value={form.academic.previousClass} onChange={(e) => update('academic', 'previousClass', e.target.value)} />
              <Input label="Previous School" value={form.academic.previousSchool} onChange={(e) => update('academic', 'previousSchool', e.target.value)} />
              <Input label="Previous Board" value={form.academic.previousBoard} onChange={(e) => update('academic', 'previousBoard', e.target.value)} placeholder="e.g. CBSE, ICSE" />
              <Textarea className="full" label="Achievements" value={form.academic.achievements} onChange={(e) => update('academic', 'achievements', e.target.value)} placeholder="Any notable achievements" />
              <Textarea className="full" label="Reason for School Change" value={form.academic.reasonForChange} onChange={(e) => update('academic', 'reasonForChange', e.target.value)} />
            </div>
          )}

          {step === 5 && (
            <div className="form-grid">
              <Textarea className="full" label="Medical Conditions" value={form.medical.medicalConditions} onChange={(e) => update('medical', 'medicalConditions', e.target.value)} placeholder="Enter none if not applicable" />
              <Textarea className="full" label="Allergies" value={form.medical.allergies} onChange={(e) => update('medical', 'allergies', e.target.value)} placeholder="Enter none if not applicable" />
              <Textarea className="full" label="Special Needs" value={form.medical.specialNeeds} onChange={(e) => update('medical', 'specialNeeds', e.target.value)} />
              <Input label="Emergency Contact Name" value={form.medical.emergencyContactName} onChange={(e) => update('medical', 'emergencyContactName', e.target.value)} />
              <Input label="Emergency Contact Number" value={form.medical.emergencyContactNumber} onChange={(e) => update('medical', 'emergencyContactNumber', e.target.value)} />
            </div>
          )}

          {step === 6 && (
            <div className="form-grid single">
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
            <div>
              <div style={{ marginBottom: 20 }}>
                {[
                  { key: 'accuracyConfirmed', text: 'I confirm that the information provided in this application is true and accurate to the best of my knowledge.' },
                  { key: 'communicationConsent', text: 'I consent to receive school communication via email, SMS, and in-app notifications.' },
                  { key: 'mediaConsent', text: 'I consent to my child being photographed for classroom activities and shared with parents via the school platform.' },
                ].map(({ key, text }) => (
                  <label key={key} className="form-checkbox-row" style={{ marginBottom: 12 }}>
                    <input type="checkbox" checked={form.declaration[key]} onChange={(e) => update('declaration', key, e.target.checked)} />
                    {text}
                  </label>
                ))}
              </div>
              <div className="form-field">
                <label className="form-label">Digital Signature <span className="required">*</span></label>
                <SignaturePad value={form.declaration.signature} onChange={(sig) => update('declaration', 'signature', sig)} />
                {errors.signature && <span className="form-error">{errors.signature}</span>}
              </div>
              <Input label="Signature Date" type="date" value={form.declaration.signatureDate} onChange={(e) => update('declaration', 'signatureDate', e.target.value)} style={{ marginTop: 16, maxWidth: 200 }} />
              {errors.declaration && <span className="form-error">{errors.declaration}</span>}
            </div>
          )}

          {step === 8 && (
            <div>
              {['student', 'parent', 'address', 'academic', 'medical'].map((section) => (
                <div key={section} className="review-section">
                  <h3>{section.charAt(0).toUpperCase() + section.slice(1)} Details</h3>
                  <div className="review-grid">
                    {Object.entries(form[section] || {}).filter(([, v]) => v && typeof v !== 'object').map(([k, v]) => (
                      <div key={k} className="review-item">
                        <label>{k.replace(/([A-Z])/g, ' $1').trim()}</label>
                        <span>{String(v)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
              <div className="review-section">
                <h3>Documents</h3>
                <div className="review-grid">
                  {Object.entries(form.documents).filter(([, v]) => v).map(([k, v]) => (
                    <div key={k} className="review-item"><label>{k}</label><span>{v.name}</span></div>
                  ))}
                </div>
              </div>
            </div>
          )}

          <div className="form-actions-sticky">
            <div className="btn-group">
              {step > 1 && <Button variant="secondary" onClick={back}><ArrowLeft size={16} /> Back</Button>}
              <Button variant="secondary" onClick={handleSaveDraft} loading={loading}><Save size={16} /> Save Draft</Button>
            </div>
            {step < 8 ? (
              <Button variant="primary" onClick={next}>Continue <ArrowRight size={16} /></Button>
            ) : (
              <Button variant="primary" onClick={() => { if (validateStep()) setShowSubmitModal(true); }}>Submit Application</Button>
            )}
          </div>
        </div>
      </div>

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
