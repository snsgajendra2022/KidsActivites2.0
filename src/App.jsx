import { Navigate, Outlet, Route, Routes } from 'react-router-dom';
import { useEffect } from 'react';
import { probeUploadBandwidth } from './services/uploadBandwidthService.js';
import { classroomUploadManager } from './utils/classroomUploadQueue.js';
import ProtectedRoute from './components/ProtectedRoute.jsx';
import TenantPathGate from './components/routing/TenantPathGate.jsx';
import { ROLES } from './constants/roles.js';

import PlatformHomeGate from './components/routing/PlatformHomeGate.jsx';
import PlatformLoginGate from './components/routing/PlatformLoginGate.jsx';
import TenantHomeGate from './components/routing/TenantHomeGate.jsx';
import KidsLandingPage from './pages/public/KidsLandingPage.jsx';
import RegisterSchool from './pages/public/RegisterSchool.jsx';
import WorkspaceNew from './pages/public/WorkspaceNew.jsx';
import WorkspaceConfirm from './pages/public/WorkspaceConfirm.jsx';
import Enrollment from './pages/public/Enrollment.jsx';
import PrintableEnrollmentFormPage from './pages/public/PrintableEnrollmentFormPage.jsx';
import PrintableHtmlEnrollmentFormPage from './pages/public/PrintableHtmlEnrollmentFormPage.jsx';
import KidzeePrintableFormPage from './pages/enrollment/KidzeePrintableFormPage.jsx';
import KidzeePrintFormPrintPage from './pages/enrollment/KidzeePrintFormPrintPage.jsx';
import EnrollmentCorrectionPage from './pages/enrollment/EnrollmentCorrectionPage.jsx';
import Login from './pages/auth/Login.jsx';
import ForgotPassword from './pages/auth/ForgotPassword.jsx';
import ResetPassword from './pages/auth/ResetPassword.jsx';
import VerifyEmail from './pages/auth/VerifyEmail.jsx';
import {
  SecurityPolicy,
  TermsOfUse,
  TermsAndConditions,
  PrivacyPolicy,
  SystemStatus,
  DirectSupport,
} from './pages/public/FooterPageRoutes.jsx';

import AdminDashboard from './pages/admin/AdminDashboard.jsx';
import ApplicationsList from './pages/admin/ApplicationsList.jsx';
import ApplicationReview from './pages/admin/ApplicationReview.jsx';
import AdminFees from './pages/admin/AdminFees.jsx';
import AdminStudents from './pages/admin/AdminStudents.jsx';
import AdminSettings from './pages/admin/AdminSettings.jsx';
import AdminClassManagement from './pages/admin/AdminClassManagement.jsx';
import AdminReports from './pages/admin/AdminReports.jsx';
import AdminAuditLogs from './pages/admin/AdminAuditLogs.jsx';
import PortalSettings from './pages/admin/PortalSettings.jsx';
import AdminUsers from './pages/admin/AdminUsers.jsx';
import AdminTeachers from './pages/admin/AdminTeachers.jsx';
import AdminSchools from './pages/admin/AdminSchools.jsx';
import AdminPhotos from './pages/admin/AdminPhotos.jsx';
import AdminAlbums from './pages/admin/AdminAlbums.jsx';
import AdminNoticeBoard from './pages/admin/AdminNoticeBoard.jsx';
import AdminNoticeForm from './pages/admin/AdminNoticeForm.jsx';
import AdminNoticeDetail from './pages/admin/AdminNoticeDetail.jsx';

import ParentDashboard from './pages/parent/ParentDashboard.jsx';
import ParentEnrollmentStatus from './pages/parent/ParentEnrollmentStatus.jsx';
import ParentFees from './pages/parent/ParentFees.jsx';
import ParentDocuments from './pages/parent/ParentDocuments.jsx';
import ParentPhotos from './pages/parent/ParentPhotos.jsx';

import TeacherDashboard from './pages/teacher/TeacherDashboard.jsx';
import TeacherClasses from './pages/teacher/TeacherClasses.jsx';
import TeacherStudents from './pages/teacher/TeacherStudents.jsx';
import SendPhotos from './pages/teacher/SendPhotos.jsx';
import TeacherClassAlbum from './pages/teacher/TeacherClassAlbum.jsx';

