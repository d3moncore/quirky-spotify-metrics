
import React from "react";
import SpotifyLogin from "@/components/SpotifyLogin";
import AnimatedBackground from "@/components/AnimatedBackground";
import { useAuth } from "@/contexts/AuthContext";
import PlaylistGenerator from "@/components/PlaylistGenerator";

const Index = () => {
  const { login, isAuthenticated } = useAuth();

  return (
    <div className="min-h-screen flex flex-col items-center justify-center py-12 px-4 sm:px-6 lg:px-8 relative">
      <AnimatedBackground />

      <div className="w-full max-w-5xl mx-auto">
        {isAuthenticated ? (
          <div className="flex flex-col items-center mt-8">
            <h1 className="text-4xl md:text-5xl font-bold mb-6 text-spotify-gradient animate-in stagger-1">
              AI Playlist Generator
            </h1>
            <p className="text-lg md:text-xl text-muted-foreground max-w-2xl mb-8 animate-in stagger-2 text-center">
              Use natural language to create the perfect playlist from your existing Spotify library
            </p>
            <PlaylistGenerator />
          </div>
        ) : (
          <SpotifyLogin onLogin={login} />
        )}

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-16 opacity-0 animate-in stagger-4">
          <FeatureCard
            icon="🧠"
            title="Local AI Powered"
            description="Uses your local DeepSeek R1 model running on LM Studio to intelligently select songs"
          />
          <FeatureCard
            icon="📝"
            title="Natural Language"
            description="Describe your mood or scenario, and get a perfectly curated playlist"
          />
          <FeatureCard
            icon="🔒"
            title="Private & Secure"
            description="All AI processing happens locally on your machine - no data sent to external services"
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
