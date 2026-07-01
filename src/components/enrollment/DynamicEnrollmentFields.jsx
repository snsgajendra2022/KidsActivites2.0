import FileUpload from '../upload/SmartFileUpload.jsx';
import { SignaturePad } from '../ui/index.jsx';
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
  const common = {
    value: value ?? '',
    onChange: (e) => onChange(typeof e === 'object' && e?.target ? e.target.value : e),
  };

  switch (field.type) {
    case 'textarea':
      return (
        <EnrollmentInlineTextarea
          value={value ?? ''}
          onChange={(e) => onChange(e.target.value)}
          placeholder={field.placeholder}
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
          required={field.required}
          value={value}
          onChange={onChange}
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

  return (
    <EnrollmentFormRow
      key={field.id}
      label={field.label}
      wide={field.wideLabel}
      required={field.required}
      stacked={field.stacked}
      error={errors[errorKey]}
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

export function DynamicDocumentStepFields({ step, form, errors, updateDoc }) {
  return (
    <>
      {(step.fields || []).map((field) => (
        <div key={field.id} className="enrollment-doc-row">
          <EnrollmentFormRow
            label={field.label}
            wide={field.wideLabel}
            required={field.required}
            error={errors[`documents.${field.key}`]}
          >
            <FileUpload
              fieldKey={field.key}
              label=""
              category={field.fileCategory || 'document'}
              required={field.required}
              value={form.documents?.[field.key]}
              onChange={(data) => updateDoc(field.key, data)}
            />
          </EnrollmentFormRow>
        </div>
      ))}
    </>
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
            .filter(([, v]) => v !== '' && v !== false && v != null && typeof v !== 'object')
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
