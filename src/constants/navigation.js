import {
  Award, Banknote, BarChart3, Bell, BookMarked, BookOpen, Bot, Briefcase, Bus,
  CalendarClock, CalendarOff, CircleDollarSign, ClipboardCheck, ClipboardList,
  Contact, CreditCard, FileBadge, FileInput, FileText, FolderOpen, GraduationCap,
  History, Home, IdCard, Image, Images, Layers, Library, ListChecks, LogOut,
  MapPinned, Megaphone, MessageCircle, MonitorPlay, Package, Palette, PenLine,
  PieChart, Radio, Receipt, Route, School, ScrollText, Settings, Shield,
  Stamp, UserCheck, UserCog, UsersRound, Wallet,
} from 'lucide-react';
import { ROLES } from './roles.js';

/** Section header icons used by the collapsed sidebar rail + flyout. */
export const NAV_SECTION_ICONS = {
  School: School,
  Classroom: GraduationCap,
  Transport: Bus,
  Finance: Wallet,
  Communication: MessageCircle,
  Settings: Settings,
  Family: Home,
  Account: UserCheck,
  Platform: Layers,
  More: Layers,
};

export const PORTAL_BRANDING_NAV = {
  id: 'admin_portal_settings',
  to: '/admin/portal-settings',
  label: 'Portal Branding',
  icon: Palette,
  iconName: 'Palette',
  section: 'School',
};

export const CREATIVE_CARDS_NAV = {
  id: 'creative_cards',
  to: '/creative-cards',
  label: 'Creative Cards',
  icon: Stamp,
  iconName: 'Stamp',
  section: 'Classroom',
};

/**
 * Admin product areas (few buckets):
 * School · Classroom · Transport · Finance · Communication · Settings
 */
