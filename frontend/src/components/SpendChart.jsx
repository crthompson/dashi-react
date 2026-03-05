import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

export default function SpendChart({ data }) {
  if (!data || data.length === 0) {
    return (
      <div className="text-dashi-muted text-center py-12">
        <div className="w-16 h-16 rounded-2xl bg-dashi-surface flex items-center justify-center mx-auto mb-4">
          <span className="text-2xl opacity-30">📊</span>
        </div>
        <p>No spend data available</p>
      </div>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={320}>
      <AreaChart data={data} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
        <defs>
          <linearGradient id="colorMoonshot" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="#667eea" stopOpacity={0.4}/>
            <stop offset="95%" stopColor="#667eea" stopOpacity={0}/>
          </linearGradient>
          <linearGradient id="colorClaude" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="#4ecdc4" stopOpacity={0.4}/>
            <stop offset="95%" stopColor="#4ecdc4" stopOpacity={0}/>
          </linearGradient>
        </defs>
        <XAxis 
          dataKey="date" 
          tickFormatter={(date) => new Date(date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
          stroke="#3a3a50"
          tick={{ fill: '#6b7280', fontSize: 12 }}
        />
        <YAxis 
          tickFormatter={(val) => `$${val.toFixed(2)}`} 
          stroke="#3a3a50"
          tick={{ fill: '#6b7280', fontSize: 12 }}
        />
        <CartesianGrid strokeDasharray="3 3" stroke="#2a2a3a" />
        <Tooltip 
          formatter={(value) => [`$${value.toFixed(2)}`, '']}
          labelFormatter={(label) => new Date(label).toLocaleDateString()}
          contentStyle={{ 
            backgroundColor: '#1a1a25', 
            border: '1px solid #2a2a3a',
            borderRadius: '12px',
            color: '#fff'
          }}
        />
        <Area type="monotone" dataKey="moonshot" stroke="#667eea" strokeWidth={2} fillOpacity={1} fill="url(#colorMoonshot)" name="Moonshot" />
        <Area type="monotone" dataKey="claude" stroke="#4ecdc4" strokeWidth={2} fillOpacity={1} fill="url(#colorClaude)" name="Claude" />
      </AreaChart>
    </ResponsiveContainer>
  );
}
