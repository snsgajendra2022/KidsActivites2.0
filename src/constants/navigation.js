import {
  BarChart3, Bell, BookOpen, Bot, Briefcase, Bus, ClipboardCheck, CreditCard, FileText,
  FolderOpen, GraduationCap, Home, Image, Library, LogOut, Megaphone, MessageCircle,
  Package, Palette, Receipt, Settings, Shield, Sparkles, UserCheck, Users, ClipboardList, Tv, Wallet,
} from 'lucide-react';
import { ROLES } from './roles.js';

export const PORTAL_BRANDING_NAV = {
  id: 'admin_portal_settings',
  to: '/admin/portal-settings',
  label: 'Portal Branding',
  icon: Palette,
  iconName: 'Palette',
  section: 'School Setup',
};

export const CREATIVE_CARDS_NAV = {
  id: 'creative_cards',
  to: '/creative-cards',
  label: 'Creative Cards',
  icon: Palette,
  iconName: 'Palette',
  section: 'Create & Celebrate',
};

const ADMIN_ERP_NAV = [
  { id: 'admin_homework', to: '/admin/homework', label: 'Homework', icon: BookOpen, iconName: 'BookOpen', section: 'Academics' },
  { id: 'admin_exams', to: '/admin/exams', label: 'Exams', icon: FileText, iconName: 'FileText', section: 'Academics' },
  { id: 'admin_exam_marks', to: '/admin/exam-marks', label: 'Marks Entry', icon: ClipboardList, iconName: 'ClipboardList', section: 'Academics' },
  { id: 'admin_timetable', to: '/admin/timetable', label: 'Timetable', icon: ClipboardCheck, iconName: 'ClipboardCheck', section: 'Academics' },
  { id: 'admin_lms', to: '/admin/lms', label: 'Digital Classroom', icon: Sparkles, iconName: 'Sparkles', section: 'Academics' },
  { id: 'admin_attendance_advanced', to: '/admin/attendance-advanced', label: 'Advanced Attendance', icon: ClipboardCheck, iconName: 'ClipboardCheck', section: 'Students & Classes' },
  { id: 'admin_fees_advanced', to: '/admin/fees-advanced', label: 'Advanced Fees', icon: CreditCard, iconName: 'CreditCard', section: 'Fees & Finance' },
  { id: 'admin_accounting', to: '/admin/accounting', label: 'Accounting Dashboard', icon: Wallet, iconName: 'Wallet', section: 'Fees & Finance' },
  { id: 'admin_expenses', to: '/admin/expenses', label: 'Expenses', icon: Receipt, iconName: 'Receipt', section: 'Fees & Finance' },
  { id: 'admin_communication', to: '/admin/communication', label: 'Communication Center', icon: Megaphone, iconName: 'Megaphone', section: 'Communication' },
  { id: 'admin_transport_vehicles', to: '/admin/transport/vehicles', label: 'Transport Vehicles', icon: Bus, iconName: 'Bus', section: 'Operations' },
  { id: 'admin_transport_routes', to: '/admin/transport/routes', label: 'Transport Routes', icon: Bus, iconName: 'Bus', section: 'Operations' },
  { id: 'admin_transport_live', to: '/admin/transport/live', label: 'Live Bus Tracking', icon: Bus, iconName: 'Bus', section: 'Operations' },
  { id: 'admin_library_books', to: '/admin/library/books', label: 'Library Books', icon: Library, iconName: 'Library', section: 'Operations' },
  { id: 'admin_library_issues', to: '/admin/library/issues', label: 'Library Issues', icon: Library, iconName: 'Library', section: 'Operations' },
  { id: 'admin_inventory', to: '/admin/inventory', label: 'Inventory', icon: Package, iconName: 'Package', section: 'Operations' },
  { id: 'admin_hr', to: '/admin/hr', label: 'HR & Staff', icon: Briefcase, iconName: 'Briefcase', section: 'Operations' },
  { id: 'admin_payroll', to: '/admin/payroll', label: 'Payroll', icon: Receipt, iconName: 'Receipt', section: 'Operations' },
  { id: 'admin_certificates', to: '/admin/certificates', label: 'Certificates', icon: FileText, iconName: 'FileText', section: 'Documents' },
  { id: 'admin_ai', to: '/admin/ai', label: 'AI Assistant', icon: Bot, iconName: 'Bot', section: 'Premium' },
  { id: 'admin_roles', to: '/admin/roles', label: 'Roles & Permissions', icon: Shield, iconName: 'Shield', section: 'Settings' },
  { id: 'admin_security', to: '/admin/security', label: 'Security Center', icon: Shield, iconName: 'Shield', section: 'Settings' },
  { id: 'admin_login_history', to: '/admin/login-history', label: 'Login History', icon: Shield, iconName: 'Shield', section: 'Settings' },
  { id: 'admin_reports_hub', to: '/admin/reports-hub', label: 'Reports Hub', icon: BarChart3, iconName: 'BarChart3', section: 'Reports' },
];

