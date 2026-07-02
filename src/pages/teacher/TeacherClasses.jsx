import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Building2, GraduationCap, ArrowRight, Users, Send } from 'lucide-react';
import AppLayout from '../../components/layout/AppLayout.jsx';
import PageTransition from '../../components/ui/PageTransition.jsx';
import { PageHeader } from '../../components/ui/index.jsx';
import { EmptyState } from '../../components/ui/index.jsx';
import { useAuth } from '../../context/AuthContext.jsx';
import { getTeacherClasses } from '../../services/teacherService.js';
import '../../styles/teacher-classes.css';

export default function TeacherClasses() {
  const { user } = useAuth();
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
                    to={`/teacher/students?class=${cls.id}`}
                    className="premium-btn premium-btn-secondary premium-btn-sm"
                  >
                    View Students
                  </Link>
                  <Link
                    to="/teacher/photos"
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
          <Link to="/teacher/photos" className="teacher-classes-quick__link">
            <Send size={18} />
            Share classroom photos with parents
          </Link>
        </div>
      </PageTransition>
    </AppLayout>
  );
}
