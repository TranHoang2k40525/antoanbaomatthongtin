const sql = require('mssql');
const bcrypt = require('bcrypt');
const { generateToken, generateRefreshToken, verifyToken, verifyRefreshToken } = require('../utils/JsonWebToken');
const { isValidEmail, isValidPhone } = require('../utils/validators');
require('dotenv').config();
const { poolPromise } = require('../db');
const nodemailer = require('nodemailer');
const crypto = require('crypto');

// Helper: send OTP email
async function sendOtpEmail(email, code) {
  const transporter = nodemailer.createTransport({
    host: process.env.EMAIL_HOST,
    port: process.env.EMAIL_PORT,
    secure: false,
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS,
    },
  });
  await transporter.sendMail({
    from: process.env.EMAIL_USER,
    to: email,
    subject: 'Mã OTP xác thực',
    text: `Mã OTP của bạn là: ${code}. Mã có hiệu lực trong 1 phút.`,  // Sửa: Thay 5 phút bằng 1 phút
  });
}

// Helper: generate 6-digit OTP
function generateOtp() {
  return ('' + Math.floor(100000 + Math.random() * 900000));
}

// Đăng ký tài khoản mới
exports.register = async (req, res) => {
  try {
    const { Username, FullName, DateOfBirth, Address, School, Class, Email, PhoneNumber, Password } = req.body;
    if (!Username || !FullName || !DateOfBirth || !Email || !PhoneNumber || !Password) {
      return res.status(400).json({ message: 'Thiếu thông tin bắt buộc!' });
    }
    if (!isValidEmail(Email)) {
      return res.status(400).json({ message: 'Email không hợp lệ!' });
    }
    if (!isValidPhone(PhoneNumber)) {
      return res.status(400).json({ message: 'Số điện thoại không hợp lệ! Số điện thoại phải có 10 số và bắt đầu bằng số 0.' });
    }
    // Băm mật khẩu trước khi lưu vào SQL
    const passwordHash = await bcrypt.hash(Password, 10);
    const pool = await poolPromise;
    const result = await pool.request()
      .input('Username', sql.NVarChar, Username)
      .input('FullName', sql.NVarChar, FullName)
      .input('DateOfBirth', sql.Date, DateOfBirth)
      .input('Address', sql.NVarChar, Address || null)
      .input('School', sql.NVarChar, School || null)
      .input('Class', sql.NVarChar, Class || null)
      .input('Email', sql.NVarChar, Email)
      .input('PhoneNumber', sql.NVarChar, PhoneNumber)
      .input('PasswordHash', sql.NVarChar, passwordHash)
      .execute('sp_CreateUserWithAccount');
    res.json({ message: 'Đăng ký thành công!', userId: result.recordset[0].UserId });
  } catch (err) {
    res.status(500).json({ message: 'Lỗi đăng ký', error: err.message });
  }
};

// Đăng nhập bằng email hoặc số điện thoại
exports.login = async (req, res) => {
  try {
    const { EmailOrPhone, Password } = req.body;
    if (!EmailOrPhone || !Password) return res.status(400).json({ message: 'Thiếu email/sdt hoặc mật khẩu!' });
    const pool = await poolPromise;
    // Chỉ lấy thông tin tài khoản, không trả về thông tin user ở đây
    const acc = await pool.request()
      .input('Email', sql.NVarChar, EmailOrPhone)
      .input('PhoneNumber', sql.NVarChar, EmailOrPhone)
      .query('SELECT * FROM Accounts WHERE Email = @Email OR PhoneNumber = @PhoneNumber');
    if (!acc.recordset[0]) return res.status(400).json({ message: 'Tài khoản không tồn tại!' });
    const account = acc.recordset[0];
    // So sánh mật khẩu đã băm
    const match = await bcrypt.compare(Password, account.PasswordHash);
    if (!match) return res.status(400).json({ message: 'Sai mật khẩu!' });
    // Sinh token xác thực
    const payload = { userId: account.UserId, accountId: account.Id, email: account.Email };
    const token = generateToken(payload);
    const refreshToken = generateRefreshToken(payload);
    // Lưu refreshToken vào DB
    await pool.request()
      .input('AccountId', sql.Int, account.Id)
      .input('Token', sql.NVarChar, refreshToken)
      .input('ExpiresAt', sql.DateTime, new Date(Date.now() + 30*24*60*60*1000))
      .query('INSERT INTO RefreshTokens (AccountId, Token, ExpiresAt) VALUES (@AccountId, @Token, @ExpiresAt)');
    res.json({ message: 'Đăng nhập thành công!', token, refreshToken });
  } catch (err) {
    res.status(500).json({ message: 'Lỗi đăng nhập', error: err.message });
  }
};

