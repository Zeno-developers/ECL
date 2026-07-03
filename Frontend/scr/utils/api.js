/**
 * Eternal Love Church API Client
 * Communication layer between React frontend and PHP backend
 * Supports both church website features and Church Management System (CMS)
 */

import { API_CONFIG, ENDPOINTS } from '../config/api';

// Base URL precedence:
// 1) VITE_API_BASE_URL (new deployment var)
// 2) VITE_API_URL (legacy var for backward compatibility)
// 3) API_CONFIG.BASE_URL (config fallback)
// 4) /api (Vite proxy/local fallback)
const BASE_URL =
  import.meta.env.VITE_API_BASE_URL ||
  import.meta.env.VITE_API_URL ||
  API_CONFIG.BASE_URL ||
  '/api';

// =============================
// AUTH TOKEN MANAGEMENT
// =============================

const getAuthToken = () => localStorage.getItem('token');
const getRefreshToken = () => localStorage.getItem('refresh_token');

const OFFLINE_CACHE_PREFIX = 'elchurch_api_cache_v1:';
const OFFLINE_CACHE_TTL = 7 * 24 * 60 * 60 * 1000;
const REFRESH_FAILURE_CACHE_KEY = 'elchurch_auth_refresh_failed_at';
const REFRESH_FAILURE_COOLDOWN_MS = 30 * 1000;

const setTokens = (token, refreshToken = null, notify = true) => {
  localStorage.setItem('token', token);
  if (refreshToken) {
    localStorage.setItem('refresh_token', refreshToken);
  }
  if (notify) {
    window.dispatchEvent(new Event('auth:tokens-changed'));
  }
};

const clearTokens = () => {
  localStorage.removeItem('token');
  localStorage.removeItem('refresh_token');
  window.dispatchEvent(new Event('auth:tokens-changed'));
};

const isBrowser = () => typeof window !== 'undefined' && typeof localStorage !== 'undefined';

const getBackendOrigin = () => {
  const explicitOrigin = import.meta.env.VITE_BACKEND_ORIGIN;
  if (explicitOrigin) {
    try {
      return new URL(explicitOrigin).origin;
    } catch {
      return explicitOrigin.replace(/\/+$/, '');
    }
  }

  if (typeof BASE_URL === 'string' && /^https?:\/\//i.test(BASE_URL)) {
    try {
      return new URL(BASE_URL).origin;
    } catch {
      return '';
    }
  }

  return '';
};

const PUBLIC_ENDPOINT_PATTERNS = [
  /^\/auth\/(?:login|register|forgot-password|reset-password|refresh-token)(?:\/|$)/i,
  /^\/settings\/public(?:\/|$)/i,
  /^\/events\/public(?:\/|$)/i,
  /^\/sermons\/public(?:\/|$)/i,
  /^\/home-images(?:\/|$)/i,
  /^\/blog\/posts(?:\/|$)/i,
  /^\/giving\/funds(?:\/|$)/i,
  /^\/giving\/google-pay(?:\/|$)/i,
  /^\/giving\/snapscan\/create(?:\/|$)/i,
];

const isPublicEndpoint = (endpoint = '', method = 'GET') => {
  const normalizedMethod = String(method || 'GET').toUpperCase();

  if (normalizedMethod !== 'GET' && endpoint.startsWith('/blog/posts')) {
    return false;
  }

  return PUBLIC_ENDPOINT_PATTERNS.some((pattern) => pattern.test(endpoint));
};

const hasRecentRefreshFailure = () => {
  if (!isBrowser()) return false;
  const lastFailure = Number(localStorage.getItem(REFRESH_FAILURE_CACHE_KEY) || 0);
  return lastFailure > 0 && Date.now() - lastFailure < REFRESH_FAILURE_COOLDOWN_MS;
};

const recordRefreshFailure = () => {
  if (isBrowser()) {
    localStorage.setItem(REFRESH_FAILURE_CACHE_KEY, String(Date.now()));
  }
};

const clearRefreshFailure = () => {
  if (isBrowser()) {
    localStorage.removeItem(REFRESH_FAILURE_CACHE_KEY);
  }
};

export const resolveUploadUrl = (value) => {
  if (!value) return '';

  const raw = String(value).trim();
  if (!raw) return '';
  if (raw.startsWith('data:') || raw.startsWith('blob:') || /^https?:\/\//i.test(raw)) {
    return raw;
  }

  const normalized = raw
    .replace(/^\/+/, '')
    .replace(/^api\//i, '')
    .replace(/^uploads\//i, '');

  const publicPath = `uploads/${normalized}`;
  const backendOrigin = getBackendOrigin();

  if (backendOrigin) {
    return `${backendOrigin}/${publicPath}`;
  }

  return `/${publicPath}`;
};

const getOfflineCacheKey = (url, options = {}) => {
  const method = String(options.method || 'GET').toUpperCase();
  const tokenScope = getAuthToken() ? 'auth' : 'public';
  const extra = options.offlineCacheKey ? `:${options.offlineCacheKey}` : '';
  return `${OFFLINE_CACHE_PREFIX}${method}:${tokenScope}:${url}${extra}`;
};

const readOfflineCache = (url, options = {}) => {
  if (!isBrowser()) return null;

  try {
    const raw = localStorage.getItem(getOfflineCacheKey(url, options));
    if (!raw) return null;

    const parsed = JSON.parse(raw);
    const maxAge = options.cacheTtl ?? OFFLINE_CACHE_TTL;
    if (!parsed?.timestamp || Date.now() - parsed.timestamp > maxAge) {
      localStorage.removeItem(getOfflineCacheKey(url, options));
      return null;
    }

    return parsed.data ?? null;
  } catch {
    return null;
  }
};

const writeOfflineCache = (url, options = {}, data) => {
  if (!isBrowser()) return;

  try {
    localStorage.setItem(
      getOfflineCacheKey(url, options),
      JSON.stringify({
        timestamp: Date.now(),
        data,
      })
    );
  } catch (error) {
    console.warn(`Failed to cache offline response for ${url}:`, error);
  }
};

const isNetworkFailure = (error) => {
  const message = String(error?.message || '');
  return (
    error?.status == null &&
    (
      message.includes('Failed to fetch') ||
      message.includes('NetworkError') ||
      message.includes('Load failed') ||
      message.includes('fetch')
    )
  );
};

// =============================
// HTTP REQUEST HANDLER
// =============================

const apiClient = async (endpoint, options = {}) => {
  const url = `${BASE_URL}${endpoint}`;
  const token = getAuthToken();
  const method = String(options.method || 'GET').toUpperCase();
  const endpointIsPublic = options.public === true || isPublicEndpoint(endpoint, method);

  const defaultHeaders = {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
  };

  // Public endpoints should stay public even when a session token exists.
  if (token && !endpointIsPublic) {
    defaultHeaders['Authorization'] = `Bearer ${token}`;
  }

  const config = {
    ...options,
    headers: {
      ...defaultHeaders,
      ...options.headers,
    },
  };

  try {
    const response = await fetch(url, config);
    
    // Handle 401 Unauthorized - try refresh token
    if (response.status === 401 && !endpointIsPublic) {
      if (getRefreshToken() && !hasRecentRefreshFailure()) {
        const refreshed = await refreshAuthToken();
        if (refreshed) {
          // Retry original request with new token
          config.headers['Authorization'] = `Bearer ${getAuthToken()}`;
          const retryResponse = await fetch(url, config);
          return handleResponse(retryResponse);
        }
      } else if (getAuthToken()) {
        // No refresh token (or refresh cooldown active) — stale token, clear it
        clearTokens();
      }
    }
    
    const data = await handleResponse(response);
    if (method === 'GET' && response.ok && options.offlineCache !== false) {
      writeOfflineCache(url, options, data);
    }
    return data;
  } catch (error) {
    if (method === 'GET' && options.offlineCache !== false) {
      const cached = readOfflineCache(url, options);
      if (cached !== null && (isNetworkFailure(error) || (typeof error?.status === 'number' && error.status >= 500))) {
        console.warn(`Serving cached response for ${endpoint}`);
        return cached;
      }
    }

    if (typeof error?.status === 'number' && error.status === 404 && (
      endpoint.startsWith('/giving/trends') ||
      endpoint.startsWith('/giving/projections')
    )) {
      return { data: endpoint.startsWith('/giving/trends') ? [] : {}, status: 'success' };
    }

    console.error(`API Error [${endpoint}]:`, error);
    throw error;
  }
};

const handleResponse = async (response) => {
  // Get the raw text first to avoid stream issues
  const text = await response.text();
  let data;
  
  // Try to parse as JSON
  if (text) {
    try {
      data = JSON.parse(text);
    } catch (e) {
      // If not JSON, return the text as-is
      data = { raw: text };
    }
  } else {
    data = {};
  }
  
  if (!response.ok) {
    const error = new Error(data?.message || data?.error || `HTTP ${response.status}`);
    error.status = response.status;
    error.data = data;
    throw error;
  }
  
  return data;
};

const unwrapData = (payload) => (payload && typeof payload === 'object' && 'data' in payload ? payload.data : payload);

const normalizeMember = (member = {}) => {
  const firstName = member.first_name ?? member.firstName ?? '';
  const lastName = member.last_name ?? member.lastName ?? '';
  const id = member.id ?? member._id ?? member.user_id ?? null;

  return {
    ...member,
    id,
    _id: member._id ?? id,
    first_name: firstName,
    last_name: lastName,
    firstName,
    lastName,
    name: member.name ?? `${firstName} ${lastName}`.trim(),
    status: member.status ?? (member.is_active === 0 ? 'inactive' : 'active'),
    createdAt: member.createdAt ?? member.created_at ?? member.membership_date ?? null,
    joinDate: member.joinDate ?? member.membership_date ?? member.created_at ?? null,
  };
};

const normalizeChatRoom = (room = {}) => {
  const id = room.id ?? room._id ?? null;
  return {
    ...room,
    id,
    _id: room._id ?? id,
    memberCount: room.memberCount ?? room.participant_count ?? room.member_count ?? 0,
    messageCount: room.messageCount ?? room.message_count ?? 0,
    isPrivate: room.isPrivate ?? Boolean(room.is_private),
    isActive: room.isActive ?? Boolean(room.is_active ?? 1),
  };
};

const normalizeChatMessage = (message = {}) => {
  const id = message.id ?? message._id ?? null;
  const userId = message.user_id ?? message.userId ?? message.sender_id ?? null;
  const firstName = message.first_name ?? message.sender_first_name ?? '';
  const lastName = message.last_name ?? message.sender_last_name ?? '';
  const senderName = `${firstName} ${lastName}`.trim() || message.sender_name || 'Unknown User';

  return {
    ...message,
    id,
    _id: message._id ?? id,
    content: message.content ?? message.message ?? '',
    message: message.message ?? message.content ?? '',
    createdAt: message.createdAt ?? message.created_at ?? new Date().toISOString(),
    timestamp: message.timestamp ?? message.created_at ?? message.createdAt ?? new Date().toISOString(),
    fileUrl: message.fileUrl ?? message.file_url ?? null,
    fileName: message.fileName ?? message.file_name ?? null,
    user: message.user ?? {
      _id: userId,
      id: userId,
      name: senderName,
      first_name: firstName || undefined,
      last_name: lastName || undefined,
    },
    sender: message.sender ?? {
      _id: userId,
      id: userId,
      name: senderName,
    },
  };
};

const normalizeBlogPost = (post = {}) => {
  const id = post.id ?? post._id ?? null;
  const firstName = post.first_name ?? post.author_first_name ?? '';
  const lastName = post.last_name ?? post.author_last_name ?? '';
  const authorName = `${firstName} ${lastName}`.trim() || post.author_name || 'Church Admin';
  const likes = Array.isArray(post.likes) ? post.likes : [];
  let tags = post.tags ?? [];
  if (typeof tags === 'string') {
    try {
      tags = JSON.parse(tags);
    } catch {
      tags = tags.split(',').map((tag) => tag.trim()).filter(Boolean);
    }
  }

  let galleryImages = post.galleryImages ?? post.gallery_images ?? [];
  if (typeof galleryImages === 'string') {
    try {
      galleryImages = JSON.parse(galleryImages);
    } catch {
      galleryImages = galleryImages.split(',').map((item) => item.trim()).filter(Boolean);
    }
  }
  if (!Array.isArray(galleryImages)) {
    galleryImages = [];
  }

  const resolvedFeatured = resolveUploadUrl(post.featuredImage ?? post.featured_image ?? galleryImages[0] ?? null);
  const resolvedGallery = galleryImages.map((image) => {
    if (image && typeof image === 'object') {
      return {
        ...image,
        url: resolveUploadUrl(image.url ?? image.image_url ?? image.path ?? image.src ?? image.file_path ?? ''),
      };
    }
    return resolveUploadUrl(image);
  }).filter(Boolean);

  return {
    ...post,
    id,
    _id: post._id ?? id,
    featuredImage: resolvedFeatured,
    galleryImages: resolvedGallery,
    tags,
    createdAt: post.createdAt ?? post.created_at ?? post.published_at ?? null,
    updatedAt: post.updatedAt ?? post.updated_at ?? null,
    author: post.author ?? {
      name: authorName,
      role: post.author_role ?? 'author',
      profileImage: post.author_profile_image ?? '',
    },
    likes,
    comments: Array.isArray(post.comments) ? post.comments : [],
    readTime: post.readTime ?? post.read_time ?? 0,
  };
};

// =============================
// TOKEN REFRESH
// =============================

let refreshPromise = null;

const refreshAuthToken = async () => {
  if (refreshPromise) {
    return refreshPromise;
  }

  const refreshToken = getRefreshToken();
  if (!refreshToken || hasRecentRefreshFailure()) {
    return false;
  }

  refreshPromise = (async () => {
    const response = await fetch(`${BASE_URL}/auth/refresh-token`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ refresh_token: refreshToken }),
    });

    if (!response.ok) {
      recordRefreshFailure();
      clearTokens();
      return false;
    }

    const data = await response.json();
    setTokens(data.token, data.refresh_token, false);
    clearRefreshFailure();
    return true;
  })();

  try {
    return await refreshPromise;
  } catch (error) {
    console.error('Token refresh failed:', error);
    recordRefreshFailure();
    clearTokens();
    return false;
  } finally {
    refreshPromise = null;
  }
};

