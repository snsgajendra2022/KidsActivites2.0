import { useEffect, useState, useMemo } from 'react';
import {
  BarChart3, Download, FileText, IndianRupee, MessageSquare,
} from 'lucide-react';
import DashboardLayout from '../../components/layout/DashboardLayout.jsx';
import { PageHeader } from '../../components/ui/index.jsx';
import Select from '../../components/ui/Select.jsx';
import Button from '../../components/ui/Button.jsx';
import { ResponsiveDataTable } from '../../components/ui/DataTable.jsx';
import { useToast } from '../../context/ToastContext.jsx';
import { useAuth } from '../../context/AuthContext.jsx';
import { getReportsSummary, getReport } from '../../services/reportsService.js';
import { downloadCsv } from '../../utils/csvExport.js';
import '../../styles/admin-modules.css';

const PERIOD_OPTIONS = [
  { value: '7', label: 'Last 7 days' },
  { value: '30', label: 'Last 30 days' },
  { value: '90', label: 'Last 90 days' },
  { value: 'all', label: 'All time' },
];

const TABS = [
  { id: 'applications', label: 'Applications', icon: FileText },
  { id: 'fees', label: 'Fees', icon: IndianRupee },
  { id: 'communications', label: 'Communications', icon: MessageSquare },
];

const REPORT_COLUMNS = {
  applications: [
    { key: 'applicationNo', label: 'Application No.' },
    { key: 'studentName', label: 'Student' },
    { key: 'classApplying', label: 'Class' },
    { key: 'status', label: 'Status' },
    { key: 'submittedAt', label: 'Submitted' },
    { key: 'parentMobile', label: 'Parent Mobile' },
  ],
  fees: [
    { key: 'applicationNo', label: 'Application No.' },
    { key: 'studentName', label: 'Student' },
    { key: 'classApplying', label: 'Class' },
    { key: 'total', label: 'Total (₹)' },
    { key: 'status', label: 'Status' },
    { key: 'transactionId', label: 'Transaction ID' },
    { key: 'receiptNo', label: 'Receipt' },
  ],
  communications: [
    { key: 'type', label: 'Type' },
    { key: 'detail', label: 'Detail' },
    { key: 'className', label: 'Class' },
    { key: 'sentBy', label: 'Sent By' },
    { key: 'sentAt', label: 'Sent At' },
  ],
};

const TABLE_COLUMNS = {
  applications: [
    { label: 'Application No.', primary: true, render: (r) => r.applicationNo },
    { label: 'Student', render: (r) => r.studentName },
    { label: 'Class', render: (r) => r.classApplying },
    { label: 'Status', badge: true, render: (r) => r.status },
    { label: 'Submitted', muted: true, render: (r) => r.submittedAt },
  ],
  fees: [
    { label: 'Application No.', primary: true, render: (r) => r.applicationNo },
    { label: 'Student', render: (r) => r.studentName },
    { label: 'Total', render: (r) => `₹${r.total?.toLocaleString()}` },
    { label: 'Status', badge: true, render: (r) => r.status },
    { label: 'Receipt', muted: true, render: (r) => r.receiptNo },
  ],
  communications: [
    { label: 'Type', primary: true, render: (r) => r.type },
    { label: 'Detail', render: (r) => r.detail },
    { label: 'Class', render: (r) => r.className },
    { label: 'Sent By', render: (r) => r.sentBy },
    { label: 'Sent At', muted: true, render: (r) => r.sentAt },
  ],
};

function StatCard({ icon: Icon, label, value, variant = 'indigo' }) {
  return (
    <div className={`admin-stat-card admin-stat-card--${variant}`}>
      <div className="admin-stat-card__icon"><Icon size={18} /></div>
      <div>
        <p className="admin-stat-card__value">{value}</p>
        <p className="admin-stat-card__label">{label}</p>
      </div>
    </div>
  );
}

