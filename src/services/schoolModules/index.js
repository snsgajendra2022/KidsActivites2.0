import { createCrudService, asCrudList } from './createCrudService.js';
import {
  CERTIFICATE_SEED,
  EXAM_MARKS_SEED,
  EXAM_SEED,
  EXPENSE_SEED,
  HOMEWORK_SEED,
  HOMEWORK_SUBMISSION_SEED,
  HR_STAFF_SEED,
  INVENTORY_SEED,
  LIBRARY_BOOK_SEED,
  LIBRARY_ISSUE_SEED,
  LMS_SEED,
  LEAVE_SEED,
  LOGIN_HISTORY_SEED,
  PAYROLL_SEED,
  PERFORMANCE_NOTE_SEED,
  SUBSCRIPTION_SEED,
  TIMETABLE_SEED,
  TRANSPORT_ROUTE_SEED,
  TRANSPORT_VEHICLE_SEED,
  TRANSPORT_ASSIGNMENT_SEED,
} from '../../data/schoolModuleSeeds.js';
import { delay } from '../mockApi.js';
import { api } from '../api/client.js';
import { routeRequest } from '../api/routeRequest.js';
import { resolveAssignmentHomeAddressLabel } from '../../utils/transportAddress.js';

export const homeworkService = createCrudService({
  key: 'homework',
  resource: 'homework',
  seed: HOMEWORK_SEED,
  idPrefix: 'hw',
  normalizeItem: normalizeHomework,
});

export const teacherHomeworkService = createCrudService({
  key: 'teacher_homework',
  resource: 'homework',
  seed: HOMEWORK_SEED,
  idPrefix: 'hw',
  listPath: '/teacher/homework',
  itemPath: (id) => `/teacher/homework/${id}`,
  normalizeItem: normalizeHomework,
});

/** Parent-facing homework list (`GET /parent/homework`). */
export const parentHomeworkService = {
  async list(filters = {}) {
    return routeRequest({
      mockFn: async () => {
        await delay(120);
        return (await homeworkService.list(filters)).map(normalizeHomework);
      },
      apiFn: async () => asCrudList(await api.get('/parent/homework', filters)).map(normalizeHomework),
    });
  },
  async getById(id) {
    return routeRequest({
      mockFn: async () => normalizeHomework(await homeworkService.getById(id)),
      apiFn: async () => {
        try {
          return normalizeHomework(await api.get(`/parent/homework/${id}`));
        } catch (err) {
          const status = Number(err?.status || 0);
          if (status === 404 || status === 405) {
            const items = await parentHomeworkService.list();
            return items.find((item) => String(item.id) === String(id)) || null;
          }
          throw err;
        }
      },
    });
  },
  async create() {
    throw new Error('Parents cannot create homework.');
  },
  async update() {
    throw new Error('Parents cannot edit homework.');
  },
  async remove() {
    throw new Error('Parents cannot delete homework.');
  },
};

function normalizeHomework(item) {
  if (!item) return item;
  const assignedStudentIds = Array.isArray(item.assignedStudentIds)
    ? item.assignedStudentIds.map(String)
    : [];
  const attachments = Array.isArray(item.attachments) ? item.attachments : [];
  return {
    ...item,
    id: item.id,
    title: item.title || 'Untitled homework',
    description: item.description || '',
    subject: item.subject || item.subjectName || '',
    subjectId: item.subjectId || null,
    classId: item.classId || null,
    className: item.className || '',
    sectionId: item.sectionId || null,
    teacherId: item.teacherId || null,
    teacherName: item.teacherName || item.createdByName || '',
    dueDate: item.dueDate ? String(item.dueDate).slice(0, 10) : '',
    status: String(item.status || 'assigned').toLowerCase(),
    assignedCount: item.assignedCount ?? assignedStudentIds.length,
    assignedStudentIds,
    attachments,
    createdAt: item.createdAt || null,
    updatedAt: item.updatedAt || null,
    createdByUserId: item.createdByUserId || null,
  };
}

export const homeworkSubmissionService = createCrudService({
  key: 'homework_submissions',
  resource: 'homework-submissions',
  seed: HOMEWORK_SUBMISSION_SEED,
  idPrefix: 'hws',
});

