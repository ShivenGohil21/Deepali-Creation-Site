const Sale = require('../models/Sale');
const Product = require('../models/Product');
const Customer = require('../models/Customer');
const InventoryLog = require('../models/InventoryLog');
const Notification = require('../models/Notification');
const { logAction } = require('../utils/auditLogger');

exports.createSale = async (req, res) => {
  const {
    customerId,
    warehouseId,
    items, // [{ productId, price, quantity, tax, discount }]
    subTotal,
    tax,
    discount,
    grandTotal,
    paymentMethod,
    paymentDetails, // { cash, upi, card }
    amountPaid,
    changeReturned,
    description,
    date
  } = req.body;

  if (!customerId || !warehouseId || !items || items.length === 0 || grandTotal === undefined) {
    return res.status(400).json({ success: false, message: 'Invalid POS sale payload' });
  }

  try {
    // 1. Generate sequential Invoice Number by finding the highest previous number
    const lastSale = await Sale.findOne().sort({ _id: -1 });
    let nextNum = 1;
    if (lastSale && lastSale.invoiceNumber) {
      const match = lastSale.invoiceNumber.match(/\d+/);
      if (match) {
        nextNum = parseInt(match[0], 10) + 1;
      }
    }
    const invoiceNumber = `INV-${String(nextNum).padStart(6, '0')}`;

    // Validate customer and warehouse exist
    const customer = await Customer.findById(customerId);
    if (!customer) {
      return res.status(404).json({ success: false, message: 'Customer not found' });
    }

    // Process each item, deduct stock, and build the items list for Sale model
    const processedItems = [];
    
    for (const item of items) {
      const { productId, price, quantity, tax: itemTax, discount: itemDiscount } = item;
      const qty = Number(quantity);

      const product = await Product.findById(productId);
      if (!product) {
        return res.status(404).json({ success: false, message: `Product not found: ${productId}` });
      }

      // Check warehouse stock
      const stockIndex = product.warehouseStock.findIndex(
        (s) => s.warehouse.toString() === warehouseId
      );

      if (stockIndex === -1 || product.warehouseStock[stockIndex].quantity < qty) {
        return res.status(400).json({
          success: false,
          message: `Insufficient stock for product "${product.name}" in selected warehouse. Available: ${
            stockIndex !== -1 ? product.warehouseStock[stockIndex].quantity : 0
          }`
        });
      }

      // Deduct stock from specific warehouse
      const prevStock = product.warehouseStock[stockIndex].quantity;
      product.warehouseStock[stockIndex].quantity -= qty;
      const newStock = product.warehouseStock[stockIndex].quantity;

      // Re-sum total product stock
      product.stockQuantity = product.warehouseStock.reduce((acc, curr) => acc + curr.quantity, 0);
      await product.save();

      // Log Inventory Outward movement
      const log = new InventoryLog({
        product: product._id,
        warehouse: warehouseId,
        type: 'Stock Out',
        quantity: -qty,
        previousStock: prevStock,
        newStock: newStock,
        referenceId: invoiceNumber,
        notes: `POS Sale: ${invoiceNumber}`,
        createdBy: req.user ? req.user.id : null
      });
      await log.save();

      // Trigger low-stock notification if needed
      if (product.stockQuantity <= product.alertQuantity) {
        const notif = new Notification({
          message: `Low Stock Alert: Product "${product.name}" (${product.code}) has stock of ${product.stockQuantity}`,
          type: 'Low Stock'
        });
        await notif.save();
      }

      // Build sale item object
      processedItems.push({
        product: productId,
        productName: product.name,
        productCode: product.code,
        price: Number(price),
        quantity: qty,
        tax: Number(itemTax) || 0,
        discount: Number(itemDiscount) || 0,
        total: (Number(price) - (Number(itemDiscount) || 0)) * qty * (1 + (Number(itemTax) || 0) / 100)
      });
    }

    // 2. Adjust Customer outstanding balance if it was a credit sale or partial payment
    const diff = Number(grandTotal) - Number(amountPaid);
    if (diff > 0 && customer.name !== 'Walk-in Customer') {
      customer.balance += diff;
      await customer.save();
    } else if (diff < 0 && customer.name !== 'Walk-in Customer') {
      // Customer paid extra (credited to their balance)
      customer.balance += diff; // adding a negative value
      await customer.save();
    }

    // Generate date/time components for static storage
    const now = date ? new Date(date) : new Date();
    const saleDate = now.toISOString().split('T')[0];
    const saleTime = now.toTimeString().split(' ')[0].substring(0, 5); // "HH:MM"
    const saleMonth = now.toLocaleString('default', { month: 'long' });
    const saleYear = now.getFullYear();

    // 3. Create Sale Document
    const sale = new Sale({
      invoiceNumber,
      customer: customerId,
      warehouse: warehouseId,
      items: processedItems,
      subTotal: Number(subTotal),
      tax: Number(tax) || 0,
      discount: Number(discount) || 0,
      grandTotal: Number(grandTotal),
      paymentMethod,
      paymentDetails: paymentDetails || { cash: 0, upi: 0, card: 0 },
      amountPaid: Number(amountPaid),
      changeReturned: Number(changeReturned) || 0,
      createdBy: req.user ? req.user.id : null,
      saleDate,
      saleTime,
      saleMonth,
      saleYear,
      description: description || '',
      date: now
    });

    await sale.save();

    // Trigger Notification for Sales
    const saleNotif = new Notification({
      message: `POS Sale Completed: Invoice ${invoiceNumber} total of ₹${grandTotal}`,
      type: 'Sale'
    });
    await saleNotif.save();

    await logAction(
      req.user ? req.user.id : null,
      req.user ? req.user.username : 'Cashier',
      'POS Sale',
      `Invoice ${invoiceNumber}`,
      `POS checkout invoice: ₹${grandTotal}`
    );

    // Return populated sale receipt details
    const populatedSale = await Sale.findById(sale._id)
      .populate('customer')
      .populate('warehouse')
      .populate('items.product', 'name code barcodeValue unit color');

    res.status(201).json({ success: true, data: populatedSale });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
