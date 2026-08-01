const now = new Date().toISOString();
const today = now.slice(0, 10);

export const HOMEWORK_SEED = [
  {
    id: 'hw-1',
    title: 'Math practice worksheet',
    subjectId: 'subj-math',
    subject: 'Mathematics',
    classId: 'cls-2',
    className: 'Nursery',
    dueDate: today,
    status: 'assigned',
    description: 'Complete addition and subtraction exercises 1–20.',
    attachments: [],
    assignedStudentIds: null,
    assignedCount: 'Entire class',
    teacherId: null,
    createdBy: 'Teacher',
    createdAt: now,
  },
  {
    id: 'hw-2',
    title: 'Reading comprehension',
    subjectId: 'subj-eng',
    subject: 'English',
    classId: 'cls-1',
    className: 'Toddler Group',
    dueDate: today,
    status: 'assigned',
    description: 'Read the short story and answer 5 questions.',
    attachments: [],
    assignedStudentIds: null,
    assignedCount: 'Entire class',
    teacherId: null,
    createdBy: 'Teacher',
    createdAt: now,
  },
];

export const HOMEWORK_SUBMISSION_SEED = [
  {
    id: 'hws-1',
    homeworkId: 'hw-1',
    studentId: null,
    studentName: 'Aarav Sharma',
    status: 'submitted',
    marks: null,
    comments: '',
    submittedAt: now,
  },
];

export const EXAM_SEED = [
  {
    id: 'exam-1',
    name: 'Unit Test 1',
    type: 'unit_test',
    classId: 'cls-2',
    className: 'Nursery',
    subjectId: 'subj-math',
    subject: 'Mathematics',
    maxMarks: 50,
    examDate: today,
    status: 'scheduled',
    createdAt: now,
  },
  {
    id: 'exam-2',
    name: 'Mid Term Examination',
    type: 'mid_term',
    classId: 'cls-1',
    className: 'Toddler Group',
    subjectId: 'subj-all',
    subject: 'All Subjects',
    maxMarks: 100,
    examDate: today,
    status: 'draft',
    createdAt: now,
  },
];

export const EXAM_MARKS_SEED = [
  {
    id: 'mark-1',
    examId: 'exam-1',
    examName: 'Unit Test 1',
    studentId: null,
    studentName: 'Aarav Sharma',
    classId: 'cls-2',
    className: 'Nursery',
    marksObtained: 42,
    maxMarks: 50,
    grade: 'A',
    rank: 1,
    comments: 'Strong conceptual understanding.',
    createdAt: now,
  },
];

export const TIMETABLE_SEED = [
  {
    id: 'tt-1',
    classId: 'cls-2',
    className: 'Nursery',
    day: 'Monday',
    period: 1,
    startTime: '09:00',
    endTime: '09:40',
    subjectId: 'subj-math',
    subject: 'Mathematics',
    teacherId: null,
    teacherName: 'Ms. Mehta',
    room: 'A-101',
    createdAt: now,
  },
  {
    id: 'tt-2',
    classId: 'cls-2',
    className: 'Nursery',
    day: 'Monday',
    period: 2,
    startTime: '09:45',
    endTime: '10:25',
    subjectId: 'subj-eng',
    subject: 'English',
    teacherId: null,
    teacherName: 'Mr. Khan',
    room: 'A-101',
    createdAt: now,
  },
];

export const LEAVE_SEED = [
  {
    id: 'leave-1',
    studentId: null,
    studentName: 'Aarav Sharma',
    classId: 'cls-2',
    className: 'Nursery',
    fromDate: today,
    toDate: today,
    reason: 'Fever',
    status: 'pending',
    requestedBy: 'Parent',
    createdAt: now,
  },
];

export const LMS_SEED = [
  {
    id: 'lms-1',
    title: 'Introduction to Numbers',
    type: 'video_lesson',
    className: 'Class 1',
    subject: 'Mathematics',
    status: 'published',
    description: 'Animated lesson introducing counting and place value.',
    resourceUrl: '',
    createdAt: now,
  },
  {
    id: 'lms-2',
    title: 'Class 1 Practice Quiz',
    type: 'quiz',
    className: 'Class 1',
    subject: 'Mathematics',
    status: 'published',
    description: '10-question practice quiz.',
    resourceUrl: '',
    createdAt: now,
  },
];

export const TRANSPORT_VEHICLE_SEED = [
  {
    id: 'bus-1',
    vehicleNumber: 'MH-12-AB-1234',
    capacity: 40,
    driverName: 'Ramesh Patil',
    driverPhone: '9876543210',
    attendantName: 'Sita Devi',
    status: 'active',
    routeId: 'route-1',
    routeName: 'North Route',
    createdAt: now,
  },
];

