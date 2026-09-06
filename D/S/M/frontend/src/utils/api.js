import axios from 'axios';
import toast from 'react-hot-toast';

// Create axios instance
const apiClient = axios.create({
  baseURL: process.env.NODE_ENV === 'production' ? '/api' : 'http://localhost:3001/api',
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json'
  }
});

// Request interceptor
apiClient.interceptors.request.use(
  (config) => {
    // Add user ID if available
    const userId = localStorage.getItem('userId');
    if (userId) {
      config.headers['x-user-id'] = userId;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor
apiClient.interceptors.response.use(
  (response) => {
    // Return data directly for successful responses
    return response.data.data || response.data;
  },
  (error) => {
    // Handle different error types
    const message = error.response?.data?.error || error.message || 'An error occurred';
    
    // Don't show toast for certain status codes
    if (error.response?.status !== 404) {
      toast.error(message);
    }
    
    return Promise.reject(error);
  }
);

/**
 * API utility object with common HTTP methods
 */
export const api = {
  get: (url, config = {}) => apiClient.get(url, config),
  post: (url, data = {}, config = {}) => apiClient.post(url, data, config),
  put: (url, data = {}, config = {}) => apiClient.put(url, data, config),
  delete: (url, config = {}) => apiClient.delete(url, config),
  patch: (url, data = {}, config = {}) => apiClient.patch(url, data, config)
};

export default apiClient;