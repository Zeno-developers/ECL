// src/main.jsx
import React from 'react'
import ReactDOM from 'react-dom/client'
import { HelmetProvider } from 'react-helmet-async'
import App from './App.jsx'
import './styles/globals.css'
import { motion } from 'framer-motion'; // Make sure to install framer-motion
import { API_CONFIG } from './config/api'

// Enhanced Error Boundary Component
class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { 
      hasError: false,
      error: null,
      errorInfo: null,
      errorId: null
    };
  }

  static getDerivedStateFromError(error) {
    return { 
      hasError: true,
      errorId: Math.random().toString(36).substr(2, 9)
    };
  }

  componentDidCatch(error, errorInfo) {
    this.setState({
      error: error,
      errorInfo: errorInfo
    });
    
    console.error('App error caught by boundary:', error, errorInfo);
    
    // Send to analytics service in production
    if (typeof gtag !== 'undefined') {
      gtag('event', 'exception', {
        description: error.toString(),
        fatal: true,
        errorId: this.state.errorId
      });
    }

    // Log to error reporting service
    this.logErrorToService(error, errorInfo);
  }

  logErrorToService = async (error, errorInfo) => {
    try {
      await fetch(`${API_CONFIG.BASE_URL}/error-log`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          errorId: this.state.errorId,
          error: error.toString(),
          errorInfo: errorInfo.componentStack,
          url: window.location.href,
          userAgent: navigator.userAgent,
          timestamp: new Date().toISOString()
        })
      });
    } catch (loggingError) {
      console.error('Failed to log error:', loggingError);
    }
  };

  handleReload = () => {
    this.setState({ 
      hasError: false, 
      error: null, 
      errorInfo: null,
      errorId: null 
    });
    window.location.reload();
  };

  handleGoHome = () => {
    this.setState({ 
      hasError: false, 
      error: null, 
      errorInfo: null,
      errorId: null 
    });
    window.location.href = '/';
  };

  copyErrorDetails = () => {
    const errorDetails = `
Error ID: ${this.state.errorId}
Error: ${this.state.error?.toString()}
Component Stack: ${this.state.errorInfo?.componentStack}
URL: ${window.location.href}
User Agent: ${navigator.userAgent}
Timestamp: ${new Date().toISOString()}
    `.trim();

    navigator.clipboard.writeText(errorDetails).then(() => {
      alert('Error details copied to clipboard. Please share this with support.');
    }).catch(() => {
      alert('Failed to copy error details. Please take a screenshot.');
    });
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-gradient-to-br from-purple-900 to-blue-800 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg shadow-xl p-8 max-w-md w-full text-center">
            <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.35 16.5c-.77.833.192 2.5 1.732 2.5z" />
              </svg>
            </div>
            
            <h1 className="text-2xl font-bold text-gray-900 mb-2">Something went wrong</h1>
            <p className="text-gray-600 mb-4">
              We're sorry, but something unexpected happened. Our team has been notified.
            </p>
            
            {this.state.errorId && (
              <div className="bg-gray-100 rounded-lg p-3 mb-4">
                <p className="text-sm text-gray-600 font-mono">
                  Error ID: {this.state.errorId}
                </p>
              </div>
            )}

            <div className="space-y-3">
              <button
                onClick={this.handleReload}
                className="w-full bg-purple-600 hover:bg-purple-700 text-white font-medium py-3 px-4 rounded-lg transition duration-200 flex items-center justify-center"
              >
                <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
                Reload Application
              </button>
              
              <button
                onClick={this.handleGoHome}
                className="w-full bg-gray-200 hover:bg-gray-300 text-gray-800 font-medium py-3 px-4 rounded-lg transition duration-200 flex items-center justify-center"
              >
                <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
                </svg>
                Go to Homepage
              </button>

              <button
                onClick={this.copyErrorDetails}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-3 px-4 rounded-lg transition duration-200 flex items-center justify-center"
              >
                <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                </svg>
                Copy Error Details
              </button>
            </div>

            {process.env.NODE_ENV === 'development' && this.state.errorInfo && (
              <details className="mt-6 text-left">
                <summary className="cursor-pointer text-sm text-gray-500 mb-2">
                  Error Details (Development)
                </summary>
                <pre className="mt-2 text-xs text-red-600 overflow-auto bg-gray-100 p-3 rounded max-h-40">
                  {this.state.error && this.state.error.toString()}
                  {'\n'}
                  {this.state.errorInfo.componentStack}
                </pre>
              </details>
            )}
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

// Loading screen removed - app loads instantly

const AppWithSuspense = () => {
  React.useEffect(() => {
    // Dispatch event to HTML that app is mounted
    window.dispatchEvent(new Event('app-mounted'));
  }, []);
  
  return <App />;
};

const registerServiceWorker = () => {
  if (!('serviceWorker' in navigator)) {
    return;
  }

  window.addEventListener('load', async () => {
    try {
      await navigator.serviceWorker.register('/sw.js');
      console.log('Service worker registered successfully');
    } catch (error) {
      console.error('Service worker registration failed:', error);
    }
  });
};

// Enhanced React render with performance monitoring
const rootElement = document.getElementById('root');
const startTime = performance.now();

// Check if root element exists
if (rootElement) {
  const root = ReactDOM.createRoot(rootElement);
  registerServiceWorker();
  
  root.render(
    <React.StrictMode>
      <HelmetProvider>
        <ErrorBoundary>
          <AppWithSuspense />
        </ErrorBoundary>
      </HelmetProvider>
    </React.StrictMode>
  );

  // Log performance metrics
  window.addEventListener('load', () => {
    const loadTime = performance.now() - startTime;
    console.log(`🚀 Application loaded in ${loadTime.toFixed(2)}ms`);
    
    if (typeof gtag !== 'undefined') {
      gtag('event', 'timing_complete', {
        name: 'app_initial_load',
        value: Math.round(loadTime),
        event_category: 'Performance'
      });
    }
  });
} else {
  console.error('Root element not found');
}
