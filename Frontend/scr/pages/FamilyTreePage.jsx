import { useEffect, useState } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { familyAPI, membersAPI } from '../utils/api'
import { toast } from 'react-toastify'
import { Users, Heart, UserPlus, X, ChevronDown } from 'lucide-react'
import DashboardShell from '../components/dashboard/DashboardShell'

const canManage = (role) => ['admin', 'pastor', 'superadmin', 'elder'].includes(role)

function Avatar({ name, picture, size = 'md' }) {
  const initials = name?.split(' ').map(w => w[0]).slice(0, 2).join('') || '?'
  const sz = size === 'sm' ? 'w-8 h-8 text-[10px]' : 'w-11 h-11 text-xs'
  return picture
    ? <img src={picture} alt={name} className={`${sz} rounded-full object-cover border-2 border-warm-gold/20 shrink-0`} />
    : <div className={`${sz} rounded-full bg-warm-gold/10 border-2 border-warm-gold/20 flex items-center justify-center font-bold text-warm-gold shrink-0`}>{initials}</div>
}

function FamilyCard({ member, family, onLink, canEdit }) {
  return (
    <div className="rounded-2xl border border-warm-charcoal/[0.07] bg-white p-5 shadow-sm space-y-5">
      {/* Subject */}
      <div className="flex items-center gap-3 pb-4 border-b border-warm-charcoal/[0.06]">
        <Avatar name={member.first_name + ' ' + member.last_name} picture={member.profile_picture} />
        <div>
          <p className="text-sm font-bold text-warm-espresso">{member.first_name} {member.last_name}</p>
          <p className="text-[10px] text-warm-muted">Member profile</p>
        </div>
      </div>

      {/* Spouse */}
      <Section label="SPOUSE" icon={Heart}>
        {family.spouse ? (
          <PersonRow person={family.spouse} badge={family.spouse.status !== 'active' ? family.spouse.status : null} />
        ) : canEdit ? (
          <AddBtn label="Link spouse" onClick={() => onLink('spouse')} />
        ) : <Empty label="No spouse linked" />}
      </Section>

      {/* Parents */}
      <Section label="PARENTS" icon={Users}>
        {family.parents?.length ? family.parents.map(p => <PersonRow key={p.id} person={p} />) : null}
        {canEdit && <AddBtn label="Add parent" onClick={() => onLink('parent')} />}
        {!family.parents?.length && !canEdit && <Empty label="No parents linked" />}
      </Section>

      {/* Siblings */}
      {family.siblings?.length > 0 && (
        <Section label="SIBLINGS" icon={Users}>
          {family.siblings.map(s => <PersonRow key={s.id} person={s} />)}
        </Section>
      )}

      {/* Children */}
      <Section label="CHILDREN" icon={UserPlus}>
        {family.children?.length ? family.children.map(c => <PersonRow key={c.id} person={c} />) : null}
        {canEdit && <AddBtn label="Add child" onClick={() => onLink('child')} />}
        {!family.children?.length && !canEdit && <Empty label="No children linked" />}
      </Section>
    </div>
  )
}

function Section({ label, icon: Icon, children }) {
  return (
    <div>
      <div className="flex items-center gap-1.5 mb-2">
        <Icon size={11} className="text-warm-gold/60" />
        <p className="text-[9px] font-bold tracking-[0.2em] text-warm-gold/60">{label}</p>
      </div>
      <div className="space-y-1.5">{children}</div>
    </div>
  )
}

function PersonRow({ person, badge }) {
  const name = person.name || `${person.first_name || ''} ${person.last_name || ''}`.trim()
  return (
    <div className="flex items-center gap-2.5 rounded-xl bg-warm-ivory border border-warm-charcoal/[0.06] px-3 py-2">
      <Avatar name={name} picture={person.profile_picture} size="sm" />
      <span className="text-sm text-warm-espresso flex-1">{name}</span>
      {badge && <span className="text-[9px] font-bold tracking-wide text-warm-muted bg-warm-charcoal/[0.06] px-2 py-0.5 rounded-full">{badge}</span>}
    </div>
  )
}

