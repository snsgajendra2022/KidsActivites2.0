import { useEffect, useState } from 'react';
import {
  IndianRupee, TrendingUp, Users, Wallet, UserCheck, LineChart,
} from 'lucide-react';
import DashboardLayout from '../../components/layout/DashboardLayout.jsx';
import PageTransition from '../../components/ui/PageTransition.jsx';
import { LoadingState, PageHeader } from '../../components/ui/index.jsx';
import BentoStatCard from '../../components/dashboard/BentoStatCard.jsx';
import { getAccountingDashboard } from '../../services/schoolModules/index.js';
import { useToast } from '../../context/ToastContext.jsx';

export default function AccountingDashboardPage() {
  const { toast } = useToast();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getAccountingDashboard()
      .then(setData)
      .catch((err) => toast(err?.message || 'Unable to load accounting dashboard.', 'error'))
      .finally(() => setLoading(false));
  }, [toast]);

  return (
    <DashboardLayout>
      <PageTransition>
        <PageHeader
          title="School Accounting Dashboard"
          subtitle="Students, fee collection, pending dues, expenses, and admission growth."
        />
        {loading ? (
          <LoadingState message="Loading accounting metrics…" />
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            <BentoStatCard icon={Users} value={data?.totalStudents ?? '—'} label="Total Students" variant="indigo" />
            <BentoStatCard icon={IndianRupee} value={`₹${Number(data?.monthlyFeeCollection || 0).toLocaleString('en-IN')}`} label="Monthly Fee Collection" variant="emerald" />
            <BentoStatCard icon={Wallet} value={`₹${Number(data?.pendingFees || 0).toLocaleString('en-IN')}`} label="Pending Fees" variant="amber" />
            <BentoStatCard icon={TrendingUp} value={`₹${Number(data?.expenses || 0).toLocaleString('en-IN')}`} label="Expenses" variant="rose" />
            <BentoStatCard icon={UserCheck} value={`${data?.teacherAttendance ?? '—'}%`} label="Teacher Attendance" variant="sky" />
            <BentoStatCard icon={LineChart} value={`${data?.admissionGrowth ?? '—'}%`} label="Admission Growth" variant="indigo" />
          </div>
        )}
      </PageTransition>
    </DashboardLayout>
  );
}
