import { Navigate, Route, Routes } from 'react-router-dom';
import ProtectedRoute from './components/ProtectedRoute.jsx';
import { ROLES } from './constants/roles.js';

import Landing from './pages/public/Landing.jsx';
import Enrollment from './pages/public/Enrollment.jsx';
import Login from './pages/auth/Login.jsx';

import AdminDashboard from './pages/admin/AdminDashboard.jsx';
import ApplicationsList from './pages/admin/ApplicationsList.jsx';
import ApplicationReview from './pages/admin/ApplicationReview.jsx';
import AdminFees from './pages/admin/AdminFees.jsx';
import AdminStudents from './pages/admin/AdminStudents.jsx';
import AdminPlaceholder from './pages/admin/AdminPlaceholder.jsx';
import PortalSettings from './pages/admin/PortalSettings.jsx';

import ParentDashboard from './pages/parent/ParentDashboard.jsx';
import ParentEnrollmentStatus from './pages/parent/ParentEnrollmentStatus.jsx';
import ParentFees from './pages/parent/ParentFees.jsx';
import ParentDocuments from './pages/parent/ParentDocuments.jsx';
import ParentPhotos from './pages/parent/ParentPhotos.jsx';

import TeacherDashboard from './pages/teacher/TeacherDashboard.jsx';
import TeacherStudents from './pages/teacher/TeacherStudents.jsx';
import SendPhotos from './pages/teacher/SendPhotos.jsx';

import ChatPage from './pages/shared/ChatPage.jsx';
import Profile from './pages/shared/Profile.jsx';

const CORE_ADMIN = [ROLES.SUPER_ADMIN, ROLES.SCHOOL_ADMIN, ROLES.ADMISSION_OFFICER];
const SUPER_ADMIN_ONLY = [ROLES.SUPER_ADMIN];
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
      <Route path="/enroll" element={<Enrollment />} />
      <Route path="/login" element={<Login />} />

      {/* Admin routes */}
      <Route path="/admin/dashboard" element={<ProtectedRoute allowedRoles={CORE_ADMIN}><AdminDashboard /></ProtectedRoute>} />
      <Route path="/admin/applications" element={<ProtectedRoute allowedRoles={SUPPORT_APP_ROLES}><ApplicationsList /></ProtectedRoute>} />
      <Route path="/admin/applications/:id" element={<ProtectedRoute allowedRoles={CORE_ADMIN}><ApplicationReview /></ProtectedRoute>} />
      <Route path="/admin/students" element={<ProtectedRoute allowedRoles={CORE_ADMIN}><AdminStudents /></ProtectedRoute>} />
      <Route path="/admin/fees" element={<ProtectedRoute allowedRoles={FEES_ROLES}><AdminFees /></ProtectedRoute>} />
      <Route path="/admin/photos" element={<ProtectedRoute allowedRoles={CORE_ADMIN}><AdminPlaceholder title="Photo Sharing" subtitle="View and moderate teacher-shared photos." /></ProtectedRoute>} />
      <Route path="/admin/chat" element={<ProtectedRoute allowedRoles={CHAT_ADMIN_ROLES}><ChatPage /></ProtectedRoute>} />
      <Route path="/admin/notifications" element={<ProtectedRoute allowedRoles={NOTIFICATIONS_ROLES}><AdminPlaceholder title="Notifications" subtitle="Manage and view all school notifications." /></ProtectedRoute>} />
      <Route path="/admin/reports" element={<ProtectedRoute allowedRoles={REPORTS_ROLES}><AdminPlaceholder title="Reports" subtitle="Application, fee, and communication reports." /></ProtectedRoute>} />
      <Route path="/admin/settings" element={<ProtectedRoute allowedRoles={CORE_ADMIN}><AdminPlaceholder title="Settings" subtitle="School configuration and fee structures." /></ProtectedRoute>} />
      <Route path="/admin/audit-logs" element={<ProtectedRoute allowedRoles={CORE_ADMIN}><AdminPlaceholder title="Audit Logs" subtitle="Track all system actions and changes." /></ProtectedRoute>} />
      <Route path="/admin/portal-settings" element={<ProtectedRoute allowedRoles={SUPER_ADMIN_ONLY}><PortalSettings /></ProtectedRoute>} />

      {/* Parent routes */}
      <Route path="/parent/dashboard" element={<ProtectedRoute allowedRoles={PARENT_ROLES}><ParentDashboard /></ProtectedRoute>} />
      <Route path="/parent/enrollment" element={<ProtectedRoute allowedRoles={PARENT_ROLES}><ParentEnrollmentStatus /></ProtectedRoute>} />
      <Route path="/parent/fees" element={<ProtectedRoute allowedRoles={PARENT_ROLES}><ParentFees /></ProtectedRoute>} />
      <Route path="/parent/documents" element={<ProtectedRoute allowedRoles={PARENT_ROLES}><ParentDocuments /></ProtectedRoute>} />
      <Route path="/parent/photos" element={<ProtectedRoute allowedRoles={PARENT_ROLES}><ParentPhotos /></ProtectedRoute>} />
      <Route path="/parent/messages" element={<ProtectedRoute allowedRoles={PARENT_ROLES}><ChatPage /></ProtectedRoute>} />
      <Route path="/parent/notifications" element={<ProtectedRoute allowedRoles={PARENT_ROLES}><AdminPlaceholder title="Notifications" subtitle="Your enrollment and school notifications." /></ProtectedRoute>} />

      {/* Teacher routes */}
      <Route path="/teacher/dashboard" element={<ProtectedRoute allowedRoles={TEACHER_ROLES}><TeacherDashboard /></ProtectedRoute>} />
      <Route path="/teacher/classes" element={<ProtectedRoute allowedRoles={TEACHER_ROLES}><TeacherDashboard /></ProtectedRoute>} />
      <Route path="/teacher/students" element={<ProtectedRoute allowedRoles={TEACHER_ROLES}><TeacherStudents /></ProtectedRoute>} />
      <Route path="/teacher/photos" element={<ProtectedRoute allowedRoles={TEACHER_ROLES}><SendPhotos /></ProtectedRoute>} />
      <Route path="/teacher/messages" element={<ProtectedRoute allowedRoles={TEACHER_ROLES}><ChatPage /></ProtectedRoute>} />

      {/* Shared authenticated routes */}
      <Route path="/profile" element={<ProtectedRoute><Profile /></ProtectedRoute>} />

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
