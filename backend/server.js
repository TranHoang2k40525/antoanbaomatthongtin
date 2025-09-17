require('dotenv').config();
const express = require('express');
const bodyParser = require('body-parser');
const cookieParser = require('cookie-parser');
const cors = require('cors');
const authController = require('./controllers/authController');
const authMiddleware = require('./middleware/authMiddleware');

const app = express();
const PORT = process.env.PORT||4000;

app.use(bodyParser.json());
app.use(cookieParser());
app.use(cors({ origin: true, credentials: true }));

app.post('/api/register', authController.register);
app.post('/api/login', authController.login);
app.post('/api/refresh', authController.refreshToken);
app.post('/api/logout', authController.logout);
app.post('/api/change-password', authMiddleware, authController.changePassword);
app.post('/api/forgot-password', authController.forgotPassword);
app.post('/api/verify-otp', authController.verifyOtpAndReset);

app.get('/api/protected', authMiddleware, (req, res) => res.json({ message: 'protected data', user: req.user }));

app.listen(PORT, ()=> console.log('Server running on port', PORT));