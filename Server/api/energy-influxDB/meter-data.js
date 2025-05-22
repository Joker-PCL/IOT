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
const tz_offset = '16h59m59s'; // กำหนด offset สำหรับการ query ข้อมูล

// API Endpoint
router.post('/', async (req, res) => {
  try {
    const { bucket, sensorId, period = 'daily', range = 'week', startDate, endDate } = req.body;

    // ตรวจสอบพารามิเตอร์ที่จำเป็น
    if (!bucket || !sensorId) {
      return res.status(400).json({
        message: 'Missing required parameters',
        details: 'Both bucket and sensorId are required',
      });
    }

    const fluxQuery = `
    from(bucket: "${bucket}")
      |> range(start: -1mo)
      |> filter(fn: (r) => r["_measurement"] == "device_frmpayload_data_value_${sensorId}")
      |> filter(fn: (r) => r["_field"] == "value")
      |> keep(columns: ["_time", "_value", "_field"])  // แสดงเฉพาะคอลัมน์ที่ต้องการ
      |> last()
      |> yield(name: "last")
  `;

    const [getLastValue] = await influxApi.collectRows(fluxQuery);
    const lastData = getLastValue?._value ?? 0;
    const lastDataDate = getLastValue?._time ? dayjs(getLastValue._time).tz(tz).format('DD/MM/YYYY HH:mm:ss') : 0;

    // ดึงข้อมูลตาม period และ range
    const today = dayjs().tz(tz);
    const { data, meta } = await fetchDataByPeriodAndRange(bucket, sensorId, period, range, today, startDate, endDate);

    res.status(200).json({ meta: { lastData, lastDataDate, ...meta }, data });
  } catch (err) {
    console.error('Error executing query', err);

    // ส่งข้อความ error ที่เป็นมิตรกับผู้ใช้มากขึ้น
    const errorResponse = {
      message: 'Error fetching data',
      error: err.message,
      details: {
        validDateFormats: ['DD/MM/YYYY HH:mm (e.g. 15/04/2025 13:00)', 'YYYY-MM-DDTHH:mm (e.g. 2025-04-15T13:00)', 'ISO 8601 format'],
        exampleRequest: {
          bucket: 'energy-production',
          sensorId: 4,
          period: 'weekly',
          range: 'month',
          startDate: '15/04/2025 13:00',
          endDate: '10/05/2025 12:00',
        },
      },
    };

    res.status(500).json(errorResponse);
  }
});

// ==================== ฟังก์ชันหลัก ====================

/**
 * ดึงข้อมูลตาม period และ range โดยสามารถระบุช่วงเวลาเฉพาะได้
 * @param {string} bucket - ชื่อ bucket ใน InfluxDB
 * @param {number} sensorId - ID ของเซ็นเซอร์
 * @param {string} period - ประเภทช่วงเวลา (daily, weekly, monthly)
 * @param {string} range - ขอบเขตข้อมูล (week, month, year)
 * @param {dayjs.Dayjs} today - วันที่ปัจจุบัน
 * @param {string} [customStart] - วันที่เริ่มต้นแบบกำหนดเอง (ถ้ามี)
 * @param {string} [customEnd] - วันที่สิ้นสุดแบบกำหนดเอง (ถ้ามี)
 * @returns {Promise<{data: any[], meta: object}>}
 */
async function fetchDataByPeriodAndRange(bucket, sensorId, period, range, today, customStart, customEnd) {
  // ตรวจสอบและเตรียมช่วงเวลาที่จะใช้
  const { startDate, endDate } = prepareDateRange(period, range, today, customStart, customEnd);

  // ดึงข้อมูลตาม period ที่ระบุ
  switch (period) {
    case 'daily':
      return await handleDailyData(bucket, sensorId, range, today, startDate, endDate);
    case 'weekly':
      return await handleWeeklyData(bucket, sensorId, range, today, startDate, endDate);
    case 'monthly':
      return await handleMonthlyData(bucket, sensorId, range, today, startDate, endDate);
    default:
      throw new Error('Invalid period');
  }
}

