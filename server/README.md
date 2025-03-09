
# Spotify Playlist Generator Backend

This is a Python Flask backend service for the Spotify Playlist Generator app. It connects to the Spotify API and uses a local language model via LM Studio to generate playlists based on natural language prompts.

## Setup

1. Install dependencies:
```
pip install -r requirements.txt
```

2. Start LM Studio:
   - Open LM Studio application
   - Load the DeepSeek R1 model or another compatible model
   - Start the local server (usually runs on port 1234)
   - Make sure the API is accessible at http://localhost:1234/v1/chat/completions

3. Run the backend server:
```
python app.py
```

The server will run on http://localhost:8000 by default.

## API Endpoints

- `/api/me` - Get current user profile
- `/api/me/playlists` - Get user's playlists
- `/api/playlists/generate` - Create playlists based on natural language prompts
- `/api/health` - Check backend server health
- `/api/llm/health` - Check LM Studio connection

## Using with LM Studio

This application is configured to use a local language model running through LM Studio, which should be running on your local machine. 

1. Download and install LM Studio from https://lmstudio.ai/
2. Install the DeepSeek R1 model or another compatible model
3. Start the local server
4. The backend will automatically connect to the LM Studio API at http://localhost:1234

If your LM Studio is running on a different port, update the `LM_STUDIO_API_URL` variable in `app.py`.
