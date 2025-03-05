
import React from 'react';
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from 'recharts';

interface GenreChartProps {
  genreData: Array<{ name: string; value: number }>;
}

const COLORS = ['#1DB954', '#4CAF50', '#8BC34A', '#CDDC39', '#FFEB3B'];

const GenreChart: React.FC<GenreChartProps> = ({ genreData }) => {
  return (
    <div className="h-[300px] flex items-center justify-center">
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie
            data={genreData}
            cx="50%"
            cy="50%"
            innerRadius={60}
            outerRadius={80}
            paddingAngle={5}
            dataKey="value"
            label={({ name }) => name}
          >
            {genreData.map((_, index) => (
              <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
            ))}
          </Pie>
          <Tooltip 
            contentStyle={{ 
              background: 'rgba(23, 23, 23, 0.8)', 
              border: 'none',
              borderRadius: '8px',
              padding: '10px'
            }} 
          />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
};

export default GenreChart;
