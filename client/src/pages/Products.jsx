import React, { useState, useEffect } from 'react';
import { useSelector } from 'react-redux';
import API from '../utils/api';
import {
  Plus,
  Search,
  Edit2,
  Trash2,
  FileDown,
  FileSpreadsheet,
  Printer,
  X,
  AlertTriangle,
  Grid,
  CheckCircle,
  QrCode,
  RefreshCw
} from 'lucide-react';

const Products = () => {
  const { user } = useSelector((state) => state.auth);
  // Products state
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [brands, setBrands] = useState([]);
  const [warehouses, setWarehouses] = useState([]);
  const [loading, setLoading] = useState(true);

  // Filtering & search
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [selectedBrand, setSelectedBrand] = useState('');
  const [stockAlertFilter, setStockAlertFilter] = useState(false);

  // Modals state
  const [showAddEditModal, setShowAddEditModal] = useState(false);
  const [showBarcodeModal, setShowBarcodeModal] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);

  // Barcode Print State
  const [barcodePrintData, setBarcodePrintData] = useState(null);
  const [printCopies, setPrintCopies] = useState(4); // Default grid count

  // Add Product Form State
  const [formName, setFormName] = useState('');
  const [formCategory, setFormCategory] = useState('');
  const [formBrand, setFormBrand] = useState('');
  const [formUnit, setFormUnit] = useState('Pcs');
  const [formCostPrice, setFormCostPrice] = useState('');
  const [formSellingPrice, setFormSellingPrice] = useState('');
  const [formTax, setFormTax] = useState(0);
  const [formAlertQty, setFormAlertQty] = useState(5);
  const [formDescription, setFormDescription] = useState('');
  const [formColor, setFormColor] = useState('');
  const [formPrefix, setFormPrefix] = useState('D'); // D, SH, TS
  const [formCode, setFormCode] = useState(''); // If empty, backend auto-generates
  const [formBarcodeValue, setFormBarcodeValue] = useState(''); // If empty, uses code
  const [formStockQty, setFormStockQty] = useState(''); // Only used in edit flow
  const [submitting, setSubmitting] = useState(false);

  // Inline Add Category/Brand
  const [newCatName, setNewCatName] = useState('');
  const [newBrandName, setNewBrandName] = useState('');
  const [inlineMsg, setInlineMsg] = useState('');

  // Excel Import state
  const [excelFile, setExcelFile] = useState(null);
  const [importLoading, setImportLoading] = useState(false);
  const [importReport, setImportReport] = useState(null);

  // General error/success notice
  const [msg, setMsg] = useState({ text: '', type: '' });

  // Selection states for Excel export
  const [selectedProductIds, setSelectedProductIds] = useState([]);

  const handleSelectProduct = (productId) => {
    if (selectedProductIds.includes(productId)) {
      setSelectedProductIds(selectedProductIds.filter(id => id !== productId));
    } else {
      setSelectedProductIds([...selectedProductIds, productId]);
    }
  };

  const handleSelectAllProducts = (filteredProds) => {
    const allFilteredIds = filteredProds.map(p => p._id);
    const isAllSelected = allFilteredIds.length > 0 && allFilteredIds.every(id => selectedProductIds.includes(id));
    if (isAllSelected) {
      setSelectedProductIds(selectedProductIds.filter(id => !allFilteredIds.includes(id)));
    } else {
      const newSelection = Array.from(new Set([...selectedProductIds, ...allFilteredIds]));
      setSelectedProductIds(newSelection);
    }
  };

  const exportProductsToExcel = () => {
    const itemsToExport = products.filter(p => selectedProductIds.includes(p._id));
    if (itemsToExport.length === 0) {
      alert('Please select at least one product using the checkboxes to export.');
      return;
    }

    // Create Excel friendly CSV
    const headers = 'Product Code,Product Name,Color,Category,Brand,Cost Price (₹),Selling Price (₹),Barcode Number,In Stock,Unit,Alert Qty,Status\r\n';
    const rows = itemsToExport.map(p => {
      const categoryName = p.category?.name || 'N/A';
      const brandName = p.brand?.name || 'N/A';
      const barcodeVal = p.barcodeValue || p.code;
      const statusText = p.status || 'Active';
      return `"${p.code}","${p.name.replace(/"/g, '""')}","${(p.color || '-').replace(/"/g, '""')}","${categoryName.replace(/"/g, '""')}","${brandName.replace(/"/g, '""')}",${p.costPrice},${p.sellingPrice},"${barcodeVal}",${p.stockQuantity},"${p.unit}",${p.alertQuantity},"${statusText}"`;
    }).join('\r\n');

    // UTF-8 BOM to prevent Excel encoding issues
    const BOM = '\uFEFF';
    const csvContent = BOM + headers + rows;
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `deepali_creation_products_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const fetchInitialData = async () => {
    try {
      setLoading(true);
      const [prodRes, catRes, brandRes, whRes] = await Promise.all([
        API.get('/products'),
        API.get('/categories'),
        API.get('/brands'),
        API.get('/warehouses')
      ]);

      if (prodRes.data.success) setProducts(prodRes.data.data);
      if (catRes.data.success) setCategories(catRes.data.data);
      if (brandRes.data.success) setBrands(brandRes.data.data);
      if (whRes.data.success) {
        setWarehouses(whRes.data.data);
      }
    } catch (err) {
      showToast(err.response?.data?.message || err.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchInitialData();
  }, []);

  const showToast = (text, type = 'success') => {
    setMsg({ text, type });
    setTimeout(() => setMsg({ text: '', type: '' }), 5000);
  };

  const handleSyncQuantities = async () => {
    try {
      setLoading(true);
      const res = await API.post('/products/reconcile');
      if (res.data.success) {
        showToast('All product stock levels reconciled and synchronized successfully!');
        await fetchInitialData();
      }
    } catch (err) {
      showToast(err.response?.data?.message || err.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleOpenAdd = () => {
    setEditingProduct(null);
    setFormName('');
    setFormCategory('');
    setFormBrand('');
    setFormUnit('Pcs');
    setFormCostPrice('');
    setFormSellingPrice('');
    setFormTax(0);
    setFormAlertQty(5);
    setFormDescription('');
    setFormColor('');
    setFormPrefix('D');
    setFormCode('');
    setFormBarcodeValue('');
    setFormStockQty('');
    setShowAddEditModal(true);
  };

  const handleOpenEdit = (product) => {
    setEditingProduct(product);
    setFormName(product.name);
    setFormCategory(product.category?.name || '');
    setFormBrand(product.brand?.name || '');
    setFormUnit(product.unit || 'Pcs');
    setFormCostPrice(product.costPrice);
    setFormSellingPrice(product.sellingPrice);
    setFormTax(product.tax || 0);
    setFormAlertQty(product.alertQuantity);
    setFormDescription(product.description || '');
    setFormColor(product.color || '');
    setFormPrefix(product.code.match(/^[A-Za-z]+/)?.[0] || 'D');
    setFormCode(product.code);
    setFormBarcodeValue(product.barcodeValue);
    setFormStockQty(product.stockQuantity !== undefined ? product.stockQuantity : 0);
    setShowAddEditModal(true);
  };

  const handleInlineAddCategory = async () => {
    if (!newCatName) return;
    try {
      const res = await API.post('/categories', { name: newCatName });
      if (res.data.success) {
        setCategories(prev => [...prev, res.data.data]);
        setFormCategory(res.data.data._id);
        setNewCatName('');
        setInlineMsg(`Category "${res.data.data.name}" added!`);
        setTimeout(() => setInlineMsg(''), 3000);
      }
    } catch (err) {
      showToast(err.message, 'error');
    }
  };

  const handleInlineAddBrand = async () => {
    if (!newBrandName) return;
    try {
      const res = await API.post('/brands', { name: newBrandName });
      if (res.data.success) {
        setBrands(prev => [...prev, res.data.data]);
        setFormBrand(res.data.data._id);
        setNewBrandName('');
        setInlineMsg(`Brand "${res.data.data.name}" added!`);
        setTimeout(() => setInlineMsg(''), 3000);
      }
    } catch (err) {
      showToast(err.message, 'error');
    }
  };

  const handleSaveProduct = async (e) => {
    e.preventDefault();
    if (!formName || !formCategory || !formCostPrice || !formSellingPrice) {
      showToast('Please fill all required fields', 'error');
      return;
    }

    const payload = {
      name: formName,
      category: formCategory,
      brand: formBrand || "",
      unit: formUnit,
      costPrice: Number(formCostPrice),
      sellingPrice: Number(formSellingPrice),
      tax: Number(formTax),
      alertQuantity: Number(formAlertQty),
      color: formColor,
      description: formDescription,
      codePrefix: formPrefix
    };

    try {
      setSubmitting(true);
      if (editingProduct) {
        // Edit flow
        payload.code = formCode || undefined;
        payload.barcodeValue = formBarcodeValue || undefined;
        const res = await API.put(`/products/${editingProduct._id}`, payload);
        if (res.data.success) {
          showToast('Product updated successfully!');
          await fetchInitialData();
          setShowAddEditModal(false);
        }
      } else {
        // Add flow
        payload.code = formCode || undefined;
        payload.barcodeValue = formBarcodeValue || undefined;

        const res = await API.post('/products', payload);
        if (res.data.success) {
          showToast('Product added successfully!');
          await fetchInitialData();
          setShowAddEditModal(false);
        }
      }
    } catch (err) {
      showToast(err.message, 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteProduct = async (id) => {
    if (!window.confirm('Are you sure you want to delete this product? All related stock logs will be deleted.')) return;
    try {
      const res = await API.delete(`/products/${id}`);
      if (res.data.success) {
        showToast('Product deleted.');
        setProducts(prev => prev.filter(p => p._id !== id));
      }
    } catch (err) {
      showToast(err.message, 'error');
    }
  };

  const handleOpenBarcode = async (p) => {
    try {
      const res = await API.get(`/products/barcode/${p._id}`);
      if (res.data.success) {
        setBarcodePrintData(res.data);
        setPrintCopies(p.stockQuantity > 0 ? p.stockQuantity : 1);
        setShowBarcodeModal(true);
      }
    } catch (err) {
      showToast(err.message, 'error');
    }
  };

  const handleExcelImport = async (e) => {
    e.preventDefault();
    if (!excelFile) return;

    const formData = new FormData();
    formData.append('file', excelFile);

    try {
      setImportLoading(true);
      const res = await API.post('/products/import', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      if (res.data.success) {
        setImportReport(res.data);
        showToast('Excel file imported successfully!');
        fetchInitialData();
      }
    } catch (err) {
      showToast(err.message, 'error');
    } finally {
      setImportLoading(false);
    }
  };

  const triggerPrint = () => {
    window.print();
  };

  // Filter products locally
  const filteredProducts = products.filter(p => {
    const matchesSearch =
      p.name.toLowerCase().includes(search.toLowerCase()) ||
      p.code.toLowerCase().includes(search.toLowerCase()) ||
      p.barcodeValue.toLowerCase().includes(search.toLowerCase());

    const matchesCategory = selectedCategory ? (p.category?._id === selectedCategory) : true;
    const matchesBrand = selectedBrand ? (p.brand?._id === selectedBrand) : true;
    const matchesAlert = stockAlertFilter ? (p.stockQuantity <= p.alertQuantity) : true;

    return matchesSearch && matchesCategory && matchesBrand && matchesAlert;
  });

  return (
    <>
      <div className="p-6 space-y-6 font-sans relative no-print">
        {/* Toast message banner */}
        {msg.text && (
          <div className={`fixed bottom-4 right-4 px-4 py-3 rounded-xl shadow-lg z-50 flex items-center space-x-2 text-xs font-semibold ${msg.type === 'error' ? 'bg-red-500 text-white' : 'bg-primary-600 text-white'
            }`}>
            <span>{msg.text}</span>
          </div>
        )}

        <div className="fade-in space-y-6">
          {/* Header section */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <h1 className="text-2xl font-bold text-slate-800 dark:text-white">Product Catalog</h1>
              <p className="text-sm text-slate-400 dark:text-slate-500 mt-0.5">Manage details, categories, scan tags, and print barcodes.</p>
            </div>
            <div className="flex items-center space-x-2.5">
              <button
                onClick={exportProductsToExcel}
                className="flex items-center space-x-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 dark:bg-slate-800 dark:hover:bg-slate-700 dark:text-slate-300 px-4 py-2.5 rounded-xl font-semibold text-xs transition-all"
                id="export-products-btn"
              >
                <FileDown size={16} />
                <span>Excel Export ({selectedProductIds.length})</span>
              </button>
              <button
                onClick={() => {
                  setImportReport(null);
                  setExcelFile(null);
                  setShowImportModal(true);
                }}
                className="flex items-center space-x-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 dark:bg-slate-800 dark:hover:bg-slate-700 dark:text-slate-300 px-4 py-2.5 rounded-xl font-semibold text-xs transition-all"
                id="import-excel-btn"
              >
                <FileSpreadsheet size={16} />
                <span>Excel Import</span>
              </button>
              <button
                onClick={handleSyncQuantities}
                className="flex items-center space-x-1.5 bg-amber-600 hover:bg-amber-500 text-white px-4 py-2.5 rounded-xl font-semibold text-xs shadow-md shadow-amber-700/10 active:scale-95 transition-all"
                id="sync-products-btn"
              >
                <RefreshCw size={16} />
                <span>Sync Purchase Quantities</span>
              </button>
              <button
                onClick={handleOpenAdd}
                className="flex items-center space-x-1.5 bg-primary-600 hover:bg-primary-500 text-white px-4 py-2.5 rounded-xl font-semibold text-xs shadow-md shadow-primary-700/10 active:scale-95 transition-all"
                id="add-product-btn"
              >
                <Plus size={16} />
                <span>Add Product</span>
              </button>
            </div>
          </div>

          {/* Filters Section */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800/80 rounded-2xl p-4 shadow-sm grid grid-cols-1 md:grid-cols-4 gap-4 items-center">
            {/* Search */}
            <div className="relative">
              <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-slate-400">
                <Search size={16} />
              </span>
              <input
                type="text"
                placeholder="Search by name, code..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-850 rounded-xl py-2 pl-9 pr-4 text-xs text-slate-800 dark:text-white placeholder-slate-400 focus:outline-none focus:border-primary-500 transition"
                id="product-search-input"
              />
            </div>

            {/* Category Filter */}
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-850 rounded-xl py-2 px-3 text-xs text-slate-600 dark:text-slate-300 focus:outline-none focus:border-primary-500 transition"
              id="product-category-filter"
            >
              <option value="">All Categories</option>
              {categories.map(cat => (
                <option key={cat._id} value={cat._id}>{cat.name}</option>
              ))}
            </select>

            {/* Brand Filter */}
            <select
              value={selectedBrand}
              onChange={(e) => setSelectedBrand(e.target.value)}
              className="bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-850 rounded-xl py-2 px-3 text-xs text-slate-600 dark:text-slate-300 focus:outline-none focus:border-primary-500 transition"
              id="product-brand-filter"
            >
              <option value="">All Brands</option>
              {brands.map(brand => (
                <option key={brand._id} value={brand._id}>{brand.name}</option>
              ))}
            </select>

            {/* Low Stock Alerts Switch */}
            <label className="flex items-center space-x-2.5 cursor-pointer justify-end md:pr-4">
              <input
                type="checkbox"
                checked={stockAlertFilter}
                onChange={(e) => setStockAlertFilter(e.target.checked)}
                className="w-4 h-4 rounded text-primary-600 border-slate-300 focus:ring-primary-500 focus:ring-offset-0"
                id="product-alert-filter"
              />
              <span className="text-xs font-semibold text-slate-600 dark:text-slate-300 flex items-center space-x-1">
                <AlertTriangle size={14} className="text-amber-500" />
                <span>Low Stock Alerts Only</span>
              </span>
            </label>
          </div>

          {/* Catalog Table */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800/80 rounded-2xl shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50/70 dark:bg-slate-950/40 border-b border-slate-200 dark:border-slate-800 text-slate-400 font-semibold text-xs">
                    <th className="px-6 py-3.5 text-center w-12">
                      <input
                        type="checkbox"
                        checked={filteredProducts.length > 0 && filteredProducts.every(p => selectedProductIds.includes(p._id))}
                        onChange={() => handleSelectAllProducts(filteredProducts)}
                        className="w-4 h-4 rounded text-primary-600 border-slate-300 dark:border-slate-800 focus:ring-primary-500 cursor-pointer"
                      />
                    </th>
                    <th className="px-6 py-3.5">Code</th>
                    <th className="px-6 py-3.5">Product Name</th>
                    <th className="px-6 py-3.5">Color</th>
                    <th className="px-6 py-3.5">Category</th>
                    <th className="px-6 py-3.5">Brand</th>
                    <th className="px-6 py-3.5">Cost Price</th>
                    <th className="px-6 py-3.5">Selling Price</th>
                    <th className="px-6 py-3.5">Barcode No</th>
                    <th className="px-6 py-3.5 text-center">In Stock</th>
                    <th className="px-6 py-3.5 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 text-slate-700 dark:text-slate-300 text-xs">
                  {loading ? (
                    <tr>
                      <td colSpan="11" className="text-center py-12">
                        <div className="w-8 h-8 border-2 border-primary-500 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
                        <span>Loading products catalogue...</span>
                      </td>
                    </tr>
                  ) : filteredProducts.length === 0 ? (
                    <tr>
                      <td colSpan="11" className="text-center py-12 text-slate-400">
                        No matching products found. Add products to populate the list.
                      </td>
                    </tr>
                  ) : (
                    filteredProducts.map((p) => (
                      <tr key={p._id} className={`hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors ${selectedProductIds.includes(p._id) ? 'bg-primary-500/5 dark:bg-primary-950/10' : ''}`}>
                        <td className="px-6 py-3.5 text-center w-12">
                          <input
                            type="checkbox"
                            checked={selectedProductIds.includes(p._id)}
                            onChange={() => handleSelectProduct(p._id)}
                            className="w-4 h-4 rounded text-primary-600 border-slate-300 dark:border-slate-800 focus:ring-primary-500 cursor-pointer"
                          />
                        </td>
                        <td className="px-6 py-3.5 font-mono text-[11px] font-semibold text-slate-800 dark:text-slate-200">{p.code}</td>
                        <td className="px-6 py-3.5 font-semibold text-slate-900 dark:text-white">{p.name}</td>
                        <td className="px-6 py-3.5 font-semibold text-slate-500 dark:text-slate-400">{p.color || '-'}</td>
                        <td className="px-6 py-3.5">{p.category?.name || 'N/A'}</td>
                        <td className="px-6 py-3.5 text-slate-400">{p.brand?.name || 'N/A'}</td>
                        <td className="px-6 py-3.5 text-slate-400">₹{p.costPrice.toFixed(2)}</td>
                        <td className="px-6 py-3.5 font-bold text-slate-850 dark:text-slate-100">₹{p.sellingPrice.toFixed(2)}</td>
                        <td className="px-6 py-3.5 font-mono text-[11px] text-slate-500">{p.barcodeValue}</td>
                        <td className="px-6 py-3.5 text-center">
                          <span className={`whitespace-nowrap px-2.5 py-1 rounded-full text-[10px] font-bold ${p.stockQuantity <= p.alertQuantity
                              ? 'bg-red-500/10 text-red-500 border border-red-500/20'
                              : 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/20'
                            }`}>
                            {p.stockQuantity} {p.unit}
                          </span>
                        </td>
                        <td className="px-6 py-3.5 text-right space-x-1.5 shrink-0 whitespace-nowrap">
                          <button
                            onClick={() => handleOpenBarcode(p)}
                            className="p-1.5 text-slate-400 hover:text-emerald-500 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
                            title="Print Barcode"
                            id={`print-barcode-p-${p.code}`}
                          >
                            <QrCode size={15} />
                          </button>
                          <button
                            onClick={() => handleOpenEdit(p)}
                            className="p-1.5 text-slate-400 hover:text-blue-500 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
                            title="Edit details"
                            id={`edit-p-${p.code}`}
                          >
                            <Edit2 size={15} />
                          </button>
                          {(user?.role === 'Super Admin' || user?.role === 'Admin') && (
                            <button
                              onClick={() => handleDeleteProduct(p._id)}
                              className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
                              title="Delete product"
                              id={`delete-p-${p.code}`}
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

        </div> {/* End of fade-in container */}

        {/* MODAL 1: Add/Edit Product */}
        {showAddEditModal && (
          <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl w-full max-w-2xl shadow-2xl p-6 space-y-4 max-h-[85vh] overflow-y-auto">
              <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3 sticky top-0 bg-white dark:bg-slate-900 z-10">
                <h3 className="text-lg font-bold text-slate-800 dark:text-white">
                  {editingProduct ? 'Edit Product Details' : 'Add New Product'}
                </h3>
                <button onClick={() => setShowAddEditModal(false)} className="text-slate-400 hover:text-slate-200">
                  <X size={20} />
                </button>
              </div>

              <form onSubmit={handleSaveProduct} className="grid grid-cols-1 md:grid-cols-2 gap-3.5">

                {/* Product Code / Style Code Input */}
                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">Product Code / Style Code</label>
                  <input
                    type="text"
                    value={formCode}
                    onChange={(e) => setFormCode(e.target.value)}
                    placeholder="Auto-generated if left blank"
                    className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl py-2.5 px-3 text-xs text-slate-700 dark:text-slate-200 focus:outline-none focus:border-primary-500 font-mono"
                    id="product-code-input"
                  />
                </div>

                {/* Barcode Value Input */}
                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">Barcode Value</label>
                  <input
                    type="text"
                    value={formBarcodeValue}
                    onChange={(e) => setFormBarcodeValue(e.target.value)}
                    placeholder="e.g. scanner value (defaults to Code)"
                    className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl py-2.5 px-3 text-xs text-slate-700 dark:text-slate-200 focus:outline-none focus:border-primary-500 font-mono"
                    id="product-barcode-value-input"
                  />
                </div>

                {/* Product Name */}
                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">Product Name *</label>
                  <input
                    type="text"
                    required
                    value={formName}
                    onChange={(e) => setFormName(e.target.value)}
                    placeholder="e.g. Silk Banarasi Saree"
                    className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl py-2 px-3 text-xs text-slate-700 dark:text-slate-200 focus:outline-none focus:border-primary-500"
                  />
                </div>


                {/* Cost Price */}
                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">Cost Price (₹) *</label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    value={formCostPrice}
                    onChange={(e) => setFormCostPrice(e.target.value)}
                    placeholder="Purchase cost"
                    className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl py-2 px-3 text-xs text-slate-700 dark:text-slate-200 focus:outline-none focus:border-primary-500"
                  />
                </div>

                {/* Selling Price */}
                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">Selling Price (₹) *</label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    value={formSellingPrice}
                    onChange={(e) => setFormSellingPrice(e.target.value)}
                    placeholder="Store retail price"
                    className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl py-2 px-3 text-xs text-slate-700 dark:text-slate-200 focus:outline-none focus:border-primary-500"
                  />
                </div>

                {/* Category input */}
                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">Category *</label>
                  <input
                    type="text"
                    required
                    value={formCategory}
                    onChange={(e) => setFormCategory(e.target.value)}
                    placeholder="e.g. Sarees"
                    className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl py-2 px-3 text-xs text-slate-700 dark:text-slate-200 focus:outline-none focus:border-primary-500"
                  />
                </div>

                {/* Brand input */}
                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">Brand Name</label>
                  <input
                    type="text"
                    value={formBrand}
                    onChange={(e) => setFormBrand(e.target.value)}
                    placeholder="e.g. Deepali Bridal"
                    className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl py-2 px-3 text-xs text-slate-700 dark:text-slate-200 focus:outline-none focus:border-primary-500"
                  />
                </div>



                {/* Alert stock qty (always editable now) */}
                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">Alert Stock Quantity</label>
                  <input
                    type="number"
                    value={formAlertQty}
                    onChange={(e) => setFormAlertQty(e.target.value)}
                    placeholder="Low stock alert trigger level"
                    className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl py-2 px-3 text-xs text-slate-700 dark:text-slate-200 focus:outline-none focus:border-primary-500"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">Product Tax (%)</label>
                  <input
                    type="number"
                    value={formTax}
                    onChange={(e) => setFormTax(e.target.value)}
                    placeholder="e.g. 5, 12, 18"
                    className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl py-2 px-3 text-xs text-slate-700 dark:text-slate-200 focus:outline-none focus:border-primary-500"
                  />
                </div>

                {/* Description */}
                <div className="space-y-1 md:col-span-2">
                  <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">Description</label>
                  <textarea
                    value={formDescription}
                    onChange={(e) => setFormDescription(e.target.value)}
                    placeholder="Additional style / design detail..."
                    className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl py-2 px-3 text-xs text-slate-700 dark:text-slate-200 focus:outline-none focus:border-primary-500 h-16"
                  />
                </div>

                {inlineMsg && (
                  <div className="md:col-span-2 bg-primary-500/10 border border-primary-500/20 text-primary-600 dark:text-primary-400 text-xs py-2 px-3 rounded-lg flex items-center space-x-1">
                    <CheckCircle size={14} />
                    <span>{inlineMsg}</span>
                  </div>
                )}

                {/* Submit Button */}
                <div className="md:col-span-2 border-t border-slate-100 dark:border-slate-800 pt-3 flex items-center justify-end space-x-2">
                  <button
                    type="button"
                    disabled={submitting}
                    onClick={() => setShowAddEditModal(false)}
                    className={`bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700/80 text-slate-600 dark:text-slate-300 px-4 py-2 rounded-xl text-xs font-semibold ${submitting ? 'opacity-50 cursor-not-allowed' : ''}`}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={submitting}
                    className={`bg-primary-600 hover:bg-primary-500 text-white px-5 py-2 rounded-xl text-xs font-semibold flex items-center space-x-1.5 ${submitting ? 'opacity-70 cursor-not-allowed' : ''}`}
                    id="product-save-btn"
                  >
                    {submitting ? (
                      <>
                        <div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        <span>Saving...</span>
                      </>
                    ) : (
                      <span>Save Product</span>
                    )}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* MODAL 2: Excel Import */}
        {showImportModal && (
          <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm z-40 flex items-center justify-center p-4">
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl w-full max-w-lg shadow-2xl p-6 space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
                <h3 className="text-lg font-bold text-slate-800 dark:text-white">Excel Bulk Upload</h3>
                <button onClick={() => setShowImportModal(false)} className="text-slate-400 hover:text-slate-200">
                  <X size={20} />
                </button>
              </div>

              <form onSubmit={handleExcelImport} className="space-y-4">
                <div className="border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-2xl p-6 text-center space-y-2">
                  <FileSpreadsheet className="mx-auto text-primary-500" size={32} />
                  <p className="text-xs font-semibold text-slate-700 dark:text-slate-300">Upload Product Spreadsheet</p>
                  <p className="text-[10px] text-slate-400 leading-normal">
                    Requires columns: <span className="font-mono text-slate-500">Code, Name, Category, Brand, Cost Price, Selling Price, Stock, Alert Quantity</span>
                  </p>
                  <input
                    type="file"
                    accept=".xlsx, .xls"
                    required
                    onChange={(e) => setExcelFile(e.target.files[0])}
                    className="w-full text-xs text-slate-400 mt-2 file:mr-4 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-primary-50 file:text-primary-700 hover:file:bg-primary-100"
                    id="excel-file-input"
                  />
                </div>

                {importReport && (
                  <div className="bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800 p-3 rounded-xl space-y-2 text-xs">
                    <h4 className="font-bold text-slate-800 dark:text-slate-200">Import Summary:</h4>
                    <div className="grid grid-cols-3 gap-2 text-center text-[11px]">
                      <div className="bg-slate-100 dark:bg-slate-900 p-1.5 rounded">
                        <p className="text-slate-400">Total Rows</p>
                        <p className="font-bold">{importReport.summary.totalProcessed}</p>
                      </div>
                      <div className="bg-emerald-500/10 text-emerald-600 p-1.5 rounded border border-emerald-500/10">
                        <p className="text-slate-400">Success</p>
                        <p className="font-bold">{importReport.summary.importedCount}</p>
                      </div>
                      <div className="bg-red-500/10 text-red-500 p-1.5 rounded border border-red-500/10">
                        <p className="text-slate-400">Failed</p>
                        <p className="font-bold">{importReport.summary.failedCount}</p>
                      </div>
                    </div>

                    <div className="max-h-28 overflow-y-auto space-y-1 mt-2 text-[10px]">
                      {importReport.report.map((line, idx) => (
                        <div key={idx} className="flex justify-between border-b border-slate-100 dark:border-slate-900 pb-1">
                          <span className="text-slate-400">Row {line.row} ({line.code || 'N/A'})</span>
                          <span className={line.status === 'Success' ? 'text-emerald-500 font-semibold' : 'text-red-500 font-semibold'}>
                            {line.status === 'Success' ? 'Created' : line.reason}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <div className="flex items-center justify-end space-x-2 border-t border-slate-100 dark:border-slate-800 pt-3">
                  <button
                    type="button"
                    onClick={() => setShowImportModal(false)}
                    className="bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700/80 text-slate-600 dark:text-slate-300 px-4 py-2 rounded-xl text-xs font-semibold"
                  >
                    Close
                  </button>
                  <button
                    type="submit"
                    disabled={importLoading}
                    className="bg-primary-600 hover:bg-primary-500 text-white px-5 py-2 rounded-xl text-xs font-semibold flex items-center space-x-1.5"
                    id="excel-import-submit-btn"
                  >
                    {importLoading ? <span className="w-4.5 h-4.5 border-2 border-white border-t-transparent rounded-full animate-spin" /> : <span>Start Import</span>}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* MODAL 3: Barcode Sticker Printing */}
        {showBarcodeModal && barcodePrintData && (
          <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm z-40 flex items-center justify-center p-4">
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl w-full max-w-xl shadow-2xl p-6 space-y-4 no-print">
              <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
                <h3 className="text-lg font-bold text-slate-800 dark:text-white">Print Barcode Sticker</h3>
                <button onClick={() => setShowBarcodeModal(false)} className="text-slate-400 hover:text-slate-200">
                  <X size={20} />
                </button>
              </div>

              {/* Print Settings Layout */}
              <div className="bg-slate-50 dark:bg-slate-950/40 p-3.5 rounded-xl space-y-3">
                <div className="flex flex-col sm:flex-row gap-3">
                  <div className="flex-1">
                    <label className="text-xs font-bold text-slate-500 block mb-1">Set Print Layout Copies</label>
                    <div className="flex space-x-2">
                      {[1, 4, 40].map(num => (
                        <button
                          key={num}
                          type="button"
                          onClick={() => setPrintCopies(num)}
                          className={`flex-1 py-1 px-3 text-xs rounded-lg font-bold transition-all ${printCopies === num
                              ? 'bg-primary-600 text-white shadow-md'
                              : 'bg-white border dark:bg-slate-900 text-slate-600 dark:text-slate-300'
                            }`}
                        >
                          {num} {num === 1 ? 'Thermal' : 'Labels'}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div className="w-full sm:w-28">
                    <label className="text-xs font-bold text-slate-500 block mb-1">Custom Qty</label>
                    <input
                      type="number"
                      min="1"
                      value={printCopies}
                      onChange={(e) => setPrintCopies(Math.max(1, parseInt(e.target.value) || 1))}
                      className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl py-1.5 px-3 text-xs font-bold text-slate-800 dark:text-white focus:outline-none focus:border-primary-500 transition"
                    />
                  </div>
                </div>
              </div>

              {/* Preview Sheet Card */}
              <div className="border border-slate-100 dark:border-slate-800 p-4 rounded-xl bg-slate-100 dark:bg-slate-950/80 max-h-80 overflow-y-auto flex justify-center">
                <div className={`grid gap-2 bg-white p-3 shadow-inner rounded border ${printCopies === 1 ? 'grid-cols-1' : 'grid-cols-4'}`}>
                  {Array.from({ length: printCopies }).map((_, i) => (
                    <div
                      key={i}
                      className={`border border-slate-400/60 rounded text-center bg-white text-black flex flex-col justify-between items-center shadow-sm ${printCopies === 1 ? 'w-48 h-28 p-2.5 space-y-1.5' : 'w-[105px] h-[72px] p-1.5 space-y-0.5'
                        }`}
                    >
                      <p className={`font-extrabold uppercase leading-none text-slate-900 ${printCopies === 1 ? 'text-[10px] tracking-widest' : 'text-[7px] tracking-wide'
                        }`}>
                        {barcodePrintData.shopName}
                      </p>
                      <p className={`font-bold leading-tight truncate w-full ${printCopies === 1 ? 'text-[9px] text-slate-800' : 'text-[7px] text-slate-700'
                        }`}>
                        {barcodePrintData.productName} {barcodePrintData.productColor ? `(${barcodePrintData.productColor})` : ''}
                      </p>
                      <img
                        src={barcodePrintData.barcodeImage}
                        alt="Barcode Preview"
                        className={`mx-auto object-contain ${printCopies === 1 ? 'h-10' : 'h-7 max-w-full'
                          }`}
                      />
                      <div className={`flex items-center justify-between font-bold w-full gap-2 ${printCopies === 1 ? 'text-[8px] px-1.5 text-slate-700' : 'text-[6px] px-0.5 text-slate-600'
                        }`}>
                        <span>No: {barcodePrintData.barcodeValue}</span>
                        <span className="font-extrabold text-black">₹{barcodePrintData.sellingPrice}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Modal Actions */}
              <div className="flex items-center justify-end space-x-2 border-t border-slate-100 dark:border-slate-800 pt-3">
                <button
                  onClick={() => setShowBarcodeModal(false)}
                  className="bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700/80 text-slate-600 dark:text-slate-300 px-4 py-2 rounded-xl text-xs font-semibold"
                >
                  Close
                </button>
                <button
                  onClick={triggerPrint}
                  className="bg-primary-600 hover:bg-primary-500 text-white px-5 py-2 rounded-xl text-xs font-semibold flex items-center space-x-1.5"
                  id="print-sticker-execute-btn"
                >
                  <Printer size={15} />
                  <span>Print Sticker</span>
                </button>
              </div>
            </div>
          </div>
        )}

      </div>

      {/* PRINT-ONLY AREA: Hidden on web screens, renders on trigger print */}
      {barcodePrintData && (
        <div className="hidden print-area bg-white text-black font-sans">
          {printCopies === 1 ? (
            /* Single Thermal layout */
            <div className="flex justify-center items-center p-2 bg-white text-black w-[2.2in] h-[1.2in] mx-auto">
              <div className="border border-black p-2.5 text-center bg-white text-black space-y-1 w-full h-full flex flex-col justify-between items-center rounded-sm">
                <p className="font-extrabold text-[11px] tracking-wider uppercase text-black leading-none">
                  {barcodePrintData.shopName}
                </p>
                <p className="text-[9px] font-bold text-black leading-none truncate max-w-full">
                  {barcodePrintData.productName} {barcodePrintData.productColor ? `(${barcodePrintData.productColor})` : ''}
                </p>
                <img
                  src={barcodePrintData.barcodeImage}
                  alt="Print Barcode"
                  className="h-14 object-contain max-w-full mx-auto"
                />
                <div className="flex items-center justify-between text-[8px] font-bold w-full px-1 text-black font-mono gap-2">
                  <span>No: {barcodePrintData.barcodeValue}</span>
                  <span className="font-extrabold text-[10px]">₹{barcodePrintData.sellingPrice}</span>
                </div>
              </div>
            </div>
          ) : (
            /* Grid layout (A4 Sheet - 4 columns, up to 10 rows for 40 copies) */
            <div className="print-barcode-grid grid grid-cols-4 gap-x-[3mm] gap-y-[3mm] p-[5mm] bg-white text-black w-full mx-auto box-border">
              {Array.from({ length: printCopies }).map((_, i) => (
                <div
                  key={i}
                  className="border border-slate-400 p-2 text-center bg-white text-black flex flex-col justify-between items-center rounded-sm box-border w-full"
                  style={{
                    height: '24mm',
                  }}
                >
                  <p className="font-extrabold text-[9px] tracking-wider uppercase text-black leading-none">
                    {barcodePrintData.shopName}
                  </p>
                  <p className="text-[8px] font-bold text-slate-800 leading-none truncate max-w-full">
                    {barcodePrintData.productName} {barcodePrintData.productColor ? `(${barcodePrintData.productColor})` : ''}
                  </p>
                  <img
                    src={barcodePrintData.barcodeImage}
                    alt="Print Barcode"
                    className="h-11 object-contain max-w-full mx-auto"
                  />
                  <div className="flex items-center justify-between text-[8px] font-bold w-full px-1 text-black leading-none font-mono gap-2">
                    <span>No: {barcodePrintData.barcodeValue}</span>
                    <span className="font-extrabold text-[9px]">₹{barcodePrintData.sellingPrice}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </>
  );
};

export default Products;