const ADMIN_CORE_NAV = [
  // School — people, admissions, ops, media docs
  { id: 'admin_applications', to: '/admin/applications', label: 'Enrollment Applications', icon: FileInput, iconName: 'FileInput', section: 'School' },
  { id: 'admin_students', to: '/admin/students', label: 'Students', icon: GraduationCap, iconName: 'GraduationCap', section: 'School' },
  { id: 'admin_class_management', to: '/admin/class-management', label: 'Class Management', icon: School, iconName: 'School', section: 'School' },
  { id: 'admin_attendance', to: '/admin/attendance', label: 'Attendance', icon: ClipboardCheck, iconName: 'ClipboardCheck', section: 'School' },
  { id: 'admin_attendance_advanced', to: '/admin/attendance-advanced', label: 'Advanced Attendance', icon: ClipboardList, iconName: 'ClipboardList', section: 'School' },
  { id: 'admin_leave', to: '/admin/leave', label: 'Leave Approvals', icon: CalendarOff, iconName: 'CalendarOff', section: 'School' },
  { id: 'admin_library_books', to: '/admin/library/books', label: 'Library Books', icon: Library, iconName: 'Library', section: 'School' },
  { id: 'admin_library_issues', to: '/admin/library/issues', label: 'Library Issues', icon: BookMarked, iconName: 'BookMarked', section: 'School' },
  { id: 'admin_inventory', to: '/admin/inventory', label: 'Inventory', icon: Package, iconName: 'Package', section: 'School' },
  { id: 'admin_hr', to: '/admin/hr', label: 'HR & Staff', icon: Briefcase, iconName: 'Briefcase', section: 'School' },
  { id: 'admin_photos', to: '/admin/photos', label: 'Photo Sharing', icon: Image, iconName: 'Image', section: 'School' },
  { id: 'admin_albums', to: '/admin/albums', label: 'Class Albums', icon: Images, iconName: 'Images', section: 'School' },
  { id: 'admin_certificates', to: '/admin/certificates', label: 'Document Certificates', icon: FileBadge, iconName: 'FileBadge', section: 'School' },

  // Classroom — academics / LMS
  { id: 'admin_homework', to: '/admin/homework', label: 'Homework', icon: BookOpen, iconName: 'BookOpen', section: 'Classroom' },
  { id: 'admin_exams', to: '/admin/exams', label: 'Exams', icon: FileText, iconName: 'FileText', section: 'Classroom' },
  { id: 'admin_exam_marks', to: '/admin/exam-marks', label: 'Marks Entry', icon: PenLine, iconName: 'PenLine', section: 'Classroom' },
  { id: 'admin_timetable', to: '/admin/timetable', label: 'Timetable', icon: CalendarClock, iconName: 'CalendarClock', section: 'Classroom' },
  { id: 'admin_lms', to: '/admin/lms', label: 'Digital Classroom', icon: MonitorPlay, iconName: 'MonitorPlay', section: 'Classroom' },
  { id: 'admin_lms_certificates', to: '/admin/lms/certificates', label: 'Course Certificates', icon: Award, iconName: 'Award', section: 'Classroom' },

  // Transport — keep together
  { id: 'admin_transport_vehicles', to: '/admin/transport/vehicles', label: 'Vehicles', icon: Bus, iconName: 'Bus', section: 'Transport' },
  { id: 'admin_transport_drivers', to: '/admin/transport/drivers', label: 'Drivers', icon: IdCard, iconName: 'IdCard', section: 'Transport' },
  { id: 'admin_transport_routes', to: '/admin/transport/routes', label: 'Routes', icon: Route, iconName: 'Route', section: 'Transport' },
  { id: 'admin_transport_assignments', to: '/admin/transport/assignments', label: 'Assignments', icon: ListChecks, iconName: 'ListChecks', section: 'Transport' },
  { id: 'admin_transport_live', to: '/admin/transport/live', label: 'Live Tracking', icon: MapPinned, iconName: 'MapPinned', section: 'Transport' },
  { id: 'admin_transport_trips', to: '/admin/transport/trips', label: 'Trip History', icon: History, iconName: 'History', section: 'Transport' },

  // Finance — money + reports
  { id: 'admin_fees', to: '/admin/fees', label: 'Fees', icon: CreditCard, iconName: 'CreditCard', section: 'Finance' },
  { id: 'admin_fees_advanced', to: '/admin/fees-advanced', label: 'Advanced Fees', icon: CircleDollarSign, iconName: 'CircleDollarSign', section: 'Finance' },
  { id: 'admin_accounting', to: '/admin/accounting', label: 'Accounting Dashboard', icon: Wallet, iconName: 'Wallet', section: 'Finance' },
  { id: 'admin_expenses', to: '/admin/expenses', label: 'Expenses', icon: Receipt, iconName: 'Receipt', section: 'Finance' },
  { id: 'admin_payroll', to: '/admin/payroll', label: 'Payroll', icon: Banknote, iconName: 'Banknote', section: 'Finance' },
  { id: 'admin_reports', to: '/admin/reports', label: 'Reports', icon: BarChart3, iconName: 'BarChart3', section: 'Finance' },
  { id: 'admin_reports_hub', to: '/admin/reports-hub', label: 'Reports Hub', icon: PieChart, iconName: 'PieChart', section: 'Finance' },

  // Communication
  { id: 'admin_chat', to: '/admin/chat', label: 'Chat', icon: MessageCircle, iconName: 'MessageCircle', section: 'Communication' },
  { id: 'admin_notice_board', to: '/admin/notice-board', label: 'Notice Board', icon: Megaphone, iconName: 'Megaphone', section: 'Communication' },
  { id: 'admin_notifications', to: '/admin/notifications', label: 'Notifications', icon: Bell, iconName: 'Bell', section: 'Communication' },
  { id: 'admin_communication', to: '/admin/communication', label: 'Communication Center', icon: Radio, iconName: 'Radio', section: 'Communication' },

  // Settings — config, security, AI
  { id: 'admin_settings', to: '/admin/settings', label: 'Settings', icon: Settings, iconName: 'Settings', section: 'Settings' },
  { id: 'admin_roles', to: '/admin/roles', label: 'Roles & Permissions', icon: Shield, iconName: 'Shield', section: 'Settings' },
  // { id: 'admin_security', to: '/admin/security', label: 'Security Center', icon: Shield, iconName: 'Shield', section: 'Settings' },
  { id: 'admin_login_history', to: '/admin/login-history', label: 'Login History', icon: History, iconName: 'History', section: 'Settings' },
  { id: 'admin_audit_logs', to: '/admin/audit-logs', label: 'Audit Logs', icon: ScrollText, iconName: 'ScrollText', section: 'Settings' },
  { id: 'admin_ai', to: '/admin/ai', label: 'AI Assistant', icon: Bot, iconName: 'Bot', section: 'Settings' },
];

const ADMIN_DASHBOARD = { id: 'admin_dashboard', to: '/admin/dashboard', label: 'Dashboard', icon: Home, iconName: 'Home' };

export const ADMIN_NAV = [
  ADMIN_DASHBOARD,
  ...ADMIN_CORE_NAV,
];

const SCHOOL_ADMIN_ALL_USERS = {
  id: 'admin_users',
  to: '/admin/all-users',
  label: 'All Users',
  icon: UsersRound,
  iconName: 'UsersRound',
  section: 'School',
};

function insertNavAfter(items, afterId, extraItems) {
  const idx = items.findIndex((item) => item.id === afterId);
  if (idx < 0) return [...items, ...extraItems];
  return [...items.slice(0, idx + 1), ...extraItems, ...items.slice(idx + 1)];
}

