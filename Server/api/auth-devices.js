const jwt = require('jsonwebtoken');
const pool = require('../configuration/mysql_db');
const JWT_SECRET = process.env.JWT_SECRET;

exports.authenticateDevicesToken = async function (req, res, next) {
  try {
    const authHeader = req.headers['authorization'];
    const token = authHeader?.split('Bearer ')[1];

    if (!token) {
      return res.status(401).send('Access Denied');
    }

    const user = jwt.verify(token, JWT_SECRET); // ถ้า invalid จะ throw ทันที

    // อัปเดตเวลาการเชื่อมต่อ
    // const query = 'UPDATE machine SET connection = NOW() WHERE alarm_box_sn_1 = ? OR alarm_box_sn_2 = ?';
    // await pool.execute(query, [user.serial_number, user.serial_number]);

    req.device = user; // เก็บข้อมูลไว้ใช้ต่อ
    next();
  } catch (err) {
    console.error("('AuthenticateDevicesToken')=>", err);
    if (err.name === 'TokenExpiredError') {
      return res.status(401).send('Token expired');
    } else if (err.name === 'JsonWebTokenError') {
      return res.status(401).send('Invalid token');
    } else {
      return res.status(500).send('Internal server error');
    }
  }
};
