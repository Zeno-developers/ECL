export const SUPERADMIN_ROLE = 'superadmin'
export const ADMIN_ACCESS_ROLES = ['admin', SUPERADMIN_ROLE]
export const PASTOR_ACCESS_ROLES = ['admin', 'pastor', 'elder', SUPERADMIN_ROLE]
export const DEVELOPER_ACCESS_ROLES = ['developer', SUPERADMIN_ROLE]

export const isSuperAdmin = (role) => role === SUPERADMIN_ROLE

export const hasAdminAccess = (role) => ADMIN_ACCESS_ROLES.includes(role)

export const hasPastorAccess = (role) => PASTOR_ACCESS_ROLES.includes(role)

export const hasDeveloperAccess = (user) =>
  DEVELOPER_ACCESS_ROLES.includes(user?.role) || user?.permissions?.includes('api:access')

export const hasRequiredRoleAccess = (role, requiredRoles = []) =>
  isSuperAdmin(role) || requiredRoles.length === 0 || requiredRoles.includes(role)

export const getRoleDashboardPath = (role) => {
  if (hasAdminAccess(role)) return '/admin-dashboard'
  if (hasPastorAccess(role)) return '/pastor-dashboard'
  if (role === 'cell_leader') return '/cell/dashboard'
  if (role === 'zone_leader') return '/zone/dashboard'
  if (role === 'developer') return '/developers/api-keys'
  if (role === 'usher') return '/checkin'
  return '/dashboard'
}
