import { useEffect, useMemo, useState } from 'react';
import { toast } from 'react-toastify';
import {
  Mail,
  Inbox,
  MailOpen,
  Reply,
  Send,
  Search,
  Filter,
  CheckCircle,
  XCircle,
  Clock,
  X,
} from 'lucide-react';
import { contactAdminAPI } from '../../utils/api';
import DashboardShell from '../../components/dashboard/DashboardShell';

const inputCls = 'w-full rounded-xl border border-warm-charcoal/[0.1] bg-warm-ivory px-4 py-3 text-sm text-warm-charcoal placeholder-warm-muted focus:border-warm-gold/40 focus:outline-none focus:bg-white'
const labelCls = 'mb-1.5 block text-[10px] font-semibold uppercase tracking-[0.2em] text-warm-muted'

const statusOptions = [
  { value: 'all', label: 'All' },
  { value: 'unread', label: 'Unread' },
  { value: 'pending', label: 'Pending' },
  { value: 'replied', label: 'Replied' },
];

const pillCls = (submission) => {
  if (submission.replied) return 'text-emerald-700 bg-emerald-500/10';
  if (!submission.is_read) return 'text-amber-700 bg-amber-500/10';
  return 'text-warm-muted bg-warm-charcoal/[0.05]';
};

const formatDate = (value) => value ? new Date(value).toLocaleString() : '—';

