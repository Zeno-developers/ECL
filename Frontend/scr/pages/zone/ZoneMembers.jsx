import { useState, useEffect } from 'react'
import { useAuth } from '../../contexts/AuthContext'
import { useNavigate } from 'react-router-dom'
import { membersAPI, zonesAPI } from '../../utils/api'
import { toast } from 'react-toastify'
import { Users, Search, Trash2, Download, ArrowLeft } from 'lucide-react'
import DashboardShell from '../../components/dashboard/DashboardShell'
import { DashboardStatGrid } from '../../components/dashboard/RoleDashboardUI'

const selectCls = 'rounded-xl border border-warm-charcoal/[0.1] bg-warm-ivory px-4 py-2.5 text-sm text-warm-charcoal focus:border-warm-gold/40 focus:outline-none focus:bg-white'

export default function ZoneMembers() {
  const { user } = useAuth()
  const navigate = useNavigate()

  const [loading, setLoading] = useState(true)
  const [members, setMembers] = useState([])
  const [filteredMembers, setFilteredMembers] = useState([])
  const [zoneInfo, setZoneInfo] = useState(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [filterRole, setFilterRole] = useState('all')
  const [filterStatus, setFilterStatus] = useState('active')
  const [stats, setStats] = useState({ total: 0, active: 0, inactive: 0, leaders: 0 })

  useEffect(() => {
    if (user?.zone_id) fetchZoneMembers()
    else { toast.error('You are not assigned to a zone'); navigate('/dashboard') }
  }, [user?.zone_id])

  useEffect(() => { applyFilters() }, [members, searchTerm, filterRole, filterStatus])

  const fetchZoneMembers = async () => {
    try {
      setLoading(true)
      const [zoneRes, membersRes] = await Promise.allSettled([
        zonesAPI.getZone(user.zone_id),
        membersAPI.getAll({ limit: 1000 }),
      ])
      if (zoneRes.status === 'fulfilled') setZoneInfo(zoneRes.value.data?.zone)
      if (membersRes.status === 'fulfilled') {
        const allMembers = Array.isArray(membersRes.value) ? membersRes.value : membersRes.value?.data || []
        const zoneMembers = allMembers.filter((m) => m.zone_id === user.zone_id)
        setMembers(zoneMembers)
        setStats({
          total: zoneMembers.length,
          active: zoneMembers.filter((m) => m.is_active).length,
          inactive: zoneMembers.filter((m) => !m.is_active).length,
          leaders: zoneMembers.filter((m) => m.role === 'cell_leader').length,
        })
      }
    } catch (error) {
      toast.error('Failed to load members')
    } finally {
      setLoading(false)
    }
  }

  const applyFilters = () => {
    let filtered = members
    if (searchTerm) {
      filtered = filtered.filter((m) =>
        `${m.first_name} ${m.last_name}`.toLowerCase().includes(searchTerm.toLowerCase()) ||
        m.email?.toLowerCase().includes(searchTerm.toLowerCase())
      )
    }
    if (filterRole !== 'all') filtered = filtered.filter((m) => m.role === filterRole)
    if (filterStatus === 'active') filtered = filtered.filter((m) => m.is_active)
    else if (filterStatus === 'inactive') filtered = filtered.filter((m) => !m.is_active)
    setFilteredMembers(filtered)
  }

  const handleRemoveMember = async (memberId) => {
    if (!window.confirm('Remove this member from the zone?')) return
    try {
      await membersAPI.update(memberId, { zone_id: null })
      toast.success('Member removed from zone')
      await fetchZoneMembers()
    } catch {
      toast.error('Failed to remove member')
    }
  }

  const handleExport = () => {
    const csv = [
      ['Name', 'Email', 'Phone', 'Role', 'Cell', 'Status'],
      ...filteredMembers.map((m) => [
        `${m.first_name} ${m.last_name}`, m.email || '', m.phone || '',
        m.role || 'member', m.cell_name || 'Not assigned', m.is_active ? 'Active' : 'Inactive',
      ]),
    ].map((row) => row.join(',')).join('\n')
    const blob = new Blob([csv], { type: 'text/csv' })
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `zone-members-${new Date().toISOString().split('T')[0]}.csv`
    a.click()
    window.URL.revokeObjectURL(url)
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

        {/* Header */}
        <div className="flex items-start justify-between gap-4 border-b border-warm-charcoal/[0.07] pb-8">
          <div className="flex items-center gap-4">
            <button
              onClick={() => navigate('/zone/dashboard')}
              className="rounded-xl border border-warm-charcoal/[0.07] bg-white p-2.5 text-warm-muted transition hover:text-warm-charcoal shadow-sm"
            >
              <ArrowLeft size={16} />
            </button>
            <div>
              <h1 className="text-3xl font-black tracking-tighter text-warm-charcoal">ZONE MEMBERS</h1>
              <p className="mt-1 text-sm text-warm-muted">{zoneInfo?.name || 'Your Zone'}</p>
            </div>
          </div>
          <button
            onClick={handleExport}
            className="inline-flex items-center gap-2 rounded-xl bg-warm-gold px-5 py-2.5 text-xs font-bold tracking-[0.18em] text-warm-espresso transition hover:opacity-90 shrink-0"
          >
            <Download size={13} />
            EXPORT CSV
          </button>
        </div>

        <DashboardStatGrid
          stats={[
            { label: 'Total Members', value: stats.total, icon: Users },
            { label: 'Active', value: stats.active, icon: Users },
            { label: 'Inactive', value: stats.inactive, icon: Users },
            { label: 'Cell Leaders', value: stats.leaders, icon: Users },
          ]}
        />

        {/* Filters */}
        <div className="rounded-2xl border border-warm-charcoal/[0.07] bg-white p-4 flex flex-wrap gap-3 shadow-sm">
          <div className="relative flex-1 min-w-56">
            <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-warm-muted" />
            <input
              type="text"
              placeholder="Search by name or email..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-warm-charcoal/[0.1] bg-warm-ivory text-sm text-warm-charcoal placeholder-warm-muted focus:border-warm-gold/40 focus:outline-none focus:bg-white"
            />
          </div>
          <select value={filterRole} onChange={(e) => setFilterRole(e.target.value)} className={selectCls}>
            <option value="all">All Roles</option>
            <option value="member">Member</option>
            <option value="cell_leader">Cell Leader</option>
            <option value="elder">Elder</option>
          </select>
          <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)} className={selectCls}>
            <option value="all">All Status</option>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
          </select>
        </div>

        {/* Table */}
        <div className="rounded-2xl border border-warm-charcoal/[0.07] bg-white overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-warm-charcoal/[0.07]">
                  {['Name', 'Email', 'Phone', 'Role', 'Cell', 'Status', ''].map((h) => (
                    <th key={h} className="px-5 py-3.5 text-left text-[9px] font-bold tracking-[0.2em] text-warm-gold/70">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filteredMembers.length === 0 ? (
                  <tr>
                    <td colSpan="7" className="px-5 py-10 text-center text-sm text-warm-muted">No members found</td>
                  </tr>
                ) : (
                  filteredMembers.map((member) => (
                    <tr key={member.id} className="border-b border-warm-charcoal/[0.05] transition hover:bg-warm-ivory">
                      <td className="px-5 py-4 text-sm font-semibold text-warm-espresso">{member.first_name} {member.last_name}</td>
                      <td className="px-5 py-4 text-sm text-warm-muted">{member.email || '—'}</td>
                      <td className="px-5 py-4 text-sm text-warm-muted">{member.phone || '—'}</td>
                      <td className="px-5 py-4">
                        <span className="rounded-full px-2 py-0.5 text-[9px] font-bold tracking-[0.12em] text-warm-plum bg-warm-gold/10">
                          {member.role === 'cell_leader' ? 'CELL LEADER' : 'MEMBER'}
                        </span>
                      </td>
                      <td className="px-5 py-4 text-sm text-warm-muted">{member.cell_name || '—'}</td>
                      <td className="px-5 py-4">
                        <span className={`rounded-full px-2 py-0.5 text-[9px] font-bold tracking-[0.12em] ${member.is_active ? 'text-emerald-700 bg-emerald-500/10' : 'text-red-700 bg-red-500/10'}`}>
                          {member.is_active ? 'ACTIVE' : 'INACTIVE'}
                        </span>
                      </td>
                      <td className="px-5 py-4 text-right">
                        <button onClick={() => handleRemoveMember(member.id)} className="text-warm-muted hover:text-red-600 transition">
                          <Trash2 size={15} />
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        <p className="text-xs text-warm-muted">Showing {filteredMembers.length} of {members.length} members</p>
      </div>
    </DashboardShell>
  )
}
