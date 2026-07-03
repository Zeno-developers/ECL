import { useEffect, useRef, useState } from 'react'
import { motion, useInView, AnimatePresence } from 'framer-motion'
import { Image as ImageIcon, X, ExternalLink, ZoomIn } from 'lucide-react'
import { homeImagesAPI, resolveUploadUrl } from '../utils/api'
import { useAuth } from '../contexts/AuthContext'
import GalleryUpload from '../components/gallery/GalleryUpload'
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

export default function Gallery() {
  const { user } = useAuth()
  const [images, setImages] = useState([])
  const [loading, setLoading] = useState(true)
  const [selected, setSelected] = useState(null)

  const fetchImages = async () => {
    try {
      setLoading(true)
      const res = await homeImagesAPI.getBySection('resources')
      const data = res && res.data ? res.data : (Array.isArray(res) ? res : [])
      setImages(Array.isArray(data) ? data : [])
    } catch (err) {
      console.error('Failed to load gallery images', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { fetchImages() }, [])

  const canUpload = user && ['admin', 'pastor', 'superadmin', 'elder'].includes(user.role)

  return (
    <div className="min-h-screen bg-[#050505] text-zinc-100">
      <PublicNavigation variant="dark" />

      {/* ─── HERO ─────────────────────────────────────────────────── */}
      <section className="relative flex min-h-[82vh] flex-col items-center justify-center overflow-hidden px-4 pb-24 pt-32 text-center sm:px-6 lg:px-8">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_80%_60%_at_50%_0%,rgba(109,40,217,0.2)_0%,transparent_70%)]" />

        <motion.p
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.55, ease }}
          className="text-xs font-semibold tracking-[0.4em] text-[#D4AF37]"
        >
          OUR COMMUNITY
        </motion.p>

        <motion.h1
          initial={{ opacity: 0, y: 32 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.75, delay: 0.1, ease }}
          className="mt-8 text-6xl font-black leading-[0.92] tracking-tighter text-white sm:text-7xl lg:text-8xl"
        >
          <span className="block">MOMENTS</span>
          <span className="block text-[#D4AF37]">CAPTURED.</span>
        </motion.h1>

        <motion.p
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.65, delay: 0.25, ease }}
          className="mt-8 max-w-md text-base leading-7 text-zinc-400 sm:text-lg"
        >
          Celebrations, worship, and life together — glimpses of who we are.
        </motion.p>

        {canUpload && (
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.65, delay: 0.38, ease }}
            className="mt-10"
          >
            <GalleryUpload onSuccess={fetchImages} />
          </motion.div>
        )}

        {/* scroll hint */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 1, delay: 0.8 }}
          className="absolute bottom-10 left-1/2 -translate-x-1/2"
        >
          <div className="flex flex-col items-center gap-2">
            <span className="text-[10px] tracking-[0.3em] text-zinc-600">SCROLL</span>
            <motion.div
              animate={{ y: [0, 6, 0] }}
              transition={{ duration: 1.4, repeat: Infinity, ease: 'easeInOut' }}
              className="h-5 w-px bg-gradient-to-b from-zinc-600 to-transparent"
            />
          </div>
        </motion.div>
      </section>

      {/* ─── DIVIDER ──────────────────────────────────────────────── */}
      <div className="mx-auto max-w-7xl px-6">
        <div className="h-px bg-gradient-to-r from-transparent via-white/[0.08] to-transparent" />
      </div>

      {/* ─── GRID ─────────────────────────────────────────────────── */}
      <section className="px-6 py-20">
        <div className="max-w-7xl mx-auto">

          {/* Loading */}
          {loading && (
            <div className="flex items-center justify-center py-32">
              <div className="h-10 w-10 rounded-full border-2 border-[#D4AF37]/20 border-t-[#D4AF37] animate-spin" />
            </div>
          )}

          {/* Empty */}
          {!loading && images.length === 0 && (
            <FadeUp>
              <div className="relative overflow-hidden rounded-3xl border border-white/[0.06] bg-white/[0.02] py-28 px-8 text-center">
                <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_60%_50%_at_50%_100%,rgba(109,40,217,0.08)_0%,transparent_70%)]" />
                <p className="text-[10px] font-semibold tracking-[0.4em] text-[#D4AF37] mb-8">GALLERY</p>
                <h3 className="text-5xl sm:text-6xl font-black tracking-tighter text-white leading-[0.92] mb-6">
                  <span className="block">NEW MOMENTS</span>
                  <span className="block text-zinc-600">COMING SOON.</span>
                </h3>
                <p className="text-zinc-500 text-sm max-w-sm mx-auto leading-relaxed">
                  Worship gatherings, celebrations, and church life — moments will appear here soon.
                </p>
              </div>
            </FadeUp>
          )}

          {/* Masonry */}
          {!loading && images.length > 0 && (
            <>
              <FadeUp delay={0.05}>
                <p className="text-[10px] tracking-[0.3em] text-zinc-700 uppercase mb-10">
                  {images.length} moment{images.length !== 1 ? 's' : ''}
                </p>
              </FadeUp>
              <div className="columns-2 sm:columns-3 lg:columns-4 gap-3 space-y-3">
                {images.map((img, i) => (
                  <motion.div
                    key={img.id || img.image_url}
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true, margin: '-40px' }}
                    transition={{ duration: 0.55, delay: Math.min(i * 0.05, 0.25), ease }}
                    className="break-inside-avoid mb-3"
                  >
                    <button
                      className="group relative w-full overflow-hidden rounded-2xl border border-white/[0.06] bg-white/[0.03] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#D4AF37]"
                      onClick={() => setSelected(img)}
                    >
                      <img
                        src={resolveUploadUrl(img.image_url)}
                        alt={img.alt_text || img.title || 'Gallery image'}
                        className="w-full h-auto block transition-transform duration-700 group-hover:scale-105"
                        onError={(e) => {
                          e.target.src = 'https://via.placeholder.com/400x300/0d0d0d/333?text=+'
                        }}
                      />
                      {/* cinematic vignette */}
                      <div className="absolute inset-0 bg-[linear-gradient(to_top,rgba(5,5,5,0.85)_0%,transparent_55%)] opacity-0 transition-opacity duration-400 group-hover:opacity-100" />
                      {/* zoom icon */}
                      <div className="absolute inset-0 flex items-center justify-center opacity-0 transition-opacity duration-300 group-hover:opacity-100">
                        <div className="rounded-full border border-[#D4AF37]/40 bg-black/40 p-2.5 backdrop-blur-sm">
                          <ZoomIn size={16} className="text-[#D4AF37]" />
                        </div>
                      </div>
                      {/* title slide-up */}
                      {img.title && (
                        <div className="absolute bottom-0 inset-x-0 p-4 translate-y-2 opacity-0 transition-all duration-300 group-hover:translate-y-0 group-hover:opacity-100">
                          <p className="text-xs font-semibold tracking-wide text-white line-clamp-2 drop-shadow-lg">
                            {img.title}
                          </p>
                        </div>
                      )}
                    </button>
                  </motion.div>
                ))}
              </div>
            </>
          )}
        </div>
      </section>

      {/* ─── LIGHTBOX ─────────────────────────────────────────────── */}
      <AnimatePresence>
        {selected && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-[#050505]/95 p-4 backdrop-blur-2xl"
            onClick={() => setSelected(null)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.94, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.94, y: 20 }}
              transition={{ duration: 0.28, ease }}
              className="relative w-full max-w-5xl overflow-hidden rounded-3xl border border-white/[0.08] bg-[#0a0a0a]"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Header */}
              <div className="flex items-center justify-between gap-4 px-6 py-5 border-b border-white/[0.06]">
                <div>
                  {selected.title && (
                    <h2 className="font-black tracking-tight text-white">{selected.title}</h2>
                  )}
                  {selected.description && (
                    <p className="text-sm text-zinc-500 mt-0.5">{selected.description}</p>
                  )}
                  {!selected.title && (
                    <p className="text-xs tracking-[0.25em] text-zinc-600">GALLERY</p>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <a
                    href={resolveUploadUrl(selected.image_url)}
                    target="_blank"
                    rel="noreferrer"
                    className="flex h-9 w-9 items-center justify-center rounded-full border border-white/[0.08] text-zinc-500 transition hover:border-[#D4AF37]/40 hover:text-[#D4AF37]"
                  >
                    <ExternalLink size={15} />
                  </a>
                  <button
                    onClick={() => setSelected(null)}
                    className="flex h-9 w-9 items-center justify-center rounded-full border border-white/[0.08] text-zinc-500 transition hover:border-white/20 hover:text-zinc-200"
                  >
                    <X size={15} />
                  </button>
                </div>
              </div>

              {/* Image */}
              <div className="flex items-center justify-center bg-black/60 p-6">
                <img
                  src={resolveUploadUrl(selected.image_url)}
                  alt={selected.title || 'Gallery image'}
                  className="max-h-[72vh] w-auto max-w-full rounded-xl object-contain"
                  onError={(e) => {
                    e.target.src = 'https://via.placeholder.com/800x600/0a0a0a/333?text=Image+Not+Found'
                  }}
                />
              </div>

              {/* Footer */}
              <div className="border-t border-white/[0.06] px-6 py-3">
                <p className="text-center text-[10px] tracking-[0.25em] text-zinc-700 uppercase">
                  Eternal Love Church · We love God and love people
                </p>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <PublicFooter />
    </div>
  )
}
