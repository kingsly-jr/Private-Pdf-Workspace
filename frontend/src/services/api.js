import axios from 'axios';

// Base API URL configured via environment variable or default relative /api proxy
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '/api';

const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 60000, // 60 second timeout for Render free-tier cold starts
  headers: {
    'Accept': 'application/json',
  },
});

export default api;
