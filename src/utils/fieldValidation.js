import {
  PRESET_RULES,
  getDefaultValidationForType,
} from '../constants/enrollmentValidation.js';
import { State } from 'country-state-city';

function resolveValidation(field, context = {}) {
  const validation = {
    ...getDefaultValidationForType(field.type),
    ...(field.validation || {}),
  };

  if (
    (field.key === 'pinCode' || validation.preset === 'pincode_in')
    && context.countryCode
    && context.countryCode !== 'IN'
  ) {
    return { ...validation, preset: 'postal_code' };
  }

  return validation;
}

function normalizeValue(field, value, context = {}) {
  const validation = resolveValidation(field, context);
  const preset = validation.preset ? PRESET_RULES[validation.preset] : null;
  if (preset?.transform) return preset.transform(value);
  return value;
}

function calculateAge(dateValue) {
  const dob = new Date(dateValue);
  if (Number.isNaN(dob.getTime())) return null;
  const today = new Date();
  let age = today.getFullYear() - dob.getFullYear();
  const monthDiff = today.getMonth() - dob.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < dob.getDate())) {
    age -= 1;
  }
  return age;
}

/** Whether the user has entered a value (hides "Required" hint when true). */
export function isFieldFilled(field, value, context = {}) {
  if (field.type === 'checkbox') return Boolean(value);
  if (field.type === 'file') return Boolean(value);
  if (field.type === 'country') return Boolean(context.countryCode);
  if (field.type === 'state') {
    if (!context.countryCode) return false;
    const states = State.getStatesOfCountry(context.countryCode);
    if (states.length > 0) return Boolean(context.stateCode);
    return Boolean(value && String(value).trim());
  }
  if (field.type === 'city') {
    return Boolean(value && String(value).trim());
  }
  if (value == null || value === false) return false;
  if (typeof value === 'string') return value.trim().length > 0;
  return true;
}

/**
 * Validate a single enrollment field value.
 * @param {object} [context] - section data (e.g. countryCode for postal validation)
 * @returns {string|null} error message or null if valid
 */