/**
 * เตรียมช่วงเวลาสำหรับการ query ข้อมูล
 */
function prepareDateRange(period, range, today, customStart, customEnd) {
  let startDate, endDate;

  if (customStart || customEnd) {
    // ต้องระบุทั้ง start และ end
    if (!customStart || !customEnd) {
      throw new Error('Both startDate and endDate must be provided when using custom range');
    }

    try {
      startDate = parseCustomDate(customStart);
      endDate = parseCustomDate(customEnd);
    } catch (err) {
      // เพิ่มข้อมูลช่วยแก้ปัญหาใน error message
      throw new Error(
        `${err.message}\n\n` +
          `Common issues:\n` +
          `1. Using wrong separators (should be / or -)\n` +
          `2. Missing leading zeros (use 01 not 1)\n` +
          `3. Invalid time (hours 00-23, minutes 00-59)\n` +
          `4. Using month names (use numbers only)\n\n` +
          `Valid examples:\n` +
          `- "15/04/2025 13:00"\n` +
          `- "2025-04-15T13:00"`
      );
    }

    if (startDate.isAfter(endDate)) {
      throw new Error(`Start date (${startDate.format('DD/MM/YYYY HH:mm')}) ` + `must be before end date (${endDate.format('DD/MM/YYYY HH:mm')})`);
    }
  } else {
    // ใช้ช่วงเวลาตาม period และ range
    // endDate = today.endOf('day');

    switch (range) {
      case 'week':
        startDate = today.startOf('week');
        endDate = today.endOf('week');
        break;
      case 'month':
        startDate = today.startOf('month');
        endDate = today.endOf('month');
        break;
      case 'year':
        startDate = today.startOf('year');
        endDate = today.endOf('year');
        break;
      default:
        throw new Error(`Invalid range: "${range}". Valid values are: week, month, year`);
    }
  }

  return { startDate, endDate };
}
// ฟังก์ชันช่วยแปลงวันที่จากรูปแบบต่างๆ
function parseCustomDate(dateString) {
  if (!dateString) return null;

  // ลองแปลงจากรูปแบบ DD/MM/YYYY HH:mm
  let date = dayjs(dateString, 'DD/MM/YYYY HH:mm', true);
  if (date.isValid()) return date.tz(tz);

  // ลองแปลงจากรูปแบบ YYYY-MM-DDTHH:mm (ISO)
  date = dayjs(dateString, 'YYYY-MM-DDTHH:mm', true);
  if (date.isValid()) return date.tz(tz);

  // ลองแปลงจากรูปแบบอื่นๆ ที่อาจพบ
  const formatsToTry = [
    'DD-MM-YYYY HH:mm',
    'DD.MM.YYYY HH:mm',
    'YYYY/MM/DD HH:mm',
    'DD MMM YYYY HH:mm',
    'MM/DD/YYYY HH:mm', // สำหรับรูปแบบอเมริกัน
  ];

  for (const format of formatsToTry) {
    date = dayjs(dateString, format, true);
    if (date.isValid()) return date.tz(tz);
  }

  // ถ้าไม่สามารถแปลงได้ด้วยรูปแบบใดเลย
  throw new Error(
    `Invalid date format: "${dateString}". ` +
      `Please use "DD/MM/YYYY HH:mm" or "YYYY-MM-DDTHH:mm" format. ` +
      `Example: "15/04/2025 13:00" or "2025-04-15T13:00"`
  );
}

// ==================== ฟังก์ชันสำหรับดึงข้อมูลจาก InfluxDB ====================

/**
 * ดึงข้อมูลจากช่วงเวลาก่อนหน้า (previous period)
 */
