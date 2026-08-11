import { Bus, Smartphone } from 'lucide-react';
import AppLayout from '../../components/layout/AppLayout.jsx';
import PageTransition from '../../components/ui/PageTransition.jsx';
import { PageHeader } from '../../components/ui/index.jsx';
import { useAuth } from '../../context/AuthContext.jsx';

/**
 * Drivers start trips and publish GPS from the mobile app.
 * This web landing page avoids a blank redirect after login.
 */
export default function DriverTripGuidePage() {
  const { user } = useAuth();

  return (
    <AppLayout>
      <PageTransition>
        <PageHeader
          title="Driver trip"
          subtitle="Live GPS sharing runs on the Kids Activities mobile app."
        />

        <section className="sb-card mx-auto max-w-xl p-6">
          <div className="flex items-start gap-3">
            <span className="rounded-xl bg-[#eef4ff] p-3 text-[#0058be]">
              <Smartphone size={22} />
            </span>
            <div>
              <h2 className="text-lg font-bold text-[#0b1c30]">Open the mobile driver trip screen</h2>
              <p className="mt-2 text-sm text-[#475467]">
                {user?.name ? `Hi ${user.name}. ` : ''}
                Sign in on your phone with this driver account, open <strong>My trip</strong>, start
                the morning or evening run, and keep location sharing on while the trip is active.
              </p>
            </div>
          </div>

          <ul className="mt-5 space-y-2 text-sm text-[#344054]">
            <li className="flex gap-2">
              <Bus size={16} className="mt-0.5 shrink-0 text-[#0058be]" />
              School admins assign your vehicle under Transport → Drivers.
            </li>
            <li className="flex gap-2">
              <Bus size={16} className="mt-0.5 shrink-0 text-[#0058be]" />
              Parents and admins see the bus on Live Tracking once GPS updates arrive.
            </li>
            <li className="flex gap-2">
              <Bus size={16} className="mt-0.5 shrink-0 text-[#0058be]" />
              Complete the trip on mobile when the run finishes so the map shows completed.
            </li>
          </ul>
        </section>
      </PageTransition>
    </AppLayout>
  );
}
