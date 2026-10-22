const mongoose = require('mongoose');
const Purchase = require('../models/Purchase');
const Product = require('../models/Product');
const Supplier = require('../models/Supplier');
const InventoryLog = require('../models/InventoryLog');
const Notification = require('../models/Notification');
const PurchaseReturn = require('../models/PurchaseReturn');
const { logAction } = require('../utils/auditLogger');
const reconcileStocks = require('../utils/stockReconciler');

// ---- Helpers for editable product fields on purchase lines ----
// Admins can correct a product's name / code / barcode directly from a purchase
// bill. These values are written back to the Product record when the bill is
// saved.
const normalizeDetail = (value) => (
  value === undefined || value === null ? undefined : String(value).trim()
);

const applyProductDetail = (product, item) => {
  const name = normalizeDetail(item.name);
  const code = normalizeDetail(item.code);
  const barcodeValue = normalizeDetail(item.barcodeValue);
  if (name !== undefined) product.name = name;
  if (code !== undefined) product.code = code;
  if (barcodeValue !== undefined) product.barcodeValue = barcodeValue;
};

// Returns an error message when a barcode is duplicated within the request or
// already used by another product. Returns null when all barcodes are valid.
const validateBarcodeUniqueness = async (items) => {
  const seen = new Set();
  for (const item of items) {
    const barcode = normalizeDetail(item.barcodeValue);
    if (!barcode) continue;
    if (seen.has(barcode)) {
      return `Barcode "${barcode}" is entered more than once in this purchase.`;
    }
    seen.add(barcode);
    const query = { barcodeValue: barcode };
    if (item.productId) query._id = { $ne: item.productId };
    const existing = await Product.findOne(query);
    if (existing) {
      return `Barcode "${barcode}" is already used by "${existing.name || existing.code || 'another product'}".`;
    }
  }
  return null;
};

