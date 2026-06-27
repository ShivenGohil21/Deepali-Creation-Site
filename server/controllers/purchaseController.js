const mongoose = require('mongoose');
const Purchase = require('../models/Purchase');
const Product = require('../models/Product');
const Supplier = require('../models/Supplier');
const InventoryLog = require('../models/InventoryLog');
const Notification = require('../models/Notification');
const PurchaseReturn = require('../models/PurchaseReturn');
const { logAction } = require('../utils/auditLogger');

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
    return res.status(400).json({ success: false, message: 'Invalid Purchase payload' });
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

    const processedItems = [];

    // Process each purchase item
    for (const item of items) {
      const { productId, costPrice, quantity } = item;
      const qty = Number(quantity);
      const cost = Number(costPrice);

      const product = await Product.findById(productId);
      if (!product) {
        return res.status(404).json({ success: false, message: `Product not found: ${productId}` });
      }

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

      // Update costPrice in product to reflect latest purchase price
      product.costPrice = cost;
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
    const outstanding = Number(grandTotal) - (Number(amountPaid) || 0);
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
      grandTotal: Number(grandTotal),
      paymentStatus: paymentStatus || 'Unpaid',
      amountPaid: Number(amountPaid) || 0,
      paymentDate: req.body.paymentDate ? new Date(req.body.paymentDate) : null,
      createdBy: req.user ? req.user.id : null,
      date: req.body.date ? new Date(req.body.date) : Date.now()
    });

    await purchase.save();

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
          product.warehouseStock[stockIndex].quantity -= item.quantity;
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
    date
  } = req.body;

  try {
    const purchase = await Purchase.findById(req.params.id);
    if (!purchase) {
      return res.status(404).json({ success: false, message: 'Purchase not found' });
    }

    // Check if updating purchaseNumber and verify uniqueness
    if (purchaseNumber && purchaseNumber !== purchase.purchaseNumber) {
      const purchaseExists = await Purchase.findOne({ purchaseNumber });
      if (purchaseExists) {
        return res.status(400).json({ success: false, message: `Purchase number "${purchaseNumber}" already exists` });
      }
      purchase.purchaseNumber = purchaseNumber;
    }

    // --- STEP 1: REVERT OLD VALUES ---
    // Revert old warehouse stock
    for (const item of purchase.items) {
      const product = await Product.findById(item.product);
      if (product) {
        const stockIndex = product.warehouseStock.findIndex(
          (s) => s.warehouse.toString() === purchase.warehouse.toString()
        );
        if (stockIndex !== -1) {
          product.warehouseStock[stockIndex].quantity -= item.quantity;
          if (product.warehouseStock[stockIndex].quantity < 0) product.warehouseStock[stockIndex].quantity = 0;
          product.stockQuantity = product.warehouseStock.reduce((acc, curr) => acc + curr.quantity, 0);
          await product.save();
        }
      }
    }

    // Revert old Supplier Balance
    const oldSupplier = await Supplier.findById(purchase.supplier);
    if (oldSupplier) {
      const oldOutstanding = Number(purchase.grandTotal) - (Number(purchase.amountPaid) || 0);
      if (oldOutstanding > 0) {
        oldSupplier.balance -= oldOutstanding;
        if (oldSupplier.balance < 0) oldSupplier.balance = 0;
        await oldSupplier.save();
      }
    }

    // --- STEP 2: APPLY NEW VALUES ---
    const processedItems = [];

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

    for (const item of items) {
      const { productId, costPrice, quantity } = item;
      const qty = Number(quantity);
      const cost = Number(costPrice);

      const product = await Product.findById(productId);
      if (!product) {
        return res.status(404).json({ success: false, message: `Product not found: ${productId}` });
      }

      // Add to new warehouse
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

      product.costPrice = cost;
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
        referenceId: purchase.purchaseNumber,
        notes: `Purchase Updated: ${purchase.purchaseNumber}`,
        createdBy: req.user ? req.user.id : null
      });
      await log.save();

      processedItems.push({
        product: productId,
        costPrice: cost,
        quantity: qty,
        total: cost * qty
      });
    }

    // Adjust supplier balance with new outstanding
    const outstanding = Number(grandTotal) - (Number(amountPaid) || 0);
    if (outstanding > 0) {
      supplier.balance += outstanding;
      await supplier.save();
    }

    // Update Purchase object
    purchase.supplier = supplier._id;
    purchase.warehouse = warehouseId;
    purchase.items = processedItems;
    purchase.subTotal = Number(subTotal);
    purchase.tax = Number(tax) || 0;
    purchase.discount = Number(discount) || 0;
    purchase.grandTotal = Number(grandTotal);
    purchase.paymentStatus = paymentStatus || 'Unpaid';
    purchase.amountPaid = Number(amountPaid) || 0;
    purchase.paymentDate = req.body.paymentDate ? new Date(req.body.paymentDate) : null;
    if (date) {
      purchase.date = new Date(date);
    }

    await purchase.save();

    await logAction(
      req.user ? req.user.id : null,
      req.user ? req.user.username : 'Admin',
      'Update Purchase',
      `Bill ${purchase.purchaseNumber}`,
      `Updated purchase bill: ${purchase.purchaseNumber}`
    );

    res.status(200).json({ success: true, data: purchase });
  } catch (error) {
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
