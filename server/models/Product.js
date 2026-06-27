const mongoose = require('mongoose');

const ProductSchema = new mongoose.Schema({
  code: {
    type: String,
    required: [true, 'Please add a product code'],
    unique: true,
    trim: true
  },
  name: {
    type: String,
    required: [true, 'Please add a product name'],
    trim: true
  },
  category: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Category',
    required: [true, 'Please select a category']
  },
  brand: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Brand',
    required: false
  },
  unit: {
    type: String,
    default: 'Pcs'
  },
  costPrice: {
    type: Number,
    required: [true, 'Please add a cost price'],
    min: [0, 'Cost price must be positive']
  },
  sellingPrice: {
    type: Number,
    required: [true, 'Please add a selling price'],
    min: [0, 'Selling price must be positive']
  },
  tax: {
    type: Number,
    default: 0 // Tax percentage e.g. 5, 12, 18
  },
  barcodeValue: {
    type: String,
    required: [true, 'Please add or generate a barcode value'],
    unique: true,
    trim: true
  },
  qrCode: {
    type: String, // Base64 representation of QR Code image
    default: ''
  },
  stockQuantity: {
    type: Number,
    default: 0
  },
  alertQuantity: {
    type: Number,
    default: 5
  },
  color: {
    type: String,
    default: ''
  },
  description: {
    type: String,
    default: ''
  },
  status: {
    type: String,
    enum: ['Active', 'Inactive'],
    default: 'Active'
  },
  warehouseStock: [
    {
      warehouse: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Warehouse'
      },
      quantity: {
        type: Number,
        default: 0
      }
    }
  ],
  initialStock: {
    type: Number,
    default: 0
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model('Product', ProductSchema);
