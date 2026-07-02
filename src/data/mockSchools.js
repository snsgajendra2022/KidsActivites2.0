/** @typedef {{ id: string, slug: string, name: string, academicYear: string, address: string, phone: string, email: string, status: 'active' | 'suspended' }} School */

/** @type {School[]} */
export const MOCK_SCHOOLS = [
  {
    id: 'school-1',
    slug: 'green-valley',
    name: 'Green Valley International School',
    academicYear: '2026–2027',
    address: '123 Education Lane, New Delhi, 110001',
    phone: '+91 11 4567 8900',
    email: 'admissions@greenvalley.edu.in',
    status: 'active',
  },
  {
    id: 'school-2',
    slug: 'sunrise-academy',
    name: 'Sunrise Academy',
    academicYear: '2026–2027',
    address: '45 Lake View Road, Mumbai, 400001',
    phone: '+91 22 3344 5566',
    email: 'admissions@sunrise.edu.in',
    status: 'active',
  },
];

export const DEFAULT_SCHOOL_ID = 'school-1';

export function getSchoolById(schoolId) {
  return MOCK_SCHOOLS.find((s) => s.id === schoolId) || MOCK_SCHOOLS[0];
}

export function schoolToPortalSchool(school) {
  return {
    id: school.id,
    name: school.name,
    academicYear: school.academicYear,
    address: school.address,
    phone: school.phone,
    email: school.email,
  };
}
