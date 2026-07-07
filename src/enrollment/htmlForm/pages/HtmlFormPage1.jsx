import FormHeader from '../components/FormHeader.jsx';
import PrintPage from '../components/PrintPage.jsx';
import SectionTitle from '../components/SectionTitle.jsx';
import LineInput from '../components/LineInput.jsx';
import PaperCheckbox from '../components/PaperCheckbox.jsx';
import PaperTextarea from '../components/PaperTextarea.jsx';
import PhotoUploadBox from '../components/PhotoUploadBox.jsx';
import {
  CLASS_OPTIONS,
  UNIFORM_SIZES,
  STAYS_WITH_OPTIONS,
} from '../printableEnrollmentFields.js';

export default function HtmlFormPage1({
  formData,
  onChange,
  readOnly,
  schoolName,
  logoUrl,
}) {
  const set = (path, value) => onChange(path, value);
  const child = formData.child || {};

  return (
    <PrintPage pageNumber={1}>
      <FormHeader schoolName={schoolName} logoUrl={logoUrl} />

      <div className="html-form-row html-form-row--3">
        <LineInput label="Tel. No." value={formData.telNo} onChange={(v) => set('telNo', v)} readOnly={readOnly} />
        <LineInput label="Form No." value={formData.formNo} onChange={(v) => set('formNo', v)} readOnly={readOnly} />
        <LineInput label="Admission No." value={formData.admissionNo} onChange={(v) => set('admissionNo', v)} readOnly={readOnly} />
      </div>

      <SectionTitle>Class Enrolled For</SectionTitle>
      <div className="html-form-class-layout">
        <div className="html-form-class-checkboxes">
          {CLASS_OPTIONS.map(({ key, label }) => (
            <PaperCheckbox
              key={key}
              label={label}
              checked={formData.class?.[key]}
              onChange={(v) => set(`class.${key}`, v)}
              readOnly={readOnly}
            />
          ))}
        </div>
        <div className="html-form-class-meta">
          <LineInput label="Batch" value={formData.batch} onChange={(v) => set('batch', v)} readOnly={readOnly} />
          <LineInput label="Timing" value={formData.timing} onChange={(v) => set('timing', v)} readOnly={readOnly} />
        </div>
        <div className="html-form-photos">
          <PhotoUploadBox
            label="Child"
            value={formData.photos?.child}
            onChange={(v) => set('photos.child', v)}
            readOnly={readOnly}
          />
          <PhotoUploadBox
            label="Father"
            value={formData.photos?.father}
            onChange={(v) => set('photos.father', v)}
            readOnly={readOnly}
          />
          <PhotoUploadBox
            label="Mother"
            value={formData.photos?.mother}
            onChange={(v) => set('photos.mother', v)}
            readOnly={readOnly}
          />
        </div>
      </div>

      <SectionTitle>Child Details</SectionTitle>
      <div className="html-form-row html-form-row--3">
        <LineInput label="Surname" value={child.surname} onChange={(v) => set('child.surname', v)} readOnly={readOnly} required />
        <LineInput label="First Name" value={child.firstName} onChange={(v) => set('child.firstName', v)} readOnly={readOnly} required />
        <LineInput label="Middle Name" value={child.middleName} onChange={(v) => set('child.middleName', v)} readOnly={readOnly} />
      </div>

      <div className="html-form-row html-form-row--3">
        <div className="html-form-inline-group">
          <span className="html-form-field__label">Gender</span>
          <PaperCheckbox label="Male" checked={child.gender?.male} onChange={(v) => set('child.gender.male', v)} readOnly={readOnly} />
          <PaperCheckbox label="Female" checked={child.gender?.female} onChange={(v) => set('child.gender.female', v)} readOnly={readOnly} />
        </div>
        <LineInput label="Date of Birth" type="date" value={child.dateOfBirth} onChange={(v) => set('child.dateOfBirth', v)} readOnly={readOnly} required />
        <LineInput label="Place of Birth" value={child.placeOfBirth} onChange={(v) => set('child.placeOfBirth', v)} readOnly={readOnly} />
      </div>

      <div className="html-form-row html-form-row--3">
        <LineInput label="Height" value={child.height} onChange={(v) => set('child.height', v)} readOnly={readOnly} />
        <LineInput label="Weight" value={child.weight} onChange={(v) => set('child.weight', v)} readOnly={readOnly} />
        <LineInput label="Blood Group" value={child.bloodGroup} onChange={(v) => set('child.bloodGroup', v)} readOnly={readOnly} />
      </div>

      <div className="html-form-uniform-row">
        <div>
          <span className="html-form-field__label">Uniform Size (Regular)</span>
          <div className="html-form-size-checkboxes">
            {UNIFORM_SIZES.map((size) => (
              <PaperCheckbox
                key={`reg-${size}`}
                label={size.replace('s', '')}
                checked={child.uniformRegular?.[size]}
                onChange={(v) => set(`child.uniformRegular.${size}`, v)}
                readOnly={readOnly}
              />
            ))}
          </div>
        </div>
        <div>
          <span className="html-form-field__label">Uniform Size (Winter)</span>
          <div className="html-form-size-checkboxes">
            {UNIFORM_SIZES.map((size) => (
              <PaperCheckbox
                key={`win-${size}`}
                label={size.replace('s', '')}
                checked={child.uniformWinter?.[size]}
                onChange={(v) => set(`child.uniformWinter.${size}`, v)}
                readOnly={readOnly}
              />
            ))}
          </div>
        </div>
      </div>

      <LineInput label="Languages Spoken at Home" value={child.languagesAtHome} onChange={(v) => set('child.languagesAtHome', v)} readOnly={readOnly} />
      <PaperTextarea label="Residential Address" value={child.address} onChange={(v) => set('child.address', v)} readOnly={readOnly} rows={2} />
      <div className="html-form-row html-form-row--2">
        <LineInput label="PIN" value={child.pin} onChange={(v) => set('child.pin', v)} readOnly={readOnly} />
        <LineInput label="Contact No." value={child.contactNo} onChange={(v) => set('child.contactNo', v)} readOnly={readOnly} />
      </div>

      <div className="html-form-stays-with">
        <span className="html-form-field__label">Child Stays With</span>
        <div className="html-form-stays-with__options">
          {STAYS_WITH_OPTIONS.map(({ key, label }) => (
            <PaperCheckbox
              key={key}
              label={label}
              checked={child.staysWith?.[key]}
              onChange={(v) => set(`child.staysWith.${key}`, v)}
              readOnly={readOnly}
            />
          ))}
          <LineInput
            label="If Others, specify"
            value={child.staysWith?.othersText}
            onChange={(v) => set('child.staysWith.othersText', v)}
            readOnly={readOnly}
            inline
            className="html-form-stays-with__other"
          />
        </div>
      </div>
    </PrintPage>
  );
}
