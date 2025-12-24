'use client'
import React from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from 'recharts';

interface DeviceUsageData {
  name: string;
  value: number;
  color: string;
}

interface DeviceUsageChartProps {
  data: DeviceUsageData[];
}

const DeviceUsageChart: React.FC<DeviceUsageChartProps> = ({ data }) => {
  return (
    <div className="w-full">
      <ResponsiveContainer width="100%" height={300}>
        <PieChart>
          <Pie
            data={data}
            cx="50%"
            cy="50%"
            labelLine={false}
            label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
            outerRadius={80}
            fill="#8884d8"
            dataKey="value"
          >
            {data.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={entry.color} />
            ))}
          </Pie>
          <Tooltip
            contentStyle={{
              backgroundColor: 'white',
              border: '1px solid #e5e7eb',
              borderRadius: '8px',
            }}
          />
          <Legend
            verticalAlign="bottom"
            height={36}
            formatter={(value) => value}
          />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
};

export default DeviceUsageChart;
