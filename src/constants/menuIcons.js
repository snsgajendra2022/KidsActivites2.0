import {
  BarChart3, Bell, BookOpen, Calendar, Circle, CreditCard, FileText, FolderOpen,
  GraduationCap, HelpCircle, Home, Image, LayoutDashboard, Link, MessageCircle,
  Palette, Settings, Shield, Star, Users, ClipboardList, Megaphone,
} from 'lucide-react';

/** Lucide icon name → component (sidebar-safe icons only). */
export const MENU_ICON_MAP = {
  Home,
  LayoutDashboard,
  FileText,
  GraduationCap,
  CreditCard,
  Image,
  MessageCircle,
  Bell,
  BarChart3,
  Settings,
  Shield,
  Palette,
  FolderOpen,
  Users,
  HelpCircle,
  Link,
  BookOpen,
  Calendar,
  Star,
  ClipboardList,
  Megaphone,
  Circle,
};

export const MENU_ICON_OPTIONS = Object.keys(MENU_ICON_MAP).map((value) => ({
  value,
  label: value.replace(/([A-Z])/g, ' $1').trim(),
}));

/** @param {string | undefined} iconName @param {import('react').ComponentType | undefined} fallback */
export function resolveMenuIcon(iconName, fallback) {
  if (iconName && MENU_ICON_MAP[iconName]) return MENU_ICON_MAP[iconName];
  return fallback || Circle;
}
