const express = require('express');
const pool = require('../configuration/mysql_db');
const router = express.Router();

const dayjs = require('dayjs');
require('dayjs/locale/th');
dayjs.locale('th');

router.post('/', async (req, res) => {
  try {
    const { reportType, machineSn, startDate, endDate } = req.body;

    if (!machineSn) {
      return res.status(400).json({ error: 'กรุณาระบุหมายเลขเครื่อง (machineSn)' });
    }

    // ตรวจสอบและกำหนดช่วงวันที่ตามประเภทรายงาน
    let dateRange;
    const currentDate = dayjs();

    let query;
    switch (reportType) {
      case 'weekly':
        query = getWeeklyReportQuery(machineSn);
        dateRange = getDateRange('week')
        break;
      case 'monthly':
        query = getMonthlyReportQuery(machineSn);
        dateRange = getDateRange('month')
        break;
      case 'yearly':
        query = getYearlyReportQuery(machineSn);
        dateRange = getDateRange('year')
        break;
      case 'custom':
        if (!startDate || !endDate) {
          return res.status(400).json({ error: 'กรุณาระบุวันที่เริ่มต้นและสิ้นสุด' });
        }
        const sDate = parseCustomDate(startDate).format('YYYY-MM-DD');
        const eDate = parseCustomDate(endDate).format('YYYY-MM-DD');
        query = getCustomReportQuery(machineSn, sDate, eDate);
        dateRange = {
          start: startDate,
          end: endDate,
          display: `${dayjs(startDate).format('D MMMM')} - ${dayjs(endDate).format('D MMMM')}`
        };
        break;
      default:
        return res.status(400).json({ error: 'ประเภทรายงานไม่ถูกต้อง' });
    }

    const [[machine]] = await pool.execute(getDetailMachineQuery(machineSn));
    if (!machine) {
      return res.status(400).json({ error: 'หมายเลขเครื่องไม่ถูกต้อง (machineSn)' });
    }

    const [results] = await pool.execute(query);

    // สร้างข้อมูลให้ครบถ้วนตามประเภทรายงาน
    let formattedResults;
    switch (reportType) {
      case 'weekly':
        formattedResults = completeWeeklyData(results);
        break;
      case 'monthly':
        formattedResults = completeMonthlyData(results);
        break;
      case 'yearly':
        formattedResults = completeYearlyData(results);
        break;
      case 'custom':
        const sDate = parseCustomDate(startDate).format('YYYY-MM-DD');
        const eDate = parseCustomDate(endDate).format('YYYY-MM-DD');
        formattedResults = completeCustomData(sDate, eDate, results);
        break;
      default:
        return res.status(400).json({ error: 'ประเภทรายงานไม่ถูกต้อง' });
    }

    res.json({
      reportType,
      machineNameTh: machine.machine_name_th,
      machineNameEn: machine.machine_name_en,
      groupName: machine.group_name,
      machineSn,
      dateRange,
      data: formattedResults,
    });
  } catch (error) {
    console.error('เกิดข้อผิดพลาด:', error);
    res.status(500).json({ error: 'เกิดข้อผิดพลาดในการดึงข้อมูล' });
  }
});

// ฟังก์ชันสร้างข้อมูลรายสัปดาห์ให้ครบทุกวัน (อาทิตย์-เสาร์)
function completeWeeklyData(results) {
  const currentDate = dayjs();
  const currentDayOfWeek = currentDate.day() + 1; // +1 เพราะ dayjs.day() ให้ 0=อาทิตย์, 6=เสาร์
  
  const daysOfWeek = Array.from({ length: 7 }, (_, i) => {
    const day = dayjs().day(i); // 0=อาทิตย์, 6=เสาร์
    const full_date = day.format('D MMMM YYYY');
    return {
      day_of_week: i + 1, // MariaDB ใช้ 1=อาทิตย์, 7=เสาร์
      day_name: day.format('dddd'),
      day_name_short: day.format('ddd'),
      full_date: full_date,
      is_today: (i + 1) === currentDayOfWeek,
    };
  });

  return daysOfWeek.map((day) => {
    const found = results.find((item) => item.day_of_week === day.day_of_week);
    return formatResult(day, found);
  });
}

