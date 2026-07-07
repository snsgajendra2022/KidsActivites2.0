import { useCallback, useRef, useState } from 'react';
import { useToast } from '../../context/ToastContext.jsx';
import {
  KIDZEE_BRANDING,
  getEmptyKidzeeFormData,
  setNestedValue,
  saveKidzeeDraft,
  loadKidzeeDraft,
  clearKidzeeDraft,
} from './kidzeePrintFields.js';
import KidzeePage1 from './pages/KidzeePage1.jsx';
import KidzeePage2 from './pages/KidzeePage2.jsx';
import KidzeePage3 from './pages/KidzeePage3.jsx';
import KidzeePage4 from './pages/KidzeePage4.jsx';
import KidzeePage5 from './pages/KidzeePage5.jsx';
import './KidzeePrintableForm.css';

export default function KidzeePrintableForm({
  initialData,
  readOnly = false,
  isAdmin = false,
  branding = KIDZEE_BRANDING,
}) {
  const [formData, setFormData] = useState(() => initialData || getEmptyKidzeeFormData(branding));
  const [showGrid, setShowGrid] = useState(false);
  const printRef = useRef(null);
  const { toast } = useToast();

  const handleFieldChange = useCallback((path, value) => {
    setFormData((prev) => setNestedValue(prev, path, value));
  }, []);

  const handleSaveDraft = () => {
    if (saveKidzeeDraft(formData)) {
      toast('Draft saved to browser storage.', 'success');
    } else {
      toast('Could not save draft.', 'error');
    }
  };

  const handleLoadDraft = () => {
    const local = loadKidzeeDraft();
    if (local) {
      setFormData(local);
      toast('Draft loaded from browser storage.', 'success');
      return;
    }
    toast('No local draft found.', 'info');
  };

  const handleClearDraft = () => {
    clearKidzeeDraft();
    setFormData(getEmptyKidzeeFormData(branding));
    toast('Draft cleared.', 'info');
  };

  const handlePrint = () => window.print();

  const handleDownloadPdf = () => {
    toast('Use Print → Save as PDF in the print dialog.', 'info');
    window.print();
  };

  const pageProps = {
    formData,
    onChange: handleFieldChange,
    readOnly,
    branding,
    showGrid,
    isAdmin,
  };

  return (
    <div className="kidzee-print-root">
      <div className="print-toolbar no-print">
        <div className="print-toolbar__left">
          <h1 className="print-toolbar__title">Kidzee Enrollment Form</h1>
          <p className="print-toolbar__subtitle">CHILD REGISTRATION FORM — 5 pages</p>
        </div>
        <div className="print-toolbar__actions">
          {!readOnly && (
            <>
              <button type="button" className="sb-button-secondary" onClick={handleLoadDraft}>Load Draft</button>
              <button type="button" className="sb-button-secondary" onClick={handleSaveDraft}>Save Draft</button>
              <button type="button" className="sb-button-secondary" onClick={handleClearDraft}>Clear</button>
            </>
          )}
          <label className="print-toolbar__toggle">
            <input type="checkbox" checked={showGrid} onChange={(e) => setShowGrid(e.target.checked)} />
            Show Alignment Grid
          </label>
          <button type="button" className="sb-button-secondary" onClick={handlePrint}>Print</button>
          <button type="button" className="sb-button-secondary" onClick={handleDownloadPdf}>Download PDF</button>
        </div>
      </div>

      <div className="kidzee-print-pages" ref={printRef}>
        <KidzeePage1 {...pageProps} />
        <KidzeePage2 {...pageProps} />
        <KidzeePage3 {...pageProps} />
        <KidzeePage4 {...pageProps} />
        <KidzeePage5 {...pageProps} />
      </div>
    </div>
  );
}
