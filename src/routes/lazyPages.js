import { lazy } from 'react';

function lazyNamed(importer, exportName) {
  return lazy(() => importer().then((mod) => ({ default: mod[exportName] })));
}

export const RegisterSchool = lazy(() => import('../pages/public/RegisterSchool.jsx'));
export const WorkspaceNew = lazy(() => import('../pages/public/WorkspaceNew.jsx'));
export const WorkspaceConfirm = lazy(() => import('../pages/public/WorkspaceConfirm.jsx'));
export const Enrollment = lazy(() => import('../pages/public/Enrollment.jsx'));
export const PrintableEnrollmentFormPage = lazy(() => import('../pages/public/PrintableEnrollmentFormPage.jsx'));
export const PrintableHtmlEnrollmentFormPage = lazy(() => import('../pages/public/PrintableHtmlEnrollmentFormPage.jsx'));
export const KidzeePrintableFormPage = lazy(() => import('../pages/enrollment/KidzeePrintableFormPage.jsx'));
export const KidzeePrintFormPrintPage = lazy(() => import('../pages/enrollment/KidzeePrintFormPrintPage.jsx'));
export const EnrollmentCorrectionPage = lazy(() => import('../pages/enrollment/EnrollmentCorrectionPage.jsx'));
export const Login = lazy(() => import('../pages/auth/Login.jsx'));
export const ForgotPassword = lazy(() => import('../pages/auth/ForgotPassword.jsx'));
export const ResetPassword = lazy(() => import('../pages/auth/ResetPassword.jsx'));
export const VerifyEmail = lazy(() => import('../pages/auth/VerifyEmail.jsx'));

export const SecurityPolicy = lazyNamed(() => import('../pages/public/FooterPageRoutes.jsx'), 'SecurityPolicy');
export const TermsOfUse = lazyNamed(() => import('../pages/public/FooterPageRoutes.jsx'), 'TermsOfUse');
export const TermsAndConditions = lazyNamed(() => import('../pages/public/FooterPageRoutes.jsx'), 'TermsAndConditions');
export const PrivacyPolicy = lazyNamed(() => import('../pages/public/FooterPageRoutes.jsx'), 'PrivacyPolicy');
export const SystemStatus = lazyNamed(() => import('../pages/public/FooterPageRoutes.jsx'), 'SystemStatus');
export const DirectSupport = lazyNamed(() => import('../pages/public/FooterPageRoutes.jsx'), 'DirectSupport');

export const AdminDashboard = lazy(() => import('../pages/admin/AdminDashboard.jsx'));
export const ApplicationsList = lazy(() => import('../pages/admin/ApplicationsList.jsx'));
export const ApplicationReview = lazy(() => import('../pages/admin/ApplicationReview.jsx'));
export const AdminFees = lazy(() => import('../pages/admin/AdminFees.jsx'));
export const AdminStudents = lazy(() => import('../pages/admin/AdminStudents.jsx'));
export const StudentProfile = lazy(() => import('../pages/admin/StudentProfile.jsx'));
export const AdminSettings = lazy(() => import('../pages/admin/AdminSettings.jsx'));
export const AdminClassManagement = lazy(() => import('../pages/admin/AdminClassManagement.jsx'));
export const AdminReports = lazy(() => import('../pages/admin/AdminReports.jsx'));
export const AdminAuditLogs = lazy(() => import('../pages/admin/AdminAuditLogs.jsx'));
export const PortalSettings = lazy(() => import('../pages/admin/PortalSettings.jsx'));
export const AdminUsers = lazy(() => import('../pages/admin/AdminUsers.jsx'));
export const AdminTeachers = lazy(() => import('../pages/admin/AdminTeachers.jsx'));
export const AdminSchools = lazy(() => import('../pages/admin/AdminSchools.jsx'));
export const AdminPhotos = lazy(() => import('../pages/admin/AdminPhotos.jsx'));
export const AdminAlbums = lazy(() => import('../pages/admin/AdminAlbums.jsx'));
export const AdminNoticeBoard = lazy(() => import('../pages/admin/AdminNoticeBoard.jsx'));
export const AdminNoticeForm = lazy(() => import('../pages/admin/AdminNoticeForm.jsx'));
export const AdminNoticeDetail = lazy(() => import('../pages/admin/AdminNoticeDetail.jsx'));