async function getPreviousPeriodData(bucket, sensorId, currentDate, periodType) {
  let previousStart, previousStop;

  if (periodType === 'daily') {
    previousStart = currentDate.subtract(1, 'day').startOf('day');
    previousStop = currentDate.subtract(1, 'day').endOf('day');
  } else if (periodType === 'weekly') {
    previousStart = currentDate.subtract(1, 'week').startOf('week');
    previousStop = currentDate.subtract(1, 'week').endOf('week');
  } else if (periodType === 'monthly') {
    previousStart = currentDate.subtract(1, 'month').startOf('month');
    previousStop = currentDate.subtract(1, 'month').endOf('month');
  }

  const fluxQuery = `
    from(bucket: "${bucket}")
      |> range(start: ${previousStart.toISOString()}, stop: ${previousStop.toISOString()})
      |> filter(fn: (r) => r["_measurement"] == "device_frmpayload_data_value_${sensorId}")
      |> filter(fn: (r) => r["_field"] == "value")
      |> last()
  `;

  const results = await influxApi.collectRows(fluxQuery);
  return results[0]?._value || null;
}

// ==================== ฟังก์ชันจัดการข้อมูลรายวัน ====================

async function handleDailyData(bucket, sensorId, range, today, startDate, endDate) {
  switch (range) {
    case 'week':
      return await handleDailyWeekData(bucket, sensorId, today, startDate, endDate);
    case 'month':
      return await handleDailyMonthData(bucket, sensorId, today, startDate, endDate);
    case 'year':
      return await handleDailyYearData(bucket, sensorId, today, startDate, endDate);
    default:
      throw new Error('Invalid range for daily period');
  }
}

async function handleDailyWeekData(bucket, sensorId, today, startDate, endDate) {
  const days = [];
  let currentDay = startDate.startOf('day');

  while (currentDay.isBefore(endDate) || currentDay.isSame(endDate, 'day')) {
    days.push({
      date: currentDay,
      name: currentDay.format('dddd'),
      isFuture: currentDay.isAfter(today, 'day'),
      isToday: currentDay.isSame(today, 'day'),
    });
    currentDay = currentDay.add(1, 'day');
  }

  const fluxQuery = `
    from(bucket: "${bucket}")
      |> range(start: ${startDate.toISOString()}, stop: ${endDate.toISOString()})
      |> filter(fn: (r) => r["_measurement"] == "device_frmpayload_data_value_${sensorId}")
      |> filter(fn: (r) => r["_field"] == "value")
      |> aggregateWindow(every: 1d, fn: last, offset: ${tz_offset}, createEmpty: false)

  `;

  console.log('fluxQuery', fluxQuery);

  const results = await influxApi.collectRows(fluxQuery);
  // console.log('results', results);
  const data = await Promise.all(
    days.map(async (day, index) => {
      const result = results.find((r) => dayjs(r._time).isSame(day.date, 'day'));
      const currentValue = day.isFuture ? null : result?._value || null;
      let prevValue = null;

      let difference = null;
      if (!day.isFuture && currentValue !== null) {
        if (index === 0) {
          prevValue = await getPreviousPeriodData(bucket, sensorId, day.date, 'daily');
          difference = currentValue ? currentValue - prevValue : null;
        } else {
          const prevDay = days[index - 1];
          if (!prevDay.isFuture) {
            const prevDayResult = results.find((r) => dayjs(r._time).isSame(prevDay.date, 'day'));
            prevValue = prevDayResult?._value || null;
            difference = currentValue ? currentValue - prevValue : null;
          }
        }

        // console.log('prevValue', index, currentValue, prevValue, difference);
      }

      // console.log('results', prevValue, currentValue, difference);

      return {
        day: day.name,
        date: day.date.format('DD/MM/YYYY'),
        currentValue,
        prevValue,
        difference,
        isToday: day.isToday,
      };
    })
  );

  const meta = {
    period: 'daily',
    range: 'week',
    weekOfYear: today.week(),
    asOfDate: today.format('DD/MM/YYYY'),
    customRange: isCustomRange(startDate, endDate, today, 'week'),
    startDate: startDate.format('DD/MM/YYYY'),
    endDate: endDate.format('DD/MM/YYYY'),
  };

  return { data, meta };
}

