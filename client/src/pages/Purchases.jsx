import React, { useState, useEffect, useRef } from 'react';
import API from '../utils/api';
import { Plus, List, ArrowLeft, Trash2, CheckCircle, AlertTriangle, HelpCircle, Eye, X, Printer, Edit, Sliders, RefreshCw, Barcode, Save } from 'lucide-react';

const BARCODE_STYLES = {
  '40-a4': {
    name: '40 per sheet (a4) (1.799" x 1.003")',
    cols: 4,
    height: '25mm',
    imgHeight: '12mm',
    fontSizeName: '7.5px',
    fontSizeNo: '7px',
    fontSizePrice: '8px',
    gap: '2.5mm',
    padding: '4px',
    isA4: true
  },
  '30-sheet': {
    name: '30 per sheet (2.625" x 1")',
    cols: 3,
    height: '25.4mm',
    imgHeight: '13mm',
    fontSizeName: '8.5px',
    fontSizeNo: '7.5px',
    fontSizePrice: '9px',
    gap: '3mm',
    padding: '5px',
    isA4: false
  },
  '24-a4': {
    name: '24 per sheet (a4) (2.48" x 1.334")',
    cols: 3,
    height: '34mm',
    imgHeight: '18mm',
    fontSizeName: '9.5px',
    fontSizeNo: '8px',
    fontSizePrice: '10px',
    gap: '3mm',
    padding: '6px',
    isA4: true
  },
  '20-sheet': {
    name: '20 per sheet (4" x 1")',
    cols: 2,
    height: '25.4mm',
    imgHeight: '13mm',
    fontSizeName: '9px',
    fontSizeNo: '8px',
    fontSizePrice: '10px',
    gap: '4mm',
    padding: '5px',
    isA4: false
  },
  '18-a4': {
    name: '18 per sheet (a4) (2.5" x 1.835")',
    cols: 3,
    height: '46.5mm',
    imgHeight: '25mm',
    fontSizeName: '11px',
    fontSizeNo: '9px',
    fontSizePrice: '11.5px',
    gap: '3.5mm',
    padding: '8px',
    isA4: true
  },
  '14-sheet': {
    name: '14 per sheet (4" x 1.33")',
    cols: 2,
    height: '34mm',
    imgHeight: '18mm',
    fontSizeName: '10.5px',
    fontSizeNo: '9px',
    fontSizePrice: '11px',
    gap: '4mm',
    padding: '6px',
    isA4: false
  },
  '12-a4': {
    name: '12 per sheet (a4) (2.5" x 2.834")',
    cols: 3,
    height: '72mm',
    imgHeight: '42mm',
    fontSizeName: '12px',
    fontSizeNo: '10px',
    fontSizePrice: '13px',
    gap: '4mm',
    padding: '8px',
    isA4: true
  },
  '10-sheet': {
    name: '10 per sheet (4" x 2")',
    cols: 2,
    height: '50.8mm',
    imgHeight: '28mm',
    fontSizeName: '12px',
    fontSizeNo: '10px',
    fontSizePrice: '13px',
    gap: '4.5mm',
    padding: '8px',
    isA4: false
  },
  'continuous': {
    name: 'Continuous feed (3.1cm x 2.3cm)',
    cols: 1,
    height: '23mm',
    imgHeight: '11mm',
    fontSizeName: '7px',
    fontSizeNo: '6.5px',
    fontSizePrice: '7.5px',
    gap: '0px',
    padding: '3px',
    isA4: false
  }
};

