import { useState, useEffect, Fragment } from 'react';
import { fetcher, GET_EMPLOYEES, GET_MY_PROFILE, UPDATE_MY_PROFILE, DEACTIVATE_EMPLOYEE, REACTIVATE_EMPLOYEE } from '../../api/endpoints';
import { useAuth } from '../../context/AuthContext';

const ROLE_COLOR = { CEO:'danger', CFO:'warning', CIO:'info', CTO:'primary', HR:'success', Manager:'secondary', Employee:'dark', Intern:'light' };
const STATUS_COLOR = { Active:'success', Inactive:'secondary', 'Notice Period':'warning', Terminated:'danger', Resigned:'dark' };

function Avatar({ name, size = 34 }) {
  const initials = name ? name.split(' ').map(n => n[0]).join('').slice(0,2).toUpperCase() : '?';
  return <div className="rounded-circle bg-primary text-white d-flex align-items-center justify-content-center flex-shrink-0 fw-bold" style={{ width:size, height:size, fontSize:size*0.35 }}>{initials}</div>;
}

function ProfileModal({ emp, manager, onClose }) {
  return (
    <div className="modal show d-block" style={{ background:'rgba(0,0,0,0.5)' }}>
      <div className="modal-dialog modal-lg modal-dialog-centered modal-dialog-scrollable">
        <div className="modal-content">
          <div className="modal-header border-0 pb-0"><h6 className="modal-title fw-bold">Employee Profile</h6><button className="btn-close" onClick={onClose}></button></div>
          <div className="modal-body">
            <div className="d-flex align-items-center gap-3 mb-4 p-3 rounded-3" style={{ background:'#f8fafc' }}>
              <Avatar name={`${emp.first_name} ${emp.last_name}`} size={64} />
              <div>
                <h5 className="fw-bold mb-1">{emp.first_name} {emp.last_name}</h5>
                <div className="d-flex gap-2 flex-wrap">
                  <span className={`badge bg-${ROLE_COLOR[emp.role]||'secondary'}`}>{emp.role}</span>
                  <span className={`badge bg-${STATUS_COLOR[emp.status]||'secondary'}`}>{emp.status}</span>
                  <code style={{ fontSize:'0.8rem' }}>{emp.employee_id}</code>
                </div>
                <div className="text-muted mt-1" style={{ fontSize:'0.82rem' }}>{emp.email}</div>
              </div>
            </div>
            <div className="row g-3">
              <div className="col-md-6">
                <div className="card border-0 bg-light h-100"><div className="card-body">
                  <h6 className="fw-bold mb-3"><i className="bi bi-briefcase me-2 text-primary"></i>Employment</h6>
                  <table className="table table-sm table-borderless mb-0"><tbody>
                    {[['Department',emp.department],['Joining Date',emp.joining_date],['MFA',emp.mfa_enabled?'Enabled':'Disabled']].map(([k,v])=>(
                      <tr key={k}><td className="text-muted" style={{fontSize:'0.8rem',width:'45%'}}>{k}</td><td className="fw-semibold" style={{fontSize:'0.8rem'}}>{v}</td></tr>
                    ))}
                  </tbody></table>
                </div></div>
              </div>
              <div className="col-md-6">
                <div className="card border-0 bg-light h-100"><div className="card-body">
                  <h6 className="fw-bold mb-3"><i className="bi bi-person me-2 text-success"></i>Personal</h6>
                  <table className="table table-sm table-borderless mb-0"><tbody>
                    {[['Phone',emp.phone||'—'],['DOB',emp.dob||'—'],['Blood Group',emp.blood_group||'—'],['Emergency',emp.emergency_contact||'—']].map(([k,v])=>(
                      <tr key={k}><td className="text-muted" style={{fontSize:'0.8rem',width:'45%'}}>{k}</td><td className="fw-semibold" style={{fontSize:'0.8rem'}}>{v}</td></tr>
                    ))}
                  </tbody></table>
                </div></div>
              </div>
              {emp.address && <div className="col-12"><div className="card border-0 bg-light"><div className="card-body py-2"><span className="text-muted" style={{fontSize:'0.8rem'}}>Address: </span><span style={{fontSize:'0.85rem'}}>{emp.address}</span></div></div></div>}
              <div className="col-12"><div className="card border-0 bg-light"><div className="card-body py-2">
                <span className="text-muted me-2" style={{fontSize:'0.8rem'}}>Skills:</span>
                {emp.skills?.length>0 ? emp.skills.map((s,i)=><span key={i} className="badge bg-primary me-1 mb-1">{s}</span>) : <span className="text-muted" style={{fontSize:'0.8rem'}}>No skills added</span>}
              </div></div></div>
              <div className="col-12">
                <div className="card border-0 rounded-3" style={{ background:'#eef2ff' }}><div className="card-body">
                  <h6 className="fw-bold mb-3"><i className="bi bi-person-badge me-2 text-indigo"></i>Manager</h6>
                  {manager ? (
                    <div className="d-flex align-items-center gap-3">
                      <Avatar name={`${manager.first_name} ${manager.last_name}`} size={44} />
                      <div className="flex-grow-1">
                        <div className="fw-semibold">{manager.first_name} {manager.last_name}</div>
                        <div className="d-flex gap-2 flex-wrap mt-1">
                          <span className={`badge bg-${ROLE_COLOR[manager.role]||'secondary'}`}>{manager.role}</span>
                          <span className={`badge bg-${STATUS_COLOR[manager.status]||'secondary'}`}>{manager.status}</span>
                          <code style={{fontSize:'0.75rem'}}>{manager.employee_id}</code>
                        </div>
                        <table className="table table-sm table-borderless mb-0 mt-2"><tbody>
                          {[['Email',manager.email],['Department',manager.department],['Phone',manager.phone||'—'],['Joining Date',manager.joining_date]].map(([k,v])=>(
                            <tr key={k}><td className="text-muted" style={{fontSize:'0.78rem',width:'35%'}}>{k}</td><td className="fw-semibold" style={{fontSize:'0.78rem'}}>{v}</td></tr>
                          ))}
                        </tbody></table>
                      </div>
                    </div>
                  ) : (
                    <span className="text-muted" style={{fontSize:'0.85rem'}}>No manager assigned</span>
                  )}
                </div></div>
              </div>
            </div>
          </div>
          <div className="modal-footer border-0"><button className="btn btn-secondary btn-sm" onClick={onClose}>Close</button></div>
        </div>
      </div>
    </div>
  );
}

