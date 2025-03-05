
import React from 'react';
import { useNavigate } from 'react-router-dom';
import { BarChart3, Users, Clock, Play } from 'lucide-react';
import { useProfile, useRecentlyPlayed, useSpotifyAuth } from '@/hooks/useSpotify';
import { useGenreData, usePopularityData } from '@/hooks/useDashboardData';
import DataCard from '@/components/DataCard';
import AnimatedBackground from '@/components/AnimatedBackground';
import Navbar from '@/components/Navbar';
import StatItem from '@/components/dashboard/StatItem';
import ActionButton from '@/components/dashboard/ActionButton';
import RecentlyPlayed from '@/components/dashboard/RecentlyPlayed';
import ProfileHeader from '@/components/dashboard/ProfileHeader';
import ActivityChart from '@/components/charts/ActivityChart';
import GenreChart from '@/components/charts/GenreChart';
import ListeningTimeChart from '@/components/charts/ListeningTimeChart';

const Dashboard = () => {
  const navigate = useNavigate();
  const { isAuthenticated } = useSpotifyAuth();
  const { profile, loading: profileLoading } = useProfile();
  const { genreData, loading: genreLoading } = useGenreData();
  const { topTracks, loading: tracksLoading } = usePopularityData();
  const { tracks: recentTracks, loading: recentLoading } = useRecentlyPlayed();
  
  React.useEffect(() => {
    if (!isAuthenticated) {
      navigate('/');
    }
  }, [isAuthenticated, navigate]);
  
  const loading = profileLoading || genreLoading || tracksLoading || recentLoading;
  
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-pulse text-spotify-green font-semibold">Loading your Spotify data...</div>
      </div>
    );
  }
  
  return (
    <div className="min-h-screen pb-16">
      <AnimatedBackground />
      <Navbar />
      
      <div className="pt-24 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
        <ProfileHeader profile={profile} />
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
          <DataCard title="Recent Activity" delay={1}>
            <ActivityChart />
          </DataCard>
          
          <DataCard title="Top Genres" delay={2}>
            <GenreChart genreData={genreData} />
          </DataCard>
          
          <DataCard title="Recently Played" delay={3} className="row-span-2">
            <RecentlyPlayed tracks={recentTracks} />
          </DataCard>
          
          <DataCard title="Listening Time by Day" delay={4}>
            <ListeningTimeChart />
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
                value={topTracks.length}
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

export default Dashboard;
