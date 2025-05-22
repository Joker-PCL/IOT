//********************* API WEB CONNECTION *********************//
const express = require('express');
// const ping = require('ping');
const fs = require('fs');
const path = require('path');

const router = express.Router();
// const mime = require('mime-types');
const heicConvert = require('heic-convert'); // ต้องติดตั้ง npm i heic-convert
const pool = require('../configuration/mysql_db');
const { groupedByDate } = require('./utils');

// Endpoint สำหรับสร้างข้อมูล กรัม
router.get('/dashboard', async (req, res) => {
  try {
    // Fetch all machine
    const [machines] = await pool.execute(`
      SELECT d.*, mg.group_image
      FROM machine d
      JOIN machine_groups mg ON d.group_name = mg.group_name
      GROUP BY d.machine_name_en
      ORDER BY d.machine_name_en;
    `);

    const results = await Promise.all(
      machines.map(async (machine) => {
        const { machine_sn } = machine;

        // Production info
        const [productionRows] = await pool.execute(
          `SELECT p.*, pts.*
           FROM productions p
           LEFT JOIN productions_settings pts ON p.lot_number = pts.lot_number
           WHERE  p.machine_sn = ? AND NOW() BETWEEN p.start_product AND p.finish_product
           LIMIT 1;`,
          [machine_sn]
        );


        const [timestampLastRows] = await pool.execute(
          `SELECT timestamp
           FROM machine_data 
           WHERE machine_sn = ?
           ORDER BY timestamp DESC
           LIMIT 1;`,
          [machine_sn]
        );

        const production = productionRows[0];
        const { timestamp } = timestampLastRows[0] ?? '';

        if (production) {
          const { start_product, finish_product } = production;

          const [gramRows, pcsRows] = await Promise.all([
            pool.execute(`SELECT COUNT(*) AS count FROM mode_gram WHERE result = "PASS" AND machine_sn = ? AND timestamp BETWEEN ? AND ?;`, [
              machine_sn,
              start_product,
              finish_product,
            ]),
            pool.execute(`SELECT COUNT(*) AS count FROM mode_pcs WHERE result = "PASS" AND machine_sn = ? AND timestamp BETWEEN ? AND ?;`, [
              machine_sn,
              start_product,
              finish_product,
            ]),
          ]);

          const mode_gram_count = gramRows[0][0].count;
          const mode_pcs_count = pcsRows[0][0].count;

          return {
            ...machine,
            ...production,
            mode_gram_count,
            mode_pcs_count,
            liveData: { timestamp },
          };
        } else {
          return {
            ...machine,
            mode_gram_count: 0,
            mode_pcs_count: 0,
            liveData: { timestamp },
          };
        }
      })
    );

    res.status(200).json(results);
  } catch (error) {
    console.error('Error executing queries:', error);
    res.status(500).send('An error occurred while fetching data');
  }
});

router.get('/production', async (req, res) => {
  try {
    const query = `
      SELECT 
        p.*, 
        m.machine_name_en, 
        m.machine_name_th,
        pts.pieces_per_box,
        pts.pieces_per_pack,
        pts.pieces_per_cut,
        pts.cut_per_minute
      FROM productions p
      LEFT JOIN machine m ON p.machine_sn = m.machine_sn
      LEFT JOIN productions_settings pts ON p.lot_number = pts.lot_number
      ORDER BY p.timestamp DESC
    `;
    const [results] = await pool.execute(query);

    res.status(200).json(results);
  } catch (err) {
    console.error('Error executing query', err);
    res.status(500).send('An error occurred while fetching production data');
  }
});

