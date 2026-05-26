import { useState, useEffect, useMemo } from 'react';
import { fetcher, GET_ORG_TREE, REASSIGN_MANAGER } from '../../api/endpoints';
import { useAuth } from '../../context/AuthContext';

const ROLE_COLOR   = { CEO:'danger', CFO:'warning', CIO:'info', CTO:'primary', HR:'success', Manager:'secondary', Employee:'dark', Intern:'light' };
const STATUS_COLOR = { Active:'success', Inactive:'secondary', 'Notice Period':'warning', Terminated:'danger', Resigned:'dark' };

function Avatar({ name, size = 32 }) {
  const initials = name ? name.split(' ').map(n => n[0]).join('').slice(0,2).toUpperCase() : '?';
  return (
    <div className="rounded-circle bg-primary text-white d-flex align-items-center justify-content-center flex-shrink-0 fw-bold"
      style={{ width:size, height:size, fontSize:size*0.35 }}>{initials}</div>
  );
}

// Flatten tree into [{...emp, manager: parentNode|null}]
function flattenTree(nodes, parent = null, result = []) {
  for (const node of nodes) {
    result.push({ ...node, _manager: parent });
    if (node.reports?.length) flattenTree(node.reports, node, result);
  }
  return result;
}

function TreeNode({ node, level = 0, highlight = '' }) {
  const [open, setOpen] = useState(level < 2);
  const hasReports = node.reports?.length > 0;
  const fullName = `${node.first_name} ${node.last_name}`;
  const isMatch = highlight && (
    fullName.toLowerCase().includes(highlight.toLowerCase()) ||
    node.employee_id?.toLowerCase().includes(highlight.toLowerCase()) ||
    node.role?.toLowerCase().includes(highlight.toLowerCase()) ||
    node.department?.toLowerCase().includes(highlight.toLowerCase())
  );
  return (
    <div style={{ marginLeft: level * 20 }}>
      <div className={`d-flex align-items-center gap-2 py-1 px-2 rounded mb-1 ${isMatch ? 'border border-warning' : ''}`}
        style={{ background: isMatch ? '#fefce8' : level===0?'#ede9fe':level===1?'#f0fdf4':'#f8fafc', cursor: hasReports?'pointer':'default' }}
        onClick={() => hasReports && setOpen(!open)}>
        {hasReports ? <i className={`bi bi-chevron-${open?'down':'right'} text-muted`} style={{fontSize:'0.7rem'}}></i> : <span style={{width:12}}></span>}
        <Avatar name={fullName} size={28} />
        <div>
          <span className="fw-semibold" style={{fontSize:'0.85rem'}}>{fullName}</span>
          <span className={`badge bg-${ROLE_COLOR[node.role]||'secondary'} ms-2 ${node.role==='Intern'?'text-dark':''}`} style={{fontSize:'0.65rem'}}>{node.role}</span>
          <span className="text-muted ms-2" style={{fontSize:'0.75rem'}}>{node.department}</span>
        </div>
        <code className="ms-auto text-muted" style={{fontSize:'0.72rem'}}>{node.employee_id}</code>
      </div>
      {open && hasReports && node.reports.map((child, i) => <TreeNode key={i} node={child} level={level+1} highlight={highlight} />)}
    </div>
  );
}

