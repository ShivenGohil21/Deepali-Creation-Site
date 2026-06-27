const express = require('express');
const router = express.Router();
const { getPurchases, getPurchaseById, createPurchase, updatePurchase, deletePurchase, returnPurchase, getPurchaseReturns, deletePurchaseReturn } = require('../controllers/purchaseController');
const { protect, authorize } = require('../middleware/auth');

router.route('/')
  .get(protect, getPurchases)
  .post(protect, authorize('Super Admin', 'Admin', 'Manager'), createPurchase);

router.route('/return')
  .post(protect, authorize('Super Admin', 'Admin', 'Manager'), returnPurchase);

router.route('/returns')
  .get(protect, getPurchaseReturns);

router.route('/returns/:id')
  .delete(protect, authorize('Super Admin', 'Admin', 'Manager'), deletePurchaseReturn);

router.route('/:id')
  .get(protect, getPurchaseById)
  .put(protect, authorize('Super Admin', 'Admin', 'Manager'), updatePurchase)
  .delete(protect, authorize('Super Admin', 'Admin', 'Manager'), deletePurchase);

module.exports = router;