router.post('/production/update', async (req, res) => {
  const {
    production_id,
    machine_sn,
    lot_number,
    product_name,
    product_type,
    batch_size,
    pieces_per_box,
    pieces_per_pack,
    pieces_per_cut,
    cut_per_minute,
    start_product,
    finish_product,
    notes,
  } = req.body;

  console.log('(Production Update)=>', req.body);

  // เริ่ม Transaction
  const connection = await pool.getConnection();
  await connection.beginTransaction();

  try {
    let results;

    if (production_id) {
      // อัปเดตตาราง production
      const updateProductionQuery = `
        UPDATE productions
        SET timestamp = NOW(), 
            machine_sn = ?, 
            lot_number = ?, 
            product_name = ?, 
            product_type = ?, 
            batch_size = ?, 
            start_product = ?, 
            finish_product = ?, 
            notes = ?
        WHERE production_id = ?;
      `;

      const updateProductionValues = [
        machine_sn,
        lot_number,
        product_name,
        product_type,
        batch_size,
        start_product,
        finish_product,
        notes,
        production_id,
      ];

      // อัปเดตตาราง productions_settings
      const updatePanelSettingsQuery = `
        UPDATE productions_settings
        SET pieces_per_box = ?, 
            pieces_per_pack = ?, 
            pieces_per_cut = ?, 
            cut_per_minute = ?
        WHERE lot_number = ?;
      `;

      const updatePanelSettingsValues = [pieces_per_box, pieces_per_pack, pieces_per_cut, cut_per_minute, lot_number];

      // Execute both queries in transaction
      const [productionResult] = await connection.execute(updateProductionQuery, updateProductionValues);
      const [panelSettingsResult] = await connection.execute(updatePanelSettingsQuery, updatePanelSettingsValues);

      results = { productionResult, panelSettingsResult };
      console.log('(Production Update)=>', results);
    } else {
      // กรณีสร้างใหม่
      const insertProductionQuery = `
        INSERT INTO productions (timestamp, machine_sn, lot_number, product_name, product_type, batch_size, start_product, finish_product, notes)
        VALUES (NOW(), ?, ?, ?, ?, ?, ?, ?, ?);
      `;

      const insertProductionValues = [machine_sn, lot_number, product_name, product_type, batch_size, start_product, finish_product, notes];

      // สร้างข้อมูลใน productions_settings ด้วย
      const insertPanelSettingsQuery = `
        INSERT INTO productions_settings (lot_number, pieces_per_box, pieces_per_pack, pieces_per_cut, cut_per_minute)
        VALUES (?, ?, ?, ?, ?);
      `;

      const insertPanelSettingsValues = [lot_number, pieces_per_box, pieces_per_pack, pieces_per_cut, cut_per_minute];

      // Execute both inserts in transaction
      const [productionResult] = await connection.execute(insertProductionQuery, insertProductionValues);
      const [panelSettingsResult] = await connection.execute(insertPanelSettingsQuery, insertPanelSettingsValues);

      results = {
        productionResult,
        panelSettingsResult,
        insertId: productionResult.insertId,
      };
      console.log('(Production Create)=>', results);
    }

    // Commit transaction ถ้าทุกอย่างสำเร็จ
    await connection.commit();
    res.status(201).json(results);
  } catch (err) {
    // Rollback transaction ถ้าเกิดข้อผิดพลาด
    await connection.rollback();
    console.error('Error executing query', err);
    res.status(500).send('An error occurred');
  } finally {
    // คืน connection เสมอ
    connection.release();
  }
});

router.post('/production/delete', async (req, res) => {
  const { production_id } = req.body;

  if (!production_id) {
    return res.status(400).send('ID not found');
  }

  try {
    const query = `DELETE FROM productions WHERE production_id = ?;`;
    const [results] = await pool.execute(query, [production_id]);

    if (results.affectedRows > 0) {
      console.log('(Production Delete)=>', results);
      res.status(200).json({ message: 'Production deleted successfully', results });
    } else {
      res.status(404).send('Production ID not found');
    }
  } catch (err) {
    console.error('Error executing query', err);
    res.status(500).send('An error occurred');
  }
});

router.get('/products', async (req, res) => {
  const query = `
    SELECT *
    FROM products
    ORDER BY product_name ASC
  `;

  try {
    const [results] = await pool.execute(query);

    if (results.length === 0) {
      return res.status(404).send('No products found');
    }

    // console.log('(Product Lists)=>', results);
    return res.status(200).json(results);
  } catch (err) {
    console.error('Error executing query', err);
    return res.status(500).send('An error occurred');
  }
});

router.get('/product/types', async (req, res) => {
  try {
    const query = `
      SELECT *
      FROM product_types
      ORDER BY type ASC
    `;
    const [results] = await pool.execute(query);

    res.status(200).json(results);
  } catch (err) {
    console.error('Error executing query', err);
    res.status(500).send('An error occurred while fetching production types data');
  }
});

