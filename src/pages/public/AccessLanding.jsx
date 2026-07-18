import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  ArrowRight,
  Building2,
  LogIn,
  Sparkles,
  ClipboardList,
  Image as ImageIcon,
  CreditCard,
  FileText,
  Users,
  UserCheck,
  Settings,
  Smartphone
} from 'lucide-react';
import PublicLayout from '../../components/layout/PublicLayout.jsx';
import CinematicHero from '../../components/public/CinematicHero.jsx';
import EditorialTimeline from '../../components/public/EditorialTimeline.jsx';
import FinalImageCTA from '../../components/public/FinalImageCTA.jsx';
import EditorialFooter from '../../components/public/EditorialFooter.jsx';
import PlatformLandingSections from '../../components/public/PlatformLandingSections.jsx';
import FormInput from '../../components/ui/FormInput.jsx';
import Button from '../../components/ui/Button.jsx';
import { usePortalConfig } from '../../context/PortalConfigContext.jsx';
import { DEFAULT_PORTAL_CONFIG } from '../../data/defaultPortalConfig.js';

import imgAdmissions from '../../assets/timeline_admissions.png';
import imgPhotos from '../../assets/timeline_photos.png';
import imgFees from '../../assets/timeline_fees.png';
import imgDashboards from '../../assets/timeline_dashboards.png';
import imgMobileMockup from '../../assets/mobile_mockup.png';

const DEFAULT_HERO_HEADLINE = ['Manage Kids Activities,', 'Admissions, Photos, and Parents', 'in One Platform'];
const DEFAULT_HERO_SUBTEXT =
  'Launch your activity workspace in minutes.\nManage enrollments, fees, documents, photo albums, classroom updates, and parent communication from one trusted portal.';

const TIMELINE_STEPS = [
  {
    title: 'Digital Admissions & Enrollment',
    description: 'Simplify student registration with online forms, parent application tracking, and secure admin review.',
    imageUrl: imgAdmissions,
  },
  {
    title: 'Photo Albums & Memories',
    description: 'Teachers can upload class and event photos, admins can manage albums, and parents can view shared memories from their dashboard.',
    imageUrl: imgPhotos,
  },
  {
    title: 'Secure Fee Management',
    description: 'Parents can track fees and payment history, while admins manage collected and pending payments from one place.',
    imageUrl: imgFees,
  },
  {
    title: 'Dedicated Dashboards',
    description: 'Give admins, teachers, and parents personalized dashboards to manage applications, students, documents, photos, and fees.',
    imageUrl: imgDashboards,
  },
];

function parseHeroHeadline(headline) {
  if (!headline?.trim()) return DEFAULT_HERO_HEADLINE;
  const lines = headline.split('\n').map((line) => line.trim()).filter(Boolean);
  return lines.length ? lines : DEFAULT_HERO_HEADLINE;
}

