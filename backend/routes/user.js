const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const userController = require('../controllers/userController');
const authMiddleware = require('../middleware/authMiddleware');

// Cấu hình multer để upload file avatar
const upload = multer({
  dest: path.join(__dirname, '../Assets/images'),
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
  fileFilter: (req, file, cb) => {
    if (!file.mimetype.startsWith('image/')) {
      return cb(new Error('Chỉ cho phép upload file ảnh!'));
    }
    cb(null, true);
  }
});

// Lấy thông tin người dùng (phải xác thực)
router.get('/me', authMiddleware, userController.getUser);
// Cập nhật thông tin người dùng (phải xác thực)
router.put('/me', authMiddleware, userController.updateUser);
// Cập nhật avatar (phải xác thực)
router.post('/me/avatar', authMiddleware, upload.single('avatar'), userController.updateAvatar);

module.exports = router;
