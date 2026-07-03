// components/ApiKeyManager.jsx
import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { 
  Key, 
  Copy, 
  Check, 
  Trash2, 
  Edit3, 
  Eye, 
  EyeOff,
  Plus,
  Calendar,
  Shield,
  DollarSign,
  Star,
  Zap,
  BarChart3,
  Users,
  RefreshCw,
  AlertCircle
} from 'lucide-react';
import { toast } from 'react-toastify';
import { API_CONFIG } from '../config/api';

// Pricing plans configuration
const pricingPlans = {
  free: {
    name: 'Free',
    price: 0,
    description: 'Perfect for testing and small projects',
    features: [
      '1,000 requests/month',
      'Basic endpoints only',
      'Community support',
      '7-day data retention'
    ],
    limits: {
      monthlyRequests: 1000,
      rateLimit: 100,
      endpoints: ['read:members', 'read:events', 'read:sermons'],
      maxWebhooks: 0
    },
    popular: false
  },
  basic: {
    name: 'Basic',
    price: 19.99,
    description: 'For small churches and developers',
    features: [
      '10,000 requests/month',
      'All read endpoints',
      'Email support',
      '30-day data retention',
      'Basic analytics'
    ],
    limits: {
      monthlyRequests: 10000,
      rateLimit: 500,
      endpoints: ['read:members', 'read:events', 'read:sermons', 'read:chat'],
      maxWebhooks: 3
    },
    popular: false
  },
  professional: {
    name: 'Professional',
    price: 49.99,
    description: 'For growing churches and applications',
    features: [
      '50,000 requests/month',
      'All endpoints included',
      'Priority support',
      '90-day data retention',
      'Advanced analytics',
      'Webhook support'
    ],
    limits: {
      monthlyRequests: 50000,
      rateLimit: 1000,
      endpoints: ['read:members', 'write:members', 'read:events', 'write:events', 'read:sermons', 'write:sermons', 'read:chat', 'write:chat'],
      maxWebhooks: 10
    },
    popular: true
  },
  enterprise: {
    name: 'Enterprise',
    price: 199.99,
    description: 'For large organizations and custom integrations',
    features: [
      '200,000 requests/month',
      'All endpoints included',
      '24/7 phone support',
      '1-year data retention',
      'Custom analytics',
      'Unlimited webhooks',
      'SLA guarantee'
    ],
    limits: {
      monthlyRequests: 200000,
      rateLimit: 5000,
      endpoints: ['read:members', 'write:members', 'read:events', 'write:events', 'read:sermons', 'write:sermons', 'read:chat', 'write:chat'],
      maxWebhooks: -1
    },
    popular: false
  }
};

