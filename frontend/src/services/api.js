import axios from 'axios';

const API_BASE_URL = `${window.BACKEND_URL || 'http://localhost:8000'}/api`;

const api = axios.create({
  baseURL: API_BASE_URL,
});

// Auto-inject JWT token in Authorization headers
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('civicfix_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Global Error Handler interceptor
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response && error.response.status === 401) {
      // Clear credentials if token expired
      localStorage.removeItem('civicfix_token');
      localStorage.removeItem('civicfix_user');
      if (!window.location.pathname.includes('/auth') && window.location.pathname !== '/') {
        window.location.href = '/?session=expired';
      }
    }
    return Promise.reject(error);
  }
);

export const authAPI = {
  signup: (username, email, password, roleName = 'citizen') =>
    api.post('/auth/signup', { username, email, password, role_name: roleName }),
  login: (username, password) =>
    api.post('/auth/login', { username, password }),
  getMe: () => api.get('/auth/me'),
};

export const issuesAPI = {
  list: (params = {}) => api.get('/issues', { params }),
  get: (id) => api.get(`/issues/${id}`),
  checkDuplicates: (formData) =>
    api.post('/issues/check-duplicates', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }),
  create: (formData) =>
    api.post('/issues', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }),
  support: (id) => api.post(`/issues/${id}/support`),
  unsupport: (id) => api.delete(`/issues/${id}/support`),
  assign: (id, departmentId, assignedToId = null) =>
    api.post(`/issues/${id}/assign`, null, {
      params: { department_id: departmentId, assigned_to_id: assignedToId },
    }),
  resolve: (id, formData) =>
    api.post(`/issues/${id}/resolve`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }),
  verify: (id, verifyData) => api.post(`/issues/${id}/verify`, verifyData),
  getReportUrl: (id) => `${API_BASE_URL}/issues/${id}/report`,
};

export const deptsAPI = {
  list: () => api.get('/departments'),
  categories: () => api.get('/departments/categories'),
};

export const analyticsAPI = {
  dashboard: () => api.get('/analytics/dashboard'),
  hotspots: () => api.get('/analytics/hotspots'),
};

export const assistantAPI = {
  chat: (message, latitude = null, longitude = null) =>
    api.post('/assistant', { message, latitude, longitude }),
};

export const notificationAPI = {
  list: (unreadOnly = false) => api.get('/notifications', { params: { unread_only: unreadOnly } }),
  markRead: () => api.post('/notifications/read'),
};

export default api;