// =============================
// AUTH API
// =============================

export const authAPI = {
  login: async (identifier, password) => {
    try {
      const isPhone = !identifier.includes('@')
      const data = await apiClient('/auth/login', {
        method: 'POST',
        body: JSON.stringify(isPhone ? { phone: identifier, password } : { email: identifier, password }),
      });
      
      // Safety check: ensure data exists and has expected properties
      if (!data || typeof data !== 'object') {
        return { status: 'error', message: 'Invalid response from server' };
      }
      
      // If the response has token, save it
      if (data.token) {
        setTokens(data.token, data.refresh_token);
      }
      
      return data;
    } catch (error) {
      return { status: 'error', message: error.message || 'Login failed. Please try again.' };
    }
  },

  verifyPin: async (email, pin) => {
    return apiClient('/auth/verify-pin', { method: 'POST', body: JSON.stringify({ email, pin }), public: true })
  },

  resendPin: async (email) => {
    return apiClient('/auth/resend-pin', { method: 'POST', body: JSON.stringify({ email }), public: true })
  },

  register: async (userData) => {
    try {
      const fullName = (userData?.name || '').trim();
      const nameParts = fullName.split(/\s+/).filter(Boolean);
      const firstName = userData?.first_name || nameParts[0] || '';
      const lastName = userData?.last_name || nameParts.slice(1).join(' ') || '';

      const data = await apiClient('/auth/register', {
        method: 'POST',
        body: JSON.stringify({
          ...userData,
          first_name: firstName,
          last_name: lastName,
        }),
      });
      
      // Safety check: ensure data exists and has expected properties
      if (!data || typeof data !== 'object') {
        return { status: 'error', message: 'Invalid response from server' };
      }
      
      if (data.token) {
        setTokens(data.token, data.refresh_token);
      }
      
      return data;
    } catch (error) {
      console.error('authAPI.register error:', error);
      return { status: 'error', message: error.message || 'Registration failed. Please try again.' };
    }
  },

  logout: async () => {
    try {
      await apiClient('/auth/logout', { method: 'POST' });
    } finally {
      clearTokens();
    }
  },

  getProfile: async () => {
    return apiClient('/auth/profile');
  },

  // Alias for compatibility
  getCurrentUser: async () => {
    return apiClient('/auth/profile');
  },

  forgotPassword: async (identifier) => {
    const isPhone = !identifier.includes('@')
    return apiClient('/auth/forgot-password', {
      method: 'POST',
      body: JSON.stringify(isPhone ? { phone: identifier } : { email: identifier }),
    });
  },

  resetPassword: async (token, password) => {
    return apiClient('/auth/reset-password', {
      method: 'POST',
      body: JSON.stringify({ token, newPassword: password }),
    });
  },

  // Compatibility methods used by AuthContext/pages
  registerDeveloper: async (userData) => {
    const fullName = (userData?.name || '').trim();
    const nameParts = fullName.split(/\s+/).filter(Boolean);
    const firstName = userData?.first_name || nameParts[0] || 'Developer';
    const lastName =
      userData?.last_name || nameParts.slice(1).join(' ') || 'User';

    return authAPI.register({
      ...userData,
      first_name: firstName,
      last_name: lastName,
      role: 'member',
    });
  },

  updatePassword: async (passwordData) => {
    return apiClient('/auth/change-password', {
      method: 'POST',
      body: JSON.stringify(passwordData),
    });
  },

  forceChangePassword: async (passwordData) => {
    return apiClient('/auth/change-password', {
      method: 'POST',
      body: JSON.stringify(passwordData),
    });
  },

  adminCreateUser: async (userData) => {
    return authAPI.register(userData);
  },
};

// =============================
// MEMBERS API
// =============================

