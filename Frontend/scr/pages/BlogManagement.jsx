import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Edit3, Trash2, Eye, BarChart3, Search, Plus } from 'lucide-react'
import { blogAPI } from '../utils/api'
import { toast } from 'react-toastify'
import DashboardShell from '../components/dashboard/DashboardShell'

const STATUS_BADGE = {
  published: 'text-emerald-700 bg-emerald-500/10',
  draft: 'text-amber-700 bg-amber-500/10',
  archived: 'text-warm-muted bg-warm-charcoal/[0.05]',
}

const inputCls = 'rounded-xl border border-warm-charcoal/[0.1] bg-warm-ivory px-4 py-2.5 text-sm text-warm-charcoal placeholder-warm-muted focus:border-warm-gold/40 focus:outline-none focus:bg-white'

export default function BlogManagement() {
  const navigate = useNavigate()
  const [posts, setPosts] = useState([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')

  useEffect(() => { fetchPosts() }, [searchTerm, statusFilter])

  const fetchPosts = async () => {
    try {
      setLoading(true)
      const data = await blogAPI.getPosts({
        search: searchTerm,
        status: statusFilter !== 'all' ? statusFilter : undefined,
      })
      setPosts(data.posts || [])
    } catch (error) {
      toast.error(error.message || 'Failed to load posts')
    } finally {
      setLoading(false)
    }
  }

  const deletePost = async (postId) => {
    if (!window.confirm('Delete this post?')) return
    try {
      await blogAPI.deletePost(postId)
      setPosts((prev) => prev.filter((p) => p._id !== postId))
      toast.success('Post deleted')
    } catch (error) {
      toast.error(error.message || 'Failed to delete post')
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
      <div className="mx-auto max-w-5xl px-5 sm:px-8 py-8 space-y-6">

        {/* Header */}
        <div className="flex items-start justify-between gap-4 border-b border-warm-charcoal/[0.07] pb-8">
          <div>
            <h1 className="text-3xl font-black tracking-tighter text-warm-charcoal">BLOG</h1>
            <p className="mt-2 text-sm text-warm-muted">Manage posts and content.</p>
          </div>
          <button
            onClick={() => navigate('/blog/create')}
            className="inline-flex items-center gap-2 rounded-xl bg-warm-gold px-5 py-2.5 text-xs font-bold tracking-[0.18em] text-warm-espresso transition hover:opacity-90 shrink-0"
          >
            <Plus size={13} />
            NEW POST
          </button>
        </div>

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1 max-w-sm">
            <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-warm-muted" />
            <input
              type="text"
              placeholder="Search posts..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className={`${inputCls} w-full pl-9`}
            />
          </div>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className={inputCls}
          >
            <option value="all">All Status</option>
            <option value="published">Published</option>
            <option value="draft">Draft</option>
            <option value="archived">Archived</option>
          </select>
        </div>

        {/* Table */}
        <div className="rounded-2xl border border-warm-charcoal/[0.07] bg-white shadow-sm overflow-hidden">
          {posts.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <BarChart3 size={32} className="text-warm-gold/30 mb-4" />
              <p className="text-sm font-semibold text-warm-muted mb-1">No posts found</p>
              <p className="text-xs text-warm-muted mb-5">Get started by creating your first blog post</p>
              <button
                onClick={() => navigate('/blog/create')}
                className="inline-flex items-center gap-2 rounded-xl bg-warm-gold px-5 py-2.5 text-xs font-bold tracking-[0.18em] text-warm-espresso transition hover:opacity-90"
              >
                <Plus size={13} />
                CREATE POST
              </button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-warm-charcoal/[0.07]">
                    {['Post', 'Status', 'Views', 'Likes', 'Date', 'Actions'].map((h) => (
                      <th key={h} className="px-5 py-3.5 text-left text-[9px] font-bold tracking-[0.2em] text-warm-gold/70">
                        {h.toUpperCase()}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {posts.map((post) => (
                    <tr key={post._id} className="border-b border-warm-charcoal/[0.05] transition hover:bg-warm-ivory">
                      <td className="px-5 py-4 max-w-xs">
                        <p className="text-sm font-semibold text-warm-espresso truncate">{post.title}</p>
                        <p className="mt-0.5 text-xs text-warm-muted truncate">{post.excerpt}</p>
                      </td>
                      <td className="px-5 py-4">
                        <span className={`rounded-full px-2 py-0.5 text-[9px] font-bold tracking-[0.12em] capitalize ${STATUS_BADGE[post.status] || STATUS_BADGE.draft}`}>
                          {post.status || 'draft'}
                        </span>
                      </td>
                      <td className="px-5 py-4 text-sm text-warm-muted">{post.views || 0}</td>
                      <td className="px-5 py-4 text-sm text-warm-muted">{post.likes?.length || 0}</td>
                      <td className="px-5 py-4 text-xs text-warm-muted">
                        {new Date(post.createdAt).toLocaleDateString()}
                      </td>
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => navigate(`/blog/${post._id}`)}
                            className="rounded-lg p-2 text-warm-muted transition hover:bg-warm-charcoal/[0.04] hover:text-warm-charcoal"
                            title="View"
                          >
                            <Eye size={14} />
                          </button>
                          <button
                            onClick={() => navigate(`/blog/edit/${post._id}`)}
                            className="rounded-lg p-2 text-warm-muted transition hover:bg-warm-charcoal/[0.04] hover:text-warm-gold"
                            title="Edit"
                          >
                            <Edit3 size={14} />
                          </button>
                          <button
                            onClick={() => deletePost(post._id)}
                            className="rounded-lg p-2 text-warm-muted transition hover:bg-red-50 hover:text-red-600"
                            title="Delete"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </DashboardShell>
  )
}
