import axios from 'axios';

// Configure base URL for API calls
// In Electron (file:// protocol), always use absolute localhost URL
// In browser, use env variable or default to localhost:8765
const isElectron = window.location.protocol === 'file:' || window.electronAPI?.isElectron;
const API_URL = isElectron 
  ? 'http://localhost:8765'
  : (import.meta.env.VITE_API_URL || 'http://localhost:8765');

// Create axios instance with default config
const apiClient = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

export default apiClient;
