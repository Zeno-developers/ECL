const CACHE_KEY = 'elchurch_public_settings_cache';

export const normalizeChurchSettings = (input = {}) => {
  const serviceTimes = input.serviceTimes || input.service_times || {};
  const social = input.social || {};

  return {
    name: input.name || input.churchName || 'Eternal Love Church',
    description: input.description || '',
    pastorName: input.pastorName || input.pastor_name || '',
    mission: input.mission || '',
    vision: input.vision || '',
    address: input.address || '',
    phone: input.phone || '',
    email: input.email || '',
    memberCount: input.memberCount || input.member_count || 0,
    map_embed_url: input.map_embed_url || input.mapEmbedUrl || '',
    latitude: input.latitude ?? null,
    longitude: input.longitude ?? null,
    social_facebook: input.social_facebook || social.facebook || '',
    social_instagram: input.social_instagram || social.instagram || '',
    social_youtube: input.social_youtube || social.youtube || '',
    serviceTimes: {
      sunday: serviceTimes.sunday || '',
      wednesday: serviceTimes.wednesday || '',
      friday: serviceTimes.friday || '',
    },
    pastor_report_email: input.pastor_report_email || '',
  };
};

export const getCachedChurchSettings = () => {
  if (typeof window === 'undefined') {
    return {};
  }

  try {
    const raw = localStorage.getItem(CACHE_KEY);
    if (!raw) {
      return {};
    }

    return normalizeChurchSettings(JSON.parse(raw));
  } catch {
    return {};
  }
};

export const setCachedChurchSettings = (settings = {}) => {
  if (typeof window === 'undefined') {
    return;
  }

  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify(normalizeChurchSettings(settings)));
  } catch {
    // Ignore storage errors.
  }
};

export const broadcastChurchSettingsUpdate = (settings = {}) => {
  setCachedChurchSettings(settings);

  if (typeof window === 'undefined') {
    return;
  }

  window.dispatchEvent(
    new CustomEvent('church-settings-updated', {
      detail: normalizeChurchSettings(settings),
    })
  );
};
