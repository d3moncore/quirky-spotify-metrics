
from flask import Flask, request, jsonify
from flask_cors import CORS
import spotipy
from spotipy.oauth2 import SpotifyOAuth
import os
import logging
import numpy as np
from collections import defaultdict
import re
import requests
import json

app = Flask(__name__)
# Configure CORS to allow requests from our React app
CORS(app, 
     resources={r"/api/*": {
         "origins": ["http://localhost:8080", "http://localhost:5000", "http://localhost:8000"],
         "allow_headers": ["Content-Type", "Authorization"],
         "methods": ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
         "supports_credentials": True,
         "expose_headers": ["Content-Type", "Authorization"],
         "max_age": 3600
     }},
     supports_credentials=True)

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Configure LM Studio API - running locally at this URL, adjust if needed
LM_STUDIO_API_URL = "http://localhost:1234/v1/chat/completions"

@app.route('/api/me', methods=['GET'])
def get_current_user():
    token = get_token_from_header()
    if not token:
        return jsonify({"error": "No token provided"}), 401
    
    sp = create_spotify_client(token)
    try:
        return jsonify(sp.current_user())
    except Exception as e:
        logger.error(f"Error getting current user: {str(e)}")
        return jsonify({"error": str(e)}), 500

@app.route('/api/me/playlists', methods=['GET', 'OPTIONS'])
def get_user_playlists():
    # Handle preflight OPTIONS request
    if request.method == "OPTIONS":
        return handle_preflight()
        
    token = get_token_from_header()
    if not token:
        return jsonify({"error": "No token provided"}), 401
    
    sp = create_spotify_client(token)
    try:
        logger.info("Fetching user playlists")
        playlists = sp.current_user_playlists()
        logger.info(f"Successfully fetched {len(playlists.get('items', []))} playlists")
        return jsonify(playlists)
    except Exception as e:
        logger.error(f"Error getting playlists: {str(e)}")
        return jsonify({"error": str(e)}), 500

@app.route('/api/playlists/generate', methods=['POST', 'OPTIONS'])
def generate_playlist_from_prompt():
    # Handle preflight OPTIONS request
    if request.method == "OPTIONS":
        return handle_preflight()
        
    token = get_token_from_header()
    if not token:
        return jsonify({"error": "No token provided"}), 401
    
    data = request.json
    if not data:
        return jsonify({"error": "No data provided"}), 400
    
    source_id = data.get('sourcePlaylistId')
    prompt = data.get('prompt')
    
    if not prompt:
        return jsonify({"error": "No prompt provided"}), 400
    
    sp = create_spotify_client(token)
    user_id = sp.current_user()['id']
    
    try:
        # Get tracks from source
        tracks = []
        if source_id == 'liked_songs':
            # Get all liked songs
            results = sp.current_user_saved_tracks(limit=50)
            tracks = [item['track'] for item in results['items']]
            
            while results['next']:
                results = sp.next(results)
                tracks.extend([item['track'] for item in results['items']])
        else:
            # Get all tracks from the playlist
            results = sp.playlist_tracks(source_id)
            tracks = [item['track'] for item in results['items']]
            
            while results['next']:
                results = sp.next(results)
                tracks.extend([item['track'] for item in results['items']])
        
        logger.info(f"Retrieved {len(tracks)} tracks")
        
        if len(tracks) == 0:
            return jsonify({"error": "No tracks found in the source playlist"}), 400
        
        # Select tracks based on the prompt
        selected_tracks = select_tracks_with_local_llm(tracks, prompt, sp)
        
        if len(selected_tracks) == 0:
            return jsonify({"error": "No tracks match the prompt criteria"}), 400
        
        # Get AI-generated metadata for the playlist
        metadata = describe_playlist(selected_tracks, prompt)
        
        # Create a new playlist with AI-generated name and description
        source_name = "Liked Songs" if source_id == 'liked_songs' else sp.playlist(source_id)['name']
        
        # Use a simple description instead of the AI-generated one
        description = f"Inspired by: {prompt} | Source: {source_name}"
        # Ensure description is within Spotify's limit and properly formatted
        description = description.strip()[:300]  # Spotify has a 300 character limit
        # Final sanitization pass
        description = description.encode('ascii', 'ignore').decode()  # Remove non-ASCII characters
        
        # Sanitize the playlist name
        playlist_name = metadata.get('name', f"AI Playlist: {prompt}")
        # Remove any problematic characters and normalize whitespace
        playlist_name = re.sub(r'[^\w\s.,!?-]', '', playlist_name)  # Only allow basic punctuation
        playlist_name = ' '.join(playlist_name.split())  # Normalize whitespace
        # Ensure name is not empty and has a reasonable length
        if not playlist_name or len(playlist_name.strip()) == 0:
            playlist_name = f"AI Playlist: {prompt}"
        playlist_name = playlist_name[:100]  # Limit length
        
        new_playlist = sp.user_playlist_create(
            user=user_id,
            name=playlist_name,
            public=False,
            description=description
        )
        
        # Add tracks to the playlist
        track_uris = [track['uri'] for track in selected_tracks]
        for i in range(0, len(track_uris), 100):  # Spotify has a limit of 100 tracks per request
            batch = track_uris[i:i+100]
            sp.playlist_add_items(new_playlist['id'], batch)
        
        return jsonify({
            "status": "success",
            "playlist": {
                "id": new_playlist['id'],
                "name": metadata.get('name', f"AI Playlist: {prompt}"),
                "tracks": len(selected_tracks),
                "prompt": prompt
            }
        })
            
    except Exception as e:
        logger.error(f"Error generating playlist: {str(e)}")
        return jsonify({"error": str(e)}), 500

