import { useState, useEffect, useRef } from 'react'
import { motion, useInView } from 'framer-motion'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { ArrowRight, ArrowLeft, Edit3, Plus, Search } from 'lucide-react'
import { blogAPI } from '../utils/api'
import SEO from '../components/SEO'
import PublicNavigation from '../components/layout/PublicNavigation'
import PublicFooter from '../components/layout/PublicFooter'

const categories = [
  { id: 'all', name: 'All' },
  { id: 'teaching', name: 'Teachings' },
  { id: 'testimony', name: 'Testimonies' },
  { id: 'devotional', name: 'Devotionals' },
]

const CATEGORY_LABELS = {
  faith: 'Faith',
  testimony: 'Testimony',
  teaching: 'Teaching',
  news: 'News',
  devotional: 'Devotional',
  announcement: 'Announcement',
}

const ease = [0.22, 1, 0.36, 1]

function FadeUp({ children, delay = 0, className = '' }) {
  const ref = useRef(null)
  const inView = useInView(ref, { once: true, margin: '-60px' })
  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 28 }}
      animate={inView ? { opacity: 1, y: 0 } : {}}
      transition={{ duration: 0.65, delay, ease }}
      className={className}
    >
      {children}
    </motion.div>
  )
}

export default function Blog() {
  const { isPastor } = useAuth()
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()

  const [loading, setLoading] = useState(true)
  const [posts, setPosts] = useState([])
  const [featuredPost, setFeaturedPost] = useState(null)
  const [searchTerm, setSearchTerm] = useState(searchParams.get('search') || '')
  const [selectedCategory, setSelectedCategory] = useState(searchParams.get('category') || 'all')
  const [currentPage, setCurrentPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)

  useEffect(() => {
    const category = searchParams.get('category')
    const search = searchParams.get('search')
    const page = searchParams.get('page')
    if (category) setSelectedCategory(category)
    if (search) setSearchTerm(search)
    if (page) setCurrentPage(parseInt(page))
  }, [searchParams])

  useEffect(() => {
    fetchBlogPosts()
  }, [selectedCategory, searchTerm, currentPage])

  const fetchBlogPosts = async () => {
    try {
      setLoading(true)
      const params = { page: currentPage, limit: 9 }
      if (selectedCategory !== 'all') params.category = selectedCategory
      if (searchTerm) params.search = searchTerm

      const data = await blogAPI.getPosts(params)
      setPosts(data.posts)
      setTotalPages(data.totalPages)

      if (currentPage === 1 && selectedCategory === 'all' && !searchTerm && data.posts.length > 0) {
        setFeaturedPost(data.posts[0])
      } else {
        setFeaturedPost(null)
      }
    } catch (error) {
      console.error('Error fetching blog posts:', error)
      setSampleData()
    } finally {
      setLoading(false)
    }
  }

  const setSampleData = () => {
    const samplePosts = [
      {
        _id: '1',
        title: 'The Power of Love: Building a Spirit-Filled Life',
        excerpt:
          'Discover how love as the foundation of all spiritual gifts can transform your relationship with God and others.',
        content: '',
        author: { name: 'Apostle Vangeli Sibisi', role: 'leadership' },
        createdAt: '2024-01-15T00:00:00.000Z',
        readTime: 5,
        category: 'faith',
        featuredImage: '',
        likes: ['1', '2', '3'],
        comments: [],
      },
      {
        _id: '2',
        title: 'Experiencing the Holy Ghost Power',
        excerpt:
          'A testimony of how the Spirit-filled lifestyle brings transformation and healing to believers in our community.',
        content: '',
        author: { name: 'Sarah Johnson', role: 'member' },
        createdAt: '2024-01-12T00:00:00.000Z',
        readTime: 3,
        category: 'testimony',
        featuredImage: '',
        likes: ['1', '2'],
        comments: [],
      },
      {
        _id: '3',
        title: 'Understanding Your Identity in Christ',
        excerpt:
          "Love is the foundation for all spiritual gifts. A believer's identity is shaped by love — not by talents or abilities.",
        content: '',
        author: { name: 'Apostle Vangeli Sibisi', role: 'leadership' },
        createdAt: '2024-01-10T00:00:00.000Z',
        readTime: 7,
        category: 'teaching',
        featuredImage: '',
        likes: ['1', '2', '3', '4'],
        comments: [],
      },
    ]
    setPosts(samplePosts)
    setFeaturedPost(samplePosts[0])
    setTotalPages(1)
  }

  const updateFilters = (category, search, page = 1) => {
    const params = {}
    if (category && category !== 'all') params.category = category
    if (search) params.search = search
    if (page > 1) params.page = page
    setSearchParams(params)
    setCurrentPage(page)
  }

  const handleSearch = (e) => {
    e.preventDefault()
    updateFilters(selectedCategory, searchTerm)
  }

  const handleCategoryChange = (category) => {
    setSelectedCategory(category)
    updateFilters(category, searchTerm)
  }

  const handlePageChange = (page) => {
    setCurrentPage(page)
    updateFilters(selectedCategory, searchTerm, page)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const formatDate = (dateString) => {
    if (!dateString) return ''
    return new Date(dateString).toLocaleDateString('en-ZA', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    })
  }

  const getPrimaryPostImage = (post) => {
    if (!post) return ''
    if (Array.isArray(post.galleryImages) && post.galleryImages.length > 0) {
      return post.galleryImages[0]?.url || post.galleryImages[0]
    }
    return post.featuredImage || ''
  }

  const formatCat = (cat) => CATEGORY_LABELS[cat] || (cat ? cat.charAt(0).toUpperCase() + cat.slice(1) : '')

  if (loading) {
    return (
      <div className="min-h-screen bg-[#050505] text-zinc-100">
        <PublicNavigation variant="dark" />
        <div className="mx-auto max-w-7xl px-4 py-32 sm:px-6 lg:px-8">
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <div key={i} className="overflow-hidden rounded-3xl border border-white/[0.05] bg-white/[0.02]">
                <div className="aspect-[4/3] animate-pulse bg-white/[0.04]" />
                <div className="space-y-3 p-6">
                  <div className="h-3 w-1/4 animate-pulse rounded-full bg-white/[0.04]" />
                  <div className="h-5 w-3/4 animate-pulse rounded-lg bg-white/[0.04]" />
                  <div className="h-3 w-1/2 animate-pulse rounded-lg bg-white/[0.03]" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#050505] text-zinc-100">
      <SEO
        title="Journal"
        description="Spirit-filled writings centered on faith, transformation, and the love of God — Eternal Love Church."
        canonical={typeof window !== 'undefined' ? `${window.location.origin}/blog` : 'https://elchurch.site/blog'}
      />

      <PublicNavigation variant="dark" />

      <main>

        {/* ─── 1. HERO ─────────────────────────────────────────────── */}
        <section className="relative flex min-h-[82vh] flex-col items-center justify-center overflow-hidden px-4 pb-24 pt-32 text-center sm:px-6 lg:px-8">
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_80%_55%_at_50%_0%,rgba(109,40,217,0.2)_0%,transparent_70%)]" />

          <motion.p
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.55, ease }}
            className="text-xs font-semibold tracking-[0.4em] text-[#D4AF37]"
          >
            JOURNAL &middot; TEACHINGS &middot; DEVOTIONALS
          </motion.p>

          <motion.h1
            initial={{ opacity: 0, y: 32 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.75, delay: 0.1, ease }}
            className="mt-8 text-6xl font-black leading-[0.9] tracking-tighter text-white sm:text-7xl lg:text-8xl xl:text-9xl"
          >
            <span className="block">STORIES,</span>
            <span className="block text-[#D4AF37]">TEACHINGS</span>
            <span className="block">&amp; REFLECTIONS</span>
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.65, delay: 0.22, ease }}
            className="mt-8 max-w-lg text-base leading-7 text-zinc-400 sm:text-lg"
          >
            Spirit-filled writings centered on faith, transformation, and the love of God.
          </motion.p>

          {isPastor && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.5, delay: 0.5, ease }}
              className="mt-8 flex items-center gap-3"
            >
              <button
                onClick={() => navigate('/blog/manage')}
                className="rounded-lg border border-white/10 px-4 py-2 text-xs font-semibold text-zinc-500 transition hover:border-white/20 hover:text-zinc-300"
              >
                Manage
              </button>
              <button
                onClick={() => navigate('/blog/create')}
                className="inline-flex items-center gap-1.5 rounded-lg border border-[#D4AF37]/20 bg-[#D4AF37]/[0.07] px-4 py-2 text-xs font-semibold text-[#D4AF37] transition hover:bg-[#D4AF37]/[0.12]"
              >
                <Plus size={13} />
                New Post
              </button>
            </motion.div>
          )}
        </section>

        {/* ─── 2. FEATURED ARTICLE ─────────────────────────────────── */}
        {featuredPost && currentPage === 1 && selectedCategory === 'all' && !searchTerm && (
          <section className="border-t border-white/[0.06] bg-[#050505]">
            <div className="mx-auto max-w-7xl px-4 py-24 sm:px-6 lg:px-8">
              <FadeUp>
                <p className="text-xs font-semibold tracking-[0.35em] text-[#D4AF37]">FEATURED</p>
              </FadeUp>

              <FadeUp delay={0.1} className="mt-8">
                <Link
                  to={`/blog/${featuredPost._id}`}
                  className="group relative block overflow-hidden rounded-3xl"
                >
                  <div className="relative min-h-[480px] sm:min-h-[560px]">
                    {getPrimaryPostImage(featuredPost) ? (
                      <img
                        src={getPrimaryPostImage(featuredPost)}
                        alt={featuredPost.title}
                        className="absolute inset-0 h-full w-full object-cover transition duration-700 group-hover:scale-[1.03]"
                      />
                    ) : (
                      <div className="absolute inset-0 bg-[#0a0a0a]">
                        <div className="absolute inset-0 bg-[radial-gradient(at_35%_60%,rgba(109,40,217,0.35)_0%,transparent_65%)]" />
                        <div className="absolute inset-0 bg-[radial-gradient(at_75%_30%,rgba(212,175,55,0.08)_0%,transparent_55%)]" />
                      </div>
                    )}

                    <div className="absolute inset-0 bg-gradient-to-t from-[#050505] via-[#050505]/70 to-[#050505]/20" />

                    <div className="absolute inset-0 flex flex-col justify-end p-8 sm:p-12 lg:p-16">
                      <span className="mb-5 self-start rounded-full border border-[#D4AF37]/30 bg-[#D4AF37]/[0.08] px-4 py-1.5 text-xs font-semibold uppercase tracking-[0.15em] text-[#D4AF37]">
                        {formatCat(featuredPost.category)}
                      </span>
                      <h2 className="max-w-3xl text-4xl font-black leading-[1.0] tracking-tighter text-white sm:text-5xl lg:text-6xl">
                        {featuredPost.title}
                      </h2>
                      <p className="mt-4 max-w-2xl text-base leading-7 text-zinc-400">
                        {featuredPost.excerpt}
                      </p>
                      <div className="mt-6 flex flex-wrap items-center gap-5">
                        <p className="text-xs text-zinc-500">
                          {featuredPost.author?.name}
                          {featuredPost.createdAt && ` · ${formatDate(featuredPost.createdAt)}`}
                          {featuredPost.readTime && ` · ${featuredPost.readTime} min read`}
                        </p>
                        <span className="inline-flex items-center gap-2 rounded-xl bg-[#D4AF37] px-5 py-2.5 text-sm font-semibold text-[#050505] transition group-hover:bg-[#c09b28]">
                          Read Article
                          <ArrowRight size={15} />
                        </span>
                      </div>
                    </div>

                    {isPastor && (
                      <button
                        onClick={(e) => { e.preventDefault(); navigate(`/blog/edit/${featuredPost._id}`) }}
                        className="absolute right-5 top-5 flex h-9 w-9 items-center justify-center rounded-xl border border-white/10 bg-[#050505]/60 text-zinc-400 backdrop-blur-sm transition hover:border-white/20 hover:text-white"
                      >
                        <Edit3 size={14} />
                      </button>
                    )}
                  </div>
                </Link>
              </FadeUp>
            </div>
          </section>
        )}

        {/* ─── 3. SEARCH & FILTER ──────────────────────────────────── */}
        <section className="border-t border-white/[0.06] bg-[#050505]">
          <div className="mx-auto max-w-7xl px-4 pt-12 pb-0 sm:px-6 lg:px-8">
            <div className="flex flex-col gap-4 rounded-2xl border border-white/[0.06] bg-white/[0.02] p-4 backdrop-blur-sm sm:flex-row sm:items-center">
              <form onSubmit={handleSearch} className="relative flex-1">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-600" size={15} />
                <input
                  type="text"
                  placeholder="Search writings..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full rounded-xl border border-white/[0.06] bg-white/[0.03] py-3 pl-10 pr-4 text-sm text-zinc-300 placeholder-zinc-600 focus:border-[#D4AF37]/25 focus:outline-none"
                />
              </form>

              <div className="flex flex-wrap gap-2">
                {categories.map((cat) => (
                  <button
                    key={cat.id}
                    onClick={() => handleCategoryChange(cat.id)}
                    className={`rounded-full px-4 py-2 text-xs font-semibold transition ${
                      selectedCategory === cat.id
                        ? 'border border-[#D4AF37]/35 bg-[#D4AF37]/[0.08] text-[#D4AF37]'
                        : 'border border-white/[0.08] text-zinc-500 hover:border-white/15 hover:text-zinc-300'
                    }`}
                  >
                    {cat.name.toUpperCase()}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* ─── 4. ARTICLE GRID ─────────────────────────────────────── */}
        <section className="bg-[#050505]">
          <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
            {posts.length === 0 ? (
              <FadeUp>
                <div className="relative overflow-hidden rounded-3xl border border-white/[0.06] bg-white/[0.02] px-10 py-24 text-center">
                  <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_50%_65%,rgba(109,40,217,0.14)_0%,transparent_65%)]" />
                  <p className="relative text-xs font-semibold tracking-[0.35em] text-zinc-600">
                    COMING SOON
                  </p>
                  <h3 className="relative mt-6 text-4xl font-black leading-[0.95] tracking-tighter text-white sm:text-5xl">
                    <span className="block">NEW WRITINGS</span>
                    <span className="block">ARE COMING SOON</span>
                  </h3>
                  <p className="relative mx-auto mt-5 max-w-sm text-sm leading-7 text-zinc-500">
                    Teachings, reflections, and devotionals will appear here soon.
                  </p>
                  {isPastor && (
                    <button
                      onClick={() => navigate('/blog/create')}
                      className="relative mt-8 inline-flex items-center gap-2 rounded-xl bg-[#D4AF37] px-7 py-3.5 font-semibold text-[#050505] transition hover:bg-[#c09b28]"
                    >
                      <Plus size={16} />
                      Write First Post
                    </button>
                  )}
                </div>
              </FadeUp>
            ) : (
              <>
                <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
                  {posts.map((post, i) => {
                    const image = getPrimaryPostImage(post)
                    const firstLetter = post.title?.charAt(0) || 'E'

                    return (
                      <FadeUp key={post._id} delay={Math.min(i * 0.07, 0.28)}>
                        <Link
                          to={`/blog/${post._id}`}
                          className="group relative flex h-full flex-col overflow-hidden rounded-3xl border border-white/[0.06] bg-[#050505] transition hover:border-white/[0.1]"
                        >
                          {/* Thumbnail */}
                          <div className="relative aspect-[4/3] overflow-hidden">
                            {image ? (
                              <img
                                src={image}
                                alt={post.title}
                                className="h-full w-full object-cover transition duration-500 group-hover:scale-105"
                              />
                            ) : (
                              <div className="flex h-full w-full items-center justify-center bg-[#0a0a0a]">
                                <div className="absolute inset-0 bg-[radial-gradient(at_50%_60%,rgba(109,40,217,0.2)_0%,transparent_65%)]" />
                                <span className="relative text-8xl font-black text-white/[0.04] select-none">
                                  {firstLetter}
                                </span>
                              </div>
                            )}

                            <div className="absolute inset-0 bg-[#050505]/0 transition-colors duration-300 group-hover:bg-[#050505]/25" />

                            <div className="absolute left-4 top-4">
                              <span className="rounded-full border border-[#D4AF37]/25 bg-[#050505]/70 px-3 py-1 text-xs font-semibold uppercase tracking-[0.12em] text-[#D4AF37] backdrop-blur-sm">
                                {formatCat(post.category)}
                              </span>
                            </div>

                            {isPastor && (
                              <button
                                onClick={(e) => { e.preventDefault(); navigate(`/blog/edit/${post._id}`) }}
                                className="absolute right-4 top-4 flex h-8 w-8 items-center justify-center rounded-xl border border-white/10 bg-[#050505]/60 text-zinc-400 backdrop-blur-sm opacity-0 transition group-hover:opacity-100 hover:border-white/20 hover:text-white"
                              >
                                <Edit3 size={13} />
                              </button>
                            )}
                          </div>

                          {/* Content */}
                          <div className="flex flex-1 flex-col p-6">
                            <h3 className="text-xl font-black leading-snug tracking-tight text-white line-clamp-2 transition group-hover:text-zinc-100">
                              {post.title}
                            </h3>

                            {post.excerpt && (
                              <p className="mt-3 flex-1 text-sm leading-6 text-zinc-500 line-clamp-2">
                                {post.excerpt}
                              </p>
                            )}

                            <div className="mt-5 flex items-center justify-between">
                              <p className="text-xs text-zinc-600">
                                {formatDate(post.createdAt)}
                                {post.readTime && ` · ${post.readTime} min read`}
                              </p>
                              <span className="inline-flex items-center gap-1 text-xs font-semibold text-zinc-500 transition group-hover:text-[#D4AF37]">
                                Read
                                <ArrowRight size={13} />
                              </span>
                            </div>
                          </div>
                        </Link>
                      </FadeUp>
                    )
                  })}
                </div>

                {/* Pagination */}
                {totalPages > 1 && (
                  <div className="mt-14 flex items-center justify-center gap-2">
                    <button
                      onClick={() => handlePageChange(currentPage - 1)}
                      disabled={currentPage === 1}
                      className="flex h-10 w-10 items-center justify-center rounded-xl border border-white/[0.08] text-zinc-500 transition disabled:pointer-events-none disabled:opacity-30 hover:border-white/20 hover:text-zinc-200"
                    >
                      <ArrowLeft size={15} />
                    </button>

                    {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => {
                      let n
                      if (totalPages <= 5) n = i + 1
                      else if (currentPage <= 3) n = i + 1
                      else if (currentPage >= totalPages - 2) n = totalPages - 4 + i
                      else n = currentPage - 2 + i
                      return (
                        <button
                          key={n}
                          onClick={() => handlePageChange(n)}
                          className={`h-10 w-10 rounded-xl text-sm font-semibold transition ${
                            currentPage === n
                              ? 'bg-[#D4AF37] text-[#050505]'
                              : 'border border-white/[0.08] text-zinc-500 hover:border-white/20 hover:text-zinc-200'
                          }`}
                        >
                          {n}
                        </button>
                      )
                    })}

                    <button
                      onClick={() => handlePageChange(currentPage + 1)}
                      disabled={currentPage === totalPages}
                      className="flex h-10 w-10 items-center justify-center rounded-xl border border-white/[0.08] text-zinc-500 transition disabled:pointer-events-none disabled:opacity-30 hover:border-white/20 hover:text-zinc-200"
                    >
                      <ArrowRight size={15} />
                    </button>
                  </div>
                )}
              </>
            )}
          </div>
        </section>

        {/* ─── 5. STAY CONNECTED ───────────────────────────────────── */}
        <section className="border-t border-white/[0.06] bg-[#050505]">
          <div className="mx-auto max-w-7xl px-4 py-24 sm:px-6 lg:px-8">
            <div className="relative overflow-hidden rounded-3xl border border-[#D4AF37]/10 bg-[#D4AF37]/[0.02] px-8 py-20 text-center lg:px-20">
              <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_50%_0%,rgba(212,175,55,0.07)_0%,transparent_65%)]" />
              <FadeUp className="relative">
                <p className="text-xs font-semibold tracking-[0.35em] text-[#D4AF37]">NEWSLETTER</p>
                <h2 className="mt-6 text-5xl font-black leading-[0.92] tracking-tighter text-white lg:text-6xl">
                  <span className="block">STAY</span>
                  <span className="block">CONNECTED</span>
                </h2>
                <p className="mx-auto mt-6 max-w-sm text-base leading-7 text-zinc-400">
                  Receive teachings, devotionals, and ministry updates from Eternal Love Church.
                </p>
                <div className="mx-auto mt-8 flex max-w-md flex-col gap-3 sm:flex-row">
                  <input
                    type="email"
                    placeholder="Your email address"
                    className="flex-1 rounded-xl border border-white/[0.08] bg-white/[0.04] px-5 py-3.5 text-sm text-zinc-300 placeholder-zinc-600 focus:border-[#D4AF37]/25 focus:outline-none"
                  />
                  <button className="rounded-xl bg-[#D4AF37] px-6 py-3.5 font-semibold text-[#050505] transition hover:bg-[#c09b28]">
                    Subscribe
                  </button>
                </div>
              </FadeUp>
            </div>
          </div>
        </section>

        <PublicFooter />

      </main>
    </div>
  )
}
