import React, { useState, useEffect } from 'react';
import { useSelector } from 'react-redux';
import API from '../utils/api';
import { Plus, Warehouse, MapPin, Edit2, Trash2, ArrowLeftRight, X, AlertTriangle } from 'lucide-react';

const Warehouses = () => {
  const { user } = useSelector((state) => state.auth);
  const [warehouses, setWarehouses] = useState([]);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [msg, setMsg] = useState({ text: '', type: 'success' });

  // Modals state
  const [showAddEditModal, setShowAddEditModal] = useState(false);
  const [showTransferModal, setShowTransferModal] = useState(false);
  const [editingWarehouse, setEditingWarehouse] = useState(null);

  // Add/Edit Form State
  const [formName, setFormName] = useState('');
  const [formLocation, setFormLocation] = useState('');
  const [formAddress, setFormAddress] = useState('');
  const [formDescription, setFormDescription] = useState('');

  // Stock Transfer Form State
  const [transferProduct, setTransferProduct] = useState('');
  const [transferFrom, setTransferFrom] = useState('');
  const [transferTo, setTransferTo] = useState('');
  const [transferQty, setTransferQty] = useState('');
  const [maxTransferQty, setMaxTransferQty] = useState(0);

  const showMsg = (text, type = 'success') => {
    setMsg({ text, type });
    setTimeout(() => setMsg({ text: '', type: 'success' }), 5000);
  };

  const fetchWarehousesData = async () => {
    try {
      setLoading(true);
      const [whRes, prodRes] = await Promise.all([
        API.get('/warehouses'),
        API.get('/products')
      ]);

      if (whRes.data.success) setWarehouses(whRes.data.data);
      if (prodRes.data.success) setProducts(prodRes.data.data);
    } catch (err) {
      showMsg(err.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchWarehousesData();
  }, []);

  const handleOpenAdd = () => {
    setEditingWarehouse(null);
    setFormName('');
    setFormLocation('');
    setFormAddress('');
    setFormDescription('');
    setShowAddEditModal(true);
  };

  const handleOpenEdit = (wh) => {
    setEditingWarehouse(wh);
    setFormName(wh.name);
    setFormLocation(wh.location || '');
    setFormAddress(wh.address || '');
    setFormDescription(wh.description || '');
    setShowAddEditModal(true);
  };

  const handleSaveWarehouse = async (e) => {
    e.preventDefault();
    if (!formName) return;

    const payload = {
      name: formName,
      location: formLocation,
      address: formAddress,
      description: formDescription
    };

    try {
      if (editingWarehouse) {
        const res = await API.put(`/warehouses/${editingWarehouse._id}`, payload);
        if (res.data.success) {
          showMsg('Warehouse updated successfully');
          fetchWarehousesData();
          setShowAddEditModal(false);
        }
      } else {
        const res = await API.post('/warehouses', payload);
        if (res.data.success) {
          showMsg('Warehouse created successfully');
          fetchWarehousesData();
          setShowAddEditModal(false);
        }
      }
    } catch (err) {
      showMsg(err.message, 'error');
    }
  };

  const handleDeleteWarehouse = async (id, name) => {
    if (name === 'Deepali Main Showroom') {
      showMsg('Cannot delete main showroom', 'error');
      return;
    }
    if (!window.confirm(`Are you sure you want to delete "${name}"?`)) return;
    try {
      const res = await API.delete(`/warehouses/${id}`);
      if (res.data.success) {
        showMsg('Warehouse deleted.');
        fetchWarehousesData();
      }
    } catch (err) {
      showMsg(err.message, 'error');
    }
  };

  // Transfer hooks
  const handleOpenTransfer = () => {
    setTransferProduct('');
    setTransferFrom('');
    setTransferTo('');
    setTransferQty('');
    setMaxTransferQty(0);
    setShowTransferModal(true);
  };

  const handleTransferProductChange = (productId) => {
    setTransferProduct(productId);
    const prod = products.find(p => p._id === productId);
    
    if (prod && transferFrom) {
      const stock = prod.warehouseStock.find(s => s.warehouse === transferFrom);
      setMaxTransferQty(stock ? stock.quantity : 0);
    } else {
      setMaxTransferQty(0);
    }
  };

  const handleTransferFromChange = (fromWhId) => {
    setTransferFrom(fromWhId);
    const prod = products.find(p => p._id === transferProduct);
    
    if (prod && fromWhId) {
      const stock = prod.warehouseStock.find(s => s.warehouse === fromWhId);
      setMaxTransferQty(stock ? stock.quantity : 0);
    } else {
      setMaxTransferQty(0);
    }
  };

  const handleExecTransfer = async (e) => {
    e.preventDefault();
    if (!transferProduct || !transferFrom || !transferTo || !transferQty) {
      showMsg('Please fill all stock transfer fields', 'error');
      return;
    }

    const qty = Number(transferQty);
    if (qty > maxTransferQty) {
      showMsg('Cannot transfer more than available stock', 'error');
      return;
    }

    try {
      const res = await API.post('/warehouses/transfer', {
        productId: transferProduct,
        fromWarehouseId: transferFrom,
        toWarehouseId: transferTo,
        quantity: qty
      });

      if (res.data.success) {
        showMsg('Stock transferred and logged successfully!');
        fetchWarehousesData();
        setShowTransferModal(false);
      }
    } catch (err) {
      showMsg(err.message, 'error');
    }
  };

  return (
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
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 dark:text-white">Warehouse Management</h1>
          <p className="text-sm text-slate-400 dark:text-slate-500 mt-0.5">Configure storage centers, track logs, and execute stock transfers.</p>
        </div>
        <div className="flex items-center space-x-2">
          <button
            onClick={handleOpenTransfer}
            className="flex items-center space-x-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 dark:bg-slate-800 dark:hover:bg-slate-700 dark:text-slate-300 px-4 py-2.5 rounded-xl font-semibold text-xs transition-all"
            id="warehouse-transfer-btn"
          >
            <ArrowLeftRight size={16} />
            <span>Stock Transfer</span>
          </button>
          {(user?.role === 'Super Admin' || user?.role === 'Admin') && (
            <button
              onClick={handleOpenAdd}
              className="flex items-center space-x-1.5 bg-primary-600 hover:bg-primary-500 text-white px-4 py-2.5 rounded-xl font-semibold text-xs shadow-md transition-all active:scale-95"
              id="add-warehouse-btn"
            >
              <Plus size={16} />
              <span>Add Warehouse</span>
            </button>
          )}
        </div>
      </div>

      {/* Warehouse Grid Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {loading ? (
          <div className="col-span-full py-12 text-center">
            <div className="w-8 h-8 border-2 border-primary-500 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
            <p className="text-xs text-slate-450">Loading warehouse profiles...</p>
          </div>
        ) : warehouses.length === 0 ? (
          <div className="col-span-full py-12 text-center text-slate-400 text-xs">
            No warehouses registered. Create a warehouse location to allocate product stocks.
          </div>
        ) : (
          warehouses.map((wh) => {
            // Count total stock items in this warehouse
            let totalItems = 0;
            products.forEach(p => {
              const s = p.warehouseStock.find(st => st.warehouse === wh._id);
              if (s) totalItems += s.quantity;
            });

            return (
              <div 
                key={wh._id} 
                className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800/80 rounded-2xl p-5 shadow-sm hover-scale flex flex-col justify-between"
              >
                <div className="space-y-3">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center space-x-2">
                      <span className="p-2 bg-primary-100 dark:bg-primary-950/20 text-primary-600 dark:text-primary-400 rounded-lg">
                        <Warehouse size={18} />
                      </span>
                      <h3 className="font-bold text-slate-800 dark:text-slate-100 text-sm leading-tight truncate">{wh.name}</h3>
                    </div>
                    
                    <div className="flex items-center space-x-1 shrink-0">
                      {(user?.role === 'Super Admin' || user?.role === 'Admin') && (
                        <>
                          <button 
                            onClick={() => handleOpenEdit(wh)}
                            className="p-1 text-slate-450 hover:text-blue-500 rounded"
                            title="Edit Details"
                            id={`edit-wh-${wh.name.replace(/\s+/g, '-')}`}
                          >
                            <Edit2 size={13} />
                          </button>
                          <button 
                            onClick={() => handleDeleteWarehouse(wh._id, wh.name)}
                            className="p-1 text-slate-450 hover:text-red-500 rounded"
                            title="Delete Warehouse"
                            id={`delete-wh-${wh.name.replace(/\s+/g, '-')}`}
                          >
                            <Trash2 size={13} />
                          </button>
                        </>
                      )}
                    </div>
                  </div>

                  <p className="text-xs text-slate-400 dark:text-slate-500 leading-normal line-clamp-2 min-h-[2rem]">
                    {wh.description || 'No description provided.'}
                  </p>

                  <div className="flex items-center text-xs text-slate-500 space-x-1.5 pt-1">
                    <MapPin size={14} className="shrink-0" />
                    <span className="truncate">{wh.location || 'Bazar Location'}</span>
                  </div>
                </div>

                <div className="border-t dark:border-slate-850 mt-4 pt-3 flex justify-between items-center text-xs">
                  <span className="text-slate-450">Stock Valuation:</span>
                  <span className="font-bold text-slate-800 dark:text-slate-200">{totalItems} Pieces</span>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* MODAL 1: Add/Edit Warehouse */}
      {showAddEditModal && (
        <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm z-40 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl w-full max-w-md shadow-2xl p-6 space-y-4">
            <div className="flex items-center justify-between border-b pb-2.5 dark:border-slate-800">
              <h3 className="text-lg font-bold text-slate-800 dark:text-white">
                {editingWarehouse ? 'Edit Warehouse Details' : 'Add New Warehouse'}
              </h3>
              <button onClick={() => setShowAddEditModal(false)} className="text-slate-400 hover:text-slate-250">
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSaveWarehouse} className="space-y-4 text-xs">
              <div className="space-y-1">
                <span>Warehouse Name *</span>
                <input
                  type="text"
                  required
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 rounded-xl py-2.5 px-3 focus:outline-none"
                  placeholder="e.g. Surat Stockroom B"
                />
              </div>
              <div className="space-y-1">
                <span>City Location</span>
                <input
                  type="text"
                  value={formLocation}
                  onChange={(e) => setFormLocation(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 rounded-xl py-2.5 px-3 focus:outline-none"
                  placeholder="e.g. Surat, Gujarat"
                />
              </div>
              <div className="space-y-1">
                <span>Physical Address</span>
                <input
                  type="text"
                  value={formAddress}
                  onChange={(e) => setFormAddress(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 rounded-xl py-2.5 px-3 focus:outline-none"
                  placeholder="Plot details, landmark..."
                />
              </div>
              <div className="space-y-1">
                <span>Description / Notes</span>
                <textarea
                  value={formDescription}
                  onChange={(e) => setFormDescription(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 rounded-xl py-2 px-3 focus:outline-none h-16"
                  placeholder="Summary notes..."
                />
              </div>

              <div className="flex items-center justify-end space-x-2 border-t pt-3 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowAddEditModal(false)}
                  className="bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700/80 text-slate-600 dark:text-slate-300 px-4 py-2 rounded-xl text-xs"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="bg-primary-600 hover:bg-primary-500 text-white px-5 py-2 rounded-xl text-xs font-bold"
                  id="warehouse-save-btn"
                >
                  Save Location
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: Stock Transfer */}
      {showTransferModal && (
        <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm z-40 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl w-full max-w-md shadow-2xl p-6 space-y-4">
            <div className="flex items-center justify-between border-b pb-2.5 dark:border-slate-800">
              <h3 className="text-lg font-bold text-slate-800 dark:text-white">Execute Stock Transfer</h3>
              <button onClick={() => setShowTransferModal(false)} className="text-slate-400 hover:text-slate-250">
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleExecTransfer} className="space-y-4 text-xs font-sans">
              
              {/* Product selector */}
              <div className="space-y-1">
                <span>Select Product</span>
                <select
                  required
                  value={transferProduct}
                  onChange={(e) => handleTransferProductChange(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 rounded-xl py-2.5 px-3 focus:outline-none"
                >
                  <option value="">Choose item...</option>
                  {products.map(p => (
                    <option key={p._id} value={p._id}>{p.name} ({p.code} | Barcode: {p.barcodeValue || '-'})</option>
                  ))}
                </select>
              </div>

              {/* Warehouses from/to */}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <span>From Warehouse</span>
                  <select
                    required
                    value={transferFrom}
                    onChange={(e) => handleTransferFromChange(e.target.value)}
                    className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 rounded-xl py-2 px-3 focus:outline-none"
                  >
                    <option value="">Choose...</option>
                    {warehouses.map(w => (
                      <option key={w._id} value={w._id}>{w.name}</option>
                    ))}
                  </select>
                </div>
                <div className="space-y-1">
                  <span>To Warehouse</span>
                  <select
                    required
                    value={transferTo}
                    onChange={(e) => setTransferTo(e.target.value)}
                    className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 rounded-xl py-2 px-3 focus:outline-none"
                  >
                    <option value="">Choose...</option>
                    {warehouses.map(w => (
                      <option key={w._id} value={w._id}>{w.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Quantity setting */}
              <div className="grid grid-cols-2 gap-3 items-end">
                <div className="space-y-1">
                  <span>Transfer Quantity</span>
                  <input
                    type="number"
                    required
                    min="1"
                    max={maxTransferQty}
                    value={transferQty}
                    onChange={(e) => setTransferQty(e.target.value)}
                    className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 rounded-xl py-2 px-3 focus:outline-none"
                    placeholder="Qty"
                    id="transfer-qty-input"
                  />
                </div>
                <div className="bg-slate-50 dark:bg-slate-950/50 p-2.5 rounded-xl border flex flex-col justify-center text-center">
                  <span className="text-[9px] text-slate-400 block font-bold">Max Available</span>
                  <span className={`font-bold text-sm ${maxTransferQty > 0 ? 'text-emerald-500' : 'text-red-500'}`}>
                    {maxTransferQty} Units
                  </span>
                </div>
              </div>

              {transferFrom === transferTo && transferFrom && (
                <div className="bg-red-500/10 border border-red-500/20 text-red-500 p-2.5 rounded-xl flex items-center space-x-1">
                  <AlertTriangle size={14} />
                  <span>Cannot transfer to the same warehouse location!</span>
                </div>
              )}

              <div className="flex items-center justify-end space-x-2 border-t pt-3 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowTransferModal(false)}
                  className="bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700/80 text-slate-600 dark:text-slate-300 px-4 py-2 rounded-xl text-xs"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={!transferProduct || !transferFrom || !transferTo || transferFrom === transferTo || !transferQty || Number(transferQty) > maxTransferQty}
                  className="bg-primary-600 hover:bg-primary-500 text-white px-5 py-2 rounded-xl text-xs font-bold disabled:bg-primary-800 disabled:text-slate-450"
                  id="execute-transfer-submit-btn"
                >
                  Execute Transfer
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Warehouses;
