
import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
  UserPlus,
  Eye,
  EyeOff,
  CheckCircle2,
  XCircle
} from 'lucide-react';
import toast from 'react-hot-toast';

const ROLES = ['CITIZEN', 'AUTHORITY', 'INVESTIGATOR', 'VERIFIER'];

export default function RegisterPage() {
  const [form, setForm] = useState({
    name: '',
    email: '',
    phone: '',
    password: '',
    role: 'CITIZEN',
    city: '',
    state: ''
  });

  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const { register } = useAuth();
  const navigate = useNavigate();

  const handleChange = (e) => {
    const { name, value } = e.target;

    setForm((f) => ({ ...f, [name]: value }));

    if (error) setError('');
  };

  const passwordsMatch =
    confirmPassword.length > 0 &&
    form.password === confirmPassword;

  const passwordsMismatch =
    confirmPassword.length > 0 &&
    form.password !== confirmPassword;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!form.name.trim() || !form.email.trim() || !form.password) {
      setError('Name, email, and password are required');
      return;
    }

    if (form.password.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }

    if (!confirmPassword) {
      setError('Please confirm your password');
      return;
    }

    if (form.password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    setLoading(true);

    try {
      // Only send registration fields to the backend.
      // confirmPassword is used for validation only.
      await register(form);

      toast.success('Account created successfully!');
      navigate('/dashboard');
    } catch (err) {
      setError(
        err.response?.data?.error || 'Registration failed'
      );
    } finally {
      setLoading(false);
    }
  };

  const passwordInputStyle = {
    paddingRight: 46
  };

  const eyeButtonStyle = {
    position: 'absolute',
    right: 12,
    top: '50%',
    transform: 'translateY(-50%)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 4,
    color: 'var(--text-muted)',
    background: 'transparent',
    border: 'none',
    cursor: 'pointer'
  };

  return (
    <div className="auth-page">
      <div
        className="auth-card fade-in"
        style={{ maxWidth: 560 }}
      >
        <div className="auth-logo">
          <h1>⛓ CivicChain</h1>
          <p>Create your account</p>
        </div>

        {error && (
          <div className="alert alert-error" role="alert">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          {/* Full Name and Role */}
          <div className="form-row">
            <div className="form-group">
              <label className="form-label" htmlFor="name">
                Full Name *
              </label>
              <input
                className="form-input"
                id="name"
                name="name"
                placeholder="John Doe"
                value={form.name}
                onChange={handleChange}
                autoComplete="name"
                required
              />
            </div>

            <div className="form-group">
              <label className="form-label" htmlFor="role">
                Role *
              </label>
              <select
                className="form-input"
                id="role"
                name="role"
                value={form.role}
                onChange={handleChange}
                required
              >
                {ROLES.map((role) => (
                  <option key={role} value={role}>
                    {role}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Email */}
          <div className="form-group">
            <label className="form-label" htmlFor="email">
              Email Address *
            </label>
            <input
              className="form-input"
              id="email"
              type="email"
              name="email"
              placeholder="your@email.com"
              value={form.email}
              onChange={handleChange}
              autoComplete="email"
              required
            />
          </div>

          {/* Phone and Password */}
          <div className="form-row">
            <div className="form-group">
              <label className="form-label" htmlFor="phone">
                Phone
              </label>
              <input
                className="form-input"
                id="phone"
                type="tel"
                name="phone"
                placeholder="9876543210"
                value={form.phone}
                onChange={handleChange}
                autoComplete="tel"
              />
            </div>

            <div className="form-group">
              <label className="form-label" htmlFor="password">
                Password *
              </label>

              <div style={{ position: 'relative' }}>
                <input
                  className="form-input"
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  name="password"
                  placeholder="Min 6 characters"
                  value={form.password}
                  onChange={handleChange}
                  autoComplete="new-password"
                  minLength={6}
                  style={passwordInputStyle}
                  required
                />

                <button
                  type="button"
                  style={eyeButtonStyle}
                  onClick={() =>
                    setShowPassword((visible) => !visible)
                  }
                  aria-label={
                    showPassword ? 'Hide password' : 'Show password'
                  }
                  aria-pressed={showPassword}
                >
                  {showPassword
                    ? <EyeOff size={18} />
                    : <Eye size={18} />}
                </button>
              </div>
            </div>
          </div>

          {/* Confirm Password */}
          <div className="form-group">
            <label
              className="form-label"
              htmlFor="confirmPassword"
            >
              Confirm Password *
            </label>

            <div style={{ position: 'relative' }}>
              <input
                className="form-input"
                id="confirmPassword"
                type={showConfirmPassword ? 'text' : 'password'}
                placeholder="Re-enter your password"
                value={confirmPassword}
                onChange={(e) => {
                  setConfirmPassword(e.target.value);
                  if (error) setError('');
                }}
                autoComplete="new-password"
                style={passwordInputStyle}
                required
                aria-invalid={passwordsMismatch}
              />

              <button
                type="button"
                style={eyeButtonStyle}
                onClick={() =>
                  setShowConfirmPassword((visible) => !visible)
                }
                aria-label={
                  showConfirmPassword
                    ? 'Hide confirmation password'
                    : 'Show confirmation password'
                }
                aria-pressed={showConfirmPassword}
              >
                {showConfirmPassword
                  ? <EyeOff size={18} />
                  : <Eye size={18} />}
              </button>
            </div>

            {passwordsMatch && (
              <p
                style={{
                  color: '#10b981',
                  fontSize: '0.82rem',
                  marginTop: 6,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 5
                }}
                role="status"
              >
                <CheckCircle2 size={16} />
                Passwords match
              </p>
            )}

            {passwordsMismatch && (
              <p
                style={{
                  color: '#ef4444',
                  fontSize: '0.82rem',
                  marginTop: 6,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 5
                }}
                role="status"
              >
                <XCircle size={16} />
                Passwords do not match
              </p>
            )}
          </div>

          {/* City and State — Citizens only */}
          {form.role === 'CITIZEN' && (
            <div className="form-row">
              <div className="form-group">
                <label className="form-label" htmlFor="city">
                  City
                </label>
                <input
                  className="form-input"
                  id="city"
                  name="city"
                  placeholder="Chennai"
                  value={form.city}
                  onChange={handleChange}
                  autoComplete="address-level2"
                />
              </div>

              <div className="form-group">
                <label className="form-label" htmlFor="state">
                  State
                </label>
                <input
                  className="form-input"
                  id="state"
                  name="state"
                  placeholder="Tamil Nadu"
                  value={form.state}
                  onChange={handleChange}
                  autoComplete="address-level1"
                />
              </div>
            </div>
          )}

          {/* Create Account */}
          <button
            className="btn btn-primary"
            type="submit"
            disabled={loading}
            style={{
              width: '100%',
              justifyContent: 'center',
              marginTop: 8
            }}
          >
            {loading ? (
              <>
                <div
                  className="loading-spinner"
                  style={{ width: 16, height: 16 }}
                />
                Creating account...
              </>
            ) : (
              <>
                <UserPlus size={18} />
                Create Account
              </>
            )}
          </button>
        </form>

        <p
          style={{
            textAlign: 'center',
            marginTop: 20,
            fontSize: '0.88rem',
            color: 'var(--text-muted)'
          }}
        >
          Already have an account?{' '}
          <Link
            to="/login"
            style={{
              color: 'var(--primary-light)',
              fontWeight: 600
            }}
          >
            Sign In
          </Link>
        </p>
      </div>
    </div>
  );
}
