// pages/BlogPost.jsx
import { useState, useEffect, useRef } from 'react'
import { motion, useInView } from 'framer-motion'
import { useParams, Link } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { ArrowLeft, Share2, Edit3 } from 'lucide-react'

import { blogAPI, analyticsAPI } from '../utils/api'
import CommentForm from '../components/blog/CommentForm'
import CommentList from '../components/blog/CommentList'
import SEO from '../components/SEO'
import { renderBlogContent } from '../utils/blogContent'
import PublicNavigation from '../components/layout/PublicNavigation'
import PublicFooter from '../components/layout/PublicFooter'

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

const CATEGORY_LABELS = {
  faith: 'FAITH', testimony: 'TESTIMONY', teaching: 'TEACHING',
  news: 'NEWS', devotional: 'DEVOTIONAL', announcement: 'ANNOUNCEMENT', events: 'EVENTS',
}

// Luxury prose styles for the article body — editorial journal feel
const PROSE_CLASSES = [
  'prose prose-invert max-w-none',
  // Paragraphs — airy, generous line-height
  '[&_p]:text-zinc-400 [&_p]:leading-[1.95] [&_p]:text-[1.05rem] [&_p]:mb-8',
  // Editorial headings — large, uppercase, section-break weight
  '[&_h2]:text-[2.5rem] [&_h2]:sm:text-[3.25rem] [&_h2]:font-black [&_h2]:tracking-tighter [&_h2]:text-white [&_h2]:uppercase [&_h2]:leading-[0.92] [&_h2]:mt-24 [&_h2]:mb-8',
  '[&_h3]:text-2xl [&_h3]:font-bold [&_h3]:tracking-tight [&_h3]:text-white [&_h3]:mt-14 [&_h3]:mb-5',
  // Inline elements
  '[&_strong]:text-white [&_strong]:font-semibold',
  '[&_a]:text-[#D4AF37] [&_a]:no-underline [&_a]:transition-opacity [&_a]:hover:opacity-70',
  // HR — breath break
  '[&_hr]:border-white/[0.06] [&_hr]:my-20',
  // Lists — editorial, no bullet chaos
  '[&_ul]:list-none [&_ul]:pl-0',
  '[&_ol]:pl-0',
  '[&_li]:text-zinc-400 [&_li]:leading-[1.85] [&_li]:mb-5 [&_li]:pl-5 [&_li]:border-l [&_li]:border-[#D4AF37]/25',
  // Scripture blocks — poster moment
  '[&_blockquote]:border-none [&_blockquote]:pl-0 [&_blockquote]:my-24',
  '[&_blockquote_p]:[font-style:normal] [&_blockquote_p]:text-[2rem] [&_blockquote_p]:sm:text-[2.75rem] [&_blockquote_p]:font-black [&_blockquote_p]:tracking-tighter [&_blockquote_p]:text-white [&_blockquote_p]:leading-[1.05] [&_blockquote_p]:text-center [&_blockquote_p]:before:content-none [&_blockquote_p]:after:content-none [&_blockquote_p]:mb-0',
  '[&_blockquote_footer]:block [&_blockquote_footer]:[font-style:normal] [&_blockquote_footer]:text-center [&_blockquote_footer]:mt-8 [&_blockquote_footer]:text-[0.65rem] [&_blockquote_footer]:tracking-[0.35em] [&_blockquote_footer]:text-[#D4AF37] [&_blockquote_footer]:font-semibold',
  // Images within content
  '[&_img]:rounded-2xl [&_img]:my-12',
].join(' ')

