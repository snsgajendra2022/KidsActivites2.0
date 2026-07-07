/** Empty state and helpers for the printable enrollment form. */

export const IMMUNIZATION_ROWS = [
  { key: 'birth', label: 'Birth' },
  { key: 'weeks6', label: '6 Weeks' },
  { key: 'weeks10', label: '10 Weeks' },
  { key: 'weeks14', label: '14 Weeks' },
  { key: 'months6to9', label: '6–9 Months' },
  { key: 'months9', label: '9 Months' },
  { key: 'months15', label: '15 Months' },
  { key: 'months18to24', label: '18–24 Months' },
  { key: 'years2to5', label: '2–5 Yrs.' },
  { key: 'years4to45', label: '4–4.5 Yrs.' },
  { key: 'years10', label: '10 Yrs.' },
];

export const IMMUNIZATION_COLUMNS = [
  { key: 'dose1', label: 'Dose 1' },
  { key: 'dose2', label: 'Dose 2' },
  { key: 'dose3', label: 'Dose 3' },
  { key: 'dose4', label: 'Dose 4' },
  { key: 'dose5', label: 'Dose 5' },
  { key: 'booster', label: 'Booster' },
];

const emptyImmunizationRow = () => ({
  dose1: '', dose2: '', dose3: '', dose4: '', dose5: '', booster: '',
});

const emptyContact = () => ({
  name: '', address: '', pin: '', contactNo: '', mobile: '', email: '',
});

const emptySibling = () => ({
  name: '', gender: '', dateOfBirth: '', school: '', standard: '', alumni: false,
});

const emptyFamilyMember = () => ({
  name: '', gender: '', relationship: '', dateOfBirth: '',
});

const emptyGuardian = () => ({
  name: '',
  residentialAddress: '',
  pin: '',
  contactNo: '',
  qualification: '',
  occupation: '',
  designation: '',
  officeAddress: '',
  officePin: '',
  officeContactNo: '',
  mobile: '',
  email: '',
  medicalHistory: '',
});

const emptyPermission = () => ({
  date: '',
  place: '',
  signature: '',
});

