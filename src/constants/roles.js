export const ROLES = {
  SUPER_ADMIN: 'super_admin',
  SCHOOL_ADMIN: 'school_admin',
  ADMISSION_OFFICER: 'admission_officer',
  ACCOUNTANT: 'accountant',
  TEACHER: 'teacher',
  PARENT: 'parent',
  STUDENT: 'student',
  SUPPORT_STAFF: 'support_staff',
};

export const ROLE_LABELS = {
  [ROLES.SUPER_ADMIN]: 'Super Admin',
  [ROLES.SCHOOL_ADMIN]: 'School Admin',
  [ROLES.ADMISSION_OFFICER]: 'Admission Officer',
  [ROLES.ACCOUNTANT]: 'Accountant',
  [ROLES.TEACHER]: 'Teacher',
  [ROLES.PARENT]: 'Parent',
  [ROLES.STUDENT]: 'Student',
  [ROLES.SUPPORT_STAFF]: 'Support Staff',
};

export const ROLE_DASHBOARD = {
  [ROLES.SUPER_ADMIN]: '/admin/schools',
  [ROLES.SCHOOL_ADMIN]: '/admin/dashboard',
  [ROLES.ADMISSION_OFFICER]: '/admin/dashboard',
  [ROLES.ACCOUNTANT]: '/admin/fees',
  [ROLES.TEACHER]: '/teacher/dashboard',
  [ROLES.PARENT]: '/parent/dashboard',
  [ROLES.STUDENT]: '/parent/dashboard',
  [ROLES.SUPPORT_STAFF]: '/admin/chat',
};
