require('dotenv').config();
const influxApi = require('../Server/configuration/influxDB');
const pool = require('../Server/configuration/mysql_db');
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

require('dayjs/locale/th');

dayjs.extend(utc);
dayjs.extend(timezone);
dayjs.extend(weekOfYear);
dayjs.extend(isSameOrBefore);
dayjs.extend(isSameOrAfter);
dayjs.extend(isisLeapYear);
dayjs.extend(dayOfYear);
dayjs.locale('th'); // กำหนด locale เป็นภาษาไทย
const tz = 'Asia/Bangkok';

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
      |> range(start: ${lastDate.toISOString()}, stop: ${today.toISOString()})
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
        timestamp: latestValue?._time ? dayjs(latestValue?._time)?.format('DD/MM/YYYY HH:mm') : '',
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

router.post('/meter-data', async (req, res) => {
  const { bucket, sensorId, period, range } = req.body;

  const today = dayjs().tz(tz);
  const currentYear = today.year();
  const currentMonth = today.month();
  const currentWeek = today.week();

  try {
    let data, meta;

    // Determine the query parameters based on period and range
    switch (period) {
      case 'daily':
        if (range === 'week') {
          // Daily data for current week
          const weekStart = today.startOf('week');
          const days = Array.from({ length: 7 }, (_, i) => ({
            date: weekStart.add(i, 'day'),
            name: weekStart.add(i, 'day').format('dddd'),
          }));

          const fluxQuery = `
            from(bucket: "${bucket}")
              |> range(start: ${weekStart.toISOString()}, stop: ${today.endOf('day').toISOString()})
              |> filter(fn: (r) => r["_measurement"] == "device_frmpayload_data_value_${sensorId}")
              |> filter(fn: (r) => r["_field"] == "value")
              |> aggregateWindow(every: 1d, fn: last, createEmpty: false)
          `;

          const results = await influxApi.collectRows(fluxQuery);

          data = days.map((day) => {
            const result = results.find((r) => dayjs(r._time).isSame(day.date, 'day'));
            return {
              day: day.name,
              date: day.date.format('DD/MM'),
              value: result?._value || 0,
              isToday: day.date.isSame(today, 'day'),
            };
          });

          meta = {
            period: ' ',
            range: 'week',
            weekNumber: currentWeek,
            asOfDate: today.format('DD/MM/YYYY'),
          };
        } else if (range === 'month') {
          // Daily data for current month
          const monthStart = today.startOf('month');
          const daysInMonth = today.daysInMonth();
          const days = Array.from({ length: daysInMonth }, (_, i) => ({
            date: monthStart.add(i, 'day'),
            dayOfMonth: i + 1,
          }));

          const fluxQuery = `
            from(bucket: "${bucket}")
              |> range(start: ${monthStart.toISOString()}, stop: ${today.endOf('day').toISOString()})
              |> filter(fn: (r) => r["_measurement"] == "device_frmpayload_data_value_${sensorId}")
              |> filter(fn: (r) => r["_field"] == "value")
              |> aggregateWindow(every: 1d, fn: last, createEmpty: false)
          `;

          const results = await influxApi.collectRows(fluxQuery);

          data = days.map((day) => {
            const result = results.find((r) => dayjs(r._time).isSame(day.date, 'day'));
            const isFuture = day.date.isAfter(today, 'day');
            return {
              day: day.date.format('DD/MM'),
              dayOfMonth: day.dayOfMonth,
              value: isFuture ? null : result?._value || 0,
              isFuture,
              isToday: day.date.isSame(today, 'day'),
            };
          });

          meta = {
            period: 'daily',
            range: 'month',
            month: today.format('MMMM'),
            asOfDate: today.format('DD/MM/YYYY'),
          };
        } else if (range === 'year') {
          // Daily data for current year (might be too much data - consider pagination)
          const yearStart = today.startOf('year');
          const daysInYear = today.isLeapYear() ? 366 : 365;
          const days = Array.from({ length: daysInYear }, (_, i) => ({
            date: yearStart.add(i, 'day'),
          }));

          const fluxQuery = `
            from(bucket: "${bucket}")
              |> range(start: ${yearStart.toISOString()}, stop: ${today.endOf('day').toISOString()})
              |> filter(fn: (r) => r["_measurement"] == "device_frmpayload_data_value_${sensorId}")
              |> filter(fn: (r) => r["_field"] == "value")
              |> aggregateWindow(every: 1d, fn: last, createEmpty: false)
          `;

          const results = await influxApi.collectRows(fluxQuery);

          data = days.map((day) => {
            const result = results.find((r) => dayjs(r._time).isSame(day.date, 'day'));
            const isFuture = day.date.isAfter(today, 'day');
            return {
              date: day.date.format('DD/MM'),
              dayOfYear: day.date.dayOfYear(),
              value: isFuture ? null : result?._value || 0,
              isFuture,
              isToday: day.date.isSame(today, 'day'),
            };
          });

          meta = {
            period: 'daily',
            range: 'year',
            year: currentYear,
            asOfDate: today.format('DD/MM/YYYY'),
          };
        }
        break;

      case 'weekly':
        if (range === 'month') {
          // Weekly data for current month
          const monthStart = today.startOf('month');
          const weeksInMonth = Math.ceil((monthStart.daysInMonth() + monthStart.day()) / 7);
          const weeks = Array.from({ length: weeksInMonth }, (_, i) => ({
            start: monthStart.add(i, 'week').startOf('week'),
            end: monthStart.add(i, 'week').endOf('week'),
            weekNumber: monthStart.add(i, 'week').week(),
          }));

          const fluxQuery = `
            from(bucket: "${bucket}")
              |> range(start: ${monthStart.toISOString()}, stop: ${today.endOf('day').toISOString()})
              |> filter(fn: (r) => r["_measurement"] == "device_frmpayload_data_value_${sensorId}")
              |> filter(fn: (r) => r["_field"] == "value")
              |> aggregateWindow(every: 1w, fn: last, createEmpty: false)
          `;

          const results = await influxApi.collectRows(fluxQuery);

          data = weeks.map((week) => {
            const result = results.find((r) => dayjs(r._time).isSame(week.start, 'week'));
            const isFuture = week.start.isAfter(today, 'week');
            const isCurrentWeek = week.start.isSame(today, 'week');
            return {
              week: `Week ${week.weekNumber}`,
              range: `${week.start.format('DD/MM')} - ${week.end.format('DD/MM')}`,
              value: isFuture ? null : result?._value || 0,
              isFuture,
              isCurrentWeek,
            };
          });

          meta = {
            period: 'weekly',
            range: 'month',
            month: today.format('MMMM'),
            asOfDate: today.format('DD/MM/YYYY'),
          };
        }
        break;

      case 'monthly':
        if (range === 'year') {
          // Monthly data for current year (your original implementation)
          const months = Array.from({ length: 12 }, (_, i) => ({
            start: dayjs().tz(tz).year(currentYear).month(i).startOf('month'),
            end: dayjs().tz(tz).year(currentYear).month(i).endOf('month'),
            name: dayjs().month(i).format('MMMM'),
          }));

          const fluxQuery = `
            from(bucket: "${bucket}")
              |> range(start: ${months[0].start.toISOString()}, stop: ${today.endOf('month').toISOString()})
              |> filter(fn: (r) => r["_measurement"] == "device_frmpayload_data_value_${sensorId}")
              |> filter(fn: (r) => r["_field"] == "value")
              |> aggregateWindow(every: 1mo, fn: last, createEmpty: false)
          `;

          const results = await influxApi.collectRows(fluxQuery);

          data = months.map((month, index) => {
            const isFuture = month.start.isAfter(today, 'month');
            const result = results.find((r) => dayjs(r._time).isSame(month.start, 'month'));
            const isCurrentMonth = month.start.isSame(today, 'month');
            const hasPartialData = isCurrentMonth && !today.isSame(month.end, 'day');

            return {
              month: month.name,
              value: isFuture ? null : result?._value || 0,
              isFuture,
              isCurrentMonth,
              hasPartialData,
            };
          });

          meta = {
            period: 'monthly',
            range: 'year',
            currentYear,
            currentMonth: today.format('MMMM'),
            asOfDate: today.format('DD/MM/YYYY'),
          };
        }
        break;

      default:
        throw new Error('Invalid period or range combination');
    }

    res.status(200).json({
      meta,
      data,
    });
  } catch (err) {
    console.error('Error executing query', err);
    res.status(500).json({
      message: 'Error fetching data',
      error: err.message,
    });
  }
});

