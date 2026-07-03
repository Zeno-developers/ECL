import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { toast } from 'react-toastify';

export default function ResetPassword() {
  const { resetPassword } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    newPassword: '',
    newPasswordConfirm: ''
  });
  const [showPasswords, setShowPasswords] = useState({
    newPassword: false,
    newPasswordConfirm: false
  });
  const [token, setToken] = useState('');
  const [tokenValid, setTokenValid] = useState(true);

  useEffect(() => {
    const tokenFromUrl = searchParams.get('token');
    if (!tokenFromUrl) {
      toast.error('Invalid reset link');
      setTokenValid(false);
      navigate('/forgot-password');
      return;
    }
    
    // Validate token format (basic check)
    if (tokenFromUrl.length !== 64) { // SHA256 tokens are 64 chars
      console.error('❌ Invalid token length:', tokenFromUrl.length);
      toast.error('Invalid reset token format');
      setTokenValid(false);
      return;
    }
    
    setToken(tokenFromUrl);
    console.log('✅ Reset token received, length:', tokenFromUrl.length);
  }, [searchParams, navigate]);

  // Debug effect
  useEffect(() => {
    console.log('🔐 DEBUG: Current form data:', formData);
    console.log('🔐 DEBUG: Current token:', token);
  }, [formData, token]);

  const handleSubmit = async (e) => {
  e.preventDefault();
  
  if (!formData.newPassword || !formData.newPasswordConfirm) {
    toast.error('Please fill in all fields');
    return;
  }

  if (formData.newPassword !== formData.newPasswordConfirm) {
    toast.error('Passwords do not match');
    return;
  }

  if (formData.newPassword.length < 8) {
    toast.error('Password must be at least 8 characters');
    return;
  }

  setLoading(true);

  try {
    console.log('🔐 FRONTEND: Reset password attempt');
    console.log('🔐 FRONTEND: Token from URL:', token);
    console.log('🔐 FRONTEND: New password:', formData.newPassword);
    
    // ✅ FIX: Create a proper object with token and newPassword
    const resetData = {
      token: token,
      newPassword: formData.newPassword
    };
    
    console.log('🔐 FRONTEND: Reset data being sent:', resetData);
    
    // ✅ FIX: Make sure we're passing the object, not just the token
    const result = await resetPassword(resetData);
    
    if (result.success) {
      console.log('✅ FRONTEND: Password reset successful');
      toast.success('Password reset successfully! Redirecting to login...');
      setTimeout(() => {
        navigate('/login');
      }, 2000);
    } else {
      console.log('❌ FRONTEND: Password reset failed:', result.error);
      toast.error(result.error || 'Failed to reset password');
      setTokenValid(false);
    }
  } catch (error) {
    console.error('💥 FRONTEND: Reset password error:', error);
    
    // More specific error messages
    if (error.message.includes('Token is invalid') || error.message.includes('expired')) {
      toast.error('This reset link has expired. Please request a new one.');
      setTokenValid(false);
    } else if (error.message.includes('NetworkError')) {
      toast.error('Network error. Please check your connection.');
    } else {
      toast.error(error.message || 'An unexpected error occurred');
    }
  } finally {
    setLoading(false);
  }
};
  const handleInputChange = (field, value) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const togglePasswordVisibility = (field) => {
    setShowPasswords(prev => ({
      ...prev,
      [field]: !prev[field]
    }));
  };

  if (!tokenValid) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-600 to-blue-700 flex items-center justify-center p-4 safe-area-top safe-area-bottom">
        <div className="w-full max-w-md">
          <div className="text-center mb-8">
            <div className="w-16 h-16 bg-white rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg">
              <i className="fas fa-exclamation-triangle text-2xl text-red-600"></i>
            </div>
            <h1 className="text-2xl font-bold text-white mb-2">Eternal Love Church</h1>
            <p className="text-blue-100">Church Family</p>
          </div>

          <div className="bg-white rounded-2xl shadow-xl p-6 text-center">
            <h2 className="text-xl font-semibold text-gray-800 mb-4">
              Invalid Reset Link
            </h2>
            
            <p className="text-gray-600 mb-6">
              This password reset link is invalid or has expired. Please request a new reset link.
            </p>

            <button
              onClick={() => navigate('/forgot-password')}
              className="w-full bg-purple-600 text-white py-3 px-4 rounded-lg font-semibold hover:bg-purple-700 transition-colors"
            >
              Request New Reset Link
            </button>

            <button
              onClick={() => navigate('/login')}
              className="w-full mt-3 bg-gray-200 text-gray-700 py-3 px-4 rounded-lg font-semibold hover:bg-gray-300 transition-colors"
            >
              Back to Login
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-600 to-blue-700 flex items-center justify-center p-4 safe-area-top safe-area-bottom">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-white rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg">
            <i className="fas fa-lock text-2xl text-purple-600"></i>
          </div>
          <h1 className="text-2xl font-bold text-white mb-2">Eternal Love Church</h1>
          <p className="text-blue-100">Church Family</p>
        </div>

        <div className="bg-white rounded-2xl shadow-xl p-6">
          <h2 className="text-xl font-semibold text-gray-800 text-center mb-2">
            Set New Password
          </h2>
          <p className="text-gray-600 text-center mb-6">
            Create a new password for your account.
          </p>

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* New Password */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                New Password
              </label>
              <div className="relative">
                <input
                  type={showPasswords.newPassword ? 'text' : 'password'}
                  value={formData.newPassword}
                  onChange={(e) => handleInputChange('newPassword', e.target.value)}
                  placeholder="Enter new password"
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent pr-10 transition-all duration-200"
                  required
                  minLength="8"
                  disabled={loading}
                />
                <button
                  type="button"
                  onClick={() => togglePasswordVisibility('newPassword')}
                  className="absolute right-3 top-3 text-gray-400 hover:text-gray-600 transition-colors"
                  disabled={loading}
                >
                  <i className={`fas ${showPasswords.newPassword ? 'fa-eye-slash' : 'fa-eye'}`}></i>
                </button>
              </div>
              <p className="text-xs text-gray-500 mt-1">
                Must be at least 8 characters long
              </p>
            </div>

            {/* Confirm New Password */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Confirm New Password
              </label>
              <div className="relative">
                <input
                  type={showPasswords.newPasswordConfirm ? 'text' : 'password'}
                  value={formData.newPasswordConfirm}
                  onChange={(e) => handleInputChange('newPasswordConfirm', e.target.value)}
                  placeholder="Confirm new password"
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent pr-10 transition-all duration-200"
                  required
                  minLength="8"
                  disabled={loading}
                />
                <button
                  type="button"
                  onClick={() => togglePasswordVisibility('newPasswordConfirm')}
                  className="absolute right-3 top-3 text-gray-400 hover:text-gray-600 transition-colors"
                  disabled={loading}
                >
                  <i className={`fas ${showPasswords.newPasswordConfirm ? 'fa-eye-slash' : 'fa-eye'}`}></i>
                </button>
              </div>
            </div>

            {/* Password Strength Tips */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
              <h4 className="text-sm font-semibold text-blue-800 mb-2">
                💡 Create a strong password:
              </h4>
              <ul className="text-xs text-blue-700 space-y-1">
                <li>• Use at least 8 characters</li>
                <li>• Include uppercase and lowercase letters</li>
                <li>• Add numbers and special characters</li>
                <li>• Avoid common words or patterns</li>
              </ul>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-purple-600 text-white py-3 px-4 rounded-lg font-semibold hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200"
            >
              {loading ? (
                <div className="flex items-center justify-center">
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
                  Resetting Password...
                </div>
              ) : (
                'Reset Password'
              )}
            </button>
          </form>

          <div className="mt-4 text-center">
            <button
              onClick={() => navigate('/login')}
              className="text-sm text-purple-600 hover:text-purple-700 font-semibold transition-colors"
            >
              Back to Login
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

