import React, { useState, useEffect } from 'react';
import API from '../utils/api';
import { ShoppingBag, Eye, RefreshCw, X, Printer, CheckCircle, AlertTriangle, Trash2, ArrowLeft, Edit, Plus, FileDown } from 'lucide-react';

const Sales = () => {
  const [sales, setSales] = useState([]);
  const [loading, setLoading] = useState(true);
  const [msg, setMsg] = useState({ text: '', type: 'success' });

  // View state: 'list' or 'edit'
  const [view, setView] = useState('list');
  const [editSaleId, setEditSaleId] = useState(null);

  // Selection states for Excel export
  const [selectedSaleIds, setSelectedSaleIds] = useState([]);

  const handleSelectSale = (saleId) => {
    if (selectedSaleIds.includes(saleId)) {
      setSelectedSaleIds(selectedSaleIds.filter(id => id !== saleId));
    } else {
      setSelectedSaleIds([...selectedSaleIds, saleId]);
    }
  };

  const handleSelectAllSales = (filteredSalesList) => {
    const allFilteredIds = filteredSalesList.map(s => s._id);
    const isAllSelected = allFilteredIds.length > 0 && allFilteredIds.every(id => selectedSaleIds.includes(id));
    if (isAllSelected) {
      setSelectedSaleIds(selectedSaleIds.filter(id => !allFilteredIds.includes(id)));
    } else {
      const newSelection = Array.from(new Set([...selectedSaleIds, ...allFilteredIds]));
      setSelectedSaleIds(newSelection);
    }
  };

  const exportSalesToExcel = () => {
    const itemsToExport = sales.filter(s => selectedSaleIds.includes(s._id));
    if (itemsToExport.length === 0) {
      alert('Please select at least one sale invoice using the checkboxes to export.');
      return;
    }
    
    // Create Excel friendly CSV
    const headers = 'Invoice Number,Customer,Warehouse,Date,Payment Method,Subtotal (₹),Tax (%),Discount (₹),Grand Total (₹),Amount Paid (₹),Status,Items\r\n';
    const rows = itemsToExport.map(s => {
      const customerName = s.customer?.name || 'Walk-in Customer';
      const warehouseName = s.warehouse?.name || 'N/A';
      const itemsList = s.items?.map(it => `${it.productName} (x${it.quantity})`).join('; ') || 'N/A';
      return `"${s.invoiceNumber}","${customerName.replace(/"/g, '""')}","${warehouseName.replace(/"/g, '""')}","${new Date(s.date).toLocaleDateString('en-GB')}","${s.paymentMethod}",${s.subTotal},${s.tax},${s.discount},${s.grandTotal},${s.amountPaid},"${s.paymentStatus}","${itemsList.replace(/"/g, '""')}"`;
    }).join('\r\n');

    // UTF-8 BOM to prevent Excel encoding issues
    const BOM = '\uFEFF';
    const csvContent = BOM + headers + rows;
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `deepali_creation_sales_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Dropdown options
  const [customers, setCustomers] = useState([]);
  const [warehouses, setWarehouses] = useState([]);
  const [products, setProducts] = useState([]);

  // Form states for Editing
  const [selectedCustomer, setSelectedCustomer] = useState('');
  const [selectedWarehouse, setSelectedWarehouse] = useState('');
  const [saleItems, setSaleItems] = useState([]); // [{ productObj, price, quantity, tax, discount }]
  const [paymentMethod, setPaymentMethod] = useState('Cash');
  const [payCash, setPayCash] = useState(0);
  const [payUpi, setPayUpi] = useState(0);
  const [payCard, setPayCard] = useState(0);
  const [amountPaid, setAmountPaid] = useState(0);
  const [discount, setDiscount] = useState(0);
  const [taxRate, setTaxRate] = useState(0);
  const [saleDate, setSaleDate] = useState(new Date().toISOString().split('T')[0]);
  const [saleDescription, setSaleDescription] = useState('');

  // Item additions inside edit view
  const [tempProduct, setTempProduct] = useState('');
  const [tempPrice, setTempPrice] = useState('');
  const [tempQty, setTempQty] = useState('');

  // Detail Modal
  const [selectedSale, setSelectedSale] = useState(null);
  const [showDetailModal, setShowDetailModal] = useState(false);

  // Refund Modal
  const [showRefundModal, setShowRefundModal] = useState(false);
  const [refundQuantities, setRefundQuantities] = useState({}); // { itemId: quantityToReturn }
  const [saleReturns, setSaleReturns] = useState([]);
  const [activeTab, setActiveTab] = useState('history'); // 'history' or 'returns'
  const [showReturnDetailModal, setShowReturnDetailModal] = useState(false);
  const [selectedReturn, setSelectedReturn] = useState(null);

  const showMsg = (text, type = 'success') => {
    setMsg({ text, type });
    setTimeout(() => setMsg({ text: '', type: 'success' }), 5000);
  };

  const fetchSalesData = async () => {
    try {
      setLoading(true);
      const [salesRes, returnsRes, custRes, whRes, prodRes] = await Promise.all([
        API.get('/sales'),
        API.get('/sales/returns'),
        API.get('/customers'),
        API.get('/warehouses'),
        API.get('/products')
      ]);
      if (salesRes.data.success) setSales(salesRes.data.data);
      if (returnsRes.data.success) setSaleReturns(returnsRes.data.data);
      if (custRes.data.success) setCustomers(custRes.data.data);
      if (whRes.data.success) setWarehouses(whRes.data.data);
      if (prodRes.data.success) setProducts(prodRes.data.data.filter(p => p.status === 'Active'));
    } catch (err) {
      showMsg(err.message, 'error');
    } finally {
      setView('list');
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSalesData();
  }, []);

  const handleOpenDetail = async (id) => {
    try {
      const res = await API.get(`/sales/${id}`);
      if (res.data.success) {
        setSelectedSale(res.data.data);
        setShowDetailModal(true);
      }
    } catch (err) {
      showMsg(err.message, 'error');
    }
  };

  const handleOpenRefund = (sale) => {
    setSelectedSale(sale);
    // Initialize quantities to 0
    const initialQtys = {};
    sale.items?.forEach(it => {
      const prodId = it.product?._id || it.product;
      initialQtys[prodId] = 0;
    });
    setRefundQuantities(initialQtys);
    setShowRefundModal(true);
  };

  const handleRefundQtyChange = (productId, val, max) => {
    const qty = Math.min(max, Math.max(0, Number(val)));
    setRefundQuantities(prev => ({
      ...prev,
      [productId]: qty
    }));
  };

  const handleSubmitRefund = async (e) => {
    e.preventDefault();

    // Compile items to return
    const returnedItems = Object.entries(refundQuantities)
      .map(([productId, quantity]) => ({ productId, quantity }))
      .filter(item => item.quantity > 0);

    if (returnedItems.length === 0) {
      showMsg('Please set return quantity for at least one item', 'error');
      return;
    }

    try {
      const res = await API.post('/sales/refund', {
        saleId: selectedSale._id,
        returnedItems
      });

      if (res.data.success) {
        showMsg(`Return processed! Refund amount: ₹${res.data.refundAmount}`);
        fetchSalesData();
        setShowRefundModal(false);
        setShowDetailModal(false);
      }
    } catch (err) {
      showMsg(err.message, 'error');
    }
  };

  const handleDeleteReturn = async (id) => {
    if (window.confirm('Are you sure you want to delete this customer return log? This will deduct the stock items from the warehouse and restore the customer balance.')) {
      try {
        const res = await API.delete(`/sales/returns/${id}`);
        if (res.data.success) {
          showMsg('Sales return record deleted successfully.');
          fetchSalesData();
        }
      } catch (err) {
        showMsg(err.message, 'error');
      }
    }
  };

  // Calculations for Edit form
  let editSubTotal = 0;
  let rawEditSubTotal = 0;

  saleItems.forEach(item => {
    rawEditSubTotal += (item.price - (item.discount || 0)) * item.quantity;
  });

  const globalDiscountAmount = Number(discount) || 0;
  let totalCgst = 0;
  let totalSgst = 0;

  saleItems.forEach(item => {
    const discountedPrice = item.price - (item.discount || 0);
    const lineTotal = discountedPrice * item.quantity;
    editSubTotal += lineTotal;

    const proportion = rawEditSubTotal > 0 ? (lineTotal / rawEditSubTotal) : 0;
    const itemGlobalDiscount = globalDiscountAmount * proportion;
    
    const taxableAmount = Math.max(0, lineTotal - itemGlobalDiscount);
    const itemTaxPercent = item.productObj?.tax || item.tax || 0;
    const itemTaxAmount = taxableAmount * (itemTaxPercent / 100);
    
    totalCgst += itemTaxAmount / 2;
    totalSgst += itemTaxAmount / 2;
  });

  const editTaxAmount = totalCgst + totalSgst;
  const editGrandTotal = Math.max(0, editSubTotal + editTaxAmount - globalDiscountAmount);

  const handleStartEdit = async (id) => {
    try {
      const res = await API.get(`/sales/${id}`);
      if (res.data.success) {
        const sale = res.data.data;
        setEditSaleId(sale._id);
        setSelectedCustomer(sale.customer?._id || sale.customer || '');
        setSelectedWarehouse(sale.warehouse?._id || sale.warehouse || '');
        setSaleItems(
          sale.items.map((it) => ({
            productObj: it.product,
            price: it.price,
            quantity: it.quantity,
            tax: it.tax || 0,
            discount: it.discount || 0,
            total: it.total
          }))
        );
        setPaymentMethod(sale.paymentMethod || 'Cash');
        setPayCash(sale.paymentDetails?.cash || 0);
        setPayUpi(sale.paymentDetails?.upi || 0);
        setPayCard(sale.paymentDetails?.card || 0);
        setAmountPaid(sale.amountPaid || 0);
        setDiscount(sale.discount || 0);
        setTaxRate(sale.tax || 0);
        setSaleDate(sale.date ? new Date(sale.date).toISOString().split('T')[0] : new Date().toISOString().split('T')[0]);
        setSaleDescription(sale.description || '');
        setView('edit');
      }
    } catch (err) {
      showMsg(err.message, 'error');
    }
  };

  const handleAddSaleItem = () => {
    if (!tempProduct || !tempPrice || !tempQty) {
      showMsg('Please choose a product, selling price, and quantity', 'error');
      return;
    }

    const prod = products.find(p => p._id === tempProduct);
    if (!prod) return;

    const price = Number(tempPrice);
    const qty = Number(tempQty);
    
    // Check if item already added
    const existingIdx = saleItems.findIndex(it => (it.productObj?._id || it.productObj) === prod._id);
    if (existingIdx !== -1) {
      const updated = [...saleItems];
      updated[existingIdx].quantity += qty;
      updated[existingIdx].total = (updated[existingIdx].price - updated[existingIdx].discount) * updated[existingIdx].quantity;
      setSaleItems(updated);
    } else {
      setSaleItems(prev => [
        ...prev,
        {
          productObj: prod,
          price: price,
          quantity: qty,
          tax: 0,
          discount: 0,
          total: price * qty
        }
      ]);
    }

    // Reset selectors
    setTempProduct('');
    setTempPrice('');
    setTempQty('');
  };

  const handleRemoveSaleItem = (idx) => {
    setSaleItems(prev => prev.filter((_, i) => i !== idx));
  };

  const handleUpdateSaleItem = (idx, field, value) => {
    const updated = [...saleItems];
    const val = Number(value);
    if (field === 'quantity') {
      updated[idx].quantity = Math.max(0, val);
    } else if (field === 'price') {
      updated[idx].price = Math.max(0, val);
    } else if (field === 'discount') {
      updated[idx].discount = Math.max(0, val);
    } else if (field === 'tax') {
      updated[idx].tax = Math.max(0, val);
    }
    updated[idx].total = (updated[idx].price - updated[idx].discount) * updated[idx].quantity * (1 + (updated[idx].tax || 0) / 100);
    setSaleItems(updated);
  };

  const resetEditForm = () => {
    setSaleItems([]);
    setDiscount(0);
    setTaxRate(0);
    setAmountPaid(0);
    setPayCash(0);
    setPayUpi(0);
    setPayCard(0);
    setSaleDate(new Date().toISOString().split('T')[0]);
    setSaleDescription('');
    setEditSaleId(null);
    setView('list');
  };

  const handleSaveEditedSale = async (e) => {
    e.preventDefault();
    if (!selectedCustomer || !selectedWarehouse || saleItems.length === 0) {
      showMsg('Please complete sale items, warehouse and customer', 'error');
      return;
    }

    // If Mixed payment, validate total
    let finalAmountPaid = Number(amountPaid);
    if (paymentMethod === 'Mixed') {
      const totalMixed = Number(payCash || 0) + Number(payUpi || 0) + Number(payCard || 0);
      if (Math.abs(totalMixed - editGrandTotal) > 0.01) {
        showMsg(`Mixed payment total (₹${totalMixed.toFixed(2)}) must equal Grand Total (₹${editGrandTotal.toFixed(2)})`, 'error');
        return;
      }
      finalAmountPaid = totalMixed;
    } else {
      finalAmountPaid = editGrandTotal;
    }

    const payload = {
      customerId: selectedCustomer,
      warehouseId: selectedWarehouse,
      items: saleItems.map(it => ({
        productId: it.productObj?._id || it.productObj,
        price: it.price,
        quantity: it.quantity,
        tax: it.tax || 0,
        discount: it.discount || 0
      })),
      subTotal: editSubTotal,
      tax: editTaxAmount,
      discount: Number(discount),
      grandTotal: editGrandTotal,
      paymentMethod,
      paymentDetails: paymentMethod === 'Mixed' ? { cash: Number(payCash), upi: Number(payUpi), card: Number(payCard) } : { cash: 0, upi: 0, card: 0 },
      amountPaid: finalAmountPaid,
      changeReturned: 0,
      description: saleDescription,
      date: saleDate
    };

    try {
      const res = await API.put(`/sales/${editSaleId}`, payload);
      if (res.data.success) {
        showMsg('Sales invoice updated successfully!');
        fetchSalesData();
        resetEditForm();
      }
    } catch (err) {
      showMsg(err.message, 'error');
    }
  };

  const printReceipt = () => {
    window.print();
  };

  const handleDeleteSale = async (id) => {
    if (window.confirm('Are you sure you want to delete this sale invoice? This will restore sold item stocks to the warehouse and adjust customer balance.')) {
      try {
        const res = await API.delete(`/sales/${id}`);
        if (res.data.success) {
          showMsg('Sale invoice deleted successfully.');
          fetchSalesData();
        }
      } catch (err) {
        showMsg(err.message, 'error');
      }
    }
  };

  return (
    <>
      <div className="p-6 space-y-6 fade-in font-sans no-print">
      
      {/* Toast Notice */}
      {msg.text && (
        <div className={`fixed bottom-4 right-4 px-4 py-3 rounded-xl shadow-lg z-50 flex items-center space-x-2 text-xs font-semibold ${
          msg.type === 'error' ? 'bg-red-500 text-white' : 'bg-primary-600 text-white'
        }`}>
          <span>{msg.text}</span>
        </div>
      )}

      {/* Header section */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 dark:text-white">
            {view === 'edit' ? 'Edit Sales Invoice' : 'Sales & Invoices History'}
          </h1>
          <p className="text-sm text-slate-400 dark:text-slate-500 mt-0.5">
            {view === 'edit'
              ? 'Modify invoice details, update items, adjust quantities, date or notes.'
              : 'Review customer transactions, prints receipts, and process refunds.'}
          </p>
        </div>
        {view === 'edit' ? (
          <div>
            <button
              onClick={resetEditForm}
              className="flex items-center space-x-1.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700/80 text-slate-700 dark:text-slate-300 px-4 py-2.5 rounded-xl font-semibold text-xs transition-all"
            >
              <ArrowLeft size={16} />
              <span>Back to History</span>
            </button>
          </div>
        ) : (
          <div>
            <button
              onClick={exportSalesToExcel}
              className="flex items-center space-x-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 dark:bg-slate-800 dark:hover:bg-slate-700 dark:text-slate-300 px-4 py-2.5 rounded-xl font-semibold text-xs transition-all shadow-sm"
              id="export-sales-btn"
            >
              <FileDown size={16} />
              <span>Excel Export ({selectedSaleIds.length})</span>
            </button>
          </div>
        )}
      </div>

      {view === 'list' ? (
        /* Sales Grid Table */
        <div className="space-y-4">
          {/* Tabs Bar */}
          <div className="flex border-b border-slate-200 dark:border-slate-800 text-xs font-semibold">
            <button
              onClick={() => setActiveTab('history')}
              className={`pb-2.5 px-4 -mb-px transition-colors ${
                activeTab === 'history'
                  ? 'border-b-2 border-primary-600 text-primary-600 dark:text-primary-400 font-bold'
                  : 'text-slate-400 hover:text-slate-600'
              }`}
            >
              Sales Invoices
            </button>
            <button
              onClick={() => setActiveTab('returns')}
              className={`pb-2.5 px-4 -mb-px transition-colors ${
                activeTab === 'returns'
                  ? 'border-b-2 border-primary-600 text-primary-600 dark:text-primary-400 font-bold'
                  : 'text-slate-400 hover:text-slate-600'
              }`}
            >
              Customer Returns
            </button>
          </div>

          {activeTab === 'history' ? (
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800/80 rounded-2xl shadow-sm overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-50/70 dark:bg-slate-950/40 border-b border-slate-200 dark:border-slate-800 text-slate-400 font-semibold text-xs">
                      <th className="px-6 py-3.5 text-center w-12">
                        <input
                          type="checkbox"
                          checked={sales.length > 0 && sales.every(s => selectedSaleIds.includes(s._id))}
                          onChange={() => handleSelectAllSales(sales)}
                          className="w-4 h-4 rounded text-primary-600 border-slate-300 dark:border-slate-800 focus:ring-primary-500 cursor-pointer"
                        />
                      </th>
                      <th className="px-6 py-3.5">Invoice Code</th>
                      <th className="px-6 py-3.5">Customer</th>
                      <th className="px-6 py-3.5">Warehouse</th>
                      <th className="px-6 py-3.5">Products</th>
                      <th className="px-6 py-3.5">Date</th>
                      <th className="px-6 py-3.5">Payment Mode</th>
                      <th className="px-6 py-3.5 text-right">Bill Total</th>
                      <th className="px-6 py-3.5 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 text-slate-700 dark:text-slate-300 text-xs">
                    {loading ? (
                      <tr>
                        <td colSpan="9" className="text-center py-12">
                          <div className="w-8 h-8 border-2 border-primary-500 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
                          <span>Loading sales log...</span>
                        </td>
                      </tr>
                    ) : sales.length === 0 ? (
                      <tr>
                        <td colSpan="9" className="text-center py-12 text-slate-400">
                          No sales invoice history recorded. Check out items on the POS page.
                        </td>
                      </tr>
                    ) : (
                      sales.map((sale) => (
                        <tr key={sale._id} className={`hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors ${selectedSaleIds.includes(sale._id) ? 'bg-primary-500/5 dark:bg-primary-950/10' : ''}`}>
                          <td className="px-6 py-3.5 text-center w-12">
                            <input
                              type="checkbox"
                              checked={selectedSaleIds.includes(sale._id)}
                              onChange={() => handleSelectSale(sale._id)}
                              className="w-4 h-4 rounded text-primary-600 border-slate-300 dark:border-slate-800 focus:ring-primary-500 cursor-pointer"
                            />
                          </td>
                          <td className="px-6 py-3.5 font-mono text-[11px] font-semibold text-slate-800 dark:text-slate-200">{sale.invoiceNumber}</td>
                          <td className="px-6 py-3.5 font-semibold text-slate-900 dark:text-white">{sale.customer?.name}</td>
                          <td className="px-6 py-3.5 text-slate-400">{sale.warehouse?.name}</td>
                          <td className="px-6 py-3.5 text-slate-650 dark:text-slate-350 max-w-[200px] truncate" title={sale.items?.map(it => `${it.productName} (x${it.quantity})`).join(', ')}>
                            {sale.items?.map(it => `${it.productName} (x${it.quantity})`).join(', ') || 'N/A'}
                          </td>
                          <td className="px-6 py-3.5">{new Date(sale.date).toLocaleDateString('en-GB')}</td>
                          <td className="px-6 py-3.5">
                            <span className="px-2 py-0.5 bg-slate-100 dark:bg-slate-800 rounded font-semibold text-[10px] uppercase text-slate-600 dark:text-slate-400">
                              {sale.paymentMethod}
                            </span>
                          </td>
                          <td className="px-6 py-3.5 text-right font-bold text-slate-850 dark:text-slate-100">
                            ₹{sale.grandTotal.toFixed(2)}
                          </td>
                          <td className="px-6 py-3.5 text-right space-x-1">
                            <button
                              onClick={() => handleOpenDetail(sale._id)}
                              className="p-1.5 text-slate-400 hover:text-primary-500 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition"
                              title="View Details"
                              id={`view-invoice-${sale.invoiceNumber}`}
                            >
                              <Eye size={15} />
                            </button>
                            <button
                              onClick={() => handleStartEdit(sale._id)}
                              className="p-1.5 text-slate-400 hover:text-blue-500 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition"
                              title="Edit Invoice"
                              id={`edit-invoice-${sale.invoiceNumber}`}
                            >
                              <Edit size={15} />
                            </button>
                            <button
                              onClick={() => handleOpenRefund(sale)}
                              className="p-1.5 text-slate-400 hover:text-amber-500 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition"
                              title="Process Refund/Return"
                              id={`refund-invoice-${sale.invoiceNumber}`}
                            >
                              <RefreshCw size={15} />
                            </button>
                            <button
                              onClick={() => handleDeleteSale(sale._id)}
                              className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition"
                              title="Delete Invoice"
                              id={`delete-invoice-${sale.invoiceNumber}`}
                            >
                              <Trash2 size={15} />
                            </button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          ) : (
            /* VIEW 1.2: Customer Returns List */
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800/80 rounded-2xl shadow-sm overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-50/70 dark:bg-slate-950/40 border-b border-slate-200 dark:border-slate-800 text-slate-400 font-semibold text-xs">
                      <th className="px-6 py-3.5">Return Number</th>
                      <th className="px-6 py-3.5">Original Invoice</th>
                      <th className="px-6 py-3.5">Customer</th>
                      <th className="px-6 py-3.5">Warehouse</th>
                      <th className="px-6 py-3.5">Return Date</th>
                      <th className="px-6 py-3.5 text-right">Refund Total</th>
                      <th className="px-6 py-3.5 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 text-slate-700 dark:text-slate-300 text-xs">
                    {loading ? (
                      <tr>
                        <td colSpan="7" className="text-center py-12">
                          <div className="w-8 h-8 border-2 border-primary-500 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
                          <span>Loading returns history...</span>
                        </td>
                      </tr>
                    ) : saleReturns.length === 0 ? (
                      <tr>
                        <td colSpan="7" className="text-center py-12 text-slate-400">
                          No customer return logs recorded.
                        </td>
                      </tr>
                    ) : (
                      saleReturns.map((r) => (
                        <tr key={r._id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors">
                          <td className="px-6 py-3.5 font-mono text-[11px] font-semibold text-slate-800 dark:text-slate-200">{r.returnNumber}</td>
                          <td className="px-6 py-3.5 font-mono text-[11px] text-slate-500">{r.invoiceNumber}</td>
                          <td className="px-6 py-3.5 font-semibold text-slate-900 dark:text-white">{r.customer?.name}</td>
                          <td className="px-6 py-3.5">{r.warehouse?.name}</td>
                          <td className="px-6 py-3.5">{new Date(r.date).toLocaleDateString('en-GB')}</td>
                          <td className="px-6 py-3.5 text-right font-bold text-slate-850 dark:text-slate-100">
                            ₹{r.grandTotal.toFixed(2)}
                          </td>
                          <td className="px-6 py-3.5 text-right space-x-1">
                            <button
                              onClick={() => {
                                setSelectedReturn(r);
                                setShowReturnDetailModal(true);
                              }}
                              className="p-1.5 text-slate-400 hover:text-primary-500 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition"
                              title="View Return Details"
                              id={`view-return-${r.returnNumber}`}
                            >
                              <Eye size={15} />
                            </button>
                            <button
                              onClick={() => handleDeleteReturn(r._id)}
                              className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition"
                              title="Delete Return Log"
                              id={`delete-return-${r.returnNumber}`}
                            >
                              <Trash2 size={15} />
                            </button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      ) : (
        /* EDIT SALES INVOICE FORM VIEW */
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800/80 rounded-2xl p-6 shadow-sm space-y-6">
          <form onSubmit={handleSaveEditedSale} className="space-y-6">
            
            {/* Upper grid for customer, warehouse, date, description */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 text-xs">
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider block">Customer</label>
                <select
                  value={selectedCustomer}
                  onChange={(e) => setSelectedCustomer(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-850 rounded-xl py-2.5 px-3 focus:outline-none focus:border-primary-500 text-slate-800 dark:text-white"
                  required
                >
                  <option value="">Select Customer</option>
                  {customers.map((c) => (
                    <option key={c._id} value={c._id}>
                      {c.name} {c.mobile ? `(${c.mobile})` : ''}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider block">Warehouse Source</label>
                <select
                  value={selectedWarehouse}
                  onChange={(e) => setSelectedWarehouse(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-850 rounded-xl py-2.5 px-3 focus:outline-none focus:border-primary-500 text-slate-800 dark:text-white"
                  required
                >
                  <option value="">Select Warehouse</option>
                  {warehouses.map((w) => (
                    <option key={w._id} value={w._id}>
                      {w.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider block">Sale Date</label>
                <input
                  type="date"
                  value={saleDate}
                  onChange={(e) => setSaleDate(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-850 rounded-xl py-2 px-3 text-slate-800 dark:text-white focus:outline-none"
                  required
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider block">Sale Description / Notes</label>
                <input
                  type="text"
                  value={saleDescription}
                  onChange={(e) => setSaleDescription(e.target.value)}
                  placeholder="Invoice notes, reason for edit..."
                  className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-850 rounded-xl py-2 px-3 text-slate-800 dark:text-white focus:outline-none"
                />
              </div>
            </div>

            {/* Selector block to add items */}
            <div className="border border-slate-100 dark:border-slate-850 rounded-2xl p-4 bg-slate-50/50 dark:bg-slate-950/20 space-y-4">
              <h3 className="text-xs font-bold text-slate-700 dark:text-slate-300">Add Product to Invoice</h3>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-3 items-end text-xs">
                <div className="space-y-1">
                  <span>Product</span>
                  <select
                    value={tempProduct}
                    onChange={(e) => {
                      setTempProduct(e.target.value);
                      const prod = products.find(p => p._id === e.target.value);
                      if (prod) {
                        setTempPrice(prod.sellingPrice || '');
                        setTempQty(1);
                      } else {
                        setTempPrice('');
                        setTempQty('');
                      }
                    }}
                    className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg py-1.5 px-2 focus:outline-none text-slate-800 dark:text-white"
                  >
                    <option value="">Choose product...</option>
                    {products.map((p) => {
                      const whStock = p.warehouseStock?.find(s => s.warehouse === selectedWarehouse);
                      const availableQty = whStock ? whStock.quantity : 0;
                      return (
                        <option key={p._id} value={p._id}>
                          {p.name} ({p.code}) [Stock: {availableQty}]
                        </option>
                      );
                    })}
                  </select>
                </div>
                
                <div className="space-y-1">
                  <span>Unit Price (₹)</span>
                  <input
                    type="number"
                    value={tempPrice}
                    onChange={(e) => setTempPrice(e.target.value)}
                    className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg py-1.5 px-2 text-slate-800 dark:text-white focus:outline-none"
                    placeholder="0.00"
                  />
                </div>

                <div className="space-y-1">
                  <span>Quantity</span>
                  <input
                    type="number"
                    value={tempQty}
                    onChange={(e) => setTempQty(e.target.value)}
                    className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg py-1.5 px-2 text-slate-800 dark:text-white focus:outline-none"
                    placeholder="1"
                  />
                </div>

                <button
                  type="button"
                  onClick={handleAddSaleItem}
                  className="bg-primary-600 hover:bg-primary-500 text-white font-bold py-2 rounded-lg transition text-xs flex items-center justify-center space-x-1.5"
                >
                  <Plus size={14} />
                  <span>Add Product</span>
                </button>
              </div>
            </div>

            {/* Sale Items Table list */}
            <div className="space-y-2">
              <h3 className="text-xs font-bold text-slate-700 dark:text-slate-300">Invoice Items List</h3>
              <div className="border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-slate-50 dark:bg-slate-950/40 border-b border-slate-200 dark:border-slate-800 text-slate-400 font-semibold">
                      <th className="px-4 py-2.5">Code</th>
                      <th className="px-4 py-2.5">Barcode</th>
                      <th className="px-4 py-2.5">Product Name</th>
                      <th className="px-4 py-2.5 text-center w-24">Unit Price (₹)</th>
                      <th className="px-4 py-2.5 text-center w-20">Quantity</th>
                      <th className="px-4 py-2.5 text-center w-24">Discount (₹)</th>
                      <th className="px-4 py-2.5 text-center w-20">Tax (%)</th>
                      <th className="px-4 py-2.5 text-right w-28">Total (₹)</th>
                      <th className="px-4 py-2.5 text-center w-12">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 text-slate-700 dark:text-slate-300">
                    {saleItems.length === 0 ? (
                      <tr>
                        <td colSpan="9" className="text-center py-6 text-slate-400">
                          No products added to this invoice yet. Select a product above to add.
                        </td>
                      </tr>
                    ) : (
                      saleItems.map((item, idx) => {
                        const name = item.productObj?.name || item.productName || 'Deleted Product';
                        const code = item.productObj?.code || item.productCode || 'N/A';
                        const barcode = item.productObj?.barcodeValue || item.productBarcodeValue || item.product?.barcodeValue || '-';
                        return (
                          <tr key={idx} className="hover:bg-slate-50/20 dark:hover:bg-slate-800/10">
                            <td className="px-4 py-2.5 font-mono text-[11px]">{code}</td>
                            <td className="px-4 py-2.5 font-mono text-[11px] text-slate-500">{barcode}</td>
                            <td className="px-4 py-2.5">
                              <span className="font-semibold text-slate-800 dark:text-slate-100 block">{name}</span>
                            </td>
                            <td className="px-4 py-2.5 text-center">
                              <input
                                type="number"
                                value={item.price}
                                onChange={(e) => handleUpdateSaleItem(idx, 'price', e.target.value)}
                                className="w-20 bg-slate-50 dark:bg-slate-950 border dark:border-slate-800 rounded py-1 px-1.5 text-center font-semibold text-slate-800 dark:text-white"
                              />
                            </td>
                            <td className="px-4 py-2.5 text-center">
                              <input
                                type="number"
                                value={item.quantity}
                                onChange={(e) => handleUpdateSaleItem(idx, 'quantity', e.target.value)}
                                className="w-16 bg-slate-50 dark:bg-slate-950 border dark:border-slate-800 rounded py-1 px-1.5 text-center font-bold text-slate-800 dark:text-white"
                              />
                            </td>
                            <td className="px-4 py-2.5 text-center">
                              <input
                                type="number"
                                value={item.discount}
                                onChange={(e) => handleUpdateSaleItem(idx, 'discount', e.target.value)}
                                className="w-20 bg-slate-50 dark:bg-slate-950 border dark:border-slate-800 rounded py-1 px-1.5 text-center text-slate-800 dark:text-white"
                              />
                            </td>
                            <td className="px-4 py-2.5 text-center">
                              <input
                                type="number"
                                value={item.tax}
                                onChange={(e) => handleUpdateSaleItem(idx, 'tax', e.target.value)}
                                className="w-16 bg-slate-50 dark:bg-slate-950 border dark:border-slate-800 rounded py-1 px-1.5 text-center text-slate-800 dark:text-white"
                              />
                            </td>
                            <td className="px-4 py-2.5 text-right font-bold text-slate-900 dark:text-white">
                              ₹{(item.total || 0).toFixed(2)}
                            </td>
                            <td className="px-4 py-2.5 text-center">
                              <button
                                type="button"
                                onClick={() => handleRemoveSaleItem(idx)}
                                className="p-1 text-red-500 hover:bg-red-50 dark:hover:bg-red-950/20 rounded transition"
                              >
                                <Trash2 size={14} />
                              </button>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Calculations & Payment Block */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-start pt-4 border-t dark:border-slate-800">
              {/* Payment Details */}
              <div className="space-y-4 text-xs">
                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Payment Mode</label>
                  <div className="grid grid-cols-4 gap-2">
                    {['Cash', 'UPI', 'Card', 'Mixed'].map((mode) => (
                      <button
                        key={mode}
                        type="button"
                        onClick={() => setPaymentMethod(mode)}
                        className={`py-2.5 rounded-xl border font-bold text-center transition ${
                          paymentMethod === mode
                            ? 'bg-primary-600 border-primary-600 text-white shadow-sm'
                            : 'bg-slate-50 dark:bg-slate-950 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-800'
                        }`}
                      >
                        {mode}
                      </button>
                    ))}
                  </div>
                </div>

                {paymentMethod === 'Mixed' && (
                  <div className="bg-slate-50 dark:bg-slate-950/50 p-4 rounded-2xl border dark:border-slate-850 space-y-3">
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Distribute Payment Amounts</p>
                    <div className="grid grid-cols-3 gap-2.5">
                      <div className="space-y-1">
                        <span>Cash (₹)</span>
                        <input
                          type="number"
                          value={payCash || ''}
                          onChange={(e) => setPayCash(Number(e.target.value))}
                          className="w-full bg-white dark:bg-slate-900 border rounded-lg py-1.5 px-2 text-center text-slate-800 dark:text-white focus:outline-none"
                          placeholder="0"
                        />
                      </div>
                      <div className="space-y-1">
                        <span>UPI (₹)</span>
                        <input
                          type="number"
                          value={payUpi || ''}
                          onChange={(e) => setPayUpi(Number(e.target.value))}
                          className="w-full bg-white dark:bg-slate-900 border rounded-lg py-1.5 px-2 text-center text-slate-800 dark:text-white focus:outline-none"
                          placeholder="0"
                        />
                      </div>
                      <div className="space-y-1">
                        <span>Card (₹)</span>
                        <input
                          type="number"
                          value={payCard || ''}
                          onChange={(e) => setPayCard(Number(e.target.value))}
                          className="w-full bg-white dark:bg-slate-900 border rounded-lg py-1.5 px-2 text-center text-slate-800 dark:text-white focus:outline-none"
                          placeholder="0"
                        />
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Totals Summary */}
              <div className="bg-slate-50 dark:bg-slate-950/45 p-4 border rounded-2xl dark:border-slate-855 space-y-3 text-xs">
                <div className="flex justify-between items-center">
                  <span>Overall Bill Discount (₹)</span>
                  <input
                    type="number"
                    value={discount || ''}
                    onChange={(e) => setDiscount(e.target.value)}
                    className="w-20 bg-white dark:bg-slate-900 border rounded-lg py-1 px-2 text-center font-semibold text-slate-800 dark:text-white focus:outline-none"
                    placeholder="0"
                  />
                </div>

                <hr className="dark:border-slate-800" />

                <div className="space-y-1.5">
                  <div className="flex justify-between">
                    <span className="text-slate-400">Subtotal:</span>
                    <span>₹{editSubTotal.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Total CGST:</span>
                    <span>₹{totalCgst.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Total SGST:</span>
                    <span>₹{totalSgst.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Discount Applied:</span>
                    <span className="text-red-500 font-semibold">-₹{Number(discount || 0).toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between border-t dark:border-slate-800 pt-2 font-bold text-sm">
                    <span className="text-slate-800 dark:text-white">Grand Total:</span>
                    <span className="text-primary-600 dark:text-primary-400 text-base">₹{editGrandTotal.toFixed(2)}</span>
                  </div>
                </div>

                <div className="flex justify-end pt-3 space-x-2">
                  <button
                    type="button"
                    onClick={resetEditForm}
                    className="bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700/80 text-slate-600 dark:text-slate-350 px-5 py-2.5 rounded-xl font-bold transition-all"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="bg-primary-600 hover:bg-primary-500 text-white px-6 py-2.5 rounded-xl font-bold transition-all shadow-md active:scale-95"
                    id="update-invoice-submit-btn"
                  >
                    Update Invoice
                  </button>
                </div>
              </div>
            </div>

          </form>
        </div>
      )}

      {/* DETAIL MODAL */}
      {showDetailModal && selectedSale && (
        <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm z-40 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl w-full max-w-lg shadow-2xl p-6 space-y-4 no-print">
            <div className="flex items-center justify-between border-b pb-2.5 dark:border-slate-800">
              <h3 className="text-lg font-bold text-slate-800 dark:text-white">Invoice Details</h3>
              <button onClick={() => setShowDetailModal(false)} className="text-slate-400 hover:text-slate-200">
                <X size={20} />
              </button>
            </div>

            <div className="space-y-4 text-xs font-sans">
              <div className="grid grid-cols-2 gap-3.5 border-b pb-3 dark:border-slate-800 text-slate-500">
                <div>
                  <span className="block font-bold uppercase text-[9px] tracking-wide text-slate-450">Invoice Number</span>
                  <span className="font-semibold font-mono text-slate-800 dark:text-slate-200 text-sm">{selectedSale.invoiceNumber}</span>
                </div>
                <div>
                  <span className="block font-bold uppercase text-[9px] tracking-wide text-slate-450">Sale Date</span>
                  <span className="font-semibold text-slate-800 dark:text-slate-200">{new Date(selectedSale.date).toLocaleString('en-GB')}</span>
                </div>
                <div>
                  <span className="block font-bold uppercase text-[9px] tracking-wide text-slate-450">Customer</span>
                  <span className="font-bold text-slate-900 dark:text-white">{selectedSale.customer?.name} ({selectedSale.customer?.mobile})</span>
                </div>
                <div>
                  <span className="block font-bold uppercase text-[9px] tracking-wide text-slate-450">Warehouse Source</span>
                  <span className="font-semibold text-slate-800 dark:text-slate-200">{selectedSale.warehouse?.name}</span>
                </div>
                {selectedSale.description && (
                  <div className="col-span-2">
                    <span className="block font-bold uppercase text-[9px] tracking-wide text-slate-450">Sale Description / Notes</span>
                    <span className="font-semibold text-slate-850 dark:text-slate-200">{selectedSale.description}</span>
                  </div>
                )}
              </div>

              {/* Items List */}
              <div className="space-y-2">
                <p className="font-bold text-[10px] uppercase text-slate-450 tracking-wider">Purchased Items</p>
                <div className="divide-y divide-slate-100 dark:divide-slate-800 border rounded-xl overflow-hidden bg-slate-50/20 dark:bg-slate-950/40 p-2">
                  {selectedSale.items?.map((item, idx) => (
                    <div key={idx} className="py-2.5 flex items-center justify-between">
                      <div>
                        <p className="font-semibold text-slate-800 dark:text-slate-200">{item.productName || item.product?.name || 'Deleted Product'}</p>
                        <span className="text-[10px] text-slate-400 font-mono">Code: {item.productCode || item.product?.code || 'N/A'} | Barcode: {item.productBarcodeValue || item.product?.barcodeValue || 'N/A'} | Tax: {item.tax}%</span>
                      </div>
                      <div className="text-right">
                        <p className="font-bold text-slate-800 dark:text-slate-250">{item.quantity} units</p>
                        <span className="text-[10px] text-slate-500 font-mono">₹{item.price.toFixed(2)} ea</span>
                        <p className="font-extrabold text-slate-900 dark:text-white mt-0.5">₹{item.total.toFixed(2)}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Bill Totals summary */}
              <div className="bg-slate-50 dark:bg-slate-950/45 p-3 rounded-2xl border dark:border-slate-850 space-y-1.5">
                <div className="flex justify-between">
                  <span className="text-slate-450">Subtotal:</span>
                  <span>₹{selectedSale.subTotal.toFixed(2)}</span>
                </div>
                {(() => {
                  const isTaxAmount = Math.abs(selectedSale.subTotal - selectedSale.discount + selectedSale.tax - selectedSale.grandTotal) < 2;
                  const taxAmount = isTaxAmount ? selectedSale.tax : (selectedSale.subTotal * selectedSale.tax) / 100;
                  const taxPercent = isTaxAmount ? (selectedSale.subTotal > 0 ? (selectedSale.tax / (selectedSale.subTotal - selectedSale.discount)) * 100 : 0) : selectedSale.tax;
                  return (
                    <>
                      <div className="flex justify-between">
                        <span className="text-slate-450">CGST ({(taxPercent / 2).toFixed(1)}%):</span>
                        <span>₹{(taxAmount / 2).toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-450">SGST ({(taxPercent / 2).toFixed(1)}%):</span>
                        <span>₹{(taxAmount / 2).toFixed(2)}</span>
                      </div>
                    </>
                  );
                })()}
                <div className="flex justify-between">
                  <span className="text-slate-450">Discount:</span>
                  <span className="text-red-500 font-semibold">-₹{selectedSale.discount.toFixed(2)}</span>
                </div>
                <div className="flex justify-between border-t dark:border-slate-850 pt-1.5 font-bold text-slate-900 dark:text-white text-sm">
                  <span>Grand Total:</span>
                  <span className="text-primary-600 dark:text-primary-400">₹{selectedSale.grandTotal.toFixed(2)}</span>
                </div>
              </div>
            </div>

            <div className="flex justify-end space-x-2 border-t pt-3 dark:border-slate-800">
              <button
                onClick={() => setShowDetailModal(false)}
                className="bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700/80 text-slate-650 dark:text-slate-300 px-4 py-2 rounded-xl text-xs font-semibold"
              >
                Close
              </button>
              <button
                onClick={printReceipt}
                className="bg-primary-600 hover:bg-primary-500 text-white px-5 py-2 rounded-xl text-xs font-bold flex items-center space-x-1.5"
                id="invoice-print-btn"
              >
                <Printer size={14} />
                <span>Print receipt</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* REFUND / RETURNS MODAL */}
      {showRefundModal && selectedSale && (
        <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm z-40 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl w-full max-w-lg shadow-2xl p-6 space-y-4">
            <div className="flex items-center justify-between border-b pb-2.5 dark:border-slate-800">
              <h3 className="text-lg font-bold text-slate-800 dark:text-white">Process Refund / Return</h3>
              <button onClick={() => setShowRefundModal(false)} className="text-slate-400 hover:text-slate-200">
                <X size={20} />
              </button>
            </div>

            <div className="bg-slate-50 dark:bg-slate-950/30 p-3.5 border rounded-2xl flex items-start space-x-2.5 text-xs">
              <AlertTriangle className="text-amber-500 shrink-0 mt-0.5" />
              <p className="text-slate-500 leading-normal">
                Refunding decrements sales total. Returned stock is automatically credited back to **{selectedSale.warehouse?.name}**.
              </p>
            </div>

            <form onSubmit={handleSubmitRefund} className="space-y-4 text-xs font-sans">
              <div className="divide-y divide-slate-100 dark:divide-slate-800 border rounded-xl overflow-hidden bg-slate-50/20 dark:bg-slate-950/40 p-2">
                {selectedSale.items?.map((item) => {
                  const prodId = item.product?._id || item.product;
                  const prodCode = item.productCode || item.product?.code || 'deleted';
                  return (
                    <div key={prodId} className="py-2.5 flex items-center justify-between">
                      <div>
                        <p className="font-semibold text-slate-800 dark:text-slate-200">{item.productName || item.product?.name || 'Deleted Product'}</p>
                        <span className="text-[10px] text-slate-400 block font-mono">Code: {item.productCode || item.product?.code || 'N/A'} | Barcode: {item.productBarcodeValue || item.product?.barcodeValue || 'N/A'} | Bought: {item.quantity} | Total: ₹{item.total.toFixed(2)}</span>
                      </div>
                      
                      {/* Return input fields */}
                      <div className="flex items-center space-x-2 shrink-0">
                        <span>Return Qty:</span>
                        <input
                          type="number"
                          min="0"
                          max={item.quantity}
                          value={refundQuantities[prodId] || 0}
                          onChange={(e) => handleRefundQtyChange(prodId, e.target.value, item.quantity)}
                          className="w-16 bg-white dark:bg-slate-900 border rounded py-1 text-center font-bold"
                          id={`return-input-p-${prodCode}`}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="flex items-center justify-end space-x-2 border-t pt-3 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowRefundModal(false)}
                  className="bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700/80 text-slate-650 dark:text-slate-300 px-4 py-2 rounded-xl text-xs font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="bg-primary-600 hover:bg-primary-500 text-white px-5 py-2 rounded-xl text-xs font-bold"
                  id="submit-refund-btn"
                >
                  Confirm refund
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      </div>

      {/* PRINT-ONLY AREA: invoice detail printing */}
      {selectedSale && (
        <div className="hidden print-area">
          <div className="p-6 bg-white text-black font-mono text-[12px] max-w-[3in] mx-auto space-y-3 leading-relaxed">
            <div className="text-center space-y-1">
              <h2 className="font-extrabold text-base tracking-widest uppercase">Deepali Creation</h2>
              <p className="text-[10px] leading-tight">Deepali creation I-14 new supermarket near bedi gate jamnagar, 361001</p>
            </div>
             <div className="border-t border-b border-black py-1.5 space-y-1 text-[10px]">
               <div>Invoice: <span className="font-bold">{selectedSale.invoiceNumber}</span></div>
               <div>Date: {new Date(selectedSale.date).toLocaleString('en-GB')}</div>
               <div>Customer: {selectedSale.customer?.name} ({selectedSale.customer?.mobile || 'N/A'})</div>
               <div>Warehouse: {selectedSale.warehouse?.name}</div>
               {selectedSale.description && <div>Notes: {selectedSale.description}</div>}
             </div>
            <table className="w-full text-left text-[11px] border-b border-black pb-2">
              <thead>
                <tr className="border-b border-black font-bold">
                  <th className="pb-1">Item</th>
                  <th className="pb-1 text-center">Qty</th>
                  <th className="pb-1 text-right">Total</th>
                </tr>
              </thead>
              <tbody>
                {selectedSale.items?.map((item, idx) => (
                  <tr key={idx}>
                    <td className="py-1">{item.product?.name}</td>
                    <td className="py-1 text-center">{item.quantity}</td>
                    <td className="py-1 text-right">₹{item.total.toFixed(2)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div className="space-y-1 text-right text-[11px]">
              <div>Subtotal: ₹{selectedSale.subTotal.toFixed(2)}</div>
              {selectedSale.tax > 0 && <div>Tax ({selectedSale.tax}%): ₹{((selectedSale.subTotal * selectedSale.tax)/100).toFixed(2)}</div>}
              {selectedSale.discount > 0 && <div className="font-semibold text-black">Discount: -₹{selectedSale.discount.toFixed(2)}</div>}
              <div className="font-extrabold text-sm border-t border-dashed border-black pt-1">
                Grand Total: ₹{selectedSale.grandTotal.toFixed(2)}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* CUSTOMER RETURN DETAIL MODAL */}
      {showReturnDetailModal && selectedReturn && (
        <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm z-40 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl w-full max-w-lg shadow-2xl p-6 space-y-4">
            <div className="flex items-center justify-between border-b pb-2.5 dark:border-slate-800">
              <h3 className="text-lg font-bold text-slate-800 dark:text-white">Customer Return Details</h3>
              <button onClick={() => setShowReturnDetailModal(false)} className="text-slate-400 hover:text-slate-200">
                <X size={20} />
              </button>
            </div>

            <div className="space-y-4 text-xs font-sans">
              <div className="grid grid-cols-2 gap-3.5 border-b pb-3 dark:border-slate-800 text-slate-500">
                <div>
                  <span className="block font-bold uppercase text-[9px] tracking-wide text-slate-450">Return Number</span>
                  <span className="font-semibold font-mono text-slate-800 dark:text-slate-200 text-sm">{selectedReturn.returnNumber}</span>
                </div>
                <div>
                  <span className="block font-bold uppercase text-[9px] tracking-wide text-slate-450">Return Date</span>
                  <span className="font-semibold text-slate-800 dark:text-slate-200">{new Date(selectedReturn.date).toLocaleDateString('en-GB')}</span>
                </div>
                <div>
                  <span className="block font-bold uppercase text-[9px] tracking-wide text-slate-450">Original Invoice</span>
                  <span className="font-semibold font-mono text-slate-850 dark:text-slate-200">{selectedReturn.invoiceNumber}</span>
                </div>
                <div>
                  <span className="block font-bold uppercase text-[9px] tracking-wide text-slate-450">Customer</span>
                  <span className="font-bold text-slate-900 dark:text-white">{selectedReturn.customer?.name}</span>
                </div>
                <div>
                  <span className="block font-bold uppercase text-[9px] tracking-wide text-slate-450">Warehouse</span>
                  <span className="font-semibold text-slate-800 dark:text-slate-200">{selectedReturn.warehouse?.name}</span>
                </div>
                <div>
                  <span className="block font-bold uppercase text-[9px] tracking-wide text-slate-450">Refund Amount</span>
                  <span className="font-extrabold text-emerald-600 dark:text-emerald-450 text-sm">₹{selectedReturn.grandTotal.toFixed(2)}</span>
                </div>
              </div>

              {/* Returned Items List */}
              <div className="space-y-2">
                <p className="font-bold text-[10px] uppercase text-slate-450 tracking-wider">Returned Items</p>
                <div className="divide-y divide-slate-100 dark:divide-slate-800 border rounded-xl bg-slate-50/20 dark:bg-slate-950/40 p-2 max-h-[220px] overflow-y-auto pr-1">
                  {selectedReturn.items?.map((item, idx) => (
                    <div key={idx} className="py-2.5 flex items-center justify-between">
                      <div>
                        <p className="font-semibold text-slate-800 dark:text-slate-200">{item.name || 'Deleted Product'}</p>
                        <span className="text-[10px] text-slate-400 font-mono">Code: {item.code || 'N/A'}</span>
                      </div>
                      <div className="text-right">
                        <p className="font-bold text-slate-850 dark:text-slate-250">{item.quantity} units</p>
                        <span className="text-[10px] text-slate-500 font-mono">₹{item.price.toFixed(2)} ea</span>
                        <p className="font-extrabold text-slate-900 dark:text-white mt-0.5">₹{item.total.toFixed(2)}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="flex justify-end space-x-2 border-t pt-3 dark:border-slate-800">
              <button
                onClick={() => setShowReturnDetailModal(false)}
                className="bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700/80 text-slate-650 dark:text-slate-300 px-4 py-2 rounded-xl text-xs font-semibold"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default Sales;
