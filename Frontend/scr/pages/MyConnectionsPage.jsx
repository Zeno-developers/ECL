import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { familyAPI, spiritualLineageAPI, disciplesAPI, membersAPI } from '../utils/api'
import { toast } from 'react-toastify'
import { Heart, GitBranch, BookOpen, ChevronRight, Users, X, Check, Clock } from 'lucide-react'
import DashboardShell from '../components/dashboard/DashboardShell'

function Avatar({ name, picture, size = 'md' }) {
  const initials = name?.split(' ').map(w => w[0]).slice(0, 2).join('') || '?'
  const sz = size === 'sm' ? 'w-8 h-8 text-[10px]' : size === 'lg' ? 'w-14 h-14 text-sm' : 'w-10 h-10 text-xs'
  return picture
    ? <img src={picture} alt={name} className={`${sz} rounded-full object-cover border-2 border-warm-gold/20 shrink-0`} />
    : <div className={`${sz} rounded-full bg-warm-gold/10 border-2 border-warm-gold/20 flex items-center justify-center font-bold text-warm-gold shrink-0`}>{initials}</div>
}

function SectionHeader({ icon: Icon, label }) {
  return (
    <div className="flex items-center gap-2 mb-4">
      <Icon size={13} className="text-warm-gold/70" />
      <p className="text-[9px] font-bold tracking-[0.2em] text-warm-gold/70">{label}</p>
    </div>
  )
}

function PersonPill({ person }) {
  const name = person.first_name
    ? `${person.first_name} ${person.last_name}`
    : person.name || 'Unknown'
  return (
    <div className="flex items-center gap-2.5 rounded-xl border border-warm-charcoal/[0.06] bg-warm-ivory px-3 py-2">
      <Avatar name={name} picture={person.profile_picture} size="sm" />
      <span className="text-sm text-warm-espresso">{name}</span>
    </div>
  )
}

