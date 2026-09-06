import { useQuery } from 'react-query';
import { api } from '../utils/api';

/**
 * Hook for fetching dashboard statistics
 */
export const useDashboardStats = () => {
  return useQuery(
    'dashboardStats',
    () => api.get('/jobs/dashboard/stats'),
    {
      refetchInterval: 30000, // Refetch every 30 seconds
      staleTime: 15000, // Consider data stale after 15 seconds
      cacheTime: 60000, // Keep in cache for 1 minute
      retry: 2,
      onError: (error) => {
        console.error('Failed to fetch dashboard stats:', error);
      }
    }
  );
};