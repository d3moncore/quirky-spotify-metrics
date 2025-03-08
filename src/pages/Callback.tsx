
import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';

const Callback = () => {
  const navigate = useNavigate();
  const { isAuthenticated, loading } = useAuth();

  useEffect(() => {
    if (!loading) {
      if (isAuthenticated) {
        navigate('/dashboard');
      }
    }
  }, [isAuthenticated, loading, navigate]);

  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="animate-pulse text-spotify-green font-semibold">
        Connecting to Spotify...
      </div>
    </div>
  );
};

export default Callback;
