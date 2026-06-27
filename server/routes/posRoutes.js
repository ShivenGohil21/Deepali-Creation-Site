const express = require('express');
const router = express.Router();
const { createSale } = require('../controllers/posController');
const { protect, authorize } = require('../middleware/auth');

router.route('/checkout')
  .post(protect, authorize('Super Admin', 'Admin', 'Manager', 'Cashier'), createSale);

module.exports = router;
