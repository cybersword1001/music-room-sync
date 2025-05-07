
// Track if YouTube API has been loaded
let youtubeApiLoaded = false;
let youtubeApiLoading = false;
// Queue of callbacks to execute once API is ready
const apiReadyCallbacks: (() => void)[] = [];

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
