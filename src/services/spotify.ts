
// Constants for Spotify API
const CLIENT_ID = "466f878e480043b0a05c5f2c5bc07f63"; // Replace with your Spotify Client ID
const REDIRECT_URI = "http://localhost:8080/callback";
const AUTH_ENDPOINT = "https://accounts.spotify.com/authorize";
const RESPONSE_TYPE = "token";
const SCOPES = [
  "user-read-private",
  "user-read-email",
  "user-top-read",
  "user-read-recently-played",
  "user-library-read",
  "playlist-read-private",
  "playlist-read-collaborative",
  "playlist-modify-public",
  "playlist-modify-private",
];

// Backend API URL
const BACKEND_API_URL = "http://localhost:8000/api";

// Generate random state for auth
const generateRandomString = (length: number) => {
  let text = "";
  const possible =
    "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";

  for (let i = 0; i < length; i++) {
    text += possible.charAt(Math.floor(Math.random() * possible.length));
  }
  return text;
};

// Create the Spotify auth URL
export const getAuthUrl = () => {
  const state = generateRandomString(16);
  localStorage.setItem("spotify_auth_state", state);

  const url = new URL(AUTH_ENDPOINT);
  url.searchParams.append("client_id", CLIENT_ID);
  url.searchParams.append("response_type", RESPONSE_TYPE);
  url.searchParams.append("redirect_uri", REDIRECT_URI);
  url.searchParams.append("state", state);
  url.searchParams.append("scope", SCOPES.join(" "));

  return url.toString();
};

// Helper to get token from URL
export const getTokenFromUrl = () => {
  const hash = window.location.hash;

  if (!hash) return null;

  const stringAfterHash = hash.substring(1);
  const params = stringAfterHash
    .split("&")
    .reduce((acc: Record<string, string>, item) => {
      const [key, value] = item.split("=");
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
  const storedState = localStorage.getItem("spotify_auth_state");
  if (state !== storedState) {
    console.error("State mismatch in Spotify auth flow");
    return null;
  }

  // Clear state
  localStorage.removeItem("spotify_auth_state");

  // Save token with expiry
  const expiresAt = new Date().getTime() + expires_in * 1000;
  localStorage.setItem("spotify_token", access_token);
  localStorage.setItem("spotify_token_expires_at", expiresAt.toString());

  return access_token;
};

// Check if token is valid
export const isTokenValid = () => {
  const token = localStorage.getItem("spotify_token");
  const expiresAtStr = localStorage.getItem("spotify_token_expires_at");

  if (!token || !expiresAtStr) {
    return false;
  }

  const expiresAt = parseInt(expiresAtStr);
  const now = new Date().getTime();

  return now < expiresAt;
};

// API request helper
export const spotifyFetch = async (
  endpoint: string,
  options: RequestInit = {}
) => {
  const token = localStorage.getItem("spotify_token");

  if (!token) {
    throw new Error("No Spotify token found");
  }

  // Add a trailing slash to BACKEND_API_URL if it doesn't have one
  const baseUrl = BACKEND_API_URL.endsWith("/")
    ? BACKEND_API_URL
    : `${BACKEND_API_URL}/`;

  // Remove leading slash from endpoint if it exists
  const cleanEndpoint = endpoint.startsWith("/")
    ? endpoint.substring(1)
    : endpoint;

  // Build the full URL
  const url = `${baseUrl}${cleanEndpoint}`;

  console.log(`Fetching from: ${url}`);

  try {
    // Add credentials: 'include' to ensure cookies are sent with the request
    const fetchOptions = {
      ...options,
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
        ...options.headers,
      },
      credentials: "include" as RequestCredentials,
    };

    console.log("Fetch options:", JSON.stringify(fetchOptions, null, 2));

    const response = await fetch(url, fetchOptions);

    if (!response.ok) {
      if (response.status === 401) {
        // Token expired
        localStorage.removeItem("spotify_token");
        localStorage.removeItem("spotify_token_expires_at");
        throw new Error("Spotify token expired");
      }

      // Handle CORS errors separately for better debugging
      if (response.status === 0) {
        console.error("CORS error or network failure detected");
        throw new Error(
          "CORS error or network failure - Check that backend server is running at " +
            BACKEND_API_URL
        );
      }

      const errorText = await response.text();
      let errorMessage = "Error from Backend API";
      try {
        const errorJson = JSON.parse(errorText);
        errorMessage = errorJson.message || errorJson.error || errorMessage;
      } catch (e) {
        errorMessage = errorText || errorMessage;
      }

      console.error(`API Error (${response.status}):`, errorMessage);
      throw new Error(errorMessage);
    }

    return response.json();
  } catch (error) {
    console.error("Spotify API fetch error:", error);
    throw error;
  }
};

// API endpoints
export const getCurrentUser = () => spotifyFetch("me");

export const getUserPlaylists = () => spotifyFetch("me/playlists");

export const generatePlaylistFromPrompt = async (
  sourcePlaylistId: string,
  prompt: string
) => {
  return spotifyFetch("playlists/generate", {
    method: "POST",
    body: JSON.stringify({
      sourcePlaylistId,
      prompt,
    }),
  });
};

// Health check function to test backend connectivity
export const checkBackendHealth = async () => {
  try {
    const response = await fetch(`${BACKEND_API_URL}/health`, {
      method: "GET",
      credentials: "include",
    });
    return response.ok;
  } catch (error) {
    console.error("Backend health check failed:", error);
    return false;
  }
};
