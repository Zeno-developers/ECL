import React from 'react'
import { useNavigate } from 'react-router-dom'
import { 
  LogOut, 
  Home, 
  Bell, 
  RefreshCw,
  Settings,
  Shield 
} from 'lucide-react'

export default function DashboardHeader({ 
  user, 
  title, 
  onLogout, 
  onRefresh, 
  isRefreshing = false,
  hasAdminAccess = false,
  isAdminDashboard = false,
  notificationCount = 0,
  showMainSiteButton = true,
  roleBadgeColor = 'bg-purple-100 text-purple-700'
}) {
  const navigate = useNavigate()

  const handleLogout = () => {
    if (window.confirm('Are you sure you want to logout?')) {
      onLogout()
    }
  }

  const handleGoHome = () => {
    navigate('/')
  }

  return (
    <header className="bg-white/80 backdrop-blur-sm shadow-sm border-b border-gray-200/50 flex-shrink-0">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center py-4">
          {/* Left: Logo and Title */}
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-3">
              {/* Logo */}
              <img 
                src="/images/logo.png" 
                alt="Eternal Love Church" 
                className="h-12 w-auto object-contain"
              />
              <div>
                <h1 className="text-xl sm:text-2xl font-bold text-gray-900">
                  {title}
                  {hasAdminAccess && <Shield size={16} className="inline ml-2 text-purple-600" />}
                </h1>
                <p className="text-xs sm:text-sm text-gray-600">
                  {new Date().toLocaleDateString('en-ZA', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
                </p>
              </div>
            </div>
            
            {/* Main Site Button */}
            {showMainSiteButton && (
              <button 
                onClick={handleGoHome}
                className="hidden sm:flex items-center space-x-2 px-3 py-2 bg-purple-100 hover:bg-purple-200 text-purple-700 rounded-lg transition-colors"
              >
                <Home size={16} />
                <span className="text-sm font-medium">Main Site</span>
              </button>
            )}
          </div>

          {/* Right: Actions and User Info */}
          <div className="flex items-center space-x-2 sm:space-x-4">
            {/* Refresh Button */}
            {onRefresh && (
              <button 
                onClick={onRefresh}
                disabled={isRefreshing}
                className="flex items-center space-x-2 px-2 sm:px-3 py-2 bg-white border border-gray-200 rounded-lg text-xs sm:text-sm text-gray-600 hover:bg-gray-50 disabled:opacity-50 transition-colors"
                title="Refresh dashboard"
              >
                <RefreshCw size={16} className={isRefreshing ? 'animate-spin' : ''} />
                <span className="hidden sm:inline">{isRefreshing ? 'Refreshing...' : 'Refresh'}</span>
              </button>
            )}

            {/* Notifications */}
            <button className="relative p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors" title="Notifications">
              <Bell size={20} />
              {notificationCount > 0 && (
                <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center font-semibold">
                  {notificationCount}
                </span>
              )}
            </button>

            {/* Settings */}
            <button 
              onClick={() => navigate('/settings')}
              className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors" 
              title="Settings"
            >
              <Settings size={20} />
            </button>
            
            {/* User Info */}
            <div className="hidden sm:flex items-center space-x-3 border-l border-gray-200 pl-4">
              <div className="text-right">
                <p className="font-semibold text-sm text-gray-900">{user?.name || 'User'}</p>
                <span className={`inline-block px-2 py-1 text-xs font-semibold rounded-full ${roleBadgeColor}`}>
                  {user?.role?.charAt(0).toUpperCase() + user?.role?.slice(1) || 'Member'}
                </span>
              </div>
              <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-blue-500 rounded-full flex items-center justify-center font-semibold text-white text-sm">
                {user?.name?.charAt(0) || 'U'}
              </div>
            </div>

            {/* Logout Button */}
            <button 
              onClick={handleLogout}
              className="flex items-center space-x-2 px-3 py-2 bg-red-100 hover:bg-red-200 text-red-700 rounded-lg transition-colors"
              title="Logout"
            >
              <LogOut size={16} />
              <span className="text-sm font-medium hidden sm:inline">Logout</span>
            </button>
          </div>
        </div>
      </div>
    </header>
  )
}
