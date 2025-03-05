
// Constants for Spotify API
const CLIENT_ID = 'YOUR_CLIENT_ID'; // Replace with your Spotify Client ID
const REDIRECT_URI = window.location.origin + '/callback';
const AUTH_ENDPOINT = 'https://accounts.spotify.com/authorize';
const RESPONSE_TYPE = 'token';
const SCOPES = [
  'user-read-private',
  'user-read-email',
  'user-top-read',
  'user-read-recently-played',
  'user-library-read',
];

// Generate random state for auth
const generateRandomString = (length: number) => {
  let text = '';
  const possible = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  
  for (let i = 0; i < length; i++) {
    text += possible.charAt(Math.floor(Math.random() * possible.length));
  }
  return text;
};

// Create the Spotify auth URL
export const getAuthUrl = () => {
  const state = generateRandomString(16);
  localStorage.setItem('spotify_auth_state', state);
  
  const url = new URL(AUTH_ENDPOINT);
  url.searchParams.append('client_id', CLIENT_ID);
  url.searchParams.append('response_type', RESPONSE_TYPE);
  url.searchParams.append('redirect_uri', REDIRECT_URI);
  url.searchParams.append('state', state);
  url.searchParams.append('scope', SCOPES.join(' '));
  
  return url.toString();
};

// Helper to get token from URL
export const getTokenFromUrl = () => {
  const hash = window.location.hash;
  
  if (!hash) return null;
  
  const stringAfterHash = hash.substring(1);
  const params = stringAfterHash.split('&').reduce((acc: Record<string, string>, item) => {
    const [key, value] = item.split('=');
    acc[key] = decodeURIComponent(value);
    return acc;
  }, {});
  
  return params;
};

// Parse and save token
export const processAuth = () => {
  const params = getTokenFromUrl();
  
  if (!params || !params.access_token) return null;
  
  const access_token = params.access_token;
  const expires_in = params.expires_in ? parseInt(params.expires_in) : 3600;
  const state = params.state;
  
  // Check state matches
  const storedState = localStorage.getItem('spotify_auth_state');
  if (state !== storedState) {
    console.error('State mismatch in Spotify auth flow');
    return null;
  }
  
  // Clear state
  localStorage.removeItem('spotify_auth_state');
  
  // Save token with expiry
  const expiresAt = new Date().getTime() + (expires_in * 1000);
  localStorage.setItem('spotify_token', access_token);
  localStorage.setItem('spotify_token_expires_at', expiresAt.toString());
  
  return access_token;
};

// API request helper
export const spotifyFetch = async (endpoint: string, options: RequestInit = {}) => {
  const token = localStorage.getItem('spotify_token');
  
  if (!token) {
    throw new Error('No Spotify token found');
  }
  
  const url = endpoint.startsWith('https://')
    ? endpoint
    : `https://api.spotify.com/v1/${endpoint}`;
  
  const response = await fetch(url, {
    ...options,
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
      ...options.headers,
    },
  });
  
  if (!response.ok) {
    if (response.status === 401) {
      // Token expired
      localStorage.removeItem('spotify_token');
      localStorage.removeItem('spotify_token_expires_at');
      window.location.href = '/';
      throw new Error('Spotify token expired');
    }
    
    const error = await response.json();
    throw new Error(error.error.message || 'Error from Spotify API');
  }
  
  return response.json();
};

// API endpoints
export const getCurrentUser = () => spotifyFetch('me');

export const getTopTracks = (timeRange = 'medium_term', limit = 20) => 
  spotifyFetch(`me/top/tracks?time_range=${timeRange}&limit=${limit}`);

export const getTopArtists = (timeRange = 'medium_term', limit = 20) => 
  spotifyFetch(`me/top/artists?time_range=${timeRange}&limit=${limit}`);

export const getRecentlyPlayed = (limit = 20) => 
  spotifyFetch(`me/player/recently-played?limit=${limit}`);
