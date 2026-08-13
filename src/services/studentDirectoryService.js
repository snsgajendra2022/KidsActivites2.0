import { api } from './api/client.js';
import { routeRequest } from './api/routeRequest.js';
import { getEnrolledStudents } from './enrollmentService.js';
import { listClasses } from './classManagementService.js';

function normalizeList(data) {
  if (Array.isArray(data)) return data;
  if (Array.isArray(data?.items)) return data.items;
  if (Array.isArray(data?.content)) return data.content;
  return [];
}

/**
 * Relationship lookup for existing students. Kept outside enrollmentService so
 * ERP selectors cannot change the established enrollment form workflow.
 */
export async function listStudentsForRelationships({
  classId,
  sectionId,
  status = 'active',
  q,
} = {}) {
  return routeRequest({
    mockFn: async () => {
      const [students, classes] = await Promise.all([
        getEnrolledStudents(),
        classId ? listClasses({ status: 'active' }) : Promise.resolve([]),
      ]);
      const selectedClass = normalizeList(classes)
        .find((cls) => String(cls.id || cls.classId) === String(classId));
      const selectedClassCode = String(selectedClass?.code || '').toLowerCase();
      return normalizeList(students).filter((student) => {
        if (classId) {
          const studentClassId = student.classId || student.class?.id;
          const studentClassCode = String(student.classApplying || student.classCode || '').toLowerCase();
          if (studentClassId && String(studentClassId) !== String(classId)) return false;
          if (!studentClassId && (!selectedClassCode || studentClassCode !== selectedClassCode)) return false;
        }
        if (sectionId && student.sectionId && String(student.sectionId) !== String(sectionId)) return false;
        if (q) {
          const search = String(q).trim().toLowerCase();
          const haystack = [student.name, student.fullName, student.applicationNo]
            .filter(Boolean)
            .join(' ')
            .toLowerCase();
          if (!haystack.includes(search)) return false;
        }
        return true;
      });
    },
    apiFn: async () => normalizeList(await api.get('/admin/students', {
      classId,
      sectionId: sectionId || undefined,
      status,
      q: q || undefined,
    })),
  });
}

/**
 * Resolve one existing student by id for relationship display (name + class).
 * Tenant and role scope stay server-side; returns null when not visible.
 */
export async function getStudentForRelationship(studentId) {
  const wanted = String(studentId || '').trim();
  if (!wanted) return null;

  const toRelationship = (student) => {
    if (!student) return null;
    return {
      studentId: String(student.id || student.studentId || wanted),
      studentName: student.fullName || student.name || student.studentName || '',
      classId: student.classId || student.class?.id || '',
      className: student.className || student.class?.name || student.classApplying || '',
      sectionId: student.sectionId || student.section?.id || '',
      sectionName: student.sectionName || student.section?.name || '',
      parentName: student.parentName || student.parent?.name || '',
    };
  };

  return routeRequest({
    mockFn: async () => {
      const students = normalizeList(await getEnrolledStudents());
      return toRelationship(students.find(
        (student) => String(student.id || student.studentId) === wanted,
      ));
    },
    apiFn: async () => {
      try {
        return toRelationship(await api.get(`/admin/students/${wanted}`));
      } catch (error) {
        if (error?.status === 404 || error?.status === 403) return null;
        throw error;
      }
    },
  });
}
