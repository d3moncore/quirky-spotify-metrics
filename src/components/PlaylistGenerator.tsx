
import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import * as SpotifyService from '@/services/spotify';
import { Loader2, RefreshCw, Music, Wand2 } from 'lucide-react';

const PlaylistGenerator = () => {
  const { isAuthenticated } = useAuth();
  const { toast } = useToast();
  const [sourceType, setSourceType] = useState<'liked' | 'playlist'>('liked');
  const [playlists, setPlaylists] = useState<any[]>([]);
  const [selectedPlaylistId, setSelectedPlaylistId] = useState<string>('');
  const [prompt, setPrompt] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);
  const [loadingPlaylists, setLoadingPlaylists] = useState<boolean>(false);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [generatedPlaylist, setGeneratedPlaylist] = useState<any>(null);

  // Fetch user playlists when component mounts or auth state changes
  useEffect(() => {
    if (isAuthenticated) {
      fetchUserPlaylists();
    }
  }, [isAuthenticated]);

  const fetchUserPlaylists = async () => {
    if (!isAuthenticated) {
      return;
    }

    try {
      setLoadingPlaylists(true);
      setFetchError(null);
      console.log('Fetching user playlists...');
      const data = await SpotifyService.getUserPlaylists();
      console.log('Playlists fetched:', data);
      
      if (data && data.items) {
        setPlaylists(data.items);
      } else {
        console.error('Unexpected playlist data format:', data);
        setPlaylists([]);
        setFetchError('Received invalid playlist data format from the server');
      }
    } catch (error) {
      console.error('Error fetching playlists:', error);
      setFetchError(error instanceof Error ? error.message : 'Failed to fetch your playlists');
      
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to fetch your playlists. Please try again later.',
        variant: 'destructive',
      });
      
      setPlaylists([]);
    } finally {
      setLoadingPlaylists(false);
    }
  };

  const handleGeneratePlaylist = async () => {
    try {
      setLoading(true);
      setGeneratedPlaylist(null);
      
      // Use either 'liked' as the source or the selected playlist ID
      const sourceId = sourceType === 'liked' ? 'liked_songs' : selectedPlaylistId;
      
      if (sourceType === 'playlist' && !selectedPlaylistId) {
        toast({
          title: 'Error',
          description: 'Please select a playlist first.',
          variant: 'destructive',
        });
        return;
      }

      if (!prompt.trim()) {
        toast({
          title: 'Error',
          description: 'Please enter a prompt for your playlist.',
          variant: 'destructive',
        });
        return;
      }

      const result = await SpotifyService.generatePlaylistFromPrompt(
        sourceId,
        prompt
      );

      setGeneratedPlaylist(result.playlist);
      
      toast({
        title: 'Success',
        description: `Created a playlist with ${result.playlist.tracks} tracks based on your prompt.`,
      });
    } catch (error) {
      console.error('Error generating playlist:', error);
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to generate playlist. Please try again later.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const openPlaylist = () => {
    if (generatedPlaylist && generatedPlaylist.id) {
      window.open(`https://open.spotify.com/playlist/${generatedPlaylist.id}`, '_blank');
    }
  };

  const renderPromptSuggestions = () => {
    const suggestions = [
      "Create a playlist for a late night drive through the city",
      "Songs for a peaceful Sunday morning",
      "Upbeat tracks for a workout session",
      "Music for a cozy rainy day",
      "Nostalgic songs from the 90s"
    ];
    
    return (
      <div className="mt-2 flex flex-wrap gap-2">
        {suggestions.map((suggestion, index) => (
          <Button 
            key={index} 
            variant="outline" 
            size="sm"
            onClick={() => setPrompt(suggestion)}
            className="text-xs"
          >
            {suggestion}
          </Button>
        ))}
      </div>
    );
  };

  return (
    <div className="w-full max-w-md mx-auto p-6 space-y-6 glass-card rounded-2xl">
      <h2 className="text-2xl font-bold text-center text-spotify-gradient">AI Playlist Generator</h2>
      <p className="text-center text-muted-foreground">
        Describe the perfect playlist and let AI create it for you
      </p>

      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium mb-2">Source</label>
          <Select
            value={sourceType}
            onValueChange={(value) => setSourceType(value as 'liked' | 'playlist')}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select Source" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="liked">Liked Songs</SelectItem>
              <SelectItem value="playlist">From Playlist</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {sourceType === 'playlist' && (
          <div>
            <label className="block text-sm font-medium mb-2">Select Playlist</label>
            {loadingPlaylists ? (
              <div className="flex justify-center py-4">
                <Loader2 className="h-5 w-5 animate-spin text-spotify-green" />
              </div>
            ) : fetchError ? (
              <div className="space-y-2">
                <div className="text-destructive text-sm py-2">{fetchError}</div>
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="w-full flex items-center justify-center"
                  onClick={fetchUserPlaylists}
                >
                  <RefreshCw className="mr-2 h-4 w-4" />
                  Retry
                </Button>
              </div>
            ) : (
              <Select
                value={selectedPlaylistId}
                onValueChange={setSelectedPlaylistId}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Choose a playlist" />
                </SelectTrigger>
                <SelectContent>
                  {playlists.length > 0 ? (
                    playlists.map((playlist) => (
                      <SelectItem key={playlist.id} value={playlist.id}>
                        {playlist.name}
                      </SelectItem>
                    ))
                  ) : (
                    <SelectItem value="no-playlists" disabled>
                      No playlists found
                    </SelectItem>
                  )}
                </SelectContent>
              </Select>
            )}
          </div>
        )}

        <div>
          <label className="block text-sm font-medium mb-2">Describe Your Playlist</label>
          <Textarea
            placeholder="e.g., A playlist for a long night drive with chill beats and dreamy vocals"
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            className="min-h-20"
          />
          <p className="text-xs text-muted-foreground mt-1">Try one of these:</p>
          {renderPromptSuggestions()}
        </div>

        <Button
          className="w-full bg-spotify-green hover:bg-spotify-green/90"
          onClick={handleGeneratePlaylist}
          disabled={loading || (sourceType === 'playlist' && !selectedPlaylistId) || !prompt.trim()}
        >
          {loading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Generating Playlist...
            </>
          ) : (
            <>
              <Wand2 className="mr-2 h-4 w-4" />
              Generate Playlist
            </>
          )}
        </Button>
        
        {generatedPlaylist && (
          <div className="mt-4 p-4 bg-muted/30 rounded-lg">
            <h3 className="font-semibold flex items-center">
              <Music className="h-4 w-4 mr-2" />
              {generatedPlaylist.name}
            </h3>
            <p className="text-sm text-muted-foreground mt-1">
              {generatedPlaylist.tracks} tracks based on your prompt
            </p>
            <Button 
              variant="outline" 
              size="sm" 
              className="mt-3 w-full"
              onClick={openPlaylist}
            >
              Open in Spotify
            </Button>
          </div>
        )}
      </div>
    </div>
  );
};

export default PlaylistGenerator;
