import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ExternalLink, Music } from "lucide-react";
import { useTopItems, useSpotifyAuth } from "@/hooks/useSpotify";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import DataCard from "@/components/DataCard";
import AnimatedBackground from "@/components/AnimatedBackground";
import Navbar from "@/components/Navbar";

interface SpotifyArtist {
  id: string;
  name: string;
  images: { url: string }[];
  genres: string[];
  popularity: number;
  external_urls: {
    spotify: string;
  };
  followers: {
    total: number;
  };
}

const TopArtists = () => {
  const navigate = useNavigate();
  const { isAuthenticated } = useSpotifyAuth();
  const [timeRange, setTimeRange] = useState<string>("medium_term");

  const { items: artists, loading } = useTopItems<SpotifyArtist>(
    "artists",
    timeRange
  );

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-pulse text-spotify-green font-semibold">
          Loading your top artists...
        </div>
      </div>
    );
  }

  const formatNumber = (num: number) => {
    if (num >= 1000000) {
      return (num / 1000000).toFixed(1) + "M";
    }
    if (num >= 1000) {
      return (num / 1000).toFixed(1) + "K";
    }
    return num.toString();
  };

  return (
    <div className="min-h-screen pb-16">
      <AnimatedBackground />
      <Navbar />

      <div className="pt-24 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
        <header className="mb-12 animate-in">
          <h1 className="text-3xl font-bold text-spotify-gradient mb-2">
            Your Top Artists
          </h1>
          <p className="text-muted-foreground">
            The artists that define your musical taste
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
            <ArtistGrid artists={artists} formatNumber={formatNumber} />
          </TabsContent>

          <TabsContent value="medium_term" className="space-y-0">
            <ArtistGrid artists={artists} formatNumber={formatNumber} />
          </TabsContent>

          <TabsContent value="long_term" className="space-y-0">
            <ArtistGrid artists={artists} formatNumber={formatNumber} />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

interface ArtistGridProps {
  artists: SpotifyArtist[];
  formatNumber: (num: number) => string;
}

const ArtistGrid: React.FC<ArtistGridProps> = ({ artists, formatNumber }) => {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {artists &&
        artists.map((artist, index) => (
          <DataCard
            key={artist.id}
            title={`#${index + 1}`}
            delay={Math.min(Math.floor(index / 3) + 1, 4)}
            className="hover-scale"
          >
            <div className="flex flex-col h-full">
              <div className="flex flex-col items-center text-center mb-4">
                <img
                  src={artist.images[0]?.url || "/placeholder.svg"}
                  alt={artist.name}
                  className="w-24 h-24 rounded-full mb-4 shadow-md object-cover"
                />
                <h3 className="font-semibold text-lg">{artist.name}</h3>
              </div>

              <div className="flex justify-between text-sm text-muted-foreground mb-4">
                <div>
                  <div className="font-medium text-foreground mb-1">
                    Followers
                  </div>
                  <div>{formatNumber(artist.followers?.total || 0)}</div>
                </div>
                <div>
                  <div className="font-medium text-foreground mb-1">
                    Popularity
                  </div>
                  <div>{artist.popularity}%</div>
                </div>
              </div>

              <div className="mt-auto">
                <div className="text-sm font-medium text-foreground mb-2">
                  Top Genres
                </div>
                <div className="flex flex-wrap gap-2">
                  {artist.genres.slice(0, 3).map((genre) => (
                    <span
                      key={genre}
                      className="px-2 py-1 rounded-full bg-spotify-green/10 text-spotify-green text-xs"
                    >
                      {genre}
                    </span>
                  ))}
                </div>

                <a
                  href={artist.external_urls.spotify}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-4 flex items-center justify-center space-x-1 text-spotify-green hover:underline"
                >
                  <Music className="h-3 w-3" />
                  <span>Open in Spotify</span>
                  <ExternalLink className="h-3 w-3" />
                </a>
              </div>
            </div>
          </DataCard>
        ))}
    </div>
  );
};

export default TopArtists;
