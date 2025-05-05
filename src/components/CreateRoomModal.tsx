
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from "@/hooks/use-toast";

type CreateRoomModalProps = {
  isOpen: boolean;
  onClose: () => void;
};

export function CreateRoomModal({ isOpen, onClose }: CreateRoomModalProps) {
  const [roomName, setRoomName] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();

  const generateRoomCode = () => {
    const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let code = '';
    for (let i = 0; i < 6; i++) {
      code += characters.charAt(Math.floor(Math.random() * characters.length));
    }
    return code;
  };

  const handleCreateRoom = async () => {
    if (!roomName.trim()) {
      toast({
        title: "Error",
        description: "Please enter a room name",
        variant: "destructive",
      });
      return;
    }

    if (!user?.id) {
      toast({
        title: "Error",
        description: "You must be logged in to create a room",
        variant: "destructive",
      });
      return;
    }

    try {
      setIsCreating(true);
      const roomCode = generateRoomCode();
      
      // First, check if the rooms table exists
      const { error: tableCheckError } = await supabase
        .from('rooms')
        .select('count')
        .limit(1);

      // If table doesn't exist, create it first
      if (tableCheckError && tableCheckError.code === '42P01') {
        console.error('Rooms table does not exist. Please run the setup script in Supabase.');
        toast({
          title: "Database Error",
          description: "The rooms table doesn't exist in the database. Please set up your Supabase database first.",
          variant: "destructive",
        });
        setIsCreating(false);
        return;
      }
      
      const { data: room, error } = await supabase
        .from('rooms')
        .insert({
          room_name: roomName,
          created_by: user.id,
          room_code: roomCode,
        })
        .select()
        .single();

      if (error) {
        console.error('Error details:', error);
        throw error;
      }

      toast({
        title: "Success!",
        description: "Room created successfully. Share the code with your friends!",
      });
      
      onClose();
      navigate(`/room/${room.id}`);
    } catch (error: any) {
      console.error('Error creating room:', error);
      
      let errorMessage = "Failed to create room. Please try again.";
      
      // Provide more specific error messages
      if (error.code === '42P01') {
        errorMessage = "Database table 'rooms' doesn't exist. Please set up your database.";
      } else if (error.code === '23505') {
        errorMessage = "A room with this code already exists. Please try again.";
      } else if (error.code === '23503') {
        errorMessage = "Authentication error. Please log in again.";
      } else if (error.message) {
        errorMessage = `Error: ${error.message}`;
      }
      
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-xl font-medium">Create a Music Room</DialogTitle>
          <DialogDescription>
            Create a new room to listen to music with friends
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div className="space-y-2">
            <Label htmlFor="room-name">Room Name</Label>
            <Input
              id="room-name"
              placeholder="My Awesome Music Room"
              value={roomName}
              onChange={(e) => setRoomName(e.target.value)}
              className="focus:border-tune-primary"
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button 
            onClick={handleCreateRoom} 
            disabled={isCreating}
            className="bg-tune-primary hover:bg-tune-primary/90"
          >
            {isCreating ? "Creating..." : "Create Room"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
