// routes/authRoutes.js
const express = require('express');
const router = express.Router();

const authController = require('../controllers/authController');
const authMiddleware = require('../middlewares/authMiddleware');
const rateLimiter = require('../middlewares/rateLimiter');

// 📌 Đăng ký
router.post('/register', rateLimiter, authController.register);

// 📌 Đăng nhập
router.post('/login', rateLimiter, authController.login);

// 📌 Đăng xuất
router.post('/logout', authController.logout);

// 📌 Refresh Token
router.post('/refresh-token', authController.refreshToken);

// 📌 Đổi mật khẩu (yêu cầu login + token hợp lệ)
router.post('/change-password', authMiddleware, authController.changePassword);

// 📌 Quên mật khẩu → gửi OTP qua email
router.post('/forgot-password', rateLimiter, authController.forgotPassword);

// 📌 Xác thực OTP và đặt lại mật khẩu
router.post('/reset-password', rateLimiter, authController.resetPassword);

// 📌 Route test bảo vệ bởi middleware
router.get('/me', authMiddleware, (req, res) => {
  res.json({
    message: 'Thông tin user hợp lệ',
    user: req.user
  });
});

module.exports = router;