export const ParentDashboard = lazy(() => import('../pages/parent/ParentDashboard.jsx'));
export const ParentEnrollmentStatus = lazy(() => import('../pages/parent/ParentEnrollmentStatus.jsx'));
export const ParentFees = lazy(() => import('../pages/parent/ParentFees.jsx'));
export const ParentDocuments = lazy(() => import('../pages/parent/ParentDocuments.jsx'));
export const ParentPhotos = lazy(() => import('../pages/parent/ParentPhotos.jsx'));
export const ParentHomeworkPage = lazy(() => import('../pages/parent/ParentHomeworkPage.jsx'));

export const TeacherDashboard = lazy(() => import('../pages/teacher/TeacherDashboard.jsx'));
export const TeacherClasses = lazy(() => import('../pages/teacher/TeacherClasses.jsx'));
export const TeacherStudents = lazy(() => import('../pages/teacher/TeacherStudents.jsx'));
export const SendPhotos = lazy(() => import('../pages/teacher/SendPhotos.jsx'));
export const TeacherClassAlbum = lazy(() => import('../pages/teacher/TeacherClassAlbum.jsx'));

export const AttendanceSessionPage = lazy(() => import('../pages/attendance/AttendanceSessionPage.jsx'));
export const AttendanceDashboard = lazy(() => import('../pages/attendance/AttendanceDashboard.jsx'));
export const StudentAttendanceHistory = lazy(() => import('../pages/attendance/StudentAttendanceHistory.jsx'));

export const NotificationsPage = lazy(() => import('../pages/shared/NotificationsPage.jsx'));
export const MyNoticeBoard = lazy(() => import('../pages/shared/MyNoticeBoard.jsx'));
export const MyNoticeDetail = lazy(() => import('../pages/shared/MyNoticeDetail.jsx'));
export const ChatPage = lazy(() => import('../pages/shared/ChatPage.jsx'));
export const Profile = lazy(() => import('../pages/shared/Profile.jsx'));
export const CreativeCardsPage = lazy(() => import('../pages/shared/CreativeCardsPage.jsx'));

export const HomeworkPage = lazy(() => import('../pages/modules/HomeworkPage.jsx'));
export const ExamsPage = lazy(() => import('../pages/modules/ExamsPage.jsx'));
export const ExamMarksPage = lazy(() => import('../pages/modules/ExamMarksPage.jsx'));
export const LoginHistoryPage = lazy(() => import('../pages/modules/LoginHistoryPage.jsx'));
export const TimetablePage = lazy(() => import('../pages/modules/TimetablePage.jsx'));
export const LeaveRequestsPage = lazy(() => import('../pages/modules/LeaveRequestsPage.jsx'));

export const LmsCoursesPage = lazy(() => import('../pages/lms/LmsCoursesPage.jsx'));
export const LmsCourseEditorPage = lazy(() => import('../pages/lms/LmsCourseEditorPage.jsx'));
export const LmsEnrollmentsPage = lazy(() => import('../pages/lms/LmsEnrollmentsPage.jsx'));
export const LmsCertificatesPage = lazy(() => import('../pages/lms/LmsCertificatesPage.jsx'));
export const LmsEnrollmentProgressPage = lazy(() => import('../pages/lms/LmsEnrollmentProgressPage.jsx'));
export const MyLearningPage = lazy(() => import('../pages/lms/MyLearningPage.jsx'));
export const CoursePlayerPage = lazy(() => import('../pages/lms/CoursePlayerPage.jsx'));
export const CoursePlaygroundPage = lazy(() => import('../pages/lms/CoursePlaygroundPage.jsx'));

