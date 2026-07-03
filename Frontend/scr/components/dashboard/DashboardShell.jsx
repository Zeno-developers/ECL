import { useEffect, useRef, useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../../contexts/AuthContext'
import { useNotificationContext } from '../../contexts/NotificationBadgeContext'
import { AnimatePresence, motion } from 'framer-motion'
import {
  BarChart2,
  Bell,
  BookOpen,
  BookOpenCheck,
  Briefcase,
  Calendar,
  Check,
  ClipboardCheck,
  Crown,
  DollarSign,
  FileText,
  GitBranch,
  Grid3X3,
  Heart,
  HeartHandshake,
  Key,
  LayoutDashboard,
  LogOut,
  Map,
  Menu,
  MessageCircle,
  Radio,
  Settings,
  ShieldCheck,
  TreeDeciduous,
  Trash2,
  UserCheck,
  Users,
  X,
  Zap,
} from 'lucide-react'
import ConfirmDialog from '../ConfirmDialog'
import { getRoleDashboardPath } from '../../utils/roleRouting'

// Each item's `roles` = array of roles that can see it. Absent = visible to all authenticated.
// superadmin always sees everything.
const NAV_SECTIONS = [
  {
    group: 'OVERVIEW',
    items: [
      { label: 'Dashboard', pathFn: true, icon: LayoutDashboard },
      { label: 'Analytics', path: '/analytics', icon: BarChart2, roles: ['admin', 'superadmin', 'pastor', 'elder'] },
    ],
  },
  {
    group: 'PEOPLE',
    items: [
      { label: 'Members', path: '/members', icon: Users, roles: ['admin', 'superadmin', 'pastor', 'elder', 'zone_leader', 'cell_leader'] },
      { label: 'Attendance', path: '/checkin', icon: ClipboardCheck, roles: ['usher', 'admin', 'superadmin', 'pastor', 'elder'] },
      { label: 'Volunteers', path: '/volunteers', icon: UserCheck, roles: ['admin', 'superadmin', 'pastor', 'elder'] },
      { label: 'Permissions', path: '/permissions', icon: ShieldCheck, roles: ['admin', 'superadmin', 'pastor', 'elder'] },
    ],
  },
  {
    group: 'MINISTRY',
    items: [
      { label: 'Prayer', path: '/pastoral-care', icon: HeartHandshake, roles: ['admin', 'superadmin', 'pastor', 'elder'] },
      { label: 'Events', path: '/events/manage', memberPath: '/events', icon: Calendar },
      { label: 'Announcements', path: '/announcements', icon: Bell },
      { label: 'Chat', path: '/chat', icon: MessageCircle },
      { label: 'Giving', path: '/giving', icon: DollarSign, roles: ['member', 'usher'] },
    ],
  },
  {
    group: 'CELL',
    items: [
      { label: 'My Cell', path: '/cell/dashboard', icon: Grid3X3, roles: ['cell_leader'] },
      { label: 'Cell Attendance', path: '/cell/attendance', icon: ClipboardCheck, roles: ['cell_leader'] },
      { label: 'Meeting Polls', path: '/meetings/polls', icon: Calendar, roles: ['cell_leader', 'member', 'admin', 'pastor', 'superadmin', 'elder'] },
    ],
  },
  {
    group: 'CONTENT',
    items: [
      {label: 'Bible', path: '/bible', icon: BookOpen, roles: ['admin', 'superadmin', 'pastor', 'elder', 'member', 'zone_leader', 'cell_leader', 'usher']},
      { label: 'Blog', path: '/blog/manage', icon: FileText, roles: ['admin', 'superadmin', 'pastor', 'elder'] },
      {label: 'Sermon Prep', path: '/sermonPrepPage', icon: BookOpenCheck, roles: ['pastor', 'admin']},
      { label: 'Sermons Manager', path: '/sermons/manage', icon: BookOpen, roles: ['admin', 'pastor', 'elder'] },
    ],
  },
  {
    group: 'STRUCTURE',
    items: [
      { label: 'Zones', path: '/pastor/zones', icon: Map, roles: ['admin', 'superadmin', 'pastor', 'elder'] },
      { label: 'Cells', path: '/zone/cells', icon: Grid3X3, roles: ['zone_leader', 'admin', 'superadmin', 'pastor', 'elder'] },
      { label: 'Zone Members', path: '/zone/members', icon: Users, roles: ['zone_leader'] },
      { label: 'Leadership', path: '/leadership', icon: Crown, roles: ['admin', 'superadmin', 'pastor', 'elder', 'zone_leader', 'cell_leader'] },
      { label: 'Assignments', path: '/pastor/assignments', icon: GitBranch, roles: ['superadmin', 'pastor', 'elder'] },
    ],
  },
  {
    group: 'COMMUNITY',
    items: [
      { label: 'My Connections', path: '/my-connections', icon: Heart },
      { label: 'Family Tree', path: '/family', icon: TreeDeciduous, roles: ['admin', 'superadmin', 'pastor', 'elder'] },
      { label: 'Spiritual Lineage', path: '/spiritual-lineage', icon: GitBranch, roles: ['admin', 'superadmin', 'pastor', 'elder'] },
      { label: 'Disciples Groups', path: '/disciples', icon: BookOpenCheck },
    ],
  },
  {
    group: 'DEVELOPER',
    items: [
      { label: 'API Keys', path: '/developers/api-keys', icon: Key, roles: ['developer', 'superadmin'] },
      { label: 'Webhooks', path: '/developers/webhooks', icon: Radio, roles: ['developer', 'superadmin'] },
      { label: 'Integrations', path: '/developers/integrations', icon: Zap, roles: ['developer', 'superadmin'] },
    ],
  },
  {
    group: 'SYSTEM',
    items: [
      { label: 'Donations', path: '/donations', icon: DollarSign, roles: ['admin', 'superadmin', 'pastor', 'elder'] },
      { label: 'Contact', path: '/admin/contact-messages', icon: MessageCircle, roles: ['admin', 'superadmin', 'pastor', 'elder'] },
      { label: 'Careers', path: '/admin/careers', icon: Briefcase, roles: ['admin', 'superadmin'] },
      { label: 'Settings', path: '/settings', icon: Settings },
    ],
  },
]

function timeAgo(dateStr) {
  if (!dateStr) return ''
  const diff = (Date.now() - new Date(dateStr).getTime()) / 1000
  if (diff < 60) return 'just now'
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`
  return `${Math.floor(diff / 86400)}d ago`
}

function NotificationBell() {
  const { unreadCount, notifications, markRead, markAllRead, deleteNotification } = useNotificationContext()
  const [open, setOpen] = useState(false)
  const ref = useRef(null)

  useEffect(() => {
    function onClick(e) {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false)
    }
    document.addEventListener('mousedown', onClick)
    return () => document.removeEventListener('mousedown', onClick)
  }, [])

  const handleMark = (e, id) => {
    e.stopPropagation()
    markRead(id)
  }

  const handleDelete = (e, id) => {
    e.stopPropagation()
    deleteNotification(id)
  }

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen(o => !o)}
        className="relative flex items-center justify-center text-warm-muted transition hover:text-warm-charcoal"
        title="Notifications"
      >
        <Bell size={15} />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-warm-gold text-[9px] font-bold text-warm-espresso leading-none">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.14 }}
            className="absolute right-0 top-8 z-50 w-80 rounded-2xl border border-warm-charcoal/[0.08] bg-white shadow-xl overflow-hidden"
          >
            <div className="flex items-center justify-between px-4 py-3 border-b border-warm-charcoal/[0.06]">
              <p className="text-[10px] font-bold tracking-[0.18em] text-warm-gold/70">NOTIFICATIONS</p>
              {unreadCount > 0 && (
                <button onClick={markAllRead} className="text-[10px] font-semibold text-warm-gold hover:underline">
                  Mark all read
                </button>
              )}
            </div>

            <div className="max-h-80 overflow-y-auto divide-y divide-warm-charcoal/[0.04]">
              {notifications.length === 0 ? (
                <p className="py-8 text-center text-xs text-warm-muted">No notifications yet</p>
              ) : (
                notifications.map(n => (
                  <div
                    key={n.id}
                    className={`flex items-start gap-3 px-4 py-3 transition hover:bg-warm-ivory ${!n.is_read ? 'bg-warm-gold/[0.03]' : ''}`}
                  >
                    <div className={`mt-0.5 h-1.5 w-1.5 shrink-0 rounded-full ${!n.is_read ? 'bg-warm-gold' : 'bg-transparent'}`} />
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-semibold text-warm-espresso leading-snug">{n.title}</p>
                      <p className="text-[11px] text-warm-muted mt-0.5 line-clamp-2">{n.message}</p>
                      <p className="text-[10px] text-warm-muted/60 mt-1">{timeAgo(n.created_at)}</p>
                    </div>
                    <div className="flex shrink-0 items-center gap-1">
                      {!n.is_read && (
                        <button onClick={e => handleMark(e, n.id)} title="Mark read" className="text-warm-muted hover:text-warm-gold transition">
                          <Check size={12} />
                        </button>
                      )}
                      <button onClick={e => handleDelete(e, n.id)} title="Delete" className="text-warm-muted hover:text-red-400 transition">
                        <Trash2 size={12} />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

function canSeeItem(userRole, itemRoles) {
  if (userRole === 'superadmin') return true
  if (!itemRoles) return true
  return itemRoles.includes(userRole)
}

function getVisibleSections(userRole) {
  return NAV_SECTIONS.map((section) => ({
    ...section,
    items: section.items.filter((item) => canSeeItem(userRole, item.roles)),
  })).filter((section) => section.items.length > 0)
}

function isActive(pathname, path) {
  if (!path) return false
  if (path === '/pastor-dashboard' || path === '/admin-dashboard' || path === '/cell/dashboard' || path === '/zone/dashboard' || path === '/dashboard') {
    return pathname === path
  }
  return pathname === path || pathname.startsWith(path + '/')
}

function SidebarContent({ location, user, onLogout, onClose }) {
  const role = user?.role || 'member'
  const dashboardPath = getRoleDashboardPath(role)
  const visibleSections = getVisibleSections(role)

  return (
    <div className="flex h-full flex-col border-r border-warm-charcoal/[0.07] bg-white">

      {/* Logo */}
      <div className="flex items-center justify-between px-5 pt-5 pb-4">
        <Link to="/" onClick={onClose} className="flex items-center gap-3">
          <img src="/images/logo.png" alt="" className="h-7 w-7 object-contain opacity-70" />
          <div>
            <p className="text-[9px] font-bold tracking-[0.2em] text-warm-charcoal leading-none">
              ETERNAL LOVE
            </p>
            <p className="mt-0.5 text-[8px] tracking-[0.18em] text-warm-muted">CHURCH</p>
          </div>
        </Link>
        {onClose && (
          <button
            onClick={onClose}
            className="text-warm-muted transition hover:text-warm-charcoal md:hidden"
          >
            <X size={15} />
          </button>
        )}
      </div>

      {/* Navigation */}
      <nav className="flex-1 space-y-4 overflow-y-auto px-3 py-3">
        {visibleSections.map((section) => (
          <div key={section.group}>
            <p className="mb-1 px-3 text-[8px] font-bold tracking-[0.28em] text-warm-gold/70">
              {section.group}
            </p>
            <div className="space-y-0.5">
              {section.items.map(({ label, path, pathFn, memberPath, icon: Icon }) => {
                const resolvedPath = pathFn ? dashboardPath : (role === 'member' && memberPath ? memberPath : path)
                const active = isActive(location.pathname, resolvedPath)
                return (
                  <Link
                    key={resolvedPath}
                    to={resolvedPath}
                    onClick={onClose}
                    className={`group flex items-center gap-3 rounded-lg px-3 py-2 text-xs font-medium transition-all ${
                      active
                        ? 'bg-warm-espresso/[0.06] text-warm-espresso'
                        : 'text-warm-muted hover:bg-warm-charcoal/[0.03] hover:text-warm-charcoal'
                    }`}
                  >
                    <Icon
                      size={13}
                      className={`shrink-0 transition ${active ? 'text-warm-gold' : 'text-warm-gold/40 group-hover:text-warm-gold/70'}`}
                    />
                    <span>{label}</span>
                    {active && (
                      <span className="ml-auto h-2 w-2 rounded-full bg-emerald-500" />
                    )}
                  </Link>
                )
              })}
            </div>
          </div>
        ))}
      </nav>

      {/* User footer */}
      <div className="border-t border-warm-charcoal/[0.07] p-4">
        <div className="flex items-center gap-3">
          <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-warm-gold/10 text-[10px] font-bold text-warm-plum">
            {(user?.first_name?.[0] || user?.name?.[0] || 'U').toUpperCase()}
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-xs font-semibold text-warm-charcoal">
              {[user?.first_name, user?.last_name].filter(Boolean).join(' ') || user?.name || 'User'}
            </p>
            <p className="text-[10px] capitalize text-warm-muted">{user?.role || 'member'}</p>
          </div>
          <NotificationBell />
          <button
            onClick={onLogout}
            className="shrink-0 text-warm-muted transition hover:text-warm-charcoal"
            title="Sign out"
          >
            <LogOut size={13} />
          </button>
        </div>
      </div>
    </div>
  )
}

export default function DashboardShell({ children }) {
  const location = useLocation()
  const navigate = useNavigate()
  const { logout, user } = useAuth()
  const [mobileOpen, setMobileOpen] = useState(false)
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false)
  const mainRef = useRef(null)

  useEffect(() => {
    mainRef.current?.scrollTo({ top: 0, behavior: 'instant' })
  }, [location.pathname])

  const handleLogout = async () => {
    try {
      await logout()
    } finally {
      navigate('/login')
    }
  }

  const requestLogout = () => {
    setMobileOpen(false)
    setShowLogoutConfirm(true)
  }

  return (
    <div
      className="flex h-screen overflow-hidden"
      style={{
        background:
          'radial-gradient(ellipse at 8% 0%, rgba(198,167,125,0.07) 0%, transparent 50%), radial-gradient(ellipse at 92% 100%, rgba(123,94,87,0.04) 0%, transparent 45%), #FFFFFF',
      }}
    >
      <ConfirmDialog
        isOpen={showLogoutConfirm}
        title="Sign out"
        message="Are you sure you want to sign out?"
        confirmText="Sign out"
        cancelText="Cancel"
        onConfirm={handleLogout}
        onCancel={() => setShowLogoutConfirm(false)}
      />

      {/* Desktop sidebar */}
      <div className="hidden w-[220px] shrink-0 md:block">
        <SidebarContent
          location={location}
          user={user}
          onLogout={requestLogout}
        />
      </div>

      {/* Mobile sidebar */}
      <AnimatePresence>
        {mobileOpen && (
          <>
            <motion.div
              key="backdrop"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.18 }}
              onClick={() => setMobileOpen(false)}
              className="fixed inset-0 z-40 bg-warm-charcoal/40 md:hidden"
            />
            <motion.div
              key="panel"
              initial={{ x: -260 }}
              animate={{ x: 0 }}
              exit={{ x: -260 }}
              transition={{ type: 'spring', damping: 28, stiffness: 260 }}
              className="fixed left-0 top-0 z-50 h-full w-[260px] md:hidden"
            >
              <SidebarContent
                location={location}
                user={user}
                onLogout={requestLogout}
                onClose={() => setMobileOpen(false)}
              />
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Content area */}
      <div className="flex flex-1 flex-col overflow-hidden">

        {/* Mobile top bar */}
        <div className="flex items-center justify-between border-b border-warm-charcoal/[0.07] bg-white px-4 py-3.5 md:hidden">
          <Link to="/" className="flex items-center gap-2.5">
            <img src="/images/logo.png" alt="" className="h-5 w-5 object-contain opacity-60" />
            <p className="text-[9px] font-bold tracking-[0.22em] text-warm-charcoal">ETERNAL LOVE CHURCH</p>
          </Link>
          <div className="flex items-center gap-3">
            <NotificationBell />
            <button
              onClick={() => setMobileOpen(true)}
              className="text-warm-muted transition hover:text-warm-charcoal"
            >
              <Menu size={18} />
            </button>
          </div>
        </div>

        {/* Scrollable page content */}
        <main ref={mainRef} className="flex-1 overflow-y-auto">
          {children}
        </main>
      </div>
    </div>
  )
}
