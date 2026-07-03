import { Navigate } from 'react-router-dom'
import { useAuth } from '../../contexts/AuthContext'
import LoadingSpinner from './LoadingSpinner'
import {
  getRoleDashboardPath,
  hasDeveloperAccess,
  hasPastorAccess,
  hasRequiredRoleAccess,
  isSuperAdmin,
} from '../../utils/roleRouting'

export default function ProtectedRoute({
  children,
  requirePastor = false,
  requireDeveloper = false,
  requireRoles = [],
}) {
  const { user, loading, isAuthenticated } = useAuth()

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <LoadingSpinner size="large" />
      </div>
    )
  }

  if (!isAuthenticated || !user) {
    return <Navigate to="/login" replace />
  }

  const redirectPath = getRoleDashboardPath(user?.role)
  const isSuperAdminUser = isSuperAdmin(user?.role)

  if (requireRoles.length > 0 && !hasRequiredRoleAccess(user?.role, requireRoles)) {
    console.log('ProtectedRoute: Role access required but not granted', {
      userRole: user.role,
      requiredRoles: requireRoles,
      isSuperAdmin: isSuperAdminUser,
    })
    return <Navigate to={redirectPath} replace />
  }

  if (requireDeveloper && !hasDeveloperAccess(user)) {
    console.log('ProtectedRoute: Developer access required but not granted', {
      userRole: user.role,
      userPermissions: user.permissions,
      isSuperAdmin: isSuperAdminUser,
    })
    return <Navigate to={redirectPath} replace />
  }

  if (requirePastor && !hasPastorAccess(user?.role)) {
    console.log('ProtectedRoute: Pastor access required but not granted', {
      userRole: user.role,
      isSuperAdmin: isSuperAdminUser,
    })
    return <Navigate to={redirectPath} replace />
  }

  console.log('ProtectedRoute: Access granted', {
    userRole: user.role,
    isSuperAdmin: isSuperAdminUser,
    requirePastor,
    requireDeveloper,
    requireRoles,
  })

  return children
}
