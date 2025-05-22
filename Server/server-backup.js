require('dotenv').config();
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const cookieParser = require('cookie-parser');
const JWT_SECRET = process.env.JWT_SECRET;

const pool = require('./configuration/mysql_db');
const express = require('express');
const fileUpload = require('express-fileupload');

const cors = require('cors');
const rateLimit = require('express-rate-limit');
const bodyParser = require('body-parser');

const { authenticateDevicesToken } = require('./api/auth-devices');
const { authenticateWebToken } = require('./api/auth-web');
const app = express();

// ใช้ body-parser สำหรับ JSON
app.use(bodyParser.json());
app.use(cookieParser());
app.use(fileUpload({
  limits: { fileSize: 20 * 1024 * 1024 }, // 10MB
  useTempFiles: true,
  tempFileDir: './images/tmp/',
}));


app.use(
  cors({
    origin: true,
    credentials: true,
  })
);

// Rate Limiting
const limiter = rateLimit({
  windowMs: 5 * 60 * 1000, // 5 นาที
  max: 100000, // จำกัด 100 คำขอต่อ IP
});
// app.use(limiter);

const device_handshake = require('./api/handshake');
const device = require('./api/devices');
const poli = require('./api/web');
app.use('/api/handshake', device_handshake);
app.use('/api/poli', authenticateWebToken, poli);
app.use('/api/devices', authenticateDevicesToken, device);

// Login endpoint
app.post('/api/login', async (req, res) => {
  const { username, password } = req.body;

  if (!username || !password) {
    return res.status(400).json({ message: 'Username and password are required' });
  }

  try {
    const [results] = await pool.execute('SELECT * FROM users WHERE BINARY username = ?', [username]);

    if (results.length === 0) {
      return res.status(401).json({ message: 'ไม่พบข้อมูลผู้ใช้งาน' });
    }

    const user = results[0];
    const isMatch = await bcrypt.compare(password, user.password);

    if (!isMatch) {
      return res.status(403).json({ message: 'รหัสผ่านไม่ถูกต้อง' });
    }

    const token = jwt.sign({ id: user.id }, JWT_SECRET, { expiresIn: '1h' });
    console.log('Generated Token:', token);

    res.cookie('authToken', token, {
      httpOnly: true,
      sameSite: 'Lax',
      secure: true,
      maxAge: 3600000,
    });

    res.status(200).json({ auth: true });
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ message: 'Internal Server Error' });
  }
});

app.post('/api/logout', async (req, res) => {
  // เช็คว่า authToken ในคุกกี้มีอยู่หรือไม่
  if (!req.cookies.authToken) {
    return res.status(400).send('No active session found');
  }

  // ลบคุกกี้ authToken
  res.clearCookie('authToken', {
    httpOnly: true, // ให้เฉพาะ HTTP เท่านั้นที่สามารถเข้าถึง cookie ได้
    sameSite: 'None', // ใช้การตั้งค่านี้ถ้าคุณต้องการให้ cookie ใช้ข้ามโดเมน
    secure: true, // cookie จะถูกลบในกรณีที่ใช้ HTTPS
  });

  res.status(200).send('Successfully logged out');
});

app.post('/api/test', async (req, res) => {
  try {
    console.log(req.body);
    res.status(200).json({ message: 'Test API' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Internal Server Error' });
  }
});

// จัดการ promise ที่ไม่ได้ถูกจับ
process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
});

// เริ่มเซิร์ฟเวอร์
app.listen(process.env.SERVER_PORT, () => console.log(`Listening on port ${process.env.SERVER_PORT}`));
