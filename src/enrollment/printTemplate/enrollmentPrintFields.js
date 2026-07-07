/**
 * Absolute-positioned field coordinates for the 5-page printable enrollment form.
 * Values use percentage of page width/height unless noted (px for small checkboxes).
 * Use calibration mode (Show Alignment Grid) to fine-tune positions against page PNGs.
 */

const CB = '12px';

function text(page, name, x, y, w, h, opts = {}) {
  return { page, name, type: 'text', x, y, w, h, fontSize: '11pt', ...opts };
}

function date(page, name, x, y, w, h, opts = {}) {
  return { page, name, type: 'date', x, y, w, h, fontSize: '11pt', ...opts };
}

function checkbox(page, name, x, y, opts = {}) {
  return { page, name, type: 'checkbox', x, y, w: CB, h: CB, ...opts };
}

function textarea(page, name, x, y, w, h, opts = {}) {
  return { page, name, type: 'textarea', x, y, w, h, fontSize: '10pt', ...opts };
}

function photo(page, name, x, y, w, h, opts = {}) {
  return { page, name, type: 'photo', x, y, w, h, ...opts };
}

function signature(page, name, x, y, w, h, opts = {}) {
  return { page, name, type: 'signature', x, y, w, h, fontSize: '14pt', ...opts };
}

