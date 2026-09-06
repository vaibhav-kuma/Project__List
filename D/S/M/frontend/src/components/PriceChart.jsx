import React from 'react';
import { useQuery } from 'react-query';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { format } from 'date-fns';
import { api } from '../utils/api';

const PriceChart = ({ jobId }) => {
  const { data: priceHistory, isLoading } = useQuery(
    ['priceHistory', jobId],
    () => jobId ? api.get(`/jobs/${jobId}/history?days=7`) : Promise.resolve({ products: [] }),
    {
      enabled: !!jobId,
      refetchInterval: 60000 // Refetch every minute
    }
  );

  if (isLoading) {
    return (
      <div className="h-64 flex items-center justify-center">
        <div className="animate-pulse text-gray-500">Loading price data...</div>
      </div>
    );
  }

  if (!priceHistory?.products || priceHistory.products.length === 0) {
    return (
      <div className="h-64 flex items-center justify-center">
        <div className="text-center">
          <div className="text-gray-500 mb-2">No price data available</div>
          <div className="text-sm text-gray-400">
            {jobId ? 'Run a job to see price trends' : 'Select a job to view price history'}
          </div>
        </div>
      </div>
    );
  }

  // Prepare chart data
  const chartData = [];
  const productColors = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6'];
  
  // Get all unique timestamps
  const allTimestamps = new Set();
  priceHistory.products.forEach(product => {
    product.history.forEach(point => {
      allTimestamps.add(point.timestamp);
    });
  });

  // Sort timestamps
  const sortedTimestamps = Array.from(allTimestamps).sort();

  // Create chart data points
  sortedTimestamps.forEach(timestamp => {
    const dataPoint = {
      timestamp,
      date: format(new Date(timestamp), 'MMM dd HH:mm')
    };

    priceHistory.products.slice(0, 5).forEach((product, index) => {
      const historyPoint = product.history.find(h => h.timestamp === timestamp);
      if (historyPoint) {
        dataPoint[`product_${index}`] = historyPoint.price;
      }
    });

    chartData.push(dataPoint);
  });

  const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white p-3 border border-gray-200 rounded-lg shadow-lg">
          <p className="text-sm font-medium text-gray-900 mb-2">{label}</p>
          {payload.map((entry, index) => {
            const productIndex = parseInt(entry.dataKey.split('_')[1]);
            const product = priceHistory.products[productIndex];
            return (
              <p key={index} className="text-sm" style={{ color: entry.color }}>
                <span className="font-medium">${entry.value?.toFixed(2)}</span>
                <span className="text-gray-600 ml-1 block truncate max-w-48">
                  {product?.title}
                </span>
              </p>
            );
          })}
        </div>
      );
    }
    return null;
  };

  return (
    <div className="h-64">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={chartData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
          <XAxis 
            dataKey="date" 
            stroke="#6b7280"
            fontSize={12}
            tick={{ fontSize: 12 }}
          />
          <YAxis 
            stroke="#6b7280"
            fontSize={12}
            tick={{ fontSize: 12 }}
            tickFormatter={(value) => `$${value}`}
          />
          <Tooltip content={<CustomTooltip />} />
          
          {priceHistory.products.slice(0, 5).map((product, index) => (
            <Line
              key={index}
              type="monotone"
              dataKey={`product_${index}`}
              stroke={productColors[index]}
              strokeWidth={2}
              dot={{ r: 3 }}
              activeDot={{ r: 5 }}
              connectNulls={false}
            />
          ))}
        </LineChart>
      </ResponsiveContainer>
      
      {/* Legend */}
      <div className="mt-4 space-y-1">
        {priceHistory.products.slice(0, 5).map((product, index) => (
          <div key={index} className="flex items-center text-xs">
            <div 
              className="w-3 h-3 rounded-full mr-2"
              style={{ backgroundColor: productColors[index] }}
            />
            <span className="text-gray-600 truncate">
              {product.title}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
};

export default PriceChart;