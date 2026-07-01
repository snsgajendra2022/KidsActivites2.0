import { DEFAULT_ENROLLMENT_FORM } from '../data/defaultEnrollmentFormConfig.js';

const MOBILE_REGEX = /^[6-9]\d{9}$/;
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

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

function validateField(field, value, sectionKey) {
  const path = `${sectionKey}.${field.key}`;
  const label = field.label?.toLowerCase() || 'this field';

  if (field.required) {
    if (field.type === 'checkbox') {
      if (!value) return { [path]: `Please confirm: ${field.label}.` };
      return {};
    }
    if (field.type === 'file') {
      if (!value) return { [`documents.${field.key}`]: `Please upload ${label}.` };
      return {};
    }
    if (!value || (typeof value === 'string' && !value.trim())) {
      return { [path]: `${field.label} is required.` };
    }
  }

  if (!value || (typeof value === 'string' && !value.trim())) return {};

  if (field.type === 'email' && !EMAIL_REGEX.test(value)) {
    return { [path]: 'Please enter a valid email address.' };
  }
  if (field.type === 'tel' && field.required && !MOBILE_REGEX.test(String(value).replace(/\D/g, '').slice(-10))) {
    return { [path]: 'Please enter a valid 10-digit mobile number.' };
  }
  if (field.type === 'tel' && value && !MOBILE_REGEX.test(String(value).replace(/\D/g, '').slice(-10))) {
    return { [path]: 'Please enter a valid 10-digit mobile number.' };
  }

  return {};
}

export function validateDynamicStep(stepIndex, form, config) {
  const steps = getEnrollmentSteps(config);
  const step = steps[stepIndex - 1];
  if (!step) return { success: true, errors: {} };

  const errors = {};

  if (step.stepType === 'form') {
    (step.fields || []).forEach((field) => {
      const value = form[step.sectionKey]?.[field.key];
      Object.assign(errors, validateField(field, value, step.sectionKey));
    });
  }

  if (step.stepType === 'documents') {
    (step.fields || []).forEach((field) => {
      if (field.required && !form.documents?.[field.key]) {
        errors[`documents.${field.key}`] = `Please upload ${field.label.toLowerCase()}.`;
      }
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