def select_tracks_with_local_llm(tracks, prompt, sp):
    """Select tracks based on user prompt using Spotify's recommendation API.
    
    This function uses Spotify's recommendation engine to find tracks that match the prompt.
    It extracts musical attributes and genres from the prompt and uses them as parameters
    for Spotify's recommendation API.
    """
    try:
        logger.info(f"Using Spotify recommendations to select tracks for prompt: {prompt}")
        
        # Extract potential genres from the prompt
        potential_genres = extract_genres_from_prompt(prompt)
        logger.info(f"Extracted potential genres: {potential_genres}")
        
        # Get seed tracks from the source playlist
        # We'll use these as a starting point for recommendations
        import random
        # Randomly select 5 tracks from the source to use as seeds
        if len(tracks) > 5:
            seed_track_candidates = random.sample(tracks, min(20, len(tracks)))
        else:
            seed_track_candidates = tracks
            
        # Sort by popularity to get more relevant recommendations
        seed_track_candidates.sort(key=lambda x: x.get('popularity', 0), reverse=True)
        seed_tracks = [t['id'] for t in seed_track_candidates[:5]]  # Use top 5 as seeds
        
        # Get audio features for seed tracks to understand their characteristics
        audio_features = []
        if seed_tracks:
            try:
                audio_features = sp.audio_features(seed_tracks)
                logger.info(f"Retrieved audio features for {len(audio_features)} seed tracks")
            except Exception as e:
                logger.error(f"Error getting audio features: {str(e)}")
        
        # Calculate average audio features to use as targets
        target_features = calculate_average_features(audio_features)
        
        # Adjust target features based on prompt keywords
        target_features = adjust_features_from_prompt(prompt, target_features)
        
        # Get recommendations from Spotify based on seed tracks, genres, and audio features
        recommendations_params = {
            'seed_tracks': seed_tracks[:2] if seed_tracks else None,  # Use up to 2 seed tracks
            'seed_genres': potential_genres[:3] if potential_genres else None,  # Use up to 3 genres
            'country': 'US',
            'limit': 100  # Get more recommendations to have a larger pool
        }
        
        # Add target audio features if available
        if target_features:
            recommendations_params.update(target_features)
        
        # Remove None values
        recommendations_params = {k: v for k, v in recommendations_params.items() if v is not None}
        
        logger.info(f"Getting recommendations with params: {recommendations_params}")
        recommendations = sp.recommendations(**recommendations_params)['tracks']
        logger.info(f"Retrieved {len(recommendations)} recommendations from Spotify")
        
        # Combine some source tracks with recommendations for a balanced playlist
        # We'll take 30% from original tracks and 70% from recommendations
        num_source_tracks = min(int(len(tracks) * 0.3), 20)  # At most 20 source tracks
        source_selection = random.sample(tracks, min(num_source_tracks, len(tracks)))
        
        # Combine tracks, prioritizing recommendations
        selected_tracks = recommendations + source_selection
        
        # Remove duplicates (by track ID)
        unique_tracks = []
        track_ids = set()
        for track in selected_tracks:
            if track['id'] not in track_ids:
                track_ids.add(track['id'])
                unique_tracks.append(track)
        
        # Ensure we have a reasonable number of tracks
        if len(unique_tracks) > 50:
            unique_tracks = unique_tracks[:50]  # Limit to 50 tracks
        
        logger.info(f"Selected {len(unique_tracks)} tracks using Spotify's recommendation engine")
        return unique_tracks
        
    except Exception as e:
        logger.error(f"Error in track selection with Spotify API: {str(e)}")
        # Fallback: Return a selection of random tracks from the source
        import random
        logger.warning("Using fallback selection method with a random sample from source")
        return random.sample(tracks, min(20, len(tracks)))

