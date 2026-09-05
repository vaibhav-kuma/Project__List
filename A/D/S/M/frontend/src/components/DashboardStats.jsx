import React from 'react';
import { Activity, TrendingDown, TrendingUp, Zap, AlertTriangle } from 'lucide-react';

const DashboardStats = ({ stats }) => {
  if (!stats) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {[1, 2, 3, 4].map(i => (
          <div key={i} className="bg-white rounded-lg shadow p-6 animate-pulse">
            <div className="h-4 bg-gray-200 rounded mb-2" />
            <div className="h-8 bg-gray-200 rounded mb-2" />
            <div className="h-3 bg-gray-200 rounded w-1/2" />
          </div>
        ))}
      </div>
    );
  }

  const statCards = [
    {
      title: 'Active Jobs',
      value: stats.jobs?.active_jobs || 0,
      total: stats.jobs?.total_jobs || 0,
      icon: Activity,
      color: 'text-blue-600',
      bgColor: 'bg-blue-100',
      change: '+12%',
      changeType: 'positive'
    },
    {
      title: 'Price Drops',
      value: stats.alerts?.price_drops || 0,
      total: stats.alerts?.total_alerts || 0,
      icon: TrendingDown,
      color: 'text-green-600',
      bgColor: 'bg-green-100',
      change: '+8%',
      changeType: 'positive'
    },
    {
      title: 'Products Monitored',
      value: stats.products?.unique_products || 0,
      total: stats.products?.total_snapshots || 0,
      icon: Zap,
      color: 'text-purple-600',
      bgColor: 'bg-purple-100',
      change: '+24%',
      changeType: 'positive'
    },
    {
      title: 'Alerts (24h)',
      value: stats.alerts?.alerts_24h || 0,
      total: stats.alerts?.total_alerts || 0,
      icon: AlertTriangle,
      color: 'text-orange-600',
      bgColor: 'bg-orange-100',
      change: '-5%',
      changeType: 'negative'
    }
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
      {statCards.map((stat, index) => {
        const Icon = stat.icon;
        return (
          <div key={index} className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">{stat.title}</p>
                <p className="text-2xl font-bold text-gray-900 mt-1">
                  {stat.value.toLocaleString()}
                </p>
                {stat.total > 0 && (
                  <p className="text-xs text-gray-500 mt-1">
                    of {stat.total.toLocaleString()} total
                  </p>
                )}
              </div>
              <div className={`p-3 rounded-full ${stat.bgColor}`}>
                <Icon className={`w-6 h-6 ${stat.color}`} />
              </div>
            </div>
            
            <div className="mt-4 flex items-center">
              <span className={`text-sm font-medium ${
                stat.changeType === 'positive' ? 'text-green-600' : 'text-red-600'
              }`}>
                {stat.change}
              </span>
              <span className="text-sm text-gray-500 ml-1">vs last week</span>
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default DashboardStats;