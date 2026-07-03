import React from 'react';
import { AlertTriangle, Home, RefreshCw, Mail } from 'lucide-react';
import { useRouteError, Link } from 'react-router-dom';

const ErrorPage = () => {
  const error = useRouteError();
  
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
      <div className="max-w-md w-full text-center">
        <div className="bg-white rounded-2xl border border-gray-200 p-8 shadow-sm">
          {/* Icon */}
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <AlertTriangle size={32} className="text-red-600" />
          </div>

          {/* Title */}
          <h1 className="text-2xl font-bold text-gray-900 mb-2">
            Something went wrong
          </h1>
          
          {/* Error Message */}
          <p className="text-gray-600 mb-6">
            {error?.statusText || error?.message || 'An unexpected error occurred'}
          </p>

          {/* Error Details (for development) */}
          {process.env.NODE_ENV === 'development' && error && (
            <details className="bg-gray-100 rounded-lg p-4 mb-6 text-left">
              <summary className="cursor-pointer font-medium text-gray-700">
                Error Details
              </summary>
              <pre className="mt-2 text-sm text-gray-600 whitespace-pre-wrap">
                {JSON.stringify(error, null, 2)}
              </pre>
            </details>
          )}

          {/* Action Buttons */}
          <div className="space-y-3">
            <Link
              to="/"
              className="w-full bg-purple-600 text-white px-6 py-3 rounded-lg hover:bg-purple-700 transition-colors flex items-center justify-center space-x-2"
            >
              <Home size={20} />
              <span>Go Home</span>
            </Link>
            
            <button
              onClick={() => window.location.reload()}
              className="w-full border border-gray-300 text-gray-700 px-6 py-3 rounded-lg hover:bg-gray-50 transition-colors flex items-center justify-center space-x-2"
            >
              <RefreshCw size={20} />
              <span>Refresh Page</span>
            </button>

            <a
              href="mailto:support@elchurch.site"
              className="w-full border border-gray-300 text-gray-700 px-6 py-3 rounded-lg hover:bg-gray-50 transition-colors flex items-center justify-center space-x-2"
            >
              <Mail size={20} />
              <span>Contact Support</span>
            </a>
          </div>

          {/* Support Info */}
          <div className="mt-6 pt-6 border-t border-gray-200">
            <p className="text-sm text-gray-500">
              If this problem continues, please contact our support team at{' '}
              <a href="mailto:support@elchurch.site" className="text-purple-600 hover:text-purple-700">
                support@elchurch.site
              </a>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ErrorPage;
