const express = require('express');
const router = express.Router();
const { getCategories, createCategory, updateCategory, deleteCategory } = require('../controllers/categoryController');
const { protect, authorize } = require('../middleware/auth');

router.route('/')
  .get(protect, getCategories)
  .post(protect, authorize('Super Admin', 'Admin', 'Manager'), createCategory);

router.route('/:id')
  .put(protect, authorize('Super Admin', 'Admin', 'Manager'), updateCategory)
  .delete(protect, authorize('Super Admin', 'Admin'), deleteCategory);

module.exports = router;
