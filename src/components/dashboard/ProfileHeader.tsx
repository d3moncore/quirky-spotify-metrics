
import React from 'react';

interface ProfileHeaderProps {
  profile: {
    display_name: string;
    images?: { url: string }[];
  } | null;
}

const ProfileHeader: React.FC<ProfileHeaderProps> = ({ profile }) => {
  if (!profile) return null;
  
  return (
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
  );
};

export default ProfileHeader;