def adjust_features_from_prompt(prompt, target_features):
    """Adjust audio feature targets based on keywords in the prompt."""
    normalized_prompt = prompt.lower()
    
    # Energy adjustments
    if any(word in normalized_prompt for word in ['energetic', 'upbeat', 'party', 'workout', 'intense', 'dance', 'dancing']):
        target_features['target_energy'] = min(target_features.get('target_energy', 0) + 0.3, 1.0)
    elif any(word in normalized_prompt for word in ['calm', 'relaxing', 'chill', 'peaceful', 'sleep', 'ambient', 'meditation']):
        target_features['target_energy'] = max(target_features.get('target_energy', 0) - 0.3, 0.0)
    
    # Danceability adjustments
    if any(word in normalized_prompt for word in ['dance', 'dancing', 'party', 'groove', 'groovy', 'funky']):
        target_features['target_danceability'] = min(target_features.get('target_danceability', 0) + 0.3, 1.0)
    
    # Valence (positivity) adjustments
    if any(word in normalized_prompt for word in ['happy', 'upbeat', 'positive', 'cheerful', 'joy']):
        target_features['target_valence'] = min(target_features.get('target_valence', 0) + 0.3, 1.0)
    elif any(word in normalized_prompt for word in ['sad', 'melancholy', 'depressing', 'somber', 'dark']):
        target_features['target_valence'] = max(target_features.get('target_valence', 0) - 0.3, 0.0)
    
    # Acousticness adjustments
    if any(word in normalized_prompt for word in ['acoustic', 'unplugged', 'folk', 'singer-songwriter']):
        target_features['target_acousticness'] = min(target_features.get('target_acousticness', 0) + 0.3, 1.0)
    elif any(word in normalized_prompt for word in ['electronic', 'synth', 'edm', 'produced']):
        target_features['target_acousticness'] = max(target_features.get('target_acousticness', 0) - 0.3, 0.0)
    
    # Instrumentalness adjustments
    if any(word in normalized_prompt for word in ['instrumental', 'no vocals', 'no singing', 'background']):
        target_features['target_instrumentalness'] = min(target_features.get('target_instrumentalness', 0) + 0.3, 1.0)
    elif any(word in normalized_prompt for word in ['vocals', 'singing', 'vocal', 'lyrics']):
        target_features['target_instrumentalness'] = max(target_features.get('target_instrumentalness', 0) - 0.3, 0.0)
    
    # Tempo adjustments
    if any(word in normalized_prompt for word in ['fast', 'upbeat', 'energetic', 'workout']):
        target_features['target_tempo'] = target_features.get('target_tempo', 120) + 20
    elif any(word in normalized_prompt for word in ['slow', 'relaxing', 'chill', 'ballad']):
        target_features['target_tempo'] = max(target_features.get('target_tempo', 120) - 20, 60)
    
    return target_features

