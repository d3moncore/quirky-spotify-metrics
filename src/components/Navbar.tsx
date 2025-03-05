
import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Music, BarChart2, Users, Clock, User } from 'lucide-react';

const Navbar: React.FC = () => {
  const location = useLocation();
  const isActive = (path: string) => location.pathname === path;

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-background/70 backdrop-blur-xl border-b border-border py-4 px-6">
      <div className="max-w-7xl mx-auto flex items-center justify-between">
        <Link to="/" className="flex items-center space-x-2">
          <Music className="h-8 w-8 text-spotify-green animate-pulse-subtle" />
          <span className="text-2xl font-bold tracking-tight text-spotify-gradient">SpotInsights</span>
        </Link>
        
        <div className="hidden md:flex items-center space-x-6">
          <NavLink to="/dashboard" isActive={isActive('/dashboard')}>
            <BarChart2 className="h-4 w-4 mr-2" />
            Dashboard
          </NavLink>
          <NavLink to="/top-tracks" isActive={isActive('/top-tracks')}>
            <Music className="h-4 w-4 mr-2" />
            Top Tracks
          </NavLink>
          <NavLink to="/top-artists" isActive={isActive('/top-artists')}>
            <Users className="h-4 w-4 mr-2" />
            Top Artists
          </NavLink>
          <NavLink to="/profile" isActive={isActive('/profile')}>
            <User className="h-4 w-4 mr-2" />
            Profile
          </NavLink>
        </div>
      </div>
    </nav>
  );
};

interface NavLinkProps {
  to: string;
  children: React.ReactNode;
  isActive: boolean;
}

const NavLink: React.FC<NavLinkProps> = ({ to, children, isActive }) => {
  return (
    <Link
      to={to}
      className={`flex items-center px-3 py-2 rounded-full text-sm font-medium transition-all duration-300 ${
        isActive
          ? 'bg-spotify-green/10 text-spotify-green'
          : 'text-foreground/70 hover:text-foreground hover:bg-secondary'
      }`}
    >
      {children}
    </Link>
  );
};

export default Navbar;
