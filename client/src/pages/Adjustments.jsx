import React, { useState, useEffect } from 'react';
import API from '../utils/api';
import { 
  Plus, 
  Search, 
  Eye, 
  Trash2, 
  Printer, 
  X, 
  AlertTriangle, 
  CheckCircle, 
  Calendar, 
  ArrowLeftRight,
  Loader2
} from 'lucide-react';

const Adjustments = () => {
  // Lists data
  const [adjustments, setAdjustments] = useState([]);
  const [warehouses, setWarehouses] = useState([]);
  const [allProducts, setAllProducts] = useState([]);
  const [loading, setLoading] = useState(true);

  // Search and Filter states
  const [searchQuery, setSearchQuery] = useState('');
  const [filterWarehouse, setFilterWarehouse] = useState('');

  // Modals state
  const [showAddModal, setShowAddModal] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [detailLoading, setDetailLoading] = useState(false);
  const [selectedAdjustment, setSelectedAdjustment] = useState(null);
  const [barcodeData, setBarcodeData] = useState(null);

  // Form creation state
  const [formWarehouseId, setFormWarehouseId] = useState('');
  const [formDate, setFormDate] = useState(new Date().toISOString().split('T')[0]);
  const [formNotes, setFormNotes] = useState('');
  const [formItems, setFormItems] = useState([]); // [{ productId, name, code, type, quantity, price, total }]
  const [productSearch, setProductSearch] = useState('');

  // Notification state
  const [msg, setMsg] = useState({ text: '', type: 'success' });

  const showToast = (text, type = 'success') => {
    setMsg({ text, type });
    setTimeout(() => setMsg({ text: '', type: 'success' }), 5000);
  };

  const fetchInitialData = async () => {
    try {
      setLoading(true);
      const [adjRes, whRes, prodRes] = await Promise.all([
        API.get('/adjustments'),
        API.get('/warehouses'),
        API.get('/products')
      ]);

      if (adjRes.data.success) setAdjustments(adjRes.data.data);
      if (whRes.data.success) {
        setWarehouses(whRes.data.data);
        if (whRes.data.data.length > 0) {
          setFormWarehouseId(whRes.data.data[0]._id);
        }
      }
      if (prodRes.data.success) setAllProducts(prodRes.data.data);
    } catch (err) {
      showToast(err.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchInitialData();
  }, []);

  const handleOpenAdd = () => {
    setFormNotes('');
    setFormDate(new Date().toISOString().split('T')[0]);
    if (warehouses.length > 0) {
      setFormWarehouseId(warehouses[0]._id);
    }
    setFormItems([]);
    setProductSearch('');
    setShowAddModal(true);
  };

  const handleProductSelect = (product) => {
    const exists = formItems.find(it => it.productId === product._id);
    if (exists) {
      setFormItems(prev => prev.map(it => 
        it.productId === product._id 
          ? { ...it, quantity: it.quantity + 1, total: (it.quantity + 1) * it.price } 
          : it
      ));
    } else {
      setFormItems(prev => [...prev, {
        productId: product._id,
        name: product.name,
        code: product.code,
        barcodeValue: product.barcodeValue || '',
        type: 'Addition',
        quantity: 1,
        price: product.sellingPrice || 0,
        total: product.sellingPrice || 0
      }]);
    }
    setProductSearch('');
  };

  const handleItemFieldChange = (productId, field, value) => {
    setFormItems(prev => prev.map(it => {
      if (it.productId !== productId) return it;

      let updated = { ...it, [field]: value };
      if (field === 'quantity' || field === 'price') {
        const qty = field === 'quantity' ? Number(value) : it.quantity;
        const price = field === 'price' ? Number(value) : it.price;
        updated.total = qty * price;
      }
      return updated;
    }));
  };

  const handleRemoveItem = (productId) => {
    setFormItems(prev => prev.filter(it => it.productId !== productId));
  };

  const handleSubmitAdjustment = async (e) => {
    e.preventDefault();
    if (formItems.length === 0) {
      showToast('Please add at least one item to adjust.', 'error');
      return;
    }

    try {
      const payload = {
        warehouseId: formWarehouseId,
        date: formDate,
        notes: formNotes,
        items: formItems.map(it => ({
          productId: it.productId,
          type: it.type,
          quantity: Number(it.quantity),
          price: Number(it.price)
        }))
      };

      const res = await API.post('/adjustments', payload);
      if (res.data.success) {
        showToast('Quantity adjustment created successfully!');
        setShowAddModal(false);
        // Refresh list
        const listRes = await API.get('/adjustments');
        if (listRes.data.success) setAdjustments(listRes.data.data);
        // Also refresh products to get latest warehouse stock counts
        const prodRes = await API.get('/products');
        if (prodRes.data.success) setAllProducts(prodRes.data.data);
      }
    } catch (err) {
      showToast(err.message, 'error');
    }
  };

  const handleOpenDetail = async (id) => {
    try {
      setDetailLoading(true);
      const [detailRes, barcodeRes] = await Promise.all([
        API.get(`/adjustments/${id}`),
        API.get(`/adjustments/barcode/${id}`)
      ]);

      if (detailRes.data.success && barcodeRes.data.success) {
        setSelectedAdjustment(detailRes.data.data);
        setBarcodeData(barcodeRes.data);
        setShowDetailModal(true);
      }
    } catch (err) {
      showToast(err.message, 'error');
    } finally {
      setDetailLoading(false);
    }
  };

  const triggerPrint = () => {
    window.print();
  };

  // Search product filters
  const filteredProducts = productSearch.trim()
    ? allProducts.filter(p => 
        p.name.toLowerCase().includes(productSearch.toLowerCase()) ||
        p.code.toLowerCase().includes(productSearch.toLowerCase()) ||
        (p.barcodeValue && p.barcodeValue.toLowerCase().includes(productSearch.toLowerCase()))
      )
    : [];

  // Filter adjustments for list
  const filteredAdjustments = adjustments.filter(adj => {
    const matchesWh = filterWarehouse ? adj.warehouse?._id === filterWarehouse : true;
    const matchesSearch = searchQuery ? adj.referenceNo.toLowerCase().includes(searchQuery.toLowerCase()) : true;
    return matchesWh && matchesSearch;
  });

  const grandTotal = formItems.reduce((acc, curr) => acc + curr.total, 0);

  return (
    <>
      <div className="p-6 space-y-6 fade-in font-sans">
      
      {/* Toast Notice */}
      {msg.text && (
        <div className={`fixed bottom-4 right-4 px-4 py-3 rounded-xl shadow-lg z-50 flex items-center space-x-2 text-xs font-semibold ${
          msg.type === 'error' ? 'bg-red-500 text-white' : 'bg-primary-600 text-white'
        }`}>
          <span>{msg.text}</span>
        </div>
      )}

      {/* Header section */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 no-print">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 dark:text-white">Quantity Adjustments</h1>
          <p className="text-sm text-slate-400 dark:text-slate-500 mt-0.5">Manage stock additions, subtractions, valuation updates, and audit trails.</p>
        </div>
        <button
          onClick={handleOpenAdd}
          className="bg-primary-600 hover:bg-primary-500 text-white text-xs font-bold px-4 py-2.5 rounded-xl shadow-md flex items-center justify-center space-x-1.5 shrink-0 transition-all hover-scale"
          id="btn-do-adjustment"
        >
          <Plus size={16} />
          <span>Do Adjustment</span>
        </button>
      </div>

      {/* Filters section */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800/80 p-4 rounded-2xl shadow-sm flex flex-col md:flex-row md:items-center gap-4 no-print">
        <div className="flex-1 relative">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
          <input
            type="text"
            placeholder="Search by Reference No..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border rounded-xl text-xs bg-slate-50/50 dark:bg-slate-950/40 border-slate-200 dark:border-slate-800 focus:outline-none focus:ring-2 focus:ring-primary-500 dark:text-white"
          />
        </div>
        <div className="w-full md:w-64">
          <select
            value={filterWarehouse}
            onChange={(e) => setFilterWarehouse(e.target.value)}
            className="w-full px-3 py-2 border rounded-xl text-xs bg-slate-50/50 dark:bg-slate-950/40 border-slate-200 dark:border-slate-800 focus:outline-none focus:ring-2 focus:ring-primary-500 dark:text-white"
          >
            <option value="">All Warehouses</option>
            {warehouses.map(wh => (
              <option key={wh._id} value={wh._id}>{wh.name}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Adjustments Table */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800/80 rounded-2xl shadow-sm overflow-hidden no-print">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50/70 dark:bg-slate-950/40 border-b border-slate-200 dark:border-slate-800 text-slate-400 font-semibold text-xs">
                <th className="px-6 py-3.5">Date</th>
                <th className="px-6 py-3.5">Reference No</th>
                <th className="px-6 py-3.5">Warehouse</th>
                <th className="px-6 py-3.5">Created by</th>
                <th className="px-6 py-3.5">Note</th>
                <th className="px-6 py-3.5 text-right">Total Value</th>
                <th className="px-6 py-3.5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 text-slate-700 dark:text-slate-300 text-xs">
              {loading ? (
                <tr>
                  <td colSpan="7" className="text-center py-12">
                    <Loader2 className="w-8 h-8 animate-spin mx-auto mb-2 text-primary-500" />
                    <span>Loading stock adjustments...</span>
                  </td>
                </tr>
              ) : filteredAdjustments.length === 0 ? (
                <tr>
                  <td colSpan="7" className="text-center py-12 text-slate-400">
                    No adjustments found matching filter.
                  </td>
                </tr>
              ) : (
                filteredAdjustments.map((adj) => (
                  <tr key={adj._id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors">
                    <td className="px-6 py-3.5">{new Date(adj.date).toLocaleDateString()}</td>
                    <td className="px-6 py-3.5 font-mono text-[11px] font-semibold text-slate-800 dark:text-slate-250">{adj.referenceNo}</td>
                    <td className="px-6 py-3.5 font-semibold text-slate-900 dark:text-white">{adj.warehouse?.name}</td>
                    <td className="px-6 py-3.5 text-slate-450">{adj.createdBy?.name || 'Admin'}</td>
                    <td className="px-6 py-3.5 max-w-[200px] truncate text-slate-400" title={adj.notes}>{adj.notes || 'N/A'}</td>
                    <td className="px-6 py-3.5 text-right font-bold text-slate-800 dark:text-slate-100">
                      ₹{adj.totalAmount.toFixed(2)}
                    </td>
                    <td className="px-6 py-3.5 text-right">
                      <button
                        onClick={() => handleOpenDetail(adj._id)}
                        disabled={detailLoading}
                        className="p-1.5 text-slate-400 hover:text-primary-500 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition disabled:opacity-50"
                        title="View Details"
                        id={`view-details-${adj.referenceNo.replace(/\//g, '-')}`}
                      >
                        {detailLoading && selectedAdjustment?._id === adj._id ? (
                          <Loader2 size={15} className="animate-spin" />
                        ) : (
                          <Eye size={15} />
                        )}
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
      </div>

      {/* CREATE ADJUSTMENT MODAL */}
      {showAddModal && (
        <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm z-40 flex items-center justify-center p-4 no-print overflow-y-auto">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl w-full max-w-4xl shadow-2xl p-6 space-y-4 max-h-[85vh] overflow-y-auto no-print">
            <div className="flex items-center justify-between border-b pb-3 dark:border-slate-800 sticky top-0 bg-white dark:bg-slate-900 z-10">
              <h3 className="text-lg font-bold text-slate-800 dark:text-white">Record Stock Quantity Adjustment</h3>
              <button onClick={() => setShowAddModal(false)} className="text-slate-400 hover:text-slate-200">
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSubmitAdjustment} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Warehouse Selector */}
                <div>
                  <label className="text-xs font-bold text-slate-500 dark:text-slate-400 block mb-1">Target Warehouse</label>
                  <select
                    value={formWarehouseId}
                    onChange={(e) => setFormWarehouseId(e.target.value)}
                    required
                    className="w-full px-3 py-2 border rounded-xl text-xs bg-slate-50/50 dark:bg-slate-950/40 border-slate-200 dark:border-slate-800 focus:outline-none focus:ring-2 focus:ring-primary-500 dark:text-white"
                  >
                    {warehouses.map(wh => (
                      <option key={wh._id} value={wh._id}>{wh.name}</option>
                    ))}
                  </select>
                </div>

                {/* Date Input */}
                <div>
                  <label className="text-xs font-bold text-slate-500 dark:text-slate-400 block mb-1">Adjustment Date</label>
                  <div className="relative">
                    <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
                    <input
                      type="date"
                      value={formDate}
                      onChange={(e) => setFormDate(e.target.value)}
                      required
                      className="w-full pl-9 pr-3 py-2 border rounded-xl text-xs bg-slate-50/50 dark:bg-slate-950/40 border-slate-200 dark:border-slate-800 focus:outline-none focus:ring-2 focus:ring-primary-500 dark:text-white font-sans"
                    />
                  </div>
                </div>
              </div>

              {/* Product search & Add */}
              <div className="relative">
                <label className="text-xs font-bold text-slate-500 dark:text-slate-400 block mb-1">Search & Select Product</label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
                  <input
                    type="text"
                    placeholder="Search by product name, code, or scan barcode..."
                    value={productSearch}
                    onChange={(e) => setProductSearch(e.target.value)}
                    className="w-full pl-9 pr-3 py-2 border rounded-xl text-xs bg-slate-50/50 dark:bg-slate-950/40 border-slate-200 dark:border-slate-800 focus:outline-none focus:ring-2 focus:ring-primary-500 dark:text-white"
                  />
                </div>

                {/* Search Results Dropdown */}
                {filteredProducts.length > 0 && (
                  <div className="absolute left-0 right-0 mt-1 max-h-48 overflow-y-auto bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-850 rounded-xl shadow-xl z-50 divide-y dark:divide-slate-800 text-xs">
                    {filteredProducts.map(prod => {
                      // Find current warehouse stock quantity
                      const whStock = prod.warehouseStock?.find(s => s.warehouse === formWarehouseId)?.quantity || 0;
                      return (
                        <button
                          key={prod._id}
                          type="button"
                          onClick={() => handleProductSelect(prod)}
                          className="w-full px-4 py-2.5 text-left hover:bg-slate-50 dark:hover:bg-slate-800 flex justify-between items-center transition"
                        >
                          <div>
                            <p className="font-semibold text-slate-800 dark:text-white">{prod.name}</p>
                            <span className="text-[10px] text-slate-400 font-mono">Code: {prod.code} | Barcode: {prod.barcodeValue}</span>
                          </div>
                          <div className="text-right text-[10px] font-semibold text-slate-400">
                            Stock here: <span className="text-primary-600 dark:text-primary-400 font-bold">{whStock}</span>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Form Items List Table */}
              <div className="border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden bg-slate-50/10">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-50 dark:bg-slate-950/40 border-b border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400 font-bold text-[10px] uppercase">
                      <th className="px-4 py-2.5 w-10">No</th>
                      <th className="px-4 py-2.5">Product Details</th>
                      <th className="px-4 py-2.5 w-36">Type</th>
                      <th className="px-4 py-2.5 w-24">Qty</th>
                      <th className="px-4 py-2.5 w-32">Price (₹)</th>
                      <th className="px-4 py-2.5 w-32 text-right font-bold">Total (₹)</th>
                      <th className="px-4 py-2.5 w-12 text-center">Remove</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-xs">
                    {formItems.length === 0 ? (
                      <tr>
                        <td colSpan="7" className="text-center py-8 text-slate-400 italic">
                          No products added yet. Use the search bar above to select products.
                        </td>
                      </tr>
                    ) : (
                      formItems.map((it, index) => (
                        <tr key={it.productId} className="hover:bg-slate-55/20 dark:hover:bg-slate-800/10">
                          <td className="px-4 py-2 font-mono text-[10px]">{index + 1}</td>
                          <td className="px-4 py-2">
                            <p className="font-semibold text-slate-800 dark:text-white leading-normal">{it.name}</p>
                            <span className="text-[10px] text-slate-400 font-mono">Code: {it.code} | Barcode: {it.barcodeValue || '-'}</span>
                          </td>
                          <td className="px-4 py-2">
                            <select
                              value={it.type}
                              onChange={(e) => handleItemFieldChange(it.productId, 'type', e.target.value)}
                              className="w-full px-2 py-1 border rounded bg-white dark:bg-slate-950 text-slate-800 dark:text-white border-slate-200 dark:border-slate-800"
                            >
                              <option value="Addition">Addition (+)</option>
                              <option value="Subtraction">Subtraction (-)</option>
                            </select>
                          </td>
                          <td className="px-4 py-2">
                            <input
                              type="number"
                              min="1"
                              step="1"
                              required
                              value={it.quantity}
                              onChange={(e) => handleItemFieldChange(it.productId, 'quantity', e.target.value)}
                              className="w-full px-2 py-1 border rounded text-slate-800 dark:text-white bg-white dark:bg-slate-950 border-slate-200 dark:border-slate-800 font-semibold"
                            />
                          </td>
                          <td className="px-4 py-2">
                            <input
                              type="number"
                              readOnly
                              disabled
                              value={it.price}
                              className="w-full px-2 py-1 border rounded text-slate-500 bg-slate-100 dark:bg-slate-900 border-slate-200 dark:border-slate-800 font-semibold cursor-not-allowed"
                            />
                          </td>
                          <td className="px-4 py-2 text-right font-bold text-slate-800 dark:text-slate-200">
                            ₹{it.total.toFixed(2)}
                          </td>
                          <td className="px-4 py-2 text-center">
                            <button
                              type="button"
                              onClick={() => handleRemoveItem(it.productId)}
                              className="p-1 text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 rounded-lg transition"
                            >
                              <Trash2 size={14} />
                            </button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>

              {/* Notes Textarea */}
              <div>
                <label className="text-xs font-bold text-slate-500 dark:text-slate-400 block mb-1">Adjustment Notes / Description</label>
                <textarea
                  rows="2"
                  placeholder="Explain why this stock adjustment is being done (e.g. Damage replacement, audited difference, warehouse inward receipt)..."
                  value={formNotes}
                  onChange={(e) => setFormNotes(e.target.value)}
                  className="w-full px-3 py-2 border rounded-xl text-xs bg-slate-50/50 dark:bg-slate-950/40 border-slate-200 dark:border-slate-800 focus:outline-none focus:ring-2 focus:ring-primary-500 dark:text-white"
                />
              </div>

              {/* Subtotal Aggregate display */}
              <div className="flex justify-end bg-slate-50 dark:bg-slate-950/40 border dark:border-slate-850 p-4 rounded-2xl">
                <div className="text-right">
                  <span className="text-xs text-slate-400 uppercase font-bold tracking-wide">Total Value adjusted:</span>
                  <p className="text-xl font-extrabold text-primary-650 dark:text-primary-400 mt-0.5">₹{grandTotal.toFixed(2)}</p>
                </div>
              </div>

              {/* Actions footer */}
              <div className="flex items-center justify-end space-x-2 border-t pt-4 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700/80 text-slate-650 dark:text-slate-300 px-4 py-2 rounded-xl text-xs font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="bg-primary-600 hover:bg-primary-500 text-white px-5 py-2 rounded-xl text-xs font-bold transition-all hover-scale"
                  id="btn-submit-adjustment"
                >
                  Save Adjustment
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* DETAIL VIEW / PRINT PREVIEW MODAL */}
      {showDetailModal && selectedAdjustment && (
        <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm z-40 flex items-center justify-center p-4 overflow-y-auto">
          {/* Modal Container */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl w-full max-w-4xl shadow-2xl p-6 no-print max-h-[90vh] overflow-y-auto space-y-4 relative">
            
            {/* Header controls inside modal */}
            <div className="flex items-center justify-between border-b pb-3 dark:border-slate-800">
              <h3 className="text-lg font-bold text-slate-800 dark:text-white">Quantity Adjustment Slip</h3>
              <div className="flex items-center space-x-2">
                <button
                  onClick={triggerPrint}
                  className="bg-primary-600 hover:bg-primary-500 text-white text-xs font-bold px-3 py-1.5 rounded-lg flex items-center space-x-1"
                  id="btn-print-detail"
                >
                  <Printer size={13} />
                  <span>Print</span>
                </button>
                <button 
                  onClick={() => setShowDetailModal(false)} 
                  className="text-slate-400 hover:text-slate-200 p-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition"
                >
                  <X size={20} />
                </button>
              </div>
            </div>

            {/* Receipt Body to Preview */}
            <div className="bg-white text-black p-6 rounded-2xl border border-slate-250/70 shadow-inner space-y-6 font-sans">
              
              {/* DEEPALI Styled Banner Logo */}
              <div className="flex justify-center">
                <div className="bg-[#D92121] text-white px-12 py-3.5 flex flex-col items-center justify-center font-bold tracking-[0.25em] text-3xl uppercase font-sans rounded shadow-sm border border-red-700 w-full max-w-sm text-center">
                  DEEPALI
                </div>
              </div>

              {/* Meta details and Barcode block */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 border border-slate-200 p-4 rounded-xl bg-slate-50/50">
                <div className="space-y-1.5 text-xs text-slate-800">
                  <p><span className="font-bold">Date:</span> {new Date(selectedAdjustment.date).toLocaleString('en-IN')}</p>
                  <p><span className="font-bold">Reference:</span> {selectedAdjustment.referenceNo}</p>
                  <p><span className="font-bold">Warehouse:</span> {selectedAdjustment.warehouse?.name}</p>
                </div>
                <div className="flex items-center justify-end space-x-4">
                  {barcodeData?.barcodeImage && (
                    <div className="text-center space-y-1">
                      <img src={barcodeData.barcodeImage} alt="Reference Barcode" className="h-9 object-contain mx-auto" />
                    </div>
                  )}
                  {barcodeData?.qrCodeImage && (
                    <img src={barcodeData.qrCodeImage} alt="Reference QR Code" className="h-12 w-12 object-contain border p-0.5 bg-white rounded shadow-sm" />
                  )}
                </div>
              </div>

              {/* Items details table */}
              <div className="border border-slate-200 rounded-xl overflow-hidden">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-[#2B6CB0] text-white font-bold">
                      <th className="px-4 py-2 w-12">No</th>
                      <th className="px-4 py-2">Description</th>
                      <th className="px-4 py-2 w-28">Variant</th>
                      <th className="px-4 py-2 w-28">Type</th>
                      <th className="px-4 py-2 w-20 text-right">Quantity</th>
                      <th className="px-4 py-2 w-24 text-right">Price (₹)</th>
                      <th className="px-4 py-2 w-24 text-right">Total (₹)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 text-slate-900 bg-white">
                    {selectedAdjustment.items.map((it, idx) => (
                      <tr key={idx} className="hover:bg-slate-50/60">
                        <td className="px-4 py-2.5 font-mono">{idx + 1}</td>
                        <td className="px-4 py-2.5">
                           <p className="font-bold text-slate-900">{it.product?.name}</p>
                           <span className="text-[10px] text-slate-500 font-mono">Code: {it.product?.code} | Barcode: {it.product?.barcodeValue || 'N/A'}</span>
                        </td>
                        <td className="px-4 py-2.5 text-slate-500 font-semibold">{it.product?.color || '—'}</td>
                        <td className="px-4 py-2.5">
                          <span className={`font-bold ${it.type === 'Addition' ? 'text-emerald-700' : 'text-red-700'}`}>
                            {it.type}
                          </span>
                        </td>
                        <td className="px-4 py-2.5 text-right font-semibold">{Number(it.quantity).toFixed(2)}</td>
                        <td className="px-4 py-2.5 text-right font-mono">₹{Number(it.price).toFixed(2)}</td>
                        <td className="px-4 py-2.5 text-right font-bold font-mono">₹{Number(it.total).toFixed(2)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Notes and creator footer */}
              <div className="flex flex-col md:flex-row justify-between items-start gap-4">
                {/* Note section */}
                <div className="w-full md:w-7/12 border border-slate-200 p-3.5 rounded-xl bg-slate-50/80 text-slate-800">
                  <span className="block font-bold text-[10px] text-slate-400 uppercase tracking-wider mb-1">Note:</span>
                  <p className="text-xs leading-normal whitespace-pre-wrap">{selectedAdjustment.notes || 'No description note entered.'}</p>
                </div>
                {/* Creator info */}
                <div className="w-full md:w-4/12 border border-slate-200 p-3.5 rounded-xl bg-slate-50/80 text-slate-800 space-y-1 text-xs">
                  <p><span className="font-bold text-slate-400 uppercase text-[9px] block">Created by:</span> <span className="font-semibold text-slate-900">{selectedAdjustment.createdBy?.name || 'Administrator'}</span></p>
                  <p className="pt-1"><span className="font-bold text-slate-400 uppercase text-[9px] block">Date:</span> <span className="font-semibold text-slate-900">{new Date(selectedAdjustment.date).toLocaleString('en-IN')}</span></p>
                </div>
              </div>
            </div>

            {/* Modal actions footer */}
            <div className="flex justify-end space-x-2 border-t pt-3 dark:border-slate-800">
              <button
                onClick={() => setShowDetailModal(false)}
                className="bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700/80 text-slate-650 dark:text-slate-300 px-4 py-2 rounded-xl text-xs font-semibold"
              >
                Close Details
              </button>
            </div>
          </div>
        </div>
      )}

      {/* PRINT-ONLY AREA: Renders hidden on browser screen, active on print triggers */}
      {selectedAdjustment && (
        <div className="hidden print-area bg-white text-black font-sans min-h-screen p-8 text-xs leading-normal">
          {/* DEEPALI Styled Banner Logo */}
          <div className="flex justify-center mb-6">
            <div className="bg-[#D92121] text-white px-12 py-3 flex flex-col items-center justify-center font-bold tracking-[0.25em] text-3xl uppercase font-sans rounded border border-red-700 w-full max-w-sm text-center">
              DEEPALI
            </div>
          </div>

          {/* Meta details and Barcode block */}
          <div className="flex justify-between items-center border border-black p-4 rounded-sm bg-white mb-6">
            <div className="space-y-1 font-semibold">
              <p>Date: {new Date(selectedAdjustment.date).toLocaleString('en-IN')}</p>
              <p>Reference: {selectedAdjustment.referenceNo}</p>
              <p>Warehouse: {selectedAdjustment.warehouse?.name}</p>
            </div>
            <div className="flex items-center space-x-4">
              {barcodeData?.barcodeImage && (
                <img src={barcodeData.barcodeImage} alt="Reference Barcode" className="h-9 object-contain" />
              )}
              {barcodeData?.qrCodeImage && (
                <img src={barcodeData.qrCodeImage} alt="Reference QR Code" className="h-10 w-10 object-contain border" />
              )}
            </div>
          </div>

          {/* Items details table */}
          <div className="border border-black rounded-sm overflow-hidden mb-6">
            <table className="w-full text-left border-collapse text-[10px]">
              <thead>
                <tr className="bg-[#2B6CB0] text-white font-bold border-b border-black">
                  <th className="px-3 py-1.5 w-10 border-r border-black">No</th>
                  <th className="px-3 py-1.5 border-r border-black">Description</th>
                  <th className="px-3 py-1.5 w-20 border-r border-black">Variant</th>
                  <th className="px-3 py-1.5 w-20 border-r border-black">Type</th>
                  <th className="px-3 py-1.5 w-16 text-right border-r border-black">Quantity</th>
                  <th className="px-3 py-1.5 w-20 text-right border-r border-black">Price (₹)</th>
                  <th className="px-3 py-1.5 w-20 text-right">Total (₹)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-black text-black">
                {selectedAdjustment.items.map((it, idx) => (
                  <tr key={idx} className="border-b border-black">
                    <td className="px-3 py-1.5 font-mono border-r border-black">{idx + 1}</td>
                    <td className="px-3 py-1.5 border-r border-black">
                      <p className="font-bold">{it.product?.name}</p>
                      <span className="font-mono text-[9px]">Code: {it.product?.code}</span>
                    </td>
                    <td className="px-3 py-1.5 border-r border-black">{it.product?.color || '—'}</td>
                    <td className="px-3 py-1.5 font-bold border-r border-black">{it.type}</td>
                    <td className="px-3 py-1.5 text-right border-r border-black">{Number(it.quantity).toFixed(2)}</td>
                    <td className="px-3 py-1.5 text-right font-mono border-r border-black">₹{Number(it.price).toFixed(2)}</td>
                    <td className="px-3 py-1.5 text-right font-bold font-mono">₹{Number(it.total).toFixed(2)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Notes and creator footer */}
          <div className="flex justify-between items-start gap-4">
            {/* Note section */}
            <div className="w-7/12 border border-black p-3 rounded-sm min-h-[60px]">
              <span className="block font-bold text-[9px] text-gray-500 uppercase mb-1">Note:</span>
              <p className="whitespace-pre-wrap">{selectedAdjustment.notes || 'No description note entered.'}</p>
            </div>
            {/* Creator info */}
            <div className="w-4/12 border border-black p-3 rounded-sm space-y-1">
              <p><span className="font-bold text-gray-500 uppercase text-[9px] block">Created by:</span> <span className="font-bold text-black">{selectedAdjustment.createdBy?.name || 'Administrator'}</span></p>
              <p className="pt-1"><span className="font-bold text-gray-500 uppercase text-[9px] block">Date:</span> <span className="font-bold text-black">{new Date(selectedAdjustment.date).toLocaleString('en-IN')}</span></p>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default Adjustments;