router.post('/details', async (req, res) => {
  const { production_id } = req.body;
  console.log('(Production ID)=>', production_id);

  if (!production_id) {
    return res.status(400).json({ message: 'Missing parameter' });
  }

  try {
    const [[production]] = await pool.execute(
      `
      SELECT p.*, pts.*, m.machine_name_en, m.machine_name_th 
      FROM productions p
      LEFT JOIN machine m ON p.machine_sn = m.machine_sn 
      LEFT JOIN productions_settings pts ON p.lot_number = pts.lot_number
      WHERE p.production_id = ?;
      `,
      [production_id]
    );

    if (!production) {
      return res.status(404).json({ message: 'Production not found' });
    }

    const { machine_sn, start_product, finish_product } = production;

    const [modeGramResults] = await pool.execute(`SELECT * FROM mode_gram WHERE machine_sn = ? AND timestamp BETWEEN ? AND ?;`, [
      machine_sn,
      start_product,
      finish_product,
    ]);

    const [modePcsResults] = await pool.execute(`SELECT * FROM mode_pcs WHERE machine_sn = ? AND timestamp BETWEEN ? AND ?;`, [
      machine_sn,
      start_product,
      finish_product,
    ]);

    const summaryData = (data) => {
      const totalWeight = data.reduce((sum, item) => sum + (item.weight || 0), 0);
      const firstTimestamp = new Date(data[0]?.timestamp || 0);
      const lastTimestamp = new Date(data[data.length - 1]?.timestamp || 0);
      const durationMinutes = (lastTimestamp - firstTimestamp) / (1000 * 60);

      const passCount = data.filter((i) => i.result === 'PASS').length;
      const failCount = data.filter((i) => i.result === 'FAIL').length;
      const totalCount = data.length;

      return {
        data,
        average_per_minute: durationMinutes > 0 ? (totalWeight / durationMinutes).toFixed(2) : 0,
        pass_count: passCount,
        fail_count: failCount,
        pass_percentage: totalCount > 0 ? ((passCount / totalCount) * 100).toFixed(2) : 0,
        fail_percentage: totalCount > 0 ? ((failCount / totalCount) * 100).toFixed(2) : 0,
        summary_days: Object.values(groupedByDate(data)),
      };
    };

    const summaryGram = summaryData(modeGramResults);
    const summaryPcs = summaryData(modePcsResults);

    res.status(200).json({
      production,
      modeGramData: summaryGram,
      modePcsData: summaryPcs,
    });
  } catch (error) {
    console.error('Error executing queries:', error);
    res.status(500).send('An error occurred while fetching data');
  }
});

router.get('/machine', async (req, res) => {
  const query = `
    SELECT DISTINCT machine_sn, machine_name_en, machine_name_th
    FROM machine
    ORDER BY machine_name_en
  `;

  try {
    // ใช้ pool เพื่อให้การ query ใช้ await
    const [results] = await pool.execute(query);

    if (results.length > 0) {
      res.status(200).json(results); // ส่งข้อมูลกลับมา
    } else {
      res.status(404).json({ message: 'No machines found' }); // หากไม่มีผลลัพธ์
    }
  } catch (err) {
    console.error('Error executing query', err);
    res.status(500).json({ message: 'An error occurred' });
  }
});

router.get('/machineGroups', async (req, res) => {
  const query = `
    SELECT *
    FROM machine_groups
  `;

  try {
    // ใช้ pool เพื่อให้การ query ใช้ await
    const [results] = await pool.execute(query);

    if (results.length > 0) {
      res.status(200).json(results); // ส่งข้อมูลกลับมา
    } else {
      res.status(404).json({ message: 'No machine groups found' }); // หากไม่มีผลลัพธ์
    }
  } catch (err) {
    console.error('Error executing query', err);
    res.status(500).json({ message: 'An error occurred' });
  }
});

router.post('/performance', async (req, res) => {
  const { machine_sn, start_product, finish_product } = req.body;

  if (!machine_sn || !start_product || !finish_product) {
    return res.status(201).json({ message: 'Missing required parameters' });
  }

  try {
    const query = `
      SELECT 
        IFNULL(AVG(CASE WHEN cycle_time > 0 THEN cycle_time END), 0) AS avg_cycle_time,
        IFNULL(AVG(CASE WHEN cpm > 0 THEN cpm END), 0) AS avg_cpm,
        IFNULL(SUM(good_path_count), 0) AS total_good_path_count,
        IFNULL(SUM(reject_count), 0) AS total_reject_count,
        IFNULL(SUM(start_time), 0) AS total_start_time,
        IFNULL(SUM(stop_time), 0) AS total_stop_time,
        MAX(timestamp) AS last_connect
      FROM machine_data
      WHERE machine_sn = ? AND timestamp BETWEEN ? AND ?;
    `;

    const [results] = await pool.execute(query, [machine_sn, start_product, finish_product]);

    if (results.length === 0) {
      return res.status(404).json({ message: 'No data found for the given parameters' });
    }

    res.status(200).json(results[0]);
  } catch (error) {
    console.error('Error executing query:', error);
    res.status(500).json({ message: 'An error occurred while fetching performance data' });
  }
});

