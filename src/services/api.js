// src/services/api.js
import axios from 'axios';
import { cacheResponse, cachedResponse } from './offlineStore';

const baseURL = import.meta.env.VITE_API_URL || 'http://localhost:4000/api';
console.log('🔍 VITE_API_URL:', import.meta.env.VITE_API_URL, '=> using baseURL:', baseURL);
const api = axios.create({
  baseURL,
});

// Public routes that don't need authentication
const publicRoutes = ['/api/data', '/api/packages', '/api/auth', '/api/public', '/api/webhook'];

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  const activeBranch = localStorage.getItem('activeBranch');
  if (activeBranch && !config.url.includes('/ai/') && !config.url.includes('/website/') && !config.url.includes('/public/')) {
    config.headers['X-Branch-Id'] = activeBranch;
  }
  return config;
});

// Cache successful reads for every desktop screen (catalog, dashboard,
// analytics, settings, etc.).  When the network drops Axios receives the last
// known response instead of leaving the POS blank.
api.interceptors.response.use(
  (response) => {
    if (response.config.method?.toLowerCase() === 'get') cacheResponse(response.config.url, response.data);
    return response;
  },
  (error) => {
    const config = error.config;
    if (config?.method?.toLowerCase() === 'get' && !error.response) {
      const data = cachedResponse(config.url);
      if (data !== undefined) return Promise.resolve({ data, status: 200, statusText: 'Offline cache', headers: {}, config });
    }
    return Promise.reject(error);
  },
);

export default api;