export const examService = createCrudService({
  key: 'exams',
  resource: 'exams',
  seed: EXAM_SEED,
  idPrefix: 'exam',
  normalizeItem: normalizeExam,
});

export const examMarksService = createCrudService({
  key: 'exam_marks',
  resource: 'exam-marks',
  seed: EXAM_MARKS_SEED,
  idPrefix: 'mark',
  normalizeItem: normalizeExamMark,
});

/** Parent-facing published exam marks only (`GET /parent/exam-marks`). */
export const parentExamMarksService = {
  async list(filters = {}) {
    return routeRequest({
      mockFn: async () => {
        await delay(120);
        const exams = await examService.list();
        const publishedIds = new Set(
          exams.filter((exam) => String(exam.status).toLowerCase() === 'published').map((exam) => String(exam.id)),
        );
        const marks = await examMarksService.list();
        return marks
          .filter((mark) => publishedIds.has(String(mark.examId)) || mark.published === true)
          .filter((mark) => {
            if (filters.studentId) return String(mark.studentId) === String(filters.studentId);
            if (filters.examId) return String(mark.examId) === String(filters.examId);
            return true;
          })
          .map(normalizeExamMark);
      },
      apiFn: async () => {
        try {
          return asCrudList(await api.get('/parent/exam-marks', filters)).map(normalizeExamMark);
        } catch (err) {
          const status = Number(err?.status || 0);
          if (status === 404 || status === 405) {
            // Fallback some gateways expose under /parent/exams with embedded marks
            const exams = asCrudList(await api.get('/parent/exams', filters));
            return exams.flatMap((exam) => {
              const nested = exam.marks || exam.examMarks || [];
              if (!Array.isArray(nested) || !nested.length) {
                if (exam.marksObtained == null && exam.studentId == null) return [];
                return [normalizeExamMark({ ...exam, examId: exam.examId || exam.id, examName: exam.examName || exam.name })];
              }
              return nested.map((mark) => normalizeExamMark({
                ...mark,
                examId: mark.examId || exam.id,
                examName: mark.examName || exam.name,
                className: mark.className || exam.className,
              }));
            });
          }
          throw err;
        }
      },
    });
  },
  async getById() {
    throw new Error('Parent exam marks are read-only.');
  },
  async create() {
    throw new Error('Parents cannot enter marks.');
  },
  async update() {
    throw new Error('Parents cannot edit marks.');
  },
  async remove() {
    throw new Error('Parents cannot delete marks.');
  },
};

function normalizeExam(exam) {
  if (!exam) return exam;
  return {
    ...exam,
    id: exam.id,
    name: exam.name || exam.title || 'Exam',
    type: exam.type || exam.examType || '',
    classId: exam.classId || exam.class_id || null,
    className: exam.className || exam.class?.name || '',
    subjectId: exam.subjectId || exam.subject_id || null,
    subject: exam.subject || exam.subjectName || exam.subject?.name || '',
    maxMarks: exam.maxMarks != null ? Number(exam.maxMarks) : null,
    examDate: exam.examDate || exam.date || null,
    status: String(exam.status || 'draft').toLowerCase(),
  };
}

function normalizeExamMark(mark) {
  if (!mark) return mark;
  return {
    ...mark,
    id: mark.id || mark.markId || `${mark.examId}-${mark.studentId}`,
    examId: mark.examId || mark.exam_id || mark.exam?.id || null,
    examName: mark.examName || mark.exam?.name || mark.examTitle || '',
    studentId: mark.studentId || mark.student_id || mark.student?.id || null,
    studentName: mark.studentName
      || mark.student?.fullName
      || mark.student?.name
      || [mark.student?.firstName, mark.student?.lastName].filter(Boolean).join(' ')
      || '',
    classId: mark.classId || mark.class_id || mark.exam?.classId || null,
    className: mark.className || mark.class?.name || mark.exam?.className || '',
    marksObtained: mark.marksObtained != null ? Number(mark.marksObtained) : Number(mark.marks ?? mark.score ?? 0),
    maxMarks: mark.maxMarks != null ? Number(mark.maxMarks) : Number(mark.exam?.maxMarks ?? 100),
    grade: mark.grade || '',
    rank: mark.rank != null ? Number(mark.rank) : null,
    comments: mark.comments || mark.remark || '',
    published: mark.published === true || String(mark.exam?.status || '').toLowerCase() === 'published',
  };
}

