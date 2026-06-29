const Product = require('../models/Product');
const Category = require('../models/Category');
const Brand = require('../models/Brand');
const Warehouse = require('../models/Warehouse');
const InventoryLog = require('../models/InventoryLog');
const Notification = require('../models/Notification');
const bwipjs = require('bwip-js');
const QRCode = require('qrcode');
const xlsx = require('xlsx');
const { logAction } = require('../utils/auditLogger');

// Helper: Generate next sequential product code
const generateNextCode = async (prefix) => {
  const cleanPrefix = prefix ? prefix.toUpperCase().trim() : 'D';
  // Find products where code starts with prefix followed by numbers
  const regex = new RegExp(`^${cleanPrefix}(\\d+)$`);
  const products = await Product.find({ code: regex });

  let maxNum = 0;
  products.forEach((prod) => {
    const match = prod.code.match(regex);
    if (match) {
      const num = parseInt(match[1], 10);
      if (num > maxNum) {
        maxNum = num;
      }
    }
  });

  const nextNum = maxNum + 1;
  // Pad with 4 digits e.g. 0001, 0002
  const paddedNum = String(nextNum).padStart(4, '0');
  return `${cleanPrefix}${paddedNum}`;
};

// Helper: Generate Barcode Base64
const getBarcodeBase64 = async (text, scale = 3, includetext = true) => {
  return new Promise((resolve, reject) => {
    bwipjs.toBuffer(
      {
        bcid: 'code128',
        text: text,
        scale: scale,
        height: 16,
        includetext: includetext,
        textxalign: 'center'
      },
      (err, png) => {
        if (err) {
          reject(err);
        } else {
          resolve(`data:image/png;base64,${png.toString('base64')}`);
        }
      }
    );
  });
};

// Helper: Generate QR Code Base64
const getQRCodeBase64 = async (text) => {
  return await QRCode.toDataURL(text);
};

