
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from "@/hooks/use-toast";

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
      // In a real app, we'd use the YouTube API, but for this demo we'll use a simpler approach
      const response = await fetch(`https://noembed.com/embed?url=https://www.youtube.com/watch?v=${videoId}&format=json`);
      const data = await response.json();
      return {
        title: data.title || 'Unknown Title',
        thumbnail: `https://img.youtube.com/vi/${videoId}/mqdefault.jpg`,
        // We could parse author from title or use data.author_name
        artist: data.author_name || 'Unknown Artist',
      };
    } catch (error) {
      console.error('Error fetching video info:', error);
      return {
        title: 'Unknown Title',
        thumbnail: `https://img.youtube.com/vi/${videoId}/mqdefault.jpg`,
        artist: 'Unknown Artist',
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

    // Normalize the URL before extracting video ID
    const normalizedUrl = normalizeYouTubeUrl(songUrl);
    const videoId = extractVideoId(normalizedUrl);
    
    if (!videoId) {
      toast({
        title: "Invalid URL",
        description: "Please enter a valid YouTube URL",
        variant: "destructive"
      });
      return;
    }

    try {
      setIsAdding(true);
      
      const videoInfo = await getVideoInfo(videoId);
      
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

      if (error) throw error;

      toast({
        title: "Song Added",
        description: "Your song has been added to the queue"
      });
      
      setSongUrl('');
    } catch (error) {
      console.error('Error adding song:', error);
      toast({
        title: "Error",
        description: "Failed to add song. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsAdding(false);
    }
  };

  return (
    <div className="mt-6 space-y-2">
      <h2 className="text-xl font-semibold">Add a Song</h2>
      <div className="flex space-x-2">
        <Input
          placeholder="Paste YouTube URL"
          value={songUrl}
          onChange={(e) => setSongUrl(e.target.value)}
          className="flex-1"
        />
        <Button 
          onClick={handleAddSong} 
          disabled={isAdding || !songUrl}
          className="bg-tune-primary hover:bg-tune-primary/90"
        >
          {isAdding ? "Adding..." : "Add"}
        </Button>
      </div>
    </div>
  );
}
