
import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/AuthContext';

export default function Index() {
  const { user } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (user) {
      navigate('/dashboard');
    }
  }, [user, navigate]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-tune-dark to-tune-secondary flex flex-col justify-center items-center p-4 bg-music-pattern">
      <div className="max-w-3xl text-center animate-fade-in">
        <h1 className="text-4xl sm:text-6xl font-bold text-white mb-4">
          <span className="text-tune-primary">Tune</span>Together
        </h1>
        <p className="text-xl text-white/80 mb-8">
          Create rooms, share music, and listen together in real-time
        </p>
        <div className="space-x-4">
          <Button 
            onClick={() => navigate('/login')}
            className="bg-tune-primary hover:bg-tune-primary/90 text-white px-8"
            size="lg"
          >
            Get Started
          </Button>
          <Button 
            variant="outline" 
            onClick={() => navigate('/register')}
            className="text-white border-white hover:bg-white/10"
            size="lg"
          >
            Sign Up
          </Button>
        </div>
      </div>

      <div className="mt-16 grid grid-cols-1 sm:grid-cols-3 gap-8 max-w-5xl w-full animate-slide-up">
        {[
          {
            title: "Create Rooms",
            description: "Start a new music room and invite your friends to join with a unique code."
          },
          {
            title: "Queue Songs",
            description: "Add YouTube songs to the queue. Everyone can contribute to the playlist."
          },
          {
            title: "Vote & Play",
            description: "Vote for your favorite songs. The most popular ones play first."
          }
        ].map((feature, index) => (
          <div 
            key={index}
            className="glass-card p-6 text-center text-white"
          >
            <h2 className="text-xl font-semibold mb-2">{feature.title}</h2>
            <p className="text-white/70">{feature.description}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
