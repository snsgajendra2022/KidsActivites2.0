import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Building2, GraduationCap, ArrowRight, Users, Send, Tv } from 'lucide-react';
import AppLayout from '../../components/layout/AppLayout.jsx';
import PageTransition from '../../components/ui/PageTransition.jsx';
import { PageHeader } from '../../components/ui/index.jsx';
import { EmptyState } from '../../components/ui/index.jsx';
import { useAuth } from '../../context/AuthContext.jsx';
import { useTenantPath } from '../../hooks/useTenantPath.js';
import { getTeacherClasses } from '../../services/teacherService.js';
import '../../styles/teacher-classes.css';

export default function TeacherClasses() {
  const { user } = useAuth();
  const { tenantPath } = useTenantPath();
  const [classes, setClasses] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user?.id) return;
    setLoading(true);
    getTeacherClasses(user.id)
      .then(setClasses)
      .finally(() => setLoading(false));
  }, [user?.id]);

  return (
    <AppLayout>
      <PageTransition>
        <PageHeader
          title="My Classes"
          subtitle="View your assigned classes, student counts, and quick actions."
        />

        {loading ? (
          <p className="text-sm text-[#45474c]">Loading classes…</p>
        ) : classes.length === 0 ? (
          <EmptyState
            icon={GraduationCap}
            title="No Classes Assigned"
            description="Contact your school admin if you believe this is an error."
          />
        ) : (
          <div className="teacher-classes-grid">
            {classes.map((cls) => (
              <article key={cls.id} className="teacher-class-card">
                <div className="teacher-class-card__head">
                  <div className="teacher-class-card__icon">
                    <GraduationCap size={22} />
                  </div>
                  <div>
                    <h2 className="teacher-class-card__title">{cls.name}</h2>
                    <p className="teacher-class-card__meta">
                      Grade {cls.grade} · Section {cls.section}
                    </p>
                  </div>
                </div>

                <div className="teacher-class-card__stats">
                  <span className="teacher-class-card__stat">
                    <Users size={14} />
                    {cls.studentCount} students
                  </span>
                  <span className="teacher-class-card__stat">
                    <Building2 size={14} />
                    {cls.id}
                  </span>
                </div>

                <div className="teacher-class-card__actions">
                  <Link
                    to={`${tenantPath('/teacher/students')}?class=${encodeURIComponent(cls.id)}`}
                    className="premium-btn premium-btn-secondary premium-btn-sm"
                  >
                    View Students
                  </Link>
                  <Link
                    to={`${tenantPath('/teacher/class-album')}?class=${encodeURIComponent(cls.id)}`}
                    className="premium-btn premium-btn-secondary premium-btn-sm"
                  >
                    Class Album <Tv size={14} />
                  </Link>
                  <Link
                    to={`${tenantPath('/teacher/photos')}?class=${encodeURIComponent(cls.id)}`}
                    className="premium-btn premium-btn-primary premium-btn-sm"
                  >
                    Send Photos <ArrowRight size={14} />
                  </Link>
                </div>
              </article>
            ))}
          </div>
        )}

        <div className="teacher-classes-quick">
          <h2 className="teacher-classes-quick__title">Quick links</h2>
          <div className="teacher-classes-quick__grid">
            <Link to={tenantPath('/teacher/class-album')} className="teacher-classes-quick__card">
              <span className="teacher-classes-quick__icon" aria-hidden>
                <Tv size={20} />
              </span>
              <span className="teacher-classes-quick__text">
                <strong>Browse your class album uploads</strong>
                <span>View and manage TV playback media</span>
              </span>
              <ArrowRight size={16} className="teacher-classes-quick__arrow" aria-hidden />
            </Link>
            <Link to={tenantPath('/teacher/photos')} className="teacher-classes-quick__card">
              <span className="teacher-classes-quick__icon" aria-hidden>
                <Send size={20} />
              </span>
              <span className="teacher-classes-quick__text">
                <strong>Share classroom photos with parents</strong>
                <span>Upload photos and videos for families</span>
              </span>
              <ArrowRight size={16} className="teacher-classes-quick__arrow" aria-hidden />
            </Link>
          </div>
        </div>
      </PageTransition>
    </AppLayout>
  );
}