export default function AccessLanding() {
  const { portalName, branding, platform } = usePortalConfig();
  const navigate = useNavigate();
  const [workspaceSlug, setWorkspaceSlug] = useState('');

  const heroImage = branding?.heroImageUrl || DEFAULT_PORTAL_CONFIG.branding.heroImageUrl;
  const heroLines = parseHeroHeadline(platform?.heroHeadline);
  const heroSubtext = platform?.heroSubtext?.trim() || DEFAULT_HERO_SUBTEXT;

  function handleSignIn(e) {
    e.preventDefault();
    const slug = workspaceSlug.trim().toLowerCase();
    if (!slug) return;
    navigate(`/${slug}/login`);
  }

  return (
    <PublicLayout hideFooter className="sb-editorial-page">
      <CinematicHero
        imageUrl={heroImage}
        badge={(
          <>
            <Sparkles size={14} />
            {platform?.tagline || 'KIDS ACTIVITY & PARENT COMMUNICATION PLATFORM'}
          </>
        )}
        title={heroLines.map((line, index) => (
          <span key={line}>
            {line}
            {index < heroLines.length - 1 && <br />}
          </span>
        ))}
        subtitle={heroSubtext.split('\n').map((line, index, arr) => (
          <span key={line}>
            {line}
            {index < arr.length - 1 && <br />}
          </span>
        ))}
        primaryAction={{
          to: '/workspace/new',
          label: <>Create Your Workspace <ArrowRight size={18} /></>,
        }}
        secondaryAction={{
          onClick: () => {
            document.getElementById('platform-overview')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
          },
          label: 'See All Features',
        }}
      />

      <section className="sb-editorial-section sb-editorial-section--cream sb-access-section">
        <div className="sb-container sb-access-cards">
          <div className="sb-access-card">
            <div className="sb-access-card__icon">
              <Building2 size={22} />
            </div>
            <h2>New to Kids Activities?</h2>
            <p>
              Request a dedicated workspace for your activity program. We'll send a confirmation email and set up your portal after verification.
            </p>
            <Link to="/workspace/new" className="sb-purple-cta">
              Start Workspace Setup <ArrowRight size={16} />
            </Link>
          </div>

          <div className="sb-access-card">
            <div className="sb-access-card__icon">
              <LogIn size={22} />
            </div>
            <h2>Sign in to your workspace</h2>
            <p>Enter your workspace slug to open your portal login.</p>
            <form onSubmit={handleSignIn} className="flex flex-col gap-3 sm:flex-row">
              <FormInput
                name="workspaceSlug"
                placeholder="your-program"
                value={workspaceSlug}
                onChange={(e) => setWorkspaceSlug(e.target.value)}
                helper="e.g. little-stars → /little-stars/login"
                className="flex-1"
              />
              <Button type="submit" variant="primary" size="lg" className="sb-purple-cta shrink-0 sm:self-end !border-0">
                Continue
              </Button>
            </form>
          </div>
        </div>
      </section>

      <EditorialTimeline
        title="Why Programs Choose Kids Activities"
        subtitle="A complete platform for admissions, photo albums, fees, documents, dashboards, and parent communication."
        steps={TIMELINE_STEPS}
      />

      <section className="sb-editorial-section sb-editorial-section--white">
        <div className="sb-container flex flex-col md:flex-row items-center gap-12">
          <div className="flex-1">
            <h2 className="text-3xl font-bold mb-4" style={{ color: 'var(--navy)' }}>Photo Albums & Memories</h2>
            <p className="text-lg text-gray-600 mb-8">
              Teachers can upload photos directly from classes or events, admins can organize albums, and parents can view shared memories from their dashboard. Every gallery is designed to keep photos private, organized, and easy to access.
            </p>
            <ul className="space-y-4">
              <li className="flex items-start gap-3">
                <div className="mt-1 text-purple-600"><ImageIcon size={20} /></div>
                <div><strong className="text-gray-800">Teacher Uploads</strong><p className="text-gray-600">Teachers can share class and activity photos quickly.</p></div>
              </li>
              <li className="flex items-start gap-3">
                <div className="mt-1 text-purple-600"><Building2 size={20} /></div>
                <div><strong className="text-gray-800">Private Galleries</strong><p className="text-gray-600">Create class-wise and event-wise albums with secure access.</p></div>
              </li>
              <li className="flex items-start gap-3">
                <div className="mt-1 text-purple-600"><Users size={20} /></div>
                <div><strong className="text-gray-800">Parent Access</strong><p className="text-gray-600">Parents can view shared memories from their dashboard anytime.</p></div>
              </li>
              <li className="flex items-start gap-3">
                <div className="mt-1 text-purple-600"><Settings size={20} /></div>
                <div><strong className="text-gray-800">Admin Album Control</strong><p className="text-gray-600">Admins can manage albums, review uploads, and organize galleries.</p></div>
              </li>
              <li className="flex items-start gap-3">
                <div className="mt-1 text-purple-600"><Smartphone size={20} /></div>
                <div><strong className="text-gray-800">Mobile-Friendly Uploads</strong><p className="text-gray-600">Photos can be uploaded from desktop, tablet, or mobile browser.</p></div>
              </li>
              <li className="flex items-start gap-3">
                <div className="mt-1 text-purple-600"><UserCheck size={20} /></div>
                <div><strong className="text-gray-800">Secure Sharing</strong><p className="text-gray-600">Photos are shared only inside the portal with controlled access.</p></div>
              </li>
            </ul>
          </div>
          <div className="flex-1">
            <img src={imgPhotos} alt="Photo Gallery Mockup" className="rounded-xl shadow-2xl w-full" />
          </div>
        </div>
      </section>

      <section className="sb-editorial-section sb-editorial-section--lavender">
        <div className="sb-container flex flex-col md:flex-row-reverse items-center gap-12">
          <div className="flex-1">
            <h2 className="text-3xl font-bold mb-4" style={{ color: 'var(--navy)' }}>Share Photos from Any Device</h2>
            <p className="text-lg text-gray-600 mb-8">
              A mobile-friendly web experience for teachers and parents. Teachers can upload activity photos from a mobile browser without needing a separate app. Parents can open the portal on their phone, view albums, and stay connected with classroom memories.
            </p>
            <ul className="space-y-3 text-gray-700 font-medium">
              <li className="flex items-center gap-2"><Sparkles className="text-purple-600" size={18} /> Mobile browser photo upload</li>
              <li className="flex items-center gap-2"><Sparkles className="text-purple-600" size={18} /> Parent gallery access on phone</li>
              <li className="flex items-center gap-2"><Sparkles className="text-purple-600" size={18} /> Desktop, tablet, and mobile support</li>
              <li className="flex items-center gap-2"><Sparkles className="text-purple-600" size={18} /> Class and event photo sharing</li>
              <li className="flex items-center gap-2"><Sparkles className="text-purple-600" size={18} /> Simple secure viewing experience</li>
            </ul>
          </div>
          <div className="flex-1 flex justify-center">
            <img src={imgMobileMockup} alt="Mobile Browser Mockup" className="rounded-xl shadow-2xl max-w-sm w-full" />
          </div>
        </div>
      </section>

      <section className="sb-editorial-section sb-editorial-section--white text-center">
        <div className="sb-container">
          <h2 className="text-3xl font-bold mb-4" style={{ color: 'var(--navy)' }}>Everything You Need, All in One Portal</h2>
          <p className="text-lg text-gray-600 mb-12 max-w-2xl mx-auto">
            A complete, secure, and user-friendly platform designed for programs, teachers, and parents to stay connected.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 text-left">
            <div className="bento-card bg-white border border-gray-100 shadow-sm hover:shadow-md transition">
              <ClipboardList className="bento-card-icon text-purple-600 mb-4" />
              <h3 className="bento-card-title text-lg mb-2">Digital Admissions</h3>
              <p className="text-gray-600 text-sm">Online forms, application tracking, and admin review.</p>
            </div>
            <div className="bento-card bg-white border border-gray-100 shadow-sm hover:shadow-md transition">
              <ImageIcon className="bento-card-icon text-purple-600 mb-4" />
              <h3 className="bento-card-title text-lg mb-2">Photo Albums</h3>
              <p className="text-gray-600 text-sm">Class-wise and event-wise galleries for parents.</p>
            </div>
            <div className="bento-card bg-white border border-gray-100 shadow-sm hover:shadow-md transition">
              <CreditCard className="bento-card-icon text-purple-600 mb-4" />
              <h3 className="bento-card-title text-lg mb-2">Fee Management</h3>
              <p className="text-gray-600 text-sm">Track dues, payments, and digital records.</p>
            </div>
            <div className="bento-card bg-white border border-gray-100 shadow-sm hover:shadow-md transition">
              <FileText className="bento-card-icon text-purple-600 mb-4" />
              <h3 className="bento-card-title text-lg mb-2">Document Management</h3>
              <p className="text-gray-600 text-sm">Upload, store, and manage important student documents securely.</p>
            </div>
            <div className="bento-card bg-white border border-gray-100 shadow-sm hover:shadow-md transition">
              <UserCheck className="bento-card-icon text-purple-600 mb-4" />
              <h3 className="bento-card-title text-lg mb-2">Teacher Hub</h3>
              <p className="text-gray-600 text-sm">Teachers can manage assigned classes, students, and classroom photos.</p>
            </div>
            <div className="bento-card bg-white border border-gray-100 shadow-sm hover:shadow-md transition">
              <Users className="bento-card-icon text-purple-600 mb-4" />
              <h3 className="bento-card-title text-lg mb-2">Parent Portal</h3>
              <p className="text-gray-600 text-sm">Parents can view applications, fees, documents, and albums.</p>
            </div>
            <div className="bento-card bg-white border border-gray-100 shadow-sm hover:shadow-md transition">
              <Settings className="bento-card-icon text-purple-600 mb-4" />
              <h3 className="bento-card-title text-lg mb-2">Admin Control Center</h3>
              <p className="text-gray-600 text-sm">Admins can manage students, teachers, albums, forms, fees, and portal settings.</p>
            </div>
            <div className="bento-card bg-white border border-gray-100 shadow-sm hover:shadow-md transition">
              <Smartphone className="bento-card-icon text-purple-600 mb-4" />
              <h3 className="bento-card-title text-lg mb-2">Mobile-Friendly Sharing</h3>
              <p className="text-gray-600 text-sm">Teachers and parents can access the portal from desktop, tablet, or mobile browser.</p>
            </div>
          </div>
        </div>
      </section>
      <PlatformLandingSections />

      <FinalImageCTA
        title="Launch Your Kids Activities Portal"
        subtitle="Manage admissions, fees, documents, photos, classroom updates, and parent communication in one secure platform."
        action={{
          to: '/workspace/new',
          label: <>Create Your Workspace <ArrowRight size={18} /></>,
        }}
      />

      <EditorialFooter compact />
    </PublicLayout>
  );
}
