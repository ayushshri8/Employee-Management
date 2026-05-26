export default function ForgotPasswordModal({ onClose }) {
  return (
    <div className="modal show d-block" style={{ background: 'rgba(0,0,0,0.6)' }}>
      <div className="modal-dialog modal-dialog-centered">
        <div className="modal-content">
          <div className="modal-header border-0">
            <h6 className="modal-title fw-bold">
              <i className="bi bi-key me-2 text-warning"></i>Forgot Password?
            </h6>
            <button className="btn-close" onClick={onClose}></button>
          </div>

          <div className="modal-body text-center py-4">

            {/* <i className="bi bi-person-badge text-primary" style={{ fontSize: '3rem' }}></i> */}
            {/* <h6 className="fw-bold mt-3">Contact HR to Reset</h6> */}
            {/* <p className="text-muted" style={{ fontSize: '0.875rem' }}>
              Password reset is managed by your HR team.<br />
              Contact HR with your Employee ID.
            </p> */}
            {/* <div className="alert alert-info py-2 text-start" style={{ fontSize: '0.82rem' }}>
              <i className="bi bi-info-circle me-2"></i>
              After reset, your password = your <strong>Employee ID</strong>.<br />
              e.g. ID is <strong>EMP042</strong> → new password is <strong>EMP042</strong>
            </div> */}
            {/* <div className="alert alert-warning py-2 text-start" style={{ fontSize: '0.82rem' }}>
              <i className="bi bi-shield-exclamation me-2"></i>
              Lost MFA access? HR can disable MFA for you too.
            </div> */}

            <div className="mb-3 text-start">
              <label className="form-label fw-semibold">Employee ID</label>
              <input type="text" className="form-control" placeholder="Enter Employee ID" />
            </div>

            <button className="btn btn-warning w-100">
              <i className="bi bi-unlock me-2"></i> Forget Password
            </button>
          </div>

          {/* <div className="modal-footer border-0 pt-0">
            <button className="btn btn-primary w-100" onClick={onClose}>Got it</button>
          </div> */}
        </div>
      </div>
    </div>
  );
}