import { useState, useEffect } from 'react';
import { fetcher, REQUEST_TERMINATION, GET_TERMINATIONS, TERMINATION_HR_ACTION, TERMINATION_CEO_ACTION } from '../../api/endpoints';
import { useAuth } from '../../context/AuthContext';

const STATUS_BADGE = {
  pending_hr:  <span className="badge bg-warning text-dark">Pending HR</span>,
  pending_ceo: <span className="badge bg-info text-dark">Pending CEO</span>,
  approved:    <span className="badge bg-danger">Terminated</span>,
  rejected:    <span className="badge bg-secondary">Rejected</span>,
};

export default function Terminations() {
  const { user } = useAuth();
  const [terminations, setTerminations] = useState([]);
  const [loading, setLoading]           = useState(true);
  const [msg, setMsg]                   = useState({ text:'', type:'' });
  const [showForm, setShowForm]         = useState(false);
  const [actionModal, setActionModal]   = useState(null);
  const [form, setForm]                 = useState({ employee_id:'', reason:'', evidence:'' });
  const [actionForm, setActionForm]     = useState({ action:'approve', remarks:'' });
  const [submitting, setSubmitting]     = useState(false);

  const notify = (text, type='success') => { setMsg({ text, type }); setTimeout(() => setMsg({ text:'', type:'' }), 3000); };
  const load = () => { setLoading(true); fetcher.get(GET_TERMINATIONS).then(Data => setTerminations(Data.terminations)).catch(console.error).finally(() => setLoading(false)); };
  useEffect(() => { load(); }, []);

  const handleSubmit = async (e) => {
    e.preventDefault(); setSubmitting(true);
    try { await fetcher.post(REQUEST_TERMINATION, form); notify('Termination request submitted'); setShowForm(false); setForm({ employee_id:'', reason:'', evidence:'' }); load(); }
    catch(Err) { notify(Err.message, 'danger'); } finally { setSubmitting(false); }
  };

  const handleAction = async (e) => {
    e.preventDefault(); setSubmitting(true);
    try {
      if (actionModal.actor==='hr') await fetcher.patch(TERMINATION_HR_ACTION(actionModal.id), actionForm);
      else await fetcher.patch(TERMINATION_CEO_ACTION(actionModal.id), actionForm);
      notify('Action submitted'); setActionModal(null); load();
    } catch(Err) { notify(Err.message, 'danger'); } finally { setSubmitting(false); }
  };

  const canRequest = ['Manager','HR','CEO','CFO','CIO','CTO'].includes(user?.role);
  const isHR       = ['HR','CEO'].includes(user?.role);
  const isCEO      = user?.role === 'CEO';

  return (
    <div className="p-4">
      <div className="d-flex justify-content-between align-items-center mb-3">
        <h5 className="fw-bold mb-0">Terminations</h5>
        {canRequest && <button className="btn btn-danger btn-sm" onClick={()=>setShowForm(!showForm)}><i className="bi bi-person-x me-1"></i>Request Termination</button>}
      </div>

      {msg.text && <div className={`alert alert-${msg.type} py-2`}>{msg.text}</div>}

      {showForm && (
        <div className="card border-0 shadow-sm mb-4">
          <div className="card-header bg-white"><h6 className="mb-0 fw-bold">Termination Request</h6></div>
          <div className="card-body">
            <form onSubmit={handleSubmit}>
              <div className="row g-3">
                <div className="col-md-6"><label className="form-label">Employee ID</label><input className="form-control" required value={form.employee_id} onChange={e=>setForm({...form,employee_id:e.target.value})} placeholder="e.g. EMP019" /></div>
                <div className="col-12"><label className="form-label">Reason</label><textarea className="form-control" rows={2} required value={form.reason} onChange={e=>setForm({...form,reason:e.target.value})} placeholder="Reason for termination..." /></div>
                <div className="col-12"><label className="form-label">Evidence <small className="text-muted">(optional)</small></label><input className="form-control" value={form.evidence} onChange={e=>setForm({...form,evidence:e.target.value})} placeholder="Warning letters..." /></div>
                <div className="col-12 d-flex gap-2">
                  <button type="submit" className="btn btn-danger btn-sm" disabled={submitting}>{submitting?<span className="spinner-border spinner-border-sm"></span>:'Submit'}</button>
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
          : terminations.length===0 ? <div className="text-center py-5 text-muted"><i className="bi bi-person-x" style={{fontSize:'2rem'}}></i><p className="mt-2">No termination requests</p></div>
          : (
            <table className="table table-hover mb-0">
              <thead className="table-light"><tr><th>Employee</th><th>Department</th><th>Reason</th><th>Requested By</th><th>Status</th><th>Date</th><th>Actions</th></tr></thead>
              <tbody>
                {terminations.map((t,i) => (
                  <tr key={i}>
                    <td><div className="fw-semibold" style={{fontSize:'0.875rem'}}>{t.employee_name}</div><code style={{fontSize:'0.75rem'}}>{t.employee_id}</code></td>
                    <td style={{fontSize:'0.875rem'}}>{t.department}</td>
                    <td style={{fontSize:'0.8rem',maxWidth:160}}><span className="text-truncate d-block">{t.reason}</span></td>
                    <td style={{fontSize:'0.8rem'}}>{t.requested_by_name}</td>
                    <td>{STATUS_BADGE[t.status]}</td>
                    <td style={{fontSize:'0.8rem'}}>{t.created_at?.split('T')[0]}</td>
                    <td>
                      {isHR && t.status==='pending_hr' && <button className="btn btn-sm btn-outline-primary" onClick={()=>{setActionModal({id:t.termination_id,actor:'hr'});setActionForm({action:'approve',remarks:''});}}>Review</button>}
                      {isCEO && t.status==='pending_ceo' && <button className="btn btn-sm btn-outline-danger" onClick={()=>{setActionModal({id:t.termination_id,actor:'ceo'});setActionForm({action:'approve',remarks:''});}}>Decide</button>}
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
            <div className="modal-header"><h6 className="modal-title fw-bold">{actionModal.actor==='hr'?'HR Review':'CEO Final Decision'}</h6><button className="btn-close" onClick={()=>setActionModal(null)}></button></div>
            <form onSubmit={handleAction}>
              <div className="modal-body">
                {actionModal.actor==='ceo' && <div className="alert alert-danger py-2 mb-3" style={{fontSize:'0.82rem'}}><i className="bi bi-exclamation-triangle me-2"></i>Approving will immediately deactivate the employee's account.</div>}
                <div className="mb-3"><label className="form-label">Decision</label><select className="form-select" value={actionForm.action} onChange={e=>setActionForm({...actionForm,action:e.target.value})}><option value="approve">Approve</option><option value="reject">Reject</option></select></div>
                <div className="mb-3"><label className="form-label">Remarks</label><textarea className="form-control" rows={2} value={actionForm.remarks} onChange={e=>setActionForm({...actionForm,remarks:e.target.value})} /></div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-outline-secondary btn-sm" onClick={()=>setActionModal(null)}>Cancel</button>
                <button type="submit" className="btn btn-danger btn-sm" disabled={submitting}>{submitting?<span className="spinner-border spinner-border-sm"></span>:'Confirm'}</button>
              </div>
            </form>
          </div></div>
        </div>
      )}
    </div>
  );
}
