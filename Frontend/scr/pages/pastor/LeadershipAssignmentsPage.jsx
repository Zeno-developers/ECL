import { useEffect, useMemo, useState } from 'react'
import { toast } from 'react-toastify'
import { cellsAPI, membersAPI, zonesAPI } from '../../utils/api'
import { Link2, ShieldCheck, Users } from 'lucide-react'
import DashboardShell from '../../components/dashboard/DashboardShell'

const ZONE_LEADER_ROLES = ['zone_leader', 'pastor', 'admin', 'superadmin']
const CELL_LEADER_ROLES = ['cell_leader', 'elder', 'pastor', 'admin', 'superadmin']

const selectCls = 'w-full rounded-xl border border-warm-charcoal/[0.1] bg-warm-ivory px-4 py-3 text-sm text-warm-charcoal focus:border-warm-gold/40 focus:outline-none focus:bg-white'

export default function LeadershipAssignmentsPage() {
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [zones, setZones] = useState([])
  const [cells, setCells] = useState([])
  const [members, setMembers] = useState([])

  const [zoneForm, setZoneForm] = useState({ zoneId: '', leaderId: '' })
  const [cellLeaderForm, setCellLeaderForm] = useState({ cellId: '', leaderId: '' })
  const [cellZoneForm, setCellZoneForm] = useState({ cellId: '', zoneId: '' })

  useEffect(() => { loadData() }, [])

  const loadData = async () => {
    try {
      setLoading(true)
      const [zonesRes, cellsRes, membersRes] = await Promise.all([
        zonesAPI.getAll(),
        cellsAPI.getAll({ is_active: 1 }),
        membersAPI.getAll({ limit: 500 }),
      ])
      setZones(zonesRes?.data || [])
      setCells(cellsRes?.data || [])
      setMembers(membersRes?.data || [])
    } catch (error) {
      toast.error(error.message || 'Failed to load assignment data')
    } finally {
      setLoading(false)
    }
  }

  const users = useMemo(
    () =>
      (members || [])
        .map((m) => ({
          userId: m.user_id,
          name: m.name || `${m.first_name || ''} ${m.last_name || ''}`.trim(),
          email: m.email,
          role: m.role || 'member',
        }))
        .filter((u) => u.userId),
    [members]
  )

  const zoneLeaderCandidates = useMemo(
    () => users.filter((u) => ZONE_LEADER_ROLES.includes(u.role)),
    [users]
  )

  const cellLeaderCandidates = useMemo(
    () => users.filter((u) => CELL_LEADER_ROLES.includes(u.role)),
    [users]
  )

  const assignZoneLeader = async () => {
    if (!zoneForm.zoneId || !zoneForm.leaderId) { toast.error('Select both zone and leader'); return }
    try {
      setSaving(true)
      await zonesAPI.assignLeader(Number(zoneForm.zoneId), Number(zoneForm.leaderId))
      toast.success('Zone leader assigned')
      await loadData()
    } catch (error) {
      toast.error(error.message || 'Failed to assign zone leader')
    } finally {
      setSaving(false)
    }
  }

  const assignCellLeader = async () => {
    if (!cellLeaderForm.cellId || !cellLeaderForm.leaderId) { toast.error('Select both cell and leader'); return }
    try {
      setSaving(true)
      await cellsAPI.assignLeader(Number(cellLeaderForm.cellId), Number(cellLeaderForm.leaderId))
      toast.success('Cell leader assigned')
      await loadData()
    } catch (error) {
      toast.error(error.message || 'Failed to assign cell leader')
    } finally {
      setSaving(false)
    }
  }

  const assignCellToZone = async () => {
    if (!cellZoneForm.cellId || !cellZoneForm.zoneId) { toast.error('Select both cell and zone'); return }
    try {
      setSaving(true)
      await cellsAPI.update(Number(cellZoneForm.cellId), { zone_id: Number(cellZoneForm.zoneId) })
      toast.success('Cell assigned to zone')
      await loadData()
    } catch (error) {
      toast.error(error.message || 'Failed to assign cell to zone')
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
        <div className="border-b border-warm-charcoal/[0.07] pb-8">
          <h1 className="text-3xl font-black tracking-tighter text-warm-charcoal">ASSIGNMENTS</h1>
          <p className="mt-2 text-sm text-warm-muted">Assign zone leaders, cell leaders, and map cells to zones.</p>
        </div>

        {/* 3-col assignment cards */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {/* Assign Zone Leader */}
          <div className="rounded-2xl border border-warm-charcoal/[0.07] bg-white p-5 space-y-4 shadow-sm">
            <div className="flex items-center gap-2.5">
              <div className="flex h-8 w-8 items-center justify-center rounded-xl border border-warm-charcoal/[0.07] bg-warm-ivory text-warm-muted">
                <ShieldCheck size={14} />
              </div>
              <p className="text-[10px] font-bold tracking-[0.22em] text-warm-gold/70">ASSIGN ZONE LEADER</p>
            </div>
            <div className="space-y-3">
              <select
                className={selectCls}
                value={zoneForm.zoneId}
                onChange={(e) => setZoneForm((p) => ({ ...p, zoneId: e.target.value }))}
              >
                <option value="">Select zone</option>
                {zones.map((z) => <option key={z.id} value={z.id}>{z.name}</option>)}
              </select>
              <select
                className={selectCls}
                value={zoneForm.leaderId}
                onChange={(e) => setZoneForm((p) => ({ ...p, leaderId: e.target.value }))}
              >
                <option value="">Select leader</option>
                {zoneLeaderCandidates.map((u) => (
                  <option key={u.userId} value={u.userId}>{u.name} ({u.role})</option>
                ))}
              </select>
              <button
                disabled={saving}
                onClick={assignZoneLeader}
                className="w-full rounded-xl bg-warm-gold py-2.5 text-xs font-bold tracking-[0.15em] text-warm-espresso transition hover:opacity-90 disabled:opacity-50"
              >
                ASSIGN LEADER
              </button>
            </div>
          </div>

          {/* Assign Cell Leader */}
          <div className="rounded-2xl border border-warm-charcoal/[0.07] bg-white p-5 space-y-4 shadow-sm">
            <div className="flex items-center gap-2.5">
              <div className="flex h-8 w-8 items-center justify-center rounded-xl border border-warm-charcoal/[0.07] bg-warm-ivory text-warm-muted">
                <Users size={14} />
              </div>
              <p className="text-[10px] font-bold tracking-[0.22em] text-warm-gold/70">ASSIGN CELL LEADER</p>
            </div>
            <div className="space-y-3">
              <select
                className={selectCls}
                value={cellLeaderForm.cellId}
                onChange={(e) => setCellLeaderForm((p) => ({ ...p, cellId: e.target.value }))}
              >
                <option value="">Select cell</option>
                {cells.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
              <select
                className={selectCls}
                value={cellLeaderForm.leaderId}
                onChange={(e) => setCellLeaderForm((p) => ({ ...p, leaderId: e.target.value }))}
              >
                <option value="">Select leader</option>
                {cellLeaderCandidates.map((u) => (
                  <option key={u.userId} value={u.userId}>{u.name} ({u.role})</option>
                ))}
              </select>
              <button
                disabled={saving}
                onClick={assignCellLeader}
                className="w-full rounded-xl bg-warm-gold py-2.5 text-xs font-bold tracking-[0.15em] text-warm-espresso transition hover:opacity-90 disabled:opacity-50"
              >
                ASSIGN LEADER
              </button>
            </div>
          </div>

          {/* Assign Cell to Zone */}
          <div className="rounded-2xl border border-warm-charcoal/[0.07] bg-white p-5 space-y-4 shadow-sm">
            <div className="flex items-center gap-2.5">
              <div className="flex h-8 w-8 items-center justify-center rounded-xl border border-warm-charcoal/[0.07] bg-warm-ivory text-warm-muted">
                <Link2 size={14} />
              </div>
              <p className="text-[10px] font-bold tracking-[0.22em] text-warm-gold/70">ASSIGN CELL TO ZONE</p>
            </div>
            <div className="space-y-3">
              <select
                className={selectCls}
                value={cellZoneForm.cellId}
                onChange={(e) => setCellZoneForm((p) => ({ ...p, cellId: e.target.value }))}
              >
                <option value="">Select cell</option>
                {cells.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
              <select
                className={selectCls}
                value={cellZoneForm.zoneId}
                onChange={(e) => setCellZoneForm((p) => ({ ...p, zoneId: e.target.value }))}
              >
                <option value="">Select zone</option>
                {zones.map((z) => <option key={z.id} value={z.id}>{z.name}</option>)}
              </select>
              <button
                disabled={saving}
                onClick={assignCellToZone}
                className="w-full rounded-xl bg-warm-gold py-2.5 text-xs font-bold tracking-[0.15em] text-warm-espresso transition hover:opacity-90 disabled:opacity-50"
              >
                ASSIGN TO ZONE
              </button>
            </div>
          </div>
        </div>

        {/* Summary stats */}
        {zones.length > 0 && cells.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div className="rounded-2xl border border-warm-charcoal/[0.07] bg-white p-5 shadow-sm">
              <p className="text-3xl font-black tabular-nums text-warm-charcoal">{zones.length}</p>
              <p className="mt-1 text-[10px] font-bold tracking-[0.2em] text-warm-gold/70">TOTAL ZONES</p>
              <p className="mt-0.5 text-[10px] text-warm-muted">
                {zones.filter((z) => z.zone_leader_id).length} have leaders assigned
              </p>
            </div>
            <div className="rounded-2xl border border-warm-charcoal/[0.07] bg-white p-5 shadow-sm">
              <p className="text-3xl font-black tabular-nums text-warm-charcoal">{cells.length}</p>
              <p className="mt-1 text-[10px] font-bold tracking-[0.2em] text-warm-gold/70">TOTAL CELLS</p>
              <p className="mt-0.5 text-[10px] text-warm-muted">
                {cells.filter((c) => c.cell_leader_id).length} have leaders assigned
              </p>
            </div>
            <div className="rounded-2xl border border-warm-charcoal/[0.07] bg-white p-5 shadow-sm">
              <p className="text-3xl font-black tabular-nums text-warm-charcoal">
                {cells.filter((c) => c.zone_id).length}
              </p>
              <p className="mt-1 text-[10px] font-bold tracking-[0.2em] text-warm-gold/70">CELLS IN ZONES</p>
              <p className="mt-0.5 text-[10px] text-warm-muted">
                {Math.round((cells.filter((c) => c.zone_id).length / (cells.length || 1)) * 100)}% coverage
              </p>
            </div>
          </div>
        )}
      </div>
    </DashboardShell>
  )
}
