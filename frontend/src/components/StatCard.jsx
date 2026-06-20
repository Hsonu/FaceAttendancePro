import { TrendingUp, TrendingDown } from 'lucide-react';

const colorMap = {
  blue: {
    bg: 'from-blue-600/20 to-blue-800/10',
    icon: 'bg-blue-600/20 text-blue-400',
    border: 'border-blue-700/30',
    value: 'text-blue-400',
  },
  green: {
    bg: 'from-emerald-600/20 to-emerald-800/10',
    icon: 'bg-emerald-600/20 text-emerald-400',
    border: 'border-emerald-700/30',
    value: 'text-emerald-400',
  },
  orange: {
    bg: 'from-amber-600/20 to-amber-800/10',
    icon: 'bg-amber-600/20 text-amber-400',
    border: 'border-amber-700/30',
    value: 'text-amber-400',
  },
  red: {
    bg: 'from-red-600/20 to-red-800/10',
    icon: 'bg-red-600/20 text-red-400',
    border: 'border-red-700/30',
    value: 'text-red-400',
  },
  purple: {
    bg: 'from-purple-600/20 to-purple-800/10',
    icon: 'bg-purple-600/20 text-purple-400',
    border: 'border-purple-700/30',
    value: 'text-purple-400',
  },
  indigo: {
    bg: 'from-indigo-600/20 to-indigo-800/10',
    icon: 'bg-indigo-600/20 text-indigo-400',
    border: 'border-indigo-700/30',
    value: 'text-indigo-400',
  },
};

export default function StatCard({ title, value, icon: Icon, color = 'blue', trend, trendLabel, suffix = '' }) {
  const c = colorMap[color] || colorMap.blue;
  const isPositive = trend > 0;

  return (
    <div className={`glass-card bg-gradient-to-br ${c.bg} border ${c.border} p-6 animate-slide-up`}>
      <div className="flex items-start justify-between mb-4">
        <div className={`p-3 rounded-xl ${c.icon}`}>
          <Icon size={22} />
        </div>
        {trend !== undefined && (
          <div className={`flex items-center gap-1 text-xs font-medium px-2 py-1 rounded-lg
            ${isPositive ? 'bg-emerald-500/10 text-emerald-400' : 'bg-red-500/10 text-red-400'}`}>
            {isPositive ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
            {Math.abs(trend)}%
          </div>
        )}
      </div>
      <div>
        <p className="text-dark-400 text-sm font-medium mb-1">{title}</p>
        <p className={`text-3xl font-bold ${c.value}`}>
          {value}
          {suffix && <span className="text-lg ml-1 text-dark-400">{suffix}</span>}
        </p>
        {trendLabel && (
          <p className="text-dark-500 text-xs mt-2">{trendLabel}</p>
        )}
      </div>
    </div>
  );
}
