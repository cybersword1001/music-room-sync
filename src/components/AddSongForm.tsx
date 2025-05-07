
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from "@/hooks/use-toast";
import { Music2 } from 'lucide-react';

type AddSongFormProps = {
  roomId: string;
};

export function AddSongForm({ roomId }: AddSongFormProps) {
  const [songUrl, setSongUrl] = useState('');
  const [isAdding, setIsAdding] = useState(false);
  const { user } = useAuth();
  const { toast } = useToast();

  // Enhanced YouTube URL normalization function
  const normalizeYouTubeUrl = (url: string) => {
    // Handle youtu.be short links
    const shortRegex = /^https?:\/\/youtu\.be\/([a-zA-Z0-9_-]{11})/;
    const shortMatch = url.match(shortRegex);
    if (shortMatch) {
      return `https://www.youtube.com/watch?v=${shortMatch[1]}`;
    }
    
    // Handle embedded links
    const embedRegex = /^https?:\/\/www\.youtube\.com\/embed\/([a-zA-Z0-9_-]{11})/;
    const embedMatch = url.match(embedRegex);
    if (embedMatch) {
      return `https://www.youtube.com/watch?v=${embedMatch[1]}`;
    }
    
    // Handle full YouTube links with params
    const fullRegex = /^https?:\/\/(?:www\.)?youtube\.com\/watch.*[?&]v=([a-zA-Z0-9_-]{11})/;
    const fullMatch = url.match(fullRegex);
    if (fullMatch) {
      return `https://www.youtube.com/watch?v=${fullMatch[1]}`;
    }
    
    // Handle YouTube music links
    const musicRegex = /^https?:\/\/music\.youtube\.com\/watch.*[?&]v=([a-zA-Z0-9_-]{11})/;
    const musicMatch = url.match(musicRegex);
    if (musicMatch) {
      return `https://www.youtube.com/watch?v=${musicMatch[1]}`;
    }
    
    // Return original URL if no pattern matches
    return url;
  };

  // Enhanced video ID extraction with validation
  const extractVideoId = (url: string) => {
    // Normalize the URL first
    const normalizedUrl = normalizeYouTubeUrl(url);
    
    // Standard YouTube ID regex
    const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/;
    const match = normalizedUrl.match(regExp);
    
    // Validate ID format (YouTube IDs are 11 characters)
    const videoId = match && match[2].length === 11 ? match[2] : null;
    
    console.log(`Extracted video ID: ${videoId} from URL: ${url}`);
    return videoId;
  };

  // Enhanced video info fetching with better error handling
  const getVideoInfo = async (videoId: string) => {
    try {
      // Using noembed.com as a proxy to get video info
      const response = await fetch(`https://noembed.com/embed?url=https://www.youtube.com/watch?v=${videoId}&format=json`);
      
      if (!response.ok) {
        throw new Error(`Failed to fetch video info: ${response.status}`);
      }
      
      const data = await response.json();
      console.log("Video info fetched:", data);
      
      if (!data.title) {
        throw new Error("Invalid video or restricted content");
      }
      
      return {
        title: data.title,
        thumbnail: `https://img.youtube.com/vi/${videoId}/mqdefault.jpg`,
        artist: data.author_name || 'Unknown Artist',
        duration: '0:00', // YouTube API doesn't provide duration via noembed
      };
    } catch (error) {
      console.error('Error fetching video info:', error);
      
      // Return error so we can handle it in the calling function
      throw new Error(`Failed to fetch video info: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

  const handleAddSong = async () => {
    if (!user) {
      toast({
        title: "Error",
        description: "You must be logged in to add songs",
        variant: "destructive"
      });
      return;
    }

    if (!songUrl.trim()) {
      toast({
        title: "Error",
        description: "Please enter a YouTube URL",
        variant: "destructive"
      });
      return;
    }

    try {
      setIsAdding(true);
      
      // Normalize the URL before extracting video ID
      const normalizedUrl = normalizeYouTubeUrl(songUrl.trim());
      const videoId = extractVideoId(normalizedUrl);
      
      if (!videoId) {
        toast({
          title: "Invalid URL",
          description: "Please enter a valid YouTube URL",
          variant: "destructive"
        });
        setIsAdding(false);
        return;
      }
      
      const videoInfo = await getVideoInfo(videoId);

      // Log the data we're going to insert
      console.log("Inserting song with data:", {
        room_id: roomId,
        title: videoInfo.title,
        url: videoId,
        added_by: user.id,
        votes: 0,
        is_playing: false,
        thumbnail: videoInfo.thumbnail,
        artist: videoInfo.artist,
      });
      
      const { error } = await supabase
        .from('songs')
        .insert({
          room_id: roomId,
          title: videoInfo.title,
          url: videoId,
          added_by: user.id,
          votes: 0,
          is_playing: false,
          thumbnail: videoInfo.thumbnail,
          artist: videoInfo.artist,
        });

      if (error) {
        console.error('Supabase error adding song:', error);
        throw error;
      }

      toast({
        title: "Song Added",
        description: "Your song has been added to the queue"
      });
      
      setSongUrl('');
    } catch (error) {
      console.error('Error adding song:', error);
      
      // More descriptive error messages based on error type
      let errorMessage = "Failed to add song. Please try again.";
      
      if (error instanceof Error) {
        if (error.message.includes("404") || error.message.includes("not found")) {
          errorMessage = "Video not found. It may be private or deleted.";
        } else if (error.message.includes("403") || error.message.includes("forbidden")) {
          errorMessage = "This video has restricted playback. Try another one.";
        } else if (error.message.includes("restricted content")) {
          errorMessage = "This video is age-restricted or not available for embedding.";
        } else if (error.message.includes("column")) {
          errorMessage = "Database issue. Please make sure your Supabase tables are set up correctly.";
        } else if (error.message) {
          errorMessage = `Error: ${error.message.substring(0, 100)}`;
        }
      }
      
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive"
      });
    } finally {
      setIsAdding(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !isAdding && songUrl.trim()) {
      handleAddSong();
    }
  };

  return (
    <div className="mt-6 space-y-4 bg-card border rounded-lg p-6 shadow-md backdrop-blur-sm">
      <h2 className="text-xl font-semibold flex items-center gap-2">
        <Music2 className="h-5 w-5 text-tune-primary" />
        <span>Add a Song</span>
      </h2>
      <div className="flex space-x-2">
        <Input
          placeholder="Paste YouTube URL"
          value={songUrl}
          onChange={(e) => setSongUrl(e.target.value)}
          onKeyPress={handleKeyPress}
          className="flex-1 bg-background/50 border-tune-primary/20 focus:border-tune-primary/50 rounded-full px-4"
          disabled={isAdding}
        />
        <Button 
          onClick={handleAddSong} 
          disabled={isAdding || !songUrl.trim()}
          className="bg-tune-primary hover:bg-tune-primary/90 rounded-full px-6 transition-all transform hover:scale-105 shadow-md"
        >
          {isAdding ? "Adding..." : "Add Song"}
        </Button>
      </div>
      <p className="text-xs text-muted-foreground italic">
        Tip: Both standard YouTube links and shortened youtu.be URLs work!
      </p>
    </div>
  );
}
