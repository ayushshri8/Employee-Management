import { useState, useEffect } from 'react';
import { fetcher, GET_EXECUTIVE_DASHBOARD, GET_HR_DASHBOARD, GET_EMPLOYEE_DASHBOARD } from '../../api/endpoints';
import { useAuth } from '../../context/AuthContext';

const DASH_EP = {
  CEO: GET_EXECUTIVE_DASHBOARD, CFO: GET_EXECUTIVE_DASHBOARD,
  CIO: GET_EXECUTIVE_DASHBOARD, CTO: GET_EXECUTIVE_DASHBOARD,
  HR:  GET_HR_DASHBOARD,
};

export default function Dashboard() {
  const { user } = useAuth();
  const [data, setData]       = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const ep = DASH_EP[user?.role] || GET_EMPLOYEE_DASHBOARD;
    fetcher.get(ep).then(Data => setData(Data)).catch(console.error).finally(() => setLoading(false));
  }, [user]);

  if (loading) return (
    <div className="d-flex justify-content-center align-items-center" style={{ height: '60vh' }}>
      <div className="spinner-border" style={{ color: '#4f46e5' }}></div>
    </div>
  );
  if (!data) return null;

  const isExec = ['CEO','CFO','CIO','CTO'].includes(user?.role);
  const isHR   = user?.role === 'HR';

  return (
    <div className="p-4">
      <div className="page-header">
        <h4>{data.welcome}</h4>
        <p>Here's what's happening in your organization today.</p>
      </div>

      {(isExec || isHR) && data.stats && (
        <div className="row g-3 mb-4">
          {[
            { label:'Total Employees', val: data.stats.total_employees, bg:'#ede9fe', color:'#7c3aed', icon:'bi-people-fill' },
            { label:'Active',          val: data.stats.active,          bg:'#dcfce7', color:'#16a34a', icon:'bi-person-check-fill' },
            ...(isExec ? [{ label:'Inactive', val: data.stats.inactive, bg:'#fee2e2', color:'#dc2626', icon:'bi-person-dash-fill' }] : []),
            { label:'Unread Alerts',   val: data.unread_notifications,  bg:'#fef9c3', color:'#ca8a04', icon:'bi-bell-fill' },
          ].map((s, i) => (
            <div className="col-sm-6 col-xl-3" key={i}>
              <div className="card stat-card shadow-sm p-3">
                <div className="d-flex align-items-center gap-3">
                  <div className="stat-icon" style={{ background: s.bg }}>
                    <i className={`bi ${s.icon}`} style={{ color: s.color }}></i>
                  </div>
                  <div>
                    <div className="text-muted" style={{ fontSize: '0.78rem' }}>{s.label}</div>
                    <div className="fw-bold fs-4">{s.val}</div>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {data.pending && (
        <div className="card shadow-sm border-0 rounded-3 mb-4">
          <div className="card-header bg-white border-bottom py-3">
            <h6 className="mb-0 fw-bold"><i className="bi bi-hourglass-split me-2 text-warning"></i>Pending Actions</h6>
          </div>
          <div className="card-body">
            <div className="row g-3">
              {Object.entries(data.pending).map(([key, val]) => (
                <div className="col-6 col-md-3" key={key}>
                  <div className="text-center p-3 rounded-3" style={{ background: '#f8fafc' }}>
                    <div className="fw-bold fs-3" style={{ color: val > 0 ? '#ef4444' : '#22c55e' }}>{val}</div>
                    <div className="text-muted" style={{ fontSize: '0.75rem', textTransform: 'capitalize' }}>
                      {key.replace(/_/g, ' ')}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {data.reports_to && (
        <div className="row g-3 mb-4">
          <div className="col-md-6">
            <div className="card shadow-sm border-0 rounded-3 p-3">
              <h6 className="fw-bold mb-3"><i className="bi bi-person-badge me-2"></i>Your Manager</h6>
              <div className="d-flex align-items-center gap-3">
                <div style={{ width:44, height:44, borderRadius:'50%', background:'#4f46e5', display:'flex', alignItems:'center', justifyContent:'center', color:'#fff', fontWeight:700 }}>
                  {data.reports_to.full_name?.charAt(0)}
                </div>
                <div>
                  <div className="fw-semibold">{data.reports_to.full_name}</div>
                  <div className="text-muted" style={{ fontSize: '0.8rem' }}>{data.reports_to.role} · {data.reports_to.employee_id}</div>
                  <div style={{ fontSize: '0.78rem', color: '#64748b' }}>{data.reports_to.email}</div>
                </div>
              </div>
            </div>
          </div>
          {data.notice_period && (
            <div className="col-md-6">
              <div className="card shadow-sm border-0 rounded-3 p-3 border-start border-warning border-4">
                <h6 className="fw-bold mb-2 text-warning"><i className="bi bi-clock me-2"></i>Notice Period Active</h6>
                <div className="fs-2 fw-bold text-warning">{data.notice_period.days_remaining} days</div>
                <div className="text-muted" style={{ fontSize: '0.8rem' }}>Last day: {data.notice_period.notice_end_date?.split('T')[0]}</div>
              </div>
            </div>
          )}
        </div>
      )}

      {data.events && (
        <div className="row g-3">
          {[
            { key:'work_anniversaries', title:'Work Anniversaries', icon:'bi-award', color:'text-warning',
              render: e => <><span style={{fontSize:'0.85rem'}}>{e.name}</span><span className="badge bg-warning text-dark">{e.years}y</span></> },
            { key:'birthdays', title:'Birthdays This Month', icon:'bi-balloon-heart', color:'text-danger',
              render: e => <><i className="bi bi-gift me-2 text-danger"></i><span style={{fontSize:'0.85rem'}}>{e.name}</span></> },
            { key:'new_joiners', title:'New Joiners', icon:'bi-person-plus', color:'text-success',
              render: e => <><span className="fw-semibold" style={{fontSize:'0.85rem'}}>{e.name}</span><span className="text-muted ms-2">· {e.department}</span></> },
          ].map(({ key, title, icon, color, render }) =>
            data.events[key]?.length > 0 && (
              <div className="col-md-4" key={key}>
                <div className="card shadow-sm border-0 rounded-3">
                  <div className="card-header bg-white border-bottom py-3">
                    <h6 className="mb-0 fw-bold"><i className={`bi ${icon} me-2 ${color}`}></i>{title}</h6>
                  </div>
                  <ul className="list-group list-group-flush">
                    {data.events[key].slice(0, 5).map((e, i) => (
                      <li key={i} className="list-group-item d-flex justify-content-between align-items-center py-2">
                        {render(e)}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            )
          )}
        </div>
      )}

      {isExec && data.stats?.by_department && (
        <div className="row g-3 mt-1">
          <div className="col-md-6">
            <div className="card shadow-sm border-0 rounded-3">
              <div className="card-header bg-white border-bottom py-3">
                <h6 className="mb-0 fw-bold"><i className="bi bi-bar-chart me-2"></i>By Department</h6>
              </div>
              <div className="card-body">
                {Object.entries(data.stats.by_department).map(([dept, count]) => (
                  <div key={dept} className="mb-2">
                    <div className="d-flex justify-content-between mb-1">
                      <small className="fw-semibold">{dept}</small>
                      <small className="text-muted">{count}</small>
                    </div>
                    <div className="progress" style={{ height: 6 }}>
                      <div className="progress-bar" style={{ width: `${(count/data.stats.total_employees)*100}%`, background:'#4f46e5' }}></div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
          <div className="col-md-6">
            <div className="card shadow-sm border-0 rounded-3">
              <div className="card-header bg-white border-bottom py-3">
                <h6 className="mb-0 fw-bold"><i className="bi bi-pie-chart me-2"></i>By Role</h6>
              </div>
              <div className="card-body">
                {Object.entries(data.stats.by_role).map(([role, count]) => (
                  <div key={role} className="d-flex justify-content-between align-items-center py-1 border-bottom">
                    <span style={{ fontSize: '0.85rem' }}>{role}</span>
                    <span className="badge rounded-pill" style={{ background:'#ede9fe', color:'#7c3aed' }}>{count}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
