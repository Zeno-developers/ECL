import { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { ArrowRight, Calendar, Loader2, Mic, Search, FileText, CalendarDays, User, X, LayoutDashboard } from 'lucide-react'
import { Link } from 'react-router-dom'
import { searchAllContent, getSearchSuggestions } from '../utils/searchService'

const ease = [0.22, 1, 0.36, 1]

const TYPE_META = {
  blog:   { label: 'STORY',    color: 'text-[#D4AF37]',  icon: <FileText size={12} className="text-zinc-600" /> },
  sermon: { label: 'MESSAGE',  color: 'text-[#c4b5fd]',  icon: <Mic size={12} className="text-zinc-600" /> },
  event:  { label: 'EVENT',    color: 'text-zinc-500',   icon: <CalendarDays size={12} className="text-zinc-600" /> },
  page:   { label: 'PAGE',     color: 'text-emerald-500',icon: <LayoutDashboard size={12} className="text-zinc-600" /> },
}

export default function SearchModal({ isOpen, onClose }) {
  const [query, setQuery]       = useState('')
  const [results, setResults]   = useState([])
  const [suggestions, setSugg]  = useState([])
  const [loading, setLoading]   = useState(false)
  const [selected, setSelected] = useState(-1)
  const inputRef = useRef(null)
  const listRef  = useRef(null)

  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 80)
    } else {
      setQuery(''); setResults([]); setSugg([]); setSelected(-1)
    }
  }, [isOpen])

  useEffect(() => {
    const t = setTimeout(async () => {
      if (query.length < 2) { setResults([]); setSugg([]); return }
      setLoading(true)
      try {
        const [{ results: r }, s] = await Promise.all([
          searchAllContent(query),
          getSearchSuggestions(query),
        ])
        setResults(r)
        setSugg(s)
      } catch {}
      finally { setLoading(false) }
    }, 300)
    return () => clearTimeout(t)
  }, [query])

  // Close on Escape
  useEffect(() => {
    if (!isOpen) return
    const handler = (e) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [isOpen, onClose])

  const handleKeyDown = (e) => {
    if (e.key === 'ArrowDown') { e.preventDefault(); setSelected(p => Math.min(p + 1, results.length - 1)) }
    else if (e.key === 'ArrowUp') { e.preventDefault(); setSelected(p => Math.max(p - 1, -1)) }
    else if (e.key === 'Enter' && selected >= 0 && results[selected]) { window.location.href = results[selected].url; onClose() }
  }

  const hasQuery   = query.length >= 2
  const hasResults = results.length > 0

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop — covers everything, click closes */}
          <motion.div
            key="backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-[70] bg-black/80 backdrop-blur-xl"
            onClick={onClose}
          />

          {/* Scroll container — click outside panel closes */}
          <div
            className="fixed inset-0 z-[71] flex flex-col items-center overflow-y-auto px-3 pb-4 pt-4 sm:items-center sm:px-4 sm:pt-[12vh]"
            onClick={onClose}
          >
            <motion.div
              key="panel"
              initial={{ opacity: 0, y: -16, scale: 0.97 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -12, scale: 0.97 }}
              transition={{ duration: 0.25, ease }}
              className="w-full max-w-2xl overflow-hidden rounded-2xl border border-white/[0.08] bg-[#0d0d0d] shadow-2xl shadow-black/60 sm:rounded-3xl"
              onClick={e => e.stopPropagation()}
            >

              {/* Input row */}
              <div className="flex items-center gap-3 border-b border-white/[0.06] px-4 py-4 sm:gap-4 sm:px-6 sm:py-5">
                <Search size={16} className="shrink-0 text-zinc-600" />
                <input
                  ref={inputRef}
                  type="text"
                  value={query}
                  onChange={e => { setQuery(e.target.value); setSelected(-1) }}
                  onKeyDown={handleKeyDown}
                  placeholder="Search pages, messages, events..."
                  className="flex-1 bg-transparent text-sm text-zinc-200 placeholder-zinc-600 focus:outline-none sm:text-base"
                />
                {query ? (
                  <button onClick={() => setQuery('')} className="shrink-0 text-zinc-600 transition hover:text-zinc-400">
                    <X size={16} />
                  </button>
                ) : (
                  <button onClick={onClose} className="shrink-0 text-zinc-600 transition hover:text-zinc-400 sm:hidden">
                    <X size={18} />
                  </button>
                )}
                <kbd className="hidden shrink-0 rounded-lg border border-white/[0.07] bg-white/[0.04] px-2.5 py-1 text-[10px] font-bold tracking-[0.15em] text-zinc-600 sm:block">
                  ESC
                </kbd>
              </div>

              {/* Body */}
              <div className="max-h-[55vh] overflow-y-auto sm:max-h-[60vh]" ref={listRef}>

                {/* Loading */}
                {loading && (
                  <div className="flex items-center justify-center py-12">
                    <Loader2 size={20} className="animate-spin text-zinc-700" />
                  </div>
                )}

                {/* Results */}
                {!loading && hasQuery && hasResults && (
                  <div className="p-3 sm:p-4">
                    <p className="mb-3 px-2 text-[10px] font-bold tracking-[0.35em] text-zinc-700">
                      {results.length} RESULT{results.length !== 1 ? 'S' : ''}
                    </p>
                    <div className="space-y-1">
                      {results.map((r, i) => {
                        const meta = TYPE_META[r.type] || TYPE_META.page
                        return (
                          <Link
                            key={`${r.type}-${r.id}`}
                            to={r.url}
                            onClick={onClose}
                            className={`group flex items-start gap-3 rounded-xl p-3 transition-all duration-200 sm:gap-4 sm:rounded-2xl sm:p-4 ${
                              selected === i
                                ? 'bg-white/[0.06] border border-white/[0.08]'
                                : 'border border-transparent hover:bg-white/[0.04]'
                            }`}
                          >
                            {r.image && (
                              <img
                                src={r.image}
                                alt={r.title}
                                className="hidden h-11 w-11 shrink-0 rounded-xl object-cover opacity-80 sm:block"
                                onError={e => { e.target.style.display = 'none' }}
                              />
                            )}
                            <div className="flex-1 min-w-0">
                              <div className="flex flex-wrap items-center gap-2 mb-0.5">
                                <span className={`text-[9px] font-bold tracking-[0.25em] ${meta.color}`}>
                                  {meta.label}
                                </span>
                                {r.date && (
                                  <span className="hidden items-center gap-1 text-[10px] text-zinc-700 sm:flex">
                                    <Calendar size={9} />
                                    {new Date(r.date).toLocaleDateString('en-ZA', { day: 'numeric', month: 'short', year: 'numeric' })}
                                  </span>
                                )}
                              </div>
                              <h4 className="text-sm font-bold text-zinc-200 line-clamp-1 group-hover:text-white transition-colors">
                                {r.title}
                              </h4>
                              {r.description && (
                                <p className="mt-0.5 text-xs leading-5 text-zinc-600 line-clamp-1">{r.description}</p>
                              )}
                              {r.speaker && (
                                <p className="mt-0.5 flex items-center gap-1 text-[10px] text-zinc-700">
                                  <User size={9} /> {r.speaker}
                                </p>
                              )}
                            </div>
                            <ArrowRight size={12} className="mt-1 shrink-0 text-zinc-700 transition-colors group-hover:text-zinc-500" />
                          </Link>
                        )
                      })}
                    </div>
                  </div>
                )}

                {/* Suggestions */}
                {!loading && hasQuery && !hasResults && suggestions.length > 0 && (
                  <div className="p-4 sm:p-6">
                    <p className="mb-3 text-[10px] font-bold tracking-[0.35em] text-zinc-700">SUGGESTIONS</p>
                    <div className="flex flex-wrap gap-2">
                      {suggestions.map((s, i) => (
                        <button
                          key={i}
                          onClick={() => setQuery(s)}
                          className="rounded-full border border-white/[0.07] bg-white/[0.03] px-3 py-1.5 text-[11px] font-semibold text-zinc-500 transition hover:border-[#D4AF37]/20 hover:text-zinc-300"
                        >
                          {s}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* No results */}
                {!loading && hasQuery && !hasResults && suggestions.length === 0 && (
                  <div className="px-6 py-12 text-center">
                    <p className="text-sm font-semibold text-zinc-500">Nothing found for "{query}"</p>
                    <p className="mt-1 text-xs text-zinc-700">Try a different word or browse the site.</p>
                  </div>
                )}

                {/* Empty state */}
                {!loading && !hasQuery && (
                  <div className="px-6 py-10 text-center sm:py-12">
                    <p className="text-[10px] font-bold tracking-[0.45em] text-zinc-700">ETERNAL LOVE CHURCH</p>
                    <h2 className="mt-4 text-2xl font-black leading-[0.9] tracking-tighter text-white sm:mt-5 sm:text-3xl">
                      WE LOVE GOD.<br />WE LOVE PEOPLE.
                    </h2>
                    <p className="mx-auto mt-4 max-w-xs text-xs leading-6 text-zinc-600">
                      Search pages, messages, events, teachings, and more.
                    </p>
                    {/* Quick links for mobile */}
                    <div className="mt-6 flex flex-wrap justify-center gap-2 sm:hidden">
                      {['About', 'Sermons', 'Events', 'Give', 'Connect'].map(label => (
                        <Link
                          key={label}
                          to={`/${label.toLowerCase()}`}
                          onClick={onClose}
                          className="rounded-full border border-white/[0.07] bg-white/[0.03] px-3 py-1.5 text-[11px] font-semibold text-zinc-500"
                        >
                          {label}
                        </Link>
                      ))}
                    </div>
                  </div>
                )}

              </div>

              {/* Footer — hidden on very small screens */}
              <div className="hidden items-center justify-between border-t border-white/[0.05] px-6 py-3 sm:flex">
                <div className="flex items-center gap-4 text-[10px] text-zinc-700">
                  <span className="flex items-center gap-1.5">
                    <kbd className="rounded border border-white/[0.07] bg-white/[0.04] px-1.5 py-0.5 text-[9px] font-bold text-zinc-600">↑</kbd>
                    <kbd className="rounded border border-white/[0.07] bg-white/[0.04] px-1.5 py-0.5 text-[9px] font-bold text-zinc-600">↓</kbd>
                    navigate
                  </span>
                  <span className="flex items-center gap-1.5">
                    <kbd className="rounded border border-white/[0.07] bg-white/[0.04] px-1.5 py-0.5 text-[9px] font-bold text-zinc-600">↵</kbd>
                    open
                  </span>
                </div>
                <span className="flex items-center gap-1.5 text-[10px] text-zinc-700">
                  <kbd className="rounded border border-white/[0.07] bg-white/[0.04] px-2 py-0.5 text-[9px] font-bold text-zinc-600">ESC</kbd>
                  to close
                </span>
              </div>

            </motion.div>
          </div>
        </>
      )}
    </AnimatePresence>
  )
}