// Làm mới token
exports.refreshToken = async (req, res) => {
  try {
    const { refreshToken } = req.body;
    if (!refreshToken) return res.status(400).json({ message: 'Thiếu refreshToken!' });
    const pool = await poolPromise;
    // Kiểm tra refreshToken hợp lệ
    const rt = await pool.request().input('Token', sql.NVarChar, refreshToken).query('SELECT * FROM RefreshTokens WHERE Token = @Token');
    if (!rt.recordset[0]) return res.status(401).json({ message: 'RefreshToken không hợp lệ!' });
    let payload;
    try {
      payload = verifyRefreshToken(refreshToken);
    } catch (err) {
      return res.status(401).json({ message: err.message });
    }
    const newToken = generateToken({ userId: payload.userId, accountId: payload.accountId, email: payload.email });
    res.json({ token: newToken });
  } catch (err) {
    res.status(500).json({ message: 'Lỗi refresh token', error: err.message });
  }
};

// Request OTP for forgot/change password
exports.requestOtp = async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) return res.status(400).json({ message: 'Thiếu email!' });
    const pool = await poolPromise;
    // Find account by email
    const acc = await pool.request().input('Email', sql.NVarChar, email).query('SELECT * FROM Accounts WHERE Email = @Email');
    if (!acc.recordset[0]) return res.status(400).json({ message: 'Không tìm thấy tài khoản!' });
    const account = acc.recordset[0];
    if (!isValidPhone(account.PhoneNumber)) {
      return res.status(400).json({ message: 'Số điện thoại không hợp lệ! Số điện thoại phải có 10 số và bắt đầu bằng số 0.' });
    }
    // Check for recent OTP (prevent spam)
    const now = new Date();
    const recent = await pool.request()
      .input('AccountId', sql.Int, account.Id)
      .query('SELECT TOP 1 * FROM OtpCodes WHERE AccountId=@AccountId AND IsUsed=0 AND ExpiresAt > GETDATE() ORDER BY CreatedAt DESC');
    if (recent.recordset[0]) return res.status(429).json({ message: 'Vui lòng chờ trước khi yêu cầu mã OTP mới!' });
    // Generate and store OTP
    const code = generateOtp();
    const expires = new Date(Date.now() + 60 * 1000); // Sửa: Tăng lên 1 phút (60 giây)
    await pool.request()
      .input('AccountId', sql.Int, account.Id)
      .input('Code', sql.NVarChar, code)
      .input('ExpiresAt', sql.DateTime, expires)
      .query('INSERT INTO OtpCodes (AccountId, Code, ExpiresAt) VALUES (@AccountId, @Code, @ExpiresAt)');
    await sendOtpEmail(email, code);
    res.json({ message: 'Đã gửi mã OTP về email!' });
  } catch (err) {
    res.status(500).json({ message: 'Lỗi gửi OTP', error: err.message });
  }
};

// Verify OTP and reset password (forgot password)
exports.verifyOtpAndReset = async (req, res) => {
  try {
    const { email, code, newPassword } = req.body;
    if (!email || !code || !newPassword) return res.status(400).json({ message: 'Thiếu thông tin!' });
    const pool = await poolPromise;
    // Find account
    const acc = await pool.request().input('Email', sql.NVarChar, email).query('SELECT * FROM Accounts WHERE Email = @Email');
    if (!acc.recordset[0]) return res.status(400).json({ message: 'Không tìm thấy tài khoản!' });
    const account = acc.recordset[0];
    // Find OTP
    const otp = await pool.request()
      .input('AccountId', sql.Int, account.Id)
      .input('Code', sql.NVarChar, code)
      .query('SELECT * FROM OtpCodes WHERE AccountId=@AccountId AND Code=@Code AND IsUsed=0');
    const otpRow = otp.recordset[0];
    if (!otpRow) return res.status(400).json({ message: 'Mã OTP không hợp lệ!' });
    if (new Date(otpRow.ExpiresAt) < new Date()) {
      // Expired, delete
      await pool.request().input('Id', sql.Int, otpRow.Id).query('DELETE FROM OtpCodes WHERE Id=@Id');
      return res.status(400).json({ message: 'Mã OTP đã hết hạn!' });
    }
    // Mark OTP as used
    await pool.request().input('Id', sql.Int, otpRow.Id).query('UPDATE OtpCodes SET IsUsed=1 WHERE Id=@Id');
    // Update password
    const passwordHash = await bcrypt.hash(newPassword, 10);
    await pool.request().input('Id', sql.Int, account.Id).input('PasswordHash', sql.NVarChar, passwordHash).query('UPDATE Accounts SET PasswordHash=@PasswordHash WHERE Id=@Id');
    res.json({ message: 'Đặt lại mật khẩu thành công!' });
  } catch (err) {
    res.status(500).json({ message: 'Lỗi xác minh OTP', error: err.message });
  }
};

