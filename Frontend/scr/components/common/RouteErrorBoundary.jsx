// src/components/common/RouteErrorBoundary.jsx
import React from 'react'
import { useRouteError, Link, useNavigate } from 'react-router-dom'
import { usePerformance } from '../../hooks/usePerformance'

const RouteErrorBoundary = () => {
  usePerformance('RouteErrorBoundary')
  const error = useRouteError()
  const navigate = useNavigate()

  console.error('Route error caught:', error)

  // Log error to analytics
  React.useEffect(() => {
    if (typeof gtag !== 'undefined') {
      gtag('event', 'route_error', {
        error_status: error.status,
        error_message: error.message,
        route: window.location.pathname,
        event_category: 'Error'
      })
    }
  }, [error])

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-900 to-blue-800 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg shadow-xl p-8 max-w-md w-full text-center">
        <div className="w-20 h-20 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <svg className="w-10 h-10 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.35 16.5c-.77.833.192 2.5 1.732 2.5z" />
          </svg>
        </div>
        
        <h1 className="text-2xl font-bold text-gray-900 mb-2">
          {error.status === 404 ? 'Page Not Found' : 'Page Error'}
        </h1>
        
        <p className="text-gray-600 mb-6">
          {error.status === 404 
            ? "The page you're looking for doesn't exist or has been moved."
            : "We encountered an issue loading this page. This might be a temporary problem."
          }
        </p>

        <div className="space-y-3">
          <button
            onClick={() => navigate(0)} // Reload current page
            className="w-full bg-purple-600 hover:bg-purple-700 text-white font-medium py-3 px-4 rounded-lg transition duration-200 flex items-center justify-center"
          >
            <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            Try Again
          </button>
          
          <button
            onClick={() => navigate(-1)}
            className="w-full bg-gray-200 hover:bg-gray-300 text-gray-800 font-medium py-3 px-4 rounded-lg transition duration-200 flex items-center justify-center"
          >
            <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
            Go Back
          </button>
          
          <Link
            to="/"
            className="block w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-3 px-4 rounded-lg transition duration-200 flex items-center justify-center"
          >
            <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
            </svg>
            Go to Homepage
          </Link>
        </div>

        {process.env.NODE_ENV === 'development' && error && (
          <details className="mt-6 text-left">
            <summary className="cursor-pointer text-sm text-gray-500 mb-2">
              Error Details (Development)
            </summary>
            <div className="bg-gray-100 p-3 rounded text-xs font-mono overflow-auto max-h-40">
              <div className="text-red-600 font-semibold mb-1">
                {error.statusText || error.message}
              </div>
              {error.status && (
                <div className="text-gray-700 mb-1">
                  Status: {error.status}
                </div>
              )}
              {error.data && (
                <div className="text-gray-700">
                  Data: {typeof error.data === 'string' ? error.data : JSON.stringify(error.data, null, 2)}
                </div>
              )}
            </div>
          </details>
        )}

        {/* Support information */}
        <div className="mt-6 pt-6 border-t border-gray-200">
          <p className="text-sm text-gray-500">
            Need help?{' '}
            <Link to="/contact" className="text-purple-600 hover:text-purple-700 font-medium">
              Contact support
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}

export default RouteErrorBoundary
