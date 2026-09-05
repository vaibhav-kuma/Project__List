import React from 'react';
import { useQuery, useMutation, useQueryClient } from 'react-query';
import { TrendingDown, TrendingUp, ExternalLink, Check } from 'lucide-react';
import { format } from 'date-fns';
import { api } from '../utils/api';

const AlertsFeed = ({ jobId, limit = 20 }) => {
  const queryClient = useQueryClient();

  const { data: alerts = [], isLoading } = useQuery(
    ['alerts', jobId],
    () => {
      const url = jobId ? `/jobs/${jobId}/alerts` : '/jobs/dashboard/alerts';
      return api.get(`${url}?limit=${limit}`);
    },
    {
      refetchInterval: 30000,
      select: (data) => data.alerts || []
    }
  );

  const markAsReadMutation = useMutation(
    (alertId) => api.put(`/alerts/${alertId}/read`),
    {
      onSuccess: () => {
        queryClient.invalidateQueries(['alerts', jobId]);
      }
    }
  );

  const getAlertIcon = (alertType) => {
    switch (alertType) {
      case 'price_decrease':
        return <TrendingDown className="w-5 h-5 text-green-600" />;
      case 'price_increase':
        return <TrendingUp className="w-5 h-5 text-red-600" />;
      default:
        return <TrendingDown className="w-5 h-5 text-gray-600" />;
    }
  };

  const getAlertColor = (alertType) => {
    switch (alertType) {
      case 'price_decrease':
        return 'border-green-200 bg-green-50';
      case 'price_increase':
        return 'border-red-200 bg-red-50';
      default:
        return 'border-gray-200 bg-gray-50';
    }
  };

  const formatPriceChange = (alertType, changePercent) => {
    const sign = alertType === 'price_decrease' ? '-' : '+';
    return `${sign}${changePercent.toFixed(1)}%`;
  };

  if (isLoading) {
    return (
      <div className="space-y-3">
        {[1, 2, 3].map(i => (
          <div key={i} className="animate-pulse bg-gray-200 h-16 rounded-lg" />
        ))}
      </div>
    );
  }

  if (alerts.length === 0) {
    return (
      <div className="text-center py-8">
        <TrendingDown className="w-12 h-12 text-gray-400 mx-auto mb-4" />
        <p className="text-gray-500">No price alerts yet</p>
        <p className="text-sm text-gray-400 mt-1">
          {jobId ? 'Price changes will appear here' : 'Create monitoring jobs to get alerts'}
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3 max-h-96 overflow-y-auto scrollbar-thin">
      {alerts.map((alert) => (
        <div
          key={alert.id}
          className={`p-4 rounded-lg border ${getAlertColor(alert.alert_type)} ${
            alert.is_read ? 'opacity-60' : ''
          }`}
        >
          <div className="flex items-start justify-between">
            <div className="flex items-start space-x-3 flex-1">
              <div className="flex-shrink-0 mt-1">
                {getAlertIcon(alert.alert_type)}
              </div>
              
              <div className="flex-1 min-w-0">
                <h4 className="text-sm font-medium text-gray-900 truncate">
                  {alert.product_title}
                </h4>
                
                <div className="flex items-center space-x-4 mt-1">
                  <span className="text-sm text-gray-600">
                    ${alert.current_price?.toFixed(2)}
                  </span>
                  
                  {alert.previous_price && (
                    <>
                      <span className="text-xs text-gray-400">
                        was ${alert.previous_price.toFixed(2)}
                      </span>
                      <span className={`text-sm font-medium ${
                        alert.alert_type === 'price_decrease' ? 'text-green-600' : 'text-red-600'
                      }`}>
                        {formatPriceChange(alert.alert_type, alert.change_percent)}
                      </span>
                    </>
                  )}
                </div>
                
                <p className="text-xs text-gray-500 mt-2">
                  {format(new Date(alert.created_at), 'MMM dd, yyyy HH:mm')}
                </p>
              </div>
            </div>
            
            <div className="flex items-center space-x-2 ml-4">
              {alert.product_url && (
                <a
                  href={alert.product_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="p-1 text-gray-400 hover:text-blue-600 transition-colors"
                  title="View product"
                >
                  <ExternalLink className="w-4 h-4" />
                </a>
              )}
              
              {!alert.is_read && (
                <button
                  onClick={() => markAsReadMutation.mutate(alert.id)}
                  disabled={markAsReadMutation.isLoading}
                  className="p-1 text-gray-400 hover:text-green-600 transition-colors"
                  title="Mark as read"
                >
                  <Check className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>
        </div>
      ))}
      
      {alerts.length >= limit && (
        <div className="text-center py-4">
          <p className="text-sm text-gray-500">
            Showing latest {limit} alerts
          </p>
        </div>
      )}
    </div>
  );
};

export default AlertsFeed;