
import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import * as SpotifyService from '../services/spotify';
import { useNavigate, useLocation } from 'react-router-dom';
import { useToast } from '@/components/ui/use-toast';

interface AuthContextType {
  token: string | null;
  loading: boolean;
  isAuthenticated: boolean;
  login: () => void;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const location = useLocation();
  const navigate = useNavigate();
  const { toast } = useToast();

  const login = () => {
    const authUrl = SpotifyService.getAuthUrl();
    window.location.href = authUrl;
  };
  
  const logout = () => {
    localStorage.removeItem('spotify_token');
    localStorage.removeItem('spotify_token_expires_at');
    setToken(null);
    navigate('/');
  };
  
  useEffect(() => {
    const checkAuth = async () => {
      setLoading(true);
      
      // Check URL for token on callback route
      if (location.pathname === '/callback' && window.location.hash) {
        const processedToken = SpotifyService.processAuth();
        if (processedToken) {
          setToken(processedToken);
          
          // Clean URL after processing
          window.history.pushState({}, document.title, '/callback');
          
          toast({
            title: "Authentication Successful",
            description: "You have successfully connected your Spotify account.",
          });
        } else {
          toast({
            title: "Authentication Failed",
            description: "Could not connect to Spotify. Please try again.",
            variant: "destructive",
          });
          navigate('/');
        }
      } else {
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
      }
      
      setLoading(false);
    };
    
    checkAuth();
  }, [location.pathname, navigate, toast]);
  
  return (
    <AuthContext.Provider value={{ token, loading, isAuthenticated: !!token, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
