import { useState, useEffect } from 'react'
import { membersAPI } from '../utils/api'
import { toast } from 'react-toastify'
import { useNavigate } from 'react-router-dom'
import { Edit, Eye, Loader, Network, Search, Trash2, UserPlus, Users } from 'lucide-react'
import DashboardShell from '../components/dashboard/DashboardShell'
import AssignMemberModal from '../components/members/AssignMemberModal'

const roleBadge = (role) => {
  const map = {
    pastor: 'text-warm-plum bg-warm-gold/10',
    admin: 'text-violet-700 bg-violet-500/10',
    elder: 'text-indigo-700 bg-indigo-500/10',
    zone_leader: 'text-cyan-700 bg-cyan-500/10',
    cell_leader: 'text-teal-700 bg-teal-500/10',
    deacon: 'text-green-700 bg-green-500/10',
    volunteer: 'text-orange-700 bg-orange-500/10',
  }
  return map[role] || 'text-warm-muted bg-warm-charcoal/[0.05]'
}

const statusBadge = (status) => {
  if (status === 'active') return 'text-emerald-700 bg-emerald-500/10'
  if (status === 'inactive') return 'text-red-700 bg-red-500/10'
  return 'text-amber-700 bg-amber-500/10'
}

const formatRole = (role) => {
  if (!role) return 'Member'
  if (role === 'zone_leader') return 'Zone Leader'
  if (role === 'cell_leader') return 'Cell Leader'
  return role.charAt(0).toUpperCase() + role.slice(1)
}

