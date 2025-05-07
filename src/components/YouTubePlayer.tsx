
import { useEffect, useRef, useState } from 'react';
import { Play, Pause, Volume2, SkipForward } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';

interface YouTubePlayerProps {
  videoId: string;
  onEnded: () => void;
  title?: string;
  artist?: string;
  thumbnail?: string;
  height?: string;
  width?: string;
  isHost?: boolean;
}

declare global {
  interface Window {
    YT: any;
    onYouTubeIframeAPIReady: () => void;
  }
}

// Track if YouTube API has been loaded
let youtubeApiLoaded = false;
let youtubeApiLoading = false;
// Queue of callbacks to execute once API is ready
const apiReadyCallbacks: (() => void)[] = [];

// Function to load YouTube API
const loadYouTubeApi = () => {
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

export function YouTubePlayer({ 
  videoId, 
  onEnded, 
  title = "Now Playing", 
  artist = "Unknown Artist",
  thumbnail,
  isHost = false,
  height = '360', 
  width = '640' 
}: YouTubePlayerProps) {
  const playerRef = useRef<any>(null);
  const playerElementRef = useRef<HTMLDivElement>(null);
  const [isPlaying, setIsPlaying] = useState(true);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(80);
  const [playerReady, setPlayerReady] = useState(false);
  const { user } = useAuth();
  const { toast } = useToast();
  
  console.log(`Rendering YouTube player with videoId: ${videoId}`);
  
  // Validate videoId format
  const isValidVideoId = videoId && /^[a-zA-Z0-9_-]{11}$/.test(videoId);
  
  if (!isValidVideoId) {
    console.error(`Invalid YouTube video ID: ${videoId}`);
  }
  
  // Function to initialize the player
  const initializePlayer = () => {
    if (!playerElementRef.current || !isValidVideoId) return;
    
    console.log(`Initializing YouTube player with videoId: ${videoId}`);
    
    try {
      if (playerRef.current && playerRef.current.destroy) {
        playerRef.current.destroy();
      }
      
      playerRef.current = new window.YT.Player(playerElementRef.current, {
        height,
        width,
        videoId,
        playerVars: {
          autoplay: 1,
          controls: 0, // Hide default controls
          modestbranding: 1,
          rel: 0,
          showinfo: 0,
          origin: window.location.origin,
        },
        events: {
          onStateChange: (event: any) => {
            // Video ended (state = 0)
            if (event.data === 0) {
              console.log('Video ended');
              setIsPlaying(false);
              onEnded();
            }
            // Video paused (state = 2)
            else if (event.data === 2) {
              setIsPlaying(false);
            }
            // Video playing (state = 1)
            else if (event.data === 1) {
              setIsPlaying(true);
              setDuration(playerRef.current.getDuration());
            }
          },
          onReady: (event: any) => {
            console.log('Player ready');
            setPlayerReady(true);
            setDuration(event.target.getDuration());
            event.target.setVolume(volume);
            
            // Start time tracking
            const timeTracker = setInterval(() => {
              if (playerRef.current && typeof playerRef.current.getCurrentTime === 'function') {
                setCurrentTime(playerRef.current.getCurrentTime());
              }
            }, 1000);
            
            return () => clearInterval(timeTracker);
          },
          onError: (event: any) => {
            console.error("YouTube player error:", event.data);
            
            let errorMessage = "Error playing video. Skipping to next song.";
            
            // More specific error messages based on YouTube API error codes
            switch(event.data) {
              case 2:
                errorMessage = "Invalid video ID. Skipping to next song.";
                break;
              case 5:
                errorMessage = "HTML5 player error. Skipping to next song.";
                break;
              case 100:
                errorMessage = "Video not found. It may have been removed or set to private.";
                break;
              case 101:
              case 150:
                errorMessage = "Video embedding disabled by owner. Skipping to next song.";
                break;
            }
            
            toast({
              title: "Playback Error",
              description: errorMessage,
              variant: "destructive",
            });
            
            onEnded(); // Skip to next song on error
          }
        },
      });
    } catch (error) {
      console.error("Error initializing YouTube player:", error);
      toast({
        title: "Player Error",
        description: "Failed to initialize player. Please try refreshing.",
        variant: "destructive",
      });
    }
  };
  
  // Setup YouTube API and player
  useEffect(() => {
    loadYouTubeApi();
    
    const setupPlayer = () => {
      if (window.YT && window.YT.Player) {
        initializePlayer();
      } else {
        apiReadyCallbacks.push(initializePlayer);
      }
    };
    
    if (youtubeApiLoaded) {
      setupPlayer();
    } else {
      apiReadyCallbacks.push(setupPlayer);
    }
    
    // Cleanup function
    return () => {
      if (playerRef.current && playerRef.current.destroy) {
        console.log('Destroying YouTube player on unmount');
        playerRef.current.destroy();
        playerRef.current = null;
      }
    };
  }, []); // Empty dependency array to only run once on mount
  
  // Update video when ID changes
  useEffect(() => {
    if (playerRef.current && playerRef.current.loadVideoById && isValidVideoId) {
      console.log(`Loading new video: ${videoId}`);
      playerRef.current.loadVideoById(videoId);
      setIsPlaying(true);
    }
  }, [videoId]);
  
  const togglePlay = () => {
    if (!playerRef.current || !playerReady) return;
    
    if (isPlaying) {
      playerRef.current.pauseVideo();
    } else {
      playerRef.current.playVideo();
    }
    setIsPlaying(!isPlaying);
  };
  
  const handleVolumeChange = (value: number[]) => {
    if (!playerRef.current || !playerReady) return;
    const newVolume = value[0];
    setVolume(newVolume);
    playerRef.current.setVolume(newVolume);
  };
  
  const skipSong = () => {
    if (isHost) {
      onEnded();
    }
  };
  
  // Format time as mm:ss
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
  };

  return (
    <div className="flex flex-col w-full">
      {/* Video Player (hidden but functional) */}
      <div className="w-full aspect-video rounded-lg overflow-hidden shadow-lg bg-black/20">
        <div ref={playerElementRef} className="w-full h-full rounded-lg" />
      </div>
      
      {/* Spotify-like Player UI */}
      <div className="bg-card/90 backdrop-blur-sm border rounded-lg mt-4 p-4 shadow-md transition-all">
        <div className="flex items-center space-x-4">
          {/* Thumbnail */}
          <div className="h-16 w-16 rounded-md overflow-hidden flex-shrink-0 shadow-md">
            <img 
              src={thumbnail || `https://img.youtube.com/vi/${videoId}/mqdefault.jpg`}
              alt={title}
              className="h-full w-full object-cover"
            />
          </div>
          
          {/* Song Info */}
          <div className="flex-grow">
            <h3 className="font-semibold truncate">{title}</h3>
            <p className="text-sm text-muted-foreground">{artist}</p>
          </div>
          
          {/* Controls */}
          <div className="flex items-center space-x-2">
            <Button 
              variant="ghost" 
              size="icon"
              onClick={togglePlay} 
              className="rounded-full hover:bg-tune-primary/20"
              disabled={!playerReady}
            >
              {isPlaying ? (
                <Pause className="h-5 w-5 text-tune-primary" />
              ) : (
                <Play className="h-5 w-5 text-tune-primary" />
              )}
            </Button>
            
            {isHost && (
              <Button 
                variant="ghost" 
                size="icon"
                onClick={skipSong} 
                className="rounded-full hover:bg-tune-primary/20"
              >
                <SkipForward className="h-5 w-5 text-tune-primary" />
              </Button>
            )}
          </div>
        </div>
        
        {/* Progress Bar */}
        <div className="mt-3 space-y-1">
          <div className="h-1 w-full bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
            <div 
              className="h-full bg-tune-primary animate-pulse-light" 
              style={{ width: `${(currentTime / Math.max(duration, 1)) * 100}%` }}
            />
          </div>
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>{formatTime(currentTime)}</span>
            <span>{formatTime(duration)}</span>
          </div>
        </div>
        
        {/* Volume Control */}
        <div className="flex items-center space-x-2 mt-2">
          <Volume2 className="h-4 w-4 text-muted-foreground" />
          <Slider
            value={[volume]}
            max={100}
            step={1}
            className="w-24"
            onValueChange={handleVolumeChange}
            disabled={!playerReady}
          />
        </div>
      </div>
    </div>
  );
}
