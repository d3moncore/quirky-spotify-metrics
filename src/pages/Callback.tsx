
import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSpotifyAuth } from '@/hooks/useSpotify';
import { useToast } from '@/components/ui/use-toast';

const Callback = () => {
  const navigate = useNavigate();
  const { token, loading } = useSpotifyAuth();
  const { toast } = useToast();

  useEffect(() => {
    if (!loading) {
      if (token) {
        toast({
          title: "Authentication Successful",
          description: "You have successfully connected your Spotify account.",
        });
        navigate('/dashboard');
      } else {
        toast({
          title: "Authentication Failed",
          description: "Could not connect to Spotify. Please try again.",
          variant: "destructive",
        });
        navigate('/');
      }
    }
  }, [token, loading, navigate, toast]);

  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="animate-pulse text-spotify-green font-semibold">
        Connecting to Spotify...
      </div>
    </div>
  );
};

export default Callback;
