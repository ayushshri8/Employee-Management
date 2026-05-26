import { useState, useEffect } from 'react';
import { fetcher, SUBMIT_RESIGNATION, GET_RESIGNATIONS, RESIGNATION_MANAGER_ACTION, RESIGNATION_HR_ACTION, COMPLETE_NOTICE_PERIOD } from '../../api/endpoints';
import { useAuth } from '../../context/AuthContext';

const STATUS_BADGE = {
  pending_manager: <span className="badge bg-warning text-dark">Pending Manager</span>,
  pending_hr:      <span className="badge bg-info text-dark">Pending HR</span>,
  approved:        <span className="badge bg-success">Approved</span>,
  rejected:        <span className="badge bg-danger">Rejected</span>,
  completed:       <span className="badge bg-secondary">Completed</span>,
};

export default function Resignations() {
  const { user } = useAuth();
  const [resignations, setResignations] = useState([]);
  const [loading, setLoading]           = useState(true);
  const [msg, setMsg]                   = useState({ text:'', type:'' });
  const [showForm, setShowForm]         = useState(false);
  const [actionModal, setActionModal]   = useState(null);
  const [form, setForm]                 = useState({ reason:'', last_working_day_preference:'' });
  const [actionForm, setActionForm]     = useState({ action:'approve', remarks:'' });
  const [submitting, setSubmitting]     = useState(false);

  const notify = (text, type='success') => { setMsg({ text, type }); setTimeout(() => setMsg({ text:'', type:'' }), 3000); };
  const load = () => { setLoading(true); fetcher.get(GET_RESIGNATIONS).then(Data => setResignations(Data.resignations)).catch(console.error).finally(() => setLoading(false)); };
  useEffect(() => { load(); }, []);

  const handleSubmit = async (e) => {
    e.preventDefault(); setSubmitting(true);
    try { await fetcher.post(SUBMIT_RESIGNATION, form); notify('Resignation submitted'); setShowForm(false); setForm({ reason:'', last_working_day_preference:'' }); load(); }
    catch(Err) { notify(Err.message, 'danger'); } finally { setSubmitting(false); }
  };

  const handleAction = async (e) => {
    e.preventDefault(); setSubmitting(true);
    try {
      if (actionModal.actor === 'manager') await fetcher.patch(RESIGNATION_MANAGER_ACTION(actionModal.id), actionForm);
      else if (actionModal.actor === 'hr') await fetcher.patch(RESIGNATION_HR_ACTION(actionModal.id), actionForm);
      else await fetcher.post(COMPLETE_NOTICE_PERIOD(actionModal.id), {});
      notify('Action submitted'); setActionModal(null); load();
    } catch(Err) { notify(Err.message, 'danger'); } finally { setSubmitting(false); }
  };

  const canSubmit = ['Employee','Manager','Intern'].includes(user?.role);
  const isMgr     = ['Manager','HR','CEO','CFO','CIO','CTO'].includes(user?.role);
  const isHR      = ['HR','CEO'].includes(user?.role);

  return (
    <div className="p-4">
      <div className="d-flex justify-content-between align-items-center mb-3">
        <h5 className="fw-bold mb-0">Resignations</h5>
        {canSubmit && <button className="btn btn-warning btn-sm" onClick={() => setShowForm(!showForm)}><i className="bi bi-box-arrow-right me-1"></i>Submit Resignation</button>}
      </div>

      {msg.text && <div className={`alert alert-${msg.type} py-2`}>{msg.text}</div>}

      {showForm && (
        <div className="card border-0 shadow-sm mb-4">
          <div className="card-header bg-white"><h6 className="mb-0 fw-bold">Submit Resignation</h6></div>
          <div className="card-body">
            <form onSubmit={handleSubmit}>
              <div className="row g-3">
                <div className="col-12"><label className="form-label">Reason</label><textarea className="form-control" rows={3} required value={form.reason} onChange={e=>setForm({...form,reason:e.target.value})} placeholder="Please provide your reason..." /></div>
                <div className="col-md-6"><label className="form-label">Preferred Last Working Day <small className="text-muted">(optional)</small></label><input type="date" className="form-control" value={form.last_working_day_preference} onChange={e=>setForm({...form,last_working_day_preference:e.target.value})} /></div>
                <div className="col-12 d-flex gap-2">
                  <button type="submit" className="btn btn-warning btn-sm" disabled={submitting}>{submitting?<span className="spinner-border spinner-border-sm"></span>:'Submit'}</button>
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
          : resignations.length === 0 ? <div className="text-center py-5 text-muted"><i className="bi bi-box-arrow-right" style={{fontSize:'2rem'}}></i><p className="mt-2">No resignations</p></div>
          : (
            <table className="table table-hover mb-0">
              <thead className="table-light"><tr><th>Employee</th><th>Department</th><th>Reason</th><th>Status</th><th>Notice End</th><th>Days Left</th><th>Actions</th></tr></thead>
              <tbody>
                {resignations.map((r,i) => (
                  <tr key={i}>
                    <td><div className="fw-semibold" style={{fontSize:'0.875rem'}}>{r.employee_name}</div><code style={{fontSize:'0.75rem'}}>{r.employee_id}</code></td>
                    <td style={{fontSize:'0.875rem'}}>{r.department}</td>
                    <td style={{fontSize:'0.8rem',maxWidth:180}}><span className="text-truncate d-block">{r.reason}</span></td>
                    <td>{STATUS_BADGE[r.status]}</td>
                    <td style={{fontSize:'0.8rem'}}>{r.notice_end_date?r.notice_end_date.split('T')[0]:'—'}</td>
                    <td>{r.days_remaining!=null?<span className={`badge ${r.days_remaining<=5?'bg-danger':'bg-info text-dark'}`}>{r.days_remaining}d</span>:'—'}</td>
                    <td>
                      {isMgr && r.status==='pending_manager' && <button className="btn btn-sm btn-outline-primary me-1" onClick={()=>{setActionModal({id:r.resignation_id,actor:'manager'});setActionForm({action:'approve',remarks:''});}}>Review</button>}
                      {isHR && r.status==='pending_hr' && <button className="btn btn-sm btn-outline-primary me-1" onClick={()=>{setActionModal({id:r.resignation_id,actor:'hr'});setActionForm({action:'approve',remarks:''});}}>Review</button>}
                      {isHR && r.status==='approved' && <button className="btn btn-sm btn-outline-secondary" onClick={()=>setActionModal({id:r.resignation_id,actor:'complete'})}>Complete</button>}
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
            <div className="modal-header"><h6 className="modal-title fw-bold">{actionModal.actor==='complete'?'Complete Notice Period':'Review Resignation'}</h6><button className="btn-close" onClick={()=>setActionModal(null)}></button></div>
            <form onSubmit={handleAction}>
              <div className="modal-body">
                {actionModal.actor==='complete' ? <p className="text-muted">This will mark notice period complete and deactivate the employee.</p> : (
                  <>
                    <div className="mb-3"><label className="form-label">Decision</label><select className="form-select" value={actionForm.action} onChange={e=>setActionForm({...actionForm,action:e.target.value})}><option value="approve">Approve</option><option value="reject">Reject</option></select></div>
                    <div className="mb-3"><label className="form-label">Remarks</label><textarea className="form-control" rows={2} value={actionForm.remarks} onChange={e=>setActionForm({...actionForm,remarks:e.target.value})} /></div>
                  </>
                )}
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-outline-secondary btn-sm" onClick={()=>setActionModal(null)}>Cancel</button>
                <button type="submit" className="btn btn-primary btn-sm" disabled={submitting}>{submitting?<span className="spinner-border spinner-border-sm"></span>:'Confirm'}</button>
              </div>
            </form>
          </div></div>
        </div>
      )}
    </div>
  );
}
