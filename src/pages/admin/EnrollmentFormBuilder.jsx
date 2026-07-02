import { useState } from 'react';
import {
  ChevronDown, ChevronUp, GripVertical, Plus, RotateCcw, Trash2,
} from 'lucide-react';
import {
  DEFAULT_ENROLLMENT_FORM,
  ENROLLMENT_FIELD_TYPES,
  ENROLLMENT_STEP_TYPES,
  cloneEnrollmentFormConfig,
} from '../../data/defaultEnrollmentFormConfig.js';
import { newFieldId, newStepId, slugifyFieldKey } from '../../utils/enrollmentFormUtils.js';
import { VALIDATION_PRESETS, getValidationHint } from '../../constants/enrollmentValidation.js';

function updateFieldValidation(field, patch) {
  const validation = { ...(field.validation || {}), ...patch };
  Object.keys(validation).forEach((key) => {
    if (validation[key] === '' || validation[key] == null) delete validation[key];
  });
  return { ...field, validation: Object.keys(validation).length ? validation : undefined };
}

function parseOptions(text) {
  return text
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const [value, ...rest] = line.split('|');
      const label = rest.join('|').trim() || value.trim();
      return { value: value.trim(), label };
    });
}

function formatOptions(options = []) {
  return options.map((o) => `${o.value}|${o.label}`).join('\n');
}