// Request OTP for change password (must be logged in) - SỬA: Kiểm tra oldPassword trước khi gửi OTP
exports.requestOtpChangePassword = async (req, res) => {
  try {
    const userId = req.user.userId;
    const { oldPassword } = req.body;  // Sửa: Nhận oldPassword từ body
    if (!oldPassword) return res.status(400).json({ message: 'Thiếu mật khẩu cũ!' });
    const pool = await poolPromise;
    // Find account by userId
    const acc = await pool.request().input('UserId', sql.Int, userId).query('SELECT * FROM Accounts WHERE UserId = @UserId');
    if (!acc.recordset[0]) return res.status(400).json({ message: 'Không tìm thấy tài khoản!' });
    const account = acc.recordset[0];
    // Kiểm tra mật khẩu cũ đúng (Sửa: Thêm bước này để khớp yêu cầu)
    const match = await bcrypt.compare(oldPassword, account.PasswordHash);
    if (!match) return res.status(400).json({ message: 'Mật khẩu cũ không đúng!' });
    // Check for recent OTP
    const recent = await pool.request()
      .input('AccountId', sql.Int, account.Id)
      .query('SELECT TOP 1 * FROM OtpCodes WHERE AccountId=@AccountId AND IsUsed=0 AND ExpiresAt > GETDATE() ORDER BY CreatedAt DESC');
    if (recent.recordset[0]) return res.status(429).json({ message: 'Vui lòng chờ trước khi yêu cầu mã OTP mới!' });
    // Generate and store OTP
    const code = generateOtp();
    const expires = new Date(Date.now() + 60 * 1000); // Sửa: Tăng lên 1 phút (60 giây)
    await pool.request()
      .input('AccountId', sql.Int, account.Id)
      .input('Code', sql.NVarChar, code)
      .input('ExpiresAt', sql.DateTime, expires)
      .query('INSERT INTO OtpCodes (AccountId, Code, ExpiresAt) VALUES (@AccountId, @Code, @ExpiresAt)');
    // Get user email
    const user = await pool.request().input('Id', sql.Int, userId).query('SELECT * FROM Users WHERE Id=@Id');
    const email = user.recordset[0]?.Email;
    await sendOtpEmail(email, code);
    res.json({ message: 'Đã gửi mã OTP về email!' });
  } catch (err) {
    res.status(500).json({ message: 'Lỗi gửi OTP', error: err.message });
  }
};

// Verify OTP and change password (must be logged in)
exports.verifyOtpAndChangePassword = async (req, res) => {
  try {
    const userId = req.user.userId;
    const { oldPassword, newPassword, code } = req.body;
    if (!oldPassword || !newPassword || !code) return res.status(400).json({ message: 'Thiếu thông tin!' });
    const pool = await poolPromise;
    // Find account by userId
    const acc = await pool.request().input('UserId', sql.Int, userId).query('SELECT * FROM Accounts WHERE UserId = @UserId');
    if (!acc.recordset[0]) return res.status(400).json({ message: 'Không tìm thấy tài khoản!' });
    const account = acc.recordset[0];
    // Check old password
    const match = await bcrypt.compare(oldPassword, account.PasswordHash);
    if (!match) return res.status(400).json({ message: 'Mật khẩu cũ không đúng!' });
    // Find OTP
    const otp = await pool.request()
      .input('AccountId', sql.Int, account.Id)
      .input('Code', sql.NVarChar, code)
      .query('SELECT * FROM OtpCodes WHERE AccountId=@AccountId AND Code=@Code AND IsUsed=0');
    const otpRow = otp.recordset[0];
    if (!otpRow) return res.status(400).json({ message: 'Mã OTP không hợp lệ!' });
    if (new Date(otpRow.ExpiresAt) < new Date()) {
      await pool.request().input('Id', sql.Int, otpRow.Id).query('DELETE FROM OtpCodes WHERE Id=@Id');
      return res.status(400).json({ message: 'Mã OTP đã hết hạn!' });
    }
    // Mark OTP as used
    await pool.request().input('Id', sql.Int, otpRow.Id).query('UPDATE OtpCodes SET IsUsed=1 WHERE Id=@Id');
    // Update password
    const passwordHash = await bcrypt.hash(newPassword, 10);
    await pool.request().input('Id', sql.Int, account.Id).input('PasswordHash', sql.NVarChar, passwordHash).query('UPDATE Accounts SET PasswordHash=@PasswordHash WHERE Id=@Id');
    res.json({ message: 'Đổi mật khẩu thành công!' });
  } catch (err) {
    res.status(500).json({ message: 'Lỗi xác minh OTP', error: err.message });
  }
};