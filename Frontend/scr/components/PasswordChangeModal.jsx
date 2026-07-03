import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { toast } from 'react-toastify';

export default function PasswordChangeModal({ isOpen, onClose, email }) {
  const { forceChangePassword } = useAuth();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    newPassword: '',
    newPasswordConfirm: ''
  });
  const [showPasswords, setShowPasswords] = useState({
    newPassword: false,
    newPasswordConfirm: false
  });

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
      const result = await forceChangePassword(
        email,
        formData.newPassword,
        formData.newPasswordConfirm
      );

      if (result.success) {
        toast.success('Password changed successfully!');
        onClose();
        // The user will be automatically redirected by the auth context
      } else {
        toast.error(result.error || 'Failed to change password');
      }
    } catch (error) {
      console.error('Password change error:', error);
      toast.error('An unexpected error occurred');
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

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50 safe-area-top safe-area-bottom">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md">
        <div className="p-6">
          <div className="text-center mb-6">
            <div className="w-12 h-12 bg-yellow-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <i className="fas fa-key text-yellow-600 text-xl"></i>
            </div>
            <h2 className="text-xl font-semibold text-gray-800 mb-2">
              Change Your Password
            </h2>
            <p className="text-gray-600 text-sm">
              For security reasons, please change your temporary password to continue.
            </p>
          </div>

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

            {/* Security Tips */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
              <h4 className="text-sm font-semibold text-blue-800 mb-2">
                🔒 Security Tips:
              </h4>
              <ul className="text-xs text-blue-700 space-y-1">
                <li>• Use a mix of letters, numbers, and symbols</li>
                <li>• Avoid common words or personal information</li>
                <li>• Don't reuse passwords from other sites</li>
              </ul>
            </div>

            {/* Buttons */}
            <div className="flex space-x-3 pt-2">
              <button
                type="submit"
                disabled={loading}
                className="flex-1 bg-purple-600 text-white py-3 px-4 rounded-lg font-semibold hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200"
              >
                {loading ? (
                  <div className="flex items-center justify-center">
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
                    Updating...
                  </div>
                ) : (
                  'Change Password'
                )}
              </button>
            </div>
          </form>

          <div className="mt-4 text-center">
            <p className="text-xs text-gray-500">
              You must change your password to access your account
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}