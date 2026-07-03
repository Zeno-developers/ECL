import { useState, useEffect } from 'react'
import { membersAPI } from '../utils/api'
import { toast } from 'react-toastify'
import { Users, UserCheck, Phone, Mail, MapPin, Calendar } from 'lucide-react'
import DashboardShell from '../components/dashboard/DashboardShell'
import { DashboardStatGrid } from '../components/dashboard/RoleDashboardUI'

const roleLabels = { volunteer: 'Volunteer', deacon: 'Deacon', elder: 'Elder', member: 'Member' }
const roleStyles = {
  volunteer: 'text-amber-700 bg-amber-500/10',
  deacon: 'text-emerald-700 bg-emerald-500/10',
  elder: 'text-blue-700 bg-blue-500/10',
}

const selectCls = 'text-xs rounded-xl border border-warm-charcoal/[0.1] bg-warm-ivory px-3 py-1.5 text-warm-charcoal focus:border-warm-gold/40 focus:outline-none disabled:opacity-50 focus:bg-white'

export default function VolunteersPage() {
  const [volunteers, setVolunteers] = useState([])
  const [loading, setLoading] = useState(true)
  const [updatingRole, setUpdatingRole] = useState(null)

  useEffect(() => { loadVolunteers() }, [])

  const loadVolunteers = async () => {
    try {
      const members = await membersAPI.getMembers()
      const volunteerRoles = ['volunteer', 'deacon', 'elder']
      setVolunteers((Array.isArray(members) ? members : members?.data || []).filter((m) =>
        volunteerRoles.includes(m.role) || m.isVolunteer
      ))
    } catch {
      toast.error('Failed to load volunteers')
    } finally {
      setLoading(false)
    }
  }

  const handleRoleUpdate = async (memberId, newRole) => {
    setUpdatingRole(memberId)
    try {
      await membersAPI.updateMemberRole(memberId, newRole)
      setVolunteers((prev) => prev.map((v) => v._id === memberId ? { ...v, role: newRole } : v))
      toast.success('Volunteer role updated successfully')
    } catch {
      toast.error('Failed to update volunteer role')
    } finally {
      setUpdatingRole(null)
    }
  }

  const now = new Date()
  const stats = {
    total: volunteers.length,
    active: volunteers.filter((v) => v.status === 'active').length,
    newThisMonth: volunteers.filter((v) => {
      const d = new Date(v.joinDate || v.createdAt)
      return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear()
    }).length,
  }

  if (loading) {
    return (
      <DashboardShell>
        <div className="flex h-full items-center justify-center py-32">
          <div className="h-5 w-5 animate-spin rounded-full border-2 border-warm-charcoal/10 border-t-warm-gold" />
        </div>
      </DashboardShell>
    )
  }

  return (
    <DashboardShell>
      <div className="mx-auto max-w-6xl px-5 sm:px-8 py-8 space-y-6">

        <div className="border-b border-warm-charcoal/[0.07] pb-8">
          <h1 className="text-3xl font-black tracking-tighter text-warm-charcoal">VOLUNTEERS</h1>
          <p className="mt-2 text-sm text-warm-muted">Manage church volunteers and their roles.</p>
        </div>

        <DashboardStatGrid
          stats={[
            { label: 'Total Volunteers', value: stats.total, icon: Users },
            { label: 'Active Volunteers', value: stats.active, icon: UserCheck },
            { label: 'New This Month', value: stats.newThisMonth, icon: Calendar },
            { label: 'Elders', value: volunteers.filter((v) => v.role === 'elder').length, icon: Users },
          ]}
        />

        {/* Table */}
        <div className="rounded-2xl border border-warm-charcoal/[0.07] bg-white overflow-hidden shadow-sm">
          <div className="px-5 py-4 border-b border-warm-charcoal/[0.07]">
            <p className="text-xs font-bold tracking-[0.18em] text-warm-gold/70">VOLUNTEER TEAM</p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-warm-charcoal/[0.07]">
                  {['Volunteer', 'Contact', 'Role', 'Status', 'Join Date', ''].map((h) => (
                    <th key={h} className="px-5 py-3.5 text-left text-[9px] font-bold tracking-[0.2em] text-warm-gold/70">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {volunteers.length === 0 ? (
                  <tr><td colSpan="6" className="px-5 py-12 text-center text-sm text-warm-muted">
                    <Users size={32} className="mx-auto mb-3 text-warm-gold/30" />
                    <p>No volunteers yet. Start by assigning volunteer roles to members.</p>
                  </td></tr>
                ) : (
                  volunteers.map((volunteer) => (
                    <tr key={volunteer._id} className="border-b border-warm-charcoal/[0.05] transition hover:bg-warm-ivory">
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-warm-gold/10 flex items-center justify-center shrink-0">
                            <Users size={14} className="text-warm-gold" />
                          </div>
                          <div>
                            <p className="text-sm font-semibold text-warm-espresso">{volunteer.name}</p>
                            <p className="text-xs text-warm-muted">{volunteer.email}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-5 py-4">
                        <div className="space-y-1">
                          {volunteer.phone && <div className="flex items-center gap-1.5 text-xs text-warm-muted"><Phone size={11} />{volunteer.phone}</div>}
                          {volunteer.address && <div className="flex items-center gap-1.5 text-xs text-warm-muted"><MapPin size={11} /><span className="truncate max-w-[10rem]">{volunteer.address}</span></div>}
                        </div>
                      </td>
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-2">
                          <select
                            value={volunteer.role}
                            onChange={(e) => handleRoleUpdate(volunteer._id, e.target.value)}
                            disabled={updatingRole === volunteer._id}
                            className={selectCls}
                          >
                            <option value="volunteer">Volunteer</option>
                            <option value="deacon">Deacon</option>
                            <option value="elder">Elder</option>
                            <option value="member">Member</option>
                          </select>
                          {updatingRole === volunteer._id && (
                            <div className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-warm-charcoal/10 border-t-warm-gold" />
                          )}
                        </div>
                      </td>
                      <td className="px-5 py-4">
                        <span className={`rounded-full px-2 py-0.5 text-[9px] font-bold tracking-[0.12em] ${
                          volunteer.status === 'active'
                            ? 'text-emerald-700 bg-emerald-500/10'
                            : volunteer.status === 'inactive'
                            ? 'text-red-700 bg-red-500/10'
                            : 'text-warm-muted bg-warm-charcoal/[0.05]'
                        }`}>
                          {(volunteer.status || 'ACTIVE').toUpperCase()}
                        </span>
                      </td>
                      <td className="px-5 py-4 text-xs text-warm-muted">
                        {volunteer.joinDate ? new Date(volunteer.joinDate).toLocaleDateString() : 'N/A'}
                      </td>
                      <td className="px-5 py-4">
                        <div className="flex gap-2">
                          <button className="p-1.5 text-warm-muted hover:text-warm-charcoal transition"><Mail size={14} /></button>
                          <button className="p-1.5 text-warm-muted hover:text-warm-charcoal transition"><Phone size={14} /></button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Roles breakdown */}
        {volunteers.length > 0 && (
          <div>
            <p className="text-[9px] font-bold tracking-[0.22em] text-warm-gold/70 mb-3">VOLUNTEER ROLES BREAKDOWN</p>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {['volunteer', 'deacon', 'elder'].map((role) => {
                const roleVolunteers = volunteers.filter((v) => v.role === role)
                if (!roleVolunteers.length) return null
                return (
                  <div key={role} className="rounded-xl border border-warm-charcoal/[0.07] bg-white p-4 shadow-sm">
                    <div className="flex items-center justify-between mb-3">
                      <p className="text-xs font-semibold text-warm-espresso capitalize">{role}</p>
                      <span className={`rounded-full px-2 py-0.5 text-[9px] font-bold tracking-[0.12em] ${roleStyles[role] || 'text-warm-muted bg-warm-charcoal/[0.05]'}`}>{roleVolunteers.length}</span>
                    </div>
                    <div className="space-y-2">
                      {roleVolunteers.slice(0, 3).map((v) => (
                        <div key={v._id} className="flex items-center gap-2 text-xs text-warm-muted">
                          <div className="w-5 h-5 rounded-full bg-warm-gold/10 flex items-center justify-center shrink-0">
                            <Users size={10} className="text-warm-gold" />
                          </div>
                          <span className="truncate">{v.name}</span>
                        </div>
                      ))}
                      {roleVolunteers.length > 3 && <p className="text-[10px] text-warm-muted">+{roleVolunteers.length - 3} more</p>}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )}
      </div>
    </DashboardShell>
  )
}