router.post('/meter-delta-data', async (req, res) => {
  const { bucket, sensorId, period, range } = req.body;

  const today = dayjs().tz(tz);
  const currentYear = today.year();
  const currentMonth = today.month();
  const currentWeek = today.week();

  try {
    let data, meta;

    // Function to get previous period data for comparison
    const getPreviousPeriodData = async (currentDate, periodType) => {
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
      return results[0]?._value || 0;
    };

    // Determine the query parameters based on period and range
    switch (period) {
      case 'daily':
      case 'daily':
        if (range === 'week') {
          const weekStart = today.startOf('week');
          const days = Array.from({ length: 7 }, (_, i) => ({
            date: weekStart.add(i, 'day'),
            name: weekStart.add(i, 'day').format('dddd'),
          }));

          const fluxQuery = `
      from(bucket: "${bucket}")
        |> range(start: ${weekStart.toISOString()}, stop: ${today.endOf('day').toISOString()})
        |> filter(fn: (r) => r["_measurement"] == "device_frmpayload_data_value_${sensorId}")
        |> filter(fn: (r) => r["_field"] == "value")
        |> aggregateWindow(every: 1d, fn: last, createEmpty: false)
    `;

          const results = await influxApi.collectRows(fluxQuery);

          data = await Promise.all(
            days.map(async (day, index) => {
              const isFuture = day.date.isAfter(today, 'day');
              const result = results.find((r) => dayjs(r._time).isSame(day.date, 'day'));
              const currentValue = isFuture ? null : result?._value || null;

              let difference = null;
              if (!isFuture && currentValue !== null) {
                if (index === 0) {
                  // For first day of week, compare with last day of previous week
                  const prevValue = await getPreviousPeriodData(day.date, 'daily');
                  difference = prevValue !== null ? currentValue - prevValue : null;
                } else {
                  const prevDay = days[index - 1];
                  const isPrevFuture = prevDay.date.isAfter(today, 'day');
                  if (!isPrevFuture) {
                    const prevDayResult = results.find((r) => dayjs(r._time).isSame(prevDay.date, 'day'));
                    const prevValue = prevDayResult?._value || null;
                    difference = prevValue !== null ? currentValue - prevValue : null;
                  }
                }
              }

              return {
                day: day.name,
                date: day.date.format('DD/MM/YYYY'),
                value: currentValue,
                difference: difference,
                isToday: day.date.isSame(today, 'day'),
              };
            })
          );

          meta = {
            period,
            range,
            weekNumber: currentWeek,
            asOfDate: today.format('DD/MM/YYYY'),
          };
        } else if (range === 'month') {
          const monthStart = today.startOf('month');
          const daysInMonth = today.daysInMonth();
          const days = Array.from({ length: daysInMonth }, (_, i) => ({
            date: monthStart.add(i, 'day'),
            dayOfMonth: i + 1,
          }));

          const fluxQuery = `
            from(bucket: "${bucket}")
              |> range(start: ${monthStart.toISOString()}, stop: ${today.endOf('day').toISOString()})
              |> filter(fn: (r) => r["_measurement"] == "device_frmpayload_data_value_${sensorId}")
              |> filter(fn: (r) => r["_field"] == "value")
              |> aggregateWindow(every: 1d, fn: last, createEmpty: false)
          `;

          const results = await influxApi.collectRows(fluxQuery);

          data = await Promise.all(
            days.map(async (day, index) => {
              const result = results.find((r) => dayjs(r._time).isSame(day.date, 'day'));
              const isFuture = day.date.isAfter(today, 'day');
              const currentValue = isFuture ? null : result?._value || 0;

              let difference = null;
              if (!isFuture) {
                if (index === 0) {
                  // For first day of month, compare with last day of previous month
                  const prevValue = await getPreviousPeriodData(day.date, 'daily');
                  difference = currentValue - prevValue;
                } else {
                  const prevDayResult = results.find((r) => dayjs(r._time).isSame(days[index - 1].date, 'day'));
                  const prevValue = prevDayResult?._value || 0;
                  difference = currentValue - prevValue;
                }
              }

              return {
                day: day.date.format('DD/MM'),
                dayOfMonth: day.dayOfMonth,
                value: currentValue,
                difference,
                isFuture,
                isToday: day.date.isSame(today, 'day'),
              };
            })
          );

          meta = {
            period,
            range,
            month: today.format('MMMM'),
            asOfDate: today.format('DD/MM/YYYY'),
          };
        } else if (range === 'year') {
          const yearStart = today.startOf('year');
          const daysInYear = today.isLeapYear() ? 366 : 365;
          const days = Array.from({ length: daysInYear }, (_, i) => ({
            date: yearStart.add(i, 'day'),
          }));

          const fluxQuery = `
            from(bucket: "${bucket}")
              |> range(start: ${yearStart.toISOString()}, stop: ${today.endOf('day').toISOString()})
              |> filter(fn: (r) => r["_measurement"] == "device_frmpayload_data_value_${sensorId}")
              |> filter(fn: (r) => r["_field"] == "value")
              |> aggregateWindow(every: 1d, fn: last, createEmpty: false)
          `;

          const results = await influxApi.collectRows(fluxQuery);

          data = await Promise.all(
            days.map(async (day, index) => {
              const result = results.find((r) => dayjs(r._time).isSame(day.date, 'day'));
              const isFuture = day.date.isAfter(today, 'day');
              const currentValue = isFuture ? null : result?._value || 0;

              let difference = null;
              if (!isFuture) {
                if (index === 0) {
                  // For first day of year, compare with last day of previous year
                  const prevValue = await getPreviousPeriodData(day.date, 'daily');
                  difference = currentValue - prevValue;
                } else {
                  const prevDayResult = results.find((r) => dayjs(r._time).isSame(days[index - 1].date, 'day'));
                  const prevValue = prevDayResult?._value || 0;
                  difference = currentValue - prevValue;
                }
              }

              return {
                date: day.date.format('DD/MM'),
                dayOfYear: day.date.dayOfYear(),
                value: currentValue,
                difference,
                isFuture,
                isToday: day.date.isSame(today, 'day'),
              };
            })
          );

          meta = {
            period,
            range,
            year: currentYear,
            asOfDate: today.format('DD/MM/YYYY'),
          };
        }
        break;

      case 'weekly':
        if (range === 'month') {
          const monthStart = today.startOf('month');
          const weeksInMonth = Math.ceil((monthStart.daysInMonth() + monthStart.day()) / 7);
          const weeks = Array.from({ length: weeksInMonth }, (_, i) => ({
            start: monthStart.add(i, 'week').startOf('week'),
            end: monthStart.add(i, 'week').endOf('week'),
            weekNumber: monthStart.add(i, 'week').week(),
          }));

          const fluxQuery = `
            from(bucket: "${bucket}")
              |> range(start: ${monthStart.toISOString()}, stop: ${today.endOf('day').toISOString()})
              |> filter(fn: (r) => r["_measurement"] == "device_frmpayload_data_value_${sensorId}")
              |> filter(fn: (r) => r["_field"] == "value")
              |> aggregateWindow(every: 1w, fn: last, createEmpty: false)
          `;

          const results = await influxApi.collectRows(fluxQuery);

          data = await Promise.all(
            weeks.map(async (week, index) => {
              const result = results.find((r) => dayjs(r._time).isSame(week.start, 'week'));
              const isFuture = week.start.isAfter(today, 'week');
              const isCurrentWeek = week.start.isSame(today, 'week');
              const currentValue = isFuture ? null : result?._value || 0;

              let difference = null;
              if (!isFuture) {
                if (index === 0) {
                  // For first week of month, compare with last week of previous month
                  const prevValue = await getPreviousPeriodData(week.start, 'weekly');
                  difference = currentValue - prevValue;
                } else {
                  const prevWeekResult = results.find((r) => dayjs(r._time).isSame(weeks[index - 1].start, 'week'));
                  const prevValue = prevWeekResult?._value || 0;
                  difference = currentValue - prevValue;
                }
              }

              return {
                week: `Week ${week.weekNumber}`,
                range: `${week.start.format('DD/MM')} - ${week.end.format('DD/MM')}`,
                value: currentValue,
                difference,
                isFuture,
                isCurrentWeek,
              };
            })
          );

          meta = {
            period,
            range,
            month: today.format('MMMM'),
            asOfDate: today.format('DD/MM/YYYY'),
          };
        }
        break;

      case 'monthly':
        if (range === 'year') {
          const months = Array.from({ length: 12 }, (_, i) => ({
            start: dayjs().tz(tz).year(currentYear).month(i).startOf('month'),
            end: dayjs().tz(tz).year(currentYear).month(i).endOf('month'),
            name: dayjs().month(i).format('MMMM'),
          }));

          const fluxQuery = `
            from(bucket: "${bucket}")
              |> range(start: ${months[0].start.toISOString()}, stop: ${today.endOf('month').toISOString()})
              |> filter(fn: (r) => r["_measurement"] == "device_frmpayload_data_value_${sensorId}")
              |> filter(fn: (r) => r["_field"] == "value")
              |> aggregateWindow(every: 1mo, fn: last, createEmpty: false)
          `;

          const results = await influxApi.collectRows(fluxQuery);

          data = await Promise.all(
            months.map(async (month, index) => {
              const isFuture = month.start.isAfter(today, 'month');
              const result = results.find((r) => dayjs(r._time).isSame(month.start, 'month'));
              const isCurrentMonth = month.start.isSame(today, 'month');
              const hasPartialData = isCurrentMonth && !today.isSame(month.end, 'day');
              const currentValue = isFuture ? null : result?._value || 0;

              let difference = null;
              if (!isFuture) {
                if (index === 0) {
                  // For first month of year, compare with last month of previous year
                  const prevValue = await getPreviousPeriodData(month.start, 'monthly');
                  difference = currentValue - prevValue;
                } else {
                  const prevMonthResult = results.find((r) => dayjs(r._time).isSame(months[index - 1].start, 'month'));
                  const prevValue = prevMonthResult?._value || 0;
                  difference = currentValue - prevValue;
                }
              }

              return {
                month: month.name,
                value: currentValue,
                difference,
                isFuture,
                isCurrentMonth,
                hasPartialData,
              };
            })
          );

          meta = {
            period,
            range,
            currentYear,
            currentMonth: today.format('MMMM'),
            asOfDate: today.format('DD/MM/YYYY'),
          };
        }
        break;

      default:
        throw new Error('Invalid period or range combination');
    }

    res.status(200).json({
      meta,
      data,
    });
  } catch (err) {
    console.error('Error executing query', err);
    res.status(500).json({
      message: 'Error fetching data',
      error: err.message,
    });
  }
});

