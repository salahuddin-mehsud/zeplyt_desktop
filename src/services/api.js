// src/services/api.js
import axios from 'axios';

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

export default api;