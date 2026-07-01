import { useState } from 'react';
import { Link } from 'react-router-dom';
import { CLASSES, GENDERS, BLOOD_GROUPS } from '../../data/mockSchool.js';
import { usePortalConfig } from '../../context/PortalConfigContext.jsx';
import { getEmptyForm, saveDraft, submitApplication } from '../../services/enrollmentService.js';
import { useToast } from '../../context/ToastContext.jsx';
import FileUpload from '../../components/upload/SmartFileUpload.jsx';
import { validateEnrollmentStep } from '../../schemas/enrollmentSchema.js';
import { useUploadStore } from '../../store/uploadStore.js';
import { SignaturePad } from '../../components/ui/index.jsx';
import {
  EnrollmentFormHeader,
  EnrollmentSectionHeader,
  EnrollmentFormRow,
  EnrollmentFormSplit,
  EnrollmentInlineInput,
  EnrollmentInlineSelect,
  EnrollmentInlineTextarea,
  EnrollmentSquareRadioGroup,
  EnrollmentSquareCheckbox,
  EnrollmentNotesPanel,
  EnrollmentFormStepper,
} from '../../components/enrollment/EnrollmentFormLayout.jsx';
import NetworkBanner from '../../components/layout/NetworkBanner.jsx';
import { ConfirmModal } from '../../components/ui/Modal.jsx';
import StatusBadge from '../../components/ui/StatusBadge.jsx';
import '../../styles/enrollment-form.css';
import { enrollmentThemeToCssVars } from '../../constants/enrollmentTheme.js';

const DOC_FIELDS = [
  { key: 'birthCertificate', label: 'Birth Certificate', category: 'document', required: true },
  { key: 'studentPhoto', label: 'Student Photo', category: 'photo', required: true },
  { key: 'parentIdProof', label: 'Parent ID Proof', category: 'document', required: true },
  { key: 'addressProof', label: 'Address Proof', category: 'document', required: false },
  { key: 'reportCard', label: 'Previous Report Card', category: 'document', required: false },
  { key: 'transferCertificate', label: 'Transfer Certificate', category: 'document', required: false },
];

