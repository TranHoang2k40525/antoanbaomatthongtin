// controllers/authController.js
require('dotenv').config();
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { v4: uuidv4 } = require('uuid');
const nodemailer = require('nodemailer');
const { poolPromise, sql } = require('../db');

const JWT_SECRET = process.env.JWT_ACCESS_SECRET || 'dev_secret';
const ACCESS_EXPIRES = process.env.ACCESS_TOKEN_EXPIRES_IN || '15m';
const REFRESH_DAYS = parseInt(process.env.REFRESH_TOKEN_EXPIRES_DAYS || '30', 10);
const MAX_FAILED = 5;

// ==== Helper functions ====
function signAccessToken(payload) {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: ACCESS_EXPIRES });
}

function isValidGmail(email) {
  return /^[a-zA-Z0-9._%+-]+@gmail\.com$/.test(email);
}

async function sendOtpEmail(to, code) {
  const transporter = nodemailer.createTransport({
    host: process.env.EMAIL_HOST,
    port: parseInt(process.env.EMAIL_PORT || 587, 10),
    secure: false,
    auth: { user: process.env.EMAIL_USER, pass: process.env.EMAIL_PASS }
  });

  return transporter.sendMail({
    from: process.env.EMAIL_USER,
    to,
    subject: 'OTP khôi phục mật khẩu',
    text: `Mã OTP của bạn: ${code}. Mã sẽ hết hạn sau 5 phút.`
  });
}

