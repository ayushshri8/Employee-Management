import { useState, useEffect } from 'react';
import { fetcher, GET_ACTIVITY_LOGS } from '../../api/endpoints';

export default function ActivityLogs() {
  const [logs, setLogs]       = useState([]);
  const [loading, setLoading] = useState(true);
  const [actorId, setActorId] = useState('');
  const [action, setAction]   = useState('');

  const load = () => {
    setLoading(true);
    let q = '?';
    if (actorId) q += `actor_id=${actorId}&`;
    if (action)  q += `action=${action}&`;
    q += 'limit=100';
    fetcher.get(GET_ACTIVITY_LOGS(q)).then(Data => setLogs(Data.logs)).catch(console.error).finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  return (
    <div className="p-4">
      <h5 className="fw-bold mb-3">Activity Logs</h5>
      <div className="row g-2 mb-3">
        <div className="col-md-3">
          <input className="form-control form-control-sm" placeholder="Filter by Employee ID..." value={actorId} onChange={e => setActorId(e.target.value)} />
        </div>
        <div className="col-md-3">
          <input className="form-control form-control-sm" placeholder="Filter by action..." value={action} onChange={e => setAction(e.target.value)} />
        </div>
        <div className="col-md-2">
          <button className="btn btn-primary btn-sm w-100" onClick={load}><i className="bi bi-search me-1"></i>Filter</button>
        </div>
        <div className="col-md-2">
          <button className="btn btn-outline-secondary btn-sm w-100" onClick={() => { setActorId(''); setAction(''); setTimeout(load, 100); }}>Clear</button>
        </div>
      </div>
      <div className="card border-0 shadow-sm">
        <div className="table-responsive">
          {loading ? (
            <div className="text-center py-5"><div className="spinner-border text-primary"></div></div>
          ) : logs.length === 0 ? (
            <div className="text-center py-5 text-muted"><i className="bi bi-clock-history" style={{fontSize:'2rem'}}></i><p className="mt-2">No logs found</p></div>
          ) : (
            <table className="table table-hover mb-0">
              <thead className="table-light">
                <tr><th>Actor</th><th>Action</th><th>Target</th><th>Status</th><th>Timestamp</th></tr>
              </thead>
              <tbody>
                {logs.map((l, i) => (
                  <tr key={i}>
                    <td><code style={{fontSize:'0.8rem'}}>{l.actor_id}</code></td>
                    <td><span className="badge bg-light text-dark border" style={{fontSize:'0.75rem'}}>{l.action}</span></td>
                    <td style={{fontSize:'0.8rem'}}>{l.target_id || '—'}</td>
                    <td><span className={`badge ${l.status==='success'?'bg-success':'bg-danger'}`} style={{fontSize:'0.7rem'}}>{l.status}</span></td>
                    <td style={{fontSize:'0.78rem'}}>{new Date(l.timestamp).toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}
