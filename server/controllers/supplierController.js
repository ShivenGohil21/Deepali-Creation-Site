const Supplier = require('../models/Supplier');
const Purchase = require('../models/Purchase');
const { logAction } = require('../utils/auditLogger');

exports.getSuppliers = async (req, res) => {
  try {
    const suppliers = await Supplier.find().sort({ name: 1 });
    res.status(200).json({ success: true, count: suppliers.length, data: suppliers });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.getSupplierById = async (req, res) => {
  try {
    const supplier = await Supplier.findById(req.params.id);
    if (!supplier) {
      return res.status(404).json({ success: false, message: 'Supplier not found' });
    }
    
    // Fetch purchase history for this supplier
    const history = await Purchase.find({ supplier: req.params.id })
      .populate('warehouse')
      .sort({ date: -1 });

    res.status(200).json({ success: true, data: supplier, history });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.createSupplier = async (req, res) => {
  try {
    const { name, mobile, email, gstNumber, address, balance } = req.body;
    if (!name || !mobile) {
      return res.status(400).json({ success: false, message: 'Name and mobile number are required' });
    }

    const supplier = new Supplier({ name, mobile, email, gstNumber, address, balance });
    await supplier.save();

    await logAction(req.user ? req.user.id : null, req.user ? req.user.username : 'Admin', 'Create Supplier', `Supplier ${name}`, `Added supplier: ${name}, GST: ${gstNumber}`);

    res.status(201).json({ success: true, data: supplier });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.updateSupplier = async (req, res) => {
  try {
    const { name, mobile, email, gstNumber, address, balance } = req.body;
    let supplier = await Supplier.findById(req.params.id);

    if (!supplier) {
      return res.status(404).json({ success: false, message: 'Supplier not found' });
    }

    supplier.name = name || supplier.name;
    supplier.mobile = mobile || supplier.mobile;
    supplier.email = email !== undefined ? email : supplier.email;
    supplier.gstNumber = gstNumber !== undefined ? gstNumber : supplier.gstNumber;
    supplier.address = address !== undefined ? address : supplier.address;
    supplier.balance = balance !== undefined ? balance : supplier.balance;
    await supplier.save();

    await logAction(req.user ? req.user.id : null, req.user ? req.user.username : 'Admin', 'Update Supplier', `Supplier ${supplier.name}`, `Updated supplier information`);

    res.status(200).json({ success: true, data: supplier });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.deleteSupplier = async (req, res) => {
  try {
    const supplier = await Supplier.findById(req.params.id);
    if (!supplier) {
      return res.status(404).json({ success: false, message: 'Supplier not found' });
    }

    await Supplier.deleteOne({ _id: req.params.id });

    await logAction(req.user ? req.user.id : null, req.user ? req.user.username : 'Admin', 'Delete Supplier', `Supplier ${supplier.name}`, `Deleted supplier: ${supplier.name}`);

    res.status(200).json({ success: true, message: 'Supplier deleted' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
