require('dotenv').config();
const express = require('express');
const bodyParser = require('body-parser');
const cookieParser = require('cookie-parser');
const cors = require('cors');
const authController = require('./controllers/authController');
const authMiddleware = require('./middleware/authMiddleware');
const path = require('path');

const app = express();
const PORT = process.env.PORT||4000;

app.use(bodyParser.json());
app.use(cookieParser());
app.use(cors({ origin: true, credentials: true }));

// Phục vụ file ảnh tĩnh
app.use('/Assets/images', express.static(path.join(__dirname, 'Assets/images')));

const authRoutes = require('./routes/auth');
const userRoutes = require('./routes/user');
app.use('/api/auth', authRoutes); // tài khoản
app.use('/api/user', userRoutes); // người dùng

app.get('/', (req, res) => {
  res.json({ message: 'Welcome to the Auth API!' });
});

app.listen(PORT, ()=> console.log('Server running on port', PORT));