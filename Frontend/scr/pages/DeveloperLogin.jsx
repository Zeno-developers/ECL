// pages/DeveloperLogin.jsx
import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { 
  Code, 
  Key, 
  Eye, 
  EyeOff, 
  Github, 
  BookOpen, 
  Terminal,
  Zap,
  Shield,
  Mail,
  Lock,
  UserPlus
} from 'lucide-react';
import { toast } from 'react-toastify';
import { useAuth } from '../contexts/AuthContext';

const DeveloperLogin = () => {
  const navigate = useNavigate();
  const { login } = useAuth();
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    apiKey: ''
  });
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [loginMethod, setLoginMethod] = useState('email'); // 'email' or 'apiKey'

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      if (loginMethod === 'email') {
        // Use the actual auth context login
        console.log('🔐 DeveloperLogin: Attempting email login');
        const result = await login(formData.email, formData.password);
        
        if (result.success) {
          console.log('✅ DeveloperLogin: Login successful', result.user);
          toast.success('Developer login successful!');
          
          // Check user role and redirect appropriately
          if (result.user.role === 'developer' || result.user.permissions?.includes('api:access')) {
            console.log('🔐 DeveloperLogin: User has developer access, redirecting to API keys');
            navigate('/developers/api-keys');
          } else {
            console.log('🔐 DeveloperLogin: Regular user, redirecting to dashboard');
            // Regular user - redirect to dashboard
            navigate('/dashboard');
          }
        } else {
          console.log('❌ DeveloperLogin: Login failed', result.error);
          toast.error(result.error || 'Login failed');
        }
      } else {
        // API key login - handle separately
        if (formData.apiKey) {
          console.log('🔐 DeveloperLogin: API key login attempted');
          // Store API key for direct authentication
          localStorage.setItem('apiKey', formData.apiKey);
          toast.success('API key authentication successful!');
          navigate('/api-docs');
        } else {
          toast.error('Please enter your API key');
        }
      }
    } catch (error) {
      console.error('❌ DeveloperLogin: Authentication error:', error);
      toast.error('Authentication failed. Please check your credentials.');
    } finally {
      setIsLoading(false);
    }
  };

  const quickLinks = [
    {
      icon: BookOpen,
      title: 'API Documentation',
      description: 'Complete API reference and guides',
      path: '/api-docs',
      color: 'bg-blue-500'
    },
    {
      icon: Key,
      title: 'Get API Keys',
      description: 'Create and manage your API keys',
      path: '/developers/api-keys',
      color: 'bg-green-500'
    },
    {
      icon: Github,
      title: 'GitHub Repository',
      description: 'View sample code and SDKs',
      external: true,
      url: 'https://github.com/yourchurch/api',
      color: 'bg-gray-800'
    },
    {
      icon: Terminal,
      title: 'API Playground',
      description: 'Test API endpoints in real-time',
      path: '/api-playground',
      color: 'bg-purple-500'
    }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 to-purple-900">
      <div className="flex min-h-screen">
        {/* Left Side - Login Form */}
        <div className="flex-1 flex flex-col justify-center py-12 px-4 sm:px-6 lg:px-20 xl:px-24">
          <div className="mx-auto w-full max-w-sm lg:w-96">
            {/* Header */}
            <div className="text-center lg:text-left">
              <Link to="/" className="flex items-center justify-center lg:justify-start space-x-3">
                <div className="w-10 h-10 bg-purple-600 rounded-lg flex items-center justify-center">
                  <Code className="h-6 w-6 text-white" />
                </div>
                <span className="text-xl font-bold text-white">ChurchDev API</span>
              </Link>
              <h2 className="mt-8 text-3xl font-bold text-white">
                Developer Portal
              </h2>
              <p className="mt-2 text-sm text-purple-200">
                Access tools and resources for building with our API
              </p>
            </div>

            {/* Login Method Toggle */}
            <div className="mt-8 bg-gray-800 rounded-lg p-1 flex">
              <button
                onClick={() => setLoginMethod('email')}
                className={`flex-1 py-2 px-3 rounded-md text-sm font-medium transition-colors ${
                  loginMethod === 'email'
                    ? 'bg-purple-600 text-white shadow'
                    : 'text-gray-300 hover:text-white'
                }`}
              >
                <Mail size={16} className="inline mr-2" />
                Email Login
              </button>
              <button
                onClick={() => setLoginMethod('apiKey')}
                className={`flex-1 py-2 px-3 rounded-md text-sm font-medium transition-colors ${
                  loginMethod === 'apiKey'
                    ? 'bg-purple-600 text-white shadow'
                    : 'text-gray-300 hover:text-white'
                }`}
              >
                <Key size={16} className="inline mr-2" />
                API Key Login
              </button>
            </div>

            {/* Login Form */}
            <form className="mt-6 space-y-6" onSubmit={handleSubmit}>
              {loginMethod === 'email' ? (
                <>
                  <div>
                    <label htmlFor="email" className="block text-sm font-medium text-gray-200">
                      Email address
                    </label>
                    <div className="mt-1">
                      <input
                        id="email"
                        name="email"
                        type="email"
                        autoComplete="email"
                        required
                        value={formData.email}
                        onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                        className="appearance-none block w-full px-3 py-2 border border-gray-600 rounded-md placeholder-gray-400 focus:outline-none focus:ring-purple-500 focus:border-purple-500 bg-gray-700 text-white sm:text-sm"
                        placeholder="developer@example.com"
                      />
                    </div>
                  </div>

                  <div>
                    <label htmlFor="password" className="block text-sm font-medium text-gray-200">
                      Password
                    </label>
                    <div className="mt-1 relative">
                      <input
                        id="password"
                        name="password"
                        type={showPassword ? 'text' : 'password'}
                        autoComplete="current-password"
                        required
                        value={formData.password}
                        onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                        className="appearance-none block w-full px-3 py-2 border border-gray-600 rounded-md placeholder-gray-400 focus:outline-none focus:ring-purple-500 focus:border-purple-500 bg-gray-700 text-white sm:text-sm pr-10"
                        placeholder="Enter your password"
                      />
                      <button
                        type="button"
                        className="absolute inset-y-0 right-0 pr-3 flex items-center"
                        onClick={() => setShowPassword(!showPassword)}
                      >
                        {showPassword ? (
                          <EyeOff className="h-4 w-4 text-gray-400" />
                        ) : (
                          <Eye className="h-4 w-4 text-gray-400" />
                        )}
                      </button>
                    </div>
                  </div>
                </>
              ) : (
                <div>
                  <label htmlFor="apiKey" className="block text-sm font-medium text-gray-200">
                    API Key
                  </label>
                  <div className="mt-1">
                    <input
                      id="apiKey"
                      name="apiKey"
                      type="text"
                      required
                      value={formData.apiKey}
                      onChange={(e) => setFormData({ ...formData, apiKey: e.target.value })}
                      className="appearance-none block w-full px-3 py-2 border border-gray-600 rounded-md placeholder-gray-400 focus:outline-none focus:ring-purple-500 focus:border-purple-500 bg-gray-700 text-white sm:text-sm font-mono"
                      placeholder="sk_live_..."
                    />
                  </div>
                  <p className="mt-2 text-xs text-gray-400">
                    Find your API keys in the developer dashboard
                  </p>
                </div>
              )}

              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  <input
                    id="remember-me"
                    name="remember-me"
                    type="checkbox"
                    className="h-4 w-4 text-purple-600 focus:ring-purple-500 border-gray-600 rounded bg-gray-700"
                  />
                  <label htmlFor="remember-me" className="ml-2 block text-sm text-gray-200">
                    Remember me
                  </label>
                </div>

                <div className="text-sm">
                  <a href="#" className="font-medium text-purple-400 hover:text-purple-300">
                    Forgot your password?
                  </a>
                </div>
              </div>

              <div>
                <button
                  type="submit"
                  disabled={isLoading}
                  className="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-purple-600 hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  {isLoading ? (
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  ) : (
                    <>
                      <Shield size={16} className="mr-2" />
                      {loginMethod === 'email' ? 'Sign in to Developer Portal' : 'Authenticate with API Key'}
                    </>
                  )}
                </button>
              </div>
            </form>

            {/* Alternative Options */}
            <div className="mt-6">
              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-gray-600" />
                </div>
                <div className="relative flex justify-center text-sm">
                  <span className="px-2 bg-gray-900 text-gray-400">New to our API?</span>
                </div>
              </div>

              <div className="mt-6 grid grid-cols-2 gap-3">
                <Link
                  to="/developers/register"
                  className="w-full inline-flex justify-center py-2 px-4 border border-gray-600 rounded-md shadow-sm bg-gray-800 text-sm font-medium text-gray-200 hover:bg-gray-700 transition-colors text-center items-center space-x-2"
                >
                  <UserPlus size={16} />
                  <span>Create Developer Account</span>
                </Link>
                <Link
                  to="/api-docs"
                  className="w-full inline-flex justify-center py-2 px-4 border border-gray-600 rounded-md shadow-sm bg-gray-800 text-sm font-medium text-gray-200 hover:bg-gray-700 transition-colors text-center items-center space-x-2"
                >
                  <BookOpen size={16} />
                  <span>Browse Documentation</span>
                </Link>
              </div>
            </div>
          </div>
        </div>

        {/* Right Side - Developer Resources */}
        <div className="hidden lg:block flex-1 relative">
          <div className="absolute inset-0 bg-gradient-to-r from-transparent to-gray-900 z-10" />
          <div className="absolute inset-0 bg-gray-900 opacity-50" />
          
          <div className="relative z-20 h-full flex items-center justify-center p-12">
            <div className="max-w-lg">
              <h3 className="text-2xl font-bold text-white mb-8 flex items-center">
                <Zap size={24} className="mr-2 text-yellow-400" />
                Developer Resources
              </h3>
              
              <div className="grid gap-4">
                {quickLinks.map((link, index) => (
                  <motion.a
                    key={index}
                    href={link.external ? link.url : link.path}
                    target={link.external ? '_blank' : '_self'}
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.1 }}
                    className="flex items-center p-4 bg-gray-800 bg-opacity-50 rounded-lg border border-gray-700 hover:border-purple-500 transition-colors group"
                  >
                    <div className={`p-2 rounded-lg ${link.color} mr-4`}>
                      <link.icon size={20} className="text-white" />
                    </div>
                    <div>
                      <h4 className="font-semibold text-white group-hover:text-purple-300 transition-colors">
                        {link.title}
                      </h4>
                      <p className="text-sm text-gray-400 mt-1">
                        {link.description}
                      </p>
                    </div>
                  </motion.a>
                ))}
              </div>

              {/* API Status */}
              <div className="mt-8 p-4 bg-gray-800 rounded-lg border border-gray-700">
                <div className="flex items-center justify-between">
                  <span className="text-white font-medium">API Status</span>
                  <div className="flex items-center">
                    <div className="w-2 h-2 bg-green-400 rounded-full mr-2 animate-pulse"></div>
                    <span className="text-green-400 text-sm">All Systems Operational</span>
                  </div>
                </div>
                <p className="text-gray-400 text-sm mt-2">
                  Last updated: Just now • Uptime: 99.9%
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Mobile Quick Links */}
      <div className="lg:hidden bg-gray-800 border-t border-gray-700">
        <div className="max-w-7xl mx-auto py-6 px-4">
          <h3 className="text-lg font-semibold text-white mb-4 text-center">
            Developer Resources
          </h3>
          <div className="grid grid-cols-2 gap-4">
            {quickLinks.slice(0, 4).map((link, index) => (
              <Link
                key={index}
                to={link.path}
                className="flex flex-col items-center p-3 bg-gray-700 rounded-lg text-center hover:bg-gray-600 transition-colors"
              >
                <link.icon size={20} className="text-purple-400 mb-2" />
                <span className="text-white text-sm font-medium">{link.title}</span>
              </Link>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default DeveloperLogin;
