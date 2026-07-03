import { useState, useEffect } from 'react'
import {
  Upload, Image as ImageIcon, Save, X, Eye, Trash2, Plus,
  RefreshCw, AlertCircle, CheckCircle, Camera, Grid, List, Search, Filter
} from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'
import { useNavigate } from 'react-router-dom'
import { homeImagesAPI } from '../utils/api'
import DashboardShell from '../components/dashboard/DashboardShell'

const inputCls = 'w-full rounded-xl border border-warm-charcoal/[0.1] bg-warm-ivory px-4 py-3 text-sm text-warm-charcoal placeholder-warm-muted focus:border-warm-gold/40 focus:outline-none focus:bg-white'
const labelCls = 'mb-1.5 block text-[10px] font-semibold uppercase tracking-[0.2em] text-warm-muted'

export default function HomeImageManagement() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const canManageHomeImages = ['pastor', 'admin', 'superadmin', 'developer'].includes(user?.role)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [images, setImages] = useState([])
  const [filteredImages, setFilteredImages] = useState([])
  const [selectedSection, setSelectedSection] = useState('all')
  const [viewMode, setViewMode] = useState('grid')
  const [searchTerm, setSearchTerm] = useState('')
  const [showUploadModal, setShowUploadModal] = useState(false)
  const [previewImage, setPreviewImage] = useState(null)
  const [message, setMessage] = useState({ type: '', text: '' })
  const [selectedFile, setSelectedFile] = useState(null)
  const [localPreviewUrl, setLocalPreviewUrl] = useState('')

  const [newImage, setNewImage] = useState({
    title: '', description: '', section: 'hero', component: 'HeroSection',
    imageUrl: '', altText: '', isActive: true, order: 0,
  })

  const sections = [
    { value: 'hero', label: 'Hero Section' },
    { value: 'about', label: 'About Section' },
    { value: 'community', label: 'Community Section' },
    { value: 'events', label: 'Events Section' },
    { value: 'sermons', label: 'Sermons Section' },
    { value: 'blog', label: 'Blog Section' },
    { value: 'members', label: 'Members Section' },
    { value: 'footer', label: 'Footer Section' },
  ]

  const components = [
    { value: 'HeroSection', label: 'Hero Section' },
    { value: 'AboutSection', label: 'About Section' },
    { value: 'FoundersSection', label: 'Founders Section' },
    { value: 'CommunitySection', label: 'Community Section' },
    { value: 'EventsSection', label: 'Events Section' },
    { value: 'SermonsSection', label: 'Sermons Section' },
    { value: 'BlogSection', label: 'Blog Section' },
    { value: 'TeamMembers', label: 'Team Members' },
    { value: 'FooterSection', label: 'Footer Section' },
  ]

  useEffect(() => {
    if (!user) { navigate('/login'); return }
    if (!canManageHomeImages) { setMessage({ type: 'error', text: 'Access denied. Pastor or admin privileges required.' }); return }
    loadImages()
  }, [user, navigate, canManageHomeImages])

  useEffect(() => {
    return () => { if (localPreviewUrl) URL.revokeObjectURL(localPreviewUrl) }
  }, [localPreviewUrl])

  useEffect(() => {
    let filtered = images
    if (selectedSection !== 'all') filtered = filtered.filter((img) => img.section === selectedSection)
    if (searchTerm) filtered = filtered.filter((img) => img.title?.toLowerCase().includes(searchTerm.toLowerCase()) || img.description?.toLowerCase().includes(searchTerm.toLowerCase()))
    setFilteredImages(filtered)
  }, [images, selectedSection, searchTerm])

  const loadImages = async () => {
    try {
      setLoading(true)
      const response = await homeImagesAPI.getAllImages()
      if (response.status === 'success') setImages(response.data || [])
      else throw new Error(response.message || 'Failed to load images')
    } catch (error) {
      setMessage({ type: 'error', text: 'Failed to load images. Please try again.' })
    } finally {
      setLoading(false)
    }
  }

  const handleImageSelection = (file) => {
    if (!file) return
    try {
      homeImagesAPI.validateImageFile(file)
      if (localPreviewUrl) URL.revokeObjectURL(localPreviewUrl)
      const previewUrl = URL.createObjectURL(file)
      setSelectedFile(file)
      setLocalPreviewUrl(previewUrl)
      setNewImage((prev) => ({ ...prev, imageUrl: previewUrl }))
      setMessage({ type: 'success', text: 'Image selected and ready to save.' })
    } catch (error) {
      setMessage({ type: 'error', text: error.message || 'Failed to select image.' })
    }
  }

  const handleSaveImage = async () => {
    if (!newImage.title || !selectedFile) { setMessage({ type: 'error', text: 'Please provide both title and image.' }); return }
    try {
      setSaving(true)
      const formData = new FormData()
      formData.append('image', selectedFile)
      formData.append('title', newImage.title)
      formData.append('description', newImage.description)
      formData.append('section', newImage.section)
      formData.append('component', newImage.component)
      formData.append('alt_text', newImage.altText)
      formData.append('display_order', String(newImage.order ?? 0))
      formData.append('is_active', newImage.isActive ? '1' : '0')
      const response = await homeImagesAPI.uploadImage(formData)
      if (response.status === 'success') {
        setImages((prev) => [...prev, response.data])
        setNewImage({ title: '', description: '', section: 'hero', component: 'HeroSection', imageUrl: '', altText: '', isActive: true, order: 0 })
        setSelectedFile(null)
        if (localPreviewUrl) URL.revokeObjectURL(localPreviewUrl)
        setLocalPreviewUrl('')
        setShowUploadModal(false)
        setMessage({ type: 'success', text: 'Image saved successfully!' })
      } else throw new Error(response.message || 'Failed to save image')
    } catch (error) {
      setMessage({ type: 'error', text: 'Failed to save image. Please try again.' })
    } finally {
      setSaving(false)
    }
  }

  const handleDeleteImage = async (imageId) => {
    if (!confirm('Are you sure you want to delete this image?')) return
    try {
      const response = await homeImagesAPI.deleteImage(imageId)
      if (response.status === 'success') {
        setImages((prev) => prev.filter((img) => img.id !== imageId))
        setMessage({ type: 'success', text: 'Image deleted successfully!' })
      } else throw new Error(response.message || 'Failed to delete image')
    } catch (error) {
      setMessage({ type: 'error', text: 'Failed to delete image. Please try again.' })
    }
  }

  const handleToggleActive = async (imageId, isActive) => {
    try {
      const response = await homeImagesAPI.updateImage(imageId, { is_active: !isActive ? 1 : 0 })
      if (response.status === 'success') {
        setImages((prev) => prev.map((img) => img.id === imageId ? { ...img, isActive: !isActive } : img))
        setMessage({ type: 'success', text: `Image ${!isActive ? 'activated' : 'deactivated'} successfully!` })
      } else throw new Error(response.message || 'Failed to update image')
    } catch (error) {
      setMessage({ type: 'error', text: 'Failed to update image. Please try again.' })
    }
  }

  if (!user || !canManageHomeImages) {
    return (
      <DashboardShell>
        <div className="flex h-full items-center justify-center py-32">
          <div className="text-center">
            <AlertCircle size={36} className="mx-auto text-red-500 mb-4" />
            <p className="text-sm font-semibold text-warm-charcoal">Access Denied</p>
            <p className="text-xs text-warm-muted mt-1">{!user ? 'Please log in to access this page.' : 'Pastor or admin privileges required.'}</p>
          </div>
        </div>
      </DashboardShell>
    )
  }

  return (
    <DashboardShell>
      <div className="mx-auto max-w-7xl px-5 sm:px-8 py-8 space-y-6">

        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-warm-charcoal/[0.07] pb-8">
          <div>
            <h1 className="text-3xl font-black tracking-tighter text-warm-charcoal">HOME IMAGE MANAGEMENT</h1>
            <p className="mt-1 text-sm text-warm-muted">Manage images for different sections of the home page.</p>
          </div>
          <div className="flex gap-3 shrink-0">
            <button
              onClick={loadImages}
              className="inline-flex items-center gap-2 rounded-xl border border-warm-charcoal/[0.07] bg-white px-4 py-2.5 text-xs font-semibold text-warm-muted transition hover:text-warm-charcoal shadow-sm"
            >
              <RefreshCw size={13} />
              Refresh
            </button>
            <button
              onClick={() => setShowUploadModal(true)}
              className="inline-flex items-center gap-2 rounded-xl bg-warm-gold px-5 py-2.5 text-xs font-bold tracking-[0.18em] text-warm-espresso transition hover:opacity-90"
            >
              <Plus size={13} />
              ADD IMAGE
            </button>
          </div>
        </div>

        {/* Message Alert */}
        {message.text && (
          <div className={`rounded-xl border p-4 flex items-center justify-between gap-3 ${
            message.type === 'success' ? 'border-emerald-500/20 bg-emerald-500/[0.04] text-emerald-700' : 'border-red-200 bg-red-50 text-red-600'
          }`}>
            <div className="flex items-center gap-3">
              {message.type === 'success' ? <CheckCircle size={16} /> : <AlertCircle size={16} />}
              <span className="text-sm">{message.text}</span>
            </div>
            <button onClick={() => setMessage({ type: '', text: '' })} className="shrink-0 opacity-60 hover:opacity-100">
              <X size={14} />
            </button>
          </div>
        )}

        {/* Filters */}
        <div className="rounded-2xl border border-warm-charcoal/[0.07] bg-white p-5 shadow-sm">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div className="flex-1 max-w-md">
              <div className="relative">
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-warm-muted" size={14} />
                <input
                  type="text"
                  placeholder="Search images..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-9 pr-4 py-3 rounded-xl border border-warm-charcoal/[0.1] bg-warm-ivory text-sm text-warm-charcoal placeholder-warm-muted focus:border-warm-gold/40 focus:outline-none focus:bg-white"
                />
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2">
                <Filter size={14} className="text-warm-muted" />
                <select
                  value={selectedSection}
                  onChange={(e) => setSelectedSection(e.target.value)}
                  className="rounded-xl border border-warm-charcoal/[0.1] bg-warm-ivory px-3 py-2.5 text-sm text-warm-charcoal focus:border-warm-gold/40 focus:outline-none"
                >
                  <option value="all">All Sections</option>
                  {sections.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
                </select>
              </div>
              <div className="flex items-center bg-warm-ivory rounded-xl p-1 border border-warm-charcoal/[0.07]">
                <button
                  onClick={() => setViewMode('grid')}
                  className={`p-2 rounded-lg transition-colors ${viewMode === 'grid' ? 'bg-white text-warm-gold shadow-sm' : 'text-warm-muted'}`}
                >
                  <Grid size={16} />
                </button>
                <button
                  onClick={() => setViewMode('list')}
                  className={`p-2 rounded-lg transition-colors ${viewMode === 'list' ? 'bg-white text-warm-gold shadow-sm' : 'text-warm-muted'}`}
                >
                  <List size={16} />
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Images */}
        {loading ? (
          <div className="flex h-64 items-center justify-center">
            <div className="text-center">
              <div className="h-5 w-5 animate-spin rounded-full border-2 border-warm-charcoal/10 border-t-warm-gold mx-auto" />
              <p className="mt-3 text-sm text-warm-muted">Loading images...</p>
            </div>
          </div>
        ) : filteredImages.length === 0 ? (
          <div className="flex h-64 items-center justify-center">
            <div className="text-center">
              <ImageIcon size={36} className="mx-auto text-warm-gold/30 mb-4" />
              <p className="text-sm font-semibold text-warm-espresso">No images found</p>
              <p className="text-xs text-warm-muted mt-1">
                {searchTerm || selectedSection !== 'all' ? 'Try adjusting your search or filter.' : 'Start by adding your first image.'}
              </p>
            </div>
          </div>
        ) : (
          <div className={viewMode === 'grid' ? 'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4' : 'space-y-3'}>
            {filteredImages.map((image) => (
              viewMode === 'grid' ? (
                <div key={image.id} className="rounded-2xl border border-warm-charcoal/[0.07] bg-white shadow-sm overflow-hidden hover:shadow-md transition-shadow">
                  <div className="aspect-video bg-warm-ivory relative">
                    <img src={image.imageUrl} alt={image.altText || image.title} className="w-full h-full object-cover" onError={(e) => { e.target.src = '/api/placeholder/400/300' }} />
                    <div className="absolute top-2 right-2 flex gap-1">
                      <button onClick={() => setPreviewImage(image)} className="bg-black/50 text-white p-1 rounded-lg hover:bg-black/70">
                        <Eye size={14} />
                      </button>
                      <button onClick={() => handleDeleteImage(image.id)} className="bg-red-500/80 text-white p-1 rounded-lg hover:bg-red-600">
                        <Trash2 size={14} />
                      </button>
                    </div>
                    <div className={`absolute top-2 left-2 rounded-full px-2 py-0.5 text-[9px] font-bold ${image.isActive ? 'bg-emerald-500 text-white' : 'bg-red-500 text-white'}`}>
                      {image.isActive ? 'Active' : 'Inactive'}
                    </div>
                  </div>
                  <div className="p-4">
                    <p className="text-xs font-semibold text-warm-espresso mb-1 truncate">{image.title}</p>
                    <p className="text-[10px] text-warm-muted mb-3 line-clamp-2">{image.description}</p>
                    <div className="flex items-center justify-between">
                      <span className="text-[9px] font-bold tracking-[0.1em] text-warm-gold bg-warm-gold/10 rounded-full px-2 py-0.5">{image.section.toUpperCase()}</span>
                      <button
                        onClick={() => handleToggleActive(image.id, image.isActive)}
                        className={`text-[10px] font-semibold px-2 py-1 rounded-lg transition-colors ${image.isActive ? 'bg-red-50 text-red-600 hover:bg-red-100' : 'bg-emerald-500/10 text-emerald-700 hover:bg-emerald-500/20'}`}
                      >
                        {image.isActive ? 'Deactivate' : 'Activate'}
                      </button>
                    </div>
                  </div>
                </div>
              ) : (
                <div key={image.id} className="rounded-2xl border border-warm-charcoal/[0.07] bg-white p-4 shadow-sm flex items-center gap-4 hover:bg-warm-ivory transition-colors">
                  <div className="w-20 h-14 bg-warm-ivory rounded-xl shrink-0 overflow-hidden">
                    <img src={image.imageUrl} alt={image.altText || image.title} className="w-full h-full object-cover" onError={(e) => { e.target.src = '/api/placeholder/80/56' }} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-semibold text-warm-espresso truncate">{image.title}</p>
                    <p className="text-[10px] text-warm-muted line-clamp-1 mt-0.5">{image.description}</p>
                    <div className="flex items-center gap-2 mt-1.5">
                      <span className="text-[9px] font-bold tracking-[0.1em] text-warm-gold bg-warm-gold/10 rounded-full px-2 py-0.5">{image.section.toUpperCase()}</span>
                      <span className={`text-[9px] font-bold rounded-full px-2 py-0.5 ${image.isActive ? 'bg-emerald-500/10 text-emerald-700' : 'bg-red-50 text-red-600'}`}>
                        {image.isActive ? 'Active' : 'Inactive'}
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <button onClick={() => setPreviewImage(image)} className="p-2 rounded-lg text-warm-muted hover:text-warm-charcoal hover:bg-warm-ivory transition-colors">
                      <Eye size={15} />
                    </button>
                    <button
                      onClick={() => handleToggleActive(image.id, image.isActive)}
                      className={`text-[10px] font-semibold px-2 py-1 rounded-lg transition-colors ${image.isActive ? 'bg-red-50 text-red-600' : 'bg-emerald-500/10 text-emerald-700'}`}
                    >
                      {image.isActive ? 'Deactivate' : 'Activate'}
                    </button>
                    <button onClick={() => handleDeleteImage(image.id)} className="p-2 rounded-lg text-warm-muted hover:text-red-600 hover:bg-red-50 transition-colors">
                      <Trash2 size={15} />
                    </button>
                  </div>
                </div>
              )
            ))}
          </div>
        )}
      </div>

      {/* Upload Modal */}
      {showUploadModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-warm-charcoal/40 backdrop-blur-sm p-4">
          <div className="rounded-2xl border border-warm-charcoal/[0.07] bg-white w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-xl">
            <div className="flex items-center justify-between p-6 border-b border-warm-charcoal/[0.07]">
              <h2 className="text-sm font-bold tracking-[0.1em] text-warm-charcoal">ADD NEW IMAGE</h2>
              <button onClick={() => setShowUploadModal(false)} className="rounded-lg p-1 text-warm-muted hover:text-warm-charcoal transition-colors">
                <X size={18} />
              </button>
            </div>

            <div className="p-6 space-y-5">
              {/* Upload area */}
              <div>
                <label className={labelCls}>Upload Image</label>
                <div className="rounded-xl border-2 border-dashed border-warm-charcoal/[0.1] p-6 text-center hover:border-warm-gold/30 transition-colors">
                  {newImage.imageUrl ? (
                    <div className="space-y-3">
                      <img src={newImage.imageUrl} alt="Preview" className="max-h-48 mx-auto rounded-xl" />
                      <button
                        onClick={() => { if (localPreviewUrl) URL.revokeObjectURL(localPreviewUrl); setSelectedFile(null); setLocalPreviewUrl(''); setNewImage((prev) => ({ ...prev, imageUrl: '' })) }}
                        className="text-xs text-red-600 hover:text-red-700 font-semibold"
                      >
                        Remove Image
                      </button>
                    </div>
                  ) : (
                    <div>
                      <Upload size={28} className="mx-auto text-warm-gold/40 mb-3" />
                      <p className="text-sm text-warm-plum">Click to upload or drag and drop</p>
                      <p className="text-xs text-warm-muted mt-1">PNG, JPG, GIF up to 10MB</p>
                      <input type="file" accept="image/*" onChange={(e) => handleImageSelection(e.target.files[0])} className="hidden" id="image-upload" />
                      <label htmlFor="image-upload" className="inline-flex items-center gap-2 mt-3 rounded-xl bg-warm-gold px-4 py-2 text-xs font-bold tracking-[0.12em] text-warm-espresso transition hover:opacity-90 cursor-pointer">
                        <Camera size={12} />
                        CHOOSE FILE
                      </label>
                    </div>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className={labelCls}>Title *</label>
                  <input type="text" value={newImage.title} onChange={(e) => setNewImage((prev) => ({ ...prev, title: e.target.value }))} className={inputCls} placeholder="Image title" />
                </div>
                <div>
                  <label className={labelCls}>Alt Text</label>
                  <input type="text" value={newImage.altText} onChange={(e) => setNewImage((prev) => ({ ...prev, altText: e.target.value }))} className={inputCls} placeholder="Alt text for accessibility" />
                </div>
              </div>

              <div>
                <label className={labelCls}>Description</label>
                <textarea value={newImage.description} onChange={(e) => setNewImage((prev) => ({ ...prev, description: e.target.value }))} rows={3} className={`${inputCls} resize-none`} placeholder="Brief description of the image" />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className={labelCls}>Section *</label>
                  <select value={newImage.section} onChange={(e) => setNewImage((prev) => ({ ...prev, section: e.target.value }))} className={inputCls}>
                    {sections.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
                  </select>
                </div>
                <div>
                  <label className={labelCls}>Component</label>
                  <select value={newImage.component} onChange={(e) => setNewImage((prev) => ({ ...prev, component: e.target.value }))} className={inputCls}>
                    {components.map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}
                  </select>
                </div>
              </div>

              <div className="flex items-center gap-6">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" checked={newImage.isActive} onChange={(e) => setNewImage((prev) => ({ ...prev, isActive: e.target.checked }))} className="w-4 h-4 rounded accent-warm-gold" />
                  <span className="text-sm font-semibold text-warm-espresso">Active</span>
                </label>
                <div>
                  <label className={labelCls}>Display Order</label>
                  <input type="number" value={newImage.order} onChange={(e) => setNewImage((prev) => ({ ...prev, order: parseInt(e.target.value) || 0 }))} className="w-20 rounded-xl border border-warm-charcoal/[0.1] bg-warm-ivory px-3 py-2.5 text-sm text-warm-charcoal focus:outline-none" min="0" />
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-3 p-6 border-t border-warm-charcoal/[0.07]">
              <button onClick={() => setShowUploadModal(false)} className="rounded-xl border border-warm-charcoal/[0.07] bg-white px-5 py-2.5 text-xs font-semibold text-warm-muted transition hover:text-warm-charcoal">
                Cancel
              </button>
              <button
                onClick={handleSaveImage}
                disabled={saving || !newImage.title || !selectedFile}
                className="inline-flex items-center gap-2 rounded-xl bg-warm-gold px-5 py-2.5 text-xs font-bold tracking-[0.18em] text-warm-espresso transition hover:opacity-90 disabled:opacity-50"
              >
                {saving ? <RefreshCw size={13} className="animate-spin" /> : <Save size={13} />}
                {saving ? 'SAVING...' : 'SAVE IMAGE'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Preview Modal */}
      {previewImage && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-warm-charcoal/40 backdrop-blur-sm p-4">
          <div className="rounded-2xl border border-warm-charcoal/[0.07] bg-white w-full max-w-4xl max-h-[90vh] overflow-y-auto shadow-xl">
            <div className="flex items-center justify-between p-6 border-b border-warm-charcoal/[0.07]">
              <h2 className="text-sm font-bold tracking-[0.1em] text-warm-charcoal">{previewImage.title}</h2>
              <button onClick={() => setPreviewImage(null)} className="rounded-lg p-1 text-warm-muted hover:text-warm-charcoal transition-colors">
                <X size={18} />
              </button>
            </div>
            <div className="p-6 space-y-6">
              <img src={previewImage.imageUrl} alt={previewImage.altText || previewImage.title} className="w-full max-h-96 object-contain rounded-xl" />
              <div className="grid grid-cols-2 gap-6">
                <div className="space-y-3">
                  <p className="text-[10px] font-bold tracking-[0.2em] text-warm-gold/70">DETAILS</p>
                  {[['Section', previewImage.section], ['Component', previewImage.component], ['Order', previewImage.order]].map(([k, v]) => (
                    <div key={k}>
                      <p className="text-[10px] text-warm-muted">{k}</p>
                      <p className="text-xs font-semibold text-warm-espresso">{v}</p>
                    </div>
                  ))}
                  <div>
                    <p className="text-[10px] text-warm-muted">Status</p>
                    <p className={`text-xs font-semibold ${previewImage.isActive ? 'text-emerald-700' : 'text-red-600'}`}>{previewImage.isActive ? 'Active' : 'Inactive'}</p>
                  </div>
                </div>
                <div className="space-y-3">
                  <p className="text-[10px] font-bold tracking-[0.2em] text-warm-gold/70">DESCRIPTION</p>
                  <p className="text-xs text-warm-muted leading-relaxed">{previewImage.description || 'No description provided.'}</p>
                  {previewImage.altText && (
                    <>
                      <p className="text-[10px] font-bold tracking-[0.2em] text-warm-gold/70 pt-2">ALT TEXT</p>
                      <p className="text-xs text-warm-muted">{previewImage.altText}</p>
                    </>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </DashboardShell>
  )
}
