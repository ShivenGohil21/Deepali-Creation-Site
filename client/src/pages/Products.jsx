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
  RefreshCw,
  Sliders,
  Barcode,
  Save
} from 'lucide-react';

const BARCODE_STYLES = {
  // '40-a4': {
  //   name: '40 per sheet (A4) (52.5mm x 29.7mm)',
  //   cols: 4,
  //   rows: 10,
  //   width: '52.5mm',
  //   height: '29.7mm',
  //   marginTop: '0mm',
  //   marginLeft: '0mm',
  //   imgHeight: '9.5mm',
  //   fontSizeName: '8px',
  //   fontSizeNo: '8px',
  //   fontSizePrice: '9px',
  //   gap: '0mm',
  //   padding: '1mm',
  //   isA4: true
  // },



  '40-a4': {
    name: '40 per sheet (A4) (52.5mm x 29.7mm)',
    cols: 4,
    rows: 10,
    width: '52.5mm',
    height: '29.7mm',
    marginTop: '0mm',
    marginLeft: '0mm',
    imgHeight: '9.5mm',      // Perfect height to allow vertical breathing room
    fontSizeName: '8px',
    fontSizeNo: '8px',
    fontSizePrice: '9px',
    gap: '0mm',
    padding: '0mm',
    isA4: true
  },


  '30-a4': {
    name: '30 per sheet (A4) (69.8mm x 29.7mm)',
    cols: 3,
    rows: 10,
    width: '69.8mm',
    height: '29.7mm',
    marginTop: '0mm',
    marginLeft: '0.3mm',
    imgHeight: '10mm',
    fontSizeName: '8px',
    fontSizeNo: '8px',
    fontSizePrice: '9.5px',
    gap: '0mm',
    padding: '1.2mm',
    isA4: true
  },
  '24-a4': {
    name: '24 per sheet (A4) (69.8mm x 35mm)',
    cols: 3,
    rows: 8,
    width: '69.8mm',
    height: '35mm',
    marginTop: '8.5mm',
    marginLeft: '0.3mm',
    imgHeight: '12mm',
    fontSizeName: '9px',
    fontSizeNo: '8.5px',
    fontSizePrice: '10px',
    gap: '0mm',
    padding: '1.5mm',
    isA4: true
  },
  '20-a4': {
    name: '20 per sheet (A4) (98mm x 28mm)',
    cols: 2,
    rows: 10,
    width: '98mm',
    height: '28mm',
    marginTop: '8.5mm',
    marginLeft: '7mm',
    imgHeight: '9.5mm',
    fontSizeName: '8.5px',
    fontSizeNo: '8.5px',
    fontSizePrice: '10px',
    gap: '0mm',
    padding: '1.2mm',
    isA4: true
  },
  '18-a4': {
    name: '18 per sheet (A4) (69.8mm x 49.5mm)',
    cols: 3,
    rows: 6,
    width: '69.8mm',
    height: '49.5mm',
    marginTop: '0mm',
    marginLeft: '0.3mm',
    imgHeight: '18mm',
    fontSizeName: '10.5px',
    fontSizeNo: '9.5px',
    fontSizePrice: '11.5px',
    gap: '0mm',
    padding: '2.5mm',
    isA4: true
  },
  '14-a4': {
    name: '14 per sheet (A4) (99.1mm x 38.1mm)',
    cols: 2,
    rows: 7,
    width: '99.1mm',
    height: '38.1mm',
    marginTop: '15.15mm',
    marginLeft: '5.9mm',
    imgHeight: '13mm',
    fontSizeName: '10px',
    fontSizeNo: '9px',
    fontSizePrice: '11px',
    gap: '0mm',
    padding: '1.8mm',
    isA4: true
  },
  '12-a4-3cols': {
    name: '12 per sheet (A4) (3 columns, 69.8mm x 70mm)',
    cols: 3,
    rows: 4,
    width: '69.8mm',
    height: '70mm',
    marginTop: '8.5mm',
    marginLeft: '0.3mm',
    imgHeight: '26mm',
    fontSizeName: '11.5px',
    fontSizeNo: '10px',
    fontSizePrice: '12.5px',
    gap: '0mm',
    padding: '3.5mm',
    isA4: true
  },
  '12-a4-2cols': {
    name: '12 per sheet (A4) (2 columns, 104.7mm x 49.4mm)',
    cols: 2,
    rows: 6,
    width: '104.7mm',
    height: '49.4mm',
    marginTop: '0.3mm',
    marginLeft: '0.3mm',
    imgHeight: '18mm',
    fontSizeName: '11px',
    fontSizeNo: '10px',
    fontSizePrice: '12px',
    gap: '0mm',
    padding: '2.5mm',
    isA4: true
  },
  '10-a4': {
    name: '10 per sheet (A4) (99.1mm x 57.2mm)',
    cols: 2,
    rows: 5,
    width: '99.1mm',
    height: '57.2mm',
    marginTop: '5.5mm',
    marginLeft: '5.9mm',
    imgHeight: '20mm',
    fontSizeName: '11.5px',
    fontSizeNo: '10.5px',
    fontSizePrice: '12.5px',
    gap: '0mm',
    padding: '3.5mm',
    isA4: true
  },
  'continuous': {
    name: 'Continuous feed (31mm x 23mm)',
    cols: 1,
    rows: 1,
    width: '3.1cm',
    height: '2.3cm',
    marginTop: '0mm',
    marginLeft: '0mm',
    imgHeight: '11mm',
    fontSizeName: '7px',
    fontSizeNo: '6.5px',
    fontSizePrice: '7.5px',
    gap: '0px',
    padding: '2px',
    isA4: false
  }
};

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
  const [showImportModal, setShowImportModal] = useState(false);
  const [showAdjustModal, setShowAdjustModal] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);
  const [adjustProduct, setAdjustProduct] = useState(null);
  const [adjustNewQty, setAdjustNewQty] = useState('');

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
  const [formBarcodeValue, setFormBarcodeValue] = useState('');
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

  // Bulk Barcode printing state
  const [showBulkBarcodeModal, setShowBulkBarcodeModal] = useState(false);
  const [bulkBarcodeItems, setBulkBarcodeItems] = useState([]);
  const [printStyle, setPrintStyle] = useState('24-a4');
  const [tempPrintStyle, setTempPrintStyle] = useState('24-a4');
  const [bulkBarcodeLoading, setBulkBarcodeLoading] = useState(false);

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
      const statusText = p.status || 'Active';
      return `"${p.code}","${p.name.replace(/"/g, '""')}","${(p.color || '-').replace(/"/g, '""')}","${categoryName.replace(/"/g, '""')}","${brandName.replace(/"/g, '""')}",${p.costPrice},${p.sellingPrice},"${p.barcodeValue || ''}",${p.stockQuantity},"${p.unit}",${p.alertQuantity},"${statusText}"`;
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

  const handleOpenBulkBarcode = async () => {
    if (selectedProductIds.length === 0) {
      alert('Please select at least one product using the checkboxes to print barcodes.');
      return;
    }

    try {
      setBulkBarcodeLoading(true);
      const productIds = selectedProductIds;

      const res = await API.post('/products/barcode-bulk', { productIds });
      if (res.data.success) {
        const barcodeDataMap = {};
        res.data.data.forEach(item => {
          barcodeDataMap[item.productId] = item;
        });

        const initialBarcodeItems = products
          .filter(p => selectedProductIds.includes(p._id))
          .map(prod => {
            const barcodeInfo = barcodeDataMap[prod._id] || {};
            const currentStock = prod.stockQuantity !== undefined ? prod.stockQuantity : 0;
            return {
              product: prod,
              purchaseQuantity: 0,
              currentStock: currentStock,
              quantity: currentStock > 0 ? currentStock : 1,
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
      showToast(err.response?.data?.message || err.message, 'error');
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

  const handleBulkBarcodeSetAllToCurrentStock = () => {
    setBulkBarcodeItems(prev => prev.map(item => ({ ...item, quantity: item.currentStock > 0 ? item.currentStock : 1 })));
  };

  const handleBulkBarcodeSetAllToFixedQty = (qty) => {
    setBulkBarcodeItems(prev => prev.map(item => ({ ...item, quantity: qty })));
  };

  const handleUpdateProductPrice = async (idx) => {
    const item = bulkBarcodeItems[idx];
    if (!item || !item.product || !item.product._id) return;

    try {
      const res = await API.put(`/products/${item.product._id}`, {
        sellingPrice: Number(item.customPrice)
      });
      if (res.data.success) {
        showToast(`Updated database selling price for "${item.productName}" to ₹${Number(item.customPrice).toFixed(2)}.`);

        const updated = [...bulkBarcodeItems];
        updated[idx].product.sellingPrice = Number(item.customPrice);
        setBulkBarcodeItems(updated);
      }
    } catch (err) {
      showToast(err.message, 'error');
    }
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
    setFormBarcodeValue(product.barcodeValue || '');
    setFormStockQty(product.stockQuantity !== undefined ? product.stockQuantity : 0);
    setShowAddEditModal(true);
  };

  const handleOpenAdjust = (p) => {
    setAdjustProduct(p);
    setAdjustNewQty(p.stockQuantity || 0);
    setShowAdjustModal(true);
  };

  const handleSaveAdjust = async (e) => {
    e.preventDefault();
    if (!adjustProduct) return;

    const newQty = Number(adjustNewQty);
    if (isNaN(newQty) || newQty < 0) {
      showToast('Please enter a valid positive number', 'error');
      return;
    }

    const currentQty = adjustProduct.stockQuantity || 0;
    const diff = newQty - currentQty;

    if (diff === 0) {
      showToast('No adjustment needed, quantity is already ' + currentQty);
      setShowAdjustModal(false);
      return;
    }

    try {
      setSubmitting(true);
      // Pick the first warehouse or default if empty
      const warehouseId = adjustProduct.warehouseStock && adjustProduct.warehouseStock.length > 0
        ? adjustProduct.warehouseStock[0].warehouse
        : (warehouses.length > 0 ? warehouses[0]._id : null);

      if (!warehouseId) {
        showToast('No warehouse available for adjustment', 'error');
        setSubmitting(false);
        return;
      }

      const type = diff > 0 ? 'Addition' : 'Subtraction';

      const payload = {
        warehouseId,
        notes: 'Manual Adjustment from Products Catalogue',
        items: [{
          productId: adjustProduct._id,
          type,
          quantity: Math.abs(diff),
          price: adjustProduct.costPrice || 0
        }]
      };

      const res = await API.post('/adjustments', payload);
      if (res.data.success) {
        showToast(`Stock successfully adjusted to ${newQty} ${adjustProduct.unit}`);
        await fetchInitialData();
        setShowAdjustModal(false);
      }
    } catch (err) {
      showToast(err.response?.data?.message || err.message, 'error');
    } finally {
      setSubmitting(false);
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
      codePrefix: formPrefix,
      barcodeValue: formBarcodeValue || undefined,
      stockQuantity: formStockQty !== '' ? Number(formStockQty) : 0
    };

    try {
      setSubmitting(true);
      if (editingProduct) {
        // Edit flow
        payload.code = formCode || undefined;
        const res = await API.put(`/products/${editingProduct._id}`, payload);
        if (res.data.success) {
          showToast('Product updated successfully!');
          await fetchInitialData();
          setShowAddEditModal(false);
        }
      } else {
        // Add flow
        payload.code = formCode || undefined;

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

  // Filter products locally
  const filteredProducts = products.filter(p => {
    const matchesSearch =
      p.name.toLowerCase().includes(search.toLowerCase()) ||
      p.code.toLowerCase().includes(search.toLowerCase());

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
              <p className="text-sm text-slate-400 dark:text-slate-500 mt-0.5">Manage details, categories, and inventory levels.</p>
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
                onClick={handleOpenBulkBarcode}
                disabled={selectedProductIds.length === 0}
                className="flex items-center space-x-1.5 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white px-4 py-2.5 rounded-xl font-semibold text-xs shadow-md shadow-indigo-700/10 active:scale-95 transition-all"
                id="print-barcodes-btn"
              >
                {bulkBarcodeLoading ? (
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  <Barcode size={16} />
                )}
                <span>Print Barcodes ({selectedProductIds.length})</span>
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
                <span>Sync Stock</span>
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
                    <th className="px-6 py-3.5">Barcode</th>
                    <th className="px-6 py-3.5">Product Name</th>
                    <th className="px-6 py-3.5">Color</th>
                    <th className="px-6 py-3.5">Category</th>
                    <th className="px-6 py-3.5">Brand</th>
                    <th className="px-6 py-3.5">Cost Price</th>
                    <th className="px-6 py-3.5">Selling Price</th>
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
                        No matching products found.
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
                        <td className="px-6 py-3.5 font-mono text-[11px] text-slate-500 dark:text-slate-400">{p.barcodeValue}</td>
                        <td className="px-6 py-3.5 font-semibold text-slate-900 dark:text-white">{p.name}</td>
                        <td className="px-6 py-3.5 font-semibold text-slate-500 dark:text-slate-400">{p.color || '-'}</td>
                        <td className="px-6 py-3.5">{p.category?.name || 'N/A'}</td>
                        <td className="px-6 py-3.5 text-slate-400">{p.brand?.name || 'N/A'}</td>
                        <td className="px-6 py-3.5 text-slate-400">₹{p.costPrice.toFixed(2)}</td>
                        <td className="px-6 py-3.5 font-bold text-slate-850 dark:text-slate-100">₹{p.sellingPrice.toFixed(2)}</td>
                        <td className="px-6 py-3.5 text-center">
                          <button
                            onClick={() => handleOpenAdjust(p)}
                            title="Click to Adjust Stock"
                            className={`whitespace-nowrap px-2.5 py-1 rounded-full text-[10px] font-bold cursor-pointer hover:scale-105 active:scale-95 transition-transform ${p.stockQuantity <= p.alertQuantity
                              ? 'bg-red-500/10 text-red-500 border border-red-500/20 hover:bg-red-500/20'
                              : 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 hover:bg-emerald-500/20'
                              }`}
                          >
                            {p.stockQuantity} {p.unit}
                          </button>
                        </td>
                        <td className="px-6 py-3.5 text-right space-x-1.5 shrink-0 whitespace-nowrap">
                          <button
                            onClick={() => handleOpenAdjust(p)}
                            className="p-1.5 text-slate-400 hover:text-orange-500 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
                            title="Adjust Stock"
                          >
                            <Sliders size={15} />
                          </button>
                          <button
                            onClick={() => handleOpenEdit(p)}
                            className="p-1.5 text-slate-400 hover:text-blue-500 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
                            title="Edit details"
                          >
                            <Edit2 size={15} />
                          </button>
                          {(user?.role === 'Super Admin' || user?.role === 'Admin') && (
                            <button
                              onClick={() => handleDeleteProduct(p._id)}
                              className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
                              title="Delete product"
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
        </div>

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

                {/* Barcode Number Input */}
                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">Barcode Number *</label>
                  <input
                    type="text"
                    required
                    value={formBarcodeValue}
                    onChange={(e) => setFormBarcodeValue(e.target.value)}
                    placeholder="e.g. D0001 or scan barcode"
                    className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl py-2.5 px-3 text-xs text-slate-700 dark:text-slate-200 focus:outline-none focus:border-primary-500 font-mono"
                    id="product-barcode-input"
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

                {/* Manual Stock Quantity */}
                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">Stock Quantity (Pcs)</label>
                  <input
                    type="number"
                    value={formStockQty}
                    onChange={(e) => setFormStockQty(e.target.value)}
                    placeholder="Enter manual stock quantity"
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

        {/* MODAL 3: Bulk Barcode Printing Wizard */}
        {showBulkBarcodeModal && (
          <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl w-full max-w-4xl shadow-2xl p-6 space-y-4 no-print max-h-[90vh] flex flex-col">
              <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3 shrink-0">
                <div>
                  <h3 className="text-lg font-bold text-slate-800 dark:text-white">Product Barcodes Printing Wizard</h3>
                  <p className="text-xs text-slate-400">Configure sticker sheets for the selected products.</p>
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
                        showToast('Applied print layout style settings.');
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
                      onClick={handleBulkBarcodeSetAllToCurrentStock}
                      className="text-[10px] bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700/80 text-slate-700 dark:text-slate-350 py-1.5 px-3 rounded-lg font-bold transition-all shadow-sm active:scale-95"
                    >
                      Set all to Current Stock
                    </button>
                    <button
                      type="button"
                      onClick={() => handleBulkBarcodeSetAllToFixedQty(1)}
                      className="text-[10px] bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700/80 text-slate-700 dark:text-slate-350 py-1.5 px-3 rounded-lg font-bold transition-all shadow-sm active:scale-95"
                    >
                      Set all to 1 Copy
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
                            checked={bulkBarcodeItems.length > 0 && bulkBarcodeItems.every(item => item.selected)}
                            onChange={() => {
                              const allSelected = bulkBarcodeItems.every(item => item.selected);
                              setBulkBarcodeItems(bulkBarcodeItems.map(item => ({ ...item, selected: !allSelected })));
                            }}
                            className="rounded text-primary-600 focus:ring-primary-500 w-4 h-4 cursor-pointer"
                          />
                        </th>
                        <th className="px-4 py-3">Product Info</th>
                        <th className="px-4 py-3 text-center">Current Stock (Pcs)</th>
                        <th className="px-4 py-3 text-center">Cost Price</th>
                        <th className="px-4 py-3 text-center">Selling Price (₹)</th>
                        <th className="px-4 py-3 text-center">Stickers to Print</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
                      {bulkBarcodeItems.map((item, idx) => (
                        <tr
                          key={idx}
                          className={`text-slate-700 dark:text-slate-350 hover:bg-slate-50/50 dark:hover:bg-slate-800/20 transition-colors ${!item.selected ? 'opacity-50' : ''
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
                  <div className="border border-slate-200 dark:border-slate-800 p-6 rounded-2xl bg-slate-100 dark:bg-slate-950/80 max-h-72 overflow-y-auto overflow-x-auto flex justify-center">
                    {bulkBarcodeItems.filter(item => item.selected && (Math.max(0, Math.floor(Number(item.quantity) || 0)) > 0)).length === 0 ? (
                      <div className="text-slate-400 text-xs py-8">Select products and set print quantities to preview.</div>
                    ) : (
                      <div
                        className="bg-white p-4 shadow-inner rounded border border-slate-300 text-black"
                        style={printStyle !== 'continuous' ? {
                          display: 'grid',
                          gridTemplateColumns: `repeat(${BARCODE_STYLES[printStyle].cols}, ${BARCODE_STYLES[printStyle].width})`,
                          gap: BARCODE_STYLES[printStyle].gap,
                          width: BARCODE_STYLES[printStyle].isA4 ? '210mm' : '100%',
                          boxSizing: 'border-box',
                          paddingTop: BARCODE_STYLES[printStyle].marginTop,
                          paddingBottom: BARCODE_STYLES[printStyle].marginTop,
                          paddingLeft: BARCODE_STYLES[printStyle].marginLeft,
                          paddingRight: BARCODE_STYLES[printStyle].marginLeft,
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
                                className="text-center bg-white text-black flex flex-col justify-between items-center shadow-sm barcode-card"
                                style={printStyle === 'continuous' ? {
                                  width: '3.1cm',
                                  height: '2.3cm',
                                  padding: BARCODE_STYLES[printStyle].padding,
                                  boxSizing: 'border-box',
                                  pageBreakInside: 'avoid',
                                  breakInside: 'avoid',
                                  border: '1px solid #ddd'
                                } : {
                                  width: BARCODE_STYLES[printStyle].width,
                                  height: BARCODE_STYLES[printStyle].height,
                                  padding: BARCODE_STYLES[printStyle].padding,
                                  boxSizing: 'border-box',
                                  pageBreakInside: 'avoid',
                                  breakInside: 'avoid',
                                  border: '0.1mm solid #e2e8f0'
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
                  className="bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white px-5 py-2.5 rounded-xl text-xs font-semibold flex items-center space-x-1.5 shadow-md active:scale-95 transition-all"
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
                        className="flex justify-center items-center p-0.5 bg-white text-black mx-auto barcode-card-container"
                        style={{
                          width: '3.1cm',
                          height: '2.3cm',
                          pageBreakAfter: 'always',
                          pageBreakInside: 'avoid',
                          breakInside: 'avoid'
                        }}
                      >
                        <div
                          className="border border-black text-center bg-white text-black flex flex-col justify-between items-center rounded-sm w-full h-full box-border barcode-card"
                          style={{ padding: BARCODE_STYLES[printStyle].padding }}
                        >
                          <p
                            className="font-semibold uppercase leading-tight text-black m-0 p-0"
                            style={{ fontSize: BARCODE_STYLES[printStyle].fontSizeName }}
                          >
                            {item.shopName}
                          </p>
                          <p
                            className="font-bold uppercase leading-tight truncate max-w-full text-black m-0 p-0"
                            style={{ fontSize: `calc(${BARCODE_STYLES[printStyle].fontSizeName} + 1px)` }}
                          >
                            {item.productName} {item.productColor ? `(${item.productColor})` : ''}
                          </p>
                          <p
                            className="font-bold leading-tight text-black m-0 p-0 mb-0.5"
                            style={{ fontSize: BARCODE_STYLES[printStyle].fontSizePrice }}
                          >
                            PRICE {Number(item.customPrice || 0).toFixed(2)}
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
                          <p
                            className="font-extrabold tracking-widest uppercase leading-none text-black m-0 p-0 mt-0.5"
                            style={{ fontSize: BARCODE_STYLES[printStyle].fontSizeNo }}
                          >
                            {item.barcodeValue}
                          </p>
                        </div>
                      </div>
                    ))
                  )}
              </div>
            ) : (
              /* Custom grid layout printed on sheet */
              <div className="w-full mx-auto box-border">
                {(() => {
                  const itemsPerPage = parseInt(printStyle.split('-')[0], 10);
                  const allItems = bulkBarcodeItems
                    .filter(item => item.selected && (Math.max(0, Math.floor(Number(item.quantity) || 0)) > 0))
                    .flatMap((item) =>
                      Array.from({ length: Math.max(0, Math.floor(Number(item.quantity) || 0)) }).fill(item)
                    );

                  const pages = [];
                  for (let i = 0; i < allItems.length; i += itemsPerPage) {
                    pages.push(allItems.slice(i, i + itemsPerPage));
                  }

                  return pages.map((pageItems, pageIdx) => (
                    <div
                      key={`page-${pageIdx}`}
                      className="bg-white text-black mx-auto"
                      style={{
                        display: 'grid',
                        gridTemplateColumns: `repeat(${BARCODE_STYLES[printStyle].cols}, ${BARCODE_STYLES[printStyle].width})`,
                        gridTemplateRows: `repeat(${BARCODE_STYLES[printStyle].rows}, ${BARCODE_STYLES[printStyle].height})`,
                        gap: BARCODE_STYLES[printStyle].gap,
                        paddingTop: BARCODE_STYLES[printStyle].isA4 ? BARCODE_STYLES[printStyle].marginTop : '0mm',
                        paddingBottom: BARCODE_STYLES[printStyle].isA4 ? BARCODE_STYLES[printStyle].marginTop : '0mm',
                        paddingLeft: BARCODE_STYLES[printStyle].isA4 ? BARCODE_STYLES[printStyle].marginLeft : '0mm',
                        paddingRight: BARCODE_STYLES[printStyle].isA4 ? BARCODE_STYLES[printStyle].marginLeft : '0mm',
                        width: BARCODE_STYLES[printStyle].isA4 ? '210mm' : '100%',
                        height: BARCODE_STYLES[printStyle].isA4 ? '297mm' : 'auto',
                        boxSizing: 'border-box',
                        pageBreakAfter: 'always',
                        breakAfter: 'page'
                      }}
                    >
                      {pageItems.map((item, itemIdx) => (
                        <div
                          key={`print-grid-${pageIdx}-${itemIdx}`}
                          className="text-center bg-white text-black flex flex-col justify-between items-center rounded-sm box-border w-full barcode-card"
                          style={{
                            height: BARCODE_STYLES[printStyle].height,
                            padding: BARCODE_STYLES[printStyle].padding,
                            boxSizing: 'border-box',
                            pageBreakInside: 'avoid',
                            breakInside: 'avoid',
                            border: BARCODE_STYLES[printStyle].isA4 ? '0.1mm solid #f1f5f9' : '1px solid #ddd'
                          }}
                        >
                          <p
                            className="font-semibold uppercase leading-tight text-black m-0 p-0"
                            style={{ fontSize: BARCODE_STYLES[printStyle].fontSizeName }}
                          >
                            {item.shopName}
                          </p>
                          <p
                            className="font-bold uppercase leading-tight truncate max-w-full text-black m-0 p-0"
                            style={{ fontSize: `calc(${BARCODE_STYLES[printStyle].fontSizeName} + 1px)` }}
                          >
                            {item.productName} {item.productColor ? `(${item.productColor})` : ''}
                          </p>
                          <p
                            className="font-bold leading-tight text-black m-0 p-0 mb-0.5"
                            style={{ fontSize: BARCODE_STYLES[printStyle].fontSizePrice }}
                          >
                            PRICE {Number(item.customPrice || 0).toFixed(2)}
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
                          <p
                            className="font-extrabold tracking-widest uppercase leading-none text-black m-0 p-0 mt-0.5"
                            style={{ fontSize: BARCODE_STYLES[printStyle].fontSizeNo }}
                          >
                            {item.barcodeValue}
                          </p>
                        </div>
                      ))}
                    </div>
                  ));
                })()}
              </div>
            )}
          </div>
        )}

      </div>
    </>
  );
};

export default Products;
