import React, { useState, useEffect } from 'react';
import API from '../utils/api';
import { BarChart3, Calendar, FileSpreadsheet, Printer, TrendingUp, AlertTriangle } from 'lucide-react';

const Reports = () => {
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [reportData, setReportData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const [productStats, setProductStats] = useState({
    totalUniqueProducts: 0,
    totalStockQuantity: 0,
    totalStockCostValue: 0,
    totalStockRetailValue: 0
  });

  const fetchProductStats = async () => {
    try {
      const res = await API.get('/products');
      if (res.data.success) {
        const products = res.data.data || [];
        const unique = products.length;
        let qty = 0;
        let costVal = 0;
        let retailVal = 0;
        
        products.forEach(p => {
          const stock = p.stockQuantity || 0;
          qty += stock;
          costVal += (p.costPrice || 0) * stock;
          retailVal += (p.sellingPrice || 0) * stock;
        });
        
        setProductStats({
          totalUniqueProducts: unique,
          totalStockQuantity: qty,
          totalStockCostValue: costVal,
          totalStockRetailValue: retailVal
        });
      }
    } catch (err) {
      console.error('Failed to fetch product stats:', err);
    }
  };

  const fetchSalesReport = async () => {
    try {
      setLoading(true);
      setError('');
      let query = '';
      if (startDate && endDate) {
        query = `?startDate=${startDate}&endDate=${endDate}`;
      } else {
        // Default to last 30 days
        const end = new Date();
        const start = new Date();
        start.setDate(start.getDate() - 30);
        
        const startStr = start.toISOString().split('T')[0];
        const endStr = end.toISOString().split('T')[0];
        
        setStartDate(startStr);
        setEndDate(endStr);
        query = `?startDate=${startStr}&endDate=${endStr}`;
      }

      const res = await API.get(`/reports/sales${query}`);
      if (res.data.success) {
        setReportData(res.data);
      }
    } catch (err) {
      setError(err.message || 'Failed to compile sales report');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSalesReport();
    fetchProductStats();
  }, []);

  const handleFilter = (e) => {
    e.preventDefault();
    fetchSalesReport();
  };

  // CSV Export utility
  const exportToCSV = () => {
    if (!reportData || reportData.sales.length === 0) return;

    const headers = ['Invoice Number,Customer,Warehouse,Date,Payment Method,Subtotal,Tax %,Discount,Grand Total\n'];
    const rows = reportData.sales.map(sale => {
      return `"${sale.invoiceNumber}","${sale.customer?.name || 'Walk-in'}","${sale.warehouse?.name}","${new Date(sale.date).toLocaleDateString()}","${sale.paymentMethod}",${sale.subTotal},${sale.tax},${sale.discount},${sale.grandTotal}`;
    });

    const csvContent = headers.concat(rows).join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `deepali_sales_report_${startDate}_to_${endDate}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handlePrintPDF = () => {
    window.print();
  };

  return (
    <div className="p-6 space-y-6 fade-in font-sans">
      
      {/* Header section */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 no-print">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 dark:text-white flex items-center space-x-2">
            <BarChart3 className="text-primary-600 dark:text-primary-400" size={24} />
            <span>Sales & Profit Reports</span>
          </h1>
          <p className="text-sm text-slate-400 dark:text-slate-500 mt-0.5">Generate daily or monthly Profit & Loss summaries and tax statements.</p>
        </div>
        
        <div className="flex items-center space-x-2">
          <button
            onClick={exportToCSV}
            disabled={!reportData || reportData.sales.length === 0}
            className="flex items-center space-x-1.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700/80 text-slate-700 dark:text-slate-300 px-4 py-2.5 rounded-xl font-semibold text-xs transition-all disabled:opacity-50"
            id="report-export-csv-btn"
          >
            <FileSpreadsheet size={16} />
            <span>Export CSV</span>
          </button>
          <button
            onClick={handlePrintPDF}
            disabled={!reportData || reportData.sales.length === 0}
            className="flex items-center space-x-1.5 bg-primary-600 hover:bg-primary-500 text-white px-4 py-2.5 rounded-xl font-semibold text-xs transition-all shadow-md active:scale-95 disabled:opacity-50"
            id="report-print-pdf-btn"
          >
            <Printer size={16} />
            <span>Print PDF</span>
          </button>
        </div>
      </div>

      {/* Date Range Select Form */}
      <form onSubmit={handleFilter} className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800/80 rounded-2xl p-4 shadow-sm flex flex-col md:flex-row md:items-end gap-4 no-print text-xs font-semibold">
        <div className="space-y-1 flex-1">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Start Date</span>
          <div className="relative">
            <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-slate-450 pointer-events-none">
              <Calendar size={15} />
            </span>
            <input
              type="date"
              required
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-850 rounded-xl py-2 pl-9 pr-3 text-xs text-slate-700 dark:text-slate-200 focus:outline-none"
              id="report-start-date"
            />
          </div>
        </div>

        <div className="space-y-1 flex-1">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">End Date</span>
          <div className="relative">
            <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-slate-450 pointer-events-none">
              <Calendar size={15} />
            </span>
            <input
              type="date"
              required
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-850 rounded-xl py-2 pl-9 pr-3 text-xs text-slate-700 dark:text-slate-200 focus:outline-none"
              id="report-end-date"
            />
          </div>
        </div>

        <button
          type="submit"
          disabled={loading}
          className="bg-primary-600 hover:bg-primary-500 text-white font-bold px-6 py-2.5 rounded-xl transition active:scale-95 w-full md:w-auto"
          id="report-apply-filter-btn"
        >
          {loading ? 'Compiling...' : 'Apply Filters'}
        </button>
      </form>

      {error && (
        <div className="p-4 bg-red-500/10 border border-red-500/20 text-red-500 rounded-xl flex items-center space-x-2 font-sans no-print">
          <AlertTriangle size={16} />
          <span>{error}</span>
        </div>
      )}

      {/* Current Inventory Summary */}
      <div className="space-y-3">
        <h2 className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider block px-1">Current Stock & Inventory Summary</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {/* Total Unique Products */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800/80 rounded-2xl p-5 shadow-sm space-y-1.5">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Total Unique Products</span>
            <h2 className="text-2xl font-bold text-slate-850 dark:text-slate-100">{productStats.totalUniqueProducts.toLocaleString('en-IN')}</h2>
            <span className="text-[10px] text-slate-450 block border-t pt-1.5 dark:border-slate-850">Different styles/items listed</span>
          </div>

          {/* Total Stock Quantity */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800/80 rounded-2xl p-5 shadow-sm space-y-1.5 bg-gradient-to-br from-primary-500/5 to-emerald-500/5 border-primary-200/20">
            <span className="text-[10px] font-bold text-slate-450 uppercase tracking-wider block">Total Current Stock (Pcs)</span>
            <h2 className="text-2xl font-extrabold text-primary-600 dark:text-primary-400">{productStats.totalStockQuantity.toLocaleString('en-IN')} Pcs</h2>
            <span className="text-[10px] text-slate-450 block border-t pt-1.5 dark:border-slate-850">Physical items in warehouse</span>
          </div>

          {/* Total Inventory Value (Cost) */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800/80 rounded-2xl p-5 shadow-sm space-y-1.5">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Inventory Value (Cost)</span>
            <h2 className="text-2xl font-bold text-slate-850 dark:text-slate-100">₹{productStats.totalStockCostValue.toLocaleString('en-IN')}</h2>
            <span className="text-[10px] text-slate-450 block border-t pt-1.5 dark:border-slate-850">Capital invested in stock</span>
          </div>

          {/* Total Inventory Value (Selling) */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800/80 rounded-2xl p-5 shadow-sm space-y-1.5">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Inventory Value (Retail)</span>
            <h2 className="text-2xl font-bold text-slate-850 dark:text-slate-100">₹{productStats.totalStockRetailValue.toLocaleString('en-IN')}</h2>
            <span className="text-[10px] text-slate-450 block border-t pt-1.5 dark:border-slate-850">Estimated retail sales potential</span>
          </div>
        </div>
      </div>

      {/* RENDER REPORT DETAILS */}
      {reportData && (
        <div className="space-y-6 print-area">
          
          {/* Print only invoice header */}
          <div className="hidden print:block text-center border-b pb-4 mb-4">
            <h2 className="text-xl font-bold uppercase tracking-wider">Deepali Creation</h2>
            <p className="text-xs text-slate-500">Sales and Profits Statement Report</p>
            <p className="text-xs font-semibold mt-1">Period: {startDate} to {endDate}</p>
          </div>

          {/* Profit and Loss metrics cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {/* Sales Revenue */}
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800/80 rounded-2xl p-5 shadow-sm space-y-1.5">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Sales Revenue (Gross)</span>
              <h2 className="text-2xl font-bold text-slate-850 dark:text-slate-100">₹{reportData.summary.totalRevenue.toLocaleString('en-IN')}</h2>
              <span className="text-[10px] text-slate-400 block border-t pt-1.5 dark:border-slate-850">Total bills collected</span>
            </div>

            {/* Cost of goods sold */}
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800/80 rounded-2xl p-5 shadow-sm space-y-1.5">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Cost of Goods Sold (COGS)</span>
              <h2 className="text-2xl font-bold text-slate-850 dark:text-slate-100">₹{reportData.summary.totalCost.toLocaleString('en-IN')}</h2>
              <span className="text-[10px] text-slate-400 block border-t pt-1.5 dark:border-slate-850">Restocking inventory costs</span>
            </div>

            {/* Net Profit */}
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800/80 rounded-2xl p-5 shadow-sm space-y-1.5 bg-gradient-to-br from-primary-500/5 to-emerald-500/5 border-primary-200/20">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Net Profit</span>
              <h2 className="text-2xl font-extrabold text-primary-600 dark:text-primary-400">
                ₹{reportData.summary.netProfit.toLocaleString('en-IN')}
              </h2>
              <span className="text-[10px] text-slate-400 block border-t pt-1.5 dark:border-slate-850 flex items-center space-x-1">
                <TrendingUp size={12} className="text-primary-500" />
                <span>Before operational expenses</span>
              </span>
            </div>
          </div>

          {/* Detailed ledger transactions matching list */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800/80 rounded-2xl shadow-sm overflow-hidden">
            <div className="px-6 py-3.5 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center bg-slate-50/20 dark:bg-slate-950/20">
              <span className="font-bold text-sm text-slate-800 dark:text-slate-200">Matching Sales Transactions</span>
              <span className="text-xs text-slate-450 font-bold">{reportData.summary.totalSalesCount} Invoices</span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-slate-200 dark:border-slate-800 text-slate-400 font-semibold bg-slate-50/30 dark:bg-slate-950/10">
                    <th className="px-6 py-3">Invoice</th>
                    <th className="px-6 py-3">Client</th>
                    <th className="px-6 py-3">Warehouse</th>
                    <th className="px-6 py-3">Date</th>
                    <th className="px-6 py-3">Payment</th>
                    <th className="px-6 py-3 text-right">Tax Paid</th>
                    <th className="px-6 py-3 text-right">Discount</th>
                    <th className="px-6 py-3 text-right">Grand Total</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 text-slate-700 dark:text-slate-350">
                  {reportData.sales.map((sale) => (
                    <tr key={sale._id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors">
                      <td className="px-6 py-3 font-mono text-[11px] font-semibold text-slate-800 dark:text-slate-250">{sale.invoiceNumber}</td>
                      <td className="px-6 py-3 font-semibold text-slate-900 dark:text-white">{sale.customer?.name}</td>
                      <td className="px-6 py-3 text-slate-450">{sale.warehouse?.name}</td>
                      <td className="px-6 py-3">{new Date(sale.date).toLocaleDateString()}</td>
                      <td className="px-6 py-3 font-semibold">{sale.paymentMethod}</td>
                      <td className="px-6 py-3 text-right">₹{((sale.subTotal * sale.tax)/100).toFixed(2)} ({sale.tax}%)</td>
                      <td className="px-6 py-3 text-right text-red-500">-₹{sale.discount.toFixed(2)}</td>
                      <td className="px-6 py-3 text-right font-bold text-slate-850 dark:text-white">₹{sale.grandTotal.toFixed(2)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Daily Profit Breakdown */}
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800/80 rounded-2xl shadow-sm overflow-hidden">
              <div className="px-6 py-3.5 border-b border-slate-100 dark:border-slate-800 bg-slate-50/20 dark:bg-slate-950/20">
                <span className="font-bold text-sm text-slate-800 dark:text-slate-200 flex items-center space-x-1.5">
                  <span>Daily Sales & Profit Breakdown</span>
                </span>
              </div>
              <div className="overflow-x-auto max-h-[350px] overflow-y-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="border-b border-slate-200 dark:border-slate-800 text-slate-400 font-semibold bg-slate-50/30 dark:bg-slate-950/10">
                      <th className="px-6 py-3">Date</th>
                      <th className="px-6 py-3 text-center">Invoices</th>
                      <th className="px-6 py-3 text-right">Revenue</th>
                      <th className="px-6 py-3 text-right">Net Profit</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 text-slate-700 dark:text-slate-350">
                    {reportData.dailyStats?.map((day) => (
                      <tr key={day.date} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors">
                        <td className="px-6 py-3 font-medium">{new Date(day.date).toLocaleDateString()}</td>
                        <td className="px-6 py-3 text-center font-bold">{day.count}</td>
                        <td className="px-6 py-3 text-right">₹{day.revenue.toFixed(2)}</td>
                        <td className={`px-6 py-3 text-right font-bold ${day.profit >= 0 ? 'text-emerald-500' : 'text-red-500'}`}>
                          ₹{day.profit.toFixed(2)}
                        </td>
                      </tr>
                    ))}
                    {(!reportData.dailyStats || reportData.dailyStats.length === 0) && (
                      <tr>
                        <td colSpan="4" className="text-center py-6 text-slate-400">No daily stats available.</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Monthly Best Sellers */}
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800/80 rounded-2xl shadow-sm overflow-hidden">
              <div className="px-6 py-3.5 border-b border-slate-100 dark:border-slate-800 bg-slate-50/20 dark:bg-slate-950/20">
                <span className="font-bold text-sm text-slate-800 dark:text-slate-200">Monthly Product Best Sellers</span>
              </div>
              <div className="overflow-x-auto max-h-[350px] overflow-y-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="border-b border-slate-200 dark:border-slate-800 text-slate-400 font-semibold bg-slate-50/30 dark:bg-slate-950/10">
                      <th className="px-6 py-3">Month</th>
                      <th className="px-6 py-3">Top Product</th>
                      <th className="px-6 py-3 text-center">Qty Sold</th>
                      <th className="px-6 py-3 text-right">Revenue</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 text-slate-700 dark:text-slate-350">
                    {reportData.monthlyBestSellers?.map((m) => (
                      <tr key={m.month} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors">
                        <td className="px-6 py-3 font-semibold text-slate-800 dark:text-slate-200">{m.month}</td>
                        <td className="px-6 py-3">
                          <p className="font-bold text-slate-900 dark:text-white leading-tight">{m.topProduct.name}</p>
                          <span className="text-[10px] text-slate-400 font-mono">({m.topProduct.code})</span>
                        </td>
                        <td className="px-6 py-3 text-center font-bold text-primary-500">{m.topProduct.quantity} Pcs</td>
                        <td className="px-6 py-3 text-right font-bold text-slate-850 dark:text-white">₹{m.topProduct.revenue.toFixed(2)}</td>
                      </tr>
                    ))}
                    {(!reportData.monthlyBestSellers || reportData.monthlyBestSellers.length === 0) && (
                      <tr>
                        <td colSpan="4" className="text-center py-6 text-slate-400">No monthly product sales compiled.</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Reports;
