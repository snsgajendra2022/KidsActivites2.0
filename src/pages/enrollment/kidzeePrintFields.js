/** Kidzee printable enrollment form — field definitions, branding, and draft helpers. */

export const KIDZEE_DRAFT_KEY = 'kidzee_printable_enrollment_form_draft';

export const KIDZEE_BRANDING = {
  logoUrl: '/assets/enrollment/kidzee-logo.png',
  wordmarkUrl: '/assets/enrollment/kidzee-logo.png',
  preschoolTagline: 'PRESCHOOL IS',
  brandName: 'KIDZEE',
  learnMark: 'Z',
  learnSubtext: 'LEARN',
  formNoDefault: '001331',
  social: {
    facebook: 'KidzeeIndia',
    instagram: 'kidzeeindia',
    website: 'kidzee.com',
  },
  trustedBrandText: "INDIA'S MOST TRUSTED BRAND",
};

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

export const UNIFORM_SIZES = ['18', '20', '22', '24', '26'];

export const HOUSEHOLD_INCOME_OPTIONS = [
  { key: 'under25k', label: '< 25,000' },
  { key: 'from25kTo50k', label: '25,000 to 50,000' },
  { key: 'over50k', label: '> 50,000' },
];

/** Page 3 formData paths — motherGuardian / fatherGuardian share the same field keys. */
export const PAGE3_GUARDIAN_FIELDS = [
  'name',
  'addressLine1', 'addressLine2', 'addressLine3', 'pin',
  'contactNo',
  'qualification', 'occupation', 'designation',
  'officeLine1', 'officeLine2', 'officeLine3', 'officePin',
  'officeContactNo', 'mobile', 'email',
  'medicalLine1', 'medicalLine2', 'medicalLine3',
];

export const PAGE3_SIBLING_FIELDS = ['name', 'gender', 'dateOfBirth', 'school', 'standard', 'alumni'];

export const PAGE3_FAMILY_MEMBER_FIELDS = ['name', 'gender', 'relationship', 'dateOfBirth'];

export const STAYS_WITH_OPTIONS = [
  { key: 'mother', label: 'Mother' },
  { key: 'father', label: 'Father' },
  { key: 'both', label: 'Both' },
];

export const IMMUNIZATION_ROWS = [
  { key: 'birth', age: 'Birth', recommendation: 'BCG Oral Polio Hep. B' },
  { key: 'weeks6', age: '6 Weeks', recommendation: 'Oral Polio DPT Hep. B' },
  { key: 'weeks10', age: '10 Weeks', recommendation: 'Oral Polio DPT' },
  { key: 'weeks14', age: '14 Weeks', recommendation: 'Oral Polio DPT' },
  { key: 'months6to9', age: '6-9 Months', recommendation: 'Oral Polio Hep. B' },
  { key: 'months9', age: '9 Months', recommendation: 'Measles' },
  { key: 'months15', age: '15 Months', recommendation: 'MMR' },
  { key: 'months18to24', age: '18-24 Months', recommendation: 'Oral Polio + DPT - 1st Booster' },
  { key: 'years2to5', age: '2-5 Yrs.', recommendation: 'Typhoid Vaccine' },
  { key: 'years4to45', age: '4-4.5 Yrs.', recommendation: 'Oral Polio + DPT - 2nd Booster' },
  { key: 'years10', age: '10 Yrs.', recommendation: 'TT (Tetanus) - 3rd Booster Hep. B Booster' },
];

export const IMMUNIZATION_COLUMNS = [
  { key: 'dose1', label: 'Dose 1 (d/m/y)' },
  { key: 'dose2', label: 'Dose 2 (d/m/y)' },
  { key: 'dose3', label: 'Dose 3 (d/m/y)' },
  { key: 'dose4', label: 'Dose 4 (d/m/y)' },
  { key: 'dose5', label: 'Dose 5 (d/m/y)' },
  { key: 'booster', label: 'Booster (d/m/y)' },
];

const emptyImmunizationRow = () => ({
  dose1: '', dose2: '', dose3: '', dose4: '', dose5: '', booster: '',
});

const emptyContact = () => ({
  name: '', addressLine1: '', addressLine2: '', addressLine3: '', pin: '',
  contactNo: '', mobile: '', email: '',
});

const emptySibling = () => ({
  name: '', gender: '', dateOfBirth: '', school: '', standard: '', alumni: '',
});

const emptyFamilyMember = () => ({
  name: '', gender: '', relationship: '', dateOfBirth: '',
});

const emptyGuardian = () => ({
  name: '',
  addressLine1: '',
  addressLine2: '',
  addressLine3: '',
  pin: '',
  contactNo: '',
  qualification: '',
  occupation: '',
  designation: '',
  officeLine1: '',
  officeLine2: '',
  officeLine3: '',
  officePin: '',
  officeContactNo: '',
  mobile: '',
  email: '',
  medicalLine1: '',
  medicalLine2: '',
  medicalLine3: '',
});

