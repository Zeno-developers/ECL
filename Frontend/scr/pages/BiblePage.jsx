import { useState, useEffect, useRef } from 'react'
import { AnimatePresence, motion, useInView } from 'framer-motion'
import { ArrowLeft, Bookmark, Share2, Volume2 } from 'lucide-react'
import { toast } from 'react-toastify'
import bibleService from '../utils/bibleService'
import { useAuth } from '../contexts/AuthContext'
import DashboardShell from '../components/dashboard/DashboardShell'
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

// ─── Shared Bible logic hook ──────────────────────────────────────────────────

function useBible() {
  const [loading, setLoading] = useState(true)
  const [dailyVerse, setDailyVerse] = useState(null)
  const [currentVersion] = useState('BSB')
  const [bookmarks, setBookmarks] = useState([])
  const [navigationMode, setNavigationMode] = useState('main')
  const [books, setBooks] = useState([])
  const [selectedBook, setSelectedBook] = useState(null)
  const [selectedChapter, setSelectedChapter] = useState(null)
  const [chapterContent, setChapterContent] = useState(null)
  const [loadingChapter, setLoadingChapter] = useState(false)

  useEffect(() => {
    loadDailyVerse()
    loadBookmarks()
    loadBooks()
  }, [currentVersion])

  async function loadDailyVerse() {
    try {
      setLoading(true)
      const verse = await bibleService.getDailyVerse()
      setDailyVerse(verse)
    } catch {
      setDailyVerse({
        reference: 'John 3:16',
        text: 'For God so loved the world that he gave his one and only Son, that whoever believes in him shall not perish but have eternal life.',
        version: currentVersion,
      })
    } finally {
      setLoading(false)
    }
  }

  async function loadBooks() {
    try {
      const booksData = await bibleService.getBooks(currentVersion)
      setBooks(booksData)
      if (booksData.length > 0) {
        const defaultBook = booksData.find(b => b.name === 'John') || booksData[0]
        setSelectedBook(defaultBook)
        setSelectedChapter(1)
      }
    } catch {
      setBooks([])
    }
  }

  function loadBookmarks() {
    try { setBookmarks(bibleService.getBookmarks()) } catch { setBookmarks([]) }
  }

  async function loadChapter(book, chapterNumber) {
    if (!book) return
    setLoadingChapter(true)
    try {
      const chapter = await bibleService.getChapter(book.id, chapterNumber, currentVersion)
      setSelectedBook(book)
      setSelectedChapter(chapterNumber)
      setChapterContent(chapter)
      setNavigationMode('verses')
    } catch {
      toast.error('Could not load this chapter. Please try again.')
    } finally {
      setLoadingChapter(false)
    }
  }

  function navigateBack() {
    if (navigationMode === 'verses') { setNavigationMode('chapters'); return }
    if (navigationMode === 'chapters') { setNavigationMode('books'); return }
    setNavigationMode('main')
  }

  function toggleBookmark(verse) {
    const isBookmarked = bibleService.isBookmarked(verse.reference, currentVersion)
    if (isBookmarked) {
      bibleService.removeBookmark(verse.reference, currentVersion)
    } else {
      bibleService.addBookmark(verse)
    }
    loadBookmarks()
  }

  async function shareVerse(verse) {
    const shareText = `"${verse.text}" — ${verse.reference}`
    if (navigator.share) {
      try {
        await navigator.share({ title: verse.reference, text: shareText, url: window.location.href })
      } catch (e) {
        if (e.name !== 'AbortError') navigator.clipboard.writeText(shareText)
      }
    } else {
      navigator.clipboard.writeText(shareText)
    }
  }

  function speakVerse(verse) {
    if (!('speechSynthesis' in window)) return
    const utterance = new SpeechSynthesisUtterance(`${verse.reference}. ${verse.text}`)
    utterance.rate = 0.82
    utterance.pitch = 1
    utterance.volume = 0.9
    speechSynthesis.speak(utterance)
  }

  return {
    loading, dailyVerse, currentVersion, bookmarks,
    navigationMode, setNavigationMode,
    books, selectedBook, setSelectedBook, selectedChapter, setSelectedChapter, chapterContent, loadingChapter,
    loadChapter, navigateBack, toggleBookmark, shareVerse, speakVerse,
  }
}

