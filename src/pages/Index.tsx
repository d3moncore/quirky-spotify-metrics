import React from "react";
import { useNavigate } from "react-router-dom";
import SpotifyLogin from "@/components/SpotifyLogin";
import AnimatedBackground from "@/components/AnimatedBackground";
import { useSpotifyAuth } from "@/hooks/useSpotify";

const Index = () => {
  const { login, isAuthenticated } = useSpotifyAuth();
  const navigate = useNavigate();

  // React.useEffect(() => {
  //   if (isAuthenticated) {
  //     navigate('/dashboard');
  //   }
  // }, [isAuthenticated, navigate]);

  return (
    <div className="min-h-screen flex flex-col items-center justify-center py-12 px-4 sm:px-6 lg:px-8 relative">
      <AnimatedBackground />

      <div className="w-full max-w-5xl mx-auto">
        <SpotifyLogin onLogin={login} />

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-16 opacity-0 animate-in stagger-4">
          <FeatureCard
            icon="📊"
            title="Visual Analytics"
            description="See your listening history visualized with beautiful, interactive charts."
          />
          <FeatureCard
            icon="🎵"
            title="Top Tracks"
            description="Discover your most played songs over different time periods."
          />
          <FeatureCard
            icon="🎤"
            title="Artist Insights"
            description="Explore your favorite artists and their influence on your music taste."
          />
        </div>
      </div>
    </div>
  );
};

interface FeatureCardProps {
  icon: string;
  title: string;
  description: string;
}

const FeatureCard: React.FC<FeatureCardProps> = ({
  icon,
  title,
  description,
}) => {
  return (
    <div className="glass-card rounded-2xl p-6 hover-scale">
      <div className="text-3xl mb-4">{icon}</div>
      <h3 className="text-xl font-semibold mb-2">{title}</h3>
      <p className="text-muted-foreground">{description}</p>
    </div>
  );
};

export default Index;
