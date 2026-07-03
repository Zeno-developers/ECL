import { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { toast } from 'react-toastify'
import { AlertTriangle, ArrowLeft, Clock3, Mail, Send, ShieldCheck, Search, Users } from 'lucide-react'
import DashboardShell from '../components/dashboard/DashboardShell'
import { DashboardPanel, DashboardStatGrid } from '../components/dashboard/RoleDashboardUI'
import { followUpAPI } from '../utils/api'

const WA_SERVICE = import.meta.env.VITE_WHATSAPP_SERVICE_URL || 'http://localhost:3001'

async function sendWhatsApp(phone, message) {
  if (!phone) return
  try {
    await fetch(`${WA_SERVICE}/send`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ phone, message }),
    })
  } catch {
    // WhatsApp service unavailable — continue silently
  }
}

const inputCls = 'w-full rounded-xl border border-warm-charcoal/[0.1] bg-warm-ivory px-4 py-3 text-sm text-warm-charcoal placeholder-warm-muted focus:border-warm-gold/40 focus:outline-none focus:bg-white'
const labelCls = 'mb-1.5 block text-[10px] font-semibold uppercase tracking-[0.2em] text-warm-muted'

const QUICK_TEMPLATES = {
  welcome_back: {
    subject: 'We would love to see you back at church',
    message: 'We noticed that you may have been away recently and wanted to reach out with love. You are missed, and our church family would be glad to welcome you back whenever you are ready.\n\nIf you would like prayer or a private conversation with a pastor, please reply to this email and we will gladly arrange a gentle follow-up.',
  },
  prayer_support: {
    subject: 'We are praying for you and your family',
    message: 'You are on our hearts and in our prayers. If there is anything we can pray with you about, please let us know. You may reply to this email or use the prayer request page, and a pastor will follow up with care.',
  },
  meeting_invite: {
    subject: 'Invitation to connect with a pastor',
    message: 'We would love to arrange a brief and gentle check-in with you. If you are open to it, a pastor can meet with you, pray with you, and help you reconnect at a pace that feels right for you.',
  },
}

const formatDateTime = (value) => {
  if (!value) return 'Not yet sent'
  const parsed = new Date(value)
  if (Number.isNaN(parsed.getTime())) return String(value)
  return parsed.toLocaleString()
}

const statusStyles = {
  sent: 'text-emerald-700 bg-emerald-500/10',
  queued: 'text-amber-700 bg-amber-500/10',
  failed: 'text-red-700 bg-red-500/10',
}