export const membersAPI = {
  getAll: async (params = {}) => {
    const query = new URLSearchParams(params).toString();
    const response = await apiClient(`/members${query ? `?${query}` : ''}`);
    const members = Array.isArray(unwrapData(response))
      ? unwrapData(response).map(normalizeMember)
      : [];
    return { ...(response || {}), data: members };
  },

  // getMembers is an alias for getAll to maintain compatibility
  getMembers: async (params = {}) => {
    const query = new URLSearchParams(params).toString();
    const response = await apiClient(`/members${query ? `?${query}` : ''}`);
    const members = Array.isArray(unwrapData(response))
      ? unwrapData(response).map(normalizeMember)
      : [];
    return members;
  },

  getOne: async (id) => {
    const response = await apiClient(`/members/${id}`);
    const member = normalizeMember(unwrapData(response) || {});
    return { ...(response || {}), data: member };
  },

  getOverview: (id) => apiClient(`/members/${id}/overview`),

  create: async (memberData) => {
    const response = await apiClient('/members', {
      method: 'POST',
      body: JSON.stringify(memberData),
    });
    return { ...(response || {}), data: normalizeMember(unwrapData(response) || {}) };
  },

  update: async (id, memberData) => {
    const response = await apiClient(`/members/${id}`, {
      method: 'PUT',
      body: JSON.stringify(memberData),
    });
    return { ...(response || {}), data: normalizeMember(unwrapData(response) || {}) };
  },

  delete: async (id) => {
    return apiClient(`/members/${id}`, { method: 'DELETE' });
  },

  search: async (query) => {
    const response = await apiClient(`/members/search?q=${encodeURIComponent(query)}`);
    const members = Array.isArray(unwrapData(response))
      ? unwrapData(response).map(normalizeMember)
      : [];
    return { ...(response || {}), data: members };
  },

  getStats: async () => {
    return apiClient('/members/stats');
  },

  updateRole: async (id, role) => {
    return apiClient(`/members/${id}/role`, {
      method: 'PATCH',
      body: JSON.stringify({ role }),
    });
  },

  // Additional aliases for compatibility
  updateMember: async (id, memberData) => {
    const response = await apiClient(`/members/${id}`, {
      method: 'PUT',
      body: JSON.stringify(memberData),
    });
    return { ...(response || {}), data: normalizeMember(unwrapData(response) || {}) };
  },

  deleteMember: async (id) => {
    return apiClient(`/members/${id}`, { method: 'DELETE' });
  },

  addMember: async (memberData) => {
    const response = await apiClient('/members', {
      method: 'POST',
      body: JSON.stringify(memberData),
    });
    return { ...(response || {}), data: normalizeMember(unwrapData(response) || {}) };
  },

  updateMemberRole: async (id, role) => {
    return apiClient(`/members/${id}/role`, {
      method: 'PATCH',
      body: JSON.stringify({ role }),
    });
  },

  searchMembers: async (query) => {
    const response = await apiClient(`/members/search?q=${encodeURIComponent(query)}`);
    return Array.isArray(unwrapData(response))
      ? unwrapData(response).map(normalizeMember)
      : [];
  },

  updateProfile: async (profileData) => {
    const fullName = (profileData?.name || '').trim();
    const nameParts = fullName.split(/\s+/).filter(Boolean);
    const firstName = profileData?.first_name || profileData?.firstName || nameParts[0];
    const lastName = profileData?.last_name || profileData?.lastName || nameParts.slice(1).join(' ');

    const payload = {
      ...profileData,
      first_name: firstName || profileData?.first_name || '',
      last_name: lastName || profileData?.last_name || '',
      date_of_birth: profileData?.date_of_birth || profileData?.birthday || null,
      birthday: undefined,
      name: undefined,
      firstName: undefined,
      lastName: undefined,
    };

    const response = await apiClient('/members/profile', {
      method: 'PUT',
      body: JSON.stringify(payload),
    });
    const member = unwrapData(response)?.member ?? unwrapData(response);
    return { ...(response || {}), data: { member: normalizeMember(member || {}) } };
  },

  getProfile: async () => {
    const response = await apiClient('/members/profile');
    const member = unwrapData(response)?.member ?? unwrapData(response);
    return { ...(response || {}), data: { member: normalizeMember(member || {}) } };
  },
};

// =============================
// EVENTS API
// =============================