import NotificationsPage from './pages/shared/NotificationsPage.jsx';
import MyNoticeBoard from './pages/shared/MyNoticeBoard.jsx';
import MyNoticeDetail from './pages/shared/MyNoticeDetail.jsx';
import ChatPage from './pages/shared/ChatPage.jsx';
import Profile from './pages/shared/Profile.jsx';

const CORE_ADMIN = [ROLES.SUPER_ADMIN, ROLES.SCHOOL_ADMIN, ROLES.ADMISSION_OFFICER];
const SUPER_ADMIN_ONLY = [ROLES.SUPER_ADMIN];
const PORTAL_SETTINGS_ROLES = [ROLES.SUPER_ADMIN, ROLES.SCHOOL_ADMIN];
const FEES_ROLES = [...CORE_ADMIN, ROLES.ACCOUNTANT];
const APPLICATION_REVIEW_ROLES = [...CORE_ADMIN, ROLES.ACCOUNTANT, ROLES.SUPPORT_STAFF];
const REPORTS_ROLES = [...CORE_ADMIN, ROLES.ACCOUNTANT];
const CHAT_ADMIN_ROLES = [...CORE_ADMIN, ROLES.SUPPORT_STAFF];
const SUPPORT_APP_ROLES = [...CORE_ADMIN, ROLES.SUPPORT_STAFF];
const NOTIFICATIONS_ROLES = [...CORE_ADMIN, ROLES.ACCOUNTANT, ROLES.SUPPORT_STAFF];
const PARENT_ROLES = [ROLES.PARENT, ROLES.STUDENT];
const TEACHER_ROLES = [ROLES.TEACHER];
const NOTICE_BOARD_ADMIN_ROLES = [...CORE_ADMIN, ROLES.ACCOUNTANT];
const NOTICE_BOARD_READ_ROLES = [...PARENT_ROLES, ...TEACHER_ROLES, ...CORE_ADMIN];

function TenantLayout() {
  return (
    <TenantPathGate>
      <Outlet />
    </TenantPathGate>
  );
}

