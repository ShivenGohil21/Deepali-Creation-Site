const express = require('express');
const router = express.Router();
const { getNotifications, markAsRead, clearNotifications } = require('../controllers/notificationController');
const { protect } = require('../middleware/auth');

router.route('/')
  .get(protect, getNotifications)
  .put(protect, markAsRead)
  .delete(protect, clearNotifications);

module.exports = router;
