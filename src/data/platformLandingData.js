import {
  BadgeCheck,
  BarChart3,
  Bell,
  BookOpen,
  Camera,
  ClipboardList,
  FileText,
  FolderOpen,
  Images,
  MessageCircle,
  Palette,
  QrCode,
  Receipt,
  School,
  SearchCheck,
  Smartphone,
  Tv,
  Users,
} from 'lucide-react';

export const PLATFORM_PURPOSE =
  'One branded workspace for enrollment, fees, documents, photos, and parent communication.';

export const HOW_IT_WORKS = [
  { step: '01', title: 'Create workspace', description: 'Register your school and get a dedicated portal.' },
  { step: '02', title: 'Configure portal', description: 'Set branding, forms, fees, classes, and login.' },
  { step: '03', title: 'Parents enroll', description: 'Families apply online and upload documents.' },
  { step: '04', title: 'Review & admit', description: 'Verify payments and confirm admission.' },
  { step: '05', title: 'Stay connected', description: 'Share photos, chat, and send updates.' },
];

export const PLATFORM_FEATURES = [
  { icon: ClipboardList, title: 'Online Enrollment', description: 'Digital admissions with live status tracking.' },
  { icon: FileText, title: 'Form', description: '5-page printable form and PDF download.' },
  { icon: SearchCheck, title: 'Application Review', description: 'Approve, reject, or request corrections.' },
  { icon: FolderOpen, title: 'Documents & Fees', description: 'Uploads, payment proof, and receipts.' },
  { icon: MessageCircle, title: 'Chat & Alerts', description: 'Parent communication and notifications.' },
  { icon: Camera, title: 'Photos & Albums', description: 'Classroom photos and class albums.' },
  { icon: Tv, title: 'QR & TV Playback', description: 'Show albums on classroom TVs.' },
  { icon: Users, title: 'Role-Based Portals', description: 'Admin, teacher, and parent dashboards.' },
];

export const PLATFORM_ROLES = [
  { title: 'School Admin', items: 'Applications, classes, fees, users, albums, and portal settings.' },
  { title: 'Admission Officer', items: 'Review applications, verify docs, and manage corrections.' },
  { title: 'Accountant', items: 'Fee records, payment verification, receipts, and reports.' },
  { title: 'Teacher', items: 'Classes, photos, albums, parent chat, and TV control.' },
  { title: 'Parent', items: 'Enrollment status, documents, fees, photos, and messages.' },
  { title: 'Support Staff', items: 'Help families and handle school support chat.' },
];

export const ADMISSION_PIPELINE = [
  { title: 'Draft', description: 'Save progress' },
  { title: 'Submitted', description: 'In the queue' },
  { title: 'Review', description: 'Staff checks' },
  { title: 'Correction', description: 'Parent updates' },
  { title: 'Fees', description: 'Verify payment' },
  { title: 'Approved', description: 'Confirm admit' },
];

export const ENROLLMENT_PAGES = [
  { page: 'Page 1', details: 'Child, class, photos, address' },
  { page: 'Page 2', details: 'Health & immunization' },
  { page: 'Page 3', details: 'Family & guardians' },
  { page: 'Page 4', details: 'Emergency contacts' },
  { page: 'Page 5', details: 'Signatures & office use' },
];

export const ENROLLMENT_WORKFLOW = [
  'Draft',
  'Validate',
  'Submit',
  'Correct',
  'Documents',
  'PDF',
  'Review',
];

export const FEES_AND_DOCS = [
  { icon: Receipt, title: 'Fee structures', description: 'Admission, tuition, transport, and more by class.' },
  { icon: BadgeCheck, title: 'Payment verify', description: 'Upload proof; staff approve or reject.' },
  { icon: FolderOpen, title: 'Secure documents', description: 'Upload, preview, and download safely.' },
  { icon: BookOpen, title: 'Digital receipts', description: 'Receipt numbers after verification.' },
];

export const OPERATIONS = [
  { icon: School, title: 'Class management', description: 'Create classes and assign teachers.' },
  { icon: Users, title: 'User management', description: 'Invite staff and manage roles.' },
  { icon: Palette, title: 'Portal settings', description: 'Menus, branding, and form builder.' },
  { icon: BarChart3, title: 'Reports & audit', description: 'Track applications, fees, and actions.' },
];

export const COMMUNICATION_MEDIA = [
  { icon: MessageCircle, title: 'Real-time chat', description: 'Parents, teachers, and staff messaging.' },
  { icon: Bell, title: 'Notifications', description: 'Instant alerts for school updates.' },
  { icon: Camera, title: 'Parent photo feed', description: 'Classroom moments shared privately.' },
  { icon: Images, title: 'Teacher sharing', description: 'Send photos to classes or parents.' },
  { icon: FolderOpen, title: 'Class albums', description: 'Images and videos per class.' },
  { icon: Tv, title: 'TV-ready albums', description: 'Display on lobby and classroom screens.' },
];

export const TV_PLAYBACK_STEPS = [
  {
    id: 'tv-qr',
    label: 'TV shows QR',
    icon: QrCode,
    description: 'The TV opens the album player and shows a secure QR code.',
  },
  {
    id: 'scan',
    label: 'Scan from app',
    icon: Smartphone,
    description: 'Teacher or admin scans the QR to authorize the session.',
  },
  {
    id: 'album',
    label: 'Select album',
    icon: Images,
    description: 'Choose an approved class album from the mobile app.',
  },
  {
    id: 'play',
    label: 'TV playback',
    icon: Tv,
    description: 'Slideshow starts. Change albums anytime from the app.',
  },
];

export const TV_PLAYBACK_DETAILS = [
  'QR approval',
  'Album select',
  'TV playback',
  'Photos & video',
];

export const MOBILE_APP_ROLES = [
  { role: 'Parent app', screens: 'Home, Photos, Fees, Documents, Chat, Enrollment, Profile' },
  { role: 'Teacher app', screens: 'Classes, Students, Photos, Albums, Chat, TV QR' },
  { role: 'Admin app', screens: 'Applications, Classes, Reports, Users, Chat, TV Sign-In' },
];
