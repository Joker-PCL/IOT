import type { Dayjs } from 'dayjs';

import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc';
import timezone from 'dayjs/plugin/timezone';
// import duration from 'dayjs/plugin/duration';
// import relativeTime from 'dayjs/plugin/relativeTime';

// ----------------------------------------------------------------------

// dayjs.extend(duration);
// dayjs.extend(relativeTime);
dayjs.extend(utc);
dayjs.extend(timezone);

// ----------------------------------------------------------------------

export type DatePickerFormat = Dayjs | Date | string | number | null | undefined;

/**
 * Docs: https://day.js.org/docs/en/display/format
 */
export const dFormat = {
  dateTime: 'DD MMM YYYY h:mm a', // 17 Apr 2022 12:00 am
  date: 'DD MMM YYYY', // 17 Apr 2022
  time: 'h:mm a', // 12:00 am
  split: {
    dateTime: 'DD/MM/YYYY h:mm a', // 17/04/2022 12:00 am
    date: 'DD/MM/YYYY', // 17/04/2022
  },
  paramCase: {
    dateTime: 'DD-MM-YYYY h:mm a', // 17-04-2022 12:00 am
    date: 'DD-MM-YYYY', // 17-04-2022
  },
};

export function today(format?: string) {
  return dayjs(new Date()).startOf('day').format(format);
}

// ----------------------------------------------------------------------
/** Output: 2024-10-16 16:00:36
 */
export function fDateTimeToLocal(date: string, format: string = 'YYYY-MM-DD HH:mm:ss') {
  if (!date) {
    return null;
  }

  const isValid = dayjs(date).isValid();

  return isValid ? dayjs(date).format(format) : 'Invalid time value';
}

/** output: 08/10/2024, 15:45:45
 */
export function fDateTime(date: DatePickerFormat, format: string = 'DD/MM/YYYY, HH:mm:ss') {
  if (!date) {
    return null;
  }

  const isValid = dayjs(date).isValid();

  return isValid ? dayjs(date).format(format ?? dFormat.dateTime) : null;
}

// ----------------------------------------------------------------------

/** output: 17 Apr 2022
 */
export function fDate(date: DatePickerFormat, format?: string) {
  if (!date) {
    return null;
  }

  const isValid = dayjs(date).isValid();

  return isValid ? dayjs(date).format(format ?? dFormat.date) : 'Invalid time value';
}

// ----------------------------------------------------------------------

/** output: 12:00 am
 */
export function fTime(date: DatePickerFormat, format?: string) {
  if (!date) {
    return null;
  }

  const isValid = dayjs(date).isValid();

  return isValid ? dayjs(date).format(format ?? dFormat.time) : 'Invalid time value';
}

// ----------------------------------------------------------------------

/** output: 1713250100
 */
export function fTimestamp(date: DatePickerFormat): number {
  if (!date) {
    return 0;
  }

  const isValid = dayjs(date).isValid();

  return isValid ? dayjs(date).valueOf() : 0;
}

// ----------------------------------------------------------------------

/** output: a few seconds, 2 years
 */
export function fToNow(date: DatePickerFormat, format: string = 'YYYY-MM-DD HH:mm:ss') {
  if (!date) {
    return null;
  }

  const isValid = dayjs(date).isValid();

  return isValid ? dayjs(date).format(format) : 'Invalid time value';
}

export function timeDiff(start: string, end: string): number {
  if (!dayjs(start).isValid() || !dayjs(end).isValid()) {
    console.error('Invalid date format');
    return 0;
  }

  try {
    return dayjs(end).diff(dayjs(start), 'second');
  } catch (error) {
    console.error('Error calculating time difference:', error);
    return 0;
  }
}

export function secToHMS(seconds: number): string {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);

  const parts = [];
  if (hours > 0) parts.push(`${hours} ชั่วโมง`);
  if (minutes > 0) parts.push(`${minutes} นาที`);
  if (secs > 0) parts.push(`${secs} วินาที`);

  return parts.join(' ') || '0 วินาที';
}

// ฟังก์ชันสำหรับแปลง timestamp รูปแบบ DD/MM/YYYY, HH:mm:ss เป็น milliseconds
export function parseTimestamp(timestamp: string): number {
  if (!timestamp) {
    return 0;
  }

  try {
    const [datePart, timePart] = timestamp.split(', '); // แยกวันที่และเวลา
    const [day, month, year] = datePart.split('/').map(Number); // แยกวัน/เดือน/ปี
    const [hours, minutes, seconds] = timePart.split(':').map(Number); // แยกชั่วโมง/นาที/วินาที
    return new Date(year, month - 1, day, hours, minutes, seconds).getTime(); // สร้าง Date object และแปลงเป็น milliseconds
  } catch (err) {
    return parseTimestamp(fDateTime(timestamp) ?? '');
  }
}