// ฟังก์ชันสร้างข้อมูลรายเดือนให้ครบทุกวัน (1-สิ้นเดือน)
function completeMonthlyData(results) {
  const currentDate = dayjs();
  const daysInMonth = currentDate.daysInMonth();
  const currentDayOfMonth = currentDate.date(); // ใช้ .date() เพื่อได้วันที่ของเดือน (1-31)

  const days = Array.from({ length: daysInMonth }, (_, i) => {
    const date = currentDate.date(i + 1);
    const full_date = date.format('D MMMM YYYY');
    return {
      day_of_month: i + 1,
      day_name: date.format('D MMMM'), // "5 มิถุนายน"
      day_name_short: date.format('D MMM'), // "5 มิ.ย."
      full_date: full_date,
      is_today: (i + 1) === currentDayOfMonth, // เปรียบเทียบกับวันที่ของเดือน
    };
  });

  return days.map((day) => {
    const found = results.find((item) => item.day_of_month === day.day_of_month);
    return formatResult(day, found);
  });
}

// ฟังก์ชันสร้างข้อมูลรายปีให้ครบทุกเดือน (มกราคม-ธันวาคม)
function completeYearlyData(results) {
  const currentDate = dayjs();
  const currentMonth = currentDate.month() + 1; // +1 เพราะ dayjs.month() ให้ 0=มกราคม, 11=ธันวาคม

  const months = Array.from({ length: 12 }, (_, i) => {
    const month = dayjs().month(i);
    const full_date = month.format('D MMMM YYYY');
    return {
      month_number: i + 1,
      month_name: month.format('MMMM'),
      month_name_short: month.format('MMM'),
      full_date,
      is_today: (i + 1) === currentMonth, // เปลี่ยนจาก currentDayOfYear เป็น currentMonth
    };
  });

  return months.map((month) => {
    const found = results.find((item) => item.month_number === month.month_number);
    return formatResult(month, found);
  });
}

// ฟังก์ชันสร้างข้อมูลแบบกำหนดเอง
function completeCustomData(startDate, endDate, results) {
  const start = dayjs(startDate);
  const end = dayjs(endDate);

  // คำนวณจำนวนวันระหว่าง startDate และ endDate
  const daysCount = end.diff(start, 'day') + 1;

  const days = Array.from({ length: daysCount }, (_, i) => {
    const date = start.add(i, 'day');
    return {
      day_of_month: date.date(), // วันที่ (1-31)
      month_of_year: date.month() + 1, // เดือน (1-12)
      year: date.year(), // ปี
      day_name: date.format('D MMMM'), // "23 พฤษภาคม"
      day_name_short: date.format('D MMM'), // "23 พ.ค."
      full_date: date.format('D MMMM YYYY'), // "2025-05-23"
    };
  });

  return days.map((day) => {
    // หาข้อมูลใน results ที่ตรงกับวันที่ (เทียบเฉพาะวัน-เดือน-ปี โดยไม่สนใจเวลา)
    const found = results.find((item) => {
      const itemDate = dayjs(item.operation_date);
      return itemDate.date() === day.day_of_month && itemDate.month() + 1 === day.month_of_year && itemDate.year() === day.year;
    });

    return formatResult(day, found);
  });
}

function getDateRange(range = 'year') {
  const currentDate = dayjs();
  const yearStart = currentDate.startOf(range);
  const yearEnd = currentDate.endOf(range);
  const dateRange = {
    start: yearStart.format('YYYY-MM-DD'),
    end: yearEnd.format('YYYY-MM-DD'),
    display: `${yearStart.format('D MMMM YYYY')} - ${yearEnd.format('D MMMM YYYY')}`,
  };

  return dateRange;
}

