import { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { fetcher, LOGIN_USER } from '../../api/endpoints';
import ForgotPasswordModal from '../../components/modals/ForgotPasswordModal';

export default function Login({ onLogin }) {
  const { login } = useAuth();
  const [form, setForm]             = useState({ employee_id: '', password: '', mfa_code: '' });
  const [showMfa, setShowMfa]       = useState(false);
  const [error, setError]           = useState('');
  const [loading, setLoading]       = useState(false);
  const [showForgot, setShowForgot] = useState(false);

  const handleChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const body = { employee_id: form.employee_id.toUpperCase(), password: form.password };
      if (showMfa) body.mfa_code = form.mfa_code;
      const Data = await fetcher.post(LOGIN_USER, body);
      login(Data);
      onLogin(Data.role);
    } catch (err) {
      if (err.message === 'MFA code required') setShowMfa(true);
      else setError(err.message);
    } finally { setLoading(false); }
  };

  return (
    <div className="login-page">
      <div className="login-card">
        <div className="login-logo"><i className="bi bi-building-fill"></i></div>
        <h5 className="text-center fw-bold mb-1" style={{ color: '#0f172a' }}>Diagonal HRMS</h5>
        <p className="text-center text-muted mb-4" style={{ fontSize: '0.875rem' }}>Sign in with your Employee ID</p>

        {error && (
          <div className="alert alert-danger py-2 px-3 mb-3" style={{ fontSize: '0.85rem' }}>
            <i className="bi bi-exclamation-circle me-2"></i>{error}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div className="mb-3">
            <label className="form-label fw-semibold" style={{ fontSize: '0.85rem' }}>Employee ID</label>
            <div className="input-group">
              <span className="input-group-text bg-light border-end-0"><i className="bi bi-person text-muted"></i></span>
              <input type="text" name="employee_id" className="form-control border-start-0 ps-0"
                placeholder="Employee ID" value={form.employee_id} onChange={handleChange}
                required />
            </div>
          </div>

          <div className="mb-1">
            <label className="form-label fw-semibold" style={{ fontSize: '0.85rem' }}>Password</label>
            <div className="input-group">
              <span className="input-group-text bg-light border-end-0"><i className="bi bi-lock text-muted"></i></span>
              <input type="password" name="password" className="form-control border-start-0 ps-0"
                placeholder="Enter your password" value={form.password} onChange={handleChange} required />
            </div>
          </div>

          <div className="text-end mb-3">
            <button type="button" className="btn btn-link p-0 text-decoration-none"
              style={{ fontSize: '0.8rem', color: '#4f46e5' }} onClick={() => setShowForgot(true)}>
              Forgot password?
            </button>
          </div>

          {showMfa && (
            <div className="mb-3">
              <label className="form-label fw-semibold" style={{ fontSize: '0.85rem' }}>
                <i className="bi bi-shield-lock me-1"></i>MFA Code
              </label>
              <input type="text" name="mfa_code" className="form-control text-center fw-bold"
                placeholder="6-digit code" maxLength={6} value={form.mfa_code} onChange={handleChange}
                style={{ letterSpacing: '0.5rem', fontSize: '1.1rem' }} />
              <div className="form-text">Enter the code from your authenticator app</div>
            </div>
          )}

          <button type="submit" className="btn w-100 fw-semibold"
            style={{ background: '#4f46e5', color: '#fff', padding: '0.65rem', borderRadius: '8px' }}
            disabled={loading}>
            {loading
              ? <><span className="spinner-border spinner-border-sm me-2"></span>Signing in...</>
              : <><i className="bi bi-box-arrow-in-right me-2"></i>Sign In</>}
          </button>
        </form>

        <hr className="my-3" />
        {/* <div className="text-center text-muted" style={{ fontSize: '0.78rem' }}>
          <i className="bi bi-info-circle me-1"></i>
          Default password = Employee ID &nbsp;|&nbsp; e.g. EMP001 / EMP001
        </div> */}
      </div>
      {showForgot && <ForgotPasswordModal onClose={() => setShowForgot(false)} />}
    </div>
  );
}
