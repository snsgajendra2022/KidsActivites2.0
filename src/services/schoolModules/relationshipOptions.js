import { listClasses } from '../classManagementService.js';
import { listStudentsForRelationships } from '../studentDirectoryService.js';
import { getTeacherClasses, getTeacherStudents, listTeachers } from '../teacherService.js';
import {
  enrichParentChildrenWithClass,
  getParentChildren,
  getParentDashboard,
  normalizeParentChild,
} from '../parentService.js';
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
  const nested = student?.student || {};
  return student?.studentName
    || student?.fullName
    || student?.name
    || nested.fullName
    || [nested.firstName, nested.lastName].filter(Boolean).join(' ')
    || student?.applicationNo
    || student?.id
    || 'Student';
}

/** Resolve the relationship id parents use for leave / attendance / LMS. */
export function resolveParentStudentId(child) {
  if (!child) return '';
  const nested = child.student || {};
  return String(
    child.studentId
      || child.enrolledStudentId
      || nested.id
      || nested.studentId
      || child.applicationId
      || child.id
      || '',
  ).trim();
}

async function loadParentChildrenForOptions(user) {
  let children = [];
  try {
    children = await getParentChildren(user) || [];
  } catch {
    children = [];
  }

  const normalized = (children || []).map((child) => normalizeParentChild(child)).filter(Boolean);
  const hasResolvableStudent = normalized.some((child) => resolveParentStudentId(child));

  if (!normalized.length || !hasResolvableStudent) {
    try {
      const dash = await getParentDashboard(user?.id, user?.schoolId, user);
      const fromDash = (dash?.children || []).map((child) => normalizeParentChild(child)).filter(Boolean);
      if (fromDash.length) children = fromDash;
      else children = normalized;
    } catch {
      children = normalized;
    }
  } else {
    children = normalized;
  }

  try {
    children = await enrichParentChildrenWithClass(user?.id, children, user);
  } catch {
    // Keep whatever we already resolved.
  }

  return (children || []).map((child) => normalizeParentChild(child)).filter(Boolean);
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
function mapClassOptions(classes, extraMeta = {}) {
  return (classes || [])
    .filter((cls) => {
      const id = cls?.id || cls?.classId;
      if (!id) return false;
      const status = String(cls.status || 'active').toLowerCase();
      return status !== 'inactive' && status !== 'archived' && status !== 'deleted';
    })
    .map((cls) => {
      const classId = String(cls.id || cls.classId);
      return {
        value: classId,
        label: classLabel(cls),
        meta: {
          classId,
          className: cls.name || cls.className || '',
          sectionId: cls.sectionId || cls.section?.id || '',
          classCode: cls.code || cls.classCode || '',
          code: cls.code || cls.classCode || '',
          ...extraMeta,
        },
      };
    })
    .sort((a, b) => String(a.label).localeCompare(String(b.label)));
}

export async function loadClassOptions(user) {
  const role = String(user?.role || '').toLowerCase();

  if (role === ROLES.TEACHER) {
    const classes = await getTeacherClasses(user.id);
    return mapClassOptions(classes, {
      teacherId: user.id,
      teacherName: user.name || '',
    });
  }

  if (!STAFF_ROLES.has(role)) return [];

  let classes = await listClasses({ status: 'active' });
  if (!classes?.length) {
    // Backend may not filter by status=active — fall back to full list.
    classes = await listClasses({});
  }
  return mapClassOptions(classes);
}

/**
 * Load students for a selected class.
 */
export async function loadStudentOptions(user, { classId, sectionId } = {}) {
  const role = String(user?.role || '').toLowerCase();

  if (role === ROLES.PARENT || role === ROLES.STUDENT) {
    const children = await loadParentChildrenForOptions(user);
    return (children || [])
      .map((child) => {
        const studentId = resolveParentStudentId(child);
        if (!studentId) return null;
        if (!studentMatchesClass(child, classId, sectionId)) return null;
        const label = studentLabel(child);
        const className = child.className || '';
        return {
          value: studentId,
          label: className ? `${label} · ${className}` : label,
          meta: {
            studentId,
            classId: child.classId || '',
            className,
            sectionId: child.sectionId || child.section?.id || '',
          },
        };
      })
      .filter(Boolean);
  }

  // Staff selectors are always class-scoped. Never load the complete student
  // directory and infer relationships from display names.
  if (!classId) return [];

  if (role === ROLES.TEACHER) {
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

  if (!STAFF_ROLES.has(role)) return [];

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

/** HR staff directory options for payroll and related modules. */
export async function loadStaffOptions() {
  const { hrStaffService } = await import('./index.js');
  let staff = [];
  try {
    staff = await hrStaffService.list() || [];
  } catch {
    staff = [];
  }

  return (staff || [])
    .filter((person) => {
      const id = person?.id || person?.staffId;
      if (!id) return false;
      const status = String(person.status || 'active').toLowerCase();
      return status !== 'exited' && status !== 'inactive' && status !== 'deleted';
    })
    .map((person) => {
      const id = String(person.id || person.staffId);
      const name = String(person.name || person.fullName || person.employeeName || 'Staff').trim();
      const code = String(person.employeeId || person.employeeCode || '').trim();
      const role = String(person.role || '').trim();
      const department = String(person.department || '').trim();
      return {
        value: id,
        label: [name, code ? `(${code})` : '', role || department ? `· ${role || department}` : '']
          .filter(Boolean)
          .join(' '),
        meta: {
          staffId: id,
          employeeName: name,
          employeeCode: code,
          department,
          role,
        },
      };
    })
    .sort((a, b) => a.label.localeCompare(b.label));
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