function FieldEditor({ field, onChange, onRemove, stepType }) {
  const allowedTypes = stepType === 'documents'
    ? ENROLLMENT_FIELD_TYPES.filter((t) => t.value === 'file')
    : ENROLLMENT_FIELD_TYPES.filter((t) => !['file', 'signature'].includes(t.value));

  return (
    <div className="rounded-xl border border-black/5 bg-white p-4">
      <div className="mb-3 flex items-start justify-between gap-2">
        <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-muted">
          <GripVertical size={14} className="opacity-40" />
          Field
        </div>
        <button type="button" onClick={onRemove} className="rounded-lg p-1 text-rose-600 hover:bg-rose-50">
          <Trash2 size={14} />
        </button>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <label className="block text-sm">
          <span className="mb-1 block font-semibold text-brand">Label</span>
          <input
            className="w-full rounded-lg border border-black/10 px-3 py-2 text-sm"
            value={field.label}
            onChange={(e) => onChange({ ...field, label: e.target.value, key: field.key || slugifyFieldKey(e.target.value) })}
          />
        </label>
        <label className="block text-sm">
          <span className="mb-1 block font-semibold text-brand">Field Key</span>
          <input
            className="w-full rounded-lg border border-black/10 px-3 py-2 text-sm font-mono"
            value={field.key}
            onChange={(e) => onChange({ ...field, key: e.target.value.replace(/\s/g, '') })}
          />
        </label>
        <label className="block text-sm">
          <span className="mb-1 block font-semibold text-brand">Type</span>
          <select
            className="w-full rounded-lg border border-black/10 px-3 py-2 text-sm"
            value={field.type}
            onChange={(e) => onChange({ ...field, type: e.target.value })}
          >
            {allowedTypes.map((t) => (
              <option key={t.value} value={t.value}>{t.label}</option>
            ))}
          </select>
        </label>
        <label className="block text-sm">
          <span className="mb-1 block font-semibold text-brand">Width</span>
          <select
            className="w-full rounded-lg border border-black/10 px-3 py-2 text-sm"
            value={field.width || 'full'}
            onChange={(e) => onChange({ ...field, width: e.target.value })}
          >
            <option value="full">Full Row</option>
            <option value="half">Half Row</option>
          </select>
        </label>
        <label className="block text-sm sm:col-span-2">
          <span className="mb-1 block font-semibold text-brand">Placeholder</span>
          <input
            className="w-full rounded-lg border border-black/10 px-3 py-2 text-sm"
            value={field.placeholder || ''}
            onChange={(e) => onChange({ ...field, placeholder: e.target.value })}
          />
        </label>
      </div>

      <div className="mt-3 flex flex-wrap gap-4 text-sm">
        <label className="flex items-center gap-2">
          <input type="checkbox" checked={Boolean(field.required)} onChange={(e) => onChange({ ...field, required: e.target.checked })} />
          Required
        </label>
        <label className="flex items-center gap-2">
          <input type="checkbox" checked={Boolean(field.stacked)} onChange={(e) => onChange({ ...field, stacked: e.target.checked })} />
          Stacked layout
        </label>
        <label className="flex items-center gap-2">
          <input type="checkbox" checked={Boolean(field.wideLabel)} onChange={(e) => onChange({ ...field, wideLabel: e.target.checked })} />
          Wide label
        </label>
      </div>

      {(field.type === 'select' || field.type === 'radio') && (
        <label className="mt-3 block text-sm">
          <span className="mb-1 block font-semibold text-brand">Options (value|label per line)</span>
          <textarea
            className="w-full rounded-lg border border-black/10 px-3 py-2 font-mono text-xs"
            rows={4}
            value={formatOptions(field.options)}
            onChange={(e) => onChange({ ...field, options: parseOptions(e.target.value) })}
            placeholder={'male|Male\nfemale|Female'}
          />
        </label>
      )}

      {field.type === 'file' && (
        <>
          <label className="mt-3 block text-sm">
            <span className="mb-1 block font-semibold text-brand">File category</span>
            <select
              className="w-full rounded-lg border border-black/10 px-3 py-2 text-sm"
              value={field.fileCategory || 'document'}
              onChange={(e) => onChange({ ...field, fileCategory: e.target.value })}
            >
              <option value="document">Document (PDF, JPG, PNG — max 5 MB)</option>
              <option value="photo">Photo (JPG, PNG, WEBP — max 2 MB)</option>
            </select>
          </label>
        </>
      )}

      <div className="mt-4 rounded-xl border border-black/5 bg-[#fafbfe] p-4">
        <p className="mb-3 text-xs font-bold uppercase tracking-wide text-muted">Validation Rules</p>
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="block text-sm sm:col-span-2">
            <span className="mb-1 block font-semibold text-brand">Validation Preset</span>
            <select
              className="w-full rounded-lg border border-black/10 px-3 py-2 text-sm"
              value={field.validation?.preset || ''}
              onChange={(e) => onChange(updateFieldValidation(field, { preset: e.target.value || undefined }))}
            >
              {VALIDATION_PRESETS.map((p) => (
                <option key={p.value || 'auto'} value={p.value}>{p.label}</option>
              ))}
            </select>
          </label>
          <label className="block text-sm">
            <span className="mb-1 block font-semibold text-brand">Min Length</span>
            <input
              type="number"
              min="0"
              className="w-full rounded-lg border border-black/10 px-3 py-2 text-sm"
              value={field.validation?.minLength ?? ''}
              onChange={(e) => onChange(updateFieldValidation(field, {
                minLength: e.target.value === '' ? undefined : Number(e.target.value),
              }))}
            />
          </label>
          <label className="block text-sm">
            <span className="mb-1 block font-semibold text-brand">Max Length</span>
            <input
              type="number"
              min="1"
              className="w-full rounded-lg border border-black/10 px-3 py-2 text-sm"
              value={field.validation?.maxLength ?? ''}
              onChange={(e) => onChange(updateFieldValidation(field, {
                maxLength: e.target.value === '' ? undefined : Number(e.target.value),
              }))}
            />
          </label>
          {field.type === 'date' && (
            <>
              <label className="block text-sm">
                <span className="mb-1 block font-semibold text-brand">Min Age (years)</span>
                <input
                  type="number"
                  min="0"
                  className="w-full rounded-lg border border-black/10 px-3 py-2 text-sm"
                  value={field.validation?.minAge ?? ''}
                  onChange={(e) => onChange(updateFieldValidation(field, {
                    minAge: e.target.value === '' ? undefined : Number(e.target.value),
                  }))}
                />
              </label>
              <label className="block text-sm">
                <span className="mb-1 block font-semibold text-brand">Max Age (years)</span>
                <input
                  type="number"
                  min="0"
                  className="w-full rounded-lg border border-black/10 px-3 py-2 text-sm"
                  value={field.validation?.maxAge ?? ''}
                  onChange={(e) => onChange(updateFieldValidation(field, {
                    maxAge: e.target.value === '' ? undefined : Number(e.target.value),
                  }))}
                />
              </label>
            </>
          )}
          {field.type === 'file' && (
            <label className="block text-sm">
              <span className="mb-1 block font-semibold text-brand">Max File Size (MB)</span>
              <input
                type="number"
                min="1"
                max="20"
                className="w-full rounded-lg border border-black/10 px-3 py-2 text-sm"
                value={field.validation?.maxSizeMB ?? ''}
                onChange={(e) => onChange(updateFieldValidation(field, {
                  maxSizeMB: e.target.value === '' ? undefined : Number(e.target.value),
                }))}
              />
            </label>
          )}
          <label className="block text-sm sm:col-span-2">
            <span className="mb-1 block font-semibold text-brand">Custom Regex Pattern</span>
            <input
              className="w-full rounded-lg border border-black/10 px-3 py-2 font-mono text-xs"
              value={field.validation?.pattern || ''}
              onChange={(e) => onChange(updateFieldValidation(field, { pattern: e.target.value || undefined }))}
              placeholder="^[A-Z0-9]+$"
            />
          </label>
          <label className="block text-sm sm:col-span-2">
            <span className="mb-1 block font-semibold text-brand">Custom Error Message</span>
            <input
              className="w-full rounded-lg border border-black/10 px-3 py-2 text-sm"
              value={field.validation?.patternMessage || ''}
              onChange={(e) => onChange(updateFieldValidation(field, { patternMessage: e.target.value || undefined }))}
              placeholder="Shown when validation fails"
            />
          </label>
        </div>
        {getValidationHint(field) && (
          <p className="mt-3 text-xs text-muted">
            Active rules: {getValidationHint(field)}
          </p>
        )}
      </div>
    </div>
  );
}