export const SCHOOL_ADMIN_NAV = [
  ADMIN_DASHBOARD,
  PORTAL_BRANDING_NAV,
  { id: 'admin_teachers', to: '/admin/teachers', label: 'Teachers', icon: UserCog, iconName: 'UserCog', section: 'School' },
  ...insertNavAfter(
    insertNavAfter(ADMIN_CORE_NAV, 'admin_students', [SCHOOL_ADMIN_ALL_USERS]),
    'admin_albums',
    [{ ...CREATIVE_CARDS_NAV, section: 'School' }],
  ),
  // { id: 'admin_subscription', to: '/admin/subscription', label: 'Subscription Plans', icon: Sparkles, iconName: 'Sparkles', section: 'Settings' },
];

/** Platform operator only — not school day-to-day (admissions, fees, photos, etc.). */
export const SUPER_ADMIN_NAV = [
  { id: 'admin_schools', to: '/admin/schools', label: 'Schools', icon: School, iconName: 'School', section: 'Platform' },
  { id: 'admin_users', to: '/admin/users', label: 'All Users', icon: UsersRound, iconName: 'UsersRound', section: 'Platform' },
  { ...PORTAL_BRANDING_NAV, section: 'Platform' },
  { id: 'admin_chat', to: '/admin/chat', label: 'Chat', icon: MessageCircle, iconName: 'MessageCircle', section: 'Platform' },
  // { id: 'admin_subscription', to: '/admin/subscription', label: 'Subscription Plans', icon: Sparkles, iconName: 'Sparkles', section: 'Platform' },
];

/** Parent: Dashboard · Family · School · Transport · Account */
export const PARENT_NAV = [
  { id: 'parent_dashboard', to: '/parent/dashboard', label: 'Dashboard', icon: Home, iconName: 'Home' },
  { id: 'parent_enrollment', to: '/parent/enrollment', label: 'Enrollment Status', icon: FileInput, iconName: 'FileInput', section: 'Family' },
  { id: 'parent_documents', to: '/parent/documents', label: 'Documents', icon: FolderOpen, iconName: 'FolderOpen', section: 'Family' },
  { id: 'parent_fees', to: '/parent/fees', label: 'Fees', icon: CreditCard, iconName: 'CreditCard', section: 'Family' },
  { id: 'parent_messages', to: '/parent/messages', label: 'Messages', icon: MessageCircle, iconName: 'MessageCircle', section: 'Family' },
  { id: 'parent_notice_board', to: '/parent/notice-board', label: 'Notice Board', icon: Megaphone, iconName: 'Megaphone', section: 'Family' },
  { id: 'parent_notifications', to: '/parent/notifications', label: 'Notifications', icon: Bell, iconName: 'Bell', section: 'Family' },
  { id: 'parent_attendance', to: '/parent/attendance', label: 'Attendance', icon: ClipboardCheck, iconName: 'ClipboardCheck', section: 'School' },
  { id: 'parent_homework', to: '/parent/homework', label: 'Homework', icon: BookOpen, iconName: 'BookOpen', section: 'School' },
  { id: 'parent_exams', to: '/parent/exams', label: 'Exam Results', icon: FileText, iconName: 'FileText', section: 'School' },
  { id: 'parent_timetable', to: '/parent/timetable', label: 'Timetable', icon: CalendarClock, iconName: 'CalendarClock', section: 'School' },
  { id: 'parent_lms', to: '/parent/lms', label: 'Digital Classroom', icon: MonitorPlay, iconName: 'MonitorPlay', section: 'School' },
  { id: 'parent_leave', to: '/parent/leave', label: 'Leave Requests', icon: CalendarOff, iconName: 'CalendarOff', section: 'School' },
  { id: 'parent_photos', to: '/parent/photos', label: 'Photos', icon: Image, iconName: 'Image', section: 'School' },
  { ...CREATIVE_CARDS_NAV, section: 'School' },
  { id: 'parent_transport', to: '/parent/transport', label: 'Bus Tracking', icon: MapPinned, iconName: 'MapPinned', section: 'Transport' },
  { id: 'parent_profile', to: '/profile', label: 'Profile', icon: Contact, iconName: 'Contact', section: 'Account' },
];