export default function PastoralFollowUpPage() {
  const navigate = useNavigate()
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [overview, setOverview] = useState({})
  const [members, setMembers] = useState([])
  const [selectedMemberId, setSelectedMemberId] = useState(null)
  const [history, setHistory] = useState([])
  const [historyMeta, setHistoryMeta] = useState(null)
  const [historyLoading, setHistoryLoading] = useState(false)
  const [sending, setSending] = useState(false)
  const [compose, setCompose] = useState({
    subject: QUICK_TEMPLATES.welcome_back.subject,
    message: QUICK_TEMPLATES.welcome_back.message,
  })
  const searchTimerRef = useRef(null)

  // Debounce: fire loadPageData 400ms after the user stops typing
  useEffect(() => {
    clearTimeout(searchTimerRef.current)
    searchTimerRef.current = setTimeout(() => loadPageData(), 400)
    return () => clearTimeout(searchTimerRef.current)
  }, [search])

  useEffect(() => {
    if (selectedMemberId) loadHistory(selectedMemberId)
    else { setHistory([]); setHistoryMeta(null) }
  }, [selectedMemberId])

  const selectedMember = useMemo(
    () => members.find((m) => String(m.id) === String(selectedMemberId)) || null,
    [members, selectedMemberId]
  )

  const loadPageData = async () => {
    try {
      setLoading(true)
      const [summaryRes, membersRes] = await Promise.all([
        followUpAPI.getSummary(),
        followUpAPI.getMembers({ q: search, limit: 30 }),
      ])
      setOverview(summaryRes?.data || {})
      const latestMembers = Array.isArray(membersRes?.data?.members) ? membersRes.data.members : []
      setMembers(latestMembers)
      if (!selectedMemberId && latestMembers.length) setSelectedMemberId(latestMembers[0].id)
    } catch (error) {
      toast.error(error.message || 'Failed to load follow-up workspace')
      setMembers([])
      setOverview({})
    } finally {
      setLoading(false)
    }
  }

  const loadHistory = async (memberId) => {
    try {
      setHistoryLoading(true)
      const response = await followUpAPI.getEmails({ member_id: memberId, limit: 15 })
      setHistory(Array.isArray(response?.data?.emails) ? response.data.emails : [])
      setHistoryMeta(response?.data?.pagination || null)
      if (response?.data?.member && !selectedMemberId) setSelectedMemberId(response.data.member.id)
    } catch (error) {
      toast.error(error.message || 'Failed to load email history')
      setHistory([])
      setHistoryMeta(null)
    } finally {
      setHistoryLoading(false)
    }
  }

  const handleSelectMember = (member) => {
    setSelectedMemberId(member.id)
    setCompose({ subject: QUICK_TEMPLATES.welcome_back.subject, message: QUICK_TEMPLATES.welcome_back.message })
  }

  const applyTemplate = (templateKey) => {
    const template = QUICK_TEMPLATES[templateKey]
    if (template) setCompose({ subject: template.subject, message: template.message })
  }

  const handleSendEmail = async (e) => {
    e.preventDefault()
    if (!selectedMember) { toast.error('Select a member first'); return }
    if (!compose.subject.trim() || !compose.message.trim()) { toast.error('Subject and message are required'); return }
    try {
      setSending(true)
      const [response] = await Promise.all([
        followUpAPI.sendEmail({
          member_id: selectedMember.id,
          subject: compose.subject,
          message: compose.message,
        }),
        sendWhatsApp(
          selectedMember.phone,
          `Hi ${selectedMember.first_name},\n\n${compose.message}\n\n— Eternal Love Church`,
        ),
      ])
      toast.success(response?.message || 'Follow-up email processed')
      await Promise.all([loadHistory(selectedMember.id), loadPageData()])
    } catch (error) {
      toast.error(error.message || 'Failed to send follow-up email')
    } finally {
      setSending(false)
    }
  }

  const filteredMembers = useMemo(() => members, [members])

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
            <h1 className="text-3xl font-black tracking-tighter text-warm-charcoal">FOLLOW-UP CENTER</h1>
            <p className="mt-2 text-sm text-warm-muted">View every email sent for a member and send a warm, personal follow-up.</p>
          </div>
          <div className="flex gap-2 shrink-0">
            <button
              onClick={() => loadPageData()}
              className="inline-flex items-center gap-2 rounded-xl border border-warm-charcoal/[0.07] bg-white px-4 py-2.5 text-xs font-semibold text-warm-muted transition hover:text-warm-charcoal shadow-sm"
            >
              <ShieldCheck size={14} />
              Refresh
            </button>
            <button
              onClick={() => navigate('/pastoral-care')}
              className="inline-flex items-center gap-2 rounded-xl border border-warm-charcoal/[0.07] bg-white px-4 py-2.5 text-xs font-semibold text-warm-muted transition hover:text-warm-charcoal shadow-sm"
            >
              <ArrowLeft size={14} />
              Pastoral Care
            </button>
          </div>
        </div>

        <DashboardStatGrid
          stats={[
            { label: 'Members in Scope', value: overview.total_members || 0, icon: Users },
            { label: 'Flagged Members', value: overview.flagged_members || 0, icon: AlertTriangle },
            { label: 'Emails Sent Today', value: overview.emails_sent_today || 0, icon: Mail },
            { label: 'Queued Emails', value: overview.queued_emails || 0, icon: Clock3 },
          ]}
        />

        <div className="grid grid-cols-1 xl:grid-cols-[0.95fr,1.05fr] gap-6">
          {/* Member List */}
          <DashboardPanel title="Members Needing Follow-up" icon={Users}>
            <div className="space-y-4">
              <div className="relative">
                <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-warm-muted" />
                <input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search by name, email, or cell"
                  className="w-full pl-9 pr-4 py-3 rounded-xl border border-warm-charcoal/[0.1] bg-warm-ivory text-sm text-warm-charcoal placeholder-warm-muted focus:border-warm-gold/40 focus:outline-none focus:bg-white"
                />
              </div>

              <div className="space-y-2 max-h-[520px] overflow-y-auto pr-1">
                {filteredMembers.map((member) => {
                  const isSelected = String(selectedMemberId) === String(member.id)
                  return (
                    <button
                      key={member.id}
                      onClick={() => handleSelectMember(member)}
                      className={`w-full text-left rounded-2xl border p-4 transition-all ${
                        isSelected
                          ? 'border-warm-gold/20 bg-warm-gold/[0.04]'
                          : 'border-warm-charcoal/[0.07] bg-white hover:border-warm-charcoal/[0.12] hover:bg-warm-ivory'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="text-sm font-semibold text-warm-espresso">{member.name || 'Unnamed member'}</p>
                          <p className="text-xs text-warm-muted mt-0.5">{member.email || 'No email address on file'}</p>
                          <p className="text-[11px] text-warm-muted mt-1">
                            {member.cell_name || 'No cell'}{member.zone_name ? ` · ${member.zone_name}` : ''}
                          </p>
                        </div>
                        <div className="flex flex-col items-end gap-1.5 shrink-0">
                          {member.open_flags ? (
                            <span className="rounded-full px-2 py-0.5 text-[9px] font-bold tracking-[0.12em] text-red-700 bg-red-500/10">
                              {member.open_flags} FLAG{member.open_flags > 1 ? 'S' : ''}
                            </span>
                          ) : null}
                          {member.last_email_status ? (
                            <span className={`rounded-full px-2 py-0.5 text-[9px] font-bold tracking-[0.12em] ${statusStyles[member.last_email_status] || 'text-warm-muted bg-warm-charcoal/[0.05]'}`}>
                              {member.last_email_status.toUpperCase()}
                            </span>
                          ) : null}
                        </div>
                      </div>
                      <div className="mt-2.5 flex flex-wrap gap-1.5">
                        {[
                          `Sun misses: ${member.consecutive_sunday_misses || 0}`,
                          `Cell misses: ${member.consecutive_cell_misses || 0}`,
                          `Emails: ${member.total_emails || 0}`,
                        ].map((tag) => (
                          <span key={tag} className="rounded-full px-2 py-0.5 text-[10px] text-warm-muted bg-warm-charcoal/[0.04] border border-warm-charcoal/[0.06]">{tag}</span>
                        ))}
                      </div>
                    </button>
                  )
                })}
                {!filteredMembers.length && (
                  <p className="text-sm text-warm-muted py-2">No members matched your search.</p>
                )}
              </div>
            </div>
          </DashboardPanel>

          <div className="space-y-6">
            {/* Compose */}
            <DashboardPanel title="Send Follow-up Email" icon={Send}>
              {selectedMember ? (
                <form onSubmit={handleSendEmail} className="space-y-4">
                  <div className="rounded-xl border border-warm-charcoal/[0.07] bg-warm-ivory p-4">
                    <p className="text-[10px] font-semibold uppercase tracking-[0.15em] text-warm-muted">Selected member</p>
                    <p className="mt-2 text-sm font-semibold text-warm-espresso">{selectedMember.name}</p>
                    <p className="text-xs text-warm-muted">{selectedMember.email || 'No email available'}</p>
                    <p className="text-[11px] text-warm-muted mt-1">
                      {selectedMember.cell_name || 'No cell'}{selectedMember.zone_name ? ` · ${selectedMember.zone_name}` : ''}
                    </p>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                    {[
                      ['welcome_back', 'Warm invite'],
                      ['prayer_support', 'Prayer support'],
                      ['meeting_invite', 'Pastor meeting'],
                    ].map(([key, label]) => (
                      <button
                        key={key}
                        type="button"
                        onClick={() => applyTemplate(key)}
                        className="rounded-xl border border-warm-charcoal/[0.07] bg-white px-3 py-2 text-xs text-warm-muted transition hover:border-warm-charcoal/[0.12] hover:text-warm-charcoal"
                      >
                        {label}
                      </button>
                    ))}
                  </div>

                  <div>
                    <label className={labelCls}>Subject</label>
                    <input
                      value={compose.subject}
                      onChange={(e) => setCompose((c) => ({ ...c, subject: e.target.value }))}
                      className={inputCls}
                      placeholder="Email subject"
                    />
                  </div>

                  <div>
                    <label className={labelCls}>Message</label>
                    <textarea
                      value={compose.message}
                      onChange={(e) => setCompose((c) => ({ ...c, message: e.target.value }))}
                      rows={9}
                      className={`${inputCls} resize-none`}
                      placeholder="Write a warm follow-up message..."
                    />
                  </div>

                  <div className="flex items-center justify-between gap-3 flex-wrap">
                    <p className="text-[11px] text-warm-muted">If SMTP is unavailable, the message will be queued and logged for retry.</p>
                    <button
                      type="submit"
                      disabled={sending}
                      className="inline-flex items-center gap-2 rounded-xl bg-warm-gold px-5 py-2.5 text-xs font-bold tracking-[0.18em] text-warm-espresso transition hover:opacity-90 disabled:opacity-50"
                    >
                      <Send size={13} />
                      {sending ? 'SENDING...' : 'SEND EMAIL'}
                    </button>
                  </div>
                </form>
              ) : (
                <p className="text-sm text-warm-muted">Select a member to start a follow-up email.</p>
              )}
            </DashboardPanel>

            {/* History */}
            <DashboardPanel title="Email History" icon={Mail}>
              {historyLoading ? (
                <div className="py-8 flex justify-center">
                  <div className="h-5 w-5 animate-spin rounded-full border-2 border-warm-charcoal/10 border-t-warm-gold" />
                </div>
              ) : selectedMember ? (
                <div className="space-y-3">
                  {history.map((entry) => (
                    <div key={entry.id} className="rounded-xl border border-warm-charcoal/[0.07] bg-warm-ivory p-4">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="text-sm font-semibold text-warm-espresso">{entry.subject}</p>
                          <p className="text-[11px] text-warm-muted mt-1">
                            {entry.recipient_type || 'member'} · {entry.source || 'manual'} · {formatDateTime(entry.sent_at || entry.created_at)}
                          </p>
                        </div>
                        <span className={`rounded-full px-2 py-0.5 text-[9px] font-bold tracking-[0.12em] shrink-0 ${statusStyles[entry.status] || 'text-warm-muted bg-warm-charcoal/[0.05]'}`}>
                          {(entry.status || 'sent').toUpperCase()}
                        </span>
                      </div>
                      {entry.error_message && (
                        <p className="mt-2 text-xs text-red-600">{entry.error_message}</p>
                      )}
                    </div>
                  ))}
                  {!history.length && (
                    <p className="text-sm text-warm-muted">No emails have been logged for this member yet.</p>
                  )}
                  {historyMeta && (
                    <p className="text-[11px] text-warm-muted">Showing {history.length} of {historyMeta.total || 0} email(s)</p>
                  )}
                </div>
              ) : (
                <p className="text-sm text-warm-muted">Pick a member to view their email history.</p>
              )}
            </DashboardPanel>
          </div>
        </div>
      </div>
    </DashboardShell>
  )
}
