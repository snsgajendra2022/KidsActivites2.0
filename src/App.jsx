import { Navigate, Outlet, Route, Routes } from 'react-router-dom';
import { Suspense, useEffect } from 'react';
import { probeUploadBandwidth } from './services/uploadBandwidthService.js';
import { classroomUploadManager } from './utils/classroomUploadQueue.js';
import ProtectedRoute from './components/ProtectedRoute.jsx';
import TenantPathGate from './components/routing/TenantPathGate.jsx';
import { ROLES } from './constants/roles.js';
import LoadingState from './components/ui/LoadingState.jsx';

import PlatformHomeGate from './components/routing/PlatformHomeGate.jsx';
import PlatformLandingGate from './components/routing/PlatformLandingGate.jsx';
import PlatformLoginGate from './components/routing/PlatformLoginGate.jsx';
import TenantHomeGate from './components/routing/TenantHomeGate.jsx';
import CatchAllRedirect from './components/routing/CatchAllRedirect.jsx';
import {
  RegisterSchool,
  WorkspaceNew,
  WorkspaceConfirm,
  Enrollment,
  PrintableEnrollmentFormPage,
  PrintableHtmlEnrollmentFormPage,
  KidzeePrintableFormPage,
  KidzeePrintFormPrintPage,
  EnrollmentCorrectionPage,
  Login,
  ForgotPassword,
  ResetPassword,
  VerifyEmail,
  SecurityPolicy,
  TermsOfUse,
  TermsAndConditions,
  PrivacyPolicy,
  SystemStatus,
  DirectSupport,
  AdminDashboard,
  ApplicationsList,
  ApplicationReview,
  AdminFees,
  AdminStudents,
  StudentProfile,
  AdminSettings,
  AdminClassManagement,
  AdminReports,
  AdminAuditLogs,
  PortalSettings,
  AdminUsers,
  AdminTeachers,
  AdminSchools,
  AdminPhotos,
  AdminAlbums,
  AdminNoticeBoard,
  AdminNoticeForm,
  AdminNoticeDetail,
  ParentDashboard,
  ParentEnrollmentStatus,
  ParentFees,
  ParentDocuments,
  ParentPhotos,
  ParentHomeworkPage,
  TeacherDashboard,
  TeacherClasses,
  TeacherStudents,
  SendPhotos,
  TeacherClassAlbum,
  AttendanceSessionPage,
  AttendanceDashboard,
  StudentAttendanceHistory,
  NotificationsPage,
  MyNoticeBoard,
  MyNoticeDetail,
  ChatPage,
  Profile,
  CreativeCardsPage,
  HomeworkPage,
  ExamsPage,
  ExamMarksPage,
  LoginHistoryPage,
  TimetablePage,
  LeaveRequestsPage,
  LmsCoursesPage,
  LmsCourseEditorPage,
  LmsEnrollmentsPage,
  LmsCertificatesPage,
  LmsEnrollmentProgressPage,
  MyLearningPage,
  CoursePlayerPage,
  CoursePlaygroundPage,
  TransportRoutesPage,
  TransportVehiclesPage,
  TransportLiveTrackingPage,
  TransportAssignmentsPage,
  TransportDriversPage,
  TransportTripHistoryPage,
  ParentTransportTrackingPage,
  DriverTripGuidePage,
  LibraryBooksPage,
  LibraryIssuesPage,
  CertificatesPage,
  ExpensesPage,
  HrStaffPage,
  InventoryPage,
  PayrollPage,
  PerformanceNotesPage,
  SubscriptionPlansPage,
  AccountingDashboardPage,
  AiAssistantPage,
  AdvancedAttendancePage,
  AdvancedFeesPage,
  RolesPermissionsPage,
  SecurityCenterPage,
  CommunicationCenterPage,
  ManagementReportsHubPage,
} from './routes/lazyPages.js';

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
const ATTENDANCE_HISTORY_ROLES = [...PARENT_ROLES, ...TEACHER_ROLES, ...CORE_ADMIN];
const CREATIVE_CARDS_ROLES = [ROLES.SCHOOL_ADMIN, ROLES.TEACHER, ROLES.PARENT, ROLES.STUDENT];

