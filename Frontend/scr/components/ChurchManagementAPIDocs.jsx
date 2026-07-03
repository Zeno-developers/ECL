// components/ChurchManagementAPIDocs.jsx - Updated with Real API Endpoints
import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  BookOpen, 
  Key, 
  Users, 
  Calendar, 
  MessageCircle, 
  FileText, 
  Search,
  Copy,
  Check,
  AlertCircle,
  Shield,
  Database,
  Code,
  Book,
  DollarSign,
  Heart,
  Upload,
  BarChart3,
  Cpu
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { API_CONFIG } from '../config/api';

const ChurchManagementAPIDocs = () => {
  const navigate = useNavigate();
  const [activeSection, setActiveSection] = useState('getting-started');
  const [copiedEndpoint, setCopiedEndpoint] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const apiBaseUrl = API_CONFIG.BASE_URL;
  const apiOrigin = apiBaseUrl.startsWith('http')
    ? new URL(apiBaseUrl).origin
    : 'https://api.elchurch.site';
  const websocketUrl = apiOrigin.replace(/^http/, 'ws');

  // Updated API endpoints based on your actual API structure
  const apiEndpoints = {
    authentication: [
      {
        method: 'POST',
        path: '/api/auth/login',
        description: 'User login and token retrieval',
        auth: 'None',
        parameters: [
          { name: 'email', type: 'string', required: true, description: 'User email address' },
          { name: 'password', type: 'string', required: true, description: 'User password' }
        ],
        response: `{
  "status": "success",
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": "usr_123",
    "name": "John Doe",
    "email": "john@example.com",
    "role": "member"
  }
}`,
        errors: [
          { code: 401, message: 'Invalid credentials' },
          { code: 400, message: 'Missing required fields' }
        ]
      },
      {
        method: 'POST',
        path: '/api/auth/register',
        description: 'User registration',
        auth: 'None',
        parameters: [
          { name: 'name', type: 'string', required: true, description: 'Full name' },
          { name: 'email', type: 'string', required: true, description: 'Email address' },
          { name: 'password', type: 'string', required: true, description: 'Password' }
        ],
        response: `{
  "status": "success",
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": "usr_123",
    "name": "John Doe",
    "email": "john@example.com",
    "role": "member"
  }
}`
      },
      {
        method: 'POST',
        path: '/api/auth/reset-password',
        description: 'Reset password with token',
        auth: 'None',
        parameters: [
          { name: 'token', type: 'string', required: true, description: 'Reset token from email' },
          { name: 'newPassword', type: 'string', required: true, description: 'New password' }
        ],
        response: `{
  "status": "success",
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": "usr_123",
    "name": "John Doe",
    "email": "john@example.com"
  }
}`
      }
    ],
    members: [
      {
        method: 'GET',
        path: '/api/members',
        description: 'Retrieve all members (authenticated)',
        auth: 'Bearer Token',
        parameters: [
          { name: 'page', type: 'number', required: false, description: 'Page number' },
          { name: 'limit', type: 'number', required: false, description: 'Items per page' }
        ],
        response: `[
  {
    "id": "mem_123",
    "name": "John Doe",
    "email": "john@example.com",
    "phone": "+1234567890",
    "role": "member",
    "joinDate": "2024-01-15"
  }
]`
      },
      {
        method: 'POST',
        path: '/api/members',
        description: 'Add a new member',
        auth: 'Bearer Token',
        parameters: [
          { name: 'name', type: 'string', required: true, description: 'Member full name' },
          { name: 'email', type: 'string', required: true, description: 'Email address' },
          { name: 'phone', type: 'string', required: false, description: 'Phone number' }
        ],
        response: `{
  "status": "success",
  "data": {
    "member": {
      "id": "mem_123",
      "name": "John Doe",
      "email": "john@example.com",
      "role": "member"
    }
  }
}`
      }
    ],
    events: [
      {
        method: 'GET',
        path: '/api/events/public',
        description: 'Get all public events',
        auth: 'None',
        parameters: [],
        response: `[
  {
    "id": "evt_123",
    "title": "Sunday Service",
    "description": "Weekly worship service",
    "date": "2024-12-15",
    "time": "10:00 AM",
    "location": "Main Sanctuary",
    "type": "service"
  }
]`
      },
      {
        method: 'GET',
        path: '/api/events',
        description: 'Get all events (authenticated)',
        auth: 'Bearer Token',
        parameters: [],
        response: `[
  {
    "id": "evt_123",
    "title": "Sunday Service",
    "date": "2024-12-15",
    "time": "10:00 AM",
    "type": "service",
    "description": "Weekly worship service"
  }
]`
      },
      {
        method: 'POST',
        path: '/api/events',
        description: 'Create a new event',
        auth: 'Bearer Token',
        parameters: [
          { name: 'title', type: 'string', required: true, description: 'Event title' },
          { name: 'date', type: 'string', required: true, description: 'Event date (YYYY-MM-DD)' },
          { name: 'time', type: 'string', required: true, description: 'Event time' },
          { name: 'type', type: 'string', required: true, description: 'Event type' }
        ],
        response: `{
  "status": "success",
  "data": {
    "_id": "evt_123",
    "title": "Sunday Service",
    "date": "2024-12-15",
    "time": "10:00 AM"
  }
}`
      }
    ],
    sermons: [
      {
        method: 'GET',
        path: '/api/sermons/public',
        description: 'Get all public sermons',
        auth: 'None',
        parameters: [],
        response: `[
  {
    "id": "serm_123",
    "title": "The Power of Faith",
    "preacher": "Pastor John",
    "date": "2024-12-08",
    "description": "Exploring the transformative power of faith"
  }
]`
      },
      {
        method: 'POST',
        path: '/api/sermons',
        description: 'Create a new sermon (with file upload support)',
        auth: 'Bearer Token',
        parameters: [
          { name: 'title', type: 'string', required: true, description: 'Sermon title' },
          { name: 'speaker', type: 'string', required: true, description: 'Preacher name' },
          { name: 'date', type: 'string', required: true, description: 'Sermon date' },
          { name: 'video', type: 'file', required: false, description: 'Video file' },
          { name: 'audio', type: 'file', required: false, description: 'Audio file' }
        ],
        response: `{
  "status": "success",
  "data": {
    "sermon": {
      "id": "serm_123",
      "title": "The Power of Faith",
      "speaker": "Pastor John",
      "date": "2024-12-08"
    }
  }
}`
      }
    ],
    prayer: [
      {
        method: 'GET',
        path: '/api/prayers',
        description: 'Get prayer requests',
        auth: 'Bearer Token',
        parameters: [],
        response: `[
  {
    "id": "prayer_123",
    "title": "Healing Request",
    "category": "health",
    "description": "Prayer for healing and recovery",
    "isPrivate": false,
    "status": "pending"
  }
]`
      },
      {
        method: 'POST',
        path: '/api/prayers',
        description: 'Submit a prayer request',
        auth: 'Bearer Token',
        parameters: [
          { name: 'title', type: 'string', required: true, description: 'Prayer title' },
          { name: 'category', type: 'string', required: true, description: 'Prayer category' },
          { name: 'description', type: 'string', required: true, description: 'Prayer details' },
          { name: 'isPrivate', type: 'boolean', required: false, description: 'Private prayer' }
        ],
        response: `{
  "status": "success",
  "data": {
    "prayer": {
      "id": "prayer_123",
      "title": "Healing Request",
      "status": "pending"
    }
  }
}`
      }
    ],
    chat: [
      {
        method: 'GET',
        path: '/api/chat/rooms',
        description: 'Get user chat rooms',
        auth: 'Bearer Token',
        parameters: [],
        response: `{
  "status": "success",
  "data": {
    "rooms": [
      {
        "id": "room_123",
        "name": "General Chat",
        "type": "group",
        "lastMessage": "Hello everyone!",
        "unreadCount": 3
      }
    ]
  }
}`
      },
      {
        method: 'POST',
        path: '/api/chat/rooms/{roomId}/messages',
        description: 'Send a message to a chat room',
        auth: 'Bearer Token',
        parameters: [
          { name: 'message', type: 'string', required: true, description: 'Message content' },
          { name: 'messageType', type: 'string', required: false, description: 'Message type (text, image, file)' }
        ],
        response: `{
  "status": "success",
  "data": {
    "message": {
      "id": "msg_123",
      "content": "Hello everyone!",
      "sender": "user_123",
      "timestamp": "2024-12-14T10:30:00Z"
    }
  }
}`
      }
    ],
    giving: [
      {
        method: 'GET',
        path: '/api/giving',
        description: 'Get giving history',
        auth: 'Bearer Token',
        parameters: [],
        response: `[
  {
    "id": "give_123",
    "amount": 100.00,
    "currency": "ZAR",
    "date": "2024-12-14",
    "fund": "Tithes",
    "paymentMethod": "card"
  }
]`
      },
      {
        method: 'POST',
        path: '/api/giving',
        description: 'Record a giving transaction',
        auth: 'Bearer Token',
        parameters: [
          { name: 'amount', type: 'number', required: true, description: 'Donation amount' },
          { name: 'fund', type: 'string', required: true, description: 'Fund type' },
          { name: 'paymentMethod', type: 'string', required: true, description: 'Payment method' }
        ],
        response: `{
  "status": "success",
  "data": {
    "transaction": {
      "id": "give_123",
      "amount": 100.00,
      "status": "completed"
    }
  }
}`
      }
    ],
    developers: [
      {
        method: 'GET',
        path: '/api/developers/api-keys',
        description: 'Get developer API keys',
        auth: 'Bearer Token',
        parameters: [],
        response: `{
  "status": "success",
  "data": {
    "apiKeys": [
      {
        "id": "key_123",
        "name": "Production Key",
        "key": "sk_live_...",
        "createdAt": "2024-12-01T00:00:00Z"
      }
    ]
  }
}`
      },
      {
        method: 'POST',
        path: '/api/developers/api-keys',
        description: 'Create a new API key',
        auth: 'Bearer Token',
        parameters: [
          { name: 'name', type: 'string', required: true, description: 'API key name' },
          { name: 'permissions', type: 'array', required: false, description: 'Access permissions' }
        ],
        response: `{
  "status": "success",
  "data": {
    "apiKey": {
      "id": "key_123",
      "name": "My App",
      "key": "sk_live_abc123...",
      "secret": "Only shown once!"
    }
  }
}`
      }
    ]
  };

  const sections = [
    { id: 'getting-started', title: 'Getting Started', icon: BookOpen },
    { id: 'authentication', title: 'Authentication', icon: Key },
    { id: 'members', title: 'Members', icon: Users },
    { id: 'events', title: 'Events', icon: Calendar },
    { id: 'sermons', title: 'Sermons', icon: FileText },
    { id: 'prayer', title: 'Prayer', icon: Heart },
    { id: 'giving', title: 'Giving', icon: DollarSign },
    { id: 'chat', title: 'Real-time Chat', icon: MessageCircle },
    { id: 'developers', title: 'Developer API', icon: Cpu },
    { id: 'analytics', title: 'Analytics', icon: BarChart3 }
  ];

  const copyToClipboard = (text, endpoint) => {
    navigator.clipboard.writeText(text);
    setCopiedEndpoint(endpoint);
    setTimeout(() => setCopiedEndpoint(null), 2000);
  };

  const filteredSections = sections.filter(section =>
    section.title.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const filteredEndpoints = Object.entries(apiEndpoints).reduce((acc, [category, endpoints]) => {
    const filtered = endpoints.filter(endpoint =>
      endpoint.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      endpoint.path.toLowerCase().includes(searchQuery.toLowerCase())
    );
    if (filtered.length > 0) {
      acc[category] = filtered;
    }
    return acc;
  }, {});

  const pricingPlans = {
    free: {
      name: 'Free',
      price: 0,
      description: 'Perfect for testing and small projects',
      features: ['1,000 requests/month', 'Basic endpoints', 'Community support'],
      limits: { monthlyRequests: 1000, rateLimit: 100 }
    },
    basic: {
      name: 'Basic', 
      price: 19.99,
      description: 'For small churches and developers',
      features: ['10,000 requests/month', 'All read endpoints', 'Email support'],
      limits: { monthlyRequests: 10000, rateLimit: 500 }
    },
    professional: {
      name: 'Professional',
      price: 49.99,
      description: 'For growing churches and applications',
      features: ['50,000 requests/month', 'All endpoints', 'Priority support'],
      limits: { monthlyRequests: 50000, rateLimit: 1000 }
    },
    enterprise: {
      name: 'Enterprise',
      price: 199.99,
      description: 'For large organizations',
      features: ['200,000 requests/month', 'All endpoints', '24/7 support'],
      limits: { monthlyRequests: 200000, rateLimit: 5000 }
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 bg-purple-600 rounded-lg flex items-center justify-center">
                <BookOpen size={20} className="text-white" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-gray-900">Church Management API</h1>
                <p className="text-sm text-gray-500">REST API Documentation</p>
              </div>
            </div>
            <div className="flex items-center space-x-4">
              <div className="relative">
                <Search size={20} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search endpoints..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                />
              </div>
              <button 
                onClick={() => navigate('/developers/login')} 
                className="bg-purple-600 text-white px-4 py-2 rounded-lg hover:bg-purple-700 transition-colors"
              >
                Get API Keys
              </button>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex flex-col lg:flex-row gap-8">
          {/* Sidebar Navigation */}
          <div className="lg:w-64 flex-shrink-0">
            <nav className="sticky top-24 bg-white rounded-lg border border-gray-200 p-4">
              <h3 className="font-semibold text-gray-900 mb-4">Documentation</h3>
              <ul className="space-y-2">
                {filteredSections.map((section) => (
                  <li key={section.id}>
                    <button
                      onClick={() => setActiveSection(section.id)}
                      className={`w-full flex items-center space-x-3 px-3 py-2 rounded-lg text-left transition-colors ${
                        activeSection === section.id
                          ? 'bg-purple-50 text-purple-700 border border-purple-200'
                          : 'text-gray-600 hover:bg-gray-50'
                      }`}
                    >
                      <section.icon size={18} />
                      <span className="font-medium">{section.title}</span>
                    </button>
                  </li>
                ))}
              </ul>

              {/* Quick Links */}
              <div className="mt-8 pt-6 border-t border-gray-200">
                <h4 className="font-semibold text-gray-900 mb-3">Quick Links</h4>
                <div className="space-y-2">
                  <a href="#" className="flex items-center space-x-2 text-sm text-gray-600 hover:text-purple-600">
                    <Code size={16} />
                    <span>API Reference</span>
                  </a>
                  <a href="#" className="flex items-center space-x-2 text-sm text-gray-600 hover:text-purple-600">
                    <Shield size={16} />
                    <span>Authentication</span>
                  </a>
                  <a href="#" className="flex items-center space-x-2 text-sm text-gray-600 hover:text-purple-600">
                    <Database size={16} />
                    <span>Data Models</span>
                  </a>
                </div>
              </div>
            </nav>
          </div>

          {/* Main Content */}
          <div className="flex-1 min-w-0">
            <AnimatePresence mode="wait">
              {/* GETTING STARTED SECTION */}
              {activeSection === 'getting-started' && (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  className="space-y-8"
                >
                  <div>
                    <h1 className="text-3xl font-bold text-gray-900 mb-4">Getting Started</h1>
                    <p className="text-lg text-gray-600 mb-6">
                      Welcome to the Church Management System API documentation. Build powerful integrations with our comprehensive REST API.
                    </p>
                  </div>

                  <div className="grid md:grid-cols-3 gap-6">
                    <div className="bg-white rounded-lg border border-gray-200 p-6">
                      <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center mb-4">
                        <Key size={24} className="text-blue-600" />
                      </div>
                      <h3 className="font-semibold text-gray-900 mb-2">Authentication</h3>
                      <p className="text-gray-600 mb-4">
                        Use JWT Bearer tokens to authenticate your requests.
                      </p>
                    </div>

                    <div className="bg-white rounded-lg border border-gray-200 p-6">
                      <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center mb-4">
                        <DollarSign size={24} className="text-green-600" />
                      </div>
                      <h3 className="font-semibold text-gray-900 mb-2">Base URL</h3>
                      <p className="text-gray-600 mb-4">
                        All requests go to:
                      </p>
                      <div className="bg-gray-50 rounded-lg p-3 font-mono text-sm">
                        {apiBaseUrl}
                      </div>
                    </div>

                    <div className="bg-white rounded-lg border border-gray-200 p-6">
                      <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center mb-4">
                        <Code size={24} className="text-purple-600" />
                      </div>
                      <h3 className="font-semibold text-gray-900 mb-2">WebSocket</h3>
                      <p className="text-gray-600 mb-4">
                        Real-time features available at:
                      </p>
                      <div className="bg-gray-50 rounded-lg p-3 font-mono text-sm">
                        {websocketUrl}
                      </div>
                    </div>
                  </div>

                  <div className="bg-white rounded-lg border border-gray-200 p-6">
                    <h3 className="font-semibold text-gray-900 mb-4">Quick Start Example</h3>
                    <div className="bg-gray-900 rounded-lg p-4">
                      <div className="flex items-center justify-between mb-3">
                        <span className="text-gray-400 text-sm">JavaScript</span>
                        <button
                          onClick={() => copyToClipboard(`// Get your API key from the dashboard
const API_KEY = 'your_api_key_here';

// Make your first API call
const response = await fetch('${apiBaseUrl}/members', {
  headers: {
    'Authorization': 'Bearer ' + API_KEY,
    'Content-Type': 'application/json'
  }
});

const data = await response.json();
console.log(data);`, 'quick-start')}
                          className="text-gray-400 hover:text-white transition-colors"
                        >
                          {copiedEndpoint === 'quick-start' ? <Check size={16} /> : <Copy size={16} />}
                        </button>
                      </div>
                      <pre className="text-green-400 text-sm overflow-x-auto">
{`// Get your API key from the dashboard
const API_KEY = 'your_api_key_here';

// Make your first API call
const response = await fetch('${apiBaseUrl}/members', {
  headers: {
    'Authorization': 'Bearer ' + API_KEY,
    'Content-Type': 'application/json'
  }
});

const data = await response.json();
console.log(data);`}
                      </pre>
                    </div>
                  </div>
                </motion.div>
              )}

              {/* AUTHENTICATION SECTION */}
              {activeSection === 'authentication' && (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  className="space-y-8"
                >
                  <div>
                    <h1 className="text-3xl font-bold text-gray-900 mb-4">Authentication</h1>
                    <p className="text-lg text-gray-600">
                      All API requests require authentication using JWT Bearer tokens. Obtain your token through the login endpoint.
                    </p>
                  </div>

                  {apiEndpoints.authentication.map((endpoint, index) => (
                    <div key={index} className="bg-white rounded-lg border border-gray-200 overflow-hidden">
                      <div className="border-b border-gray-200 p-6">
                        <div className="flex items-start justify-between">
                          <div>
                            <div className="flex items-center space-x-3 mb-2">
                              <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                                endpoint.method === 'GET' ? 'bg-blue-100 text-blue-800' :
                                endpoint.method === 'POST' ? 'bg-green-100 text-green-800' :
                                'bg-yellow-100 text-yellow-800'
                              }`}>
                                {endpoint.method}
                              </span>
                              <code className="text-lg font-mono text-gray-900">{endpoint.path}</code>
                            </div>
                            <p className="text-gray-600">{endpoint.description}</p>
                          </div>
                          <button
                            onClick={() => copyToClipboard(endpoint.path, `auth-${index}`)}
                            className="text-gray-400 hover:text-gray-600 transition-colors"
                          >
                            {copiedEndpoint === `auth-${index}` ? <Check size={18} /> : <Copy size={18} />}
                          </button>
                        </div>
                      </div>

                      <div className="p-6 space-y-6">
                        {/* Parameters */}
                        {endpoint.parameters && endpoint.parameters.length > 0 && (
                          <div>
                            <h4 className="font-semibold text-gray-900 mb-3">Parameters</h4>
                            <div className="bg-gray-50 rounded-lg overflow-hidden">
                              <table className="w-full">
                                <thead>
                                  <tr className="bg-gray-100">
                                    <th className="px-4 py-2 text-left text-sm font-medium text-gray-700">Name</th>
                                    <th className="px-4 py-2 text-left text-sm font-medium text-gray-700">Type</th>
                                    <th className="px-4 py-2 text-left text-sm font-medium text-gray-700">Required</th>
                                    <th className="px-4 py-2 text-left text-sm font-medium text-gray-700">Description</th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {endpoint.parameters.map((param, paramIndex) => (
                                    <tr key={paramIndex} className="border-b border-gray-200 last:border-b-0">
                                      <td className="px-4 py-3 text-sm font-mono text-gray-900">{param.name}</td>
                                      <td className="px-4 py-3 text-sm text-gray-600">{param.type}</td>
                                      <td className="px-4 py-3 text-sm">
                                        <span className={`px-2 py-1 rounded-full text-xs ${
                                          param.required ? 'bg-red-100 text-red-800' : 'bg-gray-100 text-gray-800'
                                        }`}>
                                          {param.required ? 'Required' : 'Optional'}
                                        </span>
                                      </td>
                                      <td className="px-4 py-3 text-sm text-gray-600">{param.description}</td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            </div>
                          </div>
                        )}

                        {/* Response */}
                        <div>
                          <h4 className="font-semibold text-gray-900 mb-3">Response</h4>
                          <div className="bg-gray-900 rounded-lg p-4 relative">
                            <button
                              onClick={() => copyToClipboard(endpoint.response, `auth-response-${index}`)}
                              className="absolute top-3 right-3 text-gray-400 hover:text-white transition-colors"
                            >
                              {copiedEndpoint === `auth-response-${index}` ? <Check size={16} /> : <Copy size={16} />}
                            </button>
                            <pre className="text-green-400 text-sm overflow-x-auto">{endpoint.response}</pre>
                          </div>
                        </div>

                        {/* Errors */}
                        {endpoint.errors && (
                          <div>
                            <h4 className="font-semibold text-gray-900 mb-3">Errors</h4>
                            <div className="space-y-2">
                              {endpoint.errors.map((error, errorIndex) => (
                                <div key={errorIndex} className="flex items-center space-x-3 text-sm">
                                  <AlertCircle size={16} className="text-red-500" />
                                  <span className="font-mono text-gray-600">{error.code}</span>
                                  <span className="text-gray-600">{error.message}</span>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </motion.div>
              )}

              {/* DEVELOPER API SECTION */}
              {activeSection === 'developers' && (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  className="space-y-8"
                >
                  <div>
                    <h1 className="text-3xl font-bold text-gray-900 mb-4">Developer API</h1>
                    <p className="text-lg text-gray-600 mb-6">
                      Manage API keys, webhooks, and developer resources programmatically.
                    </p>
                  </div>

                  {apiEndpoints.developers.map((endpoint, index) => (
                    <div key={index} className="bg-white rounded-lg border border-gray-200 overflow-hidden">
                      <div className="border-b border-gray-200 p-6">
                        <div className="flex items-start justify-between">
                          <div>
                            <div className="flex items-center space-x-3 mb-2">
                              <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                                endpoint.method === 'GET' ? 'bg-blue-100 text-blue-800' :
                                endpoint.method === 'POST' ? 'bg-green-100 text-green-800' :
                                'bg-yellow-100 text-yellow-800'
                              }`}>
                                {endpoint.method}
                              </span>
                              <code className="text-lg font-mono text-gray-900">{endpoint.path}</code>
                            </div>
                            <p className="text-gray-600">{endpoint.description}</p>
                          </div>
                          <button
                            onClick={() => copyToClipboard(endpoint.path, `dev-${index}`)}
                            className="text-gray-400 hover:text-gray-600 transition-colors"
                          >
                            {copiedEndpoint === `dev-${index}` ? <Check size={18} /> : <Copy size={18} />}
                          </button>
                        </div>
                      </div>

                      <div className="p-6 space-y-6">
                        {/* Parameters */}
                        {endpoint.parameters && endpoint.parameters.length > 0 && (
                          <div>
                            <h4 className="font-semibold text-gray-900 mb-3">Parameters</h4>
                            <div className="bg-gray-50 rounded-lg overflow-hidden">
                              <table className="w-full">
                                <thead>
                                  <tr className="bg-gray-100">
                                    <th className="px-4 py-2 text-left text-sm font-medium text-gray-700">Name</th>
                                    <th className="px-4 py-2 text-left text-sm font-medium text-gray-700">Type</th>
                                    <th className="px-4 py-2 text-left text-sm font-medium text-gray-700">Required</th>
                                    <th className="px-4 py-2 text-left text-sm font-medium text-gray-700">Description</th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {endpoint.parameters.map((param, paramIndex) => (
                                    <tr key={paramIndex} className="border-b border-gray-200 last:border-b-0">
                                      <td className="px-4 py-3 text-sm font-mono text-gray-900">{param.name}</td>
                                      <td className="px-4 py-3 text-sm text-gray-600">{param.type}</td>
                                      <td className="px-4 py-3 text-sm">
                                        <span className={`px-2 py-1 rounded-full text-xs ${
                                          param.required ? 'bg-red-100 text-red-800' : 'bg-gray-100 text-gray-800'
                                        }`}>
                                          {param.required ? 'Required' : 'Optional'}
                                        </span>
                                      </td>
                                      <td className="px-4 py-3 text-sm text-gray-600">{param.description}</td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            </div>
                          </div>
                        )}

                        {/* Response */}
                        <div>
                          <h4 className="font-semibold text-gray-900 mb-3">Response</h4>
                          <div className="bg-gray-900 rounded-lg p-4 relative">
                            <button
                              onClick={() => copyToClipboard(endpoint.response, `dev-response-${index}`)}
                              className="absolute top-3 right-3 text-gray-400 hover:text-white transition-colors"
                            >
                              {copiedEndpoint === `dev-response-${index}` ? <Check size={16} /> : <Copy size={16} />}
                            </button>
                            <pre className="text-green-400 text-sm overflow-x-auto">{endpoint.response}</pre>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}

                  {/* WebSocket Example */}
                  <div className="bg-white rounded-lg border border-gray-200 p-6">
                    <h3 className="font-semibold text-gray-900 mb-4">WebSocket Real-time Chat</h3>
                    <div className="bg-gray-900 rounded-lg p-4">
                      <pre className="text-green-400 text-sm overflow-x-auto">
{`// Connect to WebSocket
const socket = new WebSocket('${websocketUrl}?token=your_jwt_token');

socket.onopen = () => {
  console.log('Connected to chat service');
  
  // Join a room
  socket.send(JSON.stringify({
    type: 'join_room',
    roomId: 'general'
  }));
};

socket.onmessage = (event) => {
  const data = JSON.parse(event.data);
  console.log('New message:', data);
};

// Send a message
socket.send(JSON.stringify({
  type: 'send_message',
  roomId: 'general',
  data: {
    message: 'Hello everyone!',
    messageType: 'text'
  }
}));`}
                      </pre>
                    </div>
                  </div>
                </motion.div>
              )}

              {/* OTHER SECTIONS */}
              {['members', 'events', 'sermons', 'prayer', 'giving', 'chat'].map(section => (
                activeSection === section && (
                  <motion.div
                    key={section}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -20 }}
                    className="space-y-8"
                  >
                    <div>
                      <h1 className="text-3xl font-bold text-gray-900 mb-4">
                        {sections.find(s => s.id === section)?.title}
                      </h1>
                      <p className="text-lg text-gray-600">
                        Manage {section} through our REST API endpoints.
                      </p>
                    </div>

                    {filteredEndpoints[section]?.map((endpoint, index) => (
                      <div key={index} className="bg-white rounded-lg border border-gray-200 overflow-hidden">
                        <div className="border-b border-gray-200 p-6">
                          <div className="flex items-start justify-between">
                            <div>
                              <div className="flex items-center space-x-3 mb-2">
                                <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                                  endpoint.method === 'GET' ? 'bg-blue-100 text-blue-800' :
                                  endpoint.method === 'POST' ? 'bg-green-100 text-green-800' :
                                  'bg-yellow-100 text-yellow-800'
                                }`}>
                                  {endpoint.method}
                                </span>
                                <code className="text-lg font-mono text-gray-900">{endpoint.path}</code>
                              </div>
                              <p className="text-gray-600">{endpoint.description}</p>
                            </div>
                            <button
                              onClick={() => copyToClipboard(endpoint.path, `${section}-${index}`)}
                              className="text-gray-400 hover:text-gray-600 transition-colors"
                            >
                              {copiedEndpoint === `${section}-${index}` ? <Check size={18} /> : <Copy size={18} />}
                            </button>
                          </div>
                        </div>

                        <div className="p-6 space-y-6">
                          {/* Parameters */}
                          {endpoint.parameters && endpoint.parameters.length > 0 && (
                            <div>
                              <h4 className="font-semibold text-gray-900 mb-3">Parameters</h4>
                              <div className="bg-gray-50 rounded-lg overflow-hidden">
                                <table className="w-full">
                                  <thead>
                                    <tr className="bg-gray-100">
                                      <th className="px-4 py-2 text-left text-sm font-medium text-gray-700">Name</th>
                                      <th className="px-4 py-2 text-left text-sm font-medium text-gray-700">Type</th>
                                      <th className="px-4 py-2 text-left text-sm font-medium text-gray-700">Required</th>
                                      <th className="px-4 py-2 text-left text-sm font-medium text-gray-700">Description</th>
                                    </tr>
                                  </thead>
                                  <tbody>
                                    {endpoint.parameters.map((param, paramIndex) => (
                                      <tr key={paramIndex} className="border-b border-gray-200 last:border-b-0">
                                        <td className="px-4 py-3 text-sm font-mono text-gray-900">{param.name}</td>
                                        <td className="px-4 py-3 text-sm text-gray-600">{param.type}</td>
                                        <td className="px-4 py-3 text-sm">
                                          <span className={`px-2 py-1 rounded-full text-xs ${
                                            param.required ? 'bg-red-100 text-red-800' : 'bg-gray-100 text-gray-800'
                                          }`}>
                                            {param.required ? 'Required' : 'Optional'}
                                          </span>
                                        </td>
                                        <td className="px-4 py-3 text-sm text-gray-600">{param.description}</td>
                                      </tr>
                                    ))}
                                  </tbody>
                                </table>
                              </div>
                            </div>
                          )}

                          {/* Response */}
                          <div>
                            <h4 className="font-semibold text-gray-900 mb-3">Response Example</h4>
                            <div className="bg-gray-900 rounded-lg p-4 relative">
                              <button
                                onClick={() => copyToClipboard(endpoint.response, `${section}-response-${index}`)}
                                className="absolute top-3 right-3 text-gray-400 hover:text-white transition-colors"
                              >
                                {copiedEndpoint === `${section}-response-${index}` ? <Check size={16} /> : <Copy size={16} />}
                              </button>
                              <pre className="text-green-400 text-sm overflow-x-auto">{endpoint.response}</pre>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </motion.div>
                )
              ))}
            </AnimatePresence>

            {/* Search Results */}
            {searchQuery && Object.keys(filteredEndpoints).length === 0 && (
              <div className="text-center py-12">
                <Search size={48} className="mx-auto text-gray-400 mb-4" />
                <h3 className="text-lg font-semibold text-gray-900 mb-2">No results found</h3>
                <p className="text-gray-600">Try searching with different keywords</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="bg-gray-900 text-white py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center text-gray-400 text-sm">
            <p>Base URL: {apiBaseUrl}</p>
            <p className="mt-2">&copy; 2024 Church Management System API. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default ChurchManagementAPIDocs;
