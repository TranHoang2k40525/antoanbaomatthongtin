// middlewares/authMiddleware.js
require('dotenv').config();
const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_ACCESS_SECRET || 'dev_secret';

module.exports = function (req, res, next) {
  const authHeader = req.headers['authorization'];
  if (!authHeader) {
    return res.status(401).json({ error: 'Authorization header required' });
  }

  const parts = authHeader.split(' ');
  if (parts.length !== 2 || parts[0] !== 'Bearer') {
    return res.status(401).json({ error: 'Invalid Authorization format. Use Bearer <token>' });
  }

  const token = parts[1];

  jwt.verify(token, JWT_SECRET, (err, payload) => {
    if (err) {
      if (err.name === 'TokenExpiredError') {
        return res.status(401).json({ error: 'Token expired' });
      }
      return res.status(401).json({ error: 'Invalid token' });
    }
    req.user = payload; // payload gồm { id, username, email }
    next();
  });
};






// middleware/authMiddleware.js
// require('dotenv').config();
// const jwt = require('jsonwebtoken');
// const JWT_SECRET = process.env.JWT_ACCESS_SECRET || 'dev_secret';

// module.exports = function(req, res, next){
//   const authHeader = req.headers['authorization'];
//   if (!authHeader) return res.status(401).json({ error:'missing token' });
//   const parts = authHeader.split(' ');
//   if (parts.length !== 2) return res.status(401).json({ error:'invalid auth header' });
//   const token = parts[1];
//   jwt.verify(token, JWT_SECRET, (err, payload) => {
//     if (err) return res.status(401).json({ error:'invalid token' });
//     req.user = payload;
//     next();
//   });
// };