function SearchResult({ emp }) {
  const mgr = emp._manager;
  return (
    <div className="card border-0 shadow-sm mb-3 rounded-3 overflow-hidden">
      {/* Employee */}
      <div className="card-body pb-2">
        <div className="d-flex align-items-center gap-3">
          <Avatar name={`${emp.first_name} ${emp.last_name}`} size={52} />
          <div className="flex-grow-1">
            <div className="fw-bold" style={{fontSize:'1rem'}}>{emp.first_name} {emp.last_name}</div>
            <div className="d-flex gap-2 flex-wrap mt-1">
              <span className={`badge bg-${ROLE_COLOR[emp.role]||'secondary'} ${emp.role==='Intern'?'text-dark':''}`}>{emp.role}</span>
              <span className={`badge bg-${STATUS_COLOR[emp.status]||'secondary'}`}>{emp.status}</span>
              <code style={{fontSize:'0.75rem'}}>{emp.employee_id}</code>
            </div>
            <div className="text-muted mt-1" style={{fontSize:'0.8rem'}}>{emp.email} · {emp.department}</div>
          </div>
        </div>
        <div className="row g-2 mt-2">
          {[['Phone', emp.phone||'—'], ['DOB', emp.dob||'—'], ['Blood Group', emp.blood_group||'—'], ['Joining Date', emp.joining_date||'—']].map(([k,v]) => (
            <div className="col-6 col-md-3" key={k}>
              <div className="p-2 rounded-2" style={{background:'#f8fafc'}}>
                <div className="text-muted" style={{fontSize:'0.72rem'}}>{k}</div>
                <div className="fw-semibold" style={{fontSize:'0.8rem'}}>{v}</div>
              </div>
            </div>
          ))}
        </div>
        {emp.skills?.length > 0 && (
          <div className="mt-2">{emp.skills.map((s,i) => <span key={i} className="badge bg-primary me-1 mb-1">{s}</span>)}</div>
        )}
      </div>

      {/* Manager strip */}
      <div className="px-3 py-2" style={{background:'#eef2ff', borderTop:'1px solid #e0e7ff'}}>
        <div className="d-flex align-items-center gap-2 mb-1">
          <i className="bi bi-person-badge text-indigo" style={{color:'#4f46e5'}}></i>
          <span className="fw-semibold" style={{fontSize:'0.8rem', color:'#4f46e5'}}>Reports To</span>
        </div>
        {mgr ? (
          <div className="d-flex align-items-center gap-3">
            <Avatar name={`${mgr.first_name} ${mgr.last_name}`} size={40} />
            <div className="flex-grow-1">
              <div className="fw-semibold" style={{fontSize:'0.9rem'}}>{mgr.first_name} {mgr.last_name}</div>
              <div className="d-flex gap-2 flex-wrap mt-1">
                <span className={`badge bg-${ROLE_COLOR[mgr.role]||'secondary'} ${mgr.role==='Intern'?'text-dark':''}`}>{mgr.role}</span>
                <span className={`badge bg-${STATUS_COLOR[mgr.status]||'secondary'}`}>{mgr.status}</span>
                <code style={{fontSize:'0.72rem'}}>{mgr.employee_id}</code>
              </div>
              <div className="text-muted" style={{fontSize:'0.78rem'}}>{mgr.email} · {mgr.department}</div>
              {mgr.phone && <div className="text-muted" style={{fontSize:'0.75rem'}}>📞 {mgr.phone}</div>}
            </div>
          </div>
        ) : (
          <span className="text-muted" style={{fontSize:'0.82rem'}}>No manager — top of hierarchy</span>
        )}
      </div>
    </div>
  );
}

