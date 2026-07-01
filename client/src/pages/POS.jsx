import React, { useState, useEffect, useRef } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import API from '../utils/api';
import {
  addToCart,
  removeFromCart,
  updateQuantity,
  updateItemDiscount,
  setCartDiscount,
  setCartTax,
  setCustomer,
  setWarehouse,
  clearCart,
  selectCartTotals
} from '../store/cartSlice';
import {
  Search,
  Barcode,
  User,
  Warehouse,
  Trash2,
  Plus,
  Minus,
  CreditCard,
  Smartphone,
  Banknote,
  ShoppingBag,
  Printer,
  X,
  UserPlus
} from 'lucide-react';

const POS = () => {
  const dispatch = useDispatch();
  const { items, discount, tax, customer, warehouseId } = useSelector((state) => state.cart);
  const totals = useSelector(selectCartTotals);

  // References and local state
  const scanInputRef = useRef(null);
  const [scanCode, setScanCode] = useState('');
  const [showScannerDropdown, setShowScannerDropdown] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCat, setSelectedCat] = useState('');

  // Data lists
  const [productsList, setProductsList] = useState([]);
  const [categories, setCategories] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [warehouses, setWarehouses] = useState([]);

  // Checkout Modal State
  const [showCheckout, setShowCheckout] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState('Cash');
  const [payCash, setPayCash] = useState(0);
  const [payUpi, setPayUpi] = useState(0);
  const [payCard, setPayCard] = useState(0);
  const [amountPaid, setAmountPaid] = useState(0);
  const [changeReturned, setChangeReturned] = useState(0);
  const [checkoutInvoice, setCheckoutInvoice] = useState(null);
  const [saleDate, setSaleDate] = useState(new Date().toISOString().split('T')[0]);
  const [saleDescription, setSaleDescription] = useState('');

  // Inline Add Customer
  const [showAddCustomerModal, setShowAddCustomerModal] = useState(false);
  const [custName, setCustName] = useState('');
  const [custMobile, setCustMobile] = useState('');

  // General Toast notifications
  const [toast, setToast] = useState({ text: '', type: 'success' });

  const triggerToast = (text, type = 'success') => {
    setToast({ text, type });
    setTimeout(() => setToast({ text: '', type: 'success' }), 4000);
  };

  const fetchPOSData = async () => {
    try {
      const [prodRes, catRes, custRes, whRes] = await Promise.all([
        API.get('/products'),
        API.get('/categories'),
        API.get('/customers'),
        API.get('/warehouses')
      ]);

      if (prodRes.data.success) setProductsList(prodRes.data.data);
      if (catRes.data.success) setCategories(catRes.data.data);
      if (custRes.data.success) {
        setCustomers(custRes.data.data);
        // Default to walk-in customer
        const walkin = custRes.data.data.find(c => c.name === 'Walk-in Customer');
        if (walkin) {
          dispatch(setCustomer(walkin));
        }
      }
      if (whRes.data.success) {
        setWarehouses(whRes.data.data);
        if (whRes.data.data.length > 0) {
          const isValidWarehouse = warehouseId && whRes.data.data.some(w => w._id === warehouseId);
          if (isValidWarehouse) {
            // Already set correctly in Redux
          } else {
            const storedWhId = localStorage.getItem('pos_warehouse_id');
            const isValidStored = storedWhId && whRes.data.data.some(w => w._id === storedWhId);
            if (isValidStored) {
              dispatch(setWarehouse(storedWhId));
            } else {
              dispatch(setWarehouse(whRes.data.data[0]._id));
            }
          }
        }
      }
    } catch (err) {
      triggerToast(err.message, 'error');
    }
  };

  useEffect(() => {
    fetchPOSData();
    focusScanner();

    // Global keydown handler to capture barcode scanner entries hands-free
    const handleGlobalKeyDown = (e) => {
      // Do not redirect focus if the user is typing in another input/select element
      const activeTag = document.activeElement ? document.activeElement.tagName.toLowerCase() : '';
      if (activeTag === 'input' || activeTag === 'textarea' || activeTag === 'select') {
        return;
      }

      // If scanner input exists, focus it so the scanner's typed input goes there
      if (scanInputRef.current) {
        scanInputRef.current.focus();
      }
    };

    window.addEventListener('keydown', handleGlobalKeyDown);
    return () => {
      window.removeEventListener('keydown', handleGlobalKeyDown);
    };
  }, []);

  const focusScanner = () => {
    if (scanInputRef.current) {
      scanInputRef.current.focus();
    }
  };

  // Process barcode input scan or name search
  const handleBarcodeScanSubmit = async (e) => {
    e.preventDefault();
    if (!scanCode.trim()) return;

    try {
      const rawVal = scanCode.trim().toLowerCase();

      // Auto-normalize code formatting, e.g. Comp Code
      const normalizedVal = (() => {
        const prefixNumMatch = rawVal.match(/^([a-z]+)(\d+)$/i);
        if (prefixNumMatch) {
          return prefixNumMatch[1] + prefixNumMatch[2].padStart(4, '0');
        }
        const numOnlyMatch = rawVal.match(/^(\d+)$/);
        if (numOnlyMatch) {
          return numOnlyMatch[1].padStart(4, '0');
        }
        return rawVal;
      })();

      setScanCode(''); // Clear quickly for next scan

      // 1. Search in local products list first (exact code, barcode, or name)
      let prod = productsList.find(p =>
        p.code.toLowerCase() === normalizedVal ||
        (p.barcodeValue && p.barcodeValue.toLowerCase() === normalizedVal) ||
        p.name.toLowerCase() === normalizedVal ||
        p.code.toLowerCase() === rawVal ||
        (p.barcodeValue && p.barcodeValue.toLowerCase() === rawVal)
      );

      // 2. If no exact match, try partial matches (normalized code, raw code, name)
      if (!prod) {
        prod = productsList.find(p =>
          p.code.toLowerCase().includes(normalizedVal) ||
          p.code.toLowerCase().includes(rawVal) ||
          (p.barcodeValue && p.barcodeValue.toLowerCase().includes(rawVal)) ||
          p.name.toLowerCase().includes(rawVal)
        );
      }

      // 3. If found locally, add it using the grid add logic (verifies warehouse & stock)
      if (prod) {
        handleGridAdd(prod);
        return;
      }

      // 4. Fallback to API scan if not found in local list (e.g. newly created products)
      const res = await API.get(`/products/scan/${scanCode.trim()}`);
      if (res.data.success) {
        handleGridAdd(res.data.data);
      } else {
        triggerToast('Product not found or inactive', 'error');
      }
    } catch (err) {
      triggerToast('Product not found or inactive', 'error');
    } finally {
      focusScanner();
    }
  };

  // Add via grid click
  const handleGridAdd = (prod) => {
    if (!warehouseId) {
      triggerToast('Please select a warehouse first!', 'error');
      return;
    }

    const whStock = prod.warehouseStock.find(s => s.warehouse === warehouseId);
    const available = whStock ? whStock.quantity : 0;

    const existingInCart = items.find(it => it._id === prod._id);
    const currentQty = existingInCart ? existingInCart.quantity : 0;

    if (available <= 0) {
      triggerToast('Product is out of stock!', 'error');
      return;
    }

    if (available <= currentQty) {
      triggerToast(`Insufficient stock in selected warehouse. Available: ${available}`, 'error');
      return;
    }

    dispatch(addToCart(prod));
    triggerToast(`Added ${prod.name}`);
    focusScanner();
  };

  const handleQtyChange = (productId, q) => {
    const prod = productsList.find(p => p._id === productId);
    const whStock = prod?.warehouseStock.find(s => s.warehouse === warehouseId);
    const available = whStock ? whStock.quantity : 0;

    if (q > available) {
      triggerToast(`Insufficient stock! Max available: ${available}`, 'error');
      return;
    }

    dispatch(updateQuantity({ productId, quantity: q }));
  };

  // Add Customer modal submit
  const handleAddCustomerSubmit = async (e) => {
    e.preventDefault();
    if (!custName) return;

    try {
      const res = await API.post('/customers', {
        name: custName,
        mobile: custMobile || 'N/A'
      });
      if (res.data.success) {
        setCustomers(prev => [...prev, res.data.data]);
        dispatch(setCustomer(res.data.data));
        setShowAddCustomerModal(false);
        triggerToast('Customer created and selected!');
        // clear inputs
        setCustName('');
        setCustMobile('');
      }
    } catch (err) {
      triggerToast(err.message, 'error');
    }
  };

  // Payment method calculations
  useEffect(() => {
    const totalPayable = totals.grandTotal;
    if (paymentMethod === 'Cash') {
      const returned = Math.max(0, Number(amountPaid) - totalPayable);
      setChangeReturned(returned);
    } else if (paymentMethod === 'Mixed') {
      const sum = Number(payCash) + Number(payUpi) + Number(payCard);
      setAmountPaid(sum);
      setChangeReturned(0);
    } else {
      // UPI or Card
      setAmountPaid(totalPayable);
      setChangeReturned(0);
    }
  }, [amountPaid, paymentMethod, payCash, payUpi, payCard, totals.grandTotal]);

  const handleOpenCheckout = () => {
    if (items.length === 0) {
      triggerToast('Cart is empty', 'error');
      return;
    }
    if (!customer) {
      triggerToast('Please select a customer', 'error');
      return;
    }
    if (!warehouseId) {
      triggerToast('Please select source warehouse', 'error');
      return;
    }

    // Populate checkout amounts
    setPayCash(0);
    setPayUpi(0);
    setPayCard(0);
    setAmountPaid(totals.grandTotal);
    setShowCheckout(true);
  };

  const handlePOSCheckout = async () => {
    if (paymentMethod === 'Mixed') {
      const sum = Number(payCash) + Number(payUpi) + Number(payCard);
      if (sum <= 0) {
        triggerToast('Please specify mixed payments distributions', 'error');
        return;
      }
    }

    try {
      const payload = {
        customerId: customer._id,
        warehouseId,
        items: items.map(it => ({
          productId: it._id,
          price: it.sellingPrice,
          quantity: it.quantity,
          tax: it.tax,
          discount: it.discount
        })),
        subTotal: totals.subTotal,
        tax: totals.taxAmount,
        discount: discount,
        grandTotal: totals.grandTotal,
        paymentMethod,
        paymentDetails: {
          cash: paymentMethod === 'Cash' ? amountPaid : (paymentMethod === 'Mixed' ? payCash : 0),
          upi: paymentMethod === 'UPI' ? amountPaid : (paymentMethod === 'Mixed' ? payUpi : 0),
          card: paymentMethod === 'Card' ? amountPaid : (paymentMethod === 'Mixed' ? payCard : 0)
        },
        amountPaid: amountPaid,
        changeReturned: changeReturned,
        date: saleDate,
        description: saleDescription
      };

      const res = await API.post('/pos/checkout', payload);
      if (res.data.success) {
        setCheckoutInvoice(res.data.data);
        dispatch(clearCart());
        setScanCode('');
        setSaleDescription('');
        setSaleDate(new Date().toISOString().split('T')[0]);
        // Refresh catalog quantities
        fetchPOSData();
        triggerToast('Sale saved successfully!');
      }
    } catch (err) {
      triggerToast(err.message, 'error');
    }
  };

  // Filters product list on grid
  const gridFilteredProducts = productsList.filter(p => {
    const matchesSearch =
      p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.code.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.barcodeValue.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesCat = selectedCat ? (p.category?._id === selectedCat) : true;
    return matchesSearch && matchesCat && p.status === 'Active';
  });

  const printReceiptInvoice = () => {
    window.print();
  };

  return (
    <>
      <div className="p-4 grid grid-cols-1 lg:grid-cols-12 gap-4 h-[calc(100vh-4.5rem)] overflow-hidden font-sans no-print">

        {/* Toast Notice */}
        {toast.text && (
          <div className={`fixed bottom-4 right-4 px-4 py-3 rounded-xl shadow-lg z-50 flex items-center space-x-2 text-xs font-semibold ${toast.type === 'error' ? 'bg-red-500 text-white' : 'bg-primary-600 text-white'
            }`}>
            <span>{toast.text}</span>
          </div>
        )}

        {/* LEFT BLOCK: POS Shopping Cart & Scanner (5 Cols) */}
        <div className="lg:col-span-5 flex flex-col bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800/80 rounded-2xl p-4 overflow-hidden h-full shadow-sm">

          {/* Scanner Bar & Focus Control */}
          <form onSubmit={handleBarcodeScanSubmit} className="flex items-center space-x-2 border-b border-slate-100 dark:border-slate-800 pb-3">
            <div className="relative flex-1">
              <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-slate-400">
                <Barcode size={18} />
              </span>
              <input
                type="text"
                ref={scanInputRef}
                placeholder="Scan barcode or type name/code to add..."
                value={scanCode}
                onChange={(e) => {
                  setScanCode(e.target.value);
                  setShowScannerDropdown(true);
                }}
                onFocus={() => setShowScannerDropdown(true)}
                onBlur={() => {
                  setTimeout(() => setShowScannerDropdown(false), 200);
                }}
                className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-850 rounded-xl py-2.5 pl-10 pr-4 text-xs font-mono text-slate-800 dark:text-white placeholder-slate-400 focus:outline-none focus:border-primary-500"
                id="pos-barcode-scanner-input"
              />
              {showScannerDropdown && scanCode.trim() && (
                <div className="absolute z-50 w-full mt-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-lg max-h-60 overflow-y-auto">
                  {productsList
                    .filter(p => p.status === 'Active' && (
                      p.name.toLowerCase().includes(scanCode.toLowerCase()) ||
                      p.code.toLowerCase().includes(scanCode.toLowerCase()) ||
                      (p.barcodeValue && p.barcodeValue.toLowerCase().includes(scanCode.toLowerCase()))
                    ))
                    .map(p => (
                      <div
                        key={p._id}
                        onMouseDown={() => {
                          handleGridAdd(p);
                          setScanCode('');
                          setShowScannerDropdown(false);
                        }}
                        className="px-3 py-2 cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 text-xs font-semibold flex justify-between items-center"
                      >
                        <div>
                          <span className="font-bold text-slate-900 dark:text-white">{p.name}</span>
                          <span className="ml-2 font-mono text-[10px] text-slate-450">({p.code} | Barcode: {p.barcodeValue || '-'})</span>
                        </div>
                        <span className="text-[10px] font-bold text-slate-500">₹{p.sellingPrice}</span>
                      </div>
                    ))}
                  {productsList.filter(p => p.status === 'Active' && (
                    p.name.toLowerCase().includes(scanCode.toLowerCase()) ||
                    p.code.toLowerCase().includes(scanCode.toLowerCase()) ||
                    (p.barcodeValue && p.barcodeValue.toLowerCase().includes(scanCode.toLowerCase()))
                  )).length === 0 && (
                      <div className="px-3 py-2 text-slate-450 text-xs">No matching products found</div>
                    )}
                </div>
              )}
            </div>
            <button
              type="submit"
              className="bg-primary-600 hover:bg-primary-500 text-white px-3.5 py-2.5 rounded-xl text-xs font-semibold active:scale-95 shrink-0"
            >
              Scan
            </button>
          </form>

          {/* Customer & Warehouse Bindings */}
          <div className="grid grid-cols-2 gap-3 py-3 border-b border-slate-100 dark:border-slate-800 text-xs">
            {/* Customer */}
            <div className="space-y-1">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center justify-between">
                <span>Customer Link</span>
                <button
                  type="button"
                  onClick={() => setShowAddCustomerModal(true)}
                  className="text-primary-500 hover:underline flex items-center space-x-0.5"
                >
                  <UserPlus size={10} />
                  <span>Add</span>
                </button>
              </span>
              <select
                value={customer?._id || ''}
                onChange={(e) => {
                  const selected = customers.find(c => c._id === e.target.value);
                  if (selected) dispatch(setCustomer(selected));
                }}
                className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-850 rounded-lg py-1.5 px-2 text-slate-700 dark:text-slate-200 focus:outline-none"
                id="pos-customer-select"
              >
                <option value="">Choose Customer</option>
                {customers.map(c => (
                  <option key={c._id} value={c._id}>{c.name} ({c.mobile})</option>
                ))}
              </select>
            </div>

            {/* Warehouse */}
            <div className="space-y-1">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Source Warehouse</span>
              <select
                value={warehouseId}
                onChange={(e) => dispatch(setWarehouse(e.target.value))}
                className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-850 rounded-lg py-1.5 px-2 text-slate-700 dark:text-slate-200 focus:outline-none"
                id="pos-warehouse-select"
              >
                {warehouses.map(wh => (
                  <option key={wh._id} value={wh._id}>{wh.name}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Cart Item Listing */}
          <div className="flex-1 overflow-y-auto divide-y divide-slate-55 dark:divide-slate-800/40 pr-1 my-3">
            {items.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-slate-400 space-y-2">
                <ShoppingBag size={32} className="text-slate-300 dark:text-slate-700" />
                <p className="text-xs">Cart is empty. Scan barcodes or select from list.</p>
              </div>
            ) : (
              items.map((item) => (
                <div key={item._id} className="py-2.5 flex items-center justify-between text-xs">
                  <div className="min-w-0 flex-1 pr-3">
                    <p className="font-semibold text-slate-800 dark:text-slate-100 truncate">
                      {item.name} {item.color ? `(${item.color})` : ''}
                    </p>
                    <span className="text-[10px] text-slate-400 font-mono block">Code: {item.code} | Barcode: {item.barcodeValue || '-'} | Price: ₹{item.sellingPrice}</span>

                    {/* Item Discount Config */}
                    <div className="flex items-center space-x-1.5 mt-1">
                      <span className="text-[9px] text-slate-400">Discount per piece (₹):</span>
                      <input
                        type="number"
                        value={item.discount || ''}
                        placeholder="0"
                        onChange={(e) => dispatch(updateItemDiscount({ productId: item._id, discount: e.target.value }))}
                        className="w-12 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-[10px] rounded px-1 text-center"
                      />
                    </div>
                  </div>

                  {/* Quantity adjustments */}
                  <div className="flex items-center space-x-2 shrink-0">
                    <button
                      onClick={() => handleQtyChange(item._id, item.quantity - 1)}
                      className="p-1 border bg-slate-50 hover:bg-slate-100 dark:bg-slate-950 dark:hover:bg-slate-800/60 rounded text-slate-500"
                    >
                      <Minus size={10} />
                    </button>
                    <span className="font-bold text-slate-800 dark:text-slate-100 w-5 text-center">{item.quantity}</span>
                    <button
                      onClick={() => handleQtyChange(item._id, item.quantity + 1)}
                      className="p-1 border bg-slate-50 hover:bg-slate-100 dark:bg-slate-950 dark:hover:bg-slate-800/60 rounded text-slate-500"
                    >
                      <Plus size={10} />
                    </button>
                    <span className="font-bold text-slate-800 dark:text-slate-100 w-16 text-right">₹{item.total.toFixed(2)}</span>
                    <button
                      onClick={() => dispatch(removeFromCart(item._id))}
                      className="p-1.5 text-red-500 hover:bg-red-50 dark:hover:bg-red-950/20 rounded"
                      title="Remove"
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Totals Summary Actions */}
          <div className="border-t border-slate-100 dark:border-slate-800 pt-3 space-y-2 text-xs">

            {/* Tax and general discount toggles */}
            <div className="grid grid-cols-2 gap-3 text-[11px] text-slate-500">
              <div className="flex items-center justify-between">
                <span>Overall Discount (₹)</span>
                <input
                  type="number"
                  value={discount || ''}
                  placeholder="0"
                  onChange={(e) => dispatch(setCartDiscount(e.target.value))}
                  className="w-16 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-center rounded py-0.5 text-xs text-slate-800 dark:text-white"
                />
              </div>
              <div className="flex items-center justify-between">
                <span>GST (%)</span>
                <input
                  type="number"
                  value={tax || ''}
                  placeholder="0"
                  onChange={(e) => dispatch(setCartTax(e.target.value))}
                  className="w-16 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-center rounded py-0.5 text-xs text-slate-800 dark:text-white"
                />
              </div>
            </div>

            {/* Checkout statistics */}
            <div className="bg-slate-50 dark:bg-slate-950/40 p-3 rounded-xl space-y-1.5">
              <div className="flex justify-between">
                <span className="text-slate-400">Subtotal:</span>
                <span className="font-semibold text-slate-700 dark:text-slate-300">₹{totals.subTotal.toFixed(2)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">GST ({tax}%):</span>
                <span className="font-semibold text-emerald-500">+₹{totals.taxAmount.toFixed(2)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Discount Applied:</span>
                <span className="font-semibold text-red-500">-₹{Number(discount || 0).toFixed(2)}</span>
              </div>
              <div className="flex justify-between border-t dark:border-slate-800 pt-1.5 text-sm font-bold">
                <span className="text-slate-800 dark:text-white">Grand Total:</span>
                <span className="text-primary-600 dark:text-primary-400 text-base">₹{totals.grandTotal.toFixed(2)}</span>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2.5">
              <button
                onClick={() => dispatch(clearCart())}
                className="bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700/80 text-slate-600 dark:text-slate-300 py-3 rounded-xl font-bold transition-all text-xs"
              >
                Reset Cart
              </button>
              <button
                onClick={handleOpenCheckout}
                className="bg-primary-600 hover:bg-primary-500 text-white py-3 rounded-xl font-bold transition-all text-xs shadow-md shadow-primary-700/10 active:scale-95"
                id="pos-pay-btn"
              >
                Process Payment
              </button>
            </div>
          </div>
        </div>

        {/* RIGHT BLOCK: Filterable Product Search & Grids (7 Cols) */}
        <div className="lg:col-span-7 flex flex-col bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800/80 rounded-2xl p-4 overflow-hidden h-full shadow-sm">

          {/* Category Filters Bar */}
          <div className="flex items-center space-x-2 border-b border-slate-100 dark:border-slate-800 pb-3 overflow-x-auto shrink-0 pb-3">
            <button
              onClick={() => setSelectedCat('')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${selectedCat === ''
                  ? 'bg-primary-600 text-white'
                  : 'bg-slate-50 hover:bg-slate-100 dark:bg-slate-950 dark:hover:bg-slate-800/60 text-slate-600 dark:text-slate-300'
                }`}
            >
              All Products
            </button>
            {categories.map(cat => (
              <button
                key={cat._id}
                onClick={() => setSelectedCat(cat._id)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold shrink-0 transition ${selectedCat === cat._id
                    ? 'bg-primary-600 text-white'
                    : 'bg-slate-50 hover:bg-slate-100 dark:bg-slate-950 dark:hover:bg-slate-800/60 text-slate-600 dark:text-slate-300'
                  }`}
              >
                {cat.name}
              </button>
            ))}
          </div>

          {/* Text Search Bar */}
          <div className="relative my-3 shrink-0">
            <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-slate-400">
              <Search size={16} />
            </span>
            <input
              type="text"
              placeholder="Search products by code, style, barcode no..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-850 rounded-xl py-2 pl-9 pr-4 text-xs text-slate-850 dark:text-white placeholder-slate-400 focus:outline-none"
              id="pos-product-search-input"
            />
          </div>

          {/* Grid Items List */}
          <div className="flex-1 overflow-y-auto grid grid-cols-2 md:grid-cols-3 gap-3.5 pr-1">
            {gridFilteredProducts.length === 0 ? (
              <div className="col-span-full py-12 text-center text-slate-400 text-xs">
                No active products match search filters.
              </div>
            ) : (
              gridFilteredProducts.map((p) => {
                const whStock = p.warehouseStock.find(s => s.warehouse === warehouseId);
                const qty = whStock ? whStock.quantity : 0;
                return (
                  <button
                    key={p._id}
                    onClick={() => handleGridAdd(p)}
                    className={`bg-slate-50 dark:bg-slate-950 border rounded-2xl p-3.5 text-left flex flex-col justify-between hover-scale shadow-sm text-xs ${qty <= 0
                        ? 'opacity-60 border-red-200 dark:border-red-950'
                        : 'border-slate-200 dark:border-slate-800/60'
                      }`}
                    id={`pos-grid-add-${p.code}`}
                  >
                    <div>
                      <span className="text-[9px] font-bold text-slate-400 font-mono tracking-wide">{p.code} | Barcode: {p.barcodeValue || '-'}</span>
                      <p className="font-bold text-slate-800 dark:text-slate-100 mt-0.5 truncate leading-tight">
                        {p.name} {p.color ? `(${p.color})` : ''}
                      </p>
                      <p className="text-[10px] text-slate-400 mt-1">{p.category?.name}</p>
                    </div>
                    <div className="flex items-center justify-between mt-3">
                      <span className="font-extrabold text-slate-900 dark:text-slate-100 text-xs">₹{p.sellingPrice}</span>
                      {qty <= 0 ? (
                        <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-red-100 text-red-650 dark:bg-red-950/40 dark:text-red-400">
                          Out of Stock
                        </span>
                      ) : (
                        <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold ${qty <= p.alertQuantity ? 'bg-red-500/10 text-red-500' : 'bg-slate-200/50 dark:bg-slate-800/40 text-slate-500'}`}>
                          Qty: {qty}
                        </span>
                      )}
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </div>

        {/* CHECKOUT POPUP DIALOG */}
        {showCheckout && (
          <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm z-40 flex items-center justify-center p-4">
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl w-full max-w-lg shadow-2xl p-6 space-y-4 no-print">
              <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
                <h3 className="text-lg font-bold text-slate-800 dark:text-white">POS Checkout Bill</h3>
                <button onClick={() => setShowCheckout(false)} className="text-slate-400 hover:text-slate-200">
                  <X size={20} />
                </button>
              </div>

              {/* Total payable bill banner */}
              <div className="bg-primary-50 dark:bg-primary-950/20 border border-primary-200/40 p-4 rounded-2xl text-center space-y-1">
                <span className="text-xs font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider block">Total Payable Bill</span>
                <h2 className="text-3xl font-extrabold text-primary-600 dark:text-primary-400">₹{totals.grandTotal.toFixed(2)}</h2>
                <p className="text-[10px] text-slate-400 font-sans">Customer: {customer?.name} ({customer?.mobile})</p>
              </div>

              {/* Sale Date & Description */}
              <div className="grid grid-cols-2 gap-3 text-xs">
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Sale Date</label>
                  <input
                    type="date"
                    value={saleDate}
                    onChange={(e) => setSaleDate(e.target.value)}
                    className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl py-2 px-3 text-xs text-slate-700 dark:text-slate-200 focus:outline-none focus:border-primary-500"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Description / Notes</label>
                  <input
                    type="text"
                    value={saleDescription}
                    onChange={(e) => setSaleDescription(e.target.value)}
                    placeholder="e.g. Returned exchange, Notes"
                    className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl py-2 px-3 text-xs text-slate-700 dark:text-slate-200 focus:outline-none focus:border-primary-500"
                  />
                </div>
              </div>

              {/* Payment Method Selector */}
              <div className="space-y-1.5 text-xs">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Select Payment Mode</label>
                <div className="grid grid-cols-4 gap-2">
                  {[
                    { mode: 'Cash', icon: Banknote },
                    { mode: 'UPI', icon: Smartphone },
                    { mode: 'Card', icon: CreditCard },
                    { mode: 'Mixed', icon: ShoppingBag }
                  ].map(item => {
                    const Icon = item.icon;
                    return (
                      <button
                        key={item.mode}
                        type="button"
                        onClick={() => {
                          setPaymentMethod(item.mode);
                          setAmountPaid(totals.grandTotal);
                        }}
                        className={`py-3.5 rounded-xl border flex flex-col items-center justify-center font-bold space-y-1.5 transition ${paymentMethod === item.mode
                            ? 'bg-primary-600 border-primary-600 text-white shadow-md'
                            : 'bg-slate-50 dark:bg-slate-950 text-slate-600 dark:text-slate-300 hover:bg-slate-100/60 border-slate-250 dark:border-slate-850'
                          }`}
                      >
                        <Icon size={18} />
                        <span className="text-[10px]">{item.mode}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Dynamic Payment Details configuration fields */}
              {paymentMethod === 'Cash' && (
                <div className="grid grid-cols-2 gap-3 text-xs">
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Cash Received (₹)</label>
                    <input
                      type="number"
                      value={amountPaid || ''}
                      onChange={(e) => setAmountPaid(Number(e.target.value))}
                      className="w-full bg-slate-50 dark:bg-slate-950 border rounded-xl py-2 px-3 focus:outline-none"
                      placeholder="0"
                      id="checkout-cash-received-input"
                    />
                  </div>
                  <div className="space-y-1 bg-slate-50 dark:bg-slate-950 border rounded-xl p-2.5 flex flex-col justify-center">
                    <span className="text-[9px] text-slate-400 block font-bold">Change Returned</span>
                    <span className="text-lg font-bold text-emerald-600">₹{changeReturned.toFixed(2)}</span>
                  </div>
                </div>
              )}

              {paymentMethod === 'Mixed' && (
                <div className="bg-slate-50 dark:bg-slate-950/60 p-3.5 rounded-2xl border border-slate-250 dark:border-slate-850 space-y-3 text-xs">
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Distribute Payment Amounts</p>
                  <div className="grid grid-cols-3 gap-2.5">
                    <div className="space-y-1">
                      <span>Cash Portion (₹)</span>
                      <input
                        type="number"
                        value={payCash || ''}
                        onChange={(e) => setPayCash(Number(e.target.value))}
                        className="w-full bg-white dark:bg-slate-900 border rounded-lg py-1.5 px-2 text-center"
                        placeholder="0"
                      />
                    </div>
                    <div className="space-y-1">
                      <span>UPI Portion (₹)</span>
                      <input
                        type="number"
                        value={payUpi || ''}
                        onChange={(e) => setPayUpi(Number(e.target.value))}
                        className="w-full bg-white dark:bg-slate-900 border rounded-lg py-1.5 px-2 text-center"
                        placeholder="0"
                      />
                    </div>
                    <div className="space-y-1">
                      <span>Card Portion (₹)</span>
                      <input
                        type="number"
                        value={payCard || ''}
                        onChange={(e) => setPayCard(Number(e.target.value))}
                        className="w-full bg-white dark:bg-slate-900 border rounded-lg py-1.5 px-2 text-center"
                        placeholder="0"
                      />
                    </div>
                  </div>
                  <div className="flex justify-between items-center text-[11px] pt-1 border-t dark:border-slate-850 font-semibold">
                    <span className="text-slate-400">Total Accounted:</span>
                    <span className={amountPaid === totals.grandTotal ? 'text-primary-500' : 'text-red-500'}>
                      ₹{amountPaid.toFixed(2)} / ₹{totals.grandTotal.toFixed(2)}
                    </span>
                  </div>
                </div>
              )}

              <div className="flex items-center justify-end space-x-2 border-t border-slate-100 dark:border-slate-800 pt-3">
                <button
                  type="button"
                  onClick={() => setShowCheckout(false)}
                  className="bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700/80 text-slate-600 dark:text-slate-300 px-4 py-2 rounded-xl text-xs font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handlePOSCheckout}
                  className="bg-primary-600 hover:bg-primary-500 text-white px-6 py-2 rounded-xl text-xs font-bold shadow-md active:scale-95 transition-all"
                  id="pos-checkout-execute-btn"
                >
                  Submit checkout
                </button>
              </div>
            </div>
          </div>
        )}

        {/* RECEIPT PRINTING PREVIEW POPUP */}
        {checkoutInvoice && (
          <div className="fixed inset-0 bg-slate-950/70 backdrop-blur-md z-50 flex items-center justify-center p-4 no-print">
            <div className="bg-white dark:bg-slate-900 border dark:border-slate-800 rounded-3xl w-full max-w-sm shadow-2xl p-5 space-y-4">
              <div className="text-center space-y-1">
                <span className="bg-emerald-500/10 text-emerald-500 p-2.5 rounded-full inline-flex items-center justify-center mb-1">
                  <ShoppingBag size={24} />
                </span>
                <h3 className="text-base font-bold text-slate-800 dark:text-white">Transaction Success</h3>
                <p className="text-xs text-slate-400">Invoice: {checkoutInvoice.invoiceNumber}</p>
              </div>

              {/* In-app Receipt Preview card */}
              <div className="bg-slate-50 dark:bg-slate-950/50 p-4 border rounded-2xl max-h-64 overflow-y-auto font-mono text-[10px] text-black dark:text-slate-300 space-y-2">
                <div className="text-center font-bold text-xs uppercase border-b pb-1 dark:border-slate-850">
                  Deepali Creation
                </div>
                <div className="flex justify-between">
                  <span>Date:</span>
                  <span>{new Date(checkoutInvoice.date).toLocaleString()}</span>
                </div>
                <div className="flex justify-between">
                  <span>Client:</span>
                  <span>{checkoutInvoice.customer?.name}</span>
                </div>
                {checkoutInvoice.description && (
                  <div className="flex justify-between">
                    <span>Notes:</span>
                    <span>{checkoutInvoice.description}</span>
                  </div>
                )}
                <div className="flex justify-between border-b pb-1.5 dark:border-slate-850">
                  <span>Whse:</span>
                  <span>{checkoutInvoice.warehouse?.name}</span>
                </div>
                <div className="space-y-1 border-b pb-1.5 dark:border-slate-850">
                  {checkoutInvoice.items.map((item, idx) => (
                    <div key={idx} className="flex justify-between items-start py-0.5">
                      <div>
                        <span className="block">
                          {item.productName || item.product?.name}
                          {item.product?.color ? ` (${item.product.color})` : ''}
                          {` x${item.quantity}`}
                        </span>
                        <span className="block text-[8px] text-slate-400 font-mono">Code: {item.productCode || item.product?.code || 'N/A'} | Barcode: {item.productBarcodeValue || item.product?.barcodeValue || item.product?.barcodeValue || 'N/A'}</span>
                      </div>
                      <span>₹{item.total.toFixed(2)}</span>
                    </div>
                  ))}
                </div>
                <div className="flex justify-between">
                  <span>Subtotal:</span>
                  <span>₹{checkoutInvoice.subTotal.toFixed(2)}</span>
                </div>
                {(() => {
                  const subTotalVal = checkoutInvoice.subTotal || 0;
                  const discountVal = checkoutInvoice.discount || 0;
                  const taxAmountVal = checkoutInvoice.tax || 0;
                  const taxableAmountVal = Math.max(0, subTotalVal - discountVal);
                  const calculatedTaxPercent = taxableAmountVal > 0 ? (taxAmountVal / taxableAmountVal) * 100 : 0;
                  return (
                    <div className="flex justify-between">
                      <span>GST ({calculatedTaxPercent.toFixed(1)}%):</span>
                      <span>+₹{taxAmountVal.toFixed(2)}</span>
                    </div>
                  );
                })()}
                <div className="flex justify-between">
                  <span>Discount:</span>
                  <span>-₹{checkoutInvoice.discount.toFixed(2)}</span>
                </div>
                <div className="flex justify-between border-t pt-1 font-bold text-xs">
                  <span>Total bill:</span>
                  <span>₹{checkoutInvoice.grandTotal.toFixed(2)}</span>
                </div>
                <div className="flex justify-between font-bold text-slate-500">
                  <span>Paid via {checkoutInvoice.paymentMethod}:</span>
                  <span>₹{checkoutInvoice.amountPaid.toFixed(2)}</span>
                </div>
                {checkoutInvoice.changeReturned > 0 && (
                  <div className="flex justify-between text-slate-500 font-bold">
                    <span>Change:</span>
                    <span>₹{checkoutInvoice.changeReturned.toFixed(2)}</span>
                  </div>
                )}
              </div>

              <div className="grid grid-cols-2 gap-2 border-t pt-3 dark:border-slate-800">
                <button
                  onClick={() => {
                    setCheckoutInvoice(null);
                    setShowCheckout(false);
                    focusScanner();
                  }}
                  className="bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700/80 text-slate-600 dark:text-slate-300 py-2.5 rounded-xl font-semibold text-xs"
                >
                  Done
                </button>
                <button
                  onClick={printReceiptInvoice}
                  className="bg-primary-600 hover:bg-primary-500 text-white py-2.5 rounded-xl font-bold text-xs flex items-center justify-center space-x-1.5 shadow"
                  id="pos-print-receipt-btn"
                >
                  <Printer size={14} />
                  <span>Print receipt</span>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* INLINE CUSTOMER CREATION MODAL */}
        {showAddCustomerModal && (
          <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-white dark:bg-slate-900 border dark:border-slate-800 rounded-3xl w-full max-w-md shadow-2xl p-6 space-y-4">
              <div className="flex items-center justify-between border-b pb-2.5 dark:border-slate-800">
                <h3 className="text-base font-bold text-slate-850 dark:text-white">Register POS Customer</h3>
                <button onClick={() => setShowAddCustomerModal(false)} className="text-slate-400 hover:text-slate-200">
                  <X size={18} />
                </button>
              </div>

              <form onSubmit={handleAddCustomerSubmit} className="space-y-4 text-xs">
                <div className="space-y-1">
                  <span>Name *</span>
                  <input
                    type="text"
                    required
                    value={custName}
                    onChange={(e) => setCustName(e.target.value)}
                    className="w-full bg-slate-50 dark:bg-slate-950 border rounded-xl py-2 px-3 focus:outline-none"
                    placeholder="Customer Full Name"
                  />
                </div>
                <div className="space-y-1">
                  <span>Mobile (Optional)</span>
                  <input
                    type="text"
                    value={custMobile}
                    onChange={(e) => setCustMobile(e.target.value)}
                    className="w-full bg-slate-50 dark:bg-slate-950 border rounded-xl py-2 px-3 focus:outline-none"
                    placeholder="Mobile number (optional)"
                  />
                </div>

                <div className="flex items-center justify-end space-x-2 border-t pt-3 dark:border-slate-800">
                  <button
                    type="button"
                    onClick={() => setShowAddCustomerModal(false)}
                    className="bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700/80 text-slate-650 dark:text-slate-300 px-4 py-2 rounded-xl text-xs"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="bg-primary-600 hover:bg-primary-500 text-white px-5 py-2 rounded-xl text-xs font-bold shadow"
                  >
                    Add Customer
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

      </div>

      {/* PRINT-ONLY AREA: Renders receipt invoice paper layout */}
      {checkoutInvoice && (
        <div className="hidden print-area">
          <div className="p-6 bg-white text-black font-mono text-[12px] max-w-[3in] mx-auto space-y-3 leading-relaxed">
            <div className="text-center space-y-1">
              <h2 className="font-extrabold text-base tracking-widest uppercase">Deepali Creation</h2>
              <p className="text-[10px] leading-tight">Deepali creation I-14 new supermarket near bedi gate jamnagar, 361001</p>
              <p className="text-[10px]">Tel: 9988776655</p>
            </div>
            <div className="border-t border-b border-black py-1.5 space-y-1 text-[10px]">
              <div>Invoice: <span className="font-bold">{checkoutInvoice.invoiceNumber}</span></div>
              <div>Date: {new Date(checkoutInvoice.date).toLocaleString()}</div>
              <div>Cashier: {checkoutInvoice.createdBy?.name || 'Cashier Counter'}</div>
              <div>Customer: {checkoutInvoice.customer?.name} ({checkoutInvoice.customer?.mobile})</div>
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
                {checkoutInvoice.items.map((item, idx) => (
                  <tr key={idx}>
                    <td className="py-1">
                      {item.product?.name}
                      {item.product?.color ? ` (${item.product.color})` : ''}
                    </td>
                    <td className="py-1 text-center">{item.quantity}</td>
                    <td className="py-1 text-right">₹{item.total.toFixed(2)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div className="space-y-1 text-right text-[11px]">
              <div>Subtotal: ₹{checkoutInvoice.subTotal.toFixed(2)}</div>
              {(() => {
                const subTotalVal = checkoutInvoice.subTotal || 0;
                const discountVal = checkoutInvoice.discount || 0;
                const taxAmountVal = checkoutInvoice.tax || 0;
                const taxableAmountVal = Math.max(0, subTotalVal - discountVal);
                const calculatedTaxPercent = taxableAmountVal > 0 ? (taxAmountVal / taxableAmountVal) * 100 : 0;
                return (
                  <div>GST ({calculatedTaxPercent.toFixed(1)}%): ₹{taxAmountVal.toFixed(2)}</div>
                );
              })()}
              {checkoutInvoice.discount > 0 && <div className="font-semibold text-black">Discount: -₹{checkoutInvoice.discount.toFixed(2)}</div>}
              <div className="font-extrabold text-sm border-t border-dashed border-black pt-1">
                Grand Total: ₹{checkoutInvoice.grandTotal.toFixed(2)}
              </div>
            </div>
            <div className="border-t border-black pt-2 space-y-1 text-[10px] text-center">
              <p className="font-bold">Payment Method: {checkoutInvoice.paymentMethod.toUpperCase()}</p>
              <p>Amount Paid: ₹{checkoutInvoice.amountPaid.toFixed(2)}</p>
              {checkoutInvoice.changeReturned > 0 && <p className="font-bold">Change Returned: ₹{checkoutInvoice.changeReturned.toFixed(2)}</p>}
              <p className="pt-3 uppercase font-extrabold text-[10px] tracking-wider">Thank You for Shopping!</p>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default POS;
