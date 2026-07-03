import { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { 
  LayoutDashboard, 
  User, 
  Heart, 
  DollarSign, 
  Calendar,
  Mail,
  Users,
  BookOpen,
  Settings,
  LogOut,
  ChevronLeft,
  ChevronRight,
  Image as ImageIcon,
  FileText,
  PlusSquare,
  Edit,
  Briefcase,
} from 'lucide-react';
import { notificationAPI } from '../../utils/api';

export default function Sidebar({ activeSection, onSectionChange }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [notificationCounts, setNotificationCounts] = useState({
    all: 0,
    prayer: 0,
    events: 0,
    groups: 0,
    changes: 0,
  });

  // Fetch notification counts (live)
  useEffect(() => {
    const fetchNotificationCounts = async () => {
      try {
        const res = await notificationAPI.getUserNotifications({ limit: 100, unreadOnly: true });
        const payload = res?.data || res || {};
        const items = payload.notifications || payload.data || [];
        const unread = payload.unread_count ?? items.length;

        const countsByType = items.reduce((acc, item) => {
          const type = (item.type || 'general').toLowerCase();
          acc[type] = (acc[type] || 0) + 1;
          return acc;
        }, {});

        setNotificationCounts({
          all: unread,
          prayer: countsByType.prayer || 0,
          events: countsByType.event || countsByType.events || 0,
          groups: countsByType.group || 0,
          changes: countsByType.change || countsByType.update || 0,
        });
      } catch (error) {
        console.error('Failed to load notification counts', error);
        setNotificationCounts((prev) => ({ ...prev, all: 0 }));
      }
    };

    fetchNotificationCounts();
  }, []);

  // Base menu items available to all users
  const baseMenuItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard, requiresAdmin: false, badgeKey: 'all' },
    { id: 'profile', label: 'My Profile', icon: User, requiresAdmin: false },
    { id: 'prayer', label: 'Prayer Requests', icon: Heart, requiresAdmin: false, badgeKey: 'prayer' },
    { id: 'giving', label: 'My Giving', icon: DollarSign, requiresAdmin: false },
    { id: 'events', label: 'My Events', icon: Calendar, requiresAdmin: false, badgeKey: 'events' },
    { id: 'groups', label: 'My Groups', icon: Users, requiresAdmin: false, badgeKey: 'groups' },
    { id: 'resources', label: 'Resources', icon: BookOpen, requiresAdmin: false },
  ];

  // Admin-only menu items
  const adminMenuItems = [
    { id: 'admin-members', label: 'Manage Members', icon: Users, requiresAdmin: true },
    { id: 'admin-events', label: 'Manage Events', icon: Calendar, requiresAdmin: true },
    { id: 'admin-giving', label: 'Giving Reports', icon: DollarSign, requiresAdmin: true },
    { 
      id: 'admin-contact', 
      label: 'Contact Inbox', 
      icon: Mail, 
      requiresAdmin: true,
      onClick: () => navigate('/admin/contact-messages')
    },
    { 
      id: 'admin-home-images', 
      label: 'Home Images', 
      icon: ImageIcon, 
      requiresAdmin: true, 
      onClick: () => navigate('/admin/home-images') 
    },
    { 
      id: 'blog-management', 
      label: 'Manage Blog', 
      icon: FileText, 
      requiresAdmin: true, 
      onClick: () => navigate('/blog/manage') 
    },
    {
      id: 'create-blog-post',
      label: 'Create Post',
      icon: PlusSquare,
      requiresAdmin: true,
      onClick: () => navigate('/blog/create')
    },
    {
      id: 'admin-careers',
      label: 'Manage Careers',
      icon: Briefcase,
      requiresAdmin: true,
      onClick: () => navigate('/admin/careers'),
    },
  ];

  // Settings menu item (for all users)
  const settingsMenuItem = { id: 'settings', label: 'Settings', icon: Settings, requiresAdmin: false };

  // Combine menu items based on user role
  const allMenuItems = [
    ...baseMenuItems,
    ...(isAdminUser(user) ? adminMenuItems : []),
    settingsMenuItem
  ];

  const initials = user?.name?.split(' ').map(n => n[0]).join('').toUpperCase() || 'U';

  const handleSectionChange = (sectionId) => {
    // Check if the item has a custom onClick handler
    const menuItem = allMenuItems.find(item => item.id === sectionId);
    if (menuItem?.onClick) {
      menuItem.onClick();
      return;
    }
    
    if (typeof onSectionChange === 'function') {
      onSectionChange(sectionId);
    } else {
      console.warn('onSectionChange is not a function');
    }
  };

  const handleLogout = () => {
    if (window.confirm('Are you sure you want to logout?')) {
      logout();
    }
  };

  const toggleSidebar = () => {
    setIsCollapsed(!isCollapsed);
  };

  const getRoleDisplayName = (role) => {
    const roleMap = {
      pastor: 'Pastor',
      admin: 'Administrator',
      superadmin: 'Administrator',
      member: 'Church Member',
      user: 'Church Member'
    };
    return roleMap[role] || 'Church Member';
  };

  const getBadgeCount = (badgeKey) => {
    return notificationCounts[badgeKey] || 0;
  };

  const shouldShowBadge = (badgeKey) => {
    return getBadgeCount(badgeKey) > 0;
  };

  // Helper function to check if user is admin
  function isAdminUser(user) {
    return user?.role === 'admin' || user?.role === 'pastor' || user?.role === 'superadmin' || user?.role === 'developer';
  }

  return (
    <div className={`bg-gradient-to-b from-purple-700 to-purple-800 text-white min-h-screen flex flex-col transition-all duration-300 ${
      isCollapsed ? 'w-20' : 'w-64'
    }`}>
      {/* Header */}
      <div className="p-6 border-b border-purple-600 relative">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 bg-purple-500 rounded-full flex items-center justify-center flex-shrink-0">
            <svg 
              className="w-5 h-5 text-white" 
              fill="none" 
              stroke="currentColor" 
              viewBox="0 0 24 24"
            >
              <path 
                strokeLinecap="round" 
                strokeLinejoin="round" 
                strokeWidth={2} 
                d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.746 0 3.332.477 4.5 1.253v13C19.832 18.477 18.246 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" 
              />
            </svg>
          </div>
          {!isCollapsed && (
            <div className="flex-1 min-w-0">
              <h1 className="font-bold text-lg">Eternal Love Church</h1>
              <p className="text-purple-200 text-sm">Member Portal</p>
            </div>
          )}
        </div>
        
        {/* Toggle Button */}
        <button
          onClick={toggleSidebar}
          className="absolute -right-3 top-1/2 transform -translate-y-1/2 bg-purple-600 hover:bg-purple-500 rounded-full p-1 transition-colors border-2 border-purple-700"
        >
          {isCollapsed ? (
            <ChevronRight size={16} className="text-white" />
          ) : (
            <ChevronLeft size={16} className="text-white" />
          )}
        </button>
      </div>

      {/* User Profile */}
      <div className="p-6 border-b border-purple-600">
        <div className="flex items-center space-x-3">
          <div className="w-12 h-12 bg-purple-500 rounded-full flex items-center justify-center font-semibold text-white flex-shrink-0">
            {initials}
          </div>
          {!isCollapsed && (
            <div className="flex-1 min-w-0">
              <p className="font-semibold truncate text-white">{user?.name || 'User'}</p>
              <p className="text-purple-200 text-sm truncate">
                {getRoleDisplayName(user?.role)}
              </p>
              {isAdminUser(user) && (
                <span className="inline-block bg-yellow-500 text-yellow-900 text-xs px-2 py-1 rounded-full mt-1 font-semibold">
                  Admin
                </span>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-4 overflow-y-auto">
        <ul className="space-y-2">
          {allMenuItems.map((item) => {
            const IconComponent = item.icon;
            const badgeCount = item.badgeKey ? getBadgeCount(item.badgeKey) : 0;
            const showBadge = item.badgeKey ? shouldShowBadge(item.badgeKey) : false;
            
            return (
              <li key={item.id}>
                <button
                  onClick={() => handleSectionChange(item.id)}
                  className={`w-full flex items-center space-x-3 px-4 py-3 rounded-lg transition-colors group ${
                    activeSection === item.id
                      ? 'bg-purple-600 text-white shadow-lg'
                      : 'text-purple-100 hover:bg-purple-600 hover:text-white'
                  } ${
                    isCollapsed ? 'justify-center' : ''
                  }`}
                  title={isCollapsed ? item.label : ''}
                >
                  <IconComponent 
                    size={20} 
                    className="flex-shrink-0" 
                  />
                  
                  {!isCollapsed && (
                    <>
                      <span className="flex-1 text-left font-medium">{item.label}</span>
                      {showBadge && (
                        <span className="bg-red-500 text-white text-xs px-2 py-1 rounded-full min-w-[20px] text-center">
                          {badgeCount > 99 ? '99+' : badgeCount}
                        </span>
                      )}
                      {item.requiresAdmin && (
                        <span className="bg-yellow-500 text-yellow-900 text-xs px-1 py-0.5 rounded text-center font-semibold">
                          Admin
                        </span>
                      )}
                    </>
                  )}
                  
                  {/* Tooltip for collapsed state */}
                  {isCollapsed && showBadge && (
                    <span className="absolute top-1 right-1 bg-red-500 text-white text-xs w-2 h-2 rounded-full"></span>
                  )}
                </button>
                
                {/* Tooltip for collapsed sidebar */}
                {isCollapsed && (
                  <div className="relative">
                    <div className="absolute left-full ml-2 px-2 py-1 bg-gray-900 text-white text-sm rounded opacity-0 group-hover:opacity-100 transition-opacity z-50 whitespace-nowrap">
                      {item.label}
                      {showBadge && ` (${badgeCount})`}
                      {item.requiresAdmin && ' (Admin)'}
                    </div>
                  </div>
                )}
              </li>
            );
          })}
        </ul>

        {/* Admin Section Separator */}
        {!isCollapsed && isAdminUser(user) && adminMenuItems.length > 0 && (
          <div className="mt-6 pt-4 border-t border-purple-600">
            <p className="text-purple-300 text-xs font-semibold uppercase tracking-wider px-4 mb-2">
              Administration
            </p>
          </div>
        )}
      </nav>

      {/* Footer */}
      <div className="p-4 border-t border-purple-600">
        <button
          onClick={handleLogout}
          className={`w-full flex items-center space-x-3 px-4 py-3 text-purple-100 hover:bg-purple-600 rounded-lg transition-colors ${
            isCollapsed ? 'justify-center' : ''
          }`}
          title={isCollapsed ? 'Sign Out' : ''}
        >
          <LogOut size={20} className="flex-shrink-0" />
          {!isCollapsed && <span className="font-medium">Sign Out</span>}
        </button>
      </div>
    </div>
  );
}
