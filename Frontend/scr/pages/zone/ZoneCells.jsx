import { useState, useEffect } from 'react'
import { useAuth } from '../../contexts/AuthContext'
import { useNavigate } from 'react-router-dom'
import { cellsAPI, zonesAPI } from '../../utils/api'
import { toast } from 'react-toastify'
import { Home, Users, Plus, Trash2, ChevronRight, Calendar, X } from 'lucide-react'
import DashboardShell from '../../components/dashboard/DashboardShell'

const inputCls = 'w-full rounded-xl border border-warm-charcoal/[0.1] bg-warm-ivory px-4 py-3 text-sm text-warm-charcoal placeholder-warm-muted focus:border-warm-gold/40 focus:outline-none focus:bg-white'
const labelCls = 'mb-1.5 block text-[10px] font-semibold uppercase tracking-[0.2em] text-warm-muted'

const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']

const isAdminRole = (role) => ['admin', 'pastor', 'superadmin', 'elder'].includes(role)

export default function ZoneCells() {
  const { user } = useAuth()
  const navigate = useNavigate()

  const canManageAll = isAdminRole(user?.role)

  const [loading, setLoading] = useState(true)
  const [cells, setCells] = useState([])
  const [zones, setZones] = useState([])
  const [zoneInfo, setZoneInfo] = useState(null)
  const [expandedCell, setExpandedCell] = useState(null)
  const [cellMembers, setCellMembers] = useState({})
  const [showAddCell, setShowAddCell] = useState(false)
  const [newCell, setNewCell] = useState({ name: '', meeting_day: 'Sunday', meeting_time: '10:00', zone_id: '' })

  useEffect(() => {
    if (canManageAll) {
      fetchAllCells()
    } else if (user?.zone_id) {
      fetchZoneCells()
    } else {
      toast.error('You are not assigned to a zone')
      navigate('/pastor-dashboard')
    }
  }, [user])

  const fetchAllCells = async () => {
    try {
      setLoading(true)
      const [zonesRes, cellsRes] = await Promise.allSettled([
        zonesAPI.getAll(),
        cellsAPI.getAll(),
      ])
      if (zonesRes.status === 'fulfilled') {
        const zonesList = zonesRes.value?.data?.zones || zonesRes.value?.data || []
        setZones(Array.isArray(zonesList) ? zonesList : [])
      }
      if (cellsRes.status === 'fulfilled') {
        const cellsList = cellsRes.value?.data?.cells || cellsRes.value?.data || []
        setCells(Array.isArray(cellsList) ? cellsList : [])
      }
    } catch {
      toast.error('Failed to load cells')
    } finally {
      setLoading(false)
    }
  }

  const fetchZoneCells = async () => {
    try {
      setLoading(true)
      const [zoneRes, cellsRes] = await Promise.allSettled([
        zonesAPI.getZone(user.zone_id),
        cellsAPI.getAll({ zone_id: user.zone_id }),
      ])
      if (zoneRes.status === 'fulfilled') setZoneInfo(zoneRes.value.data?.zone)
      if (cellsRes.status === 'fulfilled') {
        const cellsList = Array.isArray(cellsRes.value) ? cellsRes.value : cellsRes.value?.data || []
        setCells(cellsList)
      }
    } catch {
      toast.error('Failed to load cells')
    } finally {
      setLoading(false)
    }
  }

  const handleAddCell = async () => {
    if (!newCell.name.trim()) { toast.error('Cell name is required'); return }
    const zoneId = canManageAll ? (parseInt(newCell.zone_id) || null) : user.zone_id
    if (!zoneId) { toast.error('Please select a zone'); return }
    try {
      await cellsAPI.create({ name: newCell.name, meeting_day: newCell.meeting_day, meeting_time: newCell.meeting_time, zone_id: zoneId })
      toast.success('Cell created successfully')
      setNewCell({ name: '', meeting_day: 'Sunday', meeting_time: '10:00', zone_id: '' })
      setShowAddCell(false)
      canManageAll ? await fetchAllCells() : await fetchZoneCells()
    } catch {
      toast.error('Failed to create cell')
    }
  }

  const handleDeleteCell = async (cellId) => {
    if (!window.confirm('Delete this cell? This cannot be undone.')) return
    try {
      await cellsAPI.delete(cellId)
      toast.success('Cell deleted')
      canManageAll ? await fetchAllCells() : await fetchZoneCells()
    } catch {
      toast.error('Failed to delete cell')
    }
  }

  const toggleExpandCell = async (cellId) => {
    if (expandedCell === cellId) { setExpandedCell(null); return }
    if (!cellMembers[cellId]) {
      try {
        const res = await cellsAPI.getMembers(cellId)
        setCellMembers((prev) => ({ ...prev, [cellId]: res.data || [] }))
      } catch {}
    }
    setExpandedCell(cellId)
  }

  const getZoneName = (zoneId) => {
    const z = zones.find(z => Number(z.id) === Number(zoneId))
    return z?.name || `Zone ${zoneId}`
  }

  const pageTitle = canManageAll ? 'CELLS MANAGEMENT' : 'ZONE CELLS'
  const pageSubtitle = canManageAll ? `All cells across ${zones.length} zone${zones.length !== 1 ? 's' : ''}` : (zoneInfo?.name || 'Your Zone')

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
      <div className="mx-auto max-w-4xl px-5 sm:px-8 py-8 space-y-6">

        {/* Header */}
        <div className="flex items-start justify-between gap-4 border-b border-warm-charcoal/[0.07] pb-8">
          <div>
            <h1 className="text-3xl font-black tracking-tighter text-warm-charcoal">{pageTitle}</h1>
            <p className="mt-2 text-sm text-warm-muted">{pageSubtitle}</p>
          </div>
          <button
            onClick={() => setShowAddCell((v) => !v)}
            className="inline-flex items-center gap-2 rounded-xl bg-warm-gold px-5 py-2.5 text-xs font-bold tracking-[0.18em] text-warm-espresso transition hover:opacity-90 shrink-0"
          >
            <Plus size={13} />
            ADD CELL
          </button>
        </div>

        {/* Add Cell Form */}
        {showAddCell && (
          <div className="rounded-2xl border border-warm-gold/20 bg-warm-gold/[0.04] p-6 space-y-4 shadow-sm">
            <div className="flex items-center justify-between">
              <p className="text-[10px] font-bold tracking-[0.22em] text-warm-gold/70">CREATE NEW CELL</p>
              <button onClick={() => setShowAddCell(false)} className="text-warm-muted transition hover:text-warm-charcoal">
                <X size={16} />
              </button>
            </div>
            <div>
              <label className={labelCls}>Cell Name</label>
              <input
                type="text"
                placeholder="e.g., Alpha Cell"
                value={newCell.name}
                onChange={(e) => setNewCell((p) => ({ ...p, name: e.target.value }))}
                className={inputCls}
              />
            </div>
            {canManageAll && (
              <div>
                <label className={labelCls}>Zone</label>
                <select
                  value={newCell.zone_id}
                  onChange={(e) => setNewCell((p) => ({ ...p, zone_id: e.target.value }))}
                  className={inputCls}
                >
                  <option value="">Select a zone *</option>
                  {zones.map((z) => (
                    <option key={z.id} value={z.id}>{z.name}</option>
                  ))}
                </select>
              </div>
            )}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className={labelCls}>Meeting Day</label>
                <select
                  value={newCell.meeting_day}
                  onChange={(e) => setNewCell((p) => ({ ...p, meeting_day: e.target.value }))}
                  className={inputCls}
                >
                  {DAYS.map((d) => <option key={d} value={d}>{d}</option>)}
                </select>
              </div>
              <div>
                <label className={labelCls}>Meeting Time</label>
                <input
                  type="time"
                  value={newCell.meeting_time}
                  onChange={(e) => setNewCell((p) => ({ ...p, meeting_time: e.target.value }))}
                  className={inputCls}
                />
              </div>
            </div>
            <div className="flex gap-3 pt-1">
              <button
                onClick={handleAddCell}
                className="rounded-xl bg-warm-gold px-5 py-2.5 text-xs font-bold tracking-[0.15em] text-warm-espresso transition hover:opacity-90"
              >
                CREATE CELL
              </button>
              <button
                onClick={() => setShowAddCell(false)}
                className="rounded-xl border border-warm-charcoal/20 bg-white px-4 py-2.5 text-xs font-semibold text-warm-muted transition hover:text-warm-charcoal"
              >
                Cancel
              </button>
            </div>
          </div>
        )}

        {/* Zone grouping for admin/pastor */}
        {canManageAll && zones.length > 0 ? (
          <div className="space-y-6">
            {zones.map((zone) => {
              const zoneCells = cells.filter(c => Number(c.zone_id) === Number(zone.id))
              return (
                <div key={zone.id}>
                  <div className="flex items-center gap-3 mb-3">
                    <p className="text-[10px] font-bold tracking-[0.2em] text-warm-gold/70">{zone.name.toUpperCase()}</p>
                    <div className="flex-1 border-t border-warm-charcoal/[0.07]" />
                    <span className="text-[10px] text-warm-muted">{zoneCells.length} cell{zoneCells.length !== 1 ? 's' : ''}</span>
                  </div>
                  {zoneCells.length === 0 ? (
                    <p className="text-xs text-warm-muted pl-1">No cells in this zone yet.</p>
                  ) : (
                    <CellList
                      cells={zoneCells}
                      expandedCell={expandedCell}
                      cellMembers={cellMembers}
                      onToggle={toggleExpandCell}
                      onDelete={handleDeleteCell}
                      onNavigate={navigate}
                    />
                  )}
                </div>
              )
            })}
          </div>
        ) : (
          /* Zone leader view — flat list */
          <div className="space-y-3">
            {cells.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-center rounded-2xl border border-warm-charcoal/[0.07] bg-white shadow-sm">
                <Home size={32} className="text-warm-gold/30 mb-4" />
                <p className="text-sm font-semibold text-warm-muted mb-1">No cells in your zone yet</p>
                <button
                  onClick={() => setShowAddCell(true)}
                  className="mt-4 inline-flex items-center gap-2 rounded-xl bg-warm-gold px-5 py-2.5 text-xs font-bold tracking-[0.18em] text-warm-espresso transition hover:opacity-90"
                >
                  <Plus size={13} />
                  CREATE FIRST CELL
                </button>
              </div>
            ) : (
              <CellList
                cells={cells}
                expandedCell={expandedCell}
                cellMembers={cellMembers}
                onToggle={toggleExpandCell}
                onDelete={handleDeleteCell}
                onNavigate={navigate}
              />
            )}
          </div>
        )}
      </div>
    </DashboardShell>
  )
}