function TenantLayout() {
  return (
    <TenantPathGate>
      <Outlet />
    </TenantPathGate>
  );
}

function CreativeCardsRoute() {
  return <CreativeCardsPage />;
}

export default function App() {
  useEffect(() => {
    const startProbe = () => {
      void probeUploadBandwidth();
    };
    if (typeof window !== 'undefined' && 'requestIdleCallback' in window) {
      const idleId = window.requestIdleCallback(startProbe, { timeout: 4000 });
      return () => window.cancelIdleCallback(idleId);
    }
    const timer = window.setTimeout(startProbe, 1500);
    return () => window.clearTimeout(timer);
  }, []);

  useEffect(() => {
    void classroomUploadManager.hydrateFromPersisted();
  }, []);

  return (
    <Suspense fallback={<LoadingState message="Loading page…" className="min-h-dvh grid place-items-center" />}>
      <Routes>
      {/* Platform routes (no tenant prefix) */}
      <Route path="/" element={<PlatformLandingGate />} />
      <Route path="/kids-landing" element={<Navigate to="/" replace />} />
      <Route path="/work-space" element={<PlatformHomeGate />} />
      <Route path="/login" element={<PlatformLoginGate />} />
      <Route path="/forgot-password" element={<ForgotPassword />} />
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
        <Route path="admin/students/:studentId" element={<ProtectedRoute allowedRoles={CORE_ADMIN}><StudentProfile /></ProtectedRoute>} />
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
        <Route path="admin/attendance" element={<ProtectedRoute allowedRoles={CORE_ADMIN}><AttendanceDashboard /></ProtectedRoute>} />
        <Route path="admin/attendance/session" element={<ProtectedRoute allowedRoles={CORE_ADMIN}><AttendanceSessionPage /></ProtectedRoute>} />
        <Route path="admin/attendance-advanced" element={<ProtectedRoute allowedRoles={CORE_ADMIN}><AdvancedAttendancePage /></ProtectedRoute>} />
        <Route path="admin/leave" element={<ProtectedRoute allowedRoles={CORE_ADMIN}><LeaveRequestsPage layout="dashboard" /></ProtectedRoute>} />
        <Route path="admin/homework" element={<ProtectedRoute allowedRoles={[...CORE_ADMIN, ...TEACHER_ROLES]}><HomeworkPage /></ProtectedRoute>} />
        <Route path="admin/exams" element={<ProtectedRoute allowedRoles={CORE_ADMIN}><ExamsPage /></ProtectedRoute>} />
        <Route path="admin/exam-marks" element={<ProtectedRoute allowedRoles={[...CORE_ADMIN, ...TEACHER_ROLES]}><ExamMarksPage /></ProtectedRoute>} />
        <Route path="admin/timetable" element={<ProtectedRoute allowedRoles={CORE_ADMIN}><TimetablePage /></ProtectedRoute>} />
        <Route path="admin/lms" element={<ProtectedRoute allowedRoles={[...CORE_ADMIN, ...TEACHER_ROLES]}><LmsCoursesPage /></ProtectedRoute>} />
        <Route path="admin/lms/courses/new" element={<ProtectedRoute allowedRoles={[...CORE_ADMIN, ...TEACHER_ROLES]}><LmsCourseEditorPage /></ProtectedRoute>} />
        <Route path="admin/lms/courses/:courseId/playground" element={<ProtectedRoute allowedRoles={[...CORE_ADMIN, ...TEACHER_ROLES]}><CoursePlaygroundPage /></ProtectedRoute>} />
        <Route path="admin/lms/courses/:courseId" element={<ProtectedRoute allowedRoles={[...CORE_ADMIN, ...TEACHER_ROLES]}><LmsCourseEditorPage /></ProtectedRoute>} />
        <Route path="admin/lms/enrollments" element={<ProtectedRoute allowedRoles={[...CORE_ADMIN, ...TEACHER_ROLES]}><LmsEnrollmentsPage /></ProtectedRoute>} />
        <Route path="admin/lms/enrollments/:enrollmentId" element={<ProtectedRoute allowedRoles={[...CORE_ADMIN, ...TEACHER_ROLES]}><LmsEnrollmentProgressPage /></ProtectedRoute>} />
        <Route path="admin/lms/certificates" element={<ProtectedRoute allowedRoles={[...CORE_ADMIN, ...TEACHER_ROLES]}><LmsCertificatesPage audience="admin" backPath="/admin/lms" /></ProtectedRoute>} />
        <Route path="admin/fees-advanced" element={<ProtectedRoute allowedRoles={FEES_ROLES}><AdvancedFeesPage /></ProtectedRoute>} />
        <Route path="admin/accounting" element={<ProtectedRoute allowedRoles={FEES_ROLES}><AccountingDashboardPage /></ProtectedRoute>} />
        <Route path="admin/expenses" element={<ProtectedRoute allowedRoles={FEES_ROLES}><ExpensesPage /></ProtectedRoute>} />
        <Route path="admin/communication" element={<ProtectedRoute allowedRoles={CORE_ADMIN}><CommunicationCenterPage /></ProtectedRoute>} />
        <Route path="admin/transport/vehicles" element={<ProtectedRoute allowedRoles={CORE_ADMIN}><TransportVehiclesPage /></ProtectedRoute>} />
        <Route path="admin/transport/drivers" element={<ProtectedRoute allowedRoles={CORE_ADMIN}><TransportDriversPage /></ProtectedRoute>} />
        <Route path="admin/transport/routes" element={<ProtectedRoute allowedRoles={CORE_ADMIN}><TransportRoutesPage /></ProtectedRoute>} />
        <Route path="admin/transport/assignments" element={<ProtectedRoute allowedRoles={CORE_ADMIN}><TransportAssignmentsPage /></ProtectedRoute>} />
        <Route path="admin/transport/live" element={<ProtectedRoute allowedRoles={CORE_ADMIN}><TransportLiveTrackingPage /></ProtectedRoute>} />
        <Route path="admin/transport/trips" element={<ProtectedRoute allowedRoles={CORE_ADMIN}><TransportTripHistoryPage /></ProtectedRoute>} />
        <Route path="admin/library/books" element={<ProtectedRoute allowedRoles={CORE_ADMIN}><LibraryBooksPage /></ProtectedRoute>} />
        <Route path="admin/library/issues" element={<ProtectedRoute allowedRoles={CORE_ADMIN}><LibraryIssuesPage /></ProtectedRoute>} />
        <Route path="admin/inventory" element={<ProtectedRoute allowedRoles={CORE_ADMIN}><InventoryPage /></ProtectedRoute>} />
        <Route path="admin/hr" element={<ProtectedRoute allowedRoles={PORTAL_SETTINGS_ROLES}><HrStaffPage /></ProtectedRoute>} />
        <Route path="admin/payroll" element={<ProtectedRoute allowedRoles={FEES_ROLES}><PayrollPage /></ProtectedRoute>} />
        <Route path="admin/certificates" element={<ProtectedRoute allowedRoles={CORE_ADMIN}><CertificatesPage /></ProtectedRoute>} />
        <Route path="admin/ai" element={<ProtectedRoute allowedRoles={CORE_ADMIN}><AiAssistantPage /></ProtectedRoute>} />
        <Route path="admin/subscription" element={<ProtectedRoute allowedRoles={PORTAL_SETTINGS_ROLES}><SubscriptionPlansPage /></ProtectedRoute>} />
        <Route path="admin/roles" element={<ProtectedRoute allowedRoles={PORTAL_SETTINGS_ROLES}><RolesPermissionsPage /></ProtectedRoute>} />
        <Route path="admin/security" element={<ProtectedRoute allowedRoles={CORE_ADMIN}><SecurityCenterPage /></ProtectedRoute>} />
        <Route path="admin/login-history" element={<ProtectedRoute allowedRoles={CORE_ADMIN}><LoginHistoryPage /></ProtectedRoute>} />
        <Route path="admin/reports-hub" element={<ProtectedRoute allowedRoles={REPORTS_ROLES}><ManagementReportsHubPage /></ProtectedRoute>} />

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
        <Route path="parent/attendance" element={<ProtectedRoute allowedRoles={PARENT_ROLES}><StudentAttendanceHistory /></ProtectedRoute>} />
        <Route path="parent/homework" element={<ProtectedRoute allowedRoles={PARENT_ROLES}><ParentHomeworkPage /></ProtectedRoute>} />
        <Route path="parent/exams" element={<ProtectedRoute allowedRoles={PARENT_ROLES}><ExamMarksPage layout="app" readOnly audience="parent" /></ProtectedRoute>} />
        <Route path="parent/timetable" element={<ProtectedRoute allowedRoles={PARENT_ROLES}><TimetablePage layout="app" readOnly audience="parent" /></ProtectedRoute>} />
        <Route path="parent/lms" element={<ProtectedRoute allowedRoles={PARENT_ROLES}><MyLearningPage layout="app" basePath="/parent/lms" /></ProtectedRoute>} />
        <Route path="parent/lms/certificates" element={<ProtectedRoute allowedRoles={PARENT_ROLES}><LmsCertificatesPage layout="app" audience="parent" backPath="/parent/lms" /></ProtectedRoute>} />
        <Route path="parent/lms/:enrollmentId" element={<ProtectedRoute allowedRoles={PARENT_ROLES}><CoursePlayerPage layout="app" basePath="/parent/lms" /></ProtectedRoute>} />
        <Route path="parent/learning" element={<ProtectedRoute allowedRoles={PARENT_ROLES}><MyLearningPage layout="app" basePath="/parent/lms" /></ProtectedRoute>} />
        <Route path="parent/learning/certificates" element={<ProtectedRoute allowedRoles={PARENT_ROLES}><LmsCertificatesPage layout="app" audience="parent" backPath="/parent/lms" /></ProtectedRoute>} />
        <Route path="parent/learning/:enrollmentId" element={<ProtectedRoute allowedRoles={PARENT_ROLES}><CoursePlayerPage layout="app" basePath="/parent/lms" /></ProtectedRoute>} />
        <Route path="parent/leave" element={<ProtectedRoute allowedRoles={PARENT_ROLES}><LeaveRequestsPage layout="app" /></ProtectedRoute>} />
        <Route path="parent/transport" element={<ProtectedRoute allowedRoles={PARENT_ROLES}><ParentTransportTrackingPage /></ProtectedRoute>} />

        {/* Driver — trip GPS is mobile-first; web shows setup guidance */}
        <Route path="driver/trip" element={<ProtectedRoute allowedRoles={[ROLES.DRIVER]}><DriverTripGuidePage /></ProtectedRoute>} />

        {/* Teacher routes */}
        <Route path="teacher/dashboard" element={<ProtectedRoute allowedRoles={TEACHER_ROLES}><TeacherDashboard /></ProtectedRoute>} />
        <Route path="teacher/classes" element={<ProtectedRoute allowedRoles={TEACHER_ROLES}><TeacherClasses /></ProtectedRoute>} />
        <Route path="teacher/students" element={<ProtectedRoute allowedRoles={TEACHER_ROLES}><TeacherStudents /></ProtectedRoute>} />
        <Route path="teacher/photos" element={<ProtectedRoute allowedRoles={TEACHER_ROLES}><SendPhotos /></ProtectedRoute>} />
        <Route path="teacher/class-album" element={<ProtectedRoute allowedRoles={TEACHER_ROLES}><TeacherClassAlbum /></ProtectedRoute>} />
        <Route path="teacher/messages" element={<ProtectedRoute allowedRoles={TEACHER_ROLES}><ChatPage /></ProtectedRoute>} />
        <Route path="teacher/notice-board" element={<ProtectedRoute allowedRoles={TEACHER_ROLES}><MyNoticeBoard basePath="/teacher/notice-board" title="Notice Board" subtitle="Announcements shared with you by the school." /></ProtectedRoute>} />
        <Route path="teacher/notice-board/:noticeId" element={<ProtectedRoute allowedRoles={TEACHER_ROLES}><MyNoticeDetail backPath="/teacher/notice-board" /></ProtectedRoute>} />
        <Route path="teacher/attendance" element={<ProtectedRoute allowedRoles={TEACHER_ROLES}><AttendanceSessionPage /></ProtectedRoute>} />
        <Route path="teacher/homework" element={<ProtectedRoute allowedRoles={TEACHER_ROLES}><HomeworkPage layout="app" /></ProtectedRoute>} />
        <Route path="teacher/exams" element={<ProtectedRoute allowedRoles={TEACHER_ROLES}><ExamsPage layout="app" /></ProtectedRoute>} />
        <Route path="teacher/marks" element={<ProtectedRoute allowedRoles={TEACHER_ROLES}><ExamMarksPage layout="app" /></ProtectedRoute>} />
        <Route path="teacher/notes" element={<ProtectedRoute allowedRoles={TEACHER_ROLES}><PerformanceNotesPage layout="app" /></ProtectedRoute>} />
        <Route path="teacher/timetable" element={<ProtectedRoute allowedRoles={TEACHER_ROLES}><TimetablePage layout="app" readOnly audience="teacher" /></ProtectedRoute>} />
        <Route path="teacher/lms" element={<ProtectedRoute allowedRoles={TEACHER_ROLES}><LmsCoursesPage layout="app" basePath="/teacher/lms" /></ProtectedRoute>} />
        <Route path="teacher/lms/courses/new" element={<ProtectedRoute allowedRoles={TEACHER_ROLES}><LmsCourseEditorPage layout="app" basePath="/teacher/lms" /></ProtectedRoute>} />
        <Route path="teacher/lms/courses/:courseId/playground" element={<ProtectedRoute allowedRoles={TEACHER_ROLES}><CoursePlaygroundPage layout="app" basePath="/teacher/lms" /></ProtectedRoute>} />
        <Route path="teacher/lms/courses/:courseId" element={<ProtectedRoute allowedRoles={TEACHER_ROLES}><LmsCourseEditorPage layout="app" basePath="/teacher/lms" /></ProtectedRoute>} />
        <Route path="teacher/lms/enrollments" element={<ProtectedRoute allowedRoles={TEACHER_ROLES}><LmsEnrollmentsPage layout="app" basePath="/teacher/lms" /></ProtectedRoute>} />
        <Route path="teacher/lms/enrollments/:enrollmentId" element={<ProtectedRoute allowedRoles={TEACHER_ROLES}><LmsEnrollmentProgressPage layout="app" basePath="/teacher/lms" /></ProtectedRoute>} />
        <Route path="teacher/lms/certificates" element={<ProtectedRoute allowedRoles={TEACHER_ROLES}><LmsCertificatesPage layout="app" audience="teacher" backPath="/teacher/lms" /></ProtectedRoute>} />

        {/* Shared authenticated routes */}
        <Route path="creative-cards" element={<ProtectedRoute allowedRoles={CREATIVE_CARDS_ROLES}><CreativeCardsRoute /></ProtectedRoute>} />
        <Route path="creative-cards/templates" element={<ProtectedRoute allowedRoles={CREATIVE_CARDS_ROLES}><CreativeCardsRoute /></ProtectedRoute>} />
        <Route path="creative-cards/create/:templateId" element={<ProtectedRoute allowedRoles={CREATIVE_CARDS_ROLES}><CreativeCardsRoute /></ProtectedRoute>} />
        <Route path="creative-cards/my-cards" element={<ProtectedRoute allowedRoles={CREATIVE_CARDS_ROLES}><CreativeCardsRoute /></ProtectedRoute>} />
        <Route path="creative-cards/view/:cardId" element={<ProtectedRoute allowedRoles={CREATIVE_CARDS_ROLES}><CreativeCardsRoute /></ProtectedRoute>} />
        <Route path="attendance/students/:studentId" element={<ProtectedRoute allowedRoles={ATTENDANCE_HISTORY_ROLES}><StudentAttendanceHistory /></ProtectedRoute>} />
        <Route path="profile" element={<ProtectedRoute><Profile /></ProtectedRoute>} />
      </Route>

      <Route path="*" element={<CatchAllRedirect />} />
    </Routes>
    </Suspense>
  );
}
