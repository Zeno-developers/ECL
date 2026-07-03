import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { toast } from 'react-toastify';
import { Link } from 'react-router-dom';

export default function ForgotPassword() {
  const { forgotPassword } = useAuth();
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState('');
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!email) {
      toast.error('Please enter your email address');
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      toast.error('Please enter a valid email address');
      return;
    }

    setLoading(true);

    try {
      const result = await forgotPassword(email);
      
      if (result.success) {
        setSubmitted(true);
      } else {
        toast.error(result.error || 'Failed to send reset instructions');
      }
    } catch (error) {
      console.error('Forgot password error:', error);
      toast.error('An unexpected error occurred');
    } finally {
      setLoading(false);
    }
  };

  if (submitted) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-600 to-blue-700 flex items-center justify-center p-4 safe-area-top safe-area-bottom">
        <div className="w-full max-w-md">
          <div className="text-center mb-8">
            <div className="w-16 h-16 bg-white rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg">
              <i className="fas fa-envelope-open text-2xl text-purple-600"></i>
            </div>
            <h1 className="text-2xl font-bold text-white mb-2">Eternal Love Church</h1>
            <p className="text-blue-100">Church Family</p>
          </div>

          <div className="bg-white rounded-2xl shadow-xl p-6 text-center">
            <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <i className="fas fa-check text-green-600 text-xl"></i>
            </div>
            
            <h2 className="text-xl font-semibold text-gray-800 mb-4">
              Check Your Email
            </h2>
            
            <p className="text-gray-600 mb-6">
              If an account exists with <strong>{email}</strong>, we've sent password reset instructions to your email address.
            </p>

            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6">
              <p className="text-sm text-yellow-800">
                <strong>Note:</strong> The reset link will expire in 1 hour for security reasons.
              </p>
            </div>

            <div className="space-y-3">
              <Link
                to="/login"
                className="block w-full bg-purple-600 text-white py-3 px-4 rounded-lg font-semibold hover:bg-purple-700 transition-colors"
              >
                Back to Login
              </Link>
              
              <p className="text-sm text-gray-600">
                Didn't receive the email?{' '}
                <button
                  onClick={() => setSubmitted(false)}
                  className="text-purple-600 hover:text-purple-700 font-semibold"
                >
                  Try again
                </button>
              </p>
            </div>
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
            <i className="fas fa-key text-2xl text-purple-600"></i>
          </div>
          <h1 className="text-2xl font-bold text-white mb-2">Eternal Love Church</h1>
          <p className="text-blue-100">Church Family</p>
        </div>

        <div className="bg-white rounded-2xl shadow-xl p-6">
          <h2 className="text-xl font-semibold text-gray-800 text-center mb-2">
            Reset Your Password
          </h2>
          <p className="text-gray-600 text-center mb-6">
            Enter your email address and we'll send you instructions to reset your password.
          </p>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Email Address
              </label>
              <div className="relative">
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Enter your email address"
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all duration-200"
                  required
                  autoComplete="email"
                  disabled={loading}
                />
                <i className="fas fa-envelope absolute right-3 top-3 text-gray-400"></i>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-purple-600 text-white py-3 px-4 rounded-lg font-semibold hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200"
            >
              {loading ? (
                <div className="flex items-center justify-center">
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
                  Sending Instructions...
                </div>
              ) : (
                'Send Reset Instructions'
              )}
            </button>
          </form>

          <div className="mt-6 text-center">
            <p className="text-sm text-gray-600">
              Remember your password?{' '}
              <Link 
                to="/login" 
                className="text-purple-600 hover:text-purple-700 font-semibold transition-colors"
              >
                Back to Login
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