export default function MembersPage() {
  const [members, setMembers] = useState([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [deleteLoading, setDeleteLoading] = useState(null)
  const [assigningMember, setAssigningMember] = useState(null)
  const [filterUnassigned, setFilterUnassigned] = useState(false)
  const navigate = useNavigate()

  useEffect(() => { loadMembers() }, [])

  const loadMembers = async () => {
    try {
      setLoading(true)
      const response = await membersAPI.getMembers()
      const data = response.data || response
      setMembers(Array.isArray(data) ? data : [])
    } catch (error) {
      toast.error(error.message || 'Failed to load members')
      setMembers([])
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async (memberId, memberName) => {
    if (!window.confirm(`Delete ${memberName}?`)) return
    setDeleteLoading(memberId)
    try {
      await membersAPI.deleteMember(memberId)
      setMembers((prev) => prev.filter((m) => m._id !== memberId))
      toast.success('Member deleted')
    } catch (error) {
      toast.error(error.message || 'Failed to delete member')
    } finally {
      setDeleteLoading(null)
    }
  }

  const filtered = members.filter((m) => {
    const matchesSearch =
      m.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      m.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      m.phone?.includes(searchTerm)
    const matchesAssignment = filterUnassigned ? !m.cell_id : true
    return matchesSearch && matchesAssignment
  })

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
        <div className="flex items-start justify-between gap-4 border-b border-warm-charcoal/[0.07] pb-8">
          <div>
            <h1 className="text-3xl font-black tracking-tighter text-warm-charcoal">MEMBERS</h1>
            <p className="mt-2 text-sm text-warm-muted">Manage church members and their information.</p>
          </div>
          <button
            onClick={() => navigate('/members/add')}
            className="inline-flex items-center gap-2 rounded-xl bg-warm-gold px-5 py-2.5 text-xs font-bold tracking-[0.18em] text-warm-espresso transition hover:opacity-90"
          >
            <UserPlus size={14} />
            ADD MEMBER
          </button>
        </div>

        {/* Search */}
        <div className="relative">
          <Search size={14} className="absolute left-4 top-1/2 -translate-y-1/2 text-warm-muted" />
          <input
            type="text"
            placeholder="Search by name, email, or phone..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full rounded-xl border border-warm-charcoal/[0.1] bg-warm-ivory py-3 pl-10 pr-4 text-sm text-warm-charcoal placeholder-warm-muted focus:border-warm-gold/40 focus:outline-none focus:bg-white"
          />
        </div>

        {/* Filter bar */}
        <div className="flex items-center gap-3">
          <button
            onClick={() => setFilterUnassigned((v) => !v)}
            className={`rounded-xl border px-4 py-2 text-xs font-bold tracking-[0.14em] transition ${
              filterUnassigned
                ? 'border-warm-gold bg-warm-gold text-warm-espresso'
                : 'border-warm-charcoal/[0.1] bg-white text-warm-muted hover:text-warm-charcoal'
            }`}
          >
            {filterUnassigned ? 'SHOW ALL' : 'UNASSIGNED ONLY'}
          </button>
          {filterUnassigned && (
            <p className="text-[10px] text-warm-muted">Members with no cell assignment</p>
          )}
        </div>

        {/* Table */}
        <div className="rounded-2xl border border-warm-charcoal/[0.07] bg-white shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-warm-charcoal/[0.07]">
                  <th className="py-3 px-5 text-left text-[9px] font-bold tracking-[0.2em] text-warm-gold/70">NAME</th>
                  <th className="py-3 px-5 text-left text-[9px] font-bold tracking-[0.2em] text-warm-gold/70">EMAIL</th>
                  <th className="py-3 px-5 text-left text-[9px] font-bold tracking-[0.2em] text-warm-gold/70">PHONE</th>
                  <th className="py-3 px-5 text-left text-[9px] font-bold tracking-[0.2em] text-warm-gold/70">ROLE</th>
                  <th className="py-3 px-5 text-left text-[9px] font-bold tracking-[0.2em] text-warm-gold/70">STATUS</th>
                  <th className="py-3 px-5 text-left text-[9px] font-bold tracking-[0.2em] text-warm-gold/70">ACTIONS</th>
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
                    <td className="py-3.5 px-5 text-sm text-warm-muted">{member.phone || '—'}</td>
                    <td className="py-3.5 px-5">
                      <span className={`rounded-full px-2 py-0.5 text-[9px] font-bold tracking-[0.12em] ${roleBadge(member.role)}`}>
                        {formatRole(member.role).toUpperCase()}
                      </span>
                    </td>
                    <td className="py-3.5 px-5">
                      <span className={`rounded-full px-2 py-0.5 text-[9px] font-bold tracking-[0.12em] ${statusBadge(member.status)}`}>
                        {(member.status || 'active').toUpperCase()}
                      </span>
                    </td>
                    <td className="py-3.5 px-5">
                      <div className="flex items-center gap-1.5">
                        <button
                          onClick={() => navigate(`/members/${member._id}`)}
                          className="rounded-lg p-1.5 text-warm-muted transition hover:bg-warm-charcoal/[0.04] hover:text-warm-charcoal"
                          title="View"
                        >
                          <Eye size={13} />
                        </button>
                        <button
                          onClick={() => navigate(`/members/edit/${member._id}`)}
                          className="rounded-lg p-1.5 text-warm-muted transition hover:bg-warm-charcoal/[0.04] hover:text-warm-charcoal"
                          title="Edit"
                        >
                          <Edit size={13} />
                        </button>
                        <button
                          onClick={() => setAssigningMember(member)}
                          className="rounded-lg p-1.5 text-warm-muted transition hover:bg-warm-gold/[0.07] hover:text-warm-gold"
                          title="Assign to zone / cell"
                        >
                          <Network size={13} />
                        </button>
                        <button
                          onClick={() => handleDelete(member._id, member.name)}
                          disabled={deleteLoading === member._id}
                          className="rounded-lg p-1.5 text-warm-muted transition hover:bg-red-50 hover:text-red-600 disabled:opacity-40"
                          title="Delete"
                        >
                          {deleteLoading === member._id ? (
                            <Loader size={13} className="animate-spin" />
                          ) : (
                            <Trash2 size={13} />
                          )}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {filtered.length === 0 && (
            <div className="py-16 text-center">
              <Users size={32} className="mx-auto mb-4 text-warm-gold/30" />
              <p className="text-sm font-semibold text-warm-muted">
                {filterUnassigned
                  ? 'All members are assigned — great work!'
                  : searchTerm ? 'No members match your search' : 'No members yet'}
              </p>
              {!searchTerm && (
                <button
                  onClick={() => navigate('/members/add')}
                  className="mt-4 rounded-xl bg-warm-gold px-5 py-2.5 text-xs font-bold tracking-[0.18em] text-warm-espresso transition hover:opacity-90"
                >
                  ADD FIRST MEMBER
                </button>
              )}
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
      {assigningMember && (
        <AssignMemberModal
          member={assigningMember}
          onClose={() => setAssigningMember(null)}
          onSuccess={() => { setAssigningMember(null); loadMembers() }}
        />
      )}
    </DashboardShell>
  )
}
