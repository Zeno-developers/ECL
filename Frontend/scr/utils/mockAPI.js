// Mock data for development - Remove when real API is ready
export const mockDashboardData = {
  stats: [
    { label: 'Members', value: '1,247', icon: 'Users', color: 'bg-blue-500' },
    { label: 'Events', value: '8', icon: 'Calendar', color: 'bg-green-500' },
    { label: 'Sermons', value: '52', icon: 'Video', color: 'bg-purple-500' },
    { label: 'Growth', value: '+12.3%', icon: 'BarChart3', color: 'bg-orange-500' },
  ],
  recentActivity: [
    { text: 'New members joined this week', time: '2 hours ago', color: 'bg-green-500' },
    { text: 'Upcoming worship night', time: '1 day ago', color: 'bg-blue-500' },
    { text: 'Community outreach program', time: '3 days ago', color: 'bg-purple-500' },
  ],
  quickActions: [
    { title: 'Prayer Requests', icon: 'Heart', path: '/mobile/prayer', color: 'bg-red-50 text-red-600' },
    { title: 'Give Online', icon: 'DollarSign', path: '/mobile/giving', color: 'bg-green-50 text-green-600' },
    { title: 'Events', icon: 'Calendar', path: '/mobile/events', color: 'bg-blue-50 text-blue-600' },
    { title: 'Profile', icon: 'User', path: '/mobile/profile', color: 'bg-purple-50 text-purple-600' },
  ]
};

// Simulate API delay
const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

export const mockAPI = {
  getDashboardStats: async () => {
    await delay(1000);
    return mockDashboardData.stats;
  },
  
  getRecentActivity: async () => {
    await delay(800);
    return mockDashboardData.recentActivity;
  },
  
  getQuickActions: async () => {
    await delay(600);
    return mockDashboardData.quickActions;
  }
};
