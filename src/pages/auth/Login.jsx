import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { LockKeyhole, Mail, GraduationCap, ShieldCheck } from 'lucide-react';
import { useAuth } from '../../context/AuthContext.jsx';
import { ROLE_DASHBOARD } from '../../constants/roles.js';
import Button from '../../components/ui/Button.jsx';
import Input from '../../components/ui/Input.jsx';

const ROLES = [
  { id: 'parent', label: 'Parent' },
  { id: 'admin', label: 'Admin' },
  { id: 'teacher', label: 'Teacher' },
];

export default function Login() {
  const [form, setForm] = useState({ identity: '', password: '' });
  const [role, setRole] = useState('parent');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const submit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const user = await login({ ...form, role });
      navigate(ROLE_DASHBOARD[user.role]);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <section className="auth-page">
      <div className="auth-hero">
        <div className="sidebar-brand" style={{ marginBottom: 32 }}>
          <span className="sidebar-brand-icon">SB</span>
          <span style={{ fontSize: 22, fontWeight: 700 }}>SchoolBridge</span>
        </div>
        <h1>Secure School Enrollment & Communication Platform</h1>
        <p>Manage admissions, fees, documents, and parent-teacher communication from one trusted platform.</p>
        <div className="auth-hero-features">
          <div className="auth-hero-feature"><ShieldCheck size={18} /> Role-based secure access</div>
          <div className="auth-hero-feature"><GraduationCap size={18} /> Complete enrollment workflow</div>
        </div>
      </div>

      <div className="auth-form-wrap">
        <form className="auth-card card" onSubmit={submit}>
          <h2>Welcome Back</h2>
          <p className="text-muted" style={{ marginBottom: 20 }}>Login to your SchoolBridge account.</p>

          <div className="auth-demo-hint">
            Demo login: any email/mobile · Password: <strong>123456</strong>
          </div>

          <div className="role-selector">
            {ROLES.map((r) => (
              <div key={r.id} className={`role-option ${role === r.id ? 'selected' : ''}`} onClick={() => setRole(r.id)}>
                {r.label}
              </div>
            ))}
          </div>

          {error && <div className="error-box">{error}</div>}

          <Input label="Email or Mobile" name="identity" value={form.identity} onChange={(e) => setForm({ ...form, identity: e.target.value })} placeholder="Enter email or mobile" />
          <Input label="Password" name="password" type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} placeholder="Enter password" />

          <Button type="submit" variant="primary" className="btn-lg" loading={loading} style={{ width: '100%', marginTop: 8 }}>
            Login
          </Button>

          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 16, fontSize: 14 }}>
            <a style={{ color: 'var(--primary)', fontWeight: 600 }}>Forgot password?</a>
            <Link to="/enroll" style={{ color: 'var(--primary)', fontWeight: 600 }}>Apply for Admission</Link>
          </div>
          <Link to="/" className="text-muted" style={{ display: 'block', textAlign: 'center', marginTop: 16, fontSize: 14 }}>← Back to Home</Link>
        </form>
      </div>
    </section>
  );
}
