// components/giving/UserGivingStats.jsx
import { useState, useEffect } from 'react';
import { DollarSign, Calendar, TrendingUp, Gift } from 'lucide-react';
import { givingAPI } from '../../utils/api';
import Card from '../common/Card';
import LoadingSpinner from '../common/LoadingSpinner';

export default function UserGivingStats() {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchUserGivingStats();
  }, []);

  const fetchUserGivingStats = async () => {
    try {
      const userStats = await givingAPI.getUserStats();
      setStats(userStats);
    } catch (error) {
      console.error('Error fetching user giving stats:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <LoadingSpinner size="small" />;
  }

  if (!stats) {
    return (
      <Card className="p-6 text-center">
        <p className="text-gray-500">No giving data available</p>
      </Card>
    );
  }

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      <Card className="p-4 text-center">
        <div className="flex items-center justify-center mb-2">
          <DollarSign className="h-8 w-8 text-green-500" />
        </div>
        <div className="text-2xl font-bold text-gray-800">
          R {stats.totalGiven.toLocaleString()}
        </div>
        <div className="text-sm text-gray-600">Total Given</div>
      </Card>

      <Card className="p-4 text-center">
        <div className="flex items-center justify-center mb-2">
          <Gift className="h-8 w-8 text-blue-500" />
        </div>
        <div className="text-2xl font-bold text-gray-800">
          {stats.donationCount}
        </div>
        <div className="text-sm text-gray-600">Total Donations</div>
      </Card>

      <Card className="p-4 text-center">
        <div className="flex items-center justify-center mb-2">
          <TrendingUp className="h-8 w-8 text-purple-500" />
        </div>
        <div className="text-2xl font-bold text-gray-800">
          R {stats.monthlyAverage.toLocaleString()}
        </div>
        <div className="text-sm text-gray-600">Monthly Average</div>
      </Card>

      <Card className="p-4 text-center">
        <div className="flex items-center justify-center mb-2">
          <Calendar className="h-8 w-8 text-orange-500" />
        </div>
        <div className="text-lg font-bold text-gray-800">
          {stats.favoriteFund}
        </div>
        <div className="text-sm text-gray-600">Favorite Fund</div>
      </Card>
    </div>
  );
}