async function handleDailyMonthData(bucket, sensorId, today, startDate, endDate) {
  const days = [];
  let currentDay = startDate.startOf('day');

  while (currentDay.isBefore(endDate) || currentDay.isSame(endDate, 'day')) {
    days.push({
      date: currentDay,
      dayOfMonth: currentDay.date(),
      isFuture: currentDay.isAfter(today, 'day'),
      isToday: currentDay.isSame(today, 'day'),
    });
    currentDay = currentDay.add(1, 'day');
  }

  const fluxQuery = `
    from(bucket: "${bucket}")
      |> range(start: ${startDate.toISOString()}, stop: ${endDate.toISOString()})
      |> filter(fn: (r) => r["_measurement"] == "device_frmpayload_data_value_${sensorId}")
      |> filter(fn: (r) => r["_field"] == "value")
      |> aggregateWindow(every: 1d, fn: last, offset: ${tz_offset}, createEmpty: false)
  `;

  const results = await influxApi.collectRows(fluxQuery);

  const data = await Promise.all(
    days.map(async (day, index) => {
      const result = results.find((r) => dayjs(r._time).isSame(day.date, 'day'));
      const currentValue = day.isFuture ? null : result?._value || null;

      let prevValue,
        difference = null;
      if (!day.isFuture) {
        if (index === 0) {
          prevValue = await getPreviousPeriodData(bucket, sensorId, day.date, 'daily');
          difference = currentValue ? currentValue - prevValue : null;
        } else {
          const prevDayResult = results.find((r) => dayjs(r._time).isSame(days[index - 1].date, 'day'));
          prevValue = prevDayResult?._value || null;
          difference = currentValue ? currentValue - prevValue : null;
        }
      }

      return {
        day: day.date.format('DD/MM/YY'),
        dayOfMonth: day.dayOfMonth,
        currentValue,
        prevValue,
        difference,
        isFuture: day.isFuture,
        isToday: day.isToday,
      };
    })
  );

  const meta = {
    period: 'daily',
    range: 'month',
    month: today.format('MMMM'),
    asOfDate: today.format('DD/MM/YYYY'),
    customRange: isCustomRange(startDate, endDate, today, 'month'),
    startDate: startDate.format('DD/MM/YYYY'),
    endDate: endDate.format('DD/MM/YYYY'),
  };

  return { data, meta };
}

async function handleDailyYearData(bucket, sensorId, today, startDate, endDate) {
  const days = [];
  let currentDay = startDate.startOf('day');

  while (currentDay.isBefore(endDate) || currentDay.isSame(endDate, 'day')) {
    days.push({
      date: currentDay,
      isFuture: currentDay.isAfter(today, 'day'),
      isToday: currentDay.isSame(today, 'day'),
    });
    currentDay = currentDay.add(1, 'day');
  }

  const fluxQuery = `
    from(bucket: "${bucket}")
      |> range(start: ${startDate.toISOString()}, stop: ${endDate.toISOString()})
      |> filter(fn: (r) => r["_measurement"] == "device_frmpayload_data_value_${sensorId}")
      |> filter(fn: (r) => r["_field"] == "value")
      |> aggregateWindow(every: 1d, fn: last, offset: ${tz_offset}, createEmpty: false)
  `;

  const results = await influxApi.collectRows(fluxQuery);

  const data = await Promise.all(
    days.map(async (day, index) => {
      const result = results.find((r) => dayjs(r._time).isSame(day.date, 'day'));
      const currentValue = day.isFuture ? null : result?._value || null;

      let prevValue,
        difference = null;
      if (!day.isFuture) {
        if (index === 0) {
          prevValue = await getPreviousPeriodData(bucket, sensorId, day.date, 'daily');
          difference = currentValue ? currentValue - prevValue : null;
        } else {
          const prevDayResult = results.find((r) => dayjs(r._time).isSame(days[index - 1].date, 'day'));
          prevValue = prevDayResult?._value || null;
          difference = currentValue ? currentValue - prevValue : null;
        }
      }

      return {
        day: day.date.format('DD/MM/YY'),
        dayOfYear: day.date.dayOfYear(),
        currentValue,
        prevValue,
        difference,
        isFuture: day.isFuture,
        isToday: day.isToday,
      };
    })
  );

  const meta = {
    period: 'daily',
    range: 'year',
    year: today.year(),
    asOfDate: today.format('DD/MM/YYYY'),
    customRange: isCustomRange(startDate, endDate, today, 'year'),
    startDate: startDate.format('DD/MM/YYYY'),
    endDate: endDate.format('DD/MM/YYYY'),
  };

  return { data, meta };
}