router.post('/meter-delta-data2', async (req, res) => {
  // รับพารามิเตอร์จาก request body
  const { bucket, sensorId, period, range } = req.body;

  // ตั้งค่าวันที่และเวลาปัจจุบันตาม timezone
  const today = dayjs().tz(tz);
  const currentYear = today.year();
  const currentMonth = today.month();
  const currentWeek = today.week();

  try {
    let data, meta;

    // ฟังก์ชันสำหรับดึงข้อมูลจากช่วงเวลาก่อนหน้า (previous period)
    const getPreviousPeriodData = async (currentDate, periodType) => {
      let previousStart, previousStop;

      // กำหนดช่วงเวลาสำหรับการค้นหาข้อมูลก่อนหน้า
      if (periodType === 'daily') {
        // กรณีรายวัน: ดึงข้อมูลของวันก่อนหน้า
        previousStart = currentDate.subtract(1, 'day').startOf('day');
        previousStop = currentDate.subtract(1, 'day').endOf('day');
      } else if (periodType === 'weekly') {
        // กรณีรายสัปดาห์: ดึงข้อมูลของสัปดาห์ก่อนหน้า
        previousStart = currentDate.subtract(1, 'week').startOf('week');
        previousStop = currentDate.subtract(1, 'week').endOf('week');
      } else if (periodType === 'monthly') {
        // กรณีรายเดือน: ดึงข้อมูลของเดือนก่อนหน้า
        previousStart = currentDate.subtract(1, 'month').startOf('month');
        previousStop = currentDate.subtract(1, 'month').endOf('month');
      }

      // สร้างคำสั่ง Flux Query สำหรับดึงข้อมูลจาก InfluxDB
      const fluxQuery = `
        from(bucket: "${bucket}")
          |> range(start: ${previousStart.toISOString()}, stop: ${previousStop.toISOString()})
          |> filter(fn: (r) => r["_measurement"] == "device_frmpayload_data_value_${sensorId}")
          |> filter(fn: (r) => r["_field"] == "value")
          |> last()
      `;

      // ดึงข้อมูลจาก InfluxDB
      const results = await influxApi.collectRows(fluxQuery);
      return results[0]?._value || 0;
    };

    // กำหนดการทำงานตาม period และ range ที่รับมา
    switch (period) {
      case 'daily':
        // กรณีแสดงข้อมูลรายวัน
        if (range === 'week') {
          // แสดงข้อมูลรายวันสำหรับสัปดาห์ปัจจุบัน
          const weekStart = today.startOf('week');
          const days = Array.from({ length: 7 }, (_, i) => ({
            date: weekStart.add(i, 'day'),
            name: weekStart.add(i, 'day').format('dddd'),
          }));

          // สร้างคำสั่ง Flux Query สำหรับดึงข้อมูลรายวัน
          const fluxQuery = `
            from(bucket: "${bucket}")
              |> range(start: ${weekStart.toISOString()}, stop: ${today.endOf('day').toISOString()})
              |> filter(fn: (r) => r["_measurement"] == "device_frmpayload_data_value_${sensorId}")
              |> filter(fn: (r) => r["_field"] == "value")
              |> aggregateWindow(every: 1d, fn: last, createEmpty: false)
          `;

          const results = await influxApi.collectRows(fluxQuery);

          // ประมวลผลข้อมูลแต่ละวัน
          data = await Promise.all(
            days.map(async (day, index) => {
              // ตรวจสอบว่าเป็นวันในอนาคตหรือไม่
              const isFuture = day.date.isAfter(today, 'day');
              // ค้นหาข้อมูลสำหรับวันนี้
              const result = results.find((r) => dayjs(r._time).isSame(day.date, 'day'));
              // กำหนดค่าปัจจุบัน (null ถ้าเป็นวันในอนาคต)
              const currentValue = isFuture ? null : result?._value || null;

              let difference = null;
              if (!isFuture && currentValue !== null) {
                if (index === 0) {
                  // วันแรกของสัปดาห์: เปรียบเทียบกับวันสุดท้ายของสัปดาห์ก่อนหน้า
                  const prevValue = await getPreviousPeriodData(day.date, 'daily');
                  difference = prevValue !== null ? currentValue - prevValue : null;
                } else {
                  // วันที่ไม่ใช่วันแรก: เปรียบเทียบกับวันก่อนหน้า
                  const prevDay = days[index - 1];
                  const isPrevFuture = prevDay.date.isAfter(today, 'day');
                  if (!isPrevFuture) {
                    const prevDayResult = results.find((r) => dayjs(r._time).isSame(prevDay.date, 'day'));
                    const prevValue = prevDayResult?._value || null;
                    difference = prevValue !== null ? currentValue - prevValue : null;
                  }
                }
              }

              return {
                day: day.name, // ชื่อวัน (จันทร์-อาทิตย์)
                date: day.date.format('DD/MM/YYYY'), // วันที่รูปแบบ DD/MM/YYYY
                value: currentValue, // ค่าปัจจุบัน
                difference: difference, // ผลต่างจากวันก่อนหน้า
                isToday: day.date.isSame(today, 'day'), // เป็นวันปัจจุบันหรือไม่
              };
            })
          );

          // ข้อมูล meta สำหรับ response
          meta = {
            period,
            range,
            weekNumber: currentWeek, // สัปดาห์ปัจจุบัน
            asOfDate: today.format('DD/MM/YYYY'), // วันที่ที่รายงาน
          };
        } else if (range === 'month') {
          // แสดงข้อมูลรายวันสำหรับเดือนปัจจุบัน
          const monthStart = today.startOf('month');
          const daysInMonth = today.daysInMonth();
          const days = Array.from({ length: daysInMonth }, (_, i) => ({
            date: monthStart.add(i, 'day'),
            dayOfMonth: i + 1,
          }));

          // สร้างคำสั่ง Flux Query สำหรับดึงข้อมูลรายวัน
          const fluxQuery = `
            from(bucket: "${bucket}")
              |> range(start: ${monthStart.toISOString()}, stop: ${today.endOf('day').toISOString()})
              |> filter(fn: (r) => r["_measurement"] == "device_frmpayload_data_value_${sensorId}")
              |> filter(fn: (r) => r["_field"] == "value")
              |> aggregateWindow(every: 1d, fn: last, createEmpty: false)
          `;

          const results = await influxApi.collectRows(fluxQuery);

          // ประมวลผลข้อมูลแต่ละวัน
          data = await Promise.all(
            days.map(async (day, index) => {
              const result = results.find((r) => dayjs(r._time).isSame(day.date, 'day'));
              const isFuture = day.date.isAfter(today, 'day');
              const currentValue = isFuture ? null : result?._value || 0;

              let difference = null;
              if (!isFuture) {
                if (index === 0) {
                  // วันแรกของเดือน: เปรียบเทียบกับวันสุดท้ายของเดือนก่อนหน้า
                  const prevValue = await getPreviousPeriodData(day.date, 'daily');
                  difference = currentValue - prevValue;
                } else {
                  // วันที่ไม่ใช่วันแรก: เปรียบเทียบกับวันก่อนหน้า
                  const prevDayResult = results.find((r) => dayjs(r._time).isSame(days[index - 1].date, 'day'));
                  const prevValue = prevDayResult?._value || 0;
                  difference = currentValue - prevValue;
                }
              }

              return {
                day: day.date.format('DD/MM'), // วันที่รูปแบบ DD/MM
                dayOfMonth: day.dayOfMonth, // วันของเดือน (1-31)
                value: currentValue, // ค่าปัจจุบัน
                difference, // ผลต่างจากวันก่อนหน้า
                isFuture, // เป็นวันในอนาคตหรือไม่
                isToday: day.date.isSame(today, 'day'), // เป็นวันปัจจุบันหรือไม่
              };
            })
          );

          // ข้อมูล meta สำหรับ response
          meta = {
            period,
            range,
            month: today.format('MMMM'), // ชื่อเดือนปัจจุบัน
            asOfDate: today.format('DD/MM/YYYY'), // วันที่ที่รายงาน
          };
        } else if (range === 'year') {
          // แสดงข้อมูลรายวันสำหรับปีปัจจุบัน
          const yearStart = today.startOf('year');
          const daysInYear = today.isLeapYear() ? 366 : 365;
          const days = Array.from({ length: daysInYear }, (_, i) => ({
            date: yearStart.add(i, 'day'),
          }));

          // สร้างคำสั่ง Flux Query สำหรับดึงข้อมูลรายวัน
          const fluxQuery = `
            from(bucket: "${bucket}")
              |> range(start: ${yearStart.toISOString()}, stop: ${today.endOf('day').toISOString()})
              |> filter(fn: (r) => r["_measurement"] == "device_frmpayload_data_value_${sensorId}")
              |> filter(fn: (r) => r["_field"] == "value")
              |> aggregateWindow(every: 1d, fn: last, createEmpty: false)
          `;

          const results = await influxApi.collectRows(fluxQuery);

          // ประมวลผลข้อมูลแต่ละวัน
          data = await Promise.all(
            days.map(async (day, index) => {
              const result = results.find((r) => dayjs(r._time).isSame(day.date, 'day'));
              const isFuture = day.date.isAfter(today, 'day');
              const currentValue = isFuture ? null : result?._value || 0;

              let difference = null;
              if (!isFuture) {
                if (index === 0) {
                  // วันแรกของปี: เปรียบเทียบกับวันสุดท้ายของปีก่อนหน้า
                  const prevValue = await getPreviousPeriodData(day.date, 'daily');
                  difference = currentValue - prevValue;
                } else {
                  // วันที่ไม่ใช่วันแรก: เปรียบเทียบกับวันก่อนหน้า
                  const prevDayResult = results.find((r) => dayjs(r._time).isSame(days[index - 1].date, 'day'));
                  const prevValue = prevDayResult?._value || 0;
                  difference = currentValue - prevValue;
                }
              }

              return {
                date: day.date.format('DD/MM'), // วันที่รูปแบบ DD/MM
                dayOfYear: day.date.dayOfYear(), // วันของปี (1-365/366)
                value: currentValue, // ค่าปัจจุบัน
                difference, // ผลต่างจากวันก่อนหน้า
                isFuture, // เป็นวันในอนาคตหรือไม่
                isToday: day.date.isSame(today, 'day'), // เป็นวันปัจจุบันหรือไม่
              };
            })
          );

          // ข้อมูล meta สำหรับ response
          meta = {
            period,
            range,
            year: currentYear, // ปีปัจจุบัน
            asOfDate: today.format('DD/MM/YYYY'), // วันที่ที่รายงาน
          };
        }
        break;

      case 'weekly':
        // กรณีแสดงข้อมูลรายสัปดาห์
        if (range === 'month') {
          // แสดงข้อมูลรายสัปดาห์สำหรับเดือนปัจจุบัน
          const monthStart = today.startOf('month');
          const weeksInMonth = Math.ceil((monthStart.daysInMonth() + monthStart.day()) / 7);
          const weeks = Array.from({ length: weeksInMonth }, (_, i) => ({
            start: monthStart.add(i, 'week').startOf('week'),
            end: monthStart.add(i, 'week').endOf('week'),
            weekNumber: monthStart.add(i, 'week').week(),
          }));

          // สร้างคำสั่ง Flux Query สำหรับดึงข้อมูลรายสัปดาห์
          const fluxQuery = `
            from(bucket: "${bucket}")
              |> range(start: ${monthStart.toISOString()}, stop: ${today.endOf('day').toISOString()})
              |> filter(fn: (r) => r["_measurement"] == "device_frmpayload_data_value_${sensorId}")
              |> filter(fn: (r) => r["_field"] == "value")
              |> aggregateWindow(every: 1w, fn: last, createEmpty: false)
          `;

          const results = await influxApi.collectRows(fluxQuery);

          // ประมวลผลข้อมูลแต่ละสัปดาห์
          data = await Promise.all(
            weeks.map(async (week, index) => {
              const result = results.find((r) => dayjs(r._time).isSame(week.start, 'week'));
              const isFuture = week.start.isAfter(today, 'week');
              const isCurrentWeek = week.start.isSame(today, 'week');
              const currentValue = isFuture ? null : result?._value || 0;

              let difference = null;
              if (!isFuture) {
                if (index === 0) {
                  // สัปดาห์แรกของเดือน: เปรียบเทียบกับสัปดาห์สุดท้ายของเดือนก่อนหน้า
                  const prevValue = await getPreviousPeriodData(week.start, 'weekly');
                  difference = currentValue - prevValue;
                } else {
                  // สัปดาห์ที่ไม่ใช่สัปดาห์แรก: เปรียบเทียบกับสัปดาห์ก่อนหน้า
                  const prevWeekResult = results.find((r) => dayjs(r._time).isSame(weeks[index - 1].start, 'week'));
                  const prevValue = prevWeekResult?._value || 0;
                  difference = currentValue - prevValue;
                }
              }

              return {
                week: `Week ${week.weekNumber}`, // ชื่อสัปดาห์ (Week X)
                range: `${week.start.format('DD/MM')} - ${week.end.format('DD/MM')}`, // ช่วงวันที่ของสัปดาห์
                value: currentValue, // ค่าปัจจุบัน
                difference, // ผลต่างจากสัปดาห์ก่อนหน้า
                isFuture, // เป็นสัปดาห์ในอนาคตหรือไม่
                isCurrentWeek, // เป็นสัปดาห์ปัจจุบันหรือไม่
              };
            })
          );

          // ข้อมูล meta สำหรับ response
          meta = {
            period,
            range,
            month: today.format('MMMM'), // ชื่อเดือนปัจจุบัน
            asOfDate: today.format('DD/MM/YYYY'), // วันที่ที่รายงาน
          };
        }
        break;

      case 'monthly':
        // กรณีแสดงข้อมูลรายเดือน
        if (range === 'year') {
          // แสดงข้อมูลรายเดือนสำหรับปีปัจจุบัน
          const months = Array.from({ length: 12 }, (_, i) => ({
            start: dayjs().tz(tz).year(currentYear).month(i).startOf('month'),
            end: dayjs().tz(tz).year(currentYear).month(i).endOf('month'),
            name: dayjs().month(i).format('MMMM'),
          }));

          // สร้างคำสั่ง Flux Query สำหรับดึงข้อมูลรายเดือน
          const fluxQuery = `
            from(bucket: "${bucket}")
              |> range(start: ${months[0].start.toISOString()}, stop: ${today.endOf('month').toISOString()})
              |> filter(fn: (r) => r["_measurement"] == "device_frmpayload_data_value_${sensorId}")
              |> filter(fn: (r) => r["_field"] == "value")
              |> aggregateWindow(every: 1mo, fn: last, createEmpty: false)
          `;

          const results = await influxApi.collectRows(fluxQuery);

          // ประมวลผลข้อมูลแต่ละเดือน
          data = await Promise.all(
            months.map(async (month, index) => {
              const isFuture = month.start.isAfter(today, 'month');
              const result = results.find((r) => dayjs(r._time).isSame(month.start, 'month'));
              const isCurrentMonth = month.start.isSame(today, 'month');
              const hasPartialData = isCurrentMonth && !today.isSame(month.end, 'day');
              const currentValue = isFuture ? null : result?._value || 0;

              let difference = null;
              if (!isFuture) {
                if (index === 0) {
                  // เดือนแรกของปี: เปรียบเทียบกับเดือนสุดท้ายของปีก่อนหน้า
                  const prevValue = await getPreviousPeriodData(month.start, 'monthly');
                  difference = currentValue - prevValue;
                } else {
                  // เดือนที่ไม่ใช่เดือนแรก: เปรียบเทียบกับเดือนก่อนหน้า
                  const prevMonthResult = results.find((r) => dayjs(r._time).isSame(months[index - 1].start, 'month'));
                  const prevValue = prevMonthResult?._value || 0;
                  difference = currentValue - prevValue;
                }
              }

              return {
                month: month.name, // ชื่อเดือน
                value: currentValue, // ค่าปัจจุบัน
                difference, // ผลต่างจากเดือนก่อนหน้า
                isFuture, // เป็นเดือนในอนาคตหรือไม่
                isCurrentMonth, // เป็นเดือนปัจจุบันหรือไม่
                hasPartialData, // มีข้อมูลไม่ครบเดือนหรือไม่
              };
            })
          );

          // ข้อมูล meta สำหรับ response
          meta = {
            period,
            range,
            currentYear, // ปีปัจจุบัน
            currentMonth: today.format('MMMM'), // ชื่อเดือนปัจจุบัน
            asOfDate: today.format('DD/MM/YYYY'), // วันที่ที่รายงาน
          };
        }
        break;

      default:
        throw new Error('Invalid period or range combination');
    }

    // ส่ง response กลับ
    res.status(200).json({
      meta,
      data,
    });
  } catch (err) {
    // จัดการ error
    console.error('Error executing query', err);
    res.status(500).json({
      message: 'Error fetching data',
      error: err.message,
    });
  }
});