/** @type {import('./enrollmentPrintTypes.js').PrintField[]} */
export const enrollmentPrintFields = [
  // ── Page 1: Child & class details ──────────────────────────────────────────
  text(1, 'telNo', '8%', '10.5%', '22%', '2.2%'),
  text(1, 'formNo', '38%', '10.5%', '18%', '2.2%'),
  text(1, 'admissionNo', '68%', '10.5%', '22%', '2.2%'),

  checkbox(1, 'class.ptp', '11%', '18.8%'),
  checkbox(1, 'class.playgroup', '20%', '18.8%'),
  checkbox(1, 'class.nursery', '31%', '18.8%'),
  checkbox(1, 'class.jrKg', '42%', '18.8%'),
  checkbox(1, 'class.srKg', '52%', '18.8%'),
  checkbox(1, 'class.enrichmentCentre', '62%', '18.8%'),
  checkbox(1, 'class.daycare', '78%', '18.8%'),
  checkbox(1, 'class.gradeI', '11%', '21.5%'),
  checkbox(1, 'class.gradeII', '22%', '21.5%'),

  text(1, 'batch', '42%', '21.2%', '18%', '2.2%'),
  text(1, 'timing', '68%', '21.2%', '22%', '2.2%'),

  photo(1, 'photos.child', '76%', '12%', '18%', '14%'),
  photo(1, 'photos.father', '76%', '27%', '18%', '14%'),
  photo(1, 'photos.mother', '76%', '42%', '18%', '14%'),

  text(1, 'child.surname', '18%', '33%', '24%', '2.2%'),
  text(1, 'child.firstName', '46%', '33%', '24%', '2.2%'),
  text(1, 'child.middleName', '74%', '33%', '20%', '2.2%'),

  checkbox(1, 'child.gender.male', '22%', '37.2%'),
  checkbox(1, 'child.gender.female', '34%', '37.2%'),

  date(1, 'child.dateOfBirth', '58%', '36.8%', '22%', '2.4%'),
  text(1, 'child.placeOfBirth', '18%', '41%', '62%', '2.2%'),

  text(1, 'child.height', '18%', '45%', '18%', '2.2%'),
  text(1, 'child.weight', '40%', '45%', '18%', '2.2%'),
  text(1, 'child.bloodGroup', '64%', '45%', '18%', '2.2%'),

  checkbox(1, 'child.uniformRegular.s18', '28%', '49.5%'),
  checkbox(1, 'child.uniformRegular.s20', '36%', '49.5%'),
  checkbox(1, 'child.uniformRegular.s22', '44%', '49.5%'),
  checkbox(1, 'child.uniformRegular.s24', '52%', '49.5%'),
  checkbox(1, 'child.uniformRegular.s26', '60%', '49.5%'),

  checkbox(1, 'child.uniformWinter.s18', '28%', '53%'),
  checkbox(1, 'child.uniformWinter.s20', '36%', '53%'),
  checkbox(1, 'child.uniformWinter.s22', '44%', '53%'),
  checkbox(1, 'child.uniformWinter.s24', '52%', '53%'),
  checkbox(1, 'child.uniformWinter.s26', '60%', '53%'),

  text(1, 'child.languagesAtHome', '18%', '57%', '74%', '2.2%'),
  textarea(1, 'child.address', '18%', '61%', '74%', '5%'),
  text(1, 'child.pin', '18%', '67%', '18%', '2.2%'),
  text(1, 'child.contactNo', '42%', '67%', '24%', '2.2%'),

  checkbox(1, 'child.staysWith.mother', '22%', '71.5%'),
  checkbox(1, 'child.staysWith.father', '36%', '71.5%'),
  checkbox(1, 'child.staysWith.both', '50%', '71.5%'),
  checkbox(1, 'child.staysWith.others', '62%', '71.5%'),
  text(1, 'child.staysWith.othersText', '72%', '71%', '20%', '2.2%'),

  // ── Page 2: Doctor & health ───────────────────────────────────────────────
  text(2, 'doctor.name', '22%', '12%', '68%', '2.2%'),
  textarea(2, 'doctor.address', '22%', '16%', '68%', '4.5%'),
  text(2, 'doctor.pin', '22%', '21.5%', '18%', '2.2%'),
  text(2, 'doctor.homePhone', '44%', '21.5%', '22%', '2.2%'),
  text(2, 'doctor.mobile', '22%', '25.5%', '28%', '2.2%'),
  text(2, 'doctor.email', '54%', '25.5%', '36%', '2.2%'),

  checkbox(2, 'health.allergies', '8%', '33%'),
  textarea(2, 'health.allergiesExplanation', '22%', '32.5%', '70%', '4%'),

  checkbox(2, 'health.physicalIssues', '8%', '40%'),
  textarea(2, 'health.physicalIssuesExplanation', '22%', '39.5%', '70%', '4%'),

  checkbox(2, 'health.dailyMedication', '8%', '47%'),
  textarea(2, 'health.dailyMedicationExplanation', '22%', '46.5%', '70%', '4%'),

  textarea(2, 'health.furtherInformation', '12%', '55%', '80%', '8%'),
  textarea(2, 'health.otherComments', '12%', '66%', '80%', '8%'),

  // ── Page 3: Parents, siblings, family ─────────────────────────────────────
  // Mother/Guardian
  text(3, 'motherGuardian.name', '22%', '11%', '68%', '2%'),
  textarea(3, 'motherGuardian.residentialAddress', '22%', '14.5%', '68%', '3.5%'),
  text(3, 'motherGuardian.pin', '22%', '19%', '14%', '2%'),
  text(3, 'motherGuardian.contactNo', '40%', '19%', '18%', '2%'),
  text(3, 'motherGuardian.qualification', '22%', '22.5%', '28%', '2%'),
  text(3, 'motherGuardian.occupation', '54%', '22.5%', '36%', '2%'),
  text(3, 'motherGuardian.designation', '22%', '26%', '68%', '2%'),
  textarea(3, 'motherGuardian.officeAddress', '22%', '29.5%', '68%', '3.5%'),
  text(3, 'motherGuardian.officePin', '22%', '34%', '14%', '2%'),
  text(3, 'motherGuardian.officeContactNo', '40%', '34%', '18%', '2%'),
  text(3, 'motherGuardian.mobile', '22%', '37.5%', '22%', '2%'),
  text(3, 'motherGuardian.email', '48%', '37.5%', '42%', '2%'),
  textarea(3, 'motherGuardian.medicalHistory', '22%', '41%', '68%', '3.5%'),

  // Father/Guardian
  text(3, 'fatherGuardian.name', '22%', '48%', '68%', '2%'),
  textarea(3, 'fatherGuardian.residentialAddress', '22%', '51.5%', '68%', '3.5%'),
  text(3, 'fatherGuardian.pin', '22%', '56%', '14%', '2%'),
  text(3, 'fatherGuardian.contactNo', '40%', '56%', '18%', '2%'),
  text(3, 'fatherGuardian.qualification', '22%', '59.5%', '28%', '2%'),
  text(3, 'fatherGuardian.occupation', '54%', '59.5%', '36%', '2%'),
  text(3, 'fatherGuardian.designation', '22%', '63%', '68%', '2%'),
  textarea(3, 'fatherGuardian.officeAddress', '22%', '66.5%', '68%', '3.5%'),
  text(3, 'fatherGuardian.officePin', '22%', '71%', '14%', '2%'),
  text(3, 'fatherGuardian.officeContactNo', '40%', '71%', '18%', '2%'),
  text(3, 'fatherGuardian.mobile', '22%', '74.5%', '22%', '2%'),
  text(3, 'fatherGuardian.email', '48%', '74.5%', '42%', '2%'),
  textarea(3, 'fatherGuardian.medicalHistory', '22%', '78%', '68%', '3.5%'),

  checkbox(3, 'householdIncome.under25k', '18%', '84%'),
  checkbox(3, 'householdIncome.from25kTo50k', '38%', '84%'),
  checkbox(3, 'householdIncome.over50k', '62%', '84%'),

  // Sibling rows (3)
  ...[0, 1, 2].flatMap((i) => {
    const y = 85 + i * 2.5;
    return [
      text(3, `siblings.${i}.name`, '8%', `${y}%`, '18%', '2%'),
      text(3, `siblings.${i}.gender`, '28%', `${y}%`, '10%', '2%'),
      text(3, `siblings.${i}.dateOfBirth`, '40%', `${y}%`, '12%', '2%'),
      text(3, `siblings.${i}.school`, '54%', `${y}%`, '18%', '2%'),
      text(3, `siblings.${i}.standard`, '74%', `${y}%`, '10%', '2%'),
      checkbox(3, `siblings.${i}.alumni`, '86%', `${y + 0.2}%`),
    ];
  }),

  // Other family members (3)
  ...[0, 1, 2].flatMap((i) => {
    const y = 93 + i * 1.8;
    return [
      text(3, `otherFamilyMembers.${i}.name`, '8%', `${y}%`, '22%', '1.8%'),
      text(3, `otherFamilyMembers.${i}.gender`, '32%', `${y}%`, '12%', '1.8%'),
      text(3, `otherFamilyMembers.${i}.relationship`, '46%', `${y}%`, '18%', '1.8%'),
      text(3, `otherFamilyMembers.${i}.dateOfBirth`, '66%', `${y}%`, '14%', '1.8%'),
    ];
  }),

  // ── Page 4: Immunization & emergency contacts ─────────────────────────────
  // Immunization grid
  ...(() => {
    const rows = [
      'birth', 'weeks6', 'weeks10', 'weeks14', 'months6to9', 'months9',
      'months15', 'months18to24', 'years2to5', 'years4to45', 'years10',
    ];
    const cols = ['dose1', 'dose2', 'dose3', 'dose4', 'dose5', 'booster'];
    const startY = 14.5;
    const rowH = 3.2;
    const colX = [32, 42.5, 53, 63.5, 74, 84.5];
    const fields = [];
    rows.forEach((row, ri) => {
      const y = `${startY + ri * rowH}%`;
      cols.forEach((col, ci) => {
        fields.push(date(4, `immunization.${row}.${col}`, `${colX[ci]}%`, y, '9%', '2.2%', { fontSize: '9pt' }));
      });
    });
    return fields;
  })(),

  // Emergency contact 1
  text(4, 'emergencyContacts.0.name', '22%', '52%', '68%', '2%'),
  textarea(4, 'emergencyContacts.0.address', '22%', '55.5%', '68%', '3.5%'),
  text(4, 'emergencyContacts.0.pin', '22%', '60%', '14%', '2%'),
  text(4, 'emergencyContacts.0.contactNo', '40%', '60%', '18%', '2%'),
  text(4, 'emergencyContacts.0.mobile', '22%', '63.5%', '22%', '2%'),
  text(4, 'emergencyContacts.0.email', '48%', '63.5%', '42%', '2%'),

  // Emergency contact 2
  text(4, 'emergencyContacts.1.name', '22%', '70%', '68%', '2%'),
  textarea(4, 'emergencyContacts.1.address', '22%', '73.5%', '68%', '3.5%'),
  text(4, 'emergencyContacts.1.pin', '22%', '78%', '14%', '2%'),
  text(4, 'emergencyContacts.1.contactNo', '40%', '78%', '18%', '2%'),
  text(4, 'emergencyContacts.1.mobile', '22%', '81.5%', '22%', '2%'),
  text(4, 'emergencyContacts.1.email', '48%', '81.5%', '42%', '2%'),

  // ── Page 5: Permissions & office use ──────────────────────────────────────
  date(5, 'permissions.emergency.date', '18%', '18%', '16%', '2.2%'),
  text(5, 'permissions.emergency.place', '38%', '18%', '28%', '2.2%'),
  signature(5, 'permissions.emergency.signature', '70%', '16.5%', '24%', '4%'),

  date(5, 'permissions.fieldTrip.date', '18%', '32%', '16%', '2.2%'),
  text(5, 'permissions.fieldTrip.place', '38%', '32%', '28%', '2.2%'),
  signature(5, 'permissions.fieldTrip.signature', '70%', '30.5%', '24%', '4%'),

  date(5, 'permissions.verification.date', '18%', '46%', '16%', '2.2%'),
  text(5, 'permissions.verification.place', '38%', '46%', '28%', '2.2%'),
  signature(5, 'permissions.verification.signature', '70%', '44.5%', '24%', '4%'),

  // Office use only (admin)
  text(5, 'officeUse.classDetails', '22%', '62%', '68%', '2%', { adminOnly: true }),
  text(5, 'officeUse.term', '22%', '66%', '28%', '2%', { adminOnly: true }),
  text(5, 'officeUse.invoiceReceiptNo', '54%', '66%', '36%', '2%', { adminOnly: true }),
  text(5, 'officeUse.timing', '22%', '70%', '28%', '2%', { adminOnly: true }),
  text(5, 'officeUse.amount', '54%', '70%', '36%', '2%', { adminOnly: true }),
  date(5, 'officeUse.date', '22%', '74%', '28%', '2.2%', { adminOnly: true }),
  signature(5, 'officeUse.signature', '54%', '72.5%', '36%', '5%', { adminOnly: true }),
];

export const ENROLLMENT_PAGE_COUNT = 5;

export function getFieldsForPage(page) {
  return enrollmentPrintFields.filter((f) => f.page === page);
}

export function getPageBackgroundUrl(page) {
  return `/templates/enrollment/page-${page}.png`;
}