function normalizeLoginEvent(event) {
  if (!event) return event;
  const createdAt = event.createdAt || event.timestamp || event.loggedAt || event.time || null;
  let createdAtLabel = createdAt;
  if (createdAt) {
    const date = new Date(createdAt);
    if (!Number.isNaN(date.getTime())) {
      createdAtLabel = date.toLocaleString(undefined, {
        year: 'numeric',
        month: 'short',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
      });
    }
  }
  return {
    ...event,
    id: event.id || event.eventId || `${event.userId || 'user'}-${createdAt || Date.now()}`,
    userId: event.userId || event.user?.id || null,
    userName: event.userName || event.user?.name || event.name || 'Unknown user',
    email: event.email || event.user?.email || '',
    ip: event.ip || event.ipAddress || event.clientIp || '—',
    device: event.device || event.userAgent || event.client || '—',
    status: String(event.status || event.result || 'success').toLowerCase(),
    failureReason: event.failureReason || event.reason || event.errorMessage || null,
    createdAt,
    createdAtLabel,
  };
}

export const timetableService = createCrudService({
  key: 'timetable',
  resource: 'timetable',
  seed: TIMETABLE_SEED,
  idPrefix: 'tt',
  normalizeItem: normalizeTimetableSlot,
});

/** Parent: only the child's class timetable (`GET /parent/timetable`). */
export const parentTimetableService = {
  async list(filters = {}) {
    return routeRequest({
      mockFn: async () => {
        await delay(120);
        const { getParentDashboard } = await import('../parentService.js');
        const parentId = filters.parentId || filters.userId || null;
        const dashboard = parentId
          ? await getParentDashboard(parentId, filters.schoolId || null, { id: parentId })
          : { children: [] };
        const children = dashboard.children || [];
        const classIds = new Set(
          children.map((child) => child.classId).filter(Boolean).map(String),
        );
        if (filters.classId) {
          classIds.clear();
          classIds.add(String(filters.classId));
        }
        if (!classIds.size) return [];
        const slots = await timetableService.list();
        return slots
          .filter((slot) => classIds.has(String(slot.classId)))
          .map(normalizeTimetableSlot)
          .sort((a, b) => {
            const dayOrder = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
            const dayDiff = dayOrder.indexOf(a.day) - dayOrder.indexOf(b.day);
            if (dayDiff !== 0) return dayDiff;
            return Number(a.period || 0) - Number(b.period || 0);
          });
      },
      apiFn: async () => {
        const params = {};
        if (filters.classId) params.classId = filters.classId;
        if (filters.studentId) params.studentId = filters.studentId;
        return asCrudList(await api.get('/parent/timetable', params))
          .map(normalizeTimetableSlot);
      },
    });
  },
  async getById() {
    throw new Error('Parent timetable is read-only.');
  },
  async create() {
    throw new Error('Parents cannot edit the timetable.');
  },
  async update() {
    throw new Error('Parents cannot edit the timetable.');
  },
  async remove() {
    throw new Error('Parents cannot edit the timetable.');
  },
};

/** Teacher: own teaching timetable (`GET /teacher/timetable`). */
export const teacherTimetableService = {
  async list(filters = {}) {
    return routeRequest({
      mockFn: async () => {
        await delay(120);
        const slots = await timetableService.list();
        const teacherId = filters.teacherId || filters.userId || null;
        if (!teacherId) return slots.map(normalizeTimetableSlot);
        return slots
          .filter((slot) => String(slot.teacherId || '') === String(teacherId))
          .map(normalizeTimetableSlot);
      },
      apiFn: async () => asCrudList(await api.get('/teacher/timetable', filters))
        .map(normalizeTimetableSlot),
    });
  },
  async getById() {
    throw new Error('Teacher timetable is read-only here.');
  },
  async create() {
    throw new Error('Teachers cannot create timetable slots here.');
  },
  async update() {
    throw new Error('Teachers cannot edit timetable slots here.');
  },
  async remove() {
    throw new Error('Teachers cannot delete timetable slots here.');
  },
};

