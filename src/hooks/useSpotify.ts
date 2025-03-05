
import { useState, useEffect } from 'react';
import * as SpotifyService from '../services/spotify';

export const useSpotifyAuth = () => {
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  
  const login = () => {
    const authUrl = SpotifyService.getAuthUrl();
    window.location.href = authUrl;
  };
  
  const logout = () => {
    localStorage.removeItem('spotify_token');
    localStorage.removeItem('spotify_token_expires_at');
    setToken(null);
  };
  
  useEffect(() => {
    // Check URL for token on initial load
    if (window.location.hash) {
      const processedToken = SpotifyService.processAuth();
      if (processedToken) {
        setToken(processedToken);
        
        // Clean URL after processing
        window.history.pushState({}, document.title, window.location.pathname);
      }
    }
    
    // Check localStorage for existing token
    const savedToken = localStorage.getItem('spotify_token');
    const expiresAtStr = localStorage.getItem('spotify_token_expires_at');
    
    if (savedToken && expiresAtStr) {
      const expiresAt = parseInt(expiresAtStr);
      const now = new Date().getTime();
      
      if (now < expiresAt) {
        setToken(savedToken);
      } else {
        // Token expired, remove it
        localStorage.removeItem('spotify_token');
        localStorage.removeItem('spotify_token_expires_at');
      }
    }
    
    setLoading(false);
  }, []);
  
  return { token, loading, login, logout, isAuthenticated: !!token };
};

export const useProfile = () => {
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const { isAuthenticated } = useSpotifyAuth();
  
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
  const { isAuthenticated } = useSpotifyAuth();
  
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
  const { isAuthenticated } = useSpotifyAuth();
  
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