def extract_genres_from_prompt(prompt):
    """Extract potential genres from the user's prompt.
    
    This is a simple implementation that looks for common genre keywords.
    A more sophisticated approach could use an LLM or a genre classification model.
    """
    # List of common music genres
    common_genres = [
        'rock', 'pop', 'hip hop', 'rap', 'jazz', 'blues', 'country', 'metal',
        'folk', 'electronic', 'dance', 'r&b', 'soul', 'funk', 'disco', 'classical',
        'reggae', 'punk', 'indie', 'alternative', 'techno', 'house', 'ambient',
        'edm', 'trap', 'lo-fi', 'instrumental', 'acoustic', 'soundtrack',
        # Add more specific subgenres for better matching
        'indie rock', 'indie pop', 'dream pop', 'synthwave', 'vaporwave',
        'post-rock', 'shoegaze', 'chillwave', 'trip hop', 'downtempo',
        'deep house', 'tech house', 'progressive house', 'electro swing',
        'nu jazz', 'acid jazz', 'smooth jazz', 'bebop', 'hard bop',
        'alt rock', 'grunge', 'post-punk', 'new wave', 'synth-pop',
        'bedroom pop', 'hyperpop', 'alt-pop', 'art pop', 'baroque pop',
        'alt-country', 'americana', 'bluegrass', 'folk rock', 'singer-songwriter'
    ]
    
    # Normalize the prompt
    normalized_prompt = prompt.lower()
    
    # Find genres in the prompt
    found_genres = [genre for genre in common_genres if genre in normalized_prompt]
    
    # If no genres found, try to infer from other keywords
    if not found_genres:
        # Map keywords to potential genres
        keyword_to_genre = {
            # Moods
            'energetic': 'dance',
            'party': 'pop',
            'workout': 'electronic',
            'study': 'ambient',
            'relax': 'chill',
            'relaxing': 'chill',
            'calm': 'ambient',
            'peaceful': 'ambient',
            'sad': 'blues',
            'melancholy': 'indie',
            'happy': 'pop',
            'upbeat': 'pop',
            'angry': 'rock',
            'intense': 'metal',
            'romantic': 'r&b',
            'sensual': 'r&b',
            'focus': 'instrumental',
            'sleep': 'ambient',
            'dreamy': 'dream pop',
            'nostalgic': 'indie',
            'retro': 'synthwave',
            
            # Activities
            'driving': 'rock',
            'road trip': 'rock',
            'dinner': 'jazz',
            'morning': 'pop',
            'night': 'electronic',
            'late night': 'downtempo',
            'dancing': 'dance',
            'running': 'electronic',
            'gym': 'hip hop',
            'coding': 'lo-fi',
            'reading': 'classical',
            'meditation': 'ambient',
            'yoga': 'ambient',
            'beach': 'reggae',
            'summer': 'pop',
            'winter': 'indie',
            'autumn': 'folk',
            'spring': 'indie pop',
            'rain': 'ambient',
            'sunset': 'chill',
            'sunrise': 'ambient',
            
            # Decades
            '80s': 'synthwave',
            '90s': 'alternative',
            '70s': 'rock',
            '60s': 'rock',
            '2000s': 'pop',
            
            # Descriptors
            'chill': 'lo-fi',
            'smooth': 'r&b',
            'heavy': 'metal',
            'soft': 'acoustic',
            'acoustic': 'acoustic',
            'instrumental': 'instrumental',
            'vocal': 'pop',
            'electronic': 'electronic',
            'experimental': 'alternative',
            'cinematic': 'soundtrack',
            'epic': 'soundtrack',
            'atmospheric': 'ambient',
            'groovy': 'funk',
            'funky': 'funk',
            'soulful': 'soul',
            'jazzy': 'jazz',
            'bluesy': 'blues',
            'folky': 'folk',
            'indie': 'indie',
            'alternative': 'alternative',
            'punk': 'punk',
            'rock': 'rock',
            'pop': 'pop',
            'hip hop': 'hip hop',
            'rap': 'rap',
            'classical': 'classical',
            'orchestral': 'classical'
        }
        
        for keyword, genre in keyword_to_genre.items():
            if keyword in normalized_prompt:
                found_genres.append(genre)
    
    # Remove duplicates while preserving order
    unique_genres = []
    for genre in found_genres:
        if genre not in unique_genres:
            unique_genres.append(genre)
    
    return unique_genres

