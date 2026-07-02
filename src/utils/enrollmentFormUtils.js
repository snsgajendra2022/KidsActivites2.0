import { DEFAULT_ENROLLMENT_FORM } from '../data/defaultEnrollmentFormConfig.js';
import { validateFieldValue } from './fieldValidation.js';

export function getEnrollmentSteps(config) {
  return config?.steps?.length ? config.steps : DEFAULT_ENROLLMENT_FORM.steps;
}

export function buildEmptyFormFromConfig(config) {
  const steps = getEnrollmentSteps(config);
  const form = {
    documents: {},
    declaration: {
      accuracyConfirmed: false,
      communicationConsent: false,
      mediaConsent: false,
      signature: null,
      signatureDate: new Date().toISOString().split('T')[0],
    },
  };

  steps.forEach((step) => {
    if (step.stepType === 'form' && step.sectionKey) {
      form[step.sectionKey] = {};
      (step.fields || []).forEach((field) => {
        if (field.type === 'checkbox') {
          form[step.sectionKey][field.key] = false;
        } else {
          form[step.sectionKey][field.key] = field.defaultValue ?? '';
        }
      });
      if (step.sectionKey === 'address') {
        const countryField = (step.fields || []).find((f) => f.type === 'country');
        form[step.sectionKey].countryCode = countryField?.defaultCountryCode || 'IN';
        form[step.sectionKey].stateCode = '';
      }
    }
    if (step.stepType === 'documents') {
      (step.fields || []).forEach((field) => {
        form.documents[field.key] = null;
      });
    }
    if (step.stepType === 'declaration') {
      (step.declarations || []).forEach((decl) => {
        form.declaration[decl.key] = false;
      });
      (step.fields || []).forEach((field) => {
        if (field.key === 'signatureDate' && !form.declaration.signatureDate) {
          form.declaration[field.key] = new Date().toISOString().split('T')[0];
        } else if (field.type !== 'signature') {
          form.declaration[field.key] = field.defaultValue ?? '';
        }
      });
    }
  });

  return form;
}

function validateField(field, value, sectionKey, formSection = {}) {
  const path = field.type === 'file' ? `documents.${field.key}` : `${sectionKey}.${field.key}`;
  const error = validateFieldValue(field, value, formSection);
  return error ? { [path]: error } : {};
}

export function validateDynamicStep(stepIndex, form, config) {
  const steps = getEnrollmentSteps(config);
  const step = steps[stepIndex - 1];
  if (!step) return { success: true, errors: {} };

  const errors = {};

  if (step.stepType === 'form') {
    const formSection = form[step.sectionKey] || {};
    (step.fields || []).forEach((field) => {
      const value = field.type === 'country'
        ? formSection.country
        : formSection[field.key];
      Object.assign(errors, validateField(field, value, step.sectionKey, formSection));
    });
  }

  if (step.stepType === 'documents') {
    (step.fields || []).forEach((field) => {
      const value = form.documents?.[field.key];
      Object.assign(errors, validateField({ ...field, type: 'file' }, value, 'documents'));
    });
  }

  if (step.stepType === 'declaration') {
    (step.declarations || []).forEach((decl) => {
      if (decl.required && !form.declaration?.[decl.key]) {
        errors.declaration = 'Please confirm all required declarations.';
      }
    });
    if (!form.declaration?.signature) {
      errors.signature = 'Signature is required before submitting.';
    }
    (step.fields || []).forEach((field) => {
      const value = form.declaration?.[field.key];
      Object.assign(errors, validateField(field, value, 'declaration'));
    });
  }

  return {
    success: Object.keys(errors).length === 0,
    errors,
  };
}

export function getReviewSections(config) {
  return getEnrollmentSteps(config).filter(
    (s) => s.stepType === 'form' || s.stepType === 'documents',
  );
}

export function formatFieldLabel(key) {
  return key.replace(/([A-Z])/g, ' $1').replace(/^./, (c) => c.toUpperCase()).trim();
}

export function newFieldId() {
  return `field-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
}

export function newStepId() {
  return `step-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
}

export function slugifyFieldKey(label) {
  const base = label
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
    .split(' ')
    .map((w, i) => (i === 0 ? w : w.charAt(0).toUpperCase() + w.slice(1)))
    .join('');
  return base || `field${Date.now()}`;
}
