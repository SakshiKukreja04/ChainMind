import { RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar, ResponsiveContainer, Legend, Tooltip } from 'recharts';
import { vendorComparisonData } from '@/data/mockData';

export function VendorComparisonChart() {
  const formattedData = [
    { metric: 'Reliability', ...vendorComparisonData.reduce((acc, v) => ({ ...acc, [v.name]: v.reliability }), {}) },
    { metric: 'Lead Time (inv)', ...vendorComparisonData.reduce((acc, v) => ({ ...acc, [v.name]: 100 - v.leadTime * 10 }), {}) },
    { metric: 'Pricing', ...vendorComparisonData.reduce((acc, v) => ({ ...acc, [v.name]: v.pricing }), {}) },
  ];

  return (
    <div className="chart-container">
      <h3 className="text-lg font-semibold text-foreground mb-4">Vendor Comparison</h3>
      <div className="h-72">
        <ResponsiveContainer width="100%" height="100%">
          <RadarChart data={formattedData}>
            <PolarGrid stroke="hsl(var(--border))" />
            <PolarAngleAxis 
              dataKey="metric" 
              tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }}
            />
            <PolarRadiusAxis 
              angle={30} 
              domain={[0, 100]}
              tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 10 }}
            />
            <Radar 
              name="MediSupply Co" 
              dataKey="MediSupply Co" 
              stroke="hsl(224 76% 33%)" 
              fill="hsl(224 76% 33%)" 
              fillOpacity={0.3}
            />
            <Radar 
              name="PharmaDirect" 
              dataKey="PharmaDirect" 
              stroke="hsl(170 82% 32%)" 
              fill="hsl(170 82% 32%)" 
              fillOpacity={0.3}
            />
            <Radar 
              name="HealthPlus Dist" 
              dataKey="HealthPlus Dist" 
              stroke="hsl(38 92% 50%)" 
              fill="hsl(38 92% 50%)" 
              fillOpacity={0.3}
            />
            <Legend />
            <Tooltip 
              contentStyle={{ 
                backgroundColor: 'hsl(var(--card))',
                border: '1px solid hsl(var(--border))',
                borderRadius: '8px',
                boxShadow: 'var(--shadow-md)'
              }}
            />
          </RadarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
