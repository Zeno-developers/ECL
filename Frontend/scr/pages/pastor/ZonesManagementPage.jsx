import { useState, useEffect } from 'react'
import { toast } from 'react-toastify'
import { zonesAPI, cellsAPI, membersAPI } from '../../utils/api'
import {
  ChevronDown, ChevronUp, Edit2, MapPin, Plus, Search, Trash2, Users, X,
} from 'lucide-react'
import DashboardShell from '../../components/dashboard/DashboardShell'

const inputCls = 'w-full rounded-xl border border-warm-charcoal/[0.1] bg-warm-ivory px-4 py-3 text-sm text-warm-charcoal placeholder-warm-muted focus:border-warm-gold/40 focus:outline-none focus:bg-white'
const labelCls = 'mb-1.5 block text-[10px] font-semibold uppercase tracking-[0.2em] text-warm-muted'

const emptyForm = { name: '', description: '', zone_leader_id: '', area: '', churches: '' }

export default function ZonesManagementPage() {
  const [loading, setLoading] = useState(true)
  const [zones, setZones] = useState([])
  const [members, setMembers] = useState([])
  const [searchTerm, setSearchTerm] = useState('')
  const [showForm, setShowForm] = useState(false)
  const [editingZone, setEditingZone] = useState(null)
  const [submitting, setSubmitting] = useState(false)
  const [expandedZoneId, setExpandedZoneId] = useState(null)
  const [zoneMembers, setZoneMembers] = useState({})
  const [loadingMembers, setLoadingMembers] = useState({})
  const [memberActionLoading, setMemberActionLoading] = useState({})
  const [transferTargets, setTransferTargets] = useState({})
  const [formData, setFormData] = useState(emptyForm)

  useEffect(() => { loadData() }, [])

  const loadData = async () => {
    try {
      setLoading(true)
      const [zonesRes, membersRes] = await Promise.all([
        zonesAPI.getAll({ is_active: 1 }),
        membersAPI.getAll({ limit: 500 }),
      ])
      setZones(zonesRes?.data || [])
      setMembers(membersRes?.data || [])
    } catch (error) {
      toast.error('Failed to load zones')
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!formData.name.trim()) { toast.error('Zone name is required'); return }
    try {
      setSubmitting(true)
      const payload = {
        name: formData.name.trim(),
        description: formData.description.trim(),
        area: formData.area.trim(),
        churches: formData.churches.trim(),
        zone_leader_id: formData.zone_leader_id ? parseInt(formData.zone_leader_id) : null,
      }
      if (editingZone) {
        await zonesAPI.update(editingZone.id, payload)
        toast.success('Zone updated')
      } else {
        await zonesAPI.create(payload)
        toast.success('Zone created')
      }
      await loadData()
      handleCancel()
    } catch (error) {
      toast.error(error.message || 'Failed to save zone')
    } finally {
      setSubmitting(false)
    }
  }

  const handleEdit = (zone) => {
    setEditingZone(zone)
    setFormData({
      name: zone.name, description: zone.description || '',
      zone_leader_id: zone.zone_leader_id || '', area: zone.area || '', churches: zone.churches || '',
    })
    setShowForm(true)
  }

  const handleDelete = async (zoneId) => {
    if (!window.confirm('Delete this zone?')) return
    try {
      setSubmitting(true)
      await zonesAPI.delete(zoneId)
      toast.success('Zone deleted')
      await loadData()
    } catch (error) {
      toast.error(error.message || 'Failed to delete zone')
    } finally {
      setSubmitting(false)
    }
  }

  const handleCancel = () => {
    setShowForm(false); setEditingZone(null); setFormData(emptyForm)
  }

  const loadZoneMembers = async (zoneId) => {
    if (loadingMembers[zoneId]) return
    try {
      setLoadingMembers((prev) => ({ ...prev, [zoneId]: true }))
      const data = await membersAPI.getAll({ zone_id: zoneId, limit: 500 })
      setZoneMembers((prev) => ({ ...prev, [zoneId]: Array.isArray(data) ? data : data?.data || [] }))
    } catch (error) {
      toast.error('Failed to load zone members')
    } finally {
      setLoadingMembers((prev) => ({ ...prev, [zoneId]: false }))
    }
  }

  const toggleExpanded = async (zoneId) => {
    if (expandedZoneId === zoneId) { setExpandedZoneId(null); return }
    setExpandedZoneId(zoneId)
    if (!zoneMembers[zoneId]) await loadZoneMembers(zoneId)
  }

  const refreshZoneData = async (...zoneIds) => {
    await loadData()
    const ids = [...new Set(zoneIds.filter(Boolean))]
    await Promise.all(ids.map(loadZoneMembers))
  }

  const handleRemoveMember = async (zoneId, memberId) => {
    if (!window.confirm('Remove this member from the zone?')) return
    try {
      setMemberActionLoading((prev) => ({ ...prev, [`remove-${memberId}`]: true }))
      await zonesAPI.removeMember(zoneId, memberId)
      toast.success('Member removed')
      await refreshZoneData(zoneId)
    } catch (error) {
      toast.error(error.message || 'Failed to remove member')
    } finally {
      setMemberActionLoading((prev) => ({ ...prev, [`remove-${memberId}`]: false }))
    }
  }

  const handleTransferMember = async (zoneId, memberId) => {
    const targetZoneId = Number(transferTargets[memberId] || 0)
    if (!targetZoneId || targetZoneId === zoneId) {
      toast.error('Select a different zone to transfer this member'); return
    }
    try {
      setMemberActionLoading((prev) => ({ ...prev, [`transfer-${memberId}`]: true }))
      await zonesAPI.assignMember(targetZoneId, memberId)
      toast.success('Member transferred')
      setTransferTargets((prev) => ({ ...prev, [memberId]: '' }))
      await refreshZoneData(zoneId, targetZoneId)
    } catch (error) {
      toast.error(error.message || 'Failed to transfer member')
    } finally {
      setMemberActionLoading((prev) => ({ ...prev, [`transfer-${memberId}`]: false }))
    }
  }

  const filteredZones = zones.filter(
    (z) =>
      z.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      z.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      z.area?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      z.churches?.toLowerCase().includes(searchTerm.toLowerCase())
  )

  const leaderOptions = members.filter(
    (m) => m.user_id && ['pastor', 'admin', 'superadmin', 'zone_leader'].includes(m.role)
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
        <div className="flex items-start justify-between gap-4 border-b border-warm-charcoal/[0.07] pb-8">
          <div>
            <h1 className="text-3xl font-black tracking-tighter text-warm-charcoal">ZONES</h1>
            <p className="mt-2 text-sm text-warm-muted">Create and manage ministry zones.</p>
          </div>
          {!showForm && (
            <button
              onClick={() => { setEditingZone(null); setFormData(emptyForm); setShowForm(true) }}
              className="inline-flex items-center gap-2 rounded-xl bg-warm-gold px-5 py-2.5 text-xs font-bold tracking-[0.18em] text-warm-espresso transition hover:opacity-90"
            >
              <Plus size={14} />
              NEW ZONE
            </button>
          )}
        </div>

        {/* Create/Edit Form */}
        {showForm && (
          <div className="rounded-2xl border border-warm-gold/20 bg-warm-gold/[0.04] p-6 shadow-sm">
            <div className="mb-5 flex items-center justify-between">
              <p className="text-[10px] font-bold tracking-[0.22em] text-warm-gold/70">
                {editingZone ? 'EDIT ZONE' : 'NEW ZONE'}
              </p>
              <button onClick={handleCancel} className="text-warm-muted transition hover:text-warm-charcoal">
                <X size={15} />
              </button>
            </div>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className={labelCls}>Zone Name *</label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="e.g., North Zone"
                    className={inputCls}
                  />
                </div>
                <div>
                  <label className={labelCls}>Area / Location</label>
                  <input
                    type="text"
                    value={formData.area}
                    onChange={(e) => setFormData({ ...formData, area: e.target.value })}
                    placeholder="e.g., Northern suburbs"
                    className={inputCls}
                  />
                </div>
                <div>
                  <label className={labelCls}>Zone Leader</label>
                  <select
                    value={formData.zone_leader_id}
                    onChange={(e) => setFormData({ ...formData, zone_leader_id: e.target.value })}
                    className={inputCls}
                  >
                    <option value="">Select a leader</option>
                    {leaderOptions.map((m) => (
                      <option key={m.user_id} value={m.user_id}>
                        {m.name || `${m.first_name} ${m.last_name}`} ({m.role})
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className={labelCls}>Churches in Zone</label>
                  <input
                    type="text"
                    value={formData.churches}
                    onChange={(e) => setFormData({ ...formData, churches: e.target.value })}
                    placeholder="Comma-separated church names"
                    className={inputCls}
                  />
                </div>
              </div>
              <div>
                <label className={labelCls}>Description</label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Zone description and notes"
                  rows={3}
                  className={inputCls}
                />
              </div>
              <div className="flex justify-end gap-3 pt-2 border-t border-warm-charcoal/[0.07]">
                <button
                  type="button"
                  onClick={handleCancel}
                  className="rounded-xl border border-warm-charcoal/[0.07] bg-white px-4 py-2 text-xs font-semibold text-warm-muted transition hover:text-warm-charcoal"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="rounded-xl bg-warm-gold px-5 py-2 text-xs font-bold tracking-[0.15em] text-warm-espresso transition hover:opacity-90 disabled:opacity-50"
                >
                  {submitting ? 'SAVING...' : editingZone ? 'UPDATE ZONE' : 'CREATE ZONE'}
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Search */}
        <div className="relative">
          <Search size={13} className="absolute left-4 top-1/2 -translate-y-1/2 text-warm-muted" />
          <input
            type="text"
            placeholder="Search zones..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full rounded-xl border border-warm-charcoal/[0.1] bg-warm-ivory py-3 pl-10 pr-4 text-sm text-warm-charcoal placeholder-warm-muted focus:border-warm-gold/40 focus:outline-none focus:bg-white"
          />
        </div>

        {/* Summary Stats */}
        {zones.length > 0 && (
          <div className="grid grid-cols-3 gap-3">
            {[
              { label: 'TOTAL ZONES', value: zones.length },
              { label: 'WITH LEADERS', value: zones.filter((z) => z.zone_leader_id).length },
              { label: 'TOTAL MEMBERS', value: zones.reduce((s, z) => s + (z.member_count || 0), 0) },
            ].map(({ label, value }) => (
              <div key={label} className="rounded-2xl border border-warm-charcoal/[0.07] bg-white p-5 shadow-sm">
                <p className="text-3xl font-black tabular-nums text-warm-charcoal">{value}</p>
                <p className="mt-1 text-[10px] font-bold tracking-[0.2em] text-warm-gold/70">{label}</p>
              </div>
            ))}
          </div>
        )}

        {/* Zone Cards */}
        {filteredZones.length === 0 ? (
          <div className="rounded-2xl border border-warm-charcoal/[0.07] bg-white py-16 text-center shadow-sm">
            <MapPin size={32} className="mx-auto mb-4 text-warm-gold/30" />
            <p className="text-sm text-warm-muted">
              {searchTerm ? 'No zones match your search' : 'No zones created yet'}
            </p>
            {!searchTerm && (
              <button
                onClick={() => { setEditingZone(null); setFormData(emptyForm); setShowForm(true) }}
                className="mt-4 inline-flex items-center gap-2 rounded-xl bg-warm-gold px-5 py-2.5 text-xs font-bold tracking-[0.18em] text-warm-espresso transition hover:opacity-90"
              >
                <Plus size={13} />
                CREATE FIRST ZONE
              </button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredZones.map((zone) => {
              const leader = members.find((m) => m.user_id === zone.zone_leader_id)
              return (
                <div key={zone.id} className="rounded-2xl border border-warm-charcoal/[0.07] bg-white p-5 flex flex-col gap-3 shadow-sm">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <h3 className="text-sm font-semibold text-warm-espresso">{zone.name}</h3>
                      {zone.area && (
                        <p className="mt-0.5 flex items-center gap-1 text-xs text-warm-muted">
                          <MapPin size={10} className="shrink-0" />
                          {zone.area}
                        </p>
                      )}
                    </div>
                    <div className="flex gap-1 shrink-0">
                      <button
                        onClick={() => toggleExpanded(zone.id)}
                        className="rounded-lg p-1.5 text-warm-muted transition hover:bg-warm-charcoal/[0.04] hover:text-warm-charcoal"
                      >
                        {expandedZoneId === zone.id ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
                      </button>
                      <button
                        onClick={() => handleEdit(zone)}
                        className="rounded-lg p-1.5 text-warm-muted transition hover:bg-warm-charcoal/[0.04] hover:text-warm-charcoal"
                      >
                        <Edit2 size={13} />
                      </button>
                      <button
                        onClick={() => handleDelete(zone.id)}
                        className="rounded-lg p-1.5 text-warm-muted transition hover:bg-red-50 hover:text-red-600"
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                  </div>

                  {zone.description && (
                    <p className="text-xs text-warm-muted">{zone.description}</p>
                  )}

                  {zone.churches && (
                    <div className="rounded-xl border border-warm-charcoal/[0.07] bg-warm-ivory p-3">
                      <p className="text-[10px] font-bold tracking-[0.18em] text-warm-gold/70 mb-1">CHURCHES</p>
                      <p className="text-xs text-warm-muted whitespace-pre-wrap">{zone.churches}</p>
                    </div>
                  )}

                  {leader && (
                    <div className="rounded-xl border border-warm-gold/20 bg-warm-gold/[0.04] p-3">
                      <p className="text-[10px] font-bold tracking-[0.18em] text-warm-gold/70 mb-1">ZONE LEADER</p>
                      <p className="text-xs font-semibold text-warm-espresso">
                        {leader.name || `${leader.first_name} ${leader.last_name}`}
                      </p>
                      <p className="text-[10px] text-warm-muted">{leader.email}</p>
                    </div>
                  )}

                  <div className="flex items-center gap-4 text-xs text-warm-muted">
                    {zone.cell_count !== undefined && (
                      <span className="flex items-center gap-1"><Users size={10} />{zone.cell_count} cells</span>
                    )}
                    {zone.member_count !== undefined && (
                      <span className="flex items-center gap-1"><Users size={10} />{zone.member_count} members</span>
                    )}
                  </div>

                  {expandedZoneId === zone.id && (
                    <div className="border-t border-warm-charcoal/[0.07] pt-4 mt-1">
                      <p className="text-[10px] font-bold tracking-[0.18em] text-warm-gold/70 mb-3">MANAGE MEMBERS</p>
                      {loadingMembers[zone.id] ? (
                        <p className="text-xs text-warm-muted">Loading members...</p>
                      ) : !(zoneMembers[zone.id] || []).length ? (
                        <p className="text-xs text-warm-muted">No members assigned to this zone yet.</p>
                      ) : (
                        <div className="space-y-2.5">
                          {zoneMembers[zone.id].map((member) => (
                            <div key={member.id} className="rounded-xl border border-warm-charcoal/[0.07] bg-warm-ivory p-3">
                              <div className="flex items-start justify-between gap-2">
                                <div className="min-w-0">
                                  <p className="text-xs font-semibold text-warm-espresso">
                                    {member.name || `${member.first_name} ${member.last_name}`}
                                  </p>
                                  <p className="text-[10px] text-warm-muted truncate">{member.email || 'No email'}</p>
                                </div>
                                <span className="shrink-0 rounded-full border border-warm-charcoal/[0.07] px-2 py-0.5 text-[9px] text-warm-muted">
                                  {member.role || 'member'}
                                </span>
                              </div>
                              <div className="mt-2.5 flex flex-wrap gap-2">
                                <select
                                  value={transferTargets[member.id] || ''}
                                  onChange={(e) => setTransferTargets((prev) => ({ ...prev, [member.id]: e.target.value }))}
                                  className="min-w-[120px] rounded-lg border border-warm-charcoal/[0.1] bg-white px-3 py-1.5 text-xs text-warm-charcoal focus:outline-none"
                                >
                                  <option value="">Transfer to...</option>
                                  {zones.filter((z) => z.id !== zone.id).map((z) => (
                                    <option key={z.id} value={z.id}>{z.name}</option>
                                  ))}
                                </select>
                                <button
                                  onClick={() => handleTransferMember(zone.id, member.id)}
                                  disabled={memberActionLoading[`transfer-${member.id}`]}
                                  className="rounded-lg border border-warm-charcoal/[0.07] px-3 py-1.5 text-xs font-medium text-warm-muted transition hover:text-warm-charcoal disabled:opacity-40"
                                >
                                  {memberActionLoading[`transfer-${member.id}`] ? 'Moving...' : 'Transfer'}
                                </button>
                                <button
                                  onClick={() => handleRemoveMember(zone.id, member.id)}
                                  disabled={memberActionLoading[`remove-${member.id}`]}
                                  className="rounded-lg border border-red-200 bg-red-50 px-3 py-1.5 text-xs font-medium text-red-600 transition hover:bg-red-100 disabled:opacity-40"
                                >
                                  {memberActionLoading[`remove-${member.id}`] ? 'Removing...' : 'Remove'}
                                </button>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>
    </DashboardShell>
  )
}
