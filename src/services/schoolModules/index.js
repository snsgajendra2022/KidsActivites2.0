import { createCrudService } from './createCrudService.js';
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
} from '../../data/schoolModuleSeeds.js';
import { delay } from '../mockApi.js';
import { api } from '../api/client.js';
import { routeRequest } from '../api/routeRequest.js';

export const homeworkService = createCrudService({
  key: 'homework',
  resource: 'homework',
  seed: HOMEWORK_SEED,
  idPrefix: 'hw',
});

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
});

export const examMarksService = createCrudService({
  key: 'exam_marks',
  resource: 'exam-marks',
  seed: EXAM_MARKS_SEED,
  idPrefix: 'mark',
});

export const timetableService = createCrudService({
  key: 'timetable',
  resource: 'timetable',
  seed: TIMETABLE_SEED,
  idPrefix: 'tt',
});

export const leaveService = createCrudService({
  key: 'leave_requests',
  resource: 'leave-requests',
  seed: LEAVE_SEED,
  idPrefix: 'leave',
});

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
});

export const transportRouteService = createCrudService({
  key: 'transport_routes',
  resource: 'transport/routes',
  seed: TRANSPORT_ROUTE_SEED,
  idPrefix: 'route',
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
});

export const expenseService = createCrudService({
  key: 'expenses',
  resource: 'expenses',
  seed: EXPENSE_SEED,
  idPrefix: 'exp',
});

export const certificateService = createCrudService({
  key: 'certificates',
  resource: 'certificates',
  seed: CERTIFICATE_SEED,
  idPrefix: 'cert',
});

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
});

export const performanceNoteService = createCrudService({
  key: 'performance_notes',
  resource: 'performance-notes',
  seed: PERFORMANCE_NOTE_SEED,
  idPrefix: 'note',
});

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
