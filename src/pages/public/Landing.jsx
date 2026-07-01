import { useState } from 'react';
import { Link } from 'react-router-dom';
import { GraduationCap, FileCheck, CreditCard, Users, Shield, ArrowRight } from 'lucide-react';
import { SCHOOL } from '../data/mockSchool.js';
import Button from '../components/ui/Button.jsx';

export default function Landing() {
  return (
    <div>
      <nav className="landing-nav">
        <div className="sidebar-brand">
          <span className="sidebar-brand-icon">SB</span>
          <span style={{ fontWeight: 700, fontSize: 18, color: 'var(--navy)' }}>SchoolBridge</span>
        </div>
        <div className="btn-group">
          <Link to="/login"><Button variant="outline">Login</Button></Link>
          <Link to="/enroll"><Button variant="primary">Apply Now</Button></Link>
        </div>
      </nav>

      <section className="landing-hero">
        <div className="landing-badge"><GraduationCap size={16} /> Admissions Open — {SCHOOL.academicYear}</div>
        <h1>{SCHOOL.name}</h1>
        <p>Complete your child&apos;s enrollment online. Submit documents, pay fees, and track admission status — all in one secure platform.</p>
        <Link to="/enroll"><Button variant="primary" className="btn-lg">Start Enrollment <ArrowRight size={18} /></Button></Link>
      </section>

      <section className="landing-section">
        <h2>Why Choose Us</h2>
        <p>A trusted platform for seamless school admissions and parent communication.</p>
        <div className="process-steps">
          {[
            { icon: Shield, title: 'Secure Process', desc: 'Your data is protected with role-based access and encrypted storage.' },
            { icon: FileCheck, title: 'Easy Documentation', desc: 'Upload required documents online with real-time status tracking.' },
            { icon: CreditCard, title: 'Transparent Fees', desc: 'Clear fee breakdown with receipt generation after verification.' },
            { icon: Users, title: 'Stay Connected', desc: 'Chat with teachers and receive classroom photos after admission.' },
          ].map(({ icon: Icon, title, desc }) => (
            <div key={title} className="process-step">
              <Icon size={28} color="var(--primary)" style={{ marginBottom: 12 }} />
              <h3 style={{ margin: '0 0 8px', fontSize: 16 }}>{title}</h3>
              <p style={{ margin: 0, fontSize: 14, color: 'var(--muted)' }}>{desc}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="landing-section" style={{ background: '#f8fafc' }}>
        <h2>Admission Process</h2>
        <p>Follow these simple steps to complete your child&apos;s enrollment.</p>
        <div className="process-steps">
          {['Submit Enrollment Form', 'Admin Review & Documents', 'Fee Submission', 'Admission Confirmed', 'Account Created'].map((step, i) => (
            <div key={step} className="process-step">
              <div className="process-step-num">{i + 1}</div>
              <h3 style={{ margin: 0, fontSize: 15 }}>{step}</h3>
            </div>
          ))}
        </div>
        <div style={{ textAlign: 'center', marginTop: 32 }}>
          <Link to="/enroll"><Button variant="primary" className="btn-lg">Begin Enrollment Application</Button></Link>
        </div>
      </section>

      <section className="landing-section">
        <h2>Required Documents</h2>
        <p>Please keep these documents ready before starting the application.</p>
        <div className="card" style={{ maxWidth: 600, margin: '0 auto' }}>
          <ul style={{ margin: 0, paddingLeft: 20, lineHeight: 2, fontSize: 14 }}>
            <li>Birth Certificate</li>
            <li>Student Photograph</li>
            <li>Parent / Guardian ID Proof</li>
            <li>Address Proof</li>
            <li>Previous School Report Card</li>
            <li>Transfer Certificate (if applicable)</li>
            <li>Medical Certificate (if required)</li>
          </ul>
        </div>
      </section>

      <footer className="landing-footer">
        <p style={{ margin: '0 0 8px', fontWeight: 600, color: '#fff' }}>{SCHOOL.name}</p>
        <p style={{ margin: '0 0 4px' }}>{SCHOOL.address}</p>
        <p style={{ margin: 0 }}>{SCHOOL.phone} · {SCHOOL.email}</p>
      </footer>
    </div>
  );
}
