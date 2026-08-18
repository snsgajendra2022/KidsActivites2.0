import {
  BadgeCheck,
  BarChart3,
  Bell,
  BookMarked,
  BookOpen,
  Bus,
  CalendarCheck,
  Camera,
  ClipboardList,
  FileText,
  FolderOpen,
  GraduationCap,
  Images,
  Library,
  MapPin,
  MessageCircle,
  Palette,
  QrCode,
  Receipt,
  School,
  Search,
  SearchCheck,
  Smartphone,
  Sparkles,
  Tv,
  Users,
} from 'lucide-react';

export const PLATFORM_PURPOSE =
  'One branded workspace for enrollment, classroom work, fees, live bus tracking, photos, and parent communication.';

export const HOW_IT_WORKS = [
  { step: '01', title: 'Create workspace', description: 'Register your school and get a dedicated portal.' },
  { step: '02', title: 'Configure portal', description: 'Set branding, forms, fees, classes, transport, and login.' },
  { step: '03', title: 'Parents enroll', description: 'Families apply online and upload documents.' },
  { step: '04', title: 'Review & admit', description: 'Verify payments and confirm admission.' },
  { step: '05', title: 'Run the school day', description: 'Attendance, homework, fees, bus tracking, photos, and chat.' },
];

export const PLATFORM_FEATURES = [
  { icon: ClipboardList, title: 'Online Enrollment', description: 'Digital admissions with live status tracking.' },
  { icon: FileText, title: 'Form', description: '5-page printable form and PDF download.' },
  { icon: SearchCheck, title: 'Application Review', description: 'Approve, reject, or request corrections.' },
  { icon: FolderOpen, title: 'Documents & Fees', description: 'Uploads, payment proof, and receipts.' },
  { icon: MessageCircle, title: 'Chat & Alerts', description: 'Parent communication, notices, and notifications.' },
  { icon: Camera, title: 'Photos & Albums', description: 'Classroom photos and class albums.' },
  { icon: Tv, title: 'QR & TV Playback', description: 'Show albums on classroom and lobby TVs.' },
  { icon: Users, title: 'Role-Based Portals', description: 'Admin, teacher, parent, and driver dashboards.' },
  { icon: CalendarCheck, title: 'Attendance', description: 'Mark daily attendance and share history with families.' },
  { icon: BookOpen, title: 'Homework & Exams', description: 'Assign work, collect submissions, and publish marks.' },
  { icon: GraduationCap, title: 'Digital Classroom', description: 'LMS courses, progress tracking, and certificates.' },
  { icon: Bus, title: 'Live Bus Tracking', description: 'GPS routes for admins, drivers, and parents.' },
];

export const PLATFORM_ROLES = [
  { title: 'School Admin', items: 'Applications, classes, fees, transport, library, users, and portal settings.' },
  { title: 'Admission Officer', items: 'Review applications, verify docs, and manage corrections.' },
  { title: 'Accountant', items: 'Fee records, payment verification, receipts, payroll, and reports.' },
  { title: 'Teacher', items: 'Attendance, homework, exams, LMS, photos, albums, and parent chat.' },
  { title: 'Parent', items: 'Enrollment, fees, homework, exams, photos, leave, and live bus tracking.' },
  { title: 'Driver', items: 'Assigned routes, trip start, and live GPS sharing with the school.' },
  { title: 'Support Staff', items: 'Help families and handle school support chat.' },
];

export const ADMISSION_PIPELINE = [
  { title: 'Draft', description: 'Save progress' },
  { title: 'Submitted', description: 'In the queue' },
  { title: 'Review', description: 'Staff checks' },
  { title: 'Correction', description: 'Parent updates' },
  { title: 'Fees', description: 'Verify payment' },
  { title: 'Approved', description: 'Confirm admit' },
];

