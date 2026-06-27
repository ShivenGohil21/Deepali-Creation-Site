const express = require('express');
const router = express.Router();
const { getCustomers, getCustomerById, createCustomer, updateCustomer, deleteCustomer } = require('../controllers/customerController');
const { protect, authorize } = require('../middleware/auth');

router.route('/')
  .get(protect, getCustomers)
  .post(protect, authorize('Super Admin', 'Admin', 'Manager', 'Cashier'), createCustomer);

router.route('/:id')
  .get(protect, getCustomerById)
  .put(protect, authorize('Super Admin', 'Admin', 'Manager', 'Cashier'), updateCustomer)
  .delete(protect, authorize('Super Admin', 'Admin'), deleteCustomer);

module.exports = router;
