const express = require('express');
const router = express.Router();
const pool = require('../configuration/mysql_db');

// อัปเดตเวลาการเชื่อมต่อ
async function updateTimeStamp(serial_number) {
  try {
    const query = 'UPDATE machine SET connection = NOW() WHERE alarm_box_sn_1 = ? OR alarm_box_sn_2 = ?';
    await pool.execute(query, [serial_number, serial_number]);
  } catch (err) {
    console.error('Error updating timestamp:', err);
  }
}

// ตรวจสอบข้อมูลก่อนการแทรก
function validateData(data) {
  return data.timestamp && data.serial_number && data.operator1;
}

// --- Endpoint: modeGram ---
router.post('/modeGram', async (req, res) => {
  const { timestamp, serial_number, operator1, operator2, min_weight, max_weight, weight, result } = req.body;
  console.log('(modeGram)=>', req.body);

  if (!validateData(req.body)) {
    return res.status(400).send('Missing required fields');
  }

  const query = `
    INSERT INTO mode_gram (timestamp, machine_sn, serial_number, operator1, operator2, min_weight, max_weight, weight, result)
    SELECT ?, machine_sn, ?,  ?, ?, ?, ?, ?, ?
    FROM machine
    WHERE alarm_box_sn_1 = ? OR alarm_box_sn_2 = ?;
  `;
  const values = [timestamp, serial_number, operator1, operator2, min_weight, max_weight, weight, result, serial_number, serial_number];

  try {
    const [results] = await pool.execute(query, values);

    if (results.affectedRows) {
      // await updateTimeStamp(serial_number);
      res.status(201).send('Data inserted successfully');
    } else {
      res.status(400).send('Serial number not found');
    }
  } catch (err) {
    console.error('Error inserting modeGram:', err);
    res.status(500).send('An error occurred while inserting data');
  }
});

// --- Endpoint: modePcs ---
router.post('/modePcs', async (req, res) => {
  const { timestamp, serial_number, operator1, operator2, primary_pcs, pcs, result } = req.body;
  console.log('(modePcs)=>', req.body);

  if (!validateData(req.body)) {
    return res.status(400).send('Missing required fields');
  }

  const query = `
    INSERT INTO mode_pcs (timestamp, machine_sn, serial_number, operator1, operator2, primary_pcs, pcs, result)
    SELECT ?, machine_sn, ?, ?, ?, ?, ?, ?
    FROM machine
    WHERE alarm_box_sn_1 = ? OR alarm_box_sn_2 = ?;
  `;
  const values = [timestamp, serial_number, operator1, operator2, primary_pcs, pcs, result, serial_number, serial_number];

  try {
    const [results] = await pool.execute(query, values);

    if (results.affectedRows) {
      // await updateTimeStamp(serial_number);
      res.status(201).send('Data inserted successfully');
    } else {
      res.status(400).send('Serial number not found');
    }
  } catch (err) {
    console.error('Error inserting modePcs:', err);
    res.status(500).send('An error occurred while inserting data');
  }
});

module.exports = router;
