require('dotenv').config();
const influxApi = require('../Server/configuration/influxDB');
const pool = require('../Server/configuration/mysql_db');
const express = require('express');
const router = express.Router();

const dayjs = require('dayjs');
const utc = require('dayjs/plugin/utc');
const timezone = require('dayjs/plugin/timezone');
const localeData = require('dayjs/plugin/localeData');

// เปิดใช้งาน plugin ตั้งค่าภาษาไทย
require('dayjs/locale/th');

dayjs.extend(utc);
dayjs.extend(timezone);
dayjs.extend(localeData);
dayjs.locale('th'); // กำหนด locale เป็นภาษาไทย
const tz = 'Asia/Bangkok';

async function getWeekDays() {
    // สัปดาห์ปัจจุบัน (จันทร์-อาทิตย์)
  const today = dayjs().tz(tz);
  const currentMonday = today.startOf('week').add(1, 'day').startOf('day');
  const weekDays = Array.from({ length: 7 }, (_, i) => currentMonday.add(i, 'day'));
}

// ดึงข้อมูลมิเตอร์ประจำสัปดาห์
async function getMeterWeeklyData(bucket, sensorId) {
  // วันนี้และ timezone
  const today = dayjs().tz(tz);
  const now = today.format('DD/MM/YYYY');

  // สัปดาห์ปัจจุบัน (จันทร์-อาทิตย์)
  const currentMonday = today.startOf('week').add(1, 'day').startOf('day');
  const weekDays = Array.from({ length: 7 }, (_, i) => currentMonday.add(i, 'day'));

  // สัปดาห์ที่แล้ว (วันอาทิตย์)
  const lastDate = currentMonday.subtract(1, 'day').startOf('day');

  const fluxQuery = `
    from(bucket: "${bucket}")
      |> range(start: ${lastDate.toISOString()}, stop: ${weekDays[6].endOf('day').toISOString()})
      |> filter(fn: (r) => r["_measurement"] == "device_frmpayload_data_value_${sensorId}")
      |> filter(fn: (r) => r["_field"] == "value")
      |> aggregateWindow(every: 1d, fn: last, createEmpty: false)
      |> keep(columns: ["_time", "_value"])
  `;

  const latestQuery = `
    from(bucket: "${bucket}")
    |> range(start: -1mo)
    |> filter(fn: (r) => r["_measurement"] == "device_frmpayload_data_value_${sensorId}")
    |> filter(fn: (r) => r["_field"] == "value")
    |> keep(columns: ["_time", "_value", "_field"])
    |> last()
    |> yield(name: "last")
  `;

  try {
    const [[latestValue], results] = await Promise.all([influxApi.collectRows(latestQuery), influxApi.collectRows(fluxQuery)]);

    // 1. ข้อมูลวันอาทิตย์สัปดาห์ที่แล้ว
    const lastDateData = {
      date: lastDate.format('DD/MM/YYYY'),
      value: results.find((r) => dayjs(r._time).isSame(lastDate, 'day'))?._value || null,
    };

    // 2. เก็บข้อมูลพื้นฐานก่อน (ยังไม่คำนวณผลต่าง)
    const baseData = weekDays.map((day) => {
      const isFuture = day.isAfter(today, 'day');
      const isCurrentDay = day.isSame(today, 'day');

      return {
        date: day.format('DD/MM/YYYY'),
        dayName: day.format('dddd').replace('วัน', ''),
        dayShort: day.format('ddd'),
        value: isFuture ? null : results.find((r) => dayjs(r._time).isSame(day, 'day'))?._value || 0,
        isFuture,
        isCurrentDay,
      };
    });

    // 3. คำนวณผลต่างในลูปแยก
    const meterData = baseData.map((day, index) => {
      let difference = null;

      if (!day.isFuture) {
        if (index === 0) {
          difference = lastDateData.value ? day.value - lastDateData.value : null;
        } else {
          difference = baseData[index - 1].value ? day.value - baseData[index - 1].value : null;
        }
      }

      return {
        ...day,
        difference: difference,
      };
    });

    // 4. สร้างผลลัพธ์
    const response = {
      latestData: {
        timestamp: latestValue?._time ? dayjs(latestValue?._time)?.format('DD/MM/YYYY HH:mm') : "",
        value: latestValue?._value,
      },
      lastData: lastDateData,
      currentDateRange: meterData.map((day) => ({
        day: day.dayName,
        date: day.date,
        value: day.value,
        difference: day.difference,
      })),
    };

    return response;
  } catch (err) {
    console.error('Error executing query', err);
    throw err;
  }
}

