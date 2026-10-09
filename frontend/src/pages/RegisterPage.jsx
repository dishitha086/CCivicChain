import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { UserPlus } from 'lucide-react';
import toast from 'react-hot-toast';

const ROLES = ['CITIZEN', 'AUTHORITY', 'INVESTIGATOR', 'VERIFIER'];

export default function RegisterPage() {
  const [form, setForm] = useState({
    name: '', email: '', phone: '', password: '', role: 'CITIZEN',
    department: '', badge_number: '', city: '', state: ''
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const { register } = useAuth();
  const navigate = useNavigate();

  const handleChange = (e) => {
    setForm(f => ({ ...f, [e.target.name]: e.target.value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.name || !form.email || !form.password) {
      setError('Name, email, and password are required');
      return;
    }
    if (form.password.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }
    setError('');
    setLoading(true);
    try {
      const data = await register(form);
      toast.success('Account created successfully!');
      navigate('/dashboard');
    } catch (err) {
      setError(err.response?.data?.error || 'Registration failed');
    } finally {
      setLoading(false);
    }
  };

  const isOfficial = ['AUTHORITY', 'INVESTIGATOR', 'VERIFIER'].includes(form.role);

  return (
    <div className="auth-page">
      <div className="auth-card fade-in" style={{ maxWidth: 560 }}>
        <div className="auth-logo">
          <h1>⛓ CivicChain</h1>
          <p>Create your account</p>
        </div>

        {error && <div className="alert alert-error">{error}</div>}

        <form onSubmit={handleSubmit}>
          <div className="form-row">
            <div className="form-group">
              <label className="form-label">Full Name *</label>
              <input className="form-input" name="name" placeholder="John Doe" value={form.name} onChange={handleChange} required />
            </div>
            <div className="form-group">
              <label className="form-label">Role *</label>
              <select className="form-input" name="role" value={form.role} onChange={handleChange}>
                {ROLES.map(r => <option key={r} value={r}>{r}</option>)}
              </select>
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Email Address *</label>
            <input className="form-input" type="email" name="email" placeholder="your@email.com" value={form.email} onChange={handleChange} required />
          </div>

          <div className="form-row">
            <div className="form-group">
              <label className="form-label">Phone</label>
              <input className="form-input" type="tel" name="phone" placeholder="9876543210" value={form.phone} onChange={handleChange} />
            </div>
            <div className="form-group">
              <label className="form-label">Password *</label>
              <input className="form-input" type="password" name="password" placeholder="Min 6 characters" value={form.password} onChange={handleChange} required />
            </div>
          </div>

          {isOfficial && (
            <div className="form-row">
              <div className="form-group">
                <label className="form-label">Department</label>
                <input className="form-input" name="department" placeholder="e.g. Roads & Infrastructure" value={form.department} onChange={handleChange} />
              </div>
              <div className="form-group">
                <label className="form-label">Badge Number</label>
                <input className="form-input" name="badge_number" placeholder="e.g. AUTH001" value={form.badge_number} onChange={handleChange} />
              </div>
            </div>
          )}

          {form.role === 'CITIZEN' && (
            <div className="form-row">
              <div className="form-group">
                <label className="form-label">City</label>
                <input className="form-input" name="city" placeholder="Chennai" value={form.city} onChange={handleChange} />
              </div>
              <div className="form-group">
                <label className="form-label">State</label>
                <input className="form-input" name="state" placeholder="Tamil Nadu" value={form.state} onChange={handleChange} />
              </div>
            </div>
          )}

          <button className="btn btn-primary" type="submit" disabled={loading} style={{ width: '100%', justifyContent: 'center', marginTop: 8 }}>
            {loading ? <><div className="loading-spinner" style={{width:16,height:16}} /> Creating account...</> : <><UserPlus size={18} /> Create Account</>}
          </button>
        </form>

        <p style={{ textAlign: 'center', marginTop: 20, fontSize: '0.88rem', color: 'var(--text-muted)' }}>
          Already have an account? <Link to="/login" style={{ color: 'var(--primary-light)', fontWeight: 600 }}>Sign In</Link>
        </p>
      </div>
    </div>
  );
}
