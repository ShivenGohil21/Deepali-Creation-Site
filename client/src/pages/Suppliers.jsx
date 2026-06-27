import React, { useState, useEffect } from 'react';
import { useSelector } from 'react-redux';
import API from '../utils/api';
import { Plus, Users, Search, Edit2, Trash2, Eye, X, FileText } from 'lucide-react';

const Suppliers = () => {
  const { user } = useSelector((state) => state.auth);
  const [suppliers, setSuppliers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [msg, setMsg] = useState({ text: '', type: 'success' });

  // Modal settings
  const [showAddEditModal, setShowAddEditModal] = useState(false);
  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const [editingSupplier, setEditingSupplier] = useState(null);

  // History ledger data
  const [historySupplier, setHistorySupplier] = useState(null);
  const [supplierPurchases, setSupplierPurchases] = useState([]);

  // Form State
  const [formName, setFormName] = useState('');
  const [formMobile, setFormMobile] = useState('');
  const [formEmail, setFormEmail] = useState('');
  const [formGstNumber, setFormGstNumber] = useState('');
  const [formAddress, setFormAddress] = useState('');
  const [formBalance, setFormBalance] = useState(0);

  const showMsg = (text, type = 'success') => {
    setMsg({ text, type });
    setTimeout(() => setMsg({ text: '', type: 'success' }), 5000);
  };

  const fetchSuppliers = async () => {
    try {
      setLoading(true);
      const res = await API.get('/suppliers');
      if (res.data.success) {
        setSuppliers(res.data.data);
      }
    } catch (err) {
      showMsg(err.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSuppliers();
  }, []);

  const handleOpenAdd = () => {
    setEditingSupplier(null);
    setFormName('');
    setFormMobile('');
    setFormEmail('');
    setFormGstNumber('');
    setFormAddress('');
    setFormBalance(0);
    setShowAddEditModal(true);
  };

  const handleOpenEdit = (s) => {
    setEditingSupplier(s);
    setFormName(s.name);
    setFormMobile(s.mobile);
    setFormEmail(s.email || '');
    setFormGstNumber(s.gstNumber || '');
    setFormAddress(s.address || '');
    setFormBalance(s.balance || 0);
    setShowAddEditModal(true);
  };

  const handleSaveSupplier = async (e) => {
    e.preventDefault();
    if (!formName || !formMobile) return;

    const payload = {
      name: formName,
      mobile: formMobile,
      email: formEmail,
      gstNumber: formGstNumber,
      address: formAddress,
      balance: Number(formBalance)
    };

    try {
      if (editingSupplier) {
        const res = await API.put(`/suppliers/${editingSupplier._id}`, payload);
        if (res.data.success) {
          showMsg('Supplier details updated');
          fetchSuppliers();
          setShowAddEditModal(false);
        }
      } else {
        const res = await API.post('/suppliers', payload);
        if (res.data.success) {
          showMsg('Supplier registered successfully');
          fetchSuppliers();
          setShowAddEditModal(false);
        }
      }
    } catch (err) {
      showMsg(err.message, 'error');
    }
  };

  const handleDeleteSupplier = async (id, name) => {
    if (!window.confirm(`Are you sure you want to delete supplier "${name}"?`)) return;

    try {
      const res = await API.delete(`/suppliers/${id}`);
      if (res.data.success) {
        showMsg('Supplier record deleted.');
        fetchSuppliers();
      }
    } catch (err) {
      showMsg(err.message, 'error');
    }
  };

  const handleViewHistory = async (id) => {
    try {
      const res = await API.get(`/suppliers/${id}`);
      if (res.data.success) {
        setHistorySupplier(res.data.data);
        setSupplierPurchases(res.data.history || []);
        setShowHistoryModal(true);
      }
    } catch (err) {
      showMsg(err.message, 'error');
    }
  };

  const filteredSuppliers = suppliers.filter(s => 
    s.name.toLowerCase().includes(search.toLowerCase()) ||
    s.mobile.includes(search) ||
    (s.gstNumber && s.gstNumber.toLowerCase().includes(search.toLowerCase()))
  );

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
          <h1 className="text-2xl font-bold text-slate-800 dark:text-white">Supplier Directory</h1>
          <p className="text-sm text-slate-400 dark:text-slate-500 mt-0.5">Manage vendors and track outstanding purchase ledger balances.</p>
        </div>
        <button
          onClick={handleOpenAdd}
          className="flex items-center space-x-1.5 bg-primary-600 hover:bg-primary-500 text-white px-4 py-2.5 rounded-xl font-semibold text-xs transition-all active:scale-95 shadow-md"
          id="add-supplier-btn"
        >
          <Plus size={16} />
          <span>Add Supplier</span>
        </button>
      </div>

      {/* Search Input Bar */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800/80 rounded-2xl p-4 shadow-sm">
        <div className="relative max-w-sm">
          <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-slate-400">
            <Search size={16} />
          </span>
          <input
            type="text"
            placeholder="Search by name, mobile, GST..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-850 rounded-xl py-2 pl-9 pr-4 text-xs focus:outline-none"
            id="supplier-search-input"
          />
        </div>
      </div>

      {/* Suppliers Data Table */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800/80 rounded-2xl shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50/70 dark:bg-slate-950/40 border-b border-slate-200 dark:border-slate-800 text-slate-400 font-semibold text-xs">
                <th className="px-6 py-3.5">Supplier Name</th>
                <th className="px-6 py-3.5">Mobile</th>
                <th className="px-6 py-3.5">Email</th>
                <th className="px-6 py-3.5">GST Number</th>
                <th className="px-6 py-3.5">Address</th>
                <th className="px-6 py-3.5 text-right">Ledger Balance</th>
                <th className="px-6 py-3.5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 text-slate-700 dark:text-slate-300 text-xs">
              {loading ? (
                <tr>
                  <td colSpan="7" className="text-center py-12">
                    <div className="w-8 h-8 border-2 border-primary-500 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
                    <span>Loading vendors list...</span>
                  </td>
                </tr>
              ) : filteredSuppliers.length === 0 ? (
                <tr>
                  <td colSpan="7" className="text-center py-12 text-slate-400">
                    No suppliers found matching search details.
                  </td>
                </tr>
              ) : (
                filteredSuppliers.map((s) => (
                  <tr key={s._id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors">
                    <td className="px-6 py-3.5 font-semibold text-slate-900 dark:text-white">{s.name}</td>
                    <td className="px-6 py-3.5 font-mono text-[11px]">{s.mobile}</td>
                    <td className="px-6 py-3.5 text-slate-400">{s.email || 'N/A'}</td>
                    <td className="px-6 py-3.5 font-mono text-[10px] text-slate-450">{s.gstNumber || 'N/A'}</td>
                    <td className="px-6 py-3.5 truncate max-w-xs">{s.address || 'N/A'}</td>
                    <td className="px-6 py-3.5 text-right font-bold">
                      <span className={s.balance > 0 ? 'text-amber-600' : 'text-slate-700 dark:text-slate-300'}>
                        ₹{s.balance.toFixed(2)}
                      </span>
                    </td>
                    <td className="px-6 py-3.5 text-right space-x-1 whitespace-nowrap">
                      <button
                        onClick={() => handleViewHistory(s._id)}
                        className="p-1.5 text-slate-400 hover:text-primary-500 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition"
                        title="Purchase Ledger"
                        id={`history-s-${s.name.replace(/\s+/g, '-')}`}
                      >
                        <Eye size={15} />
                      </button>
                      <button
                        onClick={() => handleOpenEdit(s)}
                        className="p-1.5 text-slate-400 hover:text-blue-500 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition"
                        title="Edit Info"
                        id={`edit-s-${s.name.replace(/\s+/g, '-')}`}
                      >
                        <Edit2 size={15} />
                      </button>
                      {(user?.role === 'Super Admin' || user?.role === 'Admin') && (
                        <button
                          onClick={() => handleDeleteSupplier(s._id, s.name)}
                          className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition"
                          title="Delete Record"
                          id={`delete-s-${s.name.replace(/\s+/g, '-')}`}
                        >
                          <Trash2 size={15} />
                        </button>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* MODAL 1: Add/Edit Supplier */}
      {showAddEditModal && (
        <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm z-40 flex items-center justify-center p-4 overflow-y-auto no-print">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl w-full max-w-md shadow-2xl p-6 flex flex-col my-auto max-h-[90vh]">
            <div className="flex items-center justify-between border-b pb-3 dark:border-slate-800 shrink-0">
              <h3 className="text-xl font-bold text-slate-800 dark:text-white">
                {editingSupplier ? 'Edit Supplier Details' : 'Add Supplier Profile'}
              </h3>
              <button onClick={() => setShowAddEditModal(false)} className="text-slate-400 hover:text-slate-250">
                <X size={22} />
              </button>
            </div>

            <form onSubmit={handleSaveSupplier} className="flex-1 overflow-y-auto space-y-4 text-sm font-sans pt-4 pr-1 min-h-0">
              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider">Supplier Name *</label>
                <input
                  type="text"
                  required
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-850 rounded-xl py-2.5 px-3.5 text-slate-700 dark:text-slate-250 text-sm font-semibold focus:outline-none focus:border-primary-500 shadow-sm"
                  placeholder="e.g. Surat Cotton Mills"
                />
              </div>
              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider">Mobile Number *</label>
                <input
                  type="text"
                  required
                  value={formMobile}
                  onChange={(e) => setFormMobile(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-850 rounded-xl py-2.5 px-3.5 text-slate-700 dark:text-slate-250 text-sm font-semibold focus:outline-none focus:border-primary-500 shadow-sm"
                  placeholder="e.g. 9888877777"
                />
              </div>
              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider">GST Number</label>
                <input
                  type="text"
                  value={formGstNumber}
                  onChange={(e) => setFormGstNumber(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-850 rounded-xl py-2.5 px-3.5 text-slate-700 dark:text-slate-250 text-sm font-semibold focus:outline-none focus:border-primary-500 shadow-sm"
                  placeholder="e.g. 27AAAAA1111A1Z1"
                />
              </div>
              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider">Email Address</label>
                <input
                  type="email"
                  value={formEmail}
                  onChange={(e) => setFormEmail(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-850 rounded-xl py-2.5 px-3.5 text-slate-700 dark:text-slate-250 text-sm font-semibold focus:outline-none focus:border-primary-500 shadow-sm"
                  placeholder="e.g. sales@cottonmills.com"
                />
              </div>
              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider">Ledger Balance (₹)</label>
                <input
                  type="number"
                  value={formBalance}
                  onChange={(e) => setFormBalance(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-850 rounded-xl py-2.5 px-3.5 text-slate-700 dark:text-slate-250 text-sm font-semibold focus:outline-none focus:border-primary-500 shadow-sm"
                  placeholder="Outstanding (+ we owe supplier, - they owe us)"
                />
              </div>
              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider">Address</label>
                <input
                  type="text"
                  value={formAddress}
                  onChange={(e) => setFormAddress(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-850 rounded-xl py-2.5 px-3.5 text-slate-700 dark:text-slate-250 text-sm font-semibold focus:outline-none focus:border-primary-500 shadow-sm"
                  placeholder="Warehouse office location..."
                />
              </div>
            </form>

            <div className="flex items-center justify-end space-x-2 border-t pt-3 dark:border-slate-800 shrink-0">
              <button
                type="button"
                onClick={() => setShowAddEditModal(false)}
                className="bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700/80 text-slate-650 dark:text-slate-300 px-4 py-2 rounded-xl text-xs font-semibold"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveSupplier}
                className="bg-primary-600 hover:bg-primary-500 text-white px-5 py-2 rounded-xl text-xs font-bold shadow-md active:scale-95 transition-all"
                id="supplier-save-btn"
              >
                Save Supplier
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 2: Purchases History & Ledger logs */}
      {showHistoryModal && historySupplier && (
        <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm z-40 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl w-full max-w-2xl shadow-2xl p-6 space-y-4">
            <div className="flex items-center justify-between border-b pb-2.5 dark:border-slate-800">
              <div>
                <h3 className="text-lg font-bold text-slate-800 dark:text-white">Supplier Ledger Statement</h3>
                <p className="text-xs text-slate-400 mt-0.5">Purchases log with vendor **{historySupplier.name}**</p>
              </div>
              <button onClick={() => setShowHistoryModal(false)} className="text-slate-400 hover:text-slate-250">
                <X size={20} />
              </button>
            </div>

            {/* Invoices List */}
            <div className="max-h-80 overflow-y-auto space-y-3 pr-1 text-xs">
              {supplierPurchases.length === 0 ? (
                <div className="py-12 text-center text-slate-400">
                  No purchases bills recorded with this supplier.
                </div>
              ) : (
                supplierPurchases.map((pur) => (
                  <div 
                    key={pur._id} 
                    className="border border-slate-200 dark:border-slate-800 p-3.5 rounded-2xl bg-slate-50/20 dark:bg-slate-950/40 flex items-center justify-between hover:bg-slate-50 dark:hover:bg-slate-800/40 transition"
                  >
                    <div className="space-y-1">
                      <div className="flex items-center space-x-1.5">
                        <span className="p-1 bg-slate-100 dark:bg-slate-800 rounded text-slate-500">
                          <FileText size={14} />
                        </span>
                        <span className="font-bold text-slate-800 dark:text-slate-250 font-mono text-[11px]">{pur.purchaseNumber}</span>
                      </div>
                      <p className="text-slate-400 text-[10px]">
                        Date: {new Date(pur.date).toLocaleDateString()} | Pay Status: {pur.paymentStatus}
                      </p>
                    </div>

                    <div className="text-right shrink-0">
                      <p className="font-extrabold text-sm text-slate-800 dark:text-white">₹{pur.grandTotal.toFixed(2)}</p>
                      <span className="text-[10px] text-slate-400">Paid: ₹{pur.amountPaid.toFixed(2)}</span>
                    </div>
                  </div>
                ))
              )}
            </div>

            <div className="flex items-center justify-between border-t pt-3 dark:border-slate-800 text-xs">
              <div className="flex items-center space-x-2 text-slate-500">
                <span>We owe Supplier:</span>
                <span className={`font-bold ${historySupplier.balance > 0 ? 'text-amber-600' : 'text-slate-700 dark:text-slate-350'}`}>
                  ₹{historySupplier.balance.toFixed(2)}
                </span>
              </div>
              <button
                type="button"
                onClick={() => setShowHistoryModal(false)}
                className="bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700/80 text-slate-650 dark:text-slate-300 px-4 py-2 rounded-xl text-xs font-semibold"
              >
                Close Ledger
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Suppliers;
