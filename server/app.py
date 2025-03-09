
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
        selected_tracks = select_tracks_with_local_llm(tracks, prompt)
        
        if len(selected_tracks) == 0:
            return jsonify({"error": "No tracks match the prompt criteria"}), 400
        
        # Create a new playlist
        source_name = "Liked Songs" if source_id == 'liked_songs' else sp.playlist(source_id)['name']
        playlist_name = f"{prompt} (from {source_name})"
        
        new_playlist = sp.user_playlist_create(
            user=user_id,
            name=playlist_name,
            public=False,
            description=f"Created based on prompt: '{prompt}' from {source_name}"
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
                "name": playlist_name,
                "tracks": len(selected_tracks),
                "prompt": prompt
            }
        })
            
    except Exception as e:
        logger.error(f"Error generating playlist: {str(e)}")
        return jsonify({"error": str(e)}), 500

def select_tracks_with_local_llm(tracks, prompt):
    try:
        # Extract track details for analysis
        track_details = []
        for track in tracks:
            artists = ", ".join([artist['name'] for artist in track['artists']])
            track_details.append({
                "id": track['id'],
                "name": track['name'],
                "artists": artists,
                "track_obj": track
            })
        
        # Create a list of track descriptions with indices
        track_descriptions = []
        for i, t in enumerate(track_details[:100]):  # Limit to first 100 tracks to avoid context length issues
            track_descriptions.append(f"{i}: '{t['name']}' by {t['artists']}")
        
        # Create a prompt for the local LLM
        message = f"""
        I have a list of songs and need to select ones that match this theme: "{prompt}".
        
        Here are the songs:
        {"\n".join(track_descriptions)}
        
        Please respond with ONLY the indices (0-based) of songs that strongly match the theme.
        Format your response as a JSON array of integers, e.g., [0, 5, 10]
        Focus on quality over quantity - only select songs that truly match the theme.
        """
        
        logger.info("Sending request to local LM Studio API")
        
        # Make request to LM Studio API (DeepSeek R1 model)
        response = requests.post(
            LM_STUDIO_API_URL,
            headers={"Content-Type": "application/json"},
            json={
                "messages": [
                    {"role": "system", "content": "You are a music curator that selects songs based on themes and moods."},
                    {"role": "user", "content": message}
                ],
                "temperature": 0.7,
                "max_tokens": 1000
            }
        )
        
        if response.status_code != 200:
            logger.error(f"LM Studio API error: {response.text}")
            raise Exception(f"LM Studio API returned status code {response.status_code}")
        
        # Parse response
        llm_response = response.json()
        response_text = llm_response['choices'][0]['message']['content']
        logger.info(f"LLM Response: {response_text}")
        
        # Try to parse the response as JSON
        try:
            # Find anything that looks like a JSON array in the response
            match = re.search(r'\[.*?\]', response_text, re.DOTALL)
            if match:
                indices = json.loads(match.group(0))  # Parse the array safely
                selected_tracks = [tracks[i] for i in indices if i < len(tracks)]
                return selected_tracks
        except Exception as e:
            logger.error(f"Error parsing LLM response: {str(e)}")
        
        # Fallback approach if JSON parsing fails
        # Look for any numbers in the response
        indices = [int(num) for num in re.findall(r'\b\d+\b', response_text)]
        selected_tracks = [tracks[i] for i in indices if i < len(tracks)]
        
        if not selected_tracks and tracks:
            # If no tracks were selected but we have tracks, return a small sample
            import random
            logger.warning("No tracks matched criteria, selecting a small random sample")
            return random.sample(tracks, min(3, len(tracks)))
            
        return selected_tracks
        
    except Exception as e:
        logger.error(f"Error in track selection with local LLM: {str(e)}")
        # Fallback: Return a few random tracks
        import random
        return random.sample(tracks, min(5, len(tracks)))

def handle_preflight():
    """Handle preflight OPTIONS requests."""
    response = jsonify({"status": "ok"})
    response.headers.add('Access-Control-Allow-Origin', '*')
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

@app.route('/api/llm/health', methods=['GET'])
def llm_health_check():
    """Check if the local LLM is accessible"""
    try:
        response = requests.post(
            LM_STUDIO_API_URL,
            headers={"Content-Type": "application/json"},
            json={
                "messages": [
                    {"role": "user", "content": "Say hello"}
                ],
                "max_tokens": 10
            },
            timeout=5  # 5-second timeout for quick check
        )
        if response.status_code == 200:
            return jsonify({"status": "ok", "message": "Local LLM is accessible"}), 200
        else:
            return jsonify({"status": "error", "message": f"Local LLM returned status {response.status_code}"}), 500
    except Exception as e:
        return jsonify({"status": "error", "message": f"Could not connect to local LLM: {str(e)}"}), 500

if __name__ == '__main__':
    logger.info("Starting Playlist Generator API Server on port 8000")
    app.run(host='0.0.0.0', port=8000, debug=True)
