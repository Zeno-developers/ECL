import { useState, useEffect } from 'react'
import { membersAPI } from '../utils/api'
import { toast } from 'react-toastify'
import { Crown, Users, Mail, Phone, MapPin, UserPlus } from 'lucide-react'
import DashboardShell from '../components/dashboard/DashboardShell'
import { DashboardStatGrid } from '../components/dashboard/RoleDashboardUI'
import { useNavigate } from 'react-router-dom'

const roleStyles = {
  pastor: 'text-warm-plum bg-warm-gold/10',
  elder: 'text-blue-700 bg-blue-500/10',
  deacon: 'text-emerald-700 bg-emerald-500/10',
  volunteer: 'text-amber-700 bg-amber-500/10',
}

const roleLabels = { pastor: 'Pastor', elder: 'Elder', deacon: 'Deacon', volunteer: 'Volunteer', member: 'Member' }

const selectCls = 'flex-1 text-xs rounded-xl border border-warm-charcoal/[0.1] bg-warm-ivory px-3 py-2 text-warm-charcoal focus:border-warm-gold/40 focus:outline-none disabled:opacity-50 focus:bg-white'

export default function LeadershipPage() {
  const navigate = useNavigate()
  const [leaders, setLeaders] = useState([])
  const [loading, setLoading] = useState(true)
  const [updatingRole, setUpdatingRole] = useState(null)

  useEffect(() => { loadLeaders() }, [])

  const loadLeaders = async () => {
    try {
      const response = await membersAPI.getMembers()
      const membersData = response.data || response
      const leadershipRoles = ['pastor', 'elder', 'deacon']
      setLeaders(Array.isArray(membersData) ? membersData.filter((m) => leadershipRoles.includes(m.role)) : [])
    } catch (error) {
      toast.error(error.message || 'Failed to load leadership team')
      setLeaders([])
    } finally {
      setLoading(false)
    }
  }

  const handleRoleUpdate = async (memberId, newRole) => {
    setUpdatingRole(memberId)
    try {
      await membersAPI.updateMemberRole(memberId, newRole)
      setLeaders((prev) => prev.map((l) => l._id === memberId ? { ...l, role: newRole } : l))
      toast.success('Leadership role updated successfully')
    } catch (error) {
      toast.error(error.message || 'Failed to update role')
    } finally {
      setUpdatingRole(null)
    }
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
      <div className="mx-auto max-w-5xl px-5 sm:px-8 py-8 space-y-6">

        <div className="flex items-start justify-between gap-4 border-b border-warm-charcoal/[0.07] pb-8">
          <div>
            <h1 className="text-3xl font-black tracking-tighter text-warm-charcoal">LEADERSHIP TEAM</h1>
            <p className="mt-2 text-sm text-warm-muted">Manage church leadership and roles.</p>
          </div>
          <button
            onClick={() => navigate('/members')}
            className="inline-flex items-center gap-2 rounded-xl bg-warm-gold px-5 py-2.5 text-xs font-bold tracking-[0.18em] text-warm-espresso transition hover:opacity-90 shrink-0"
          >
            <UserPlus size={13} />
            MANAGE MEMBERS
          </button>
        </div>

        <DashboardStatGrid
          stats={[
            { label: 'Pastors', value: leaders.filter((l) => l.role === 'pastor').length, icon: Crown },
            { label: 'Elders', value: leaders.filter((l) => l.role === 'elder').length, icon: Users },
            { label: 'Deacons', value: leaders.filter((l) => l.role === 'deacon').length, icon: Users },
            { label: 'Total Leaders', value: leaders.length, icon: Users },
          ]}
        />

        {leaders.length === 0 ? (
          <div className="rounded-2xl border border-warm-charcoal/[0.07] bg-white p-12 text-center shadow-sm">
            <Crown size={36} className="mx-auto mb-3 text-warm-gold/30" />
            <p className="text-sm font-semibold text-warm-espresso mb-1">No Leadership Team</p>
            <p className="text-xs text-warm-muted">Start by assigning members to leadership roles.</p>
            <button
              onClick={() => navigate('/members')}
              className="mt-4 inline-flex items-center gap-2 rounded-xl bg-warm-gold px-5 py-2.5 text-xs font-bold tracking-[0.18em] text-warm-espresso transition hover:opacity-90"
            >
              Go to Members
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {leaders.map((leader) => (
              <div key={leader._id} className="rounded-2xl border border-warm-charcoal/[0.07] bg-white p-6 text-center space-y-3 shadow-sm">
                <div className="w-14 h-14 rounded-full bg-warm-gold/10 border border-warm-gold/20 flex items-center justify-center mx-auto">
                  <Users size={22} className="text-warm-gold" />
                </div>
                <div>
                  <p className="text-sm font-bold text-warm-espresso">{leader.name}</p>
                  <span className={`inline-block rounded-full px-2.5 py-0.5 text-[10px] font-bold tracking-[0.12em] mt-1 ${roleStyles[leader.role] || 'text-warm-muted bg-warm-charcoal/[0.05]'}`}>
                    {roleLabels[leader.role] || leader.role}
                  </span>
                </div>
                <div className="space-y-1.5 text-xs text-warm-muted">
                  {leader.email && <div className="flex items-center justify-center gap-1.5"><Mail size={11} />{leader.email}</div>}
                  {leader.phone && <div className="flex items-center justify-center gap-1.5"><Phone size={11} />{leader.phone}</div>}
                  {leader.address && <div className="flex items-center justify-center gap-1.5"><MapPin size={11} /><span className="truncate max-w-[12rem]">{leader.address}</span></div>}
                </div>
                <div className="flex items-center gap-2">
                  <select
                    value={leader.role}
                    onChange={(e) => handleRoleUpdate(leader._id, e.target.value)}
                    disabled={updatingRole === leader._id}
                    className={selectCls}
                  >
                    <option value="pastor">Pastor</option>
                    <option value="elder">Elder</option>
                    <option value="deacon">Deacon</option>
                    <option value="volunteer">Volunteer</option>
                    <option value="member">Member</option>
                  </select>
                  {updatingRole === leader._id && (
                    <div className="h-4 w-4 animate-spin rounded-full border-2 border-warm-charcoal/10 border-t-warm-gold shrink-0" />
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </DashboardShell>
  )
}
