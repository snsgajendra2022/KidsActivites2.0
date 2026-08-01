import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, Award, Download } from 'lucide-react';
import AppLayout from '../../components/layout/AppLayout.jsx';
import DashboardLayout from '../../components/layout/DashboardLayout.jsx';
import PageTransition from '../../components/ui/PageTransition.jsx';
import { EmptyState, LoadingState, PageHeader } from '../../components/ui/index.jsx';
import Button from '../../components/ui/Button.jsx';
import { useToast } from '../../context/ToastContext.jsx';
import { useTenantPath } from '../../hooks/useTenantPath.js';
import { lmsApi } from '../../services/lmsService.js';

function formatDate(value) {
  if (!value) return '—';
  const d = new Date(String(value).includes(' ') ? String(value).replace(' ', 'T') : value);
  if (Number.isNaN(d.getTime())) return String(value);
  return d.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
}

export default function LmsCertificatesPage({
  layout = 'dashboard',
  backPath = '/admin/lms',
}) {
  const Layout = layout === 'app' ? AppLayout : DashboardLayout;
  const { tenantPath } = useTenantPath();
  const { toast } = useToast();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const data = await lmsApi.listCertificates();
        if (!cancelled) setItems(data.items || []);
      } catch (err) {
        if (!cancelled) toast(err?.message || 'Unable to load certificates.', 'error');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  const preview = async (cert) => {
    try {
      const data = await lmsApi.certificateHtml(cert.id);
      const win = window.open('', '_blank');
      if (!win) {
        toast('Pop-up blocked. Allow pop-ups to preview certificates.', 'error');
        return;
      }
      win.document.write(data.renderedHtml || '<p>Certificate unavailable.</p>');
      win.document.close();
    } catch (err) {
      toast(err?.message || 'Preview failed.', 'error');
    }
  };

  return (
    <Layout>
      <PageTransition>
        <PageHeader
          title="Course Certificates"
          subtitle="Certificates issued when learners complete Digital Classroom courses."
          actions={(
            <Link to={tenantPath(backPath)}>
              <Button variant="secondary"><ArrowLeft size={16} /> Back</Button>
            </Link>
          )}
        />

        {loading ? (
          <LoadingState label="Loading certificates…" />
        ) : items.length === 0 ? (
          <EmptyState
            icon={Award}
            title="No certificates yet"
            description="Certificates appear here after a learner completes all lessons and required quizzes."
          />
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {items.map((cert) => (
              <article
                key={cert.id}
                className="overflow-hidden rounded-2xl border border-[#e4e7ec] bg-white shadow-sm"
              >
                <div className="flex h-24 items-center justify-center bg-gradient-to-br from-[#fff8e6] to-[#f5b400]/40">
                  <Award size={36} className="text-[#0b1b33]" />
                </div>
                <div className="space-y-3 p-4">
                  <div>
                    <p className="text-xs text-[#667085]">{cert.courseTitle}</p>
                    <h3 className="font-semibold text-[#0b1b33]">{cert.learnerName}</h3>
                  </div>
                  <p className="text-xs text-[#667085]">Issued {formatDate(cert.issuedAt)}</p>
                  <p className="font-mono text-xs text-[#98a2b3]">{cert.certificateNumber}</p>
                  <Button className="w-full" variant="secondary" onClick={() => preview(cert)}>
                    <Download size={14} /> Preview / Print
                  </Button>
                </div>
              </article>
            ))}
          </div>
        )}
      </PageTransition>
    </Layout>
  );
}