router.post('/meter-delta-data3', async (req, res) => {
  try {
    const { bucket, sensorId, period, range } = req.body;
    const today = dayjs().tz(tz);
    
    // ดึงข้อมูลตาม period และ range ที่ระบุ
    const { data, meta } = await fetchDataByPeriodAndRange(bucket, sensorId, period, range, today);
    
    res.status(200).json({ meta, data });
  } catch (err) {
    console.error('Error executing query', err);
    res.status(500).json({
      message: 'Error fetching data',
      error: err.message,
    });
  }
});

// ฟังก์ชันหลักสำหรับดึงข้อมูลตาม period และ range
async function fetchDataByPeriodAndRange(bucket, sensorId, period, range, today) {
  switch (period) {
    case 'daily':
      return await handleDailyData(bucket, sensorId, range, today);
    case 'weekly':
      return await handleWeeklyData(bucket, sensorId, range, today);
    case 'monthly':
      return await handleMonthlyData(bucket, sensorId, range, today);
    default:
      throw new Error('Invalid period or range combination');
  }
}

// ฟังก์ชันสำหรับดึงข้อมูลจากช่วงเวลาก่อนหน้า
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
  return results[0]?._value || 0;
}

// ฟังก์ชันสำหรับจัดการข้อมูลรายวัน
async function handleDailyData(bucket, sensorId, range, today) {
  if (range === 'week') {
    return await handleDailyWeekData(bucket, sensorId, today);
  } else if (range === 'month') {
    return await handleDailyMonthData(bucket, sensorId, today);
  } else if (range === 'year') {
    return await handleDailyYearData(bucket, sensorId, today);
  }
  throw new Error('Invalid range for daily period');
}

