import { useCallback, useRef, useState } from 'react';
import {
  getEmptyPrintFormData,
  setNestedValue,
  validatePrintFormForSubmit,
  wrapPrintFormForEnrollment,
} from '../printTemplate/enrollmentPrintFormData.js';
import { saveDraft, submitApplication } from '../../services/enrollmentService.js';
import { useToast } from '../../context/ToastContext.jsx';
import { saveHtmlFormDraft, loadHtmlFormDraft, clearHtmlFormDraft } from './htmlFormDraft.js';
import HtmlFormPage1 from './pages/HtmlFormPage1.jsx';
import HtmlFormPage2 from './pages/HtmlFormPage2.jsx';
import HtmlFormPage3 from './pages/HtmlFormPage3.jsx';
import HtmlFormPage4 from './pages/HtmlFormPage4.jsx';
import HtmlFormPage5 from './pages/HtmlFormPage5.jsx';
import '../../styles/printable-html-enrollment.css';

export default function PrintableHtmlEnrollmentForm({
  initialData,
  readOnly = false,
  isAdmin = false,
  schoolName,
  logoUrl,
  applicationId: initialApplicationId = null,
  parentId = null,
  schoolId = null,
  onSubmitted,
}) {
  const [formData, setFormData] = useState(() => initialData || getEmptyPrintFormData());
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
      const payload = wrapPrintFormForEnrollment(formData, { _formType: 'printable_html' });
      const saved = await saveDraft(payload, draftId, { parentId, schoolId });
      setDraftId(saved.id);
      saveHtmlFormDraft(formData);
      toast('Draft saved successfully.', 'success');
    } catch {
      saveHtmlFormDraft(formData);
      toast('Saved locally. Server draft may be unavailable.', 'warning');
    } finally {
      setLoading(false);
    }
  };

  const handleLoadDraft = () => {
    const local = loadHtmlFormDraft();
    if (local) {
      setFormData(local);
      toast('Draft loaded from browser storage.', 'success');
      return;
    }
    toast('No local draft found.', 'info');
  };

  const handleClearDraft = () => {
    clearHtmlFormDraft();
    toast('Local draft cleared.', 'info');
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
      const payload = wrapPrintFormForEnrollment(formData, { _formType: 'printable_html' });
      const appId = draftId || (await saveDraft(payload, null, { parentId, schoolId })).id;
      const result = await submitApplication(payload, appId, parentId, schoolId);
      setDraftId(result.id);
      saveHtmlFormDraft(formData);
      toast('Enrollment form submitted successfully.', 'success');
      onSubmitted?.(result);
    } catch {
      toast('Submission failed. Please try again.', 'error');
    } finally {
      setLoading(false);
    }
  };

  const pageProps = {
    formData,
    onChange: handleFieldChange,
    readOnly,
    schoolName,
    logoUrl,
  };

  return (
    <div className="printable-html-enrollment-root">
      <div className="printable-html-enrollment-toolbar no-print">
        <div className="printable-html-enrollment-toolbar__left">
          <h1 className="printable-html-enrollment-toolbar__title">Printable HTML Enrollment Form</h1>
          {schoolName && <p className="printable-html-enrollment-toolbar__subtitle">{schoolName}</p>}
        </div>
        <div className="printable-html-enrollment-toolbar__actions">
          {!readOnly && (
            <>
              <button type="button" className="sb-button-secondary" onClick={handleLoadDraft} disabled={loading}>
                Load Draft
              </button>
              <button type="button" className="sb-button-secondary" onClick={handleSaveDraft} disabled={loading}>
                Save Draft
              </button>
              <button type="button" className="sb-button-secondary" onClick={handleClearDraft} disabled={loading}>
                Clear Draft
              </button>
              <button type="button" className="sb-button-primary" onClick={handleSubmit} disabled={loading}>
                Submit Application
              </button>
            </>
          )}
          <button type="button" className="sb-button-secondary" onClick={handlePrint}>
            Print
          </button>
          <button type="button" className="sb-button-secondary" onClick={handleDownloadPdf}>
            Download PDF
          </button>
        </div>
      </div>

      <div className="printable-html-enrollment-pages" ref={printRef}>
        <HtmlFormPage1 {...pageProps} />
        <HtmlFormPage2 {...pageProps} />
        <HtmlFormPage3 {...pageProps} />
        <HtmlFormPage4 {...pageProps} />
        <HtmlFormPage5 {...pageProps} isAdmin={isAdmin} />
      </div>
    </div>
  );
}