export default function App() {
  useEffect(() => {
    void probeUploadBandwidth();
    void classroomUploadManager.hydrateFromPersisted();
  }, []);

  return (
    <Routes>
      {/* Platform routes (no tenant prefix) */}
      <Route path="/" element={<KidsLandingPage />} />
      <Route path="/kids-landing" element={<Navigate to="/" replace />} />
      <Route path="/work-space" element={<PlatformHomeGate />} />
      <Route path="/login" element={<PlatformLoginGate />} />
      <Route path="/register-school" element={<RegisterSchool />} />
      <Route path="/workspace/new" element={<WorkspaceNew />} />
      <Route path="/workspace/confirm" element={<WorkspaceConfirm />} />
      <Route path="/enrollment" element={<Enrollment />} />
      <Route path="/enrollment/printable-form" element={<PrintableEnrollmentFormPage />} />
      <Route path="/enrollment/html-form" element={<PrintableHtmlEnrollmentFormPage />} />
      <Route path="/enrollment/kidzee-print-form" element={<KidzeePrintableFormPage />} />
      <Route path="/enrollment/kidzee-print-form/print" element={<KidzeePrintFormPrintPage />} />
      <Route path="/enrollment/correction/:token" element={<EnrollmentCorrectionPage />} />
      <Route path="/enroll" element={<Navigate to="/enrollment" replace />} />
      <Route path="/security-policy" element={<SecurityPolicy />} />
      <Route path="/terms-of-use" element={<TermsOfUse />} />
      <Route path="/terms-and-conditions" element={<TermsAndConditions />} />
      <Route path="/term&condition" element={<TermsAndConditions />} />
      <Route path="/privacy-policy" element={<PrivacyPolicy />} />
      <Route path="/privacy&policy" element={<PrivacyPolicy />} />
      <Route path="/system-status" element={<SystemStatus />} />
      <Route path="/support" element={<DirectSupport />} />

      {/* Tenant-scoped routes: /{tenantSlug}/... */}
      <Route path="/:tenantSlug" element={<TenantLayout />}>
        <Route index element={<TenantHomeGate />} />
        <Route path="login" element={<Login />} />
        <Route path="forgot-password" element={<ForgotPassword />} />
        <Route path="reset-password" element={<ResetPassword />} />
        <Route path="verify-email" element={<VerifyEmail />} />
        <Route path="enroll" element={<Enrollment />} />
        <Route path="enroll/printable-form" element={<PrintableEnrollmentFormPage />} />
        <Route path="enrollment/printable-form" element={<PrintableEnrollmentFormPage />} />
        <Route path="enrollment/html-form" element={<PrintableHtmlEnrollmentFormPage />} />
        <Route path="enroll/html-form" element={<PrintableHtmlEnrollmentFormPage />} />
        <Route path="enrollment/kidzee-print-form" element={<KidzeePrintableFormPage />} />
        <Route path="enrollment/kidzee-print-form/print" element={<KidzeePrintFormPrintPage />} />
        <Route path="enroll/kidzee-print-form" element={<KidzeePrintableFormPage />} />
        <Route path="enrollment/correction/:token" element={<EnrollmentCorrectionPage />} />
        <Route path="enrollment" element={<Navigate to="enroll" replace />} />

        {/* Admin routes */}
        <Route path="admin/dashboard" element={<ProtectedRoute allowedRoles={CORE_ADMIN}><AdminDashboard /></ProtectedRoute>} />
        <Route path="admin/applications" element={<ProtectedRoute allowedRoles={SUPPORT_APP_ROLES}><ApplicationsList /></ProtectedRoute>} />
        <Route path="admin/applications/:id" element={<ProtectedRoute allowedRoles={APPLICATION_REVIEW_ROLES}><ApplicationReview /></ProtectedRoute>} />
        <Route path="admin/students" element={<ProtectedRoute allowedRoles={CORE_ADMIN}><AdminStudents /></ProtectedRoute>} />
        <Route path="admin/fees" element={<ProtectedRoute allowedRoles={FEES_ROLES}><AdminFees /></ProtectedRoute>} />
        <Route path="admin/photos" element={<ProtectedRoute allowedRoles={CORE_ADMIN}><AdminPhotos /></ProtectedRoute>} />
        <Route path="admin/chat" element={<ProtectedRoute allowedRoles={CHAT_ADMIN_ROLES}><ChatPage /></ProtectedRoute>} />
        <Route path="admin/notifications" element={<ProtectedRoute allowedRoles={NOTIFICATIONS_ROLES}><NotificationsPage title="Notifications" subtitle="Manage and view all school notifications." /></ProtectedRoute>} />
        <Route path="admin/reports" element={<ProtectedRoute allowedRoles={REPORTS_ROLES}><AdminReports /></ProtectedRoute>} />
        <Route path="admin/settings" element={<ProtectedRoute allowedRoles={CORE_ADMIN}><AdminSettings /></ProtectedRoute>} />
        <Route path="admin/class-management" element={<ProtectedRoute allowedRoles={CORE_ADMIN}><AdminClassManagement /></ProtectedRoute>} />
        <Route path="admin/albums" element={<ProtectedRoute allowedRoles={CORE_ADMIN}><AdminAlbums /></ProtectedRoute>} />
        <Route path="admin/notice-board" element={<ProtectedRoute allowedRoles={NOTICE_BOARD_ADMIN_ROLES}><AdminNoticeBoard /></ProtectedRoute>} />
        <Route path="admin/notice-board/new" element={<ProtectedRoute allowedRoles={NOTICE_BOARD_ADMIN_ROLES}><AdminNoticeForm /></ProtectedRoute>} />
        <Route path="admin/notice-board/:noticeId/edit" element={<ProtectedRoute allowedRoles={NOTICE_BOARD_ADMIN_ROLES}><AdminNoticeForm /></ProtectedRoute>} />
        <Route path="admin/notice-board/:noticeId" element={<ProtectedRoute allowedRoles={NOTICE_BOARD_ADMIN_ROLES}><AdminNoticeDetail /></ProtectedRoute>} />
        <Route path="admin/audit-logs" element={<ProtectedRoute allowedRoles={CORE_ADMIN}><AdminAuditLogs /></ProtectedRoute>} />
        <Route path="admin/portal-settings" element={<ProtectedRoute allowedRoles={PORTAL_SETTINGS_ROLES}><PortalSettings /></ProtectedRoute>} />
        <Route path="admin/users" element={<ProtectedRoute allowedRoles={SUPER_ADMIN_ONLY}><AdminUsers /></ProtectedRoute>} />
        <Route path="admin/all-users" element={<ProtectedRoute allowedRoles={CORE_ADMIN}><AdminUsers /></ProtectedRoute>} />
        <Route path="admin/teachers" element={<ProtectedRoute allowedRoles={PORTAL_SETTINGS_ROLES}><AdminTeachers /></ProtectedRoute>} />
        <Route path="admin/schools" element={<ProtectedRoute allowedRoles={SUPER_ADMIN_ONLY}><AdminSchools /></ProtectedRoute>} />

        {/* Parent routes */}
        <Route path="parent" element={<Navigate to="dashboard" replace />} />
        <Route path="parent/dashboard" element={<ProtectedRoute allowedRoles={PARENT_ROLES}><ParentDashboard /></ProtectedRoute>} />
        <Route path="parent/enrollment" element={<ProtectedRoute allowedRoles={PARENT_ROLES}><ParentEnrollmentStatus /></ProtectedRoute>} />
        <Route path="parent/fees" element={<ProtectedRoute allowedRoles={PARENT_ROLES}><ParentFees /></ProtectedRoute>} />
        <Route path="parent/documents" element={<ProtectedRoute allowedRoles={PARENT_ROLES}><ParentDocuments /></ProtectedRoute>} />
        <Route path="parent/photos" element={<ProtectedRoute allowedRoles={PARENT_ROLES}><ParentPhotos /></ProtectedRoute>} />
        <Route path="parent/messages" element={<ProtectedRoute allowedRoles={PARENT_ROLES}><ChatPage /></ProtectedRoute>} />
        <Route path="parent/notice-board" element={<ProtectedRoute allowedRoles={PARENT_ROLES}><MyNoticeBoard /></ProtectedRoute>} />
        <Route path="parent/notice-board/:noticeId" element={<ProtectedRoute allowedRoles={PARENT_ROLES}><MyNoticeDetail backPath="/parent/notice-board" /></ProtectedRoute>} />
        <Route path="parent/notifications" element={<ProtectedRoute allowedRoles={PARENT_ROLES}><NotificationsPage title="Notifications" subtitle="Your enrollment and school notifications." /></ProtectedRoute>} />

        {/* Teacher routes */}
        <Route path="teacher/dashboard" element={<ProtectedRoute allowedRoles={TEACHER_ROLES}><TeacherDashboard /></ProtectedRoute>} />
        <Route path="teacher/classes" element={<ProtectedRoute allowedRoles={TEACHER_ROLES}><TeacherClasses /></ProtectedRoute>} />
        <Route path="teacher/students" element={<ProtectedRoute allowedRoles={TEACHER_ROLES}><TeacherStudents /></ProtectedRoute>} />
        <Route path="teacher/photos" element={<ProtectedRoute allowedRoles={TEACHER_ROLES}><SendPhotos /></ProtectedRoute>} />
        <Route path="teacher/class-album" element={<ProtectedRoute allowedRoles={TEACHER_ROLES}><TeacherClassAlbum /></ProtectedRoute>} />
        <Route path="teacher/messages" element={<ProtectedRoute allowedRoles={TEACHER_ROLES}><ChatPage /></ProtectedRoute>} />
        <Route path="teacher/notice-board" element={<ProtectedRoute allowedRoles={TEACHER_ROLES}><MyNoticeBoard basePath="/teacher/notice-board" title="Notice Board" subtitle="Announcements shared with you by the school." /></ProtectedRoute>} />
        <Route path="teacher/notice-board/:noticeId" element={<ProtectedRoute allowedRoles={TEACHER_ROLES}><MyNoticeDetail backPath="/teacher/notice-board" /></ProtectedRoute>} />

        {/* Shared authenticated routes */}
        <Route path="profile" element={<ProtectedRoute><Profile /></ProtectedRoute>} />
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
