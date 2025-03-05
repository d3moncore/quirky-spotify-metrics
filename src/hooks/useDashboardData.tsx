
import React from 'react';
import { useTopItems } from '@/hooks/useSpotify';

interface SpotifyTrack {
  id: string;
  name: string;
  artists: { name: string }[];
  album: {
    name: string;
    images: { url: string }[];
  };
  duration_ms: number;
  popularity?: number;
}

interface SpotifyArtist {
  id: string;
  name: string;
  images: { url: string }[];
  genres: string[];
  popularity: number;
}

export const useGenreData = () => {
  const { items: topArtists, loading } = useTopItems<SpotifyArtist>('artists');
  
  const genreData = React.useMemo(() => {
    if (!topArtists || topArtists.length === 0) return [];
    
    const genreCounts: Record<string, number> = {};
    
    topArtists.forEach(artist => {
      artist.genres.forEach(genre => {
        genreCounts[genre] = (genreCounts[genre] || 0) + 1;
      });
    });
    
    return Object.entries(genreCounts)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 5);
  }, [topArtists]);
  
  return { genreData, loading };
};

export const usePopularityData = () => {
  const { items: topTracks, loading } = useTopItems<SpotifyTrack>('tracks');
  
  const popularityData = React.useMemo(() => {
    if (!topTracks || topTracks.length === 0) return [];
    
    const ranges = [
      { range: '0-20', count: 0 },
      { range: '21-40', count: 0 },
      { range: '41-60', count: 0 },
      { range: '61-80', count: 0 },
      { range: '81-100', count: 0 },
    ];
    
    topTracks.forEach(track => {
      const popularity = track.popularity || 0;
      const index = Math.min(Math.floor(popularity / 20), 4);
      ranges[index].count++;
    });
    
    return ranges;
  }, [topTracks]);
  
  return { popularityData, loading, topTracks };
};