export function getEmptyPrintFormData() {
  const immunization = {};
  IMMUNIZATION_ROWS.forEach(({ key }) => {
    immunization[key] = emptyImmunizationRow();
  });

  return {
    telNo: '',
    formNo: '',
    admissionNo: '',
    class: {
      ptp: false,
      playgroup: false,
      nursery: false,
      jrKg: false,
      srKg: false,
      enrichmentCentre: false,
      daycare: false,
      gradeI: false,
      gradeII: false,
    },
    batch: '',
    timing: '',
    photos: {
      child: null,
      father: null,
      mother: null,
    },
    child: {
      surname: '',
      firstName: '',
      middleName: '',
      gender: { male: false, female: false },
      dateOfBirth: '',
      placeOfBirth: '',
      height: '',
      weight: '',
      bloodGroup: '',
      uniformRegular: { s18: false, s20: false, s22: false, s24: false, s26: false },
      uniformWinter: { s18: false, s20: false, s22: false, s24: false, s26: false },
      languagesAtHome: '',
      address: '',
      pin: '',
      contactNo: '',
      staysWith: {
        mother: false, father: false, both: false, others: false, othersText: '',
      },
    },
    doctor: {
      name: '', address: '', pin: '', homePhone: '', mobile: '', email: '',
    },
    health: {
      allergies: false,
      allergiesExplanation: '',
      physicalIssues: false,
      physicalIssuesExplanation: '',
      dailyMedication: false,
      dailyMedicationExplanation: '',
      furtherInformation: '',
      otherComments: '',
    },
    motherGuardian: emptyGuardian(),
    fatherGuardian: emptyGuardian(),
    householdIncome: {
      under25k: false,
      from25kTo50k: false,
      over50k: false,
    },
    siblings: [emptySibling(), emptySibling(), emptySibling()],
    otherFamilyMembers: [emptyFamilyMember(), emptyFamilyMember(), emptyFamilyMember()],
    immunization,
    emergencyContacts: [emptyContact(), emptyContact()],
    permissions: {
      emergency: emptyPermission(),
      fieldTrip: emptyPermission(),
      verification: emptyPermission(),
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

export function getNestedValue(obj, path) {
  if (!path) return undefined;
  return path.split('.').reduce((acc, key) => (acc == null ? undefined : acc[key]), obj);
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

const PRINT_DRAFT_KEY = 'sb_printable_enrollment_draft';

export function saveLocalPrintDraft(data) {
  try {
    localStorage.setItem(PRINT_DRAFT_KEY, JSON.stringify({ data, savedAt: Date.now() }));
    return true;
  } catch {
    return false;
  }
}

export function loadLocalPrintDraft() {
  try {
    const raw = localStorage.getItem(PRINT_DRAFT_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    return parsed?.data || null;
  } catch {
    return null;
  }
}

/** Map standard enrollment application data into printable form fields. */
export function mapApplicationToPrintForm(app, empty = getEmptyPrintFormData()) {
  if (!app) return empty;
  const print = app.printableEnrollment || {};
  if (Object.keys(print).length > 0) {
    return { ...empty, ...print };
  }

  const student = app.student || {};
  const parent = app.parent || {};
  const address = app.address || {};
  const medical = app.medical || {};

  return {
    ...empty,
    child: {
      ...empty.child,
      surname: student.lastName || student.surname || '',
      firstName: student.firstName || student.fullName?.split(' ')[0] || '',
      middleName: student.middleName || '',
      dateOfBirth: student.dateOfBirth || student.dob || '',
      gender: {
        male: student.gender === 'male' || student.gender === 'Male',
        female: student.gender === 'female' || student.gender === 'Female',
      },
      address: address.line1 || address.address || '',
      pin: address.pincode || address.pin || '',
      contactNo: parent.mobile || parent.phone || '',
    },
    motherGuardian: {
      ...empty.motherGuardian,
      name: parent.motherName || '',
      mobile: parent.motherMobile || parent.mobile || '',
      email: parent.motherEmail || parent.email || '',
    },
    fatherGuardian: {
      ...empty.fatherGuardian,
      name: parent.fatherName || '',
      mobile: parent.fatherMobile || parent.mobile || '',
      email: parent.fatherEmail || parent.email || '',
    },
    health: {
      ...empty.health,
      allergies: Boolean(medical.allergies),
      allergiesExplanation: medical.allergies || '',
      furtherInformation: medical.conditions || medical.notes || '',
    },
  };
}

export function wrapPrintFormForEnrollment(printData, existingForm = {}) {
  return {
    ...existingForm,
    printableEnrollment: printData,
    _formType: 'printable',
  };
}

export function validatePrintFormForSubmit(data) {
  const errors = {};
  const req = (path, label) => {
    if (!getNestedValue(data, path)) errors[path] = `${label} is required`;
  };

  req('child.firstName', 'Child first name');
  req('child.surname', 'Child surname');
  req('child.dateOfBirth', 'Date of birth');

  const hasGender = data.child?.gender?.male || data.child?.gender?.female;
  if (!hasGender) errors['child.gender'] = 'Gender is required';

  const hasClass = Object.values(data.class || {}).some(Boolean);
  if (!hasClass) errors.class = 'Class is required';

  req('child.address', 'Address');
  req('motherGuardian.name', 'Mother/Guardian name');
  req('motherGuardian.mobile', 'Mother/Guardian mobile');
  req('fatherGuardian.name', 'Father/Guardian name');
  req('fatherGuardian.mobile', 'Father/Guardian mobile');

  const ec1 = data.emergencyContacts?.[0];
  if (!ec1?.name) errors['emergencyContacts.0.name'] = 'Emergency contact name is required';
  if (!ec1?.mobile && !ec1?.contactNo) {
    errors['emergencyContacts.0.mobile'] = 'Emergency contact phone is required';
  }

  ['emergency', 'fieldTrip', 'verification'].forEach((key) => {
    if (!data.permissions?.[key]?.signature) {
      errors[`permissions.${key}.signature`] = 'Signature is required';
    }
  });

  return { success: Object.keys(errors).length === 0, errors };
}
