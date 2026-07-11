import {
  BadgeCheck,
  BarChart3,
  Bell,
  Camera,
  ClipboardList,
  FileText,
  FolderOpen,
  Images,
  MessageCircle,
  Palette,
  Receipt,
  SearchCheck,
  Tv,
  Users,
} from 'lucide-react';

export const PLATFORM_PURPOSE =
  'Kids Activities is a multi-tenant school and activity enrollment platform where each school or program gets its own workspace. The platform manages online enrollment, applications, documents, fees, parent communication, classroom photos, albums, chat, notifications, and TV playback.';

export const PLATFORM_FEATURES = [
  { icon: ClipboardList, title: 'Online Enrollment' },
  { icon: FileText, title: '5-Page Kidzee Printable Form' },
  { icon: SearchCheck, title: 'Application Review' },
  { icon: FolderOpen, title: 'Document Collection' },
  { icon: Receipt, title: 'Fee Tracking' },
  { icon: BadgeCheck, title: 'Payment Proof' },
  { icon: MessageCircle, title: 'Parent Communication' },
  { icon: Bell, title: 'Chat & Notifications' },
  { icon: Camera, title: 'Classroom Photos' },
  { icon: Images, title: 'Albums' },
  { icon: Tv, title: 'QR & TV Playback' },
  { icon: Users, title: 'Role-Based Portals' },
  { icon: BarChart3, title: 'Reports' },
  { icon: Palette, title: 'Portal Branding' },
];

export const PLATFORM_ROLES = [
  {
    title: 'Admin',
    items: 'Applications, students, classes, teachers, fees, albums, reports, users, and portal settings.',
  },
  {
    title: 'Teacher',
    items: 'Classes, students, photo upload, class albums, parent messages, and TV album support.',
  },
  {
    title: 'Parent',
    items: 'Enrollment status, fees, documents, classroom photos, chat, notifications, and application PDF download.',
  },
  {
    title: 'Admission Officer',
    items: 'Application review, correction flow, and enrollment workflow.',
  },
  {
    title: 'Accountant',
    items: 'Fee records, payment tracking, receipts, and reports.',
  },
  {
    title: 'Support Staff',
    items: 'Application assistance and parent/school support chat.',
  },
];

export const ENROLLMENT_PAGES = [
  {
    page: 'Page 1',
    details: 'Child details, class, timing, photos, address, height, weight, uniform.',
  },
  {
    page: 'Page 2',
    details: 'Health, allergies, doctor, immunization.',
  },
  {
    page: 'Page 3',
    details: 'Family details, mother/father guardian details, siblings, income.',
  },
  {
    page: 'Page 4',
    details: 'Emergency contacts.',
  },
  {
    page: 'Page 5',
    details: 'Permissions, signatures, office use.',
  },
];

export const ENROLLMENT_WORKFLOW = [
  'Draft save',
  'Validation',
  'Submit application',
  'Correction flow',
  'PDF download',
  'Admin review',
  'Child / Father / Mother photos',
];

export const COMMUNICATION_MEDIA = [
  { title: 'Real-time chat', description: 'Direct messaging between parents, teachers, and school staff.' },
  { title: 'Notifications', description: 'Instant alerts for applications, fees, documents, and school updates.' },
  { title: 'Parent photo feed', description: 'Parents view classroom moments shared by teachers in real time.' },
  { title: 'Teacher photo sharing', description: 'Upload and share photos with selected classes or parents.' },
  { title: 'Class albums', description: 'Organized albums per class with image and video support.' },
  { title: 'Admin media management', description: 'Review, organize, and moderate school-wide media content.' },
  { title: 'Video/photo support', description: 'Rich media uploads with playback across web and mobile.' },
  { title: 'TV-ready albums', description: 'Curated albums designed for classroom and lobby displays.' },
];

export const TV_PLAYBACK_STEPS = [
  { id: 'tv-qr', label: 'TV shows QR' },
  { id: 'scan', label: 'Scan from app' },
  { id: 'album', label: 'Select album' },
  { id: 'play', label: 'TV playback' },
];

export const TV_PLAYBACK_DETAILS = [
  'QR approval',
  'Album selection',
  'TV playback',
  'Image/video support',
  'Android TV mode',
];

export const MOBILE_APP_ROLES = [
  {
    role: 'Parent app',
    screens: 'Home, Photos, Fees, Documents, Chat, My Application, New Enrollment, Profile.',
  },
  {
    role: 'Teacher app',
    screens: 'Home, Classes, Students, Share Photos, Class Album, Chat, Scan TV QR, Change TV Album.',
  },
  {
    role: 'Admin app',
    screens: 'Applications, Classes, Teachers, Albums, Reports, Users, Chat, Scan QR for TV Sign-In.',
  },
];