export const eventsAPI = {
  getAll: async (params = {}) => {
    const query = new URLSearchParams(params).toString();
    return apiClient(`/events${query ? `?${query}` : ''}`);
  },

  // Aliases for compatibility
  getEvents: async (params = {}) => {
    const query = new URLSearchParams(params).toString();
    return apiClient(`/events${query ? `?${query}` : ''}`);
  },

  getPublic: async () => {
    return apiClient('/events/public');
  },

  getOne: async (id) => {
    return apiClient(`/events/${id}`);
  },

  create: async (eventData) => {
    return apiClient('/events', {
      method: 'POST',
      body: JSON.stringify(eventData),
    });
  },

  update: async (id, eventData) => {
    return apiClient(`/events/${id}`, {
      method: 'PUT',
      body: JSON.stringify(eventData),
    });
  },

  delete: async (id) => {
    return apiClient(`/events/${id}`, { method: 'DELETE' });
  },

  register: async (id, data = {}) => {
    return apiClient(`/events/${id}/register`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  getRegistrations: async (id) => {
    return apiClient(`/events/${id}/registrations`);
  },

  getStats: async () => {
    return apiClient('/events/stats');
  },

  // Additional aliases for compatibility
  deleteEvent: async (id) => {
    return apiClient(`/events/${id}`, { method: 'DELETE' });
  },

  updateEvent: async (id, eventData) => {
    return apiClient(`/events/${id}`, {
      method: 'PUT',
      body: JSON.stringify(eventData),
    });
  },

  createEvent: async (eventData) => {
    return apiClient('/events', {
      method: 'POST',
      body: JSON.stringify(eventData),
    });
  },

  getPublicEvents: async () => {
    return apiClient('/events/public');
  },

  registerForEvent: async (id, data = {}) => {
    return apiClient(`/events/${id}/register`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },
};

// =============================
// SERMONS API
// =============================

export const sermonsAPI = {
  getAll: async (params = {}) => {
    const query = new URLSearchParams(params).toString();
    return apiClient(`/sermons${query ? `?${query}` : ''}`);
  },

  getDrafts: async () => {
    return apiClient('/sermons/drafts');
  },

  getPublic: async () => {
    return apiClient('/sermons/public');
  },

  getPublicOne: async (id) => {
    return apiClient(`/sermons/public/${id}`);
  },

  getOne: async (id) => {
    return apiClient(`/sermons/${id}`);
  },

  create: async (sermonData) => {
    return apiClient('/sermons', {
      method: 'POST',
      body: JSON.stringify(sermonData),
    });
  },

  createSermon: async (sermonData, files = {}) => {
    const payload = { ...sermonData };

    const uploadFileAndGetAsset = async (file) => {
      if (!file) return null;
      const uploadResult = await uploadAPI.upload(file);
      const fileData = unwrapData(uploadResult) || uploadResult;
      return {
        url: resolveUploadUrl(fileData?.url || fileData?.file_path || ''),
        fileId: fileData?.file_id ?? fileData?.id ?? null,
      };
    };

    const [videoAsset, audioAsset, thumbnailAsset] = await Promise.all([
      uploadFileAndGetAsset(files?.video),
      uploadFileAndGetAsset(files?.audio),
      uploadFileAndGetAsset(files?.thumbnail),
    ]);

    if (videoAsset?.url) payload.video_url = videoAsset.url;
    if (audioAsset?.url) payload.audio_url = audioAsset.url;
    if (thumbnailAsset?.url) payload.thumbnail_url = thumbnailAsset.url;

    if (videoAsset?.fileId) payload.video_file_id = videoAsset.fileId;
    if (audioAsset?.fileId) payload.audio_file_id = audioAsset.fileId;
    if (thumbnailAsset?.fileId) payload.thumbnail_file_id = thumbnailAsset.fileId;

    if (payload.id) {
      const sermonId = payload.id;
      delete payload.id;
      return sermonsAPI.update(sermonId, payload);
    }

    return sermonsAPI.create(payload);
  },

  saveDraft: async (draftData) => {
    const payload = {
      ...draftData,
      status: 'draft',
      published: false,
    };

    if (payload.id && !String(payload.id).startsWith('draft-')) {
      const draftId = payload.id;
      delete payload.id;
      return sermonsAPI.update(draftId, payload);
    }

    delete payload.id;
    return sermonsAPI.create(payload);
  },

  update: async (id, sermonData) => {
    return apiClient(`/sermons/${id}`, {
      method: 'PUT',
      body: JSON.stringify(sermonData),
    });
  },

  delete: async (id) => {
    return apiClient(`/sermons/${id}`, { method: 'DELETE' });
  },

  publish: async (id) => {
    return apiClient(`/sermons/${id}/publish`, { method: 'PATCH' });
  },

  unpublish: async (id) => {
    return apiClient(`/sermons/${id}/unpublish`, { method: 'PATCH' });
  },

  getSeries: async () => {
    return apiClient('/sermons/series');
  },

  // Aliases for compatibility
  getPublicSermons: async () => {
    const response = await apiClient('/sermons/public');
    const raw = Array.isArray(unwrapData(response)) ? unwrapData(response) : [];
    return raw.map((sermon) => ({
      ...sermon,
      id: sermon.id ?? sermon._id,
      _id: sermon._id ?? sermon.id,
      videoUrl: resolveUploadUrl(sermon.videoUrl ?? sermon.video_url ?? null),
      audioUrl: resolveUploadUrl(sermon.audioUrl ?? sermon.audio_url ?? null),
      thumbnailUrl: resolveUploadUrl(sermon.thumbnailUrl ?? sermon.thumbnail_url ?? null),
      createdAt: sermon.createdAt ?? sermon.created_at ?? null,
      updatedAt: sermon.updatedAt ?? sermon.updated_at ?? null,
    }));
  },

  getPublicSermonSeries: async () => {
    const response = await apiClient('/sermons/series');
    const raw = Array.isArray(unwrapData(response)) ? unwrapData(response) : [];
    return raw
      .map((item) => (typeof item === 'string' ? item : item?.series))
      .filter(Boolean);
  },

  getStats: async () => {
    return apiClient('/sermons/stats');
  },

  getVideo: async (id) => apiClient(`/sermons/video/${id}`),
  getAudio: async (id) => apiClient(`/sermons/audio/${id}`),
  getThumbnail: async (id) => apiClient(`/sermons/thumbnail/${id}`),

  // Aliases for compatibility
  getSermons: async (params = {}) => {
    const query = new URLSearchParams(params).toString();
    return apiClient(`/sermons${query ? `?${query}` : ''}`);
  },

  // Helper methods for URL generation
  getVideoUrl: (videoPath) => {
    return resolveUploadUrl(videoPath);
  },

  getAudioUrl: (audioPath) => {
    return resolveUploadUrl(audioPath);
  },

  getThumbnailUrl: (thumbnailPath) => {
    return resolveUploadUrl(thumbnailPath);
  },

  formatFileSize: (bytes) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
  },
};

// =============================
// BLOG API
// =============================

export const blogAPI = {
  getPublicPosts: async (params = {}) => {
    const query = new URLSearchParams(params).toString();
    const response = await apiClient(`/blog/posts${query ? `?${query}` : ''}`);
    const posts = Array.isArray(unwrapData(response)) ? unwrapData(response).map(normalizeBlogPost) : [];
    const total = response?.pagination?.total ?? posts.length;
    const pages = response?.pagination?.pages ?? 1;
    const page = response?.pagination?.page ?? 1;
    return { posts, total, totalPages: pages, page };
  },

  getPublicPost: async (slug) => {
    const response = await apiClient(`/blog/posts/${slug}`);
    const post = normalizeBlogPost(unwrapData(response) || {});
    return post;
  },

  getCategories: async () => {
    return apiClient('/blog/categories');
  },

  getFeatured: async () => {
    return apiClient('/blog/featured');
  },

  search: async (query) => {
    return apiClient(`/blog/search?q=${encodeURIComponent(query)}`);
  },

  // Admin/Protected routes
  create: async (postData) => {
    return apiClient('/blog/posts', {
      method: 'POST',
      body: JSON.stringify(postData),
    });
  },

  update: async (id, postData) => {
    return apiClient(`/blog/posts/${id}`, {
      method: 'PUT',
      body: JSON.stringify(postData),
    });
  },

  delete: async (id) => {
    return apiClient(`/blog/posts/${id}`, { method: 'DELETE' });
  },

  getDrafts: async () => {
    return apiClient('/blog/drafts');
  },

  getStats: async () => {
    return apiClient('/blog/stats');
  },

  createCategory: async (categoryData) => {
    return apiClient('/blog/categories', {
      method: 'POST',
      body: JSON.stringify(categoryData),
    });
  },

  getComments: async (postId) => {
    return apiClient(`/blog/posts/${postId}/comments`);
  },

  addComment: async (postId, commentData) => {
    return apiClient(`/blog/posts/${postId}/comments`, {
      method: 'POST',
      body: JSON.stringify(commentData),
    });
  },

  // Aliases for compatibility
  getPost: async (slug) => {
    let response;
    const isNumericId = typeof slug === 'number' || /^\d+$/.test(String(slug));
    if (isNumericId) {
      try {
        response = await apiClient(`/blog/admin/posts/${slug}`);
      } catch {
        response = await apiClient(`/blog/posts/${slug}`);
      }
    } else {
      response = await apiClient(`/blog/posts/${slug}`);
    }
    let post = normalizeBlogPost(unwrapData(response) || {});

    if (post?.id || post?._id) {
      const postId = post.id ?? post._id;
      try {
        const commentsResponse = await apiClient(`/blog/posts/${postId}/comments`);
        const comments = Array.isArray(unwrapData(commentsResponse)) ? unwrapData(commentsResponse) : [];
        post = { ...post, comments };
      } catch {
        post = { ...post, comments: post.comments || [] };
      }
    }

    if (!Array.isArray(post.likes)) {
      post.likes = [];
    }

    return post;
  },

  getPosts: async (params = {}) => {
    const query = new URLSearchParams(params).toString();
    const useAdminEndpoint = Object.prototype.hasOwnProperty.call(params || {}, 'status');
    const endpoint = useAdminEndpoint ? '/blog/admin/posts' : '/blog/posts';
    const response = await apiClient(`${endpoint}${query ? `?${query}` : ''}`);
    const posts = Array.isArray(unwrapData(response)) ? unwrapData(response).map(normalizeBlogPost) : [];
    const total = response?.pagination?.total ?? posts.length;
    const pages = response?.pagination?.pages ?? 1;
    const page = response?.pagination?.page ?? 1;
    return { posts, total, totalPages: pages, page };
  },

  updatePost: async (id, postData) => {
    return apiClient(`/blog/posts/${id}`, {
      method: 'PUT',
      body: JSON.stringify(postData),
    });
  },

  deletePost: async (id) => {
    return apiClient(`/blog/posts/${id}`, { method: 'DELETE' });
  },

  createPost: async (postData) => {
    return apiClient('/blog/posts', {
      method: 'POST',
      body: JSON.stringify(postData),
    });
  },

  likePost: async (id) => {
    return apiClient(`/blog/posts/${id}/like`, { method: 'POST' });
  },

  likeComment: async (id) => {
    return apiClient(`/blog/comments/${id}/like`, { method: 'POST' });
  },

  createComment: async (postIdOrCommentData, commentDataMaybe) => {
    const postId =
      typeof postIdOrCommentData === 'object' && postIdOrCommentData !== null
        ? postIdOrCommentData.postId
        : postIdOrCommentData;

    const commentData =
      typeof postIdOrCommentData === 'object' && postIdOrCommentData !== null
        ? postIdOrCommentData
        : commentDataMaybe;

    const payload = {
      ...commentData,
      parent_id: commentData?.parent_id ?? commentData?.parentId ?? null,
    };

    return apiClient(`/blog/posts/${postId}/comments`, {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },

  updateComment: async (id, commentData) => {
    return apiClient(`/blog/comments/${id}`, {
      method: 'PUT',
      body: JSON.stringify(commentData),
    });
  },

  deleteComment: async (id) => {
    return apiClient(`/blog/comments/${id}`, { method: 'DELETE' });
  },
};

// =============================
// PRAYER API
// =============================

export const prayerAPI = {
  getAll: async (params = {}) => {
    const query = new URLSearchParams(params).toString();
    return apiClient(`/prayers${query ? `?${query}` : ''}`);
  },

  // Alias for compatibility
  getAllPrayers: async (params = {}) => {
    const query = new URLSearchParams(params).toString();
    return apiClient(`/prayers${query ? `?${query}` : ''}`);
  },

  getAllIncludingArchived: async () => {
    return apiClient('/prayers/all');
  },

  getOne: async (id) => {
    return apiClient(`/prayers/${id}`);
  },

  submit: async (prayerData) => {
    return apiClient('/prayers', {
      method: 'POST',
      body: JSON.stringify(prayerData),
    });
  },

  updateStatus: async (id, status) => {
    return apiClient(`/prayers/${id}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ status }),
    });
  },

  updatePriority: async (id, priority) => {
    return apiClient(`/prayers/${id}/priority`, {
      method: 'PATCH',
      body: JSON.stringify({ priority }),
    });
  },

  getStats: async () => {
    return apiClient('/prayers/stats');
  },

  // Aliases for compatibility with different naming conventions
  getPrayers: async (params = {}) => {
    const query = new URLSearchParams(params).toString();
    return apiClient(`/prayers${query ? `?${query}` : ''}`);
  },

  updatePrayerStatus: async (id, status) => {
    return apiClient(`/prayers/${id}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ status }),
    });
  },

  updatePrayerPriority: async (id, priority) => {
    return apiClient(`/prayers/${id}/priority`, {
      method: 'PATCH',
      body: JSON.stringify({ priority }),
    });
  },

  getPrayer: async (id) => {
    return apiClient(`/prayers/${id}`);
  },

  submitPrayer: async (prayerData) => {
    return apiClient('/prayers', {
      method: 'POST',
      body: JSON.stringify(prayerData),
    });
  },
};

// =============================
// GIVING API
// =============================

export const givingAPI = {
  getFunds: async () => {
    return apiClient('/giving/funds');
  },

  getHistory: async (params = {}) => {
    const query = new URLSearchParams(params).toString();
    return apiClient(`/giving${query ? `?${query}` : ''}`);
  },

  record: async (givingData) => {
    return apiClient('/giving', {
      method: 'POST',
      body: JSON.stringify(givingData),
    });
  },

  createSnapScanPayment: async (payload) => {
    return apiClient('/giving/snapscan/create', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },

  processGooglePay: async (payload) => {
    const token = getAuthToken()
    return apiClient('/giving/google-pay', {
      method: 'POST',
      body: JSON.stringify(payload),
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    });
  },

  getDonations: async (params = {}) => {
    const query = new URLSearchParams(params).toString();
    return apiClient(`/giving/donations${query ? `?${query}` : ''}`);
  },

  getSummary: async () => {
    return apiClient('/giving/summary');
  },

  getReports: async (params = {}) => {
    const query = new URLSearchParams(params).toString();
    return apiClient(`/giving/reports${query ? `?${query}` : ''}`);
  },

  getSundaySummary: async (serviceDate) => {
    const query = new URLSearchParams(
      serviceDate ? { service_date: serviceDate } : {}
    ).toString();
    return apiClient(`/giving/sunday-summary${query ? `?${query}` : ''}`);
  },

  getUserStats: async () => {
    const response = await apiClient('/giving/user-stats');
    const stats = unwrapData(response) || {};
    const byFund = Array.isArray(stats.by_fund) ? stats.by_fund : [];
    const favoriteFund = byFund.length > 0
      ? [...byFund].sort((a, b) => (Number(b.total) || 0) - (Number(a.total) || 0))[0]?.fund
      : 'General';

    return {
      ...stats,
      totalGiven: Number(stats.total_given || 0),
      donationCount: Number(stats.donation_count || 0),
      monthlyAverage: Number(stats.total_given || 0), // fallback until monthly metric is provided server-side
      favoriteFund: favoriteFund || 'General',
      total_given: Number(stats.total_given || 0),
      donation_count: Number(stats.donation_count || 0),
      by_fund: byFund,
      recent_donations: Array.isArray(stats.recent_donations) ? stats.recent_donations : [],
    };
  },

  getUserHistory: async (params = {}) => {
    const query = new URLSearchParams(params).toString();
    return apiClient(`/giving/user-history${query ? `?${query}` : ''}`);
  },

  getGoals: async () => {
    return apiClient('/giving/goals');
  },

  createGoal: async (goalData) => {
    return apiClient('/giving/goals', {
      method: 'POST',
      body: JSON.stringify(goalData),
    });
  },

  updateGoal: async (id, goalData) => {
    return apiClient(`/giving/goals/${id}`, {
      method: 'PUT',
      body: JSON.stringify(goalData),
    });
  },

  resendReceipt: async (donationId) => {
    return apiClient(`/giving/receipt/${donationId}/resend`, {
      method: 'POST',
    });
  },

  recordOffline: async (payload) => {
    return apiClient('/giving/offline', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },

  downloadReceipt: async (donationId) => {
    const token = getAuthToken();
    const response = await fetch(`${BASE_URL}/giving/receipt/${donationId}`, {
      method: 'GET',
      headers: {
        Accept: 'text/html',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
    });

    if (!response.ok) {
      const text = await response.text();
      throw new Error(text || `HTTP ${response.status}`);
    }

    return response.blob();
  },

  // Aliases for compatibility
  getGivingHistory: async (params = {}) => {
    const query = new URLSearchParams(params).toString();
    return apiClient(`/giving/donations${query ? `?${query}` : ''}`);
  },

  getGivingStats: async (params = {}) => {
    const query = new URLSearchParams(params).toString();
    return apiClient(`/giving/reports${query ? `?${query}` : ''}`);
  },

  getTrends: async ({ period = '6months' } = {}) => {
    try {
      return await apiClient(`/giving/trends?period=${encodeURIComponent(period)}`);
    } catch (error) {
      if (error?.status === 404) {
        return { data: [], status: 'success' };
      }
      throw error;
    }
  },

  getProjections: async ({ period = 'year' } = {}) => {
    try {
      return await apiClient(`/giving/projections?period=${encodeURIComponent(period)}`);
    } catch (error) {
      if (error?.status === 404) {
        return { data: {}, status: 'success' };
      }
      throw error;
    }
  },

  getUserStats: async () => {
    return apiClient('/giving/user-stats');
  },

  recordGiving: async (givingData) => {
    return apiClient('/giving', {
      method: 'POST',
      body: JSON.stringify(givingData),
    });
  },
};

// =============================
// SETTINGS API
// =============================

export const settingsAPI = {
  getAll: async () => {
    return apiClient('/settings');
  },

  update: async (settingsData) => {
    return apiClient('/settings', {
      method: 'POST',
      body: JSON.stringify(settingsData),
    });
  },

  getPublic: async () => {
    return apiClient('/settings/public');
  },

  getChurchInfo: async () => {
    return apiClient('/settings/church-info');
  },

  updateChurchInfo: async (infoData) => {
    return apiClient('/settings/church-info', {
      method: 'POST',
      body: JSON.stringify(infoData),
    });
  },

  // Aliases for compatibility
  getPublicSettings: async () => {
    const response = await apiClient('/settings/public');
    const payload = unwrapData(response) || {};
    const settings = payload.settings || {};
    const churchInfo = payload.church_info || {};

    const parsedSettings = Object.entries(settings).reduce((acc, [key, value]) => {
      if (typeof value !== 'string') {
        acc[key] = value;
        return acc;
      }
      const trimmed = value.trim();
      if (!trimmed) {
        acc[key] = value;
        return acc;
      }
      try {
        acc[key] = JSON.parse(trimmed);
      } catch {
        acc[key] = value;
      }
      return acc;
    }, {});

    return {
      status: 'success',
      data: {
        ...parsedSettings,
        ...churchInfo,
        serviceTimes: parsedSettings.serviceTimes || churchInfo.service_times || {},
        social: {
          facebook: parsedSettings.social_facebook || churchInfo.social_facebook || '',
          instagram: parsedSettings.social_instagram || churchInfo.social_instagram || '',
          youtube: parsedSettings.social_youtube || churchInfo.social_youtube || '',
          twitter: parsedSettings.social_twitter || churchInfo.social_twitter || '',
        },
        settings: parsedSettings,
        church_info: churchInfo,
      },
    };
  },

  getSettings: async () => {
    const response = await apiClient('/settings');
    const rows = Array.isArray(unwrapData(response)) ? unwrapData(response) : [];
    const settings = rows.reduce((acc, row) => {
      const key = row?.key_name;
      if (!key) return acc;
      let value = row.value;
      if (row.value_type === 'json' && typeof value === 'string') {
        try {
          value = JSON.parse(value);
        } catch {
          value = row.value;
        }
      }
      acc[key] = value;
      return acc;
    }, {});
    return { status: 'success', data: settings };
  },

  updateSettings: async (settingsData) => {
    return apiClient('/settings', {
      method: 'POST',
      body: JSON.stringify(settingsData),
    });
  },
};

// =============================
// VISITORS API
// =============================

export const visitorsAPI = {
  register: async (visitorData) => {
    return apiClient('/visitors', {
      method: 'POST',
      body: JSON.stringify(visitorData),
    });
  },

  checkin: async (visitorData) => {
    return apiClient('/visitors/checkin', {
      method: 'POST',
      body: JSON.stringify(visitorData),
    });
  },

  createMemberAccount: async (id) => {
    return apiClient(`/visitors/${id}/create-member-account`, {
      method: 'POST',
    });
  },

  getStats: async () => {
    return apiClient('/visitors/stats');
  },

  getRecent: async (limit = 10) => {
    return apiClient(`/visitors/recent?limit=${limit}`);
  },

  updateStatus: async (id, status) => {
    return apiClient(`/visitors/${id}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ status }),
    });
  },
};

// Alias for backward compatibility
export const visitorAPI = visitorsAPI;

// =============================
// ANALYTICS API
// =============================

export const analyticsAPI = {
  getWebsite: async (params = {}) => {
    const query = new URLSearchParams(params).toString();
    const response = await apiClient(`/analytics/website${query ? `?${query}` : ''}`);
    return response?.data ? { data: response.data } : response;
  },

  trackPageView: async (payload = {}) => {
    return apiClient('/analytics/pageview', {
      method: 'POST',
      body: JSON.stringify(payload),
      headers: { 'Content-Type': 'application/json' }
    });
  },

  getEngagement: async (params = {}) => {
    const query = new URLSearchParams(params).toString();
    const response = await apiClient(`/analytics/engagement${query ? `?${query}` : ''}`);
    return response?.data ? { data: response.data } : response;
  },

  getGrowth: async (params = {}) => {
    const query = new URLSearchParams(params).toString();
    const response = await apiClient(`/analytics/growth${query ? `?${query}` : ''}`);
    return response?.data ? { data: response.data } : response;
  },
};

// =============================
// DASHBOARD API
// =============================

export const dashboardAPI = {
  getStats: async () => {
    return apiClient('/dashboard/stats');
  },

  getRecentActivity: async () => {
    return apiClient('/dashboard/recent-activity');
  },

  getComprehensiveStats: async () => {
    return apiClient('/dashboard/comprehensive');
  },
};

// =============================
// CHURCH MANAGEMENT SYSTEM (CMS) API
// =============================

// =============================
// ATTENDANCE API
// =============================

export const attendanceAPI = {
  // Sunday Attendance
  recordSundayCheckin: async (dataOrUserId, attendanceDate, isVisitor = false, notes = null) => {
    const payload =
      typeof dataOrUserId === 'object' && dataOrUserId !== null
        ? dataOrUserId
        : {
            user_id: dataOrUserId,
            attendance_date: attendanceDate,
            is_visitor: isVisitor,
            notes,
          };

    return apiClient('/attendance/sunday', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },

  getSundayAttendance: async (params = {}) => {
    const normalizedParams =
      typeof params === 'string' ? { date: params } : (params || {});
    const query = new URLSearchParams(normalizedParams).toString();
    return apiClient(`/attendance/sunday${query ? `?${query}` : ''}`);
  },

  updateSundayAttendance: async (id, payload = {}) => {
    return apiClient(`/attendance/sunday/${id}`, {
      method: 'PUT',
      body: JSON.stringify(payload),
    });
  },

  deleteSundayAttendance: async (id) => {
    return apiClient(`/attendance/sunday/${id}`, {
      method: 'DELETE',
    });
  },

  // Cell Meeting Attendance
  recordCellAttendance: async (dataOrCellId, meetingDate, attendees = [], notes = null) => {
    const payload =
      typeof dataOrCellId === 'object' && dataOrCellId !== null
        ? dataOrCellId
        : {
            cell_id: dataOrCellId,
            meeting_date: meetingDate,
            attendees,
            notes,
          };

    return apiClient('/attendance/cell', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },

  getCellAttendance: async (params = {}) => {
    const query = new URLSearchParams(params).toString();
    return apiClient(`/attendance/cell${query ? `?${query}` : ''}`);
  },

  generateMeetingPolls: async () => {
    return apiClient('/attendance/polls/generate', {
      method: 'POST',
    });
  },

  getMyMeetingPolls: async () => {
    return apiClient('/attendance/polls/my');
  },

  getMeetingPoll: async (id) => {
    return apiClient(`/attendance/polls/${id}`);
  },

  respondToMeetingPoll: async (id, payload) => {
    return apiClient(`/attendance/polls/${id}/respond`, {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },

  confirmMeetingPollAttendance: async (id, payload) => {
    return apiClient(`/attendance/polls/${id}/confirm`, {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },

  getMyAttendance: async (params = {}) => {
    const query = new URLSearchParams(params).toString();
    return apiClient(`/attendance/my${query ? `?${query}` : ''}`);
  },

  // Stats & Analytics
  getStats: async (params = {}) => {
    const query = new URLSearchParams(params).toString();
    return apiClient(`/attendance/stats${query ? `?${query}` : ''}`);
  },

  getAnalytics: async (params = {}) => {
    const query = new URLSearchParams(params).toString();
    return apiClient(`/attendance/analytics${query ? `?${query}` : ''}`);
  },
};

// =============================
// CELLS API
// =============================

export const cellsAPI = {
  getAll: async (params = {}) => {
    const query = new URLSearchParams(params).toString();
    return apiClient(`/cells${query ? `?${query}` : ''}`);
  },

  getOne: async (id) => {
    return apiClient(`/cells/${id}`);
  },

  // Alias for compatibility
  getCell: async (id) => {
    return apiClient(`/cells/${id}`);
  },

  create: async (cellData) => {
    return apiClient('/cells', {
      method: 'POST',
      body: JSON.stringify(cellData),
    });
  },

  update: async (id, cellData) => {
    return apiClient(`/cells/${id}`, {
      method: 'PUT',
      body: JSON.stringify(cellData),
    });
  },

  delete: async (id) => {
    return apiClient(`/cells/${id}`, { method: 'DELETE' });
  },

  assignMember: async (id, userId) => {
    return apiClient(`/cells/${id}/assign`, {
      method: 'POST',
      body: JSON.stringify({ member_id: userId, user_id: userId }),
    });
  },

  // NEW: Bulk assign multiple members at once
  bulkAssignMembers: async (id, memberIds = []) => {
    return apiClient(`/cells/${id}/assign-bulk`, {
      method: 'POST',
      body: JSON.stringify({ member_ids: memberIds }),
    });
  },

  removeMember: async (id, userId) => {
    return apiClient(`/cells/${id}/remove`, {
      method: 'POST',
      body: JSON.stringify({ member_id: userId, user_id: userId }),
    });
  },

  getMembers: async (id) => {
    return apiClient(`/cells/${id}/members`);
  },

  assignLeader: async (id, leaderId) => {
    return apiClient(`/cells/${id}/assign-leader`, {
      method: 'POST',
      body: JSON.stringify({ leader_id: leaderId }),
    });
  },

  getAvailableMembers: async (id) => {
    return apiClient(`/cells/${id}/available-members`);
  },
};

// =============================
// ZONES API
// =============================

export const zonesAPI = {
  getAll: async (params = {}) => {
    const query = new URLSearchParams(params).toString();
    return apiClient(`/zones${query ? `?${query}` : ''}`);
  },

  getOne: async (id) => {
    return apiClient(`/zones/${id}`);
  },

  create: async (zoneData) => {
    return apiClient('/zones', {
      method: 'POST',
      body: JSON.stringify(zoneData),
    });
  },

  update: async (id, zoneData) => {
    return apiClient(`/zones/${id}`, {
      method: 'PUT',
      body: JSON.stringify(zoneData),
    });
  },

  delete: async (id) => {
    return apiClient(`/zones/${id}`, { method: 'DELETE' });
  },

  assignLeader: async (id, leaderId) => {
    return apiClient(`/zones/${id}/assign-leader`, {
      method: 'POST',
      body: JSON.stringify({ leader_id: leaderId }),
    });
  },

  assignMember: async (id, memberId) => {
    return apiClient(`/zones/${id}/assign-member`, {
      method: 'POST',
      body: JSON.stringify({ member_id: memberId }),
    });
  },

  removeMember: async (id, memberId) => {
    return apiClient(`/zones/${id}/remove-member`, {
      method: 'POST',
      body: JSON.stringify({ member_id: memberId }),
    });
  },

  getStats: async () => {
    return apiClient('/zones/stats');
  },

  // Alias for compatibility
  getZone: async (id) => {
    return apiClient(`/zones/${id}`);
  },
};

// =============================
// ZONE LEADER REQUESTS API
// =============================

export const zoneLeaderRequestsAPI = {
  // Request to become zone leader
  request: async (zoneId, motivation = '') => {
    return apiClient('/zone-leader-requests', {
      method: 'POST',
      body: JSON.stringify({
        zone_id: zoneId,
        motivation: motivation
      })
    });
  },

  // Get own requests
  getMyRequests: async () => {
    return apiClient('/zone-leader-requests/my');
  },

  // Get all pending requests (leadership only)
  getPendingRequests: async () => {
    return apiClient('/zone-leader-requests');
  },

  // Approve request (leadership only)
  approve: async (requestId) => {
    return apiClient(`/zone-leader-requests/${requestId}/approve`, {
      method: 'POST'
    });
  },

  // Reject request (leadership only)
  reject: async (requestId, reason = '') => {
    return apiClient(`/zone-leader-requests/${requestId}/reject`, {
      method: 'POST',
      body: JSON.stringify({ reason })
    });
  }
};

// =============================
// CELL CHANGE REQUESTS API
// =============================

export const cellChangeRequestsAPI = {
  request: async (requestedCellId, reason) => {
    return apiClient('/cell-change-requests', {
      method: 'POST',
      body: JSON.stringify({
        requested_cell_id: requestedCellId,
        reason,
      }),
    });
  },

  getMyRequests: async () => {
    return apiClient('/cell-change-requests/my');
  },

  getPendingRequests: async () => {
    return apiClient('/cell-change-requests/pending');
  },

  process: async (requestId, status) => {
    return apiClient('/cell-change-requests/process', {
      method: 'POST',
      body: JSON.stringify({
        request_id: requestId,
        status,
      }),
    });
  },
};

// =============================
// ABSENCE API
// =============================

export const absenceAPI = {
  getFlags: async () => {
    return apiClient('/absence/flags');
  },

  resolveFlag: async (flagId, data = {}) => {
    return apiClient('/absence/resolve', {
      method: 'POST',
      body: JSON.stringify({ flag_id: flagId, ...data }),
    });
  },

  preMarkAbsence: async (data) => {
    return apiClient('/absence/pre-mark', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  getMyRequests: async () => {
    return apiClient('/absence/my-requests');
  },

  processRequest: async (requestId, status) => {
    return apiClient('/absence/process-request', {
      method: 'POST',
      body: JSON.stringify({ request_id: requestId, status }),
    });
  },

  getSummary: async () => {
    return apiClient('/absence/summary');
  },
};

export const followUpNotesAPI = {
  getAll: async (params = {}) => {
    const query = new URLSearchParams(params).toString();
    return apiClient(`/follow-up-notes${query ? `?${query}` : ''}`);
  },

  create: async (payload) => {
    return apiClient('/follow-up-notes', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },

  update: async (id, payload) => {
    return apiClient(`/follow-up-notes/${id}`, {
      method: 'PUT',
      body: JSON.stringify(payload),
    });
  },
};

export const followUpAPI = {
  getSummary: async () => {
    return apiClient('/follow-up/summary');
  },

  getMembers: async (params = {}) => {
    const query = new URLSearchParams(params).toString();
    return apiClient(`/follow-up/members${query ? `?${query}` : ''}`);
  },

  getEmails: async (params = {}) => {
    const query = new URLSearchParams(params).toString();
    return apiClient(`/follow-up/emails${query ? `?${query}` : ''}`);
  },

  sendEmail: async (payload) => {
    return apiClient('/follow-up/emails/send', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },
};

// =============================
// ANNOUNCEMENTS API
// =============================

export const announcementsAPI = {
  getAll: async (params = {}) => {
    const query = new URLSearchParams(params).toString();
    return apiClient(`/announcements${query ? `?${query}` : ''}`);
  },

  create: async (announcementData) => {
    return apiClient('/announcements', {
      method: 'POST',
      body: JSON.stringify(announcementData),
    });
  },

  update: async (id, announcementData) => {
    return apiClient(`/announcements/${id}`, {
      method: 'PUT',
      body: JSON.stringify(announcementData),
    });
  },

  delete: async (id) => {
    return apiClient(`/announcements/${id}`, { method: 'DELETE' });
  },

  // Aliases for compatibility
  getAnnouncements: async (params = {}) => {
    const query = new URLSearchParams(params).toString();
    return apiClient(`/announcements${query ? `?${query}` : ''}`);
  },

  deleteAnnouncement: async (id) => {
    return apiClient(`/announcements/${id}`, { method: 'DELETE' });
  },

  updateAnnouncement: async (id, announcementData) => {
    return apiClient(`/announcements/${id}`, {
      method: 'PUT',
      body: JSON.stringify(announcementData),
    });
  },
};

// =============================
// REPORTS API
// =============================

export const reportsAPI = {
  getDashboard: async (params = {}) => {
    const normalizedParams =
      typeof params === 'string' ? { period: params } : (params || {});
    const query = new URLSearchParams(normalizedParams).toString();
    const response = await apiClient(`/reports/dashboard${query ? `?${query}` : ''}`);
    return response?.data ? { data: response.data } : response;
  },

  getGrowth: async (params = {}) => {
    const query = new URLSearchParams(params).toString();
    const response = await apiClient(`/reports/growth${query ? `?${query}` : ''}`);
    return response?.data ? { data: response.data } : response;
  },

  getAttendanceReport: async (params = {}) => {
    const query = new URLSearchParams(params).toString();
    const response = await apiClient(`/reports/attendance${query ? `?${query}` : ''}`);

    // Backend returns { status, data: { members: [], statistics: {} } }
    // Normalize to always expose members array and keep statistics for callers that need it.
    const payload = response?.data ?? response ?? {};
    const members = Array.isArray(payload?.members)
      ? payload.members
      : Array.isArray(payload)
        ? payload
        : Array.isArray(response)
          ? response
          : [];

    return {
      data: members,
      statistics: payload?.statistics ?? null,
    };
  },

  getComparison: async (params = {}) => {
    const query = new URLSearchParams(params).toString();
    const response = await apiClient(`/reports/comparison${query ? `?${query}` : ''}`);
    return response?.data ? { data: response.data } : response;
  },

  getEngagementScores: async (params = {}) => {
    const query = new URLSearchParams(params).toString();
    const response = await apiClient(`/reports/engagement${query ? `?${query}` : ''}`);
    return response?.data ? { data: response.data } : response;
  },
};

// =============================
// NOTIFICATIONS API
// =============================

export const notificationsAPI = {
  send: async (notificationData) => {
    return apiClient('/notifications', {
      method: 'POST',
      body: JSON.stringify(notificationData),
    });
  },

  sendBulk: async (notificationData) => {
    return apiClient('/notifications/bulk', {
      method: 'POST',
      body: JSON.stringify(notificationData),
    });
  },

  getTemplates: async () => {
    return apiClient('/notifications/templates');
  },

  getStats: async () => {
    return apiClient('/notifications/stats');
  },

  getUserNotifications: async (params = {}) => {
    const query = new URLSearchParams(params).toString();
    return apiClient(`/notifications/user${query ? `?${query}` : ''}`);
  },

  markAsRead: async (id) => {
    return apiClient(`/notifications/${id}/read`, { method: 'PATCH' });
  },

  markAllAsRead: async () => {
    return apiClient('/notifications/read-all', { method: 'PATCH' });
  },

  deleteNotification: async (id) => {
    return apiClient(`/notifications/${id}`, { method: 'DELETE' });
  },
};

// Alias for backward compatibility
export const notificationAPI = notificationsAPI;

// =============================
// CONTACT API (Public)
// =============================

export const contactAPI = {
  submit: async (contactData) => {
    return apiClient('/contact', {
      method: 'POST',
      body: JSON.stringify(contactData),
    });
  },

  getInfo: async () => {
    return apiClient('/contact/info');
  },

  // Alias for compatibility
  submitContact: async (contactData) => {
    return apiClient('/contact', {
      method: 'POST',
      body: JSON.stringify(contactData),
    });
  },
};

// =============================
// CONTACT ADMIN API
// =============================

export const contactAdminAPI = {
  list: async (params = {}) => {
    const search = new URLSearchParams();
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') {
        search.append(key, value);
      }
    });
    const qs = search.toString();
    const url = qs ? `/contact/submissions?${qs}` : '/contact/submissions';
    return apiClient(url);
  },

  get: async (id) => {
    return apiClient(`/contact/submissions/${id}`);
  },

  markRead: async (id, isRead = true) => {
    return apiClient(`/contact/submissions/${id}/read`, {
      method: 'PATCH',
      body: JSON.stringify({ is_read: isRead }),
    });
  },

  reply: async (id, payload) => {
    return apiClient(`/contact/submissions/${id}/reply`, {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },
};

// =============================
// UPLOAD API
// =============================

export const uploadAPI = {
  upload: async (fileOrFormData, onProgress) => {
    const formData = fileOrFormData instanceof FormData
      ? fileOrFormData
      : (() => {
          const fd = new FormData();
          fd.append('file', fileOrFormData);
          return fd;
        })();

    const token = getAuthToken();
    const response = await fetch(`${BASE_URL}/upload`, {
      method: 'POST',
      headers: token ? { 'Authorization': `Bearer ${token}` } : {},
      body: formData,
    });
    const result = await handleResponse(response);
    if (typeof onProgress === 'function') {
      onProgress(100);
    }
    const data = unwrapData(result) || result;
    return {
      ...data,
      url: resolveUploadUrl(data?.url || data?.file_path || ''),
    };
  },

  delete: async (id) => {
    return apiClient(`/upload/${id}`, { method: 'DELETE' });
  },

  validateFile: (file, options = {}) => {
    const {
      maxSize = 100 * 1024 * 1024,
      allowedVideoTypes = [],
      allowedAudioTypes = [],
      allowedImageTypes = [],
      allowedTypes = [],
    } = options;

    if (!file) {
      throw new Error('No file selected');
    }

    if (file.size > maxSize) {
      throw new Error(`File exceeds size limit of ${Math.round(maxSize / (1024 * 1024))}MB`);
    }

    const allAllowed = [
      ...allowedTypes,
      ...allowedVideoTypes,
      ...allowedAudioTypes,
      ...allowedImageTypes,
    ].filter(Boolean);

    if (allAllowed.length > 0 && !allAllowed.includes(file.type)) {
      throw new Error(`Unsupported file type: ${file.type}`);
    }

    return true;
  },
};

// Alias for backward compatibility
export const fileAPI = uploadAPI;

// =============================
// SUBMIT CONTACT (Public endpoint)
// =============================

export const submitContact = async (contactData) => {
  return apiClient('/contact', {
    method: 'POST',
    body: JSON.stringify(contactData),
  });
};

// =============================
// HOME IMAGES API
// =============================

export const homeImagesAPI = {
  getAll: async () => {
    return apiClient('/home-images', { public: true });
  },

  getBySection: async (section) => {
    return apiClient(`/home-images/section/${section}`, { public: true });
  },

  getFeaturedBySection: async (section) => {
    return apiClient(`/home-images/section/${section}/featured`, { public: true });
  },

  getByComponent: async (component) => {
    return apiClient(`/home-images/component/${component}`, { public: true });
  },

  getById: async (id) => {
    return apiClient(`/home-images/${id}`, { public: true });
  },

  upload: async (formData) => {
    const token = getAuthToken();
    const response = await fetch(`${BASE_URL}/home-images/upload`, {
      method: 'POST',
      headers: token ? { 'Authorization': `Bearer ${token}` } : {},
      body: formData,
    });
    return handleResponse(response);
  },

  update: async (id, imageData) => {
    return apiClient(`/home-images/${id}`, {
      method: 'PUT',
      body: JSON.stringify(imageData),
    });
  },

  delete: async (id) => {
    return apiClient(`/home-images/${id}`, { method: 'DELETE' });
  },

  bulkUpdate: async (images) => {
    return apiClient('/home-images/bulk/update', {
      method: 'PUT',
      body: JSON.stringify({ images }),
    });
  },

  bulkDelete: async (ids) => {
    return apiClient('/home-images/bulk/delete', {
      method: 'DELETE',
      body: JSON.stringify({ ids }),
    });
  },

  reorder: async (orderedIds) => {
    return apiClient('/home-images/reorder', {
      method: 'PUT',
      body: JSON.stringify({ order: orderedIds }),
    });
  },

  getImageStats: async () => {
    return apiClient('/home-images/stats/overview');
  },

  getImageAnalytics: async (id) => {
    return apiClient(`/home-images/${id}/analytics`);
  },

  getUploadConfig: async () => {
    return apiClient('/home-images/config/upload');
  },

  // Aliases for compatibility
  getAllImages: async () => {
    return apiClient('/home-images');
  },

  uploadImage: async (formData) => {
    const token = getAuthToken();
    const response = await fetch(`${BASE_URL}/home-images/upload`, {
      method: 'POST',
      headers: token ? { 'Authorization': `Bearer ${token}` } : {},
      body: formData,
    });
    return handleResponse(response);
  },

  deleteImage: async (id) => {
    return apiClient(`/home-images/${id}`, { method: 'DELETE' });
  },

  updateImage: async (id, imageData) => {
    return apiClient(`/home-images/${id}`, {
      method: 'PUT',
      body: JSON.stringify(imageData),
    });
  },

  validateImageFile: (file) => {
    const validTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
    if (!validTypes.includes(file.type)) {
      throw new Error('Invalid file type. Only JPEG, PNG, GIF, and WebP are allowed.');
    }
    const maxSize = 30 * 1024 * 1024; // 30MB
    if (file.size > maxSize) {
      throw new Error('File size exceeds 30MB limit.');
    }
    return true;
  },
};

// =============================
// CHAT API
// =============================

export const chatAPI = {
  getRooms: async () => {
    const response = await apiClient('/chat/rooms');
    const rooms = Array.isArray(unwrapData(response)) ? unwrapData(response) : [];
    return rooms.map(normalizeChatRoom);
  },

  createRoom: async (roomData) => {
    const normalizedTypeMap = {
      public: 'channel',
      private: 'group',
      announcement: 'channel',
      channel: 'channel',
      group: 'group',
      direct: 'direct',
    };

    const payload = {
      ...roomData,
      type: normalizedTypeMap[roomData?.type] || 'channel',
      is_private: roomData?.is_private ?? roomData?.isPrivate ?? false,
    };

    const response = await apiClient('/chat/rooms', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
    return normalizeChatRoom(unwrapData(response) || {});
  },

  initializeRooms: async () => {
    const result = await apiClient('/chat/rooms/initialize', { method: 'POST' });
    const rooms = await chatAPI.getRooms().catch(() => []);
    return { ...(result || {}), rooms };
  },

  getMessages: async (roomId, params = {}) => {
    const normalizedParams =
      typeof params === 'string' || typeof params === 'number'
        ? { before: params }
        : (params || {});
    const query = new URLSearchParams(normalizedParams).toString();
    const response = await apiClient(`/chat/rooms/${roomId}/messages${query ? `?${query}` : ''}`);
    const messages = Array.isArray(unwrapData(response)) ? unwrapData(response) : [];
    return messages.map(normalizeChatMessage);
  },

  sendMessage: async (roomId, messageData) => {
    const payload = {
      ...messageData,
      content: messageData?.content ?? messageData?.message ?? '',
      type: messageData?.type ?? messageData?.messageType ?? 'text',
    };

    const response = await apiClient(`/chat/rooms/${roomId}/messages`, {
      method: 'POST',
      body: JSON.stringify(payload),
    });
    return normalizeChatMessage(unwrapData(response) || {});
  },

  joinRoom: async (roomId) => {
    return apiClient(`/chat/rooms/${roomId}/join`, { method: 'POST' });
  },

  leaveRoom: async (roomId) => {
    return apiClient(`/chat/rooms/${roomId}/leave`, { method: 'POST' });
  },

  getRoomInfo: async (roomId) => {
    const response = await apiClient(`/chat/rooms/${roomId}/info`);
    const data = unwrapData(response) || {};
    return {
      ...data,
      room: normalizeChatRoom(data.room || {}),
      participants: Array.isArray(data.participants) ? data.participants : [],
    };
  },

  markMessagesAsRead: async (roomId) => {
    return apiClient(`/chat/rooms/${roomId}/messages/read`, { method: 'PATCH' });
  },

  searchMessages: async (roomId, query) => {
    const response = await apiClient(`/chat/rooms/${roomId}/search?q=${encodeURIComponent(query)}`);
    const messages = Array.isArray(unwrapData(response)) ? unwrapData(response) : [];
    return messages.map(normalizeChatMessage);
  },

  reactToMessage: async (messageId, reaction) => {
    return apiClient(`/chat/messages/${messageId}/react`, {
      method: 'POST',
      body: JSON.stringify({ emoji: reaction }),
    });
  },

  deleteMessage: async (messageIdOrRoomId, maybeMessageId) => {
    const messageId = maybeMessageId ?? messageIdOrRoomId;
    return apiClient(`/chat/messages/${messageId}`, { method: 'DELETE' });
  },

  getStats: async () => {
    return apiClient('/chat/stats');
  },
};

// =============================
// HEALTH CHECK
// =============================

export const healthCheck = async () => {
  try {
    const response = await fetch(`${BASE_URL}/health`);
    return response.ok;
  } catch {
    return false;
  }
};

// =============================
// WEB SOCKET SERVICE (for real-time chat)
// =============================
// Lightweight compatibility WebSocket service wrapper (polling-friendly fallback)
let wsConnectionStatus = 'disconnected';
const wsConnectionListeners = new Set();
const wsMessageListeners = new Set();
const wsTypingListeners = new Set();

const notifyWsConnection = (status) => {
  wsConnectionStatus = status;
  wsConnectionListeners.forEach((cb) => {
    try { cb(status); } catch {}
  });
};

const notifyWsMessage = (payload) => {
  wsMessageListeners.forEach((cb) => {
    try { cb(payload); } catch {}
  });
};

const notifyWsTyping = (payload) => {
  wsTypingListeners.forEach((cb) => {
    try { cb(payload); } catch {}
  });
};

export const webSocketService = {
  connect: async (token) => {
    console.log('WebSocket connecting with token:', token?.substring(0, 20) + '...');
    notifyWsConnection('connecting');
    notifyWsConnection('connected');
    return true;
  },
  disconnect: () => {
    console.log('WebSocket disconnected');
    notifyWsConnection('disconnected');
  },
  getConnectionStatus: () => wsConnectionStatus,
  onConnection: (callback) => {
    wsConnectionListeners.add(callback);
    callback(wsConnectionStatus);
    return () => wsConnectionListeners.delete(callback);
  },
  onMessage: (callback) => {
    wsMessageListeners.add(callback);
    return () => wsMessageListeners.delete(callback);
  },
  onTyping: (callback) => {
    wsTypingListeners.add(callback);
    return () => wsTypingListeners.delete(callback);
  },
  send: (message) => {
    console.log('WebSocket send:', message);
    return true;
  },
  joinRoom: async (roomId) => {
    console.log('WebSocket joinRoom:', roomId);
    return true;
  },
  leaveRoom: async (roomId) => {
    console.log('WebSocket leaveRoom:', roomId);
    return true;
  },
  sendTyping: (roomId, isTyping) => {
    notifyWsTyping({ roomId, isTyping, userId: 'self' });
    return true;
  },
  sendMessage: (roomId, content, type = 'text', parentId = null, tempId = null, fileMeta = undefined) => {
    const payload = {
      type: 'new_message',
      roomId,
      tempId,
      message: {
        _id: tempId || `local-${Date.now()}`,
        content,
        type,
        parent_id: parentId,
        ...fileMeta,
      },
    };
    notifyWsMessage(payload);
    return true;
  },
};

// =============================
// EXPORTS
// =============================

// System API for admin operations
export const systemAPI = {
  runMigrations: async () => {
    return apiClient('/system/migrations', {
      method: 'POST',
    });
  },
};

// ── Family Tree ───────────────────────────────────────────────────────────────
export const familyAPI = {
  getMyFamily:      ()     => apiClient('/family/mine'),
  getMemberFamily:  (id)   => apiClient(`/family/member/${id}`),
  getFamilyTree:    (id)   => apiClient(`/family/tree/${id}`),
  addMarriage:      (data) => apiClient('/family/marriage', { method: 'POST', body: JSON.stringify(data) }),
  updateMarriage:   (id, data) => apiClient(`/family/marriage/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
  addParentChild:   (data) => apiClient('/family/parent-child', { method: 'POST', body: JSON.stringify(data) }),
  removeParentChild:(data) => apiClient('/family/parent-child', { method: 'DELETE', body: JSON.stringify(data) }),
};

// ── Spiritual Lineage ─────────────────────────────────────────────────────────
export const spiritualLineageAPI = {
  getMyLineage:       ()       => apiClient('/spiritual-lineage/mine'),
  getMyClaim:         ()       => apiClient('/spiritual-lineage/my-claim'),
  claimSpiritualParent:(data)  => apiClient('/spiritual-lineage/claim', { method: 'POST', body: JSON.stringify(data) }),
  listClaims:         (status) => apiClient(`/spiritual-lineage/requests${status ? `?status=${status}` : ''}`),
  reviewClaim:        (id, action) => apiClient(`/spiritual-lineage/requests/${id}`, { method: 'PATCH', body: JSON.stringify({ action }) }),
  getMemberLineage:   (id)     => apiClient(`/spiritual-lineage/member/${id}`),
  getAncestorPath:    (id)     => apiClient(`/spiritual-lineage/member/${id}/path`),
  getFullTree:        ()       => apiClient('/spiritual-lineage/tree'),
  setSpiritualParent: (id, parentId) => apiClient(`/spiritual-lineage/member/${id}`, {
    method: 'PATCH',
    body: JSON.stringify({ spiritual_parent_id: parentId }),
  }),
};

// ── Disciples ─────────────────────────────────────────────────────────────────
export const disciplesAPI = {
  listGroups:         (all = false) => apiClient(`/disciples/groups${all ? '?all=1' : ''}`),
  createGroup:        (data)  => apiClient('/disciples/groups', { method: 'POST', body: JSON.stringify(data) }),
  getGroup:           (id)    => apiClient(`/disciples/groups/${id}`),
  updateGroup:        (id, data) => apiClient(`/disciples/groups/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
  addMember:          (groupId, userId)  => apiClient(`/disciples/groups/${groupId}/members`, { method: 'POST', body: JSON.stringify({ user_id: userId }) }),
  removeMember:       (groupId, userId)  => apiClient(`/disciples/groups/${groupId}/members/${userId}`, { method: 'DELETE' }),
  listMeetings:       (groupId) => apiClient(`/disciples/groups/${groupId}/meetings`),
  createMeeting:      (groupId, data)    => apiClient(`/disciples/groups/${groupId}/meetings`, { method: 'POST', body: JSON.stringify(data) }),
  getMeetingAttendance:(meetingId)       => apiClient(`/disciples/meetings/${meetingId}/attendance`),
  saveAttendance:     (meetingId, attended) => apiClient(`/disciples/meetings/${meetingId}/attendance`, { method: 'POST', body: JSON.stringify({ attended }) }),
  listLessons:        (groupId) => apiClient(`/disciples/groups/${groupId}/lessons`),
  createLesson:       (groupId, data)    => apiClient(`/disciples/groups/${groupId}/lessons`, { method: 'POST', body: JSON.stringify(data) }),
  updateLesson:       (id, data) => apiClient(`/disciples/lessons/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
  deleteLesson:       (id)    => apiClient(`/disciples/lessons/${id}`, { method: 'DELETE' }),
  listNotices:        (groupId) => apiClient(`/disciples/groups/${groupId}/notices`),
  createNotice:       (groupId, data)    => apiClient(`/disciples/groups/${groupId}/notices`, { method: 'POST', body: JSON.stringify(data) }),
  deleteNotice:       (id)    => apiClient(`/disciples/notices/${id}`, { method: 'DELETE' }),
  submitRsvp:         (meetingId, status) => apiClient(`/disciples/meetings/${meetingId}/rsvp`, { method: 'POST', body: JSON.stringify({ status }) }),
  getMeetingRsvps:    (meetingId) => apiClient(`/disciples/meetings/${meetingId}/rsvp`),
  markLessonRead:     (lessonId) => apiClient(`/disciples/lessons/${lessonId}/read`, { method: 'POST' }),
  getStats:           () => apiClient('/disciples/stats'),
  getEnrolledUsers:   () => apiClient('/disciples/enrolled-users'),
};

export const careersAPI = {
  listPublic:            ()           => apiClient('/careers'),
  apply:                 (data)       => apiClient('/careers/apply', { method: 'POST', body: JSON.stringify(data) }),
  listAll:               ()           => apiClient('/admin/careers'),
  create:                (data)       => apiClient('/admin/careers', { method: 'POST', body: JSON.stringify(data) }),
  update:                (id, data)   => apiClient(`/admin/careers/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  remove:                (id)         => apiClient(`/admin/careers/${id}`, { method: 'DELETE' }),
  listApplications:      (status)     => apiClient(`/admin/careers/applications${status ? `?status=${status}` : ''}`),
  updateApplicationStatus:(id, status) => apiClient(`/admin/careers/applications/${id}`, { method: 'PUT', body: JSON.stringify({ status }) }),
};

export default {
  auth: authAPI,
  members: membersAPI,
  events: eventsAPI,
  sermons: sermonsAPI,
  blog: blogAPI,
  prayer: prayerAPI,
  giving: givingAPI,
  settings: settingsAPI,
  visitors: visitorsAPI,
  visitor: visitorAPI,
  analytics: analyticsAPI,
  dashboard: dashboardAPI,
  attendance: attendanceAPI,
  cells: cellsAPI,
  zones: zonesAPI,
  cellChangeRequests: cellChangeRequestsAPI,
  absence: absenceAPI,
  followUpNotes: followUpNotesAPI,
  followUp: followUpAPI,
  announcements: announcementsAPI,
  reports: reportsAPI,
  notifications: notificationsAPI,
  notification: notificationAPI,
  contact: contactAPI,
  contactAdmin: contactAdminAPI,
  submitContact: submitContact,
  upload: uploadAPI,
  file: fileAPI,
  homeImages: homeImagesAPI,
  chat: chatAPI,
  system: systemAPI,
  webSocketService: webSocketService,
  healthCheck,
  family: familyAPI,
  spiritualLineage: spiritualLineageAPI,
  disciples: disciplesAPI,
};