export default function Hierarchy() {
  const { user } = useAuth();
  const [tree, setTree]             = useState([]);
  const [loading, setLoading]       = useState(true);
  const [msg, setMsg]               = useState({ text:'', type:'' });
  const [showReassign, setShowReassign] = useState(false);
  const [form, setForm]             = useState({ employee_id:'', manager_id:'' });
  const [submitting, setSubmitting] = useState(false);
  const [search, setSearch]         = useState('');

  const notify = (text, type='success') => { setMsg({ text, type }); setTimeout(() => setMsg({ text:'', type:'' }), 3000); };

  useEffect(() => {
    fetcher.get(GET_ORG_TREE).then(Data => setTree(Data.org_tree)).catch(console.error).finally(() => setLoading(false));
  }, []);

  const flat = useMemo(() => flattenTree(tree), [tree]);

  const searchResults = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return [];
    return flat.filter(e =>
      `${e.first_name} ${e.last_name}`.toLowerCase().includes(q) ||
      e.employee_id?.toLowerCase().includes(q) ||
      e.role?.toLowerCase().includes(q) ||
      e.department?.toLowerCase().includes(q) ||
      e.email?.toLowerCase().includes(q)
    );
  }, [search, flat]);

  const handleReassign = async (e) => {
    e.preventDefault(); setSubmitting(true);
    try { await fetcher.patch(REASSIGN_MANAGER, form); notify('Manager reassigned'); setShowReassign(false); setForm({ employee_id:'', manager_id:'' }); }
    catch(Err) { notify(Err.message, 'danger'); } finally { setSubmitting(false); }
  };

  return (
    <div className="p-4">
      <div className="d-flex justify-content-between align-items-center mb-3">
        <h5 className="fw-bold mb-0">Organization Chart</h5>
        {['HR','CEO'].includes(user?.role) && (
          <button className="btn btn-primary btn-sm" onClick={() => setShowReassign(!showReassign)}>
            <i className="bi bi-arrow-left-right me-1"></i>Reassign Manager
          </button>
        )}
      </div>

      {msg.text && <div className={`alert alert-${msg.type} py-2`}>{msg.text}</div>}

      {/* Search */}
      <div className="card border-0 shadow-sm mb-4">
        <div className="card-body py-3">
          <div className="input-group">
            <span className="input-group-text bg-white border-end-0"><i className="bi bi-search text-muted"></i></span>
            <input className="form-control border-start-0 ps-0" placeholder="Search by name, ID, role, department, email…"
              value={search} onChange={e => setSearch(e.target.value)} />
            {search && <button className="btn btn-outline-secondary" onClick={() => setSearch('')}><i className="bi bi-x"></i></button>}
          </div>
        </div>
      </div>

      {/* Search results */}
      {search.trim() && (
        <div className="mb-4">
          <div className="mb-2 text-muted" style={{fontSize:'0.82rem'}}>
            {searchResults.length} result{searchResults.length !== 1 ? 's' : ''} for "{search}"
          </div>
          {searchResults.length === 0
            ? <div className="text-center py-4 text-muted"><i className="bi bi-person-x" style={{fontSize:'2rem'}}></i><p className="mt-2 mb-0">No employees found</p></div>
            : searchResults.map((emp, i) => <SearchResult key={i} emp={emp} />)
          }
        </div>
      )}

      {showReassign && (
        <div className="card border-0 shadow-sm mb-4">
          <div className="card-header bg-white"><h6 className="mb-0 fw-bold">Reassign Manager</h6></div>
          <div className="card-body">
            <form onSubmit={handleReassign}>
              <div className="row g-3 align-items-end">
                <div className="col-md-4"><label className="form-label">Employee ID</label><input className="form-control" required value={form.employee_id} onChange={e=>setForm({...form,employee_id:e.target.value})} placeholder="e.g. EMP020" /></div>
                <div className="col-md-4"><label className="form-label">New Manager ID</label><input className="form-control" required value={form.manager_id} onChange={e=>setForm({...form,manager_id:e.target.value})} placeholder="e.g. EMP010" /></div>
                <div className="col-md-4 d-flex gap-2">
                  <button type="submit" className="btn btn-primary btn-sm" disabled={submitting}>{submitting?<span className="spinner-border spinner-border-sm"></span>:'Reassign'}</button>
                  <button type="button" className="btn btn-outline-secondary btn-sm" onClick={()=>setShowReassign(false)}>Cancel</button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Org Tree */}
      {!search.trim() && (
        <div className="card border-0 shadow-sm">
          <div className="card-header bg-white"><h6 className="mb-0 fw-bold"><i className="bi bi-diagram-3 me-2"></i>Organization Tree</h6></div>
          <div className="card-body">
            {loading
              ? <div className="text-center py-5"><div className="spinner-border text-primary"></div></div>
              : tree.length === 0
                ? <div className="text-center py-5 text-muted">No hierarchy data</div>
                : tree.map((node, i) => <TreeNode key={i} node={node} level={0} highlight={search} />)
            }
          </div>
        </div>
      )}
    </div>
  );
}