// ฟังก์ชันสร้างข้อมูลแบบกำหนดเอง
function parseCustomDate(dateString) {
  // ลอง parse ด้วยรูปแบบต่างๆ ที่อาจจะเข้ามา
  const formats = [
    'DD/MM/YYYY', // 01/05/2025
    'YYYY-MM-DD', // 2025-05-01
    'D MMMM YYYY', // 1 May 2025
    'MM/DD/YYYY', // 05/01/2025 (ถ้าเป็นรูปแบบอเมริกัน)
  ];

  for (const format of formats) {
    const parsed = dayjs(dateString, format, true);
    if (parsed.isValid()) {
      return parsed;
    }
  }

  // ถ้า parse ไม่ได้ด้วยรูปแบบใดเลย ใช้ค่า default หรือ throw error
  console.warn(`Invalid date format: ${dateString}, using current date as fallback`);
  return dayjs();
}

// ฟังก์ชันจัดรูปแบบผลลัพธ์
function formatResult(date, item) {
  return {
    ...date,
    total_start_time: item ? Number(item.total_start_time) : 0,
    total_stop_time: item ? Number(item.total_stop_time) : 0,
    total_run_time: item ? Number(item.total_run_time) : 0,
  };
}

// ฟังก์ชันสร้างคำสั่ง SQL
function getDetailMachineQuery(machineSn) {
  return `
    SELECT DISTINCT machine_sn, machine_name_en, machine_name_th
    FROM machine
    WHERE machine_sn = '${machineSn}'
    ORDER BY machine_name_en
  `;
}

function getWeeklyReportQuery(machineSn) {
  return `
    SELECT 
      DAYOFWEEK(timestamp) AS day_of_week,
      DAYNAME(timestamp) AS day_name,
      SUM(start_time) AS total_start_time,
      SUM(stop_time) AS total_stop_time,
      SUM(start_time) + SUM(stop_time) AS total_run_time
    FROM 
      machine_data
    WHERE 
      timestamp >= DATE_SUB(CURRENT_DATE(), INTERVAL WEEKDAY(CURRENT_DATE()) DAY)
      AND timestamp < DATE_ADD(DATE_SUB(CURRENT_DATE(), INTERVAL WEEKDAY(CURRENT_DATE()) DAY), INTERVAL 7 DAY)
      AND machine_sn = '${machineSn}'
    GROUP BY 
      day_of_week, day_name
    ORDER BY 
      day_of_week;
  `;
}

function getMonthlyReportQuery(machineSn) {
  return `
    SELECT 
      DAY(timestamp) AS day_of_month,
      SUM(start_time) AS total_start_time,
      SUM(stop_time) AS total_stop_time,
      SUM(start_time) + SUM(stop_time) AS total_run_time
    FROM 
      machine_data
    WHERE 
      MONTH(timestamp) = MONTH(CURRENT_DATE())
      AND YEAR(timestamp) = YEAR(CURRENT_DATE())
      AND machine_sn = '${machineSn}'
    GROUP BY 
      day_of_month
    ORDER BY 
      day_of_month;
  `;
}

function getYearlyReportQuery(machineSn) {
  return `
    SELECT 
      MONTH(timestamp) AS month_number,
      MONTHNAME(timestamp) AS month_name,
      SUM(start_time) AS total_start_time,
      SUM(stop_time) AS total_stop_time,
      SUM(start_time) + SUM(stop_time) AS total_run_time
    FROM 
      machine_data
    WHERE 
      YEAR(timestamp) = YEAR(CURRENT_DATE())
      AND machine_sn = '${machineSn}'
    GROUP BY 
      month_number, month_name
    ORDER BY 
      month_number;
  `;
}

function getCustomReportQuery(machineSn, startDate, endDate) {
  return `
    SELECT 
      DATE(timestamp) AS operation_date,
      SUM(start_time) AS total_start_time,
      SUM(stop_time) AS total_stop_time,
      SUM(start_time) + SUM(stop_time) AS total_run_time
    FROM 
      machine_data
    WHERE 
      timestamp BETWEEN '${startDate}' AND '${endDate}'
      AND machine_sn = '${machineSn}'
    GROUP BY 
      operation_date
    ORDER BY 
      operation_date;
  `;
}

module.exports = router;