const emptyYesNo = () => ({ yes: false, no: false });

const emptyPermission = () => ({
  date: '',
  place: '',
  signature: '',
});

/** Page 5 formData paths — permissions, verification, office use. */
export const PAGE5_PERMISSION_PATHS = {
  emergency: {
    date: 'permissions.emergency.date',
    place: 'permissions.emergency.place',
    signature: 'permissions.emergency.signature',
  },
  fieldTrip: {
    date: 'permissions.fieldTrip.date',
    place: 'permissions.fieldTrip.place',
    signature: 'permissions.fieldTrip.signature',
  },
  verification: {
    childName: 'permissions.verification.childName',
    date: 'permissions.verification.date',
    place: 'permissions.verification.place',
    signature: 'permissions.verification.signature',
  },
};

export const PAGE5_OFFICE_PATHS = {
  classDetails: 'officeUse.classDetails',
  term: 'officeUse.term',
  invoiceReceiptNo: 'officeUse.invoiceReceiptNo',
  timing: 'officeUse.timing',
  amount: 'officeUse.amount',
  date: 'officeUse.date',
  signature: 'officeUse.signature',
};

export function getEmptyKidzeeFormData(branding = KIDZEE_BRANDING) {
  const immunization = {};
  IMMUNIZATION_ROWS.forEach(({ key }) => {
    immunization[key] = emptyImmunizationRow();
  });

  return {
    telNo: '',
    formNo: branding.formNoDefault || '',
    admissionNo: '',
    class: Object.fromEntries(CLASS_OPTIONS.map(({ key }) => [key, false])),
    batch: '',
    timing: '',
    photos: { child: null, father: null, mother: null },
    child: {
      fullName: '',
      gender: { male: false, female: false },
      dateOfBirth: '',
      placeOfBirth: '',
      height: '',
      weight: '',
      bloodGroup: '',
      uniformRegular: Object.fromEntries(UNIFORM_SIZES.map((s) => [s, false])),
      uniformWinter: Object.fromEntries(UNIFORM_SIZES.map((s) => [s, false])),
      languagesAtHome: '',
      addressLine1: '',
      addressLine2: '',
      addressLine3: '',
      pin: '',
      contactNo: '',
      staysWith: {
        mother: false, father: false, both: false, others: false, othersText: '',
      },
    },
    doctor: {
      name: '',
      addressLine1: '',
      addressLine2: '',
      pin: '',
      homePhone: '',
      mobile: '',
      email: '',
    },
    health: {
      allergies: emptyYesNo(),
      allergiesExplanation: '',
      physicalEmotional: emptyYesNo(),
      physicalEmotionalExplanation: '',
      dailyMedication: emptyYesNo(),
      dailyMedicationExplanation: '',
      furtherInfo: '',
      otherComments: '',
    },
    motherGuardian: emptyGuardian(),
    fatherGuardian: emptyGuardian(),
    householdIncome: Object.fromEntries(HOUSEHOLD_INCOME_OPTIONS.map(({ key }) => [key, false])),
    siblings: [emptySibling(), emptySibling()],
    otherFamilyMembers: [emptyFamilyMember()],
    immunization,
    emergencyContacts: [emptyContact(), emptyContact()],
    permissions: {
      emergency: emptyPermission(),
      fieldTrip: emptyPermission(),
      verification: { ...emptyPermission(), childName: '' },
    },
    officeUse: {
      classDetails: '',
      term: '',
      invoiceReceiptNo: '',
      timing: '',
      amount: '',
      date: '',
      signature: '',
    },
  };
}

export function setNestedValue(obj, path, value) {
  const keys = path.split('.');
  const next = { ...obj };
  let cursor = next;
  keys.forEach((key, i) => {
    if (i === keys.length - 1) {
      cursor[key] = value;
    } else {
      cursor[key] = { ...(cursor[key] || {}) };
      cursor = cursor[key];
    }
  });
  return next;
}

export function saveKidzeeDraft(data) {
  try {
    localStorage.setItem(KIDZEE_DRAFT_KEY, JSON.stringify({ data, savedAt: Date.now() }));
    return true;
  } catch {
    return false;
  }
}

export function loadKidzeeDraft() {
  try {
    const raw = localStorage.getItem(KIDZEE_DRAFT_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    return parsed?.data || null;
  } catch {
    return null;
  }
}

export function clearKidzeeDraft() {
  try {
    localStorage.removeItem(KIDZEE_DRAFT_KEY);
    return true;
  } catch {
    return false;
  }
}