export default function AdminReports() {
  const { isDemoSession } = useAuth();
  const { toast } = useToast();
  const [period, setPeriod] = useState('30');
  const [tab, setTab] = useState('applications');
  const [summary, setSummary] = useState(null);
  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    try {
      const [sum, data] = await Promise.all([
        getReportsSummary(period),
        getReport(tab, period),
      ]);
      setSummary(sum);
      setReport(data);
    } catch {
      toast('Failed to load reports. Check that you are signed in and the API is running.', 'error');
      setSummary(null);
      setReport(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, [period, tab]);

  const statCards = useMemo(() => {
    if (!summary) return [];
    if (tab === 'applications') {
      return [
        { icon: FileText, label: 'Total Applications', value: summary.applications?.total ?? 0, variant: 'indigo' },
        { icon: BarChart3, label: 'Pending Review', value: summary.applications?.underReview ?? 0, variant: 'amber' },
        { icon: FileText, label: 'In Progress', value: summary.applications?.approved ?? 0, variant: 'emerald' },
        { icon: FileText, label: 'Rejected', value: summary.applications?.rejected ?? 0, variant: 'rose' },
      ];
    }
    if (tab === 'fees') {
      return [
        { icon: IndianRupee, label: 'Fee Records', value: summary.fees?.totalRecords ?? 0, variant: 'indigo' },
        { icon: IndianRupee, label: 'Collected', value: `₹${(summary.fees?.collected ?? 0).toLocaleString()}`, variant: 'emerald' },
        { icon: IndianRupee, label: 'Pending', value: `₹${(summary.fees?.pending ?? 0).toLocaleString()}`, variant: 'amber' },
        { icon: IndianRupee, label: 'Verified', value: summary.fees?.verified ?? 0, variant: 'sky' },
      ];
    }
    return [
      { icon: MessageSquare, label: 'Photos Shared', value: summary.communications?.photosShared ?? 0, variant: 'indigo' },
      { icon: MessageSquare, label: 'Notifications', value: summary.communications?.notificationsSent ?? 0, variant: 'amber' },
      { icon: MessageSquare, label: 'Classes Reached', value: summary.communications?.classesReached ?? 0, variant: 'emerald' },
    ];
  }, [summary, tab]);

  const handleExport = () => {
    if (!report?.rows?.length) {
      toast('No data to export for this period.', 'warning');
      return;
    }
    downloadCsv(
      `kidsactivites-${tab}-report.csv`,
      report.rows,
      REPORT_COLUMNS[tab],
    );
    toast('Report exported as CSV.', 'success');
  };

  return (
    <DashboardLayout>
      <PageHeader
        title="Reports"
        subtitle="Application, fee, and communication reports."
        actions={(
          <div className="admin-reports-toolbar">
            {isDemoSession && <span className="admin-demo-badge">Demo data</span>}
            <Select
              value={period}
              onChange={(e) => setPeriod(e.target.value)}
              options={PERIOD_OPTIONS}
              className="admin-reports-period"
            />
            <Button variant="outline" onClick={handleExport}>
              <Download size={16} />
              Export CSV
            </Button>
          </div>
        )}
      />

      <div className="admin-modules-tabs">
        {TABS.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            type="button"
            className={`admin-modules-tab ${tab === id ? 'active' : ''}`}
            onClick={() => setTab(id)}
          >
            <Icon size={16} />
            {label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="admin-modules-loading" />
      ) : (
        <>
          <div className="admin-stat-grid">
            {statCards.map((card) => (
              <StatCard key={card.label} {...card} />
            ))}
          </div>

          <section className="sb-card admin-modules-panel admin-modules-panel--flush">
            <div className="admin-modules-panel__head">
              <h3 className="admin-modules-panel__title">
                {TABS.find((t) => t.id === tab)?.label} Report
              </h3>
              <p className="admin-modules-panel__subtitle">
                {report?.rows?.length ?? 0} record{(report?.rows?.length ?? 0) !== 1 ? 's' : ''} in selected period
              </p>
            </div>
            <ResponsiveDataTable
              nested
              columns={TABLE_COLUMNS[tab]}
              data={report?.rows || []}
              keyExtractor={(row, i) => `${row.applicationNo || row.type}-${i}`}
              minWidth={720}
              emptyMessage="No records found for this period."
            />
          </section>
        </>
      )}
    </DashboardLayout>
  );
}