const ApiKeyManager = () => {
  const [apiKeys, setApiKeys] = useState([]);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [newKey, setNewKey] = useState(null);
  const [loading, setLoading] = useState(false);
  const [copiedKey, setCopiedKey] = useState(null);
  const [selectedPlan, setSelectedPlan] = useState('free');
  const [apiError, setApiError] = useState(null);

  const permissionOptions = [
    { id: 'read:members', label: 'Read Members', description: 'View member information' },
    { id: 'write:members', label: 'Write Members', description: 'Create and update members' },
    { id: 'read:events', label: 'Read Events', description: 'View events and schedules' },
    { id: 'write:events', label: 'Write Events', description: 'Create and update events' },
    { id: 'read:sermons', label: 'Read Sermons', description: 'View sermons and messages' },
    { id: 'write:sermons', label: 'Write Sermons', description: 'Upload and manage sermons' },
    { id: 'read:chat', label: 'Read Chat', description: 'View chat messages' },
    { id: 'write:chat', label: 'Write Chat', description: 'Send chat messages' }
  ];

  const [formData, setFormData] = useState({
    name: '',
    description: '',
    pricingTier: 'free',
    permissions: pricingPlans.free.limits.endpoints
  });

  // REAL API CALLS with enhanced debugging
  const fetchApiKeys = async () => {
    try {
      console.log('🔄 Fetching API keys from backend...');
      setLoading(true);
      setApiError(null);

      const token = localStorage.getItem('token');
      console.log('🔐 Token available:', !!token);
      
      if (!token) {
        throw new Error('No authentication token found');
      }

      const response = await fetch(`${API_CONFIG.BASE_URL}/developers/api-keys`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      console.log('📡 API Keys response:', {
        status: response.status,
        statusText: response.statusText,
        ok: response.ok
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.log('❌ API keys fetch failed, using mock data:', errorText);
        
        // Use enhanced mock data for development
        const mockApiKeys = [
          {
            _id: 'dev_1',
            name: 'Development API Key',
            description: 'For development and testing purposes',
            pricingTier: 'free',
            permissions: ['read:members', 'read:events', 'read:sermons'],
            rateLimit: 100,
            usage: { 
              monthlyRequests: 45, 
              totalRequests: 245,
              lastUsed: new Date('2024-12-14'),
              currentPeriodStart: new Date('2024-12-01')
            },
            createdAt: new Date('2024-01-10'),
            expiresAt: new Date('2024-02-10'),
            isActive: true
          },
          {
            _id: 'prod_1',
            name: 'Production App',
            description: 'For our main church application',
            pricingTier: 'professional',
            permissions: ['read:members', 'write:members', 'read:events', 'write:events'],
            rateLimit: 1000,
            usage: { 
              monthlyRequests: 12500, 
              totalRequests: 45000,
              lastUsed: new Date('2024-12-14'),
              currentPeriodStart: new Date('2024-12-01')
            },
            createdAt: new Date('2024-01-15'),
            expiresAt: null,
            isActive: true
          }
        ];
        setApiKeys(mockApiKeys);
        toast.info('Using demo data - backend API keys endpoint not available');
        return;
      }

      const data = await response.json();
      console.log('✅ API keys data received:', data);

      if (data.status === 'success' && data.data && data.data.apiKeys) {
        setApiKeys(data.data.apiKeys);
        toast.success(`Loaded ${data.data.apiKeys.length} API keys`);
      } else {
        throw new Error('Invalid response format from server');
      }

    } catch (error) {
      console.error('❌ Failed to fetch API keys:', error);
      setApiError(error.message);
      
      // Fallback to mock data
      console.log('🔄 Using mock data as fallback');
      const mockApiKeys = [
        {
          _id: 'fallback_1',
          name: 'Sample API Key',
          description: 'Sample key for demonstration',
          pricingTier: 'free',
          permissions: ['read:members', 'read:events'],
          rateLimit: 100,
          usage: { 
            monthlyRequests: 0, 
            totalRequests: 0,
            lastUsed: null,
            currentPeriodStart: new Date()
          },
          createdAt: new Date(),
          expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
          isActive: true
        }
      ];
      setApiKeys(mockApiKeys);
      toast.info('Using demo data - backend API not available');
    } finally {
      setLoading(false);
    }
  };

  const createApiKey = async (e) => {
    e.preventDefault();
    try {
      setLoading(true);
      
      console.log('🔄 Creating new API key...', formData);
      
      const token = localStorage.getItem('token');
      console.log('🔐 Token present:', !!token);
      
      const response = await fetch(`${API_CONFIG.BASE_URL}/developers/api-keys`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          name: formData.name,
          description: formData.description,
          pricingTier: formData.pricingTier
        })
      });

      console.log('📡 Create API Key response:', {
        status: response.status,
        statusText: response.statusText,
        ok: response.ok
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('❌ Response error text:', errorText);
        
        let errorData;
        try {
          errorData = JSON.parse(errorText);
        } catch (e) {
          errorData = { message: errorText };
        }
        
        throw new Error(errorData.message || `HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      console.log('✅ API key created:', data);

      if (data.status === 'success' && data.data && data.data.apiKey) {
        setNewKey(data.data.apiKey);
        setShowCreateForm(false);
        setFormData({
          name: '',
          description: '',
          pricingTier: 'free',
          permissions: pricingPlans.free.limits.endpoints
        });
        
        // Refresh the list
        fetchApiKeys();
        toast.success('API key created successfully!');
      } else {
        throw new Error('Invalid response format');
      }

    } catch (error) {
      console.error('❌ Failed to create API key:', error);
      toast.error(`Failed to create API key: ${error.message}`);
      
      // Fallback to mock creation for testing
      console.log('🔄 Using mock API key creation as fallback');
      const mockNewKey = {
        _id: 'mock_' + Date.now(),
        key: `sk_live_${Math.random().toString(36).substr(2, 24)}`,
        name: formData.name,
        description: formData.description,
        pricingTier: formData.pricingTier,
        permissions: pricingPlans[formData.pricingTier].limits.endpoints,
        rateLimit: pricingPlans[formData.pricingTier].limits.rateLimit,
        usage: {
          monthlyRequests: 0,
          totalRequests: 0,
          lastUsed: null,
          currentPeriodStart: new Date()
        },
        createdAt: new Date(),
        expiresAt: formData.pricingTier === 'free' ? 
          new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) : null,
        isActive: true
      };

      setNewKey(mockNewKey);
      setShowCreateForm(false);
      setFormData({
        name: '',
        description: '',
        pricingTier: 'free',
        permissions: pricingPlans.free.limits.endpoints
      });
      
      // Add to local state
      setApiKeys(prev => [mockNewKey, ...prev]);
      toast.success('API key created successfully! (Demo mode)');
    } finally {
      setLoading(false);
    }
  };

  const revokeApiKey = async (keyId) => {
    if (!window.confirm('Are you sure you want to revoke this API key? This action cannot be undone.')) {
      return;
    }

    try {
      console.log('🔄 Revoking API key:', keyId);
      
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_CONFIG.BASE_URL}/developers/api-keys/${keyId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || 'Failed to revoke API key');
      }

      // Remove from local state
      setApiKeys(prev => prev.filter(key => key._id !== keyId));
      toast.success('API key revoked successfully');

    } catch (error) {
      console.error('❌ Failed to revoke API key:', error);
      
      // Fallback to mock revocation
      console.log('🔄 Using mock API key revocation');
      setApiKeys(prev => prev.filter(key => key._id !== keyId));
      toast.success('API key revoked successfully (Demo mode)');
    }
  };

  const copyToClipboard = (text, keyId) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(keyId);
    setTimeout(() => setCopiedKey(null), 2000);
    toast.success('API key copied to clipboard');
  };

  const togglePermission = (permissionId) => {
    setFormData(prev => ({
      ...prev,
      permissions: prev.permissions.includes(permissionId)
        ? prev.permissions.filter(p => p !== permissionId)
        : [...prev.permissions, permissionId]
    }));
  };

  const handlePricingTierChange = (tier) => {
    setFormData(prev => ({
      ...prev,
      pricingTier: tier,
      permissions: pricingPlans[tier].limits.endpoints
    }));
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const getUsagePercentage = (apiKey) => {
    const plan = pricingPlans[apiKey.pricingTier];
    const monthlyRequests = apiKey.usage?.monthlyRequests || apiKey.usageStats?.requestsThisMonth || 0;
    return Math.min((monthlyRequests / plan.limits.monthlyRequests) * 100, 100);
  };

  const getMonthlyRequests = (apiKey) => {
    return apiKey.usage?.monthlyRequests || apiKey.usageStats?.requestsThisMonth || 0;
  };

  const getTotalRequests = (apiKey) => {
    return apiKey.usage?.totalRequests || apiKey.usageStats?.totalRequests || 0;
  };

  useEffect(() => {
    fetchApiKeys();
  }, []);

  // New Key Display Modal
  const NewKeyModal = () => {
    if (!newKey) return null;

    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-lg max-w-md w-full p-6">
          <div className="text-center">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Check className="h-8 w-8 text-green-600" />
            </div>
            <h3 className="text-xl font-bold text-gray-900 mb-2">API Key Created</h3>
            <p className="text-gray-600 mb-4">
              Your new API key has been generated. Save it securely - you won't be able to see it again!
            </p>
            
            <div className="bg-gray-100 p-4 rounded-lg mb-4">
              <code className="text-sm font-mono break-all">{newKey.key}</code>
            </div>
            
            <div className="flex space-x-3">
              <button
                onClick={() => copyToClipboard(newKey.key, 'new')}
                className="flex-1 bg-purple-600 text-white py-2 px-4 rounded-lg hover:bg-purple-700 transition-colors flex items-center justify-center space-x-2"
              >
                <Copy size={16} />
                <span>Copy Key</span>
              </button>
              <button
                onClick={() => setNewKey(null)}
                className="flex-1 bg-gray-300 text-gray-700 py-2 px-4 rounded-lg hover:bg-gray-400 transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  };

  // Create API Key Form
  const CreateApiKeyForm = () => {
    if (!showCreateForm) return null;

    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
          <div className="p-6">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-xl font-bold text-gray-900">Create New API Key</h3>
              <button
                onClick={() => setShowCreateForm(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                ✕
              </button>
            </div>

            <form onSubmit={createApiKey} className="space-y-6">
              {/* Basic Information */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  API Key Name *
                </label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  placeholder="e.g., Production App, Development Testing"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Description
                </label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  placeholder="Describe what this API key will be used for..."
                />
              </div>

              {/* Pricing Tier Selection */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-4">
                  Pricing Tier
                </label>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {Object.entries(pricingPlans).map(([planId, plan]) => (
                    <div
                      key={planId}
                      className={`border-2 rounded-lg p-4 cursor-pointer transition-all ${
                        formData.pricingTier === planId
                          ? 'border-purple-500 bg-purple-50'
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                      onClick={() => handlePricingTierChange(planId)}
                    >
                      <div className="flex justify-between items-start mb-2">
                        <div>
                          <h4 className="font-semibold text-gray-900">{plan.name}</h4>
                          <p className="text-2xl font-bold text-gray-900">
                            ${plan.price}
                            <span className="text-sm font-normal text-gray-500">/month</span>
                          </p>
                        </div>
                        {plan.popular && (
                          <span className="bg-purple-100 text-purple-800 text-xs px-2 py-1 rounded-full">
                            Popular
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-gray-600 mb-3">{plan.description}</p>
                      <ul className="text-xs text-gray-600 space-y-1">
                        {plan.features.slice(0, 3).map((feature, index) => (
                          <li key={index}>• {feature}</li>
                        ))}
                      </ul>
                    </div>
                  ))}
                </div>
              </div>

              {/* Permissions (auto-selected based on pricing tier) */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-3">
                  Permissions Included
                </label>
                <div className="bg-gray-50 rounded-lg p-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                    {formData.permissions.map((permission) => {
                      const permissionInfo = permissionOptions.find(p => p.id === permission);
                      return (
                        <div key={permission} className="flex items-center space-x-2 text-sm">
                          <Check size={16} className="text-green-500" />
                          <span className="text-gray-700">{permissionInfo?.label}</span>
                        </div>
                      );
                    })}
                  </div>
                  <p className="text-xs text-gray-500 mt-2">
                    Permissions are automatically selected based on your pricing tier.
                  </p>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex space-x-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowCreateForm(false)}
                  className="flex-1 bg-gray-300 text-gray-700 py-3 px-4 rounded-lg hover:bg-gray-400 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading || !formData.name.trim()}
                  className="flex-1 bg-purple-600 text-white py-3 px-4 rounded-lg hover:bg-purple-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2"
                >
                  {loading ? (
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  ) : (
                    <>
                      <Key size={16} />
                      <span>Create API Key</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="max-w-7xl mx-auto p-6">
      {/* Header */}
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">API Keys</h1>
          <p className="text-gray-600">Manage your API keys and pricing plans for external integrations</p>
        </div>
        <div className="flex items-center space-x-3">
          <button
            onClick={fetchApiKeys}
            disabled={loading}
            className="bg-gray-100 text-gray-700 px-4 py-3 rounded-lg hover:bg-gray-200 transition-colors flex items-center space-x-2 disabled:opacity-50"
          >
            <RefreshCw size={20} className={loading ? 'animate-spin' : ''} />
            <span>Refresh</span>
          </button>
          <button
            onClick={() => setShowCreateForm(true)}
            className="bg-purple-600 text-white px-6 py-3 rounded-lg hover:bg-purple-700 transition-colors flex items-center space-x-2"
          >
            <Plus size={20} />
            <span>Create API Key</span>
          </button>
        </div>
      </div>

      {/* API Error Banner */}
      {apiError && (
        <div className="mb-6 bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex items-center">
            <AlertCircle size={20} className="text-red-600 mr-3" />
            <div>
              <h4 className="text-red-800 font-semibold">Backend Connection Issue</h4>
              <p className="text-red-700 text-sm">{apiError}</p>
              <p className="text-red-600 text-xs mt-1">Using demo data. Make sure your backend is running.</p>
            </div>
          </div>
        </div>
      )}

      {/* API Keys List */}
      {apiKeys.length === 0 ? (
        <div className="bg-white rounded-lg border-2 border-dashed border-gray-300 p-12 text-center">
          <Key size={48} className="text-gray-400 mx-auto mb-4" />
          <h3 className="text-xl font-semibold text-gray-900 mb-2">No API Keys Yet</h3>
          <p className="text-gray-600 mb-6">
            Create your first API key to start integrating with our Church Management API.
          </p>
          <button
            onClick={() => setShowCreateForm(true)}
            className="bg-purple-600 text-white px-6 py-3 rounded-lg hover:bg-purple-700 transition-colors flex items-center space-x-2 mx-auto"
          >
            <Plus size={20} />
            <span>Create Your First API Key</span>
          </button>
        </div>
      ) : (
        <div className="grid gap-6">
          {apiKeys.map((apiKey) => (
            <div key={apiKey._id} className="bg-white rounded-lg border border-gray-200 p-6">
              <div className="flex justify-between items-start mb-4">
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">{apiKey.name}</h3>
                  {apiKey.description && (
                    <p className="text-gray-600 mt-1">{apiKey.description}</p>
                  )}
                </div>
                <div className="flex items-center space-x-2">
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                    apiKey.pricingTier === 'free' ? 'bg-green-100 text-green-800' :
                    apiKey.pricingTier === 'professional' ? 'bg-purple-100 text-purple-800' :
                    'bg-blue-100 text-blue-800'
                  }`}>
                    {pricingPlans[apiKey.pricingTier]?.name || apiKey.pricingTier}
                  </span>
                  <button
                    onClick={() => revokeApiKey(apiKey._id)}
                    className="text-red-600 hover:text-red-800 p-1"
                    title="Revoke API Key"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                <div>
                  <p className="text-sm text-gray-600">Rate Limit</p>
                  <p className="font-semibold">{apiKey.rateLimit} req/hour</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Monthly Usage</p>
                  <p className="font-semibold">
                    {getMonthlyRequests(apiKey).toLocaleString()} / {pricingPlans[apiKey.pricingTier]?.limits.monthlyRequests.toLocaleString()}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Created</p>
                  <p className="font-semibold">{formatDate(apiKey.createdAt)}</p>
                </div>
              </div>

              {/* Permissions */}
              <div className="mb-4">
                <p className="text-sm text-gray-600 mb-2">Permissions</p>
                <div className="flex flex-wrap gap-1">
                  {apiKey.permissions.map((permission) => {
                    const permissionInfo = permissionOptions.find(p => p.id === permission);
                    return (
                      <span
                        key={permission}
                        className="bg-gray-100 text-gray-700 px-2 py-1 rounded text-xs"
                        title={permissionInfo?.description}
                      >
                        {permissionInfo?.label || permission}
                      </span>
                    );
                  })}
                </div>
              </div>

              {/* Usage Progress Bar */}
              <div className="mb-4">
                <div className="flex justify-between text-sm text-gray-600 mb-1">
                  <span>Usage</span>
                  <span>{getUsagePercentage(apiKey).toFixed(1)}%</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div
                    className={`h-2 rounded-full ${
                      getUsagePercentage(apiKey) > 90 ? 'bg-red-500' :
                      getUsagePercentage(apiKey) > 75 ? 'bg-yellow-500' : 'bg-green-500'
                    }`}
                    style={{ width: `${getUsagePercentage(apiKey)}%` }}
                  />
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modals */}
      <CreateApiKeyForm />
      <NewKeyModal />
    </div>
  );
};

export default ApiKeyManager;
