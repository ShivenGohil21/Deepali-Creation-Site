const express = require('express');
const router = express.Router();
const { getBrands, createBrand, updateBrand, deleteBrand } = require('../controllers/brandController');
const { protect, authorize } = require('../middleware/auth');

router.route('/')
  .get(protect, getBrands)
  .post(protect, authorize('Super Admin', 'Admin', 'Manager'), createBrand);

router.route('/:id')
  .put(protect, authorize('Super Admin', 'Admin', 'Manager'), updateBrand)
  .delete(protect, authorize('Super Admin', 'Admin'), deleteBrand);

module.exports = router;
