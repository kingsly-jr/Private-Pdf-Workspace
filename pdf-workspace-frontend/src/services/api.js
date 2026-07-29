import axios from 'axios';

// Public API Axios instance - completely unauthenticated, zero auth headers
const api = axios.create({
  baseURL: '/api',
  headers: {
    'Accept': 'application/json',
  },
});

export default api;
