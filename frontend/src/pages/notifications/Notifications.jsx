import { useState, useEffect } from 'react';
import { fetcher, GET_NOTIFICATIONS, MARK_NOTIFICATION_READ, MARK_ALL_NOTIFICATIONS_READ } from '../../api/endpoints';

const PRIORITY_COLOR = { normal: 'secondary', high: 'warning', critical: 'danger' };
const TYPE_ICON = {
  hiring: 'bi-briefcase', onboarding: 'bi-person-plus',
  resignation: 'bi-box-arrow-right', termination: 'bi-person-x',
  hierarchy: 'bi-diagram-3', general: 'bi-bell',
};

export default function Notifications() {
  const [notifications, setNotifications] = useState([]);
  const [unread, setUnread]   = useState(0);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter]   = useState(false);

  const load = () => {
    setLoading(true);
    fetcher.get(GET_NOTIFICATIONS(filter))
      .then(Data => { setNotifications(Data.notifications); setUnread(Data.unread_count); })
      .catch(console.error)
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, [filter]);

  const handleMarkRead = async (id) => { await fetcher.patch(MARK_NOTIFICATION_READ(id)); load(); };
  const handleMarkAll  = async ()    => { await fetcher.patch(MARK_ALL_NOTIFICATIONS_READ); load(); };

  return (
    <div className="p-4">
      <div className="page-header d-flex justify-content-between align-items-start">
        <div>
          <h4><i className="bi bi-bell me-2"></i>Notifications</h4>
          <p>{unread} unread notification{unread !== 1 ? 's' : ''}</p>
        </div>
        <div className="d-flex gap-2">
          <div className="form-check form-switch mt-1">
            <input className="form-check-input" type="checkbox" checked={filter}
              onChange={e => setFilter(e.target.checked)} id="unreadSwitch" />
            <label className="form-check-label text-muted" htmlFor="unreadSwitch" style={{ fontSize: '0.85rem' }}>Unread only</label>
          </div>
          {unread > 0 && (
            <button className="btn btn-sm btn-outline-secondary" onClick={handleMarkAll}>
              <i className="bi bi-check2-all me-1"></i>Mark all read
            </button>
          )}
        </div>
      </div>

      {loading ? (
        <div className="text-center py-5"><div className="spinner-border" style={{ color: '#4f46e5' }}></div></div>
      ) : notifications.length === 0 ? (
        <div className="text-center py-5 text-muted">
          <i className="bi bi-bell-slash" style={{ fontSize: '3rem' }}></i>
          <p className="mt-3">No notifications</p>
        </div>
      ) : (
        <div className="card shadow-sm border-0 rounded-3">
          {notifications.map((n, i) => (
            <div key={i}
              className={`d-flex align-items-start gap-3 p-3 border-bottom ${!n.is_read ? 'bg-light' : ''}`}
              style={{ cursor: 'pointer' }}
              onClick={() => !n.is_read && handleMarkRead(n.notification_id)}>
              <div className="stat-icon flex-shrink-0"
                style={{ background: n.priority==='critical'?'#fee2e2':n.priority==='high'?'#fef9c3':'#f1f5f9', width:40, height:40 }}>
                <i className={`bi ${TYPE_ICON[n.type]||'bi-bell'}`}
                  style={{ color: n.priority==='critical'?'#dc2626':n.priority==='high'?'#ca8a04':'#64748b' }}></i>
              </div>
              <div className="flex-grow-1">
                <div className="d-flex justify-content-between">
                  <span className="fw-semibold" style={{ fontSize: '0.875rem' }}>{n.title}</span>
                  <div className="d-flex gap-2">
                    {n.priority !== 'normal' && <span className={`badge bg-${PRIORITY_COLOR[n.priority]}`} style={{ fontSize: '0.65rem' }}>{n.priority}</span>}
                    {!n.is_read && <span className="badge bg-primary" style={{ fontSize: '0.6rem' }}>NEW</span>}
                  </div>
                </div>
                <p className="text-muted mb-1" style={{ fontSize: '0.82rem' }}>{n.message}</p>
                <small className="text-muted"><i className="bi bi-clock me-1"></i>{new Date(n.created_at).toLocaleString()}</small>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
