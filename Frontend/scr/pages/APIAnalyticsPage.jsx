import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { 
  BarChart3, 
  TrendingUp, 
  Users, 
  Zap, 
  Clock,
  DollarSign,
  Shield,
  Activity,
  AlertTriangle
} from 'lucide-react';

const APIAnalyticsPage = () => {
  const [timeRange, setTimeRange] = useState('30d');

  const usageData = {
    totalRequests: 125000,
    successfulRequests: 123750,
    failedRequests: 1250,
    averageResponseTime: 145,
    peakUsage: 2500,
    activeApiKeys: 3
  };

  const usageByEndpoint = [
    { endpoint: '/api/members', requests: 45000, successRate: 99.8 },
    { endpoint: '/api/events', requests: 32000, successRate: 99.5 },
    { endpoint: '/api/sermons', requests: 28000, successRate: 99.9 },
    { endpoint: '/api/chat', requests: 15000, successRate: 98.7 },
    { endpoint: '/api/auth', requests: 5000, successRate: 99.2 }
  ];

  const billingData = {
    currentPlan: 'Professional',
    monthlyCost: 49.99,
    requestsThisMonth: 12500,
    planLimit: 50000,
    overageCost: 0,
    projectedCost: 49.99
  };

  const getUsagePercentage = () => {
    return (billingData.requestsThisMonth / billingData.planLimit) * 100;
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">API Analytics</h1>
            <p className="text-gray-600">
              Monitor your API usage, performance, and billing information
            </p>
          </div>
          <select
            value={timeRange}
            onChange={(e) => setTimeRange(e.target.value)}
            className="border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-purple-500 focus:border-transparent"
          >
            <option value="7d">Last 7 days</option>
            <option value="30d">Last 30 days</option>
            <option value="90d">Last 90 days</option>
          </select>
        </div>

        {/* Key Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white rounded-lg border border-gray-200 p-6"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total Requests</p>
                <p className="text-2xl font-bold text-gray-900">
                  {usageData.totalRequests.toLocaleString()}
                </p>
              </div>
              <div className="p-3 bg-blue-100 rounded-lg">
                <BarChart3 size={24} className="text-blue-600" />
              </div>
            </div>
            <div className="flex items-center mt-2 text-sm text-green-600">
              <TrendingUp size={16} className="mr-1" />
              <span>+12% from last period</span>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="bg-white rounded-lg border border-gray-200 p-6"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Success Rate</p>
                <p className="text-2xl font-bold text-gray-900">
                  {((usageData.successfulRequests / usageData.totalRequests) * 100).toFixed(1)}%
                </p>
              </div>
              <div className="p-3 bg-green-100 rounded-lg">
                <Activity size={24} className="text-green-600" />
              </div>
            </div>
            <div className="flex items-center mt-2 text-sm text-green-600">
              <TrendingUp size={16} className="mr-1" />
              <span>+0.5% improvement</span>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="bg-white rounded-lg border border-gray-200 p-6"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Avg Response Time</p>
                <p className="text-2xl font-bold text-gray-900">
                  {usageData.averageResponseTime}ms
                </p>
              </div>
              <div className="p-3 bg-purple-100 rounded-lg">
                <Clock size={24} className="text-purple-600" />
              </div>
            </div>
            <div className="flex items-center mt-2 text-sm text-green-600">
              <TrendingUp size={16} className="mr-1" />
              <span>-15ms faster</span>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="bg-white rounded-lg border border-gray-200 p-6"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Active API Keys</p>
                <p className="text-2xl font-bold text-gray-900">
                  {usageData.activeApiKeys}
                </p>
              </div>
              <div className="p-3 bg-orange-100 rounded-lg">
                <Shield size={24} className="text-orange-600" />
              </div>
            </div>
            <div className="flex items-center mt-2 text-sm text-gray-600">
              <Users size={16} className="mr-1" />
              <span>Across all environments</span>
            </div>
          </motion.div>
        </div>

        <div className="grid lg:grid-cols-2 gap-8">
          {/* Usage by Endpoint */}
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Usage by Endpoint</h3>
            <div className="space-y-4">
              {usageByEndpoint.map((endpoint, index) => (
                <div key={index} className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-medium text-gray-900">{endpoint.endpoint}</span>
                      <span className="text-sm text-gray-600">
                        {endpoint.requests.toLocaleString()} requests
                      </span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div 
                        className="h-2 rounded-full bg-green-500"
                        style={{ 
                          width: `${(endpoint.requests / Math.max(...usageByEndpoint.map(e => e.requests))) * 100}%` 
                        }}
                      />
                    </div>
                  </div>
                  <div className="ml-4 text-right">
                    <span className={`text-sm font-medium ${
                      endpoint.successRate >= 99 ? 'text-green-600' : 
                      endpoint.successRate >= 95 ? 'text-yellow-600' : 'text-red-600'
                    }`}>
                      {endpoint.successRate}%
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Billing Overview */}
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Billing Overview</h3>
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <span className="text-gray-600">Current Plan</span>
                <span className="font-semibold text-gray-900">{billingData.currentPlan}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-600">Monthly Cost</span>
                <span className="font-semibold text-gray-900">${billingData.monthlyCost}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-600">Requests This Month</span>
                <span className="font-semibold text-gray-900">
                  {billingData.requestsThisMonth.toLocaleString()} / {billingData.planLimit.toLocaleString()}
                </span>
              </div>
              
              {/* Usage Progress */}
              <div className="pt-4">
                <div className="flex justify-between items-center mb-1">
                  <span className="text-sm text-gray-600">Usage</span>
                  <span className="text-sm text-gray-600">{getUsagePercentage().toFixed(1)}%</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div 
                    className={`h-2 rounded-full ${
                      getUsagePercentage() > 90 ? 'bg-red-500' :
                      getUsagePercentage() > 75 ? 'bg-yellow-500' : 'bg-green-500'
                    }`}
                    style={{ width: `${getUsagePercentage()}%` }}
                  />
                </div>
              </div>

              {getUsagePercentage() > 75 && (
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 mt-4">
                  <div className="flex items-center">
                    <AlertTriangle size={16} className="text-yellow-600 mr-2" />
                    <span className="text-sm text-yellow-800">
                      {getUsagePercentage() > 90 
                        ? 'You are approaching your plan limit. Consider upgrading.'
                        : 'Your usage is higher than usual.'
                      }
                    </span>
                  </div>
                </div>
              )}

              <div className="pt-4 border-t border-gray-200">
                <div className="flex justify-between items-center text-sm">
                  <span className="text-gray-600">Projected Cost</span>
                  <span className="font-semibold text-gray-900">
                    ${billingData.projectedCost}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Rate Limit Status */}
        <div className="mt-8 bg-white rounded-lg border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Rate Limit Status</h3>
          <div className="grid md:grid-cols-3 gap-6">
            <div className="text-center p-4 border border-gray-200 rounded-lg">
              <Zap size={32} className="mx-auto text-green-600 mb-2" />
              <h4 className="font-semibold text-gray-900">Free Plan</h4>
              <p className="text-gray-600 text-sm">100 requests/hour</p>
              <div className="mt-2 text-sm text-green-600">No throttling detected</div>
            </div>
            <div className="text-center p-4 border border-gray-200 rounded-lg">
              <Zap size={32} className="mx-auto text-blue-600 mb-2" />
              <h4 className="font-semibold text-gray-900">Basic Plan</h4>
              <p className="text-gray-600 text-sm">500 requests/hour</p>
              <div className="mt-2 text-sm text-green-600">No throttling detected</div>
            </div>
            <div className="text-center p-4 border border-gray-200 rounded-lg">
              <Zap size={32} className="mx-auto text-purple-600 mb-2" />
              <h4 className="font-semibold text-gray-900">Professional Plan</h4>
              <p className="text-gray-600 text-sm">1,000 requests/hour</p>
              <div className="mt-2 text-sm text-green-600">No throttling detected</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default APIAnalyticsPage;