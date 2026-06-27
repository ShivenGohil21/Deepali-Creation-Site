const Warehouse = require('../models/Warehouse');
const Product = require('../models/Product');
const InventoryLog = require('../models/InventoryLog');
const { logAction } = require('../utils/auditLogger');

exports.getWarehouses = async (req, res) => {
  try {
    const warehouses = await Warehouse.find().sort({ name: 1 });
    res.status(200).json({ success: true, count: warehouses.length, data: warehouses });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.createWarehouse = async (req, res) => {
  try {
    const { name, location, address, description } = req.body;
    if (!name) {
      return res.status(400).json({ success: false, message: 'Warehouse name is required' });
    }

    const warehouse = new Warehouse({ name, location, address, description });
    await warehouse.save();

    await logAction(req.user ? req.user.id : null, req.user ? req.user.username : 'Admin', 'Create Warehouse', `Warehouse ${name}`, `Added warehouse: ${name}`);

    res.status(201).json({ success: true, data: warehouse });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(400).json({ success: false, message: 'Warehouse name already exists' });
    }
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.updateWarehouse = async (req, res) => {
  try {
    const { name, location, address, description } = req.body;
    let warehouse = await Warehouse.findById(req.params.id);

    if (!warehouse) {
      return res.status(404).json({ success: false, message: 'Warehouse not found' });
    }

    warehouse.name = name || warehouse.name;
    warehouse.location = location !== undefined ? location : warehouse.location;
    warehouse.address = address !== undefined ? address : warehouse.address;
    warehouse.description = description !== undefined ? description : warehouse.description;
    await warehouse.save();

    await logAction(req.user ? req.user.id : null, req.user ? req.user.username : 'Admin', 'Update Warehouse', `Warehouse ${warehouse.name}`, `Updated warehouse details`);

    res.status(200).json({ success: true, data: warehouse });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.deleteWarehouse = async (req, res) => {
  try {
    const warehouse = await Warehouse.findById(req.params.id);
    if (!warehouse) {
      return res.status(404).json({ success: false, message: 'Warehouse not found' });
    }

    // Check if default showroom
    if (warehouse.name === 'Deepali Main Showroom') {
      return res.status(400).json({ success: false, message: 'Cannot delete the default showroom' });
    }

    await Warehouse.deleteOne({ _id: req.params.id });

    await logAction(req.user ? req.user.id : null, req.user ? req.user.username : 'Admin', 'Delete Warehouse', `Warehouse ${warehouse.name}`, `Deleted warehouse: ${warehouse.name}`);

    res.status(200).json({ success: true, message: 'Warehouse deleted' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Stock Transfer logic
exports.transferStock = async (req, res) => {
  const { productId, fromWarehouseId, toWarehouseId, quantity } = req.body;
  const qty = Number(quantity);

  if (!productId || !fromWarehouseId || !toWarehouseId || isNaN(qty) || qty <= 0) {
    return res.status(400).json({ success: false, message: 'Invalid product, warehouses, or quantity' });
  }

  if (fromWarehouseId === toWarehouseId) {
    return res.status(400).json({ success: false, message: 'Cannot transfer stock to the same warehouse' });
  }

  try {
    const product = await Product.findById(productId);
    if (!product) {
      return res.status(404).json({ success: false, message: 'Product not found' });
    }

    // Check source warehouse stock
    const sourceStockIndex = product.warehouseStock.findIndex(
      (item) => item.warehouse.toString() === fromWarehouseId
    );

    if (sourceStockIndex === -1 || product.warehouseStock[sourceStockIndex].quantity < qty) {
      return res.status(400).json({
        success: false,
        message: `Insufficient stock in the source warehouse. Available: ${
          sourceStockIndex !== -1 ? product.warehouseStock[sourceStockIndex].quantity : 0
        }`
      });
    }

    // Decrement from source
    const prevSourceStock = product.warehouseStock[sourceStockIndex].quantity;
    product.warehouseStock[sourceStockIndex].quantity -= qty;
    const newSourceStock = product.warehouseStock[sourceStockIndex].quantity;

    // Increment or insert into destination
    const destStockIndex = product.warehouseStock.findIndex(
      (item) => item.warehouse.toString() === toWarehouseId
    );

    let prevDestStock = 0;
    let newDestStock = qty;

    if (destStockIndex !== -1) {
      prevDestStock = product.warehouseStock[destStockIndex].quantity;
      product.warehouseStock[destStockIndex].quantity += qty;
      newDestStock = product.warehouseStock[destStockIndex].quantity;
    } else {
      product.warehouseStock.push({ warehouse: toWarehouseId, quantity: qty });
    }

    await product.save();

    // Log Inventory movements
    const fromLog = new InventoryLog({
      product: productId,
      warehouse: fromWarehouseId,
      type: 'Transfer',
      quantity: -qty,
      previousStock: prevSourceStock,
      newStock: newSourceStock,
      notes: `Transferred ${qty} to ${toWarehouseId}`,
      createdBy: req.user ? req.user.id : null
    });
    await fromLog.save();

    const toLog = new InventoryLog({
      product: productId,
      warehouse: toWarehouseId,
      type: 'Transfer',
      quantity: qty,
      previousStock: prevDestStock,
      newStock: newDestStock,
      notes: `Transferred ${qty} from ${fromWarehouseId}`,
      createdBy: req.user ? req.user.id : null
    });
    await toLog.save();

    // Fetch warehouse names for audit logs
    const fromWh = await Warehouse.findById(fromWarehouseId);
    const toWh = await Warehouse.findById(toWarehouseId);

    await logAction(
      req.user ? req.user.id : null,
      req.user ? req.user.username : 'Admin',
      'Stock Transfer',
      `Product ${product.code}`,
      `Transferred ${qty} items of "${product.name}" from ${fromWh.name} to ${toWh.name}`
    );

    res.status(200).json({ success: true, message: 'Stock transferred successfully', data: product });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
