import { useState, useEffect } from 'react';
import * as SpotifyService from '../services/spotify';
import { useAuth } from '@/contexts/AuthContext';

export const useSpotifyAuth = () => {
  const auth = useAuth();
  return auth;
};

export const useProfile = () => {
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const { isAuthenticated } = useAuth();
  
  useEffect(() => {
    if (!isAuthenticated) {
      setLoading(false);
      return;
    }
    
    const fetchProfile = async () => {
      try {
        setLoading(true);
        const data = await SpotifyService.getCurrentUser();
        setProfile(data);
        setError(null);
      } catch (err) {
        setError(err as Error);
      } finally {
        setLoading(false);
      }
    };
    
    fetchProfile();
  }, [isAuthenticated]);
  
  return { profile, loading, error };
};

export const useTopItems = <T>(type: 'tracks' | 'artists', timeRange: string = 'medium_term') => {
  const [items, setItems] = useState<T[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const { isAuthenticated } = useAuth();
  
  useEffect(() => {
    if (!isAuthenticated) {
      setLoading(false);
      return;
    }
    
    const fetchItems = async () => {
      try {
        setLoading(true);
        let data;
        
        if (type === 'tracks') {
          data = await SpotifyService.getTopTracks(timeRange);
        } else {
          data = await SpotifyService.getTopArtists(timeRange);
        }
        
        setItems(data.items);
        setError(null);
      } catch (err) {
        setError(err as Error);
      } finally {
        setLoading(false);
      }
    };
    
    fetchItems();
  }, [isAuthenticated, type, timeRange]);
  
  return { items, loading, error };
};

export const useRecentlyPlayed = () => {
  const [tracks, setTracks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const { isAuthenticated } = useAuth();
  
  useEffect(() => {
    if (!isAuthenticated) {
      setLoading(false);
      return;
    }
    
    const fetchRecentlyPlayed = async () => {
      try {
        setLoading(true);
        const data = await SpotifyService.getRecentlyPlayed();
        setTracks(data.items);
        setError(null);
      } catch (err) {
        setError(err as Error);
      } finally {
        setLoading(false);
      }
    };
    
    fetchRecentlyPlayed();
  }, [isAuthenticated]);
  
  return { tracks, loading, error };
};