export default function ContactMessagesPage() {
  const [loading, setLoading] = useState(true);
  const [messages, setMessages] = useState([]);
  const [selected, setSelected] = useState(null);
  const [replies, setReplies] = useState([]);
  const [filter, setFilter] = useState('all');
  const [search, setSearch] = useState('');
  const [sending, setSending] = useState(false);
  const [replyModalOpen, setReplyModalOpen] = useState(false);
  const [replyForm, setReplyForm] = useState({ subject: '', message: '' });
  const [pagination, setPagination] = useState({ page: 1, total: 0, limit: 20 });

  const headline = useMemo(() => {
    if (filter === 'unread') return 'Unread Messages';
    if (filter === 'pending') return 'Pending Reply';
    if (filter === 'replied') return 'Replied';
    return 'All Messages';
  }, [filter]);

  useEffect(() => { loadMessages(1, filter, search); }, [filter]);

  const loadMessages = async (page = 1, status = filter, q = search) => {
    try {
      setLoading(true);
      const res = await contactAdminAPI.list({ page, limit: pagination.limit, status, search: q });
      const payload = res?.data ? res : { data: res };
      const rows = Array.isArray(payload.data) ? payload.data : payload.data?.data || payload.data || [];
      setMessages(rows);
      const pageInfo = payload.pagination || payload.meta?.pagination;
      if (pageInfo) setPagination({ page: pageInfo.page, total: pageInfo.total, limit: pageInfo.limit || pagination.limit });
    } catch (error) {
      console.error(error);
      toast.error('Could not load contact messages');
    } finally {
      setLoading(false);
    }
  };

  const loadMessageDetail = async (id) => {
    try {
      const res = await contactAdminAPI.get(id);
      const payload = res?.data || {};
      setSelected(payload.submission || payload.data?.submission || null);
      setReplies(payload.replies || payload.data?.replies || []);
      loadMessages(pagination.page);
    } catch (error) {
      console.error(error);
      toast.error('Failed to load message details');
    }
  };

  const handleSelect = (submission) => {
    setSelected(submission);
    setReplyForm({ subject: submission.subject ? `Re: ${submission.subject}` : 'Re: Your message', message: '' });
    loadMessageDetail(submission.id);
  };

  const handleMarkRead = async (id, isRead) => {
    try {
      await contactAdminAPI.markRead(id, isRead);
      toast.success(isRead ? 'Marked as read' : 'Marked as unread');
      loadMessages(pagination.page);
      if (selected?.id === id) setSelected({ ...selected, is_read: isRead ? 1 : 0 });
    } catch (error) {
      console.error(error);
      toast.error('Unable to update read state');
    }
  };

  const handleReply = async (e) => {
    e.preventDefault();
    if (!selected) return;
    if (!replyForm.message.trim()) { toast.warn('Add a message before sending'); return; }
    try {
      setSending(true);
      await contactAdminAPI.reply(selected.id, replyForm);
      toast.success('Reply sent');
      setReplyModalOpen(false);
      setReplyForm({ subject: replyForm.subject, message: '' });
      loadMessageDetail(selected.id);
    } catch (error) {
      console.error(error);
      toast.error('Failed to send reply');
    } finally {
      setSending(false);
    }
  };

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    loadMessages(1, filter, search);
  };

  return (
    <DashboardShell>
      <div className="mx-auto max-w-7xl px-5 sm:px-8 py-8 space-y-6">

        {/* Header */}
        <div className="flex items-center justify-between gap-4 border-b border-warm-charcoal/[0.07] pb-6">
          <div className="flex items-center gap-3">
            <Mail size={18} className="text-warm-muted" />
            <div>
              <h1 className="text-3xl font-black tracking-tighter text-warm-charcoal">CONTACT MESSAGES</h1>
              <p className="mt-1 text-sm text-warm-muted">{headline}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className="rounded-full px-2.5 py-1 text-[9px] font-bold tracking-[0.12em] text-amber-700 bg-amber-500/10">
              {messages.filter((m) => !m.replied).length} PENDING
            </span>
            <span className="rounded-full px-2.5 py-1 text-[9px] font-bold tracking-[0.12em] text-emerald-700 bg-emerald-500/10">
              {messages.filter((m) => m.replied).length} REPLIED
            </span>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6" style={{ height: 'calc(100vh - 260px)', minHeight: '500px' }}>
          {/* Sidebar */}
          <div className="rounded-2xl border border-warm-charcoal/[0.07] bg-white lg:col-span-1 flex flex-col overflow-hidden shadow-sm">
            {/* Filters */}
            <div className="p-4 border-b border-warm-charcoal/[0.07] flex items-center gap-2 flex-wrap">
              <Filter size={12} className="text-warm-muted shrink-0" />
              {statusOptions.map((opt) => (
                <button
                  key={opt.value}
                  onClick={() => setFilter(opt.value)}
                  className={`rounded-full px-3 py-1 text-[10px] font-bold tracking-[0.1em] transition ${
                    filter === opt.value
                      ? 'bg-warm-gold/[0.08] border border-warm-gold/20 text-warm-plum'
                      : 'border border-warm-charcoal/[0.07] text-warm-muted hover:text-warm-charcoal'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>

            {/* Search */}
            <form onSubmit={handleSearchSubmit} className="p-4 border-b border-warm-charcoal/[0.07] flex gap-2">
              <div className="relative flex-1">
                <Search size={13} className="absolute left-3 top-3 text-warm-muted" />
                <input
                  type="text"
                  placeholder="Search name, email, message..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-warm-charcoal/[0.1] bg-warm-ivory text-sm text-warm-charcoal placeholder-warm-muted focus:border-warm-gold/40 focus:outline-none"
                />
              </div>
              <button type="submit" className="rounded-xl bg-warm-gold px-3 py-2.5 text-xs font-bold text-warm-espresso hover:opacity-90 transition">
                Go
              </button>
            </form>

            {/* Messages list */}
            <div className="flex-1 overflow-y-auto">
              {loading ? (
                <div className="flex items-center justify-center py-10 gap-2 text-warm-muted text-sm">
                  <div className="h-4 w-4 animate-spin rounded-full border-2 border-warm-charcoal/10 border-t-warm-gold" />
                  Loading...
                </div>
              ) : messages.length === 0 ? (
                <div className="p-6 text-center">
                  <Inbox size={28} className="mx-auto mb-2 text-warm-gold/30" />
                  <p className="text-sm text-warm-muted">No messages yet.</p>
                </div>
              ) : (
                messages.map((item) => (
                  <button
                    key={item.id}
                    onClick={() => handleSelect(item)}
                    className={`w-full text-left px-4 py-3 border-b border-warm-charcoal/[0.05] transition ${
                      selected?.id === item.id ? 'bg-warm-gold/[0.04]' : 'hover:bg-warm-ivory'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-semibold text-warm-espresso">{item.name}</p>
                      <span className={`text-[9px] px-2 py-0.5 rounded-full font-bold tracking-[0.1em] ${pillCls(item)}`}>
                        {item.replied ? 'REPLIED' : item.is_read ? 'READ' : 'UNREAD'}
                      </span>
                    </div>
                    <p className="text-xs text-warm-muted mt-0.5">{item.email}</p>
                    <p className="text-xs text-warm-muted line-clamp-2 mt-1">{item.message}</p>
                    <div className="flex items-center gap-1.5 text-[10px] text-warm-muted mt-1.5">
                      <Clock size={10} />
                      <span>{formatDate(item.created_at)}</span>
                    </div>
                  </button>
                ))
              )}
            </div>
          </div>

          {/* Detail panel */}
          <div className="rounded-2xl border border-warm-charcoal/[0.07] bg-white lg:col-span-2 flex flex-col overflow-hidden shadow-sm">
            {!selected ? (
              <div className="flex-1 flex flex-col items-center justify-center text-warm-muted">
                <MailOpen size={36} className="mb-3 text-warm-gold/30" />
                <p className="text-sm">Select a message to view details</p>
              </div>
            ) : (
              <>
                <div className="px-6 py-4 border-b border-warm-charcoal/[0.07] flex items-center justify-between">
                  <div>
                    <p className="text-[10px] uppercase font-semibold text-warm-muted">From</p>
                    <p className="text-sm font-bold text-warm-charcoal">{selected.name}</p>
                    <p className="text-xs text-warm-muted">{selected.email}</p>
                    {selected.phone && <p className="text-xs text-warm-muted">{selected.phone}</p>}
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleMarkRead(selected.id, !selected.is_read)}
                      className="rounded-xl border border-warm-charcoal/[0.07] bg-white px-3 py-2 text-xs font-semibold text-warm-muted hover:text-warm-charcoal transition"
                    >
                      {selected.is_read ? 'Mark Unread' : 'Mark Read'}
                    </button>
                    <button
                      onClick={() => setReplyModalOpen(true)}
                      className="inline-flex items-center gap-2 rounded-xl bg-warm-gold px-4 py-2 text-xs font-bold text-warm-espresso hover:opacity-90 transition"
                    >
                      <Reply size={12} />Reply
                    </button>
                  </div>
                </div>

                <div className="p-6 space-y-5 flex-1 overflow-y-auto">
                  <div>
                    <p className="text-[10px] uppercase font-semibold text-warm-muted mb-1">Subject</p>
                    <p className="text-sm font-semibold text-warm-espresso">{selected.subject || 'Contact Form Submission'}</p>
                  </div>
                  <div>
                    <p className="text-[10px] uppercase font-semibold text-warm-muted mb-2">Message</p>
                    <div className="rounded-xl border border-warm-charcoal/[0.07] bg-warm-ivory p-4 text-sm text-warm-espresso whitespace-pre-wrap">
                      {selected.message}
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <span className="inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[10px] font-semibold text-warm-muted bg-warm-charcoal/[0.05]">
                      <Clock size={10} />{formatDate(selected.created_at)}
                    </span>
                    {selected.replied ? (
                      <span className="inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[10px] font-bold text-emerald-700 bg-emerald-500/10">
                        <CheckCircle size={10} />Replied {formatDate(selected.replied_at)}
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[10px] font-bold text-amber-700 bg-amber-500/10">
                        <XCircle size={10} />Awaiting reply
                      </span>
                    )}
                  </div>

                  <div>
                    <div className="flex items-center gap-2 mb-3">
                      <Send size={13} className="text-warm-muted" />
                      <p className="text-xs font-semibold text-warm-muted">REPLIES</p>
                    </div>
                    {replies.length === 0 ? (
                      <p className="text-sm text-warm-muted">No replies yet.</p>
                    ) : (
                      <div className="space-y-3">
                        {replies.map((reply) => (
                          <div key={reply.id} className="rounded-xl border border-warm-charcoal/[0.07] bg-warm-ivory p-4">
                            <div className="flex items-center justify-between mb-2">
                              <div>
                                <p className="text-sm font-semibold text-warm-espresso">{reply.subject || 'Reply'}</p>
                                <p className="text-xs text-warm-muted">{reply.first_name ? `${reply.first_name} ${reply.last_name || ''}`.trim() : 'Admin'}</p>
                              </div>
                              <p className="text-xs text-warm-muted">{formatDate(reply.created_at)}</p>
                            </div>
                            <p className="text-sm text-warm-espresso whitespace-pre-wrap">{reply.message}</p>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Reply modal */}
      {replyModalOpen && selected && (
        <div className="fixed inset-0 bg-warm-charcoal/40 flex items-center justify-center z-50 px-4">
          <div className="rounded-2xl border border-warm-charcoal/[0.07] bg-white p-6 max-w-xl w-full space-y-5 shadow-xl">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[10px] uppercase font-semibold text-warm-muted">Replying to</p>
                <p className="text-sm font-bold text-warm-charcoal">{selected.name}</p>
                <p className="text-xs text-warm-muted">{selected.email}</p>
              </div>
              <button onClick={() => setReplyModalOpen(false)} className="text-warm-muted hover:text-warm-charcoal">
                <X size={16} />
              </button>
            </div>
            <form onSubmit={handleReply} className="space-y-4">
              <div>
                <label className={labelCls}>Subject</label>
                <input
                  type="text"
                  value={replyForm.subject}
                  onChange={(e) => setReplyForm((p) => ({ ...p, subject: e.target.value }))}
                  className={inputCls}
                  required
                />
              </div>
              <div>
                <label className={labelCls}>Message</label>
                <textarea
                  rows={6}
                  value={replyForm.message}
                  onChange={(e) => setReplyForm((p) => ({ ...p, message: e.target.value }))}
                  className={`${inputCls} resize-none`}
                  placeholder="Type your response. The recipient will receive this via email."
                  required
                />
              </div>
              <div className="flex gap-3 pt-1">
                <button
                  type="button"
                  onClick={() => setReplyModalOpen(false)}
                  className="flex-1 rounded-xl border border-warm-charcoal/[0.07] bg-white py-2.5 text-xs font-semibold text-warm-muted hover:text-warm-charcoal transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={sending}
                  className="flex-1 inline-flex items-center justify-center gap-2 rounded-xl bg-warm-gold py-2.5 text-xs font-bold text-warm-espresso hover:opacity-90 disabled:opacity-50 transition"
                >
                  {sending && <div className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white/20 border-t-white/60" />}
                  Send Reply
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </DashboardShell>
  );
}
