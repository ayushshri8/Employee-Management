import { useState, useEffect } from 'react';
import { fetcher, CREATE_HIRING_REQUEST, GET_HIRING_REQUESTS, HIRING_HR_ACTION, HIRING_CEO_ACTION } from '../../api/endpoints';
import { useAuth } from '../../context/AuthContext';

const STATUS_BADGE = {
  pending_hr:  <span className="badge bg-warning text-dark">Pending HR</span>,
  pending_ceo: <span className="badge bg-info text-dark">Pending CEO</span>,
  approved:    <span className="badge bg-success">Approved</span>,
  rejected:    <span className="badge bg-danger">Rejected</span>,
};

export default function Hiring() {
  const { user } = useAuth();
  const [requests, setRequests]       = useState([]);
  const [loading, setLoading]         = useState(true);
  const [msg, setMsg]                 = useState({ text:'', type:'' });
  const [showForm, setShowForm]       = useState(false);
  const [actionModal, setActionModal] = useState(null);
  const [form, setForm]               = useState({ job_title:'', department:'', required_skills:'', reason:'', number_of_positions:1 });
  const [actionForm, setActionForm]   = useState({ action:'approve', remarks:'' });
  const [submitting, setSubmitting]   = useState(false);

  const load = () => { setLoading(true); fetcher.get(GET_HIRING_REQUESTS).then(Data => setRequests(Data.requests)).catch(console.error).finally(() => setLoading(false)); };
  useEffect(() => { load(); }, []);
  const notify = (text, type='success') => { setMsg({ text, type }); setTimeout(() => setMsg({ text:'', type:'' }), 3000); };

  const handleCreate = async (e) => {
    e.preventDefault(); setSubmitting(true);
    try {
      await fetcher.post(CREATE_HIRING_REQUEST, { ...form, required_skills: form.required_skills.split(',').map(s=>s.trim()).filter(Boolean), number_of_positions: Number(form.number_of_positions) });
      notify('Hiring request submitted'); setShowForm(false);
      setForm({ job_title:'', department:'', required_skills:'', reason:'', number_of_positions:1 }); load();
    } catch(Err) { notify(Err.message, 'danger'); } finally { setSubmitting(false); }
  };

  const handleAction = async (e) => {
    e.preventDefault(); setSubmitting(true);
    try {
      if (actionModal.actor === 'hr') await fetcher.patch(HIRING_HR_ACTION(actionModal.id), actionForm);
      else await fetcher.patch(HIRING_CEO_ACTION(actionModal.id), actionForm);
      notify(`Request ${actionForm.action}d`); setActionModal(null); load();
    } catch(Err) { notify(Err.message, 'danger'); } finally { setSubmitting(false); }
  };

  const canCreate = ['Manager','HR','CEO','CFO','CIO','CTO'].includes(user?.role);
  const isHR      = ['HR','CEO'].includes(user?.role);
  const isCEO     = user?.role === 'CEO';

  return (
    <div className="p-4">
      <div className="d-flex justify-content-between align-items-center mb-3">
        <h5 className="fw-bold mb-0">Hiring Requests</h5>
        {canCreate && <button className="btn btn-primary btn-sm" onClick={() => setShowForm(!showForm)}><i className="bi bi-plus-lg me-1"></i>New Request</button>}
      </div>

      {msg.text && <div className={`alert alert-${msg.type} py-2`}>{msg.text}</div>}

      {showForm && (
        <div className="card border-0 shadow-sm mb-4">
          <div className="card-header bg-white"><h6 className="mb-0 fw-bold">New Hiring Request</h6></div>
          <div className="card-body">
            <form onSubmit={handleCreate}>
              <div className="row g-3">
                <div className="col-md-6"><label className="form-label">Job Title</label><input className="form-control" required value={form.job_title} onChange={e=>setForm({...form,job_title:e.target.value})} placeholder="e.g. Backend Developer" /></div>
                <div className="col-md-6">
                  <label className="form-label">Department</label>
                  <select className="form-select" required value={form.department} onChange={e=>setForm({...form,department:e.target.value})}>
                    <option value="">Select</option>
                    {['Engineering','Technology','Finance','HR','Marketing','Operations','Sales','Management'].map(d=><option key={d}>{d}</option>)}
                  </select>
                </div>
                <div className="col-md-6"><label className="form-label">Required Skills <small className="text-muted">(comma separated)</small></label><input className="form-control" required value={form.required_skills} onChange={e=>setForm({...form,required_skills:e.target.value})} placeholder="Python, React" /></div>
                <div className="col-md-6"><label className="form-label">No. of Positions</label><input type="number" className="form-control" min={1} value={form.number_of_positions} onChange={e=>setForm({...form,number_of_positions:e.target.value})} /></div>
                <div className="col-12"><label className="form-label">Reason</label><textarea className="form-control" rows={2} required value={form.reason} onChange={e=>setForm({...form,reason:e.target.value})} placeholder="Why is this hire needed?" /></div>
                <div className="col-12 d-flex gap-2">
                  <button type="submit" className="btn btn-primary btn-sm" disabled={submitting}>{submitting?<span className="spinner-border spinner-border-sm"></span>:'Submit'}</button>
                  <button type="button" className="btn btn-outline-secondary btn-sm" onClick={()=>setShowForm(false)}>Cancel</button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      <div className="card border-0 shadow-sm">
        <div className="table-responsive">
          {loading ? <div className="text-center py-5"><div className="spinner-border text-primary"></div></div>
          : requests.length === 0 ? <div className="text-center py-5 text-muted"><i className="bi bi-briefcase" style={{fontSize:'2rem'}}></i><p className="mt-2">No hiring requests</p></div>
          : (
            <table className="table table-hover mb-0">
              <thead className="table-light"><tr><th>Job Title</th><th>Department</th><th>Requested By</th><th>Positions</th><th>Status</th><th>Date</th><th>Actions</th></tr></thead>
              <tbody>
                {requests.map((r,i) => (
                  <tr key={i}>
                    <td><div className="fw-semibold" style={{fontSize:'0.875rem'}}>{r.job_title}</div><div className="text-muted" style={{fontSize:'0.75rem'}}>{r.required_skills?.join(', ')}</div></td>
                    <td style={{fontSize:'0.875rem'}}>{r.department}</td>
                    <td style={{fontSize:'0.875rem'}}>{r.requested_by_name}</td>
                    <td><span className="badge bg-secondary">{r.number_of_positions}</span></td>
                    <td>{STATUS_BADGE[r.status]}</td>
                    <td style={{fontSize:'0.8rem'}}>{r.created_at?.split('T')[0]}</td>
                    <td>
                      {isHR && r.status==='pending_hr' && <button className="btn btn-sm btn-outline-primary" onClick={()=>{setActionModal({id:r.hiring_id,actor:'hr'});setActionForm({action:'approve',remarks:''});}}>Review</button>}
                      {isCEO && r.status==='pending_ceo' && <button className="btn btn-sm btn-outline-success" onClick={()=>{setActionModal({id:r.hiring_id,actor:'ceo'});setActionForm({action:'approve',remarks:''});}}>Decide</button>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {actionModal && (
        <div className="modal show d-block" style={{background:'rgba(0,0,0,0.5)'}}>
          <div className="modal-dialog"><div className="modal-content">
            <div className="modal-header"><h6 className="modal-title fw-bold">{actionModal.actor==='hr'?'HR Review':'CEO Decision'}</h6><button className="btn-close" onClick={()=>setActionModal(null)}></button></div>
            <form onSubmit={handleAction}>
              <div className="modal-body">
                <div className="mb-3"><label className="form-label">Decision</label><select className="form-select" value={actionForm.action} onChange={e=>setActionForm({...actionForm,action:e.target.value})}><option value="approve">Approve</option><option value="reject">Reject</option></select></div>
                <div className="mb-3"><label className="form-label">Remarks</label><textarea className="form-control" rows={2} value={actionForm.remarks} onChange={e=>setActionForm({...actionForm,remarks:e.target.value})} /></div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-outline-secondary btn-sm" onClick={()=>setActionModal(null)}>Cancel</button>
                <button type="submit" className="btn btn-primary btn-sm" disabled={submitting}>{submitting?<span className="spinner-border spinner-border-sm"></span>:'Submit'}</button>
              </div>
            </form>
          </div></div>
        </div>
      )}
    </div>
  );
}
