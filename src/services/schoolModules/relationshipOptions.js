import { listClasses } from '../classManagementService.js';
import { listStudentsForRelationships } from '../studentDirectoryService.js';
import { getTeacherClasses, getTeacherStudents, listTeachers } from '../teacherService.js';
import { getParentChildren } from '../parentService.js';
import { ROLES } from '../../constants/roles.js';

/** Default subject catalog until /admin/subjects exists on the backend. */
export const DEFAULT_SUBJECTS = [
  { id: 'subj-math', name: 'Mathematics' },
  { id: 'subj-eng', name: 'English' },
  { id: 'subj-sci', name: 'Science' },
  { id: 'subj-evs', name: 'EVS' },
  { id: 'subj-hin', name: 'Hindi' },
  { id: 'subj-art', name: 'Art' },
  { id: 'subj-pe', name: 'Physical Education' },
  { id: 'subj-all', name: 'All Subjects' },
];

function studentLabel(student) {
  return student.fullName
    || student.name
    || student.studentName
    || student.applicationNo
    || student.id
    || 'Student';
}

function classLabel(cls) {
  if (!cls) return 'Class';
  if (cls.name && cls.code) return `${cls.name} (${cls.code})`;
  return cls.name || cls.code || cls.className || cls.id || 'Class';
}

function normalizeClassId(value) {
  return value == null || value === '' ? '' : String(value);
}

function studentMatchesClass(student, classId, sectionId) {
  if (!classId && !sectionId) return true;
  const sid = normalizeClassId(student.classId || student.class?.id);
  if (classId && sid !== normalizeClassId(classId)) return false;
  const studentSectionId = normalizeClassId(student.sectionId || student.section?.id);
  if (sectionId && studentSectionId !== normalizeClassId(sectionId)) return false;
  return true;
}

const STAFF_ROLES = new Set([
  ROLES.SUPER_ADMIN,
  ROLES.SCHOOL_ADMIN,
  ROLES.ADMISSION_OFFICER,
  ROLES.ACCOUNTANT,
  ROLES.SUPPORT_STAFF,
]);

/**
 * Load class options for the current user role.
 */
export async function loadClassOptions(user) {
  if (user?.role === ROLES.TEACHER) {
    const classes = await getTeacherClasses(user.id);
    return (classes || []).map((cls) => ({
      value: String(cls.classId || cls.id),
      label: classLabel(cls),
      meta: {
        classId: String(cls.classId || cls.id),
        className: cls.name || cls.className || '',
        sectionId: cls.sectionId || '',
        teacherId: user.id,
        teacherName: user.name || '',
      },
    }));
  }

  if (!STAFF_ROLES.has(user?.role)) return [];

  const classes = await listClasses({ status: 'active' });
  return (classes || [])
    .filter((cls) => cls.status !== 'inactive' && (cls.id || cls.classId))
    .map((cls) => ({
      value: String(cls.id || cls.classId),
      label: classLabel(cls),
      meta: {
        classId: String(cls.id || cls.classId),
        className: cls.name || '',
        sectionId: cls.sectionId || cls.section?.id || '',
        classCode: cls.code || '',
        code: cls.code || '',
      },
    }));
}

/**
 * Load students for a selected class.
 */
export async function loadStudentOptions(user, { classId, sectionId } = {}) {
  if (user?.role === ROLES.PARENT || user?.role === ROLES.STUDENT) {
    const children = await getParentChildren(user);
    return (children || [])
      .filter((child) => child.studentId && studentMatchesClass(child, classId, sectionId))
      .map((child) => ({
        value: String(child.studentId),
        label: studentLabel(child),
        meta: {
          studentId: String(child.studentId),
          classId: child.classId || '',
          sectionId: child.sectionId || child.section?.id || '',
        },
      }));
  }

  // Staff selectors are always class-scoped. Never load the complete student
  // directory and infer relationships from display names.
  if (!classId) return [];

  if (user?.role === ROLES.TEACHER) {
    const students = await getTeacherStudents(user.id, {
      classId,
      ...(sectionId ? { sectionId } : {}),
      status: 'active',
    });
    return (students || []).map((student) => ({
        value: String(student.id || student.studentId),
        label: studentLabel(student),
        meta: {
          studentId: String(student.id || student.studentId),
          classId,
          sectionId: student.sectionId || sectionId || '',
        },
      }));
  }

  if (!STAFF_ROLES.has(user?.role)) return [];

  const students = await listStudentsForRelationships({
    classId,
    ...(sectionId ? { sectionId } : {}),
    status: 'active',
  });
  return (students || [])
    .filter((student) => student.id || student.studentId)
    .map((student) => ({
      value: String(student.id || student.studentId),
      label: studentLabel(student),
      meta: {
        studentId: String(student.id || student.studentId),
        classId,
        sectionId: student.sectionId || sectionId || '',
      },
    }));
}

export async function loadSubjectOptions() {
  return DEFAULT_SUBJECTS.map((subject) => ({
    value: subject.id,
    label: subject.name,
    meta: {
      subjectId: subject.id,
      subject: subject.name,
    },
  }));
}

export async function loadTeacherOptions() {
  const teachers = await listTeachers({ status: 'active' });
  return (teachers || []).map((teacher) => ({
    value: String(teacher.id),
    label: teacher.name || teacher.email || teacher.id,
    meta: {
      teacherId: String(teacher.id),
      teacherName: teacher.name || '',
    },
  }));
}

export async function loadExamOptions() {
  const { examService } = await import('./index.js');
  const exams = await examService.list();
  return (exams || []).map((exam) => ({
    value: String(exam.id),
    label: `${exam.name}${exam.className ? ` · ${exam.className}` : ''}${exam.subject ? ` · ${exam.subject}` : ''}`,
    meta: {
      examId: String(exam.id),
      examName: exam.name || '',
      classId: exam.classId || '',
      className: exam.className || '',
      subjectId: exam.subjectId || '',
      subject: exam.subject || '',
      maxMarks: exam.maxMarks,
    },
  }));
}

export async function loadBookOptions() {
  const { libraryBookService } = await import('./index.js');
  const books = await libraryBookService.list();
  return (books || [])
    .filter((book) => book.status !== 'unavailable' && Number(book.available ?? 1) > 0)
    .map((book) => ({
      value: String(book.id),
      label: `${book.title}${book.barcode ? ` · ${book.barcode}` : ''}`,
      meta: {
        bookId: String(book.id),
        bookTitle: book.title || '',
      },
    }));
}

export function findOption(options, value) {
  return (options || []).find((option) => String(option.value) === String(value)) || null;
}

export function gradeFromMarks(marksObtained, maxMarks = 100) {
  const max = Number(maxMarks) || 100;
  const marks = Number(marksObtained);
  if (Number.isNaN(marks) || max <= 0) return '';
  const pct = (marks / max) * 100;
  if (pct >= 90) return 'A+';
  if (pct >= 80) return 'A';
  if (pct >= 70) return 'B+';
  if (pct >= 60) return 'B';
  if (pct >= 50) return 'C';
  if (pct >= 40) return 'D';
  return 'F';
}
