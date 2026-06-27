const express = require('express');
const router = express.Router();
const { getSales, getSaleById, updateSale, refundSale, deleteSale, getSaleReturns, deleteSaleReturn } = require('../controllers/salesController');
const { protect, authorize } = require('../middleware/auth');

router.route('/')
  .get(protect, getSales);

router.route('/refund')
  .post(protect, authorize('Super Admin', 'Admin', 'Manager'), refundSale);

router.route('/returns')
  .get(protect, getSaleReturns);

router.route('/returns/:id')
  .delete(protect, authorize('Super Admin', 'Admin', 'Manager'), deleteSaleReturn);

router.route('/:id')
  .get(protect, getSaleById)
  .put(protect, authorize('Super Admin', 'Admin', 'Manager'), updateSale)
  .delete(protect, authorize('Super Admin', 'Admin', 'Manager'), deleteSale);

module.exports = router;
