import { createContext, useContext, useState, useEffect } from 'react';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser]   = useState(null);
  const [token, setToken] = useState(localStorage.getItem('token'));

  useEffect(() => {
    const saved = localStorage.getItem('user');
    if (saved) setUser(JSON.parse(saved));
  }, []);

  const login = (data) => {
    const userData = {
      employee_id: data.employee_id,
      role:        data.role,
      full_name:   data.full_name,
      mfa_enabled: data.mfa_enabled,
    };
    // Track how many times user has logged in without MFA
    const loginCount = parseInt(localStorage.getItem(`mfa_skip_${data.employee_id}`) || '0');
    localStorage.setItem(`mfa_skip_${data.employee_id}`, loginCount + 1);

    localStorage.setItem('token', data.access_token);
    localStorage.setItem('user', JSON.stringify(userData));
    setToken(data.access_token);
    setUser(userData);
  };

  const logout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setToken(null);
    setUser(null);
  };

  // How many times user logged in without enabling MFA
  const getMfaSkipCount = () => {
    if (!user) return 0;
    return parseInt(localStorage.getItem(`mfa_skip_${user.employee_id}`) || '0');
  };

  const dismissMfaPrompt = () => {
    if (!user) return;
    // Reset skip count so it prompts again after 3 more logins
    localStorage.setItem(`mfa_skip_${user.employee_id}`, '0');
  };

  return (
    <AuthContext.Provider value={{ user, token, login, logout, getMfaSkipCount, dismissMfaPrompt }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
