// pages/DeveloperRegister.jsx
import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { 
  Code, 
  User, 
  Mail, 
  Eye, 
  EyeOff, 
  Shield,
  Check,
  Github,
  Building,
  Calendar,
  Briefcase,
  ArrowLeft
} from 'lucide-react';
import { toast } from 'react-toastify';
import { useAuth } from '../contexts/AuthContext';

const DeveloperRegister = () => {
  const navigate = useNavigate();
  const { registerDeveloper } = useAuth();
  const [formData, setFormData] = useState({
    // Basic info
    name: '',
    email: '',
    password: '',
    confirmPassword: '',
    
    // Developer-specific info
    company: '',
    website: '',
    useCase: '',
    projectDescription: '',
    
    // Terms
    acceptTerms: false,
    subscribeNewsletter: true
  });
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [currentStep, setCurrentStep] = useState(1);

  const useCases = [
    { id: 'church-app', label: 'Church Mobile App', description: 'Building a mobile app for a church' },
    { id: 'website-integration', label: 'Website Integration', description: 'Integrating with a church website' },
    { id: 'internal-tools', label: 'Internal Church Tools', description: 'Building tools for church administration' },
    { id: 'third-party-app', label: 'Third-party Application', description: 'Commercial application for multiple churches' },
    { id: 'personal-project', label: 'Personal Project', description: 'Learning or personal development' },
    { id: 'other', label: 'Other', description: 'Different use case' }
  ];

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (currentStep < 3) {
      setCurrentStep(currentStep + 1);
      return;
    }

    // Final submission
    setIsLoading(true);

    // Validation
    if (formData.password !== formData.confirmPassword) {
      toast.error('Passwords do not match');
      setIsLoading(false);
      return;
    }

    if (!formData.acceptTerms) {
      toast.error('Please accept the terms and conditions');
      setIsLoading(false);
      return;
    }

    try {
      console.log('🔐 DeveloperRegister: Attempting registration');
      
      const userData = {
        name: formData.name,
        email: formData.email,
        password: formData.password,
        role: 'developer', // Set as developer
        permissions: ['api:access'], // Grant API access
        developerProfile: {
          company: formData.company,
          website: formData.website,
          useCase: formData.useCase,
          projectDescription: formData.projectDescription
        },
        communicationPreferences: {
          newsletter: formData.subscribeNewsletter,
          productUpdates: true,
          apiChanges: true
        }
      };

      const result = await registerDeveloper(userData);
      
      if (result.success) {
        console.log('✅ DeveloperRegister: Registration successful', result.user);
        toast.success('Developer account created successfully!');
        
        // Redirect to developer onboarding or API keys
        navigate('/developers/api-keys?onboarding=true');
      } else {
        console.log('❌ DeveloperRegister: Registration failed', result.error);
        toast.error(result.error || 'Registration failed');
      }
    } catch (error) {
      console.error('❌ DeveloperRegister: Registration error:', error);
      toast.error('Registration failed. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const nextStep = () => {
    if (currentStep === 1 && (!formData.name || !formData.email)) {
      toast.error('Please fill in all required fields');
      return;
    }
    if (currentStep === 2 && !formData.password) {
      toast.error('Please create a password');
      return;
    }
    setCurrentStep(currentStep + 1);
  };

  const prevStep = () => {
    setCurrentStep(currentStep - 1);
  };

  const StepIndicator = () => (
    <div className="flex justify-center mb-8">
      <div className="flex items-center space-x-4">
        {[1, 2, 3].map((step) => (
          <div key={step} className="flex items-center">
            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
              step === currentStep
                ? 'bg-purple-600 text-white'
                : step < currentStep
                ? 'bg-green-500 text-white'
                : 'bg-gray-300 text-gray-600'
            }`}>
              {step < currentStep ? <Check size={16} /> : step}
            </div>
            {step < 3 && (
              <div className={`w-12 h-1 mx-2 ${
                step < currentStep ? 'bg-green-500' : 'bg-gray-300'
              }`} />
            )}
          </div>
        ))}
      </div>
    </div>
  );

  const StepLabels = () => (
    <div className="flex justify-between text-xs text-gray-500 mb-2">
      <span className={currentStep >= 1 ? 'text-purple-600 font-medium' : ''}>Basic Info</span>
      <span className={currentStep >= 2 ? 'text-purple-600 font-medium' : ''}>Account</span>
      <span className={currentStep >= 3 ? 'text-purple-600 font-medium' : ''}>Project</span>
    </div>
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 to-purple-900 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        {/* Header */}
        <div className="text-center">
          <div className="flex items-center justify-between mb-6">
            <button
              onClick={() => navigate(-1)}
              className="text-gray-400 hover:text-white transition-colors"
            >
              <ArrowLeft size={20} />
            </button>
            <Link to="/" className="flex items-center justify-center space-x-3 flex-1">
              <div className="w-12 h-12 bg-purple-600 rounded-lg flex items-center justify-center">
                <Code className="h-6 w-6 text-white" />
              </div>
              <span className="text-2xl font-bold text-white">ChurchDev API</span>
            </Link>
            <div className="w-6"></div> {/* Spacer for alignment */}
          </div>
          <h2 className="text-3xl font-bold text-white">
            Developer Registration
          </h2>
          <p className="mt-2 text-sm text-purple-200">
            Join our developer community and start building
          </p>
        </div>

        {/* Progress */}
        <div className="bg-gray-800 rounded-lg p-4">
          <StepLabels />
          <StepIndicator />
        </div>

        {/* Registration Form */}
        <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
          {/* Step 1: Basic Information */}
          {currentStep === 1 && (
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              className="space-y-4"
            >
              <div>
                <label htmlFor="name" className="block text-sm font-medium text-gray-200">
                  Full Name *
                </label>
                <div className="mt-1 relative">
                  <User className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <input
                    id="name"
                    name="name"
                    type="text"
                    required
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="appearance-none block w-full pl-10 px-3 py-2 border border-gray-600 rounded-md placeholder-gray-400 focus:outline-none focus:ring-purple-500 focus:border-purple-500 bg-gray-700 text-white sm:text-sm"
                    placeholder="John Developer"
                  />
                </div>
              </div>

              <div>
                <label htmlFor="email" className="block text-sm font-medium text-gray-200">
                  Email Address *
                </label>
                <div className="mt-1 relative">
                  <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <input
                    id="email"
                    name="email"
                    type="email"
                    autoComplete="email"
                    required
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    className="appearance-none block w-full pl-10 px-3 py-2 border border-gray-600 rounded-md placeholder-gray-400 focus:outline-none focus:ring-purple-500 focus:border-purple-500 bg-gray-700 text-white sm:text-sm"
                    placeholder="developer@example.com"
                  />
                </div>
              </div>

              <div>
                <label htmlFor="company" className="block text-sm font-medium text-gray-200">
                  Company/Organization
                </label>
                <div className="mt-1 relative">
                  <Building className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <input
                    id="company"
                    name="company"
                    type="text"
                    value={formData.company}
                    onChange={(e) => setFormData({ ...formData, company: e.target.value })}
                    className="appearance-none block w-full pl-10 px-3 py-2 border border-gray-600 rounded-md placeholder-gray-400 focus:outline-none focus:ring-purple-500 focus:border-purple-500 bg-gray-700 text-white sm:text-sm"
                    placeholder="Your Company (Optional)"
                  />
                </div>
              </div>
            </motion.div>
          )}

          {/* Step 2: Account Security */}
          {currentStep === 2 && (
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              className="space-y-4"
            >
              <div>
                <label htmlFor="password" className="block text-sm font-medium text-gray-200">
                  Password *
                </label>
                <div className="mt-1 relative">
                  <Shield className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <input
                    id="password"
                    name="password"
                    type={showPassword ? 'text' : 'password'}
                    required
                    value={formData.password}
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                    className="appearance-none block w-full pl-10 pr-10 px-3 py-2 border border-gray-600 rounded-md placeholder-gray-400 focus:outline-none focus:ring-purple-500 focus:border-purple-500 bg-gray-700 text-white sm:text-sm"
                    placeholder="Create a strong password"
                  />
                  <button
                    type="button"
                    className="absolute right-3 top-1/2 transform -translate-y-1/2"
                    onClick={() => setShowPassword(!showPassword)}
                  >
                    {showPassword ? (
                      <EyeOff className="h-4 w-4 text-gray-400" />
                    ) : (
                      <Eye className="h-4 w-4 text-gray-400" />
                    )}
                  </button>
                </div>
                <p className="mt-1 text-xs text-gray-400">
                  Minimum 8 characters with letters and numbers
                </p>
              </div>

              <div>
                <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-200">
                  Confirm Password *
                </label>
                <div className="mt-1">
                  <input
                    id="confirmPassword"
                    name="confirmPassword"
                    type={showPassword ? 'text' : 'password'}
                    required
                    value={formData.confirmPassword}
                    onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
                    className="appearance-none block w-full px-3 py-2 border border-gray-600 rounded-md placeholder-gray-400 focus:outline-none focus:ring-purple-500 focus:border-purple-500 bg-gray-700 text-white sm:text-sm"
                    placeholder="Confirm your password"
                  />
                </div>
              </div>

              <div className="bg-blue-900 bg-opacity-20 border border-blue-700 rounded-lg p-3">
                <div className="flex items-start space-x-2">
                  <Shield className="h-4 w-4 text-blue-400 mt-0.5" />
                  <div>
                    <p className="text-blue-300 text-sm font-medium">Developer Account Benefits</p>
                    <ul className="text-blue-200 text-xs mt-1 space-y-1">
                      <li>• API access with generous rate limits</li>
                      <li>• Webhook support for real-time data</li>
                      <li>• Dedicated developer documentation</li>
                      <li>• Priority technical support</li>
                    </ul>
                  </div>
                </div>
              </div>
            </motion.div>
          )}

          {/* Step 3: Project Details */}
          {currentStep === 3 && (
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              className="space-y-4"
            >
              <div>
                <label htmlFor="useCase" className="block text-sm font-medium text-gray-200">
                  What will you build? *
                </label>
                <div className="mt-2 space-y-2">
                  {useCases.map((useCase) => (
                    <label
                      key={useCase.id}
                      className="flex items-start space-x-3 p-3 border border-gray-600 rounded-lg cursor-pointer hover:bg-gray-700 transition-colors"
                    >
                      <input
                        type="radio"
                        name="useCase"
                        value={useCase.id}
                        checked={formData.useCase === useCase.id}
                        onChange={(e) => setFormData({ ...formData, useCase: e.target.value })}
                        className="mt-1 text-purple-600 focus:ring-purple-500"
                        required
                      />
                      <div className="flex-1">
                        <span className="font-medium text-white text-sm">{useCase.label}</span>
                        <p className="text-gray-400 text-xs mt-1">{useCase.description}</p>
                      </div>
                    </label>
                  ))}
                </div>
              </div>

              <div>
                <label htmlFor="projectDescription" className="block text-sm font-medium text-gray-200">
                  Project Description (Optional)
                </label>
                <textarea
                  id="projectDescription"
                  name="projectDescription"
                  rows={3}
                  value={formData.projectDescription}
                  onChange={(e) => setFormData({ ...formData, projectDescription: e.target.value })}
                  className="mt-1 block w-full px-3 py-2 border border-gray-600 rounded-md placeholder-gray-400 focus:outline-none focus:ring-purple-500 focus:border-purple-500 bg-gray-700 text-white sm:text-sm"
                  placeholder="Tell us about your project..."
                />
              </div>

              <div>
                <label htmlFor="website" className="block text-sm font-medium text-gray-200">
                  Website (Optional)
                </label>
                <div className="mt-1 relative">
                  <Briefcase className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <input
                    id="website"
                    name="website"
                    type="url"
                    value={formData.website}
                    onChange={(e) => setFormData({ ...formData, website: e.target.value })}
                    className="appearance-none block w-full pl-10 px-3 py-2 border border-gray-600 rounded-md placeholder-gray-400 focus:outline-none focus:ring-purple-500 focus:border-purple-500 bg-gray-700 text-white sm:text-sm"
                    placeholder="https://yourproject.com"
                  />
                </div>
              </div>

              <div className="space-y-3">
                <div className="flex items-center">
                  <input
                    id="acceptTerms"
                    name="acceptTerms"
                    type="checkbox"
                    checked={formData.acceptTerms}
                    onChange={(e) => setFormData({ ...formData, acceptTerms: e.target.checked })}
                    className="h-4 w-4 text-purple-600 focus:ring-purple-500 border-gray-600 rounded bg-gray-700"
                    required
                  />
                  <label htmlFor="acceptTerms" className="ml-2 block text-sm text-gray-200">
                    I agree to the{' '}
                    <a href="/terms/developers" className="text-purple-400 hover:text-purple-300">
                      Developer Terms of Service
                    </a>{' '}
                    and{' '}
                    <a href="/privacy" className="text-purple-400 hover:text-purple-300">
                      Privacy Policy
                    </a>
                  </label>
                </div>

                <div className="flex items-center">
                  <input
                    id="subscribeNewsletter"
                    name="subscribeNewsletter"
                    type="checkbox"
                    checked={formData.subscribeNewsletter}
                    onChange={(e) => setFormData({ ...formData, subscribeNewsletter: e.target.checked })}
                    className="h-4 w-4 text-purple-600 focus:ring-purple-500 border-gray-600 rounded bg-gray-700"
                  />
                  <label htmlFor="subscribeNewsletter" className="ml-2 block text-sm text-gray-200">
                    Send me API updates, new features, and developer news
                  </label>
                </div>
              </div>
            </motion.div>
          )}

          {/* Navigation Buttons */}
          <div className="flex space-x-3">
            {currentStep > 1 && (
              <button
                type="button"
                onClick={prevStep}
                className="flex-1 bg-gray-700 text-white px-4 py-2 rounded-lg hover:bg-gray-600 transition-colors"
              >
                Back
              </button>
            )}
            
            {currentStep < 3 ? (
              <button
                type="button"
                onClick={nextStep}
                className="flex-1 bg-purple-600 text-white px-4 py-2 rounded-lg hover:bg-purple-700 transition-colors"
              >
                Continue
              </button>
            ) : (
              <button
                type="submit"
                disabled={isLoading}
                className="flex-1 bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2"
              >
                {isLoading ? (
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                ) : (
                  <>
                    <Check size={16} />
                    <span>Create Developer Account</span>
                  </>
                )}
              </button>
            )}
          </div>
        </form>

        {/* Footer Links */}
        <div className="text-center">
          <p className="text-sm text-gray-400">
            Already have an account?{' '}
            <Link to="/developers/login" className="font-medium text-purple-400 hover:text-purple-300">
              Sign in here
            </Link>
          </p>
          <p className="text-xs text-gray-500 mt-2">
            Looking for regular church member account?{' '}
            <Link to="/register" className="text-purple-400 hover:text-purple-300">
              Sign up as member
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
};

export default DeveloperRegister;
