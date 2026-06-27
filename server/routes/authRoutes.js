const express = require('express');
const router = express.Router();
const { login, refreshToken, getMe, changePassword } = require('../controllers/authController');
const { protect } = require('../middleware/auth');

router.post('/login', login);
router.post('/refresh', refreshToken);
router.get('/me', protect, getMe);
router.put('/changepassword', protect, changePassword);

module.exports = router;
