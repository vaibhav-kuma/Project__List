import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { useMutation } from 'react-query';
import toast from 'react-hot-toast';
import { Plus, Loader2 } from 'lucide-react';
import { api } from '../utils/api';

/**
 * Job creation form component
 */
const CreateJobForm = ({ onJobCreated }) => {
  const [isExpanded, setIsExpanded] = useState(false);
  
  const { register, handleSubmit, reset, formState: { errors } } = useForm({
    defaultValues: {
      name: '',
      searchQuery: '',
      priceMin: '',
      priceMax: '',
      minRating: '',
      primeOnly: false,
      maxPages: 3,
      priceThreshold: 0.05,
      schedule: '0 */6 * * *'
    }
  });

  const createJobMutation = useMutation(
    (jobData) => api.post('/jobs', jobData),
    {
      onSuccess: (data) => {
        toast.success('Job created successfully!');
        reset();
        setIsExpanded(false);
        onJobCreated?.(data);
      },
      onError: (error) => {
        console.error('Failed to create job:', error);
      }
    }
  );

  const onSubmit = (data) => {
    const jobData = {
      ...data,
      filters: {
        priceMin: data.priceMin ? parseFloat(data.priceMin) : undefined,
        priceMax: data.priceMax ? parseFloat(data.priceMax) : undefined,
        minRating: data.minRating ? parseFloat(data.minRating) : undefined,
        primeOnly: data.primeOnly
      }
    };

    // Remove empty filter values
    Object.keys(jobData.filters).forEach(key => {
      if (jobData.filters[key] === undefined || jobData.filters[key] === '') {
        delete jobData.filters[key];
      }
    });

    createJobMutation.mutate(jobData);
  };

  if (!isExpanded) {
    return (
      <button
        onClick={() => setIsExpanded(true)}
        className="w-full flex items-center justify-center space-x-2 p-4 border-2 border-dashed border-gray-300 rounded-lg hover:border-blue-400 hover:bg-blue-50 transition-colors"
      >
        <Plus className="w-5 h-5 text-gray-400" />
        <span className="text-gray-600 font-medium">Create New Job</span>
      </button>
    );
  }

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-900">Create Monitoring Job</h3>
        <button
          onClick={() => setIsExpanded(false)}
          className="text-gray-400 hover:text-gray-600"
        >
          ×
        </button>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        {/* Job Name */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Job Name *
          </label>
          <input
            {...register('name', { required: 'Job name is required' })}
            type="text"
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            placeholder="e.g., Wireless Headphones Monitor"
          />
          {errors.name && (
            <p className="text-red-500 text-sm mt-1">{errors.name.message}</p>
          )}
        </div>

        {/* Search Query */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Search Query *
          </label>
          <input
            {...register('searchQuery', { required: 'Search query is required' })}
            type="text"
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            placeholder="e.g., wireless headphones"
          />
          {errors.searchQuery && (
            <p className="text-red-500 text-sm mt-1">{errors.searchQuery.message}</p>
          )}
        </div>

        {/* Filters */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Min Price ($)
            </label>
            <input
              {...register('priceMin')}
              type="number"
              step="0.01"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="0.00"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Max Price ($)
            </label>
            <input
              {...register('priceMax')}
              type="number"
              step="0.01"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="100.00"
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Min Rating
            </label>
            <select
              {...register('minRating')}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="">Any Rating</option>
              <option value="4">4+ Stars</option>
              <option value="4.5">4.5+ Stars</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Max Pages
            </label>
            <select
              {...register('maxPages', { valueAsNumber: true })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value={1}>1 Page</option>
              <option value={2}>2 Pages</option>
              <option value={3}>3 Pages</option>
              <option value={5}>5 Pages</option>
            </select>
          </div>
        </div>

        {/* Prime Only */}
        <div className="flex items-center">
          <input
            {...register('primeOnly')}
            type="checkbox"
            className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
          />
          <label className="ml-2 block text-sm text-gray-700">
            Prime eligible only
          </label>
        </div>

        {/* Advanced Settings */}
        <div className="border-t border-gray-200 pt-4">
          <h4 className="text-sm font-medium text-gray-700 mb-3">Advanced Settings</h4>
          
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Price Change Threshold
              </label>
              <select
                {...register('priceThreshold', { valueAsNumber: true })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value={0.05}>5% Change</option>
                <option value={0.10}>10% Change</option>
                <option value={0.15}>15% Change</option>
                <option value={0.20}>20% Change</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Schedule
              </label>
              <select
                {...register('schedule')}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="0 */6 * * *">Every 6 hours</option>
                <option value="0 */12 * * *">Every 12 hours</option>
                <option value="0 0 * * *">Daily</option>
                <option value="0 0 * * 0">Weekly</option>
              </select>
            </div>
          </div>
        </div>

        {/* Submit Button */}
        <div className="flex space-x-3 pt-4">
          <button
            type="submit"
            disabled={createJobMutation.isLoading}
            className="flex-1 flex items-center justify-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {createJobMutation.isLoading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Plus className="w-4 h-4" />
            )}
            <span>{createJobMutation.isLoading ? 'Creating...' : 'Create Job'}</span>
          </button>

          <button
            type="button"
            onClick={() => setIsExpanded(false)}
            className="px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
          >
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
};

export default CreateJobForm;