// ==== Controllers ====
module.exports = {
  // ------------------- Đăng ký -------------------
  register: async (req, res) => {
    try {
      const { fullName, username, email, dob, address, gender, password } = req.body;

      if (!fullName || !username || !email || !password || !dob || !address || !gender) {
        return res.status(400).json({ error: 'Vui lòng nhập đầy đủ thông tin.' });
      }

      if (!isValidGmail(email)) {
        return res.status(400).json({ error: 'Email phải có đuôi @gmail.com' });
      }

      const dobRegex = /^\d{4}-\d{2}-\d{2}$/;
      if (!dobRegex.test(dob)) {
        return res.status(400).json({ error: 'Ngày sinh phải có định dạng YYYY-MM-DD' });
      }

      const pool = await poolPromise;

      // check tồn tại
      const exist = await pool.request()
        .input('username', sql.NVarChar(200), username)
        .input('email', sql.NVarChar(255), email)
        .query('SELECT TOP 1 * FROM Users WHERE Username=@username OR Email=@email');

      if (exist.recordset.length > 0) {
        return res.status(409).json({ error: 'Username hoặc Email đã tồn tại' });
      }

      const hash = await bcrypt.hash(password, 10);

      await pool.request()
        .input('fullName', sql.NVarChar(200), fullName)
        .input('username', sql.NVarChar(200), username)
        .input('email', sql.NVarChar(255), email)
        .input('dob', sql.Date, dob)
        .input('address', sql.NVarChar(500), address)
        .input('gender', sql.NVarChar(50), gender)
        .input('password_hash', sql.NVarChar(500), hash)
        .query(`
          INSERT INTO Users (FullName, Username, Email, Dob, Address, Gender, PasswordHash)
          VALUES (@fullName, @username, @email, @dob, @address, @gender, @password_hash)
        `);

      return res.status(201).json({ message: 'Đăng ký thành công' });
    } catch (e) {
      console.error('REGISTER ERROR:', e);
      return res.status(500).json({ error: 'Lỗi server khi đăng ký' });
    }
  },

  // ------------------- Đăng nhập -------------------
  login: async (req, res) => {
    try {
      const identifier = req.body.identifier || req.body.username || req.body.email;
      const password = req.body.password;

      if (!identifier || !password) {
        return res.status(400).json({ error: 'username/email và password là bắt buộc' });
      }

      const pool = await poolPromise;
      const result = await pool.request()
        .input('identifier', sql.NVarChar(255), identifier)
        .query('SELECT TOP 1 * FROM Users WHERE Username=@identifier OR Email=@identifier');

      const user = result.recordset[0];
      if (!user) return res.status(401).json({ error: 'Sai tài khoản hoặc mật khẩu' });

      if ((user.FailedAttempts || 0) >= MAX_FAILED) {
        return res.status(403).json({ error: 'Tài khoản bị khóa do nhập sai quá nhiều lần' });
      }

      const match = await bcrypt.compare(password, user.PasswordHash);
      if (!match) {
        await pool.request().input('id', sql.Int, user.Id).query(`
          UPDATE Users SET FailedAttempts = ISNULL(FailedAttempts,0) + 1 WHERE Id=@id
        `);
        return res.status(401).json({ error: 'Sai tài khoản hoặc mật khẩu' });
      }

      // reset failed attempts
      await pool.request().input('id', sql.Int, user.Id).query(`
        UPDATE Users SET FailedAttempts = 0 WHERE Id=@id
      `);

      const accessToken = signAccessToken({ sub: user.Id, username: user.Username });
      const refreshToken = uuidv4();
      const expiresAt = new Date(Date.now() + REFRESH_DAYS * 24 * 60 * 60 * 1000);

      await pool.request()
        .input('userId', sql.Int, user.Id)
        .input('token', sql.NVarChar(500), refreshToken)
        .input('expiresAt', sql.DateTime, expiresAt)
        .query('INSERT INTO RefreshTokens (UserId, Token, ExpiresAt) VALUES (@userId,@token,@expiresAt)');

      return res.json({
        accessToken,
        refreshToken,
        user: {
          id: user.Id,
          fullName: user.FullName,
          username: user.Username,
          email: user.Email,
          dob: user.Dob,
          address: user.Address,
          gender: user.Gender
        }
      });
    } catch (e) {
      console.error('LOGIN ERROR:', e);
      return res.status(500).json({ error: 'Lỗi server khi đăng nhập' });
    }
  },

  // ------------------- Refresh token -------------------
  refreshToken: async (req, res) => {
    try {
      const token = req.body.refreshToken;
      if (!token) return res.status(401).json({ error: 'Thiếu refresh token' });

      const pool = await poolPromise;
      const r = await pool.request()
        .input('token', sql.NVarChar(500), token)
        .query('SELECT * FROM RefreshTokens WHERE Token=@token');

      const row = r.recordset[0];
      if (!row) return res.status(401).json({ error: 'Refresh token không hợp lệ' });

      if (new Date(row.ExpiresAt) < new Date()) {
        return res.status(401).json({ error: 'Refresh token đã hết hạn' });
      }

      const userRes = await pool.request().input('id', sql.Int, row.UserId).query('SELECT * FROM Users WHERE Id=@id');
      const user = userRes.recordset[0];
      if (!user) return res.status(401).json({ error: 'Người dùng không tồn tại' });

      const accessToken = signAccessToken({ sub: user.Id, username: user.Username });
      return res.json({ accessToken });
    } catch (e) {
      console.error('REFRESH ERROR:', e);
      return res.status(500).json({ error: 'Lỗi server khi refresh token' });
    }
  },

  // ------------------- Logout -------------------
  logout: async (req, res) => {
    try {
      const token = req.body.refreshToken;
      if (token) {
        const pool = await poolPromise;
        await pool.request().input('token', sql.NVarChar(500), token)
          .query('DELETE FROM RefreshTokens WHERE Token=@token');
      }
      return res.json({ message: 'Đăng xuất thành công' });
    } catch (e) {
      console.error('LOGOUT ERROR:', e);
      return res.status(500).json({ error: 'Lỗi server khi đăng xuất' });
    }
  },

  // ------------------- Đổi mật khẩu -------------------
  changePassword: async (req, res) => {
    try {
      const userId = req.user && req.user.sub;
      if (!userId) return res.status(401).json({ error: 'Chưa xác thực' });

      const { oldPassword, newPassword } = req.body;
      if (!oldPassword || !newPassword) {
        return res.status(400).json({ error: 'oldPassword và newPassword là bắt buộc' });
      }

      const pool = await poolPromise;
      const userRes = await pool.request().input('id', sql.Int, userId).query('SELECT * FROM Users WHERE Id=@id');
      const user = userRes.recordset[0];
      if (!user) return res.status(404).json({ error: 'Người dùng không tồn tại' });

      const match = await bcrypt.compare(oldPassword, user.PasswordHash);
      if (!match) return res.status(401).json({ error: 'Mật khẩu cũ không đúng' });

      const newHash = await bcrypt.hash(newPassword, 10);
      await pool.request()
        .input('id', sql.Int, userId)
        .input('hash', sql.NVarChar(500), newHash)
        .query('UPDATE Users SET PasswordHash=@hash WHERE Id=@id');

      await pool.request().input('userId', sql.Int, userId)
        .query('DELETE FROM RefreshTokens WHERE UserId=@userId');

      return res.json({ message: 'Đổi mật khẩu thành công' });
    } catch (e) {
      console.error('CHANGE PW ERROR:', e);
      return res.status(500).json({ error: 'Lỗi server khi đổi mật khẩu' });
    }
  },

  // ------------------- Quên mật khẩu: Gửi OTP -------------------
  forgotPassword: async (req, res) => {
    try {
      const { email } = req.body;
      if (!email) return res.status(400).json({ error: 'email required' });

      if (!isValidGmail(email)) {
        return res.status(400).json({ error: 'Email phải có đuôi @gmail.com' });
      }

      const pool = await poolPromise;
      const r = await pool.request()
        .input('email', sql.NVarChar(255), email)
        .query('SELECT TOP 1 * FROM Users WHERE Email=@email');

      const user = r.recordset[0];
      if (!user) return res.status(404).json({ error: 'Không tìm thấy email' });

      const code = Math.floor(100000 + Math.random() * 900000).toString();
      const expiresAt = new Date(Date.now() + 5 * 60 * 1000);

      await pool.request()
        .input('userId', sql.Int, user.Id)
        .input('code', sql.NVarChar(6), code)
        .input('expiresAt', sql.DateTime, expiresAt)
        .query('INSERT INTO OtpCodes (UserId, Code, ExpiresAt, CreatedAt) VALUES (@userId,@code,@expiresAt,GETDATE())');

      await sendOtpEmail(email, code);
      return res.json({ message: 'OTP đã được gửi' });
    } catch (e) {
      console.error('FORGOT PW ERROR:', e);
      return res.status(500).json({ error: 'Lỗi server khi gửi OTP' });
    }
  },

  // ------------------- Xác minh OTP & Reset mật khẩu -------------------
  verifyOtpAndReset: async (req, res) => {
    try {
      const { email, code, newPassword } = req.body;
      if (!email || !code || !newPassword) {
        return res.status(400).json({ error: 'email, code, newPassword là bắt buộc' });
      }

      const pool = await poolPromise;
      const r = await pool.request()
        .input('email', sql.NVarChar(255), email)
        .query('SELECT TOP 1 * FROM Users WHERE Email=@email');
      const user = r.recordset[0];
      if (!user) return res.status(404).json({ error: 'Email không tồn tại' });

      const o = await pool.request()
        .input('userId', sql.Int, user.Id)
        .input('code', sql.NVarChar(6), code)
        .query('SELECT TOP 1 * FROM OtpCodes WHERE UserId=@userId AND Code=@code ORDER BY CreatedAt DESC');

      const otp = o.recordset[0];
      if (!otp) return res.status(400).json({ error: 'OTP không hợp lệ' });

      if (new Date(otp.ExpiresAt) < new Date()) {
        return res.status(400).json({ error: 'OTP đã hết hạn' });
      }

      const newHash = await bcrypt.hash(newPassword, 10);
      await pool.request()
        .input('id', sql.Int, user.Id)
        .input('hash', sql.NVarChar(500), newHash)
        .query('UPDATE Users SET PasswordHash=@hash WHERE Id=@id');

      await pool.request().input('id', sql.Int, otp.Id)
        .query('DELETE FROM OtpCodes WHERE Id=@id');

      await pool.request().input('userId', sql.Int, user.Id)
        .query('DELETE FROM RefreshTokens WHERE UserId=@userId');

      return res.json({ message: 'Đặt lại mật khẩu thành công' });
    } catch (e) {
      console.error('VERIFY OTP ERROR:', e);
      return res.status(500).json({ error: 'Lỗi server khi đặt lại mật khẩu' });
    }
  }
};








