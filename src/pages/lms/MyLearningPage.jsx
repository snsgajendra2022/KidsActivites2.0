import { useEffect, useState } from 'react';
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
import { useToast } from '../../context/ToastContext.jsx';
import { useTenantPath } from '../../hooks/useTenantPath.js';
import { lmsApi } from '../../services/lmsService.js';

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

export default function MyLearningPage({ layout = 'app', basePath = '/parent/lms' }) {
  const Layout = layout === 'dashboard' ? DashboardLayout : AppLayout;
  const { tenantPath } = useTenantPath();
  const { toast } = useToast();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const data = await lmsApi.myLearning();
        if (!cancelled) setItems(data.items || []);
      } catch (err) {
        if (!cancelled) toast(err?.message || 'Unable to load Digital Classroom.', 'error');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  const openCertificate = async (certificateId) => {
    try {
      const data = await lmsApi.certificateHtml(certificateId);
      const win = window.open('', '_blank');
      if (!win) {
        toast('Pop-up blocked. Allow pop-ups to view the certificate.', 'error');
        return;
      }
      win.document.write(data.renderedHtml || '<p>Certificate unavailable.</p>');
      win.document.close();
    } catch (err) {
      toast(err?.message || 'Unable to open certificate.', 'error');
    }
  };

  return (
    <Layout>
      <PageTransition>
        <PageHeader
          title="Digital Classroom"
          subtitle="Your enrolled courses, progress, and certificates."
          actions={(
            <Link to={tenantPath(`${basePath}/certificates`)}>
              <Button variant="secondary"><Award size={16} /> Certificates</Button>
            </Link>
          )}
        />

        {loading ? (
          <LoadingState label="Loading your classroom…" />
        ) : items.length === 0 ? (
          <EmptyState
            icon={Sparkles}
            title="No courses yet"
            description="When your school enrolls you in a Digital Classroom course, it will appear here."
          />
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {items.map((enrollment) => {
              const pct = enrollment.progressPct || 0;
              const completed = enrollment.status === 'completed' || pct >= 100;
              const resumeLabel = completed ? 'Review' : (pct > 0 ? 'Continue' : 'Start');
              return (
                <article
                  key={enrollment.id}
                  className="overflow-hidden rounded-2xl border border-[#e4e7ec] bg-white shadow-sm"
                >
                  <div className="relative flex h-28 items-center justify-center bg-gradient-to-br from-[#0b1b33] to-[#16365f]">
                    <BookOpen size={34} className="text-[#f5b400]" />
                    {completed && (
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
                    <div className="flex flex-wrap gap-2">
                      <Link to={tenantPath(`${basePath}/${enrollment.id}`)}>
                        <Button size="sm">
                          <Play size={14} /> {resumeLabel}
                        </Button>
                      </Link>
                      {enrollment.certificateId && (
                        <Button
                          size="sm"
                          variant="secondary"
                          onClick={() => openCertificate(enrollment.certificateId)}
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
