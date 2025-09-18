const sql = require('mssql');
const { isValidEmail } = require('../utils/validators');
const { poolPromise } = require('../db');
const path = require('path');
const fs = require('fs');

// Lấy thông tin người dùng (bao gồm cả Avatar)
exports.getUser = async (req, res) => {
  try {
    // Lấy userId từ token đã xác thực (không lấy từ body)
    const userId = req.user.userId;
    const pool = await poolPromise;
    const user = await pool.request().input('UserId', sql.Int, userId).execute('sp_GetUserFullInfo');
    if (!user.recordset[0]) return res.status(404).json({ message: 'Không tìm thấy người dùng!' });
    let userInfo = user.recordset[0];
    if (userInfo.AvatarFileName) {
      userInfo.avatarUrl = `/Assets/images/${userInfo.AvatarFileName}`;
    } else {
      userInfo.avatarUrl = null;
    }
    res.json({ user: userInfo });
  } catch (err) {
    res.status(500).json({ message: 'Lỗi lấy thông tin user', error: err.message });
  }
};

// Cập nhật thông tin người dùng (trừ avatar)
exports.updateUser = async (req, res) => {
  try {
    // Lấy userId từ token đã xác thực (không lấy từ body)
    const userId = req.user.userId;
    const { FullName, DateOfBirth, Address, School, Class, Email, PhoneNumber } = req.body;
    if (!FullName || !DateOfBirth || !Email || !PhoneNumber) {
      return res.status(400).json({ message: 'Thiếu thông tin bắt buộc!' });
    }
    if (!isValidEmail(Email)) {
      return res.status(400).json({ message: 'Email không hợp lệ!' });
    }
    const pool = await poolPromise;
    await pool.request()
      .input('UserId', sql.Int, userId)
      .input('FullName', sql.NVarChar, FullName)
      .input('DateOfBirth', sql.Date, DateOfBirth)
      .input('Address', sql.NVarChar, Address || null)
      .input('School', sql.NVarChar, School || null)
      .input('Class', sql.NVarChar, Class || null)
      .input('Email', sql.NVarChar, Email)
      .input('PhoneNumber', sql.NVarChar, PhoneNumber)
      .query(`UPDATE Users SET FullName=@FullName, DateOfBirth=@DateOfBirth, Address=@Address, School=@School, Class=@Class, Email=@Email, PhoneNumber=@PhoneNumber WHERE Id=@UserId`);
    res.json({ message: 'Cập nhật thông tin thành công!' });
  } catch (err) {
    res.status(500).json({ message: 'Lỗi cập nhật thông tin', error: err.message });
  }
};

// Cập nhật avatar
exports.updateAvatar = async (req, res) => {
  try {
    // Lấy userId từ token đã xác thực (không lấy từ body)
    const userId = req.user.userId;
    if (!req.file) return res.status(400).json({ message: 'Vui lòng upload file ảnh!' });
    const fileName = `user_${userId}_${Date.now()}${path.extname(req.file.originalname)}`;
    const destPath = path.join(__dirname, '../Assets/images', fileName);
    fs.renameSync(req.file.path, destPath);
    // Lưu tên file vào SQL
    const pool = await poolPromise;
    await pool.request().input('UserId', sql.Int, userId).input('AvatarFileName', sql.NVarChar, fileName).query('UPDATE Users SET AvatarFileName=@AvatarFileName WHERE Id=@UserId');
    res.json({ message: 'Cập nhật avatar thành công!', avatarUrl: `/Assets/images/${fileName}` });
  } catch (err) {
    res.status(500).json({ message: 'Lỗi cập nhật avatar', error: err.message });
  }
};