router.post('/dashboard/electricity', async (req, res) => {
  try {
    const metersQuery = `
      SELECT em.*, el.active_energy_delivered_total
      FROM energy_meters em
      LEFT JOIN electricity_meters el ON em.meter_bucket = el.meter_bucket
      WHERE em.meter_type = "electricity"
    `;

    const [results] = await pool.execute(metersQuery);

    // วันนี้และ timezone
    const today = dayjs().tz(tz);
    const now = today.format('DD/MM/YYYY');

    // สัปดาห์ปัจจุบัน (จันทร์-อาทิตย์)
    const currentMonday = today.startOf('week').add(1, 'day').startOf('day');
    const weekDays = Array.from({ length: 7 }, (_, i) => currentMonday.add(i, 'day'));

    // ใช้ Promise.all() เพื่อรอให้ทุก Promise ใน map resolve
    const meterData = await Promise.all(
      results.map(async (result) => {
        const meterData = await getMeterWeeklyData(result.meter_bucket, result.active_energy_delivered_total);
        return {
          ...result,
          meterData,
        };
      })
    );

    res.status(200).json({
      today: now,
      dateStart: currentMonday.format('DD/MM/YYYY'),
      dateEnd: weekDays[6].format('DD/MM/YYYY'),
      meterData,
    });
  } catch (err) {
    console.error('Error executing query', err);
    res.status(500).json({
      error: 'An error occurred while fetching production data',
      details: err.message,
    });
  }
});

router.post('/dashboard/water', async (req, res) => {
  try {
    const metersQuery = `
      SELECT em.*, wm.water_usage_unit
      FROM energy_meters em
      LEFT JOIN water_meters wm ON em.meter_bucket = wm.meter_bucket
      WHERE em.meter_type = "water"
    `;

    const [results] = await pool.execute(metersQuery);

    // วันนี้และ timezone
    const today = dayjs().tz(tz);
    const now = today.format('DD/MM/YYYY');

    // สัปดาห์ปัจจุบัน (จันทร์-อาทิตย์)
    const currentMonday = today.startOf('week').add(1, 'day').startOf('day');
    const weekDays = Array.from({ length: 7 }, (_, i) => currentMonday.add(i, 'day'));

    // ใช้ Promise.all() เพื่อรอให้ทุก Promise ใน map resolve
    const meterData = await Promise.all(
      results.map(async (result) => {
        const meterData = await getMeterWeeklyData(result.meter_bucket, result.water_usage_unit);
        return {
          ...result,
          meterData,
        };
      })
    );

    res.status(200).json({
      today: now,
      dateStart: currentMonday.format('DD/MM/YYYY'),
      dateEnd: weekDays[6].format('DD/MM/YYYY'),
      meterData,
    });
  } catch (err) {
    console.error('Error executing query', err);
    res.status(500).json({
      error: 'An error occurred while fetching production data',
      details: err.message,
    });
  }
});

// ข้อมูลประจำสัปดาห์
router.post('/meter-weekly-data', async (req, res) => {
  try {
    const { bucket, sensorId } = req.body;

    const result = await getMeterWeeklyData(bucket, sensorId);
    res.status(200).json(result);
  } catch (err) {
    res.status(500).json({
      message: 'Error fetching data',
      error: err.message,
    });
  }
});

