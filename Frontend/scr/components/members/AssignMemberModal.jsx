import { useEffect, useState } from 'react'
import { zonesAPI, cellsAPI, membersAPI } from '../../utils/api'
import { toast } from 'react-toastify'
import { X, Loader } from 'lucide-react'

const inputCls = 'w-full rounded-xl border border-warm-charcoal/[0.1] bg-warm-ivory px-4 py-3 text-sm text-warm-charcoal focus:border-warm-gold/40 focus:outline-none focus:bg-white disabled:opacity-50'
const labelCls = 'mb-1.5 block text-[10px] font-semibold uppercase tracking-[0.2em] text-warm-muted'

const ROLES = [
  'member', 'cell_leader', 'zone_leader', 'usher',
  'elder', 'deacon', 'volunteer', 'pastor', 'admin', 'superadmin',
]

const formatRole = (r) => {
  if (!r) return 'Member'
  if (r === 'zone_leader') return 'Zone Leader'
  if (r === 'cell_leader') return 'Cell Leader'
  return r.charAt(0).toUpperCase() + r.slice(1)
}

export default function AssignMemberModal({ member, onClose, onSuccess }) {
  const [zones, setZones] = useState([])
  const [cells, setCells] = useState([])
  const [selectedZoneId, setSelectedZoneId] = useState(member?.zone_id ?? '')
  const [selectedCellId, setSelectedCellId] = useState(member?.cell_id ?? '')
  const [selectedRole, setSelectedRole] = useState(member?.role ?? 'member')
  const [loadingZones, setLoadingZones] = useState(true)
  const [loadingCells, setLoadingCells] = useState(false)
  const [saving, setSaving] = useState(false)

  // Body scroll lock
  useEffect(() => {
    document.body.style.overflow = 'hidden'
    return () => { document.body.style.overflow = '' }
  }, [])

  // Load zones on mount
  useEffect(() => {
    const load = async () => {
      try {
        setLoadingZones(true)
        const res = await zonesAPI.getAll({ is_active: 1 })
        const list = Array.isArray(res?.data) ? res.data : (Array.isArray(res) ? res : [])
        setZones(list)
      } catch {
        toast.error('Failed to load zones')
      } finally {
        setLoadingZones(false)
      }
    }
    load()
  }, [])

  // Load cells when zone changes
  useEffect(() => {
    if (!selectedZoneId) { setCells([]); setSelectedCellId(''); return }
    const load = async () => {
      try {
        setLoadingCells(true)
        const res = await cellsAPI.getAll({ zone_id: selectedZoneId })
        const list = Array.isArray(res?.data) ? res.data : (Array.isArray(res) ? res : [])
        // Client-side fallback filter in case backend ignores zone_id param
        const filtered = list.filter((c) => String(c.zone_id) === String(selectedZoneId))
        setCells(filtered.length > 0 ? filtered : list)
        setSelectedCellId('')
      } catch {
        toast.error('Failed to load cells')
      } finally {
        setLoadingCells(false)
      }
    }
    load()
  }, [selectedZoneId])

  const handleSave = async () => {
    if (!selectedCellId) { toast.error('Please select a cell'); return }
    try {
      setSaving(true)
      const memberId = member.id || member._id
      const userId = member.user_id || memberId
      const ops = [
        cellsAPI.assignMember(selectedCellId, userId),
        membersAPI.update(memberId, { ...member, cell_id: selectedCellId, zone_id: selectedZoneId }),
      ]
      if (selectedRole !== member.role) ops.push(membersAPI.updateRole(memberId, selectedRole))

      const results = await Promise.allSettled(ops)
      const failed = results.filter((r) => r.status === 'rejected')

      if (failed.length === 0) {
        toast.success(`${member.name} assigned successfully`)
        onSuccess?.()
        onClose()
      } else if (failed.length < ops.length) {
        toast.success('Assigned — role update failed, try editing manually')
        onSuccess?.()
        onClose()
      } else {
        toast.error(failed[0].reason?.message || 'Assignment failed')
      }
    } catch (err) {
      toast.error(err.message || 'Something went wrong')
    } finally {
      setSaving(false)
    }
  }

  const isUnassigned = !member?.zone_id && !member?.cell_id

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-warm-charcoal/40" onClick={onClose} />

      {/* Card — bottom drawer on mobile, centered dialog on sm+ */}
      <div className="relative w-full max-w-sm bg-white rounded-t-2xl sm:rounded-2xl shadow-xl">

        {/* Header */}
        <div className="flex items-center justify-between px-5 pt-5 pb-4 border-b border-warm-charcoal/[0.07]">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-full bg-warm-gold/10 border border-warm-gold/20 flex items-center justify-center text-warm-gold text-sm font-bold shrink-0">
              {(member.name?.[0] || 'M').toUpperCase()}
            </div>
            <div>
              <p className="text-sm font-bold text-warm-charcoal">{member.name}</p>
              <p className="text-[10px] text-warm-muted">{member.email || 'No email'}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-warm-muted hover:text-warm-charcoal hover:bg-warm-charcoal/[0.05] transition"
          >
            <X size={16} />
          </button>
        </div>

        <div className="px-5 py-4 space-y-4">
          {/* Current assignment chip */}
          {isUnassigned ? (
            <div className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2.5 text-xs text-amber-700">
              Not yet assigned to any zone or cell
            </div>
          ) : (
            <div className="rounded-xl bg-warm-gold/[0.07] px-3 py-2.5 text-xs text-warm-muted">
              Currently in <span className="font-semibold text-warm-espresso">{member.zone_name || `Zone ${member.zone_id}`}</span>
              {member.cell_name && <> Â· <span className="font-semibold text-warm-espresso">{member.cell_name}</span></>}
            </div>
          )}

          {/* Zone */}
          <div>
            <label className={labelCls}>Zone</label>
            <select
              value={selectedZoneId}
              onChange={(e) => setSelectedZoneId(e.target.value)}
              disabled={loadingZones}
              className={inputCls}
            >
              <option value="">{loadingZones ? 'Loading zonesâ€¦' : 'Select a zone'}</option>
              {zones.map((z) => (
                <option key={z.id || z._id} value={z.id || z._id}>{z.name}</option>
              ))}
            </select>
          </div>

          {/* Cell */}
          <div>
            <label className={labelCls}>Cell</label>
            <select
              value={selectedCellId}
              onChange={(e) => setSelectedCellId(e.target.value)}
              disabled={!selectedZoneId || loadingCells}
              className={inputCls}
            >
              <option value="">
                {!selectedZoneId ? 'Select a zone first' : loadingCells ? 'Loading cellsâ€¦' : 'Select a cell'}
              </option>
              {cells.map((c) => (
                <option key={c.id || c._id} value={c.id || c._id}>
                  {c.name}{c.member_count !== undefined ? ` (${c.member_count}/${c.max_members || 5})` : ''}
                </option>
              ))}
            </select>
          </div>

          {/* Role */}
          <div>
            <label className={labelCls}>Role</label>
            <select
              value={selectedRole}
              onChange={(e) => setSelectedRole(e.target.value)}
              className={inputCls}
            >
              {ROLES.map((r) => (
                <option key={r} value={r}>{formatRole(r)}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 px-5 pb-5 pt-1">
          <button
            onClick={onClose}
            className="rounded-xl border border-warm-charcoal/[0.1] bg-white px-5 py-2.5 text-xs font-bold tracking-[0.14em] text-warm-muted transition hover:text-warm-charcoal"
          >
            CANCEL
          </button>
          <button
            onClick={handleSave}
            disabled={saving || !selectedCellId}
            className="inline-flex items-center gap-2 rounded-xl bg-warm-gold px-5 py-2.5 text-xs font-bold tracking-[0.18em] text-warm-espresso transition hover:opacity-90 disabled:opacity-50"
          >
            {saving && <Loader size={12} className="animate-spin" />}
            {saving ? 'SAVINGâ€¦' : 'SAVE'}
          </button>
        </div>
      </div>
    </div>
  )
}
