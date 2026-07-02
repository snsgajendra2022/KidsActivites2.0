import FileUpload from '../upload/SmartFileUpload.jsx';
import { SignaturePad } from '../ui/index.jsx';
import { getFieldInputConstraints, isFieldFilled } from '../../utils/fieldValidation.js';
import { getValidationHint } from '../../constants/enrollmentValidation.js';
import {
  CountrySelect,
  StateSelect,
  CitySelect,
} from './CountryStateCitySelect.jsx';
import {
  EnrollmentFormRow,
  EnrollmentFormSplit,
  EnrollmentInlineInput,
  EnrollmentInlineSelect,
  EnrollmentInlineTextarea,
  EnrollmentSquareRadioGroup,
  EnrollmentSquareCheckbox,
} from './EnrollmentFormLayout.jsx';

function renderControl(field, value, onChange, form, sectionKey, update) {
  const section = form[sectionKey] || {};
  const constraints = getFieldInputConstraints(field, section);
  const common = {
    value: value ?? '',
    onChange: (e) => onChange(typeof e === 'object' && e?.target ? e.target.value : e),
    ...constraints,
  };

  const patchSection = (patch) => {
    Object.entries(patch).forEach(([key, val]) => update(sectionKey, key, val));
  };

  switch (field.type) {
    case 'textarea':
      return (
        <EnrollmentInlineTextarea
          value={value ?? ''}
          onChange={(e) => onChange(e.target.value)}
          placeholder={field.placeholder}
          maxLength={constraints.maxLength}
        />
      );
    case 'select':
      return (
        <EnrollmentInlineSelect
          options={field.options || []}
          placeholder={field.placeholder}
          value={value ?? ''}
          onChange={(e) => onChange(e.target.value)}
        />
      );
    case 'radio':
      return (
        <EnrollmentSquareRadioGroup
          name={field.key}
          options={field.options || []}
          value={value ?? ''}
          onChange={onChange}
        />
      );
    case 'checkbox':
      return (
        <EnrollmentSquareCheckbox
          label={field.label}
          checked={Boolean(value)}
          onChange={(checked) => {
            onChange(checked);
            if (field.key === 'sameAsCurrent' && checked && sectionKey === 'address') {
              update('address', 'permanentAddress', form.address?.currentAddress || '');
            }
          }}
        />
      );
    case 'email':
      return <EnrollmentInlineInput type="email" {...common} placeholder={field.placeholder} />;
    case 'tel':
      return <EnrollmentInlineInput type="tel" {...common} placeholder={field.placeholder} />;
    case 'date':
      return <EnrollmentInlineInput type="date" {...common} />;
    case 'file':
      return (
        <FileUpload
          fieldKey={field.key}
          label=""
          category={field.fileCategory || 'document'}
          maxSizeMB={field.validation?.maxSizeMB}
          required={field.required}
          value={value}
          onChange={onChange}
        />
      );
    case 'country':
      return (
        <CountrySelect
          countryCode={section.countryCode}
          onChange={patchSection}
        />
      );
    case 'state':
      return (
        <StateSelect
          countryCode={section.countryCode}
          stateCode={section.stateCode}
          stateName={section.state}
          onChange={patchSection}
        />
      );
    case 'city':
      return (
        <CitySelect
          countryCode={section.countryCode}
          stateCode={section.stateCode}
          value={value}
          onChange={(city) => update(sectionKey, 'city', city)}
        />
      );
    default:
      return <EnrollmentInlineInput type="text" {...common} placeholder={field.placeholder} />;
  }
}

function FormFieldRow({ field, form, sectionKey, errors, update }) {
  const errorKey = field.type === 'file'
    ? `documents.${field.key}`
    : `${sectionKey}.${field.key}`;

  if (field.type === 'checkbox') {
    return (
      <div className="enrollment-form-checkbox-row" key={field.id}>
        {renderControl(
          field,
          form[sectionKey]?.[field.key],
          (v) => update(sectionKey, field.key, v),
          form,
          sectionKey,
          update,
        )}
        {errors[errorKey] && (
          <p className="enrollment-form-row__error" role="alert">{errors[errorKey]}</p>
        )}
      </div>
    );
  }

  const section = form[sectionKey] || {};
  const fieldValue = form[sectionKey]?.[field.key];
  const filled = isFieldFilled(field, fieldValue, section);
  const hint = filled || field.type === 'file' ? '' : getValidationHint(field, section);

  return (
    <EnrollmentFormRow
      key={field.id}
      label={field.label}
      wide={field.wideLabel}
      required={field.required}
      stacked={field.stacked}
      error={errors[errorKey]}
      footerHint={hint}
    >
      {renderControl(
        field,
        field.type === 'file' ? form.documents?.[field.key] : form[sectionKey]?.[field.key],
        field.type === 'file'
          ? (data) => update('documents', field.key, data ? { ...data, status: 'uploaded' } : null, true)
          : (v) => update(sectionKey, field.key, v),
        form,
        sectionKey,
        update,
      )}
    </EnrollmentFormRow>
  );
}

