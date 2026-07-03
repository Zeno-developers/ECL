import { useState, useRef } from 'react'
import { Video, Upload, FileText, X, CloudUpload, File, Loader2 } from 'lucide-react'
import { useLocation, useNavigate } from 'react-router-dom'
import { sermonsAPI, fileAPI } from '../utils/api'
import { toast } from 'react-toastify'
import DashboardShell from '../components/dashboard/DashboardShell'

const inputCls = 'w-full rounded-xl border border-warm-charcoal/[0.1] bg-warm-ivory px-4 py-3 text-sm text-warm-charcoal placeholder-warm-muted focus:border-warm-gold/40 focus:outline-none focus:bg-white'
const labelCls = 'mb-1.5 block text-[10px] font-semibold uppercase tracking-[0.2em] text-warm-muted'

export default function UploadSermonPage() {
  const navigate = useNavigate()
  const location = useLocation()
  const importedDraft = location.state?.draft
  const importedDraftId = importedDraft?.id || importedDraft?._id || null
  const existingMedia = {
    video: importedDraft?.video_url || importedDraft?.videoUrl || '',
    audio: importedDraft?.audio_url || importedDraft?.audioUrl || '',
    thumbnail: importedDraft?.thumbnail_url || importedDraft?.thumbnailUrl || '',
  }

  const [sermon, setSermon] = useState({
    title: importedDraft?.title || '',
    speaker: importedDraft?.speaker || '',
    date: importedDraft?.planned_date || new Date().toISOString().split('T')[0],
    description: importedDraft?.description || '',
    series: importedDraft?.series || '',
    video_url: importedDraft?.video_url || '',
    published: true,
  })
  const [files, setFiles] = useState({ video: null, audio: null, thumbnail: null })
  const [uploadProgress, setUploadProgress] = useState({ video: 0, audio: 0, thumbnail: 0 })
  const [isUploading, setIsUploading] = useState(false)
  const [dragOver, setDragOver] = useState({ video: false, audio: false, thumbnail: false })

  const videoInputRef = useRef(null)
  const audioInputRef = useRef(null)
  const thumbnailInputRef = useRef(null)

  const handleFileSelect = (fileType, file) => {
    if (!file) return
    const maxSizes = { video: 100 * 1024 * 1024, audio: 50 * 1024 * 1024, thumbnail: 5 * 1024 * 1024 }
    try {
      fileAPI.validateFile(file, {
        maxSize: maxSizes[fileType],
        allowedVideoTypes: ['video/mp4', 'video/mov', 'video/avi', 'video/webm', 'video/quicktime'],
        allowedAudioTypes: ['audio/mpeg', 'audio/wav', 'audio/m4a', 'audio/aac', 'audio/ogg'],
        allowedImageTypes: ['image/jpeg', 'image/png', 'image/gif', 'image/webp'],
      })
    } catch (error) { toast.error(error.message); return }
    setFiles((prev) => ({ ...prev, [fileType]: file }))
    setDragOver((prev) => ({ ...prev, [fileType]: false }))
  }

  const removeFile = (fileType) => {
    setFiles((prev) => ({ ...prev, [fileType]: null }))
    setUploadProgress((prev) => ({ ...prev, [fileType]: 0 }))
  }

  const handleDragOver = (fileType, e) => { e.preventDefault(); e.stopPropagation(); setDragOver((prev) => ({ ...prev, [fileType]: true })) }
  const handleDragLeave = (fileType, e) => { e.preventDefault(); e.stopPropagation(); setDragOver((prev) => ({ ...prev, [fileType]: false })) }

  const handleDrop = (fileType, e) => {
    e.preventDefault(); e.stopPropagation()
    setDragOver((prev) => ({ ...prev, [fileType]: false }))
    const dropped = e.dataTransfer.files
    if (dropped && dropped.length > 0) handleFileSelect(fileType, dropped[0])
  }

  const handleFileInput = (fileType, e) => {
    const file = e.target.files[0]
    if (file) handleFileSelect(fileType, file)
    e.target.value = ''
  }

  const triggerFileInput = (fileType) => {
    const refs = { video: videoInputRef, audio: audioInputRef, thumbnail: thumbnailInputRef }
    refs[fileType].current?.click()
  }

  const validateForm = () => {
    if (!sermon.title.trim()) { toast.error('Please enter a sermon title'); return false }
    if (!sermon.speaker.trim()) { toast.error('Please enter a speaker name'); return false }
    const hasExistingMedia = Boolean(existingMedia.video || existingMedia.audio || existingMedia.thumbnail)
    if (!files.video && !files.audio && !sermon.video_url.trim() && !hasExistingMedia) {
      toast.error('Please add a video link or upload a video/audio file'); return false
    }
    return true
  }

  const handleUpload = async () => {
    if (!validateForm()) return
    setIsUploading(true)
    try {
      const sermonData = {
        title: sermon.title.trim(),
        speaker: sermon.speaker.trim(),
        date: sermon.date,
        description: sermon.description.trim(),
        series: sermon.series.trim(),
        published: sermon.published,
      }
      if (sermon.video_url.trim()) sermonData.video_url = sermon.video_url.trim()
      if (importedDraftId) sermonData.id = importedDraftId
      const result = await sermonsAPI.createSermon(sermonData, files)
      if (result._id || result.status === 'success') {
        toast.success('Sermon uploaded successfully')
        navigate('/sermons/manage')
      } else if (result.message) {
        throw new Error(result.message)
      } else {
        throw new Error('Unexpected response format from server')
      }
    } catch (error) {
      if (error.message.includes('NetworkError') || error.message.includes('Failed to fetch')) toast.error('Network error: Please check your internet connection')
      else if (error.message.includes('401')) { toast.error('Session expired. Please log in again.'); navigate('/login') }
      else if (error.message.includes('413')) toast.error('File too large. Please check the file size limits.')
      else toast.error(error.message || 'Failed to upload sermon')
    } finally {
      setIsUploading(false)
      setUploadProgress({ video: 0, audio: 0, thumbnail: 0 })
    }
  }

  const FileUploadArea = ({ fileType, label, icon: Icon, accept, maxSize }) => {
    const file = files[fileType]
    const progress = uploadProgress[fileType]
    const isDragOver = dragOver[fileType]

    return (
      <div>
        <label className={labelCls}>{label} <span className="text-warm-muted normal-case font-normal">({maxSize} max)</span></label>
        <input
          ref={fileType === 'video' ? videoInputRef : fileType === 'audio' ? audioInputRef : thumbnailInputRef}
          type="file"
          accept={accept}
          onChange={(e) => handleFileInput(fileType, e)}
          className="hidden"
          disabled={isUploading}
        />
        <div
          className={`relative rounded-xl border-2 border-dashed p-5 text-center cursor-pointer transition-all ${
            file || isDragOver
              ? 'border-warm-gold/40 bg-warm-gold/[0.04]'
              : 'border-warm-charcoal/[0.1] hover:border-warm-gold/20 hover:bg-warm-ivory'
          } ${isUploading ? 'opacity-50 cursor-not-allowed' : ''}`}
          onDragOver={(e) => handleDragOver(fileType, e)}
          onDragLeave={(e) => handleDragLeave(fileType, e)}
          onDrop={(e) => handleDrop(fileType, e)}
          onClick={() => !isUploading && triggerFileInput(fileType)}
        >
          {isDragOver && (
            <div className="absolute inset-0 rounded-xl bg-warm-gold/[0.06] flex items-center justify-center">
              <div className="text-center">
                <CloudUpload size={32} className="mx-auto mb-2 text-warm-gold/60" />
                <p className="text-xs font-semibold text-warm-gold/70">Drop to upload</p>
              </div>
            </div>
          )}
          {file ? (
            <div className="flex flex-col items-center">
              <div className="flex items-center gap-3 mb-2">
                <Icon size={20} className="text-warm-gold" />
                <div className="text-left">
                  <p className="text-xs font-semibold text-warm-espresso truncate max-w-[180px]">{file.name}</p>
                  <p className="text-[10px] text-warm-muted">{sermonsAPI.formatFileSize(file.size)}</p>
                </div>
                {!isUploading && (
                  <button type="button" onClick={(e) => { e.stopPropagation(); removeFile(fileType) }} className="rounded-full p-1 text-warm-muted transition hover:text-red-600">
                    <X size={14} />
                  </button>
                )}
              </div>
              {progress > 0 && progress < 100 && (
                <div className="w-full">
                  <div className="w-full bg-warm-charcoal/[0.06] rounded-full h-1.5 mb-1">
                    <div className="bg-warm-gold h-1.5 rounded-full transition-all" style={{ width: `${progress}%` }} />
                  </div>
                  <span className="text-[10px] text-warm-muted">Uploading... {Math.round(progress)}%</span>
                </div>
              )}
            </div>
          ) : (
            <div className="flex flex-col items-center">
              <Icon size={28} className="text-warm-muted mb-2" />
              <p className="text-xs font-semibold text-warm-plum mb-0.5">Drag & drop your {fileType} file</p>
              <p className="text-xs text-warm-muted">or <span className="text-warm-gold/80 font-medium">browse files</span></p>
              <p className="text-[10px] text-warm-muted mt-1">{maxSize} maximum</p>
            </div>
          )}
        </div>
      </div>
    )
  }

  const isComplete = (field) => {
    if (field === 'title') return Boolean(sermon.title.trim())
    if (field === 'speaker') return Boolean(sermon.speaker.trim())
    if (field === 'media') return Boolean(files.video || files.audio || sermon.video_url.trim())
    return true
  }

  return (
    <DashboardShell>
      {isUploading && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-warm-charcoal/40 backdrop-blur-sm">
          <div className="rounded-2xl border border-warm-charcoal/[0.07] bg-white px-6 py-5 flex items-center gap-3 shadow-lg">
            <Loader2 className="h-5 w-5 animate-spin text-warm-gold" />
            <div>
              <p className="font-semibold text-warm-charcoal">Uploading sermon</p>
              <p className="text-xs text-warm-muted">Please wait while your media is being processed.</p>
            </div>
          </div>
        </div>
      )}

      <div className="mx-auto max-w-5xl px-5 sm:px-8 py-8 space-y-6">

        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-warm-charcoal/[0.07] pb-8">
          <div>
            <h1 className="text-3xl font-black tracking-tighter text-warm-charcoal">UPLOAD SERMON</h1>
            <p className="mt-2 text-sm text-warm-muted">Share your sermon with the congregation.</p>
          </div>
          <button
            onClick={handleUpload}
            disabled={isUploading}
            className="inline-flex items-center gap-2 rounded-xl bg-warm-gold px-6 py-2.5 text-xs font-bold tracking-[0.18em] text-warm-espresso transition hover:opacity-90 disabled:opacity-50 shrink-0"
          >
            <Upload size={13} />
            {isUploading ? 'UPLOADING...' : 'UPLOAD SERMON'}
          </button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Sermon Info */}
          <div className="lg:col-span-2 rounded-2xl border border-warm-charcoal/[0.07] bg-white p-6 space-y-5 shadow-sm">
            <div className="flex items-center gap-2">
              <File size={14} className="text-warm-muted" />
              <p className="text-[9px] font-bold tracking-[0.22em] text-warm-gold/70">SERMON INFORMATION</p>
            </div>

            <div>
              <label className={labelCls}>Sermon Title *</label>
              <input type="text" value={sermon.title} onChange={(e) => setSermon({ ...sermon, title: e.target.value })} className={inputCls} placeholder="Enter sermon title" disabled={isUploading} />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className={labelCls}>Speaker *</label>
                <input type="text" value={sermon.speaker} onChange={(e) => setSermon({ ...sermon, speaker: e.target.value })} className={inputCls} placeholder="Enter speaker name" disabled={isUploading} />
              </div>
              <div>
                <label className={labelCls}>Date *</label>
                <input type="date" value={sermon.date} onChange={(e) => setSermon({ ...sermon, date: e.target.value })} className={inputCls} disabled={isUploading} />
              </div>
            </div>

            <div>
              <label className={labelCls}>Sermon Series</label>
              <input type="text" value={sermon.series} onChange={(e) => setSermon({ ...sermon, series: e.target.value })} className={inputCls} placeholder="Enter series name (optional)" disabled={isUploading} />
            </div>

            <div>
              <label className={labelCls}>Description</label>
              <textarea value={sermon.description} onChange={(e) => setSermon({ ...sermon, description: e.target.value })} rows={4} className={`${inputCls} resize-none`} placeholder="Enter sermon description..." disabled={isUploading} />
            </div>

            <div>
              <label className={labelCls}>Video Link</label>
              <input type="url" value={sermon.video_url} onChange={(e) => setSermon({ ...sermon, video_url: e.target.value })} className={inputCls} placeholder="https://www.youtube.com/watch?v=..." disabled={isUploading} />
              <p className="mt-1 text-[10px] text-warm-muted">Provide a YouTube link instead of uploading a video file</p>
            </div>

            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={sermon.published}
                onChange={(e) => setSermon({ ...sermon, published: e.target.checked })}
                className="w-4 h-4 rounded accent-warm-gold"
                disabled={isUploading}
              />
              <span className="text-sm font-semibold text-warm-espresso">Publish immediately</span>
            </label>
          </div>

          {/* Sidebar */}
          <div className="space-y-5">
            {/* Media Files */}
            <div className="rounded-2xl border border-warm-charcoal/[0.07] bg-white p-5 space-y-5 shadow-sm">
              <p className="text-[9px] font-bold tracking-[0.22em] text-warm-gold/70">MEDIA FILES</p>
              <FileUploadArea fileType="video" label="Video File" icon={Video} accept="video/mp4,video/mov,video/avi,video/webm,video/quicktime" maxSize="100MB" />
              <FileUploadArea fileType="audio" label="Audio File" icon={FileText} accept="audio/mpeg,audio/wav,audio/m4a,audio/aac,audio/ogg" maxSize="50MB" />
              <FileUploadArea fileType="thumbnail" label="Thumbnail Image" icon={FileText} accept="image/jpeg,image/png,image/gif,image/webp" maxSize="5MB" />
            </div>

            {/* Instructions */}
            <div className="rounded-2xl border border-warm-gold/20 bg-warm-gold/[0.04] p-5 space-y-3">
              <div className="flex items-center gap-2">
                <CloudUpload size={13} className="text-warm-gold/60" />
                <p className="text-[9px] font-bold tracking-[0.22em] text-warm-gold/70">UPLOAD INSTRUCTIONS</p>
              </div>
              <ul className="space-y-2 text-xs text-warm-plum">
                {['Drag and drop files directly onto the upload areas', 'Video files up to 100MB (MP4, MOV, AVI, WEBM)', 'Audio files up to 50MB (MP3, WAV, M4A, AAC)', 'Thumbnail images up to 5MB (JPEG, PNG, GIF, WEBP)', 'At least one media file (video or audio) is required'].map((tip) => (
                  <li key={tip} className="flex items-start gap-2">
                    <span className="text-warm-gold/50 mt-0.5">•</span>
                    <span>{tip}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* Requirements */}
            <div className="rounded-2xl border border-warm-charcoal/[0.07] bg-white p-5 space-y-3 shadow-sm">
              <p className="text-[9px] font-bold tracking-[0.22em] text-warm-gold/70">REQUIREMENTS</p>
              {[
                ['Title', isComplete('title')],
                ['Speaker', isComplete('speaker')],
                ['Media File', isComplete('media')],
                ['Date', true],
              ].map(([label, done]) => (
                <div key={label} className="flex items-center justify-between text-xs border-b border-warm-charcoal/[0.07] pb-2">
                  <span className="text-warm-plum">{label}</span>
                  <span className={done ? 'text-emerald-700 font-semibold' : 'text-red-600 font-semibold'}>{done ? 'Complete' : 'Required'}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </DashboardShell>
  )
}