// ─── Dashboard variant ────────────────────────────────────────────────────────

function BibleDashboard() {
  const bible = useBible()
  const {
    loading, dailyVerse, currentVersion, bookmarks,
    navigationMode, setNavigationMode,
    books, selectedBook, setSelectedBook, selectedChapter, setSelectedChapter, chapterContent, loadingChapter,
    loadChapter, navigateBack, toggleBookmark, shareVerse, speakVerse,
  } = bible

  const oldTestament = books.filter(b => b.order <= 39)
  const newTestament = books.filter(b => b.order > 39)

  function selectBook(book) {
    setSelectedBook(book)
    setSelectedChapter(1)
    setNavigationMode('chapters')
  }

  const breadcrumbLabel = {
    books: 'Scripture',
    chapters: selectedBook?.name || 'Scripture',
    verses: selectedBook ? `${selectedBook.name} · ${selectedChapter}` : 'Scripture',
  }

  return (
    <DashboardShell>
      <div className="mx-auto max-w-5xl px-5 sm:px-8 py-8 space-y-6">

        {/* Header */}
        <div className="flex items-center justify-between gap-4 border-b border-warm-charcoal/[0.07] pb-8">
          <div>
            {navigationMode !== 'main' ? (
              <button
                onClick={navigateBack}
                className="mb-2 inline-flex items-center gap-2 text-xs font-semibold tracking-[0.2em] text-warm-muted transition hover:text-warm-charcoal"
              >
                <ArrowLeft size={12} />
                {navigationMode === 'books' ? 'SCRIPTURE' : 'BACK'}
              </button>
            ) : null}
            <h1 className="text-3xl font-black tracking-tighter text-warm-charcoal">
              {navigationMode === 'main' ? 'BIBLE' : breadcrumbLabel[navigationMode]?.toUpperCase()}
            </h1>
            <p className="mt-1 text-sm text-warm-muted">
              {navigationMode === 'main'
                ? 'Read, reflect, and meditate on Scripture.'
                : navigationMode === 'books' ? 'Select a book to begin reading.'
                : navigationMode === 'chapters' ? `Select a chapter in ${selectedBook?.name}.`
                : `${selectedBook?.name} Chapter ${selectedChapter}`}
            </p>
          </div>
          <div className="shrink-0 rounded-full border border-warm-gold/20 bg-warm-gold/[0.05] px-4 py-1.5">
            <span className="text-[10px] font-bold tracking-[0.2em] text-warm-gold">BSB</span>
          </div>
        </div>

        <AnimatePresence mode="wait">

          {/* ── MAIN ─────────────────────────────────────────────────────── */}
          {navigationMode === 'main' && (
            <motion.div key="main" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.3 }} className="space-y-6">

              {/* Verse of the Day */}
              <div className="rounded-2xl border border-warm-charcoal/[0.07] bg-white p-8 shadow-sm text-center">
                <p className="mb-6 text-[9px] font-bold tracking-[0.3em] text-warm-gold/70">VERSE OF THE DAY</p>
                {loading ? (
                  <div className="space-y-3">
                    <div className="mx-auto h-2 w-3/4 animate-pulse rounded-full bg-warm-charcoal/[0.06]" />
                    <div className="mx-auto h-2 w-1/2 animate-pulse rounded-full bg-warm-charcoal/[0.06]" />
                  </div>
                ) : dailyVerse ? (
                  <>
                    <blockquote>
                      <p className="text-xl font-black leading-snug tracking-tight text-warm-espresso sm:text-2xl">
                        "{dailyVerse.text}"
                      </p>
                      <cite className="mt-5 block text-[10px] font-bold not-italic tracking-[0.3em] text-warm-gold">
                        — {dailyVerse.reference}
                      </cite>
                    </blockquote>
                    <div className="mt-8 flex items-center justify-center gap-8">
                      {[
                        { label: 'SAVE', icon: Bookmark, action: () => toggleBookmark(dailyVerse), active: bibleService.isBookmarked(dailyVerse.reference, currentVersion) },
                        { label: 'LISTEN', icon: Volume2, action: () => speakVerse(dailyVerse) },
                        { label: 'SHARE', icon: Share2, action: () => shareVerse(dailyVerse) },
                      ].map(({ label, icon: Icon, action, active }) => (
                        <button key={label} onClick={action} className="flex flex-col items-center gap-1.5 text-warm-muted transition hover:text-warm-gold">
                          <Icon size={14} className={active ? 'text-warm-gold' : ''} fill={active ? 'currentColor' : 'none'} />
                          <span className="text-[9px] font-bold tracking-[0.2em]">{label}</span>
                        </button>
                      ))}
                    </div>
                  </>
                ) : null}
              </div>

              {/* Explore Scripture */}
              <div className="grid gap-4 sm:grid-cols-2">
                {[
                  { label: 'OLD TESTAMENT', sub: `${oldTestament.length} books` },
                  { label: 'NEW TESTAMENT', sub: `${newTestament.length} books` },
                ].map(({ label, sub }) => (
                  <button
                    key={label}
                    onClick={() => setNavigationMode('books')}
                    className="group rounded-2xl border border-warm-charcoal/[0.07] bg-white p-8 text-left shadow-sm transition hover:border-warm-gold/20 hover:shadow-md"
                  >
                    <p className="text-[9px] font-bold tracking-[0.3em] text-warm-gold/70">{label}</p>
                    <p className="mt-2 text-lg font-black tracking-tight text-warm-charcoal">{sub}</p>
                    <p className="mt-1 text-xs text-warm-muted group-hover:text-warm-charcoal transition">Browse →</p>
                  </button>
                ))}
              </div>

              {/* Saved Verses */}
              {bookmarks.length > 0 && (
                <div className="rounded-2xl border border-warm-charcoal/[0.07] bg-white shadow-sm overflow-hidden">
                  <div className="border-b border-warm-charcoal/[0.06] bg-warm-ivory px-5 py-3">
                    <p className="text-[9px] font-bold tracking-[0.2em] text-warm-gold/70">SAVED VERSES</p>
                  </div>
                  <div className="divide-y divide-warm-charcoal/[0.05]">
                    {bookmarks.map((verse, i) => (
                      <div key={`${verse.reference}-${i}`} className="flex items-start gap-4 px-5 py-4">
                        <div className="flex-1">
                          <p className="text-[9px] font-bold tracking-[0.2em] text-warm-gold mb-1">{verse.reference}</p>
                          <p className="text-xs text-warm-muted leading-relaxed italic">"{verse.text}"</p>
                        </div>
                        <button onClick={() => toggleBookmark(verse)} className="text-warm-gold/60 hover:text-warm-gold transition mt-1">
                          <Bookmark size={12} fill="currentColor" />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </motion.div>
          )}

          {/* ── BOOKS ────────────────────────────────────────────────────── */}
          {navigationMode === 'books' && (
            <motion.div key="books" initial={{ opacity: 0, x: 16 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -16 }} transition={{ duration: 0.3 }} className="space-y-8">
              {[
                { label: 'OLD TESTAMENT', list: oldTestament },
                { label: 'NEW TESTAMENT', list: newTestament },
              ].map(({ label, list }) => (
                <div key={label}>
                  <p className="mb-4 text-[9px] font-bold tracking-[0.3em] text-warm-gold/70">{label}</p>
                  <div className="grid grid-cols-3 gap-2 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-7">
                    {list.map((book) => (
                      <button
                        key={book.id}
                        onClick={() => selectBook(book)}
                        className="group rounded-xl border border-warm-charcoal/[0.07] bg-white p-3 text-left shadow-sm transition hover:border-warm-gold/25 hover:shadow-md"
                      >
                        <p className="text-[11px] font-bold leading-snug text-warm-charcoal line-clamp-2 group-hover:text-warm-gold transition">
                          {book.name}
                        </p>
                        <p className="mt-1 text-[9px] tracking-[0.1em] text-warm-muted">{book.numberOfChapters} ch</p>
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </motion.div>
          )}

          {/* ── CHAPTERS ─────────────────────────────────────────────────── */}
          {navigationMode === 'chapters' && selectedBook && (
            <motion.div key="chapters" initial={{ opacity: 0, x: 16 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -16 }} transition={{ duration: 0.3 }}>
              {loadingChapter ? (
                <div className="flex justify-center py-20">
                  <div className="h-5 w-5 animate-spin rounded-full border-2 border-warm-charcoal/10 border-t-warm-gold" />
                </div>
              ) : (
                <div className="grid grid-cols-6 gap-2 sm:grid-cols-8 md:grid-cols-10 lg:grid-cols-12">
                  {Array.from({ length: selectedBook.numberOfChapters }, (_, i) => i + 1).map((num) => (
                    <button
                      key={num}
                      onClick={() => loadChapter(selectedBook, num)}
                      className="flex aspect-square items-center justify-center rounded-xl border border-warm-charcoal/[0.07] bg-white text-sm font-bold text-warm-muted shadow-sm transition hover:border-warm-gold/30 hover:text-warm-charcoal"
                    >
                      {num}
                    </button>
                  ))}
                </div>
              )}
            </motion.div>
          )}

          {/* ── VERSES ───────────────────────────────────────────────────── */}
          {navigationMode === 'verses' && selectedBook && selectedChapter && (
            <motion.div key="verses" initial={{ opacity: 0, x: 16 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -16 }} transition={{ duration: 0.3 }}>
              {loadingChapter ? (
                <div className="flex justify-center py-20">
                  <div className="h-5 w-5 animate-spin rounded-full border-2 border-warm-charcoal/10 border-t-warm-gold" />
                </div>
              ) : chapterContent?.chapter?.content?.length ? (
                <div className="rounded-2xl border border-warm-charcoal/[0.07] bg-white shadow-sm p-6 sm:p-8">
                  {chapterContent.chapter.content.map((item, index) => {
                    if (item.type === 'heading') {
                      return (
                        <div key={index} className="py-6 text-center">
                          <p className="text-[9px] font-bold uppercase tracking-[0.3em] text-warm-gold/70">
                            {item.content.join(' ')}
                          </p>
                        </div>
                      )
                    }

                    if (item.type === 'verse') {
                      const verseData = {
                        reference: `${selectedBook.name} ${selectedChapter}:${item.number}`,
                        text: bibleService.processContentArray(item.content),
                        version: currentVersion,
                        fullReference: `${selectedBook.id} ${selectedChapter}:${item.number}`,
                      }
                      const isBookmarked = bibleService.isBookmarked(verseData.reference, currentVersion)
                      return (
                        <div key={index} className="group border-b border-warm-charcoal/[0.05] py-4">
                          <div className="flex gap-4">
                            <span className="w-5 shrink-0 pt-0.5 text-right text-[10px] font-bold tracking-wide text-warm-gold/50">
                              {item.number}
                            </span>
                            <div className="flex-1">
                              <p className="text-sm leading-[1.9] text-warm-espresso">{verseData.text}</p>
                              <div className="mt-2 flex items-center gap-4 opacity-0 transition-opacity group-hover:opacity-100">
                                <button onClick={() => toggleBookmark(verseData)} className="text-warm-muted hover:text-warm-gold transition">
                                  <Bookmark size={11} className={isBookmarked ? 'text-warm-gold' : ''} fill={isBookmarked ? 'currentColor' : 'none'} />
                                </button>
                                <button onClick={() => shareVerse(verseData)} className="text-warm-muted hover:text-warm-gold transition">
                                  <Share2 size={11} />
                                </button>
                                <button onClick={() => speakVerse(verseData)} className="text-warm-muted hover:text-warm-gold transition">
                                  <Volume2 size={11} />
                                </button>
                              </div>
                            </div>
                          </div>
                        </div>
                      )
                    }

                    if (item.type === 'line_break') return <div key={index} className="h-3" />
                    return null
                  })}

                  {/* Chapter navigation */}
                  <div className="mt-8 flex items-center justify-between pt-6 border-t border-warm-charcoal/[0.06]">
                    {selectedChapter > 1 ? (
                      <button
                        onClick={() => loadChapter(selectedBook, selectedChapter - 1)}
                        className="inline-flex items-center gap-2 text-xs font-semibold tracking-[0.15em] text-warm-muted transition hover:text-warm-charcoal"
                      >
                        <ArrowLeft size={12} />
                        CH {selectedChapter - 1}
                      </button>
                    ) : <div />}
                    {selectedChapter < selectedBook.numberOfChapters && (
                      <button
                        onClick={() => loadChapter(selectedBook, selectedChapter + 1)}
                        className="text-xs font-semibold tracking-[0.15em] text-warm-muted transition hover:text-warm-charcoal"
                      >
                        CH {selectedChapter + 1} →
                      </button>
                    )}
                  </div>
                </div>
              ) : (
                <div className="rounded-2xl border border-warm-charcoal/[0.07] bg-white py-16 text-center shadow-sm">
                  <p className="text-xs font-semibold tracking-[0.3em] text-warm-muted">CHAPTER CONTENT UNAVAILABLE</p>
                </div>
              )}
            </motion.div>
          )}

        </AnimatePresence>
      </div>
    </DashboardShell>
  )
}

// ─── Public variant ───────────────────────────────────────────────────────────

function BiblePublic() {
  const {
    loading, dailyVerse, currentVersion, bookmarks,
    navigationMode, setNavigationMode,
    books, selectedBook, setSelectedBook, selectedChapter, setSelectedChapter, chapterContent, loadingChapter,
    loadChapter, navigateBack, toggleBookmark, shareVerse, speakVerse,
  } = useBible()

  const oldTestament = books.filter(b => b.order <= 39)
  const newTestament = books.filter(b => b.order > 39)

  function selectBook(book) {
    setSelectedBook(book)
    setSelectedChapter(1)
    setNavigationMode('chapters')
  }

  const breadcrumb = {
    books: 'SCRIPTURE',
    chapters: selectedBook?.name?.toUpperCase() || 'SCRIPTURE',
    verses: selectedBook ? `${selectedBook.name.toUpperCase()} · ${selectedChapter}` : 'SCRIPTURE',
  }

  return (
    <div className="min-h-screen bg-[#050505]">
      <PublicNavigation variant="dark" />

      {/* Hero */}
      <section className="relative overflow-hidden pt-36 pb-20">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_50%_0%,rgba(109,40,217,0.18)_0%,transparent_60%)]" />
        <div className="relative mx-auto max-w-5xl px-6">
          <motion.div initial={{ opacity: 0, y: 28 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.75, delay: 0.08, ease }}>
            <p className="mb-8 text-xs font-semibold tracking-[0.35em] text-zinc-600">SCRIPTURE · DAILY READING · REFLECTION</p>
            <h1 className="text-6xl font-black leading-[0.88] tracking-tighter text-white sm:text-8xl lg:text-9xl">
              <span className="block">DAILY</span>
              <span className="block text-[#D4AF37]">BIBLE</span>
            </h1>
            <p className="mt-8 max-w-md text-sm leading-relaxed text-zinc-500">Read, reflect, and meditate on Scripture through a calm and immersive digital experience.</p>
          </motion.div>
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.6, delay: 0.3 }} className="mt-10 inline-flex items-center gap-3 rounded-full border border-[#D4AF37]/20 bg-[#D4AF37]/[0.04] px-5 py-2.5">
            <span className="text-xs font-bold tracking-[0.2em] text-[#D4AF37]">BSB</span>
            <span className="text-zinc-700">·</span>
            <span className="text-xs tracking-[0.1em] text-zinc-600">Berean Standard Bible</span>
          </motion.div>
        </div>
      </section>

      {/* Back breadcrumb */}
      <AnimatePresence>
        {navigationMode !== 'main' && (
          <motion.div
            initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.3, ease }}
            className="sticky top-0 z-40 border-b border-white/[0.04] bg-[#050505]/90 backdrop-blur-xl"
          >
            <div className="mx-auto flex max-w-5xl items-center gap-4 px-6 py-4">
              <button onClick={navigateBack} className="inline-flex items-center gap-2 text-xs font-semibold tracking-[0.25em] text-zinc-500 transition hover:text-white">
                <ArrowLeft size={13} />
                {navigationMode === 'books' ? 'SCRIPTURE' : 'BACK'}
              </button>
              <span className="text-zinc-800">·</span>
              <span className="text-xs font-semibold tracking-[0.2em] text-zinc-400">{breadcrumb[navigationMode]}</span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence mode="wait">

        {navigationMode === 'main' && (
          <motion.div key="main" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.4 }}>
            <section className="relative overflow-hidden border-t border-white/[0.04] py-32">
              <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_50%_50%,rgba(109,40,217,0.14)_0%,transparent_65%)]" />
              <div className="relative mx-auto max-w-3xl px-6 text-center">
                <p className="mb-14 text-xs font-semibold tracking-[0.35em] text-zinc-600">VERSE OF THE DAY</p>
                {loading ? (
                  <div className="space-y-4">
                    <div className="mx-auto h-2 w-3/4 animate-pulse rounded-full bg-white/[0.04]" />
                    <div className="mx-auto h-2 w-1/2 animate-pulse rounded-full bg-white/[0.04]" />
                  </div>
                ) : dailyVerse ? (
                  <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, ease }}>
                    <blockquote>
                      <p className="text-3xl font-black leading-[1.08] tracking-tight text-white sm:text-4xl lg:text-5xl">"{dailyVerse.text}"</p>
                      <cite className="mt-10 block text-xs font-semibold not-italic tracking-[0.35em] text-[#D4AF37]">— {dailyVerse.reference}</cite>
                    </blockquote>
                    <div className="mt-12 flex items-center justify-center gap-10">
                      {[
                        { label: 'SAVE', icon: Bookmark, action: () => toggleBookmark(dailyVerse), active: bibleService.isBookmarked(dailyVerse.reference, currentVersion) },
                        { label: 'LISTEN', icon: Volume2, action: () => speakVerse(dailyVerse) },
                        { label: 'SHARE', icon: Share2, action: () => shareVerse(dailyVerse) },
                      ].map(({ label, icon: Icon, action, active }) => (
                        <button key={label} onClick={action} className="flex flex-col items-center gap-2 transition hover:opacity-70">
                          <Icon size={15} className={active ? 'text-[#D4AF37]' : 'text-zinc-600'} fill={active ? 'currentColor' : 'none'} />
                          <span className="text-[10px] font-semibold tracking-[0.25em] text-zinc-700">{label}</span>
                        </button>
                      ))}
                    </div>
                  </motion.div>
                ) : null}
              </div>
            </section>

            <section className="border-t border-white/[0.04] py-28">
              <div className="mx-auto max-w-5xl px-6">
                <FadeUp>
                  <div className="flex flex-col gap-10 sm:flex-row sm:items-end sm:justify-between">
                    <div>
                      <h2 className="text-5xl font-black leading-[0.9] tracking-tighter text-white sm:text-6xl lg:text-7xl">
                        <span className="block">EXPLORE</span>
                        <span className="block text-[#D4AF37]">SCRIPTURE</span>
                      </h2>
                      <p className="mt-6 max-w-sm text-sm leading-relaxed text-zinc-500">Browse the complete Bible by book and chapter.</p>
                    </div>
                    <button onClick={() => setNavigationMode('books')} className="self-start rounded-full border border-white/[0.1] px-8 py-3.5 text-xs font-bold tracking-[0.2em] text-white transition hover:border-[#D4AF37]/40 hover:text-[#D4AF37] sm:self-auto">
                      OPEN SCRIPTURE
                    </button>
                  </div>
                  {books.length > 0 && (
                    <div className="mt-14 grid gap-4 sm:grid-cols-2">
                      {[{ label: 'OLD TESTAMENT', sub: `${oldTestament.length} books` }, { label: 'NEW TESTAMENT', sub: `${newTestament.length} books` }].map(({ label, sub }) => (
                        <button key={label} onClick={() => setNavigationMode('books')} className="group relative overflow-hidden rounded-3xl border border-white/[0.06] bg-white/[0.02] p-10 text-left transition duration-300 hover:border-[#D4AF37]/20">
                          <div className="pointer-events-none absolute inset-0 opacity-0 transition duration-300 group-hover:opacity-100 bg-[radial-gradient(ellipse_at_0%_100%,rgba(212,175,55,0.06)_0%,transparent_70%)]" />
                          <p className="text-xs font-semibold tracking-[0.3em] text-[#D4AF37]">{label}</p>
                          <p className="mt-3 text-2xl font-black tracking-tight text-white">{sub}</p>
                        </button>
                      ))}
                    </div>
                  )}
                </FadeUp>
              </div>
            </section>

            {bookmarks.length > 0 && (
              <section className="border-t border-white/[0.04] py-24">
                <div className="mx-auto max-w-4xl px-6">
                  <FadeUp>
                    <p className="mb-10 text-xs font-semibold tracking-[0.35em] text-zinc-600">SAVED VERSES</p>
                    <div className="space-y-4">
                      {bookmarks.map((verse, i) => (
                        <div key={`${verse.reference}-${i}`} className="group relative rounded-3xl border border-white/[0.06] bg-white/[0.02] p-8 transition duration-300 hover:border-white/[0.1]">
                          <div className="flex items-start gap-6">
                            <div className="flex-1">
                              <p className="mb-4 text-xs font-semibold tracking-[0.25em] text-[#D4AF37]">{verse.reference}</p>
                              <p className="text-sm leading-[1.85] text-zinc-400 italic">"{verse.text}"</p>
                            </div>
                            <button onClick={() => toggleBookmark(verse)} className="flex-shrink-0 p-1 text-[#D4AF37]/60 transition hover:text-[#D4AF37]">
                              <Bookmark size={13} fill="currentColor" />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </FadeUp>
                </div>
              </section>
            )}
          </motion.div>
        )}

        {navigationMode === 'books' && (
          <motion.div key="books" initial={{ opacity: 0, x: 24 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -24 }} transition={{ duration: 0.4, ease }}>
            <div className="mx-auto max-w-5xl px-6 py-16 space-y-20">
              {[{ label: 'OLD TESTAMENT', list: oldTestament }, { label: 'NEW TESTAMENT', list: newTestament }].map(({ label, list }) => (
                <div key={label}>
                  <p className="mb-8 text-xs font-semibold tracking-[0.35em] text-zinc-600">{label}</p>
                  <div className="grid grid-cols-3 gap-3 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-7">
                    {list.map((book) => (
                      <button key={book.id} onClick={() => selectBook(book)} className="group relative rounded-2xl border border-white/[0.06] bg-white/[0.02] p-4 text-left transition duration-200 hover:border-[#D4AF37]/25 hover:bg-white/[0.04]">
                        <p className="text-xs font-bold leading-snug text-white line-clamp-2 transition group-hover:text-[#D4AF37]">{book.name}</p>
                        <p className="mt-1.5 text-[10px] tracking-[0.15em] text-zinc-700">{book.numberOfChapters} CH</p>
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </motion.div>
        )}

        {navigationMode === 'chapters' && selectedBook && (
          <motion.div key="chapters" initial={{ opacity: 0, x: 24 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -24 }} transition={{ duration: 0.4, ease }}>
            <div className="mx-auto max-w-5xl px-6 py-16">
              <p className="mb-3 text-xs font-semibold tracking-[0.35em] text-zinc-600">SELECT CHAPTER</p>
              <h2 className="mb-12 text-4xl font-black tracking-tighter text-white sm:text-5xl">{selectedBook.name}</h2>
              {loadingChapter ? (
                <div className="flex min-h-[30vh] items-center justify-center">
                  <div className="text-center">
                    <div className="mx-auto h-8 w-8 animate-spin rounded-full border-2 border-white/[0.08] border-t-[#D4AF37]" />
                    <p className="mt-6 text-xs font-semibold tracking-[0.35em] text-zinc-700">LOADING</p>
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-6 gap-2.5 sm:grid-cols-8 md:grid-cols-10 lg:grid-cols-12">
                  {Array.from({ length: selectedBook.numberOfChapters }, (_, i) => i + 1).map((num) => (
                    <button key={num} onClick={() => loadChapter(selectedBook, num)} className="flex aspect-square items-center justify-center rounded-xl border border-white/[0.06] bg-white/[0.02] text-sm font-bold text-zinc-500 transition duration-200 hover:border-[#D4AF37]/30 hover:text-white">
                      {num}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </motion.div>
        )}

        {navigationMode === 'verses' && selectedBook && selectedChapter && (
          <motion.div key="verses" initial={{ opacity: 0, x: 24 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -24 }} transition={{ duration: 0.4, ease }}>
            <div className="mx-auto max-w-3xl px-6 py-16">
              <p className="mb-3 text-xs font-semibold tracking-[0.35em] text-zinc-600">{selectedBook.name.toUpperCase()}</p>
              <h2 className="mb-16 text-5xl font-black tracking-tighter text-white sm:text-6xl">Chapter {selectedChapter}</h2>
              {loadingChapter ? (
                <div className="flex min-h-[40vh] items-center justify-center">
                  <div className="text-center">
                    <div className="mx-auto h-8 w-8 animate-spin rounded-full border-2 border-white/[0.08] border-t-[#D4AF37]" />
                    <p className="mt-6 text-xs font-semibold tracking-[0.35em] text-zinc-700">LOADING</p>
                  </div>
                </div>
              ) : chapterContent?.chapter?.content?.length ? (
                <div>
                  {chapterContent.chapter.content.map((item, index) => {
                    if (item.type === 'heading') return (
                      <div key={index} className="py-10">
                        <p className="text-xs font-semibold uppercase tracking-[0.3em] text-zinc-600 text-center">{item.content.join(' ')}</p>
                      </div>
                    )
                    if (item.type === 'verse') {
                      const verseData = {
                        reference: `${selectedBook.name} ${selectedChapter}:${item.number}`,
                        text: bibleService.processContentArray(item.content),
                        version: currentVersion,
                        fullReference: `${selectedBook.id} ${selectedChapter}:${item.number}`,
                      }
                      const isBookmarked = bibleService.isBookmarked(verseData.reference, currentVersion)
                      return (
                        <div key={index} className="group border-b border-white/[0.04] py-6 transition-colors duration-200 hover:border-white/[0.08]">
                          <div className="flex gap-5">
                            <span className="w-6 flex-shrink-0 pt-[3px] text-right text-xs font-semibold tracking-[0.15em] text-[#D4AF37]/60">{item.number}</span>
                            <div className="flex-1">
                              <p className="text-[1.05rem] leading-[1.9] text-zinc-300">{verseData.text}</p>
                              <div className="mt-3 flex items-center gap-5 opacity-0 transition-opacity duration-200 group-hover:opacity-100">
                                <button onClick={() => toggleBookmark(verseData)} className="transition hover:opacity-70">
                                  <Bookmark size={12} className={isBookmarked ? 'text-[#D4AF37]' : 'text-zinc-600'} fill={isBookmarked ? 'currentColor' : 'none'} />
                                </button>
                                <button onClick={() => shareVerse(verseData)} className="transition hover:opacity-70"><Share2 size={12} className="text-zinc-600" /></button>
                                <button onClick={() => speakVerse(verseData)} className="transition hover:opacity-70"><Volume2 size={12} className="text-zinc-600" /></button>
                              </div>
                            </div>
                          </div>
                        </div>
                      )
                    }
                    if (item.type === 'line_break') return <div key={index} className="h-4" />
                    return null
                  })}
                  <div className="mt-16 flex items-center justify-between border-t border-white/[0.04] pt-10">
                    {selectedChapter > 1 ? (
                      <button onClick={() => loadChapter(selectedBook, selectedChapter - 1)} className="inline-flex items-center gap-2 text-xs font-semibold tracking-[0.2em] text-zinc-600 transition hover:text-white">
                        <ArrowLeft size={13} />CHAPTER {selectedChapter - 1}
                      </button>
                    ) : <div />}
                    {selectedChapter < selectedBook.numberOfChapters && (
                      <button onClick={() => loadChapter(selectedBook, selectedChapter + 1)} className="text-xs font-semibold tracking-[0.2em] text-zinc-600 transition hover:text-white">
                        CHAPTER {selectedChapter + 1} →
                      </button>
                    )}
                  </div>
                </div>
              ) : (
                <div className="rounded-3xl border border-white/[0.06] bg-white/[0.02] py-20 text-center">
                  <p className="text-xs font-semibold tracking-[0.35em] text-zinc-600">CHAPTER CONTENT UNAVAILABLE</p>
                </div>
              )}
            </div>
          </motion.div>
        )}

      </AnimatePresence>
      <PublicFooter />
    </div>
  )
}

// ─── Entry point — detects auth and picks the right shell ────────────────────

export default function BiblePage() {
  const { user } = useAuth()
  return user ? <BibleDashboard /> : <BiblePublic />
}