// ==================== ฟังก์ชันจัดการข้อมูลรายสัปดาห์ ====================

async function handleWeeklyData(bucket, sensorId, range, today, startDate, endDate) {
  if (range === 'month') {
    return await handleWeeklyMonthData(bucket, sensorId, today, startDate, endDate);
  }
  throw new Error('Invalid range for weekly period');
}

async function handleWeeklyMonthData(bucket, sensorId, today, startDate, endDate) {
  const weeks = [];
  let currentWeekStart = startDate.startOf('week');

  while (currentWeekStart.isBefore(endDate)) {
    const currentWeekEnd = currentWeekStart.endOf('week');
    const weekOfMonth = Math.ceil(currentWeekStart.date() / 7);

    weeks.push({
      start: currentWeekStart,
      end: currentWeekEnd,
      weekOfMonth,
      weekOfYear: currentWeekStart.week(),
      isFuture: currentWeekStart.isAfter(today, 'week'),
      isCurrentWeek: currentWeekStart.isSame(today, 'week'),
    });

    currentWeekStart = currentWeekStart.add(1, 'week').startOf('week');
  }

  const fluxQuery = `
    from(bucket: "${bucket}")
      |> range(start: ${startDate.toISOString()}, stop: ${endDate.toISOString()})
      |> filter(fn: (r) => r["_measurement"] == "device_frmpayload_data_value_${sensorId}")
      |> filter(fn: (r) => r["_field"] == "value")
      |> aggregateWindow(every: 1w, fn: last, offset: ${tz_offset}, createEmpty: false)
  `;

  const results = await influxApi.collectRows(fluxQuery);

  const data = await Promise.all(
    weeks.map(async (week, index) => {
      const result = results.find((r) => dayjs(r._time).isSame(week.start, 'week'));
      const currentValue = week.isFuture ? null : result?._value || null;

      let prevValue,
        difference = null;
      if (!week.isFuture) {
        if (index === 0) {
          prevValue = await getPreviousPeriodData(bucket, sensorId, week.start, 'weekly');
          difference = currentValue ? currentValue - prevValue : null;
        } else {
          const prevWeekResult = results.find((r) => dayjs(r._time).isSame(weeks[index - 1].start, 'week'));
          prevValue = prevWeekResult?._value || null;
          difference = currentValue ? currentValue - prevValue : null;
        }
      }

      return {
        weekOfMonth: `Week ${week.weekOfMonth}`,
        weekOfYear: `Week ${week.weekOfYear}`,
        range: `${week.start.format('DD/MM')} - ${week.end.format('DD/MM')}`,
        currentValue,
        prevValue,
        difference,
        isFuture: week.isFuture,
        isCurrentWeek: week.isCurrentWeek,
      };
    })
  );

  const meta = {
    period: 'weekly',
    range: 'month',
    day: today.format('DD/MM/YY'),
    month: today.format('MMMM'),
    year: today.year(),
    asOfDate: today.format('DD/MM/YYYY'),
    customRange: isCustomRange(startDate, endDate, today, 'month'),
    startDate: startDate.format('DD/MM/YYYY'),
    endDate: endDate.format('DD/MM/YYYY'),
  };

  return { data, meta };
}

