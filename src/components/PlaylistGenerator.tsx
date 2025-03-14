import React, { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import * as SpotifyService from "@/services/spotify";
import { Loader2, RefreshCw, Music, Wand2 } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  generatePlaylistFromPrompt,
  getUserPlaylists,
} from "@/services/spotify";

const PlaylistGenerator = () => {
  const { isAuthenticated } = useAuth();
  const { toast } = useToast();
  const [sourceType, setSourceType] = useState<"liked" | "playlist">("liked");
  const [playlists, setPlaylists] = useState<any[]>([]);
  const [selectedPlaylistId, setSelectedPlaylistId] = useState<string>("");
  const [prompt, setPrompt] = useState<string>("");
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
      console.log("Fetching user playlists...");
      const data = await SpotifyService.getUserPlaylists();
      console.log("Playlists fetched:", data);

      if (data && data.items) {
        setPlaylists(data.items);
      } else {
        console.error("Unexpected playlist data format:", data);
        setPlaylists([]);
        setFetchError("Received invalid playlist data format from the server");
      }
    } catch (error) {
      console.error("Error fetching playlists:", error);
      setFetchError(
        error instanceof Error
          ? error.message
          : "Failed to fetch your playlists"
      );

      toast({
        title: "Error",
        description:
          error instanceof Error
            ? error.message
            : "Failed to fetch your playlists. Please try again later.",
        variant: "destructive",
      });

      setPlaylists([]);
    } finally {
      setLoadingPlaylists(false);
    }
  };

  // Update the handleGeneratePlaylist function
  const handleGeneratePlaylist = async () => {
    try {
      setLoading(true);

      // Show AI curation status
      toast({
        title: "🎧 Analyzing your musical taste",
        description:
          "Using Spotify's recommendation engine to curate tracks based on your prompt...",
      });

      const result = await generatePlaylistFromPrompt(
        sourceType === "liked" ? "liked_songs" : selectedPlaylistId,
        prompt
      );

      setGeneratedPlaylist(result);

      toast({
        title: "🎶 Playlist Created!",
        description: (
          <div className="space-y-2">
            <h4 className="font-medium">{result.name}</h4>
            <p className="text-sm text-muted-foreground">
              {result.description}
            </p>
            <p className="text-xs text-green-500">
              {result.tracks} tracks curated using Spotify's recommendation
              engine
            </p>
          </div>
        ),
      });

      // Refresh playlists list
      setPlaylists(await getUserPlaylists());
    } catch (error) {
      toast({
        title: "Curation Failed",
        description:
          error instanceof Error ? error.message : "Could not create playlist",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  // Update prompt suggestions to emphasize taste
  const renderPromptSuggestions = () => {
    const suggestions = [
      "Songs that blend indie folk with electronic elements",
      "Late night jazz with modern hip-hop influences",
      "Upbeat tracks that transition smoothly between genres",
      "Music that combines 80s nostalgia with contemporary production",
      "Soulful vocals paired with experimental beats",
    ];

    return (
      <div className="mt-4 grid grid-cols-1 gap-2">
        {suggestions.map((suggestion) => (
          <Button
            key={suggestion}
            variant="outline"
            className="text-left h-auto py-2"
            onClick={() => setPrompt(suggestion)}
          >
            <span className="text-sm">✨ {suggestion}</span>
          </Button>
        ))}
      </div>
    );
  };

  const openPlaylist = () => {
    if (generatedPlaylist && generatedPlaylist.id) {
      window.open(
        `https://open.spotify.com/playlist/${generatedPlaylist.id}`,
        "_blank"
      );
    }
  };

  return (
    <div className="w-full max-w-md mx-auto p-6 space-y-6 glass-card rounded-2xl">
      <h2 className="text-2xl font-bold text-center text-spotify-gradient">
        AI Playlist Generator
      </h2>
      <p className="text-center text-muted-foreground">
        Describe the perfect playlist and let Spotify's recommendation engine
        create it for you
      </p>

      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium mb-2">Source</label>
          <Select
            value={sourceType}
            onValueChange={(value) =>
              setSourceType(value as "liked" | "playlist")
            }
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

        {sourceType === "playlist" && (
          <div>
            <label className="block text-sm font-medium mb-2">
              Select Playlist
            </label>
            {loadingPlaylists ? (
              <div className="flex justify-center py-4">
                <Loader2 className="h-5 w-5 animate-spin text-spotify-green" />
              </div>
            ) : fetchError ? (
              <div className="space-y-2">
                <div className="text-destructive text-sm py-2">
                  {fetchError}
                </div>
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
          <label className="block text-sm font-medium mb-2">
            Describe Your Playlist
          </label>
          <Textarea
            placeholder="e.g., A playlist for a long night drive with chill beats and dreamy vocals"
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            className="min-h-20"
          />
          <p className="text-xs text-muted-foreground mt-1">
            Try one of these suggestions:
          </p>
          {renderPromptSuggestions()}
        </div>

        <Button
          className="w-full bg-spotify-green hover:bg-spotify-green/90"
          onClick={handleGeneratePlaylist}
          disabled={
            loading ||
            (sourceType === "playlist" && !selectedPlaylistId) ||
            !prompt.trim()
          }
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
