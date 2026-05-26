import { useState, useEffect } from 'react';
import { fetcher, CREATE_INVITE, GET_ONBOARDING_REQUESTS, ONBOARDING_HR_ACTION, GET_HIERARCHY_ASSIGNMENTS, HIERARCHY_ASSIGN_ACTION } from '../../api/endpoints';
import { useAuth } from '../../context/AuthContext';

const STATUS_BADGE = {
  profile_submitted:    <span className="badge bg-warning text-dark">Submitted</span>,
  hr_approved:          <span className="badge bg-success">HR Approved</span>,
  hr_rejected:          <span className="badge bg-danger">Rejected</span>,
  correction_requested: <span className="badge bg-info text-dark">Correction Needed</span>,
  pending:              <span className="badge bg-warning text-dark">Pending</span>,
  accepted:             <span className="badge bg-success">Accepted</span>,
  rejected:             <span className="badge bg-danger">Rejected</span>,
};

export default function Onboarding() {
  const { user } = useAuth();
  const [tab, setTab]                   = useState('requests');
  const [requests, setRequests]         = useState([]);
  const [assignments, setAssignments]   = useState([]);
  const [loading, setLoading]           = useState(true);
  const [msg, setMsg]                   = useState({ text:'', type:'' });
  const [showInvite, setShowInvite]     = useState(false);
  const [inviteResult, setInviteResult] = useState(null);
  const [actionModal, setActionModal]   = useState(null);
  const [assignModal, setAssignModal]   = useState(null);
  const [submitting, setSubmitting]     = useState(false);
  const [inviteForm, setInviteForm]     = useState({ first_name:'', last_name:'', email:'', role:'Employee', department:'', manager_id:'', job_title:'' });
  const [actionForm, setActionForm]     = useState({ action:'approve', remarks:'' });
  const [assignForm, setAssignForm]     = useState({ action:'accept', remarks:'' });

  const notify = (text, type='success') => { setMsg({ text, type }); setTimeout(() => setMsg({ text:'', type:'' }), 3000); };
  const isHR = ['HR','CEO'].includes(user?.role);

  const load = () => {
    setLoading(true);
    const p = [fetcher.get(GET_HIERARCHY_ASSIGNMENTS)];
    if (isHR) p.push(fetcher.get(GET_ONBOARDING_REQUESTS));
    Promise.all(p).then(([A, R]) => { setAssignments(A.assignments); if (R) setRequests(R.requests); }).catch(console.error).finally(() => setLoading(false));
  };
  useEffect(() => { load(); }, []);

  const handleInvite = async (e) => {
    e.preventDefault(); setSubmitting(true);
    try { const Res = await fetcher.post(CREATE_INVITE, inviteForm); setInviteResult(Res); setShowInvite(false); notify('Invite created'); load(); }
    catch(Err) { notify(Err.message, 'danger'); } finally { setSubmitting(false); }
  };

  const handleAction = async (e) => {
    e.preventDefault(); setSubmitting(true);
    try { await fetcher.patch(ONBOARDING_HR_ACTION(actionModal.id), actionForm); notify(`Request ${actionForm.action}d`); setActionModal(null); load(); }
    catch(Err) { notify(Err.message, 'danger'); } finally { setSubmitting(false); }
  };

  const handleAssign = async (e) => {
    e.preventDefault(); setSubmitting(true);
    try { await fetcher.patch(HIERARCHY_ASSIGN_ACTION(assignModal.id), assignForm); notify(`Employee ${assignForm.action}ed`); setAssignModal(null); load(); }
    catch(Err) { notify(Err.message, 'danger'); } finally { setSubmitting(false); }
  };

  return (
    <div className="p-4">
      <div className="d-flex justify-content-between align-items-center mb-3">
        <h5 className="fw-bold mb-0">Onboarding</h5>
        {isHR && <button className="btn btn-primary btn-sm" onClick={()=>setShowInvite(!showInvite)}><i className="bi bi-envelope-plus me-1"></i>Create Invite</button>}
      </div>

      {msg.text && <div className={`alert alert-${msg.type} py-2`}>{msg.text}</div>}

      {inviteResult && (
        <div className="alert alert-success">
          <strong>Invite Created!</strong>
          <div className="mt-2"><code>Invite ID: {inviteResult.invite_id}</code></div>
          <div><code>Temp Password: {inviteResult.temp_password}</code></div>
          <div className="text-muted" style={{fontSize:'0.8rem'}}>Expires: {inviteResult.expires_at?.split('T')[0]}</div>
          <button className="btn btn-sm btn-outline-secondary mt-2" onClick={()=>setInviteResult(null)}>Dismiss</button>
        </div>
      )}

      {showInvite && (
        <div className="card border-0 shadow-sm mb-4">
          <div className="card-header bg-white"><h6 className="mb-0 fw-bold">Create Employee Invite</h6></div>
          <div className="card-body">
            <form onSubmit={handleInvite}>
              <div className="row g-3">
                <div className="col-md-6"><label className="form-label">First Name</label><input className="form-control" required value={inviteForm.first_name} onChange={e=>setInviteForm({...inviteForm,first_name:e.target.value})} /></div>
                <div className="col-md-6"><label className="form-label">Last Name</label><input className="form-control" required value={inviteForm.last_name} onChange={e=>setInviteForm({...inviteForm,last_name:e.target.value})} /></div>
                <div className="col-md-6"><label className="form-label">Email</label><input type="email" className="form-control" required value={inviteForm.email} onChange={e=>setInviteForm({...inviteForm,email:e.target.value})} /></div>
                <div className="col-md-6"><label className="form-label">Job Title</label><input className="form-control" required value={inviteForm.job_title} onChange={e=>setInviteForm({...inviteForm,job_title:e.target.value})} /></div>
                <div className="col-md-4"><label className="form-label">Role</label><select className="form-select" value={inviteForm.role} onChange={e=>setInviteForm({...inviteForm,role:e.target.value})}>{['Employee','Manager','Intern','HR'].map(r=><option key={r}>{r}</option>)}</select></div>
                <div className="col-md-4"><label className="form-label">Department</label><select className="form-select" required value={inviteForm.department} onChange={e=>setInviteForm({...inviteForm,department:e.target.value})}><option value="">Select</option>{['Engineering','Technology','Finance','HR','Marketing','Operations','Sales','Management'].map(d=><option key={d}>{d}</option>)}</select></div>
                <div className="col-md-4"><label className="form-label">Manager ID</label><input className="form-control" required value={inviteForm.manager_id} onChange={e=>setInviteForm({...inviteForm,manager_id:e.target.value})} placeholder="e.g. EMP007" /></div>
                <div className="col-12 d-flex gap-2">
                  <button type="submit" className="btn btn-primary btn-sm" disabled={submitting}>{submitting?<span className="spinner-border spinner-border-sm"></span>:'Create Invite'}</button>
                  <button type="button" className="btn btn-outline-secondary btn-sm" onClick={()=>setShowInvite(false)}>Cancel</button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      <ul className="nav nav-tabs mb-3">
        {isHR && <li className="nav-item"><button className={`nav-link ${tab==='requests'?'active':''}`} onClick={()=>setTab('requests')}>Onboarding Requests <span className="badge bg-secondary ms-1">{requests.length}</span></button></li>}
        <li className="nav-item"><button className={`nav-link ${tab==='assignments'?'active':''}`} onClick={()=>setTab('assignments')}>Hierarchy Assignments <span className="badge bg-secondary ms-1">{assignments.length}</span></button></li>
      </ul>

      {loading ? <div className="text-center py-5"><div className="spinner-border text-primary"></div></div> : (
        <>
          {tab==='requests' && isHR && (
            <div className="card border-0 shadow-sm">
              <div className="table-responsive">
                {requests.length===0 ? <div className="text-center py-5 text-muted"><p>No onboarding requests</p></div> : (
                  <table className="table table-hover mb-0">
                    <thead className="table-light"><tr><th>Name</th><th>Email</th><th>Role</th><th>Department</th><th>Status</th><th>Action</th></tr></thead>
                    <tbody>
                      {requests.map((r,i) => (
                        <tr key={i}>
                          <td style={{fontSize:'0.875rem'}}>{r.first_name} {r.last_name}</td>
                          <td style={{fontSize:'0.8rem'}}>{r.email}</td>
                          <td><span className="badge bg-secondary">{r.role}</span></td>
                          <td style={{fontSize:'0.875rem'}}>{r.department}</td>
                          <td>{STATUS_BADGE[r.status]}</td>
                          <td>{['profile_submitted','correction_requested'].includes(r.status) && <button className="btn btn-sm btn-outline-primary" onClick={()=>{setActionModal({id:r.onboarding_id});setActionForm({action:'approve',remarks:''});}}>Review</button>}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            </div>
          )}
          {tab==='assignments' && (
            <div className="card border-0 shadow-sm">
              <div className="table-responsive">
                {assignments.length===0 ? <div className="text-center py-5 text-muted"><p>No assignments</p></div> : (
                  <table className="table table-hover mb-0">
                    <thead className="table-light"><tr><th>Employee ID</th><th>Manager ID</th><th>Status</th><th>Action</th></tr></thead>
                    <tbody>
                      {assignments.map((a,i) => (
                        <tr key={i}>
                          <td><code>{a.employee_id}</code></td>
                          <td><code>{a.manager_id}</code></td>
                          <td>{STATUS_BADGE[a.status]}</td>
                          <td>{a.status==='pending' && <button className="btn btn-sm btn-outline-primary" onClick={()=>{setAssignModal({id:a.assignment_id});setAssignForm({action:'accept',remarks:''});}}>Decide</button>}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            </div>
          )}
        </>
      )}

      {actionModal && (
        <div className="modal show d-block" style={{background:'rgba(0,0,0,0.5)'}}><div className="modal-dialog"><div className="modal-content">
          <div className="modal-header"><h6 className="modal-title fw-bold">Review Onboarding</h6><button className="btn-close" onClick={()=>setActionModal(null)}></button></div>
          <form onSubmit={handleAction}>
            <div className="modal-body">
              <div className="mb-3"><label className="form-label">Decision</label><select className="form-select" value={actionForm.action} onChange={e=>setActionForm({...actionForm,action:e.target.value})}><option value="approve">Approve</option><option value="reject">Reject</option><option value="request_correction">Request Correction</option></select></div>
              <div className="mb-3"><label className="form-label">Remarks</label><textarea className="form-control" rows={2} value={actionForm.remarks} onChange={e=>setActionForm({...actionForm,remarks:e.target.value})} /></div>
            </div>
            <div className="modal-footer"><button type="button" className="btn btn-outline-secondary btn-sm" onClick={()=>setActionModal(null)}>Cancel</button><button type="submit" className="btn btn-primary btn-sm" disabled={submitting}>{submitting?<span className="spinner-border spinner-border-sm"></span>:'Submit'}</button></div>
          </form>
        </div></div></div>
      )}

      {assignModal && (
        <div className="modal show d-block" style={{background:'rgba(0,0,0,0.5)'}}><div className="modal-dialog"><div className="modal-content">
          <div className="modal-header"><h6 className="modal-title fw-bold">Hierarchy Assignment</h6><button className="btn-close" onClick={()=>setAssignModal(null)}></button></div>
          <form onSubmit={handleAssign}>
            <div className="modal-body">
              <div className="mb-3"><label className="form-label">Decision</label><select className="form-select" value={assignForm.action} onChange={e=>setAssignForm({...assignForm,action:e.target.value})}><option value="accept">Accept</option><option value="reject">Reject</option></select></div>
              <div className="mb-3"><label className="form-label">Remarks</label><textarea className="form-control" rows={2} value={assignForm.remarks} onChange={e=>setAssignForm({...assignForm,remarks:e.target.value})} /></div>
            </div>
            <div className="modal-footer"><button type="button" className="btn btn-outline-secondary btn-sm" onClick={()=>setAssignModal(null)}>Cancel</button><button type="submit" className="btn btn-primary btn-sm" disabled={submitting}>{submitting?<span className="spinner-border spinner-border-sm"></span>:'Submit'}</button></div>
          </form>
        </div></div></div>
      )}
    </div>
  );
}