export default function BlogPost() {
  const { id } = useParams()
  const { user, isPastor } = useAuth()

  const [loading, setLoading] = useState(true)
  const [post, setPost] = useState(null)
  const [relatedPosts, setRelatedPosts] = useState([])
  const [comments, setComments] = useState([])

  useEffect(() => { fetchBlogPost() }, [id])

  const fetchBlogPost = async () => {
    try {
      setLoading(true)
      const postData = await blogAPI.getPost(id)
      setPost(postData)
      setComments(postData.comments || [])
      try {
        await analyticsAPI.trackPageView({
          path: window.location.pathname,
          referrer: document.referrer || null,
          timestamp: new Date().toISOString(),
          resource: 'blog',
          resource_id: postData._id || postData.id || id,
        })
      } catch {}
      const relatedData = await blogAPI.getPosts({ category: postData.category, limit: 3 })
      setRelatedPosts(relatedData.posts.filter(p => p._id !== postData._id).slice(0, 2))
    } catch {
      setSampleData()
    } finally {
      setLoading(false)
    }
  }

  const setSampleData = () => {
    setPost({
      _id: id,
      title: 'The Power of Love: Building a Spirit-Filled Life',
      excerpt: 'Discover how love as the foundation of all spiritual gifts can transform your relationship with God and others.',
      content: `
        <p>At Eternal Love Church, we believe that love is the foundation for all spiritual gifts. A believer's identity is shaped by love — not by talents or abilities. This truth transforms how we approach our faith journey.</p>
        <h2>Understanding Love as Our Foundation</h2>
        <p>Scripture tells us that God is love, and as believers created in His image, we are called to embody that love in every aspect of our lives.</p>
        <blockquote>
          <p>"If I speak in the tongues of men or of angels, but do not have love, I am only a resounding gong or a clanging cymbal."</p>
          <footer>— 1 Corinthians 13:1</footer>
        </blockquote>
        <h2>Living a Spirit-Filled Life</h2>
        <p>The Spirit-filled lifestyle is not a programme — it is a daily posture before God. Loving as He first loved us shapes everything.</p>
        <ul>
          <li>Daily surrender to the Holy Spirit's leading</li>
          <li>Operating in spiritual gifts with love as the motive</li>
          <li>Walking in victory, free from condemnation</li>
          <li>Bearing the fruit of the Spirit in every relationship</li>
        </ul>
        <h2>Discovering Your Purpose Through Love</h2>
        <p>One of our core values is helping believers discover, develop, and walk in their God-given purpose. This is why we host the Emerge Apostolic Conference annually — focusing on emerging and manifesting divine purpose through faith and prophetic revelation.</p>
        <p>Your talents and abilities are gifts from God, but they mean nothing without love. Let love be the motivation behind everything you do.</p>
      `,
      author: { name: 'Apostle Vangeli Sibisi & Prophetess Nokwanda Sibisi', role: 'Leadership' },
      createdAt: '2024-01-15T00:00:00.000Z',
      readTime: 6,
      category: 'teaching',
      featuredImage: '',
      galleryImages: [],
      tags: ['love', 'spirit-filled', 'purpose', 'Holy Spirit'],
      comments: [],
    })
    setComments([])
    setRelatedPosts([])
  }

  const handleShare = () => {
    if (navigator.share) {
      navigator.share({ title: post.title, text: post.excerpt, url: window.location.href })
    } else {
      navigator.clipboard.writeText(window.location.href)
    }
  }

  const handleCommentAdded = (newComment) => {
    let c = newComment || {}
    if (c.data) c = c.data
    if (c.comment) c = c.comment
    setComments(prev => [{
      _id: c._id || c.id || `new-${Date.now()}`,
      authorName: c.author_name || c.author?.name || c.authorName || user?.name || 'Guest',
      content: c.content || c.message || '',
      createdAt: c.created_at || c.createdAt || new Date().toISOString(),
      likes: Array.isArray(c.likes) ? c.likes : [],
      replies: Array.isArray(c.replies) ? c.replies : [],
    }, ...prev])
  }

  const formatDate = (d) =>
    new Date(d).toLocaleDateString('en-ZA', { year: 'numeric', month: 'long', day: 'numeric' })

  const getPrimaryImage = (a) => {
    if (!a) return ''
    if (Array.isArray(a.galleryImages) && a.galleryImages.length > 0)
      return a.galleryImages[0]?.url || a.galleryImages[0]
    return a.featuredImage || ''
  }

  const canonicalUrl = typeof window !== 'undefined'
    ? window.location.href
    : `https://elchurch.site/blog/${id}`

  const articleTags = Array.isArray(post?.tags) ? post.tags : []
  const heroImage = post ? getPrimaryImage(post) : ''

  // ─── Loading ───────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="min-h-screen bg-[#050505]">
        <PublicNavigation variant="dark" />
        <div className="flex min-h-[90vh] items-center justify-center">
          <div className="text-center">
            <div className="mx-auto h-10 w-10 animate-spin rounded-full border-2 border-white/[0.08] border-t-[#D4AF37]" />
            <p className="mt-8 text-xs font-semibold tracking-[0.35em] text-zinc-700">LOADING</p>
          </div>
        </div>
      </div>
    )
  }

  // ─── Not found ─────────────────────────────────────────────────────────────
  if (!post) {
    return (
      <div className="min-h-screen bg-[#050505]">
        <PublicNavigation variant="dark" />
        <div className="flex min-h-[90vh] flex-col items-center justify-center px-6 text-center">
          <p className="text-xs font-semibold tracking-[0.35em] text-zinc-600">NOT FOUND</p>
          <h1 className="mt-8 text-6xl font-black leading-[0.88] tracking-tighter text-white sm:text-8xl">
            <span className="block">THIS</span>
            <span className="block text-[#D4AF37]">WORD</span>
            <span className="block">HAS MOVED ON</span>
          </h1>
          <p className="mx-auto mt-8 max-w-sm text-sm leading-relaxed text-zinc-500">
            The article you are looking for may have been moved or is no longer available.
          </p>
          <Link
            to="/blog"
            className="mt-12 inline-flex items-center gap-2 text-xs font-semibold tracking-[0.25em] text-[#D4AF37] transition hover:opacity-70"
          >
            <ArrowLeft size={14} />
            BACK TO BLOG
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#050505]">
      <SEO
        type="article"
        title={post.title}
        description={post.excerpt}
        canonical={canonicalUrl}
        image={heroImage || '/church-og-image.jpg'}
        publishedTime={post.createdAt}
        modifiedTime={post.updatedAt || post.createdAt}
        author={post.author?.name}
        section={post.category}
        tags={articleTags}
      />

      <PublicNavigation variant="dark" />

      {/* ─── HERO — fullscreen cinematic ───────────────────────────────────────── */}
      <section className="relative min-h-[90vh] overflow-hidden">

        {/* Background: image or atmospheric glow */}
        {heroImage ? (
          <img
            src={heroImage}
            alt=""
            aria-hidden="true"
            className="absolute inset-0 h-full w-full object-cover"
          />
        ) : (
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_50%_25%,rgba(109,40,217,0.22)_0%,transparent_65%)]" />
        )}

        {/* Overlay */}
        <div
          className={`absolute inset-0 ${
            heroImage
              ? 'bg-gradient-to-t from-[#050505] via-[#050505]/80 to-[#050505]/25'
              : ''
          }`}
        />

        {/* Content — pinned to bottom */}
        <div className="relative flex min-h-[90vh] flex-col justify-end px-6 pb-20 sm:pb-28">
          <div className="mx-auto w-full max-w-4xl">
            <motion.div
              initial={{ opacity: 0, y: 36 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.1, ease }}
            >
              {/* Category · Date — one quiet line */}
              <p className="mb-8 text-xs font-semibold tracking-[0.35em] text-[#D4AF37]">
                {post.category && (CATEGORY_LABELS[post.category] || post.category.toUpperCase())}
                {post.category && post.createdAt && (
                  <span className="mx-3 text-zinc-700">·</span>
                )}
                {post.createdAt && formatDate(post.createdAt).toUpperCase()}
              </p>

              {/* Title — once, dominant */}
              <h1 className="text-5xl font-black leading-[0.9] tracking-tighter text-white sm:text-7xl lg:text-8xl xl:text-[6.5rem]">
                {post.title}
              </h1>

              {/* Excerpt */}
              {post.excerpt && (
                <p className="mt-8 max-w-2xl text-base leading-relaxed text-zinc-400 sm:text-lg">
                  {post.excerpt}
                </p>
              )}

              {/* Author + read time + actions */}
              <div className="mt-10 flex flex-wrap items-center gap-x-6 gap-y-3 border-t border-white/[0.08] pt-8">
                {post.author?.name && (
                  <p className="text-sm font-semibold tracking-[0.08em] text-white">
                    {post.author.name}
                  </p>
                )}
                {post.readTime && (
                  <>
                    <span className="text-zinc-700">·</span>
                    <p className="text-xs tracking-[0.2em] text-zinc-500">
                      {post.readTime} MIN READ
                    </p>
                  </>
                )}
                <div className="ml-auto flex items-center gap-5">
                  {isPastor && (
                    <Link
                      to={`/blog/edit/${post._id}`}
                      className="inline-flex items-center gap-1.5 text-xs font-semibold tracking-[0.2em] text-zinc-600 transition hover:text-[#D4AF37]"
                    >
                      <Edit3 size={11} />
                      EDIT
                    </Link>
                  )}
                  <button
                    onClick={handleShare}
                    aria-label="Share article"
                    className="inline-flex items-center gap-1.5 text-xs font-semibold tracking-[0.2em] text-zinc-600 transition hover:text-[#D4AF37]"
                  >
                    <Share2 size={12} />
                    SHARE
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* ─── ARTICLE ───────────────────────────────────────────────────────────── */}
      <article>

        {/* Back link — quiet, contextual */}
        <div className="mx-auto max-w-4xl px-6 pt-14 pb-2">
          <Link
            to="/blog"
            className="inline-flex items-center gap-2 text-xs font-semibold tracking-[0.25em] text-zinc-700 transition hover:text-white"
          >
            <ArrowLeft size={12} />
            ALL ARTICLES
          </Link>
        </div>

        {/* Gallery images — only when multiple */}
        {Array.isArray(post.galleryImages) && post.galleryImages.length > 1 && (
          <FadeUp className="mx-auto max-w-5xl px-6 pt-12 pb-4">
            <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
              {post.galleryImages.map((image, i) => (
                <div key={`${image?.url || image}-${i}`} className="overflow-hidden rounded-2xl">
                  <img
                    src={image?.url || image}
                    alt={`${post.title} ${i + 1}`}
                    className="h-48 w-full object-cover transition duration-500 hover:scale-[1.04]"
                  />
                </div>
              ))}
            </div>
          </FadeUp>
        )}

        {/* ── PROSE — narrow luxury reading column ─────────────────────────────── */}
        <FadeUp className="mx-auto max-w-2xl px-6 pt-16 pb-16 sm:pt-20 sm:pb-20">
          <div
            className={PROSE_CLASSES}
            dangerouslySetInnerHTML={{ __html: renderBlogContent(post.content) }}
          />
        </FadeUp>

        {/* Tags — minimal, no pills */}
        {articleTags.length > 0 && (
          <FadeUp className="mx-auto max-w-2xl px-6 pb-20">
            <div className="flex flex-wrap gap-x-6 gap-y-2 border-t border-white/[0.06] pt-8">
              {articleTags.map((tag, i) => (
                <span key={i} className="text-xs font-semibold tracking-[0.22em] text-zinc-700">
                  #{tag.toUpperCase()}
                </span>
              ))}
            </div>
          </FadeUp>
        )}

        {/* ── REFLECTIONS ───────────────────────────────────────────────────────── */}
        <FadeUp className="mx-auto max-w-2xl px-6 pb-32">
          <div className="border-t border-white/[0.06] pt-16">
            <p className="mb-10 text-xs font-semibold tracking-[0.35em] text-zinc-600">
              LEAVE A REFLECTION
            </p>
            <CommentForm
              postId={post._id}
              onCommentAdded={handleCommentAdded}
              placeholder="What did this word speak to you?"
            />
            {comments.length > 0 && (
              <div className="mt-14">
                <CommentList
                  comments={comments}
                  postId={post._id}
                  onCommentsUpdate={setComments}
                />
              </div>
            )}
          </div>
        </FadeUp>
      </article>

      {/* ─── CONTINUE READING ──────────────────────────────────────────────────── */}
      {relatedPosts.length > 0 && (
        <section className="border-t border-white/[0.04] py-28">
          <div className="mx-auto max-w-5xl px-6">
            <FadeUp>
              <h2 className="mb-14 text-5xl font-black leading-[0.9] tracking-tighter text-white sm:text-6xl lg:text-7xl">
                <span className="block">CONTINUE</span>
                <span className="block text-[#D4AF37]">READING</span>
              </h2>
              <div className="grid gap-5 sm:grid-cols-2">
                {relatedPosts.map((related) => {
                  const relImg = getPrimaryImage(related)
                  return (
                    <Link
                      key={related._id}
                      to={`/blog/${related._id}`}
                      className="group relative overflow-hidden rounded-3xl border border-white/[0.06] bg-white/[0.02] transition duration-300 hover:border-white/[0.12]"
                    >
                      {/* Thumbnail */}
                      <div className="relative h-56 overflow-hidden">
                        {relImg ? (
                          <img
                            src={relImg}
                            alt={related.title}
                            className="h-full w-full object-cover transition duration-700 group-hover:scale-[1.05]"
                          />
                        ) : (
                          <div className="flex h-full items-center justify-center bg-white/[0.02]">
                            <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_50%_50%,rgba(109,40,217,0.1)_0%,transparent_70%)]" />
                            <span className="text-8xl font-black text-white/[0.04]">
                              {related.title?.[0]?.toUpperCase()}
                            </span>
                          </div>
                        )}
                        <div className="absolute inset-0 bg-gradient-to-t from-[#050505]/70 to-transparent" />
                      </div>

                      {/* Meta */}
                      <div className="p-8">
                        {related.category && (
                          <p className="mb-3 text-xs font-semibold tracking-[0.3em] text-[#D4AF37]">
                            {CATEGORY_LABELS[related.category] || related.category.toUpperCase()}
                          </p>
                        )}
                        <h3 className="text-xl font-bold leading-snug tracking-tight text-white line-clamp-2 transition duration-300 group-hover:text-zinc-200">
                          {related.title}
                        </h3>
                        <div className="mt-5 flex items-center justify-between text-xs tracking-[0.15em] text-zinc-700">
                          <span>{formatDate(related.createdAt)}</span>
                          {related.readTime && <span>{related.readTime} MIN READ</span>}
                        </div>
                      </div>
                    </Link>
                  )
                })}
              </div>
            </FadeUp>
          </div>
        </section>
      )}

      {/* ─── CTA ───────────────────────────────────────────────────────────────── */}
      <section className="relative overflow-hidden border-t border-white/[0.04] py-36">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_50%_100%,rgba(109,40,217,0.2)_0%,transparent_55%)]" />
        <FadeUp className="relative mx-auto max-w-4xl px-6 text-center">
          <p className="text-xs font-semibold tracking-[0.35em] text-zinc-600">
            ETERNAL LOVE CHURCH · MTUBATUBA
          </p>
          <h2 className="mt-8 text-6xl font-black leading-[0.88] tracking-tighter text-white sm:text-8xl lg:text-9xl">
            <span className="block">EXPERIENCE</span>
            <span className="block text-[#D4AF37]">THE LOVE</span>
            <span className="block">OF GOD</span>
          </h2>
          <p className="mx-auto mt-8 max-w-sm text-sm leading-relaxed text-zinc-500">
            Join our Spirit-filled community in Mtubatuba. Every Sunday is an encounter with the living God.
          </p>
          <div className="mt-12 flex flex-col items-center gap-4 sm:flex-row sm:justify-center">
            <Link
              to="/contact"
              className="rounded-full bg-[#D4AF37] px-10 py-4 text-xs font-bold tracking-[0.2em] text-[#050505] transition hover:opacity-90"
            >
              VISIT THIS SUNDAY
            </Link>
            <Link
              to="/sermons"
              className="rounded-full border border-white/[0.1] px-10 py-4 text-xs font-bold tracking-[0.2em] text-white transition hover:border-white/[0.25]"
            >
              WATCH SERMONS
            </Link>
          </div>
        </FadeUp>
      </section>

      <PublicFooter />
    </div>
  )
}
