
import React, { useState } from 'react';
import { useSpotifyAuth } from '@/hooks/useSpotify';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Slider } from '@/components/ui/slider';
import { useToast } from '@/hooks/use-toast';
import * as SpotifyService from '@/services/spotify';
import { Loader2, RefreshCw } from 'lucide-react';

const PlaylistClustering = () => {
  const { isAuthenticated } = useSpotifyAuth();
  const { toast } = useToast();
  const [sourceType, setSourceType] = useState<'liked' | 'playlist'>('liked');
  const [playlists, setPlaylists] = useState<any[]>([]);
  const [selectedPlaylistId, setSelectedPlaylistId] = useState<string>('');
  const [numberOfClusters, setNumberOfClusters] = useState<number>(3);
  const [clusteringMethod, setClusteringMethod] = useState<string>('kmeans');
  const [loading, setLoading] = useState<boolean>(false);
  const [loadingPlaylists, setLoadingPlaylists] = useState<boolean>(false);
  const [fetchError, setFetchError] = useState<string | null>(null);

  // Fetch user playlists when component mounts
  React.useEffect(() => {
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

  const handleCreateClusters = async () => {
    try {
      setLoading(true);
      
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

      const result = await SpotifyService.createClusteredPlaylists(
        sourceId,
        numberOfClusters,
        clusteringMethod
      );

      toast({
        title: 'Success',
        description: `Created ${result.clusters.length} playlists based on your ${sourceType === 'liked' ? 'liked songs' : 'selected playlist'}.`,
      });
    } catch (error) {
      console.error('Error creating clusters:', error);
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to create clustered playlists. Please try again later.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full max-w-md mx-auto p-6 space-y-6 glass-card rounded-2xl">
      <h2 className="text-2xl font-bold text-center text-spotify-gradient">Create Smart Playlists</h2>
      <p className="text-center text-muted-foreground">
        Use AI to organize your songs into themed playlists
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
          <label className="block text-sm font-medium mb-2">
            Number of Playlists: {numberOfClusters}
          </label>
          <Slider
            value={[numberOfClusters]}
            min={2}
            max={10}
            step={1}
            onValueChange={(values) => setNumberOfClusters(values[0])}
            className="my-4"
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-2">Clustering Method</label>
          <Select
            value={clusteringMethod}
            onValueChange={setClusteringMethod}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select Method" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="kmeans">K-Means (by audio features)</SelectItem>
              <SelectItem value="genre">Genre Based</SelectItem>
              <SelectItem value="artist">By Artist</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <Button
          className="w-full bg-spotify-green hover:bg-spotify-green/90"
          onClick={handleCreateClusters}
          disabled={loading || (sourceType === 'playlist' && !selectedPlaylistId)}
        >
          {loading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Creating Playlists...
            </>
          ) : (
            'Create Smart Playlists'
          )}
        </Button>
      </div>
    </div>
  );
};

export default PlaylistClustering;
