import axios from 'axios';

const API_BASE = process.env.REACT_APP_API_URL || 'http://localhost:3000/api';

const api = axios.create({
  baseURL: API_BASE,
  timeout: 30000,
});

export const jobsAPI = {
  // Create a new job
  create: async (jobData) => {
    const res = await api.post('/jobs', jobData);
    return res.data;
  },

  // Get job status
  getStatus: async (jobId) => {
    const res = await api.get(`/jobs/${jobId}`);
    return res.data;
  },

  // Get job results
  getResults: async (jobId, limit = 100) => {
    const res = await api.get(`/jobs/${jobId}/results`, { params: { limit } });
    return res.data;
  },

  // List all jobs
  list: async (limit = 20, offset = 0) => {
    const res = await api.get('/jobs', { params: { limit, offset } });
    return res.data;
  },
};

export default api;
