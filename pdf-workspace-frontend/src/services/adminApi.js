import axios from 'axios';

// Dynamically compute baseURL for adminApi (supports custom VITE_API_BASE_URL for Render deployment)
const getAdminBaseUrl = () => {
  const envUrl = import.meta.env.VITE_API_BASE_URL;
  if (envUrl) {
    const cleanUrl = envUrl.replace(/\/+$/, '');
    return cleanUrl.endsWith('/admin') ? cleanUrl : `${cleanUrl}/admin`;
  }
  return '/api/admin';
};

// Admin API Axios instance - scoped to /api/admin
const adminApi = axios.create({
  baseURL: getAdminBaseUrl(),
  timeout: 60000, // 60 second timeout for Render free tier cold starts
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor to automatically attach JWT Bearer token
adminApi.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('admin_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor to handle 401 Unauthorized (expired token)
adminApi.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response && error.response.status === 401) {
      localStorage.removeItem('admin_token');
      localStorage.removeItem('admin_user');
      if (!window.location.pathname.startsWith('/admin/login')) {
        window.location.href = '/admin/login';
      }
    }
    return Promise.reject(error);
  }
);

export default adminApi;