function normalizeTimetableSlot(slot) {
  if (!slot) return slot;
  return {
    ...slot,
    id: slot.id || `${slot.classId}-${slot.day}-${slot.period}`,
    classId: slot.classId || slot.class_id || slot.class?.id || null,
    className: slot.className || slot.class?.name || '',
    day: slot.day || slot.weekday || '',
    period: slot.period != null ? Number(slot.period) : null,
    startTime: slot.startTime || slot.start || '',
    endTime: slot.endTime || slot.end || '',
    subjectId: slot.subjectId || slot.subject_id || slot.subject?.id || null,
    subject: slot.subject || slot.subjectName || slot.subject?.name || '',
    teacherId: slot.teacherId || slot.teacher_id || slot.teacher?.id || null,
    teacherName: slot.teacherName || slot.teacher?.name || slot.teacher?.fullName || '',
    room: slot.room || slot.roomNo || '',
  };
}

export const leaveService = (() => {
  const base = createCrudService({
    key: 'leave_requests',
    resource: 'leave-requests',
    seed: LEAVE_SEED,
    idPrefix: 'leave',
  });

  async function approve(id, body = {}) {
    return routeRequest({
      mockFn: async () => base.update(id, {
        status: 'approved',
        reviewNote: body.reviewNote || null,
        reviewedAt: new Date().toISOString(),
      }),
      apiFn: async () => {
        try {
          return await api.post(`/admin/leave-requests/${id}/approve`, body);
        } catch (err) {
          const status = Number(err?.status || 0);
          if (status !== 404 && status !== 405) throw err;
          return base.update(id, {
            status: 'approved',
            reviewNote: body.reviewNote || null,
          });
        }
      },
    });
  }

  async function reject(id, body = {}) {
    return routeRequest({
      mockFn: async () => base.update(id, {
        status: 'rejected',
        reviewNote: body.reviewNote || null,
        reviewedAt: new Date().toISOString(),
      }),
      apiFn: async () => {
        try {
          return await api.post(`/admin/leave-requests/${id}/reject`, body);
        } catch (err) {
          const status = Number(err?.status || 0);
          if (status !== 404 && status !== 405) throw err;
          return base.update(id, {
            status: 'rejected',
            reviewNote: body.reviewNote || null,
          });
        }
      },
    });
  }

  return { ...base, approve, reject };
})();

export const lmsService = createCrudService({
  key: 'lms',
  resource: 'lms',
  seed: LMS_SEED,
  idPrefix: 'lms',
});

export const transportVehicleService = createCrudService({
  key: 'transport_vehicles',
  resource: 'transport/vehicles',
  seed: TRANSPORT_VEHICLE_SEED,
  idPrefix: 'bus',
  normalizeItem: (item) => {
    if (!item) return item;
    const driver = item.driver && typeof item.driver === 'object' ? item.driver : {};
    return {
      ...item,
      id: item.id || item.vehicleId,
      vehicleNumber: item.vehicleNumber || item.vehicle_number || item.number || '',
      driverUserId: item.driverUserId || item.driver_user_id || driver.id || driver.userId || '',
      driverName: item.driverName || item.driver_name || driver.name || '',
      driverPhone: item.driverPhone || item.driver_phone || driver.mobile || driver.phone || '',
      routeId: item.routeId || item.route_id || item.route?.id || '',
      routeName: item.routeName || item.route?.name || '',
      status: item.status || 'active',
    };
  },
});

export const transportRouteService = createCrudService({
  key: 'transport_routes',
  resource: 'transport/routes',
  seed: TRANSPORT_ROUTE_SEED,
  idPrefix: 'route',
  normalizeItem: (item) => {
    if (!item) return item;
    return {
      ...item,
      id: item.id || item.routeId,
      name: item.name || item.routeName || '',
      vehicleId: item.vehicleId || item.vehicle_id || item.vehicle?.id || '',
      stops: item.stops || item.stopList || [],
      status: item.status || 'active',
    };
  },
});

