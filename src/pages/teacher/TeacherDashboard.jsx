import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { GraduationCap, Image, MessageCircle, Users } from 'lucide-react';
import DashboardLayout from '../../components/layout/DashboardLayout.jsx';
import { PageHeader, StatCard } from '../../components/ui/index.jsx';
import { TEACHER_CLASSES } from '../../data/mockPhotos.js';

export default function TeacherDashboard() {
  return (
    <DashboardLayout>
      <PageHeader title="Teacher Dashboard" subtitle="Manage your classes, students, and parent communication." />

      <div className="stats-grid">
        <StatCard icon={GraduationCap} value={TEACHER_CLASSES.length} label="Assigned Classes" />
        <StatCard icon={Users} value={54} label="Total Students" />
        <StatCard icon={Image} value={12} label="Photos Shared" />
        <StatCard icon={MessageCircle} value={3} label="Unread Messages" />
      </div>

      <div className="section-head" style={{ marginTop: 32 }}>
        <h2 className="section-title">My Classes</h2>
        <Link to="/teacher/classes" style={{ color: 'var(--primary)', fontWeight: 600, fontSize: 14 }}>View All</Link>
      </div>

      <div className="stats-grid">
        {TEACHER_CLASSES.map((cls) => (
          <div key={cls.id} className="card">
            <h3 className="card-title">{cls.name}</h3>
            <p className="text-muted">{cls.studentCount} students</p>
            <div className="btn-group" style={{ marginTop: 12 }}>
              <Link to="/teacher/students"><button className="btn btn-outline btn-sm">Students</button></Link>
              <Link to="/teacher/photos"><button className="btn btn-primary btn-sm">Send Photos</button></Link>
            </div>
          </div>
        ))}
      </div>
    </DashboardLayout>
  );
}