// ==================== ฟังก์ชันจัดการข้อมูลรายเดือน ====================

async function handleMonthlyData(bucket, sensorId, range, today, startDate, endDate) {
  if (range === 'year') {
    return await handleMonthlyYearData(bucket, sensorId, today, startDate, endDate);
  }
  throw new Error('Invalid range for monthly period');
}

async function handleMonthlyYearData(bucket, sensorId, today, startDate, endDate) {
  const months = [];
  let currentMonth = startDate.startOf('month');

  while (currentMonth.isBefore(endDate)) {
    months.push({
      start: currentMonth,
      end: currentMonth.endOf('month'),
      name: currentMonth.format('MMMM'),
      isFuture: currentMonth.isAfter(today, 'month'),
      isCurrentMonth: currentMonth.isSame(today, 'month'),
    });
    currentMonth = currentMonth.add(1, 'month').startOf('month');
  }

  const fluxQuery = `
    from(bucket: "${bucket}")
      |> range(start: ${startDate.toISOString()}, stop: ${endDate.toISOString()})
      |> filter(fn: (r) => r["_measurement"] == "device_frmpayload_data_value_${sensorId}")
      |> filter(fn: (r) => r["_field"] == "value")
      |> aggregateWindow(every: 1mo, fn: last, offset: ${tz_offset}, createEmpty: false)
  `;

  const results = await influxApi.collectRows(fluxQuery);

  const data = await Promise.all(
    months.map(async (month, index) => {
      const result = results.find((r) => dayjs(r._time).isSame(month.start, 'month'));
      const currentValue = month.isFuture ? null : result?._value || null;
      const hasPartialData = month.isCurrentMonth && !today.isSame(month.end, 'day');

      let prevValue,
        difference = null;

      if (!month.isFuture) {
        if (index === 0) {
          prevValue = await getPreviousPeriodData(bucket, sensorId, month.start, 'monthly');
          difference = currentValue ? currentValue - prevValue : null;
        } else {
          const prevMonthResult = results.find((r) => dayjs(r._time).isSame(months[index - 1].start, 'month'));
          prevValue = prevMonthResult?._value || null;
          difference = currentValue ? currentValue - prevValue : null;
        }
      }

      return {
        day: month.name,
        month: month.name,
        currentValue,
        prevValue,
        difference,
        isFuture: month.isFuture,
        isCurrentMonth: month.isCurrentMonth,
        hasPartialData,
      };
    })
  );

  const meta = {
    period: 'monthly',
    range: 'year',
    year: today.year(),
    currentMonth: today.format('MMMM'),
    asOfDate: today.format('DD/MM/YYYY'),
    customRange: isCustomRange(startDate, endDate, today, 'year'),
    startDate: startDate.format('DD/MM/YYYY'),
    endDate: endDate.format('DD/MM/YYYY'),
  };

  return { data, meta };
}

// ==================== Utilities ====================

/**
 * ตรวจสอบว่าเป็นช่วงเวลาแบบกำหนดเองหรือไม่
 */
function isCustomRange(startDate, endDate, today, range) {
  const defaultStart = today.startOf(range);
  const defaultEnd = today.endOf(range === 'week' ? 'week' : range === 'month' ? 'month' : 'year');

  return !startDate.isSame(defaultStart) || !endDate.isSame(defaultEnd)
    ? {
        start: startDate.format('DD/MM/YYYY HH:mm'),
        end: endDate.format('DD/MM/YYYY HH:mm'),
      }
    : undefined;
}

module.exports = router;
