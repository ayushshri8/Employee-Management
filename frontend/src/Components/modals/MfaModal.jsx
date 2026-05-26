import { useState, useEffect } from 'react';
import { fetcher, SETUP_MFA, VERIFY_MFA } from '../../api/endpoints';

export default function MfaModal({ onClose, onEnabled }) {
  const [step, setStep]       = useState(1);
  const [secret, setSecret]   = useState('');
  const [otpUri, setOtpUri]   = useState('');
  const [code, setCode]       = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState('');
  const [copied, setCopied]   = useState(false);

  useEffect(() => {
    const setup = async () => {
      setLoading(true);
      try {
        const Res = await fetcher.post(SETUP_MFA, {});
        setSecret(Res.secret);
        setOtpUri(Res.otp_uri);
        setStep(2);
      } catch (err) {
        setError(err.message);
        setStep(2);
      } finally { setLoading(false); }
    };
    setup();
  }, []);

  const handleVerify = async (e) => {
    e.preventDefault();
    if (code.length !== 6) { setError('Please enter a 6-digit code'); return; }
    setLoading(true);
    setError('');
    try {
      await fetcher.post(VERIFY_MFA, { code });
      setStep(3);
      onEnabled();
    } catch (err) {
      setError(err.message);
      setCode('');
    } finally { setLoading(false); }
  };

  const copySecret = () => {
    navigator.clipboard.writeText(secret);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="modal show d-block" style={{ background: 'rgba(0,0,0,0.6)' }}>
      <div className="modal-dialog modal-dialog-centered">
        <div className="modal-content">
          <div className="modal-header border-0 pb-0">
            <h6 className="modal-title fw-bold">
              <i className="bi bi-shield-lock me-2 text-primary"></i>
              {step === 3 ? 'MFA Enabled!' : 'Two-Factor Authentication'}
            </h6>
            <button className="btn-close" onClick={onClose}></button>
          </div>
          <div className="modal-body">
            {step === 1 && (
              <div className="text-center py-4">
                <div className="spinner-border text-primary mb-3"></div>
                <p className="text-muted">Setting up MFA...</p>
              </div>
            )}
            {error && (
              <div className="alert alert-danger py-2 mb-3" style={{ fontSize: '0.85rem' }}>
                <i className="bi bi-exclamation-triangle-fill me-2"></i>{error}
                {error.toLowerCase().includes('invalid') && (
                  <div className="mt-1 text-muted" style={{ fontSize: '0.78rem' }}>
                    Wait for the code to refresh (every 30s) then try again.
                  </div>
                )}
              </div>
            )}
            {step === 2 && (
              <div>
                {/* <p className="text-muted mb-2" style={{ fontSize: '0.85rem' }}>
                  Open <strong>Google Authenticator</strong> → tap <strong>+</strong> → scan:
                </p> */}
                {otpUri && (
                  <div className="text-center mb-3">
                    <img
                      src={`https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=${encodeURIComponent(otpUri)}`}
                      alt="MFA QR Code" className="border rounded p-2 bg-white"
                      style={{ width: 180, height: 180 }}
                    />
                  </div>
                )}
                {secret && (
                  <div className="mb-3">
                    <label className="form-label text-muted" style={{ fontSize: '0.78rem' }}>Can't scan? Enter manually:</label>
                    <div className="input-group input-group-sm">
                      <input className="form-control font-monospace" value={secret} readOnly style={{ letterSpacing: '0.1rem', fontSize: '0.82rem' }} />
                      <button className="btn btn-outline-secondary" type="button" onClick={copySecret}>
                        <i className={`bi ${copied ? 'bi-check text-success' : 'bi-copy'}`}></i>
                      </button>
                    </div>
                  </div>
                )}
                <hr className="my-3" />
                <form onSubmit={handleVerify}>
                  <div className="mb-3">
                    <input
                      className="form-control form-control-lg text-center fw-bold"
                      placeholder="000000" maxLength={6} value={code}
                      onChange={e => setCode(e.target.value.replace(/\D/g, ''))}
                      style={{ letterSpacing: '0.6rem', fontSize: '1.4rem' }} autoFocus
                    />
                    <div className="form-text text-center" style={{ fontSize: '0.75rem' }}>
                      <i className="bi bi-clock me-1"></i>Code refreshes every 30 seconds
                    </div>
                  </div>
                  <button type="submit" className="btn btn-primary w-100" disabled={loading || code.length !== 6}>
                    {loading ? <><span className="spinner-border spinner-border-sm me-2"></span>Verifying...</> : <><i className="bi bi-shield-check me-2"></i>Verify & Enable MFA</>}
                  </button>
                </form>
              </div>
            )}
            {step === 3 && (
              <div className="text-center py-3">
                <i className="bi bi-check-circle-fill text-success" style={{ fontSize: '3.5rem' }}></i>
                <h6 className="fw-bold mt-3">MFA Successfully Enabled!</h6>
                <p className="text-muted" style={{ fontSize: '0.875rem' }}>Your account is now protected.</p>
                <button className="btn btn-success px-4" onClick={onClose}><i className="bi bi-check me-2"></i>Done</button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