export default function EnrollmentFormBuilder({ value, onChange }) {
  const [activeStepIdx, setActiveStepIdx] = useState(0);
  const steps = value?.steps || [];
  const activeStep = steps[activeStepIdx];

  const updateSteps = (nextSteps) => {
    onChange({ ...value, steps: nextSteps });
  };

  const updateStep = (patch) => {
    const next = steps.map((s, i) => (i === activeStepIdx ? { ...s, ...patch } : s));
    updateSteps(next);
  };

  const moveStep = (idx, dir) => {
    const next = [...steps];
    const target = idx + dir;
    if (target < 0 || target >= next.length) return;
    [next[idx], next[target]] = [next[target], next[idx]];
    updateSteps(next);
    setActiveStepIdx(target);
  };

  const addStep = () => {
    const id = newStepId();
    const step = {
      id,
      title: 'New Section',
      stepType: 'form',
      sectionKey: `section${steps.length + 1}`,
      notes: '',
      fields: [],
    };
    const reviewIdx = steps.findIndex((s) => s.stepType === 'review');
    const next = [...steps];
    if (reviewIdx >= 0) next.splice(reviewIdx, 0, step);
    else next.push(step);
    updateSteps(next);
    setActiveStepIdx(reviewIdx >= 0 ? reviewIdx : next.length - 1);
  };

  const removeStep = (idx) => {
    if (steps.length <= 1) return;
    const next = steps.filter((_, i) => i !== idx);
    updateSteps(next);
    setActiveStepIdx(Math.max(0, idx - 1));
  };

  const addField = () => {
    const field = {
      id: newFieldId(),
      key: `field${(activeStep.fields?.length || 0) + 1}`,
      label: 'New Field',
      type: activeStep.stepType === 'documents' ? 'file' : 'text',
      width: 'full',
      fileCategory: 'document',
    };
    updateStep({ fields: [...(activeStep.fields || []), field] });
  };

  const updateField = (fieldIdx, field) => {
    const fields = (activeStep.fields || []).map((f, i) => (i === fieldIdx ? field : f));
    updateStep({ fields });
  };

  const removeField = (fieldIdx) => {
    updateStep({ fields: (activeStep.fields || []).filter((_, i) => i !== fieldIdx) });
  };

  const moveField = (fieldIdx, dir) => {
    const fields = [...(activeStep.fields || [])];
    const target = fieldIdx + dir;
    if (target < 0 || target >= fields.length) return;
    [fields[fieldIdx], fields[target]] = [fields[target], fields[fieldIdx]];
    updateStep({ fields });
  };

  const addDeclaration = () => {
    const decl = {
      id: newFieldId(),
      key: `declaration${(activeStep.declarations?.length || 0) + 1}`,
      text: 'I confirm the information provided is accurate.',
      required: false,
    };
    updateStep({ declarations: [...(activeStep.declarations || []), decl] });
  };

  const resetDefaults = () => {
    onChange(cloneEnrollmentFormConfig(DEFAULT_ENROLLMENT_FORM));
    setActiveStepIdx(0);
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-muted">
          Build the public enrollment form at <strong>/enroll</strong> — sections, field types, labels, and validation.
        </p>
        <button type="button" onClick={resetDefaults} className="premium-btn premium-btn-secondary premium-btn-sm">
          <RotateCcw size={14} />
          Reset to Default
        </button>
      </div>

      <div className="grid gap-4 lg:grid-cols-[240px_1fr]">
        <div className="sb-card p-3">
          <div className="mb-2 flex items-center justify-between">
            <p className="text-xs font-bold uppercase tracking-wide text-muted">Sections</p>
            <button type="button" onClick={addStep} className="rounded-lg p-1 text-accent hover:bg-brand-muted">
              <Plus size={16} />
            </button>
          </div>
          <div className="space-y-1">
            {steps.map((s, idx) => (
              <button
                key={s.id}
                type="button"
                onClick={() => setActiveStepIdx(idx)}
                className={`flex w-full items-center justify-between rounded-lg px-3 py-2 text-left text-sm transition-colors ${
                  idx === activeStepIdx ? 'bg-brand-muted font-semibold text-brand' : 'hover:bg-[#fafbfe] text-[#45474c]'
                }`}
              >
                <span className="truncate">{s.title}</span>
                <span className="ml-2 shrink-0 text-[10px] uppercase text-muted">{s.stepType}</span>
              </button>
            ))}
          </div>
        </div>

        {activeStep && (
          <div className="sb-card space-y-4 p-5">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h3 className="text-base font-bold text-brand">Edit Section</h3>
              <div className="flex gap-1">
                <button type="button" onClick={() => moveStep(activeStepIdx, -1)} className="rounded-lg border border-black/5 p-2 hover:bg-[#fafbfe]">
                  <ChevronUp size={14} />
                </button>
                <button type="button" onClick={() => moveStep(activeStepIdx, 1)} className="rounded-lg border border-black/5 p-2 hover:bg-[#fafbfe]">
                  <ChevronDown size={14} />
                </button>
                {activeStep.stepType !== 'review' && (
                  <button type="button" onClick={() => removeStep(activeStepIdx)} className="rounded-lg border border-rose-100 p-2 text-rose-600 hover:bg-rose-50">
                    <Trash2 size={14} />
                  </button>
                )}
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <label className="block text-sm sm:col-span-2">
                <span className="mb-1 block font-semibold text-brand">Section Title</span>
                <input
                  className="w-full rounded-lg border border-black/10 px-3 py-2 text-sm"
                  value={activeStep.title}
                  onChange={(e) => updateStep({ title: e.target.value })}
                />
              </label>
              <label className="block text-sm">
                <span className="mb-1 block font-semibold text-brand">Section Type</span>
                <select
                  className="w-full rounded-lg border border-black/10 px-3 py-2 text-sm"
                  value={activeStep.stepType}
                  disabled={activeStep.stepType === 'review'}
                  onChange={(e) => updateStep({ stepType: e.target.value })}
                >
                  {ENROLLMENT_STEP_TYPES.map((t) => (
                    <option key={t.value} value={t.value}>{t.label}</option>
                  ))}
                </select>
              </label>
              {activeStep.stepType === 'form' && (
                <label className="block text-sm">
                  <span className="mb-1 block font-semibold text-brand">Data Section Key</span>
                  <input
                    className="w-full rounded-lg border border-black/10 px-3 py-2 text-sm font-mono"
                    value={activeStep.sectionKey || ''}
                    onChange={(e) => updateStep({ sectionKey: e.target.value.replace(/\s/g, '') })}
                    placeholder="student, parent, address…"
                  />
                </label>
              )}
              <label className="block text-sm sm:col-span-2">
                <span className="mb-1 block font-semibold text-brand">Notes (sidebar help text)</span>
                <textarea
                  className="w-full rounded-lg border border-black/10 px-3 py-2 text-sm"
                  rows={2}
                  value={activeStep.notes || ''}
                  onChange={(e) => updateStep({ notes: e.target.value })}
                />
              </label>
            </div>

            {activeStep.stepType === 'declaration' && (
              <div className="space-y-3 border-t border-black/5 pt-4">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-semibold text-brand">Declaration Checkboxes</p>
                  <button type="button" onClick={addDeclaration} className="premium-btn premium-btn-secondary premium-btn-sm">
                    <Plus size={14} /> Add
                  </button>
                </div>
                {(activeStep.declarations || []).map((decl, idx) => (
                  <div key={decl.id} className="rounded-xl border border-black/5 bg-[#fafbfe] p-3">
                    <textarea
                      className="mb-2 w-full rounded-lg border border-black/10 px-3 py-2 text-sm"
                      rows={2}
                      value={decl.text}
                      onChange={(e) => {
                        const declarations = [...activeStep.declarations];
                        declarations[idx] = { ...decl, text: e.target.value };
                        updateStep({ declarations });
                      }}
                    />
                    <div className="flex items-center justify-between gap-2">
                      <label className="flex items-center gap-2 text-xs">
                        <input
                          type="checkbox"
                          checked={Boolean(decl.required)}
                          onChange={(e) => {
                            const declarations = [...activeStep.declarations];
                            declarations[idx] = { ...decl, required: e.target.checked };
                            updateStep({ declarations });
                          }}
                        />
                        Required
                      </label>
                      <button
                        type="button"
                        onClick={() => updateStep({ declarations: activeStep.declarations.filter((_, i) => i !== idx) })}
                        className="text-xs text-rose-600 hover:underline"
                      >
                        Remove
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {(activeStep.stepType === 'form' || activeStep.stepType === 'documents') && (
              <div className="space-y-3 border-t border-black/5 pt-4">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-semibold text-brand">Fields</p>
                  <button type="button" onClick={addField} className="premium-btn premium-btn-secondary premium-btn-sm">
                    <Plus size={14} /> Add Field
                  </button>
                </div>
                {(activeStep.fields || []).map((field, idx) => (
                  <div key={field.id} className="space-y-2">
                    <div className="flex justify-end gap-1">
                      <button type="button" onClick={() => moveField(idx, -1)} className="rounded p-1 hover:bg-black/5"><ChevronUp size={12} /></button>
                      <button type="button" onClick={() => moveField(idx, 1)} className="rounded p-1 hover:bg-black/5"><ChevronDown size={12} /></button>
                    </div>
                    <FieldEditor
                      field={field}
                      stepType={activeStep.stepType}
                      onChange={(f) => updateField(idx, f)}
                      onRemove={() => removeField(idx)}
                    />
                  </div>
                ))}
                {!activeStep.fields?.length && (
                  <p className="rounded-xl border border-dashed border-black/10 py-8 text-center text-sm text-muted">
                    No fields yet. Click &quot;Add Field&quot; to create inputs, selects, textareas, or file uploads.
                  </p>
                )}
              </div>
            )}

            {activeStep.stepType === 'review' && (
              <p className="rounded-xl border border-black/5 bg-[#fafbfe] p-4 text-sm text-muted">
                Review step is auto-generated from all form and document sections. Parents see a summary before submit.
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
