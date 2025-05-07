
import { useRef, useState, useEffect } from 'react';
import { onYouTubeApiReady } from '@/utils/youtubeApi';
import { useToast } from '@/hooks/use-toast';

interface UseYouTubePlayerProps {
  videoId: string;
  onEnded: () => void;
  height?: string;
  width?: string;
}

export const useYouTubePlayer = ({ videoId, onEnded, height = '360', width = '640' }: UseYouTubePlayerProps) => {
  const playerRef = useRef<any>(null);
  const playerElementRef = useRef<HTMLDivElement>(null);
  const [isPlaying, setIsPlaying] = useState(true);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(80);
  const [playerReady, setPlayerReady] = useState(false);
  const { toast } = useToast();
  
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
    const setupPlayer = () => {
      if (window.YT && window.YT.Player) {
        initializePlayer();
      } else {
        onYouTubeApiReady(initializePlayer);
      }
    };
    
    setupPlayer();
    
    // Cleanup function
    return () => {
      if (playerRef.current && playerRef.current.destroy) {
        console.log('Destroying YouTube player on unmount');
        playerRef.current.destroy();
        playerRef.current = null;
      }
    };
  }, []);
  
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
    if (playerRef.current) {
      onEnded();
    }
  };
  
  return {
    playerElementRef,
    isPlaying,
    currentTime,
    duration,
    volume,
    playerReady,
    togglePlay,
    handleVolumeChange,
    skipSong
  };
};
