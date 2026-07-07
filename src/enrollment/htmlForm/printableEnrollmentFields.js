export {
  IMMUNIZATION_ROWS,
  IMMUNIZATION_COLUMNS,
} from '../printTemplate/enrollmentPrintFormData.js';

export const CLASS_OPTIONS = [
  { key: 'ptp', label: 'PTP' },
  { key: 'playgroup', label: 'Playgroup' },
  { key: 'nursery', label: 'Nursery' },
  { key: 'jrKg', label: 'Jr. KG' },
  { key: 'srKg', label: 'Sr. KG' },
  { key: 'enrichmentCentre', label: 'Enrichment Centre' },
  { key: 'daycare', label: 'Daycare' },
  { key: 'gradeI', label: 'Grade I' },
  { key: 'gradeII', label: 'Grade II' },
];

export const UNIFORM_SIZES = ['s18', 's20', 's22', 's24', 's26'];

export const HOUSEHOLD_INCOME_OPTIONS = [
  { key: 'under25k', label: 'Below ₹25,000' },
  { key: 'from25kTo50k', label: '₹25,000 – ₹50,000' },
  { key: 'over50k', label: 'Above ₹50,000' },
];

export const STAYS_WITH_OPTIONS = [
  { key: 'mother', label: 'Mother' },
  { key: 'father', label: 'Father' },
  { key: 'both', label: 'Both' },
  { key: 'others', label: 'Others' },
];

export const GUARDIAN_FIELDS = [
  { key: 'name', label: 'Name', type: 'line' },
  { key: 'residentialAddress', label: 'Residential Address', type: 'textarea' },
  { key: 'pin', label: 'PIN', type: 'line', width: 'short' },
  { key: 'contactNo', label: 'Contact No.', type: 'line', width: 'short' },
  { key: 'qualification', label: 'Qualification', type: 'line', width: 'half' },
  { key: 'occupation', label: 'Occupation', type: 'line', width: 'half' },
  { key: 'designation', label: 'Designation', type: 'line' },
  { key: 'officeAddress', label: 'Office Address', type: 'textarea' },
  { key: 'officePin', label: 'Office PIN', type: 'line', width: 'short' },
  { key: 'officeContactNo', label: 'Office Contact No.', type: 'line', width: 'short' },
  { key: 'mobile', label: 'Mobile', type: 'line', width: 'half' },
  { key: 'email', label: 'Email', type: 'line', width: 'half' },
  { key: 'medicalHistory', label: 'Medical History', type: 'textarea' },
];
