// components/UsageDashboard.jsx
import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { 
  BarChart3, 
  TrendingUp, 
  DollarSign, 
  Calendar,
  AlertTriangle
} from 'lucide-react';
import { API_CONFIG } from '../config/api';

const UsageDashboard = ({ apiKeyId }) => {
  const [usageData, setUsageData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchUsageData();
  }, [apiKeyId]);

  const fetchUsageData = async () => {
    try {
      const response = await fetch(`${API_CONFIG.BASE_URL}/developers/api-keys/${apiKeyId}/usage`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        setUsageData(data.data.usage);
      }
    } catch (error) {
      console.error('Failed to fetch usage data');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <div>Loading usage data...</div>;
  }

  if (!usageData) {
    return <div>No usage data available</div>;
  }

  const usagePercentage = Math.min((usageData.current / usageData.limit) * 100, 100);
  const isNearLimit = usagePercentage > 80;

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-6">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">Usage Overview</h3>
      
      {/* Usage Bar */}
      <div className="mb-6">
        <div className="flex justify-between items-center mb-2">
          <span className="text-sm font-medium text-gray-700">API Requests</span>
          <span className="text-sm text-gray-500">
            {usageData.current.toLocaleString()} / {usageData.limit.toLocaleString()}
          </span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-2">
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${usagePercentage}%` }}
            transition={{ duration: 1 }}
            className={`h-2 rounded-full ${
              isNearLimit ? 'bg-red-500' : 'bg-green-500'
            }`}
          />
        </div>
        {isNearLimit && (
          <div className="flex items-center mt-2 text-red-600 text-sm">
            <AlertTriangle size={16} className="mr-1" />
            You're approaching your monthly limit
          </div>
        )}
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-gray-50 p-4 rounded-lg">
          <div className="flex items-center mb-2">
            <BarChart3 size={20} className="text-blue-500 mr-2" />
            <span className="text-sm font-medium text-gray-700">Usage</span>
          </div>
          <div className="text-2xl font-bold text-gray-900">
            {usagePercentage.toFixed(1)}%
          </div>
        </div>

        <div className="bg-gray-50 p-4 rounded-lg">
          <div className="flex items-center mb-2">
            <TrendingUp size={20} className="text-green-500 mr-2" />
            <span className="text-sm font-medium text-gray-700">Requests</span>
          </div>
          <div className="text-2xl font-bold text-gray-900">
            {usageData.current.toLocaleString()}
          </div>
        </div>

        <div className="bg-gray-50 p-4 rounded-lg">
          <div className="flex items-center mb-2">
            <DollarSign size={20} className="text-purple-500 mr-2" />
            <span className="text-sm font-medium text-gray-700">Cost</span>
          </div>
          <div className="text-2xl font-bold text-gray-900">
            ${usageData.estimatedCost.toFixed(2)}
          </div>
        </div>

        <div className="bg-gray-50 p-4 rounded-lg">
          <div className="flex items-center mb-2">
            <Calendar size={20} className="text-orange-500 mr-2" />
            <span className="text-sm font-medium text-gray-700">Resets</span>
          </div>
          <div className="text-sm font-bold text-gray-900">
            {new Date(usageData.resetDate).toLocaleDateString()}
          </div>
        </div>
      </div>
    </div>
  );
};

export default UsageDashboard;
