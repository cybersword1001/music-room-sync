
import React from 'react';
import { Play, Pause, SkipForward, Volume2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { formatTime } from '@/utils/youtubeApi';

interface PlayerControlsProps {
  isPlaying: boolean;
  currentTime: number;
  duration: number;
  volume: number;
  playerReady: boolean;
  togglePlay: () => void;
  handleVolumeChange: (value: number[]) => void;
  skipSong: () => void;
  isHost?: boolean;
}

export function PlayerControls({
  isPlaying,
  currentTime,
  duration,
  volume,
  playerReady,
  togglePlay,
  handleVolumeChange,
  skipSong,
  isHost = false
}: PlayerControlsProps) {
  return (
    <div className="mt-3 space-y-1">
      {/* Progress Bar */}
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
      
      <div className="flex items-center justify-between mt-2">
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
        
        {/* Volume Control */}
        <div className="flex items-center space-x-2">
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
