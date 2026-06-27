const mongoose = require('mongoose');

const AdjustmentSchema = new mongoose.Schema({
  referenceNo: {
    type: String,
    required: true,
    unique: true
  },
  warehouse: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Warehouse',
    required: [true, 'Please select a warehouse']
  },
  items: [
    {
      product: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Product',
        required: true
      },
      type: {
        type: String,
        enum: ['Addition', 'Subtraction'],
        required: true
      },
      quantity: {
        type: Number,
        required: true,
        min: [0.01, 'Quantity must be greater than 0']
      },
      price: {
        type: Number,
        required: true,
        min: [0, 'Price must be positive']
      },
      total: {
        type: Number,
        required: true
      }
    }
  ],
  totalAmount: {
    type: Number,
    required: true
  },
  notes: {
    type: String,
    default: ''
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  date: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model('Adjustment', AdjustmentSchema);
