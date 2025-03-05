
import React from 'react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';

const timeData = [
  { day: 'Mon', hours: 2.5 },
  { day: 'Tue', hours: 1.8 },
  { day: 'Wed', hours: 3.2 },
  { day: 'Thu', hours: 2.1 },
  { day: 'Fri', hours: 4.3 },
  { day: 'Sat', hours: 3.7 },
  { day: 'Sun', hours: 2.9 },
];

const ListeningTimeChart: React.FC = () => {
  return (
    <div className="h-[300px]">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart
          data={timeData}
          margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
        >
          <XAxis dataKey="day" />
          <YAxis />
          <Tooltip 
            contentStyle={{ 
              background: 'rgba(23, 23, 23, 0.8)', 
              border: 'none',
              borderRadius: '8px',
              padding: '10px'
            }} 
          />
          <Bar dataKey="hours" fill="#1DB954" radius={[4, 4, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
};

export default ListeningTimeChart;
