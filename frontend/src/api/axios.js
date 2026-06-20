import axios from 'axios';

const api = axios.create({
  baseURL: '/api',
  headers: { 'Content-Type': 'application/json' },
  timeout: 30000,
});

// ── Request Interceptor: attach JWT ──────────────────────────────────────────
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// ── Response Interceptor: handle 401 ─────────────────────────────────────────
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

// ─── Auth ─────────────────────────────────────────────────────────────────────
export const authAPI = {
  login: (credentials) => api.post('/auth/login', credentials),
  register: (data) => api.post('/auth/register', data),
  getMe: () => api.get('/auth/me'),
  changePassword: (data) => api.put('/auth/change-password', data),
};

// ─── Face (Admin-only register/reset, Employee verify) ───────────────────────
export const faceAPI = {
  // Admin registers face for a specific employee
  registerForEmployee: (employeeId, descriptor) =>
    api.post(`/face/register/${employeeId}`, { descriptor }),
  // Employee verifies their own face for attendance
  verify: (descriptor) => api.post('/face/verify', { descriptor }),
  // Admin resets an employee's face data
  resetEmployee: (employeeId) => api.delete(`/face/reset/${employeeId}`),
};

// ─── Attendance ───────────────────────────────────────────────────────────────
export const attendanceAPI = {
  checkIn: () => api.post('/attendance/in'),
  checkOut: () => api.post('/attendance/out'),
  getToday: () => api.get('/attendance/today'),
  getMine: (params) => api.get('/attendance/mine', { params }),
};

// ─── Admin ────────────────────────────────────────────────────────────────────
export const adminAPI = {
  getDashboard: () => api.get('/admin/dashboard'),
  getEmployees: (params) => api.get('/admin/employees', { params }),
  createEmployee: (data) => authAPI.register(data),
  updateEmployee: (id, data) => api.put(`/admin/employees/${id}`, data),
  deleteEmployee: (id) => api.delete(`/admin/employees/${id}`),
  getAllAttendance: (params) => api.get('/admin/attendance', { params }),
  downloadExcel: (params) =>
    api.get('/admin/report/excel', {
      params,
      responseType: 'blob',
    }),
  downloadPDF: (params) =>
    api.get('/admin/report/pdf', {
      params,
      responseType: 'blob',
    }),
  getReportSummary: (params) => api.get('/admin/report/summary', { params }),
  getSettings: () => api.get('/admin/settings'),
  updateSettings: (settings) => api.put('/admin/settings', settings),
  // Department management
  getDepartments: () => api.get('/admin/departments'),
  createDepartment: (data) => api.post('/admin/departments', data),
  updateDepartment: (id, data) => api.put(`/admin/departments/${id}`, data),
  deleteDepartment: (id) => api.delete(`/admin/departments/${id}`),
};

export default api;
