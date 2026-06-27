const Sale = require('../models/Sale');
const Product = require('../models/Product');
const Customer = require('../models/Customer');
const InventoryLog = require('../models/InventoryLog');
const SaleReturn = require('../models/SaleReturn');
const { logAction } = require('../utils/auditLogger');

// @desc    Get all sales
// @route   GET /api/sales
// @access  Private
exports.getSales = async (req, res) => {
  try {
    const sales = await Sale.find()
      .populate('customer', 'name mobile')
      .populate('warehouse', 'name')
      .sort({ date: -1 });
    res.status(200).json({ success: true, count: sales.length, data: sales });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Get sale by ID
// @route   GET /api/sales/:id
// @access  Private
exports.getSaleById = async (req, res) => {
  try {
    const sale = await Sale.findById(req.params.id)
      .populate('customer')
      .populate('warehouse')
      .populate('items.product', 'name code barcodeValue unit sellingPrice');

    if (!sale) {
      return res.status(404).json({ success: false, message: 'Sale invoice not found' });
    }

    res.status(200).json({ success: true, data: sale });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Process refund / returns
// @route   POST /api/sales/refund
// @access  Private
exports.refundSale = async (req, res) => {
  const { saleId, returnedItems } = req.body; // returnedItems = [{ productId, quantity }]

  if (!saleId || !returnedItems || returnedItems.length === 0) {
    return res.status(400).json({ success: false, message: 'Invalid return payload' });
  }

  try {
    const sale = await Sale.findById(saleId);
    if (!sale) {
      return res.status(404).json({ success: false, message: 'Invoice not found' });
    }

    const customer = await Customer.findById(sale.customer);
    const warehouseId = sale.warehouse;

    let totalRefundAmount = 0;
    const processedReturnItems = [];

    for (const retItem of returnedItems) {
      const { productId, quantity } = retItem;
      const qty = Number(quantity);

      if (!productId || isNaN(qty) || qty <= 0) continue;

      const origItem = sale.items.find(
        (it) => it.product.toString() === productId
      );

      if (!origItem) {
        return res.status(400).json({ success: false, message: `Item ${productId} was not part of this sale` });
      }

      if (qty > origItem.quantity) {
        return res.status(400).json({
          success: false,
          message: `Cannot refund more than the purchased quantity of ${qty}. Purchased: ${origItem.quantity}`
        });
      }

      // 1. Return stock to warehouse
      const product = await Product.findById(productId);
      if (!product) continue;

      const stockIndex = product.warehouseStock.findIndex(
        (s) => s.warehouse.toString() === warehouseId.toString()
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

      product.stockQuantity = product.warehouseStock.reduce((acc, curr) => acc + curr.quantity, 0);
      await product.save();

      // Log stock return
      const log = new InventoryLog({
        product: product._id,
        warehouse: warehouseId,
        type: 'Stock In',
        quantity: qty,
        previousStock: prevStock,
        newStock: newStock,
        referenceId: sale.invoiceNumber,
        notes: `Customer Return: ${sale.invoiceNumber}`,
        createdBy: req.user ? req.user.id : null
      });
      await log.save();

      // Deduct quantity from original sale invoice items
      origItem.quantity -= qty;
      const refundedLineTotal = (origItem.price - (origItem.discount || 0)) * qty * (1 + (origItem.tax || 0) / 100);
      origItem.total -= refundedLineTotal;

      processedReturnItems.push({
        product: productId,
        name: product.name,
        code: product.code,
        price: origItem.price,
        quantity: qty,
        total: refundedLineTotal
      });

      totalRefundAmount += refundedLineTotal;
    }

    // Recalculate invoice totals
    sale.grandTotal -= totalRefundAmount;
    if (sale.grandTotal < 0) sale.grandTotal = 0;

    // Adjust customer balance if credit sale
    if (customer && customer.name !== 'Walk-in Customer' && sale.amountPaid < sale.grandTotal + totalRefundAmount) {
      customer.balance -= totalRefundAmount;
      if (customer.balance < 0) customer.balance = 0;
      await customer.save();
    }

    await sale.save();

    // Create SaleReturn Document by finding the highest previous number
    const lastReturn = await SaleReturn.findOne().sort({ _id: -1 });
    let nextReturnNum = 1;
    if (lastReturn && lastReturn.returnNumber) {
      const match = lastReturn.returnNumber.match(/\d+/);
      if (match) {
        nextReturnNum = parseInt(match[0], 10) + 1;
      }
    }
    const returnNumber = `SR-${String(nextReturnNum).padStart(6, '0')}`;

    const saleReturn = new SaleReturn({
      returnNumber,
      sale: sale._id,
      invoiceNumber: sale.invoiceNumber,
      customer: sale.customer,
      warehouse: sale.warehouse,
      items: processedReturnItems,
      grandTotal: totalRefundAmount,
      createdBy: req.user ? req.user.id : null
    });
    await saleReturn.save();

    await logAction(
      req.user ? req.user.id : null,
      req.user ? req.user.username : 'Admin',
      'Refund Sale',
      `Return ${returnNumber}`,
      `Returned items, processed refund of: ₹${totalRefundAmount}`
    );

    res.status(200).json({ success: true, message: 'Refund processed successfully', refundAmount: totalRefundAmount, data: saleReturn });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.deleteSale = async (req, res) => {
  try {
    const sale = await Sale.findById(req.params.id);
    if (!sale) {
      return res.status(404).json({ success: false, message: 'Sale invoice not found' });
    }

    const warehouseId = sale.warehouse;

    // 1. Revert warehouse stock quantities for all items
    for (const item of sale.items) {
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
          referenceId: sale.invoiceNumber,
          notes: `Sale Deleted Reversal: ${sale.invoiceNumber}`,
          createdBy: req.user ? req.user.id : null
        });
        await log.save();
      }
    }

    // 2. Revert Customer Outstanding Balance
    const customer = await Customer.findById(sale.customer);
    if (customer && customer.name !== 'Walk-in Customer') {
      const outstanding = Number(sale.grandTotal) - (Number(sale.amountPaid) || 0);
      if (outstanding > 0) {
        customer.balance -= outstanding;
        if (customer.balance < 0) customer.balance = 0;
        await customer.save();
      }
    }

    // 3. Delete sale
    await Sale.deleteOne({ _id: req.params.id });

    // Log Action
    await logAction(
      req.user ? req.user.id : null,
      req.user ? req.user.username : 'Admin',
      'Delete Sale',
      `Invoice ${sale.invoiceNumber}`,
      `Deleted sale invoice: ${sale.invoiceNumber}`
    );

    res.status(200).json({ success: true, message: 'Sale invoice deleted successfully' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.getSaleReturns = async (req, res) => {
  try {
    const returns = await SaleReturn.find()
      .populate('customer', 'name mobile')
      .populate('warehouse', 'name')
      .populate('items.product', 'name code barcodeValue unit sellingPrice')
      .sort({ date: -1 });
    res.status(200).json({ success: true, count: returns.length, data: returns });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.deleteSaleReturn = async (req, res) => {
  try {
    const ret = await SaleReturn.findById(req.params.id);
    if (!ret) {
      return res.status(404).json({ success: false, message: 'Return record not found' });
    }

    const warehouseId = ret.warehouse;

    // Revert stock (take back returned quantities from warehouse)
    for (const item of ret.items) {
      const product = await Product.findById(item.product);
      if (product) {
        const stockIndex = product.warehouseStock.findIndex(
          (s) => s.warehouse.toString() === warehouseId.toString()
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
          warehouse: warehouseId,
          type: 'Stock Out',
          quantity: -item.quantity,
          previousStock: prevStock,
          newStock: newStock,
          referenceId: ret.returnNumber,
          notes: `Sales Return Deleted: Reverted ${ret.returnNumber}`,
          createdBy: req.user ? req.user.id : null
        });
        await log.save();
      }
    }

    // Restore Customer Outstanding Balance
    const customer = await Customer.findById(ret.customer);
    if (customer && customer.name !== 'Walk-in Customer') {
      const originalSale = await Sale.findById(ret.sale);
      if (originalSale && originalSale.amountPaid < originalSale.grandTotal) {
        customer.balance += ret.grandTotal;
        await customer.save();
      }
    }

    await SaleReturn.deleteOne({ _id: req.params.id });

    await logAction(
      req.user ? req.user.id : null,
      req.user ? req.user.username : 'Admin',
      'Delete Sales Return',
      `Return ${ret.returnNumber}`,
      `Deleted sales return record, reverted stock: ${ret.returnNumber}`
    );

    res.status(200).json({ success: true, message: 'Return record deleted and stock restored successfully' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.updateSale = async (req, res) => {
  const {
    customerId,
    warehouseId,
    items, // [{ productId, price, quantity, tax, discount }]
    subTotal,
    tax,
    discount,
    grandTotal,
    paymentMethod,
    paymentDetails,
    amountPaid,
    changeReturned,
    description,
    date
  } = req.body;

  try {
    const sale = await Sale.findById(req.params.id);
    if (!sale) {
      return res.status(404).json({ success: false, message: 'Sale invoice not found' });
    }

    // --- STEP 1: REVERT OLD VALUES ---
    // Revert old warehouse stock
    for (const item of sale.items) {
      const product = await Product.findById(item.product);
      if (product) {
        const stockIndex = product.warehouseStock.findIndex(
          (s) => s.warehouse.toString() === sale.warehouse.toString()
        );
        if (stockIndex !== -1) {
          product.warehouseStock[stockIndex].quantity += item.quantity;
          product.stockQuantity = product.warehouseStock.reduce((acc, curr) => acc + curr.quantity, 0);
          await product.save();
        }
      }
    }

    // Revert old Customer Balance
    const oldCustomer = await Customer.findById(sale.customer);
    if (oldCustomer && oldCustomer.name !== 'Walk-in Customer') {
      const oldOutstanding = Number(sale.grandTotal) - Number(sale.amountPaid);
      if (oldOutstanding > 0) {
        oldCustomer.balance -= oldOutstanding;
      } else if (oldOutstanding < 0) {
        oldCustomer.balance -= oldOutstanding;
      }
      if (oldCustomer.balance < 0) oldCustomer.balance = 0;
      await oldCustomer.save();
    }

    // --- STEP 2: APPLY NEW VALUES ---
    const processedItems = [];

    // Validate customer
    const customer = await Customer.findById(customerId);
    if (!customer) {
      return res.status(400).json({ success: false, message: 'Customer not found' });
    }

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

      const prevStock = product.warehouseStock[stockIndex].quantity;
      product.warehouseStock[stockIndex].quantity -= qty;
      const newStock = product.warehouseStock[stockIndex].quantity;

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
        referenceId: sale.invoiceNumber,
        notes: `Sale Updated: ${sale.invoiceNumber}`,
        createdBy: req.user ? req.user.id : null
      });
      await log.save();

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

    // Adjust Customer balance with new outstanding
    const diff = Number(grandTotal) - Number(amountPaid);
    if (diff > 0 && customer.name !== 'Walk-in Customer') {
      customer.balance += diff;
      await customer.save();
    } else if (diff < 0 && customer.name !== 'Walk-in Customer') {
      customer.balance += diff;
      await customer.save();
    }

    // Update Sale object
    sale.customer = customerId;
    sale.warehouse = warehouseId;
    sale.items = processedItems;
    sale.subTotal = Number(subTotal);
    sale.tax = Number(tax) || 0;
    sale.discount = Number(discount) || 0;
    sale.grandTotal = Number(grandTotal);
    sale.paymentMethod = paymentMethod;
    sale.paymentDetails = paymentDetails || { cash: 0, upi: 0, card: 0 };
    sale.amountPaid = Number(amountPaid);
    sale.changeReturned = Number(changeReturned) || 0;
    sale.description = description || '';
    if (date) {
      const now = new Date(date);
      sale.date = now;
      sale.saleDate = now.toISOString().split('T')[0];
      sale.saleTime = now.toTimeString().split(' ')[0].substring(0, 5);
      sale.saleMonth = now.toLocaleString('default', { month: 'long' });
      sale.saleYear = now.getFullYear();
    }

    await sale.save();

    await logAction(
      req.user ? req.user.id : null,
      req.user ? req.user.username : 'Admin',
      'Update Sale',
      `Invoice ${sale.invoiceNumber}`,
      `Updated sale invoice: ₹${grandTotal}`
    );

    res.status(200).json({ success: true, data: sale });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

