const express = require('express');
const router = express.Router();
const { getDashboardStats, getInventoryReport, getSalesReport } = require('../controllers/reportController');
const { protect, authorize } = require('../middleware/auth');

router.get('/dashboard', protect, getDashboardStats);
router.get('/inventory', protect, authorize('Super Admin', 'Admin', 'Manager'), getInventoryReport);
router.get('/sales', protect, authorize('Super Admin', 'Admin', 'Manager'), getSalesReport);

module.exports = router;