const ADMIN_CORE_NAV = [
  { id: 'admin_applications', to: '/admin/applications', label: 'Enrollment Applications', icon: FileText, iconName: 'FileText', section: 'Admissions & Enrollment' },
  { id: 'admin_students', to: '/admin/students', label: 'Students', icon: GraduationCap, iconName: 'GraduationCap', section: 'Students & Classes' },
  { id: 'admin_class_management', to: '/admin/class-management', label: 'Class Management', icon: ClipboardList, iconName: 'ClipboardList', section: 'Students & Classes' },
  { id: 'admin_attendance', to: '/admin/attendance', label: 'Attendance', icon: ClipboardCheck, iconName: 'ClipboardCheck', section: 'Students & Classes' },
  { id: 'admin_photos', to: '/admin/photos', label: 'Photo Sharing', icon: Image, iconName: 'Image', section: 'Media & Albums' },
  { id: 'admin_albums', to: '/admin/albums', label: 'Class Albums', icon: Tv, iconName: 'Tv', section: 'Media & Albums' },
  { id: 'admin_fees', to: '/admin/fees', label: 'Fees', icon: CreditCard, iconName: 'CreditCard', section: 'Fees & Finance' },
  { id: 'admin_chat', to: '/admin/chat', label: 'Chat', icon: MessageCircle, iconName: 'MessageCircle', section: 'Communication' },
  { id: 'admin_notice_board', to: '/admin/notice-board', label: 'Notice Board', icon: Megaphone, iconName: 'Megaphone', section: 'Communication' },
  { id: 'admin_notifications', to: '/admin/notifications', label: 'Notifications', icon: Bell, iconName: 'Bell', section: 'Communication' },
  { id: 'admin_reports', to: '/admin/reports', label: 'Reports', icon: BarChart3, iconName: 'BarChart3', section: 'Reports' },
  { id: 'admin_settings', to: '/admin/settings', label: 'Settings', icon: Settings, iconName: 'Settings', section: 'Settings' },
  { id: 'admin_audit_logs', to: '/admin/audit-logs', label: 'Audit Logs', icon: Shield, iconName: 'Shield', section: 'Settings' },
  ...ADMIN_ERP_NAV,
];

const ADMIN_DASHBOARD = { id: 'admin_dashboard', to: '/admin/dashboard', label: 'Dashboard', icon: Home, iconName: 'Home' };

export const ADMIN_NAV = [
  ADMIN_DASHBOARD,
  ...ADMIN_CORE_NAV,
];

export const SCHOOL_ADMIN_NAV = [
  ADMIN_DASHBOARD,
  PORTAL_BRANDING_NAV,
  { id: 'admin_teachers', to: '/admin/teachers', label: 'Teachers', icon: Users, iconName: 'Users', section: 'School Setup' },
  { id: 'admin_users', to: '/admin/all-users', label: 'All Users', icon: Users, iconName: 'Users', section: 'Platform' },
  { id: 'admin_subscription', to: '/admin/subscription', label: 'Subscription Plans', icon: Sparkles, iconName: 'Sparkles', section: 'Premium' },
  CREATIVE_CARDS_NAV,
  ...ADMIN_CORE_NAV,
];