export function validateFieldValue(field, rawValue, context = {}) {
  const label = field.label || 'This field';
  const validation = resolveValidation(field, context);

  const value = typeof rawValue === 'string' ? rawValue.trim() : rawValue;
  const normalized = normalizeValue(field, value, context);
  const stringValue = normalized == null ? '' : String(normalized).trim();

  if (field.required) {
    if (field.type === 'checkbox' && !rawValue) {
      return `Please confirm: ${label}.`;
    }
    if (field.type === 'file' && !rawValue) {
      return `Please upload ${label.toLowerCase()}.`;
    }
    if (field.type === 'country' && !context.countryCode) {
      return `${label} is required.`;
    }
    if (field.type === 'state' && field.required) {
      if (!context.countryCode) {
        return 'Please select a country first.';
      }
      const states = State.getStatesOfCountry(context.countryCode);
      if (states.length > 0 && !context.stateCode) {
        return `${label} is required.`;
      }
      if (states.length === 0 && !stringValue) {
        return `${label} is required.`;
      }
    }
    if (field.type === 'city' && field.required) {
      if (!context.countryCode) {
        return 'Please select a country first.';
      }
      const states = State.getStatesOfCountry(context.countryCode);
      if (states.length > 0 && !context.stateCode) {
        return 'Please select a state first.';
      }
      if (!stringValue) {
        return `${label} is required.`;
      }
    }
    if (!stringValue && field.type !== 'checkbox' && field.type !== 'file' && field.type !== 'country' && field.type !== 'state') {
      return `${label} is required.`;
    }
  }

  if (!stringValue && field.type !== 'checkbox' && field.type !== 'file' && field.type !== 'country') {
    if (field.type === 'state' && context.countryCode && State.getStatesOfCountry(context.countryCode).length > 0) {
      return field.required ? `${label} is required.` : null;
    }
    return null;
  }

  if (field.type === 'checkbox' || field.type === 'file' || field.type === 'country') {
    return null;
  }

  const preset = validation.preset ? PRESET_RULES[validation.preset] : null;

  const minLength = validation.minLength ?? preset?.minLength;
  const maxLength = validation.maxLength ?? preset?.maxLength;

  if (minLength != null && stringValue.length < minLength) {
    return `${label} must be at least ${minLength} characters.`;
  }
  if (maxLength != null && stringValue.length > maxLength) {
    return `${label} must be at most ${maxLength} characters.`;
  }

  if (field.type === 'date' && stringValue) {
    const date = new Date(stringValue);
    if (Number.isNaN(date.getTime())) {
      return `Please enter a valid date for ${label.toLowerCase()}.`;
    }
    if (validation.min) {
      const minDate = new Date(validation.min);
      if (date < minDate) {
        return `${label} cannot be before ${validation.min}.`;
      }
    }
    if (validation.max) {
      const maxDate = new Date(validation.max);
      if (date > maxDate) {
        return `${label} cannot be after ${validation.max}.`;
      }
    }
    const age = calculateAge(stringValue);
    if (age != null) {
      if (validation.minAge != null && age < validation.minAge) {
        return `${label}: minimum age is ${validation.minAge} years.`;
      }
      if (validation.maxAge != null && age > validation.maxAge) {
        return `${label}: maximum age is ${validation.maxAge} years.`;
      }
    }
  }

  if (validation.min != null && field.type !== 'date' && Number(stringValue) < validation.min) {
    return `${label} must be at least ${validation.min}.`;
  }
  if (validation.max != null && field.type !== 'date' && Number(stringValue) > validation.max) {
    return `${label} must be at most ${validation.max}.`;
  }

  const patternSource = validation.pattern || preset?.pattern;
  if (patternSource && stringValue) {
    let regex;
    try {
      regex = patternSource instanceof RegExp ? patternSource : new RegExp(patternSource);
    } catch {
      return null;
    }
    const testValue = preset?.transform ? stringValue : stringValue;
    if (!regex.test(testValue)) {
      return validation.patternMessage || preset?.message || `${label} format is invalid.`;
    }
  }

  if (!preset && field.type === 'email' && stringValue) {
    if (!PRESET_RULES.email.pattern.test(stringValue)) {
      return PRESET_RULES.email.message;
    }
  }

  if (!preset && field.type === 'tel' && stringValue) {
    const mobile = String(value).replace(/\D/g, '').slice(-10);
    if (!PRESET_RULES.mobile_in.pattern.test(mobile)) {
      return PRESET_RULES.mobile_in.message;
    }
  }

  return null;
}

/** HTML input constraints derived from field validation (for client-side hints). */
export function getFieldInputConstraints(field, context = {}) {
  const validation = resolveValidation(field, context);
  const preset = validation.preset ? PRESET_RULES[validation.preset] : null;
  const constraints = {};

  const maxLength = validation.maxLength ?? preset?.maxLength;
  const minLength = validation.minLength ?? preset?.minLength;
  if (maxLength) constraints.maxLength = maxLength;
  if (minLength) constraints.minLength = minLength;
  if (validation.min) constraints.min = validation.min;
  if (validation.max) constraints.max = validation.max;

  if (field.type === 'tel' || validation.preset === 'mobile_in') {
    constraints.inputMode = 'numeric';
    constraints.maxLength = constraints.maxLength || 10;
  }
  if (validation.preset === 'pincode_in') {
    constraints.inputMode = 'numeric';
    constraints.maxLength = 6;
  }
  if (validation.preset === 'postal_code') {
    constraints.maxLength = 10;
  }
  if (validation.preset === 'aadhaar' || validation.preset === 'numeric') {
    constraints.inputMode = 'numeric';
  }
  if (validation.preset === 'email' || field.type === 'email') {
    constraints.inputMode = 'email';
  }

  return constraints;
}
