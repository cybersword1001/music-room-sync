
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { RoomCard } from '@/components/RoomCard';
import { CreateRoomModal } from '@/components/CreateRoomModal';
import { JoinRoomModal } from '@/components/JoinRoomModal';
import { useAuth } from '@/contexts/AuthContext';
import { Room, supabase } from '@/lib/supabase';
import { Skeleton } from '@/components/ui/skeleton';
import { ThemeToggle } from '@/components/ThemeToggle';

export default function Dashboard() {
  const [rooms, setRooms] = useState<Room[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showJoinModal, setShowJoinModal] = useState(false);
  const { user, signOut } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    const fetchRooms = async () => {
      try {
        // Check if the rooms table exists first
        const { error: tableError } = await supabase
          .from('rooms')
          .select('count')
          .limit(1)
          .single();
          
        if (tableError) {
          console.log('Rooms table might not exist yet:', tableError);
          setRooms([]);
          setIsLoading(false);
          return;
        }
        
        const { data, error } = await supabase
          .from('rooms')
          .select('*')
          .order('created_at', { ascending: false });

        if (error) throw error;
        setRooms(data || []);
      } catch (error) {
        console.error('Error fetching rooms:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchRooms();

    // Subscribe to changes in the rooms table
    const roomsSubscription = supabase
      .channel('room-changes')
      .on('postgres_changes', 
        { event: '*', schema: 'public', table: 'rooms' }, 
        () => {
          fetchRooms();
        }
      )
      .subscribe();

    return () => {
      roomsSubscription.unsubscribe();
    };
  }, []);

  const handleSignOut = async () => {
    await signOut();
    navigate('/login');
  };

  return (
    <div className="min-h-screen bg-background dark:bg-gray-900 transition-colors duration-200">
      <header className="border-b shadow-sm py-4 px-6 flex justify-between items-center bg-background dark:bg-gray-900 dark:border-gray-800">
        <h1 className="text-2xl font-bold text-tune-primary">TuneTogether</h1>
        <div className="flex items-center space-x-4">
          <ThemeToggle />
          <Button variant="outline" onClick={handleSignOut}>Sign Out</Button>
        </div>
      </header>

      <main className="container mx-auto py-8 px-4">
        <div className="flex justify-between items-center mb-8">
          <h2 className="text-2xl font-semibold dark:text-white">Music Rooms</h2>
          <div className="flex space-x-2">
            <Button 
              variant="outline" 
              onClick={() => setShowJoinModal(true)}
            >
              Join Room
            </Button>
            <Button 
              onClick={() => setShowCreateModal(true)}
              className="bg-tune-primary hover:bg-tune-primary/90"
            >
              Create Room
            </Button>
          </div>
        </div>

        {isLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {[...Array(6)].map((_, i) => (
              <Skeleton key={i} className="h-36 rounded-lg" />
            ))}
          </div>
        ) : rooms.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {rooms.map((room) => (
              <RoomCard key={room.id} room={room} />
            ))}
          </div>
        ) : (
          <div className="text-center py-12 dark:text-white">
            <h3 className="text-xl mb-4">No rooms available</h3>
            <p className="mb-6 text-muted-foreground">Create a new room or join with a room code</p>
            <div className="flex justify-center space-x-4">
              <Button 
                variant="outline" 
                onClick={() => setShowJoinModal(true)}
              >
                Join Room
              </Button>
              <Button 
                onClick={() => setShowCreateModal(true)}
                className="bg-tune-primary hover:bg-tune-primary/90"
              >
                Create Room
              </Button>
            </div>
          </div>
        )}
      </main>

      <CreateRoomModal 
        isOpen={showCreateModal} 
        onClose={() => setShowCreateModal(false)} 
      />

      <JoinRoomModal 
        isOpen={showJoinModal} 
        onClose={() => setShowJoinModal(false)} 
      />
    </div>
  );
}