export const transportAssignmentService = createCrudService({
  key: 'transport_assignments',
  resource: 'transport/assignments',
  seed: TRANSPORT_ASSIGNMENT_SEED,
  idPrefix: 'ta',
  normalizeItem: (item) => {
    if (!item) return item;
    const pickupAddressLabel = resolveAssignmentHomeAddressLabel(item);
    return {
      ...item,
      id: item.id || item.assignmentId,
      classId: item.classId || item.class_id || '',
      studentId: item.studentId || item.student_id || '',
      routeId: item.routeId || item.route_id || '',
      stopId: item.stopId || item.stop_id || '',
      vehicleId: item.vehicleId || item.vehicle_id || '',
      direction: item.direction || 'both',
      status: item.status || 'active',
      stopName: item.stopName || item.stop_name || item.assignedStop || '',
      studentName: item.studentName || item.student_name || '',
      className: item.className || item.class_name || '',
      routeName: item.routeName || item.route_name || '',
      vehicleNumber: item.vehicleNumber || item.vehicle_number || '',
      pickupAddressLabel,
      addressLabel: pickupAddressLabel,
    };
  },
});

export const libraryBookService = createCrudService({
  key: 'library_books',
  resource: 'library/books',
  seed: LIBRARY_BOOK_SEED,
  idPrefix: 'book',
});

export const libraryIssueService = createCrudService({
  key: 'library_issues',
  resource: 'library/issues',
  seed: LIBRARY_ISSUE_SEED,
  idPrefix: 'issue',
});

/** Parent-facing library issues for linked students (`GET /parent/library/issues`). */
export const parentLibraryIssueService = {
  async list(filters = {}) {
    const normalize = (item) => {
      if (!item) return null;
      const book = item.book && typeof item.book === 'object' ? item.book : {};
      const student = item.student && typeof item.student === 'object' ? item.student : {};
      return {
        ...item,
        id: item.id || item.issueId,
        bookId: item.bookId || item.book_id || book.id || '',
        bookTitle: item.bookTitle || item.book_title || book.title || item.title || '',
        studentId: item.studentId || item.student_id || student.id || '',
        studentName: item.studentName
          || item.student_name
          || student.fullName
          || student.name
          || '',
        classId: item.classId || item.class_id || student.classId || '',
        className: item.className || item.class_name || student.className || '',
        issueDate: item.issueDate || item.issue_date || item.issuedAt || '',
        dueDate: item.dueDate || item.due_date || '',
        returnDate: item.returnDate || item.return_date || '',
        fine: item.fine ?? item.fineAmount ?? 0,
        status: String(item.status || 'issued').toLowerCase(),
      };
    };

    return routeRequest({
      mockFn: async () => {
        await delay(120);
        const list = await libraryIssueService.list(filters);
        return (Array.isArray(list) ? list : []).map(normalize).filter(Boolean);
      },
      apiFn: async () => {
        const raw = asCrudList(await api.get('/parent/library/issues', filters));
        return raw.map(normalize).filter(Boolean);
      },
    });
  },
  async getById(id) {
    return routeRequest({
      mockFn: async () => libraryIssueService.getById(id),
      apiFn: async () => api.get(`/parent/library/issues/${id}`),
    });
  },
};

libraryIssueService.returnBook = async function returnBook(id) {
  return routeRequest({
    mockFn: async () => {
      await delay(150);
      const items = libraryIssueService.readAll();
      const index = items.findIndex((item) => item.id === id);
      if (index < 0) throw new Error('Issue record not found');
      const today = new Date().toISOString().slice(0, 10);
      items[index] = {
        ...items[index],
        status: 'returned',
        returnDate: today,
        updatedAt: new Date().toISOString(),
      };
      libraryIssueService.writeAll(items);
      return items[index];
    },
    apiFn: async () => {
      try {
        return await api.post(`/admin/library/issues/${id}/return`, {});
      } catch (err) {
        // Fallback if return endpoint is not wired yet.
        if (err?.status === 404 || err?.code === 'NOT_FOUND') {
          return libraryIssueService.update(id, {
            status: 'returned',
            returnDate: new Date().toISOString().slice(0, 10),
          });
        }
        throw err;
      }
    },
  });
};
export const inventoryService = createCrudService({
  key: 'inventory',
  resource: 'inventory',
  seed: INVENTORY_SEED,
  idPrefix: 'inv',
});

export const hrStaffService = createCrudService({
  key: 'hr_staff',
  resource: 'hr/staff',
  seed: HR_STAFF_SEED,
  idPrefix: 'staff',
});