/** Platform operator only — not school day-to-day (admissions, fees, photos, etc.). */
export const SUPER_ADMIN_NAV = [
  { id: 'admin_schools', to: '/admin/schools', label: 'Schools', icon: GraduationCap, iconName: 'GraduationCap', section: 'Platform' },
  { id: 'admin_users', to: '/admin/users', label: 'All Users', icon: Users, iconName: 'Users', section: 'Platform' },
  { id: 'admin_subscription', to: '/admin/subscription', label: 'Subscription Plans', icon: Sparkles, iconName: 'Sparkles', section: 'Platform' },
  { id: 'admin_chat', to: '/admin/chat', label: 'Chat', icon: MessageCircle, iconName: 'MessageCircle', section: 'Communication' },
  PORTAL_BRANDING_NAV,
];

export const PARENT_NAV = [
  { id: 'parent_dashboard', to: '/parent/dashboard', label: 'Dashboard', icon: Home, iconName: 'Home' },
  { id: 'parent_enrollment', to: '/parent/enrollment', label: 'Enrollment Status', icon: FileText, iconName: 'FileText', section: 'Enrollment' },
  { id: 'parent_documents', to: '/parent/documents', label: 'Documents', icon: FolderOpen, iconName: 'FolderOpen', section: 'Enrollment' },
  { id: 'parent_attendance', to: '/parent/attendance', label: 'Attendance', icon: ClipboardCheck, iconName: 'ClipboardCheck', section: 'Academics' },
  { id: 'parent_homework', to: '/parent/homework', label: 'Homework', icon: BookOpen, iconName: 'BookOpen', section: 'Academics' },
  { id: 'parent_exams', to: '/parent/exams', label: 'Exam Results', icon: FileText, iconName: 'FileText', section: 'Academics' },
  { id: 'parent_timetable', to: '/parent/timetable', label: 'Timetable', icon: ClipboardList, iconName: 'ClipboardList', section: 'Academics' },
  { id: 'parent_lms', to: '/parent/lms', label: 'Digital Classroom', icon: Sparkles, iconName: 'Sparkles', section: 'Academics' },
  { id: 'parent_leave', to: '/parent/leave', label: 'Leave Requests', icon: ClipboardCheck, iconName: 'ClipboardCheck', section: 'Academics' },
  { id: 'parent_transport', to: '/parent/transport', label: 'Bus Tracking', icon: Bus, iconName: 'Bus', section: 'Transport' },
  { id: 'parent_photos', to: '/parent/photos', label: 'Photos', icon: Image, iconName: 'Image', section: 'Photos & Media' },
  CREATIVE_CARDS_NAV,
  { id: 'parent_fees', to: '/parent/fees', label: 'Fees', icon: CreditCard, iconName: 'CreditCard', section: 'Fees & Payments' },
  { id: 'parent_messages', to: '/parent/messages', label: 'Messages', icon: MessageCircle, iconName: 'MessageCircle', section: 'Communication' },
  { id: 'parent_notice_board', to: '/parent/notice-board', label: 'Notice Board', icon: Megaphone, iconName: 'Megaphone', section: 'Communication' },
  { id: 'parent_notifications', to: '/parent/notifications', label: 'Notifications', icon: Bell, iconName: 'Bell', section: 'Communication' },
  { id: 'parent_profile', to: '/profile', label: 'Profile', icon: UserCheck, iconName: 'UserCheck', section: 'Account' },
];

