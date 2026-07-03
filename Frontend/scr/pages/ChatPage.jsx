import { useState, useEffect, useRef } from 'react'
import { chatAPI } from '../utils/api'
import { toast } from 'react-toastify'
import { MessageCircle, Users, Send, Trash2, MoreVertical, Plus, X, ArrowLeft } from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'
import DashboardShell from '../components/dashboard/DashboardShell'

const inputCls = 'w-full rounded-xl border border-warm-charcoal/[0.1] bg-warm-ivory px-4 py-3 text-sm text-warm-charcoal placeholder-warm-muted focus:border-warm-gold/40 focus:outline-none focus:bg-white'
const labelCls = 'mb-1.5 block text-[10px] font-semibold uppercase tracking-[0.2em] text-warm-muted'

export default function ChatPage() {
  const { user } = useAuth()
  const [rooms, setRooms] = useState([])
  const [messages, setMessages] = useState([])
  const [activeRoom, setActiveRoom] = useState(null)
  const [newMessage, setNewMessage] = useState('')
  const [loading, setLoading] = useState(true)
  const [sending, setSending] = useState(false)
  const [deleteConfirm, setDeleteConfirm] = useState(null)
  const [deleting, setDeleting] = useState(false)
  const [showMessageMenu, setShowMessageMenu] = useState(null)
  const [showCreateRoomModal, setShowCreateRoomModal] = useState(false)
  const [creatingRoom, setCreatingRoom] = useState(false)
  const [newRoomData, setNewRoomData] = useState({ name: '', description: '', type: 'public', isPrivate: false })
  const messageMenuRef = useRef(null)

  const canManageRooms = ['admin', 'pastor', 'superadmin'].includes(user?.role)
  const [mobileView, setMobileView] = useState('rooms') // 'rooms' | 'chat'

  useEffect(() => { loadChatRooms() }, [])
  useEffect(() => { if (activeRoom) loadRoomMessages(activeRoom._id) }, [activeRoom])

  const selectRoom = (room) => {
    setActiveRoom(room)
    setMobileView('chat')
  }

  const loadChatRooms = async () => {
    try {
      const response = await chatAPI.getRooms()
      const roomsData = response.data || response
      setRooms(Array.isArray(roomsData) ? roomsData : [])
      if (roomsData.length > 0) setActiveRoom(roomsData[0])
    } catch {
      toast.error('Failed to load chat rooms')
      setRooms([])
    } finally {
      setLoading(false)
    }
  }

  const loadRoomMessages = async (roomId) => {
    try {
      const response = await chatAPI.getMessages(roomId)
      const messagesData = response.data || response
      setMessages(Array.isArray(messagesData) ? messagesData : [])
    } catch {
      toast.error('Failed to load messages')
      setMessages([])
    }
  }

  const handleSendMessage = async (e) => {
    e.preventDefault()
    if (!newMessage.trim() || !activeRoom) return
    setSending(true)
    try {
      await chatAPI.sendMessage(activeRoom._id, { message: newMessage, messageType: 'text' })
      setNewMessage('')
      loadRoomMessages(activeRoom._id)
    } catch {
      toast.error('Failed to send message')
    } finally {
      setSending(false)
    }
  }

  const handleDeleteMessage = async (messageId) => {
    if (!activeRoom) return
    setDeleting(true)
    try {
      await chatAPI.deleteMessage(activeRoom._id, messageId)
      toast.success('Message deleted')
      loadRoomMessages(activeRoom._id)
    } catch {
      toast.error('Failed to delete message')
    } finally {
      setDeleting(false)
      setDeleteConfirm(null)
      setShowMessageMenu(null)
    }
  }

  const canDeleteMessage = (message) => {
    if (!user || !message) return false
    return ['admin', 'pastor', 'superadmin'].includes(user.role) || message.sender?._id === user.id
  }

  const resetCreateRoomForm = () => {
    setNewRoomData({ name: '', description: '', type: 'public', isPrivate: false })
    setShowCreateRoomModal(false)
  }

  const handleCreateRoom = async (event) => {
    event.preventDefault()
    if (!newRoomData.name.trim()) { toast.error('Room name is required'); return }
    setCreatingRoom(true)
    try {
      const room = await chatAPI.createRoom({ ...newRoomData, name: newRoomData.name.trim(), description: newRoomData.description.trim() })
      setRooms((r) => [...r, room])
      selectRoom(room)
      resetCreateRoomForm()
      toast.success('Chat room created successfully')
    } catch (error) {
      toast.error(error.message || 'Failed to create chat room')
    } finally {
      setCreatingRoom(false)
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
      <div className="mx-auto max-w-6xl px-5 sm:px-8 py-8 space-y-6 h-full">

        {/* Header */}
        <div className="flex items-center justify-between gap-4 border-b border-warm-charcoal/[0.07] pb-6">
          <div className="flex items-center gap-3">
            <MessageCircle size={18} className="text-warm-gold" />
            <div>
              <h1 className="text-3xl font-black tracking-tighter text-warm-charcoal">CHURCH CHAT</h1>
              <p className="mt-1 text-sm text-warm-muted">Connect with church members.</p>
            </div>
          </div>
          {canManageRooms && (
            <button
              onClick={() => setShowCreateRoomModal(true)}
              className="inline-flex items-center gap-2 rounded-xl bg-warm-gold px-5 py-2.5 text-xs font-bold tracking-[0.18em] text-warm-espresso transition hover:opacity-90"
            >
              <Plus size={13} />
              CREATE GROUP
            </button>
          )}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-4" style={{ height: 'calc(100vh - 260px)', minHeight: '500px' }}>

          {/* Rooms sidebar — hidden on mobile when chat is open */}
          <div className={`rounded-2xl border border-warm-charcoal/[0.07] bg-white p-4 lg:col-span-1 flex-col shadow-sm ${mobileView === 'chat' ? 'hidden lg:flex' : 'flex'}`}>
            <p className="text-[9px] font-bold tracking-[0.22em] text-warm-gold/70 mb-3 flex items-center gap-2">
              <Users size={11} />CHAT ROOMS
            </p>
            <div className="space-y-1.5 flex-1 overflow-y-auto">
              {rooms.map((room) => (
                <button
                  key={room._id}
                  onClick={() => selectRoom(room)}
                  className={`w-full text-left p-3 rounded-xl transition-all ${
                    activeRoom?._id === room._id
                      ? 'border border-warm-gold/20 bg-warm-gold/[0.06]'
                      : 'border border-transparent hover:border-warm-charcoal/[0.07] hover:bg-warm-ivory'
                  }`}
                >
                  <p className="text-xs font-semibold text-warm-espresso">{room.name}</p>
                  <p className="text-[10px] text-warm-muted truncate mt-0.5">{room.description || `${room.memberCount || 0} members`}</p>
                </button>
              ))}
            </div>
          </div>

          {/* Chat area — hidden on mobile when rooms list is shown */}
          <div className={`rounded-2xl border border-warm-charcoal/[0.07] bg-white lg:col-span-3 flex-col overflow-hidden shadow-sm ${mobileView === 'rooms' ? 'hidden lg:flex' : 'flex'}`}>
            {activeRoom ? (
              <>
                <div className="px-5 py-4 border-b border-warm-charcoal/[0.07] flex items-center gap-3">
                  <button
                    onClick={() => setMobileView('rooms')}
                    className="lg:hidden p-1.5 rounded-lg hover:bg-warm-ivory text-warm-muted hover:text-warm-charcoal transition"
                  >
                    <ArrowLeft size={16} />
                  </button>
                  <div>
                    <p className="text-sm font-bold text-warm-charcoal">{activeRoom.name}</p>
                    <p className="text-xs text-warm-muted">{activeRoom.description}</p>
                  </div>
                </div>

                <div className="flex-1 p-4 overflow-y-auto space-y-4">
                  {messages.length > 0 ? (
                    messages.map((message) => (
                      <div key={message._id} className="flex gap-3 group relative">
                        <div className="w-7 h-7 rounded-full bg-warm-gold/10 border border-warm-charcoal/[0.07] flex items-center justify-center shrink-0">
                          <Users size={13} className="text-warm-gold" />
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center justify-between mb-1">
                            <div className="flex items-center gap-2">
                              <span className="text-xs font-semibold text-warm-espresso">{message.sender?.name || 'Unknown User'}</span>
                              <span className="text-[10px] text-warm-muted">{new Date(message.createdAt).toLocaleTimeString()}</span>
                            </div>
                            {canDeleteMessage(message) && (
                              <div className="relative" ref={messageMenuRef}>
                                <button
                                  onClick={() => setShowMessageMenu(showMessageMenu === message._id ? null : message._id)}
                                  className="opacity-0 group-hover:opacity-100 p-1 hover:bg-warm-charcoal/[0.04] rounded transition-opacity"
                                >
                                  <MoreVertical size={13} className="text-warm-muted" />
                                </button>
                                {showMessageMenu === message._id && (
                                  <div className="absolute right-0 top-6 rounded-xl border border-warm-charcoal/[0.08] bg-white shadow-lg z-10 min-w-28 overflow-hidden">
                                    <button
                                      onClick={() => { setDeleteConfirm(message); setShowMessageMenu(null) }}
                                      className="w-full px-3 py-2.5 text-left text-xs text-red-600 hover:bg-red-50 flex items-center gap-2"
                                    >
                                      <Trash2 size={12} />Delete
                                    </button>
                                  </div>
                                )}
                              </div>
                            )}
                          </div>
                          <p className="text-sm text-warm-plum">{message.content || message.message}</p>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="flex flex-col items-center justify-center h-full text-center py-8">
                      <MessageCircle size={36} className="text-warm-gold/30 mb-3" />
                      <p className="text-sm text-warm-muted">No messages yet</p>
                      <p className="text-xs text-warm-muted/70">Start the conversation!</p>
                    </div>
                  )}
                </div>

                <div className="px-4 py-3 border-t border-warm-charcoal/[0.07]">
                  <form onSubmit={handleSendMessage} className="flex gap-2">
                    <input
                      type="text"
                      value={newMessage}
                      onChange={(e) => setNewMessage(e.target.value)}
                      placeholder="Type your message..."
                      className="flex-1 rounded-xl border border-warm-charcoal/[0.1] bg-warm-ivory px-4 py-2.5 text-sm text-warm-charcoal placeholder-warm-muted focus:border-warm-gold/40 focus:outline-none focus:bg-white"
                      disabled={sending}
                    />
                    <button
                      type="submit"
                      disabled={sending || !newMessage.trim()}
                      className="inline-flex items-center gap-2 rounded-xl bg-warm-gold px-4 py-2.5 text-xs font-bold text-warm-espresso transition hover:opacity-90 disabled:opacity-50"
                    >
                      <Send size={13} />
                    </button>
                  </form>
                </div>
              </>
            ) : (
              <div className="flex-1 flex items-center justify-center">
                <div className="text-center">
                  <MessageCircle size={36} className="mx-auto mb-3 text-warm-gold/30" />
                  <p className="text-sm text-warm-muted">Select a chat room to start messaging</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Delete confirm modal */}
      {deleteConfirm && (
        <div className="fixed inset-0 bg-warm-charcoal/40 flex items-center justify-center z-50 px-4">
          <div className="rounded-2xl border border-warm-charcoal/[0.08] bg-white p-6 max-w-md w-full space-y-4 shadow-xl">
            <p className="text-sm font-bold text-warm-charcoal">Delete Message</p>
            <p className="text-xs text-warm-muted">Are you sure you want to delete this message? This action cannot be undone.</p>
            <div className="rounded-xl border border-warm-charcoal/[0.07] bg-warm-ivory p-3">
              <p className="text-xs text-warm-plum">
                <span className="font-semibold text-warm-espresso">{deleteConfirm.sender?.name || 'Unknown'}:</span>{' '}
                {deleteConfirm.content || deleteConfirm.message}
              </p>
            </div>
            <div className="flex gap-3">
              <button onClick={() => setDeleteConfirm(null)} disabled={deleting} className="flex-1 rounded-xl border border-warm-charcoal/[0.07] bg-white py-2.5 text-xs font-semibold text-warm-muted transition hover:text-warm-charcoal disabled:opacity-50">Cancel</button>
              <button onClick={() => handleDeleteMessage(deleteConfirm._id)} disabled={deleting} className="flex-1 rounded-xl bg-red-50 border border-red-200 text-red-600 py-2.5 text-xs font-semibold transition hover:bg-red-100 disabled:opacity-50 inline-flex items-center justify-center gap-2">
                <Trash2 size={12} />{deleting ? 'Deleting...' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Create room modal */}
      {showCreateRoomModal && canManageRooms && (
        <div className="fixed inset-0 bg-warm-charcoal/40 flex items-center justify-center z-50 px-4">
          <div className="rounded-2xl border border-warm-charcoal/[0.08] bg-white p-6 max-w-md w-full space-y-4 shadow-xl">
            <div className="flex items-center justify-between">
              <p className="text-sm font-bold text-warm-charcoal">Create Chat Group</p>
              <button onClick={resetCreateRoomForm} className="text-warm-muted hover:text-warm-charcoal"><X size={16} /></button>
            </div>
            <form onSubmit={handleCreateRoom} className="space-y-4">
              <div>
                <label className={labelCls}>Group Name</label>
                <input type="text" value={newRoomData.name} onChange={(e) => setNewRoomData((c) => ({ ...c, name: e.target.value }))} className={inputCls} placeholder="Enter group name" />
              </div>
              <div>
                <label className={labelCls}>Description</label>
                <textarea value={newRoomData.description} onChange={(e) => setNewRoomData((c) => ({ ...c, description: e.target.value }))} className={`${inputCls} resize-none`} rows={3} placeholder="Describe the purpose of this group" />
              </div>
              <div>
                <label className={labelCls}>Room Type</label>
                <select value={newRoomData.type} onChange={(e) => setNewRoomData((c) => ({ ...c, type: e.target.value }))} className={inputCls}>
                  <option value="public">Public</option>
                  <option value="private">Private</option>
                  <option value="announcement">Announcement</option>
                </select>
              </div>
              <label className="flex items-center gap-3 cursor-pointer">
                <input type="checkbox" checked={newRoomData.isPrivate} onChange={(e) => setNewRoomData((c) => ({ ...c, isPrivate: e.target.checked }))} className="w-4 h-4 rounded accent-warm-gold" />
                <span className="text-xs text-warm-muted">Make this an invite-only group</span>
              </label>
              <div className="flex gap-3 pt-1">
                <button type="button" onClick={resetCreateRoomForm} disabled={creatingRoom} className="flex-1 rounded-xl border border-warm-charcoal/[0.07] bg-white py-2.5 text-xs font-semibold text-warm-muted transition hover:text-warm-charcoal disabled:opacity-50">Cancel</button>
                <button type="submit" disabled={creatingRoom || !newRoomData.name.trim()} className="flex-1 rounded-xl bg-warm-gold py-2.5 text-xs font-bold text-warm-espresso transition hover:opacity-90 disabled:opacity-50">
                  {creatingRoom ? 'Creating...' : 'Create Group'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </DashboardShell>
  )
}