export const TransportRoutesPage = lazyNamed(() => import('../pages/modules/TransportPages.jsx'), 'TransportRoutesPage');
export const TransportVehiclesPage = lazyNamed(() => import('../pages/modules/TransportPages.jsx'), 'TransportVehiclesPage');
export const TransportLiveTrackingPage = lazy(() => import('../pages/modules/TransportLiveTrackingPage.jsx'));
export const TransportAssignmentsPage = lazy(() => import('../pages/modules/TransportAssignmentsPage.jsx'));
export const TransportDriversPage = lazy(() => import('../pages/modules/TransportDriversPage.jsx'));
export const TransportTripHistoryPage = lazy(() => import('../pages/modules/TransportTripHistoryPage.jsx'));
export const ParentTransportTrackingPage = lazy(() => import('../pages/modules/ParentTransportTrackingPage.jsx'));
export const DriverTripGuidePage = lazy(() => import('../pages/modules/DriverTripGuidePage.jsx'));

export const LibraryBooksPage = lazyNamed(() => import('../pages/modules/LibraryPages.jsx'), 'LibraryBooksPage');
export const LibraryIssuesPage = lazyNamed(() => import('../pages/modules/LibraryPages.jsx'), 'LibraryIssuesPage');

export const CertificatesPage = lazyNamed(() => import('../pages/modules/OpsModulePages.jsx'), 'CertificatesPage');
export const ExpensesPage = lazyNamed(() => import('../pages/modules/OpsModulePages.jsx'), 'ExpensesPage');
export const HrStaffPage = lazyNamed(() => import('../pages/modules/OpsModulePages.jsx'), 'HrStaffPage');
export const InventoryPage = lazyNamed(() => import('../pages/modules/OpsModulePages.jsx'), 'InventoryPage');
export const PayrollPage = lazyNamed(() => import('../pages/modules/OpsModulePages.jsx'), 'PayrollPage');
export const PerformanceNotesPage = lazyNamed(() => import('../pages/modules/OpsModulePages.jsx'), 'PerformanceNotesPage');
export const SubscriptionPlansPage = lazyNamed(() => import('../pages/modules/OpsModulePages.jsx'), 'SubscriptionPlansPage');

export const AccountingDashboardPage = lazy(() => import('../pages/modules/AccountingDashboardPage.jsx'));
export const AiAssistantPage = lazy(() => import('../pages/modules/AiAssistantPage.jsx'));
export const AdvancedAttendancePage = lazy(() => import('../pages/modules/AdvancedAttendancePage.jsx'));
export const AdvancedFeesPage = lazy(() => import('../pages/modules/AdvancedFeesPage.jsx'));
export const RolesPermissionsPage = lazy(() => import('../pages/modules/RolesPermissionsPage.jsx'));
export const SecurityCenterPage = lazy(() => import('../pages/modules/SecurityCenterPage.jsx'));
export const CommunicationCenterPage = lazy(() => import('../pages/modules/CommunicationCenterPage.jsx'));
export const ManagementReportsHubPage = lazy(() => import('../pages/modules/ManagementReportsHubPage.jsx'));

export const AdminSchoolCalendarPage = lazyNamed(() => import('../pages/calendar/SchoolCalendarPage.jsx'), 'AdminSchoolCalendarPage');
export const TeacherSchoolCalendarPage = lazyNamed(() => import('../pages/calendar/SchoolCalendarPage.jsx'), 'TeacherSchoolCalendarPage');
export const ParentSchoolCalendarPage = lazyNamed(() => import('../pages/calendar/SchoolCalendarPage.jsx'), 'ParentSchoolCalendarPage');
export const DriverSchoolCalendarPage = lazyNamed(() => import('../pages/calendar/SchoolCalendarPage.jsx'), 'DriverSchoolCalendarPage');
export const CalendarEventFormPage = lazy(() => import('../pages/calendar/CalendarEventFormPage.jsx'));
export const HolidaysPage = lazyNamed(() => import('../pages/calendar/CalendarEventsAdminPage.jsx'), 'HolidaysPage');
export const EmergencyClosuresPage = lazyNamed(() => import('../pages/calendar/CalendarEventsAdminPage.jsx'), 'EmergencyClosuresPage');
