import {
  BarChart3, Bell, CreditCard, FileText, FolderOpen, GraduationCap,
  Home, Image, LogOut, MessageCircle, Palette, Settings, Shield, UserCheck, Users, ClipboardList, Tv,
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

const ADMIN_CORE_NAV = [
  { id: 'admin_applications', to: '/admin/applications', label: 'Enrollment Applications', icon: FileText, iconName: 'FileText', section: 'Admissions & Enrollment' },
  { id: 'admin_students', to: '/admin/students', label: 'Students', icon: GraduationCap, iconName: 'GraduationCap', section: 'Students & Classes' },
  { id: 'admin_class_management', to: '/admin/class-management', label: 'Class Management', icon: ClipboardList, iconName: 'ClipboardList', section: 'Students & Classes' },
  { id: 'admin_photos', to: '/admin/photos', label: 'Photo Sharing', icon: Image, iconName: 'Image', section: 'Media & Albums' },
  { id: 'admin_albums', to: '/admin/albums', label: 'Class Albums', icon: Tv, iconName: 'Tv', section: 'Media & Albums' },
  { id: 'admin_fees', to: '/admin/fees', label: 'Fees', icon: CreditCard, iconName: 'CreditCard', section: 'Fees & Finance' },
  { id: 'admin_chat', to: '/admin/chat', label: 'Chat', icon: MessageCircle, iconName: 'MessageCircle', section: 'Communication' },
  { id: 'admin_notifications', to: '/admin/notifications', label: 'Notifications', icon: Bell, iconName: 'Bell', section: 'Communication' },
  { id: 'admin_reports', to: '/admin/reports', label: 'Reports', icon: BarChart3, iconName: 'BarChart3', section: 'Reports' },
  { id: 'admin_settings', to: '/admin/settings', label: 'Settings', icon: Settings, iconName: 'Settings', section: 'Settings' },
  { id: 'admin_audit_logs', to: '/admin/audit-logs', label: 'Audit Logs', icon: Shield, iconName: 'Shield', section: 'Settings' },
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
  ...ADMIN_CORE_NAV,
];

export const SUPER_ADMIN_NAV = [
  ADMIN_DASHBOARD,
  { id: 'admin_schools', to: '/admin/schools', label: 'Schools', icon: GraduationCap, iconName: 'GraduationCap', section: 'Platform' },
  { id: 'admin_users', to: '/admin/users', label: 'All Users', icon: Users, iconName: 'Users', section: 'Platform' },
  PORTAL_BRANDING_NAV,
  ...ADMIN_CORE_NAV,
];

export const PARENT_NAV = [
  { id: 'parent_dashboard', to: '/parent/dashboard', label: 'Dashboard', icon: Home, iconName: 'Home' },
  { id: 'parent_enrollment', to: '/parent/enrollment', label: 'Enrollment Status', icon: FileText, iconName: 'FileText', section: 'Enrollment' },
  { id: 'parent_documents', to: '/parent/documents', label: 'Documents', icon: FolderOpen, iconName: 'FolderOpen', section: 'Enrollment' },
  { id: 'parent_photos', to: '/parent/photos', label: 'Photos', icon: Image, iconName: 'Image', section: 'Photos & Media' },
  { id: 'parent_fees', to: '/parent/fees', label: 'Fees', icon: CreditCard, iconName: 'CreditCard', section: 'Fees & Payments' },
  { id: 'parent_messages', to: '/parent/messages', label: 'Messages', icon: MessageCircle, iconName: 'MessageCircle', section: 'Communication' },
  { id: 'parent_notifications', to: '/parent/notifications', label: 'Notifications', icon: Bell, iconName: 'Bell', section: 'Communication' },
  { id: 'parent_profile', to: '/profile', label: 'Profile', icon: UserCheck, iconName: 'UserCheck', section: 'Account' },
];

export const TEACHER_NAV = [
  { id: 'teacher_dashboard', to: '/teacher/dashboard', label: 'Dashboard', icon: Home, iconName: 'Home' },
  { id: 'teacher_classes', to: '/teacher/classes', label: 'My Classes', icon: GraduationCap, iconName: 'GraduationCap', section: 'My Classes & Students' },
  { id: 'teacher_students', to: '/teacher/students', label: 'Students', icon: Users, iconName: 'Users', section: 'My Classes & Students' },
  { id: 'teacher_photos', to: '/teacher/photos', label: 'Send Photos', icon: Image, iconName: 'Image', section: 'Photos & Media' },
  { id: 'teacher_class_album', to: '/teacher/class-album', label: 'Class Album', icon: Tv, iconName: 'Tv', section: 'Photos & Media' },
  { id: 'teacher_messages', to: '/teacher/messages', label: 'Messages', icon: MessageCircle, iconName: 'MessageCircle', section: 'Communication' },
  { id: 'teacher_profile', to: '/profile', label: 'Profile', icon: UserCheck, iconName: 'UserCheck', section: 'Account' },
];

export const ACCOUNTANT_NAV = [
  { id: 'admin_fees', to: '/admin/fees', label: 'Fees', icon: CreditCard, iconName: 'CreditCard', section: 'Fees & Finance' },
  { id: 'admin_reports', to: '/admin/reports', label: 'Reports', icon: BarChart3, iconName: 'BarChart3', section: 'Reports' },
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