function CellList({ cells, expandedCell, cellMembers, onToggle, onDelete, onNavigate }) {
  return (
    <div className="space-y-3">
      {cells.map((cell) => (
        <div key={cell.id} className="rounded-2xl border border-warm-charcoal/[0.07] bg-white overflow-hidden shadow-sm">
          <div
            className="flex items-center justify-between p-5 cursor-pointer transition hover:bg-warm-ivory"
            onClick={() => onToggle(cell.id)}
          >
            <div>
              <p className="text-sm font-semibold text-warm-espresso">{cell.name}</p>
              <div className="flex items-center gap-4 mt-1.5 text-xs text-warm-muted">
                <span className="flex items-center gap-1.5"><Calendar size={11} />{cell.meeting_day} {cell.meeting_time}</span>
                <span className="flex items-center gap-1.5"><Users size={11} />{cell.member_count || 0} members</span>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={(e) => { e.stopPropagation(); onDelete(cell.id) }}
                className="rounded-lg p-2 text-warm-muted transition hover:text-red-600 hover:bg-red-50"
              >
                <Trash2 size={14} />
              </button>
              <ChevronRight
                size={18}
                className={`text-warm-muted transition-transform ${expandedCell === cell.id ? 'rotate-90' : ''}`}
              />
            </div>
          </div>

          {expandedCell === cell.id && (() => {
            const leader = cellMembers[cell.id]?.find((m) => m.role === 'cell_leader')
            const cellLeader = leader || (cell.leader_first_name ? {
              name: `${cell.leader_first_name || ''} ${cell.leader_last_name || ''}`.trim(),
              email: cell.leader_email || '',
            } : null)

            return (
              <div className="border-t border-warm-charcoal/[0.07] px-5 py-4 space-y-4">
                {/* Leader */}
                <div className="rounded-xl border border-warm-charcoal/[0.07] bg-warm-ivory/60 p-4 flex items-center justify-between gap-4">
                  <div>
                    <p className="text-[10px] font-bold tracking-[0.2em] text-warm-gold/70 mb-1.5">CELL LEADER</p>
                    {cellLeader ? (
                      <>
                        <p className="text-sm font-semibold text-warm-espresso">
                          {cellLeader.first_name ? `${cellLeader.first_name} ${cellLeader.last_name}` : cellLeader.name}
                        </p>
                        <p className="text-xs text-warm-muted">{cellLeader.email}</p>
                      </>
                    ) : (
                      <p className="text-xs text-warm-muted italic">No leader assigned</p>
                    )}
                  </div>
                  <button
                    onClick={(e) => { e.stopPropagation(); onNavigate(`/zone/cells/${cell.id}/leader`) }}
                    className="shrink-0 inline-flex items-center gap-2 rounded-xl border border-warm-charcoal/20 bg-white px-3 py-2 text-xs font-semibold text-warm-muted shadow-sm transition hover:text-warm-charcoal"
                  >
                    <Users size={12} />
                    {cellLeader ? 'Change Leader' : 'Assign Leader'}
                  </button>
                </div>

                {/* Members */}
                <div>
                  <p className="text-[10px] font-bold tracking-[0.2em] text-warm-gold/70 mb-3">CELL MEMBERS</p>
                  {cellMembers[cell.id]?.length > 0 ? (
                    <div className="space-y-2">
                      {cellMembers[cell.id].map((member) => (
                        <div key={member.id} className="flex items-center justify-between rounded-xl border border-warm-charcoal/[0.07] bg-white px-4 py-3">
                          <div>
                            <p className="text-sm font-semibold text-warm-espresso">{member.first_name} {member.last_name}</p>
                            <p className="text-xs text-warm-muted">{member.email}</p>
                          </div>
                          <span className={`rounded-full px-2 py-0.5 text-[9px] font-bold tracking-[0.12em] ${
                            member.role === 'cell_leader' ? 'text-warm-plum bg-warm-gold/10' : 'text-warm-muted bg-warm-charcoal/[0.05]'
                          }`}>
                            {member.role === 'cell_leader' ? 'LEADER' : 'MEMBER'}
                          </span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-xs text-warm-muted">No members assigned to this cell yet.</p>
                  )}
                </div>
              </div>
            )
          })()}
        </div>
      ))}
    </div>
  )
}