/** Teacher: Dashboard · Classroom · Account */
export const TEACHER_NAV = [
  { id: 'teacher_dashboard', to: '/teacher/dashboard', label: 'Dashboard', icon: Home, iconName: 'Home' },
  { id: 'teacher_classes', to: '/teacher/classes', label: 'My Classes', icon: School, iconName: 'School', section: 'Classroom' },
  { id: 'teacher_students', to: '/teacher/students', label: 'Students', icon: GraduationCap, iconName: 'GraduationCap', section: 'Classroom' },
  { id: 'teacher_attendance', to: '/teacher/attendance', label: 'Attendance', icon: ClipboardCheck, iconName: 'ClipboardCheck', section: 'Classroom' },
  { id: 'teacher_homework', to: '/teacher/homework', label: 'Homework', icon: BookOpen, iconName: 'BookOpen', section: 'Classroom' },
  { id: 'teacher_exams', to: '/teacher/exams', label: 'Exams', icon: FileText, iconName: 'FileText', section: 'Classroom' },
  { id: 'teacher_marks', to: '/teacher/marks', label: 'Enter Marks', icon: PenLine, iconName: 'PenLine', section: 'Classroom' },
  { id: 'teacher_notes', to: '/teacher/notes', label: 'Performance Notes', icon: ScrollText, iconName: 'ScrollText', section: 'Classroom' },
  { id: 'teacher_timetable', to: '/teacher/timetable', label: 'My Timetable', icon: CalendarClock, iconName: 'CalendarClock', section: 'Classroom' },
  { id: 'teacher_lms', to: '/teacher/lms', label: 'Digital Classroom', icon: MonitorPlay, iconName: 'MonitorPlay', section: 'Classroom' },
  { id: 'teacher_photos', to: '/teacher/photos', label: 'Send Photos', icon: Image, iconName: 'Image', section: 'Classroom' },
  { id: 'teacher_class_album', to: '/teacher/class-album', label: 'Class Album', icon: Images, iconName: 'Images', section: 'Classroom' },
  CREATIVE_CARDS_NAV,
  { id: 'teacher_messages', to: '/teacher/messages', label: 'Messages', icon: MessageCircle, iconName: 'MessageCircle', section: 'Account' },
  { id: 'teacher_notice_board', to: '/teacher/notice-board', label: 'Notice Board', icon: Megaphone, iconName: 'Megaphone', section: 'Account' },
  { id: 'teacher_profile', to: '/profile', label: 'Profile', icon: Contact, iconName: 'Contact', section: 'Account' },
];

export const ACCOUNTANT_NAV = [
  { id: 'admin_fees', to: '/admin/fees', label: 'Fees', icon: CreditCard, iconName: 'CreditCard', section: 'Finance' },
  { id: 'admin_fees_advanced', to: '/admin/fees-advanced', label: 'Advanced Fees', icon: CircleDollarSign, iconName: 'CircleDollarSign', section: 'Finance' },
  { id: 'admin_accounting', to: '/admin/accounting', label: 'Accounting', icon: Wallet, iconName: 'Wallet', section: 'Finance' },
  { id: 'admin_payroll', to: '/admin/payroll', label: 'Payroll', icon: Banknote, iconName: 'Banknote', section: 'Finance' },
  { id: 'admin_reports', to: '/admin/reports', label: 'Reports', icon: BarChart3, iconName: 'BarChart3', section: 'Finance' },
  { id: 'admin_notice_board', to: '/admin/notice-board', label: 'Notice Board', icon: Megaphone, iconName: 'Megaphone', section: 'Communication' },
  { id: 'admin_notifications', to: '/admin/notifications', label: 'Notifications', icon: Bell, iconName: 'Bell', section: 'Communication' },
];

export const SUPPORT_NAV = [
  { id: 'admin_chat', to: '/admin/chat', label: 'Chat', icon: MessageCircle, iconName: 'MessageCircle', section: 'Communication' },
  { id: 'admin_notifications', to: '/admin/notifications', label: 'Notifications', icon: Bell, iconName: 'Bell', section: 'Communication' },
  { id: 'admin_applications', to: '/admin/applications', label: 'Applications', icon: FileInput, iconName: 'FileInput', section: 'Communication' },
];

export const NAV_BY_ROLE = {
  [ROLES.SUPER_ADMIN]: SUPER_ADMIN_NAV,
  [ROLES.SCHOOL_ADMIN]: SCHOOL_ADMIN_NAV,
  [ROLES.ADMISSION_OFFICER]: ADMIN_NAV,
  [ROLES.ACCOUNTANT]: ACCOUNTANT_NAV,
  [ROLES.TEACHER]: TEACHER_NAV,
  [ROLES.DRIVER]: [
    { id: 'driver_trip', to: '/driver/trip', label: 'My trip', icon: Bus, iconName: 'Bus', section: 'Transport' },
  ],
  [ROLES.PARENT]: PARENT_NAV,
  [ROLES.STUDENT]: PARENT_NAV,
  [ROLES.SUPPORT_STAFF]: SUPPORT_NAV,
};

export { LogOut, UserCheck };
