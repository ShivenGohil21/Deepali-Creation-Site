import React, { useState, useEffect } from 'react';
import { useSelector } from 'react-redux';
import API from '../utils/api';
import { Plus, Users, Search, Edit2, Trash2, Eye, X, Receipt } from 'lucide-react';
import Modal from '../components/Modal';

const Customers = () => {
  const { user } = useSelector((state) => state.auth);
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [msg, setMsg] = useState({ text: '', type: 'success' });

  // Modal settings
  const [showAddEditModal, setShowAddEditModal] = useState(false);
  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState(null);
  
  // History data
  const [historyCustomer, setHistoryCustomer] = useState(null);
  const [customerSales, setCustomerSales] = useState([]);

  // Form State
  const [formName, setFormName] = useState('');
  const [formMobile, setFormMobile] = useState('');
  const [formEmail, setFormEmail] = useState('');
  const [formAddress, setFormAddress] = useState('');
  const [formBalance, setFormBalance] = useState(0);

  const showMsg = (text, type = 'success') => {
    setMsg({ text, type });
    setTimeout(() => setMsg({ text: '', type: 'success' }), 5000);
  };

  const fetchCustomers = async () => {
    try {
      setLoading(true);
      const res = await API.get('/customers');
      if (res.data.success) {
        setCustomers(res.data.data);
      }
    } catch (err) {
      showMsg(err.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCustomers();
  }, []);

  const handleOpenAdd = () => {
    setEditingCustomer(null);
    setFormName('');
    setFormMobile('');
    setFormEmail('');
    setFormAddress('');
    setFormBalance(0);
    setShowAddEditModal(true);
  };

  const handleOpenEdit = (c) => {
    setEditingCustomer(c);
    setFormName(c.name);
    setFormMobile(c.mobile);
    setFormEmail(c.email || '');
    setFormAddress(c.address || '');
    setFormBalance(c.balance || 0);
    setShowAddEditModal(true);
  };

  const handleSaveCustomer = async (e) => {
    e.preventDefault();
    if (!formName || !formMobile) return;

    const payload = {
      name: formName,
      mobile: formMobile,
      email: formEmail,
      address: formAddress,
      balance: Number(formBalance)
    };

    try {
      if (editingCustomer) {
        const res = await API.put(`/customers/${editingCustomer._id}`, payload);
        if (res.data.success) {
          showMsg('Customer details updated');
          fetchCustomers();
          setShowAddEditModal(false);
        }
      } else {
        const res = await API.post('/customers', payload);
        if (res.data.success) {
          showMsg('Customer registered');
          fetchCustomers();
          setShowAddEditModal(false);
        }
      }
    } catch (err) {
      showMsg(err.message, 'error');
    }
  };

  const handleDeleteCustomer = async (id, name) => {
    if (name === 'Walk-in Customer') {
      showMsg('Cannot delete default Customer profile', 'error');
      return;
    }
    if (!window.confirm(`Are you sure you want to delete customer "${name}"?`)) return;

    try {
      const res = await API.delete(`/customers/${id}`);
      if (res.data.success) {
        showMsg('Customer record deleted.');
        fetchCustomers();
      }
    } catch (err) {
      showMsg(err.message, 'error');
    }
  };

  const handleViewHistory = async (id) => {
    try {
      const res = await API.get(`/customers/${id}`);
      if (res.data.success) {
        setHistoryCustomer(res.data.data);
        setCustomerSales(res.data.history || []);
        setShowHistoryModal(true);
      }
    } catch (err) {
      showMsg(err.message, 'error');
    }
  };

  const filteredCustomers = customers.filter(c => 
    c.name.toLowerCase().includes(search.toLowerCase()) ||
    c.mobile.includes(search) ||
    (c.email && c.email.toLowerCase().includes(search.toLowerCase()))
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
          <h1 className="text-2xl font-bold text-slate-800 dark:text-white">Customer Directory</h1>
          <p className="text-sm text-slate-400 dark:text-slate-500 mt-0.5">Manage customer files, outstanding credit balances, and buying history.</p>
        </div>
        <button
          onClick={handleOpenAdd}
          className="flex items-center space-x-1.5 bg-primary-600 hover:bg-primary-500 text-white px-4 py-2.5 rounded-xl font-semibold text-xs transition-all active:scale-95 shadow-md"
          id="add-customer-btn"
        >
          <Plus size={16} />
          <span>Add Customer</span>
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
            placeholder="Search by name or mobile..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-850 rounded-xl py-2 pl-9 pr-4 text-xs focus:outline-none"
            id="customer-search-input"
          />
        </div>
      </div>

      {/* Customers Data Table */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800/80 rounded-2xl shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50/70 dark:bg-slate-950/40 border-b border-slate-200 dark:border-slate-800 text-slate-400 font-semibold text-xs">
                <th className="px-6 py-3.5">Customer Name</th>
                <th className="px-6 py-3.5">Mobile</th>
                <th className="px-6 py-3.5">Email</th>
                <th className="px-6 py-3.5">Address</th>
                <th className="px-6 py-3.5 text-right">Credit Balance</th>
                <th className="px-6 py-3.5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 text-slate-700 dark:text-slate-300 text-xs">
              {loading ? (
                <tr>
                  <td colSpan="6" className="text-center py-12">
                    <div className="w-8 h-8 border-2 border-primary-500 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
                    <span>Loading customers list...</span>
                  </td>
                </tr>
              ) : filteredCustomers.length === 0 ? (
                <tr>
                  <td colSpan="6" className="text-center py-12 text-slate-400">
                    No customers found matching search details.
                  </td>
                </tr>
              ) : (
                filteredCustomers.map((c) => (
                  <tr key={c._id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors">
                    <td className="px-6 py-3.5 font-semibold text-slate-900 dark:text-white">{c.name}</td>
                    <td className="px-6 py-3.5 font-mono text-[11px]">{c.mobile}</td>
                    <td className="px-6 py-3.5 text-slate-400">{c.email || 'N/A'}</td>
                    <td className="px-6 py-3.5 truncate max-w-xs">{c.address || 'N/A'}</td>
                    <td className="px-6 py-3.5 text-right font-bold">
                      <span className={c.balance > 0 ? 'text-amber-600' : 'text-slate-700 dark:text-slate-300'}>
                        ₹{c.balance.toFixed(2)}
                      </span>
                    </td>
                    <td className="px-6 py-3.5 text-right space-x-1 whitespace-nowrap">
                      <button
                        onClick={() => handleViewHistory(c._id)}
                        className="p-1.5 text-slate-400 hover:text-primary-500 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition"
                        title="Sales History"
                        id={`history-c-${c.name.replace(/\s+/g, '-')}`}
                      >
                        <Eye size={15} />
                      </button>
                      <button
                        onClick={() => handleOpenEdit(c)}
                        className="p-1.5 text-slate-400 hover:text-blue-500 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition"
                        title="Edit Info"
                        id={`edit-c-${c.name.replace(/\s+/g, '-')}`}
                      >
                        <Edit2 size={15} />
                      </button>
                      {(user?.role === 'Super Admin' || user?.role === 'Admin') && (
                        <button
                          onClick={() => handleDeleteCustomer(c._id, c.name)}
                          className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition"
                          title="Delete Record"
                          id={`delete-c-${c.name.replace(/\s+/g, '-')}`}
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

      {/* MODAL 1: Add/Edit Customer */}
      <Modal
        isOpen={showAddEditModal}
        onClose={() => setShowAddEditModal(false)}
        title={editingCustomer ? 'Edit Customer' : 'Add Customer'}
        subtitle={editingCustomer ? 'Update customer information' : 'Register a new customer'}
        maxWidth="max-w-lg"
        showDefaultFooter={true}
        cancelLabel="Cancel"
        saveLabel="Save Record"
        onSave={handleSaveCustomer}
        saveButtonId="customer-save-btn"
      >
        <form onSubmit={handleSaveCustomer} className="space-y-4 text-sm">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider">Customer Name *</label>
              <input
                type="text"
                required
                value={formName}
                onChange={(e) => setFormName(e.target.value)}
                className="w-full bg-slate-800 border border-slate-700 rounded-lg py-2.5 px-3.5 text-slate-200 text-sm placeholder:text-slate-600 focus:outline-none focus:border-primary-500 focus:ring-1 focus:ring-primary-500/30 transition-all"
                placeholder="Suman Sharma"
              />
            </div>
            <div className="space-y-1.5">
              <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider">Mobile Number *</label>
              <input
                type="text"
                required
                value={formMobile}
                onChange={(e) => setFormMobile(e.target.value)}
                className="w-full bg-slate-800 border border-slate-700 rounded-lg py-2.5 px-3.5 text-slate-200 text-sm placeholder:text-slate-600 focus:outline-none focus:border-primary-500 focus:ring-1 focus:ring-primary-500/30 transition-all"
                placeholder="9898989898"
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider">Email Address</label>
              <input
                type="email"
                value={formEmail}
                onChange={(e) => setFormEmail(e.target.value)}
                className="w-full bg-slate-800 border border-slate-700 rounded-lg py-2.5 px-3.5 text-slate-200 text-sm placeholder:text-slate-600 focus:outline-none focus:border-primary-500 focus:ring-1 focus:ring-primary-500/30 transition-all"
                placeholder="suman@gmail.com"
              />
            </div>
            <div className="space-y-1.5">
              <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider">Credit Balance (₹)</label>
              <input
                type="number"
                value={formBalance}
                onChange={(e) => setFormBalance(e.target.value)}
                className="w-full bg-slate-800 border border-slate-700 rounded-lg py-2.5 px-3.5 text-slate-200 text-sm placeholder:text-slate-600 focus:outline-none focus:border-primary-500 focus:ring-1 focus:ring-primary-500/30 transition-all"
                placeholder="Outstanding amount"
              />
            </div>
          </div>
          <div className="space-y-1.5">
            <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider">Address</label>
            <textarea
              value={formAddress}
              onChange={(e) => setFormAddress(e.target.value)}
              rows={2}
              className="w-full bg-slate-800 border border-slate-700 rounded-lg py-2.5 px-3.5 text-slate-200 text-sm placeholder:text-slate-600 focus:outline-none focus:border-primary-500 focus:ring-1 focus:ring-primary-500/30 transition-all resize-none"
              placeholder="Residential block, city..."
            />
          </div>
        </form>
      </Modal>

      {/* MODAL 2: Buying History & Statements */}
      <Modal
        isOpen={showHistoryModal && !!historyCustomer}
        onClose={() => setShowHistoryModal(false)}
        title="Customer Statement Ledger"
        subtitle={historyCustomer ? `Purchases history for ${historyCustomer.name}` : ''}
        maxWidth="max-w-2xl"
        showDefaultFooter={true}
        cancelLabel="Close Statement"
      >
        {historyCustomer && (
          <div className="space-y-4">
            {/* Invoices List */}
            <div className="max-h-80 overflow-y-auto space-y-3 pr-1 text-xs">
              {customerSales.length === 0 ? (
                <div className="py-12 text-center text-slate-400">
                  No purchase transaction recorded for this customer.
                </div>
              ) : (
                customerSales.map((sale) => (
                  <div 
                    key={sale._id} 
                    className="border border-slate-700/50 p-3.5 rounded-xl bg-slate-800/50 flex items-center justify-between hover:bg-slate-800 transition"
                  >
                    <div className="space-y-1">
                      <div className="flex items-center space-x-1.5">
                        <span className="p-1 bg-slate-700/50 rounded text-slate-400">
                          <Receipt size={14} />
                        </span>
                        <span className="font-bold text-slate-200 font-mono text-[11px]">{sale.invoiceNumber}</span>
                      </div>
                      <p className="text-slate-400 text-[10px]">
                        Date: {new Date(sale.date).toLocaleDateString()} | Pay Mode: {sale.paymentMethod}
                      </p>
                    </div>

                    <div className="text-right shrink-0">
                      <p className="font-extrabold text-sm text-white">₹{sale.grandTotal.toFixed(2)}</p>
                      <span className="text-[10px] text-slate-400">Paid: ₹{sale.amountPaid.toFixed(2)}</span>
                    </div>
                  </div>
                ))
              )}
            </div>

            <div className="flex items-center justify-between text-xs">
              <div className="flex items-center space-x-2 text-slate-400">
                <span>Total Outstanding Balance:</span>
                <span className={`font-bold ${historyCustomer.balance > 0 ? 'text-amber-500' : 'text-slate-300'}`}>
                  ₹{historyCustomer.balance.toFixed(2)}
                </span>
              </div>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};

export default Customers;
