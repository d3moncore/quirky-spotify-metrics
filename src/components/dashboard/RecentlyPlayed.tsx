
import React from 'react';
import { Play } from 'lucide-react';

interface TrackItem {
  track: {
    id: string;
    name: string;
    artists: { name: string }[];
    album: {
      name: string;
      images: { url: string }[];
    };
  };
}

interface RecentlyPlayedProps {
  tracks: TrackItem[];
}

const RecentlyPlayed: React.FC<RecentlyPlayedProps> = ({ tracks }) => {
  return (
    <div className="space-y-4 max-h-[650px] overflow-y-auto pr-2">
      {tracks && tracks.slice(0, 10).map((item, i) => (
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
              {item.track.artists.map((a) => a.name).join(', ')}
            </p>
          </div>
          <div className="flex-shrink-0">
            <Play className="h-4 w-4 text-muted-foreground" />
          </div>
        </div>
      ))}
    </div>
  );
};

export default RecentlyPlayed;
