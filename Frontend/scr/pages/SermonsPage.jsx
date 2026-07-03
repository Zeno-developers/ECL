import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, useInView } from 'framer-motion'
import {
  ArrowRight,
  Download,
  Headphones,
  Pause,
  Play,
  Search,
  Volume2,
  VolumeX,
  X,
} from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'
import { sermonsAPI } from '../utils/api'
import PublicNavigation from '../components/layout/PublicNavigation'
import PublicFooter from '../components/layout/PublicFooter'
import { toast } from 'react-toastify'

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

function formatDate(value) {
  if (!value) return ''
  const d = new Date(value)
  if (Number.isNaN(d.getTime())) return ''
  return d.toLocaleDateString('en-ZA', { day: 'numeric', month: 'short', year: 'numeric' })
}

export default function SermonsPage() {
  const { isPastor } = useAuth()
  const navigate = useNavigate()

  const [sermons, setSermons] = useState([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('all')
  const [searchTerm, setSearchTerm] = useState('')
  const [series, setSeries] = useState([])
  const [selectedSeries, setSelectedSeries] = useState('')
  const [currentPlayer, setCurrentPlayer] = useState(null)
  const videoRef = useRef(null)
  const audioRef = useRef(null)
  const [isPlaying, setIsPlaying] = useState(false)
  const [volume, setVolume] = useState(1)
  const [muted, setMuted] = useState(false)
  const [imageErrors, setImageErrors] = useState(new Set())
  const [generatedThumbnails, setGeneratedThumbnails] = useState({})

  useEffect(() => {
    loadSermons()
    loadSeries()
  }, [])

  const loadSermons = async () => {
    try {
      const data = await sermonsAPI.getPublicSermons()
      setSermons(data)
    } catch (error) {
      console.error('Failed to load sermons:', error)
      toast.error('Failed to load messages')
    } finally {
      setLoading(false)
    }
  }

  const loadSeries = async () => {
    try {
      const data = await sermonsAPI.getPublicSermonSeries()
      setSeries(data)
    } catch (error) {
      console.error('Failed to load series:', error)
    }
  }

  const isYouTubeUrl = (url) => {
    if (!url) return false
    return /youtu(?:\.be|be\.com)/i.test(url)
  }

  const getYouTubeId = (url) => {
    if (!url) return null
    const watchMatch = url.match(/[?&]v=([0-9A-Za-z_-]{11})/)
    if (watchMatch?.[1]) return watchMatch[1]
    const embedMatch = url.match(/embed\/([0-9A-Za-z_-]{11})/)
    if (embedMatch?.[1]) return embedMatch[1]
    const shortMatch = url.match(/youtu\.be\/([0-9A-Za-z_-]{11})/)
    if (shortMatch?.[1]) return shortMatch[1]
    return null
  }

  const toYouTubeEmbedUrl = (url) => {
    const id = getYouTubeId(url)
    if (!id) return url
    return `https://www.youtube.com/embed/${id}`
  }

  const getYouTubeThumbnail = (url) => {
    const id = getYouTubeId(url)
    if (!id) return ''
    return `https://img.youtube.com/vi/${id}/hqdefault.jpg`
  }

  const getThumbnailSrc = (sermon) => {
    if (!sermon) return ''
    if (sermon.thumbnailUrl) return sermonsAPI.getThumbnailUrl(sermon.thumbnailUrl)
    const rawVideo = sermon.videoUrl ? sermonsAPI.getVideoUrl(sermon.videoUrl) : ''
    if (rawVideo && isYouTubeUrl(rawVideo)) return getYouTubeThumbnail(rawVideo)
    return generatedThumbnails[sermon._id || sermon.id] || ''
  }

  const playSermon = async (sermon) => {
    try {
      if (sermon.videoUrl) {
        const rawUrl = sermonsAPI.getVideoUrl(sermon.videoUrl)
        if (isYouTubeUrl(rawUrl)) {
          setCurrentPlayer({
            type: 'embed',
            sermonId: sermon._id,
            url: toYouTubeEmbedUrl(rawUrl),
            originalUrl: rawUrl,
            title: sermon.title,
            speaker: sermon.speaker,
          })
        } else {
          setCurrentPlayer({
            type: 'video',
            sermonId: sermon._id,
            url: rawUrl,
            originalUrl: rawUrl,
            title: sermon.title,
            speaker: sermon.speaker,
          })
        }
      } else if (sermon.audioUrl) {
        setCurrentPlayer({
          type: 'audio',
          sermonId: sermon._id,
          url: sermonsAPI.getAudioUrl(sermon.audioUrl),
          originalUrl: sermonsAPI.getAudioUrl(sermon.audioUrl),
          title: sermon.title,
          speaker: sermon.speaker,
        })
      }
    } catch (error) {
      console.error('Error playing media:', error)
      toast.error('Media unavailable. Try downloading instead.')
    }
  }

  const closePlayer = () => {
    setCurrentPlayer(null)
    setIsPlaying(false)
    if (videoRef.current) {
      videoRef.current.pause()
      videoRef.current = null
    }
    if (audioRef.current) {
      audioRef.current.pause()
      audioRef.current = null
    }
  }

  const togglePlayPause = () => {
    if (currentPlayer?.type === 'video' && videoRef.current) {
      if (videoRef.current.paused) { videoRef.current.play(); setIsPlaying(true) }
      else { videoRef.current.pause(); setIsPlaying(false) }
    } else if (currentPlayer?.type === 'audio' && audioRef.current) {
      if (audioRef.current.paused) { audioRef.current.play(); setIsPlaying(true) }
      else { audioRef.current.pause(); setIsPlaying(false) }
    }
  }

  const toggleMute = () => {
    const next = !muted
    setMuted(next)
    if (videoRef.current) videoRef.current.muted = next
    if (audioRef.current) audioRef.current.muted = next
  }

  const handleVolumeChange = (e) => {
    const v = parseFloat(e.target.value)
    setVolume(v)
    if (videoRef.current) videoRef.current.volume = v
    if (audioRef.current) audioRef.current.volume = v
    setMuted(v === 0)
  }

  const downloadSermon = async (sermon, type) => {
    try {
      if (type === 'video' && sermon.videoUrl) window.open(sermonsAPI.getVideoUrl(sermon.videoUrl), '_blank')
      else if (type === 'audio' && sermon.audioUrl) window.open(sermonsAPI.getAudioUrl(sermon.audioUrl), '_blank')
    } catch (error) {
      console.error('Download failed:', error)
      toast.error('Download failed')
    }
  }

  const handleImageError = (sermonId) => {
    setImageErrors((prev) => new Set(prev).add(sermonId))
  }

  const filteredSermons = sermons.filter((sermon) => {
    if (filter === 'video' && !sermon.videoUrl) return false
    if (filter === 'audio' && !sermon.audioUrl) return false
    if (selectedSeries && sermon.series !== selectedSeries) return false
    if (searchTerm) {
      const term = searchTerm.toLowerCase()
      return (
        (sermon.title || '').toLowerCase().includes(term) ||
        (sermon.speaker || '').toLowerCase().includes(term) ||
        (sermon.description || '').toLowerCase().includes(term) ||
        (sermon.series || '').toLowerCase().includes(term)
      )
    }
    return true
  })

  const hasActiveFilter = searchTerm || selectedSeries || filter !== 'all'
  const featuredSermon = sermons[0] || null

  return (
    <div className="min-h-screen bg-[#050505] text-zinc-100">
      <PublicNavigation variant="dark" />

      {/* ─── MEDIA PLAYER MODAL ───────────────────────────────────── */}
      {currentPlayer && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-[#050505]/90 p-4 backdrop-blur-2xl"
          onClick={(e) => { if (e.target === e.currentTarget) closePlayer() }}
        >
          <div className="w-full max-w-4xl overflow-hidden rounded-3xl border border-white/[0.08] bg-[#0d0d0d]">
            <div className="flex items-start justify-between gap-4 px-8 pb-5 pt-8">
              <div>
                <h3 className="text-xl font-black leading-snug tracking-tight text-white">
                  {currentPlayer.title}
                </h3>
                <p className="mt-1 text-sm text-zinc-500">{currentPlayer.speaker}</p>
              </div>
              <button
                onClick={closePlayer}
                className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-white/10 text-zinc-500 transition hover:border-white/20 hover:text-zinc-200"
              >
                <X size={16} />
              </button>
            </div>

            <div className="px-8 pb-4">
              {currentPlayer.type === 'video' && (
                <div className="overflow-hidden rounded-2xl bg-black">
                  <video
                    ref={videoRef}
                    src={currentPlayer.url}
                    controls
                    className="w-full"
                    onPlay={() => setIsPlaying(true)}
                    onPause={() => setIsPlaying(false)}
                    onEnded={() => setIsPlaying(false)}
                    onError={() => toast.error('Failed to load video. Try downloading instead.')}
                    autoPlay
                    crossOrigin="anonymous"
                  />
                </div>
              )}

              {currentPlayer.type === 'audio' && (
                <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-8">
                  <div className="flex flex-wrap items-center gap-5">
                    <button
                      onClick={togglePlayPause}
                      className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-[#D4AF37] text-[#050505] transition hover:bg-[#c09b28]"
                    >
                      {isPlaying ? <Pause size={22} /> : <Play size={22} />}
                    </button>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-semibold tracking-[0.2em] text-zinc-600">NOW PLAYING</p>
                      <p className="mt-0.5 truncate font-bold text-white">{currentPlayer.title}</p>
                      <p className="text-xs text-zinc-500">{currentPlayer.speaker}</p>
                    </div>
                    <div className="flex items-center gap-3">
                      <button onClick={toggleMute} className="text-zinc-500 transition hover:text-zinc-200">
                        {muted ? <VolumeX size={18} /> : <Volume2 size={18} />}
                      </button>
                      <input
                        type="range"
                        min="0"
                        max="1"
                        step="0.1"
                        value={volume}
                        onChange={handleVolumeChange}
                        className="w-20 accent-[#D4AF37]"
                      />
                    </div>
                  </div>
                  <audio
                    ref={audioRef}
                    src={currentPlayer.url}
                    onPlay={() => setIsPlaying(true)}
                    onPause={() => setIsPlaying(false)}
                    onEnded={() => setIsPlaying(false)}
                    onError={() => toast.error('Failed to load audio. Try downloading instead.')}
                    autoPlay
                    crossOrigin="anonymous"
                  />
                </div>
              )}

              {currentPlayer.type === 'embed' && (
                <div className="overflow-hidden rounded-2xl bg-black">
                  <div className="aspect-video">
                    <iframe
                      title={currentPlayer.title || 'Sermon video'}
                      src={`${currentPlayer.url}${currentPlayer.url.includes('?') ? '&' : '?'}autoplay=1`}
                      className="h-full w-full border-0"
                      allow="autoplay; encrypted-media; picture-in-picture"
                      allowFullScreen
                    />
                  </div>
                </div>
              )}
            </div>

            <div className="border-t border-white/[0.06] px-8 py-5">
              <button
                onClick={() => {
                  if (currentPlayer.type === 'embed') {
                    window.open(currentPlayer.originalUrl || currentPlayer.url, '_blank')
                    return
                  }
                  downloadSermon(
                    {
                      _id: currentPlayer.sermonId,
                      [currentPlayer.type === 'video' ? 'videoUrl' : 'audioUrl']: currentPlayer.url,
                    },
                    currentPlayer.type,
                  )
                }}
                className="inline-flex items-center gap-2 rounded-xl border border-white/10 px-4 py-2 text-sm font-semibold text-zinc-400 transition hover:border-white/20 hover:text-zinc-200"
              >
                <Download size={15} />
                {currentPlayer.type === 'embed' ? 'Open Source' : `Download ${currentPlayer.type === 'video' ? 'Video' : 'Audio'}`}
              </button>
            </div>
          </div>
        </div>
      )}

      <main>

        {/* ─── 1. HERO ─────────────────────────────────────────────── */}
        <section className="relative flex min-h-[82vh] flex-col items-center justify-center overflow-hidden px-4 pb-24 pt-32 text-center sm:px-6 lg:px-8">
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_80%_55%_at_50%_0%,rgba(109,40,217,0.22)_0%,transparent_70%)]" />

          <motion.p
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.55, ease }}
            className="text-xs font-semibold tracking-[0.4em] text-[#D4AF37]"
          >
            MESSAGES &middot; TEACHING &middot; ENCOUNTERS
          </motion.p>

          <motion.h1
            initial={{ opacity: 0, y: 32 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.75, delay: 0.1, ease }}
            className="mt-8 text-6xl font-black leading-[0.9] tracking-tighter text-white sm:text-7xl lg:text-8xl xl:text-9xl"
          >
            <span className="block">WATCH</span>
            <span className="block text-[#D4AF37]">THE LATEST</span>
            <span className="block">MESSAGES</span>
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.65, delay: 0.22, ease }}
            className="mt-8 max-w-lg text-base leading-7 text-zinc-400 sm:text-lg"
          >
            Experience Spirit-filled teaching, apostolic truth, and messages centered on the
            transforming love of God.
          </motion.p>

          {isPastor && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.5, delay: 0.5, ease }}
              className="mt-8"
            >
              <button
                onClick={() => navigate('/sermons/manage')}
                className="rounded-lg border border-white/10 px-4 py-2 text-xs font-semibold text-zinc-500 transition hover:border-white/20 hover:text-zinc-300"
              >
                Manage Messages
              </button>
            </motion.div>
          )}
        </section>

        {/* ─── 2. FEATURED MESSAGE ─────────────────────────────────── */}
        <section className="bg-[#050505]">
          <div className="mx-auto max-w-7xl px-4 py-24 sm:px-6 lg:px-8">
            <FadeUp>
              <p className="text-xs font-semibold tracking-[0.35em] text-[#D4AF37]">
                FEATURED MESSAGE
              </p>
            </FadeUp>

            <FadeUp delay={0.1} className="mt-8">
              <div className="relative overflow-hidden rounded-3xl border border-[#6D28D9]/15 p-10 sm:p-16">
                <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(135deg,rgba(109,40,217,0.12)_0%,rgba(5,5,5,0)_60%)]" />
                <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_85%_20%,rgba(109,40,217,0.22)_0%,transparent_60%)]" />

                {featuredSermon && getThumbnailSrc(featuredSermon) && !imageErrors.has(featuredSermon._id || featuredSermon.id) && (
                  <>
                    <div
                      className="pointer-events-none absolute inset-0 bg-cover bg-center opacity-10"
                      style={{ backgroundImage: `url(${getThumbnailSrc(featuredSermon)})` }}
                    />
                    <div className="pointer-events-none absolute inset-0 bg-[#050505]/60" />
                  </>
                )}

                <div className="relative">
                  <h2 className="text-6xl font-black leading-[0.88] tracking-tighter text-white sm:text-7xl lg:text-8xl">
                    <span className="block">THE LOVE</span>
                    <span className="block">OF GOD</span>
                    <span className="block text-[#D4AF37]">IN ACTION</span>
                  </h2>

                  {featuredSermon ? (
                    <>
                      <p className="mt-5 text-lg font-semibold text-zinc-300">
                        {featuredSermon.title}
                      </p>
                      <p className="text-sm text-zinc-500">
                        {featuredSermon.speaker}{featuredSermon.date && ` · ${formatDate(featuredSermon.date)}`}
                      </p>
                    </>
                  ) : (
                    <p className="mt-6 max-w-md text-base leading-7 text-zinc-400">
                      A message centered on transformation through the love and power of God.
                    </p>
                  )}

                  <button
                    onClick={() => featuredSermon ? playSermon(featuredSermon) : navigate('/contact')}
                    className="mt-8 inline-flex items-center gap-2 rounded-xl bg-[#D4AF37] px-7 py-3.5 font-semibold text-[#050505] transition hover:bg-[#c09b28]"
                  >
                    <Play size={17} />
                    {featuredSermon ? 'Watch Message' : 'Visit The Church'}
                  </button>
                </div>
              </div>
            </FadeUp>
          </div>
        </section>

        {/* ─── 3. SEARCH & FILTER ──────────────────────────────────── */}
        <section className="bg-[#050505]">
          <div className="mx-auto max-w-7xl px-4 pt-12 pb-0 sm:px-6 lg:px-8">
            <div className="flex flex-col gap-4 rounded-2xl border border-white/[0.06] bg-white/[0.02] p-4 backdrop-blur-sm sm:flex-row sm:items-center">
              <div className="relative flex-1">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-600" size={15} />
                <input
                  type="text"
                  placeholder="Search messages..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full rounded-xl border border-white/[0.06] bg-white/[0.03] py-3 pl-10 pr-4 text-sm text-zinc-300 placeholder-zinc-600 focus:border-[#D4AF37]/25 focus:outline-none"
                />
              </div>

              <div className="flex flex-wrap items-center gap-2">
                {['all', 'video', 'audio'].map((f) => (
                  <button
                    key={f}
                    onClick={() => setFilter(f)}
                    className={`rounded-full px-4 py-2 text-xs font-semibold transition ${
                      filter === f
                        ? 'border border-[#D4AF37]/35 bg-[#D4AF37]/[0.08] text-[#D4AF37]'
                        : 'border border-white/[0.08] text-zinc-500 hover:border-white/15 hover:text-zinc-300'
                    }`}
                  >
                    {f === 'all' ? 'ALL' : f.toUpperCase()}
                  </button>
                ))}

                {series.length > 0 && (
                  <select
                    value={selectedSeries}
                    onChange={(e) => setSelectedSeries(e.target.value)}
                    className="rounded-xl border border-white/[0.08] bg-white/[0.03] px-3 py-2 text-xs text-zinc-400 focus:border-[#D4AF37]/25 focus:outline-none"
                  >
                    <option value="">All Series</option>
                    {series.map((name) => (
                      <option key={name} value={name}>
                        {name}
                      </option>
                    ))}
                  </select>
                )}
              </div>
            </div>
          </div>
        </section>

        {/* ─── 4. MESSAGE GRID ─────────────────────────────────────── */}
        <section className="bg-[#050505]">
          <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
            {loading ? (
              <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
                {[1, 2, 3, 4, 5, 6].map((i) => (
                  <div
                    key={i}
                    className="overflow-hidden rounded-3xl border border-white/[0.05] bg-white/[0.02]"
                  >
                    <div className="aspect-video animate-pulse bg-white/[0.04]" />
                    <div className="space-y-3 p-6">
                      <div className="h-5 w-3/4 animate-pulse rounded-lg bg-white/[0.04]" />
                      <div className="h-3 w-1/2 animate-pulse rounded-lg bg-white/[0.03]" />
                    </div>
                  </div>
                ))}
              </div>
            ) : sermons.length === 0 ? (
              <FadeUp>
                <div className="relative overflow-hidden rounded-3xl border border-white/[0.06] bg-white/[0.02] px-10 py-24 text-center">
                  <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_50%_65%,rgba(109,40,217,0.14)_0%,transparent_65%)]" />
                  <p className="relative text-xs font-semibold tracking-[0.35em] text-zinc-600">
                    COMING SOON
                  </p>
                  <h3 className="relative mt-6 text-4xl font-black leading-[0.95] tracking-tighter text-white sm:text-5xl">
                    <span className="block">NEW</span>
                    <span className="block">MESSAGES</span>
                    <span className="block">ARE COMING SOON</span>
                  </h3>
                  <p className="relative mx-auto mt-5 max-w-sm text-sm leading-7 text-zinc-500">
                    Recent sermons and Spirit-filled teachings will appear here soon.
                  </p>
                  <button
                    onClick={() => navigate('/contact')}
                    className="relative mt-8 inline-flex items-center gap-2 rounded-xl bg-[#D4AF37] px-7 py-3.5 font-semibold text-[#050505] transition hover:bg-[#c09b28]"
                  >
                    Visit The Church
                    <ArrowRight size={17} />
                  </button>
                </div>
              </FadeUp>
            ) : filteredSermons.length === 0 ? (
              <FadeUp>
                <div className="rounded-3xl border border-white/[0.05] bg-white/[0.01] px-8 py-14 text-center">
                  <p className="text-sm text-zinc-600">No messages match your search.</p>
                  <button
                    onClick={() => { setSearchTerm(''); setFilter('all'); setSelectedSeries('') }}
                    className="mt-4 text-xs font-semibold text-[#D4AF37] transition hover:text-[#c09b28]"
                  >
                    Clear filters
                  </button>
                </div>
              </FadeUp>
            ) : (
              <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
                {filteredSermons.map((sermon, i) => {
                  const sermonId = sermon._id || sermon.id
                  const thumb = getThumbnailSrc(sermon)
                  const hasThumb = thumb && !imageErrors.has(sermonId)
                  const isVideo = !!sermon.videoUrl

                  return (
                    <FadeUp key={sermonId || `${sermon.title}-${i}`} delay={Math.min(i * 0.06, 0.3)}>
                      <article className="group flex h-full flex-col overflow-hidden rounded-3xl border border-white/[0.06] bg-[#050505] transition hover:border-[#6D28D9]/20">

                        {/* Thumbnail */}
                        <div
                          className="relative aspect-video cursor-pointer overflow-hidden"
                          onClick={() => playSermon(sermon)}
                        >
                          {hasThumb ? (
                            <img
                              src={thumb}
                              alt={sermon.title}
                              className="h-full w-full object-cover transition duration-500 group-hover:scale-105"
                              onError={() => handleImageError(sermonId)}
                              crossOrigin="anonymous"
                            />
                          ) : (
                            <div className="flex h-full w-full items-center justify-center bg-[linear-gradient(135deg,rgba(109,40,217,0.15)_0%,rgba(5,5,5,0)_100%)] bg-[#0a0a0a]">
                              {isVideo ? (
                                <Play size={36} className="text-zinc-700" />
                              ) : (
                                <Headphones size={36} className="text-zinc-700" />
                              )}
                            </div>
                          )}

                          {/* Hover overlay */}
                          <div className="absolute inset-0 flex items-center justify-center bg-[#050505]/0 transition-colors duration-300 group-hover:bg-[#050505]/50">
                            <div className="flex h-14 w-14 translate-y-2 items-center justify-center rounded-full bg-[#D4AF37] text-[#050505] opacity-0 transition-all duration-300 group-hover:translate-y-0 group-hover:opacity-100">
                              {isVideo ? <Play size={22} /> : <Headphones size={22} />}
                            </div>
                          </div>

                          {/* Media type badge */}
                          <div className="absolute left-4 top-4">
                            <span className={`rounded-full px-3 py-1 text-xs font-bold tracking-wide ${
                              isVideo
                                ? 'bg-[#050505]/80 text-[#D4AF37] backdrop-blur-sm'
                                : 'bg-[#050505]/80 text-[#6D28D9] backdrop-blur-sm'
                            }`}>
                              {isVideo ? 'VIDEO' : 'AUDIO'}
                            </span>
                          </div>
                        </div>

                        {/* Content */}
                        <div className="flex flex-1 flex-col p-6">
                          {sermon.series && (
                            <span className="mb-3 inline-block self-start rounded-full border border-[#D4AF37]/20 bg-[#D4AF37]/[0.06] px-3 py-1 text-xs font-semibold text-[#D4AF37]">
                              {sermon.series}
                            </span>
                          )}

                          <h2
                            className="cursor-pointer text-xl font-black leading-snug tracking-tight text-white transition group-hover:text-zinc-100"
                            onClick={() => playSermon(sermon)}
                          >
                            {sermon.title}
                          </h2>

                          <p className="mt-2 text-xs text-zinc-500">
                            {sermon.speaker}
                            {sermon.date && ` · ${formatDate(sermon.date)}`}
                          </p>

                          {sermon.description && (
                            <p className="mt-3 flex-1 text-sm leading-6 text-zinc-500 line-clamp-2">
                              {sermon.description}
                            </p>
                          )}

                          <div className="mt-5 flex gap-2">
                            <button
                              onClick={() => playSermon(sermon)}
                              className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-[#D4AF37] py-2.5 text-sm font-semibold text-[#050505] transition hover:bg-[#c09b28]"
                            >
                              {isVideo ? <Play size={15} /> : <Headphones size={15} />}
                              {isVideo ? 'Watch' : 'Listen'}
                            </button>
                            <button
                              onClick={() => downloadSermon(sermon, isVideo ? 'video' : 'audio')}
                              className="flex h-10 w-10 items-center justify-center rounded-xl border border-white/[0.08] text-zinc-500 transition hover:border-white/15 hover:text-zinc-300"
                              title="Download"
                            >
                              <Download size={15} />
                            </button>
                          </div>
                        </div>
                      </article>
                    </FadeUp>
                  )
                })}
              </div>
            )}
          </div>
        </section>

        {/* ─── 5. JOIN US THIS SUNDAY ──────────────────────────────── */}
        <section className="relative overflow-hidden bg-[#050505]">
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_50%_100%,rgba(109,40,217,0.2)_0%,transparent_65%)]" />
          <div className="relative mx-auto max-w-7xl px-4 py-24 sm:px-6 lg:px-8">
            <FadeUp>
              <div className="flex flex-col items-start gap-10 lg:flex-row lg:items-end lg:justify-between">
                <div>
                  <p className="text-xs font-semibold tracking-[0.35em] text-[#D4AF37]">
                    IN PERSON
                  </p>
                  <h2 className="mt-5 text-5xl font-black leading-[0.92] tracking-tighter text-white lg:text-6xl">
                    <span className="block">JOIN US</span>
                    <span className="block">THIS SUNDAY</span>
                  </h2>
                  <div className="mt-8 space-y-2">
                    <p className="text-base text-zinc-300">Sunday &middot; 09:30 AM</p>
                    <p className="text-base text-zinc-500">Wednesday &middot; 6:00 PM</p>
                    <p className="text-base text-zinc-500">Friday &middot; 6:00 PM</p>
                  </div>
                </div>
                <button
                  onClick={() => navigate('/contact')}
                  className="inline-flex items-center gap-2 rounded-xl bg-[#D4AF37] px-8 py-4 font-semibold text-[#050505] transition hover:bg-[#c09b28]"
                >
                  Plan Your Visit
                  <ArrowRight size={17} />
                </button>
              </div>
            </FadeUp>
          </div>
        </section>

        <PublicFooter />
      </main>
    </div>
  )
}
