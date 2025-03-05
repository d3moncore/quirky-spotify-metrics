
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { BarChart3, Users, Clock, Play, ExternalLink } from 'lucide-react';
import { 
  useProfile, 
  useTopItems, 
  useRecentlyPlayed,
  useSpotifyAuth 
} from '@/hooks/useSpotify';
import { Button } from '@/components/ui/button';
import DataCard from '@/components/DataCard';
import AnimatedBackground from '@/components/AnimatedBackground';
import Navbar from '@/components/Navbar';
import { 
  Area, 
  AreaChart, 
  XAxis, 
  YAxis, 
  Tooltip, 
  ResponsiveContainer,
  BarChart,
  Bar,
  Cell,
  PieChart,
  Pie,
} from 'recharts';

// Interface for Spotify response items
interface SpotifyTrack {
  id: string;
  name: string;
  artists: { name: string }[];
  album: {
    name: string;
    images: { url: string }[];
  };
  duration_ms: number;
}

interface SpotifyArtist {
  id: string;
  name: string;
  images: { url: string }[];
  genres: string[];
  popularity: number;
}

const Dashboard = () => {
  const navigate = useNavigate();
  const { isAuthenticated, logout } = useSpotifyAuth();
  const { profile, loading: profileLoading } = useProfile();
  const { items: topTracks, loading: tracksLoading } = useTopItems<SpotifyTrack>('tracks');
  const { items: topArtists, loading: artistsLoading } = useTopItems<SpotifyArtist>('artists');
  const { tracks: recentTracks, loading: recentLoading } = useRecentlyPlayed();
  
  React.useEffect(() => {
    if (!isAuthenticated) {
      navigate('/');
    }
  }, [isAuthenticated, navigate]);
  
  const loading = profileLoading || tracksLoading || artistsLoading || recentLoading;
  
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-pulse text-spotify-green font-semibold">Loading your Spotify data...</div>
      </div>
    );
  }
  
  // Data for the genre chart
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
  
  // Data for popularity distribution
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
  
  // Custom colors for charts
  const COLORS = ['#1DB954', '#4CAF50', '#8BC34A', '#CDDC39', '#FFEB3B'];
  
  return (
    <div className="min-h-screen pb-16">
      <AnimatedBackground />
      <Navbar />
      
      <div className="pt-24 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
        {profile && (
          <header className="mb-12 animate-in">
            <div className="flex items-center space-x-4">
              {profile.images && profile.images[0] && (
                <img 
                  src={profile.images[0].url} 
                  alt={profile.display_name} 
                  className="w-16 h-16 rounded-full border-2 border-spotify-green shadow-md"
                />
              )}
              <div>
                <h1 className="text-3xl font-bold text-spotify-gradient">
                  Hello, {profile.display_name}
                </h1>
                <p className="text-muted-foreground">
                  Here's an overview of your Spotify listening habits
                </p>
              </div>
            </div>
          </header>
        )}
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
          <DataCard title="Recent Activity" delay={1}>
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart
                  data={[
                    { name: 'Mon', listens: 45 },
                    { name: 'Tue', listens: 52 },
                    { name: 'Wed', listens: 38 },
                    { name: 'Thu', listens: 63 },
                    { name: 'Fri', listens: 72 },
                    { name: 'Sat', listens: 58 },
                    { name: 'Sun', listens: 30 },
                  ]}
                  margin={{ top: 10, right: 30, left: 0, bottom: 0 }}
                >
                  <defs>
                    <linearGradient id="colorListens" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#1DB954" stopOpacity={0.8}/>
                      <stop offset="95%" stopColor="#1DB954" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <XAxis dataKey="name" />
                  <YAxis />
                  <Tooltip 
                    contentStyle={{ 
                      background: 'rgba(23, 23, 23, 0.8)', 
                      border: 'none',
                      borderRadius: '8px',
                      padding: '10px'
                    }} 
                  />
                  <Area 
                    type="monotone" 
                    dataKey="listens" 
                    stroke="#1DB954" 
                    fillOpacity={1} 
                    fill="url(#colorListens)" 
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </DataCard>
          
          <DataCard title="Top Genres" delay={2}>
            <div className="h-[300px] flex items-center justify-center">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={genreData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={80}
                    paddingAngle={5}
                    dataKey="value"
                    label={({ name }) => name}
                  >
                    {genreData.map((_, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip 
                    contentStyle={{ 
                      background: 'rgba(23, 23, 23, 0.8)', 
                      border: 'none',
                      borderRadius: '8px',
                      padding: '10px'
                    }} 
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </DataCard>
          
          <DataCard title="Recently Played" delay={3} className="row-span-2">
            <div className="space-y-4 max-h-[650px] overflow-y-auto pr-2">
              {recentTracks && recentTracks.slice(0, 10).map((item: any, i: number) => (
                <div key={item.track.id + i} className="flex items-center space-x-3 hover-scale">
                  <div className="flex-shrink-0">
                    <img 
                      src={item.track.album.images[0].url} 
                      alt={item.track.name} 
                      className="w-12 h-12 rounded-md"
                    />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium truncate">{item.track.name}</p>
                    <p className="text-xs text-muted-foreground truncate">
                      {item.track.artists.map((a: any) => a.name).join(', ')}
                    </p>
                  </div>
                  <div className="flex-shrink-0">
                    <Play className="h-4 w-4 text-muted-foreground" />
                  </div>
                </div>
              ))}
            </div>
          </DataCard>
          
          <DataCard title="Listening Time by Day" delay={4}>
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={[
                    { day: 'Mon', hours: 2.5 },
                    { day: 'Tue', hours: 1.8 },
                    { day: 'Wed', hours: 3.2 },
                    { day: 'Thu', hours: 2.1 },
                    { day: 'Fri', hours: 4.3 },
                    { day: 'Sat', hours: 3.7 },
                    { day: 'Sun', hours: 2.9 },
                  ]}
                  margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
                >
                  <XAxis dataKey="day" />
                  <YAxis />
                  <Tooltip 
                    contentStyle={{ 
                      background: 'rgba(23, 23, 23, 0.8)', 
                      border: 'none',
                      borderRadius: '8px',
                      padding: '10px'
                    }} 
                  />
                  <Bar dataKey="hours" fill="#1DB954" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </DataCard>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <DataCard title="Quick Stats" delay={5}>
            <div className="grid grid-cols-2 gap-4">
              <StatItem 
                icon={<Play className="h-5 w-5 text-spotify-green" />}
                label="Tracks in Library"
                value={profile?.total_tracks || "N/A"}
              />
              <StatItem 
                icon={<Users className="h-5 w-5 text-spotify-green" />}
                label="Following"
                value={profile?.total_following || "N/A"}
              />
              <StatItem 
                icon={<Clock className="h-5 w-5 text-spotify-green" />}
                label="Avg. Listen Time"
                value="2.4 hrs/day"
              />
              <StatItem 
                icon={<BarChart3 className="h-5 w-5 text-spotify-green" />}
                label="Unique Artists"
                value={topArtists.length}
              />
            </div>
          </DataCard>
          
          <DataCard title="Dive Deeper" delay={6}>
            <div className="grid grid-cols-2 gap-4">
              <ActionButton 
                label="Top Tracks"
                onClick={() => navigate('/top-tracks')}
              />
              <ActionButton 
                label="Top Artists"
                onClick={() => navigate('/top-artists')}
              />
              <ActionButton 
                label="Your Profile"
                onClick={() => navigate('/profile')}
              />
              <ActionButton 
                label="Open in Spotify"
                onClick={() => window.open('https://open.spotify.com', '_blank')}
                external
              />
            </div>
          </DataCard>
        </div>
      </div>
    </div>
  );
};

interface StatItemProps {
  icon: React.ReactNode;
  label: string;
  value: string | number;
}

const StatItem: React.FC<StatItemProps> = ({ icon, label, value }) => {
  return (
    <div className="bg-secondary/50 rounded-lg p-4 hover-scale">
      <div className="flex items-center space-x-3 mb-2">
        {icon}
        <span className="text-sm font-medium">{label}</span>
      </div>
      <div className="text-2xl font-bold">{value}</div>
    </div>
  );
};

interface ActionButtonProps {
  label: string;
  onClick: () => void;
  external?: boolean;
}

const ActionButton: React.FC<ActionButtonProps> = ({ label, onClick, external }) => {
  return (
    <Button
      onClick={onClick}
      variant="outline"
      className="w-full h-full min-h-[80px] flex flex-col items-center justify-center gap-2 hover:bg-secondary/70 hover-scale"
    >
      <span className="text-sm font-medium">{label}</span>
      {external ? (
        <ExternalLink className="h-4 w-4 text-muted-foreground" />
      ) : null}
    </Button>
  );
};

export default Dashboard;
