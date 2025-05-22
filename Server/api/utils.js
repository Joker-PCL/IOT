// Utility functions

// แปลง timestamp เป็นวันที่ในรูปแบบ 'YYYY-MM-DD'
const getDateFromTimestamp = (timestamp) => {
  return new Date(timestamp).toLocaleString('th-TH', { timeZone: 'Asia/Bangkok' }).split(' ')[0];
};

// จัดกลุ่มข้อมูลตามวันที่ และคำนวณจำนวน PASS, FAIL ในแต่ละวัน
const groupedByDate = (data) => {
  return data.reduce((acc, item) => {
    const date = getDateFromTimestamp(item.timestamp);
    if (!acc[date]) {
      acc[date] = { date, pass_count: 0, fail_count: 0 };
    }
    if (item.result === 'PASS') acc[date].pass_count++;
    if (item.result === 'FAIL') acc[date].fail_count++;
    return acc;
  }, {});
};

module.exports = { getDateFromTimestamp, groupedByDate };
