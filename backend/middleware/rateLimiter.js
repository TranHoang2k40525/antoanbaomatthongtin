const rateLimit = require("express-rate-limit");

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 phút
  max: 5,
  message: { error: "Too many failed login attempts, please try again later." },
  standardHeaders: true,
  legacyHeaders: false,
});

module.exports = loginLimiter;