function FamilySection({ family }) {
  if (!family) return (
    <div className="rounded-2xl border border-warm-charcoal/[0.07] bg-white p-5 shadow-sm">
      <SectionHeader icon={Heart} label="MY FAMILY" />
      <p className="text-sm text-warm-muted">No family connections recorded yet.</p>
    </div>
  )

  const { spouse, parents, children, siblings } = family
  const hasAny = spouse || parents?.length || children?.length || siblings?.length

  return (
    <div className="rounded-2xl border border-warm-charcoal/[0.07] bg-white p-5 shadow-sm">
      <SectionHeader icon={Heart} label="MY FAMILY" />
      {!hasAny && <p className="text-sm text-warm-muted">No family connections recorded yet.</p>}
      <div className="space-y-4">
        {spouse && (
          <div>
            <p className="text-[10px] font-semibold text-warm-muted uppercase tracking-wider mb-2">Spouse</p>
            <PersonPill person={spouse} />
          </div>
        )}
        {parents?.length > 0 && (
          <div>
            <p className="text-[10px] font-semibold text-warm-muted uppercase tracking-wider mb-2">Parents</p>
            <div className="space-y-1.5">
              {parents.map(p => <PersonPill key={p.id} person={p} />)}
            </div>
          </div>
        )}
        {children?.length > 0 && (
          <div>
            <p className="text-[10px] font-semibold text-warm-muted uppercase tracking-wider mb-2">Children</p>
            <div className="space-y-1.5">
              {children.map(c => <PersonPill key={c.id} person={c} />)}
            </div>
          </div>
        )}
        {siblings?.length > 0 && (
          <div>
            <p className="text-[10px] font-semibold text-warm-muted uppercase tracking-wider mb-2">Siblings</p>
            <div className="space-y-1.5">
              {siblings.map(s => <PersonPill key={s.id} person={s} />)}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

function LineageSection({ lineage, path, pendingClaim, onClaim, allMembers }) {
  const [claimOpen, setClaimOpen] = useState(false)
  const [searchQ, setSearchQ] = useState('')
  const [claiming, setClaiming] = useState(false)
  const [note, setNote] = useState('')
  const [selected, setSelected] = useState(null)

  const filtered = allMembers.filter(m =>
    `${m.first_name} ${m.last_name}`.toLowerCase().includes(searchQ.toLowerCase())
  )

  const handleClaim = async () => {
    if (!selected) return toast.error('Select who brought you to faith')
    try {
      setClaiming(true)
      await spiritualLineageAPI.claimSpiritualParent({ claimed_parent_id: selected.user_id || selected.id, note })
      toast.success('Claim submitted — awaiting admin review')
      setClaimOpen(false)
      onClaim()
    } catch (e) {
      toast.error(e.message || 'Failed to submit claim')
    } finally {
      setClaiming(false)
    }
  }

  const inputCls = 'w-full rounded-xl border border-warm-charcoal/[0.1] bg-warm-ivory px-4 py-2.5 text-sm text-warm-charcoal placeholder-warm-muted focus:border-warm-gold/40 focus:outline-none'

  return (
    <div className="rounded-2xl border border-warm-charcoal/[0.07] bg-white p-5 shadow-sm">
      <SectionHeader icon={GitBranch} label="MY SPIRITUAL LINEAGE" />

      {/* Ancestor path breadcrumb */}
      {path.length > 0 && (
        <div className="mb-5">
          <p className="text-[10px] font-semibold text-warm-muted uppercase tracking-wider mb-2">Faith journey path</p>
          <div className="flex flex-wrap items-center gap-1.5">
            {path.map((node, i) => (
              <div key={node.id} className="flex items-center gap-1.5">
                <div className={`flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 border ${i === path.length - 1 ? 'border-warm-gold/30 bg-warm-gold/[0.06]' : 'border-warm-charcoal/[0.06] bg-warm-ivory'}`}>
                  <Avatar name={node.name} picture={node.profile_picture} size="sm" />
                  <span className={`text-xs font-semibold ${i === path.length - 1 ? 'text-warm-gold' : 'text-warm-espresso'}`}>{node.name}</span>
                </div>
                {i < path.length - 1 && <ChevronRight size={12} className="text-warm-muted shrink-0" />}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Stats row */}
      {lineage && (
        <div className="grid grid-cols-3 gap-3 mb-5">
          {[
            { label: 'Generation', value: lineage.generation },
            { label: 'Direct Disciples', value: lineage.direct_disciples?.length || 0 },
            { label: 'Total Descendants', value: lineage.total_descendants },
          ].map(({ label, value }) => (
            <div key={label} className="rounded-xl border border-warm-charcoal/[0.06] bg-warm-ivory p-3 text-center">
              <p className="text-xl font-black tracking-tighter text-warm-charcoal">{value}</p>
              <p className="text-[10px] text-warm-muted mt-0.5">{label}</p>
            </div>
          ))}
        </div>
      )}

      {/* Spiritual parent */}
      {lineage?.spiritual_parent ? (
        <div className="mb-4">
          <p className="text-[10px] font-semibold text-warm-muted uppercase tracking-wider mb-2">Brought to faith by</p>
          <PersonPill person={lineage.spiritual_parent} />
        </div>
      ) : (
        <div>
          <p className="text-sm text-warm-muted mb-3">No spiritual parent recorded yet.</p>
          {/* Pending claim status */}
          {pendingClaim ? (
            <div className={`flex items-start gap-3 rounded-xl border p-3 ${pendingClaim.status === 'pending' ? 'border-amber-200 bg-amber-50' : pendingClaim.status === 'approved' ? 'border-emerald-200 bg-emerald-50' : 'border-red-200 bg-red-50'}`}>
              {pendingClaim.status === 'pending' && <Clock size={15} className="text-amber-600 shrink-0 mt-0.5" />}
              {pendingClaim.status === 'approved' && <Check size={15} className="text-emerald-600 shrink-0 mt-0.5" />}
              {pendingClaim.status === 'rejected' && <X size={15} className="text-red-500 shrink-0 mt-0.5" />}
              <div>
                <p className="text-xs font-semibold text-warm-espresso">
                  {pendingClaim.status === 'pending' && 'Claim pending review'}
                  {pendingClaim.status === 'approved' && 'Claim approved'}
                  {pendingClaim.status === 'rejected' && 'Claim rejected'}
                </p>
                <p className="text-xs text-warm-muted mt-0.5">
                  You claimed <span className="font-semibold">{pendingClaim.claimed_parent?.name}</span> as your spiritual parent.
                </p>
              </div>
            </div>
          ) : (
            <button onClick={() => setClaimOpen(true)}
              className="inline-flex items-center gap-2 rounded-xl border border-warm-gold/30 bg-warm-gold/[0.06] px-4 py-2.5 text-xs font-bold tracking-[0.1em] text-warm-gold transition hover:bg-warm-gold/[0.1]">
              <GitBranch size={13} />
              CLAIM MY SPIRITUAL PARENT
            </button>
          )}
        </div>
      )}

      {/* Direct disciples */}
      {lineage?.direct_disciples?.length > 0 && (
        <div className="mt-4 pt-4 border-t border-warm-charcoal/[0.06]">
          <p className="text-[10px] font-semibold text-warm-muted uppercase tracking-wider mb-2">
            My disciples ({lineage.direct_disciples.length})
          </p>
          <div className="space-y-1.5">
            {lineage.direct_disciples.map(d => <PersonPill key={d.id} person={d} />)}
          </div>
        </div>
      )}

      {/* Claim modal */}
      {claimOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
          <div className="w-full max-w-md rounded-2xl border border-warm-charcoal/[0.08] bg-white p-6 shadow-xl">
            <div className="flex items-center justify-between mb-5">
              <p className="text-sm font-bold text-warm-espresso">Who brought you to faith?</p>
              <button onClick={() => setClaimOpen(false)}><X size={16} className="text-warm-muted" /></button>
            </div>
            <p className="text-xs text-warm-muted mb-4">Select the person who led you to Christ or mentored you into faith. An admin will review and confirm.</p>
            <input value={searchQ} onChange={e => setSearchQ(e.target.value)} placeholder="Search member…" autoFocus className={inputCls} />
            <div className="mt-2 space-y-1 max-h-52 overflow-y-auto">
              {filtered.slice(0, 10).map(m => (
                <button key={m.user_id || m.id} onClick={() => setSelected(m)}
                  className={`w-full flex items-center gap-2.5 rounded-xl border px-3 py-2 text-left transition ${selected?.user_id === m.user_id ? 'border-warm-gold/30 bg-warm-gold/[0.06]' : 'border-warm-charcoal/[0.06] hover:bg-warm-ivory'}`}>
                  <Avatar name={`${m.first_name} ${m.last_name}`} picture={m.profile_picture} size="sm" />
                  <span className="text-sm text-warm-espresso">{m.first_name} {m.last_name}</span>
                  {selected?.id === m.id && <Check size={13} className="text-warm-gold ml-auto" />}
                </button>
              ))}
            </div>
            <textarea value={note} onChange={e => setNote(e.target.value)}
              placeholder="Add a note (optional) — context helps the admin confirm…"
              rows={2} className={`${inputCls} resize-none mt-3`} />
            <button onClick={handleClaim} disabled={claiming || !selected}
              className="mt-3 w-full rounded-xl bg-warm-gold py-2.5 text-xs font-bold tracking-[0.12em] text-warm-espresso transition hover:opacity-90 disabled:opacity-50">
              {claiming ? 'Submitting…' : 'SUBMIT CLAIM'}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

function DisciplesSection({ groups, navigate }) {
  if (!groups.length) return (
    <div className="rounded-2xl border border-warm-charcoal/[0.07] bg-white p-5 shadow-sm">
      <SectionHeader icon={BookOpen} label="MY DISCIPLES GROUPS" />
      <p className="text-sm text-warm-muted">You are not in any disciples group yet.</p>
    </div>
  )
  return (
    <div className="rounded-2xl border border-warm-charcoal/[0.07] bg-white p-5 shadow-sm">
      <SectionHeader icon={BookOpen} label="MY DISCIPLES GROUPS" />
      <div className="space-y-2">
        {groups.map(g => (
          <button key={g.id} onClick={() => navigate(`/disciples/${g.id}`)}
            className="w-full flex items-center gap-3 rounded-xl border border-warm-charcoal/[0.06] bg-warm-ivory px-4 py-3 text-left hover:border-warm-gold/20 hover:bg-white transition">
            <div className="w-8 h-8 rounded-lg bg-warm-gold/[0.08] border border-warm-gold/15 flex items-center justify-center shrink-0">
              <BookOpen size={14} className="text-warm-gold" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-warm-espresso truncate">{g.name}</p>
              <p className="text-xs text-warm-muted">{g.member_count} members · {g.my_role}</p>
            </div>
            <ChevronRight size={14} className="text-warm-muted shrink-0" />
          </button>
        ))}
      </div>
    </div>
  )
}

export default function MyConnectionsPage() {
  const { user } = useAuth()
  const navigate  = useNavigate()
  const [family,   setFamily]   = useState(null)
  const [lineage,  setLineage]  = useState(null)
  const [path,     setPath]     = useState([])
  const [groups,   setGroups]   = useState([])
  const [claim,    setClaim]    = useState(null)
  const [members,  setMembers]  = useState([])
  const [loading,  setLoading]  = useState(true)

  const load = () => {
    Promise.all([
      familyAPI.getMyFamily(),
      spiritualLineageAPI.getMyLineage(),
      spiritualLineageAPI.getAncestorPath(user.id),
      disciplesAPI.listGroups(),
      spiritualLineageAPI.getMyClaim(),
      membersAPI.getAll({ limit: 500 }),
    ]).then(([fRes, lRes, pRes, gRes, cRes, mRes]) => {
      setFamily(fRes?.data || null)
      setLineage(lRes?.data || null)
      setPath(pRes?.data || [])
      setGroups(gRes?.data || [])
      setClaim(cRes?.data || null)
      setMembers(mRes?.data?.members || mRes?.data || [])
    }).catch(() => {}).finally(() => setLoading(false))
  }

  useEffect(() => { load() }, [])

  if (loading) return (
    <DashboardShell>
      <div className="flex h-full items-center justify-center py-32">
        <div className="h-5 w-5 animate-spin rounded-full border-2 border-warm-charcoal/10 border-t-warm-gold" />
      </div>
    </DashboardShell>
  )

  // Filter out self from members list for claiming (members.user_id = users.id)
  const otherMembers = members.filter(m => (m.user_id || m.id) !== user?.id)

  return (
    <DashboardShell>
      <div className="mx-auto max-w-4xl px-5 sm:px-8 py-8 space-y-6">
        <div className="border-b border-warm-charcoal/[0.07] pb-8">
          <h1 className="text-3xl font-black tracking-tighter text-warm-charcoal">MY CONNECTIONS</h1>
          <p className="mt-2 text-sm text-warm-muted">Your family, spiritual lineage, and disciples groups in one place.</p>
        </div>

        <div className="grid gap-5 lg:grid-cols-2">
          <FamilySection family={family} />
          <DisciplesSection groups={groups} navigate={navigate} />
        </div>

        <LineageSection
          lineage={lineage}
          path={path}
          pendingClaim={claim}
          onClaim={load}
          allMembers={otherMembers}
        />
      </div>
    </DashboardShell>
  )
}
