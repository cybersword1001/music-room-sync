
import { Room } from '@/lib/supabase';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';

type RoomCardProps = {
  room: Room;
};

export function RoomCard({ room }: RoomCardProps) {
  const navigate = useNavigate();

  return (
    <Card className="border border-primary/20 bg-card hover:border-primary/40 transition-all duration-300 overflow-hidden">
      <CardHeader className="pb-2">
        <CardTitle className="text-xl font-medium">{room.room_name}</CardTitle>
      </CardHeader>
      <CardContent className="pb-2">
        <p className="text-muted-foreground text-sm">
          Room Code: <span className="font-mono font-medium text-primary">{room.room_code}</span>
        </p>
      </CardContent>
      <CardFooter>
        <Button 
          onClick={() => navigate(`/room/${room.id}`)} 
          className="w-full bg-tune-primary hover:bg-tune-primary/90"
        >
          Join Room
        </Button>
      </CardFooter>
    </Card>
  );
}
