import { useState, useEffect } from 'react';
import { fetcher, GET_NOTIFICATIONS } from '../../api/endpoints';
import { useAuth } from '../../context/AuthContext';

export default function Topbar({ title, onMfa }) {
  const { user } = useAuth();
  const [unread, setUnread] = useState(0);

  useEffect(() => {
    fetcher.get(GET_NOTIFICATIONS(true)).then(d => setUnread(d.unread_count || 0)).catch(() => {});
  }, []);

  return (
    <div className="topbar justify-content-between">
      <h6 className="mb-0 fw-bold" style={{ color: '#0f172a' }}>{title}</h6>
      <div className="d-flex align-items-center gap-3">
        <button
          className={`btn btn-sm ${user?.mfa_enabled ? 'btn-outline-success' : 'btn-outline-warning'}`}
          onClick={onMfa} style={{ fontSize: '0.75rem' }}>
          <i className={`bi ${user?.mfa_enabled ? 'bi-shield-check' : 'bi-shield-exclamation'} me-1`}></i>
          {user?.mfa_enabled ? 'MFA On' : 'Enable MFA'}
        </button>
        <div className="position-relative" style={{ cursor: 'pointer' }}>
          <i className="bi bi-bell fs-5 text-secondary"></i>
          {unread > 0 && (
            <span className="position-absolute top-0 start-100 translate-middle badge rounded-pill bg-danger" style={{ fontSize: '0.6rem' }}>
              {unread}
            </span>
          )}
        </div>
        <div className="vr"></div>
        <small className="text-muted">
          <i className="bi bi-circle-fill text-success me-1" style={{ fontSize: '0.5rem' }}></i>
          {user?.full_name}
        </small>
      </div>
    </div>
  );
}
