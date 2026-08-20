import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { GraduationCap, Image, MessageCircle, Users, Send, ArrowRight, BookOpen, ClipboardCheck, FileText } from 'lucide-react';
import AppLayout from '../../components/layout/AppLayout.jsx';
import PageTransition from '../../components/ui/PageTransition.jsx';
import BentoStatCard from '../../components/dashboard/BentoStatCard.jsx';
import WelcomeBanner from '../../components/dashboard/WelcomeBanner.jsx';
import { useAuth } from '../../context/AuthContext.jsx';
import { useTenantPath } from '../../hooks/useTenantPath.js';
import { getTeacherClasses, getTeacherStats } from '../../services/teacherService.js';
import UpcomingEventsWidget from '../../components/calendar/UpcomingEventsWidget.jsx';

export default function TeacherDashboard() {
  const { user } = useAuth();
  const { tenantPath } = useTenantPath();
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
          <p className="premium-page-subtitle">Welcome, {user?.name}. Manage attendance, homework, marks, and parent communication.</p>
        </div>

        <div className="bento-grid">
          <WelcomeBanner
            title="Your Classroom Hub"
            subtitle="Take attendance, upload homework, enter marks, share notes, and keep parents connected."
            actions={
              <>
                <Link to={tenantPath('/teacher/attendance')} className="premium-btn premium-btn-white premium-btn-sm"><ClipboardCheck size={16} /> Take Attendance</Link>
                <Link to={tenantPath('/teacher/homework')} className="premium-btn premium-btn-white premium-btn-sm"><BookOpen size={16} /> Homework</Link>
                <Link to={tenantPath('/teacher/messages')} className="premium-btn premium-btn-white premium-btn-sm">Messages</Link>
              </>
            }
          />

          <div className="bento-span-3"><BentoStatCard icon={GraduationCap} value={stats?.classCount ?? classes.length} label="Assigned Classes" variant="indigo" /></div>
          <div className="bento-span-3"><BentoStatCard icon={Users} value={stats?.totalStudents ?? '—'} label="Total Students" variant="emerald" /></div>
          <div className="bento-span-3"><BentoStatCard icon={Image} value={stats?.photosShared ?? '—'} label="Photos Shared" variant="sky" /></div>
          <div className="bento-span-3"><BentoStatCard icon={MessageCircle} value={stats?.unreadMessages ?? '—'} label="Unread Messages" variant="amber" /></div>

          <div className="bento-span-12">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <h3 className="card-title" style={{ margin: 0 }}>Daily Tools</h3>
            </div>
            <div className="parent-dashboard-quicklinks">
              {[
                { to: '/teacher/attendance', label: 'Attendance', icon: ClipboardCheck },
                { to: '/teacher/homework', label: 'Homework', icon: BookOpen },
                { to: '/teacher/marks', label: 'Enter Marks', icon: FileText },
                { to: '/teacher/notes', label: 'Notes', icon: FileText },
                { to: '/teacher/lms', label: 'Digital Classroom', icon: Send },
                { to: '/teacher/timetable', label: 'Timetable', icon: GraduationCap },
                { to: '/teacher/photos', label: 'Photos', icon: Image },
                { to: '/teacher/messages', label: 'Parents', icon: MessageCircle },
              ].map(({ to, label, icon: Icon }) => (
                <Link key={to} to={tenantPath(to)} className="parent-dashboard-quicklink">
                  <span className="parent-dashboard-quicklink__icon" aria-hidden>
                    <Icon size={20} />
                  </span>
                  <span className="parent-dashboard-quicklink__label">{label}</span>
                </Link>
              ))}
            </div>
          </div>

          <div className="bento-span-12">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <h3 className="card-title" style={{ margin: 0 }}>My Classes</h3>
              <Link to={tenantPath('/teacher/classes')} className="premium-btn premium-btn-secondary premium-btn-sm">View All Classes</Link>
            </div>
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
                      <Link to={tenantPath('/teacher/students')} className="premium-btn premium-btn-secondary premium-btn-sm">Students</Link>
                      <Link to={tenantPath('/teacher/attendance')} className="premium-btn premium-btn-primary premium-btn-sm">Attendance <ArrowRight size={14} /></Link>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="bento-span-12">
            <UpcomingEventsWidget
              role={user?.role}
              userId={user?.id}
              classIds={classes.map((item) => item.id || item.classId).filter(Boolean)}
              calendarPath="/teacher/calendar"
              title="Today and upcoming"
            />
          </div>
        </div>
      </PageTransition>
    </AppLayout>
  );
}
