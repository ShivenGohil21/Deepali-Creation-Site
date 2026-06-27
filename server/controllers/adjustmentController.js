const Adjustment = require('../models/Adjustment');
const Product = require('../models/Product');
const Warehouse = require('../models/Warehouse');
const InventoryLog = require('../models/InventoryLog');
const Notification = require('../models/Notification');
const bwipjs = require('bwip-js');
const QRCode = require('qrcode');
const { logAction } = require('../utils/auditLogger');

// Helper: Generate Barcode Base64
const getBarcodeBase64 = async (text) => {
  return new Promise((resolve, reject) => {
    bwipjs.toBuffer(
      {
        bcid: 'code128',
        text: text,
        scale: 3,
        height: 16,
        includetext: true,
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

// Helper: Generate reference number
const generateReferenceNo = async () => {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const count = await Adjustment.countDocuments();
  const nextNum = String(count + 1).padStart(4, '0');
  return `${year}/${month}/${nextNum}`;
};

// @desc    Get all adjustments
// @route   GET /api/adjustments
// @access  Private
exports.getAdjustments = async (req, res) => {
  try {
    const { warehouse, search } = req.query;
    let query = {};

    if (warehouse) {
      query.warehouse = warehouse;
    }

    if (search) {
      query.referenceNo = { $regex: search, $options: 'i' };
    }

    const adjustments = await Adjustment.find(query)
      .populate('warehouse', 'name')
      .populate('createdBy', 'name username')
      .populate('items.product', 'name code barcodeValue unit')
      .sort({ date: -1 });

    res.status(200).json({ success: true, count: adjustments.length, data: adjustments });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Get adjustment by ID
// @route   GET /api/adjustments/:id
// @access  Private
exports.getAdjustmentById = async (req, res) => {
  try {
    const adjustment = await Adjustment.findById(req.params.id)
      .populate('warehouse')
      .populate('createdBy', 'name username')
      .populate('items.product', 'name code unit costPrice sellingPrice color barcodeValue');

    if (!adjustment) {
      return res.status(404).json({ success: false, message: 'Adjustment not found' });
    }

    res.status(200).json({ success: true, data: adjustment });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Create quantity adjustment
// @route   POST /api/adjustments
// @access  Private
exports.createAdjustment = async (req, res) => {
  const { warehouseId, items, notes, date } = req.body; // items: [{ productId, type ('Addition' or 'Subtraction'), quantity, price }]

  if (!warehouseId || !items || !Array.isArray(items) || items.length === 0) {
    return res.status(400).json({ success: false, message: 'Warehouse and items are required' });
  }

  try {
    // Verify warehouse exists
    const warehouseObj = await Warehouse.findById(warehouseId);
    if (!warehouseObj) {
      return res.status(404).json({ success: false, message: 'Warehouse not found' });
    }

    const referenceNo = await generateReferenceNo();
    const processedItems = [];
    let totalAmount = 0;

    for (const item of items) {
      const { productId, type, quantity, price } = item;
      const qty = Number(quantity);
      const itemPrice = Number(price);

      if (!productId || !type || isNaN(qty) || qty <= 0 || isNaN(itemPrice) || itemPrice < 0) {
        return res.status(400).json({ success: false, message: 'Invalid item data (quantity and price must be valid positive numbers)' });
      }

      if (type !== 'Addition' && type !== 'Subtraction') {
        return res.status(400).json({ success: false, message: 'Adjustment type must be Addition or Subtraction' });
      }

      const product = await Product.findById(productId);
      if (!product) {
        return res.status(404).json({ success: false, message: `Product not found: ${productId}` });
      }

      const stockIndex = product.warehouseStock.findIndex(
        (s) => s.warehouse.toString() === warehouseId
      );

      let prevStock = 0;
      let newStock = 0;
      const qtyChange = type === 'Addition' ? qty : -qty;

      if (stockIndex !== -1) {
        prevStock = product.warehouseStock[stockIndex].quantity;
        product.warehouseStock[stockIndex].quantity += qtyChange;
        if (product.warehouseStock[stockIndex].quantity < 0) {
          // If we try to subtract more than available, guard or set to 0?
          // Let's guard against negative stock if Subtraction
          if (type === 'Subtraction') {
            return res.status(400).json({
              success: false,
              message: `Insufficient stock for product "${product.name}" in ${warehouseObj.name}. Available: ${prevStock}`
            });
          }
          product.warehouseStock[stockIndex].quantity = 0;
        }
        newStock = product.warehouseStock[stockIndex].quantity;
      } else {
        if (type === 'Subtraction') {
          return res.status(400).json({
            success: false,
            message: `Insufficient stock for product "${product.name}" in ${warehouseObj.name}. Available: 0`
          });
        }
        product.warehouseStock.push({ warehouse: warehouseId, quantity: qty });
        newStock = qty;
      }

      // Recalculate total product stock quantity
      product.stockQuantity = product.warehouseStock.reduce((acc, curr) => acc + curr.quantity, 0);
      await product.save();

      // Log Inventory Log
      const inventoryLog = new InventoryLog({
        product: productId,
        warehouse: warehouseId,
        type: 'Adjustment',
        quantity: qtyChange,
        previousStock: prevStock,
        newStock: newStock,
        referenceId: referenceNo,
        notes: notes || `Stock Adjustment: ${referenceNo}`,
        createdBy: req.user ? req.user.id : null
      });
      await inventoryLog.save();

      // Trigger low-stock notification if needed
      if (product.stockQuantity <= product.alertQuantity) {
        const notif = new Notification({
          message: `Low Stock Alert (from Adjustment): Product "${product.name}" (${product.code}) has stock of ${product.stockQuantity}`,
          type: 'Low Stock'
        });
        await notif.save();
      }

      const itemTotal = qty * itemPrice;
      totalAmount += itemTotal;

      processedItems.push({
        product: productId,
        type,
        quantity: qty,
        price: itemPrice,
        total: itemTotal
      });
    }

    const adjustment = new Adjustment({
      referenceNo,
      warehouse: warehouseId,
      items: processedItems,
      totalAmount,
      notes: notes || '',
      createdBy: req.user ? req.user.id : null,
      date: date ? new Date(date) : Date.now()
    });

    await adjustment.save();

    await logAction(
      req.user ? req.user.id : null,
      req.user ? req.user.username : 'Admin',
      'Stock Adjustment',
      'Multiple Products',
      `Created adjustment ${referenceNo} with ${processedItems.length} items`
    );

    res.status(201).json({ success: true, data: adjustment });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Get barcode / QR image for adjustment reference
// @route   GET /api/adjustments/barcode/:id
// @access  Private
exports.getAdjustmentBarcodeImage = async (req, res) => {
  try {
    const adjustment = await Adjustment.findById(req.params.id);
    if (!adjustment) {
      return res.status(404).json({ success: false, message: 'Adjustment not found' });
    }

    const barcodeImage = await getBarcodeBase64(adjustment.referenceNo);
    const qrCodeImage = await getQRCodeBase64(adjustment.referenceNo);

    res.status(200).json({
      success: true,
      barcodeImage,
      qrCodeImage,
      referenceNo: adjustment.referenceNo,
      date: adjustment.date,
      shopName: 'Deepali Creation'
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
