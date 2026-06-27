const express = require('express');
const router = express.Router();
const {
  getAdjustments,
  getAdjustmentById,
  createAdjustment,
  getAdjustmentBarcodeImage
} = require('../controllers/adjustmentController');
const { protect, authorize } = require('../middleware/auth');

router.route('/')
  .get(protect, getAdjustments)
  .post(protect, authorize('Super Admin', 'Admin', 'Warehouse Staff', 'Manager'), createAdjustment);

router.route('/:id')
  .get(protect, getAdjustmentById);

router.route('/barcode/:id')
  .get(protect, getAdjustmentBarcodeImage);

module.exports = router;
