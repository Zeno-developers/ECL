import { useState, useEffect } from 'react'
import { useAuth } from '../../contexts/AuthContext'
import { useNavigate } from 'react-router-dom'
import { cellsAPI, attendanceAPI } from '../../utils/api'
import { toast } from 'react-toastify'
import { Users, Calendar, CheckCircle, XCircle, Clock, Save, ArrowLeft } from 'lucide-react'
import DashboardShell from '../../components/dashboard/DashboardShell'

const inputCls = 'w-full rounded-xl border border-warm-charcoal/[0.1] bg-warm-ivory px-4 py-3 text-sm text-warm-charcoal placeholder-warm-muted focus:border-warm-gold/40 focus:outline-none focus:bg-white'
const labelCls = 'mb-1.5 block text-[10px] font-semibold uppercase tracking-[0.2em] text-warm-muted'

export default function CellAttendance() {
  const { user } = useAuth()
  const navigate = useNavigate()

  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [cellInfo, setCellInfo] = useState(null)
  const [members, setMembers] = useState([])
  const [meetingDate, setMeetingDate] = useState(new Date().toISOString().split('T')[0])
  const [attendingMembers, setAttendingMembers] = useState(new Set())
  const [notes, setNotes] = useState('')

  useEffect(() => {
    if (user?.cell_id) fetchCellMembers()
    else { toast.error('You are not assigned to a cell'); navigate('/dashboard') }
  }, [user?.cell_id])

  const fetchCellMembers = async () => {
    try {
      setLoading(true)
      const response = await cellsAPI.getMembers(user.cell_id)
      if (response.data) {
        setMembers(response.data)
        setAttendingMembers(new Set(response.data.map((m) => m.id)))
      }
    } catch (error) {
      toast.error('Failed to load cell members')
    } finally {
      setLoading(false)
    }
  }

  const handleToggleMember = (memberId) => {
    const newSet = new Set(attendingMembers)
    if (newSet.has(memberId)) newSet.delete(memberId)
    else newSet.add(memberId)
    setAttendingMembers(newSet)
  }

  const handleSelectAll = () => setAttendingMembers(new Set(members.map((m) => m.id)))
  const handleDeselectAll = () => setAttendingMembers(new Set())

  const handleSaveAttendance = async () => {
    if (!meetingDate) { toast.error('Please select a meeting date'); return }
    setSaving(true)
    try {
      await attendanceAPI.recordCellAttendance(user.cell_id, meetingDate, Array.from(attendingMembers), notes || undefined)
      toast.success('Attendance recorded successfully!')
      navigate('/cell/dashboard')
    } catch (error) {
      toast.error('Failed to save attendance: ' + error.message)
    } finally {
      setSaving(false)
    }
  }

  const stats = { total: members.length, present: attendingMembers.size, absent: members.length - attendingMembers.size }

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
        <div className="flex items-center justify-between gap-4 border-b border-warm-charcoal/[0.07] pb-8">
          <div className="flex items-center gap-4">
            <button
              onClick={() => navigate('/cell/dashboard')}
              className="rounded-xl border border-warm-charcoal/[0.07] bg-white p-2.5 text-warm-muted transition hover:text-warm-charcoal shadow-sm"
            >
              <ArrowLeft size={16} />
            </button>
            <div>
              <h1 className="text-3xl font-black tracking-tighter text-warm-charcoal">RECORD ATTENDANCE</h1>
              <p className="mt-1 text-sm text-warm-muted">{cellInfo?.name || 'My Cell'} · {meetingDate}</p>
            </div>
          </div>
          <button
            onClick={handleSaveAttendance}
            disabled={saving}
            className="inline-flex items-center gap-2 rounded-xl bg-warm-gold px-5 py-2.5 text-xs font-bold tracking-[0.18em] text-warm-espresso transition hover:opacity-90 disabled:opacity-50 shrink-0"
          >
            <Save size={13} />
            {saving ? 'SAVING...' : 'SAVE'}
          </button>
        </div>

        {/* Date */}
        <div className="rounded-2xl border border-warm-charcoal/[0.07] bg-white p-6 shadow-sm">
          <div className="flex items-center gap-4">
            <Calendar size={18} className="text-warm-muted shrink-0" />
            <div className="flex-1">
              <label className={labelCls}>Meeting Date</label>
              <input
                type="date"
                value={meetingDate}
                onChange={(e) => setMeetingDate(e.target.value)}
                max={new Date().toISOString().split('T')[0]}
                className={inputCls}
              />
            </div>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-3">
          <div className="rounded-xl border border-warm-charcoal/[0.07] bg-white p-4 text-center shadow-sm">
            <p className="text-2xl font-black text-warm-charcoal">{stats.total}</p>
            <p className="text-[10px] font-bold tracking-[0.15em] text-warm-muted mt-0.5">TOTAL</p>
          </div>
          <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/[0.04] p-4 text-center">
            <p className="text-2xl font-black text-emerald-700">{stats.present}</p>
            <p className="text-[10px] font-bold tracking-[0.15em] text-emerald-700 mt-0.5">PRESENT</p>
          </div>
          <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-center">
            <p className="text-2xl font-black text-red-600">{stats.absent}</p>
            <p className="text-[10px] font-bold tracking-[0.15em] text-red-600 mt-0.5">ABSENT</p>
          </div>
        </div>

        {/* Bulk actions */}
        <div className="flex gap-3">
          <button
            onClick={handleSelectAll}
            className="flex-1 rounded-xl border border-warm-charcoal/[0.07] bg-white py-2.5 text-xs font-semibold text-warm-muted transition hover:border-warm-charcoal/[0.12] hover:text-warm-charcoal shadow-sm"
          >
            Select All
          </button>
          <button
            onClick={handleDeselectAll}
            className="flex-1 rounded-xl border border-warm-charcoal/[0.07] bg-white py-2.5 text-xs font-semibold text-warm-muted transition hover:border-warm-charcoal/[0.12] hover:text-warm-charcoal shadow-sm"
          >
            Deselect All
          </button>
        </div>

        {/* Members */}
        <div className="rounded-2xl border border-warm-charcoal/[0.07] bg-white overflow-hidden shadow-sm">
          <div className="px-6 py-4 border-b border-warm-charcoal/[0.07]">
            <p className="text-xs font-bold tracking-[0.18em] text-warm-gold/70 flex items-center gap-2">
              <Users size={14} />
              MARK ATTENDANCE
            </p>
            <p className="text-[10px] text-warm-muted mt-1">Tap to toggle attendance for each member</p>
          </div>

          {members.length === 0 ? (
            <div className="text-center py-12">
              <Users size={36} className="mx-auto mb-3 text-warm-gold/30" />
              <p className="text-sm text-warm-muted">No members in this cell.</p>
            </div>
          ) : (
            <div className="divide-y divide-warm-charcoal/[0.05] max-h-96 overflow-y-auto">
              {members.map((member) => {
                const isPresent = attendingMembers.has(member.id)
                return (
                  <div
                    key={member.id}
                    onClick={() => handleToggleMember(member.id)}
                    className={`flex items-center justify-between p-4 cursor-pointer transition-colors ${
                      isPresent ? 'bg-emerald-500/[0.04] hover:bg-emerald-500/[0.07]' : 'hover:bg-warm-ivory'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className={`w-9 h-9 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${
                        isPresent ? 'bg-emerald-500/20 text-emerald-700' : 'bg-warm-gold/10 text-warm-gold'
                      }`}>
                        {member.first_name?.charAt(0)}{member.last_name?.charAt(0)}
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-warm-espresso">{member.first_name} {member.last_name}</p>
                        <p className="text-xs text-warm-muted">{member.email}</p>
                        {member.member_number && <p className="text-[10px] text-warm-muted">#{member.member_number}</p>}
                      </div>
                    </div>
                    <div className={`inline-flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-semibold ${
                      isPresent ? 'bg-emerald-500/10 text-emerald-700' : 'bg-warm-charcoal/[0.05] text-warm-muted'
                    }`}>
                      {isPresent ? <><CheckCircle size={13} />Present</> : <><XCircle size={13} />Absent</>}
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {/* Notes */}
        <div className="rounded-2xl border border-warm-charcoal/[0.07] bg-white p-6 shadow-sm">
          <label className={labelCls}>
            <Clock size={12} className="inline mr-1.5 mb-0.5" />
            Meeting Notes (Optional)
          </label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Add any notes about this meeting..."
            rows={4}
            className={`${inputCls} resize-none`}
          />
        </div>

        {/* Mobile save */}
        <div className="lg:hidden">
          <button
            onClick={handleSaveAttendance}
            disabled={saving}
            className="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-warm-gold px-5 py-3.5 text-xs font-bold tracking-[0.18em] text-warm-espresso transition hover:opacity-90 disabled:opacity-50"
          >
            <Save size={14} />
            {saving ? 'SAVING...' : 'SAVE ATTENDANCE'}
          </button>
        </div>
      </div>
    </DashboardShell>
  )
}