// // controllers/authController.js
// require('dotenv').config();
// const bcrypt = require('bcrypt');
// const jwt = require('jsonwebtoken');
// const { v4: uuidv4 } = require('uuid');
// const nodemailer = require('nodemailer');
// const { poolPromise, sql } = require('../db');

// const JWT_SECRET = process.env.JWT_ACCESS_SECRET || 'dev_secret';
// const ACCESS_EXPIRES = process.env.ACCESS_TOKEN_EXPIRES_IN || '15m';
// const REFRESH_DAYS = parseInt(process.env.REFRESH_TOKEN_EXPIRES_DAYS || '30', 10);
// const MAX_FAILED = 5;

// // ==== Helper functions ====
// function signAccessToken(payload) {
//   return jwt.sign(payload, JWT_SECRET, { expiresIn: ACCESS_EXPIRES });
// }

// function isValidGmail(email) {
//   return /^[a-zA-Z0-9._%+-]+@gmail\.com$/.test(email);
// }

// async function sendOtpEmail(to, code) {
//   const transporter = nodemailer.createTransport({
//     host: process.env.EMAIL_HOST,
//     port: parseInt(process.env.EMAIL_PORT || 587, 10),
//     secure: false,
//     auth: { user: process.env.EMAIL_USER, pass: process.env.EMAIL_PASS }
//   });