const Purchases = () => {
  const [purchases, setPurchases] = useState([]);
  const [suppliers, setSuppliers] = useState([]);
  const [warehouses, setWarehouses] = useState([]);
  const [products, setProducts] = useState([]);
  
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState('list'); // 'list' or 'new'

  // New Purchase Form state
  const [selectedSupplier, setSelectedSupplier] = useState('');
  const [selectedWarehouse, setSelectedWarehouse] = useState('');
  const [purchaseItems, setPurchaseItems] = useState([]); // [{ productObj, costPrice, quantity, total }]
  const [paymentStatus, setPaymentStatus] = useState('Paid');
  const [amountPaid, setAmountPaid] = useState('');
  const [discount, setDiscount] = useState(0);
  const [purchaseTax, setPurchaseTax] = useState(0);
  const [purchaseDate, setPurchaseDate] = useState(new Date().toISOString().split('T')[0]);
  const [paymentDate, setPaymentDate] = useState(new Date().toISOString().split('T')[0]);
  const [supplierSearch, setSupplierSearch] = useState('');
  const [showSupplierDropdown, setShowSupplierDropdown] = useState(false);

  // Editing purchase state
  const [editPurchaseId, setEditPurchaseId] = useState(null);
  const [purchaseNumber, setPurchaseNumber] = useState('');

  // Invoice Detail Modal state
  const [selectedPurchase, setSelectedPurchase] = useState(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [showReturnModal, setShowReturnModal] = useState(false);
  const [returnQuantities, setReturnQuantities] = useState({}); // { productId: quantityToReturn }
  const [purchaseReturns, setPurchaseReturns] = useState([]);
  const [activeTab, setActiveTab] = useState('history'); // 'history' or 'returns'
  const [showReturnDetailModal, setShowReturnDetailModal] = useState(false);
  const [selectedReturn, setSelectedReturn] = useState(null);

  // Bulk Barcode Print State
  const [showBulkBarcodeModal, setShowBulkBarcodeModal] = useState(false);
  const [bulkBarcodeItems, setBulkBarcodeItems] = useState([]); // [{ product, quantity, customPrice, selected, barcodeImage, productName, barcodeValue }]
  const [bulkBarcodeLoading, setBulkBarcodeLoading] = useState(false);
  const [printStyle, setPrintStyle] = useState('24-a4');
  const [tempPrintStyle, setTempPrintStyle] = useState('24-a4');



  // Selector temp item variables
  const [tempProduct, setTempProduct] = useState('');
  const [prodSearch, setProdSearch] = useState('');
  const [tempCostPrice, setTempCostPrice] = useState('');
  const [tempQty, setTempQty] = useState('');
  const qtyInputRef = useRef(null);
  const scanInputRef = useRef(null);

  // Toast
  const [msg, setMsg] = useState({ text: '', type: 'success' });
  const [submitting, setSubmitting] = useState(false);

  const showMsg = (text, type = 'success') => {
    setMsg({ text, type });
    setTimeout(() => setMsg({ text: '', type: 'success' }), 5000);
  };

  const fetchPurchasesData = async () => {
    try {
      setLoading(true);
      const [purRes, supRes, whRes, prodRes, retRes] = await Promise.all([
        API.get('/purchases'),
        API.get('/suppliers'),
        API.get('/warehouses'),
        API.get('/products'),
        API.get('/purchases/returns')
      ]);

      if (purRes.data.success) setPurchases(purRes.data.data);
      if (supRes.data.success) setSuppliers(supRes.data.data);
      if (whRes.data.success) setWarehouses(whRes.data.data);
      if (prodRes.data.success) setProducts(prodRes.data.data.filter(p => p.status === 'Active'));
      if (retRes.data.success) setPurchaseReturns(retRes.data.data);

      if (whRes.data.data.length > 0) setSelectedWarehouse(whRes.data.data[0]._id);
      if (supRes.data.data.length > 0) {
        setSelectedSupplier(supRes.data.data[0]._id);
        setSupplierSearch(supRes.data.data[0].name);
      }
    } catch (err) {
      showMsg(err.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPurchasesData();
  }, []);

  const handleAddPurchaseItem = () => {
    if (!tempProduct || !tempCostPrice || !tempQty) {
      showMsg('Please choose a product, cost price, and quantity', 'error');
      return;
    }

    const prod = products.find(p => p._id === tempProduct);
    if (!prod) return;

    const cost = Number(tempCostPrice);
    const qty = Number(tempQty);
    
    // Check if item already added
    const existingIdx = purchaseItems.findIndex(it => it.productObj?._id === prod._id);
    if (existingIdx !== -1) {
      const updated = [...purchaseItems];
      updated[existingIdx].quantity += qty;
      updated[existingIdx].total = updated[existingIdx].costPrice * updated[existingIdx].quantity;
      setPurchaseItems(updated);
    } else {
      setPurchaseItems(prev => [
        ...prev,
        {
          productObj: prod,
          costPrice: cost,
          quantity: qty,
          total: cost * qty
        }
      ]);
    }

    // Reset selectors
    setTempProduct('');
    setTempCostPrice('');
    setTempQty('');
    setProdSearch('');
    setTimeout(() => {
      scanInputRef.current?.focus();
    }, 50);
  };

  const handleRemoveItem = (idx) => {
    setPurchaseItems(prev => prev.filter((_, i) => i !== idx));
  };

  const handleUpdateItem = (idx, field, value) => {
    const updated = [...purchaseItems];
    const val = Number(value);
    if (field === 'quantity') {
      updated[idx].quantity = Math.max(0, val);
    } else if (field === 'costPrice') {
      updated[idx].costPrice = Math.max(0, val);
    }
    updated[idx].total = updated[idx].costPrice * updated[idx].quantity;
    setPurchaseItems(updated);
  };

  // Calculate totals
  const subTotal = purchaseItems.reduce((acc, curr) => acc + curr.total, 0);
  const discountAmount = subTotal * (Number(discount || 0) / 100);
  const taxAmount = (subTotal - discountAmount) * (Number(purchaseTax || 0) / 100);
  const grandTotal = Math.max(0, subTotal - discountAmount + taxAmount);

  const resetForm = () => {
    setPurchaseItems([]);
    setDiscount(0);
    setPurchaseTax(0);
    setAmountPaid('');
    setPurchaseDate(new Date().toISOString().split('T')[0]);
    setPaymentDate(new Date().toISOString().split('T')[0]);
    setSupplierSearch('');
    setShowSupplierDropdown(false);
    setEditPurchaseId(null);
    setPurchaseNumber('');
    setView('list');
  };

  const handleSavePurchase = async (e) => {
    e.preventDefault();
    if ((!selectedSupplier && !supplierSearch) || !selectedWarehouse || purchaseItems.length === 0) {
      showMsg('Please complete purchase items, warehouse and supplier', 'error');
      return;
    }

    const payload = {
      supplierId: selectedSupplier || supplierSearch,
      warehouseId: selectedWarehouse,
      items: purchaseItems.map(it => ({
        productId: it.productObj?._id,
        costPrice: it.costPrice,
        quantity: it.quantity
      })),
      subTotal,
      discount: discountAmount,
      tax: taxAmount,
      grandTotal,
      paymentStatus,
      amountPaid: paymentStatus === 'Paid' ? grandTotal : Number(amountPaid || 0),
      paymentDate: paymentStatus !== 'Unpaid' ? paymentDate : null,
      date: purchaseDate,
      purchaseNumber: purchaseNumber || undefined
    };

    try {
      setSubmitting(true);
      let res;
      if (editPurchaseId) {
        res = await API.put(`/purchases/${editPurchaseId}`, payload);
      } else {
        res = await API.post('/purchases', payload);
      }

      if (res.data.success) {
        showMsg(editPurchaseId ? 'Stock purchase updated successfully! Inventory updated.' : 'Stock purchased successfully! Inventory updated.');
        await fetchPurchasesData();
        resetForm();
      }
    } catch (err) {
      showMsg(err.message, 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const handleSavePurchaseMetadataOnly = async () => {
    if ((!selectedSupplier && !supplierSearch) || !selectedWarehouse) {
      showMsg('Please complete warehouse and supplier details', 'error');
      return;
    }

    const payload = {
      supplierId: selectedSupplier || supplierSearch,
      warehouseId: selectedWarehouse,
      items: [], // Ignored by backend because itemsUpdated is false
      subTotal,
      discount: discountAmount,
      tax: taxAmount,
      grandTotal,
      paymentStatus,
      amountPaid: paymentStatus === 'Paid' ? grandTotal : Number(amountPaid || 0),
      paymentDate: paymentStatus !== 'Unpaid' ? paymentDate : null,
      date: purchaseDate,
      purchaseNumber: purchaseNumber || undefined,
      itemsUpdated: false
    };

    try {
      setSubmitting(true);
      const res = await API.put(`/purchases/${editPurchaseId}`, payload);
      if (res.data.success) {
        showMsg('Invoice details updated successfully!');
        await fetchPurchasesData();
        resetForm();
      }
    } catch (err) {
      showMsg(err.message, 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const handleSavePurchaseItemsOnly = async () => {
    // Allow saving with 0 items — this resets all product stocks to 0
    const payload = {
      supplierId: selectedSupplier || supplierSearch,
      warehouseId: selectedWarehouse,
      items: purchaseItems.map(it => ({
        productId: it.productObj?._id,
        costPrice: it.costPrice,
        quantity: it.quantity
      })),
      subTotal,
      discount: discountAmount,
      tax: taxAmount,
      grandTotal,
      paymentStatus,
      amountPaid: paymentStatus === 'Paid' ? grandTotal : Number(amountPaid || 0),
      paymentDate: paymentStatus !== 'Unpaid' ? paymentDate : null,
      date: purchaseDate,
      purchaseNumber: purchaseNumber || undefined,
      itemsUpdated: true
    };

    try {
      setSubmitting(true);
      const res = await API.put(`/purchases/${editPurchaseId}`, payload);
      if (res.data.success) {
        const msg = purchaseItems.length === 0
          ? 'All items removed — product quantities reset to 0 in Product list!'
          : 'Purchase items and warehouse quantities updated successfully!';
        showMsg(msg);
        await fetchPurchasesData();
        resetForm();
      }
    } catch (err) {
      showMsg(err.message, 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const handleStartEdit = (p) => {
    setEditPurchaseId(p._id);
    setPurchaseNumber(p.purchaseNumber || '');
    setSelectedSupplier(p.supplier?._id || p.supplier || '');
    setSelectedWarehouse(p.warehouse?._id || p.warehouse || '');
    setPurchaseItems(
      p.items.map((it) => {
        const currentQty = it.quantity;
        return {
          productObj: it.product,
          costPrice: it.costPrice,
          quantity: currentQty,
          total: it.costPrice * currentQty
        };
      })
    );
    setPaymentStatus(p.paymentStatus || 'Paid');
    setAmountPaid(p.amountPaid || '');
    const editSubTotal = p.items.reduce((sum, it) => sum + (it.total || (it.costPrice * it.quantity)), 0);
    const discountPercent = editSubTotal > 0 ? (p.discount / editSubTotal) * 100 : 0;
    setDiscount(Number(discountPercent.toFixed(2)));
    const discountAmt = p.discount || 0;
    const taxPercent = (editSubTotal - discountAmt) > 0 ? (p.tax / (editSubTotal - discountAmt)) * 100 : 0;
    setPurchaseTax(Number(taxPercent.toFixed(2)));
    setPurchaseDate(p.date ? new Date(p.date).toISOString().split('T')[0] : new Date().toISOString().split('T')[0]);
    setPaymentDate(p.paymentDate ? new Date(p.paymentDate).toISOString().split('T')[0] : new Date().toISOString().split('T')[0]);
    setSupplierSearch(p.supplier?.name || '');
    setView('new');
  };

  const handleDeletePurchase = async (id) => {
    if (window.confirm('Are you sure you want to delete this purchase bill? This will reverse the stock restock quantity and supplier balance.')) {
      try {
        const res = await API.delete(`/purchases/${id}`);
        if (res.data.success) {
          showMsg('Purchase bill deleted successfully.');
          fetchPurchasesData();
        }
      } catch (err) {
        showMsg(err.message, 'error');
      }
    }
  };

  const handleOpenDetail = async (id) => {
    try {
      const res = await API.get(`/purchases/${id}`);
      if (res.data.success) {
        setSelectedPurchase(res.data.data);
        setShowDetailModal(true);
      }
    } catch (err) {
      showMsg(err.message, 'error');
    }
  };

  const handleOpenBulkBarcode = async (purchase) => {
    try {
      setBulkBarcodeLoading(true);
      const validItems = purchase?.items?.filter(it => it.product && it.product._id) || [];
      if (validItems.length === 0) {
        showMsg('No valid products found in this purchase to print barcodes for.', 'error');
        return;
      }

      const productIds = validItems.map(it => it.product._id);
      
      const res = await API.post('/products/barcode-bulk', { productIds });
      if (res.data.success) {
        const barcodeDataMap = {};
        res.data.data.forEach(item => {
          barcodeDataMap[item.productId] = item;
        });

        const initialBarcodeItems = validItems.map(it => {
          const prod = it.product;
          const barcodeInfo = barcodeDataMap[prod._id] || {};
          const currentStock = prod.stockQuantity !== undefined ? prod.stockQuantity : 0;
          return {
            product: prod,
            purchaseQuantity: it.quantity || 0,
            currentStock: currentStock,
            quantity: it.quantity || 0,
            customPrice: Number(prod.sellingPrice || 0),
            selected: true,
            barcodeImage: barcodeInfo.barcodeImage || '',
            productName: prod.code ? `${prod.name} - ${isNaN(parseInt(prod.code, 10)) ? prod.code : parseInt(prod.code, 10)}` : prod.name,
            productColor: prod.color || '',
            barcodeValue: prod.barcodeValue || prod.code,
            shopName: barcodeInfo.shopName || 'Deepali Creation'
          };
        });

        setBulkBarcodeItems(initialBarcodeItems);
        setPrintStyle('24-a4');
        setTempPrintStyle('24-a4');
        setShowBulkBarcodeModal(true);
      }
    } catch (err) {
      showMsg(err.message, 'error');
    } finally {
      setBulkBarcodeLoading(false);
    }
  };

  const handleBulkBarcodeQtyChange = (idx, val) => {
    const updated = [...bulkBarcodeItems];
    updated[idx].quantity = Math.max(0, parseInt(val) || 0);
    setBulkBarcodeItems(updated);
  };

  const handleBulkBarcodePriceChange = (idx, val) => {
    const updated = [...bulkBarcodeItems];
    updated[idx].customPrice = Math.max(0, parseFloat(val) || 0);
    setBulkBarcodeItems(updated);
  };

  const handleBulkBarcodeSelectToggle = (idx) => {
    const updated = [...bulkBarcodeItems];
    updated[idx].selected = !updated[idx].selected;
    setBulkBarcodeItems(updated);
  };

  const handleBulkBarcodeSetAllToPurchaseQty = () => {
    setBulkBarcodeItems(prev => prev.map(item => ({ ...item, quantity: item.purchaseQuantity })));
  };

  const handleBulkBarcodeSetAllToCurrentStock = () => {
    setBulkBarcodeItems(prev => prev.map(item => ({ ...item, quantity: item.currentStock })));
  };

  const handleUpdateProductPrice = async (idx) => {
    const item = bulkBarcodeItems[idx];
    if (!item || !item.product || !item.product._id) return;
    
    try {
      const res = await API.put(`/products/${item.product._id}`, {
        sellingPrice: Number(item.customPrice)
      });
      if (res.data.success) {
        showMsg(`Updated database selling price for "${item.productName}" to ₹${Number(item.customPrice).toFixed(2)}.`);
        
        const updated = [...bulkBarcodeItems];
        updated[idx].product.sellingPrice = Number(item.customPrice);
        setBulkBarcodeItems(updated);
      }
    } catch (err) {
      showMsg(err.message, 'error');
    }
  };

  const handleBulkUpdateProductPrices = async () => {
    const selectedToUpdate = bulkBarcodeItems.filter(item => item.selected && item.product && item.product._id);
    if (selectedToUpdate.length === 0) {
      showMsg('No products selected to update prices.', 'error');
      return;
    }
    
    try {
      setBulkBarcodeLoading(true);
      await Promise.all(selectedToUpdate.map(item => 
        API.put(`/products/${item.product._id}`, {
          sellingPrice: Number(item.customPrice)
        })
      ));
      showMsg('Updated database selling prices for all selected products successfully!');
      
      const updated = bulkBarcodeItems.map(item => {
        if (item.selected) {
          item.product.sellingPrice = Number(item.customPrice);
        }
        return item;
      });
      setBulkBarcodeItems(updated);
    } catch (err) {
      showMsg(`Some price updates failed: ${err.message}`, 'error');
    } finally {
      setBulkBarcodeLoading(false);
    }
  };

  const handleOpenReturn = (p) => {
    setSelectedPurchase(p);
    const initialQtys = {};
    p.items.forEach(it => {
      initialQtys[it.product?._id || it.product] = 0;
    });
    setReturnQuantities(initialQtys);
    setShowReturnModal(true);
  };

  const handleReturnQtyChange = (productId, val, max) => {
    const qty = Math.min(max, Math.max(0, Number(val)));
    setReturnQuantities(prev => ({
      ...prev,
      [productId]: qty
    }));
  };

  const handleSubmitReturn = async (e) => {
    e.preventDefault();

    const returnedItems = Object.entries(returnQuantities)
      .map(([productId, quantity]) => ({ productId, quantity }))
      .filter(item => item.quantity > 0);

    if (returnedItems.length === 0) {
      showMsg('Please set return quantity for at least one item', 'error');
      return;
    }

    try {
      const res = await API.post('/purchases/return', {
        purchaseId: selectedPurchase._id,
        returnedItems
      });

      if (res.data.success) {
        showMsg(`Purchase return processed successfully!`);
        fetchPurchasesData();
        setShowReturnModal(false);
      }
    } catch (err) {
      showMsg(err.message, 'error');
    }
  };

  const handleDeleteReturn = async (id) => {
    if (window.confirm('Are you sure you want to delete this purchase return log? This will add returned stock items back to warehouse and revert supplier balance.')) {
      try {
        const res = await API.delete(`/purchases/returns/${id}`);
        if (res.data.success) {
          showMsg('Purchase return deleted successfully and stock restored.');
          fetchPurchasesData();
        }
      } catch (err) {
        showMsg(err.message, 'error');
      }
    }
  };

  const printReceipt = () => {
    window.print();
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
          <h1 className="text-2xl font-bold text-slate-800 dark:text-white">Supplier Purchase Module</h1>
          <p className="text-sm text-slate-400 dark:text-slate-500 mt-0.5">Track incoming inventory purchases and manage vendor logs.</p>
        </div>
        <div>
          {view === 'list' ? (
            <button
              onClick={() => setView('new')}
              className="flex items-center space-x-1.5 bg-primary-600 hover:bg-primary-500 text-white px-4 py-2.5 rounded-xl font-semibold text-xs transition-all shadow-md active:scale-95"
              id="new-purchase-btn"
            >
              <Plus size={16} />
              <span>New Stock Purchase</span>
            </button>
          ) : (
            <button
              onClick={resetForm}
              className="flex items-center space-x-1.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700/80 text-slate-700 dark:text-slate-300 px-4 py-2.5 rounded-xl font-semibold text-xs transition-all"
              id="purchase-list-btn"
            >
              <ArrowLeft size={16} />
              <span>Back to History</span>
            </button>
          )}
        </div>
      </div>

      {view === 'list' ? (
        <div className="space-y-4">
          {/* Tabs bar */}
          <div className="flex border-b border-slate-200 dark:border-slate-800 text-xs font-semibold">
            <button
              onClick={() => setActiveTab('history')}
              className={`pb-2.5 px-4 -mb-px transition-colors ${
                activeTab === 'history'
                  ? 'border-b-2 border-primary-600 text-primary-600 dark:text-primary-400 font-bold'
                  : 'text-slate-400 hover:text-slate-600'
              }`}
            >
              Purchase Bills
            </button>
            <button
              onClick={() => setActiveTab('returns')}
              className={`pb-2.5 px-4 -mb-px transition-colors ${
                activeTab === 'returns'
                  ? 'border-b-2 border-primary-600 text-primary-600 dark:text-primary-400 font-bold'
                  : 'text-slate-400 hover:text-slate-600'
              }`}
            >
              Purchase Returns
            </button>
          </div>

          {activeTab === 'history' ? (
            /* VIEW 1: Purchases History */
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800/80 rounded-2xl shadow-sm overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-50/70 dark:bg-slate-950/40 border-b border-slate-200 dark:border-slate-800 text-slate-400 font-semibold text-xs">
                      <th className="px-6 py-3.5">Purchase Number</th>
                      <th className="px-6 py-3.5">Supplier</th>
                      <th className="px-6 py-3.5">Dest Warehouse</th>
                      <th className="px-6 py-3.5">Purchase Date</th>
                      <th className="px-6 py-3.5 text-center">Payment Status</th>
                      <th className="px-6 py-3.5 text-right">Grand Total</th>
                      <th className="px-6 py-3.5 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 text-slate-700 dark:text-slate-300 text-xs">
                    {loading ? (
                      <tr>
                        <td colSpan="7" className="text-center py-12">
                          <div className="w-8 h-8 border-2 border-primary-500 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
                          <span>Loading purchase invoices...</span>
                        </td>
                      </tr>
                    ) : purchases.length === 0 ? (
                      <tr>
                        <td colSpan="7" className="text-center py-12 text-slate-400">
                          No purchase bills recorded. Click "New Stock Purchase" to create one.
                        </td>
                      </tr>
                    ) : (
                      purchases.map((p) => (
                        <tr key={p._id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors">
                          <td className="px-6 py-3.5 font-mono text-[11px] font-semibold text-slate-800 dark:text-slate-200">{p.purchaseNumber}</td>
                          <td className="px-6 py-3.5 font-semibold text-slate-900 dark:text-white">{p.supplier?.name}</td>
                          <td className="px-6 py-3.5">{p.warehouse?.name}</td>
                          <td className="px-6 py-3.5">{new Date(p.date).toLocaleDateString()}</td>
                          <td className="px-6 py-3.5 text-center">
                            <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                              p.paymentStatus === 'Paid' 
                                ? 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/20' 
                                : p.paymentStatus === 'Partial' 
                                  ? 'bg-amber-500/10 text-amber-500 border border-amber-500/20' 
                                  : 'bg-red-500/10 text-red-500 border border-red-500/20'
                            }`}>
                              {p.paymentStatus}
                            </span>
                          </td>
                          <td className="px-6 py-3.5 text-right font-bold text-slate-850 dark:text-slate-100">
                            ₹{p.grandTotal.toFixed(2)}
                          </td>
                          <td className="px-6 py-3.5 text-right space-x-1 font-sans">
                            <button
                              onClick={() => handleOpenDetail(p._id)}
                              className="p-1.5 text-slate-400 hover:text-primary-500 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition"
                              title="View Details"
                              id={`view-invoice-${p.purchaseNumber}`}
                            >
                              <Eye size={15} />
                            </button>
                            <button
                              onClick={() => handleStartEdit(p)}
                              className="p-1.5 text-slate-400 hover:text-amber-500 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition"
                              title="Edit Purchase"
                              id={`edit-invoice-${p.purchaseNumber}`}
                            >
                              <Edit size={15} />
                            </button>
    
                            <button
                              onClick={() => handleOpenBulkBarcode(p)}
                              className="p-1.5 text-slate-400 hover:text-emerald-500 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition"
                              title="Print Barcodes"
                              id={`print-barcodes-invoice-${p.purchaseNumber}`}
                            >
                              <Barcode size={15} />
                            </button>
                            <button
                              onClick={() => handleOpenReturn(p)}
                              className="p-1.5 text-slate-400 hover:text-purple-500 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition"
                              title="Process Return"
                              id={`return-invoice-${p.purchaseNumber}`}
                            >
                              <RefreshCw size={15} />
                            </button>
                            <button
                              onClick={() => handleDeletePurchase(p._id)}
                              className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition"
                              title="Delete Purchase"
                              id={`delete-invoice-${p.purchaseNumber}`}
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
            /* VIEW 1.2: Purchase Returns List */
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800/80 rounded-2xl shadow-sm overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-50/70 dark:bg-slate-950/40 border-b border-slate-200 dark:border-slate-800 text-slate-400 font-semibold text-xs">
                      <th className="px-6 py-3.5">Return Number</th>
                      <th className="px-6 py-3.5">Original Purchase</th>
                      <th className="px-6 py-3.5">Supplier</th>
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
                    ) : purchaseReturns.length === 0 ? (
                      <tr>
                        <td colSpan="7" className="text-center py-12 text-slate-400">
                          No purchase return logs recorded.
                        </td>
                      </tr>
                    ) : (
                      purchaseReturns.map((r) => (
                        <tr key={r._id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors">
                          <td className="px-6 py-3.5 font-mono text-[11px] font-semibold text-slate-800 dark:text-slate-200">{r.returnNumber}</td>
                          <td className="px-6 py-3.5 font-mono text-[11px] text-slate-500">{r.purchaseNumber}</td>
                          <td className="px-6 py-3.5 font-semibold text-slate-900 dark:text-white">{r.supplier?.name}</td>
                          <td className="px-6 py-3.5">{r.warehouse?.name}</td>
                          <td className="px-6 py-3.5">{new Date(r.date).toLocaleDateString()}</td>
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
        /* VIEW 2: Create Purchase Form */
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          
          {/* Intake Item Setup Forms (7 Cols) */}
          <div className="lg:col-span-8 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800/80 rounded-2xl p-5 shadow-sm space-y-5">
            <h3 className="font-bold text-slate-800 dark:text-white text-sm border-b pb-2 dark:border-slate-800">
              {editPurchaseId ? 'Edit Restock Purchase Details' : 'Restock Item Details'}
            </h3>

            {/* Selector Grid */}
            <div className="grid grid-cols-1 md:grid-cols-12 gap-3.5 text-xs items-end bg-slate-50 dark:bg-slate-950/40 p-4 rounded-xl border border-slate-200/50 dark:border-slate-850">
              <div className="space-y-1 md:col-span-3">
                <span>Search / Scan Code</span>
                <input
                  ref={scanInputRef}
                  type="text"
                  placeholder="Type code or scan..."
                  value={prodSearch}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      if (tempProduct) {
                        qtyInputRef.current?.focus();
                      } else {
                        const cleanedQuery = prodSearch.trim().toLowerCase();
                        if (cleanedQuery) {
                          const exactMatch = products.find(p => 
                            p.code.toLowerCase() === cleanedQuery || 
                            (p.barcodeValue && p.barcodeValue.toLowerCase() === cleanedQuery) ||
                            (!isNaN(parseInt(p.code, 10)) && !isNaN(parseInt(cleanedQuery, 10)) && parseInt(p.code, 10) === parseInt(cleanedQuery, 10))
                          );
                          if (exactMatch) {
                            setTempProduct(exactMatch._id);
                            setTempCostPrice(exactMatch.costPrice);
                            setTempQty('');
                            setTimeout(() => {
                              qtyInputRef.current?.focus();
                            }, 50);
                          }
                        }
                      }
                    }
                  }}
                  onChange={(e) => {
                    const query = e.target.value;
                    setProdSearch(query);
                    
                    // Try to find exact match by code or barcode
                    const cleanedQuery = query.trim().toLowerCase();
                    if (cleanedQuery) {
                      const exactMatch = products.find(p => 
                        p.code.toLowerCase() === cleanedQuery || 
                        (p.barcodeValue && p.barcodeValue.toLowerCase() === cleanedQuery) ||
                        (!isNaN(parseInt(p.code, 10)) && !isNaN(parseInt(cleanedQuery, 10)) && parseInt(p.code, 10) === parseInt(cleanedQuery, 10))
                      );
                      if (exactMatch) {
                        setTempProduct(exactMatch._id);
                        setTempCostPrice(exactMatch.costPrice);
                        setTempQty('');
                        setTimeout(() => {
                          qtyInputRef.current?.focus();
                        }, 50);
                      }
                    }
                  }}
                  className="w-full bg-white dark:bg-slate-900 border rounded-lg py-1.5 px-2 text-slate-700 dark:text-slate-200 focus:outline-none border-slate-200 dark:border-slate-800"
                />
              </div>

              <div className="space-y-1 md:col-span-4">
                <span>Select Product</span>
                <select
                  value={tempProduct}
                  onChange={(e) => {
                    const val = e.target.value;
                    setTempProduct(val);
                    const prod = products.find(p => p._id === val);
                    if (prod) {
                      setTempCostPrice(prod.costPrice);
                      setTempQty(''); // Default quantity to empty string when selected
                      setTimeout(() => {
                        qtyInputRef.current?.focus();
                      }, 50);
                    } else {
                      setTempCostPrice('');
                      setTempQty('');
                    }
                  }}
                  className="w-full bg-white dark:bg-slate-900 border rounded-lg py-1.5 px-2 text-slate-700 dark:text-slate-200 focus:outline-none border-slate-200 dark:border-slate-800"
                >
                  <option value="">Choose item...</option>
                  {products
                    .filter(p => {
                      if (!prodSearch) return true;
                      const q = prodSearch.toLowerCase();
                      return (
                        p.name.toLowerCase().includes(q) ||
                        p.code.toLowerCase().includes(q) ||
                        (p.barcodeValue && p.barcodeValue.toLowerCase().includes(q))
                      );
                    })
                    .map(p => (
                      <option key={p._id} value={p._id}>{p.name} ({p.code})</option>
                    ))
                  }
                </select>
              </div>

              <div className="space-y-1 md:col-span-3">
                <span>Wholesale Cost Price (₹)</span>
                <input
                  type="number"
                  step="0.01"
                  placeholder="Cost price"
                  value={tempCostPrice}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      qtyInputRef.current?.focus();
                    }
                  }}
                  onChange={(e) => setTempCostPrice(e.target.value)}
                  className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg py-1.5 px-2 text-slate-700 dark:text-slate-200 focus:outline-none"
                />
              </div>

              <div className="space-y-1 md:col-span-2">
                <span>Quantity</span>
                <input
                  type="number"
                  ref={qtyInputRef}
                  placeholder="Qty"
                  value={tempQty}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      handleAddPurchaseItem();
                    }
                  }}
                  onChange={(e) => setTempQty(e.target.value)}
                  className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg py-1.5 px-2 text-slate-700 dark:text-slate-200 focus:outline-none"
                />
              </div>

              <button
                type="button"
                onClick={handleAddPurchaseItem}
                className="md:col-span-12 bg-primary-600 hover:bg-primary-500 text-white font-bold py-2 rounded-xl text-center active:scale-[0.99] transition-all"
              >
                Add to Purchase List
              </button>
            </div>

            {/* List Table */}
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-slate-100 dark:border-slate-800 text-slate-400 font-semibold">
                    <th className="py-2.5">Code</th>
                    <th className="py-2.5">Barcode</th>
                    <th className="py-2.5">Product Name</th>
                    <th className="py-2.5 text-center">Wholesale Cost Price</th>
                    <th className="py-2.5 text-center">Quantity</th>
                    <th className="py-2.5 text-center">Total</th>
                    <th className="py-2.5 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50 dark:divide-slate-800/40">
                  {purchaseItems.length === 0 ? (
                    <tr>
                      <td colSpan="7" className="py-8 text-center text-slate-400">
                        No purchase items added yet. Use form above to add items.
                      </td>
                    </tr>
                  ) : (
                    purchaseItems.map((item, idx) => (
                      <tr key={idx} className="text-slate-700 dark:text-slate-300">
                        <td className="py-2.5 font-mono text-[11px]">{item.productObj?.code || 'N/A'}</td>
                        <td className="py-2.5 font-mono text-[11px] text-slate-500">{item.productObj?.barcodeValue || '-'}</td>
                        <td className="py-2.5 font-medium">{item.productObj?.name || 'Deleted Product'}</td>
                        <td className="py-1 text-center">
                          <div className="flex items-center justify-center space-x-1">
                            <span className="text-slate-450">₹</span>
                            <input
                              type="number"
                              step="0.01"
                              value={item.costPrice}
                              onChange={(e) => handleUpdateItem(idx, 'costPrice', e.target.value)}
                              className="w-20 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded px-1.5 py-1 text-center text-xs font-semibold focus:outline-none"
                            />
                          </div>
                        </td>
                        <td className="py-1 text-center">
                          <div className="flex items-center justify-center space-x-1">
                            <input
                              type="number"
                              value={item.quantity}
                              onChange={(e) => handleUpdateItem(idx, 'quantity', e.target.value)}
                              className="w-16 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded px-1.5 py-1 text-center text-xs font-bold focus:outline-none"
                            />
                            <span className="text-[10px] text-slate-400 font-semibold">{item.productObj?.unit || 'Pcs'}</span>
                          </div>
                        </td>
                        <td className="py-2.5 text-center font-bold text-slate-900 dark:text-slate-100">
                          ₹{item.total.toFixed(2)}
                        </td>
                        <td className="py-2.5 text-right">
                          <button
                            type="button"
                            onClick={() => handleRemoveItem(idx)}
                            className="text-red-500 hover:bg-red-50 dark:hover:bg-red-950/20 p-1 rounded"
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

            {editPurchaseId && (
              <div className="pt-4 border-t border-slate-100 dark:border-slate-800 flex justify-end">
                <button
                  type="button"
                  disabled={submitting}
                  onClick={handleSavePurchaseItemsOnly}
                  className={`bg-purple-600 hover:bg-purple-500 text-white font-bold py-2.5 px-5 rounded-xl text-xs flex items-center justify-center space-x-1.5 shadow active:scale-95 transition-all ${submitting ? 'opacity-70 cursor-not-allowed' : ''}`}
                  id="submit-purchase-items-btn"
                >
                  {submitting ? (
                    <>
                      <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      <span>Updating Items...</span>
                    </>
                  ) : (
                    <span>Update Restock Items & Quantities</span>
                  )}
                </button>
              </div>
            )}
          </div>

          {/* Supplier, Warehouse and Invoice Details (4 Cols) */}
          <div className="lg:col-span-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800/80 rounded-2xl p-5 shadow-sm space-y-4">
            <h3 className="font-bold text-slate-800 dark:text-white text-sm border-b pb-2 dark:border-slate-800">
              {editPurchaseId ? 'Edit Invoice Bindings' : 'Purchase Invoice Bindings'}
            </h3>

            <form onSubmit={handleSavePurchase} className="space-y-4 text-xs">
              
              {/* Purchase Number */}
              <div className="space-y-1">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Purchase Number</span>
                <input
                  type="text"
                  placeholder="Auto-generated if left blank"
                  value={purchaseNumber}
                  onChange={(e) => setPurchaseNumber(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-850 rounded-xl py-2 px-3 text-slate-700 dark:text-slate-200 focus:outline-none"
                />
              </div>

              {/* Supplier Selection */}
              <div className="space-y-1 relative">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Supplier</span>
                <input
                  type="text"
                  placeholder="Type to search supplier..."
                  value={supplierSearch}
                  onChange={(e) => {
                    setSupplierSearch(e.target.value);
                    setShowSupplierDropdown(true);
                    // Match exact supplier to set ID
                    const exactMatch = suppliers.find(s => s.name.toLowerCase() === e.target.value.toLowerCase());
                    if (exactMatch) {
                      setSelectedSupplier(exactMatch._id);
                    } else {
                      setSelectedSupplier('');
                    }
                  }}
                  onFocus={() => setShowSupplierDropdown(true)}
                  onBlur={() => {
                    setTimeout(() => setShowSupplierDropdown(false), 200);
                  }}
                  required
                  className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-850 rounded-xl py-2 px-3 text-slate-700 dark:text-slate-200 focus:outline-none"
                />

                {showSupplierDropdown && (
                  <div className="absolute z-10 w-full mt-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-lg max-h-60 overflow-y-auto">
                    {suppliers
                      .filter(s => s.name.toLowerCase().includes(supplierSearch.toLowerCase()))
                      .map(s => (
                        <div
                          key={s._id}
                          onMouseDown={() => {
                            setSelectedSupplier(s._id);
                            setSupplierSearch(s.name);
                            setShowSupplierDropdown(false);
                          }}
                          className="px-3 py-2 cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 text-xs font-semibold"
                        >
                          {s.name} ({s.gstNumber || 'No GST'})
                        </div>
                      ))}
                    {suppliers.filter(s => s.name.toLowerCase().includes(supplierSearch.toLowerCase())).length === 0 && (
                      <div className="px-3 py-2 text-slate-400 text-xs">No suppliers found</div>
                    )}
                  </div>
                )}
                {/* Hidden input to store selected supplier ID */}
                <input type="hidden" name="supplierId" value={selectedSupplier} />
              </div>

              {/* Warehouse Selection */}
              <div className="space-y-1">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Target Destination Warehouse</span>
                <select
                  required
                  value={selectedWarehouse}
                  onChange={(e) => setSelectedWarehouse(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-850 rounded-xl py-2 px-3 text-slate-700 dark:text-slate-200 focus:outline-none"
                >
                  <option value="">Select Warehouse</option>
                  {warehouses.map(wh => (
                    <option key={wh._id} value={wh._id}>{wh.name}</option>
                  ))}
                </select>
              </div>

              {/* Purchase Date */}
              <div className="space-y-1">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Purchase Date</span>
                <input
                  type="date"
                  required
                  value={purchaseDate}
                  onChange={(e) => setPurchaseDate(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-850 rounded-xl py-2 px-3 text-slate-700 dark:text-slate-200 focus:outline-none"
                />
              </div>

              {/* Discount Input */}
              <div className="space-y-1">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Bill Discount (%)</span>
                <input
                  type="number"
                  placeholder="0"
                  step="0.01"
                  min="0"
                  max="100"
                  value={discount}
                  onChange={(e) => setDiscount(Math.max(0, Math.min(100, Number(e.target.value))))}
                  className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-850 rounded-xl py-2 px-3 text-slate-700 dark:text-slate-200 focus:outline-none"
                />
              </div>

              {/* GST/Tax Input */}
              <div className="space-y-1">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">GST (%)</span>
                <input
                  type="number"
                  placeholder="0"
                  step="0.01"
                  min="0"
                  max="100"
                  value={purchaseTax}
                  onChange={(e) => setPurchaseTax(Math.max(0, Math.min(100, Number(e.target.value))))}
                  className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-850 rounded-xl py-2 px-3 text-slate-700 dark:text-slate-200 focus:outline-none"
                />
              </div>

              {/* Payment Status */}
              <div className="space-y-1">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Payment Status</span>
                <select
                  value={paymentStatus}
                  onChange={(e) => setPaymentStatus(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-850 rounded-xl py-2 px-3 text-slate-700 dark:text-slate-200 focus:outline-none"
                >
                  <option value="Paid">Fully Paid</option>
                  <option value="Partial">Partially Paid</option>
                  <option value="Unpaid">Unpaid (Credit Ledger)</option>
                </select>
              </div>

              {paymentStatus === 'Partial' && (
                <div className="space-y-1">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Amount Paid (₹)</span>
                  <input
                    type="number"
                    required
                    placeholder="Enter paid amount"
                    value={amountPaid}
                    onChange={(e) => setAmountPaid(e.target.value)}
                    className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-850 rounded-xl py-2 px-3 text-slate-700 dark:text-slate-200 focus:outline-none"
                  />
                </div>
              )}

              {paymentStatus !== 'Unpaid' && (
                <div className="space-y-1">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Payment Date</span>
                  <input
                    type="date"
                    required
                    value={paymentDate}
                    onChange={(e) => setPaymentDate(e.target.value)}
                    className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-850 rounded-xl py-2 px-3 text-slate-700 dark:text-slate-200 focus:outline-none"
                  />
                </div>
              )}

              {/* Calculations Block */}
              <div className="bg-slate-50 dark:bg-slate-950/40 p-3.5 rounded-2xl border space-y-2">
                <div className="flex justify-between text-[11px] text-slate-500">
                  <span>Total Items:</span>
                  <span className="font-semibold text-slate-700 dark:text-slate-350">{purchaseItems.length} items</span>
                </div>
                <div className="flex justify-between text-[11px] text-slate-500 pb-1 border-b dark:border-slate-850">
                  <span>Total Quantity:</span>
                  <span className="font-semibold text-slate-700 dark:text-slate-350">
                    {purchaseItems.reduce((acc, curr) => acc + Number(curr.quantity || 0), 0)} Pcs
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-450">Subtotal:</span>
                  <span className="font-semibold">₹{subTotal.toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-450">Discount ({discount}%):</span>
                  <span className="text-red-500 font-semibold">-₹{discountAmount.toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-450">GST ({purchaseTax}%):</span>
                  <span className="text-emerald-500 font-semibold">+₹{taxAmount.toFixed(2)}</span>
                </div>
                <div className="flex justify-between border-t dark:border-slate-850 pt-1.5 text-xs font-bold text-slate-900 dark:text-white">
                  <span>Grand Total:</span>
                  <span className="text-primary-600 dark:text-primary-400">₹{grandTotal.toFixed(2)}</span>
                </div>
              </div>

              {editPurchaseId && (
                <button
                  type="button"
                  onClick={() => {
                    const originalPur = purchases.find(p => p._id === editPurchaseId);
                    if (originalPur) {
                      handleOpenReturn(originalPur);
                    }
                  }}
                  className="w-full bg-purple-600 hover:bg-purple-500 text-white font-bold py-2.5 rounded-xl text-center shadow-md active:scale-95 transition-all mb-2"
                  id="edit-return-items-btn"
                >
                  Return Items to Supplier
                </button>
              )}

               {editPurchaseId ? (
                <button
                  type="button"
                  disabled={submitting}
                  onClick={handleSavePurchaseMetadataOnly}
                  className={`w-full bg-primary-600 hover:bg-primary-500 text-white font-bold py-3.5 rounded-xl text-center shadow-md active:scale-95 transition-all flex items-center justify-center space-x-2 ${submitting ? 'opacity-70 cursor-not-allowed' : ''}`}
                  id="submit-purchase-metadata-btn"
                >
                  {submitting ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      <span>Saving...</span>
                    </>
                  ) : (
                    <span>Update Invoice Details Only</span>
                  )}
                </button>
              ) : (
                <button
                  type="submit"
                  disabled={submitting}
                  className={`w-full bg-primary-600 hover:bg-primary-500 text-white font-bold py-3.5 rounded-xl text-center shadow-md active:scale-95 transition-all flex items-center justify-center space-x-2 ${submitting ? 'opacity-70 cursor-not-allowed' : ''}`}
                  id="submit-purchase-order-btn"
                >
                  {submitting ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      <span>Processing...</span>
                    </>
                  ) : (
                    <span>Post Restock Purchase</span>
                  )}
                </button>
              )}
            </form>
          </div>
        </div>
      )}
    </div>

    {/* DETAIL MODAL */}
    {showDetailModal && selectedPurchase && (
      <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm z-40 flex items-center justify-center p-4">
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl w-full max-w-lg shadow-2xl p-6 space-y-4 no-print">
          <div className="flex items-center justify-between border-b pb-2.5 dark:border-slate-800">
            <h3 className="text-lg font-bold text-slate-800 dark:text-white">Purchase Invoice Details</h3>
            <button onClick={() => setShowDetailModal(false)} className="text-slate-400 hover:text-slate-200">
              <X size={20} />
            </button>
          </div>

          <div className="space-y-4 text-xs font-sans">
            <div className="grid grid-cols-2 gap-3.5 border-b pb-3 dark:border-slate-800 text-slate-500">
              <div>
                <span className="block font-bold uppercase text-[9px] tracking-wide text-slate-450">Purchase Number</span>
                <span className="font-semibold font-mono text-slate-800 dark:text-slate-200 text-sm">{selectedPurchase.purchaseNumber}</span>
              </div>
              <div>
                <span className="block font-bold uppercase text-[9px] tracking-wide text-slate-450">Purchase Date</span>
                <span className="font-semibold text-slate-800 dark:text-slate-200">{new Date(selectedPurchase.date).toLocaleDateString()}</span>
              </div>
              <div>
                <span className="block font-bold uppercase text-[9px] tracking-wide text-slate-450">Supplier</span>
                <span className="font-bold text-slate-900 dark:text-white">{selectedPurchase.supplier?.name}</span>
              </div>
              <div>
                <span className="block font-bold uppercase text-[9px] tracking-wide text-slate-450">Destination Warehouse</span>
                <span className="font-semibold text-slate-800 dark:text-slate-200">{selectedPurchase.warehouse?.name}</span>
              </div>
              <div>
                <span className="block font-bold uppercase text-[9px] tracking-wide text-slate-450">Payment Status</span>
                <span className="font-bold text-slate-800 dark:text-slate-200">{selectedPurchase.paymentStatus}</span>
              </div>
              <div>
                <span className="block font-bold uppercase text-[9px] tracking-wide text-slate-450">Amount Paid</span>
                <span className="font-bold text-slate-850 dark:text-slate-100">₹{selectedPurchase.amountPaid?.toFixed(2) || '0.00'}</span>
              </div>
              {selectedPurchase.paymentDate && (
                <div className="col-span-2">
                  <span className="block font-bold uppercase text-[9px] tracking-wide text-slate-450">Payment Date</span>
                  <span className="font-semibold text-slate-800 dark:text-slate-200">{new Date(selectedPurchase.paymentDate).toLocaleDateString()}</span>
                </div>
              )}
            </div>

            {/* Items List */}
            <div className="space-y-2">
              <p className="font-bold text-[10px] uppercase text-slate-450 tracking-wider">Purchased Items</p>
              <div className="divide-y divide-slate-100 dark:divide-slate-800 border rounded-xl bg-slate-50/20 dark:bg-slate-950/40 p-2 max-h-[220px] overflow-y-auto pr-1">
                {selectedPurchase.items?.map((item, idx) => (
                  <div key={idx} className="py-2.5 flex items-center justify-between">
                    <div>
                      <p className="font-semibold text-slate-800 dark:text-slate-200">{item.product?.name || 'Deleted Product'}</p>
                      <span className="text-[10px] text-slate-400 font-mono">Code: {item.product?.code || 'N/A'} | Barcode: {item.product?.barcodeValue || 'N/A'}</span>
                    </div>
                    <div className="text-right">
                      <p className="font-bold text-slate-800 dark:text-slate-250">{item.quantity} units</p>
                      <span className="text-[10px] text-slate-500 font-mono">₹{item.costPrice.toFixed(2)} ea</span>
                      <p className="font-extrabold text-slate-900 dark:text-white mt-0.5">₹{item.total.toFixed(2)}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Bill Totals summary */}
            <div className="bg-slate-50 dark:bg-slate-950/45 p-3 rounded-2xl border dark:border-slate-850 space-y-1.5">
              <div className="flex justify-between">
                <span className="text-slate-450">Total Items:</span>
                <span className="font-semibold">{selectedPurchase.items?.length || 0} items</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-450">Total Quantity:</span>
                <span className="font-semibold">{selectedPurchase.items?.reduce((acc, curr) => acc + Number(curr.quantity || 0), 0)} Pcs</span>
              </div>
              <div className="flex justify-between border-t dark:border-slate-850 pt-1">
                <span className="text-slate-450">Subtotal:</span>
                <span>₹{selectedPurchase.subTotal.toFixed(2)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-450">Discount:</span>
                <span className="text-red-500 font-semibold">-₹{selectedPurchase.discount.toFixed(2)}</span>
              </div>
              <div className="flex justify-between border-t dark:border-slate-850 pt-1.5 font-bold text-slate-900 dark:text-white text-sm">
                <span>Grand Total:</span>
                <span className="text-primary-600 dark:text-primary-400">₹{selectedPurchase.grandTotal.toFixed(2)}</span>
              </div>
              <div className="flex justify-between border-t dark:border-slate-850 pt-1 text-slate-500">
                <span>Amount Paid:</span>
                <span className="font-semibold text-slate-700 dark:text-slate-350">₹{selectedPurchase.amountPaid.toFixed(2)}</span>
              </div>
              <div className="flex justify-between font-bold text-red-600 dark:text-red-400">
                <span>Remaining Price:</span>
                <span>₹{(selectedPurchase.grandTotal - selectedPurchase.amountPaid).toFixed(2)}</span>
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
              onClick={() => {
                setShowDetailModal(false);
                handleOpenReturn(selectedPurchase);
              }}
              className="bg-purple-600 hover:bg-purple-500 text-white px-5 py-2 rounded-xl text-xs font-bold flex items-center space-x-1.5"
              id="detail-return-items-btn"
            >
              <RefreshCw size={14} />
              <span>Return Items</span>
            </button>
            <button
              onClick={() => {
                setShowDetailModal(false);
                handleOpenBulkBarcode(selectedPurchase);
              }}
              className="bg-emerald-600 hover:bg-emerald-500 text-white px-5 py-2 rounded-xl text-xs font-bold flex items-center space-x-1.5"
              id="purchase-invoice-barcode-btn"
            >
              <Barcode size={14} />
              <span>Print Barcodes</span>
            </button>
            <button
              onClick={printReceipt}
              className="bg-primary-600 hover:bg-primary-500 text-white px-5 py-2 rounded-xl text-xs font-bold flex items-center space-x-1.5"
              id="purchase-invoice-print-btn"
            >
              <Printer size={14} />
              <span>Print receipt</span>
            </button>
          </div>
        </div>
      </div>
    )}

    {/* PRINT-ONLY AREA: invoice detail printing */}
    {selectedPurchase && !showBulkBarcodeModal && (
      <div className="hidden print-area">
        <div className="p-6 bg-white text-black font-mono text-[12px] max-w-[3in] mx-auto space-y-3 leading-relaxed">
          <div className="text-center space-y-1">
            <h2 className="font-extrabold text-base tracking-widest uppercase">Deepali Creation</h2>
            <p className="text-[10px] leading-tight">Supplier Purchase Order Bill</p>
          </div>
          <div className="border-t border-b border-black py-1.5 space-y-1 text-[10px]">
            <div>Bill Number: <span className="font-bold">{selectedPurchase.purchaseNumber}</span></div>
            <div>Date: {new Date(selectedPurchase.date).toLocaleString()}</div>
            <div>Supplier: {selectedPurchase.supplier?.name}</div>
            <div>Warehouse: {selectedPurchase.warehouse?.name}</div>
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
              {selectedPurchase.items?.map((item, idx) => (
                <tr key={idx}>
                  <td className="py-1">{item.product?.name}</td>
                  <td className="py-1 text-center">{item.quantity}</td>
                  <td className="py-1 text-right">₹{item.total.toFixed(2)}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <div className="space-y-1 text-right text-[11px]">
            <div>Total Items: {selectedPurchase.items?.length || 0}</div>
            <div>Total Qty: {selectedPurchase.items?.reduce((acc, curr) => acc + Number(curr.quantity || 0), 0)} Pcs</div>
            <div>Subtotal: ₹{selectedPurchase.subTotal.toFixed(2)}</div>
            {selectedPurchase.discount > 0 && <div className="font-semibold text-black">Discount: -₹{selectedPurchase.discount.toFixed(2)}</div>}
            <div className="font-extrabold text-sm border-t border-dashed border-black pt-1">
              Grand Total: ₹{selectedPurchase.grandTotal.toFixed(2)}
            </div>
            <div>Amount Paid: ₹{selectedPurchase.amountPaid.toFixed(2)}</div>
            <div className="font-bold text-black border-t border-dotted border-black pt-0.5 mt-0.5">Remaining Price: ₹{(selectedPurchase.grandTotal - selectedPurchase.amountPaid).toFixed(2)}</div>
          </div>
        </div>

      </div>
    )}

      {/* PURCHASE RETURN / REFUND MODAL */}
      {showReturnModal && selectedPurchase && (
        <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm z-40 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl w-full max-w-lg shadow-2xl p-6 space-y-4">
            <div className="flex items-center justify-between border-b pb-2.5 dark:border-slate-800">
              <h3 className="text-lg font-bold text-slate-800 dark:text-white">Process Purchase Return</h3>
              <button onClick={() => setShowReturnModal(false)} className="text-slate-400 hover:text-slate-200">
                <X size={20} />
              </button>
            </div>

            <div className="bg-slate-50 dark:bg-slate-950/30 p-3.5 border rounded-2xl flex items-start space-x-2.5 text-xs">
              <AlertTriangle className="text-amber-500 shrink-0 mt-0.5" />
              <p className="text-slate-500 leading-normal">
                Returning purchased items decrements warehouse stock from **{selectedPurchase.warehouse?.name}** and adjusts outstanding supplier ledger balance.
              </p>
            </div>

            <form onSubmit={handleSubmitReturn} className="space-y-4 text-xs font-sans">
              <div className="divide-y divide-slate-100 dark:divide-slate-800 border rounded-xl overflow-hidden bg-slate-50/20 dark:bg-slate-950/40 p-2">
                {selectedPurchase.items.map((item) => {
                  const prodId = item.product?._id || item.product;
                  const prodCode = item.productCode || item.product?.code || 'deleted';
                  return (
                    <div key={prodId} className="py-2.5 flex items-center justify-between">
                      <div>
                        <p className="font-semibold text-slate-800 dark:text-slate-200">{item.productName || item.product?.name || 'Deleted Product'}</p>
                        <span className="text-[10px] text-slate-400 block font-mono">Bought: {item.quantity} | Cost: ₹{item.costPrice.toFixed(2)}</span>
                      </div>
                      
                      {/* Return input fields */}
                      <div className="flex items-center space-x-2 shrink-0">
                        <span>Return Qty:</span>
                        <input
                          type="number"
                          min="0"
                          max={item.quantity}
                          value={returnQuantities[prodId] || 0}
                          onChange={(e) => handleReturnQtyChange(prodId, e.target.value, item.quantity)}
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
                  onClick={() => setShowReturnModal(false)}
                  className="bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700/80 text-slate-650 dark:text-slate-300 px-4 py-2 rounded-xl text-xs font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="bg-primary-600 hover:bg-primary-500 text-white px-5 py-2 rounded-xl text-xs font-bold"
                  id="submit-purchase-return-btn"
                >
                  Confirm Return
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* PURCHASE RETURN DETAIL MODAL */}
      {showReturnDetailModal && selectedReturn && (
        <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm z-40 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl w-full max-w-lg shadow-2xl p-6 space-y-4">
            <div className="flex items-center justify-between border-b pb-2.5 dark:border-slate-800">
              <h3 className="text-lg font-bold text-slate-800 dark:text-white">Purchase Return Details</h3>
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
                  <span className="font-semibold text-slate-800 dark:text-slate-200">{new Date(selectedReturn.date).toLocaleDateString()}</span>
                </div>
                <div>
                  <span className="block font-bold uppercase text-[9px] tracking-wide text-slate-450">Original Purchase</span>
                  <span className="font-semibold font-mono text-slate-850 dark:text-slate-200">{selectedReturn.purchaseNumber}</span>
                </div>
                <div>
                  <span className="block font-bold uppercase text-[9px] tracking-wide text-slate-450">Supplier</span>
                  <span className="font-bold text-slate-900 dark:text-white">{selectedReturn.supplier?.name}</span>
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
                        <span className="text-[10px] text-slate-500 font-mono">₹{item.costPrice.toFixed(2)} ea</span>
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

      {/* MODAL 5: Bulk Barcode Sticker Printing Wizard */}
      {showBulkBarcodeModal && bulkBarcodeItems.length > 0 && (
        <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm z-40 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl w-full max-w-4xl shadow-2xl p-6 space-y-4 no-print max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3 shrink-0">
              <div>
                <h3 className="text-lg font-bold text-slate-800 dark:text-white">Purchase Barcodes Printing Wizard</h3>
                <p className="text-xs text-slate-400">Configure sticker sheets for the products in this purchase.</p>
              </div>
              <button onClick={() => setShowBulkBarcodeModal(false)} className="text-slate-400 hover:text-slate-200">
                <X size={20} />
              </button>
            </div>

            {/* Config & Table area */}
            <div className="flex-1 overflow-y-auto space-y-4 pr-1 min-h-0">
              
              {/* Print Layout Selection Dropdown */}
              <div className="bg-slate-50 dark:bg-slate-950/40 p-4 rounded-2xl border border-slate-200/50 dark:border-slate-850 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                <div>
                  <span className="text-xs font-bold text-slate-700 dark:text-slate-350 block mb-1">Select Sticker Layout Style *</span>
                  <p className="text-[10px] text-slate-400 font-medium">Choose the label sheet format or choose Continuous feed for thermal label printing.</p>
                </div>
                <div className="flex items-center space-x-2 shrink-0 w-full md:w-auto">
                  <select
                    value={tempPrintStyle}
                    onChange={(e) => setTempPrintStyle(e.target.value)}
                    className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-850 rounded-xl py-2 px-3 text-slate-700 dark:text-slate-200 text-xs font-bold focus:outline-none focus:border-primary-500 shadow-sm w-full md:w-64"
                  >
                    {Object.entries(BARCODE_STYLES).map(([key, styleObj]) => (
                      <option key={key} value={key}>
                        {styleObj.name}
                      </option>
                    ))}
                  </select>
                  <button
                    type="button"
                    onClick={() => {
                      setPrintStyle(tempPrintStyle);
                      showMsg('Applied print layout style settings.');
                    }}
                    className="bg-primary-600 hover:bg-primary-500 text-white py-2 px-4 rounded-xl text-xs font-bold transition-all shadow-md active:scale-95 flex items-center space-x-1.5 shrink-0"
                  >
                    <RefreshCw size={14} />
                    <span>Update</span>
                  </button>
                </div>
              </div>

              {/* Table Actions & Title */}
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 px-1">
                <span className="text-xs font-bold text-slate-500">Items List ({bulkBarcodeItems.length})</span>
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={handleBulkBarcodeSetAllToPurchaseQty}
                    className="text-[10px] bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700/80 text-slate-700 dark:text-slate-350 py-1.5 px-3 rounded-lg font-bold transition-all shadow-sm active:scale-95"
                  >
                    Set all to Purchase Qty
                  </button>
                  <button
                    type="button"
                    onClick={handleBulkBarcodeSetAllToCurrentStock}
                    className="text-[10px] bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700/80 text-slate-700 dark:text-slate-350 py-1.5 px-3 rounded-lg font-bold transition-all shadow-sm active:scale-95"
                  >
                    Set all to Current Stock
                  </button>
                </div>
              </div>

              {/* Items List Table */}
              <div className="border border-slate-200 dark:border-slate-800/80 rounded-2xl overflow-hidden bg-slate-50/20 dark:bg-slate-950/40">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-slate-50/50 dark:bg-slate-950/60 border-b border-slate-200 dark:border-slate-800 text-slate-400 font-semibold">
                      <th className="px-4 py-3 text-center w-12">
                        <input
                          type="checkbox"
                          checked={bulkBarcodeItems.every(item => item.selected)}
                          onChange={() => {
                            const allSelected = bulkBarcodeItems.every(item => item.selected);
                            setBulkBarcodeItems(bulkBarcodeItems.map(item => ({ ...item, selected: !allSelected })));
                          }}
                          className="rounded text-primary-600 focus:ring-primary-500 w-4 h-4 cursor-pointer"
                        />
                      </th>
                      <th className="px-4 py-3">Product Info</th>
                      <th className="px-4 py-3 text-center">Current Stock (Pcs)</th>
                      <th className="px-4 py-3 text-center">Purchase Qty (Pcs)</th>
                      <th className="px-4 py-3 text-center">Cost Price</th>
                      <th className="px-4 py-3 text-center">Selling Price (₹)</th>
                      <th className="px-4 py-3 text-center">Stickers to Print</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
                    {bulkBarcodeItems.map((item, idx) => (
                      <tr 
                        key={idx} 
                        className={`text-slate-700 dark:text-slate-350 hover:bg-slate-50/50 dark:hover:bg-slate-800/20 transition-colors ${
                          !item.selected ? 'opacity-50' : ''
                        }`}
                      >
                        <td className="px-4 py-3 text-center">
                          <input
                            type="checkbox"
                            checked={item.selected}
                            onChange={() => handleBulkBarcodeSelectToggle(idx)}
                            className="rounded text-primary-600 focus:ring-primary-500 w-4 h-4 cursor-pointer"
                          />
                        </td>
                        <td className="px-4 py-3">
                          <div className="font-semibold text-slate-900 dark:text-white">
                            {item.productName} {item.productColor ? `(${item.productColor})` : ''}
                          </div>
                          <span className="text-[10px] text-slate-400 font-mono">
                            Code: {item.product?.code} | Barcode: {item.barcodeValue}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-center font-bold text-slate-800 dark:text-white">
                          {item.currentStock}
                        </td>
                        <td className="px-4 py-3 text-center font-semibold text-slate-500 dark:text-slate-400">
                          {item.purchaseQuantity}
                        </td>
                        <td className="px-4 py-3 text-center font-mono text-[11px]">
                          ₹{Number(item.product?.costPrice || 0).toFixed(2)}
                        </td>
                        <td className="px-4 py-3 text-center">
                          <div className="inline-flex items-center justify-center space-x-1">
                            <span className="text-slate-400">₹</span>
                            <input
                              type="number"
                              step="0.01"
                              value={item.customPrice}
                              disabled={!item.selected}
                              onChange={(e) => handleBulkBarcodePriceChange(idx, e.target.value)}
                              className="w-20 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg px-2 py-1 text-center font-semibold text-xs focus:outline-none focus:border-primary-500 disabled:bg-slate-100 dark:disabled:bg-slate-950"
                            />
                            {item.selected && (
                              <button
                                type="button"
                                onClick={() => handleUpdateProductPrice(idx)}
                                title="Update this price in database"
                                className="p-1 text-slate-400 hover:text-emerald-500 hover:bg-slate-100 dark:hover:bg-slate-800 rounded transition"
                              >
                                <Save size={13} />
                              </button>
                            )}
                          </div>
                        </td>
                        <td className="px-4 py-3 text-center">
                          <input
                            type="number"
                            min="0"
                            value={item.quantity}
                            disabled={!item.selected}
                            onChange={(e) => handleBulkBarcodeQtyChange(idx, e.target.value)}
                            className="w-20 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg px-2 py-1 text-center font-bold text-xs focus:outline-none focus:border-primary-500 disabled:bg-slate-100 dark:disabled:bg-slate-950"
                          />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Preview Sheet Card */}
              <div className="space-y-2">
                <span className="text-xs font-bold text-slate-700 dark:text-slate-350 block">Sticker Sheet Print Preview</span>
                <div className="border border-slate-200 dark:border-slate-800 p-6 rounded-2xl bg-slate-100 dark:bg-slate-950/80 max-h-72 overflow-y-auto flex justify-center">
                  {bulkBarcodeItems.filter(item => item.selected && (Math.max(0, Math.floor(Number(item.quantity) || 0)) > 0)).length === 0 ? (
                    <div className="text-slate-400 text-xs py-8">Select products and set print quantities to preview.</div>
                  ) : (
                    <div 
                      className="bg-white p-6 shadow-inner rounded border border-slate-300 text-black"
                      style={printStyle !== 'continuous' ? {
                        display: 'grid',
                        gridTemplateColumns: `repeat(${BARCODE_STYLES[printStyle].cols}, 1fr)`,
                        gap: BARCODE_STYLES[printStyle].gap,
                        width: BARCODE_STYLES[printStyle].isA4 ? '210mm' : '100%',
                        boxSizing: 'border-box'
                      } : {
                        display: 'grid',
                        gridTemplateColumns: '1fr',
                        gap: '8px',
                        width: '280px'
                      }}
                    >
                      {bulkBarcodeItems
                        .filter(item => item.selected && (Math.max(0, Math.floor(Number(item.quantity) || 0)) > 0))
                        .flatMap((item, itemIdx) => 
                          Array.from({ length: Math.max(0, Math.floor(Number(item.quantity) || 0)) }).map((_, copyIdx) => (
                            <div 
                              key={`${itemIdx}-${copyIdx}`}
                              className="border border-slate-450 rounded text-center bg-white text-black flex flex-col justify-between items-center shadow-sm"
                              style={printStyle === 'continuous' ? {
                                width: '3.1cm',
                                height: '2.3cm',
                                padding: BARCODE_STYLES[printStyle].padding,
                                boxSizing: 'border-box',
                                pageBreakInside: 'avoid',
                                breakInside: 'avoid'
                              } : {
                                width: '100%',
                                height: BARCODE_STYLES[printStyle].height,
                                padding: BARCODE_STYLES[printStyle].padding,
                                boxSizing: 'border-box',
                                pageBreakInside: 'avoid',
                                breakInside: 'avoid'
                              }}
                            >
                              <p 
                                className="font-extrabold uppercase leading-none text-slate-900 truncate w-full"
                                style={{ fontSize: BARCODE_STYLES[printStyle].fontSizeName, letterSpacing: '0.3px' }}
                              >
                                {item.shopName}
                              </p>
                              <p 
                                className="font-bold leading-tight truncate w-full"
                                style={{ fontSize: BARCODE_STYLES[printStyle].fontSizeName }}
                              >
                                {item.productName} {item.productColor ? `(${item.productColor})` : ''}
                              </p>
                              <img 
                                src={item.barcodeImage} 
                                alt="Barcode" 
                                className="mx-auto object-contain max-w-[95%]"
                                style={{ 
                                  height: BARCODE_STYLES[printStyle].imgHeight,
                                  imageRendering: 'pixelated'
                                }}
                              />
                              <div 
                                className="flex items-center justify-between font-bold w-full font-mono leading-none text-slate-700 gap-2 px-1"
                                style={{ fontSize: BARCODE_STYLES[printStyle].fontSizeNo }}
                              >
                                <span>No: {item.barcodeValue}</span>
                                <span className="font-extrabold text-black" style={{ fontSize: BARCODE_STYLES[printStyle].fontSizePrice }}>
                                  ₹{Number(item.customPrice || 0).toFixed(2)}
                                </span>
                              </div>
                            </div>
                          ))
                        )}
                    </div>
                  )}
                </div>
              </div>

            </div>

            {/* Actions Footer */}
            <div className="flex items-center justify-end space-x-2 border-t border-slate-100 dark:border-slate-800 pt-3 shrink-0">
              <button
                onClick={() => setShowBulkBarcodeModal(false)}
                className="bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700/80 text-slate-650 dark:text-slate-300 px-4 py-2 rounded-xl text-xs font-semibold"
              >
                Close
              </button>
              <button
                onClick={() => window.print()}
                disabled={bulkBarcodeItems.filter(item => item.selected && (Math.max(0, Math.floor(Number(item.quantity) || 0)) > 0)).length === 0}
                className="bg-primary-600 hover:bg-primary-500 disabled:opacity-50 text-white px-5 py-2.5 rounded-xl text-xs font-semibold flex items-center space-x-1.5 shadow-md active:scale-95 transition-all"
                id="print-stickers-execute-btn"
              >
                <Printer size={15} />
                <span>Print Sticker Sheet</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* PRINT-ONLY AREA: Hidden on web screens, renders on trigger print */}
      {showBulkBarcodeModal && bulkBarcodeItems.length > 0 && (
        <div className="hidden print-area bg-white text-black font-sans w-full">
          {printStyle === 'continuous' ? (
            /* Single Thermal layout printed sequentially */
            <div className="space-y-4 bg-white">
              {bulkBarcodeItems
                .filter(item => item.selected && (Math.max(0, Math.floor(Number(item.quantity) || 0)) > 0))
                .flatMap((item, itemIdx) => 
                  Array.from({ length: Math.max(0, Math.floor(Number(item.quantity) || 0)) }).map((_, copyIdx) => (
                    <div 
                      key={`print-thermal-${itemIdx}-${copyIdx}`}
                      className="flex justify-center items-center p-0.5 bg-white text-black mx-auto"
                      style={{
                        width: '3.1cm',
                        height: '2.3cm',
                        pageBreakAfter: 'always',
                        pageBreakInside: 'avoid',
                        breakInside: 'avoid'
                      }}
                    >
                      <div 
                        className="border border-black text-center bg-white text-black flex flex-col justify-between items-center rounded-sm w-full h-full box-border"
                        style={{ padding: BARCODE_STYLES[printStyle].padding }}
                      >
                        <p 
                          className="font-extrabold tracking-wider uppercase text-black leading-none truncate w-full"
                          style={{ fontSize: BARCODE_STYLES[printStyle].fontSizeName }}
                        >
                          {item.shopName}
                        </p>
                        <p 
                          className="font-bold text-black leading-none truncate max-w-full"
                          style={{ fontSize: BARCODE_STYLES[printStyle].fontSizeName }}
                        >
                          {item.productName} {item.productColor ? `(${item.productColor})` : ''}
                        </p>
                        <img 
                          src={item.barcodeImage} 
                          alt="Barcode" 
                          className="object-contain max-w-[95%] mx-auto"
                          style={{ 
                            height: BARCODE_STYLES[printStyle].imgHeight,
                            imageRendering: 'pixelated'
                          }}
                        />
                        <div 
                          className="flex items-center justify-between font-bold w-full px-1 text-black font-mono leading-none"
                          style={{ fontSize: BARCODE_STYLES[printStyle].fontSizeNo }}
                        >
                          <span>No: {item.barcodeValue}</span>
                          <span className="font-extrabold" style={{ fontSize: BARCODE_STYLES[printStyle].fontSizePrice }}>
                            ₹{Number(item.customPrice || 0).toFixed(2)}
                          </span>
                        </div>
                      </div>
                    </div>
                  ))
                )}
            </div>
          ) : (
            /* Custom grid layout printed on sheet */
            <div 
              className="bg-white text-black w-full mx-auto box-border"
              style={{
                display: 'grid',
                gridTemplateColumns: `repeat(${BARCODE_STYLES[printStyle].cols}, 1fr)`,
                gap: BARCODE_STYLES[printStyle].gap,
                padding: BARCODE_STYLES[printStyle].isA4 ? '5mm' : '0mm',
                width: BARCODE_STYLES[printStyle].isA4 ? '210mm' : '100%',
                boxSizing: 'border-box'
              }}
            >
              {bulkBarcodeItems
                .filter(item => item.selected && (Math.max(0, Math.floor(Number(item.quantity) || 0)) > 0))
                .flatMap((item, itemIdx) => 
                  Array.from({ length: Math.max(0, Math.floor(Number(item.quantity) || 0)) }).map((_, copyIdx) => (
                    <div 
                      key={`print-grid-${itemIdx}-${copyIdx}`}
                      className="border border-slate-400 text-center bg-white text-black flex flex-col justify-between items-center rounded-sm box-border w-full"
                      style={{
                        height: BARCODE_STYLES[printStyle].height,
                        padding: BARCODE_STYLES[printStyle].padding,
                        boxSizing: 'border-box',
                        pageBreakInside: 'avoid',
                        breakInside: 'avoid'
                      }}
                    >
                      <p 
                        className="font-extrabold uppercase leading-none text-black truncate w-full"
                        style={{ fontSize: BARCODE_STYLES[printStyle].fontSizeName }}
                      >
                        {item.shopName}
                      </p>
                      <p 
                        className="font-bold leading-tight truncate w-full text-slate-800"
                        style={{ fontSize: BARCODE_STYLES[printStyle].fontSizeName }}
                      >
                        {item.productName} {item.productColor ? `(${item.productColor})` : ''}
                      </p>
                      <img 
                        src={item.barcodeImage} 
                        alt="Barcode" 
                        className="object-contain max-w-[95%] mx-auto"
                        style={{ 
                          height: BARCODE_STYLES[printStyle].imgHeight,
                          imageRendering: 'pixelated'
                        }}
                      />
                      <div 
                        className="flex items-center justify-between font-bold w-full px-1 text-black leading-none font-mono"
                        style={{ fontSize: BARCODE_STYLES[printStyle].fontSizeNo }}
                      >
                        <span>No: {item.barcodeValue}</span>
                        <span className="font-extrabold" style={{ fontSize: BARCODE_STYLES[printStyle].fontSizePrice }}>
                          ₹{Number(item.customPrice || 0).toFixed(2)}
                        </span>
                      </div>
                    </div>
                  ))
                )}
            </div>
          )}
        </div>
      )}
  </>
);
};

export default Purchases;
