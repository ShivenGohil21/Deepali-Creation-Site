const express = require('express');
const router = express.Router();
const { getWarehouses, createWarehouse, updateWarehouse, deleteWarehouse, transferStock } = require('../controllers/warehouseController');
const { protect, authorize } = require('../middleware/auth');

router.route('/')
  .get(protect, getWarehouses)
  .post(protect, authorize('Super Admin', 'Admin'), createWarehouse);

router.route('/transfer')
  .post(protect, authorize('Super Admin', 'Admin', 'Warehouse Staff'), transferStock);

router.route('/:id')
  .put(protect, authorize('Super Admin', 'Admin'), updateWarehouse)
  .delete(protect, authorize('Super Admin', 'Admin'), deleteWarehouse);

module.exports = router;