exports.getPurchases = async (req, res) => {
  try {
    const purchases = await Purchase.find()
      .populate('supplier', 'name mobile')
      .populate('warehouse', 'name')
      .populate('items.product', 'name code barcodeValue unit costPrice sellingPrice color stockQuantity')
      .sort({ date: -1 });
    res.status(200).json({ success: true, count: purchases.length, data: purchases });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.getPurchaseById = async (req, res) => {
  try {
    const purchase = await Purchase.findById(req.params.id)
      .populate('supplier')
      .populate('warehouse')
      .populate('items.product', 'name code barcodeValue unit costPrice sellingPrice color stockQuantity');

    if (!purchase) {
      return res.status(404).json({ success: false, message: 'Purchase not found' });
    }

    res.status(200).json({ success: true, data: purchase });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.createPurchase = async (req, res) => {
  const {
    supplierId,
    warehouseId,
    items, // [{ productId, costPrice, quantity }]
    subTotal,
    tax,
    discount,
    grandTotal,
    paymentStatus,
    amountPaid,
    purchaseNumber: customPurchaseNumber
  } = req.body;

  if (!supplierId || !warehouseId || !items || items.length === 0 || grandTotal === undefined) {
    return res.status(400).json({ success: false, message: 'Invalid Purchase Form: Please ensure Supplier, Warehouse, and at least one Item are selected.' });
  }

  const purchaseTotal = Number(grandTotal);
  if (!Number.isFinite(purchaseTotal) || purchaseTotal < 0) {
    return res.status(400).json({ success: false, message: 'Grand total is invalid.' });
  }

  const normalizedStatus = ['Paid', 'Partial', 'Unpaid'].includes(paymentStatus) ? paymentStatus : 'Unpaid';
  const enteredAmountPaid = amountPaid === undefined || amountPaid === null || amountPaid === ''
    ? 0
    : Number(amountPaid);
  const normalizedAmountPaid = normalizedStatus === 'Paid'
    ? purchaseTotal
    : normalizedStatus === 'Unpaid'
      ? 0
      : enteredAmountPaid;

  if (!Number.isFinite(enteredAmountPaid) || enteredAmountPaid < 0) {
    return res.status(400).json({ success: false, message: 'Amount paid must be a valid non-negative amount.' });
  }
  if (normalizedStatus === 'Partial' && normalizedAmountPaid <= 0) {
    return res.status(400).json({ success: false, message: 'Partially paid purchases must record an amount paid greater than ₹0.' });
  }
  if (normalizedAmountPaid > purchaseTotal) {
    return res.status(400).json({
      success: false,
      message: `Amount paid (₹${normalizedAmountPaid.toFixed(2)}) cannot exceed the grand total (₹${purchaseTotal.toFixed(2)}).`
    });
  }

  try {
    let finalPurchaseNumber = customPurchaseNumber ? customPurchaseNumber.trim() : '';

    if (finalPurchaseNumber) {
      // Validate uniqueness if manually provided
      const purchaseExists = await Purchase.findOne({ purchaseNumber: finalPurchaseNumber });
      if (purchaseExists) {
        return res.status(400).json({ success: false, message: `Purchase bill number "${finalPurchaseNumber}" already exists` });
      }
    } else {
      // 1. Generate sequential Purchase Number by finding the highest previous number
      const lastPurchase = await Purchase.findOne().sort({ _id: -1 });
      let nextNum = 1;
      if (lastPurchase && lastPurchase.purchaseNumber) {
        const match = lastPurchase.purchaseNumber.match(/\d+/);
        if (match) {
          nextNum = parseInt(match[0], 10) + 1;
        }
      }
      finalPurchaseNumber = `PUR-${String(nextNum).padStart(6, '0')}`;
    }

    const purchaseNumber = finalPurchaseNumber;

    // Validate or create supplier
    let supplier;
    if (mongoose.Types.ObjectId.isValid(supplierId)) {
      supplier = await Supplier.findById(supplierId);
    }
    if (!supplier && supplierId) {
      supplier = await Supplier.findOne({ name: { $regex: new RegExp(`^${supplierId.trim()}$`, 'i') } });
    }
    if (!supplier && supplierId) {
      supplier = new Supplier({
        name: supplierId.trim(),
        mobile: '0000000000',
        balance: 0
      });
      await supplier.save();
    }
    if (!supplier) {
      return res.status(400).json({ success: false, message: 'Supplier not found or specified' });
    }

    // Validate editable barcode values before touching any stock.
    const barcodeError = await validateBarcodeUniqueness(items);
    if (barcodeError) {
      return res.status(400).json({ success: false, message: barcodeError });
    }

    const processedItems = [];
    const productsToReconcile = new Set();

    // Process each purchase item
    for (const item of items) {
      const { productId, costPrice, quantity } = item;
      const qty = Number(quantity);
      const cost = Number(costPrice);

      const product = await Product.findById(productId);
      if (!product) {
        console.warn(`[Create Purchase] Product not found: ${productId}`);
        return res.status(400).json({ success: false, message: `Product not found in database: ${productId}. It may have been deleted.` });
      }

      productsToReconcile.add(product._id.toString());

      // Check or create stock index in product warehouseStock
      const stockIndex = product.warehouseStock.findIndex(
        (s) => s.warehouse.toString() === warehouseId
      );

      let prevStock = 0;
      let newStock = qty;

      if (stockIndex !== -1) {
        prevStock = product.warehouseStock[stockIndex].quantity;
        product.warehouseStock[stockIndex].quantity += qty;
        newStock = product.warehouseStock[stockIndex].quantity;
      } else {
        product.warehouseStock.push({ warehouse: warehouseId, quantity: qty });
      }

      // Update costPrice + editable product details to reflect the latest purchase
      product.costPrice = cost;
      applyProductDetail(product, item);
      product.stockQuantity = product.warehouseStock.reduce((acc, curr) => acc + curr.quantity, 0);
      await product.save();

      // Log Inventory inward movement
      const log = new InventoryLog({
        product: product._id,
        warehouse: warehouseId,
        type: 'Stock In',
        quantity: qty,
        previousStock: prevStock,
        newStock: newStock,
        referenceId: purchaseNumber,
        notes: `Purchase Restock: ${purchaseNumber}`,
        createdBy: req.user ? req.user.id : null
      });
      await log.save();

      // Build purchase item details
      processedItems.push({
        product: productId,
        costPrice: cost,
        quantity: qty,
        total: cost * qty
      });
    }

    // 2. Adjust Supplier Balance (+ represents what we owe supplier)
    const outstanding = purchaseTotal - normalizedAmountPaid;
    if (outstanding > 0) {
      supplier.balance += outstanding;
      await supplier.save();
    }

    // 3. Save Purchase transaction
    const purchase = new Purchase({
      purchaseNumber,
      supplier: supplier._id,
      warehouse: warehouseId,
      items: processedItems,
      subTotal: Number(subTotal),
      tax: Number(tax) || 0,
      discount: Number(discount) || 0,
      grandTotal: purchaseTotal,
      paymentStatus: normalizedStatus,
      amountPaid: normalizedAmountPaid,
      paymentDate: (req.body.paymentDate && req.body.paymentDate.toString().trim() !== '') ? new Date(req.body.paymentDate) : null,
      payments: req.body.payments || [],
      createdBy: req.user ? req.user.id : null,
      date: (req.body.date && req.body.date.toString().trim() !== '') ? new Date(req.body.date) : Date.now()
    });

    await purchase.save();

    for (const prodId of productsToReconcile) {
      await reconcileStocks.reconcileProductStock(prodId);
    }

    // Trigger Notification for Purchase
    const purchaseNotif = new Notification({
      message: `Purchase Inventory Added: Bill ${purchaseNumber} total of ₹${grandTotal}`,
      type: 'Purchase'
    });
    await purchaseNotif.save();

    await logAction(
      req.user ? req.user.id : null,
      req.user ? req.user.username : 'Admin',
      'Inventory Purchase',
      `Bill ${purchaseNumber}`,
      `Purchased items from supplier: ₹${grandTotal}`
    );

    res.status(201).json({ success: true, data: purchase });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.deletePurchase = async (req, res) => {
  try {
    const purchase = await Purchase.findById(req.params.id);
    if (!purchase) {
      return res.status(404).json({ success: false, message: 'Purchase not found' });
    }

    // 1. Revert warehouse stock quantities for all items
    for (const item of purchase.items) {
      const product = await Product.findById(item.product);
      if (product) {
        const stockIndex = product.warehouseStock.findIndex(
          (s) => s.warehouse.toString() === purchase.warehouse.toString()
        );

        let prevStock = 0;
        let newStock = 0;

        if (stockIndex !== -1) {
          prevStock = product.warehouseStock[stockIndex].quantity;
          product.warehouseStock[stockIndex].quantity = Math.max(0, product.warehouseStock[stockIndex].quantity - item.quantity);
          newStock = product.warehouseStock[stockIndex].quantity;
        }

        product.stockQuantity = product.warehouseStock.reduce((acc, curr) => acc + curr.quantity, 0);
        await product.save();
        await reconcileStocks.reconcileProductStock(product._id);

        // Log Stock Out reversal
        const log = new InventoryLog({
          product: product._id,
          warehouse: purchase.warehouse,
          type: 'Stock Out',
          quantity: -item.quantity,
          previousStock: prevStock,
          newStock: newStock,
          referenceId: purchase.purchaseNumber,
          notes: `Purchase Deleted Reversal: ${purchase.purchaseNumber}`,
          createdBy: req.user ? req.user.id : null
        });
        await log.save();
      }
    }

    // 2. Revert Supplier Balance
    const supplier = await Supplier.findById(purchase.supplier);
    if (supplier) {
      const outstanding = Number(purchase.grandTotal) - (Number(purchase.amountPaid) || 0);
      if (outstanding > 0) {
        supplier.balance -= outstanding;
        if (supplier.balance < 0) supplier.balance = 0;
        await supplier.save();
      }
    }

    // 3. Delete purchase
    await Purchase.deleteOne({ _id: req.params.id });

    // Log Action
    await logAction(
      req.user ? req.user.id : null,
      req.user ? req.user.username : 'Admin',
      'Delete Purchase',
      `Bill ${purchase.purchaseNumber}`,
      `Deleted purchase bill: ${purchase.purchaseNumber}`
    );

    res.status(200).json({ success: true, message: 'Purchase deleted successfully' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.updatePurchase = async (req, res) => {
  const {
    purchaseNumber,
    supplierId,
    warehouseId,
    items, // [{ productId, costPrice, quantity }]
    subTotal,
    tax,
    discount,
    grandTotal,
    paymentStatus,
    amountPaid,
    paymentDate,
    payments,
    date
  } = req.body;

  // ---- Input validation (fail fast before touching stock or ledger) ----
  if (!supplierId) {
    return res.status(400).json({ success: false, message: 'Please select a supplier.' });
  }
  if (!warehouseId) {
    return res.status(400).json({ success: false, message: 'Please select a destination warehouse.' });
  }
  if (!Array.isArray(items) || items.length === 0) {
    return res.status(400).json({ success: false, message: 'Please add at least one item to the purchase.' });
  }
  for (const it of items) {
    if (!it.productId) {
      return res.status(400).json({ success: false, message: 'Each purchase item must have a product.' });
    }
    const q = Number(it.quantity);
    const c = Number(it.costPrice);
    if (isNaN(q) || q <= 0) {
      return res.status(400).json({ success: false, message: 'Each item quantity must be greater than 0.' });
    }
    if (isNaN(c) || c < 0) {
      return res.status(400).json({ success: false, message: 'Each item cost price cannot be negative.' });
    }
  }

  const newGrandTotal = Number(grandTotal);
  if (isNaN(newGrandTotal) || newGrandTotal < 0) {
    return res.status(400).json({ success: false, message: 'Grand total is invalid.' });
  }

  const normalizedStatus = ['Paid', 'Partial', 'Unpaid'].includes(paymentStatus) ? paymentStatus : 'Unpaid';
  // Normalize amount paid according to the chosen payment status so the stored
  // value is always consistent with the displayed payment state.
  const newAmountPaid = normalizedStatus === 'Paid'
    ? newGrandTotal
    : normalizedStatus === 'Unpaid'
      ? 0
      : (Number(amountPaid) || 0);

  if (normalizedStatus === 'Partial' && newAmountPaid <= 0) {
    return res.status(400).json({ success: false, message: 'Partially paid purchases must record an amount paid greater than ₹0.' });
  }
  if (newAmountPaid > newGrandTotal) {
    return res.status(400).json({
      success: false,
      message: `Amount paid (₹${newAmountPaid.toFixed(2)}) cannot exceed the grand total (₹${newGrandTotal.toFixed(2)}).`
    });
  }

  try {
    const purchase = await Purchase.findById(req.params.id);
    if (!purchase) {
      console.error(`[Update Purchase] Purchase ID not found: ${req.params.id}`);
      return res.status(404).json({ success: false, message: `Purchase bill not found in the database. It may have been deleted.` });
    }

    // Validate purchase number uniqueness only when it actually changes.
    const finalPurchaseNumber = purchaseNumber && purchaseNumber.trim() !== ''
      ? purchaseNumber.trim()
      : purchase.purchaseNumber;
    if (finalPurchaseNumber !== purchase.purchaseNumber) {
      const purchaseExists = await Purchase.findOne({ purchaseNumber: finalPurchaseNumber });
      if (purchaseExists) {
        return res.status(400).json({ success: false, message: `Purchase number "${finalPurchaseNumber}" already exists.` });
      }
    }

    // Collect every product that could be affected (old + new items) so stock
    // reconciliation runs over the complete set.
    const productsToReconcile = new Set();
    const addProduct = (prodId) => {
      if (prodId) productsToReconcile.add(prodId.toString());
    };

    // Track old/new quantities per product for clean net stock-change logging.
    const oldQtyByProduct = {};
    if (purchase.items) {
      for (const item of purchase.items) {
        if (!item.product) continue;
        const pid = item.product.toString();
        oldQtyByProduct[pid] = (oldQtyByProduct[pid] || 0) + Number(item.quantity || 0);
        addProduct(item.product);
      }
    }

    const oldWarehouseId = purchase.warehouse ? purchase.warehouse.toString() : null;
    const newWarehouseId = warehouseId.toString();

    // ---- STEP 1: BUILD NEW ITEMS + VALIDATE ALL PRODUCTS ----
    // Validate every product BEFORE touching stock or the supplier ledger so a
    // bad item cannot leave the database in a half-updated state.
    const processedItems = [];
    const newQtyByProduct = {};
    const productCache = new Map();

    // Validate editable barcode values before touching stock or the ledger.
    const barcodeError = await validateBarcodeUniqueness(items);
    if (barcodeError) {
      return res.status(400).json({ success: false, message: barcodeError });
    }

    for (const item of items) {
      const { productId, costPrice, quantity } = item;
      const qty = Number(quantity);
      const cost = Number(costPrice);

      const product = await Product.findById(productId);
      if (!product) {
        return res.status(400).json({
          success: false,
          message: `Product not found in database: ${productId}. It may have been deleted.`
        });
      }
      productCache.set(productId.toString(), product);

      processedItems.push({
        product: productId,
        costPrice: cost,
        quantity: qty,
        total: cost * qty
      });

      const pid = productId.toString();
      newQtyByProduct[pid] = (newQtyByProduct[pid] || 0) + qty;
      addProduct(productId);
    }

    // ---- STEP 2: REVERT OLD SUPPLIER BALANCE ----
    // This must happen BEFORE resolving the new supplier so that, when the
    // supplier is unchanged, the freshly-read supplier document already reflects
    // the reverted balance (avoids a stale in-memory overwrite).
    const oldSupplier = await Supplier.findById(purchase.supplier);
    if (oldSupplier) {
      const oldOutstanding = Number(purchase.grandTotal) - (Number(purchase.amountPaid) || 0);
      if (oldOutstanding > 0) {
        oldSupplier.balance = Math.max(0, (oldSupplier.balance || 0) - oldOutstanding);
        await oldSupplier.save();
      }
    }

    // ---- STEP 3: RESOLVE (OR CREATE) NEW SUPPLIER ----
    let supplier = null;
    if (mongoose.Types.ObjectId.isValid(supplierId)) {
      supplier = await Supplier.findById(supplierId);
    }
    if (!supplier && supplierId) {
      supplier = await Supplier.findOne({ name: { $regex: new RegExp(`^${String(supplierId).trim()}$`, 'i') } });
    }
    if (!supplier && supplierId) {
      supplier = new Supplier({
        name: String(supplierId).trim(),
        mobile: '0000000000',
        balance: 0
      });
      await supplier.save();
    }
    if (!supplier) {
      return res.status(400).json({ success: false, message: 'Supplier not found or specified.' });
    }

    // ---- STEP 4: APPLY NEW SUPPLIER BALANCE ----
    const newOutstanding = newGrandTotal - newAmountPaid;
    if (newOutstanding > 0) {
      supplier.balance = (supplier.balance || 0) + newOutstanding;
      await supplier.save();
    }

    // ---- STEP 5: SYNC PRODUCT DETAILS ----
    // Keep each product's cost price and editable fields (name / code / barcode)
    // in sync with the values entered on the purchase bill.
    for (const item of items) {
      const product = productCache.get(item.productId.toString());
      if (product) {
        product.costPrice = Number(item.costPrice);
        applyProductDetail(product, item);
        await product.save();
      }
    }

    // ---- STEP 6: PERSIST THE PURCHASE ----
    purchase.purchaseNumber = finalPurchaseNumber;
    purchase.supplier = supplier._id;
    purchase.warehouse = newWarehouseId;
    purchase.items = processedItems;
    purchase.subTotal = Number(subTotal) || 0;
    purchase.tax = Number(tax) || 0;
    purchase.discount = Number(discount) || 0;
    purchase.grandTotal = newGrandTotal;
    purchase.paymentStatus = normalizedStatus;
    purchase.amountPaid = newAmountPaid;
    purchase.paymentDate = (paymentDate && paymentDate.toString().trim() !== '') ? new Date(paymentDate) : null;
    // Preserve the existing payment history unless a new list is explicitly supplied.
    if (Array.isArray(payments)) {
      purchase.payments = payments;
    }
    if (date && date.toString().trim() !== '') {
      purchase.date = new Date(date);
    }

    await purchase.save();

    // ---- STEP 7: RECONCILE STOCK FROM SOURCE DOCUMENTS ----
    // reconcileProductStock recomputes each product's warehouse stock from all
    // purchases, sales, returns and adjustments. This is the single source of
    // truth and guarantees no duplicated or missing stock entries.
    for (const prodId of productsToReconcile) {
      await reconcileStocks.reconcileProductStock(prodId);
    }

    // ---- STEP 8: AUDIT THE NET STOCK MOVEMENT PER PRODUCT/WAREHOUSE ----
    // A single net log entry is written per product/warehouse so repeated edits
    // do not create misleading duplicate "Stock In" records.
    const affectedProducts = new Set([
      ...Object.keys(oldQtyByProduct),
      ...Object.keys(newQtyByProduct)
    ]);

    for (const pid of affectedProducts) {
      const product = await Product.findById(pid);
      if (!product) continue;

      const readQty = async (whId) => {
        if (!whId) return 0;
        const entry = product.warehouseStock.find((s) => s.warehouse && s.warehouse.toString() === whId);
        return entry ? Number(entry.quantity || 0) : 0;
      };

      const logEntry = async (whId, delta, notes) => {
        if (!whId || delta === 0) return;
        // Reconciliation already produced the final stock, so derive the
        // pre-change value from the final stock and the net movement.
        const newStock = await readQty(whId);
        const previousStock = Math.max(0, newStock - delta);
        const log = new InventoryLog({
          product: product._id,
          warehouse: whId,
          type: delta > 0 ? 'Stock In' : 'Stock Out',
          quantity: delta,
          previousStock,
          newStock,
          referenceId: finalPurchaseNumber,
          notes,
          createdBy: req.user ? req.user.id : null
        });
        await log.save();
      };

      const oldQty = oldQtyByProduct[pid] || 0;
      const newQty = newQtyByProduct[pid] || 0;

      if (oldWarehouseId && oldWarehouseId !== newWarehouseId) {
        // Warehouse changed: remove old qty from old warehouse, add new qty to new warehouse.
        await logEntry(oldWarehouseId, -oldQty, `Purchase Edited (warehouse changed): ${finalPurchaseNumber}`);
        await logEntry(newWarehouseId, newQty, `Purchase Edited (warehouse changed): ${finalPurchaseNumber}`);
      } else {
        // Same warehouse (or no prior warehouse): log the net difference only.
        await logEntry(newWarehouseId, newQty - oldQty, `Purchase Edited: ${finalPurchaseNumber}`);
      }
    }

    await logAction(
      req.user ? req.user.id : null,
      req.user ? req.user.username : 'Admin',
      'Update Purchase',
      `Bill ${purchase.purchaseNumber}`,
      `Updated purchase bill: ${purchase.purchaseNumber} (items: ${processedItems.length}, grand total: ₹${newGrandTotal.toFixed(2)})`
    );

    res.status(200).json({ success: true, data: purchase });
  } catch (error) {
    console.error('[Update Purchase] Error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.returnPurchase = async (req, res) => {
  const { purchaseId, returnedItems } = req.body; // returnedItems = [{ productId, quantity }]

  if (!purchaseId || !returnedItems || returnedItems.length === 0) {
    return res.status(400).json({ success: false, message: 'Invalid return payload' });
  }

  try {
    const purchase = await Purchase.findById(purchaseId);
    if (!purchase) {
      return res.status(404).json({ success: false, message: 'Purchase not found' });
    }

    const supplier = await Supplier.findById(purchase.supplier);
    const warehouseId = purchase.warehouse;

    let totalReturnVal = 0;
    const processedReturnItems = [];

    for (const retItem of returnedItems) {
      const { productId, quantity } = retItem;
      const qty = Number(quantity);

      if (!productId || isNaN(qty) || qty <= 0) continue;

      const origItem = purchase.items.find(
        (it) => it.product.toString() === productId
      );

      if (!origItem) {
        return res.status(400).json({ success: false, message: `Product ${productId} was not part of this purchase` });
      }

      if (qty > origItem.quantity) {
        return res.status(400).json({
          success: false,
          message: `Cannot return more than the purchased quantity of ${qty}. Purchased: ${origItem.quantity}`
        });
      }

      // Deduct stock from warehouse (reverse the restock)
      const product = await Product.findById(productId);
      if (!product) continue;

      const stockIndex = product.warehouseStock.findIndex(
        (s) => s.warehouse.toString() === warehouseId.toString()
      );

      let prevStock = 0;
      let newStock = 0;

      if (stockIndex !== -1) {
        prevStock = product.warehouseStock[stockIndex].quantity;
        product.warehouseStock[stockIndex].quantity -= qty;
        if (product.warehouseStock[stockIndex].quantity < 0) {
          product.warehouseStock[stockIndex].quantity = 0;
        }
        newStock = product.warehouseStock[stockIndex].quantity;
      }

      product.stockQuantity = product.warehouseStock.reduce((acc, curr) => acc + curr.quantity, 0);
      await product.save();

      // Log Stock Out reversal
      const log = new InventoryLog({
        product: product._id,
        warehouse: warehouseId,
        type: 'Stock Out',
        quantity: -qty,
        previousStock: prevStock,
        newStock: newStock,
        referenceId: purchase.purchaseNumber,
        notes: `Supplier Return: ${purchase.purchaseNumber}`,
        createdBy: req.user ? req.user.id : null
      });
      await log.save();

      processedReturnItems.push({
        product: productId,
        name: product.name,
        code: product.code,
        costPrice: origItem.costPrice,
        quantity: qty,
        total: origItem.costPrice * qty
      });

      totalReturnVal += origItem.costPrice * qty;
    }

    // Generate Return Number by finding the highest previous number
    const lastReturn = await PurchaseReturn.findOne().sort({ _id: -1 });
    let nextReturnNum = 1;
    if (lastReturn && lastReturn.returnNumber) {
      const match = lastReturn.returnNumber.match(/\d+/);
      if (match) {
        nextReturnNum = parseInt(match[0], 10) + 1;
      }
    }
    const returnNumber = `PR-${String(nextReturnNum).padStart(6, '0')}`;

    // Adjust supplier balance ledger (since we returned products, our outstanding balance drops)
    if (supplier && purchase.amountPaid < purchase.grandTotal) {
      supplier.balance -= totalReturnVal;
      if (supplier.balance < 0) supplier.balance = 0;
      await supplier.save();
    }

    // Save Return Document
    const purchaseReturn = new PurchaseReturn({
      returnNumber,
      purchase: purchase._id,
      purchaseNumber: purchase.purchaseNumber,
      supplier: purchase.supplier,
      warehouse: purchase.warehouse,
      items: processedReturnItems,
      grandTotal: totalReturnVal,
      createdBy: req.user ? req.user.id : null
    });
    await purchaseReturn.save();

    await logAction(
      req.user ? req.user.id : null,
      req.user ? req.user.username : 'Admin',
      'Return Purchase',
      `Return ${returnNumber}`,
      `Returned restocked items, processed return of: ₹${totalReturnVal}`
    );

    res.status(200).json({ success: true, message: 'Purchase return processed successfully', data: purchaseReturn });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.getPurchaseReturns = async (req, res) => {
  try {
    const returns = await PurchaseReturn.find()
      .populate('supplier', 'name mobile')
      .populate('warehouse', 'name')
      .populate('items.product', 'name code barcodeValue unit costPrice')
      .sort({ date: -1 });
    res.status(200).json({ success: true, count: returns.length, data: returns });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.deletePurchaseReturn = async (req, res) => {
  try {
    const ret = await PurchaseReturn.findById(req.params.id);
    if (!ret) {
      return res.status(404).json({ success: false, message: 'Return record not found' });
    }

    const warehouseId = ret.warehouse;

    // Revert stock (add back the returned quantities)
    for (const item of ret.items) {
      const product = await Product.findById(item.product);
      if (product) {
        const stockIndex = product.warehouseStock.findIndex(
          (s) => s.warehouse.toString() === warehouseId.toString()
        );

        let prevStock = 0;
        let newStock = item.quantity;

        if (stockIndex !== -1) {
          prevStock = product.warehouseStock[stockIndex].quantity;
          product.warehouseStock[stockIndex].quantity += item.quantity;
          newStock = product.warehouseStock[stockIndex].quantity;
        } else {
          product.warehouseStock.push({ warehouse: warehouseId, quantity: item.quantity });
        }

        product.stockQuantity = product.warehouseStock.reduce((acc, curr) => acc + curr.quantity, 0);
        await product.save();

        // Log Stock In reversal
        const log = new InventoryLog({
          product: product._id,
          warehouse: warehouseId,
          type: 'Stock In',
          quantity: item.quantity,
          previousStock: prevStock,
          newStock: newStock,
          referenceId: ret.returnNumber,
          notes: `Purchase Return Deleted: Reverted ${ret.returnNumber}`,
          createdBy: req.user ? req.user.id : null
        });
        await log.save();
      }
    }

    // Restore Supplier Outstanding Balance
    const supplier = await Supplier.findById(ret.supplier);
    if (supplier) {
      const originalPurchase = await Purchase.findById(ret.purchase);
      if (originalPurchase && originalPurchase.amountPaid < originalPurchase.grandTotal) {
        supplier.balance += ret.grandTotal;
        await supplier.save();
      }
    }

    await PurchaseReturn.deleteOne({ _id: req.params.id });

    await logAction(
      req.user ? req.user.id : null,
      req.user ? req.user.username : 'Admin',
      'Delete Purchase Return',
      `Return ${ret.returnNumber}`,
      `Deleted purchase return record, restored items to stock: ${ret.returnNumber}`
    );

    res.status(200).json({ success: true, message: 'Return record deleted and stock restored successfully' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
