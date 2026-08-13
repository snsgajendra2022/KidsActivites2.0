import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Award, BookOpen, CheckCircle2, Play, Sparkles, Download,
} from 'lucide-react';
import AppLayout from '../../components/layout/AppLayout.jsx';
import DashboardLayout from '../../components/layout/DashboardLayout.jsx';
import PageTransition from '../../components/ui/PageTransition.jsx';
import { EmptyState, LoadingState, PageHeader } from '../../components/ui/index.jsx';
import Button from '../../components/ui/Button.jsx';
import StatusBadge from '../../components/ui/StatusBadge.jsx';
import { useAuth } from '../../context/AuthContext.jsx';
import { useToast } from '../../context/ToastContext.jsx';
import { usePortalConfig } from '../../context/PortalConfigContext.jsx';
import { useTenantPath } from '../../hooks/useTenantPath.js';
import { lmsApi } from '../../services/lmsService.js';
import { getParentChildren, getParentDashboard } from '../../services/parentService.js';
import { mergeCourseCertificateConfig } from '../../data/defaultCourseCertificateConfig.js';
import { openLmsCertificatePreview } from '../../utils/courseCertificateHtml.js';
import { mergeCertificateRecords } from '../../utils/courseCertificateFields.js';
import {
  enrollmentQuizOutcome,
  hasEarnedCertificate,
} from '../../utils/lmsEnrollmentOutcome.js';
import LmsOutcomeFooter from '../../components/lms/LmsOutcomeFooter.jsx';
import '../../styles/lms-learning.css';

function ProgressRing({ pct, size = 48, stroke = 4 }) {
  const r = (size - stroke) / 2;
  const circ = 2 * Math.PI * r;
  const dash = (Math.max(0, Math.min(100, pct)) / 100) * circ;
  return (
    <svg width={size} height={size} className="-rotate-90">
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="#e4e7ec" strokeWidth={stroke} />
      <circle
        cx={size / 2}
        cy={size / 2}
        r={r}
        fill="none"
        stroke={pct >= 100 ? '#12b76a' : '#f5b400'}
        strokeWidth={stroke}
        strokeDasharray={`${dash} ${circ - dash}`}
        strokeLinecap="round"
      />
    </svg>
  );
}

async function resolveParentChildIds(user) {
  let children = [];
  try {
    const dashboard = await getParentDashboard(user?.id, user?.schoolId, user);
    children = dashboard.children || [];
  } catch {
    try {
      children = await getParentChildren(user);
    } catch {
      children = [];
    }
  }
  const studentIds = children
    .map((child) => child.studentId || child.enrolledStudentId || child.student?.id)
    .filter(Boolean);
  const classIds = children
    .map((child) => child.classId || child.assignedClassId || child.student?.classId)
    .filter(Boolean);
  return { studentIds, classIds };
}

