
import React from 'react';

const AnimatedBackground: React.FC = () => {
  return (
    <div className="fixed inset-0 -z-10 overflow-hidden">
      <div className="absolute top-0 left-0 w-full h-full opacity-40">
        <div className="absolute top-0 left-[10%] w-[500px] h-[500px] rounded-full bg-gradient-to-b from-spotify-green/20 to-transparent blur-[120px] animate-float" style={{ animationDelay: '0s' }}></div>
        <div className="absolute top-[10%] right-[15%] w-[400px] h-[400px] rounded-full bg-gradient-to-b from-blue-400/20 to-transparent blur-[100px] animate-float" style={{ animationDelay: '2s' }}></div>
        <div className="absolute bottom-[5%] left-[20%] w-[600px] h-[600px] rounded-full bg-gradient-to-b from-purple-400/10 to-transparent blur-[130px] animate-float" style={{ animationDelay: '4s' }}></div>
      </div>
    </div>
  );
};

export default AnimatedBackground;
