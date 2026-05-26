import { useAuth } from '../../context/AuthContext';

const NAV = {
  CEO:      ['dashboard','employees','hiring','onboarding','hierarchy','resignations','terminations','notifications','activity'],
  CFO:      ['dashboard','employees','hiring','notifications'],
  CIO:      ['dashboard','employees','hiring','notifications'],
  CTO:      ['dashboard','employees','hiring','notifications'],
  HR:       ['dashboard','employees','hiring','onboarding','hierarchy','resignations','terminations','notifications'],
  Manager:  ['dashboard','hiring','onboarding','resignations','terminations','notifications'],
  Employee: ['dashboard','resignations','notifications'],
  Intern:   ['dashboard','notifications'],
};

const LINKS = [
  { key: 'dashboard',     label: 'Dashboard',    icon: 'bi-speedometer2' },
  { key: 'employees',     label: 'Employees',    icon: 'bi-people' },
  { key: 'hiring',        label: 'Hiring',       icon: 'bi-briefcase' },
  { key: 'onboarding',    label: 'Onboarding',   icon: 'bi-person-plus' },
  { key: 'hierarchy',     label: 'Org Chart',    icon: 'bi-diagram-3' },
  { key: 'resignations',  label: 'Resignations', icon: 'bi-box-arrow-right' },
  { key: 'terminations',  label: 'Terminations', icon: 'bi-person-x' },
  { key: 'notifications', label: 'Notifications',icon: 'bi-bell' },
  { key: 'activity',      label: 'Activity Logs',icon: 'bi-clock-history' },
];

export default function Sidebar({ active, onNavigate }) {
  const { user, logout } = useAuth();
  const visible = LINKS.filter(l => (NAV[user?.role] || []).includes(l.key));

  return (
    <div className="sidebar d-flex flex-column">
      <div className="brand">
        <i className="bi bi-building-fill text-white me-2" style={{ fontSize: '1.2rem' }}></i>
        <span>Diagonal HRMS</span>
      </div>

      <div className="px-3 py-3 border-bottom" style={{ borderColor: '#1e293b' }}>
        <div className="d-flex align-items-center gap-2">
          <div style={{ width:36, height:36, borderRadius:'50%', background:'#4f46e5', display:'flex', alignItems:'center', justifyContent:'center', color:'#fff', fontWeight:700, fontSize:'0.85rem' }}>
            {user?.full_name?.charAt(0)}
          </div>
          <div>
            <div style={{ color:'#fff', fontSize:'0.8rem', fontWeight:600 }}>{user?.full_name}</div>
            <div style={{ fontSize:'0.7rem' }}>
              <span className="badge" style={{ background:'#4f46e5', fontSize:'0.65rem' }}>{user?.role}</span>
              <span style={{ color:'#64748b', marginLeft:4 }}>{user?.employee_id}</span>
            </div>
          </div>
        </div>
      </div>

      <nav className="flex-grow-1 py-2">
        <div className="sidebar-label">Menu</div>
        {visible.map(link => (
          <a key={link.key} href="#"
            className={`nav-link ${active === link.key ? 'active' : ''}`}
            onClick={(e) => { e.preventDefault(); onNavigate(link.key); }}>
            <i className={`bi ${link.icon}`}></i>
            {link.label}
          </a>
        ))}
      </nav>

      <div className="p-3 border-top" style={{ borderColor: '#1e293b' }}>
        <a href="#" className="nav-link text-danger"
          onClick={(e) => { e.preventDefault(); logout(); }}>
          <i className="bi bi-box-arrow-left"></i> Logout
        </a>
      </div>
    </div>
  );
}
