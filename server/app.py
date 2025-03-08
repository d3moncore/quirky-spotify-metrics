
from flask import Flask, request, jsonify
from flask_cors import CORS
import spotipy
from spotipy.oauth2 import SpotifyOAuth
import os
import logging
import numpy as np
from sklearn.cluster import KMeans
from collections import defaultdict

app = Flask(__name__)
# Configure CORS to allow requests from our React app
CORS(app, resources={r"/api/*": {"origins": ["http://localhost:8080", "http://localhost:5173"]}})

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

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

@app.route('/api/me/top/tracks', methods=['GET'])
def get_top_tracks():
    token = get_token_from_header()
    if not token:
        return jsonify({"error": "No token provided"}), 401
    
    time_range = request.args.get('time_range', 'medium_term')
    limit = int(request.args.get('limit', 20))
    
    sp = create_spotify_client(token)
    try:
        return jsonify(sp.current_user_top_tracks(time_range=time_range, limit=limit))
    except Exception as e:
        logger.error(f"Error getting top tracks: {str(e)}")
        return jsonify({"error": str(e)}), 500

@app.route('/api/me/top/artists', methods=['GET'])
def get_top_artists():
    token = get_token_from_header()
    if not token:
        return jsonify({"error": "No token provided"}), 401
    
    time_range = request.args.get('time_range', 'medium_term')
    limit = int(request.args.get('limit', 20))
    
    sp = create_spotify_client(token)
    try:
        return jsonify(sp.current_user_top_artists(time_range=time_range, limit=limit))
    except Exception as e:
        logger.error(f"Error getting top artists: {str(e)}")
        return jsonify({"error": str(e)}), 500

@app.route('/api/me/player/recently-played', methods=['GET'])
def get_recently_played():
    token = get_token_from_header()
    if not token:
        return jsonify({"error": "No token provided"}), 401
    
    limit = int(request.args.get('limit', 20))
    
    sp = create_spotify_client(token)
    try:
        return jsonify(sp.current_user_recently_played(limit=limit))
    except Exception as e:
        logger.error(f"Error getting recently played: {str(e)}")
        return jsonify({"error": str(e)}), 500

@app.route('/api/me/tracks', methods=['GET'])
def get_liked_songs():
    token = get_token_from_header()
    if not token:
        return jsonify({"error": "No token provided"}), 401
    
    sp = create_spotify_client(token)
    try:
        results = sp.current_user_saved_tracks(limit=50)
        tracks = results['items']
        
        # Get all liked songs, not just the first 50
        while results['next']:
            results = sp.next(results)
            tracks.extend(results['items'])
            
        return jsonify({"items": tracks})
    except Exception as e:
        logger.error(f"Error getting liked songs: {str(e)}")
        return jsonify({"error": str(e)}), 500

@app.route('/api/me/playlists', methods=['GET'])
def get_user_playlists():
    token = get_token_from_header()
    if not token:
        return jsonify({"error": "No token provided"}), 401
    
    sp = create_spotify_client(token)
    try:
        playlists = sp.current_user_playlists()
        return jsonify(playlists)
    except Exception as e:
        logger.error(f"Error getting playlists: {str(e)}")
        return jsonify({"error": str(e)}), 500

@app.route('/api/playlists/cluster', methods=['POST'])
def create_clustered_playlists():
    token = get_token_from_header()
    if not token:
        return jsonify({"error": "No token provided"}), 401
    
    data = request.json
    if not data:
        return jsonify({"error": "No data provided"}), 400
    
    source_id = data.get('sourcePlaylistId')
    num_clusters = data.get('numberOfClusters', 3)
    clustering_method = data.get('clusteringMethod', 'kmeans')
    
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
        
        if len(tracks) < num_clusters:
            return jsonify({"error": f"Not enough tracks ({len(tracks)}) to create {num_clusters} clusters"}), 400
        
        # Create clusters based on the method
        clusters = []
        if clustering_method == 'kmeans':
            clusters = cluster_by_audio_features(sp, tracks, num_clusters)
        elif clustering_method == 'genre':
            clusters = cluster_by_genre(sp, tracks, num_clusters)
        elif clustering_method == 'artist':
            clusters = cluster_by_artist(tracks, num_clusters)
        else:
            return jsonify({"error": f"Unknown clustering method: {clustering_method}"}), 400
        
        # Create playlists for each cluster
        created_playlists = []
        source_name = "Liked Songs" if source_id == 'liked_songs' else sp.playlist(source_id)['name']
        
        for i, cluster in enumerate(clusters):
            if not cluster:  # Skip empty clusters
                continue
                
            # Create a new playlist
            playlist_name = f"Cluster {i+1} from {source_name}"
            new_playlist = sp.user_playlist_create(
                user=user_id,
                name=playlist_name,
                public=False,
                description=f"Created by AI clustering from {source_name}"
            )
            
            # Add tracks to the playlist (in batches of 100)
            track_uris = [track['uri'] for track in cluster]
            for j in range(0, len(track_uris), 100):
                batch = track_uris[j:j+100]
                sp.playlist_add_items(new_playlist['id'], batch)
            
            created_playlists.append({
                "id": new_playlist['id'],
                "name": playlist_name,
                "tracks": len(cluster)
            })
        
        return jsonify({
            "status": "success",
            "clusters": created_playlists
        })
            
    except Exception as e:
        logger.error(f"Error creating clusters: {str(e)}")
        return jsonify({"error": str(e)}), 500

