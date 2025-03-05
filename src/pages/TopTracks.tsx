import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Play, Clock, ExternalLink } from "lucide-react";
import { useTopItems, useSpotifyAuth } from "@/hooks/useSpotify";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import DataCard from "@/components/DataCard";
import AnimatedBackground from "@/components/AnimatedBackground";
import Navbar from "@/components/Navbar";

interface SpotifyTrack {
  id: string;
  name: string;
  artists: { name: string }[];
  album: {
    name: string;
    images: { url: string }[];
  };
  duration_ms: number;
  external_urls: {
    spotify: string;
  };
  popularity: number;
}

const TopTracks = () => {
  const navigate = useNavigate();
  const { isAuthenticated } = useSpotifyAuth();
  const [timeRange, setTimeRange] = useState<string>("medium_term");

  const { items: tracks, loading } = useTopItems<SpotifyTrack>(
    "tracks",
    timeRange
  );

  // React.useEffect(() => {
  //   if (!isAuthenticated) {
  //     navigate('/');
  //   }
  // }, [isAuthenticated, navigate]);

  const formatDuration = (ms: number) => {
    const minutes = Math.floor(ms / 60000);
    const seconds = Math.floor((ms % 60000) / 1000);
    return `${minutes}:${seconds.toString().padStart(2, "0")}`;
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-pulse text-spotify-green font-semibold">
          Loading your top tracks...
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen pb-16">
      <AnimatedBackground />
      <Navbar />

      <div className="pt-24 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
        <header className="mb-12 animate-in">
          <h1 className="text-3xl font-bold text-spotify-gradient mb-2">
            Your Top Tracks
          </h1>
          <p className="text-muted-foreground">
            Discover your most played songs on Spotify
          </p>
        </header>

        <Tabs
          defaultValue="medium_term"
          className="animate-in stagger-1"
          onValueChange={setTimeRange}
        >
          <TabsList className="mb-8">
            <TabsTrigger value="short_term">Last 4 Weeks</TabsTrigger>
            <TabsTrigger value="medium_term">Last 6 Months</TabsTrigger>
            <TabsTrigger value="long_term">All Time</TabsTrigger>
          </TabsList>

          <TabsContent value="short_term" className="space-y-0">
            <TrackList tracks={tracks} />
          </TabsContent>

          <TabsContent value="medium_term" className="space-y-0">
            <TrackList tracks={tracks} />
          </TabsContent>

          <TabsContent value="long_term" className="space-y-0">
            <TrackList tracks={tracks} />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

interface TrackListProps {
  tracks: SpotifyTrack[];
}

const TrackList: React.FC<TrackListProps> = ({ tracks }) => {
  const formatDuration = (ms: number) => {
    const minutes = Math.floor(ms / 60000);
    const seconds = Math.floor((ms % 60000) / 1000);
    return `${minutes}:${seconds.toString().padStart(2, "0")}`;
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {tracks &&
        tracks.map((track, index) => (
          <DataCard
            key={track.id}
            title={`#${index + 1}`}
            delay={Math.min(Math.floor(index / 3) + 1, 4)}
            className="hover-scale"
          >
            <div className="flex flex-col h-full">
              <div className="flex items-center space-x-4 mb-4">
                <img
                  src={track.album.images[0].url}
                  alt={track.name}
                  className="w-16 h-16 rounded-md shadow-md"
                />
                <div className="min-w-0">
                  <h3 className="font-semibold truncate">{track.name}</h3>
                  <p className="text-sm text-muted-foreground truncate">
                    {track.artists.map((a) => a.name).join(", ")}
                  </p>
                </div>
              </div>

              <div className="flex items-center justify-between text-sm text-muted-foreground mt-auto">
                <div className="flex items-center space-x-1">
                  <Clock className="h-3 w-3" />
                  <span>{formatDuration(track.duration_ms)}</span>
                </div>

                <a
                  href={track.external_urls.spotify}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center space-x-1 text-spotify-green hover:underline"
                >
                  <span>Play</span>
                  <ExternalLink className="h-3 w-3" />
                </a>
              </div>
            </div>
          </DataCard>
        ))}
    </div>
  );
};

export default TopTracks;
