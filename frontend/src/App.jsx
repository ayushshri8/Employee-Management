import { useState, useEffect } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';

// Pages
import Login         from './pages/auth/Login';
import Dashboard     from './pages/dashboard/Dashboard';
import Employees     from './pages/employees/Employees';
import Hiring        from './pages/hiring/Hiring';
import Onboarding    from './pages/onboarding/Onboarding';
import Hierarchy     from './pages/hierarchy/Hierarchy';
import Resignations  from './pages/resignations/Resignations';
import Terminations  from './pages/terminations/Terminations';
import Notifications from './pages/notifications/Notifications';
import ActivityLogs  from './pages/activity/ActivityLogs';

// Layout
import Sidebar from './components/layout/Sidebar';
import Topbar  from './components/layout/Topbar';
import Footer  from './components/layout/Footer';

// Modals
import MfaModal from './components/modals/MfaModal';

import './index.css';

const PAGE_TITLES = {
  dashboard:     'Dashboard',
  employees:     'Employees',
  hiring:        'Hiring Requests',
  onboarding:    'Onboarding',
  hierarchy:     'Organization Chart',
  resignations:  'Resignations',
  terminations:  'Terminations',
  notifications: 'Notifications',
  activity:      'Activity Logs',
};

function MfaPromptToast({ onEnable, onDismiss }) {
  return (
    <div className="position-fixed bottom-0 end-0 p-3" style={{ zIndex: 9999, maxWidth: 360 }}>
      <div className="toast show shadow-lg border-0" style={{ borderRadius: 12 }}>
        <div className="toast-header border-0" style={{ background: '#1e1b4b' }}>
          <i className="bi bi-shield-exclamation text-warning me-2"></i>
          <strong className="me-auto text-white" style={{ fontSize: '0.875rem' }}>Security Recommendation</strong>
          <button className="btn-close btn-close-white" onClick={onDismiss}></button>
        </div>
        <div className="toast-body" style={{ fontSize: '0.85rem' }}>
          <p className="mb-2"><strong>Two-Factor Authentication is not enabled.</strong> Enable it to secure your account.</p>
          <div className="d-flex gap-2">
            <button className="btn btn-primary btn-sm" onClick={onEnable}><i className="bi bi-shield-check me-1"></i>Enable MFA</button>
            <button className="btn btn-outline-secondary btn-sm" onClick={onDismiss}>Remind me later</button>
          </div>
        </div>
      </div>
    </div>
  );
}

function AppInner() {
  const { user, dismissMfaPrompt } = useAuth();
  const [page, setPage]                   = useState('dashboard');
  const [showMfaModal, setShowMfaModal]   = useState(false);
  const [showMfaPrompt, setShowMfaPrompt] = useState(false);

  useEffect(() => {
    if (user && !user.mfa_enabled) {
      const t = setTimeout(() => setShowMfaPrompt(true), 1500);
      return () => clearTimeout(t);
    }
  }, [user]);

  if (!user) return <Login onLogin={() => setPage('dashboard')} />;

  const renderPage = () => {
    switch (page) {
      case 'dashboard':     return <Dashboard />;
      case 'employees':     return <Employees />;
      case 'hiring':        return <Hiring />;
      case 'onboarding':    return <Onboarding />;
      case 'hierarchy':     return <Hierarchy />;
      case 'resignations':  return <Resignations />;
      case 'terminations':  return <Terminations />;
      case 'notifications': return <Notifications />;
      case 'activity':      return <ActivityLogs />;
      default:              return <Dashboard />;
    }
  };

  return (
    <div className="d-flex">
      <Sidebar active={page} onNavigate={setPage} />
      <div className="main-content w-100 d-flex flex-column" style={{ minHeight: '100vh' }}>
        <Topbar title={PAGE_TITLES[page] || 'Dashboard'} onMfa={() => setShowMfaModal(true)} />
        <div className="flex-grow-1">{renderPage()}</div>
        <Footer />
      </div>

      {showMfaModal && (
        <MfaModal
          onClose={() => setShowMfaModal(false)}
          onEnabled={() => {
            setShowMfaModal(false);
            setShowMfaPrompt(false);
            const u = JSON.parse(localStorage.getItem('user') || '{}');
            u.mfa_enabled = true;
            localStorage.setItem('user', JSON.stringify(u));
          }}
        />
      )}

      {showMfaPrompt && !user.mfa_enabled && (
        <MfaPromptToast
          onEnable={() => { setShowMfaPrompt(false); setShowMfaModal(true); }}
          onDismiss={() => { setShowMfaPrompt(false); dismissMfaPrompt(); }}
        />
      )}
    </div>
  );
}

export default function App() {
  return <AuthProvider><AppInner /></AuthProvider>;
}
