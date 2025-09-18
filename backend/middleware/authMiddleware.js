const { verifyToken } = require("../utils/JsonWebToken");
require('dotenv').config();
const JWT_SECRET = process.env.JWT_SECRET;

const authMiddleware = (req, res, next) => {
  try {
    // Lấy token từ header Authorization (Bearer token)
    const authHeader = req.headers["authorization"];
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({ message: "Không có token hoặc token không hợp lệ!", code: "INVALID_TOKEN" });
    }
    const token = authHeader.split(" ")[1];
    if (!token) {
      return res.status(401).json({ message: "Token không được cung cấp!", code: "MISSING_TOKEN" });
    }
    // Xác thực token bằng custom verifyToken
    let payload;
    try {
      payload = verifyToken(token);
    } catch (err) {
      if (err.message === "Token đã hết hạn") {
        return res.status(401).json({ message: "Token đã hết hạn", code: "TOKEN_EXPIRED" });
      }
      return res.status(401).json({ message: err.message, code: "TOKEN_ERROR" });
    }
    req.user = payload;
    // Chỉ cho phép thao tác với chính mình (userId trong token phải khớp với dữ liệu truy cập nếu có)
    if (req.body.userId && req.body.userId !== payload.userId) {
      return res.status(403).json({ message: "Bạn không có quyền truy cập dữ liệu này!", code: "ACCESS_DENIED" });
    }
    next();
  } catch (error) {
    return res.status(500).json({ message: "Lỗi xác thực!", code: "AUTH_ERROR" });
  }
};

module.exports = authMiddleware;
