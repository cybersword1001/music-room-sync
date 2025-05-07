
// Track if YouTube API has been loaded
let youtubeApiLoaded = false;
let youtubeApiLoading = false;
// Queue of callbacks to execute once API is ready
const apiReadyCallbacks: (() => void)[] = [];

// Simple cache for noembed.com responses
interface CacheEntry {
  data: any;
  timestamp: number;
}

// In-memory cache with expiration time (24 hours in milliseconds)
const CACHE_EXPIRATION = 24 * 60 * 60 * 1000;
const noembedCache: Record<string, CacheEntry> = {};

/**
 * Load the YouTube IFrame API if not already loaded
 */
export const loadYouTubeApi = () => {
  if (youtubeApiLoaded || youtubeApiLoading) return;
  
  youtubeApiLoading = true;
  
  // Create script element
  const tag = document.createElement('script');
  tag.src = 'https://www.youtube.com/iframe_api';
  
  // Add to DOM
  const firstScriptTag = document.getElementsByTagName('script')[0];
  firstScriptTag.parentNode?.insertBefore(tag, firstScriptTag);
  
  // Set global callback
  window.onYouTubeIframeAPIReady = () => {
    console.log('YouTube API ready');
    youtubeApiLoaded = true;
    youtubeApiLoading = false;
    
    // Execute all queued callbacks
    while (apiReadyCallbacks.length) {
      const callback = apiReadyCallbacks.shift();
      if (callback) callback();
    }
  };
};

/**
 * Add a callback to be executed when the YouTube API is ready
 */
export const onYouTubeApiReady = (callback: () => void) => {
  if (youtubeApiLoaded) {
    callback();
  } else {
    apiReadyCallbacks.push(callback);
    loadYouTubeApi();
  }
};

/**
 * Format time as mm:ss
 */
export const formatTime = (seconds: number) => {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
};

/**
 * Extract YouTube video ID from various URL formats
 */
export const extractYouTubeVideoId = (url: string): string | null => {
  if (!url) return null;
  
  // Handle youtu.be format
  const shortUrlRegex = /youtu\.be\/([a-zA-Z0-9_-]{11})/;
  const shortMatch = url.match(shortUrlRegex);
  if (shortMatch) return shortMatch[1];
  
  // Handle youtube.com/watch?v= format
  const standardRegex = /youtube\.com\/watch\?v=([a-zA-Z0-9_-]{11})/;
  const standardMatch = url.match(standardRegex);
  if (standardMatch) return standardMatch[1];
  
  // Handle youtube.com/embed/ format
  const embedRegex = /youtube\.com\/embed\/([a-zA-Z0-9_-]{11})/;
  const embedMatch = url.match(embedRegex);
  if (embedMatch) return embedMatch[1];
  
  // Handle already extracted ID (verify it's 11 chars and matches pattern)
  if (/^[a-zA-Z0-9_-]{11}$/.test(url)) return url;
  
  return null;
};

/**
 * Fetch video information from noembed.com with caching
 */
export const fetchVideoInfo = async (videoId: string) => {
  if (!videoId) {
    console.error('No video ID provided to fetchVideoInfo');
    return null;
  }
  
  const youtubeUrl = `https://www.youtube.com/watch?v=${videoId}`;
  const cacheKey = `video_${videoId}`;
  
  // Check if we have a valid cache entry
  const now = Date.now();
  if (noembedCache[cacheKey] && (now - noembedCache[cacheKey].timestamp < CACHE_EXPIRATION)) {
    console.log(`Using cached video info for ${videoId}`);
    return noembedCache[cacheKey].data;
  }
  
  try {
    console.log(`Fetching video info for ${videoId}`);
    const response = await fetch(`https://noembed.com/embed?url=${encodeURIComponent(youtubeUrl)}&format=json`, {
      headers: {
        'Accept': 'application/json'
      }
    });
    
    if (!response.ok) {
      throw new Error(`Failed to fetch video info: ${response.status} ${response.statusText}`);
    }
    
    const data = await response.json();
    
    // Cache the response
    noembedCache[cacheKey] = {
      data,
      timestamp: now
    };
    
    return data;
  } catch (error) {
    console.error('Error fetching video info:', error);
    return null;
  }
};

/**
 * Clear expired entries from the cache
 */
export const cleanupCache = () => {
  const now = Date.now();
  Object.keys(noembedCache).forEach(key => {
    if (now - noembedCache[key].timestamp > CACHE_EXPIRATION) {
      delete noembedCache[key];
    }
  });
};

// Run cache cleanup every hour
if (typeof window !== 'undefined') {
  setInterval(cleanupCache, 60 * 60 * 1000);
}