function AddBtn({ label, onClick }) {
  return (
    <button onClick={onClick} className="flex items-center gap-1.5 text-xs text-warm-gold/70 hover:text-warm-gold transition py-1">
      <UserPlus size={12} />
      {label}
    </button>
  )
}

function Empty({ label }) {
  return <p className="text-xs text-warm-muted py-1">{label}</p>
}

function MemberSearch({ members, onSelect, placeholder = 'Search member…', exclude = [] }) {
  const [q, setQ] = useState('')
  const filtered = members.filter(m =>
    !exclude.includes(m.id) &&
    `${m.first_name} ${m.last_name}`.toLowerCase().includes(q.toLowerCase())
  ).slice(0, 8)

  return (
    <div>
      <input
        autoFocus
        value={q}
        onChange={e => setQ(e.target.value)}
        placeholder={placeholder}
        className="w-full rounded-xl border border-warm-charcoal/[0.1] bg-warm-ivory px-4 py-2.5 text-sm text-warm-charcoal placeholder-warm-muted focus:border-warm-gold/40 focus:outline-none mb-2"
      />
      <div className="space-y-1 max-h-52 overflow-y-auto">
        {filtered.map(m => (
          <button key={m.id} onClick={() => onSelect(m)}
            className="w-full flex items-center gap-2.5 rounded-xl border border-warm-charcoal/[0.06] bg-white px-3 py-2 text-left hover:bg-warm-ivory transition">
            <Avatar name={`${m.first_name} ${m.last_name}`} picture={m.profile_picture} size="sm" />
            <span className="text-sm text-warm-espresso">{m.first_name} {m.last_name}</span>
          </button>
        ))}
        {!filtered.length && <p className="text-xs text-warm-muted py-2 text-center">No members found</p>}
      </div>
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

export default function FamilyTreePage() {
  const { user } = useAuth()
  const isManager = canManage(user?.role)
  const [allMembers, setAllMembers] = useState([])
  const [selectedMemberId, setSelectedMemberId] = useState(null)
  const [family, setFamily] = useState(null)
  const [selectedMember, setSelectedMember] = useState(null)
  const [loading, setLoading] = useState(false)
  const [modal, setModal] = useState(null) // 'spouse' | 'parent' | 'child' | 'browse'
  const [memberQ, setMemberQ] = useState('')

  useEffect(() => {
    membersAPI.getAll().then(r => setAllMembers(r?.data?.members || r?.data || [])).catch(() => {})
  }, [])

  const loadFamily = async (id) => {
    try {
      setLoading(true)
      const res = await familyAPI.getMemberFamily(id)
      setFamily(res?.data || null)
      setSelectedMember(allMembers.find(m => m.id === id) || null)
    } catch (e) {
      toast.error(e.message || 'Failed to load family')
    } finally {
      setLoading(false)
    }
  }

  const handleLinkSpouse = async (target) => {
    try {
      await familyAPI.addMarriage({ member1_id: selectedMemberId, member2_id: target.id })
      toast.success('Spouse linked')
      setModal(null)
      loadFamily(selectedMemberId)
    } catch (e) { toast.error(e.message) }
  }

  const handleLinkParent = async (target) => {
    try {
      await familyAPI.addParentChild({ parent_id: target.id, child_id: selectedMemberId })
      toast.success('Parent linked')
      setModal(null)
      loadFamily(selectedMemberId)
    } catch (e) { toast.error(e.message) }
  }

  const handleLinkChild = async (target) => {
    try {
      await familyAPI.addParentChild({ parent_id: selectedMemberId, child_id: target.id })
      toast.success('Child linked')
      setModal(null)
      loadFamily(selectedMemberId)
    } catch (e) { toast.error(e.message) }
  }

  const filteredMembers = allMembers.filter(m =>
    `${m.first_name} ${m.last_name}`.toLowerCase().includes(memberQ.toLowerCase())
  )

  const excludeIds = [
    selectedMemberId,
    family?.spouse?.id,
    ...(family?.parents?.map(p => p.id) || []),
    ...(family?.children?.map(c => c.id) || []),
  ].filter(Boolean)

  return (
    <DashboardShell>
      <div className="mx-auto max-w-6xl px-5 sm:px-8 py-8 space-y-6">
        <div className="border-b border-warm-charcoal/[0.07] pb-8">
          <h1 className="text-3xl font-black tracking-tighter text-warm-charcoal">FAMILY TREE</h1>
          <p className="mt-2 text-sm text-warm-muted">View and manage physical family relationships between ELC members.</p>
        </div>

        <div className="grid gap-6 lg:grid-cols-[320px_1fr]">
          {/* Member selector */}
          <div className="rounded-2xl border border-warm-charcoal/[0.07] bg-white p-5 shadow-sm">
            <p className="text-[9px] font-bold tracking-[0.2em] text-warm-gold/70 mb-3">SELECT MEMBER</p>
            <input
              value={memberQ}
              onChange={e => setMemberQ(e.target.value)}
              placeholder="Search member…"
              className="w-full rounded-xl border border-warm-charcoal/[0.1] bg-warm-ivory px-3 py-2 text-sm placeholder-warm-muted focus:border-warm-gold/40 focus:outline-none mb-3"
            />
            <div className="space-y-1 max-h-[calc(100vh-320px)] overflow-y-auto">
              {filteredMembers.slice(0, 30).map(m => (
                <button key={m.id}
                  onClick={() => { setSelectedMemberId(m.id); loadFamily(m.id) }}
                  className={`w-full flex items-center gap-2.5 rounded-xl border px-3 py-2 text-left transition ${selectedMemberId === m.id ? 'border-warm-gold/20 bg-warm-gold/[0.04]' : 'border-warm-charcoal/[0.06] hover:bg-warm-ivory'}`}>
                  <Avatar name={`${m.first_name} ${m.last_name}`} picture={m.profile_picture} size="sm" />
                  <div>
                    <p className="text-xs font-semibold text-warm-espresso">{m.first_name} {m.last_name}</p>
                    <p className="text-[10px] text-warm-muted">{m.member_number || m.role}</p>
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Family card */}
          <div>
            {loading && (
              <div className="flex items-center justify-center py-24">
                <div className="h-5 w-5 animate-spin rounded-full border-2 border-warm-charcoal/10 border-t-warm-gold" />
              </div>
            )}
            {!loading && !family && (
              <div className="flex flex-col items-center justify-center py-24 text-warm-muted">
                <Users size={36} className="mb-3 text-warm-gold/30" />
                <p className="text-sm">Select a member to view their family</p>
              </div>
            )}
            {!loading && family && selectedMember && (
              <FamilyCard
                member={selectedMember}
                family={family}
                canEdit={isManager}
                onLink={type => setModal(type)}
              />
            )}
          </div>
        </div>
      </div>

      {/* Link modals */}
      {modal === 'spouse' && (
        <Modal title="Link Spouse" onClose={() => setModal(null)}>
          <MemberSearch members={allMembers} exclude={excludeIds} onSelect={handleLinkSpouse} placeholder="Search for spouse…" />
        </Modal>
      )}
      {modal === 'parent' && (
        <Modal title="Add Parent" onClose={() => setModal(null)}>
          <MemberSearch members={allMembers} exclude={excludeIds} onSelect={handleLinkParent} placeholder="Search for parent…" />
        </Modal>
      )}
      {modal === 'child' && (
        <Modal title="Add Child" onClose={() => setModal(null)}>
          <MemberSearch members={allMembers} exclude={excludeIds} onSelect={handleLinkChild} placeholder="Search for child…" />
        </Modal>
      )}
    </DashboardShell>
  )
}