//   return transporter.sendMail({
//     from: process.env.EMAIL_USER,
//     to,
//     subject: 'OTP khôi phục mật khẩu',
//     text: `Mã OTP của bạn: ${code}. Hết hạn trong 5 phút.`
//   });
// }

// // ==== Controllers ====
// module.exports = {
//   // ------------------- Register -------------------
//   register: async (req, res) => {
//     try {
//       console.log('REGISTER BODY:', req.body);

//       const { fullName, username, email, dob, address, gender, password } = req.body;

//       if (!fullName || !username || !email || !password || !dob || !address || !gender) {
//         return res.status(400).json({ error: 'Vui lòng nhập đầy đủ thông tin: fullName, username, email, password, dob, address, gender' });
//       }

//       if (!isValidGmail(email)) {
//         return res.status(400).json({ error: 'Email phải có định dạng @gmail.com' });
//       }

//       const dobRegex = /^\d{4}-\d{2}-\d{2}$/;
//       if (!dobRegex.test(dob)) {
//         return res.status(400).json({ error: 'Ngày sinh phải có định dạng YYYY-MM-DD' });
//       }

//       const pool = await poolPromise;

//       // check existing username/email
//       const exist = await pool.request()
//         .input('username', sql.NVarChar(200), username)
//         .input('email', sql.NVarChar(255), email)
//         .query('SELECT TOP 1 * FROM Users WHERE Username=@username OR Email=@email');

//       if (exist.recordset.length > 0) {
//         return res.status(409).json({ error: 'Username hoặc Email đã tồn tại' });
//       }

//       const hash = await bcrypt.hash(password, 10);

//       await pool.request()
//         .input('fullName', sql.NVarChar(200), fullName)
//         .input('username', sql.NVarChar(200), username)
//         .input('email', sql.NVarChar(255), email)
//         .input('dob', sql.Date, dob)
//         .input('address', sql.NVarChar(500), address)
//         .input('gender', sql.NVarChar(50), gender)
//         .input('password_hash', sql.NVarChar(500), hash)
//         .query(`
//           INSERT INTO Users (FullName, Username, Email, Dob, Address, Gender, PasswordHash)
//           VALUES (@fullName, @username, @email, @dob, @address, @gender, @password_hash)
//         `);

//       return res.status(201).json({ message: 'Đăng ký thành công', username, email });
//     } catch (e) {
//       console.error('REGISTER ERROR:', e);
//       if (e && e.number === 2627) {
//         return res.status(409).json({ error: 'Username hoặc Email đã tồn tại' });
//       }
//       return res.status(500).json({ error: 'server error' });
//     }
//   },

//   // ------------------- Login -------------------
//   login: async (req, res) => {
//     try {
//       console.log('LOGIN BODY:', req.body);

//       const identifier = req.body.identifier || req.body.username || req.body.email || req.body.account;
//       const password = req.body.password;

//       if (!identifier || !password) {
//         return res.status(400).json({ error: 'username/email và password required' });
//       }

//       const pool = await poolPromise;
//       const result = await pool.request()
//         .input('identifier', sql.NVarChar(255), identifier)
//         .query('SELECT TOP 1 * FROM Users WHERE Username=@identifier OR Email=@identifier');

//       const user = result.recordset[0];
//       if (!user) {
//         return res.status(401).json({ error: 'invalid credentials' });
//       }

//       if ((user.FailedAttempts || 0) >= MAX_FAILED) {
//         await pool.request().input('id', sql.Int, user.Id).query('DELETE FROM Users WHERE Id=@id');
//         return res.status(403).json({ error: 'account deleted due to too many failed attempts' });
//       }

//       const match = await bcrypt.compare(password, user.PasswordHash);
//       if (!match) {
//         await pool.request().input('id', sql.Int, user.Id).query('UPDATE Users SET FailedAttempts = ISNULL(FailedAttempts,0) + 1 WHERE Id=@id');
//         const updated = (user.FailedAttempts || 0) + 1;
//         if (updated >= MAX_FAILED) {
//           await pool.request().input('id', sql.Int, user.Id).query('DELETE FROM Users WHERE Id=@id');
//           return res.status(403).json({ error: 'account deleted due to too many failed attempts' });
//         }
//         return res.status(401).json({ error: 'invalid credentials' });
//       }

//       await pool.request().input('id', sql.Int, user.Id).query('UPDATE Users SET FailedAttempts = 0 WHERE Id=@id');

//       const accessToken = signAccessToken({ sub: user.Id, username: user.Username });
//       const refreshToken = uuidv4();
//       const expiresAt = new Date(Date.now() + REFRESH_DAYS * 24 * 60 * 60 * 1000);

