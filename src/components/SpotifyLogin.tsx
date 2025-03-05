
import React from 'react';
import { Button } from '@/components/ui/button';
import { Music } from 'lucide-react';

interface SpotifyLoginProps {
  onLogin: () => void;
}

const SpotifyLogin: React.FC<SpotifyLoginProps> = ({ onLogin }) => {
  return (
    <div className="flex flex-col items-center justify-center min-h-[70vh] w-full text-center px-4">
      <div className="animate-float mb-8">
        <Music className="h-20 w-20 text-spotify-green" />
      </div>
      <h1 className="text-4xl md:text-5xl font-bold mb-6 text-spotify-gradient animate-in stagger-1">
        Discover Your Spotify Stats
      </h1>
      <p className="text-lg md:text-xl text-muted-foreground max-w-2xl mb-8 animate-in stagger-2">
        Connect with Spotify to visualize your listening habits, discover your top tracks, artists, and more.
      </p>
      <Button 
        onClick={onLogin} 
        size="lg" 
        className="bg-spotify-green hover:bg-spotify-green/90 text-white rounded-full px-8 py-6 text-lg font-medium shadow-lg hover:shadow-xl transition-all duration-300 animate-in stagger-3"
      >
        <Music className="mr-2 h-5 w-5" />
        Connect with Spotify
      </Button>
    </div>
  );
};

export default SpotifyLogin;
