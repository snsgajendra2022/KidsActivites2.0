import { DEFAULT_PORTAL_CONFIG } from './defaultPortalConfig.js';

/** @deprecated Use usePortalConfig() in React components */
export const SCHOOL = { ...DEFAULT_PORTAL_CONFIG.school };

export const CLASSES = [
  { value: 'nursery', label: 'Nursery' },
  { value: 'lkg', label: 'LKG' },
  { value: 'ukg', label: 'UKG' },
  { value: '1', label: 'Class 1' },
  { value: '2', label: 'Class 2' },
  { value: '3', label: 'Class 3' },
  { value: '4', label: 'Class 4' },
  { value: '5', label: 'Class 5' },
];

export const GENDERS = [
  { value: 'male', label: 'Male' },
  { value: 'female', label: 'Female' },
  { value: 'other', label: 'Other' },
];

export const BLOOD_GROUPS = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'].map((v) => ({ value: v, label: v }));

export const DEMO_USERS = {
  admin: { id: 'u-admin', name: 'Priya Sharma', email: 'admin@schoolbridge.demo', role: 'school_admin', mobile: '9876543210' },
  parent: { id: 'u-parent', name: 'Rajesh Kumar', email: 'parent@schoolbridge.demo', role: 'parent', mobile: '9876543211' },
  teacher: { id: 'u-teacher', name: 'Anita Verma', email: 'teacher@schoolbridge.demo', role: 'teacher', mobile: '9876543212' },
};
