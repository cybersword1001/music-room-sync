
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

  const normalizeYouTubeUrl = (url: string) => {
    // Handle youtu.be short links
    const shortRegex = /^https?:\/\/youtu\.be\/([a-zA-Z0-9_-]{11})/;
    const shortMatch = url.match(shortRegex);
    if (shortMatch) {
      return `https://www.youtube.com/watch?v=${shortMatch[1]}`;
    }
    
    // Handle other YouTube URL formats if needed
    // For now, return the original URL if it's not a short link
    return url;
  };

  const extractVideoId = (url: string) => {
    // Normalize the URL first
    const normalizedUrl = normalizeYouTubeUrl(url);
    
    const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/;
    const match = normalizedUrl.match(regExp);
    return (match && match[2].length === 11) ? match[2] : null;
  };

  const getVideoInfo = async (videoId: string) => {
    try {
      // Using noembed.com as a proxy to get video info
      const response = await fetch(`https://noembed.com/embed?url=https://www.youtube.com/watch?v=${videoId}&format=json`);
      
      if (!response.ok) {
        throw new Error(`Failed to fetch video info: ${response.status}`);
      }
      
      const data = await response.json();
      console.log("Video info fetched:", data);
      
      return {
        title: data.title || 'Unknown Title',
        thumbnail: `https://img.youtube.com/vi/${videoId}/mqdefault.jpg`,
        artist: data.author_name || 'Unknown Artist',
        duration: '0:00', // YouTube API doesn't provide duration via noembed
      };
    } catch (error) {
      console.error('Error fetching video info:', error);
      // Return fallback data if we can't fetch info
      return {
        title: 'Unknown Title',
        thumbnail: `https://img.youtube.com/vi/${videoId}/mqdefault.jpg`,
        artist: 'Unknown Artist',
        duration: '0:00',
      };
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

    try {
      setIsAdding(true);
      
      // Normalize the URL before extracting video ID
      const normalizedUrl = normalizeYouTubeUrl(songUrl);
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
      
      // More informative error messages
      let errorMessage = "Failed to add song. Please try again.";
      if (error instanceof Error) {
        if (error.message.includes("404")) {
          errorMessage = "Video not found. It may be private or deleted.";
        } else if (error.message.includes("403")) {
          errorMessage = "This video has restricted playback. Try another one.";
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

  return (
    <div className="mt-6 space-y-4 bg-card border rounded-lg p-6 shadow-md">
      <h2 className="text-xl font-semibold flex items-center gap-2">
        <Music2 className="h-5 w-5 text-tune-primary" />
        <span>Add a Song</span>
      </h2>
      <div className="flex space-x-2">
        <Input
          placeholder="Paste YouTube URL"
          value={songUrl}
          onChange={(e) => setSongUrl(e.target.value)}
          className="flex-1 bg-background/50 border-tune-primary/20 focus:border-tune-primary/50 rounded-full px-4"
        />
        <Button 
          onClick={handleAddSong} 
          disabled={isAdding || !songUrl}
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
