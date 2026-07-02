import { Navigate, Route, Routes } from 'react-router-dom';
import ProtectedRoute from './components/ProtectedRoute.jsx';
import SchoolRouteGuard from './components/routing/SchoolRouteGuard.jsx';
import { ROLES } from './constants/roles.js';

import Landing from './pages/public/Landing.jsx';
import Enrollment from './pages/public/Enrollment.jsx';
import Login from './pages/auth/Login.jsx';
import {
  SecurityPolicy,
  TermsOfUse,
  SystemStatus,
  DirectSupport,
} from './pages/public/FooterPageRoutes.jsx';

import AdminDashboard from './pages/admin/AdminDashboard.jsx';
import ApplicationsList from './pages/admin/ApplicationsList.jsx';
import ApplicationReview from './pages/admin/ApplicationReview.jsx';
import AdminFees from './pages/admin/AdminFees.jsx';
import AdminStudents from './pages/admin/AdminStudents.jsx';
import AdminSettings from './pages/admin/AdminSettings.jsx';
import AdminReports from './pages/admin/AdminReports.jsx';
import AdminAuditLogs from './pages/admin/AdminAuditLogs.jsx';
import PortalSettings from './pages/admin/PortalSettings.jsx';
import AdminUsers from './pages/admin/AdminUsers.jsx';
import AdminTeachers from './pages/admin/AdminTeachers.jsx';
import AdminSchools from './pages/admin/AdminSchools.jsx';

import ParentDashboard from './pages/parent/ParentDashboard.jsx';
import ParentEnrollmentStatus from './pages/parent/ParentEnrollmentStatus.jsx';
import ParentFees from './pages/parent/ParentFees.jsx';
import ParentDocuments from './pages/parent/ParentDocuments.jsx';
import ParentPhotos from './pages/parent/ParentPhotos.jsx';

import TeacherDashboard from './pages/teacher/TeacherDashboard.jsx';
import TeacherClasses from './pages/teacher/TeacherClasses.jsx';
import TeacherStudents from './pages/teacher/TeacherStudents.jsx';
import SendPhotos from './pages/teacher/SendPhotos.jsx';

import NotificationsPage from './pages/shared/NotificationsPage.jsx';
import ChatPage from './pages/shared/ChatPage.jsx';
import Profile from './pages/shared/Profile.jsx';

