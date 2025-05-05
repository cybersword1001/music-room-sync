
import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { YouTubePlayer } from '@/components/YouTubePlayer';
import { SongQueue } from '@/components/SongQueue';
import { AddSongForm } from '@/components/AddSongForm';
import { Room as RoomType, Song, supabase } from '@/lib/supabase';
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft } from 'lucide-react';

export default function Room() {
  const { id } = useParams();
  const [room, setRoom] = useState<RoomType | null>(null);
  const [currentSong, setCurrentSong] = useState<Song | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    const fetchRoom = async () => {
      if (!id) return;

      try {
        const { data, error } = await supabase
          .from('rooms')
          .select('*')
          .eq('id', id)
          .single();

        if (error) throw error;
        setRoom(data);
      } catch (error) {
        console.error('Error fetching room:', error);
        toast({
          title: "Error",
          description: "Room not found or you don't have access",
          variant: "destructive",
        });
        navigate('/dashboard');
      } finally {
        setIsLoading(false);
      }
    };

    fetchRoom();
  }, [id, navigate]);

  const handleSongEnded = async () => {
    if (!currentSong || !id) return;
    
    try {
      // Mark current song as not playing
      await supabase
        .from('songs')
        .update({ is_playing: false })
        .eq('id', currentSong.id);
      
      // Get the next song with highest votes
      const { data: nextSongs } = await supabase
        .from('songs')
        .select('*')
        .eq('room_id', id)
        .eq('is_playing', false)
        .order('votes', { ascending: false })
        .order('added_at', { ascending: true })
        .limit(1);
      
      if (nextSongs && nextSongs.length > 0) {
        const nextSong = nextSongs[0];
        
        // Mark the next song as playing
        await supabase
          .from('songs')
          .update({ is_playing: true })
          .eq('id', nextSong.id);
        
        setCurrentSong(nextSong);
      } else {
        setCurrentSong(null);
      }
    } catch (error) {
      console.error('Error handling song ended:', error);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-pulse-light text-tune-primary font-semibold">
          Loading Room...
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b shadow-sm py-4 px-6 flex justify-between items-center">
        <div className="flex items-center space-x-2">
          <Button variant="ghost" size="icon" onClick={() => navigate('/dashboard')}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <h1 className="text-xl font-semibold">{room?.room_name}</h1>
        </div>
        <div>
          <span className="text-sm font-medium">Room Code: </span>
          <span className="font-mono text-tune-primary">{room?.room_code}</span>
        </div>
      </header>

      <main className="container mx-auto py-6 px-4 max-w-4xl">
        <div className="space-y-6">
          {currentSong ? (
            <div className="space-y-2">
              <h2 className="text-xl font-semibold">Now Playing</h2>
              <div className="rounded-lg overflow-hidden border">
                <YouTubePlayer 
                  videoId={currentSong.url}
                  onEnded={handleSongEnded}
                  height="100%"
                  width="100%"
                />
              </div>
              <div className="pt-2">
                <h3 className="font-medium">{currentSong.title}</h3>
                {currentSong.artist && (
                  <p className="text-sm text-muted-foreground">{currentSong.artist}</p>
                )}
              </div>
            </div>
          ) : (
            <div className="bg-card border rounded-lg p-8 text-center">
              <h2 className="text-xl font-semibold mb-4">No song playing</h2>
              <p className="text-muted-foreground mb-4">Add songs to the queue to get started!</p>
            </div>
          )}

          {id && (
            <>
              <SongQueue roomId={id} currentSong={currentSong} setCurrentSong={setCurrentSong} />
              <AddSongForm roomId={id} />
            </>
          )}
        </div>
      </main>
    </div>
  );
}
