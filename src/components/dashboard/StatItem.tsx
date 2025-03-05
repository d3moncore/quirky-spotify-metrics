
import React from 'react';

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

export default StatItem;
