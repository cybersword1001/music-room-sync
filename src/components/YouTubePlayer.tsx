
import { useEffect, useRef, useState } from 'react';
import { Play, Pause, Volume2, SkipForward } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { useAuth } from '@/contexts/AuthContext';

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
  const containerRef = useRef<HTMLDivElement>(null);
  const [isPlaying, setIsPlaying] = useState(true);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(80);
  const { user } = useAuth();
  
  useEffect(() => {
    // Load YouTube API script
    const tag = document.createElement('script');
    tag.src = 'https://www.youtube.com/iframe_api';
    const firstScriptTag = document.getElementsByTagName('script')[0];
    firstScriptTag.parentNode?.insertBefore(tag, firstScriptTag);

    // Initialize player when API is ready
    window.onYouTubeIframeAPIReady = () => {
      if (containerRef.current) {
        playerRef.current = new window.YT.Player(containerRef.current, {
          height,
          width,
          videoId,
          playerVars: {
            autoplay: 1,
            controls: 0, // Hide default controls
            modestbranding: 1,
            rel: 0,
            showinfo: 0,
          },
          events: {
            onStateChange: (event: any) => {
              // Video ended (state = 0)
              if (event.data === 0) {
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
              console.error("YouTube player error:", event);
              onEnded(); // Skip to next song on error
            }
          },
        });
      }
    };

    // Clean up
    return () => {
      if (playerRef.current && playerRef.current.destroy) {
        playerRef.current.destroy();
      }
    };
  }, []);

  // Update video when ID changes
  useEffect(() => {
    if (playerRef.current && videoId) {
      playerRef.current.loadVideoById(videoId);
      setIsPlaying(true);
    }
  }, [videoId]);
  
  const togglePlay = () => {
    if (!playerRef.current) return;
    
    if (isPlaying) {
      playerRef.current.pauseVideo();
    } else {
      playerRef.current.playVideo();
    }
    setIsPlaying(!isPlaying);
  };
  
  const handleVolumeChange = (value: number[]) => {
    if (!playerRef.current) return;
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
      <div className="w-full aspect-video rounded-lg overflow-hidden shadow-lg">
        <div ref={containerRef} className="w-full h-full rounded-lg" />
      </div>
      
      {/* Spotify-like Player UI */}
      <div className="bg-card border rounded-lg mt-4 p-4 shadow-md">
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
              style={{ width: `${(currentTime / duration) * 100}%` }}
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
          />
        </div>
      </div>
    </div>
  );
}
