import { useCallback, useRef, useState } from 'react';
import PrintablePdfPage from './PrintablePdfPage.jsx';
import { ENROLLMENT_PAGE_COUNT } from './enrollmentPrintFields.js';
import {
  getEmptyPrintFormData,
  setNestedValue,
  saveLocalPrintDraft,
  loadLocalPrintDraft,
  validatePrintFormForSubmit,
  wrapPrintFormForEnrollment,
} from './enrollmentPrintFormData.js';
import { saveDraft, submitApplication } from '../../services/enrollmentService.js';
import { useToast } from '../../context/ToastContext.jsx';
import '../../styles/printable-enrollment.css';

export default function PrintableEnrollmentForm({
  initialData,
  readOnly = false,
  isAdmin = false,
  schoolName,
  applicationId: initialApplicationId = null,
  parentId = null,
  schoolId = null,
  onSubmitted,
}) {
  const [formData, setFormData] = useState(() => initialData || getEmptyPrintFormData());
  const [showCalibration, setShowCalibration] = useState(false);
  const [draftId, setDraftId] = useState(initialApplicationId);
  const [loading, setLoading] = useState(false);
  const printRef = useRef(null);
  const { toast } = useToast();

  const handleFieldChange = useCallback((path, value) => {
    setFormData((prev) => setNestedValue(prev, path, value));
  }, []);

  const handleSaveDraft = async () => {
    setLoading(true);
    try {
      const payload = wrapPrintFormForEnrollment(formData);
      const saved = await saveDraft(payload, draftId, { parentId, schoolId });
      setDraftId(saved.id);
      saveLocalPrintDraft(formData);
      toast('Draft saved successfully.', 'success');
    } catch {
      saveLocalPrintDraft(formData);
      toast('Saved locally. Server draft may be unavailable.', 'warning');
    } finally {
      setLoading(false);
    }
  };

  const handleLoadDraft = async () => {
    const local = loadLocalPrintDraft();
    if (local) {
      setFormData(local);
      toast('Draft loaded from browser storage.', 'success');
      return;
    }
    toast('No local draft found.', 'info');
  };

  const handlePrint = () => {
    window.print();
  };

  const handleDownloadPdf = () => {
    toast('Use Print → Save as PDF in the print dialog for best quality.', 'info');
    window.print();
  };

  const handleSubmit = async () => {
    const { success, errors } = validatePrintFormForSubmit(formData);
    if (!success) {
      const first = Object.values(errors)[0];
      toast(first || 'Please complete required fields before submitting.', 'warning');
      return;
    }

    setLoading(true);
    try {
      const payload = wrapPrintFormForEnrollment(formData);
      const appId = draftId || (await saveDraft(payload, null, { parentId, schoolId })).id;
      const result = await submitApplication(payload, appId, parentId, schoolId);
      setDraftId(result.id);
      saveLocalPrintDraft(formData);
      toast('Enrollment form submitted successfully.', 'success');
      onSubmitted?.(result);
    } catch {
      toast('Submission failed. Please try again.', 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="printable-enrollment-root">
      <div className="printable-enrollment-toolbar no-print">
        <div className="printable-enrollment-toolbar__left">
          <h1 className="printable-enrollment-toolbar__title">Printable Enrollment Form</h1>
          {schoolName && <p className="printable-enrollment-toolbar__subtitle">{schoolName}</p>}
        </div>
        <div className="printable-enrollment-toolbar__actions">
          <label className="printable-enrollment-toggle">
            <input
              type="checkbox"
              checked={showCalibration}
              onChange={(e) => setShowCalibration(e.target.checked)}
            />
            Show Alignment Grid
          </label>
          {!readOnly && (
            <>
              <button type="button" className="sb-button-secondary" onClick={handleLoadDraft} disabled={loading}>
                Load Draft
              </button>
              <button type="button" className="sb-button-secondary" onClick={handleSaveDraft} disabled={loading}>
                Save Draft
              </button>
              <button type="button" className="sb-button-primary" onClick={handleSubmit} disabled={loading}>
                Submit Application
              </button>
            </>
          )}
          <button type="button" className="sb-button-secondary" onClick={handlePrint}>
            Print Form
          </button>
          <button type="button" className="sb-button-secondary" onClick={handleDownloadPdf}>
            Download PDF
          </button>
        </div>
      </div>

      <div className="printable-enrollment-pages" ref={printRef}>
        {Array.from({ length: ENROLLMENT_PAGE_COUNT }, (_, i) => i + 1).map((page) => (
          <PrintablePdfPage
            key={page}
            page={page}
            formData={formData}
            onFieldChange={handleFieldChange}
            readOnly={readOnly}
            showCalibration={showCalibration}
            isAdmin={isAdmin}
            schoolName={schoolName}
          />
        ))}
      </div>
    </div>
  );
}
