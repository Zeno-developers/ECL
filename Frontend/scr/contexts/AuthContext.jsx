import { createContext, useContext, useState, useEffect, useRef } from 'react'
import { authAPI } from '../utils/api'
import {
  clearOfflineSession,
  isOfflineAuthNetworkError,
  recordOfflineSession,
  restoreOfflineSession,
  verifyOfflineCredentials,
} from '../utils/offlineAuth'

const AuthContext = createContext()
const AUTH_VALIDATION_CACHE_KEY = 'elchurch_auth_last_validated_at'
const AUTH_VALIDATION_THROTTLE_MS = 5 * 60 * 1000

const getAuthUserSignature = (value) => ({
  id: value?.id ?? value?._id ?? null,
  role: value?.role ?? null,
  email: value?.email ?? null,
  name: value?.name ?? null,
  mustChangePassword: Boolean(value?.mustChangePassword),
  permissions: Array.isArray(value?.permissions)
    ? [...value.permissions].slice().sort().join('|')
    : '',
})

const isSameAuthUser = (currentUser, nextUser) => {
  const currentSignature = getAuthUserSignature(currentUser)
  const nextSignature = getAuthUserSignature(nextUser)
  return JSON.stringify(currentSignature) === JSON.stringify(nextSignature)
}

// Use named export for the provider
export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [requiresPasswordChange, setRequiresPasswordChange] = useState(false)
  const [offlineMode, setOfflineMode] = useState(false)
  const [isOnline, setIsOnline] = useState(
    typeof navigator !== 'undefined' ? navigator.onLine : true
  )
  const tokenRefreshIntervalRef = useRef(null)
  const refreshInFlightRef = useRef(null)
  const lastValidationAtRef = useRef(
    typeof window !== 'undefined'
      ? Number(window.localStorage.getItem(AUTH_VALIDATION_CACHE_KEY) || 0)
      : 0
  )

  const recordSuccessfulValidation = () => {
    const now = Date.now()
    lastValidationAtRef.current = now
    if (typeof window !== 'undefined') {
      window.localStorage.setItem(AUTH_VALIDATION_CACHE_KEY, String(now))
    }
  }

  const updateAuthUser = (nextUser) => {
    setUser((currentUser) => (isSameAuthUser(currentUser, nextUser) ? currentUser : nextUser))
  }

  const hasRecentValidation = () => {
    const lastValidation = lastValidationAtRef.current || 0
    return lastValidation > 0 && Date.now() - lastValidation < AUTH_VALIDATION_THROTTLE_MS
  }

  const hydrateStoredUser = () => {
    const storedUser = localStorage.getItem('user')
    if (!storedUser) {
      return false
    }

    try {
      const parsedUser = JSON.parse(storedUser)
      updateAuthUser(parsedUser)
      setIsAuthenticated(true)
      setOfflineMode(false)
      if (parsedUser?.mustChangePassword) {
        setRequiresPasswordChange(true)
      }
      return true
    } catch (error) {
      console.warn('Failed to parse stored user for auth hydration:', error)
      return false
    }
  }

  // Function to refresh token - UPDATED for backend consistency
  const refreshToken = async () => {
    if (refreshInFlightRef.current) {
      return refreshInFlightRef.current
    }

    const refreshPromise = (async () => {
      try {
        if (offlineMode || !isOnline) {
          return true
        }

        const token = localStorage.getItem('token')
        if (!token) {
          console.log('No token found for refresh')
          return false
        }

        // Call the backend /me endpoint to validate token
        const response = await authAPI.getCurrentUser()
        
        // Match backend response structure
        if (response.status === 'success' && response.data.user) {
          console.log('Token refresh successful')
          const userData = response.data.user
          
          updateAuthUser(userData)
          setOfflineMode(false)
          localStorage.setItem('user', JSON.stringify(userData))
          recordSuccessfulValidation()
          
          // Check if password change is required
          if (userData.mustChangePassword) {
            setRequiresPasswordChange(true)
          }
          
          return true
        }
        return false
      } catch (error) {
        console.error('Token refresh failed:', error)
        if (error?.status === 429) {
          return true
        }
        return false
      }
    })()

    refreshInFlightRef.current = refreshPromise
    try {
      return await refreshPromise
    } finally {
      refreshInFlightRef.current = null
    }
  }

  const hydrateOfflineSession = () => {
    const storedUser = localStorage.getItem('user')
    if (storedUser) {
      try {
        const parsedUser = JSON.parse(storedUser)
        updateAuthUser(parsedUser)
        setIsAuthenticated(true)
        setOfflineMode(true)
        if (parsedUser?.mustChangePassword) {
          setRequiresPasswordChange(true)
        }
        return true
      } catch (error) {
        console.warn('Failed to parse stored user for offline session:', error)
      }
    }

    const offlineSession = restoreOfflineSession()
    if (offlineSession?.user) {
      updateAuthUser(offlineSession.user)
      setIsAuthenticated(true)
      setOfflineMode(true)
      localStorage.setItem('user', JSON.stringify(offlineSession.user))
      if (offlineSession.token) {
        localStorage.setItem('token', offlineSession.token)
      }
      if (offlineSession.refreshToken) {
        localStorage.setItem('refresh_token', offlineSession.refreshToken)
      }
      return true
    }

    return false
  }

  // Setup token refresh interval
  const setupTokenRefresh = () => {
    if (tokenRefreshIntervalRef.current) {
      clearInterval(tokenRefreshIntervalRef.current)
    }

    // Refresh token every 30 minutes
    const interval = setInterval(async () => {
      const success = await refreshToken()
      if (!success) {
        console.warn('Token refresh failed, logging out...')
        logout()
      }
    }, 30 * 60 * 1000)

    tokenRefreshIntervalRef.current = interval
  }

  // Check for existing authentication on app start
  useEffect(() => {
    const initializeAuth = async () => {
      const token = localStorage.getItem('token')
      const userData = localStorage.getItem('user')
      
      if (token && userData) {
        if (!isOnline) {
          hydrateOfflineSession()
          setLoading(false)
          return
        }

        try {
          const shouldSkipNetworkValidation = hasRecentValidation() && hydrateStoredUser()

          if (shouldSkipNetworkValidation) {
            setupTokenRefresh()
          } else {
            const isValid = await refreshToken()
            if (isValid) {
              setIsAuthenticated(true)
              setOfflineMode(false)
              setupTokenRefresh()
            } else {
              console.warn('Stored token is invalid, clearing auth data')
              localStorage.removeItem('token')
              localStorage.removeItem('refresh_token')
              localStorage.removeItem('user')
            }
          }
        } catch (error) {
          console.error('Error initializing auth:', error)
          if (!navigator.onLine) {
            hydrateOfflineSession()
          } else {
            localStorage.removeItem('token')
            localStorage.removeItem('refresh_token')
            localStorage.removeItem('user')
          }
        }
      } else if (!isOnline) {
        hydrateOfflineSession()
      }
      
      setLoading(false)
    }

    initializeAuth()

    return () => {
      if (tokenRefreshIntervalRef.current) {
        clearInterval(tokenRefreshIntervalRef.current)
        tokenRefreshIntervalRef.current = null
      }
    }
  }, [])

  useEffect(() => {
    const handleOnline = async () => {
      setIsOnline(true)

      const storedToken = localStorage.getItem('token')
      const storedUser = localStorage.getItem('user')
      if (storedToken && storedUser) {
        try {
          if (hasRecentValidation() && hydrateStoredUser()) {
            setOfflineMode(false)
            setupTokenRefresh()
            return
          }

          const isValid = await refreshToken()
          if (isValid) {
            setOfflineMode(false)
            setupTokenRefresh()
          }
        } catch (error) {
          console.warn('Online refresh failed after reconnect:', error)
        }
      }
    }

    const handleOffline = () => setIsOnline(false)

    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)

    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
    }
  }, [])

  // FIXED Login function - now passes email and password separately
  const login = async (email, password) => {
    try {
      console.log('AuthContext: Attempting login for:', email)

      if (!isOnline) {
        const offlineAccount = await verifyOfflineCredentials(email, password)
        if (offlineAccount?.user) {
          const offlineUser = offlineAccount.user
          updateAuthUser(offlineUser)
          setIsAuthenticated(true)
          setOfflineMode(true)
          localStorage.setItem('user', JSON.stringify(offlineUser))
          if (offlineAccount.token) {
            localStorage.setItem('token', offlineAccount.token)
          }
          if (offlineAccount.refreshToken) {
            localStorage.setItem('refresh_token', offlineAccount.refreshToken)
          }

          return {
            success: true,
            user: offlineUser,
            offline: true,
          }
        }

        return {
          success: false,
          error: 'You are offline and no cached account matches those credentials.',
        }
      }
      
      // ✅ FIXED: Call API with separate parameters
      const response = await authAPI.login(email, password)
      console.log('AuthContext: Login response:', response)
      
      // Handle password change required response
      if (response.status === 'password_change_required') {
        console.log('Password change required for user:', response.user)
        return {
          success: true,
          user: response.user,
          requiresPasswordChange: true
        }
      }
      
      // Handle successful login
      if (response.status === 'success' && response.token && response.user) {
        const userData = response.user
        updateAuthUser(userData)
        setIsAuthenticated(true)
        setOfflineMode(false)
        localStorage.setItem('user', JSON.stringify(userData))
        localStorage.setItem('token', response.token)
        recordSuccessfulValidation()
        await recordOfflineSession({
          email,
          password,
          user: userData,
          token: response.token,
          refreshToken: response.refresh_token,
        })
        
        // Check if password change is required
        if (userData.mustChangePassword) {
          setRequiresPasswordChange(true)
          return {
            success: true,
            user: userData,
            requiresPasswordChange: true
          }
        }
        
        setRequiresPasswordChange(false)
        setupTokenRefresh()
        
        return {
          success: true,
          user: userData,
          token: response.token
        }
      } else if (response.status === 'success') {
        return {
          success: true,
          message: response.message || 'Password reset successful'
        }
      } else {
        return {
          success: false,
          error: response.message || 'Login failed'
        }
      }
    } catch (error) {
      console.error('AuthContext: Login error:', error)
      if (isOfflineAuthNetworkError(error)) {
        const offlineAccount = await verifyOfflineCredentials(email, password)
        if (offlineAccount?.user) {
          const offlineUser = offlineAccount.user
          updateAuthUser(offlineUser)
          setIsAuthenticated(true)
          setOfflineMode(true)
          localStorage.setItem('user', JSON.stringify(offlineUser))
          if (offlineAccount.token) {
            localStorage.setItem('token', offlineAccount.token)
          }
          if (offlineAccount.refreshToken) {
            localStorage.setItem('refresh_token', offlineAccount.refreshToken)
          }

          return {
            success: true,
            user: offlineUser,
            offline: true,
          }
        }
      }
      // Extract message from backend AppError structure
      const errorMessage = error.response?.data?.message || error.message || 'Login failed. Please check your credentials.'
      return {
        success: false,
        error: errorMessage
      }
    }
  }

  // Register function - expects userData object
  const register = async (userData) => {
    try {
      console.log('AuthContext: Attempting registration for:', userData.email)
      const response = await authAPI.register(userData)
      console.log('AuthContext: Registration response:', response)
      
      // Match backend response structure
      if (response.status === 'pending_verification') {
        return {
          success: true,
          pendingVerification: true,
          email: response.email,
          phone: response.phone,
          message: response.message,
        }
      }
      if (response.status === 'success' && response.token && response.user) {
        const newUser = response.user
        updateAuthUser(newUser)
        setIsAuthenticated(true)
        setOfflineMode(false)
        localStorage.setItem('user', JSON.stringify(newUser))
        localStorage.setItem('token', response.token)
        recordSuccessfulValidation()
        await recordOfflineSession({
          email: userData.email,
          password: userData.password,
          user: newUser,
          token: response.token,
          refreshToken: response.refresh_token,
        })
        setupTokenRefresh()
        return { success: true, user: newUser, token: response.token }
      } else {
        return { success: false, error: response.message || 'Registration failed' }
      }
    } catch (error) {
      console.error('AuthContext: Registration error:', error)
      // Extract message from backend AppError structure
      const errorMessage = error.response?.data?.message || error.message || 'Registration failed. Please try again.'
      return {
        success: false,
        error: errorMessage
      }
    }
  }

  // Developer registration
  const registerDeveloper = async (userData) => {
    try {
      console.log('AuthContext: Attempting developer registration for:', userData.email)
      const response = await authAPI.registerDeveloper(userData)
      console.log('AuthContext: Developer registration response:', response)
      
      if (response.status === 'success' && response.token && response.user) {
        const newUser = response.user
        updateAuthUser(newUser)
        setIsAuthenticated(true)
        setOfflineMode(false)
        localStorage.setItem('user', JSON.stringify(newUser))
        localStorage.setItem('token', response.token)
        recordSuccessfulValidation()
        await recordOfflineSession({
          email: userData.email,
          password: userData.password,
          user: newUser,
          token: response.token,
          refreshToken: response.refresh_token,
        })
        
        setupTokenRefresh()
        
        return {
          success: true,
          user: newUser,
          token: response.token
        }
      } else {
        return {
          success: false,
          error: response.message || 'Developer registration failed'
        }
      }
    } catch (error) {
      console.error('AuthContext: Developer registration error:', error)
      const errorMessage = error.response?.data?.message || error.message || 'Developer registration failed. Please try again.'
      return {
        success: false,
        error: errorMessage
      }
    }
  }

  // Update password function
  const updatePassword = async (passwordData) => {
    try {
      const response = await authAPI.updatePassword(passwordData)
      
      if (response.status === 'success' && response.token && response.user) {
        const userData = response.user
        updateAuthUser(userData)
        setRequiresPasswordChange(false)
        setOfflineMode(false)
        localStorage.setItem('user', JSON.stringify(userData))
        localStorage.setItem('token', response.token)
        recordSuccessfulValidation()
        
        return {
          success: true,
          user: userData,
          token: response.token
        }
      } else {
        return {
          success: false,
          error: response.message || 'Password update failed'
        }
      }
    } catch (error) {
      const errorMessage = error.response?.data?.message || error.message || 'Password update failed'
      return {
        success: false,
        error: errorMessage
      }
    }
  }

  // Force password change for temporary passwords
  const forceChangePassword = async (...args) => {
    const passwordData =
      args.length === 1 && typeof args[0] === 'object'
        ? args[0]
        : {
            email: args[0],
            newPassword: args[1],
            newPasswordConfirm: args[2]
          }

    try {
      const response = await authAPI.forceChangePassword(passwordData)
      
      if (response.status === 'success' && response.token && response.user) {
        const userData = response.user
        updateAuthUser(userData)
        setIsAuthenticated(true)
        setRequiresPasswordChange(false)
        setOfflineMode(false)
        localStorage.setItem('user', JSON.stringify(userData))
        localStorage.setItem('token', response.token)
        recordSuccessfulValidation()
        
        setupTokenRefresh()
        
        return {
          success: true,
          user: userData,
          token: response.token
        }
      } else {
        return {
          success: false,
          error: response.message || 'Password change failed'
        }
      }
    } catch (error) {
      const errorMessage = error.response?.data?.message || error.message || 'Password change failed'
      return {
        success: false,
        error: errorMessage
      }
    }
  }

  // Forgot password functionality
  const forgotPassword = async (identifier) => {
    try {
      const response = await authAPI.forgotPassword(identifier)

      if (response.status === 'success') {
        return {
          success: true,
          message: response.message || 'Password reset instructions sent'
        }
      } else {
        return {
          success: false,
          error: response.message || 'Failed to send reset instructions'
        }
      }
    } catch (error) {
      const errorMessage = error.response?.data?.message || error.message || 'Failed to send reset instructions'
      return {
        success: false,
        error: errorMessage
      }
    }
  }

  // Reset password with token
  const resetPassword = async (resetData) => {
    try {
      console.log('🔐 AuthContext: Reset password called with:', resetData)
      console.log('🔐 AuthContext: Data type:', typeof resetData)
      
      // ✅ FIXED: Proper object validation and extraction
      if (!resetData || typeof resetData !== 'object') {
        console.error('🔐 AuthContext: Invalid reset data - expected object')
        return {
          success: false,
          error: 'Invalid reset data format'
        }
      }

      const { token, newPassword } = resetData
      
      // Validate we have both token and newPassword
      if (!token || !newPassword) {
        console.error('🔐 AuthContext: Missing token or newPassword:', { 
          hasToken: !!token, 
          hasNewPassword: !!newPassword 
        })
        return {
          success: false,
          error: 'Token and new password are required'
        }
      }
      
      console.log('🔐 AuthContext: Token length:', token.length)
      console.log('🔐 AuthContext: New password length:', newPassword.length)
      
      // ✅ FIXED: Call API with proper parameters
      const response = await authAPI.resetPassword(token, newPassword)
      
      if (response.status === 'success' && response.token && response.user) {
        const userData = response.user
        updateAuthUser(userData)
        setIsAuthenticated(true)
        setRequiresPasswordChange(false)
        localStorage.setItem('user', JSON.stringify(userData))
        localStorage.setItem('token', response.token)
        recordSuccessfulValidation()
        
        setupTokenRefresh()
        
        return {
          success: true,
          user: userData,
          token: response.token
        }
      } else {
        return {
          success: false,
          error: response.message || 'Password reset failed'
        }
      }
    } catch (error) {
      console.error('🔐 AuthContext: Reset password error:', error)
      const errorMessage = error.response?.data?.message || error.message || 'Password reset failed'
      return {
        success: false,
        error: errorMessage
      }
    }
  }

  // Admin create user
  const adminCreateUser = async (userData) => {
    try {
      const response = await authAPI.adminCreateUser(userData)
      
      if (response.status === 'success') {
        return {
          success: true,
          message: response.message,
          user: response.data.user
        }
      } else {
        return {
          success: false,
          error: response.message || 'Failed to create user'
        }
      }
    } catch (error) {
      const errorMessage = error.response?.data?.message || error.message || 'Failed to create user'
      return {
        success: false,
        error: errorMessage
      }
    }
  }

  // Logout function
  const logout = () => {
    updateAuthUser(null)
    setIsAuthenticated(false)
    setRequiresPasswordChange(false)
    setOfflineMode(false)
    localStorage.removeItem('user')
    localStorage.removeItem('token')
    localStorage.removeItem('refresh_token')
    clearOfflineSession()
    
    if (tokenRefreshIntervalRef.current) {
      clearInterval(tokenRefreshIntervalRef.current)
      tokenRefreshIntervalRef.current = null
    }
    
    window.location.href = '/login'
  }

  // Update user data
  const updateUser = (userData) => {
    updateAuthUser(userData)
    localStorage.setItem('user', JSON.stringify(userData))
  }

  // Manual token refresh
  const manualRefreshToken = async () => {
    return await refreshToken()
  }

  // Clear password change requirement
  const clearPasswordChangeRequirement = () => {
    setRequiresPasswordChange(false)
  }

  // Context value
  const value = {
    user,
    loading,
    isAuthenticated,
    requiresPasswordChange,
    login,
    register,
    registerDeveloper,
    logout,
    updateUser,
    updatePassword,
    forceChangePassword,
    forgotPassword,
    resetPassword,
    adminCreateUser,
    refreshToken: manualRefreshToken,
    clearPasswordChangeRequirement,
    offlineMode,
    isOnline,
  }

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  )
}

// Named export for the hook
export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}
