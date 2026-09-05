import React from 'react';
import { useQuery, useMutation, useQueryClient } from 'react-query';
import { Play, Pause, Trash2, Eye } from 'lucide-react';
import toast from 'react-hot-toast';
import { api } from '../utils/api';

const JobList = ({ selectedJob, onJobSelect, onJobUpdated }) => {
  const queryClient = useQueryClient();

  const { data: jobs = [], isLoading } = useQuery(
    'jobs',
    () => api.get('/jobs'),
    {
      refetchInterval: 10000,
      select: (data) => data.jobs || []
    }
  );

  const runJobMutation = useMutation(
    (jobId) => api.post(`/jobs/${jobId}/run`),
    {
      onSuccess: () => {
        toast.success('Job started successfully');
        queryClient.invalidateQueries('jobs');
        onJobUpdated?.();
      }
    }
  );

  const stopJobMutation = useMutation(
    (jobId) => api.put(`/jobs/${jobId}/stop`),
    {
      onSuccess: () => {
        toast.success('Job stopped');
        queryClient.invalidateQueries('jobs');
        onJobUpdated?.();
      }
    }
  );

  const deleteJobMutation = useMutation(
    (jobId) => api.delete(`/jobs/${jobId}`),
    {
      onSuccess: () => {
        toast.success('Job deleted');
        queryClient.invalidateQueries('jobs');
        onJobUpdated?.();
      }
    }
  );

  const getStatusColor = (status) => {
    switch (status) {
      case 'active': return 'bg-green-100 text-green-800';
      case 'paused': return 'bg-yellow-100 text-yellow-800';
      case 'stopped': return 'bg-gray-100 text-gray-800';
      case 'failed': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-3">
        {[1, 2, 3].map(i => (
          <div key={i} className="animate-pulse bg-gray-200 h-20 rounded-lg" />
        ))}
      </div>
    );
  }

  if (jobs.length === 0) {
    return (
      <div className="text-center py-8">
        <p className="text-gray-500">No monitoring jobs yet</p>
        <p className="text-sm text-gray-400 mt-1">Create your first job to get started</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <h3 className="text-sm font-medium text-gray-700 mb-3">
        Monitoring Jobs ({jobs.length})
      </h3>
      
      {jobs.map((job) => (
        <div
          key={job.id}
          className={`p-4 rounded-lg border cursor-pointer transition-all ${
            selectedJob?.id === job.id
              ? 'border-blue-500 bg-blue-50'
              : 'border-gray-200 hover:border-gray-300 bg-white'
          }`}
          onClick={() => onJobSelect(job)}
        >
          <div className="flex items-start justify-between mb-2">
            <h4 className="font-medium text-gray-900 text-sm truncate flex-1">
              {job.name}
            </h4>
            <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(job.status)}`}>
              {job.status}
            </span>
          </div>
          
          <p className="text-xs text-gray-600 mb-3 truncate">
            {job.search_query}
          </p>
          
          <div className="flex items-center justify-between">
            <div className="flex space-x-1">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  runJobMutation.mutate(job.id);
                }}
                disabled={runJobMutation.isLoading}
                className="p-1 text-green-600 hover:bg-green-100 rounded transition-colors"
                title="Run job"
              >
                <Play className="w-4 h-4" />
              </button>
              
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  stopJobMutation.mutate(job.id);
                }}
                disabled={stopJobMutation.isLoading}
                className="p-1 text-yellow-600 hover:bg-yellow-100 rounded transition-colors"
                title="Stop job"
              >
                <Pause className="w-4 h-4" />
              </button>
              
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onJobSelect(job);
                }}
                className="p-1 text-blue-600 hover:bg-blue-100 rounded transition-colors"
                title="View live"
              >
                <Eye className="w-4 h-4" />
              </button>
              
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  if (confirm('Are you sure you want to delete this job?')) {
                    deleteJobMutation.mutate(job.id);
                  }
                }}
                disabled={deleteJobMutation.isLoading}
                className="p-1 text-red-600 hover:bg-red-100 rounded transition-colors"
                title="Delete job"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
            
            <span className="text-xs text-gray-400">
              ID: {job.id}
            </span>
          </div>
        </div>
      ))}
    </div>
  );
};

export default JobList;