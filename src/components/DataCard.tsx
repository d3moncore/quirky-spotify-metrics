
import React, { ReactNode } from 'react';
import { cn } from '@/lib/utils';

interface DataCardProps {
  title: string;
  children: ReactNode;
  className?: string;
  animate?: boolean;
  delay?: number;
}

const DataCard: React.FC<DataCardProps> = ({ 
  title, 
  children, 
  className,
  animate = true,
  delay = 0
}) => {
  const animationClasses = animate 
    ? `opacity-0 animate-in stagger-${delay}` 
    : '';

  return (
    <div 
      className={cn(
        "rounded-xl border bg-card p-6 shadow-sm hover-scale", 
        animationClasses,
        className
      )}
    >
      <div className="flex flex-col space-y-4">
        <h3 className="text-lg font-medium text-spotify-gradient">{title}</h3>
        <div className="flex-1">
          {children}
        </div>
      </div>
    </div>
  );
};

export default DataCard;