function groupFields(fields = []) {
  const groups = [];
  let halfBuffer = [];

  fields.forEach((field) => {
    if (field.width === 'half' && field.type !== 'checkbox') {
      halfBuffer.push(field);
      if (halfBuffer.length === 2) {
        groups.push({ type: 'split', fields: [...halfBuffer] });
        halfBuffer = [];
      }
    } else {
      if (halfBuffer.length) {
        groups.push({ type: 'split', fields: [...halfBuffer] });
        halfBuffer = [];
      }
      groups.push({ type: 'single', field });
    }
  });

  if (halfBuffer.length) {
    groups.push({ type: 'split', fields: [...halfBuffer] });
  }

  return groups;
}

export function DynamicFormStepFields({ step, form, errors, update }) {
  const groups = groupFields(step.fields);

  return (
    <>
      {groups.map((group) => {
        if (group.type === 'split') {
          return (
            <EnrollmentFormSplit key={group.fields.map((f) => f.id).join('-')}>
              {group.fields.map((field) => (
                <FormFieldRow
                  key={field.id}
                  field={field}
                  form={form}
                  sectionKey={step.sectionKey}
                  errors={errors}
                  update={update}
                />
              ))}
            </EnrollmentFormSplit>
          );
        }
        return (
          <FormFieldRow
            key={group.field.id}
            field={group.field}
            form={form}
            sectionKey={step.sectionKey}
            errors={errors}
            update={update}
          />
        );
      })}
    </>
  );
}

export function DynamicDocumentStepFields({ step, form, errors, updateDoc, applicationId, schoolId }) {
  return (
    <div className="enrollment-documents">
      {(step.fields || []).map((field) => {
        const errorKey = `documents.${field.key}`;
        return (
          <div key={field.id} className="enrollment-doc-upload">
            <div className="enrollment-doc-upload__head">
              <label className="enrollment-doc-upload__label" htmlFor={`upload-${field.key}`}>
                {field.label}
                {field.required && (
                  <span className="enrollment-required" aria-hidden="true">*</span>
                )}
              </label>
              {field.required ? (
                <span className="enrollment-doc-upload__badge enrollment-doc-upload__badge--required">Required</span>
              ) : (
                <span className="enrollment-doc-upload__badge">Optional</span>
              )}
            </div>
            <div className="enrollment-doc-upload__drop" id={`upload-${field.key}`}>
              <FileUpload
                fieldKey={field.key}
                label=""
                category={field.fileCategory || 'document'}
                maxSizeMB={field.validation?.maxSizeMB}
                required={field.required}
                value={form.documents?.[field.key]}
                onChange={(data) => updateDoc(field.key, data)}
                applicationId={applicationId}
                schoolId={schoolId}
              />
            </div>
            {errors[errorKey] && (
              <p className="enrollment-doc-upload__error" role="alert">{errors[errorKey]}</p>
            )}
          </div>
        );
      })}
    </div>
  );
}

export function DynamicDeclarationStep({ step, form, errors, update }) {
  return (
    <div className="enrollment-signature-block">
      <div>
        <div className="enrollment-declaration-box space-y-3">
          {(step.declarations || []).map((decl) => (
            <EnrollmentSquareCheckbox
              key={decl.id}
              label={decl.text}
              checked={Boolean(form.declaration?.[decl.key])}
              onChange={(v) => update('declaration', decl.key, v)}
            />
          ))}
        </div>
        {errors.declaration && (
          <p className="mt-2 text-[10px] font-semibold text-[#C81E1E]">{errors.declaration}</p>
        )}
      </div>

      <div>
        <p className="enrollment-signature-label">
          Digital Signature <span className="enrollment-required" aria-hidden="true">*</span>
        </p>
        <div className="enrollment-signature-pad-wrap">
          <SignaturePad
            value={form.declaration?.signature}
            onChange={(sig) => update('declaration', 'signature', sig)}
          />
        </div>
        {errors.signature && (
          <p className="mt-2 text-[10px] font-semibold text-[#C81E1E]">{errors.signature}</p>
        )}
        {(step.fields || []).map((field) => (
          <div className="mt-4" key={field.id}>
            <EnrollmentFormRow label={field.label}>
              <EnrollmentInlineInput
                type="date"
                value={form.declaration?.[field.key] ?? ''}
                onChange={(e) => update('declaration', field.key, e.target.value)}
              />
            </EnrollmentFormRow>
          </div>
        ))}
      </div>
    </div>
  );
}

export function DynamicReviewStep({ form, config }) {
  const sections = (config?.steps || []).filter((s) => s.stepType === 'form');

  return (
    <>
      {sections.map((step) => (
        <div key={step.id} className="enrollment-review-block">
          <h4>{step.title}</h4>
          {Object.entries(form[step.sectionKey] || {})
            .filter(([k, v]) => !['countryCode', 'stateCode'].includes(k) && v !== '' && v !== false && v != null && typeof v !== 'object')
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
        {Object.entries(form.documents || {})
          .filter(([, v]) => v)
          .map(([k, v]) => (
            <dl key={k} className="enrollment-review-item">
              <dt>{k.replace(/([A-Z])/g, ' $1').trim()}</dt>
              <dd>{v.name}</dd>
            </dl>
          ))}
      </div>
    </>
  );
}
