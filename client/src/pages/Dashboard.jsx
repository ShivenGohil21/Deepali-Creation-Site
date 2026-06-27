import React, { useState, useEffect } from 'react';
import { 
  Package, 
  Layers, 
  Tag, 
  Users, 
  TrendingUp, 
  Calendar, 
  DollarSign, 
  AlertTriangle,
  FileSpreadsheet,
  Activity,
  ArrowRight
} from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, LineChart, Line } from 'recharts';
import { Link } from 'react-router-dom';
import API from '../utils/api';
import StatCard from '../components/StatCard';

const Dashboard = () => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const fetchDashboardStats = async () => {
    try {
      setLoading(true);
      const res = await API.get('/reports/dashboard');
      if (res.data.success) {
        setData(res.data.data);
      }
    } catch (err) {
      setError(err.message || 'Failed to fetch dashboard data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardStats();
  }, []);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[80vh] space-y-4">
        <div className="w-12 h-12 border-4 border-primary-500 border-t-transparent rounded-full animate-spin" />
        <p className="text-sm font-semibold text-slate-500 dark:text-slate-400 font-sans">Compiling analytical metrics...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6 bg-red-500/10 border border-red-500/20 text-red-500 rounded-2xl flex items-center space-x-2 font-sans m-6">
        <AlertTriangle size={18} />
        <span>Error loading metrics: {error}</span>
      </div>
    );
  }

  const { summary, lowStockProducts, topSellingProducts, recentSales, recentPurchases, recentLogs, chartData } = data;

  return (
    <div className="space-y-6 p-6 fade-in font-sans">
      {/* Header section */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 dark:text-white font-sans tracking-tight">Deepali Shop Dashboard</h1>
          <p className="text-sm text-slate-400 dark:text-slate-500 font-sans mt-0.5">Real-time point of sale metrics and inventory tracking overview.</p>
        </div>
        <button 
          onClick={fetchDashboardStats}
          className="text-xs bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700/80 px-3.5 py-2 rounded-lg font-semibold text-slate-600 dark:text-slate-300 transition-colors"
        >
          Refresh Statistics
        </button>
      </div>

      {/* Stats KPI Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
        <StatCard 
          title="Today's Sales" 
          value={`₹${summary.todaySales.toLocaleString('en-IN')}`} 
          icon={TrendingUp} 
          colorClass="primary" 
        />
        <StatCard 
          title="Today's Profit" 
          value={`₹${summary.todayProfit.toLocaleString('en-IN')}`} 
          icon={DollarSign} 
          colorClass="blue" 
        />
        <StatCard 
          title="Monthly Profit" 
          value={`₹${summary.monthlyProfit.toLocaleString('en-IN')}`} 
          icon={Calendar} 
          colorClass="purple" 
        />
        <StatCard 
          title="Low Stock Items" 
          value={lowStockProducts.length} 
          icon={AlertTriangle} 
          colorClass={lowStockProducts.length > 0 ? 'red' : 'slate'} 
        />
      </div>

      {/* Counts Grid */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800/60 rounded-xl p-3.5 text-center shadow-sm">
          <Package className="mx-auto text-slate-400 mb-1" size={20} />
          <span className="text-xs text-slate-400 dark:text-slate-500 font-medium">Products</span>
          <h4 className="text-lg font-bold text-slate-800 dark:text-slate-100 mt-0.5">{summary.totalProducts}</h4>
        </div>
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800/60 rounded-xl p-3.5 text-center shadow-sm">
          <Layers className="mx-auto text-slate-400 mb-1" size={20} />
          <span className="text-xs text-slate-400 dark:text-slate-500 font-medium">Categories</span>
          <h4 className="text-lg font-bold text-slate-800 dark:text-slate-100 mt-0.5">{summary.totalCategories}</h4>
        </div>
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800/60 rounded-xl p-3.5 text-center shadow-sm">
          <Tag className="mx-auto text-slate-400 mb-1" size={20} />
          <span className="text-xs text-slate-400 dark:text-slate-500 font-medium">Brands</span>
          <h4 className="text-lg font-bold text-slate-800 dark:text-slate-100 mt-0.5">{summary.totalBrands}</h4>
        </div>
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800/60 rounded-xl p-3.5 text-center shadow-sm">
          <Users className="mx-auto text-slate-400 mb-1" size={20} />
          <span className="text-xs text-slate-400 dark:text-slate-500 font-medium">Customers</span>
          <h4 className="text-lg font-bold text-slate-800 dark:text-slate-100 mt-0.5">{summary.totalCustomers}</h4>
        </div>
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800/60 rounded-xl p-3.5 text-center shadow-sm">
          <Users className="mx-auto text-slate-400 mb-1" size={20} />
          <span className="text-xs text-slate-400 dark:text-slate-500 font-medium">Suppliers</span>
          <h4 className="text-lg font-bold text-slate-800 dark:text-slate-100 mt-0.5">{summary.totalSuppliers}</h4>
        </div>
      </div>

      {/* Main Charts & Analytics Block */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Monthly Sales & Profit Chart */}
        <div className="lg:col-span-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800/80 rounded-2xl p-5 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-bold text-slate-800 dark:text-slate-100 text-base">Monthly Analysis (6-Month Sales & Profits)</h3>
            <span className="text-xs text-primary-600 dark:text-primary-400 font-medium flex items-center space-x-1">
              <span>Trends Rising</span>
              <TrendingUp size={12} />
            </span>
          </div>
          <div className="h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#334155" opacity={0.1} />
                <XAxis dataKey="month" stroke="#64748b" fontSize={11} tickLine={false} />
                <YAxis stroke="#64748b" fontSize={11} tickLine={false} axisLine={false} />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: '#1e293b', 
                    border: 'none', 
                    borderRadius: '8px',
                    color: '#fff',
                    fontSize: '12px'
                  }} 
                />
                <Legend iconType="circle" fontSize={11} wrapperStyle={{ fontSize: '11px' }} />
                <Bar name="Sales Revenue" dataKey="sales" fill="#16a34a" radius={[4, 4, 0, 0]} />
                <Bar name="Purchases" dataKey="purchases" fill="#475569" radius={[4, 4, 0, 0]} />
                <Bar name="Net Profit" dataKey="profit" fill="#3b82f6" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Top Selling Products */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800/80 rounded-2xl p-5 shadow-sm space-y-4 flex flex-col justify-between">
          <div className="space-y-4">
            <h3 className="font-bold text-slate-800 dark:text-slate-100 text-base">Top Selling Products</h3>
            <div className="divide-y divide-slate-100 dark:divide-slate-800">
              {topSellingProducts.length === 0 ? (
                <div className="py-8 text-center text-xs text-slate-400">No checkout transactions recorded yet.</div>
              ) : (
                topSellingProducts.map((item, idx) => (
                  <div key={item.product._id} className="py-2.5 flex items-center justify-between">
                    <div className="min-w-0">
                      <p className="text-xs font-semibold text-slate-800 dark:text-slate-200 truncate">{item.product.name}</p>
                      <span className="text-[10px] text-slate-400 font-mono block">{item.product.code}</span>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-xs font-bold text-slate-800 dark:text-slate-200">{item.quantity} Sold</p>
                      <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-medium font-sans">
                        ₹{item.revenue.toLocaleString('en-IN')}
                      </span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
          <Link 
            to="/reports" 
            className="text-xs text-primary-600 hover:text-primary-700 font-semibold flex items-center space-x-1 self-end mt-4 dark:text-primary-400 dark:hover:text-primary-300"
          >
            <span>View Full Sales Report</span>
            <ArrowRight size={14} />
          </Link>
        </div>
      </div>

      {/* Low Stock Alerts & Audit Log Split */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* Low Stock Alerts Table */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800/80 rounded-2xl p-5 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-bold text-slate-800 dark:text-slate-100 text-base flex items-center space-x-2">
              <AlertTriangle className="text-amber-500" size={18} />
              <span>Low Stock Alerts</span>
            </h3>
            <Link to="/products" className="text-xs text-primary-600 dark:text-primary-400 hover:underline">Manage Stock</Link>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-100 dark:border-slate-800 text-slate-400 font-medium">
                  <th className="py-2">Code</th>
                  <th className="py-2">Product Name</th>
                  <th className="py-2">Alert Level</th>
                  <th className="py-2 text-right">Available</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50 dark:divide-slate-800/50">
                {lowStockProducts.length === 0 ? (
                  <tr>
                    <td colSpan="4" className="py-6 text-center text-slate-400">All products have healthy stock levels.</td>
                  </tr>
                ) : (
                  lowStockProducts.map((prod) => (
                    <tr key={prod._id} className="text-slate-700 dark:text-slate-300">
                      <td className="py-2.5 font-mono text-[11px]">{prod.code}</td>
                      <td className="py-2.5 font-medium">{prod.name}</td>
                      <td className="py-2.5 text-slate-400">{prod.alertQuantity} {prod.unit}</td>
                      <td className="py-2.5 text-right font-bold text-red-500">{prod.stockQuantity} {prod.unit}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Audit Log Activity Feed */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800/80 rounded-2xl p-5 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-bold text-slate-800 dark:text-slate-100 text-base flex items-center space-x-2">
              <Activity className="text-slate-400" size={18} />
              <span>Recent Activity Logs</span>
            </h3>
            <Link to="/settings" className="text-xs text-primary-600 dark:text-primary-400 hover:underline">View All Logs</Link>
          </div>
          <div className="space-y-3.5 max-h-56 overflow-y-auto pr-1">
            {recentLogs.length === 0 ? (
              <div className="py-8 text-center text-xs text-slate-400">No actions recorded in system.</div>
            ) : (
              recentLogs.map((log) => (
                <div key={log._id} className="text-xs flex items-start space-x-2.5 border-b border-slate-50 dark:border-slate-800/40 pb-2">
                  <div className="w-1.5 h-1.5 rounded-full bg-primary-500 shrink-0 mt-1.5" />
                  <div className="flex-1 min-w-0">
                    <p className="text-slate-700 dark:text-slate-300">
                      <span className="font-bold text-slate-800 dark:text-slate-200">{log.username}</span>: {log.action} - <span className="font-medium text-slate-600 dark:text-slate-400">{log.target}</span>
                    </p>
                    {log.details && <p className="text-[10px] text-slate-400 mt-0.5 truncate">{log.details}</p>}
                  </div>
                  <span className="text-[10px] text-slate-400 shrink-0">
                    {new Date(log.date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
