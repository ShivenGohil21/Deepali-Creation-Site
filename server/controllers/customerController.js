const Customer = require('../models/Customer');
const Sale = require('../models/Sale');
const { logAction } = require('../utils/auditLogger');

exports.getCustomers = async (req, res) => {
  try {
    const customers = await Customer.find().sort({ name: 1 });
    res.status(200).json({ success: true, count: customers.length, data: customers });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.getCustomerById = async (req, res) => {
  try {
    const customer = await Customer.findById(req.params.id);
    if (!customer) {
      return res.status(404).json({ success: false, message: 'Customer not found' });
    }
    
    // Fetch purchase history (Sales) for this customer
    const history = await Sale.find({ customer: req.params.id })
      .populate('warehouse')
      .sort({ date: -1 });

    res.status(200).json({ success: true, data: customer, history });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.createCustomer = async (req, res) => {
  try {
    const { name, mobile, email, address, balance } = req.body;
    if (!name || !mobile) {
      return res.status(400).json({ success: false, message: 'Name and mobile number are required' });
    }

    const customer = new Customer({ name, mobile, email, address, balance });
    await customer.save();

    await logAction(req.user ? req.user.id : null, req.user ? req.user.username : 'Admin', 'Create Customer', `Customer ${name}`, `Added customer: ${name}, Mobile: ${mobile}`);

    res.status(201).json({ success: true, data: customer });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.updateCustomer = async (req, res) => {
  try {
    const { name, mobile, email, address, balance } = req.body;
    let customer = await Customer.findById(req.params.id);

    if (!customer) {
      return res.status(404).json({ success: false, message: 'Customer not found' });
    }

    customer.name = name || customer.name;
    customer.mobile = mobile || customer.mobile;
    customer.email = email !== undefined ? email : customer.email;
    customer.address = address !== undefined ? address : customer.address;
    customer.balance = balance !== undefined ? balance : customer.balance;
    await customer.save();

    await logAction(req.user ? req.user.id : null, req.user ? req.user.username : 'Admin', 'Update Customer', `Customer ${customer.name}`, `Updated customer information`);

    res.status(200).json({ success: true, data: customer });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.deleteCustomer = async (req, res) => {
  try {
    const customer = await Customer.findById(req.params.id);
    if (!customer) {
      return res.status(404).json({ success: false, message: 'Customer not found' });
    }

    // Do not delete walk-in customer
    if (customer.name === 'Walk-in Customer') {
      return res.status(400).json({ success: false, message: 'Cannot delete default Walk-in Customer' });
    }

    await Customer.deleteOne({ _id: req.params.id });

    await logAction(req.user ? req.user.id : null, req.user ? req.user.username : 'Admin', 'Delete Customer', `Customer ${customer.name}`, `Deleted customer: ${customer.name}`);

    res.status(200).json({ success: true, message: 'Customer deleted' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
