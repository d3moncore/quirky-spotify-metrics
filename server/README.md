
# Spotify Playlist Clustering Backend

This is a Python Flask backend service for the Spotify Playlist Clustering app. It handles authentication with the Spotify API and provides endpoints for clustering tracks into playlists based on audio features, genres, or artists.

## Setup

1. Install dependencies:
```
pip install -r requirements.txt
```

2. Run the server:
```
python app.py
```

The server will run on http://localhost:5000 by default.

## API Endpoints

- `/api/me` - Get current user profile
- `/api/me/top/tracks` - Get user's top tracks
- `/api/me/top/artists` - Get user's top artists
- `/api/me/player/recently-played` - Get user's recently played tracks
- `/api/me/tracks` - Get user's liked songs
- `/api/me/playlists` - Get user's playlists
- `/api/playlists/cluster` - Create clustered playlists

## Clustering Methods

- **K-Means (by audio features)** - Uses audio features like danceability, energy, and valence to group similar songs
- **Genre Based** - Groups songs by similar genres
- **By Artist** - Groups songs by artist

## Requirements

- Python 3.7+
- Flask
- spotipy (Spotify API Python client)
- scikit-learn (for clustering algorithms)
