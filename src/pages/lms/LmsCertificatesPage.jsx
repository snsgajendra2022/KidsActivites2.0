import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, Award, Download, Eye, Settings2 } from 'lucide-react';
import AppLayout from '../../components/layout/AppLayout.jsx';
import DashboardLayout from '../../components/layout/DashboardLayout.jsx';
import PageTransition from '../../components/ui/PageTransition.jsx';
import { EmptyState, LoadingState, PageHeader } from '../../components/ui/index.jsx';
import Button from '../../components/ui/Button.jsx';
import { useAuth } from '../../context/AuthContext.jsx';
import { useToast } from '../../context/ToastContext.jsx';
import { usePortalConfig } from '../../context/PortalConfigContext.jsx';
import { useTenantPath } from '../../hooks/useTenantPath.js';
import { lmsApi } from '../../services/lmsService.js';
import { getParentChildren, getParentDashboard } from '../../services/parentService.js';
import { mergeCourseCertificateConfig } from '../../data/defaultCourseCertificateConfig.js';
import { getCourseCertificateTemplate } from '../../data/courseCertificateTemplates.js';
import { openLmsCertificatePreview } from '../../utils/courseCertificateHtml.js';
import { displayCertificateFields, hydrateCertificatesWithChildren } from '../../utils/courseCertificateFields.js';
import { enrollmentQuizOutcome } from '../../utils/lmsEnrollmentOutcome.js';
import LmsOutcomeFooter from '../../components/lms/LmsOutcomeFooter.jsx';
import { ROLES } from '../../constants/roles.js';
import '../../styles/lms-learning.css';

function formatDate(value) {
  if (!value) return '—';
  const d = new Date(String(value).includes(' ') ? String(value).replace(' ', 'T') : value);
  if (Number.isNaN(d.getTime())) return String(value);
  return d.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
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
    .map((child) => child.classId || child.assignedClassId || child.student?.classId || child.academic?.classId)
    .filter(Boolean);
  return { studentIds, classIds, children };
}