//       await pool.request()
//         .input('userId', sql.Int, user.Id)
//         .input('token', sql.NVarChar(500), refreshToken)
//         .input('expiresAt', sql.DateTime, expiresAt)
//         .query('INSERT INTO RefreshTokens (UserId, Token, ExpiresAt) VALUES (@userId,@token,@expiresAt)');

//       return res.json({
//         accessToken,
//         refreshToken,
//         user: {
//           id: user.Id,
//           fullName: user.FullName,
//           username: user.Username,
//           email: user.Email,
//           dob: user.Dob,
//           address: user.Address,
//           gender: user.Gender
//         }
//       });
//     } catch (e) {
//       console.error('LOGIN ERROR:', e);
//       return res.status(500).json({ error: 'server error' });
//     }
//   },

//   // ------------------- Refresh token -------------------
//   refreshToken: async (req, res) => {
//     try {
//       const token = req.body.refreshToken || (req.cookies && req.cookies.refreshToken);
//       if (!token) return res.status(401).json({ error: 'no refresh token' });

//       const pool = await poolPromise;
//       const r = await pool.request().input('token', sql.NVarChar(500), token).query('SELECT * FROM RefreshTokens WHERE Token=@token');
//       const row = r.recordset[0];
//       if (!row) return res.status(401).json({ error: 'invalid refresh token' });

//       if (new Date(row.ExpiresAt) < new Date()) {
//         await pool.request().input('token', sql.NVarChar(500), token).query('DELETE FROM RefreshTokens WHERE Token=@token');
//         return res.status(401).json({ error: 'refresh token expired' });
//       }

//       const userRes = await pool.request().input('id', sql.Int, row.UserId).query('SELECT * FROM Users WHERE Id=@id');
//       const user = userRes.recordset[0];
//       if (!user) return res.status(401).json({ error: 'user not found' });

//       const accessToken = signAccessToken({ sub: user.Id, username: user.Username });
//       return res.json({ accessToken });
//     } catch (e) {
//       console.error('REFRESH ERROR:', e);
//       return res.status(500).json({ error: 'server error' });
//     }
//   },

//   // ------------------- Logout -------------------
//   logout: async (req, res) => {
//     try {
//       const token = req.body.refreshToken || (req.cookies && req.cookies.refreshToken);
//       if (token) {
//         const pool = await poolPromise;
//         await pool.request().input('token', sql.NVarChar(500), token).query('DELETE FROM RefreshTokens WHERE Token=@token');
//       }
//       res.clearCookie('refreshToken');
//       return res.json({ ok: true });
//     } catch (e) {
//       console.error('LOGOUT ERROR:', e);
//       return res.status(500).json({ error: 'server error' });
//     }
//   },

//   // ------------------- Change password -------------------
//   changePassword: async (req, res) => {
//     try {
//       const userId = req.user && req.user.sub;
//       if (!userId) return res.status(401).json({ error: 'unauthenticated' });

//       const { oldPassword, newPassword } = req.body;
//       if (!oldPassword || !newPassword) return res.status(400).json({ error: 'old and new password required' });

//       const pool = await poolPromise;
//       const userRes = await pool.request().input('id', sql.Int, userId).query('SELECT * FROM Users WHERE Id=@id');
//       const user = userRes.recordset[0];
//       if (!user) return res.status(404).json({ error: 'user not found' });

//       const match = await bcrypt.compare(oldPassword, user.PasswordHash);
//       if (!match) return res.status(401).json({ error: 'old password incorrect' });

//       const newHash = await bcrypt.hash(newPassword, 10);
//       await pool.request().input('id', sql.Int, userId).input('hash', sql.NVarChar(500), newHash)
//         .query('UPDATE Users SET PasswordHash=@hash WHERE Id=@id');

//       await pool.request().input('userId', sql.Int, userId).query('DELETE FROM RefreshTokens WHERE UserId=@userId');
//       return res.json({ ok: true });
//     } catch (e) {
//       console.error('CHANGE PW ERROR:', e);
//       return res.status(500).json({ error: 'server error' });
//     }
//   },

//   // ------------------- Forgot password (send OTP) -------------------
//   forgotPassword: async (req, res) => {
//     try {
//       const { email } = req.body;
//       if (!email) return res.status(400).json({ error: 'email required' });

//       if (!isValidGmail(email)) {
//         return res.status(400).json({ error: 'email phải có định dạng @gmail.com' });
//       }

//       const pool = await poolPromise;
//       const r = await pool.request().input('email', sql.NVarChar(255), email).query('SELECT TOP 1 * FROM Users WHERE Email=@email');
//       const user = r.recordset[0];
//       if (!user) return res.status(404).json({ error: 'email not found' });

