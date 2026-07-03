import { useState, useEffect } from 'react'
import { useAuth } from '../../contexts/AuthContext'
import { useNavigate } from 'react-router-dom'
import { attendanceAPI, membersAPI, visitorsAPI, givingAPI } from '../../utils/api'
import { toast } from 'react-toastify'
import { Search, User, CheckCircle, Clock, Users, Wifi, WifiOff, X } from 'lucide-react'
import DashboardShell from '../../components/dashboard/DashboardShell'

const inputCls = 'w-full rounded-xl border border-warm-charcoal/[0.1] bg-warm-ivory px-4 py-3 text-sm text-warm-charcoal placeholder-warm-muted focus:border-warm-gold/40 focus:outline-none focus:bg-white'
const labelCls = 'mb-1.5 block text-[10px] font-semibold uppercase tracking-[0.2em] text-warm-muted'

export default function SundayCheckin() {
  const { user } = useAuth()
  const navigate = useNavigate()

  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState([])
  const [selectedMember, setSelectedMember] = useState(null)
  const [checkingIn, setCheckingIn] = useState(false)
  const [checkedInMembers, setCheckedInMembers] = useState([])
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0])
  const [isOnline, setIsOnline] = useState(navigator.onLine)
  const [offlineQueue, setOfflineQueue] = useState([])
  const [showVisitorForm, setShowVisitorForm] = useState(false)
  const [visitorForm, setVisitorForm] = useState({ first_name: '', last_name: '', email: '', phone: '', notes: '' })
  const [collectionForm, setCollectionForm] = useState({ amount: '', fund: 'Sunday Offering', notes: '' })
  const [collectionSaving, setCollectionSaving] = useState(false)
  const [sundaySummary, setSundaySummary] = useState({ total_amount: 0, total_entries: 0, by_fund: [] })
  const [editingCheckin, setEditingCheckin] = useState(null)
  const [editForm, setEditForm] = useState({ attendance_date: new Date().toISOString().split('T')[0], check_in_time: '', notes: '' })
  const [savingEdit, setSavingEdit] = useState(false)
  const [deletingId, setDeletingId] = useState(null)

  useEffect(() => {
    const handleOnline = () => setIsOnline(true)
    const handleOffline = () => setIsOnline(false)
    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)
    return () => { window.removeEventListener('online', handleOnline); window.removeEventListener('offline', handleOffline) }
  }, [])

  useEffect(() => { loadTodaysCheckins(); loadSundaySummary() }, [selectedDate])

  useEffect(() => {
    if (searchQuery.length < 2) { setSearchResults([]); return }
    const id = setTimeout(() => searchMembers(searchQuery), 300)
    return () => clearTimeout(id)
  }, [searchQuery])

  useEffect(() => { if (isOnline && offlineQueue.length > 0) syncOfflineQueue() }, [isOnline])

  useEffect(() => {
    const saved = localStorage.getItem('offlineCheckinQueue')
    if (saved) setOfflineQueue(JSON.parse(saved))
  }, [])

  const searchMembers = async (query) => {
    try {
      const results = await membersAPI.searchMembers(query)
      const getUserId = (m) => m.user_id ?? m.id
      setSearchResults(results.filter((m) => !checkedInMembers.some((c) => Number(c.user_id) === Number(getUserId(m)))))
    } catch {}
  }

  const loadTodaysCheckins = async () => {
    try {
      const response = await attendanceAPI.getSundayAttendance(selectedDate)
      setCheckedInMembers(Array.isArray(response?.data) ? response.data : [])
    } catch {}
  }

  const loadSundaySummary = async () => {
    try {
      const response = await givingAPI.getSundaySummary(selectedDate)
      const summary = response?.data || response || {}
      setSundaySummary({
        total_amount: Number(summary.total_amount || 0),
        total_entries: Number(summary.total_entries || 0),
        by_fund: Array.isArray(summary.by_fund) ? summary.by_fund : [],
      })
    } catch {}
  }

  const handleCheckin = async (member) => {
    const memberUserId = member.user_id ?? member.id
    if (!isOnline) {
      const queueItem = { member_id: memberUserId, attendance_date: selectedDate, is_visitor: false, timestamp: new Date().toISOString() }
      const newQueue = [...offlineQueue, queueItem]
      setOfflineQueue(newQueue)
      localStorage.setItem('offlineCheckinQueue', JSON.stringify(newQueue))
      toast.info('Offline: Check-in queued for sync when online')
      addToCheckedInList(member)
      return
    }
    setCheckingIn(true)
    try {
      await attendanceAPI.recordSundayCheckin(memberUserId, selectedDate, false)
      toast.success(`${member.first_name} ${member.last_name} checked in!`)
      addToCheckedInList(member, memberUserId)
      setSearchQuery(''); setSearchResults([]); setSelectedMember(null)
    } catch (error) {
      toast.error('Check-in failed: ' + error.message)
    } finally {
      setCheckingIn(false)
    }
  }

  const addToCheckedInList = (member, userId, visitorId) => {
    setCheckedInMembers((prev) => [...prev, {
      user_id: userId ?? member.user_id ?? member.id,
      ...(visitorId || member.visitor_id ? { visitor_id: visitorId ?? member.visitor_id } : {}),
      first_name: member.first_name,
      last_name: member.last_name,
      attendance_date: selectedDate,
      check_in_time: new Date().toTimeString().slice(0, 5),
      is_visitor: Boolean(member.is_visitor),
    }])
  }

  const openVisitorForm = () => {
    const parts = searchQuery.trim().split(/\s+/).filter(Boolean)
    setVisitorForm((prev) => ({ ...prev, first_name: prev.first_name || parts[0] || '', last_name: prev.last_name || parts.slice(1).join(' ') || '' }))
    setShowVisitorForm(true); setSelectedMember(null)
  }

  const handleVisitorCheckin = async () => {
    if (!visitorForm.first_name.trim() || !visitorForm.last_name.trim()) { toast.error('Visitor first and last name are required'); return }
    try {
      setCheckingIn(true)
      let visitorRecord = null
      try {
        const registerRes = await visitorsAPI.register({ ...visitorForm, status: 'new', visit_date: selectedDate })
        visitorRecord = registerRes?.data?.visitor || registerRes?.data || registerRes
      } catch (error) { console.warn('Visitor registration fallback:', error?.message || error) }

      const response = await visitorsAPI.checkin({ ...visitorForm, visit_date: selectedDate, visitor_id: visitorRecord?.id || visitorRecord?._id })
      const visitor = response?.data?.visitor || visitorRecord || visitorForm
      const visitorId = visitor?.id || visitor?._id || visitorRecord?.id || visitorRecord?._id

      addToCheckedInList({ ...visitor, is_visitor: true, first_name: visitor.first_name || visitorForm.first_name, last_name: visitor.last_name || visitorForm.last_name }, null, visitorId)
      setVisitorForm({ first_name: '', last_name: '', email: '', phone: '', notes: '' })
      setShowVisitorForm(false); setSearchQuery(''); setSearchResults([])
      toast.success('Visitor registered and checked in')
      await loadTodaysCheckins()
    } catch (error) {
      toast.error(error.message || 'Visitor check-in failed')
    } finally {
      setCheckingIn(false)
    }
  }

  const handleCollectionSubmit = async (e) => {
    e.preventDefault()
    const amount = Number(collectionForm.amount)
    if (!amount || amount <= 0) { toast.error('Enter a valid collection amount'); return }
    try {
      setCollectionSaving(true)
      const payload = { donor_name: 'Eternal Love Church Sunday Service Collection', amount, fund: collectionForm.fund || 'Sunday Offering', notes: collectionForm.notes || null, entry_source: 'sunday_service', service_date: selectedDate, recorded_by: user?.id, donor_type: 'church' }
      if (!isOnline) {
        const newQueue = [...offlineQueue, { type: 'collection', payload, timestamp: new Date().toISOString() }]
        setOfflineQueue(newQueue)
        localStorage.setItem('offlineCheckinQueue', JSON.stringify(newQueue))
        toast.info('Offline: collection queued for sync')
        setCollectionForm((prev) => ({ ...prev, amount: '', notes: '' }))
        return
      }
      await givingAPI.recordGiving(payload)
      toast.success('Collection recorded')
      setCollectionForm((prev) => ({ ...prev, amount: '', notes: '' }))
      await loadSundaySummary()
    } catch (error) {
      toast.error(error.message || 'Failed to record collection')
    } finally {
      setCollectionSaving(false)
    }
  }

  const startEditCheckin = (checkin) => {
    setEditingCheckin(checkin)
    setEditForm({ attendance_date: checkin.attendance_date || selectedDate, check_in_time: checkin.check_in_time || '', notes: checkin.notes || '' })
  }

  const handleUpdateCheckin = async () => {
    if (!editingCheckin?.id) return
    setSavingEdit(true)
    try {
      await attendanceAPI.updateSundayAttendance(editingCheckin.id, { attendance_date: editForm.attendance_date, check_in_time: editForm.check_in_time || undefined, notes: editForm.notes || null })
      toast.success('Check-in updated')
      setEditingCheckin(null)
      await loadTodaysCheckins()
    } catch (error) {
      toast.error(error.message || 'Failed to update check-in')
    } finally {
      setSavingEdit(false)
    }
  }

  const handleDeleteCheckin = async (checkinId) => {
    if (!checkinId) return
    setDeletingId(checkinId)
    try {
      await attendanceAPI.deleteSundayAttendance(checkinId)
      toast.success('Check-in deleted')
      await loadTodaysCheckins()
    } catch (error) {
      toast.error(error.message || 'Failed to delete check-in')
    } finally {
      setDeletingId(null)
    }
  }

  const syncOfflineQueue = async () => {
    if (!isOnline || offlineQueue.length === 0) return
    try {
      for (const item of offlineQueue) {
        if (item.type === 'collection') { await givingAPI.recordGiving(item.payload); continue }
        await attendanceAPI.recordSundayCheckin(item.member_id, item.attendance_date, item.is_visitor)
      }
      setOfflineQueue([])
      localStorage.removeItem('offlineCheckinQueue')
      toast.success('Offline check-ins synced!')
      loadTodaysCheckins()
    } catch (error) {
      toast.error('Sync failed: ' + error.message)
    }
  }

  const totalCheckins = checkedInMembers.length
  const recentCheckins = checkedInMembers.slice(-10).reverse()
  const checkinsLastHour = checkedInMembers.filter((c) => {
    if (!c.check_in_time) return false
    const dt = new Date(`${selectedDate}T${c.check_in_time}`)
    return !isNaN(dt.getTime()) && Date.now() - dt.getTime() < 60 * 60 * 1000
  }).length
  const visitorCount = checkedInMembers.filter((c) => c.is_visitor).length
  const memberCount = totalCheckins - visitorCount
  const offeringTotal = sundaySummary.total_amount || 0

  return (
    <DashboardShell>
      <div className="mx-auto max-w-4xl px-5 sm:px-8 py-8 space-y-6">

        {/* Header */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b border-warm-charcoal/[0.07] pb-8">
          <div>
            <h1 className="text-3xl font-black tracking-tighter text-warm-charcoal">SUNDAY CHECK-IN</h1>
            <p className="mt-2 text-sm text-warm-muted">Attendance and collection recording.</p>
          </div>
          <div className="flex items-center gap-2 flex-wrap shrink-0">
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="rounded-xl border border-warm-charcoal/[0.1] bg-warm-ivory px-3 py-2 text-sm text-warm-charcoal focus:border-warm-gold/40 focus:outline-none"
            />
            <button
              onClick={() => setSelectedDate(new Date().toISOString().split('T')[0])}
              className="rounded-xl border border-warm-charcoal/[0.07] bg-white px-3 py-2 text-xs font-semibold text-warm-muted transition hover:text-warm-charcoal shadow-sm"
            >
              Today
            </button>
            <div className={`flex items-center gap-1.5 rounded-xl px-3 py-2 text-xs font-semibold ${isOnline ? 'text-emerald-700 bg-emerald-500/10' : 'text-amber-700 bg-amber-500/10'}`}>
              {isOnline ? <Wifi size={13} /> : <WifiOff size={13} />}
              {isOnline ? 'Online' : 'Offline'}
            </div>
            {offlineQueue.length > 0 && (
              <div className="flex items-center gap-1.5 rounded-xl px-3 py-2 text-xs font-semibold text-amber-700 bg-amber-500/10">
                <Clock size={13} />
                {offlineQueue.length} queued
              </div>
            )}
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { label: 'Checked In', value: totalCheckins, color: 'text-warm-gold' },
            { label: 'Last Hour', value: checkinsLastHour, color: 'text-emerald-600' },
            { label: 'Members', value: memberCount, color: 'text-blue-600' },
            { label: 'Visitors', value: visitorCount, color: 'text-amber-600' },
          ].map(({ label, value, color }) => (
            <div key={label} className="rounded-2xl border border-warm-charcoal/[0.07] bg-white p-4 text-center shadow-sm">
              <p className={`text-3xl font-black tabular-nums ${color}`}>{value}</p>
              <p className="mt-1 text-[9px] font-bold tracking-[0.2em] text-warm-muted">{label.toUpperCase()}</p>
            </div>
          ))}
        </div>

        {/* Offering summary */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="flex items-center justify-between rounded-2xl border border-warm-charcoal/[0.07] bg-white px-5 py-4 shadow-sm">
            <div>
              <p className="text-[9px] font-bold tracking-[0.2em] text-warm-gold/70">OFFERING RECORDED</p>
              <p className="mt-1 text-2xl font-black tabular-nums text-warm-charcoal">R {offeringTotal.toLocaleString()}</p>
            </div>
            <p className="text-xs text-warm-muted">Entries: {sundaySummary.total_entries}</p>
          </div>
          <div className="flex items-center justify-between rounded-2xl border border-warm-charcoal/[0.07] bg-white px-5 py-4 shadow-sm">
            <div>
              <p className="text-[9px] font-bold tracking-[0.2em] text-warm-gold/70">FUNDS</p>
              <p className="mt-1 text-2xl font-black tabular-nums text-warm-charcoal">{sundaySummary.by_fund.length || 0}</p>
            </div>
            <p className="text-xs text-warm-muted">Breakdown available</p>
          </div>
        </div>

        {/* Collection Entry */}
        <div className="rounded-2xl border border-warm-charcoal/[0.07] bg-white p-5 space-y-4 shadow-sm">
          <div>
            <p className="text-[9px] font-bold tracking-[0.22em] text-warm-gold/70">SUNDAY COLLECTION ENTRY</p>
            <p className="mt-1 text-xs text-warm-muted">Record amounts captured during Sunday service.</p>
          </div>
          <form onSubmit={handleCollectionSubmit} className="space-y-3">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
              <div>
                <label className={labelCls}>Amount (R)</label>
                <input type="number" step="0.01" min="0" value={collectionForm.amount} onChange={(e) => setCollectionForm((p) => ({ ...p, amount: e.target.value }))} className={inputCls} placeholder="0.00" />
              </div>
              <div>
                <label className={labelCls}>Fund</label>
                <input type="text" value={collectionForm.fund} onChange={(e) => setCollectionForm((p) => ({ ...p, fund: e.target.value }))} className={inputCls} placeholder="Sunday Offering" />
              </div>
              <div className="md:col-span-2">
                <label className={labelCls}>Notes (Optional)</label>
                <input type="text" value={collectionForm.notes} onChange={(e) => setCollectionForm((p) => ({ ...p, notes: e.target.value }))} className={inputCls} placeholder="Any detail for finance" />
              </div>
            </div>
            <div className="flex items-center justify-between rounded-xl border border-emerald-500/20 bg-emerald-500/[0.04] px-4 py-3">
              <div className="text-xs text-warm-muted">
                <p>Today's total: <span className="font-semibold text-warm-charcoal">R {Number(sundaySummary.total_amount || 0).toLocaleString()}</span></p>
                <p>Entries: <span className="font-semibold text-warm-charcoal">{sundaySummary.total_entries || 0}</span></p>
              </div>
              <button type="submit" disabled={collectionSaving} className="rounded-xl bg-warm-gold px-5 py-2.5 text-xs font-bold tracking-[0.15em] text-warm-espresso transition hover:opacity-90 disabled:opacity-50">
                {collectionSaving ? 'SAVING...' : 'RECORD'}
              </button>
            </div>
          </form>
        </div>

        {/* Search & Check-in */}
        <div className="rounded-2xl border border-warm-charcoal/[0.07] bg-white p-5 space-y-4 shadow-sm">
          <p className="text-[9px] font-bold tracking-[0.22em] text-warm-gold/70">SEARCH & CHECK-IN MEMBER</p>
          <div className="relative">
            <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-warm-muted" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by name or email..."
              className={`${inputCls} pl-9`}
            />
          </div>

          {searchResults.length > 0 && (
            <div className="rounded-xl border border-warm-charcoal/[0.07] overflow-hidden max-h-72 overflow-y-auto">
              {searchResults.map((member) => (
                <div
                  key={member.id ?? member.user_id}
                  onClick={() => setSelectedMember(member)}
                  className={`flex items-center justify-between p-4 border-b border-warm-charcoal/[0.05] cursor-pointer transition hover:bg-warm-ivory ${selectedMember?.id === member.id ? 'bg-warm-gold/[0.04]' : ''}`}
                >
                  <div className="flex items-center gap-3">
                    <div className="flex h-9 w-9 items-center justify-center rounded-full border border-warm-charcoal/[0.07] bg-warm-ivory">
                      <User size={14} className="text-warm-muted" />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-warm-espresso">{member.first_name} {member.last_name}</p>
                      <p className="text-xs text-warm-muted">{member.email}</p>
                      {member.cell_name && <p className="text-[10px] text-warm-muted">{member.cell_name}</p>}
                    </div>
                  </div>
                  {selectedMember?.id === member.id && <CheckCircle size={16} className="text-emerald-600" />}
                </div>
              ))}
            </div>
          )}

          {searchQuery.length >= 2 && searchResults.length === 0 && !selectedMember && !showVisitorForm && (
            <div className="rounded-xl border border-dashed border-warm-charcoal/[0.1] bg-warm-ivory p-4 text-center">
              <p className="text-xs text-warm-muted mb-3">No member found for "{searchQuery}".</p>
              <button onClick={openVisitorForm} className="rounded-xl bg-warm-gold px-4 py-2 text-xs font-bold tracking-[0.15em] text-warm-espresso transition hover:opacity-90">
                ADD AS VISITOR
              </button>
            </div>
          )}

          {selectedMember && (
            <div className="rounded-xl border border-warm-gold/20 bg-warm-gold/[0.04] p-4 flex items-center justify-between gap-4">
              <div>
                <p className="text-sm font-bold text-warm-espresso">{selectedMember.first_name} {selectedMember.last_name}</p>
                <p className="text-xs text-warm-muted">{selectedMember.email}</p>
                {selectedMember.cell_name && <p className="text-xs text-warm-gold/70">Cell: {selectedMember.cell_name}</p>}
              </div>
              <button
                onClick={() => handleCheckin(selectedMember)}
                disabled={checkingIn}
                className="inline-flex items-center gap-2 rounded-xl bg-warm-gold px-5 py-2.5 text-xs font-bold tracking-[0.15em] text-warm-espresso transition hover:opacity-90 disabled:opacity-50 shrink-0"
              >
                <CheckCircle size={13} />
                {checkingIn ? 'CHECKING IN...' : 'CHECK IN'}
              </button>
            </div>
          )}

          {showVisitorForm && (
            <div className="rounded-xl border border-warm-charcoal/[0.07] bg-warm-ivory p-4 space-y-3">
              <div className="flex items-center justify-between">
                <p className="text-[9px] font-bold tracking-[0.22em] text-warm-gold/70">VISITOR CHECK-IN</p>
                <button onClick={() => setShowVisitorForm(false)} className="text-warm-muted transition hover:text-warm-charcoal"><X size={14} /></button>
              </div>
              <div className="grid md:grid-cols-2 gap-3">
                <input type="text" value={visitorForm.first_name} onChange={(e) => setVisitorForm((p) => ({ ...p, first_name: e.target.value }))} placeholder="First name" className={inputCls} />
                <input type="text" value={visitorForm.last_name} onChange={(e) => setVisitorForm((p) => ({ ...p, last_name: e.target.value }))} placeholder="Last name" className={inputCls} />
                <input type="email" value={visitorForm.email} onChange={(e) => setVisitorForm((p) => ({ ...p, email: e.target.value }))} placeholder="Email (optional)" className={inputCls} />
                <input type="text" value={visitorForm.phone} onChange={(e) => setVisitorForm((p) => ({ ...p, phone: e.target.value }))} placeholder="Phone (optional)" className={inputCls} />
              </div>
              <textarea value={visitorForm.notes} onChange={(e) => setVisitorForm((p) => ({ ...p, notes: e.target.value }))} placeholder="Notes (optional)" rows={2} className={`${inputCls} resize-none`} />
              <div className="flex gap-3">
                <button onClick={handleVisitorCheckin} disabled={checkingIn} className="rounded-xl bg-warm-gold px-5 py-2.5 text-xs font-bold tracking-[0.15em] text-warm-espresso transition hover:opacity-90 disabled:opacity-50">
                  {checkingIn ? 'CHECKING IN...' : 'REGISTER & CHECK IN'}
                </button>
                <button onClick={() => setShowVisitorForm(false)} className="rounded-xl border border-warm-charcoal/[0.07] bg-white px-4 py-2.5 text-xs font-semibold text-warm-muted transition hover:text-warm-charcoal">
                  Cancel
                </button>
              </div>
            </div>
          )}

          <button
            onClick={openVisitorForm}
            className="w-full rounded-xl border border-dashed border-warm-charcoal/[0.1] py-3 text-xs font-semibold text-warm-muted transition hover:border-warm-gold/30 hover:text-warm-gold flex items-center justify-center gap-2"
          >
            <User size={13} />
            Check in Visitor
          </button>
        </div>

        {/* Today's Check-ins */}
        <div className="rounded-2xl border border-warm-charcoal/[0.07] bg-white p-5 space-y-4 shadow-sm">
          <p className="text-[9px] font-bold tracking-[0.22em] text-warm-gold/70">TODAY'S CHECK-INS ({selectedDate})</p>
          {recentCheckins.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-10 text-center">
              <Users size={28} className="text-warm-gold/30 mb-3" />
              <p className="text-xs text-warm-muted">No check-ins yet today</p>
            </div>
          ) : (
            <div className="space-y-2 max-h-80 overflow-y-auto pr-1">
              {recentCheckins.map((checkin, index) => (
                <div key={index} className="flex items-center justify-between rounded-xl border border-emerald-500/20 bg-emerald-500/[0.04] px-4 py-3 gap-3">
                  <div className="flex items-center gap-3">
                    <CheckCircle size={14} className="text-emerald-600 shrink-0" />
                    <div>
                      <p className="text-sm font-semibold text-warm-espresso">
                        {checkin.first_name} {checkin.last_name}
                        {checkin.is_visitor && <span className="ml-2 text-[9px] font-bold tracking-[0.1em] text-amber-700 bg-amber-500/10 px-1.5 py-0.5 rounded-full">VISITOR</span>}
                      </p>
                      <p className="text-xs text-warm-muted">{new Date(checkin.attendance_date).toLocaleDateString()} · {checkin.check_in_time || '—'}</p>
                    </div>
                  </div>
                  {!checkin.is_visitor && (
                    <div className="flex items-center gap-1.5 shrink-0">
                      <button onClick={() => startEditCheckin(checkin)} className="rounded-lg px-2.5 py-1 text-[10px] font-semibold text-warm-muted border border-warm-charcoal/[0.07] transition hover:text-warm-charcoal">Edit</button>
                      <button onClick={() => handleDeleteCheckin(checkin.id)} disabled={deletingId === checkin.id} className="rounded-lg px-2.5 py-1 text-[10px] font-semibold text-red-600 border border-red-200 transition hover:bg-red-50 disabled:opacity-40">
                        {deletingId === checkin.id ? '...' : 'Delete'}
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Offline Warning */}
        {!isOnline && (
          <div className="rounded-2xl border border-amber-500/20 bg-amber-500/[0.04] p-4 flex items-start gap-3">
            <WifiOff size={16} className="text-amber-600 mt-0.5 shrink-0" />
            <div>
              <p className="text-sm font-semibold text-amber-700">You're offline</p>
              <p className="text-xs text-warm-muted mt-0.5">Check-ins are queued locally and will sync automatically when reconnected.
                {offlineQueue.length > 0 && <span className="block mt-1 font-semibold text-amber-700">{offlineQueue.length} check-in(s) waiting to sync</span>}
              </p>
            </div>
          </div>
        )}

        {/* Edit Check-in Modal */}
        {editingCheckin && (
          <div className="fixed inset-0 bg-warm-charcoal/40 flex items-center justify-center z-50 p-4">
            <div className="w-full max-w-md rounded-2xl border border-warm-charcoal/[0.07] bg-white p-6 space-y-4 shadow-xl">
              <div className="flex items-center justify-between">
                <p className="text-sm font-bold text-warm-charcoal">Edit Check-in</p>
                <button onClick={() => setEditingCheckin(null)} className="text-warm-muted transition hover:text-warm-charcoal"><X size={16} /></button>
              </div>
              <div className="space-y-3">
                <div>
                  <label className={labelCls}>Attendance Date</label>
                  <input type="date" value={editForm.attendance_date} onChange={(e) => setEditForm((p) => ({ ...p, attendance_date: e.target.value }))} className={inputCls} />
                </div>
                <div>
                  <label className={labelCls}>Check-in Time</label>
                  <input type="time" value={editForm.check_in_time} onChange={(e) => setEditForm((p) => ({ ...p, check_in_time: e.target.value }))} className={inputCls} />
                </div>
                <div>
                  <label className={labelCls}>Notes</label>
                  <textarea value={editForm.notes} onChange={(e) => setEditForm((p) => ({ ...p, notes: e.target.value }))} rows={3} className={`${inputCls} resize-none`} placeholder="Reason for adjustment" />
                </div>
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button onClick={() => setEditingCheckin(null)} className="rounded-xl border border-warm-charcoal/[0.07] bg-white px-4 py-2.5 text-xs font-semibold text-warm-muted transition hover:text-warm-charcoal">Cancel</button>
                <button onClick={handleUpdateCheckin} disabled={savingEdit} className="rounded-xl bg-warm-gold px-5 py-2.5 text-xs font-bold tracking-[0.15em] text-warm-espresso transition hover:opacity-90 disabled:opacity-50">
                  {savingEdit ? 'SAVING...' : 'SAVE CHANGES'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </DashboardShell>
  )
}