export default function MyLearningPage({ layout = 'app', basePath = '/parent/lms' }) {
  const Layout = layout === 'dashboard' ? DashboardLayout : AppLayout;
  const { user } = useAuth();
  const { tenantPath } = useTenantPath();
  const { toast } = useToast();
  const { config, portalName, school, branding } = usePortalConfig();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState('continue');

  const portalSnapshot = useMemo(
    () => ({
      ...config,
      portalName,
      school: school || config?.school,
      branding: branding || config?.branding,
      courseCertificates: mergeCourseCertificateConfig(config?.courseCertificates),
    }),
    [config, portalName, school, branding],
  );

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const { studentIds, classIds } = await resolveParentChildIds(user);
        const data = await lmsApi.myLearning({ studentIds, classIds });
        if (!cancelled) setItems(data.items || []);
      } catch (err) {
        if (!cancelled) {
          setItems([]);
          toast(err?.message || 'Unable to load Digital Classroom.', 'error');
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [user?.id, user?.schoolId, toast]);

  const openCertificate = async (item) => {
    if (!hasEarnedCertificate(item)) return;
    try {
      const cert = mergeCertificateRecords(item, item?.certificate, {
        id: item.certificateId || item.certificate?.id || item.id,
        learnerName: item.learnerName || item.studentName,
        courseTitle: item.courseTitle || item.title,
        issuedAt: item.issuedAt || item.certificate?.issuedAt || item.completedAt,
        certificateNumber: item.certificateNumber || item.certificate?.certificateNumber,
      });
      await openLmsCertificatePreview({
        cert,
        certificateId: cert.id,
        portalConfig: portalSnapshot,
        fetchCertificate: (id) => lmsApi.resolveCertificate(id, cert),
        fetchCertificateHtml: (id) => lmsApi.certificateHtml(id),
        onBlocked: () => toast('Pop-up blocked. Allow pop-ups to view the certificate.', 'error'),
        onError: (msg) => toast(msg || 'Unable to open certificate.', 'error'),
      });
    } catch (err) {
      toast(err?.message || 'Unable to open certificate.', 'error');
    }
  };

  const isCompleted = (enrollment) => {
    const outcome = enrollmentQuizOutcome(enrollment);
    if (enrollment.status === 'completed') return true;
    if (outcome.attempted && outcome.passed === false) return false;
    return Number(enrollment.progressPct || 0) >= 100;
  };

  const continueItems = items.filter((item) => !isCompleted(item));
  const completedItems = items.filter((item) => isCompleted(item));
  const visible = tab === 'continue' ? continueItems : tab === 'completed' ? completedItems : items;

  return (
    <Layout>
      <PageTransition>
        <PageHeader
          title="My Learning"
          subtitle="Courses enrolled for your children (by class or student)."
          actions={(
            <Link to={tenantPath(`${basePath}/certificates`)}>
              <Button variant="secondary"><Award size={16} /> Certificates</Button>
            </Link>
          )}
        />

        <div className="lms-tabs">
          <button type="button" className={`lms-tab ${tab === 'continue' ? 'is-active' : ''}`} onClick={() => setTab('continue')}>
            Continue ({continueItems.length})
          </button>
          <button type="button" className={`lms-tab ${tab === 'completed' ? 'is-active' : ''}`} onClick={() => setTab('completed')}>
            Completed ({completedItems.length})
          </button>
          <button type="button" className={`lms-tab ${tab === 'all' ? 'is-active' : ''}`} onClick={() => setTab('all')}>
            All ({items.length})
          </button>
        </div>

        {loading ? (
          <LoadingState message="Loading your classroom…" />
        ) : items.length === 0 ? (
          <EmptyState
            icon={Sparkles}
            title="No courses yet"
            description="After the school enrolls your child’s class (or student) in a published Digital Classroom course, it will show here."
          />
        ) : visible.length === 0 ? (
          <EmptyState
            icon={tab === 'completed' ? Award : Play}
            title={tab === 'completed' ? 'No completed courses yet' : 'You are all caught up'}
            description={tab === 'completed'
              ? 'Finish lessons and pass the required quiz to earn a certificate.'
              : 'Every enrolled course is complete. Review them from Completed or Certificates.'}
          />
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {visible.map((enrollment) => {
              const pct = enrollment.progressPct || 0;
              const completed = isCompleted(enrollment);
              const outcome = enrollmentQuizOutcome(enrollment);
              const earned = hasEarnedCertificate(enrollment);
              const resumeLabel = completed && outcome.passed !== false
                ? 'Review'
                : (pct > 0 ? 'Continue' : 'Start');
              return (
                <article key={enrollment.id} className="lms-card-kid">
                  <div className="lms-card-kid__banner">
                    <BookOpen size={34} className="text-[#f5b400]" />
                    {completed && outcome.passed !== false && (
                      <div className="absolute inset-0 flex items-center justify-center bg-[#12b76a]/20">
                        <CheckCircle2 size={34} className="text-[#027a48]" />
                      </div>
                    )}
                  </div>
                  <div className="space-y-3 p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <h3 className="font-semibold text-[#0b1b33]">
                          {enrollment.courseTitle || enrollment.course?.title || 'Course'}
                        </h3>
                        <p className="text-xs text-[#667085]">
                          {enrollment.learnerName || enrollment.studentName || 'Learner'}
                          {enrollment.subject ? ` · ${enrollment.subject}` : ''}
                        </p>
                      </div>
                      <div className="relative flex items-center justify-center">
                        <ProgressRing pct={pct} />
                        <span className="absolute text-[10px] font-bold text-[#0b1b33]">{pct}%</span>
                      </div>
                    </div>
                    <StatusBadge status={enrollment.status} />
                    {outcome.attempted ? (
                      <LmsOutcomeFooter outcome={outcome} />
                    ) : earned ? (
                      <LmsOutcomeFooter outcome={{ attempted: true, passed: true, technical: 'PASS', headline: 'Great Job!', percentage: outcome.percentage }} />
                    ) : null}
                    <div className="flex flex-wrap gap-2">
                      <Link to={tenantPath(`${basePath}/${enrollment.id}`)}>
                        <Button size="sm" className="lms-btn-lg">
                          <Play size={14} /> {resumeLabel}
                        </Button>
                      </Link>
                      {earned && (
                        <Button
                          size="sm"
                          variant="secondary"
                          onClick={() => openCertificate(enrollment)}
                        >
                          <Download size={14} /> Certificate
                        </Button>
                      )}
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </PageTransition>
    </Layout>
  );
}