// ฟังชั่นอัพโหลดรูปภาพ
router.post('/machine/settings', async (req, res) => {
  const { machine_id, machine_sn, machine_name_en, machine_name_th, alarm_box_sn_1, alarm_box_sn_2, group_name } = req.body;
  let imageUrl = null;

  try {
    if (req.files?.upload_machine_img) {
      const file = req.files.upload_machine_img;
      const ext = path.extname(file.name).toLowerCase();
      console.log('File extension:', ext);
      console.log('File MIME type:', file.mimetype);
      const allowedExts = ['.jpg', '.jpeg', '.png', '.heic', '.gif'];
      const allowedMime = ['image/jpeg', 'image/jpg', 'image/png', 'image/heic', 'image/heif', 'image/gif'];

      if (!allowedExts.includes(ext) || !allowedMime.includes(file.mimetype)) {
        return res.status(400).json({ error: 'Unsupported file type.' });
      }

      const uploadDir = path.resolve('./images');
      const filename = `${Date.now()}.jpg`; // แปลงทุกไฟล์เป็น .jpg เพื่อความปลอดภัย
      const uploadPath = path.join(uploadDir, filename);
      imageUrl = `/assets/images/machine/${filename}`;

      if (!fs.existsSync(uploadDir)) {
        fs.mkdirSync(uploadDir, { recursive: true });
      }

      if (file.mimetype === 'image/heic' || ext === '.heic') {
        const buffer = await file.data; // express-fileupload เก็บไฟล์ใน buffer
        const outputBuffer = await heicConvert({
          buffer,
          format: 'JPEG',
          quality: 1,
        });
        fs.writeFileSync(uploadPath, outputBuffer);
      } else {
        await file.mv(uploadPath); // ไฟล์ธรรมดาใช้ mv ได้เลย
      }
    }

    const conn = await pool.getConnection();
    try {
      await conn.beginTransaction();

      // เพิ่มรายการเครื่องจักร
      if (machine_id) {
        if (alarm_box_sn_1) {
          await conn.execute('UPDATE machine SET alarm_box_sn_1 = NULL WHERE alarm_box_sn_1 = ?  OR alarm_box_sn_1 = ?', [
            alarm_box_sn_1,
            alarm_box_sn_1,
          ]);
        }

        if (alarm_box_sn_2) {
          await conn.execute('UPDATE machine SET alarm_box_sn_2 = NULL WHERE alarm_box_sn_2 = ?  OR alarm_box_sn_2 = ?', [
            alarm_box_sn_2,
            alarm_box_sn_2,
          ]);
        }

        const query = `
          UPDATE machine 
          SET machine_id = ?, machine_sn = ?, machine_name_en = ?, alarm_box_sn_1 = ?, alarm_box_sn_2 = ?,  group_name = ?  ${
            imageUrl ? ', machine_image = ?' : ''
          }
          WHERE machine_id = ?
        `;
        const params = imageUrl
          ? [machine_id, machine_sn, machine_name_en, alarm_box_sn_1 || null, alarm_box_sn_2 || null, group_name, imageUrl, machine_id]
          : [machine_id, machine_sn, machine_name_en, alarm_box_sn_1 || null, alarm_box_sn_2 || null, group_name, machine_id];

        await conn.execute(query, params);
      }
      // เพิ่มรายการเครื่องจักร
      else {
        // if (!alarm_box_sn_1) {
        //   return res.status(400).json({ message: 'Serial number 1 is required for new device' });
        // }

        await conn.execute('UPDATE machine SET alarm_box_sn_1 = NULL WHERE alarm_box_sn_1 = ?', [alarm_box_sn_1]);
        await conn.execute('UPDATE machine SET alarm_box_sn_2 = NULL WHERE alarm_box_sn_2 = ?', [alarm_box_sn_2]);

        const insertQuery = `
          INSERT INTO machine (machine_sn, machine_name_en, alarm_box_sn_1, alarm_box_sn_2, group_name, machine_image) 
          VALUES (?, ?, ?, ?, ?, ?)
        `;
        await conn.execute(insertQuery, [machine_sn, machine_name_en, alarm_box_sn_1, alarm_box_sn_2, group_name, imageUrl]);
      }

      await conn.commit();
      res.status(machine_id ? 200 : 201).json({
        message: machine_id ? 'Device updated successfully' : 'Device added successfully',
      });
    } catch (err) {
      await conn.rollback();
      console.error('Database error:', err);
      res.status(500).json({ error: 'Database operation failed', details: err.message });
    } finally {
      conn.release();
      console.log('Database connection closed');
    }
  } catch (error) {
    console.error('Image upload failed:', error);
    res.status(500).json({ error: 'Image upload failed', details: error.message });
  }
});

module.exports = router;
