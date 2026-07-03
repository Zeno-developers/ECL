import { useState, useEffect } from 'react'
import { membersAPI } from '../utils/api'
import { toast } from 'react-toastify'
import { Loader, Save, Search, Shield } from 'lucide-react'
import DashboardShell from '../components/dashboard/DashboardShell'

const ROLES = [
  'superadmin', 'admin', 'pastor', 'elder', 'zone_leader',
  'cell_leader', 'usher', 'developer', 'deacon', 'volunteer', 'member',
]

const roleBadge = (role) => {
  const map = {
    superadmin: 'text-red-700 bg-red-500/10',
    admin: 'text-violet-700 bg-violet-500/10',
    pastor: 'text-warm-plum bg-warm-gold/10',
    elder: 'text-indigo-700 bg-indigo-500/10',
    zone_leader: 'text-cyan-700 bg-cyan-500/10',
    cell_leader: 'text-teal-700 bg-teal-500/10',
    deacon: 'text-green-700 bg-green-500/10',
    volunteer: 'text-orange-700 bg-orange-500/10',
  }
  return map[role] || 'text-warm-muted bg-warm-charcoal/[0.05]'
}

const formatRole = (role) => {
  if (!role) return 'Member'
  if (role === 'superadmin') return 'Super Admin'
  if (role === 'zone_leader') return 'Zone Leader'
  if (role === 'cell_leader') return 'Cell Leader'
  return role.charAt(0).toUpperCase() + role.slice(1)
}

export default function PermissionsPage() {
  const [members, setMembers] = useState([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [saving, setSaving] = useState(null)

  useEffect(() => { loadMembers() }, [])

  const loadMembers = async () => {
    try {
      setLoading(true)
      const response = await membersAPI.getMembers()
      const data = response.data || response
      setMembers(Array.isArray(data) ? data.map((m) => ({ ...m, role: m.role || 'member' })) : [])
    } catch (error) {
      toast.error(error.message || 'Failed to load members')
      setMembers([])
    } finally {
      setLoading(false)
    }
  }

  const handleRoleChange = (memberId, newRole) => {
    setMembers((prev) => prev.map((m) => (m._id === memberId ? { ...m, role: newRole } : m)))
  }

  const handleSave = async (memberId) => {
    const member = members.find((m) => m._id === memberId)
    if (!member) return
    setSaving(memberId)
    try {
      await membersAPI.updateMember(memberId, { role: member.role })
      toast.success(`${member.name}'s role updated`)
    } catch (error) {
      toast.error(error.message || 'Failed to update role')
      loadMembers()
    } finally {
      setSaving(null)
    }
  }

  const filtered = members.filter(
    (m) =>
      m.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      m.email?.toLowerCase().includes(searchTerm.toLowerCase())
  )

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

        {/* Header */}
        <div className="border-b border-warm-charcoal/[0.07] pb-8">
          <h1 className="text-3xl font-black tracking-tighter text-warm-charcoal">PERMISSIONS</h1>
          <p className="mt-2 text-sm text-warm-muted">Assign and manage roles for church members.</p>
        </div>

        {/* Search */}
        <div className="relative">
          <Search size={14} className="absolute left-4 top-1/2 -translate-y-1/2 text-warm-muted" />
          <input
            type="text"
            placeholder="Search by name or email..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full rounded-xl border border-warm-charcoal/[0.1] bg-warm-ivory py-3 pl-10 pr-4 text-sm text-warm-charcoal placeholder-warm-muted focus:border-warm-gold/40 focus:outline-none focus:bg-white"
          />
        </div>

        {/* Table */}
        <div className="rounded-2xl border border-warm-charcoal/[0.07] bg-white shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-warm-charcoal/[0.07]">
                  <th className="py-3 px-5 text-left text-[9px] font-bold tracking-[0.2em] text-warm-gold/70">NAME</th>
                  <th className="py-3 px-5 text-left text-[9px] font-bold tracking-[0.2em] text-warm-gold/70">EMAIL</th>
                  <th className="py-3 px-5 text-left text-[9px] font-bold tracking-[0.2em] text-warm-gold/70">CURRENT ROLE</th>
                  <th className="py-3 px-5 text-left text-[9px] font-bold tracking-[0.2em] text-warm-gold/70">NEW ROLE</th>
                  <th className="py-3 px-5 text-left text-[9px] font-bold tracking-[0.2em] text-warm-gold/70">SAVE</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((member) => (
                  <tr key={member._id} className="border-b border-warm-charcoal/[0.05] transition hover:bg-warm-ivory">
                    <td className="py-3.5 px-5">
                      <div className="flex items-center gap-3">
                        <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-warm-gold/10 text-[10px] font-bold text-warm-gold">
                          {(member.name?.[0] || 'M').toUpperCase()}
                        </div>
                        <span className="text-sm font-medium text-warm-espresso">{member.name}</span>
                      </div>
                    </td>
                    <td className="py-3.5 px-5 text-sm text-warm-muted">{member.email}</td>
                    <td className="py-3.5 px-5">
                      <span className={`rounded-full px-2 py-0.5 text-[9px] font-bold tracking-[0.12em] ${roleBadge(member.role)}`}>
                        {formatRole(member.role).toUpperCase()}
                      </span>
                    </td>
                    <td className="py-3.5 px-5">
                      <select
                        value={member.role}
                        onChange={(e) => handleRoleChange(member._id, e.target.value)}
                        className="rounded-lg border border-warm-charcoal/[0.1] bg-warm-ivory px-3 py-1.5 text-xs text-warm-charcoal focus:border-warm-gold/40 focus:outline-none"
                      >
                        {ROLES.map((role) => (
                          <option key={role} value={role}>{formatRole(role)}</option>
                        ))}
                      </select>
                    </td>
                    <td className="py-3.5 px-5">
                      <button
                        onClick={() => handleSave(member._id)}
                        disabled={saving === member._id}
                        className="rounded-lg p-1.5 text-warm-muted transition hover:bg-warm-gold/[0.08] hover:text-warm-gold disabled:opacity-40"
                        title="Save"
                      >
                        {saving === member._id ? (
                          <Loader size={13} className="animate-spin" />
                        ) : (
                          <Save size={13} />
                        )}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {filtered.length === 0 && (
            <div className="py-16 text-center">
              <Shield size={32} className="mx-auto mb-4 text-warm-gold/30" />
              <p className="text-sm text-warm-muted">
                {searchTerm ? 'No members match your search' : 'No members found'}
              </p>
            </div>
          )}

          {filtered.length > 0 && (
            <div className="border-t border-warm-charcoal/[0.07] px-5 py-3">
              <p className="text-[10px] text-warm-muted">
                Showing {filtered.length} of {members.length} members
              </p>
            </div>
          )}
        </div>
      </div>
    </DashboardShell>
  )
}