// ฟังก์ชันสำหรับจัดการข้อมูลรายวัน (สัปดาห์)
async function handleDailyWeekData(bucket, sensorId, today) {
  const weekStart = today.startOf('week');
  const days = Array.from({ length: 7 }, (_, i) => ({
    date: weekStart.add(i, 'day'),
    name: weekStart.add(i, 'day').format('dddd'),
  }));

  const fluxQuery = `
    from(bucket: "${bucket}")
      |> range(start: ${weekStart.toISOString()}, stop: ${today.endOf('day').toISOString()})
      |> filter(fn: (r) => r["_measurement"] == "device_frmpayload_data_value_${sensorId}")
      |> filter(fn: (r) => r["_field"] == "value")
      |> aggregateWindow(every: 1d, fn: last, createEmpty: false)
  `;

  const results = await influxApi.collectRows(fluxQuery);

  const data = await Promise.all(
    days.map(async (day, index) => {
      const isFuture = day.date.isAfter(today, 'day');
      const result = results.find((r) => dayjs(r._time).isSame(day.date, 'day'));
      const currentValue = isFuture ? null : result?._value || null;

      let difference = null;
      if (!isFuture && currentValue !== null) {
        if (index === 0) {
          const prevValue = await getPreviousPeriodData(bucket, sensorId, day.date, 'daily');
          difference = prevValue !== null ? currentValue - prevValue : null;
        } else {
          const prevDay = days[index - 1];
          const isPrevFuture = prevDay.date.isAfter(today, 'day');
          if (!isPrevFuture) {
            const prevDayResult = results.find((r) => dayjs(r._time).isSame(prevDay.date, 'day'));
            const prevValue = prevDayResult?._value || null;
            difference = prevValue !== null ? currentValue - prevValue : null;
          }
        }
      }

      return {
        day: day.name,
        date: day.date.format('DD/MM/YYYY'),
        value: currentValue,
        difference,
        isToday: day.date.isSame(today, 'day'),
      };
    })
  );

  const meta = {
    period: 'daily',
    range: 'week',
    weekNumber: today.week(),
    asOfDate: today.format('DD/MM/YYYY'),
  };

  return { data, meta };
}

