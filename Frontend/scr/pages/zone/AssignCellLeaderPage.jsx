import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { toast } from 'react-toastify'
import { AlertCircle, ArrowLeft, Check, Search, Shield, Users } from 'lucide-react'
import { cellsAPI } from '../../utils/api'
import DashboardShell from '../../components/dashboard/DashboardShell'

const inputCls = 'w-full rounded-xl border border-warm-charcoal/[0.1] bg-warm-ivory px-4 py-3 text-sm text-warm-charcoal placeholder-warm-muted focus:border-warm-gold/40 focus:outline-none focus:bg-white'
const labelCls = 'mb-1.5 block text-[10px] font-semibold uppercase tracking-[0.2em] text-warm-muted'

const ELIGIBLE_ROLES = ['cell_leader', 'elder', 'pastor', 'admin', 'superadmin']

export default function AssignCellLeaderPage() {
  const { cellId } = useParams()
  const navigate = useNavigate()

  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [cell, setCell] = useState(null)
  const [currentLeader, setCurrentLeader] = useState(null)
  const [availableLeaders, setAvailableLeaders] = useState([])
  const [selectedLeaderId, setSelectedLeaderId] = useState(null)
  const [searchQuery, setSearchQuery] = useState('')

  useEffect(() => {
    if (!cellId) { navigate('/zone/cells'); return }
    loadCellData()
  }, [cellId])

  const loadCellData = async () => {
    try {
      setLoading(true)
      const [cellRes, membersRes] = await Promise.all([
        cellsAPI.getOne(cellId),
        cellsAPI.getAvailableMembers(cellId),
      ])
      const cellData = cellRes?.data?.cell || cellRes?.data || null
      const members = Array.isArray(cellRes?.data?.members)
        ? cellRes.data.members
        : Array.isArray(cellRes?.data?.data?.members) ? cellRes.data.data.members : []
      setCell(cellData)
      const leaderRecord = members.find((m) => m.role === 'cell_leader') || null
      setCurrentLeader(
        leaderRecord
          ? { id: leaderRecord.id, name: `${leaderRecord.first_name || ''} ${leaderRecord.last_name || ''}`.trim(), email: leaderRecord.email || '' }
          : cellData?.leader_first_name
            ? { id: cellData.cell_leader_id, name: `${cellData.leader_first_name || ''} ${cellData.leader_last_name || ''}`.trim(), email: cellData.leader_email || '' }
            : null
      )
      const candidates = (membersRes?.data || membersRes || [])
        .filter((m) => ELIGIBLE_ROLES.includes((m.role || '').toLowerCase()))
        .map((m) => ({
          id: m.id || m.user_id,
          name: `${m.first_name || ''} ${m.last_name || ''}`.trim(),
          email: m.email || '',
          role: m.role || 'member',
          isCurrent: (cellData?.cell_leader_id ?? null) === (m.id || m.user_id),
        }))
      setAvailableLeaders(candidates)
      if (candidates.length === 0) toast.info('No eligible leaders found for this cell')
    } catch (error) {
      toast.error(error.message || 'Failed to load cell details')
    } finally {
      setLoading(false)
    }
  }

  const filteredLeaders = availableLeaders.filter((l) => {
    const q = searchQuery.toLowerCase()
    return l.name.toLowerCase().includes(q) || l.email.toLowerCase().includes(q) || l.role.toLowerCase().includes(q)
  })

  const handleAssignLeader = async () => {
    if (!selectedLeaderId) { toast.error('Please select a leader'); return }
    try {
      setSaving(true)
      await cellsAPI.assignLeader(Number(cellId), Number(selectedLeaderId))
      toast.success('Cell leader assigned successfully')
      await loadCellData()
      navigate('/zone/cells')
    } catch (error) {
      toast.error(error.message || 'Failed to assign cell leader')
    } finally {
      setSaving(false)
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

        {/* Header */}
        <div className="flex items-center gap-4 border-b border-warm-charcoal/[0.07] pb-8">
          <button
            onClick={() => navigate('/zone/cells')}
            className="rounded-xl border border-warm-charcoal/[0.07] bg-white p-2.5 text-warm-muted transition hover:text-warm-charcoal shadow-sm"
          >
            <ArrowLeft size={16} />
          </button>
          <div>
            <p className="text-[10px] font-bold tracking-[0.22em] text-warm-gold/70 mb-0.5">ZONE / CELL</p>
            <h1 className="text-3xl font-black tracking-tighter text-warm-charcoal">ASSIGN CELL LEADER</h1>
            <p className="mt-1 text-sm text-warm-muted">{cell?.name || 'Cell'} leadership assignment</p>
          </div>
        </div>

        {/* Info chips */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {[
            ['Zone', cell?.zone_name || 'Unassigned'],
            ['Current Leader', currentLeader?.name || 'No leader assigned'],
            ['Available Leaders', availableLeaders.length],
          ].map(([k, v]) => (
            <div key={k} className="rounded-xl border border-warm-charcoal/[0.07] bg-white p-4 shadow-sm">
              <p className="text-[10px] font-semibold uppercase tracking-[0.15em] text-warm-muted">{k}</p>
              <p className="mt-1.5 text-sm font-semibold text-warm-espresso">{v}</p>
            </div>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-[0.95fr,1.05fr] gap-6">
          {/* Assignment form */}
          <div className="rounded-2xl border border-warm-charcoal/[0.07] bg-white p-6 space-y-5 shadow-sm">
            <div className="flex items-center gap-3 mb-1">
              <Shield size={16} className="text-warm-gold" />
              <p className="text-xs font-bold tracking-[0.18em] text-warm-gold/70">CURRENT ASSIGNMENT</p>
            </div>

            <div className="rounded-xl border border-warm-charcoal/[0.07] bg-warm-ivory p-4">
              {currentLeader ? (
                <>
                  <p className="text-[10px] text-warm-muted">Current cell leader</p>
                  <p className="mt-1.5 text-sm font-semibold text-warm-espresso">{currentLeader.name}</p>
                  <p className="text-xs text-warm-muted">{currentLeader.email}</p>
                </>
              ) : (
                <div className="flex items-start gap-3 text-warm-muted">
                  <AlertCircle size={15} className="mt-0.5 text-amber-600 shrink-0" />
                  <p className="text-sm">No leader is assigned yet. Select one from the list to continue.</p>
                </div>
              )}
            </div>

            <div>
              <label className={labelCls}>Search eligible leaders</label>
              <div className="relative">
                <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-warm-muted" />
                <input
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search by name, email, or role"
                  className="w-full pl-9 pr-4 py-3 rounded-xl border border-warm-charcoal/[0.1] bg-warm-ivory text-sm text-warm-charcoal placeholder-warm-muted focus:border-warm-gold/40 focus:outline-none focus:bg-white"
                />
              </div>
            </div>

            <div>
              <label className={labelCls}>Selected leader</label>
              <select
                value={selectedLeaderId || ''}
                onChange={(e) => setSelectedLeaderId(e.target.value ? Number(e.target.value) : null)}
                className={inputCls}
              >
                <option value="">Choose a leader</option>
                {filteredLeaders.map((l) => (
                  <option key={l.id} value={l.id} disabled={l.isCurrent}>
                    {l.name} ({l.role})
                  </option>
                ))}
              </select>
            </div>

            <button
              onClick={handleAssignLeader}
              disabled={saving || !selectedLeaderId}
              className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-warm-gold px-5 py-3 text-xs font-bold tracking-[0.18em] text-warm-espresso transition hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Check size={13} />
              {saving ? 'ASSIGNING...' : 'ASSIGN CELL LEADER'}
            </button>
          </div>

          {/* Eligible leaders list */}
          <div className="rounded-2xl border border-warm-charcoal/[0.07] bg-white p-6 space-y-4 shadow-sm">
            <div className="flex items-center gap-3">
              <Users size={16} className="text-warm-muted" />
              <p className="text-xs font-bold tracking-[0.18em] text-warm-gold/70">ELIGIBLE LEADERS</p>
            </div>
            <div className="max-h-[32rem] space-y-2 overflow-y-auto pr-1">
              {filteredLeaders.length === 0 ? (
                <div className="rounded-xl border border-dashed border-warm-charcoal/[0.1] bg-warm-ivory p-6 text-center text-sm text-warm-muted">
                  No eligible leaders matched your search.
                </div>
              ) : (
                filteredLeaders.map((leader) => {
                  const selected = selectedLeaderId === leader.id
                  return (
                    <button
                      key={leader.id}
                      onClick={() => setSelectedLeaderId(leader.id)}
                      disabled={leader.isCurrent}
                      className={`w-full rounded-xl border p-4 text-left transition ${
                        leader.isCurrent
                          ? 'border-warm-charcoal/[0.05] bg-warm-ivory opacity-50 cursor-not-allowed'
                          : selected
                            ? 'border-warm-gold/20 bg-warm-gold/[0.04]'
                            : 'border-warm-charcoal/[0.07] bg-white hover:border-warm-charcoal/[0.12] hover:bg-warm-ivory'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="text-sm font-semibold text-warm-espresso">{leader.name}</p>
                          <p className="text-xs text-warm-muted mt-0.5">{leader.email}</p>
                          <span className="mt-1.5 inline-block rounded-full px-2 py-0.5 text-[9px] font-bold tracking-[0.12em] text-warm-muted bg-warm-charcoal/[0.05]">
                            {leader.role.toUpperCase()}
                          </span>
                        </div>
                        {selected && <Check size={15} className="text-warm-gold shrink-0 mt-0.5" />}
                      </div>
                    </button>
                  )
                })
              )}
            </div>
          </div>
        </div>
      </div>
    </DashboardShell>
  )
}