// @desc    Get all products
// @route   GET /api/products
// @access  Private
exports.getProducts = async (req, res) => {
  try {
    const { search, category, brand, status, stockAlert } = req.query;
    let query = {};

    // Filter by search (name, code, barcodeValue)
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { code: { $regex: search, $options: 'i' } },
        { barcodeValue: { $regex: search, $options: 'i' } }
      ];
    }

    // Filter by Category
    if (category) {
      query.category = category;
    }

    // Filter by Brand
    if (brand) {
      query.brand = brand;
    }

    // Filter by Status
    if (status) {
      query.status = status;
    }

    // Filter by low stock alerts
    if (stockAlert === 'true') {
      query.$expr = { $lte: ['$stockQuantity', '$alertQuantity'] };
    }

    const products = await Product.find(query)
      .populate('category', 'name')
      .populate('brand', 'name')
      .sort({ barcodeValue: 1 });

    res.status(200).json({
      success: true,
      count: products.length,
      data: products
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Get single product details
// @route   GET /api/products/:id
// @access  Private
exports.getProductById = async (req, res) => {
  try {
    const product = await Product.findById(req.params.id)
      .populate('category', 'name')
      .populate('brand', 'name')
      .populate('warehouseStock.warehouse', 'name');

    if (!product) {
      return res.status(404).json({ success: false, message: 'Product not found' });
    }

    res.status(200).json({ success: true, data: product });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Get product by code or barcode value (for scanner scans)
// @route   GET /api/products/scan/:code
// @access  Private
exports.getProductByCodeOrBarcode = async (req, res) => {
  try {
    const codeVal = req.params.code;
    const product = await Product.findOne({
      $or: [{ code: codeVal }, { barcodeValue: codeVal }],
      status: 'Active'
    }).populate('category', 'name');

    if (!product) {
      return res.status(404).json({ success: false, message: 'Product not found or inactive' });
    }

    res.status(200).json({ success: true, data: product });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Create product
// @route   POST /api/products
// @access  Private
exports.createProduct = async (req, res) => {
  try {
    let {
      code,
      name,
      category,
      brand,
      unit,
      costPrice,
      sellingPrice,
      tax,
      barcodeValue,
      stockQuantity,
      alertQuantity,
      color,
      description,
      status,
      warehouseId,
      codePrefix
    } = req.body;

    if (!name || !category || !costPrice || !sellingPrice) {
      return res.status(400).json({ success: false, message: 'Name, Category, Cost Price, and Selling Price are required' });
    }

    const mongoose = require('mongoose');

    // Resolve Category string/name or ID
    let categoryId = null;
    if (mongoose.Types.ObjectId.isValid(category)) {
      categoryId = category;
    } else if (typeof category === 'string' && category.trim()) {
      let categoryObj = await Category.findOne({ name: { $regex: `^${category.trim()}$`, $options: 'i' } });
      if (!categoryObj) {
        categoryObj = new Category({ name: category.trim(), description: 'Auto-created via Product Creation' });
        await categoryObj.save();
      }
      categoryId = categoryObj._id;
    }

    // Resolve Brand string/name or ID
    let brandId = null;
    if (brand) {
      if (mongoose.Types.ObjectId.isValid(brand)) {
        brandId = brand;
      } else if (typeof brand === 'string' && brand.trim()) {
        let brandObj = await Brand.findOne({ name: { $regex: `^${brand.trim()}$`, $options: 'i' } });
        if (!brandObj) {
          brandObj = new Brand({ name: brand.trim(), description: 'Auto-created via Product Creation' });
          await brandObj.save();
        }
        brandId = brandObj._id;
      }
    }

    // Auto-generate Code if not provided
    if (!code) {
      code = await generateNextCode(codePrefix || 'D');
    }

    // Auto-generate Barcode Value if not provided
    if (!barcodeValue) {
      barcodeValue = code;
    }

    // Check if code or barcode already exists
    const codeExists = await Product.findOne({ $or: [{ code }, { barcodeValue }] });
    if (codeExists) {
      return res.status(400).json({ success: false, message: 'Product Code or Barcode Value already exists' });
    }

    // Generate Barcode & QR Code Base64 images
    let qrCodeBase64 = '';
    try {
      qrCodeBase64 = await getQRCodeBase64(barcodeValue);
    } catch (err) {
      console.error('QR code generation failed:', err.message);
    }

    const initialStock = Number(stockQuantity) || 0;
    
    // Build product data
    const productData = {
      code,
      name,
      category: categoryId,
      brand: brandId,
      unit: unit || 'Pcs',
      costPrice: Number(costPrice),
      sellingPrice: Number(sellingPrice),
      tax: Number(tax) || 0,
      barcodeValue,
      qrCode: qrCodeBase64,
      stockQuantity: initialStock,
      initialStock: initialStock,
      alertQuantity: Number(alertQuantity) || 5,
      color: color || '',
      description: description || '',
      status: status || 'Active',
      warehouseStock: []
    };

    // Allocate initial stock to warehouse if warehouseId is provided
    if (initialStock > 0) {
      let activeWarehouseId = warehouseId;
      if (!activeWarehouseId) {
        // Fallback to first available warehouse
        const defaultWh = await Warehouse.findOne();
        if (defaultWh) {
          activeWarehouseId = defaultWh._id;
        }
      }

      if (activeWarehouseId) {
        productData.warehouseStock.push({
          warehouse: activeWarehouseId,
          quantity: initialStock
        });
      }
    }

    const product = new Product(productData);
    await product.save();

    // Create inventory log if stock is injected
    if (initialStock > 0 && productData.warehouseStock.length > 0) {
      const activeWh = productData.warehouseStock[0].warehouse;
      const log = new InventoryLog({
        product: product._id,
        warehouse: activeWh,
        type: 'Stock In',
        quantity: initialStock,
        previousStock: 0,
        newStock: initialStock,
        notes: 'Initial stock on creation',
        createdBy: req.user ? req.user.id : null
      });
      await log.save();
    }

    // Check low stock and create alert notification if relevant
    if (initialStock <= product.alertQuantity) {
      const alertNotif = new Notification({
        message: `Low Stock Alert: Product "${product.name}" (${product.code}) has stock of ${initialStock}`,
        type: 'Low Stock'
      });
      await alertNotif.save();
    }

    await logAction(
      req.user ? req.user.id : null,
      req.user ? req.user.username : 'Admin',
      'Create Product',
      `Product ${product.code}`,
      `Created product: "${product.name}", initial stock: ${initialStock}`
    );

    res.status(201).json({ success: true, data: product });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Update product
// @route   PUT /api/products/:id
// @access  Private
exports.updateProduct = async (req, res) => {
  try {
    const {
      code,
      name,
      category,
      brand,
      unit,
      costPrice,
      sellingPrice,
      tax,
      barcodeValue,
      alertQuantity,
      color,
      description,
      status,
      stockQuantity,
      initialStock
    } = req.body;

    let product = await Product.findById(req.params.id);
    if (!product) {
      return res.status(404).json({ success: false, message: 'Product not found' });
    }

    // Check if updating code and verify uniqueness
    if (code && code !== product.code) {
      const codeExists = await Product.findOne({ code });
      if (codeExists) {
        return res.status(400).json({ success: false, message: 'Product Code is already taken' });
      }
      product.code = code;
    }

    // Check if updating barcodeValue and verify uniqueness
    if (barcodeValue && barcodeValue !== product.barcodeValue) {
      const barcodeExists = await Product.findOne({ barcodeValue });
      if (barcodeExists) {
        return res.status(400).json({ success: false, message: 'Barcode Value is already taken' });
      }
      product.barcodeValue = barcodeValue;
      product.qrCode = await getQRCodeBase64(barcodeValue);
    }

    const mongoose = require('mongoose');

    // Resolve Category string/name or ID
    if (category) {
      let categoryId = null;
      if (mongoose.Types.ObjectId.isValid(category)) {
        categoryId = category;
      } else if (typeof category === 'string' && category.trim()) {
        let categoryObj = await Category.findOne({ name: { $regex: `^${category.trim()}$`, $options: 'i' } });
        if (!categoryObj) {
          categoryObj = new Category({ name: category.trim(), description: 'Auto-created via Product Update' });
          await categoryObj.save();
        }
        categoryId = categoryObj._id;
      }
      product.category = categoryId || product.category;
    }

    // Resolve Brand string/name or ID
    if (brand !== undefined) {
      let brandId = null;
      if (brand === '' || brand === null) {
        brandId = null;
      } else if (mongoose.Types.ObjectId.isValid(brand)) {
        brandId = brand;
      } else if (typeof brand === 'string' && brand.trim()) {
        let brandObj = await Brand.findOne({ name: { $regex: `^${brand.trim()}$`, $options: 'i' } });
        if (!brandObj) {
          brandObj = new Brand({ name: brand.trim(), description: 'Auto-created via Product Update' });
          await brandObj.save();
        }
        brandId = brandObj._id;
      }
      product.brand = brandId;
    }

    product.name = name || product.name;
    product.unit = unit || product.unit;
    product.costPrice = costPrice !== undefined ? Number(costPrice) : product.costPrice;
    product.sellingPrice = sellingPrice !== undefined ? Number(sellingPrice) : product.sellingPrice;
    product.tax = tax !== undefined ? Number(tax) : product.tax;
    product.alertQuantity = alertQuantity !== undefined ? Number(alertQuantity) : product.alertQuantity;
    product.color = color !== undefined ? color : product.color;
    product.description = description !== undefined ? description : product.description;
    product.status = status || product.status;
    
    if (initialStock !== undefined) {
      product.initialStock = Number(initialStock);
    }

    // Manual Stock Update Handling
    if (stockQuantity !== undefined && Number(stockQuantity) !== product.stockQuantity) {
      const oldStock = product.stockQuantity;
      const newStock = Number(stockQuantity);
      const diff = newStock - oldStock;
      
      product.stockQuantity = newStock;
      
      let targetWarehouseId = null;
      if (newStock === 0) {
        if (product.warehouseStock && product.warehouseStock.length > 0) {
          product.warehouseStock.forEach(s => {
            s.quantity = 0;
          });
          targetWarehouseId = product.warehouseStock[0].warehouse;
        }
      } else {
        if (product.warehouseStock && product.warehouseStock.length > 0) {
          product.warehouseStock[0].quantity = Math.max(0, product.warehouseStock[0].quantity + diff);
          targetWarehouseId = product.warehouseStock[0].warehouse;
        } else {
          const defaultWh = await Warehouse.findOne();
          if (defaultWh) {
            product.warehouseStock = [{
              warehouse: defaultWh._id,
              quantity: newStock
            }];
            targetWarehouseId = defaultWh._id;
          }
        }
      }
      
      if (targetWarehouseId) {
        const log = new InventoryLog({
          product: product._id,
          warehouse: targetWarehouseId,
          type: diff > 0 ? 'Stock In' : 'Stock Out',
          quantity: Math.abs(diff),
          previousStock: oldStock,
          newStock: newStock,
          notes: 'Manual stock update via Product Edit',
          createdBy: req.user ? req.user.id : null
        });
        await log.save();
      }
    }

    await product.save();

    // Check if updated product triggers stock alert
    if (product.stockQuantity <= product.alertQuantity) {
      const exists = await Notification.findOne({
        message: { $regex: product.code },
        isRead: false
      });
      if (!exists) {
        const notif = new Notification({
          message: `Low Stock Alert: Product "${product.name}" (${product.code}) has stock of ${product.stockQuantity}`,
          type: 'Low Stock'
        });
        await notif.save();
      }
    }

    await logAction(
      req.user ? req.user.id : null,
      req.user ? req.user.username : 'Admin',
      'Update Product',
      `Product ${product.code}`,
      `Updated product details for "${product.name}"`
    );

    res.status(200).json({ success: true, data: product });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Delete product
// @route   DELETE /api/products/:id
// @access  Private
exports.deleteProduct = async (req, res) => {
  try {
    const product = await Product.findById(req.params.id);
    if (!product) {
      return res.status(404).json({ success: false, message: 'Product not found' });
    }

    await Product.deleteOne({ _id: req.params.id });

    // Remove associated inventory logs
    await InventoryLog.deleteMany({ product: req.params.id });

    await logAction(
      req.user ? req.user.id : null,
      req.user ? req.user.username : 'Admin',
      'Delete Product',
      `Product ${product.code}`,
      `Deleted product: "${product.name}" and cleared associated stock logs`
    );

    res.status(200).json({ success: true, message: 'Product deleted successfully' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Single Barcode generate image return (base64)
// @route   GET /api/products/barcode/:id
// @access  Private
exports.getProductBarcodeImage = async (req, res) => {
  try {
    const product = await Product.findById(req.params.id);
    if (!product) {
      return res.status(404).json({ success: false, message: 'Product not found' });
    }

    const base64Barcode = await getBarcodeBase64(product.barcodeValue);
    res.status(200).json({
      success: true,
      barcodeImage: base64Barcode,
      qrCodeImage: product.qrCode,
      productName: product.code ? `${product.name} - ${isNaN(parseInt(product.code, 10)) ? product.code : parseInt(product.code, 10)}` : product.name,
      productColor: product.color || '',
      barcodeValue: product.barcodeValue,
      sellingPrice: product.sellingPrice,
      shopName: 'Deepali Creation'
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Excel Import Products
// @route   POST /api/products/import
// @access  Private
exports.importProductsExcel = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, message: 'Please upload an excel file' });
    }

    const workbook = xlsx.read(req.file.buffer, { type: 'buffer' });
    const sheetName = workbook.SheetNames[0];
    const sheet = workbook.Sheets[sheetName];
    const rows = xlsx.utils.sheet_to_json(sheet);

    // Primary Showroom
    let defaultWarehouse = await Warehouse.findOne({ name: 'Deepali Main Showroom' });
    if (!defaultWarehouse) {
      defaultWarehouse = await Warehouse.findOne();
    }
    if (!defaultWarehouse) {
      return res.status(400).json({ success: false, message: 'No warehouse found in DB. Create a warehouse first.' });
    }

    let importedCount = 0;
    let failedCount = 0;
    const reportDetails = [];

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      let {
        Code,
        Name,
        Category: catName,
        Brand: brandName,
        'Cost Price': costPriceVal,
        'Selling Price': sellingPriceVal,
        Stock,
        'Alert Quantity': alertQtyVal
      } = row;

      if (!Name || !catName || costPriceVal === undefined || sellingPriceVal === undefined) {
        failedCount++;
        reportDetails.push({ row: i + 2, status: 'Failed', reason: 'Missing Name, Category, Cost Price, or Selling Price' });
        continue;
      }

      try {
        // Resolve or create category
        let categoryObj = await Category.findOne({ name: { $regex: `^${catName.trim()}$`, $options: 'i' } });
        if (!categoryObj) {
          categoryObj = new Category({ name: catName.trim(), description: 'Auto-created via Excel Import' });
          await categoryObj.save();
        }

        // Resolve or create brand
        let brandObj = null;
        if (brandName) {
          brandObj = await Brand.findOne({ name: { $regex: `^${brandName.trim()}$`, $options: 'i' } });
          if (!brandObj) {
            brandObj = new Brand({ name: brandName.trim(), description: 'Auto-created via Excel Import' });
            await brandObj.save();
          }
        }

        // Auto-generate code if missing
        let productCode = Code ? String(Code).trim() : '';
        if (!productCode) {
          productCode = await generateNextCode('D');
        }

        // Check if code or barcode already exists
        const exists = await Product.findOne({ $or: [{ code: productCode }, { barcodeValue: productCode }] });
        if (exists) {
          failedCount++;
          reportDetails.push({ row: i + 2, code: productCode, status: 'Failed', reason: 'Product code/barcode already exists' });
          continue;
        }

        const qrCodeBase64 = await getQRCodeBase64(productCode);
        const qty = Number(Stock) || 0;

        const productData = {
          code: productCode,
          name: Name.trim(),
          category: categoryObj._id,
          brand: brandObj ? brandObj._id : null,
          costPrice: Number(costPriceVal),
          sellingPrice: Number(sellingPriceVal),
          tax: 0,
          barcodeValue: productCode,
          qrCode: qrCodeBase64,
          stockQuantity: qty,
          alertQuantity: Number(alertQtyVal) || 5,
          status: 'Active',
          warehouseStock: []
        };

        if (qty > 0) {
          productData.warehouseStock.push({
            warehouse: defaultWarehouse._id,
            quantity: qty
          });
        }

        const product = new Product(productData);
        await product.save();

        if (qty > 0) {
          const log = new InventoryLog({
            product: product._id,
            warehouse: defaultWarehouse._id,
            type: 'Stock In',
            quantity: qty,
            previousStock: 0,
            newStock: qty,
            notes: 'Excel Import stock entry',
            createdBy: req.user ? req.user.id : null
          });
          await log.save();
        }

        importedCount++;
        reportDetails.push({ row: i + 2, name: Name, code: productCode, status: 'Success' });
      } catch (err) {
        failedCount++;
        reportDetails.push({ row: i + 2, status: 'Failed', reason: err.message });
      }
    }

    await logAction(
      req.user ? req.user.id : null,
      req.user ? req.user.username : 'Admin',
      'Import Excel',
      'Bulk Products',
      `Imported: ${importedCount}, Failed: ${failedCount}`
    );

    res.status(200).json({
      success: true,
      summary: {
        totalProcessed: rows.length,
        importedCount,
        failedCount
      },
      report: reportDetails
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Bulk adjustments (Stock count edits)
// @route   POST /api/products/bulk-adjust
// @access  Private
exports.bulkStockAdjustment = async (req, res) => {
  const { adjustments } = req.body; // Array of { productId, warehouseId, adjustmentQty, type ('Adjustment' or 'Damage'), notes }

  if (!adjustments || !Array.isArray(adjustments)) {
    return res.status(400).json({ success: false, message: 'Invalid adjustments payload' });
  }

  try {
    let successCount = 0;

    for (const adj of adjustments) {
      const { productId, warehouseId, adjustmentQty, type, notes } = adj;
      const qtyChange = Number(adjustmentQty);

      if (!productId || !warehouseId || isNaN(qtyChange)) continue;

      const product = await Product.findById(productId);
      if (!product) continue;

      const stockIndex = product.warehouseStock.findIndex(
        (item) => item.warehouse.toString() === warehouseId
      );

      let prevStock = 0;
      let newStock = qtyChange;

      if (stockIndex !== -1) {
        prevStock = product.warehouseStock[stockIndex].quantity;
        product.warehouseStock[stockIndex].quantity += qtyChange;
        if (product.warehouseStock[stockIndex].quantity < 0) {
          product.warehouseStock[stockIndex].quantity = 0; // Guard against negative
        }
        newStock = product.warehouseStock[stockIndex].quantity;
      } else {
        product.warehouseStock.push({
          warehouse: warehouseId,
          quantity: Math.max(0, qtyChange)
        });
      }

      // Re-sum overall stock quantity
      product.stockQuantity = product.warehouseStock.reduce((acc, curr) => acc + curr.quantity, 0);
      await product.save();

      // Log inventory log
      const log = new InventoryLog({
        product: productId,
        warehouse: warehouseId,
        type: type || 'Adjustment',
        quantity: qtyChange,
        previousStock: prevStock,
        newStock: newStock,
        notes: notes || 'Bulk stock adjustment',
        createdBy: req.user ? req.user.id : null
      });
      await log.save();

      successCount++;
    }

    await logAction(
      req.user ? req.user.id : null,
      req.user ? req.user.username : 'Admin',
      'Stock Adjustment',
      'Multiple Products',
      `Adjusted stock for ${successCount} products`
    );

    res.status(200).json({ success: true, message: `Adjusted ${successCount} items` });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Bulk Barcode generate images return (base64)
// @route   POST /api/products/barcode-bulk
// @access  Private
exports.getBulkBarcodeImages = async (req, res) => {
  try {
    const { productIds } = req.body;
    if (!productIds || !Array.isArray(productIds)) {
      return res.status(400).json({ success: false, message: 'Invalid productIds array' });
    }

    const products = await Product.find({ _id: { $in: productIds } });
    
    const results = [];
    for (const product of products) {
      try {
        const base64Barcode = await getBarcodeBase64(product.barcodeValue, req.body.scale || 3, false);
        results.push({
          productId: product._id,
          barcodeImage: base64Barcode,
          qrCodeImage: product.qrCode,
          productName: product.code ? `${product.name} - ${isNaN(parseInt(product.code, 10)) ? product.code : parseInt(product.code, 10)}` : product.name,
          productColor: product.color || '',
          barcodeValue: product.barcodeValue,
          sellingPrice: product.sellingPrice,
          shopName: 'Deepali Creation'
        });
      } catch (err) {
        console.error(`Failed to generate barcode for product ${product.code}:`, err.message);
      }
    }

    res.status(200).json({
      success: true,
      data: results
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