export const ENROLLMENT_PAGES = [
  { page: 'Page 1', details: 'Child, class, photos, address' },
  { page: 'Page 2', details: 'Health & immunization' },
  { page: 'Page 3', details: 'Family & guardians' },
  { page: 'Page 4', details: 'Emergency contacts' },
  { page: 'Page 5', details: 'Signatures & office use' },
];

export const ENROLLMENT_WORKFLOW = [
  'Draft',
  'Validate',
  'Submit',
  'Correct',
  'Documents',
  'PDF',
  'Review',
];

export const FEES_AND_DOCS = [
  { icon: Receipt, title: 'Fee structures', description: 'Admission, tuition, transport, and more by class.' },
  { icon: BadgeCheck, title: 'Payment verify', description: 'Upload proof; staff approve or reject.' },
  { icon: FolderOpen, title: 'Secure documents', description: 'Upload, preview, and download safely.' },
  { icon: BookOpen, title: 'Digital receipts', description: 'Receipt numbers after verification.' },
];

export const OPERATIONS = [
  { icon: School, title: 'Class management', description: 'Create classes and assign teachers.' },
  { icon: Users, title: 'User management', description: 'Invite staff and manage roles.' },
  { icon: Palette, title: 'Portal settings', description: 'Menus, branding, landing page, and form builder.' },
  { icon: BarChart3, title: 'Reports & audit', description: 'Track applications, fees, attendance, and actions.' },
  { icon: Library, title: 'Library', description: 'Catalog books and track issues and returns.' },
  { icon: Search, title: 'Global search', description: 'Find pages, students, fees, and records with ⌘K.' },
  { icon: Sparkles, title: 'AI assistant', description: 'School Q&A, homework help, and report comments.' },
  { icon: Palette, title: 'Creative Cards', description: 'Greeting and celebration cards for school moments.' },
];

export const CLASSROOM_MODULES = [
  { icon: CalendarCheck, title: 'Daily attendance', description: 'Mark class sessions and share history with parents.' },
  { icon: BookOpen, title: 'Homework', description: 'Assign work, track submissions, and send reminders.' },
  { icon: FileText, title: 'Exams & marks', description: 'Create exams, enter marks, and publish results.' },
  { icon: ClipboardList, title: 'Timetable', description: 'Publish class schedules for teachers and families.' },
  { icon: GraduationCap, title: 'Digital classroom', description: 'Courses, lessons, progress, and certificates.' },
  { icon: BookMarked, title: 'Leave requests', description: 'Parents apply; staff review and approve.' },
];

export const TRANSPORT_MODULES = [
  { icon: Bus, title: 'Fleet & drivers', description: 'Manage vehicles, drivers, and assigned routes.' },
  { icon: MapPin, title: 'Live GPS map', description: 'Watch buses in real time from the admin workspace.' },
  { icon: Smartphone, title: 'Parent bus tracking', description: 'Families see their child’s bus on the way home.' },
  { icon: ClipboardList, title: 'Trips & history', description: 'Start trips, log stops, and review past runs.' },
];

export const COMMUNICATION_MEDIA = [
  { icon: MessageCircle, title: 'Real-time chat', description: 'Parents, teachers, drivers, and staff messaging.' },
  { icon: Bell, title: 'Notifications', description: 'Instant alerts for school updates.' },
  { icon: Camera, title: 'Parent photo feed', description: 'Classroom moments shared privately.' },
  { icon: Images, title: 'Teacher sharing', description: 'Send photos to classes or parents.' },
  { icon: FolderOpen, title: 'Class albums', description: 'Images and videos per class.' },
  { icon: Tv, title: 'TV-ready albums', description: 'Display on lobby and classroom screens.' },
];

export const TV_PLAYBACK_STEPS = [
  {
    id: 'tv-qr',
    label: 'TV shows QR',
    icon: QrCode,
    description: 'The TV opens the album player and shows a secure QR code.',
  },
  {
    id: 'scan',
    label: 'Scan from app',
    icon: Smartphone,
    description: 'Teacher or admin scans the QR to authorize the session.',
  },
  {
    id: 'album',
    label: 'Select album',
    icon: Images,
    description: 'Choose an approved class album from the mobile app.',
  },
  {
    id: 'play',
    label: 'TV playback',
    icon: Tv,
    description: 'Slideshow starts. Change albums anytime from the app.',
  },
];

