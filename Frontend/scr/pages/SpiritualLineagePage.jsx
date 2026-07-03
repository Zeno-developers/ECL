import { useEffect, useState } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { spiritualLineageAPI, membersAPI } from '../utils/api'
import { toast } from 'react-toastify'
import { GitBranch, Users, X, Star, TrendingUp, ChevronRight, Check, Clock } from 'lucide-react'
import DashboardShell from '../components/dashboard/DashboardShell'

const canManage = (role) => ['admin', 'pastor', 'superadmin', 'elder'].includes(role)

function Avatar({ name, picture, size = 'md' }) {
  const initials = name?.split(' ').map(w => w[0]).slice(0, 2).join('') || '?'
  const sz = size === 'sm' ? 'w-8 h-8 text-[10px]' : size === 'lg' ? 'w-14 h-14 text-sm' : 'w-10 h-10 text-xs'
  return picture
    ? <img src={picture} alt={name} className={`${sz} rounded-full object-cover border-2 border-warm-gold/20 shrink-0`} />
    : <div className={`${sz} rounded-full bg-warm-gold/10 border-2 border-warm-gold/20 flex items-center justify-center font-bold text-warm-gold shrink-0`}>{initials}</div>
}

function TreeNode({ node, depth = 0 }) {
  const [open, setOpen] = useState(depth < 2)
  const hasChildren = node.disciples?.length > 0
  const indent = depth * 20
  return (
    <div style={{ marginLeft: depth > 0 ? indent : 0 }}>
      <div className={`flex items-center gap-2.5 rounded-xl border px-3 py-2.5 mb-1 transition ${depth === 0 ? 'border-warm-gold/20 bg-warm-gold/[0.04]' : 'border-warm-charcoal/[0.07] bg-white hover:bg-warm-ivory'}`}>
        {hasChildren ? (
          <button onClick={() => setOpen(o => !o)} className="text-warm-muted hover:text-warm-charcoal shrink-0">
            <svg className={`w-3 h-3 transition-transform ${open ? 'rotate-90' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7"/></svg>
          </button>
        ) : <div className="w-3 shrink-0" />}
        <Avatar name={node.name} picture={node.profile_picture} size="sm" />
        <span className="text-sm text-warm-espresso flex-1">{node.name}</span>
        {node.disciple_count > 0 && (
          <span className="text-[9px] font-bold tracking-wide text-warm-gold bg-warm-gold/[0.08] border border-warm-gold/20 px-1.5 py-0.5 rounded-full">
            {node.disciple_count} disciples
          </span>
        )}
      </div>
      {open && hasChildren && (
        <div className="border-l-2 border-warm-gold/[0.12] ml-4 pl-2">
          {node.disciples.map(child => <TreeNode key={child.id} node={child} depth={depth + 1} />)}
        </div>
      )}
    </div>
  )
}

function Modal({ title, onClose, children }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
      <div className="w-full max-w-md rounded-2xl border border-warm-charcoal/[0.08] bg-white p-6 shadow-xl">
        <div className="flex items-center justify-between mb-5">
          <p className="text-sm font-bold text-warm-espresso">{title}</p>
          <button onClick={onClose} className="text-warm-muted hover:text-warm-charcoal"><X size={16} /></button>
        </div>
        {children}
      </div>
    </div>
  )
}

function AncestorPath({ path }) {
  if (!path.length) return null
  return (
    <div className="mb-5 p-4 rounded-xl bg-warm-ivory border border-warm-charcoal/[0.06]">
      <p className="text-[10px] font-semibold text-warm-muted uppercase tracking-wider mb-2.5">Faith journey path</p>
      <div className="flex flex-wrap items-center gap-1.5">
        {path.map((node, i) => (
          <div key={node.id} className="flex items-center gap-1.5">
            <div className={`flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 border ${i === path.length - 1 ? 'border-warm-gold/30 bg-warm-gold/[0.06]' : 'border-warm-charcoal/[0.06] bg-white'}`}>
              <Avatar name={node.name} picture={node.profile_picture} size="sm" />
              <span className={`text-xs font-semibold ${i === path.length - 1 ? 'text-warm-gold' : 'text-warm-espresso'}`}>{node.name}</span>
            </div>
            {i < path.length - 1 && <ChevronRight size={12} className="text-warm-muted shrink-0" />}
          </div>
        ))}
      </div>
    </div>
  )
}

function RequestsTab() {
  const [requests, setRequests]   = useState([])
  const [loading, setLoading]     = useState(true)
  const [reviewing, setReviewing] = useState(null)

  useEffect(() => {
    spiritualLineageAPI.listClaims('pending')
      .then(r => setRequests(r?.data || []))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  const handleReview = async (id, action) => {
    try {
      setReviewing(id)
      await spiritualLineageAPI.reviewClaim(id, action)
      toast.success(action === 'approve' ? 'Claim approved and lineage updated' : 'Claim rejected')
      setRequests(prev => prev.filter(r => r.id !== id))
    } catch (e) {
      toast.error(e.message || 'Failed to review claim')
    } finally {
      setReviewing(null)
    }
  }

  if (loading) return (
    <div className="flex items-center justify-center py-16">
      <div className="h-5 w-5 animate-spin rounded-full border-2 border-warm-charcoal/10 border-t-warm-gold" />
    </div>
  )

  if (!requests.length) return (
    <div className="flex flex-col items-center justify-center py-20 text-warm-muted">
      <Check size={32} className="mb-3 text-emerald-400" />
      <p className="text-sm">No pending claims to review.</p>
    </div>
  )

  return (
    <div className="space-y-3">
      {requests.map(req => (
        <div key={req.id} className="rounded-2xl border border-warm-charcoal/[0.07] bg-white p-5 shadow-sm">
          <div className="flex flex-col sm:flex-row sm:items-start gap-4">
            <div className="flex-1 space-y-3">
              <div className="flex items-center gap-3">
                <div>
                  <p className="text-[9px] font-bold tracking-[0.15em] text-warm-muted mb-1">MEMBER CLAIMING</p>
                  <div className="flex items-center gap-2">
                    <Avatar name={req.requester.name} picture={req.requester.profile_picture} size="sm" />
                    <span className="text-sm font-semibold text-warm-espresso">{req.requester.name}</span>
                  </div>
                </div>
                <ChevronRight size={14} className="text-warm-muted shrink-0" />
                <div>
                  <p className="text-[9px] font-bold tracking-[0.15em] text-warm-muted mb-1">CLAIMED PARENT</p>
                  <div className="flex items-center gap-2">
                    <Avatar name={req.claimed_parent.name} picture={req.claimed_parent.profile_picture} size="sm" />
                    <span className="text-sm font-semibold text-warm-espresso">{req.claimed_parent.name}</span>
                  </div>
                </div>
              </div>
              {req.note && (
                <p className="text-xs text-warm-muted italic bg-warm-ivory rounded-lg px-3 py-2 border border-warm-charcoal/[0.06]">
                  "{req.note}"
                </p>
              )}
              <p className="text-[10px] text-warm-muted">
                <Clock size={10} className="inline mr-1" />
                Submitted {new Date(req.created_at).toLocaleDateString()}
              </p>
            </div>
            <div className="flex gap-2 sm:flex-col shrink-0">
              <button onClick={() => handleReview(req.id, 'approve')} disabled={reviewing === req.id}
                className="flex-1 sm:flex-none rounded-xl bg-emerald-500 px-4 py-2 text-xs font-bold text-white hover:bg-emerald-600 transition disabled:opacity-50">
                Approve
              </button>
              <button onClick={() => handleReview(req.id, 'reject')} disabled={reviewing === req.id}
                className="flex-1 sm:flex-none rounded-xl border border-red-200 bg-red-50 px-4 py-2 text-xs font-bold text-red-600 hover:bg-red-100 transition disabled:opacity-50">
                Reject
              </button>
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}

export default function SpiritualLineagePage() {
  const { user }    = useAuth()
  const isManager   = canManage(user?.role)
  const [tree, setTree]           = useState([])
  const [allMembers, setAllMembers] = useState([])
  const [selectedId, setSelectedId] = useState(null)
  const [lineage, setLineage]     = useState(null)
  const [path, setPath]           = useState([])
  const [memberQ, setMemberQ]     = useState('')
  const [searchQ, setSearchQ]     = useState('')
  const [loading, setLoading]     = useState(true)
  const [modal, setModal]         = useState(false)
  const [pendingCount, setPendingCount] = useState(0)
  const [tab, setTab] = useState('tree')

  useEffect(() => {
    const promises = [
      spiritualLineageAPI.getFullTree(),
      membersAPI.getAll({ limit: 500 }),
    ]
    if (isManager) promises.push(spiritualLineageAPI.listClaims('pending'))

    Promise.all(promises).then(([treeRes, membersRes, claimsRes]) => {
      setTree(treeRes?.data || [])
      setAllMembers(membersRes?.data?.members || membersRes?.data || [])
      if (claimsRes) setPendingCount((claimsRes?.data || []).length)
    }).catch(() => {}).finally(() => setLoading(false))
  }, [])

  const loadMemberLineage = async (id) => {
    try {
      const [lineageRes, pathRes] = await Promise.all([
        spiritualLineageAPI.getMemberLineage(id),
        spiritualLineageAPI.getAncestorPath(id),
      ])
      setLineage(lineageRes?.data || null)
      setPath(pathRes?.data || [])
      setSelectedId(id)
    } catch (e) {
      toast.error(e.message || 'Failed to load lineage')
    }
  }

  const handleSetParent = async (target) => {
    try {
      await spiritualLineageAPI.setSpiritualParent(selectedId, target?.id || null)
      toast.success('Spiritual parent updated')
      setModal(false)
      loadMemberLineage(selectedId)
      spiritualLineageAPI.getFullTree().then(r => setTree(r?.data || []))
    } catch (e) { toast.error(e.message) }
  }

  const handleClearParent = async () => {
    try {
      await spiritualLineageAPI.setSpiritualParent(selectedId, null)
      toast.success('Spiritual parent cleared')
      loadMemberLineage(selectedId)
      spiritualLineageAPI.getFullTree().then(r => setTree(r?.data || []))
    } catch (e) { toast.error(e.message) }
  }

  const filteredMembers = allMembers.filter(m =>
    `${m.first_name} ${m.last_name}`.toLowerCase().includes(memberQ.toLowerCase())
  )
  const searchFiltered = allMembers.filter(m =>
    `${m.first_name} ${m.last_name}`.toLowerCase().includes(searchQ.toLowerCase())
  )

  const tabs = [
    { id: 'tree',   label: 'Full Church Tree' },
    { id: 'member', label: 'Member Lookup' },
    ...(isManager ? [{ id: 'requests', label: `Pending Claims${pendingCount ? ` (${pendingCount})` : ''}` }] : []),
  ]

  if (loading) return (
    <DashboardShell>
      <div className="flex h-full items-center justify-center py-32">
        <div className="h-5 w-5 animate-spin rounded-full border-2 border-warm-charcoal/10 border-t-warm-gold" />
      </div>
    </DashboardShell>
  )

  return (
    <DashboardShell>
      <div className="mx-auto max-w-6xl px-5 sm:px-8 py-8 space-y-6">
        <div className="border-b border-warm-charcoal/[0.07] pb-8">
          <h1 className="text-3xl font-black tracking-tighter text-warm-charcoal">SPIRITUAL LINEAGE</h1>
          <p className="mt-2 text-sm text-warm-muted">Who brought whom to faith — the discipleship chain across generations.</p>
        </div>

        <div className="flex gap-1 rounded-xl border border-warm-charcoal/[0.07] bg-warm-ivory p-1 w-fit flex-wrap">
          {tabs.map(t => (
            <button key={t.id} onClick={() => setTab(t.id)}
              className={`rounded-lg px-4 py-2 text-xs font-semibold transition whitespace-nowrap ${tab === t.id ? 'bg-white shadow-sm text-warm-espresso' : 'text-warm-muted hover:text-warm-charcoal'}`}>
              {t.label}
            </button>
          ))}
        </div>

        {tab === 'tree' && (
          <div className="rounded-2xl border border-warm-charcoal/[0.07] bg-white p-5 shadow-sm">
            <div className="flex items-center gap-2 mb-5">
              <GitBranch size={13} className="text-warm-gold/70" />
              <p className="text-[9px] font-bold tracking-[0.2em] text-warm-gold/70">DISCIPLESHIP TREE</p>
            </div>
            {tree.length === 0
              ? <p className="text-sm text-warm-muted text-center py-8">No spiritual lineage data yet.</p>
              : <div className="space-y-1 max-h-[60vh] overflow-y-auto pr-2">
                  {tree.map(root => <TreeNode key={root.id} node={root} depth={0} />)}
                </div>
            }
          </div>
        )}

        {tab === 'member' && (
          <div className="grid gap-6 lg:grid-cols-[300px_1fr]">
            <div className="rounded-2xl border border-warm-charcoal/[0.07] bg-white p-5 shadow-sm">
              <p className="text-[9px] font-bold tracking-[0.2em] text-warm-gold/70 mb-3">SELECT MEMBER</p>
              <input value={memberQ} onChange={e => setMemberQ(e.target.value)} placeholder="Search…"
                className="w-full rounded-xl border border-warm-charcoal/[0.1] bg-warm-ivory px-3 py-2 text-sm placeholder-warm-muted focus:border-warm-gold/40 focus:outline-none mb-3" />
              <div className="space-y-1 max-h-80 overflow-y-auto">
                {filteredMembers.slice(0, 30).map(m => (
                  <button key={m.user_id || m.id} onClick={() => loadMemberLineage(m.user_id || m.id)}
                    className={`w-full flex items-center gap-2.5 rounded-xl border px-3 py-2 text-left transition ${selectedId === (m.user_id || m.id) ? 'border-warm-gold/20 bg-warm-gold/[0.04]' : 'border-warm-charcoal/[0.06] hover:bg-warm-ivory'}`}>
                    <Avatar name={`${m.first_name} ${m.last_name}`} picture={m.profile_picture} size="sm" />
                    <p className="text-xs font-semibold text-warm-espresso">{m.first_name} {m.last_name}</p>
                  </button>
                ))}
              </div>
            </div>

            <div>
              {!lineage ? (
                <div className="flex flex-col items-center justify-center py-24 text-warm-muted">
                  <GitBranch size={36} className="mb-3 text-warm-gold/30" />
                  <p className="text-sm">Select a member to view their lineage</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {/* Ancestor path breadcrumb */}
                  <AncestorPath path={path} />

                  {/* Stats */}
                  <div className="grid grid-cols-3 gap-4">
                    {[
                      { label: 'Generation', value: lineage.generation, icon: Star },
                      { label: 'Direct Disciples', value: lineage.direct_disciples?.length || 0, icon: Users },
                      { label: 'Total Descendants', value: lineage.total_descendants, icon: TrendingUp },
                    ].map(({ label, value, icon: Icon }) => (
                      <div key={label} className="rounded-2xl border border-warm-charcoal/[0.07] bg-white p-4 shadow-sm text-center">
                        <Icon size={16} className="mx-auto mb-1 text-warm-gold" />
                        <p className="text-2xl font-black tracking-tighter text-warm-charcoal">{value}</p>
                        <p className="text-xs text-warm-muted mt-0.5">{label}</p>
                      </div>
                    ))}
                  </div>

                  {/* Spiritual parent */}
                  <div className="rounded-2xl border border-warm-charcoal/[0.07] bg-white p-5 shadow-sm">
                    <div className="flex items-center justify-between mb-4">
                      <p className="text-[9px] font-bold tracking-[0.2em] text-warm-gold/70">BROUGHT TO FAITH BY</p>
                      {isManager && (
                        <div className="flex gap-2">
                          <button onClick={() => setModal(true)} className="text-[10px] font-semibold text-warm-gold hover:underline">
                            {lineage.spiritual_parent ? 'Change' : 'Set parent'}
                          </button>
                          {lineage.spiritual_parent && (
                            <button onClick={handleClearParent} className="text-[10px] font-semibold text-red-500 hover:underline">Remove</button>
                          )}
                        </div>
                      )}
                    </div>
                    {lineage.spiritual_parent ? (
                      <div className="flex items-center gap-3">
                        <Avatar name={lineage.spiritual_parent.name} picture={lineage.spiritual_parent.profile_picture} size="lg" />
                        <div>
                          <p className="text-sm font-bold text-warm-espresso">{lineage.spiritual_parent.name}</p>
                          <p className="text-xs text-warm-muted">Spiritual parent</p>
                        </div>
                      </div>
                    ) : (
                      <p className="text-sm text-warm-muted">No spiritual parent recorded — root member.</p>
                    )}
                  </div>

                  {/* Direct disciples */}
                  <div className="rounded-2xl border border-warm-charcoal/[0.07] bg-white p-5 shadow-sm">
                    <p className="text-[9px] font-bold tracking-[0.2em] text-warm-gold/70 mb-4">DIRECT DISCIPLES ({lineage.direct_disciples?.length || 0})</p>
                    {lineage.direct_disciples?.length ? (
                      <div className="space-y-2">
                        {lineage.direct_disciples.map(d => (
                          <div key={d.id} className="flex items-center gap-2.5 rounded-xl bg-warm-ivory border border-warm-charcoal/[0.06] px-3 py-2">
                            <Avatar name={`${d.first_name} ${d.last_name}`} picture={d.profile_picture} size="sm" />
                            <span className="text-sm text-warm-espresso">{d.first_name} {d.last_name}</span>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-sm text-warm-muted">No direct disciples recorded yet.</p>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {tab === 'requests' && isManager && <RequestsTab />}
      </div>

      {modal && (
        <Modal title="Set Spiritual Parent" onClose={() => setModal(false)}>
          <input value={searchQ} onChange={e => setSearchQ(e.target.value)} autoFocus placeholder="Search member…"
            className="w-full rounded-xl border border-warm-charcoal/[0.1] bg-warm-ivory px-4 py-2.5 text-sm placeholder-warm-muted focus:border-warm-gold/40 focus:outline-none mb-2" />
          <div className="space-y-1 max-h-60 overflow-y-auto">
            {searchFiltered.filter(m => (m.user_id || m.id) !== selectedId).slice(0, 8).map(m => (
              <button key={m.user_id || m.id} onClick={() => handleSetParent({ ...m, id: m.user_id || m.id })}
                className="w-full flex items-center gap-2.5 rounded-xl border border-warm-charcoal/[0.06] bg-white px-3 py-2 text-left hover:bg-warm-ivory transition">
                <Avatar name={`${m.first_name} ${m.last_name}`} picture={m.profile_picture} size="sm" />
                <span className="text-sm text-warm-espresso">{m.first_name} {m.last_name}</span>
              </button>
            ))}
          </div>
        </Modal>
      )}
    </DashboardShell>
  )
}
