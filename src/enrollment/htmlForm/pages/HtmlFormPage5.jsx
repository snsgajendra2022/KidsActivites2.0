import FormHeader from '../components/FormHeader.jsx';
import PrintPage from '../components/PrintPage.jsx';
import SectionTitle from '../components/SectionTitle.jsx';
import LineInput from '../components/LineInput.jsx';
import SignatureInput from '../components/SignatureInput.jsx';
import BoxInput from '../components/BoxInput.jsx';

function PermissionBlock({ title, text, prefix, data, onChange, readOnly }) {
  const set = (field, value) => onChange(`${prefix}.${field}`, value);
  const p = data || {};

  return (
    <div className="html-form-permission-block">
      <h3 className="html-form-permission-block__title">{title}</h3>
      <p className="html-form-permission-block__text">{text}</p>
      <div className="html-form-permission-sign">
        <LineInput label="Date" type="date" value={p.date} onChange={(v) => set('date', v)} readOnly={readOnly} />
        <LineInput label="Place" value={p.place} onChange={(v) => set('place', v)} readOnly={readOnly} />
        <SignatureInput label="Signature of Parent / Guardian" value={p.signature} onChange={(v) => set('signature', v)} readOnly={readOnly} />
      </div>
    </div>
  );
}

export default function HtmlFormPage5({
  formData,
  onChange,
  readOnly,
  isAdmin,
  schoolName,
  logoUrl,
}) {
  const set = (path, value) => onChange(path, value);
  const permissions = formData.permissions || {};
  const officeUse = formData.officeUse || {};
  const officeReadOnly = readOnly || !isAdmin;

  return (
    <PrintPage pageNumber={5} className="html-form-page--last">
      <FormHeader schoolName={schoolName} logoUrl={logoUrl} />

      <PermissionBlock
        title="Emergency Medical Permission"
        text="I hereby give permission for the school to obtain emergency medical treatment for my child when I cannot be reached immediately."
        prefix="permissions.emergency"
        data={permissions.emergency}
        onChange={set}
        readOnly={readOnly}
      />

      <PermissionBlock
        title="Field Trip Permission"
        text="I give permission for my child to participate in field trips and outdoor activities organized by the school."
        prefix="permissions.fieldTrip"
        data={permissions.fieldTrip}
        onChange={set}
        readOnly={readOnly}
      />

      <div className="html-form-permission-block html-form-rules-block">
        <h3 className="html-form-permission-block__title">Rules &amp; Regulations Agreement</h3>
        <p className="html-form-permission-block__text">
          I have read and understood the rules and regulations of the school. I agree to abide by them
          and ensure my child follows the school&apos;s code of conduct, dress code, and attendance policies.
        </p>
        <div className="html-form-permission-sign">
          <LineInput label="Date" type="date" value={permissions.verification?.date} onChange={(v) => set('permissions.verification.date', v)} readOnly={readOnly} />
          <LineInput label="Place" value={permissions.verification?.place} onChange={(v) => set('permissions.verification.place', v)} readOnly={readOnly} />
          <SignatureInput label="Signature of Parent / Guardian" value={permissions.verification?.signature} onChange={(v) => set('permissions.verification.signature', v)} readOnly={readOnly} />
        </div>
      </div>

      <SectionTitle>For Office Use Only</SectionTitle>
      {!isAdmin && (
        <p className="html-form-admin-note no-print">Office use fields are visible to school administrators only when printing submitted forms.</p>
      )}
      <div className={`html-form-office-use ${!isAdmin ? 'html-form-office-use--restricted' : ''}`}>
        <LineInput label="Class Details" value={officeUse.classDetails} onChange={(v) => set('officeUse.classDetails', v)} readOnly={officeReadOnly} />
        <div className="html-form-row html-form-row--2">
          <BoxInput label="Term" value={officeUse.term} onChange={(v) => set('officeUse.term', v)} readOnly={officeReadOnly} />
          <BoxInput label="Invoice / Receipt No." value={officeUse.invoiceReceiptNo} onChange={(v) => set('officeUse.invoiceReceiptNo', v)} readOnly={officeReadOnly} />
        </div>
        <div className="html-form-row html-form-row--2">
          <BoxInput label="Timing" value={officeUse.timing} onChange={(v) => set('officeUse.timing', v)} readOnly={officeReadOnly} />
          <BoxInput label="Amount" value={officeUse.amount} onChange={(v) => set('officeUse.amount', v)} readOnly={officeReadOnly} />
        </div>
        <div className="html-form-row html-form-row--2">
          <BoxInput label="Date" type="date" value={officeUse.date} onChange={(v) => set('officeUse.date', v)} readOnly={officeReadOnly} />
          <SignatureInput label="Authorized Signature" value={officeUse.signature} onChange={(v) => set('officeUse.signature', v)} readOnly={officeReadOnly} />
        </div>
      </div>
    </PrintPage>
  );
}