export const payrollService = createCrudService({
  key: 'payroll',
  resource: 'payroll',
  seed: PAYROLL_SEED,
  idPrefix: 'pay',
  normalizeItem: (item) => {
    if (!item) return item;
    return {
      ...item,
      id: item.id || item.payslipId || item.payrollId,
      staffId: item.staffId || item.staff_id || item.employeeRecordId || '',
      employeeName: item.employeeName || item.employee_name || item.staffName || '',
      employeeCode: item.employeeCode || item.employee_code || item.employeeId || item.employee_id || '',
      month: item.month || item.payrollMonth || item.payroll_month || '',
      basic: item.basic ?? item.basicPay ?? item.basic_pay ?? 0,
      allowances: item.allowances ?? 0,
      deductions: item.deductions ?? 0,
      bonuses: item.bonuses ?? item.bonus ?? 0,
      netPay: item.netPay ?? item.net_pay ?? 0,
      status: item.status || 'generated',
    };
  },
});

export const expenseService = createCrudService({
  key: 'expenses',
  resource: 'expenses',
  seed: EXPENSE_SEED,
  idPrefix: 'exp',
});

const certificateCrud = createCrudService({
  key: 'certificates',
  resource: 'certificates',
  seed: CERTIFICATE_SEED,
  idPrefix: 'cert',
});

/** Bound list so React Query cannot pass QueryFunctionContext as filters. */
export const certificateService = {
  ...certificateCrud,
  list: (filters = {}) => certificateCrud.list(
    filters && typeof filters === 'object' && !Array.isArray(filters) && ('queryKey' in filters || 'signal' in filters)
      ? {}
      : (filters || {}),
  ),
  getById: (...args) => certificateCrud.getById(...args),
  create: (...args) => certificateCrud.create(...args),
  update: (...args) => certificateCrud.update(...args),
  remove: (...args) => certificateCrud.remove(...args),
  readAll: (...args) => certificateCrud.readAll(...args),
  writeAll: (...args) => certificateCrud.writeAll(...args),
};

export const subscriptionService = createCrudService({
  key: 'subscription_plans',
  resource: 'subscription/plans',
  seed: SUBSCRIPTION_SEED,
  idPrefix: 'plan',
});

export const loginHistoryService = createCrudService({
  key: 'login_history',
  resource: 'security/login-history',
  seed: LOGIN_HISTORY_SEED,
  idPrefix: 'login',
  normalizeItem: normalizeLoginEvent,
});

function normalizePerformanceNote(item) {
  if (!item) return item;
  const student = item.student && typeof item.student === 'object' ? item.student : {};
  const classRef = item.class && typeof item.class === 'object' ? item.class : {};
  return {
    ...item,
    id: item.id || item.noteId,
    classId: item.classId || item.class_id || classRef.id || null,
    className: item.className || item.class_name || classRef.name || '',
    studentId: item.studentId || item.student_id || student.id || null,
    studentName: item.studentName
      || item.student_name
      || student.fullName
      || student.name
      || '',
    subject: item.subject || item.subjectName || '',
    note: item.note || item.body || item.message || '',
    visibility: String(item.visibility || 'private').toLowerCase(),
    teacherName: item.teacherName || item.createdByName || item.createdBy || '',
    createdAt: item.createdAt || null,
    updatedAt: item.updatedAt || null,
  };
}

export const performanceNoteService = createCrudService({
  key: 'performance_notes',
  resource: 'performance-notes',
  seed: PERFORMANCE_NOTE_SEED,
  idPrefix: 'note',
  normalizeItem: normalizePerformanceNote,
});

