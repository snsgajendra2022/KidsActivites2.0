import { useMemo } from 'react';
import { Country, State, City } from 'country-state-city';
import {
  EnrollmentInlineInput,
  EnrollmentInlineSelect,
} from './EnrollmentFormLayout.jsx';

function sortedOptions(items, valueKey = 'value', labelKey = 'label') {
  return [...items].sort((a, b) => a[labelKey].localeCompare(b[labelKey]));
}

export function CountrySelect({ countryCode, onChange, disabled }) {
  const countries = useMemo(
    () =>
      sortedOptions(
        Country.getAllCountries().map((c) => ({ value: c.isoCode, label: c.name })),
      ),
    [],
  );

  return (
    <EnrollmentInlineSelect
      value={countryCode || ''}
      disabled={disabled}
      onChange={(e) => {
        const code = e.target.value;
        const country = Country.getCountryByCode(code);
        onChange({
          countryCode: code,
          country: country?.name || '',
          state: '',
          stateCode: '',
          city: '',
        });
      }}
      options={countries}
      placeholder="Select country"
    />
  );
}

export function StateSelect({ countryCode, stateCode, stateName, onChange, disabled }) {
  const states = useMemo(() => {
    if (!countryCode) return [];
    return sortedOptions(
      State.getStatesOfCountry(countryCode).map((s) => ({
        value: s.isoCode,
        label: s.name,
      })),
    );
  }, [countryCode]);

  if (!countryCode) {
    return (
      <EnrollmentInlineInput disabled placeholder="Select country first" />
    );
  }

  if (states.length === 0) {
    return (
      <EnrollmentInlineInput
        value={stateName ?? ''}
        disabled={disabled}
        onChange={(e) => onChange({ state: e.target.value, stateCode: '', city: '' })}
        placeholder="Enter state / region"
      />
    );
  }

  return (
    <EnrollmentInlineSelect
      value={stateCode || ''}
      disabled={disabled}
      onChange={(e) => {
        const code = e.target.value;
        const state = State.getStateByCodeAndCountry(code, countryCode);
        onChange({
          stateCode: code,
          state: state?.name || '',
          city: '',
        });
      }}
      options={states}
      placeholder="Select state"
    />
  );
}

export function CitySelect({ countryCode, stateCode, value, onChange, disabled }) {
  const hasStates = useMemo(() => {
    if (!countryCode) return false;
    return State.getStatesOfCountry(countryCode).length > 0;
  }, [countryCode]);

  const cities = useMemo(() => {
    if (!countryCode || !stateCode) return [];
    return sortedOptions(
      City.getCitiesOfState(countryCode, stateCode).map((c) => ({
        value: c.name,
        label: c.name,
      })),
    );
  }, [countryCode, stateCode]);

  if (!countryCode) {
    return (
      <EnrollmentInlineInput disabled placeholder="Select country first" />
    );
  }

  if (hasStates && !stateCode) {
    return (
      <EnrollmentInlineInput disabled placeholder="Select state first" />
    );
  }

  if (cities.length === 0) {
    return (
      <EnrollmentInlineInput
        value={value ?? ''}
        disabled={disabled}
        onChange={(e) => onChange(e.target.value)}
        placeholder="Enter city"
      />
    );
  }

  return (
    <EnrollmentInlineSelect
      value={value ?? ''}
      disabled={disabled}
      onChange={(e) => onChange(e.target.value)}
      options={cities}
      placeholder="Select city"
    />
  );
}