// ฟังก์ชันสำหรับจัดการข้อมูลรายวัน (เดือน)
async function handleDailyMonthData(bucket, sensorId, today) {
  const monthStart = today.startOf('month');
  const daysInMonth = today.daysInMonth();
  const days = Array.from({ length: daysInMonth }, (_, i) => ({
    date: monthStart.add(i, 'day'),
    dayOfMonth: i + 1,
  }));

  const fluxQuery = `
    from(bucket: "${bucket}")
      |> range(start: ${monthStart.toISOString()}, stop: ${today.endOf('day').toISOString()})
      |> filter(fn: (r) => r["_measurement"] == "device_frmpayload_data_value_${sensorId}")
      |> filter(fn: (r) => r["_field"] == "value")
      |> aggregateWindow(every: 1d, fn: last, createEmpty: false)
  `;

  const results = await influxApi.collectRows(fluxQuery);

  const data = await Promise.all(
    days.map(async (day, index) => {
      const result = results.find((r) => dayjs(r._time).isSame(day.date, 'day'));
      const isFuture = day.date.isAfter(today, 'day');
      const currentValue = isFuture ? null : result?._value || 0;

      let difference = null;
      if (!isFuture) {
        if (index === 0) {
          const prevValue = await getPreviousPeriodData(bucket, sensorId, day.date, 'daily');
          difference = currentValue - prevValue;
        } else {
          const prevDayResult = results.find((r) => dayjs(r._time).isSame(days[index - 1].date, 'day'));
          const prevValue = prevDayResult?._value || 0;
          difference = currentValue - prevValue;
        }
      }

      return {
        day: day.date.format('DD/MM'),
        dayOfMonth: day.dayOfMonth,
        value: currentValue,
        difference,
        isFuture,
        isToday: day.date.isSame(today, 'day'),
      };
    })
  );

  const meta = {
    period: 'daily',
    range: 'month',
    month: today.format('MMMM'),
    asOfDate: today.format('DD/MM/YYYY'),
  };

  return { data, meta };
}

