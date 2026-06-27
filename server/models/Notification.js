const mongoose = require('mongoose');

const NotificationSchema = new mongoose.Schema({
  message: {
    type: String,
    required: true
  },
  type: {
    type: String,
    enum: ['Low Stock', 'Purchase', 'Sale', 'System'],
    default: 'System'
  },
  isRead: {
    type: Boolean,
    default: false
  },
  date: {
    type: Date,
    default: Date.now
  }
});

NotificationSchema.index({ date: -1 });

module.exports = mongoose.model('Notification', NotificationSchema);