const STEP_NOTES = [
  'Enter the student name exactly as it appears on the birth certificate. Fields marked with * are mandatory.',
  'Provide accurate parent or guardian contact details for admission updates and school communication.',
  'Current and permanent address must be complete with city, state, and PIN code.',
  'Share previous academic records if the student is transferring from another school.',
  'Medical information helps the school provide appropriate care. Enter "None" if not applicable.',
  'Upload clear scanned copies or photos. Required documents must be submitted before review.',
  'Read each declaration carefully and sign digitally to confirm your application.',
  'Review all sections before final submission. You can go back to edit any section.',
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
  const { portalName, school, enrollmentTheme } = usePortalConfig();
  const enrollCssVars = enrollmentThemeToCssVars(enrollmentTheme);

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
      <div className="enrollment-form-viewport" style={enrollCssVars}>
        <NetworkBanner />
        <div className="enrollment-form-wrap flex items-center">
          <div className="enrollment-success-card">
            <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-green-100 text-2xl text-green-700">✓</div>
            <h1 className="mb-2 text-2xl font-black uppercase text-[#1B2E4B]">Application Submitted</h1>
            <p className="mb-6 text-sm text-gray-600">
              Your enrollment application has been sent to the school admin for verification.
            </p>
            <div className="mb-6 border border-gray-200 bg-gray-50 p-4 text-left text-sm">
              <div className="mb-2"><strong>Application Number:</strong> {submitted.applicationNo}</div>
              <div className="mb-2"><strong>Student:</strong> {submitted.student?.fullName}</div>
              <StatusBadge variant="success">{submitted.status}</StatusBadge>
            </div>
            <div className="flex flex-wrap justify-center gap-3">
              <Link to="/" className="enrollment-btn enrollment-btn--outline">Back to Home</Link>
              <Link to="/login" className="enrollment-btn enrollment-btn--primary">Login to Track Status</Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="enrollment-form-viewport" style={enrollCssVars}>
      <NetworkBanner />

      <div className="enrollment-form-wrap">
        <div className="enrollment-page-container">
          <EnrollmentFormHeader portalName={portalName} school={school} />

          <main className="enrollment-form-main">
            <div className="mb-4 flex items-center justify-between gap-3">
              <Link to="/" className="text-[11px] font-bold uppercase tracking-wider text-gray-500 hover:text-[#1B2E4B]">
                ← Back to Home
              </Link>
              <button
                type="button"
                onClick={handleSaveDraft}
                disabled={loading}
                className="enrollment-btn width-[40%] enrollment-btn--outline !py-2 !px-4 !text-[10px]"
              >
                Save Draft
              </button>
            </div>

            <EnrollmentFormStepper currentStep={step} />
            <EnrollmentSectionHeader step={step} />

            <div className={`enrollment-step-grid ${step <= 5 ? 'enrollment-step-grid--with-notes' : ''}`}>
              <div className="enrollment-form-fields">
                {step === 1 && (
                  <>
                    <EnrollmentFormRow label="Student Full Name" required error={errors['student.fullName']}>
                      <EnrollmentInlineInput
                        value={form.student.fullName}
                        onChange={(e) => update('student', 'fullName', e.target.value)}
                        placeholder="Enter student full name"
                      />
                    </EnrollmentFormRow>

                    <EnrollmentFormSplit>
                      <EnrollmentFormRow label="Date of Birth" required error={errors['student.dateOfBirth']}>
                        <EnrollmentInlineInput
                          type="date"
                          value={form.student.dateOfBirth}
                          onChange={(e) => update('student', 'dateOfBirth', e.target.value)}
                        />
                      </EnrollmentFormRow>
                      <EnrollmentFormRow label="Gender" required error={errors['student.gender']}>
                        <EnrollmentSquareRadioGroup
                          name="gender"
                          options={GENDERS}
                          value={form.student.gender}
                          onChange={(v) => update('student', 'gender', v)}
                        />
                      </EnrollmentFormRow>
                    </EnrollmentFormSplit>

                    <EnrollmentFormSplit>
                      <EnrollmentFormRow label="Nationality">
                        <EnrollmentInlineInput
                          value={form.student.nationality}
                          onChange={(e) => update('student', 'nationality', e.target.value)}
                        />
                      </EnrollmentFormRow>
                      <EnrollmentFormRow label="Blood Group">
                        <EnrollmentInlineSelect
                          options={BLOOD_GROUPS}
                          placeholder="Select blood group"
                          value={form.student.bloodGroup}
                          onChange={(e) => update('student', 'bloodGroup', e.target.value)}
                        />
                      </EnrollmentFormRow>
                    </EnrollmentFormSplit>

                    <EnrollmentFormRow label="Class Applying For" wide required error={errors['student.classApplying']}>
                      <EnrollmentInlineSelect
                        options={CLASSES}
                        placeholder="Select class"
                        value={form.student.classApplying}
                        onChange={(e) => update('student', 'classApplying', e.target.value)}
                      />
                    </EnrollmentFormRow>

                    <EnrollmentFormRow label="Previous School Name">
                      <EnrollmentInlineInput
                        value={form.student.previousSchool}
                        onChange={(e) => update('student', 'previousSchool', e.target.value)}
                        placeholder="Enter previous school name"
                      />
                    </EnrollmentFormRow>

                    <EnrollmentFormRow label="Aadhaar / ID Number">
                      <EnrollmentInlineInput
                        value={form.student.aadhaar}
                        onChange={(e) => update('student', 'aadhaar', e.target.value)}
                        placeholder="Optional"
                      />
                    </EnrollmentFormRow>
                  </>
                )}

                {step === 2 && (
                  <>
                    <EnrollmentFormRow label="Father Name" required error={errors['parent.fatherName']}>
                      <EnrollmentInlineInput value={form.parent.fatherName} onChange={(e) => update('parent', 'fatherName', e.target.value)} />
                    </EnrollmentFormRow>
                    <EnrollmentFormRow label="Father Mobile" required error={errors['parent.fatherMobile']}>
                      <EnrollmentInlineInput value={form.parent.fatherMobile} onChange={(e) => update('parent', 'fatherMobile', e.target.value)} />
                    </EnrollmentFormRow>
                    <EnrollmentFormRow label="Father Email">
                      <EnrollmentInlineInput type="email" value={form.parent.fatherEmail} onChange={(e) => update('parent', 'fatherEmail', e.target.value)} />
                    </EnrollmentFormRow>
                    <EnrollmentFormRow label="Father Occupation">
                      <EnrollmentInlineInput value={form.parent.fatherOccupation} onChange={(e) => update('parent', 'fatherOccupation', e.target.value)} />
                    </EnrollmentFormRow>
                    <EnrollmentFormRow label="Mother Name" required error={errors['parent.motherName']}>
                      <EnrollmentInlineInput value={form.parent.motherName} onChange={(e) => update('parent', 'motherName', e.target.value)} />
                    </EnrollmentFormRow>
                    <EnrollmentFormRow label="Mother Mobile">
                      <EnrollmentInlineInput value={form.parent.motherMobile} onChange={(e) => update('parent', 'motherMobile', e.target.value)} />
                    </EnrollmentFormRow>
                    <EnrollmentFormRow label="Mother Email">
                      <EnrollmentInlineInput type="email" value={form.parent.motherEmail} onChange={(e) => update('parent', 'motherEmail', e.target.value)} />
                    </EnrollmentFormRow>
                    <EnrollmentFormRow label="Mother Occupation">
                      <EnrollmentInlineInput value={form.parent.motherOccupation} onChange={(e) => update('parent', 'motherOccupation', e.target.value)} />
                    </EnrollmentFormRow>
                    <EnrollmentFormRow label="Guardian Name">
                      <EnrollmentInlineInput value={form.parent.guardianName} onChange={(e) => update('parent', 'guardianName', e.target.value)} placeholder="If applicable" />
                    </EnrollmentFormRow>
                    <EnrollmentFormRow label="Alternate Contact" wide>
                      <EnrollmentInlineInput value={form.parent.alternateContact} onChange={(e) => update('parent', 'alternateContact', e.target.value)} />
                    </EnrollmentFormRow>
                  </>
                )}

                {step === 3 && (
                  <>
                    <EnrollmentFormRow label="Current Address" required stacked error={errors['address.currentAddress']}>
                      <EnrollmentInlineTextarea value={form.address.currentAddress} onChange={(e) => update('address', 'currentAddress', e.target.value)} />
                    </EnrollmentFormRow>
                    <div className="enrollment-form-checkbox-row">
                      <EnrollmentSquareCheckbox
                        label="Permanent address same as current address"
                        checked={form.address.sameAsCurrent}
                        onChange={(checked) => {
                          update('address', 'sameAsCurrent', checked);
                          if (checked) update('address', 'permanentAddress', form.address.currentAddress);
                        }}
                      />
                    </div>
                    <EnrollmentFormRow label="Permanent Address" stacked>
                      <EnrollmentInlineTextarea value={form.address.permanentAddress} onChange={(e) => update('address', 'permanentAddress', e.target.value)} />
                    </EnrollmentFormRow>
                    <EnrollmentFormSplit>
                      <EnrollmentFormRow label="City" required error={errors['address.city']}>
                        <EnrollmentInlineInput value={form.address.city} onChange={(e) => update('address', 'city', e.target.value)} />
                      </EnrollmentFormRow>
                      <EnrollmentFormRow label="State">
                        <EnrollmentInlineInput value={form.address.state} onChange={(e) => update('address', 'state', e.target.value)} />
                      </EnrollmentFormRow>
                    </EnrollmentFormSplit>
                    <EnrollmentFormSplit>
                      <EnrollmentFormRow label="PIN Code" required error={errors['address.pinCode']}>
                        <EnrollmentInlineInput value={form.address.pinCode} onChange={(e) => update('address', 'pinCode', e.target.value)} />
                      </EnrollmentFormRow>
                      <EnrollmentFormRow label="Country">
                        <EnrollmentInlineInput value={form.address.country} onChange={(e) => update('address', 'country', e.target.value)} />
                      </EnrollmentFormRow>
                    </EnrollmentFormSplit>
                  </>
                )}

                {step === 4 && (
                  <>
                    <EnrollmentFormRow label="Previous Class">
                      <EnrollmentInlineInput value={form.academic.previousClass} onChange={(e) => update('academic', 'previousClass', e.target.value)} />
                    </EnrollmentFormRow>
                    <EnrollmentFormRow label="Previous School">
                      <EnrollmentInlineInput value={form.academic.previousSchool} onChange={(e) => update('academic', 'previousSchool', e.target.value)} />
                    </EnrollmentFormRow>
                    <EnrollmentFormRow label="Previous Board">
                      <EnrollmentInlineInput value={form.academic.previousBoard} onChange={(e) => update('academic', 'previousBoard', e.target.value)} placeholder="e.g. CBSE, ICSE" />
                    </EnrollmentFormRow>
                    <EnrollmentFormRow label="Achievements" stacked>
                      <EnrollmentInlineTextarea value={form.academic.achievements} onChange={(e) => update('academic', 'achievements', e.target.value)} placeholder="Any notable achievements" />
                    </EnrollmentFormRow>
                    <EnrollmentFormRow label="Reason For Change" wide stacked>
                      <EnrollmentInlineTextarea value={form.academic.reasonForChange} onChange={(e) => update('academic', 'reasonForChange', e.target.value)} />
                    </EnrollmentFormRow>
                  </>
                )}

                {step === 5 && (
                  <>
                    <EnrollmentFormRow label="Medical Conditions" stacked>
                      <EnrollmentInlineTextarea value={form.medical.medicalConditions} onChange={(e) => update('medical', 'medicalConditions', e.target.value)} placeholder="Enter none if not applicable" />
                    </EnrollmentFormRow>
                    <EnrollmentFormRow label="Allergies" stacked>
                      <EnrollmentInlineTextarea value={form.medical.allergies} onChange={(e) => update('medical', 'allergies', e.target.value)} placeholder="Enter none if not applicable" />
                    </EnrollmentFormRow>
                    <EnrollmentFormRow label="Special Needs" stacked>
                      <EnrollmentInlineTextarea value={form.medical.specialNeeds} onChange={(e) => update('medical', 'specialNeeds', e.target.value)} />
                    </EnrollmentFormRow>
                    <EnrollmentFormRow label="Emergency Contact Name" wide>
                      <EnrollmentInlineInput value={form.medical.emergencyContactName} onChange={(e) => update('medical', 'emergencyContactName', e.target.value)} />
                    </EnrollmentFormRow>
                    <EnrollmentFormRow label="Emergency Contact No." wide>
                      <EnrollmentInlineInput value={form.medical.emergencyContactNumber} onChange={(e) => update('medical', 'emergencyContactNumber', e.target.value)} />
                    </EnrollmentFormRow>
                  </>
                )}

                {step === 6 && (
                  <>
                    {DOC_FIELDS.map(({ key, label, category, required }) => (
                      <div key={key} className="enrollment-doc-row">
                        <EnrollmentFormRow label={label} wide required={required} error={errors[`documents.${key}`]}>
                          <FileUpload
                            fieldKey={key}
                            label=""
                            category={category}
                            required={required}
                            value={form.documents[key]}
                            onChange={(data) => updateDoc(key, data)}
                          />
                        </EnrollmentFormRow>
                      </div>
                    ))}
                  </>
                )}

                {step === 7 && (
                  <div className="enrollment-signature-block">
                    <div>
                      <div className="enrollment-declaration-box space-y-3">
                        {[
                          { key: 'accuracyConfirmed', text: 'I confirm that the information provided in this application is true and accurate to the best of my knowledge.' },
                          { key: 'communicationConsent', text: 'I consent to receive school communication via email, SMS, and in-app notifications.' },
                          { key: 'mediaConsent', text: 'I consent to my child being photographed for classroom activities and shared with parents via the school platform.' },
                        ].map(({ key, text }) => (
                          <EnrollmentSquareCheckbox
                            key={key}
                            label={text}
                            checked={form.declaration[key]}
                            onChange={(v) => update('declaration', key, v)}
                          />
                        ))}
                      </div>
                      {errors.declaration && <p className="mt-2 text-[10px] font-semibold text-[#C81E1E]">{errors.declaration}</p>}
                    </div>

                    <div>
                      <p className="enrollment-signature-label">
                        Digital Signature <span className="enrollment-required" aria-hidden="true">*</span>
                      </p>
                      <div className="enrollment-signature-pad-wrap">
                        <SignaturePad value={form.declaration.signature} onChange={(sig) => update('declaration', 'signature', sig)} />
                      </div>
                      {errors.signature && <p className="mt-2 text-[10px] font-semibold text-[#C81E1E]">{errors.signature}</p>}
                      <div className="mt-4">
                        <EnrollmentFormRow label="Signature Date">
                          <EnrollmentInlineInput type="date" value={form.declaration.signatureDate} onChange={(e) => update('declaration', 'signatureDate', e.target.value)} />
                        </EnrollmentFormRow>
                      </div>
                    </div>
                  </div>
                )}

                {step === 8 && (
                  <>
                    {['student', 'parent', 'address', 'academic', 'medical'].map((section) => (
                      <div key={section} className="enrollment-review-block">
                        <h4>{section} Details</h4>
                        {Object.entries(form[section] || {})
                          .filter(([, v]) => v && typeof v !== 'object')
                          .map(([k, v]) => (
                            <dl key={k} className="enrollment-review-item">
                              <dt>{k.replace(/([A-Z])/g, ' $1').trim()}</dt>
                              <dd>{String(v)}</dd>
                            </dl>
                          ))}
                      </div>
                    ))}
                    <div className="enrollment-review-block">
                      <h4>Documents</h4>
                      {Object.entries(form.documents)
                        .filter(([, v]) => v)
                        .map(([k, v]) => (
                          <dl key={k} className="enrollment-review-item">
                            <dt>{k.replace(/([A-Z])/g, ' $1').trim()}</dt>
                            <dd>{v.name}</dd>
                          </dl>
                        ))}
                    </div>
                  </>
                )}
              </div>

              {step <= 5 && (
                <EnrollmentNotesPanel>{STEP_NOTES[step - 1]}</EnrollmentNotesPanel>
              )}
            </div>

            <div className="enrollment-form-actions">
              <div className="enrollment-form-actions__left">
                {step > 1 && (
                  <button type="button" onClick={back} className="enrollment-btn enrollment-btn--outline">
                    Back
                  </button>
                )}
                <button type="button" onClick={handleSaveDraft} disabled={loading} className="enrollment-btn enrollment-btn--outline">
                  Save Draft
                </button>
              </div>

              {step < 8 ? (
                <button type="button" onClick={next} className="enrollment-btn enrollment-btn--primary">
                  Continue →
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => { if (validateStep()) setShowSubmitModal(true); }}
                  className="enrollment-btn enrollment-btn--accent"
                >
                  Submit Application
                </button>
              )}
            </div>
          </main>
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
