import { useState, useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { toast } from 'react-toastify'
import { ArrowLeft, Save, Eye, Tag, Image, Clock, Trash2 } from 'lucide-react'
import { blogAPI, uploadAPI, resolveUploadUrl } from '../utils/api'
import { normalizeBlogContent, renderBlogContent } from '../utils/blogContent'
import DashboardShell from '../components/dashboard/DashboardShell'

const categories = [
  { id: 'faith', name: 'Faith & Spirituality' },
  { id: 'testimony', name: 'Testimonies' },
  { id: 'teaching', name: 'Bible Teachings' },
  { id: 'news', name: 'Church News' },
  { id: 'devotional', name: 'Devotionals' },
  { id: 'announcement', name: 'Announcements' },
]

const inputCls = 'w-full rounded-xl border border-warm-charcoal/[0.1] bg-warm-ivory px-4 py-3 text-sm text-warm-charcoal placeholder-warm-muted focus:border-warm-gold/40 focus:outline-none focus:bg-white'
const labelCls = 'mb-1.5 block text-[10px] font-semibold uppercase tracking-[0.2em] text-warm-muted'
const panelCls = 'rounded-2xl border border-warm-charcoal/[0.07] bg-white p-5 space-y-4 shadow-sm'

export default function EditBlogPost() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const { id } = useParams()

  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [imageUploading, setImageUploading] = useState(false)
  const [preview, setPreview] = useState(false)
  const [draggedImageIndex, setDraggedImageIndex] = useState(null)
  const [originalPost, setOriginalPost] = useState(null)
  const [formData, setFormData] = useState({
    title: '',
    excerpt: '',
    content: '',
    category: 'faith',
    featuredImage: '',
    galleryImages: [],
    tags: [],
    status: 'draft',
  })
  const [tagInput, setTagInput] = useState('')

  useEffect(() => { fetchBlogPost() }, [id])

  const fetchBlogPost = async () => {
    try {
      setLoading(true)
      const post = await blogAPI.getPost(id)
      setOriginalPost(post)
      setFormData({
        title: post.title,
        excerpt: post.excerpt,
        content: post.content,
        category: post.category,
        featuredImage: post.featuredImage || '',
        galleryImages: Array.isArray(post.galleryImages)
          ? post.galleryImages.map((img) => img?.url || img?.image_url || img?.path || img?.src || img)
          : [],
        tags: post.tags || [],
        status: post.status,
      })
    } catch (error) {
      toast.error('Failed to load blog post')
      navigate('/blog/manage')
    } finally {
      setLoading(false)
    }
  }

  const handleChange = (e) => {
    const { name, value } = e.target
    setFormData((prev) => ({ ...prev, [name]: value }))
  }

  const handleAddTag = () => {
    if (tagInput.trim() && !formData.tags.includes(tagInput.trim())) {
      setFormData((prev) => ({ ...prev, tags: [...prev.tags, tagInput.trim()] }))
      setTagInput('')
    }
  }

  const handleRemoveTag = (tagToRemove) => {
    setFormData((prev) => ({ ...prev, tags: prev.tags.filter((t) => t !== tagToRemove) }))
  }

  const handleTagInputKeyPress = (e) => {
    if (e.key === 'Enter') { e.preventDefault(); handleAddTag() }
  }

  const handleFeaturedImageUpload = async (event) => {
    const files = Array.from(event.target.files || [])
    if (!files.length) return
    try {
      uploadAPI.validateFile(files[0], {
        maxSize: 10 * 1024 * 1024,
        allowedImageTypes: ['image/jpeg', 'image/png', 'image/webp', 'image/gif'],
      })
      setImageUploading(true)
      const uploadedUrls = []
      for (const file of files) {
        const result = await uploadAPI.upload(file)
        const uploadedUrl = resolveUploadUrl(result?.url || result?.file_path || result?.data?.url || result?.data?.file_path)
        if (uploadedUrl) uploadedUrls.push(uploadedUrl)
      }
      setFormData((prev) => {
        const nextGallery = Array.from(new Set([...prev.galleryImages, ...uploadedUrls]))
        return { ...prev, featuredImage: nextGallery[0] || prev.featuredImage || '', galleryImages: nextGallery }
      })
      toast.success(`${files.length} image${files.length > 1 ? 's' : ''} uploaded successfully`)
    } catch (error) {
      toast.error(error.message || 'Failed to upload image')
    } finally {
      setImageUploading(false)
      event.target.value = ''
    }
  }

  const handleRemoveGalleryImage = (imageToRemove) => {
    setFormData((prev) => {
      const nextGallery = prev.galleryImages.filter((img) => img !== imageToRemove)
      return { ...prev, featuredImage: nextGallery[0] || '', galleryImages: nextGallery }
    })
  }

  const handleGalleryDragStart = (index) => setDraggedImageIndex(index)
  const handleGalleryDragEnd = () => setDraggedImageIndex(null)

  const handleGalleryDrop = (targetIndex) => {
    if (draggedImageIndex === null || draggedImageIndex === targetIndex) return
    setFormData((prev) => {
      const nextGallery = [...prev.galleryImages]
      const [moved] = nextGallery.splice(draggedImageIndex, 1)
      nextGallery.splice(targetIndex, 0, moved)
      return { ...prev, galleryImages: nextGallery, featuredImage: nextGallery[0] || prev.featuredImage || '' }
    })
    setDraggedImageIndex(null)
  }

  const handleCoverDrop = () => {
    if (draggedImageIndex === null || draggedImageIndex === 0) return
    setFormData((prev) => {
      const nextGallery = [...prev.galleryImages]
      const [moved] = nextGallery.splice(draggedImageIndex, 1)
      nextGallery.unshift(moved)
      return { ...prev, galleryImages: nextGallery, featuredImage: nextGallery[0] || '' }
    })
    setDraggedImageIndex(null)
  }

  const handleSetCover = (index) => {
    if (index === 0) return
    setFormData((prev) => {
      const nextGallery = [...prev.galleryImages]
      const [moved] = nextGallery.splice(index, 1)
      nextGallery.unshift(moved)
      return { ...prev, galleryImages: nextGallery, featuredImage: nextGallery[0] || '' }
    })
  }

  const hasChanges = () => {
    if (!originalPost) return false
    const originalGallery = Array.isArray(originalPost.galleryImages)
      ? originalPost.galleryImages.map((img) => img?.url || img?.image_url || img?.path || img?.src || img)
      : []
    return JSON.stringify(formData) !== JSON.stringify({
      title: originalPost.title,
      excerpt: originalPost.excerpt,
      content: originalPost.content,
      category: originalPost.category,
      featuredImage: originalPost.featuredImage || '',
      galleryImages: originalGallery,
      tags: originalPost.tags || [],
      status: originalPost.status,
    })
  }

  const handleSubmit = async (e, status = formData.status) => {
    e.preventDefault()
    if (!formData.title || !formData.excerpt || !formData.content) {
      toast.error('Please fill in all required fields')
      return
    }
    setSaving(true)
    try {
      const postData = {
        ...formData,
        content: normalizeBlogContent(formData.content),
        featured_image: formData.featuredImage || formData.galleryImages[0] || '',
        gallery_images: Array.from(new Set([formData.featuredImage, ...formData.galleryImages].filter(Boolean))),
        status,
      }
      await blogAPI.updatePost(id, postData, user.token)
      toast.success(`Post ${status === 'published' ? 'published' : 'saved'} successfully!`)
      navigate('/blog/manage')
    } catch (error) {
      toast.error('Failed to update blog post')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async () => {
    if (!window.confirm('Delete this post? This cannot be undone.')) return
    try {
      await blogAPI.deletePost(id, user.token)
      toast.success('Post deleted successfully')
      navigate('/blog/manage')
    } catch (error) {
      toast.error('Failed to delete blog post')
    }
  }

  const calculateReadTime = () => Math.ceil(formData.content.split(/\s+/).length / 200)
  const primaryImage = formData.featuredImage || formData.galleryImages[0] || ''

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
      <div className="mx-auto max-w-6xl px-5 sm:px-8 py-8 space-y-6">

        {/* Header */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b border-warm-charcoal/[0.07] pb-8">
          <div className="flex items-center gap-3 min-w-0">
            <button
              onClick={() => navigate('/blog/manage')}
              className="flex items-center gap-2 text-sm text-warm-muted transition hover:text-warm-charcoal shrink-0"
            >
              <ArrowLeft size={16} />
              Blog
            </button>
            <span className="text-warm-charcoal/20">|</span>
            <h1 className="text-xl font-black tracking-tighter text-warm-charcoal truncate">
              {formData.title || 'Edit Post'}
            </h1>
            {hasChanges() && (
              <span className="shrink-0 rounded-full px-2 py-0.5 text-[9px] font-bold tracking-[0.12em] text-amber-600 bg-amber-500/10">
                UNSAVED
              </span>
            )}
          </div>
          <div className="flex items-center gap-2 flex-wrap shrink-0">
            <button
              onClick={() => setPreview(!preview)}
              className="inline-flex items-center gap-2 rounded-xl border border-warm-charcoal/[0.07] bg-white px-4 py-2.5 text-xs font-semibold text-warm-muted transition hover:border-warm-charcoal/[0.12] hover:text-warm-charcoal shadow-sm"
            >
              <Eye size={13} />
              {preview ? 'EDIT' : 'PREVIEW'}
            </button>
            <button
              onClick={handleDelete}
              className="inline-flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 px-4 py-2.5 text-xs font-semibold text-red-600 transition hover:bg-red-100"
            >
              <Trash2 size={13} />
              DELETE
            </button>
            <button
              onClick={(e) => handleSubmit(e, formData.status)}
              disabled={saving || !hasChanges()}
              className="inline-flex items-center gap-2 rounded-xl border border-warm-charcoal/[0.07] bg-white px-4 py-2.5 text-xs font-semibold text-warm-muted transition hover:border-warm-charcoal/[0.12] hover:text-warm-charcoal shadow-sm disabled:opacity-40"
            >
              <Save size={13} />
              SAVE CHANGES
            </button>
            <button
              onClick={(e) => handleSubmit(e, 'published')}
              disabled={saving}
              className="inline-flex items-center gap-2 rounded-xl bg-warm-gold px-5 py-2.5 text-xs font-bold tracking-[0.18em] text-warm-espresso transition hover:opacity-90 disabled:opacity-50"
            >
              <Save size={13} />
              {saving ? 'SAVING...' : formData.status === 'published' ? 'UPDATE' : 'PUBLISH'}
            </button>
          </div>
        </div>

        {preview ? (
          <div className="rounded-2xl border border-warm-charcoal/[0.07] bg-white p-8 shadow-sm">
            <div className="flex items-center gap-4 mb-6">
              <span className="rounded-full px-3 py-1 text-[9px] font-bold tracking-[0.18em] text-warm-gold bg-warm-gold/10 capitalize">{formData.category}</span>
              <span className="text-xs text-warm-muted">{formData.status === 'published' ? 'Published' : 'Draft'}</span>
            </div>
            {primaryImage && (
              <div className="mb-8 overflow-hidden rounded-2xl">
                <img src={primaryImage} alt={formData.title || 'Featured preview'} className="h-72 w-full object-cover" />
              </div>
            )}
            {formData.galleryImages.length > 1 && (
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mb-8">
                {formData.galleryImages.slice(1).map((image, index) => (
                  <img key={`${image}-${index}`} src={image} alt={`Post media ${index + 1}`} className="h-40 w-full rounded-xl object-cover" />
                ))}
              </div>
            )}
            <h1 className="text-4xl font-bold text-warm-charcoal mb-6">{formData.title || 'Untitled Post'}</h1>
            <p className="text-lg text-warm-plum mb-8 leading-relaxed">{formData.excerpt || 'No excerpt provided'}</p>
            <div className="flex items-center gap-4 text-xs text-warm-muted mb-8 pb-6 border-b border-warm-charcoal/[0.07]">
              <div className="flex items-center gap-2"><Clock size={12} /><span>{calculateReadTime()} min read</span></div>
            </div>
            <div
              className="prose prose-lg max-w-none"
              dangerouslySetInnerHTML={{ __html: renderBlogContent(formData.content) || '<p class="text-warm-muted italic">No content yet...</p>' }}
            />
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Main content */}
            <div className="lg:col-span-2 space-y-5">
              <div className={panelCls}>
                <label className={labelCls}>Post Title</label>
                <input type="text" name="title" value={formData.title} onChange={handleChange} placeholder="Enter post title..." className={inputCls} required />
              </div>

              <div className={panelCls}>
                <label className={labelCls}>Excerpt</label>
                <textarea name="excerpt" value={formData.excerpt} onChange={handleChange} placeholder="Brief description of your post..." rows={3} className={`${inputCls} resize-none`} required />
                <p className="text-[10px] text-warm-muted">{formData.excerpt.length}/300 characters</p>
              </div>

              <div className={panelCls}>
                <div className="flex items-center justify-between">
                  <label className={`${labelCls} mb-0`}>Content</label>
                  <button type="button" onClick={() => setPreview(true)} className="text-[10px] text-warm-muted transition hover:text-warm-gold">Preview</button>
                </div>
                <textarea name="content" value={formData.content} onChange={handleChange} placeholder="Write your post content here." rows={20} className={`${inputCls} resize-none font-mono text-sm`} required />
                <p className="text-[10px] text-warm-muted">
                  {formData.content.split(/\s+/).filter((w) => w.length > 0).length} words · {calculateReadTime()} min read
                </p>
              </div>
            </div>

            {/* Sidebar */}
            <div className="space-y-5">
              {/* Publish */}
              <div className={panelCls}>
                <p className="text-[9px] font-bold tracking-[0.22em] text-warm-gold/70">PUBLISH</p>
                <div>
                  <label className={labelCls}>Status</label>
                  <select name="status" value={formData.status} onChange={handleChange} className={inputCls}>
                    <option value="draft">Draft</option>
                    <option value="published">Published</option>
                    <option value="archived">Archived</option>
                  </select>
                </div>
                <div className="flex gap-2 pt-1">
                  <button type="button" onClick={(e) => handleSubmit(e, formData.status)} disabled={saving || !hasChanges()} className="flex-1 rounded-xl border border-warm-charcoal/[0.07] bg-white py-2.5 text-xs font-semibold text-warm-muted transition hover:text-warm-charcoal disabled:opacity-40">
                    {hasChanges() ? 'Save Changes' : 'No Changes'}
                  </button>
                  <button type="button" onClick={(e) => handleSubmit(e, 'published')} disabled={saving} className="flex-1 rounded-xl bg-warm-gold py-2.5 text-xs font-bold tracking-[0.12em] text-warm-espresso transition hover:opacity-90 disabled:opacity-50">
                    {formData.status === 'published' ? 'Update' : 'Publish'}
                  </button>
                </div>
                {originalPost && (
                  <div className="pt-3 border-t border-warm-charcoal/[0.07] space-y-2">
                    {[
                      ['Created', new Date(originalPost.createdAt).toLocaleDateString()],
                      ['Updated', new Date(originalPost.updatedAt).toLocaleDateString()],
                      ['Views', originalPost.views],
                      ['Likes', originalPost.likes?.length ?? 0],
                    ].map(([k, v]) => (
                      <div key={k} className="flex items-center justify-between text-xs">
                        <span className="text-warm-muted">{k}</span>
                        <span className="font-semibold text-warm-espresso">{v}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Category */}
              <div className={panelCls}>
                <div className="flex items-center gap-2">
                  <Tag size={13} className="text-warm-muted" />
                  <p className="text-[9px] font-bold tracking-[0.22em] text-warm-gold/70">CATEGORY</p>
                </div>
                <select name="category" value={formData.category} onChange={handleChange} className={inputCls}>
                  {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>

              {/* Tags */}
              <div className={panelCls}>
                <div className="flex items-center gap-2">
                  <Tag size={13} className="text-warm-muted" />
                  <p className="text-[9px] font-bold tracking-[0.22em] text-warm-gold/70">TAGS</p>
                </div>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={tagInput}
                    onChange={(e) => setTagInput(e.target.value)}
                    onKeyPress={handleTagInputKeyPress}
                    placeholder="Add a tag..."
                    className={`${inputCls} flex-1`}
                  />
                  <button type="button" onClick={handleAddTag} className="rounded-xl border border-warm-charcoal/[0.07] bg-warm-ivory px-3 py-2.5 text-xs text-warm-muted transition hover:text-warm-charcoal">
                    Add
                  </button>
                </div>
                {formData.tags.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {formData.tags.map((tag) => (
                      <span key={tag} className="inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[10px] font-semibold text-warm-gold bg-warm-gold/10">
                        {tag}
                        <button type="button" onClick={() => handleRemoveTag(tag)} className="hover:text-warm-charcoal">×</button>
                      </span>
                    ))}
                  </div>
                )}
              </div>

              {/* Photos */}
              <div className={panelCls}>
                <div className="flex items-center gap-2">
                  <Image size={13} className="text-warm-muted" />
                  <p className="text-[9px] font-bold tracking-[0.22em] text-warm-gold/70">POST PHOTOS</p>
                </div>
                <input
                  type="url"
                  name="featuredImage"
                  value={formData.featuredImage}
                  onChange={handleChange}
                  placeholder="Cover image URL (optional)..."
                  className={inputCls}
                />
                <label className="inline-flex cursor-pointer items-center justify-center gap-2 rounded-xl border border-warm-charcoal/[0.1] bg-warm-ivory px-4 py-2.5 text-xs font-semibold text-warm-muted transition hover:border-warm-gold/30 hover:text-warm-gold">
                  <Image size={13} />
                  <span>{imageUploading ? 'Uploading...' : 'Add Photos'}</span>
                  <input type="file" accept="image/*" className="hidden" multiple onChange={handleFeaturedImageUpload} disabled={imageUploading} />
                </label>

                {formData.galleryImages.length > 0 && (
                  <div className="space-y-3">
                    <div
                      onDragOver={(e) => e.preventDefault()}
                      onDrop={handleCoverDrop}
                      className="rounded-xl border border-dashed border-warm-gold/20 bg-warm-gold/[0.04] p-3 text-center"
                    >
                      <p className="text-[9px] font-bold tracking-[0.2em] text-warm-gold/70">COVER PHOTO</p>
                      <p className="mt-0.5 text-[10px] text-warm-muted">Drag any photo here to set as cover.</p>
                    </div>
                    <p className="text-[9px] font-bold tracking-[0.2em] text-warm-muted">DRAG TO REORDER</p>
                    <div className="grid grid-cols-2 gap-2">
                      {formData.galleryImages.map((image, index) => (
                        <div
                          key={`${image}-${index}`}
                          draggable
                          onDragStart={() => handleGalleryDragStart(index)}
                          onDragOver={(e) => e.preventDefault()}
                          onDrop={() => handleGalleryDrop(index)}
                          onDragEnd={handleGalleryDragEnd}
                          className={`relative group overflow-hidden rounded-xl border transition-transform ${
                            draggedImageIndex === index ? 'scale-95 border-warm-gold/40' : 'border-warm-charcoal/[0.07]'
                          }`}
                        >
                          <img src={image} alt={`Gallery ${index + 1}`} className="h-24 w-full object-cover" />
                          <button
                            type="button"
                            onClick={() => handleRemoveGalleryImage(image)}
                            className="absolute top-1.5 right-1.5 rounded-full bg-black/70 px-2 py-0.5 text-[10px] text-white opacity-0 transition-opacity group-hover:opacity-100"
                          >
                            Remove
                          </button>
                          {image === formData.featuredImage && (
                            <span className="absolute bottom-1.5 left-1.5 rounded-full bg-warm-gold px-2 py-0.5 text-[9px] font-bold text-warm-espresso">Cover</span>
                          )}
                          {image !== formData.featuredImage && (
                            <button
                              type="button"
                              onClick={() => handleSetCover(index)}
                              className="absolute bottom-1.5 left-1.5 rounded-full bg-white/90 px-2 py-0.5 text-[9px] font-bold text-warm-charcoal opacity-0 transition-opacity group-hover:opacity-100"
                            >
                              Set cover
                            </button>
                          )}
                          <span className="absolute bottom-1.5 right-1.5 rounded-full bg-black/60 px-1.5 py-0.5 text-[9px] font-bold text-white">#{index + 1}</span>
                        </div>
                      ))}
                    </div>
                    <p className="text-[10px] text-warm-muted">First image becomes the cover.</p>
                  </div>
                )}
              </div>

              {/* Post Info */}
              <div className={panelCls}>
                <p className="text-[9px] font-bold tracking-[0.22em] text-warm-gold/70">POST INFO</p>
                <div className="space-y-3">
                  {[
                    ['Author', user?.name || '—'],
                    ['Read Time', `${calculateReadTime()} min`],
                    ['Word Count', formData.content.split(/\s+/).filter((w) => w.length > 0).length],
                    ['Changes', hasChanges() ? 'Unsaved' : 'Saved'],
                  ].map(([k, v]) => (
                    <div key={k} className="flex items-center justify-between border-b border-warm-charcoal/[0.07] pb-3 text-xs">
                      <span className="text-warm-muted">{k}</span>
                      <span className={`font-semibold ${k === 'Changes' ? (hasChanges() ? 'text-amber-600' : 'text-emerald-700') : 'text-warm-espresso'}`}>{v}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </DashboardShell>
  )
}