export default function LmsCertificatesPage({
  layout = 'dashboard',
  backPath = '/admin/lms',
  audience = 'admin',
}) {
  const Layout = layout === 'app' ? AppLayout : DashboardLayout;
  const { user } = useAuth();
  const { tenantPath } = useTenantPath();
  const { toast } = useToast();
  const { config, portalName, school, branding } = usePortalConfig();
  const [items, setItems] = useState([]);
  const [children, setChildren] = useState([]);
  const [loading, setLoading] = useState(true);
  const [openingId, setOpeningId] = useState(null);

  const isParent = audience === 'parent'
    || user?.role === ROLES.PARENT
    || user?.role === ROLES.STUDENT;
  const canEditTemplate = audience === 'admin'
    && (user?.role === ROLES.SCHOOL_ADMIN || user?.role === ROLES.SUPER_ADMIN);

  const certSettings = useMemo(
    () => mergeCourseCertificateConfig(config?.courseCertificates),
    [config?.courseCertificates],
  );
  const activeTemplate = getCourseCertificateTemplate(certSettings.selectedTemplateId);

  const portalSnapshot = useMemo(
    () => ({
      ...config,
      portalName,
      school: school || config?.school,
      branding: branding || config?.branding,
      courseCertificates: certSettings,
    }),
    [config, portalName, school, branding, certSettings],
  );

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        let params = {};
        let nextChildren = [];
        if (isParent) {
          const ids = await resolveParentChildIds(user);
          nextChildren = ids.children;
          params = { studentIds: ids.studentIds, classIds: ids.classIds };
        }
        const data = await lmsApi.listCertificates(params);
        if (!cancelled) {
          setChildren(nextChildren);
          setItems(hydrateCertificatesWithChildren(data.items || [], nextChildren));
        }
      } catch (err) {
        if (!cancelled) {
          setItems([]);
          toast(err?.message || 'Unable to load certificates.', 'error');
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [toast, user, isParent]);

  const preview = async (cert) => {
    setOpeningId(cert?.id || cert?.certificateNumber || 'open');
    try {
      const certificateId = cert?.id || cert?.certificateId;
      await openLmsCertificatePreview({
        cert,
        certificateId,
        portalConfig: portalSnapshot,
        fetchCertificate: (id) => lmsApi.resolveCertificate(
          id,
          hydrateCertificatesWithChildren([cert], children)[0] || cert,
        ),
        fetchCertificateHtml: (id) => lmsApi.certificateHtml(id),
        onBlocked: () => toast('Pop-up blocked. Allow pop-ups to preview certificates.', 'error'),
        onError: (msg) => toast(msg || 'Preview failed.', 'error'),
      });
    } finally {
      setOpeningId(null);
    }
  };

  const subtitle = isParent
    ? 'Certificates appear only after your child finishes all lessons and passes the required quiz.'
    : 'Issued certificates load from the API and use your Portal Settings template.';

  return (
    <Layout>
      <PageTransition>
        <PageHeader
          title="Course Certificates"
          subtitle={subtitle}
          actions={(
            <div className="flex flex-wrap gap-2">
              {canEditTemplate && (
                <Link to={tenantPath('/admin/portal-settings')}>
                  <Button variant="secondary">
                    <Settings2 size={16} /> Certificate template
                  </Button>
                </Link>
              )}
              <Link to={tenantPath(backPath)}>
                <Button variant="secondary"><ArrowLeft size={16} /> Back</Button>
              </Link>
            </div>
          )}
        />

        <div className="mb-4 flex flex-wrap items-center gap-3 rounded-2xl border border-[#e4e7ec] bg-white px-4 py-3 text-sm text-[#475467]">
          <Award size={18} className="text-[#c9a227]" />
          <span>
            Active template:{' '}
            <strong className="text-[#0b1b33]">{activeTemplate.name}</strong>
            {certSettings.enabled === false ? ' (disabled — using API HTML)' : ''}
          </span>
          <span className="text-[#98a2b3]">·</span>
          <span>School: <strong className="text-[#0b1b33]">{school?.name || portalName || '—'}</strong></span>
        </div>

        {loading ? (
          <LoadingState message="Loading certificates…" />
        ) : items.length === 0 ? (
          <EmptyState
            icon={Award}
            title="No certificates yet"
            description={
              isParent
                ? 'When your child finishes all lessons and passes the required quiz, a certificate appears here. A failing score does not earn a certificate.'
                : 'Certificates appear after a learner finishes all lessons and passes required quizzes, then completes the course. Template design is set in Portal Settings → Course Certificates.'
            }
          />
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {items.map((cert) => {
              const fields = displayCertificateFields(cert);
              const outcome = enrollmentQuizOutcome(cert);
              const cardOutcome = outcome.attempted || outcome.passed != null
                ? outcome
                : {
                    attempted: true,
                    passed: true,
                    technical: 'PASS',
                    headline: 'Great Job!',
                    percentage: outcome.percentage,
                  };
              const busy = openingId === (cert.id || cert.certificateNumber);
              return (
                <article
                  key={cert.id || cert.certificateNumber}
                  className="overflow-hidden rounded-2xl border border-[#e4e7ec] bg-white shadow-sm"
                >
                  <div
                    className="relative flex h-28 flex-col items-center justify-center px-4 text-center"
                    style={{
                      background: `linear-gradient(145deg, ${activeTemplate.paper}, color-mix(in srgb, ${activeTemplate.accent} 28%, ${activeTemplate.paper}))`,
                      color: activeTemplate.ink,
                    }}
                  >
                    <p
                      className="text-[10px] font-bold uppercase tracking-[0.18em]"
                      style={{ color: activeTemplate.accent }}
                    >
                      {activeTemplate.name}
                    </p>
                    <p className="mt-1 line-clamp-2 text-sm font-semibold">
                      {fields.studentName || 'Certificate'}
                    </p>
                    <p className="mt-0.5 line-clamp-1 text-xs opacity-75">{fields.courseName}</p>
                  </div>
                  <div className="space-y-3 p-4">
                    <div>
                      <p className="text-xs text-[#667085]">{fields.courseName}</p>
                      <h3 className="font-semibold text-[#0b1b33]">{fields.studentName}</h3>
                    </div>
                    <p className="text-xs text-[#667085]">Issued {formatDate(fields.issuedAt)}</p>
                    {fields.certificateNumber ? (
                      <p className="font-mono text-xs text-[#98a2b3]">{fields.certificateNumber}</p>
                    ) : null}
                    <LmsOutcomeFooter outcome={cardOutcome} />
                    <Button
                      className="w-full"
                      variant="secondary"
                      disabled={Boolean(busy)}
                      onClick={() => preview(cert)}
                    >
                      <Eye size={14} /> {busy ? 'Opening…' : 'Preview / Print'}
                    </Button>
                    <Button
                      className="w-full"
                      disabled={Boolean(busy)}
                      onClick={() => preview(cert)}
                    >
                      <Download size={14} /> Open &amp; download
                    </Button>
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