//       const code = Math.floor(100000 + Math.random() * 900000).toString();
//       const expiresAt = new Date(Date.now() + 5 * 60 * 1000);

//       await pool.request()
//         .input('userId', sql.Int, user.Id)
//         .input('code', sql.NVarChar(6), code)
//         .input('expiresAt', sql.DateTime, expiresAt)
//         .query('INSERT INTO OtpCodes (UserId, Code, ExpiresAt, CreatedAt) VALUES (@userId,@code,@expiresAt,GETDATE())');

//       await sendOtpEmail(email, code);
//       return res.json({ message: 'otp sent' });
//     } catch (e) {
//       console.error('FORGOT PW ERROR:', e);
//       return res.status(500).json({ error: 'server error' });
//     }
//   },

//   // ------------------- Verify OTP & Reset password -------------------
//   verifyOtpAndReset: async (req, res) => {
//     try {
//       const { email, code, newPassword } = req.body;
//       if (!email || !code || !newPassword) return res.status(400).json({ error: 'email, code, newPassword required' });

//       const pool = await poolPromise;
//       const r = await pool.request().input('email', sql.NVarChar(255), email).query('SELECT TOP 1 * FROM Users WHERE Email=@email');
//       const user = r.recordset[0];
//       if (!user) return res.status(404).json({ error: 'email not found' });

//       const o = await pool.request()
//         .input('userId', sql.Int, user.Id)
//         .input('code', sql.NVarChar(6), code)
//         .query('SELECT TOP 1 * FROM OtpCodes WHERE UserId=@userId AND Code=@code ORDER BY CreatedAt DESC');

//       const otp = o.recordset[0];
//       if (!otp) return res.status(400).json({ error: 'invalid otp' });

//       if (new Date(otp.ExpiresAt) < new Date()) {
//         await pool.request().input('id', sql.Int, otp.Id).query('DELETE FROM OtpCodes WHERE Id=@id');
//         return res.status(400).json({ error: 'otp expired' });
//       }

//       const newHash = await bcrypt.hash(newPassword, 10);
//       await pool.request().input('id', sql.Int, user.Id).input('hash', sql.NVarChar(500), newHash)
//         .query('UPDATE Users SET PasswordHash=@hash WHERE Id=@id');

//       await pool.request().input('id', sql.Int, otp.Id).query('DELETE FROM OtpCodes WHERE Id=@id');
//       await pool.request().input('userId', sql.Int, user.Id).query('DELETE FROM RefreshTokens WHERE UserId=@userId');

//       return res.json({ ok: true });
//     } catch (e) {
//       console.error('VERIFY OTP ERROR:', e);
//       return res.status(500).json({ error: 'server error' });
//     }
//   }
// };




























// require('dotenv').config();
// const bcrypt = require('bcrypt');
// const jwt = require('jsonwebtoken');
// const { v4: uuidv4 } = require('uuid');
// const nodemailer = require('nodemailer');
// const { poolPromise, sql } = require('../db');

// const JWT_SECRET = process.env.JWT_ACCESS_SECRET || 'dev_secret';
// const ACCESS_EXPIRES = process.env.ACCESS_TOKEN_EXPIRES_IN || '15m';
// const REFRESH_DAYS = parseInt(process.env.REFRESH_TOKEN_EXPIRES_DAYS || '30', 10);
// const MAX_FAILED = 5;

// // ==== Helper functions ====
// function signAccessToken(payload) {
//   return jwt.sign(payload, JWT_SECRET, { expiresIn: ACCESS_EXPIRES });
// }

// async function sendOtpEmail(to, code) {
//   const transporter = nodemailer.createTransport({
//     host: process.env.EMAIL_HOST,
//     port: parseInt(process.env.EMAIL_PORT || 587, 10),
//     secure: false,
//     auth: { user: process.env.EMAIL_USER, pass: process.env.EMAIL_PASS }
//   });

//   const info = await transporter.sendMail({
//     from: process.env.EMAIL_USER,
//     to,
//     subject: 'OTP khôi phục mật khẩu',
//     text: `Mã OTP của bạn: ${code}. Hết hạn trong 5 phút.`
//   });
//   return info;
// }

// // ==== Controllers ====
// module.exports = {
//   // Đăng ký
//   register: async (req, res) => {
//     try {
//       const { username, password, email } = req.body;
//       if (!username || !password || !email) {
//         return res.status(400).json({ error: 'username, password, email required' });
//       }

//       const hash = await bcrypt.hash(password, 10);
//       const pool = await poolPromise;

