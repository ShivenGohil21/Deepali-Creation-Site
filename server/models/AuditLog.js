const mongoose = require('mongoose');

const AuditLogSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: false // Can be null if system action or unauthenticated login attempt
  },
  username: {
    type: String,
    required: true,
    default: 'System'
  },
  action: {
    type: String,
    required: true // e.g. 'Login', 'Create Product', 'Edit Product', 'Delete Product', 'POS Sale', 'Purchase', 'Stock Adjustment', 'Transfer'
  },
  target: {
    type: String,
    required: true // e.g. 'Product SH0001', 'Sale INV-0001', etc.
  },
  details: {
    type: String,
    default: ''
  },
  ipAddress: {
    type: String,
    default: ''
  },
  date: {
    type: Date,
    default: Date.now
  }
});

AuditLogSchema.index({ date: -1 });

module.exports = mongoose.model('AuditLog', AuditLogSchema);
