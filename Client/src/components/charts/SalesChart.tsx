import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { salesData } from '@/data/mockData';

export function SalesChart() {
  return (
    <div className="chart-container">
      <h3 className="text-lg font-semibold text-foreground mb-4">Sales Trend vs Forecast</h3>
      <div className="h-72">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={salesData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
            <defs>
              <linearGradient id="colorSales" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="hsl(224 76% 33%)" stopOpacity={0.3}/>
                <stop offset="95%" stopColor="hsl(224 76% 33%)" stopOpacity={0}/>
              </linearGradient>
              <linearGradient id="colorForecast" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="hsl(170 82% 32%)" stopOpacity={0.3}/>
                <stop offset="95%" stopColor="hsl(170 82% 32%)" stopOpacity={0}/>
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
            <XAxis 
              dataKey="month" 
              stroke="hsl(var(--muted-foreground))"
              fontSize={12}
              tickLine={false}
              axisLine={false}
            />
            <YAxis 
              stroke="hsl(var(--muted-foreground))"
              fontSize={12}
              tickLine={false}
              axisLine={false}
              tickFormatter={(value) => `$${value / 1000}k`}
            />
            <Tooltip 
              contentStyle={{ 
                backgroundColor: 'hsl(var(--card))',
                border: '1px solid hsl(var(--border))',
                borderRadius: '8px',
                boxShadow: 'var(--shadow-md)'
              }}
              formatter={(value: number) => [`$${value.toLocaleString()}`, '']}
            />
            <Legend />
            <Area 
              type="monotone" 
              dataKey="sales" 
              stroke="hsl(224 76% 33%)" 
              fillOpacity={1} 
              fill="url(#colorSales)"
              strokeWidth={2}
              name="Actual Sales"
            />
            <Area 
              type="monotone" 
              dataKey="forecast" 
              stroke="hsl(170 82% 32%)" 
              fillOpacity={1} 
              fill="url(#colorForecast)"
              strokeWidth={2}
              strokeDasharray="5 5"
              name="Forecast"
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
