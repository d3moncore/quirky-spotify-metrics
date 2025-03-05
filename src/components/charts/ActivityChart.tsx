
import React from 'react';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';

const activityData = [
  { name: 'Mon', listens: 45 },
  { name: 'Tue', listens: 52 },
  { name: 'Wed', listens: 38 },
  { name: 'Thu', listens: 63 },
  { name: 'Fri', listens: 72 },
  { name: 'Sat', listens: 58 },
  { name: 'Sun', listens: 30 },
];

const ActivityChart: React.FC = () => {
  return (
    <div className="h-[300px]">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart
          data={activityData}
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
  );
};

export default ActivityChart;
