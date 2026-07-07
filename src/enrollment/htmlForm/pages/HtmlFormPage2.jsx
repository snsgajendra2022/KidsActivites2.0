import FormHeader from '../components/FormHeader.jsx';
import PrintPage from '../components/PrintPage.jsx';
import SectionTitle from '../components/SectionTitle.jsx';
import LineInput from '../components/LineInput.jsx';
import PaperCheckbox from '../components/PaperCheckbox.jsx';
import PaperTextarea from '../components/PaperTextarea.jsx';

export default function HtmlFormPage2({
  formData,
  onChange,
  readOnly,
  schoolName,
  logoUrl,
}) {
  const set = (path, value) => onChange(path, value);
  const doctor = formData.doctor || {};
  const health = formData.health || {};

  return (
    <PrintPage pageNumber={2}>
      <FormHeader schoolName={schoolName} logoUrl={logoUrl} />

      <SectionTitle>Family Doctor</SectionTitle>
      <LineInput label="Doctor Name" value={doctor.name} onChange={(v) => set('doctor.name', v)} readOnly={readOnly} />
      <PaperTextarea label="Address" value={doctor.address} onChange={(v) => set('doctor.address', v)} readOnly={readOnly} rows={2} />
      <div className="html-form-row html-form-row--3">
        <LineInput label="PIN" value={doctor.pin} onChange={(v) => set('doctor.pin', v)} readOnly={readOnly} />
        <LineInput label="Home Phone" value={doctor.homePhone} onChange={(v) => set('doctor.homePhone', v)} readOnly={readOnly} />
        <LineInput label="Mobile" value={doctor.mobile} onChange={(v) => set('doctor.mobile', v)} readOnly={readOnly} />
      </div>
      <LineInput label="Email" value={doctor.email} onChange={(v) => set('doctor.email', v)} readOnly={readOnly} />

      <SectionTitle>Health Information</SectionTitle>
      <p className="html-form-instruction">
        Please answer the following questions. If yes, provide details in the space provided.
      </p>

      <div className="html-form-health-block">
        <div className="html-form-health-question">
          <PaperCheckbox
            label="Does the child have any allergies?"
            checked={health.allergies}
            onChange={(v) => set('health.allergies', v)}
            readOnly={readOnly}
          />
        </div>
        <PaperTextarea
          label="If yes, please explain"
          value={health.allergiesExplanation}
          onChange={(v) => set('health.allergiesExplanation', v)}
          readOnly={readOnly}
          rows={2}
        />
      </div>

      <div className="html-form-health-block">
        <div className="html-form-health-question">
          <PaperCheckbox
            label="Does the child have any physical issues / disabilities?"
            checked={health.physicalIssues}
            onChange={(v) => set('health.physicalIssues', v)}
            readOnly={readOnly}
          />
        </div>
        <PaperTextarea
          label="If yes, please explain"
          value={health.physicalIssuesExplanation}
          onChange={(v) => set('health.physicalIssuesExplanation', v)}
          readOnly={readOnly}
          rows={2}
        />
      </div>

      <div className="html-form-health-block">
        <div className="html-form-health-question">
          <PaperCheckbox
            label="Does the child require daily medication?"
            checked={health.dailyMedication}
            onChange={(v) => set('health.dailyMedication', v)}
            readOnly={readOnly}
          />
        </div>
        <PaperTextarea
          label="If yes, please explain"
          value={health.dailyMedicationExplanation}
          onChange={(v) => set('health.dailyMedicationExplanation', v)}
          readOnly={readOnly}
          rows={2}
        />
      </div>

      <PaperTextarea
        label="Any further information the school should know about the child's health"
        value={health.furtherInformation}
        onChange={(v) => set('health.furtherInformation', v)}
        readOnly={readOnly}
        rows={4}
      />
      <PaperTextarea
        label="Other comments"
        value={health.otherComments}
        onChange={(v) => set('health.otherComments', v)}
        readOnly={readOnly}
        rows={4}
      />
    </PrintPage>
  );
}
