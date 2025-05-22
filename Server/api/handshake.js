const express = require('express');
const jwt = require('jsonwebtoken');
const pool = require('../configuration/mysql_db');
const router = express.Router();
const JWT_SECRET = process.env.JWT_SECRET;

router.post('/', async (req, res) => {
  const { serial_number } = req.body;
  console.log('(Handshank)=>', `S/N: ${serial_number}`);

  if (!serial_number) {
    return res.status(400).json({ message: 'Missing serial number' });
  }

  try {
    // อัปเดตเวลาและ IP
    // await pool.execute('UPDATE machine SET connection = NOW() WHERE alarm_box_sn_1 = ? OR alarm_box_sn_2 = ?', [serial_number, serial_number]);

    // ดึงชื่อเครื่อง
    const [rows] = await pool.execute('SELECT machine_name_en FROM machine WHERE alarm_box_sn_1 = ? OR alarm_box_sn_2 = ?', [serial_number, serial_number]);

    if (rows.length > 0) {
      const accessToken = jwt.sign({ serial_number }, JWT_SECRET);
      res.status(200).json({ accessToken, machineName: rows[0].machine_name_en });
    } else {
      console.log('(Handshank)=> Serial number not found in database');
      res.status(400).send('Serial number incorrect');
    }
  } catch (err) {
    console.error('Database error:', err);
    res.status(500).send('An error occurred');
  }
});

module.exports = router;