// ฟังก์ชันสำหรับจัดการข้อมูลรายวัน (ปี)
async function handleDailyYearData(bucket, sensorId, today) {
  const yearStart = today.startOf('year');
  const daysInYear = today.isLeapYear() ? 366 : 365;
  const days = Array.from({ length: daysInYear }, (_, i) => ({
    date: yearStart.add(i, 'day'),
  }));

  const fluxQuery = `
    from(bucket: "${bucket}")
      |> range(start: ${yearStart.toISOString()}, stop: ${today.endOf('day').toISOString()})
      |> filter(fn: (r) => r["_measurement"] == "device_frmpayload_data_value_${sensorId}")
      |> filter(fn: (r) => r["_field"] == "value")
      |> aggregateWindow(every: 1d, fn: last, createEmpty: false)
  `;

  const results = await influxApi.collectRows(fluxQuery);

  const data = await Promise.all(
    days.map(async (day, index) => {
      const result = results.find((r) => dayjs(r._time).isSame(day.date, 'day'));
      const isFuture = day.date.isAfter(today, 'day');
      const currentValue = isFuture ? null : result?._value || 0;

      let difference = null;
      if (!isFuture) {
        if (index === 0) {
          const prevValue = await getPreviousPeriodData(bucket, sensorId, day.date, 'daily');
          difference = currentValue - prevValue;
        } else {
          const prevDayResult = results.find((r) => dayjs(r._time).isSame(days[index - 1].date, 'day'));
          const prevValue = prevDayResult?._value || 0;
          difference = currentValue - prevValue;
        }
      }

      return {
        date: day.date.format('DD/MM'),
        dayOfYear: day.date.dayOfYear(),
        value: currentValue,
        difference,
        isFuture,
        isToday: day.date.isSame(today, 'day'),
      };
    })
  );

  const meta = {
    period: 'daily',
    range: 'year',
    year: today.year(),
    asOfDate: today.format('DD/MM/YYYY'),
  };

  return { data, meta };
}