const CORE_ADMIN = [ROLES.SUPER_ADMIN, ROLES.SCHOOL_ADMIN, ROLES.ADMISSION_OFFICER];
const SUPER_ADMIN_ONLY = [ROLES.SUPER_ADMIN];
const PORTAL_SETTINGS_ROLES = [ROLES.SUPER_ADMIN, ROLES.SCHOOL_ADMIN];
const FEES_ROLES = [...CORE_ADMIN, ROLES.ACCOUNTANT];
const REPORTS_ROLES = [...CORE_ADMIN, ROLES.ACCOUNTANT];
const CHAT_ADMIN_ROLES = [...CORE_ADMIN, ROLES.SUPPORT_STAFF];
const SUPPORT_APP_ROLES = [...CORE_ADMIN, ROLES.SUPPORT_STAFF];
const NOTIFICATIONS_ROLES = [...CORE_ADMIN, ROLES.ACCOUNTANT, ROLES.SUPPORT_STAFF];
const PARENT_ROLES = [ROLES.PARENT, ROLES.STUDENT];
const TEACHER_ROLES = [ROLES.TEACHER];

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Landing />} />
      <Route path="/login" element={<Login />} />
      <Route path="/enroll" element={<Navigate to="/" replace />} />
      <Route path="/security-policy" element={<SecurityPolicy />} />
      <Route path="/terms-of-use" element={<TermsOfUse />} />
      <Route path="/system-status" element={<SystemStatus />} />
      <Route path="/support" element={<DirectSupport />} />

      <Route path="/:schoolSlug" element={<SchoolRouteGuard><Landing /></SchoolRouteGuard>} />
      <Route path="/:schoolSlug/enroll" element={<SchoolRouteGuard><Enrollment /></SchoolRouteGuard>} />

      {/* Admin routes */}
      <Route path="/admin/dashboard" element={<ProtectedRoute allowedRoles={CORE_ADMIN}><AdminDashboard /></ProtectedRoute>} />
      <Route path="/admin/applications" element={<ProtectedRoute allowedRoles={SUPPORT_APP_ROLES}><ApplicationsList /></ProtectedRoute>} />
      <Route path="/admin/applications/:id" element={<ProtectedRoute allowedRoles={CORE_ADMIN}><ApplicationReview /></ProtectedRoute>} />
      <Route path="/admin/students" element={<ProtectedRoute allowedRoles={CORE_ADMIN}><AdminStudents /></ProtectedRoute>} />
      <Route path="/admin/fees" element={<ProtectedRoute allowedRoles={FEES_ROLES}><AdminFees /></ProtectedRoute>} />
      <Route path="/admin/photos" element={<ProtectedRoute allowedRoles={CORE_ADMIN}><SendPhotos /></ProtectedRoute>} />
      <Route path="/admin/chat" element={<ProtectedRoute allowedRoles={CHAT_ADMIN_ROLES}><ChatPage /></ProtectedRoute>} />
      <Route path="/admin/notifications" element={<ProtectedRoute allowedRoles={NOTIFICATIONS_ROLES}><NotificationsPage title="Notifications" subtitle="Manage and view all school notifications." /></ProtectedRoute>} />
      <Route path="/admin/reports" element={<ProtectedRoute allowedRoles={REPORTS_ROLES}><AdminReports /></ProtectedRoute>} />
      <Route path="/admin/settings" element={<ProtectedRoute allowedRoles={CORE_ADMIN}><AdminSettings /></ProtectedRoute>} />
      <Route path="/admin/audit-logs" element={<ProtectedRoute allowedRoles={CORE_ADMIN}><AdminAuditLogs /></ProtectedRoute>} />
      <Route path="/admin/portal-settings" element={<ProtectedRoute allowedRoles={PORTAL_SETTINGS_ROLES}><PortalSettings /></ProtectedRoute>} />
      <Route path="/admin/users" element={<ProtectedRoute allowedRoles={SUPER_ADMIN_ONLY}><AdminUsers /></ProtectedRoute>} />
      <Route path="/admin/teachers" element={<ProtectedRoute allowedRoles={PORTAL_SETTINGS_ROLES}><AdminTeachers /></ProtectedRoute>} />
      <Route path="/admin/schools" element={<ProtectedRoute allowedRoles={SUPER_ADMIN_ONLY}><AdminSchools /></ProtectedRoute>} />

      {/* Parent routes */}
      <Route path="/parent/dashboard" element={<ProtectedRoute allowedRoles={PARENT_ROLES}><ParentDashboard /></ProtectedRoute>} />
      <Route path="/parent/enrollment" element={<ProtectedRoute allowedRoles={PARENT_ROLES}><ParentEnrollmentStatus /></ProtectedRoute>} />
      <Route path="/parent/fees" element={<ProtectedRoute allowedRoles={PARENT_ROLES}><ParentFees /></ProtectedRoute>} />
      <Route path="/parent/documents" element={<ProtectedRoute allowedRoles={PARENT_ROLES}><ParentDocuments /></ProtectedRoute>} />
      <Route path="/parent/photos" element={<ProtectedRoute allowedRoles={PARENT_ROLES}><ParentPhotos /></ProtectedRoute>} />
      <Route path="/parent/messages" element={<ProtectedRoute allowedRoles={PARENT_ROLES}><ChatPage /></ProtectedRoute>} />
      <Route path="/parent/notifications" element={<ProtectedRoute allowedRoles={PARENT_ROLES}><NotificationsPage title="Notifications" subtitle="Your enrollment and school notifications." /></ProtectedRoute>} />

      {/* Teacher routes */}
      <Route path="/teacher/dashboard" element={<ProtectedRoute allowedRoles={TEACHER_ROLES}><TeacherDashboard /></ProtectedRoute>} />
      <Route path="/teacher/classes" element={<ProtectedRoute allowedRoles={TEACHER_ROLES}><TeacherClasses /></ProtectedRoute>} />
      <Route path="/teacher/students" element={<ProtectedRoute allowedRoles={TEACHER_ROLES}><TeacherStudents /></ProtectedRoute>} />
      <Route path="/teacher/photos" element={<ProtectedRoute allowedRoles={TEACHER_ROLES}><SendPhotos /></ProtectedRoute>} />
      <Route path="/teacher/messages" element={<ProtectedRoute allowedRoles={TEACHER_ROLES}><ChatPage /></ProtectedRoute>} />

      {/* Shared authenticated routes */}
      <Route path="/profile" element={<ProtectedRoute><Profile /></ProtectedRoute>} />

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