export const TEACHER_NAV = [
  { id: 'teacher_dashboard', to: '/teacher/dashboard', label: 'Dashboard', icon: Home, iconName: 'Home' },
  { id: 'teacher_classes', to: '/teacher/classes', label: 'My Classes', icon: GraduationCap, iconName: 'GraduationCap', section: 'My Classes & Students' },
  { id: 'teacher_students', to: '/teacher/students', label: 'Students', icon: Users, iconName: 'Users', section: 'My Classes & Students' },
  { id: 'teacher_attendance', to: '/teacher/attendance', label: 'Attendance', icon: ClipboardCheck, iconName: 'ClipboardCheck', section: 'My Classes & Students' },
  { id: 'teacher_homework', to: '/teacher/homework', label: 'Homework', icon: BookOpen, iconName: 'BookOpen', section: 'Teaching' },
  { id: 'teacher_exams', to: '/teacher/exams', label: 'Exams', icon: FileText, iconName: 'FileText', section: 'Teaching' },
  { id: 'teacher_marks', to: '/teacher/marks', label: 'Enter Marks', icon: ClipboardList, iconName: 'ClipboardList', section: 'Teaching' },
  { id: 'teacher_notes', to: '/teacher/notes', label: 'Performance Notes', icon: FileText, iconName: 'FileText', section: 'Teaching' },
  { id: 'teacher_timetable', to: '/teacher/timetable', label: 'My Timetable', icon: ClipboardCheck, iconName: 'ClipboardCheck', section: 'Teaching' },
  { id: 'teacher_lms', to: '/teacher/lms', label: 'Share Notes / LMS', icon: Sparkles, iconName: 'Sparkles', section: 'Teaching' },
  { id: 'teacher_photos', to: '/teacher/photos', label: 'Send Photos', icon: Image, iconName: 'Image', section: 'Photos & Media' },
  { id: 'teacher_class_album', to: '/teacher/class-album', label: 'Class Album', icon: Tv, iconName: 'Tv', section: 'Photos & Media' },
  CREATIVE_CARDS_NAV,
  { id: 'teacher_messages', to: '/teacher/messages', label: 'Messages', icon: MessageCircle, iconName: 'MessageCircle', section: 'Communication' },
  { id: 'teacher_notice_board', to: '/teacher/notice-board', label: 'Notice Board', icon: Megaphone, iconName: 'Megaphone', section: 'Communication' },
  { id: 'teacher_profile', to: '/profile', label: 'Profile', icon: UserCheck, iconName: 'UserCheck', section: 'Account' },
];

export const ACCOUNTANT_NAV = [
  { id: 'admin_fees', to: '/admin/fees', label: 'Fees', icon: CreditCard, iconName: 'CreditCard', section: 'Fees & Finance' },
  { id: 'admin_fees_advanced', to: '/admin/fees-advanced', label: 'Advanced Fees', icon: CreditCard, iconName: 'CreditCard', section: 'Fees & Finance' },
  { id: 'admin_accounting', to: '/admin/accounting', label: 'Accounting', icon: Wallet, iconName: 'Wallet', section: 'Fees & Finance' },
  { id: 'admin_payroll', to: '/admin/payroll', label: 'Payroll', icon: Receipt, iconName: 'Receipt', section: 'Fees & Finance' },
  { id: 'admin_reports', to: '/admin/reports', label: 'Reports', icon: BarChart3, iconName: 'BarChart3', section: 'Reports' },
  { id: 'admin_notice_board', to: '/admin/notice-board', label: 'Notice Board', icon: Megaphone, iconName: 'Megaphone', section: 'Communication' },
  { id: 'admin_notifications', to: '/admin/notifications', label: 'Notifications', icon: Bell, iconName: 'Bell', section: 'Communication' },
];

export const SUPPORT_NAV = [
  { id: 'admin_chat', to: '/admin/chat', label: 'Chat', icon: MessageCircle, iconName: 'MessageCircle', section: 'Communication' },
  { id: 'admin_notifications', to: '/admin/notifications', label: 'Notifications', icon: Bell, iconName: 'Bell', section: 'Communication' },
  { id: 'admin_applications', to: '/admin/applications', label: 'Applications', icon: FileText, iconName: 'FileText', section: 'Admissions & Enrollment' },
];

export const NAV_BY_ROLE = {
  [ROLES.SUPER_ADMIN]: SUPER_ADMIN_NAV,
  [ROLES.SCHOOL_ADMIN]: SCHOOL_ADMIN_NAV,
  [ROLES.ADMISSION_OFFICER]: ADMIN_NAV,
  [ROLES.ACCOUNTANT]: ACCOUNTANT_NAV,
  [ROLES.TEACHER]: TEACHER_NAV,
  [ROLES.PARENT]: PARENT_NAV,
  [ROLES.STUDENT]: PARENT_NAV,
  [ROLES.SUPPORT_STAFF]: SUPPORT_NAV,
};

export { LogOut, UserCheck };
