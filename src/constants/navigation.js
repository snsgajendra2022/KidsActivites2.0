import {
  BarChart3, Bell, CreditCard, FileText, FolderOpen, GraduationCap,
  Home, Image, LogOut, MessageCircle, Settings, Shield, UserCheck, Users,
} from 'lucide-react';
import { ROLES } from './roles.js';

export const ADMIN_NAV = [
  { to: '/admin/dashboard', label: 'Dashboard', icon: Home },
  { to: '/admin/applications', label: 'Enrollment Applications', icon: FileText },
  { to: '/admin/students', label: 'Students', icon: GraduationCap },
  { to: '/admin/fees', label: 'Fees', icon: CreditCard },
  { to: '/admin/photos', label: 'Photo Sharing', icon: Image },
  { to: '/admin/chat', label: 'Chat', icon: MessageCircle },
  { to: '/admin/notifications', label: 'Notifications', icon: Bell },
  { to: '/admin/reports', label: 'Reports', icon: BarChart3 },
  { to: '/admin/settings', label: 'Settings', icon: Settings },
  { to: '/admin/audit-logs', label: 'Audit Logs', icon: Shield },
];

export const PARENT_NAV = [
  { to: '/parent/dashboard', label: 'Dashboard', icon: Home },
  { to: '/parent/enrollment', label: 'Enrollment Status', icon: FileText },
  { to: '/parent/fees', label: 'Fees', icon: CreditCard },
  { to: '/parent/documents', label: 'Documents', icon: FolderOpen },
  { to: '/parent/photos', label: 'Photos', icon: Image },
  { to: '/parent/messages', label: 'Messages', icon: MessageCircle },
  { to: '/parent/notifications', label: 'Notifications', icon: Bell },
];

export const TEACHER_NAV = [
  { to: '/teacher/dashboard', label: 'Dashboard', icon: Home },
  { to: '/teacher/classes', label: 'My Classes', icon: GraduationCap },
  { to: '/teacher/students', label: 'Students', icon: Users },
  { to: '/teacher/photos', label: 'Send Photos', icon: Image },
  { to: '/teacher/messages', label: 'Messages', icon: MessageCircle },
];

export const NAV_BY_ROLE = {
  [ROLES.SUPER_ADMIN]: ADMIN_NAV,
  [ROLES.SCHOOL_ADMIN]: ADMIN_NAV,
  [ROLES.ADMISSION_OFFICER]: ADMIN_NAV,
  [ROLES.TEACHER]: TEACHER_NAV,
  [ROLES.PARENT]: PARENT_NAV,
  [ROLES.STUDENT]: PARENT_NAV,
};

export { LogOut, UserCheck };
