const BASE = import.meta.env.VITE_API_URL;

const request = async (method, path, body = null) => {
  const token = localStorage.getItem('token');
  const headers = { 'Content-Type': 'application/json' };
  if (token) headers['Authorization'] = `Bearer ${token}`;
  const options = { method, headers };
  if (body !== null) options.body = JSON.stringify(body);
  const res  = await fetch(`${BASE}${path}`, options);
  const data = await res.json();
  if (!res.ok) throw new Error(data.detail || 'Request failed');
  return data;
};

export const fetcher = {
  get:   (path)        => request('GET',   path),
  post:  (path, body)  => request('POST',  path, body),
  patch: (path, body)  => request('PATCH', path, body),
};

// AUTH
export const LOGIN_USER       = '/auth/login';
export const LOGOUT_USER      = '/auth/logout';
export const CHANGE_PASSWORD  = '/auth/change-password';
export const SETUP_MFA        = '/auth/mfa/setup';
export const VERIFY_MFA       = '/auth/mfa/verify';
export const DISABLE_MFA      = '/auth/mfa/disable';

// DASHBOARD
export const GET_EXECUTIVE_DASHBOARD = '/dashboard/executive';
export const GET_HR_DASHBOARD        = '/dashboard/hr';
export const GET_EMPLOYEE_DASHBOARD  = '/dashboard/employee';

// EMPLOYEES
export const CREATE_EMPLOYEE     = '/employees/create';
export const GET_EMPLOYEES       = '/employees/';
export const GET_MY_PROFILE      = '/employees/me';
export const UPDATE_MY_PROFILE   = '/employees/me';
export const DEACTIVATE_EMPLOYEE = (id) => `/employees/${id}/deactivate`;
export const REACTIVATE_EMPLOYEE = (id) => `/employees/${id}/reactivate`;
export const RESET_PASSWORD      = (id) => `/employees/${id}/reset-password`;
export const ADMIN_DISABLE_MFA   = (id) => `/employees/${id}/disable-mfa`;

// HIRING
export const CREATE_HIRING_REQUEST = '/hiring/request';
export const GET_HIRING_REQUESTS   = '/hiring/requests';
export const HIRING_HR_ACTION      = (id) => `/hiring/requests/${id}/hr-action`;
export const HIRING_CEO_ACTION     = (id) => `/hiring/requests/${id}/ceo-action`;

// ONBOARDING
export const CREATE_INVITE             = '/onboarding/invite';
export const SETUP_EMPLOYEE_PROFILE    = (id) => `/onboarding/setup/${id}`;
export const GET_ONBOARDING_REQUESTS   = '/onboarding/requests';
export const ONBOARDING_HR_ACTION      = (id) => `/onboarding/requests/${id}/hr-action`;
export const GET_HIERARCHY_ASSIGNMENTS = '/onboarding/hierarchy-assignments';
export const HIERARCHY_ASSIGN_ACTION   = (id) => `/onboarding/hierarchy-assignments/${id}/manager-action`;

// HIERARCHY
export const GET_ORG_TREE      = '/hierarchy/org-tree';
export const REASSIGN_MANAGER  = '/hierarchy/reassign';

// RESIGNATIONS
export const SUBMIT_RESIGNATION         = '/resignations/submit';
export const GET_RESIGNATIONS           = '/resignations/';
export const RESIGNATION_MANAGER_ACTION = (id) => `/resignations/${id}/manager-action`;
export const RESIGNATION_HR_ACTION      = (id) => `/resignations/${id}/hr-action`;
export const COMPLETE_NOTICE_PERIOD     = (id) => `/resignations/${id}/complete-notice`;

// TERMINATIONS
export const REQUEST_TERMINATION   = '/terminations/request';
export const GET_TERMINATIONS      = '/terminations/';
export const TERMINATION_HR_ACTION  = (id) => `/terminations/${id}/hr-action`;
export const TERMINATION_CEO_ACTION = (id) => `/terminations/${id}/ceo-action`;

// NOTIFICATIONS
export const GET_NOTIFICATIONS         = (unread = false) => `/notifications/${unread ? '?unread_only=true' : ''}`;
export const MARK_NOTIFICATION_READ    = (id) => `/notifications/${id}/read`;
export const MARK_ALL_NOTIFICATIONS_READ = '/notifications/read-all';

// ACTIVITY LOGS
export const GET_ACTIVITY_LOGS = (q = '') => `/activity/logs${q}`;