def cluster_by_audio_features(sp, tracks, num_clusters):
    # Extract track IDs
    track_ids = [track['id'] for track in tracks if track['id']]
    
    # Get audio features for all tracks (in batches of 100)
    all_features = []
    for i in range(0, len(track_ids), 100):
        batch_ids = track_ids[i:i+100]
        features = sp.audio_features(batch_ids)
        all_features.extend([f for f in features if f])
    
    # Map audio features to original tracks
    features_dict = {f['id']: f for f in all_features if f}
    
    # Extract relevant features for clustering
    feature_matrix = []
    valid_tracks = []
    
    for track in tracks:
        if track['id'] in features_dict:
            features = features_dict[track['id']]
            feature_vector = [
                features['danceability'],
                features['energy'],
                features['valence'],
                features['tempo'] / 200,  # Normalize tempo
                features['acousticness'],
                features['instrumentalness']
            ]
            feature_matrix.append(feature_vector)
            valid_tracks.append(track)
    
    # Perform K-means clustering
    kmeans = KMeans(n_clusters=num_clusters, random_state=42).fit(feature_matrix)
    labels = kmeans.labels_
    
    # Group tracks by cluster
    clusters = [[] for _ in range(num_clusters)]
    for i, label in enumerate(labels):
        clusters[label].append(valid_tracks[i])
    
    return clusters

def cluster_by_genre(sp, tracks, num_clusters):
    # Get artist genres
    artist_ids = list(set([artist['id'] for track in tracks for artist in track['artists']]))
    
    # Get artists' details (in batches of 50)
    artist_details = {}
    for i in range(0, len(artist_ids), 50):
        batch_ids = artist_ids[i:i+50]
        artists = sp.artists(batch_ids)
        for artist in artists['artists']:
            artist_details[artist['id']] = artist['genres']
    
    # Calculate genre frequency for each track
    track_genres = {}
    for track in tracks:
        genres = []
        for artist in track['artists']:
            if artist['id'] in artist_details:
                genres.extend(artist_details[artist['id']])
        track_genres[track['id']] = list(set(genres))
    
    # Create genre frequency dictionary
    all_genres = list(set([genre for genres in track_genres.values() for genre in genres]))
    genre_to_idx = {genre: i for i, genre in enumerate(all_genres)}
    
    # Create genre vector for each track
    feature_matrix = []
    valid_tracks = []
    
    for track in tracks:
        if track['id'] in track_genres and track_genres[track['id']]:
            genre_vector = [0] * len(all_genres)
            for genre in track_genres[track['id']]:
                genre_vector[genre_to_idx[genre]] = 1
            feature_matrix.append(genre_vector)
            valid_tracks.append(track)
    
    if len(valid_tracks) < num_clusters:
        # Not enough tracks with genre info, use artist-based clustering instead
        return cluster_by_artist(tracks, num_clusters)
    
    # Perform K-means clustering
    kmeans = KMeans(n_clusters=num_clusters, random_state=42).fit(feature_matrix)
    labels = kmeans.labels_
    
    # Group tracks by cluster
    clusters = [[] for _ in range(num_clusters)]
    for i, label in enumerate(labels):
        clusters[label].append(valid_tracks[i])
    
    return clusters

def cluster_by_artist(tracks, num_clusters):
    # Group tracks by artist
    artist_tracks = defaultdict(list)
    for track in tracks:
        main_artist = track['artists'][0]['name']
        artist_tracks[main_artist].append(track)
    
    # Sort artists by number of tracks
    sorted_artists = sorted(artist_tracks.items(), key=lambda x: len(x[1]), reverse=True)
    
    # Create initial clusters with top artists
    clusters = []
    for i in range(min(num_clusters, len(sorted_artists))):
        clusters.append(sorted_artists[i][1])
    
    # Distribute remaining tracks
    if len(sorted_artists) > num_clusters:
        for i in range(num_clusters, len(sorted_artists)):
            # Add to the smallest cluster
            smallest_cluster = min(range(num_clusters), key=lambda j: len(clusters[j]))
            clusters[smallest_cluster].extend(sorted_artists[i][1])
    
    return clusters

def get_token_from_header():
    auth_header = request.headers.get('Authorization')
    if not auth_header:
        return None
    
    parts = auth_header.split()
    if parts[0].lower() != 'bearer' or len(parts) != 2:
        return None
    
    return parts[1]

def create_spotify_client(token):
    return spotipy.Spotify(auth=token)

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000, debug=True)