export const TRANSPORT_ROUTE_SEED = [
  {
    id: 'route-1',
    name: 'North Route',
    vehicleId: 'bus-1',
    stops: [
      {
        id: 'stop-a',
        name: 'Stop A',
        sequence: 1,
        lat: 18.5679,
        lng: 73.9143,
        radiusMeters: 80,
        stopType: 'pickup',
      },
      {
        id: 'stop-b',
        name: 'Stop B',
        sequence: 2,
        lat: 18.5523,
        lng: 73.8794,
        radiusMeters: 80,
        stopType: 'pickup',
      },
      {
        id: 'stop-school',
        name: 'School Gate',
        sequence: 3,
        lat: 18.5204,
        lng: 73.8567,
        radiusMeters: 100,
        stopType: 'school',
      },
    ],
    morningStart: '07:30',
    eveningStart: '14:30',
    status: 'active',
    createdAt: now,
  },
];

export const LIBRARY_BOOK_SEED = [
  {
    id: 'book-1',
    title: 'The Little Prince',
    author: 'Antoine de Saint-Exupéry',
    isbn: '9780156013987',
    barcode: 'LIB-0001',
    copies: 5,
    available: 4,
    category: 'Fiction',
    status: 'available',
    createdAt: now,
  },
];

export const LIBRARY_ISSUE_SEED = [
  {
    id: 'issue-1',
    bookId: 'book-1',
    bookTitle: 'The Little Prince',
    studentName: 'Aarav Sharma',
    issueDate: today,
    dueDate: today,
    returnDate: '',
    fine: 0,
    status: 'issued',
    createdAt: now,
  },
];

export const INVENTORY_SEED = [
  {
    id: 'inv-1',
    name: 'Desktop Computer',
    category: 'IT',
    quantity: 12,
    location: 'Computer Lab',
    condition: 'good',
    purchaseDate: '2025-06-01',
    status: 'in_stock',
    createdAt: now,
  },
  {
    id: 'inv-2',
    name: 'Football Set',
    category: 'Sports',
    quantity: 8,
    location: 'Sports Store',
    condition: 'good',
    purchaseDate: '2025-08-12',
    status: 'in_stock',
    createdAt: now,
  },
];

export const HR_STAFF_SEED = [
  {
    id: 'staff-1',
    name: 'Priya Mehta',
    role: 'Teacher',
    department: 'Academics',
    employeeId: 'EMP-101',
    phone: '9988776655',
    email: 'priya@school.test',
    joiningDate: '2023-04-01',
    status: 'active',
    createdAt: now,
  },
];

export const PAYROLL_SEED = [
  {
    id: 'pay-1',
    employeeName: 'Priya Mehta',
    month: '2026-07',
    basic: 35000,
    allowances: 5000,
    deductions: 2500,
    bonuses: 1000,
    netPay: 38500,
    status: 'generated',
    createdAt: now,
  },
];

export const EXPENSE_SEED = [
  {
    id: 'exp-1',
    category: 'Utilities',
    title: 'Electricity Bill',
    amount: 18500,
    date: today,
    status: 'paid',
    createdAt: now,
  },
];

export const CERTIFICATE_SEED = [
  {
    id: 'cert-1',
    type: 'bonafide',
    studentName: 'Aarav Sharma',
    className: 'Class 1',
    purpose: 'Bank account opening',
    status: 'issued',
    certificateNumber: 'BNF-2026-0001',
    issuedAt: now,
    createdAt: now,
  },
];

export const SUBSCRIPTION_SEED = [
  {
    id: 'plan-starter',
    name: 'Starter',
    priceMonthly: 4999,
    studentLimit: 500,
    features: 'Attendance, Homework, Notices',
    status: 'available',
    createdAt: now,
  },
  {
    id: 'plan-pro',
    name: 'Professional',
    priceMonthly: 9999,
    studentLimit: 1500,
    features: 'Fees, Exams, Parent app, Transport',
    status: 'available',
    createdAt: now,
  },
  {
    id: 'plan-enterprise',
    name: 'Enterprise',
    priceMonthly: 24999,
    studentLimit: 10000,
    features: 'AI, Multiple branches, Custom branding',
    status: 'available',
    createdAt: now,
  },
];

export const LOGIN_HISTORY_SEED = [
  {
    id: 'login-1',
    userName: 'School Admin',
    email: 'admin@school.test',
    ip: '192.168.1.10',
    device: 'Chrome / macOS',
    status: 'success',
    createdAt: now,
  },
];

export const PERFORMANCE_NOTE_SEED = [
  {
    id: 'note-1',
    studentName: 'Aarav Sharma',
    className: 'Class 1',
    subject: 'Mathematics',
    note: 'Shows improvement in problem solving. Needs more practice with word problems.',
    visibility: 'private',
    createdBy: 'Teacher',
    createdAt: now,
  },
];