export const TV_PLAYBACK_DETAILS = [
  'QR approval',
  'Album select',
  'TV playback',
  'Photos & video',
];

export const MOBILE_APP_ROLES = [
  {
    role: 'Parent app',
    description: 'Fees, homework, exams, photos, chat, and live bus tracking.',
    screens: [
      { label: 'Home', title: 'Good morning', detail: 'Anaya · Class 3-B', kind: 'home' },
      { label: 'Photos', title: 'Class album', detail: '12 new photos today', kind: 'photos' },
      { label: 'Fees', title: 'Term fee', detail: '₹8,200 due this week', kind: 'fees' },
      { label: 'Homework', title: 'Math worksheet', detail: 'Due tomorrow', kind: 'homework' },
      { label: 'Exams', title: 'Science result', detail: '92 / 100 published', kind: 'exams' },
      { label: 'Bus tracking', title: 'Bus 12', detail: '4 min from home', kind: 'bus' },
      { label: 'Chat', title: 'Ms. Priya', detail: 'Field trip reminder', kind: 'chat' },
      { label: 'Enrollment', title: 'Application', detail: 'In principal review', kind: 'enroll' },
    ],
  },
  {
    role: 'Teacher app',
    description: 'Attendance, homework, photos, albums, chat, and TV QR.',
    screens: [
      { label: 'Classes', title: 'Class 3-B', detail: '30 students · Today', kind: 'classes' },
      { label: 'Attendance', title: 'Marked', detail: '28 present · 2 late', kind: 'attendance' },
      { label: 'Homework', title: 'To review', detail: '18 of 24 submitted', kind: 'homework' },
      { label: 'Exams', title: 'Enter marks', detail: 'Science test · 3-B', kind: 'exams' },
      { label: 'Photos', title: 'Share safely', detail: 'Send to class parents', kind: 'photos' },
      { label: 'Albums', title: 'Sports Day', detail: 'Ready for lobby TV', kind: 'albums' },
      { label: 'Chat', title: 'Class message', detail: '28 parents delivered', kind: 'chat' },
      { label: 'TV QR', title: 'Pair TV', detail: 'Scan to start slideshow', kind: 'tvqr' },
    ],
  },
  {
    role: 'Admin app',
    description: 'Applications, reports, transport, users, chat, and TV sign-in.',
    screens: [
      { label: 'Applications', title: '3 new admits', detail: 'Ready for review', kind: 'enroll' },
      { label: 'Classes', title: 'School structure', detail: '12 classes assigned', kind: 'classes' },
      { label: 'Reports', title: 'This week', detail: 'Fees · Attendance · Audit', kind: 'reports' },
      { label: 'Transport', title: 'Fleet live', detail: 'Bus 12 on route', kind: 'bus' },
      { label: 'Users', title: 'Staff & families', detail: 'Invite and manage roles', kind: 'users' },
      { label: 'Chat', title: 'Office inbox', detail: 'Support + parent threads', kind: 'chat' },
      { label: 'TV Sign-In', title: 'Lobby TV', detail: 'Authorize playback', kind: 'tvqr' },
    ],
  },
  {
    role: 'Driver app',
    description: 'Assigned route, start trip, live GPS, and stop checklist.',
    screens: [
      { label: 'Route', title: 'Morning route A', detail: 'Bus 12 · 8 stops', kind: 'route' },
      { label: 'Start trip', title: 'Ready to go', detail: 'Share GPS with parents', kind: 'trip' },
      { label: 'Live GPS', title: 'Broadcasting', detail: 'Families can follow', kind: 'gps' },
      { label: 'Stops', title: 'Next: City Park', detail: '3 of 8 complete', kind: 'stops' },
    ],
  },
];