def calculate_average_features(audio_features):
    """Calculate average audio features to use as targets for recommendations."""
    if not audio_features or not all(audio_features):
        return {}
    
    # Features to average and use as targets
    target_features = {
        'target_danceability': 0,
        'target_energy': 0,
        'target_valence': 0,  # Musical positiveness
        'target_tempo': 0,
        'target_acousticness': 0,
        'target_instrumentalness': 0
    }
    
    valid_features = [f for f in audio_features if f is not None]
    if not valid_features:
        return {}
    
    count = len(valid_features)
    
    # Calculate averages
    for feature in valid_features:
        if 'danceability' in feature:
            target_features['target_danceability'] += feature['danceability'] / count
        if 'energy' in feature:
            target_features['target_energy'] += feature['energy'] / count
        if 'valence' in feature:
            target_features['target_valence'] += feature['valence'] / count
        if 'tempo' in feature:
            target_features['target_tempo'] += feature['tempo'] / count
        if 'acousticness' in feature:
            target_features['target_acousticness'] += feature['acousticness'] / count
        if 'instrumentalness' in feature:
            target_features['target_instrumentalness'] += feature['instrumentalness'] / count
    
    return target_features

def handle_preflight():
    """Handle preflight OPTIONS requests."""
    response = jsonify({"status": "ok"})
    # Get the origin from the request and use it instead of wildcard
    origin = request.headers.get('Origin')
    # Use the specific origin or default to localhost:8080 if not provided
    if origin:
        response.headers.add('Access-Control-Allow-Origin', origin)
    else:
        response.headers.add('Access-Control-Allow-Origin', 'http://localhost:8080')
    response.headers.add('Access-Control-Allow-Headers', 'Content-Type,Authorization')
    response.headers.add('Access-Control-Allow-Methods', 'GET,POST,PUT,DELETE,OPTIONS')
    response.headers.add('Access-Control-Allow-Credentials', 'true')
    return response

def get_token_from_header():
    auth_header = request.headers.get('Authorization')
    if not auth_header:
        logger.warning("No Authorization header found in request")
        return None
    
    parts = auth_header.split()
    if parts[0].lower() != 'bearer' or len(parts) != 2:
        logger.warning("Invalid Authorization header format")
        return None
    
    logger.info("Successfully extracted token from request")
    return parts[1]

def create_spotify_client(token):
    return spotipy.Spotify(auth=token)

@app.route('/api/health', methods=['GET'])
def health_check():
    return jsonify({"status": "ok", "message": "Backend is running"}), 200

# Remove the LLM health check endpoint since we're not using LLM anymore
# @app.route('/api/llm/health', methods=['GET'])
# def llm_health_check():
#     """Check if the local LLM is accessible"""
#     try:
#         response = requests.post(
#             LM_STUDIO_API_URL,
#             headers={"Content-Type": "application/json"},
#             json={
#                 "messages": [
#                     {"role": "user", "content": "Say hello"}
#                 ],
#                 "max_tokens": 10
#             },
#             timeout=5  # 5-second timeout for quick check
#         )
#         if response.status_code == 200:
#             return jsonify({"status": "ok", "message": "Local LLM is accessible"}), 200
#         else:
#             return jsonify({"status": "error", "message": f"Local LLM returned status {response.status_code}"}), 500
#     except Exception as e:
#         return jsonify({"status": "error", "message": f"Could not connect to local LLM: {str(e)}"}), 500

def describe_playlist(selected_tracks, prompt):
    """Generate a name for the playlist based on the tracks and prompt.
    
    This function no longer relies on an LLM for generating playlist names.
    Instead, it uses a template-based approach with the user's prompt.
    """
    # Extract genres from the prompt
    genres = extract_genres_from_prompt(prompt)
    
    # Create a playlist name based on the prompt and extracted genres
    if genres:
        # Use the first 2 genres at most
        genre_text = " & ".join(genres[:2])
        playlist_name = f"{genre_text.title()} Mix: {prompt[:30]}"
    else:
        # If no genres found, use a generic template
        playlist_name = f"Curated: {prompt[:40]}"
    
    # Ensure the name is not too long
    if len(playlist_name) > 100:
        playlist_name = playlist_name[:97] + "..."
    
    return {"name": playlist_name}

if __name__ == '__main__':
    logger.info("Starting Playlist Generator API Server on port 8000")
    app.run(host='0.0.0.0', port=8000, debug=True)
