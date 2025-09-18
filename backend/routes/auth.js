const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const authMiddleware = require('../middleware/authMiddleware');

// Đăng ký tài khoản
router.post('/register', authController.register);
// Đăng nhập tài khoản
router.post('/login', authController.login);
// Làm mới token
router.post('/refresh', authController.refreshToken);
// Quên mật khẩu - gửi OTP
router.post('/forgot-password/request-otp', authController.requestOtp);
// Quên mật khẩu - xác minh OTP và đặt lại mật khẩu
router.post('/forgot-password/verify', authController.verifyOtpAndReset);
// Đổi mật khẩu - gửi OTP (yêu cầu đăng nhập)
router.post('/change-password/request-otp', authMiddleware, authController.requestOtpChangePassword);
// Đổi mật khẩu - xác minh OTP và đổi mật khẩu (yêu cầu đăng nhập)
router.post('/change-password/verify', authMiddleware, authController.verifyOtpAndChangePassword);

module.exports = router;
