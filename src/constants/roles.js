export const ROLES = {
  SUPER_ADMIN: 'super_admin',
  SCHOOL_ADMIN: 'school_admin',
  ADMISSION_OFFICER: 'admission_officer',
  TEACHER: 'teacher',
  PARENT: 'parent',
  STUDENT: 'student',
};

export const ROLE_LABELS = {
  [ROLES.SUPER_ADMIN]: 'Super Admin',
  [ROLES.SCHOOL_ADMIN]: 'School Admin',
  [ROLES.ADMISSION_OFFICER]: 'Admission Officer',
  [ROLES.TEACHER]: 'Teacher',
  [ROLES.PARENT]: 'Parent',
  [ROLES.STUDENT]: 'Student',
};

export const ROLE_DASHBOARD = {
  [ROLES.SUPER_ADMIN]: '/admin/dashboard',
  [ROLES.SCHOOL_ADMIN]: '/admin/dashboard',
  [ROLES.ADMISSION_OFFICER]: '/admin/dashboard',
  [ROLES.TEACHER]: '/teacher/dashboard',
  [ROLES.PARENT]: '/parent/dashboard',
  [ROLES.STUDENT]: '/parent/dashboard',
};