//       await pool.request()
//         .input('username', sql.NVarChar(200), username)
//         .input('password_hash', sql.NVarChar(500), hash)
//         .input('email', sql.NVarChar(255), email)
//         .query('INSERT INTO Users (Username, PasswordHash, Email) VALUES (@username,@password_hash,@email)');

//       return res.status(201).json({ username });
//     } catch (e) {
//       if (e && e.number === 2627) {
//         return res.status(409).json({ error: 'username or email exists' });
//       }
//       console.error(e);
//       res.status(500).json({ error: 'server error' });
//     }
//   },

//   // Đăng nhập (username hoặc email)
//   login: async (req, res) => {
//     try {
//       const { identifier, password } = req.body; // identifier = username hoặc email
//       if (!identifier || !password) {
//         return res.status(400).json({ error: 'username/email và password required' });
//       }

//       const pool = await poolPromise;
//       const result = await pool.request()
//         .input('identifier', sql.NVarChar(255), identifier)
//         .query('SELECT TOP 1 * FROM Users WHERE Username=@identifier OR Email=@identifier');

//       const user = result.recordset[0];
//       if (!user) {
//         return res.status(401).json({ error: 'invalid credentials' });
//       }

//       if ((user.FailedAttempts || 0) >= MAX_FAILED) {
//         await pool.request().input('id', sql.Int, user.Id).query('DELETE FROM Users WHERE Id=@id');
//         return res.status(403).json({ error: 'account deleted due to too many failed attempts' });
//       }

//       const match = await bcrypt.compare(password, user.PasswordHash);
//       if (!match) {
//         await pool.request()
//           .input('id', sql.Int, user.Id)
//           .query('UPDATE Users SET FailedAttempts = ISNULL(FailedAttempts,0) + 1 WHERE Id=@id');

//         const updated = (user.FailedAttempts || 0) + 1;
//         if (updated >= MAX_FAILED) {
//           await pool.request().input('id', sql.Int, user.Id).query('DELETE FROM Users WHERE Id=@id');
//           return res.status(403).json({ error: 'account deleted due to too many failed attempts' });
//         }
//         return res.status(401).json({ error: 'invalid credentials' });
//       }

//       // reset fail count
//       await pool.request().input('id', sql.Int, user.Id).query('UPDATE Users SET FailedAttempts = 0 WHERE Id=@id');

//       const accessToken = signAccessToken({ sub: user.Id, username: user.Username });
//       const refreshToken = uuidv4();
//       const expiresAt = new Date(Date.now() + REFRESH_DAYS * 24 * 60 * 60 * 1000);

//       await pool.request()
//         .input('userId', sql.Int, user.Id)
//         .input('token', sql.NVarChar(500), refreshToken)
//         .input('expiresAt', sql.DateTime, expiresAt)
//         .query('INSERT INTO RefreshTokens (UserId, Token, ExpiresAt) VALUES (@userId,@token,@expiresAt)');

//       return res.json({ accessToken, refreshToken });
//     } catch (e) {
//       console.error(e);
//       res.status(500).json({ error: 'server error' });
//     }
//   },

//   // Refresh token
//   refreshToken: async (req, res) => {
//     try {
//       const token = req.body.refreshToken || (req.cookies && req.cookies.refreshToken);
//       if (!token) return res.status(401).json({ error: 'no refresh token' });

//       const pool = await poolPromise;
//       const r = await pool.request().input('token', sql.NVarChar(500), token).query('SELECT * FROM RefreshTokens WHERE Token=@token');
//       const row = r.recordset[0];
//       if (!row) return res.status(401).json({ error: 'invalid refresh token' });

//       if (new Date(row.ExpiresAt) < new Date()) {
//         await pool.request().input('token', sql.NVarChar(500), token).query('DELETE FROM RefreshTokens WHERE Token=@token');
//         return res.status(401).json({ error: 'refresh token expired' });
//       }

//       const userRes = await pool.request().input('id', sql.Int, row.UserId).query('SELECT * FROM Users WHERE Id=@id');
//       const user = userRes.recordset[0];
//       if (!user) return res.status(401).json({ error: 'user not found' });

//       const accessToken = signAccessToken({ sub: user.Id, username: user.Username });
//       return res.json({ accessToken });
//     } catch (e) {
//       console.error(e);
//       res.status(500).json({ error: 'server error' });
//     }
//   },

//   // Logout
//   logout: async (req, res) => {
//     try {
//       const token = req.body.refreshToken || (req.cookies && req.cookies.refreshToken);
//       if (token) {
//         const pool = await poolPromise;
//         await pool.request().input('token', sql.NVarChar(500), token).query('DELETE FROM RefreshTokens WHERE Token=@token');
//       }
//       res.clearCookie('refreshToken');
//       return res.json({ ok: true });
//     } catch (e) {
//       console.error(e);
//       res.status(500).json({ error: 'server error' });
//     }
//   },

