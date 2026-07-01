import { CLASSES, GENDERS, BLOOD_GROUPS } from './mockSchool.js';

export const ENROLLMENT_FIELD_TYPES = [
  { value: 'text', label: 'Text Input' },
  { value: 'email', label: 'Email' },
  { value: 'tel', label: 'Phone Number' },
  { value: 'date', label: 'Date' },
  { value: 'textarea', label: 'Text Area' },
  { value: 'select', label: 'Dropdown (Select)' },
  { value: 'radio', label: 'Radio Options' },
  { value: 'checkbox', label: 'Checkbox' },
  { value: 'file', label: 'File Upload' },
  { value: 'signature', label: 'Digital Signature' },
];

export const ENROLLMENT_STEP_TYPES = [
  { value: 'form', label: 'Form Fields' },
  { value: 'documents', label: 'Document Uploads' },
  { value: 'declaration', label: 'Declaration & Signature' },
  { value: 'review', label: 'Review & Submit' },
];

export const DEFAULT_ENROLLMENT_FORM = {
  steps: [
    {
      id: 'step-student',
      title: 'Student Information',
      stepType: 'form',
      sectionKey: 'student',
      notes: 'Enter the student name exactly as it appears on the birth certificate. Fields marked with * are mandatory.',
      fields: [
        { id: 'f-fullName', key: 'fullName', label: 'Student Full Name', type: 'text', required: true, placeholder: 'Enter student full name', width: 'full' },
        { id: 'f-dob', key: 'dateOfBirth', label: 'Date of Birth', type: 'date', required: true, width: 'half' },
        { id: 'f-gender', key: 'gender', label: 'Gender', type: 'radio', required: true, width: 'half', options: GENDERS },
        { id: 'f-nationality', key: 'nationality', label: 'Nationality', type: 'text', defaultValue: 'Indian', width: 'half' },
        { id: 'f-bloodGroup', key: 'bloodGroup', label: 'Blood Group', type: 'select', width: 'half', options: BLOOD_GROUPS, placeholder: 'Select blood group' },
        { id: 'f-class', key: 'classApplying', label: 'Class Applying For', type: 'select', required: true, wideLabel: true, width: 'full', options: CLASSES, placeholder: 'Select class' },
        { id: 'f-prevSchool', key: 'previousSchool', label: 'Previous School Name', type: 'text', placeholder: 'Enter previous school name', width: 'full' },
        { id: 'f-aadhaar', key: 'aadhaar', label: 'Aadhaar / ID Number', type: 'text', placeholder: 'Optional', width: 'full' },
      ],
    },
    {
      id: 'step-parent',
      title: 'Parent / Guardian Information',
      stepType: 'form',
      sectionKey: 'parent',
      notes: 'Provide accurate parent or guardian contact details for admission updates and school communication.',
      fields: [
        { id: 'f-fatherName', key: 'fatherName', label: 'Father Name', type: 'text', required: true, width: 'full' },
        { id: 'f-fatherMobile', key: 'fatherMobile', label: 'Father Mobile', type: 'tel', required: true, width: 'full' },
        { id: 'f-fatherEmail', key: 'fatherEmail', label: 'Father Email', type: 'email', width: 'full' },
        { id: 'f-fatherOcc', key: 'fatherOccupation', label: 'Father Occupation', type: 'text', width: 'full' },
        { id: 'f-motherName', key: 'motherName', label: 'Mother Name', type: 'text', required: true, width: 'full' },
        { id: 'f-motherMobile', key: 'motherMobile', label: 'Mother Mobile', type: 'tel', width: 'full' },
        { id: 'f-motherEmail', key: 'motherEmail', label: 'Mother Email', type: 'email', width: 'full' },
        { id: 'f-motherOcc', key: 'motherOccupation', label: 'Mother Occupation', type: 'text', width: 'full' },
        { id: 'f-guardian', key: 'guardianName', label: 'Guardian Name', type: 'text', placeholder: 'If applicable', width: 'full' },
        { id: 'f-altContact', key: 'alternateContact', label: 'Alternate Contact', type: 'tel', wideLabel: true, width: 'full' },
      ],
    },
    {
      id: 'step-address',
      title: 'Address Information',
      stepType: 'form',
      sectionKey: 'address',
      notes: 'Current and permanent address must be complete with city, state, and PIN code.',
      fields: [
        { id: 'f-currAddr', key: 'currentAddress', label: 'Current Address', type: 'textarea', required: true, stacked: true, width: 'full' },
        { id: 'f-sameAddr', key: 'sameAsCurrent', label: 'Permanent address same as current address', type: 'checkbox', width: 'full' },
        { id: 'f-permAddr', key: 'permanentAddress', label: 'Permanent Address', type: 'textarea', stacked: true, width: 'full' },
        { id: 'f-city', key: 'city', label: 'City', type: 'text', required: true, width: 'half' },
        { id: 'f-state', key: 'state', label: 'State', type: 'text', width: 'half' },
        { id: 'f-pin', key: 'pinCode', label: 'PIN Code', type: 'text', required: true, width: 'half' },
        { id: 'f-country', key: 'country', label: 'Country', type: 'text', defaultValue: 'India', width: 'half' },
      ],
    },
    {
      id: 'step-academic',
      title: 'Academic Information',
      stepType: 'form',
      sectionKey: 'academic',
      notes: 'Share previous academic records if the student is transferring from another school.',
      fields: [
        { id: 'f-prevClass', key: 'previousClass', label: 'Previous Class', type: 'text', width: 'full' },
        { id: 'f-prevSch', key: 'previousSchool', label: 'Previous School', type: 'text', width: 'full' },
        { id: 'f-prevBoard', key: 'previousBoard', label: 'Previous Board', type: 'text', placeholder: 'e.g. CBSE, ICSE', width: 'full' },
        { id: 'f-achieve', key: 'achievements', label: 'Achievements', type: 'textarea', stacked: true, placeholder: 'Any notable achievements', width: 'full' },
        { id: 'f-reason', key: 'reasonForChange', label: 'Reason For Change', type: 'textarea', stacked: true, wideLabel: true, width: 'full' },
      ],
    },
    {
      id: 'step-medical',
      title: 'Medical & Emergency Information',
      stepType: 'form',
      sectionKey: 'medical',
      notes: 'Medical information helps the school provide appropriate care. Enter "None" if not applicable.',
      fields: [
        { id: 'f-medCond', key: 'medicalConditions', label: 'Medical Conditions', type: 'textarea', stacked: true, placeholder: 'Enter none if not applicable', width: 'full' },
        { id: 'f-allergy', key: 'allergies', label: 'Allergies', type: 'textarea', stacked: true, placeholder: 'Enter none if not applicable', width: 'full' },
        { id: 'f-special', key: 'specialNeeds', label: 'Special Needs', type: 'textarea', stacked: true, width: 'full' },
        { id: 'f-emergName', key: 'emergencyContactName', label: 'Emergency Contact Name', type: 'text', wideLabel: true, width: 'full' },
        { id: 'f-emergNo', key: 'emergencyContactNumber', label: 'Emergency Contact No.', type: 'tel', wideLabel: true, width: 'full' },
      ],
    },
    {
      id: 'step-documents',
      title: 'Required Documents',
      stepType: 'documents',
      sectionKey: 'documents',
      notes: 'Upload clear scanned copies or photos. Required documents must be submitted before review.',
      fields: [
        { id: 'd-birth', key: 'birthCertificate', label: 'Birth Certificate', type: 'file', required: true, fileCategory: 'document', width: 'full', wideLabel: true },
        { id: 'd-photo', key: 'studentPhoto', label: 'Student Photo', type: 'file', required: true, fileCategory: 'photo', width: 'full', wideLabel: true },
        { id: 'd-parentId', key: 'parentIdProof', label: 'Parent ID Proof', type: 'file', required: true, fileCategory: 'document', width: 'full', wideLabel: true },
        { id: 'd-address', key: 'addressProof', label: 'Address Proof', type: 'file', fileCategory: 'document', width: 'full', wideLabel: true },
        { id: 'd-report', key: 'reportCard', label: 'Previous Report Card', type: 'file', fileCategory: 'document', width: 'full', wideLabel: true },
        { id: 'd-tc', key: 'transferCertificate', label: 'Transfer Certificate', type: 'file', fileCategory: 'document', width: 'full', wideLabel: true },
      ],
    },
    {
      id: 'step-declaration',
      title: 'Declaration & Signature',
      stepType: 'declaration',
      sectionKey: 'declaration',
      notes: 'Read each declaration carefully and sign digitally to confirm your application.',
      declarations: [
        { id: 'decl-accuracy', key: 'accuracyConfirmed', text: 'I confirm that the information provided in this application is true and accurate to the best of my knowledge.', required: true },
        { id: 'decl-comm', key: 'communicationConsent', text: 'I consent to receive school communication via email, SMS, and in-app notifications.' },
        { id: 'decl-media', key: 'mediaConsent', text: 'I consent to my child being photographed for classroom activities and shared with parents via the school platform.' },
      ],
      fields: [
        { id: 'f-sigDate', key: 'signatureDate', label: 'Signature Date', type: 'date', width: 'full' },
      ],
    },
    {
      id: 'step-review',
      title: 'Review & Submit',
      stepType: 'review',
      notes: 'Review all sections before final submission. You can go back to edit any section.',
    },
  ],
};

export function cloneEnrollmentFormConfig(config = DEFAULT_ENROLLMENT_FORM) {
  return JSON.parse(JSON.stringify(config));
}
