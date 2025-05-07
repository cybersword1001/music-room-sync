
import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { YouTubePlayer } from '@/components/YouTubePlayer';
import { SongQueue } from '@/components/SongQueue';
import { AddSongForm } from '@/components/AddSongForm';
import { Room as RoomType, Song, supabase } from '@/lib/supabase';
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft, Users, Music, ListMusic } from 'lucide-react';
import { ThemeToggle } from '@/components/ThemeToggle';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';

export default function Room() {
  const { id } = useParams();
  const [room, setRoom] = useState<RoomType | null>(null);
  const [currentSong, setCurrentSong] = useState<Song | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [activeUsers, setActiveUsers] = useState<number>(1); // Default to 1 (current user)
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
      toast({
        title: "Error",
        description: "Failed to play next song",
        variant: "destructive",
      });
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-background bg-music-pattern">
        <div className="flex flex-col items-center gap-2 glass-card p-8 animate-pulse-light">
          <div className="w-12 h-12 rounded-full border-4 border-t-tune-primary border-b-transparent border-l-tune-primary/50 border-r-tune-primary/80 animate-spin"></div>
          <div className="text-tune-primary font-semibold">
            Loading Music Room...
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background bg-music-pattern flex flex-col">
      <header className="border-b shadow-sm py-4 px-6 flex justify-between items-center bg-card/50 backdrop-blur-md sticky top-0 z-10">
        <div className="flex items-center space-x-3">
          <Button variant="ghost" size="icon" onClick={() => navigate('/dashboard')} className="rounded-full hover:bg-tune-primary/10">
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="flex items-center gap-2">
            <Music className="h-5 w-5 text-tune-primary" />
            <h1 className="text-xl font-semibold">{room?.room_name}</h1>
          </div>
        </div>
        
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 text-sm bg-card/80 px-3 py-1 rounded-full border">
            <Users className="h-4 w-4 text-tune-primary" />
            <span>{activeUsers} active</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium">Room: </span>
            <span className="font-mono bg-tune-primary/10 text-tune-primary px-3 py-1 rounded-full text-sm">{room?.room_code}</span>
          </div>
          <ThemeToggle />
        </div>
      </header>

      <main className="container mx-auto py-6 px-4 max-w-4xl flex-1">
        <div className="space-y-6">
          {currentSong ? (
            <div className="space-y-2 animate-fade-in">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-semibold flex items-center gap-2">
                  <ListMusic className="h-5 w-5 text-tune-primary" />
                  <span>Now Playing</span>
                </h2>
                <div className="flex items-center gap-2">
                  <Avatar className="h-6 w-6">
                    <AvatarFallback className="bg-tune-primary/20 text-tune-primary text-xs">
                      {currentSong.added_by.substring(0, 2).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <span className="text-sm text-muted-foreground">Added by user</span>
                </div>
              </div>
              <YouTubePlayer 
                videoId={currentSong.url}
                onEnded={handleSongEnded}
                title={currentSong.title}
                artist={currentSong.artist}
                thumbnail={currentSong.thumbnail}
                isHost={true} // TODO: Add actual host check
                height="100%"
                width="100%"
              />
            </div>
          ) : (
            <div className="bg-card/80 backdrop-blur-sm border rounded-lg p-8 text-center shadow-md">
              <h2 className="text-xl font-semibold mb-4">No song playing</h2>
              <p className="text-muted-foreground mb-4">Add songs to the queue to get started!</p>
              <div className="animate-pulse-light mx-auto w-16 h-16 rounded-full bg-tune-primary/20 flex items-center justify-center">
                <div className="w-8 h-8 border-4 border-t-tune-primary border-b-transparent border-l-tune-primary border-r-transparent rounded-full animate-spin"></div>
              </div>
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
