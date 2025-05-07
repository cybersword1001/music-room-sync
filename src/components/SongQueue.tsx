
import { useState, useEffect } from 'react';
import { Song, supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { ThumbsUp } from 'lucide-react';
import { useToast } from "@/hooks/use-toast";

type SongQueueProps = {
  roomId: string;
  currentSong: Song | null;
  setCurrentSong: (song: Song | null) => void;
};

export function SongQueue({ roomId, currentSong, setCurrentSong }: SongQueueProps) {
  const [songs, setSongs] = useState<Song[]>([]);
  const [userVotes, setUserVotes] = useState<string[]>([]);
  const { user } = useAuth();
  const { toast } = useToast();

  // Load the initial songs
  useEffect(() => {
    const fetchSongs = async () => {
      try {
        console.log('Fetching songs for room:', roomId);
        const { data: songsData, error } = await supabase
          .from('songs')
          .select('*')
          .eq('room_id', roomId) // This is correct per your SQL schema
          .order('votes', { ascending: false })
          .order('added_at', { ascending: true });

        if (error) {
          console.error('Error fetching songs:', error);
          throw error;
        }
        
        console.log('Songs fetched successfully:', songsData);
        setSongs(songsData || []);
        
        // Set current song if not set already
        if (songsData && songsData.length > 0 && !currentSong) {
          const firstSong = songsData[0];
          await supabase
            .from('songs')
            .update({ is_playing: true })
            .eq('id', firstSong.id);
          
          setCurrentSong(firstSong);
        }
      } catch (error) {
        console.error('Error fetching songs:', error);
      }
    };

    fetchSongs();

    // Subscribe to changes in the songs table
    const songsSubscription = supabase
      .channel('songs-channel')
      .on('postgres_changes', 
        { event: '*', schema: 'public', table: 'songs', filter: `room_id=eq.${roomId}` }, 
        (payload) => {
          console.log('Songs change received:', payload);
          fetchSongs();
        }
      )
      .subscribe();

    return () => {
      songsSubscription.unsubscribe();
    };
  }, [roomId]);

  // Load user votes
  useEffect(() => {
    const fetchUserVotes = async () => {
      if (!user) return;
      
      try {
        const { data, error } = await supabase
          .from('votes')
          .select('song_id')
          .eq('user_id', user.id);

        if (error) throw error;
        
        setUserVotes(data?.map(vote => vote.song_id) || []);
      } catch (error) {
        console.error('Error fetching user votes:', error);
      }
    };

    fetchUserVotes();
  }, [user]);

  const handleVote = async (songId: string) => {
    if (!user) {
      toast({
        title: "Error",
        description: "You must be logged in to vote",
        variant: "destructive"
      });
      return;
    }

    try {
      // Check if user already voted for this song
      if (userVotes.includes(songId)) {
        // Remove vote
        await supabase
          .from('votes')
          .delete()
          .match({ user_id: user.id, song_id: songId });

        // Decrement song votes
        await supabase
          .from('songs')
          .update({ votes: songs.find(s => s.id === songId)?.votes! - 1 })
          .eq('id', songId);

        setUserVotes(userVotes.filter(id => id !== songId));
      } else {
        // Add vote
        await supabase
          .from('votes')
          .insert({ user_id: user.id, song_id: songId });

        // Increment song votes
        await supabase
          .from('songs')
          .update({ votes: songs.find(s => s.id === songId)?.votes! + 1 })
          .eq('id', songId);

        setUserVotes([...userVotes, songId]);
      }
    } catch (error) {
      console.error('Error voting for song:', error);
      toast({
        title: "Error",
        description: "Failed to vote for song",
        variant: "destructive"
      });
    }
  };

  const nonPlayingSongs = songs.filter(song => !song.is_playing);

  return (
    <div className="space-y-4 mt-4">
      <h2 className="text-xl font-semibold">Up Next</h2>
      {nonPlayingSongs.length === 0 ? (
        <p className="text-muted-foreground text-center py-4">No songs in queue. Add a song below!</p>
      ) : (
        <div className="space-y-2">
          {nonPlayingSongs.map((song) => (
            <div 
              key={song.id} 
              className="border flex items-center p-3 rounded-lg bg-card hover:bg-card/80 transition-colors animate-fade-in"
            >
              <div className="h-12 w-12 mr-3 overflow-hidden rounded-md flex-shrink-0">
                <img src={song.thumbnail} alt={song.title} className="h-full w-full object-cover" />
              </div>
              <div className="flex-grow min-w-0">
                <h3 className="text-sm font-medium truncate">{song.title}</h3>
                {song.artist && (
                  <p className="text-xs text-muted-foreground truncate">{song.artist}</p>
                )}
              </div>
              <div className="flex items-center ml-2 flex-shrink-0">
                <span className="text-sm mr-2">{song.votes}</span>
                <Button 
                  variant="ghost" 
                  size="icon"
                  onClick={() => handleVote(song.id)}
                  className={userVotes.includes(song.id) ? "text-tune-primary" : ""}
                >
                  <ThumbsUp className="h-4 w-4" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
