import React, { useState } from 'react';
import { Calculator, DollarSign, TrendingUp } from 'lucide-react';

const ROICalculator = ({ stats }) => {
  const [manualHours, setManualHours] = useState(20);
  const [hourlyRate, setHourlyRate] = useState(25);
  const [subscriptionCost, setSubscriptionCost] = useState(200);

  // Calculate savings and ROI
  const weeklySavings = manualHours * hourlyRate;
  const monthlySavings = weeklySavings * 4.33; // Average weeks per month
  const yearlySavings = monthlySavings * 12;
  const monthlyROI = ((monthlySavings - subscriptionCost) / subscriptionCost) * 100;
  const yearlyROI = ((yearlySavings - (subscriptionCost * 12)) / (subscriptionCost * 12)) * 100;

  // Additional value calculations
  const competitiveIntelligence = 500; // Monthly value of competitive insights
  const opportunityCost = 1000; // Monthly value of missed deals without automation
  const totalMonthlyValue = monthlySavings + competitiveIntelligence + opportunityCost;

  return (
    <div className="space-y-6">
      {/* Input Controls */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Manual Hours/Week
          </label>
          <input
            type="number"
            value={manualHours}
            onChange={(e) => setManualHours(Number(e.target.value))}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            min="1"
            max="80"
          />
        </div>
        
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Hourly Rate ($)
          </label>
          <input
            type="number"
            value={hourlyRate}
            onChange={(e) => setHourlyRate(Number(e.target.value))}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            min="10"
            max="200"
          />
        </div>
        
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Monthly Cost ($)
          </label>
          <input
            type="number"
            value={subscriptionCost}
            onChange={(e) => setSubscriptionCost(Number(e.target.value))}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            min="50"
            max="1000"
          />
        </div>
      </div>

      {/* ROI Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
          <div className="flex items-center space-x-2 mb-2">
            <DollarSign className="w-5 h-5 text-green-600" />
            <h3 className="font-medium text-green-900">Monthly Savings</h3>
          </div>
          <p className="text-2xl font-bold text-green-900">
            ${monthlySavings.toLocaleString()}
          </p>
          <p className="text-sm text-green-700 mt-1">
            ${weeklySavings}/week × 4.33 weeks
          </p>
        </div>

        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex items-center space-x-2 mb-2">
            <TrendingUp className="w-5 h-5 text-blue-600" />
            <h3 className="font-medium text-blue-900">Monthly ROI</h3>
          </div>
          <p className="text-2xl font-bold text-blue-900">
            {monthlyROI.toFixed(0)}%
          </p>
          <p className="text-sm text-blue-700 mt-1">
            ${(monthlySavings - subscriptionCost).toLocaleString()} net savings
          </p>
        </div>
      </div>

      {/* Detailed Breakdown */}
      <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
        <div className="flex items-center space-x-2 mb-3">
          <Calculator className="w-5 h-5 text-gray-600" />
          <h3 className="font-medium text-gray-900">Value Breakdown</h3>
        </div>
        
        <div className="space-y-3">
          <div className="flex justify-between items-center">
            <span className="text-sm text-gray-600">Labor Cost Savings</span>
            <span className="font-medium text-gray-900">
              ${monthlySavings.toLocaleString()}/month
            </span>
          </div>
          
          <div className="flex justify-between items-center">
            <span className="text-sm text-gray-600">Competitive Intelligence</span>
            <span className="font-medium text-gray-900">
              ${competitiveIntelligence.toLocaleString()}/month
            </span>
          </div>
          
          <div className="flex justify-between items-center">
            <span className="text-sm text-gray-600">Opportunity Cost Savings</span>
            <span className="font-medium text-gray-900">
              ${opportunityCost.toLocaleString()}/month
            </span>
          </div>
          
          <div className="border-t border-gray-300 pt-2">
            <div className="flex justify-between items-center">
              <span className="text-sm font-medium text-gray-900">Total Monthly Value</span>
              <span className="font-bold text-gray-900">
                ${totalMonthlyValue.toLocaleString()}
              </span>
            </div>
          </div>
          
          <div className="flex justify-between items-center">
            <span className="text-sm text-gray-600">Monthly Cost</span>
            <span className="font-medium text-red-600">
              -${subscriptionCost.toLocaleString()}
            </span>
          </div>
          
          <div className="border-t border-gray-300 pt-2">
            <div className="flex justify-between items-center">
              <span className="font-medium text-gray-900">Net Monthly Benefit</span>
              <span className="font-bold text-green-600">
                ${(totalMonthlyValue - subscriptionCost).toLocaleString()}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Annual Projections */}
      <div className="bg-gradient-to-r from-blue-50 to-green-50 border border-blue-200 rounded-lg p-4">
        <h3 className="font-medium text-gray-900 mb-3">Annual Projections</h3>
        
        <div className="grid grid-cols-2 gap-4">
          <div>
            <p className="text-sm text-gray-600">Total Savings</p>
            <p className="text-xl font-bold text-gray-900">
              ${(totalMonthlyValue * 12).toLocaleString()}
            </p>
          </div>
          
          <div>
            <p className="text-sm text-gray-600">Annual ROI</p>
            <p className="text-xl font-bold text-green-600">
              {yearlyROI.toFixed(0)}%
            </p>
          </div>
        </div>
        
        <div className="mt-3 p-3 bg-white rounded border border-blue-200">
          <p className="text-sm text-gray-700">
            <strong>Payback Period:</strong> {(subscriptionCost / (totalMonthlyValue - subscriptionCost)).toFixed(1)} months
          </p>
          <p className="text-sm text-gray-700 mt-1">
            <strong>Break-even:</strong> After {Math.ceil(subscriptionCost / (monthlySavings - subscriptionCost))} months of operation
          </p>
        </div>
      </div>

      {/* Business Impact */}
      {stats && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <h3 className="font-medium text-yellow-900 mb-2">Current Impact</h3>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <p className="text-yellow-700">Jobs Running: {stats.jobs?.active_jobs || 0}</p>
              <p className="text-yellow-700">Products Monitored: {stats.products?.unique_products || 0}</p>
            </div>
            <div>
              <p className="text-yellow-700">Price Drops Found: {stats.alerts?.price_drops || 0}</p>
              <p className="text-yellow-700">Alerts (24h): {stats.alerts?.alerts_24h || 0}</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ROICalculator;