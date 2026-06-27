const express = require('express');
const router = express.Router();
const { getSuppliers, getSupplierById, createSupplier, updateSupplier, deleteSupplier } = require('../controllers/supplierController');
const { protect, authorize } = require('../middleware/auth');

router.route('/')
  .get(protect, getSuppliers)
  .post(protect, authorize('Super Admin', 'Admin', 'Manager'), createSupplier);

router.route('/:id')
  .get(protect, getSupplierById)
  .put(protect, authorize('Super Admin', 'Admin', 'Manager'), updateSupplier)
  .delete(protect, authorize('Super Admin', 'Admin'), deleteSupplier);

module.exports = router;