//   // Đổi mật khẩu
//   changePassword: async (req, res) => {
//     try {
//       const userId = req.user && req.user.sub;
//       if (!userId) return res.status(401).json({ error: 'unauthenticated' });

//       const { oldPassword, newPassword } = req.body;
//       if (!oldPassword || !newPassword) return res.status(400).json({ error: 'old and new password required' });

//       const pool = await poolPromise;
//       const userRes = await pool.request().input('id', sql.Int, userId).query('SELECT * FROM Users WHERE Id=@id');
//       const user = userRes.recordset[0];
//       if (!user) return res.status(404).json({ error: 'user not found' });

//       const match = await bcrypt.compare(oldPassword, user.PasswordHash);
//       if (!match) return res.status(401).json({ error: 'old password incorrect' });

//       const newHash = await bcrypt.hash(newPassword, 10);
//       await pool.request()
//         .input('id', sql.Int, userId)
//         .input('hash', sql.NVarChar(500), newHash)
//         .query('UPDATE Users SET PasswordHash=@hash WHERE Id=@id');

//       await pool.request().input('userId', sql.Int, userId).query('DELETE FROM RefreshTokens WHERE UserId=@userId');
//       return res.json({ ok: true });
//     } catch (e) {
//       console.error(e);
//       res.status(500).json({ error: 'server error' });
//     }
//   },

//   // Quên mật khẩu (gửi OTP)
//   forgotPassword: async (req, res) => {
//     try {
//       const { email } = req.body;
//       if (!email) return res.status(400).json({ error: 'email required' });

//       const pool = await poolPromise;
//       const r = await pool.request().input('email', sql.NVarChar(255), email).query('SELECT TOP 1 * FROM Users WHERE Email=@email');
//       const user = r.recordset[0];
//       if (!user) return res.status(404).json({ error: 'email not found' });

//       const code = Math.floor(100000 + Math.random() * 900000).toString();
//       const expiresAt = new Date(Date.now() + 5 * 60 * 1000);

//       await pool.request()
//         .input('userId', sql.Int, user.Id)
//         .input('code', sql.NVarChar(6), code)
//         .input('expiresAt', sql.DateTime, expiresAt)
//         .query('INSERT INTO OtpCodes (UserId, Code, ExpiresAt, CreatedAt) VALUES (@userId,@code,@expiresAt,GETDATE())');

//       await sendOtpEmail(email, code);
//       return res.json({ message: 'otp sent' });
//     } catch (e) {
//       console.error(e);
//       res.status(500).json({ error: 'server error' });
//     }
//   },

//   // Xác minh OTP và reset password
//   verifyOtpAndReset: async (req, res) => {
//     try {
//       const { email, code, newPassword } = req.body;
//       if (!email || !code || !newPassword) {
//         return res.status(400).json({ error: 'email, code, newPassword required' });
//       }

//       const pool = await poolPromise;
//       const r = await pool.request().input('email', sql.NVarChar(255), email).query('SELECT TOP 1 * FROM Users WHERE Email=@email');
//       const user = r.recordset[0];
//       if (!user) return res.status(404).json({ error: 'email not found' });

//       const o = await pool.request()
//         .input('userId', sql.Int, user.Id)
//         .input('code', sql.NVarChar(6), code)
//         .query('SELECT TOP 1 * FROM OtpCodes WHERE UserId=@userId AND Code=@code ORDER BY CreatedAt DESC');

//       const otp = o.recordset[0];
//       if (!otp) return res.status(400).json({ error: 'invalid otp' });

//       if (new Date(otp.ExpiresAt) < new Date()) {
//         await pool.request().input('id', sql.Int, otp.Id).query('DELETE FROM OtpCodes WHERE Id=@id');
//         return res.status(400).json({ error: 'otp expired' });
//       }

//       const newHash = await bcrypt.hash(newPassword, 10);
//       await pool.request()
//         .input('id', sql.Int, user.Id)
//         .input('hash', sql.NVarChar(500), newHash)
//         .query('UPDATE Users SET PasswordHash=@hash WHERE Id=@id');

//       await pool.request().input('id', sql.Int, otp.Id).query('DELETE FROM OtpCodes WHERE Id=@id');
//       await pool.request().input('userId', sql.Int, user.Id).query('DELETE FROM RefreshTokens WHERE UserId=@userId');

//       return res.json({ ok: true });
//     } catch (e) {
//       console.error(e);
//       res.status(500).json({ error: 'server error' });
//     }
//   }
// };