// ข้อมูลประจำเดือน
router.post('/meter-monthly-data', async (req, res) => {
  const { bucket, sensorId } = req.body;

  // ตั้งค่าภาษาไทย
  require('dayjs/locale/th');
  dayjs.locale('th');

  const today = dayjs().tz(tz);
  const currentYear = today.year();

  // กำหนดช่วงเวลาให้ครอบคลุมทั้งปี (ถึงสิ้นเดือนปัจจุบัน)
  const months = Array.from({ length: 12 }, (_, i) => ({
    start: dayjs().tz(tz).year(currentYear).month(i).startOf('month'),
    end: dayjs().tz(tz).year(currentYear).month(i).endOf('month'),
    name: dayjs().month(i).format('MMMM'),
  }));

  // ปรับ stop ให้เป็นสิ้นเดือนปัจจุบัน (แทนที่จะเป็นวันนี้)
  const currentMonthEnd = today.endOf('month');
  const fluxQuery = `
  from(bucket: "${bucket}")
    |> range(start: ${months[0].start.toISOString()}, stop: ${today.toISOString()})
    |> filter(fn: (r) => r["_measurement"] == "device_frmpayload_data_value_${sensorId}")
    |> filter(fn: (r) => r["_field"] == "value")
    |> aggregateWindow(every: 1mo, fn: last, createEmpty: false) // <-- ตั้ง createEmpty: false
`;

  try {
    const results = await influxApi.collectRows(fluxQuery);

    const monthlyData = months.map((month, index) => {
      const isFuture = month.start.isAfter(today, 'month');
      const result = results.find((r) => dayjs(r._time).isSame(month.start, 'month'));

      // ตรวจสอบว่าเป็นเดือนปัจจุบันและยังไม่สิ้นเดือนหรือไม่
      const isCurrentMonth = month.start.isSame(today, 'month');
      const hasPartialData = isCurrentMonth && !today.isSame(month.end, 'day');

      return {
        month: month.name,
        value: isFuture ? null : result?._value || 0,
        isFuture,
        isCurrentMonth,
        hasPartialData, // เพิ่มฟิลด์นี้เพื่อระบุว่าข้อมูลอาจไม่ครบเดือน
      };
    });

    res.status(200).json({
      meta: {
        currentYear,
        currentMonth: today.format('MMMM'),
        asOfDate: today.format('DD/MM/YYYY'),
      },
      data: monthlyData,
    });
  } catch (err) {
    console.error('Error executing query', err);
    res.status(500).json({
      message: 'Error fetching monthly data',
      error: err.message,
    });
  }
});

// ข้อมูลล่าสุด
router.post('/meter-latest', async (req, res) => {
  const { bucket, sensorId } = req.body;

  const fluxQuery = `
    from(bucket: "${bucket}")
      |> range(start: -7d)  // จำกัดช่วงเวลา 7 วันที่ผ่านมาเพื่อประสิทธิภาพ
      |> filter(fn: (r) => r["_measurement"] == "device_frmpayload_data_value_${sensorId}")
      |> filter(fn: (r) => r["_field"] == "value")
      |> sort(columns: ["_time"], desc: true)  // เรียงจากใหม่ไปเก่า
      |> limit(n: 1)  // รับเพียง 1 เรคคอร์ด
      |> keep(columns: ["_time", "_value"])
  `;

  try {
    const results = await influxApi.collectRows(fluxQuery);
    console.log(results);
    if (results.length > 0) {
      const latestData = {
        timestamp: dayjs(results[0]._time).tz(tz).format('DD/MM/YYYY HH:mm:ss'),
        value: results[0]._value,
        dayName: dayjs(results[0]._time).tz(tz).format('dddd').replace('วัน', ''), // ได้ "จันทร์", "อังคาร", ...
      };

      res.status(200).json(latestData);
    } else {
      res.status(404).json({ message: 'No machine groups found' }); // หากไม่มีผลลัพธ์
    }
  } catch (err) {
    console.error('Error executing query', err);
    res.status(500).json({ message: 'An error occurred' });
  }
});

module.exports = router;