/** Parent-facing notes shared for linked students (`GET /parent/performance-notes`). */
export const parentPerformanceNoteService = {
  async list(filters = {}) {
    return routeRequest({
      mockFn: async () => {
        await delay(120);
        const list = await performanceNoteService.list(filters);
        return (Array.isArray(list) ? list : [])
          .map(normalizePerformanceNote)
          .filter((item) => item && item.visibility === 'shared_parent');
      },
      apiFn: async () => {
        try {
          return asCrudList(await api.get('/parent/performance-notes', filters))
            .map(normalizePerformanceNote)
            .filter((item) => item && (
              !item.visibility || item.visibility === 'shared_parent'
            ));
        } catch (err) {
          const status = Number(err?.status || 0);
          // Fallback if parent-specific route is not wired yet.
          if (status === 404 || status === 405) {
            return asCrudList(await api.get('/performance-notes', {
              ...filters,
              visibility: 'shared_parent',
            }))
              .map(normalizePerformanceNote)
              .filter((item) => item && item.visibility === 'shared_parent');
          }
          throw err;
        }
      },
    });
  },
  async getById(id) {
    return routeRequest({
      mockFn: async () => {
        const item = normalizePerformanceNote(await performanceNoteService.getById(id));
        if (!item || item.visibility !== 'shared_parent') return null;
        return item;
      },
      apiFn: async () => {
        try {
          return normalizePerformanceNote(await api.get(`/parent/performance-notes/${id}`));
        } catch (err) {
          const status = Number(err?.status || 0);
          if (status === 404 || status === 405) {
            const items = await parentPerformanceNoteService.list();
            return items.find((item) => String(item.id) === String(id)) || null;
          }
          throw err;
        }
      },
    });
  },
  async create() {
    throw new Error('Parents cannot create performance notes.');
  },
  async update() {
    throw new Error('Parents cannot edit performance notes.');
  },
  async remove() {
    throw new Error('Parents cannot delete performance notes.');
  },
};

export async function getAccountingDashboard() {
  return routeRequest({
    mockFn: async () => {
      await delay(120);
      const expenses = await expenseService.list();
      const payroll = await payrollService.list();
      const expenseTotal = expenses.reduce((sum, item) => sum + Number(item.amount || 0), 0);
      const payrollTotal = payroll.reduce((sum, item) => sum + Number(item.netPay || 0), 0);
      return {
        totalStudents: 128,
        monthlyFeeCollection: 485000,
        pendingFees: 92000,
        expenses: expenseTotal,
        payroll: payrollTotal,
        teacherAttendance: 96.4,
        admissionGrowth: 18,
        currency: 'INR',
      };
    },
    apiFn: () => api.get('/admin/accounting/dashboard'),
  });
}

export async function askSchoolAi(question) {
  return routeRequest({
    mockFn: async () => {
      await delay(300);
      const q = String(question || '').toLowerCase();
      if (q.includes('attendance') && q.includes('75')) {
        return {
          answer: '42 students currently have attendance below 75% and need attention.',
          sources: ['Attendance reports · last 30 days'],
        };
      }
      if (q.includes('fee') || q.includes('pending')) {
        return {
          answer: 'Pending fee collection is ₹92,000 across 17 student accounts.',
          sources: ['Fee pending report'],
        };
      }
      return {
        answer: 'I can help with attendance, fees, admissions, and teacher workload once those modules are connected. Try asking about attendance below 75% or pending fees.',
        sources: ['School analytics'],
      };
    },
    apiFn: () => api.post('/admin/ai/ask', { question }),
  });
}

export async function generateAiReportComment({ studentId, notes, subject }) {
  return routeRequest({
    mockFn: async () => {
      await delay(280);
      const subjectLabel = subject || 'this subject';
      const base = notes || 'shows consistent effort';
      return {
        comment: `The student demonstrates strong conceptual understanding in ${subjectLabel}. ${base}. Continued practice with problem-solving will further strengthen performance.`,
      };
    },
    apiFn: () => api.post('/admin/ai/report-comment', { studentId, notes, subject }),
  });
}

export async function generateAiHomework({ classId, subject, topic }) {
  return routeRequest({
    mockFn: async () => {
      await delay(280);
      return {
        title: `${subject || 'Subject'} Worksheet`,
        description: `Practice worksheet on ${topic || 'core concepts'}:\n1. Warm-up questions\n2. Application problems\n3. Challenge question\n4. Reflection prompt`,
      };
    },
    apiFn: () => api.post('/admin/ai/homework', { classId, subject, topic }),
  });
}

/** @deprecated Prefer services/transportTracking/trackingApi.fetchParentTransportLive */
export async function getTransportLiveTracking() {
  const { fetchParentTransportLive } = await import('../transportTracking/trackingApi.js');
  return fetchParentTransportLive();
}
