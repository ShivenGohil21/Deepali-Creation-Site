import React from 'react';

const StatCard = ({ title, value, icon: Icon, trend, colorClass = 'primary' }) => {
  const colorMaps = {
    primary: 'bg-primary-50 dark:bg-primary-950/30 text-primary-600 dark:text-primary-400 border-primary-100 dark:border-primary-900/20',
    blue: 'bg-blue-50 dark:bg-blue-950/30 text-blue-600 dark:text-blue-400 border-blue-100 dark:border-blue-900/20',
    amber: 'bg-amber-50 dark:bg-amber-950/30 text-amber-600 dark:text-amber-400 border-amber-100 dark:border-amber-900/20',
    red: 'bg-red-50 dark:bg-red-950/30 text-red-600 dark:text-red-400 border-red-100 dark:border-red-900/20',
    purple: 'bg-purple-50 dark:bg-purple-950/30 text-purple-600 dark:text-purple-400 border-purple-100 dark:border-purple-900/20',
    slate: 'bg-slate-50 dark:bg-slate-900 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-800'
  };

  const selectedColor = colorMaps[colorClass] || colorMaps.primary;

  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800/80 rounded-2xl p-5 hover-scale shadow-sm flex items-center justify-between transition-colors duration-300">
      <div className="space-y-2">
        <span className="text-xs font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider block">
          {title}
        </span>
        <h3 className="text-2xl font-bold text-slate-800 dark:text-slate-100 font-sans tracking-tight">
          {value}
        </h3>
        {trend && (
          <span className={`text-xs font-semibold font-sans ${trend.startsWith('+') ? 'text-primary-600' : 'text-red-500'}`}>
            {trend} <span className="text-slate-400 font-normal">vs last month</span>
          </span>
        )}
      </div>
      <div className={`p-3 rounded-xl border ${selectedColor} shrink-0`}>
        <Icon size={24} />
      </div>
    </div>
  );
};

export default StatCard;
