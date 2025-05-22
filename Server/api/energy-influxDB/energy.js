require('dotenv').config();
const influxApi = require('../../configuration/influxDB');
const pool = require('../../configuration/mysql_db');
const express = require('express');
const router = express.Router();

const dayjs = require('dayjs');
const utc = require('dayjs/plugin/utc');
const timezone = require('dayjs/plugin/timezone');
const weekOfYear = require('dayjs/plugin/weekOfYear');
const isSameOrBefore = require('dayjs/plugin/isSameOrBefore');
const isSameOrAfter = require('dayjs/plugin/isSameOrAfter');
const isisLeapYear = require('dayjs/plugin/isLeapYear');
const dayOfYear = require('dayjs/plugin/dayOfYear');
const customParseFormat = require('dayjs/plugin/customParseFormat');

require('dayjs/locale/th');

dayjs.extend(utc);
dayjs.extend(timezone);
dayjs.extend(weekOfYear);
dayjs.extend(isSameOrBefore);
dayjs.extend(isSameOrAfter);
dayjs.extend(isisLeapYear);
dayjs.extend(dayOfYear);
dayjs.extend(customParseFormat);
dayjs.locale('th'); // กำหนด locale เป็นภาษาไทย
const tz = 'Asia/Bangkok';

const meter_data = require('./meter-data');
router.use('/meter-data', meter_data);

router.post('/meters-lists', async (req, res) => {
  const { meter_type } = req.body;
  try {
    let query = null;
    let result = null;
    if (!meter_type) {
      query = `
      SELECT em.meter_bucket AS bucket, elm.*, wm.*
      FROM energy_meters em
      LEFT JOIN electricity_meters elm ON em.meter_bucket = elm.meter_bucket
      LEFT JOIN water_meters wm ON em.meter_bucket = wm.meter_bucket    
    `;
      [result] = await pool.execute(query);
    } else {
      query = `
      SELECT em.meter_bucket AS bucket, em.*, elm.*, wm.*
      FROM energy_meters em
      LEFT JOIN electricity_meters elm ON em.meter_bucket = elm.meter_bucket
      LEFT JOIN water_meters wm ON em.meter_bucket = wm.meter_bucket
      WHERE meter_type = ?
    `;
      [result] = await pool.execute(query, [meter_type]);
    }

    res.status(200).json(result);
  } catch (error) {
    console.error('Error fetching meter lists:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.get('/test', async (req, res) => {
  console.log('now:', new Date().toISOString());
  try {
    const fluxQuery = `
      from(bucket: "energy-production")
      |> range(start: -1w)
      |> filter(fn: (r) => r["_measurement"] == "device_frmpayload_data_value_4")
      |> filter(fn: (r) => r["_field"] == "value")
      |> last()
    `;

    const results = await influxApi.collectRows(fluxQuery);
    if (results.length === 0) {
      return res.status(404).json({ error: 'Meter not found' });
    }

    res.status(200).json(results);
  } catch (error) {
    console.error('Error fetching meter data:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;
