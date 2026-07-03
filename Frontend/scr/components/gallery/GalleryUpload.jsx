import { useEffect, useRef, useState } from 'react'
import { Upload, X } from 'lucide-react'
import { homeImagesAPI } from '../../utils/api'

export default function GalleryUpload({ onSuccess }) {
  const [open, setOpen] = useState(false)
  const [file, setFile] = useState(null)
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const fileInputRef = useRef()

  useEffect(() => {
    if (!open) {
      setFile(null)
      setTitle('')
      setDescription('')
      setError(null)
    }
  }, [open])

  const handleFileChange = (e) => {
    const f = e.target.files?.[0]
    if (f) setFile(f)
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError(null)
    if (!file) return setError('Please select an image file')

    const form = new FormData()
    form.append('image', file, file.name)
    form.append('title', title || file.name)
    form.append('description', description)
    form.append('section', 'resources')

    try {
      setLoading(true)
      await homeImagesAPI.upload(form)
      setLoading(false)
      setOpen(false)
      if (onSuccess) onSuccess()
    } catch (err) {
      console.error('Upload failed', err)
      setError(err?.message || 'Upload failed')
      setLoading(false)
    }
  }

  const inputClass =
    'w-full rounded-xl border border-white/[0.08] bg-white/[0.04] px-4 py-2.5 text-sm text-zinc-100 placeholder-zinc-600 outline-none focus:border-[#D4AF37]/50 focus:ring-1 focus:ring-[#D4AF37]/30 transition'

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-2 rounded-xl border border-[#D4AF37]/30 bg-[#D4AF37]/10 px-4 py-2.5 text-sm font-semibold text-[#D4AF37] transition hover:bg-[#D4AF37]/20"
      >
        <Upload size={15} />
        Upload Image
      </button>

      {open && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-[#050505]/80 p-4 backdrop-blur-xl"
          onClick={() => setOpen(false)}
        >
          <div
            className="w-full max-w-md rounded-3xl border border-white/[0.08] bg-[#0d0d0d] p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-5">
              <h3 className="font-bold text-white">Upload Gallery Image</h3>
              <button
                onClick={() => setOpen(false)}
                className="flex h-8 w-8 items-center justify-center rounded-full border border-white/[0.08] text-zinc-500 transition hover:text-zinc-200"
              >
                <X size={15} />
              </button>
            </div>

            {error && (
              <div className="mb-4 rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-400">
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="mb-1.5 block text-xs font-semibold tracking-wide text-zinc-400 uppercase">
                  Image
                </label>
                <div
                  className="flex cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-white/[0.10] bg-white/[0.02] py-8 text-center transition hover:border-[#D4AF37]/30 hover:bg-[#D4AF37]/5"
                  onClick={() => fileInputRef.current?.click()}
                >
                  <Upload size={22} className="text-zinc-600" />
                  {file ? (
                    <div>
                      <p className="text-sm font-medium text-zinc-300">{file.name}</p>
                      <p className="text-xs text-zinc-600">{(file.size / (1024 * 1024)).toFixed(2)} MB</p>
                    </div>
                  ) : (
                    <p className="text-sm text-zinc-600">Click to select an image</p>
                  )}
                </div>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleFileChange}
                  className="hidden"
                />
              </div>

              <div>
                <label className="mb-1.5 block text-xs font-semibold tracking-wide text-zinc-400 uppercase">
                  Title
                </label>
                <input
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Optional title"
                  className={inputClass}
                />
              </div>

              <div>
                <label className="mb-1.5 block text-xs font-semibold tracking-wide text-zinc-400 uppercase">
                  Description
                </label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Optional description"
                  rows={3}
                  className={inputClass + ' resize-none'}
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-1">
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  className="rounded-xl border border-white/[0.08] px-4 py-2.5 text-sm text-zinc-400 transition hover:text-zinc-200"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="rounded-xl bg-[#D4AF37] px-5 py-2.5 text-sm font-bold text-[#050505] transition hover:bg-[#c09b28] disabled:opacity-50"
                >
                  {loading ? 'Uploading…' : 'Upload'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  )
}
