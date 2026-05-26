export default function Footer() {
  return (
    <footer className="bg-white border-top py-3 px-4 d-flex justify-content-between align-items-center flex-wrap gap-2">
      <div className="d-flex align-items-center gap-2">
        <i className="bi bi-building-fill text-primary"></i>
        <span className="fw-semibold text-dark" style={{ fontSize: '0.85rem' }}>Diagonal HRMS</span>
        <span className="text-muted" style={{ fontSize: '0.8rem' }}>
          &copy; {new Date().getFullYear()} All rights reserved.
        </span>
      </div>
      <div className="d-flex align-items-center gap-3">
        <span className="text-muted" style={{ fontSize: '0.78rem' }}>
          <i className="bi bi-circle-fill text-success me-1" style={{ fontSize: '0.5rem' }}></i>
          System Online
        </span>
        <span className="badge bg-light text-muted border" style={{ fontSize: '0.72rem' }}>v3.0.0</span>
      </div>
    </footer>
  );
}
