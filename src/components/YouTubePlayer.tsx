
import React from 'react';
import { useYouTubePlayer } from '@/hooks/useYouTubePlayer';
import { PlayerControls } from '@/components/PlayerControls';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';

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
  const {
    playerElementRef,
    isPlaying,
    currentTime,
    duration,
    volume,
    playerReady,
    togglePlay,
    handleVolumeChange,
    skipSong
  } = useYouTubePlayer({
    videoId,
    onEnded,
    height,
    width
  });
  
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
          
          {/* User Avatar */}
          <div className="flex items-center gap-2">
            <Avatar className="h-6 w-6">
              <AvatarFallback className="bg-tune-primary/20 text-tune-primary text-xs">
                {artist.substring(0, 2).toUpperCase()}
              </AvatarFallback>
            </Avatar>
          </div>
        </div>
        
        {/* Player Controls */}
        <PlayerControls 
          isPlaying={isPlaying}
          currentTime={currentTime}
          duration={duration}
          volume={volume}
          playerReady={playerReady}
          togglePlay={togglePlay}
          handleVolumeChange={handleVolumeChange}
          skipSong={skipSong}
          isHost={isHost}
        />
      </div>
    </div>
  );
}
