const mongoose = require('mongoose');

const SupplierSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Please add a supplier name'],
    trim: true
  },
  mobile: {
    type: String,
    required: [true, 'Please add a mobile number'],
    trim: true
  },
  email: {
    type: String,
    trim: true
  },
  gstNumber: {
    type: String,
    trim: true,
    default: ''
  },
  address: {
    type: String,
    default: ''
  },
  balance: {
    type: Number,
    default: 0 // Ledger balance (+ is we owe supplier, - is supplier owes us)
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model('Supplier', SupplierSchema);
