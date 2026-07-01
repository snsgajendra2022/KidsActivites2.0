import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { GraduationCap, Image, MessageCircle, Users, Send, ArrowRight } from 'lucide-react';
import AppLayout from '../../components/layout/AppLayout.jsx';
import PageTransition from '../../components/ui/PageTransition.jsx';
import BentoStatCard from '../../components/dashboard/BentoStatCard.jsx';
import { WelcomeBanner } from '../../components/dashboard/ChartCards.jsx';
import { useAuth } from '../../context/AuthContext.jsx';
import { getTeacherClasses, getTeacherStats } from '../../services/teacherService.js';

export default function TeacherDashboard() {
  const { user } = useAuth();
  const [classes, setClasses] = useState([]);
  const [stats, setStats] = useState(null);

  useEffect(() => {
    if (!user?.id) return;
    getTeacherClasses(user.id).then(setClasses);
    getTeacherStats(user.id).then(setStats);
  }, [user?.id]);

  return (
    <AppLayout>
      <PageTransition>
        <div className="premium-page-header">
          <h1 className="premium-page-title">Teacher Dashboard</h1>
          <p className="premium-page-subtitle">Welcome, {user?.name}. Manage your classes and parent communication.</p>
        </div>

        <div className="bento-grid">
          <WelcomeBanner
            title="Your Classroom Hub"
            subtitle="Share photos, send messages, and keep parents connected with classroom updates."
            actions={
              <>
                <Link to="/teacher/photos" className="premium-btn premium-btn-white premium-btn-sm"><Send size={16} /> Send Photos</Link>
                <Link to="/teacher/messages" className="premium-btn premium-btn-white premium-btn-sm">View Messages</Link>
              </>
            }
          />

          <div className="bento-span-3"><BentoStatCard icon={GraduationCap} value={stats?.classCount ?? classes.length} label="Assigned Classes" variant="indigo" /></div>
          <div className="bento-span-3"><BentoStatCard icon={Users} value={stats?.totalStudents ?? '—'} label="Total Students" variant="emerald" /></div>
          <div className="bento-span-3"><BentoStatCard icon={Image} value={stats?.photosShared ?? '—'} label="Photos Shared" variant="sky" /></div>
          <div className="bento-span-3"><BentoStatCard icon={MessageCircle} value={stats?.unreadMessages ?? '—'} label="Unread Messages" variant="amber" /></div>

          <div className="bento-span-12">
            <h3 className="card-title" style={{ marginBottom: 16 }}>My Classes</h3>
            <div className="bento-grid" style={{ gap: 16 }}>
              {classes.map((cls) => (
                <div key={cls.id} className="bento-span-6">
                  <div className="premium-card">
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                      <div>
                        <h4 style={{ margin: '0 0 4px', fontSize: 18, fontWeight: 700, color: 'var(--navy)' }}>{cls.name}</h4>
                        <p className="text-muted" style={{ margin: 0, fontSize: 13 }}>{cls.studentCount} students · Grade {cls.grade}</p>
                      </div>
                      <div className="premium-feature-icon" style={{ width: 40, height: 40, margin: 0 }}><GraduationCap size={20} /></div>
                    </div>
                    <div style={{ display: 'flex', gap: 8, marginTop: 20 }}>
                      <Link to="/teacher/students" className="premium-btn premium-btn-secondary premium-btn-sm">Students</Link>
                      <Link to="/teacher/photos" className="premium-btn premium-btn-primary premium-btn-sm">Send Photos <ArrowRight size={14} /></Link>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </PageTransition>
    </AppLayout>
  );
}