function MyProfile() {
  const [profile, setProfile] = useState(null);
  const [form, setForm]       = useState({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving]   = useState(false);
  const [msg, setMsg]         = useState({ text:'', type:'' });
  const notify = (text, type='success') => { setMsg({ text, type }); setTimeout(() => setMsg({ text:'', type:'' }), 3000); };

  useEffect(() => { fetcher.get(GET_MY_PROFILE).then(Data => { setProfile(Data); setForm(Data); }).catch(console.error).finally(() => setLoading(false)); }, []);

  const handleSave = async (e) => {
    e.preventDefault(); setSaving(true);
    try { await fetcher.patch(UPDATE_MY_PROFILE, { phone:form.phone||null, address:form.address||null, emergency_contact:form.emergency_contact||null, blood_group:form.blood_group||null, skills:form.skills||[] }); notify('Profile updated'); }
    catch(Err) { notify(Err.message, 'danger'); } finally { setSaving(false); }
  };

  if (loading) return <div className="text-center py-5"><div className="spinner-border text-primary"></div></div>;
  if (!profile) return null;

  return (
    <div className="p-4">
      <h5 className="fw-bold mb-4">My Profile</h5>
      {msg.text && <div className={`alert alert-${msg.type} py-2`}>{msg.text}</div>}
      <div className="row g-4">
        <div className="col-md-4">
          <div className="card border-0 shadow-sm text-center p-4">
            <Avatar name={`${profile.first_name} ${profile.last_name}`} size={72} />
            <div className="mt-3">
              <h6 className="fw-bold mb-1">{profile.first_name} {profile.last_name}</h6>
              <div className="text-muted mb-2" style={{fontSize:'0.82rem'}}>{profile.email}</div>
              <span className={`badge bg-${ROLE_COLOR[profile.role]||'secondary'} me-1`}>{profile.role}</span>
              <span className={`badge bg-${STATUS_COLOR[profile.status]||'secondary'}`}>{profile.status}</span>
            </div>
            <hr />
            <table className="table table-sm table-borderless text-start mb-0"><tbody>
              {[['ID',profile.employee_id],['Department',profile.department],['Joined',profile.joining_date],['Manager',profile.manager_id||'—']].map(([k,v])=>(
                <tr key={k}><td className="text-muted" style={{fontSize:'0.78rem'}}>{k}</td><td className="fw-semibold" style={{fontSize:'0.78rem'}}>{v}</td></tr>
              ))}
            </tbody></table>
          </div>
        </div>
        <div className="col-md-8">
          <div className="card border-0 shadow-sm">
            <div className="card-header bg-white border-bottom"><h6 className="mb-0 fw-bold">Edit Profile</h6></div>
            <div className="card-body">
              <form onSubmit={handleSave}>
                <div className="row g-3">
                  <div className="col-md-6"><label className="form-label">Phone</label><input className="form-control" value={form.phone||''} onChange={e=>setForm({...form,phone:e.target.value})} placeholder="Phone number" /></div>
                  <div className="col-md-6"><label className="form-label">Blood Group</label><select className="form-select" value={form.blood_group||''} onChange={e=>setForm({...form,blood_group:e.target.value})}><option value="">Select</option>{['A+','A-','B+','B-','O+','O-','AB+','AB-'].map(b=><option key={b}>{b}</option>)}</select></div>
                  <div className="col-12"><label className="form-label">Address</label><input className="form-control" value={form.address||''} onChange={e=>setForm({...form,address:e.target.value})} placeholder="Full address" /></div>
                  <div className="col-md-6"><label className="form-label">Emergency Contact</label><input className="form-control" value={form.emergency_contact||''} onChange={e=>setForm({...form,emergency_contact:e.target.value})} /></div>
                  <div className="col-md-6"><label className="form-label">Skills <small className="text-muted">(comma separated)</small></label><input className="form-control" value={Array.isArray(form.skills)?form.skills.join(', '):''} onChange={e=>setForm({...form,skills:e.target.value.split(',').map(s=>s.trim()).filter(Boolean)})} placeholder="Python, React" /></div>
                  <div className="col-12"><button type="submit" className="btn btn-primary" disabled={saving}>{saving?<><span className="spinner-border spinner-border-sm me-2"></span>Saving...</>:'Save Changes'}</button></div>
                </div>
              </form>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function Employees() {
  const { user } = useAuth();
  const isHRExec = ['CEO','CFO','CIO','CTO','HR'].includes(user?.role);
  if (!isHRExec) return <MyProfile />;

  const [employees, setEmployees]       = useState([]);
  const [total, setTotal]               = useState(0);
  const [loading, setLoading]           = useState(true);
  const [search, setSearch]             = useState('');
  const [filterDept, setFilterDept]     = useState('');
  const [filterRole, setFilterRole]     = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [page, setPage]                 = useState(1);
  const [perPage, setPerPage]           = useState(10);
  const [selectedEmp, setSelectedEmp]   = useState(null);
  const [msg, setMsg]                   = useState({ text:'', type:'' });

  const notify = (text, type='success') => { setMsg({ text, type }); setTimeout(() => setMsg({ text:'', type:'' }), 3000); };

  const load = (resetPage=false) => {
    setLoading(true); if (resetPage) setPage(1);
    let q = '?';
    if (search)       q += `search=${search}&`;
    if (filterDept)   q += `department=${filterDept}&`;
    if (filterRole)   q += `role=${filterRole}&`;
    if (filterStatus) q += `status=${filterStatus}&`;
    fetcher.get(GET_EMPLOYEES + q).then(Data => { setEmployees(Data.employees); setTotal(Data.total||Data.employees.length); }).catch(console.error).finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  const handleClear = () => { setSearch(''); setFilterDept(''); setFilterRole(''); setFilterStatus(''); setTimeout(() => load(true), 50); };
  const handleDeactivate = async (id) => { if (!window.confirm(`Deactivate ${id}?`)) return; try { await fetcher.patch(DEACTIVATE_EMPLOYEE(id)); notify(`${id} deactivated`); load(); } catch(Err) { notify(Err.message,'danger'); } };
  const handleReactivate = async (id) => { try { await fetcher.patch(REACTIVATE_EMPLOYEE(id)); notify(`${id} reactivated`); load(); } catch(Err) { notify(Err.message,'danger'); } };

  const totalPages = Math.ceil(employees.length / perPage);
  const paginated  = employees.slice((page-1)*perPage, page*perPage);
  const canAction  = ['HR','CEO'].includes(user?.role);

  return (
    <div className="p-4">
      <div className="d-flex justify-content-between align-items-center mb-3">
        <div><h5 className="fw-bold mb-0">Employees</h5><small className="text-muted">{total} total</small></div>
      </div>

      {msg.text && <div className={`alert alert-${msg.type} alert-dismissible py-2`}>{msg.text}<button className="btn-close" onClick={()=>setMsg({text:'',type:''})}></button></div>}

      <div className="card border-0 shadow-sm mb-3">
        <div className="card-body py-3">
          <form onSubmit={e=>{e.preventDefault();load(true);}}>
            <div className="row g-2 align-items-end">
              <div className="col-md-3"><label className="form-label mb-1" style={{fontSize:'0.8rem'}}>Search</label><input className="form-control form-control-sm" placeholder="Name, email, ID..." value={search} onChange={e=>setSearch(e.target.value)} /></div>
              <div className="col-md-2"><label className="form-label mb-1" style={{fontSize:'0.8rem'}}>Department</label><select className="form-select form-select-sm" value={filterDept} onChange={e=>setFilterDept(e.target.value)}><option value="">All</option>{['Engineering','Technology','Finance','HR','Marketing','Operations','Sales','Management'].map(d=><option key={d}>{d}</option>)}</select></div>
              <div className="col-md-2"><label className="form-label mb-1" style={{fontSize:'0.8rem'}}>Role</label><select className="form-select form-select-sm" value={filterRole} onChange={e=>setFilterRole(e.target.value)}><option value="">All</option>{['CEO','CFO','CIO','CTO','HR','Manager','Employee','Intern'].map(r=><option key={r}>{r}</option>)}</select></div>
              <div className="col-md-2"><label className="form-label mb-1" style={{fontSize:'0.8rem'}}>Status</label><select className="form-select form-select-sm" value={filterStatus} onChange={e=>setFilterStatus(e.target.value)}><option value="">All</option>{['Active','Inactive','Notice Period','Terminated','Resigned'].map(s=><option key={s}>{s}</option>)}</select></div>
              <div className="col-md-3 d-flex gap-2"><button type="submit" className="btn btn-primary btn-sm"><i className="bi bi-search me-1"></i>Search</button><button type="button" className="btn btn-outline-secondary btn-sm" onClick={handleClear}><i className="bi bi-x me-1"></i>Clear</button></div>
            </div>
          </form>
        </div>
      </div>

      <div className="card border-0 shadow-sm">
        <div className="table-responsive">
          {loading ? <div className="text-center py-5"><div className="spinner-border text-primary"></div></div>
          : paginated.length===0 ? <div className="text-center py-5 text-muted"><i className="bi bi-people" style={{fontSize:'2rem'}}></i><p className="mt-2 mb-0">No employees found</p></div>
          : (
            <table className="table table-hover mb-0">
              <thead className="table-light"><tr><th>Employee</th><th>ID</th><th>Role</th><th>Department</th><th>Manager</th><th>Joining Date</th><th>Status</th>{canAction&&<th>Actions</th>}</tr></thead>
              <tbody>
                {paginated.map((emp,i) => (
                  <tr key={i}>
                    <td><div className="d-flex align-items-center gap-2"><Avatar name={`${emp.first_name} ${emp.last_name}`} size={34} /><div><div className="fw-semibold" style={{fontSize:'0.875rem'}}>{emp.first_name} {emp.last_name}</div><div className="text-muted" style={{fontSize:'0.75rem'}}>{emp.email}</div></div></div></td>
                    <td><code style={{fontSize:'0.8rem'}}>{emp.employee_id}</code></td>
                    <td><span className={`badge bg-${ROLE_COLOR[emp.role]||'secondary'} ${emp.role==='Intern'?'text-dark':''}`}>{emp.role}</span></td>
                    <td style={{fontSize:'0.875rem'}}>{emp.department}</td>
                    <td><code style={{fontSize:'0.75rem'}}>{emp.manager_id||'—'}</code></td>
                    <td style={{fontSize:'0.8rem'}}>{emp.joining_date}</td>
                    <td><span className={`badge bg-${STATUS_COLOR[emp.status]||'secondary'}`}>{emp.status}</span></td>
                    {canAction && <td><div className="d-flex gap-1">
                      <button className="btn btn-sm btn-outline-secondary" title="View" onClick={()=>setSelectedEmp(emp)}><i className="bi bi-eye"></i></button>
                      {emp.is_active ? <button className="btn btn-sm btn-outline-danger" title="Deactivate" onClick={()=>handleDeactivate(emp.employee_id)}><i className="bi bi-person-dash"></i></button>
                      : <button className="btn btn-sm btn-outline-success" title="Reactivate" onClick={()=>handleReactivate(emp.employee_id)}><i className="bi bi-person-check"></i></button>}
                    </div></td>}
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
        {employees.length>0 && (
          <div className="card-footer bg-white border-top d-flex justify-content-between align-items-center py-2">
            <div className="d-flex align-items-center gap-2">
              <small className="text-muted">Rows:</small>
              <select className="form-select form-select-sm" style={{width:70}} value={perPage} onChange={e=>{setPerPage(Number(e.target.value));setPage(1);}}>
                {[10,25,50].map(n=><option key={n}>{n}</option>)}
              </select>
              <small className="text-muted">{(page-1)*perPage+1}–{Math.min(page*perPage,employees.length)} of {employees.length}</small>
            </div>
            <nav><ul className="pagination pagination-sm mb-0">
              <li className={`page-item ${page===1?'disabled':''}`}><button className="page-link" onClick={()=>setPage(p=>p-1)}><i className="bi bi-chevron-left"></i></button></li>
              {Array.from({length:totalPages},(_,i)=>i+1).filter(p=>p===1||p===totalPages||Math.abs(p-page)<=1).map((p,idx,arr)=>(
                <Fragment key={p}>
                  {idx>0&&arr[idx-1]!==p-1&&<li className="page-item disabled"><span className="page-link">…</span></li>}
                  <li className={`page-item ${page===p?'active':''}`}><button className="page-link" onClick={()=>setPage(p)}>{p}</button></li>
                </Fragment>
              ))}
              <li className={`page-item ${page===totalPages?'disabled':''}`}><button className="page-link" onClick={()=>setPage(p=>p+1)}><i className="bi bi-chevron-right"></i></button></li>
            </ul></nav>
          </div>
        )}
      </div>
      {selectedEmp && <ProfileModal emp={selectedEmp} manager={employees.find(e=>e.employee_id===selectedEmp.manager_id)||null} onClose={()=>setSelectedEmp(null)} />}
    </div>
  );
}
