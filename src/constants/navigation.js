import {
  BarChart3, Bell, CreditCard, FileText, FolderOpen, GraduationCap,
  Home, Image, LogOut, MessageCircle, Palette, Settings, Shield, UserCheck, Users,
} from 'lucide-react';
import { ROLES } from './roles.js';

export const ADMIN_NAV = [
  { id: 'admin_dashboard', to: '/admin/dashboard', label: 'Dashboard', icon: Home },
  { id: 'admin_applications', to: '/admin/applications', label: 'Enrollment Applications', icon: FileText },
  { id: 'admin_students', to: '/admin/students', label: 'Students', icon: GraduationCap },
  { id: 'admin_fees', to: '/admin/fees', label: 'Fees', icon: CreditCard },
  { id: 'admin_photos', to: '/admin/photos', label: 'Photo Sharing', icon: Image },
  { id: 'admin_chat', to: '/admin/chat', label: 'Chat', icon: MessageCircle },
  { id: 'admin_notifications', to: '/admin/notifications', label: 'Notifications', icon: Bell },
  { id: 'admin_reports', to: '/admin/reports', label: 'Reports', icon: BarChart3 },
  { id: 'admin_settings', to: '/admin/settings', label: 'Settings', icon: Settings },
  { id: 'admin_audit_logs', to: '/admin/audit-logs', label: 'Audit Logs', icon: Shield },
];

export const SUPER_ADMIN_NAV = [
  { id: 'admin_portal_settings', to: '/admin/portal-settings', label: 'Portal Branding', icon: Palette },
  ...ADMIN_NAV,
];

export const PARENT_NAV = [
  { id: 'parent_dashboard', to: '/parent/dashboard', label: 'Dashboard', icon: Home },
  { id: 'parent_enrollment', to: '/parent/enrollment', label: 'Enrollment Status', icon: FileText },
  { id: 'parent_fees', to: '/parent/fees', label: 'Fees', icon: CreditCard },
  { id: 'parent_documents', to: '/parent/documents', label: 'Documents', icon: FolderOpen },
  { id: 'parent_photos', to: '/parent/photos', label: 'Photos', icon: Image },
  { id: 'parent_messages', to: '/parent/messages', label: 'Messages', icon: MessageCircle },
  { id: 'parent_notifications', to: '/parent/notifications', label: 'Notifications', icon: Bell },
];

export const TEACHER_NAV = [
  { id: 'teacher_dashboard', to: '/teacher/dashboard', label: 'Dashboard', icon: Home },
  { id: 'teacher_classes', to: '/teacher/classes', label: 'My Classes', icon: GraduationCap },
  { id: 'teacher_students', to: '/teacher/students', label: 'Students', icon: Users },
  { id: 'teacher_photos', to: '/teacher/photos', label: 'Send Photos', icon: Image },
  { id: 'teacher_messages', to: '/teacher/messages', label: 'Messages', icon: MessageCircle },
];

export const ACCOUNTANT_NAV = [
  { id: 'admin_fees', to: '/admin/fees', label: 'Fees', icon: CreditCard },
  { id: 'admin_reports', to: '/admin/reports', label: 'Reports', icon: BarChart3 },
  { id: 'admin_notifications', to: '/admin/notifications', label: 'Notifications', icon: Bell },
];

export const SUPPORT_NAV = [
  { id: 'admin_chat', to: '/admin/chat', label: 'Chat', icon: MessageCircle },
  { id: 'admin_notifications', to: '/admin/notifications', label: 'Notifications', icon: Bell },
  { id: 'admin_applications', to: '/admin/applications', label: 'Applications', icon: FileText },
];

export const NAV_BY_ROLE = {
  [ROLES.SUPER_ADMIN]: SUPER_ADMIN_NAV,
  [ROLES.SCHOOL_ADMIN]: ADMIN_NAV,
  [ROLES.ADMISSION_OFFICER]: ADMIN_NAV,
  [ROLES.ACCOUNTANT]: ACCOUNTANT_NAV,
  [ROLES.TEACHER]: TEACHER_NAV,
  [ROLES.PARENT]: PARENT_NAV,
  [ROLES.STUDENT]: PARENT_NAV,
  [ROLES.SUPPORT_STAFF]: SUPPORT_NAV,
};

export { LogOut, UserCheck };