// ฟังก์ชันสำหรับจัดการข้อมูลรายสัปดาห์
async function handleWeeklyData(bucket, sensorId, range, today) {
  if (range === 'month') {
    return await handleWeeklyMonthData(bucket, sensorId, today);
  }
  throw new Error('Invalid range for weekly period');
}

// ฟังก์ชันสำหรับจัดการข้อมูลรายสัปดาห์ (เดือน)
async function handleWeeklyMonthData(bucket, sensorId, today) {
  const monthStart = today.startOf('month');
  const weeksInMonth = Math.ceil((monthStart.daysInMonth() + monthStart.day()) / 7);
  const weeks = Array.from({ length: weeksInMonth }, (_, i) => ({
    start: monthStart.add(i, 'week').startOf('week'),
    end: monthStart.add(i, 'week').endOf('week'),
    weekNumber: monthStart.add(i, 'week').week(),
  }));

  const fluxQuery = `
    from(bucket: "${bucket}")
      |> range(start: ${monthStart.toISOString()}, stop: ${today.endOf('day').toISOString()})
      |> filter(fn: (r) => r["_measurement"] == "device_frmpayload_data_value_${sensorId}")
      |> filter(fn: (r) => r["_field"] == "value")
      |> aggregateWindow(every: 1w, fn: last, createEmpty: false)
  `;

  const results = await influxApi.collectRows(fluxQuery);

  const data = await Promise.all(
    weeks.map(async (week, index) => {
      const result = results.find((r) => dayjs(r._time).isSame(week.start, 'week'));
      const isFuture = week.start.isAfter(today, 'week');
      const isCurrentWeek = week.start.isSame(today, 'week');
      const currentValue = isFuture ? null : result?._value || 0;

      let difference = null;
      if (!isFuture) {
        if (index === 0) {
          const prevValue = await getPreviousPeriodData(bucket, sensorId, week.start, 'weekly');
          difference = currentValue - prevValue;
        } else {
          const prevWeekResult = results.find((r) => dayjs(r._time).isSame(weeks[index - 1].start, 'week'));
          const prevValue = prevWeekResult?._value || 0;
          difference = currentValue - prevValue;
        }
      }

      return {
        week: `Week ${week.weekNumber}`,
        range: `${week.start.format('DD/MM')} - ${week.end.format('DD/MM')}`,
        value: currentValue,
        difference,
        isFuture,
        isCurrentWeek,
      };
    })
  );

  const meta = {
    period: 'weekly',
    range: 'month',
    month: today.format('MMMM'),
    asOfDate: today.format('DD/MM/YYYY'),
  };

  return { data, meta };
}

// ฟังก์ชันสำหรับจัดการข้อมูลรายเดือน
async function handleMonthlyData(bucket, sensorId, range, today) {
  if (range === 'year') {
    return await handleMonthlyYearData(bucket, sensorId, today);
  }
  throw new Error('Invalid range for monthly period');
}

// ฟังก์ชันสำหรับจัดการข้อมูลรายเดือน (ปี)
async function handleMonthlyYearData(bucket, sensorId, today) {
  const currentYear = today.year();
  const months = Array.from({ length: 12 }, (_, i) => ({
    start: dayjs().tz(tz).year(currentYear).month(i).startOf('month'),
    end: dayjs().tz(tz).year(currentYear).month(i).endOf('month'),
    name: dayjs().month(i).format('MMMM'),
  }));

  const fluxQuery = `
    from(bucket: "${bucket}")
      |> range(start: ${months[0].start.toISOString()}, stop: ${today.endOf('month').toISOString()})
      |> filter(fn: (r) => r["_measurement"] == "device_frmpayload_data_value_${sensorId}")
      |> filter(fn: (r) => r["_field"] == "value")
      |> aggregateWindow(every: 1mo, fn: last, createEmpty: false)
  `;

  const results = await influxApi.collectRows(fluxQuery);

  const data = await Promise.all(
    months.map(async (month, index) => {
      const isFuture = month.start.isAfter(today, 'month');
      const result = results.find((r) => dayjs(r._time).isSame(month.start, 'month'));
      const isCurrentMonth = month.start.isSame(today, 'month');
      const hasPartialData = isCurrentMonth && !today.isSame(month.end, 'day');
      const currentValue = isFuture ? null : result?._value || 0;

      let difference = null;
      if (!isFuture) {
        if (index === 0) {
          const prevValue = await getPreviousPeriodData(bucket, sensorId, month.start, 'monthly');
          difference = currentValue - prevValue;
        } else {
          const prevMonthResult = results.find((r) => dayjs(r._time).isSame(months[index - 1].start, 'month'));
          const prevValue = prevMonthResult?._value || 0;
          difference = currentValue - prevValue;
        }
      }

      return {
        month: month.name,
        value: currentValue,
        difference,
        isFuture,
        isCurrentMonth,
        hasPartialData,
      };
    })
  );

  const meta = {
    period: 'monthly',
    range: 'year',
    currentYear,
    currentMonth: today.format('MMMM'),
    asOfDate: today.format('DD/MM/YYYY'),
  };

  return { data, meta };
}

module.exports = router;
